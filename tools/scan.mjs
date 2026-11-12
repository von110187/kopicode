#!/usr/bin/env node
// Reads one repository into a district file the viewer draws.
//   node tools/scan.mjs --repo <path> --id <id> [--name <name>]
// It reads structure only: folder names, file and line counts, workspace
// dependencies, compose service names and the README's first paragraph.
// No file's contents, no author's name and no secret is written out.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "site", "districts");

const SOURCE = new Set(
  "ts tsx js jsx mjs cjs py go rs java kt swift vue svelte".split(" "),
);
const SKIP = new Set(
  "node_modules dist build .next coverage .turbo target __pycache__ .git .wrangler vendor .worktrees".split(
    " ",
  ),
);
// A folder under src/ whose children are the floors, not the folder itself.
const EXPAND = new Set(["domains", "modules", "features"]);
// Dependencies worth naming on a building's card.
const STACK = {
  "@nestjs/core": "NestJS",
  typeorm: "TypeORM",
  "@nestjs/bullmq": "BullMQ",
  "@modelcontextprotocol/sdk": "MCP",
  react: "React",
  vite: "Vite",
  three: "three.js",
  "@tanstack/react-query": "TanStack Query",
  zustand: "Zustand",
  zod: "Zod",
  "@docusaurus/core": "Docusaurus",
  next: "Next.js",
  express: "Express",
  hono: "Hono",
  tailwindcss: "Tailwind",
};

function args() {
  const a = process.argv.slice(2);
  const get = (k) => {
    const i = a.indexOf(k);
    return i >= 0 ? a[i + 1] : undefined;
  };
  const repo = get("--repo");
  const id = get("--id");
  if (!repo || !id || !/^[a-z0-9-]+$/.test(id)) {
    console.error(
      "usage: scan.mjs --repo <path> --id <lowercase-id> [--name <name>]",
    );
    process.exit(1);
  }
  return { repo: path.resolve(repo), id, name: get("--name") };
}

const isTest = (rel) =>
  /\.(spec|test)\.[a-z]+$/.test(rel) ||
  /(^|\/)(tests?|__tests__|e2e)\//.test(rel);

/** Source files under a folder: how many, how many lines, how many are tests. */
function measure(dir) {
  const m = { files: 0, lines: 0, tests: 0 };
  const walk = (d, rel) => {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isSymbolicLink()) continue;
      const p = path.join(d, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (!SKIP.has(e.name)) walk(p, r);
      } else if (SOURCE.has(e.name.split(".").pop())) {
        m.files++;
        if (isTest(r)) m.tests++;
        const buf = fs.readFileSync(p);
        for (let i = 0; i < buf.length; i++) if (buf[i] === 10) m.lines++;
      }
    }
  };
  walk(dir, "");
  return m;
}

const subdirs = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !SKIP.has(e.name))
        .map((e) => e.name)
    : [];

/** A unit's floors: each folder of src/, with domains/ and the like opened up. */
function floorsOf(unitDir) {
  const src = fs.existsSync(path.join(unitDir, "src"))
    ? path.join(unitDir, "src")
    : unitDir;
  const floors = [];
  for (const name of subdirs(src)) {
    if (EXPAND.has(name)) {
      for (const child of subdirs(path.join(src, name))) {
        const m = measure(path.join(src, name, child));
        if (m.files) floors.push({ name: child, kind: "domain", ...m });
      }
    } else {
      const m = measure(path.join(src, name));
      if (m.files) floors.push({ name, kind: "support", ...m });
    }
  }
  return floors.sort((a, b) => b.files - a.files);
}

/** The folders a workspace names, or the repository itself. */
function unitDirs(repo) {
  let patterns = [];
  const ws = path.join(repo, "pnpm-workspace.yaml");
  if (fs.existsSync(ws)) {
    patterns = [
      ...fs.readFileSync(ws, "utf8").matchAll(/-\s*['"]?([^'"\n]+)['"]?/g),
    ].map((m) => m[1].trim());
  } else {
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(repo, "package.json"), "utf8"),
      );
      const w = pkg.workspaces;
      patterns = Array.isArray(w) ? w : (w?.packages ?? []);
    } catch {
      /* no package.json: one unit */
    }
  }
  const dirs = [];
  for (const p of patterns) {
    if (p.endsWith("/*")) {
      const base = p.slice(0, -2);
      for (const d of subdirs(path.join(repo, base))) dirs.push(`${base}/${d}`);
    } else if (fs.existsSync(path.join(repo, p))) dirs.push(p);
  }
  return dirs.length ? dirs : ["."];
}

