#!/usr/bin/env node
// Writes the person roster, staffed onto every project exactly as the city page
// staffs it, to src/org/roster.generated.json, for the organisation view to read.
//   node tools/roster.mjs
// The organisation view runs on the server, and where it is deployed the server
// has no files to read and may not run a script from text. So the city's own
// scripts are run here, at build time, and what they say is written down.
// It runs before `npm run dev` and `npm run build`. EVERYONE IN IT IS INVENTED.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { catalogue } from "../src/data/catalogue.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(HERE, "..", "public", "city");
const OUT = path.join(HERE, "..", "src", "org", "roster.generated.json");

const window = {};
const ctx = vm.createContext({ window, Date });
const run = (file) => {
  const f = path.join(SITE, file);
  if (fs.existsSync(f)) vm.runInContext(fs.readFileSync(f, "utf8"), ctx, { filename: file });
};
run("districts/index.js");
for (const id of window.GTECH_DISTRICT_IDS ?? []) run(`districts/${id}.js`);
window.GTECH_CATALOGUE = catalogue;
run("dummy.js");
run("people.js");
const people = window.GTECH_PEOPLE;
if (!people) {
  console.error("public/city/people.js did not load: no roster written.");
  process.exit(1);
}
const districts = window.GTECH_DISTRICTS ?? [];
// The same list, in the same order, as the page staffs.
const entries = catalogue.apps
  .map((a) => ({
    id: a.id,
    name: a.name,
    app: a,
    district: districts.find((d) => d.id === a.id) ?? window.GTECH_DUMMY?.(a),
  }))
  .filter((e) => e.district)
  .concat(
    districts
      .filter((d) => !catalogue.apps.some((a) => a.id === d.id))
      .map((d) => ({ id: d.id, name: d.name, app: null, district: d })),
  );
people.staff(entries);

const out = {
  TRAITS: people.TRAITS.map((t) => ({ key: t.key, name: t.name })),
  roster: people.roster.map((p) => ({
    id: p.id,
    name: p.name,
    scores: p.scores,
    behaviour: p.behaviour,
    intention: {
      area: p.intention.area,
      path: { key: p.intention.path.key },
      openToMove: p.intention.openToMove,
      grow: { name: p.intention.grow.name },
    },
    quality: p.quality,
    projects: p.projects.map((o) => ({ id: o.id, contributions: o.contributions })),
  })),
};
const text = JSON.stringify(out, null, 1) + "\n";
const before = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
if (text !== before) fs.writeFileSync(OUT, text);
console.log(
  `${path.relative(process.cwd(), OUT)}: ${out.roster.length} people on ${entries.length} projects` +
    (text === before ? " (unchanged)" : ""),
);