function readme(dir) {
  const f = ["README.md", "readme.md"]
    .map((n) => path.join(dir, n))
    .find(fs.existsSync);
  if (!f) return { title: null, summary: null };
  const lines = fs.readFileSync(f, "utf8").split("\n");
  const title =
    lines
      .find((l) => /^#\s+/.test(l))
      ?.replace(/^#\s+/, "")
      .trim() ?? null;
  const para = lines.find(
    (l) => /^[A-Za-z]/.test(l.trim()) && l.trim().length > 40,
  );
  const summary = para
    ? para
        .trim()
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*`]/g, "")
        .slice(0, 320)
    : null;
  return { title, summary };
}

/** Compose service names and images: what the district runs beside its code. */
function services(repo) {
  const f = path.join(repo, "docker-compose.yml");
  if (!fs.existsSync(f)) return [];
  const out = [];
  let inServices = false;
  let cur = null;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    if (/^\S/.test(line)) inServices = /^services:/.test(line);
    if (!inServices) continue;
    const s = /^ {2}([A-Za-z0-9_.-]+):\s*$/.exec(line);
    if (s) {
      cur = { name: s[1], image: null };
      out.push(cur);
      continue;
    }
    const img = /^ {4}image:\s*['"]?([^'"\s]+)/.exec(line);
    if (img && cur) cur.image = img[1].replace(/@sha256:.*/, "");
  }
  return out;
}

function git(repo, ...a) {
  try {
    return execFileSync("git", ["-C", repo, ...a], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

const { repo, id, name } = args();
const pkgs = unitDirs(repo).map((rel) => {
  const dir = path.join(repo, rel);
  let pkg = {};
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  } catch {
    /* not a node unit */
  }
  return { rel, dir, pkg };
});
const byName = new Map(pkgs.map((p) => [p.pkg.name, p]));
const short = (p) => (p.rel === "." ? id : path.basename(p.rel));

const units = pkgs
  .map((p) => {
    const all = { ...p.pkg.dependencies, ...p.pkg.devDependencies };
    const total = measure(p.dir);
    return {
      id: short(p),
      path: p.rel,
      group: p.rel.includes("/") ? p.rel.split("/")[0] : "root",
      ...total,
      floors: floorsOf(p.dir),
      deps: Object.keys(all)
        .filter((d) => byName.has(d) && d !== p.pkg.name)
        .map((d) => short(byName.get(d))),
      stack: Object.keys(STACK)
        .filter((d) => d in all)
        .map((d) => STACK[d]),
      summary: readme(p.dir).summary,
    };
  })
  .filter((u) => u.files > 0);

const root = readme(repo);
const district = {
  schema: "gtech-district/1",
  id,
  name: name ?? root.title ?? id,
  summary: root.summary,
  scannedAt: new Date().toISOString().slice(0, 10),
  git: {
    commits: Number(git(repo, "rev-list", "--count", "HEAD")) || null,
    lastCommit: git(repo, "log", "-1", "--format=%cs"),
    contributors:
      git(repo, "shortlog", "-sn", "HEAD")?.split("\n").filter(Boolean)
        .length ?? null,
  },
  totals: units.reduce(
    (t, u) => ({
      files: t.files + u.files,
      lines: t.lines + u.lines,
      tests: t.tests + u.tests,
    }),
    { files: 0, lines: 0, tests: 0 },
  ),
  units,
  services: services(repo),
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, `${id}.js`),
  `window.GTECH_DISTRICTS = window.GTECH_DISTRICTS || [];\nwindow.GTECH_DISTRICTS.push(${JSON.stringify(district, null, 1)});\n`,
);
// The page loads every district the folder holds, by this list.
const ids = fs
  .readdirSync(OUT)
  .filter((f) => f.endsWith(".js") && f !== "index.js")
  .map((f) => f.slice(0, -3))
  .sort();
fs.writeFileSync(
  path.join(OUT, "index.js"),
  `window.GTECH_DISTRICT_IDS = ${JSON.stringify(ids)};\n`,
);

console.log(
  `${district.name}: ${units.length} buildings, ${units.reduce((n, u) => n + u.floors.length, 0)} floors, ` +
    `${district.totals.files} files, ${district.totals.lines} lines, ${district.services.length} services`,
);
