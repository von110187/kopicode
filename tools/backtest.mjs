// Fits and tests the stall rule: a project idle for N days or more will have no commit in
// the next 30.
//
//   node tools/backtest.mjs <folder of repositories> [more folders] [--out src/data/stall-model.json]
//
// It reads nothing of a repository but its commit times (git log), and writes nothing
// about any one repository: only N and how well the rule did. A repository's past is cut
// at a moment, the rule sees how long it had been idle then, and is marked against what
// came after.
//
// The test is honest in the way that matters: N is never chosen on the repository it is
// marked on. Each repository is held out in turn, N is chosen on all the others, and only
// then is the held-out one asked about.
//
// A model of six inputs (commits this month and last, days active, people, age) was tried
// first and ranked quiet months above busy ones less often than days idle alone did, so
// the rule is the one input.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const DAY = 86400;
const HORIZON = 30; // days ahead the rule is about
const STEP = 14; // days between the moments a repository is cut at
const MOST = 30; // the longest idle time tried for N

const args = process.argv.slice(2);
const outAt = args.indexOf("--out");
const out = outAt >= 0 ? args[outAt + 1] : null;
const folders = args.filter(
  (a, i) => !a.startsWith("--") && (outAt < 0 || i !== outAt + 1),
);
if (!folders.length) {
  console.error(
    "usage: node tools/backtest.mjs <folder of repositories> [more folders] [--out file.json]",
  );
  process.exit(1);
}

/** When a repository's commits were made, oldest first. One that cannot be read has none. */
function commitTimes(dir) {
  try {
    return execFileSync(
      "git",
      ["-C", dir, "log", "--no-merges", "--format=%at"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    )
      .split("\n")
      .filter(Boolean)
      .map(Number)
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

const now = Math.floor(Date.now() / 1000);
const repos = folders
  .flatMap((f) =>
    readdirSync(resolve(f), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(resolve(f), d.name)),
  )
  .filter((d) => existsSync(join(d, ".git")))
  .map(commitTimes)
  .filter((c) => c.length >= 2);

// Every moment a repository is cut at: from two weeks after its first commit, each two
// weeks, for as long as the 30 days after it have already happened.
const moments = [];
repos.forEach((times, repo) => {
  for (
    let t = times[0] + STEP * DAY;
    t + HORIZON * DAY <= now;
    t += STEP * DAY
  ) {
    const last = times.filter((c) => c <= t).pop();
    moments.push({
      repo,
      idle: (t - last) / DAY,
      active30: times.some((c) => c > t - 30 * DAY && c <= t),
      quiet: !times.some((c) => c > t && c <= t + HORIZON * DAY),
    });
  }
});

const round = (v) => Math.round(v * 1000) / 1000;
/** How a guess did on some moments. Balanced is the mean of quiet caught and busy caught: a guess that always says one thing scores a half. */
function marks(list, guess) {
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;
  for (const m of list) {
    const g = guess(m);
    if (g && m.quiet) tp++;
    else if (!g && !m.quiet) tn++;
    else if (g) fp++;
    else fn++;
  }
  const quietCaught = tp / (tp + fn || 1);
  const busyCaught = tn / (tn + fp || 1);
  return {
    right: tp + tn,
    of: list.length,
    quietCaught: round(quietCaught),
    busyCaught: round(busyCaught),
    balanced: round((quietCaught + busyCaught) / 2),
  };
}
/** The N that does best on some moments; of equals, the shortest. */
function choose(list) {
  let best = 1;
  let score = -1;
  for (let n = 1; n <= MOST; n++) {
    const s = marks(list, (m) => m.idle >= n).balanced;
    if (s > score) {
      score = s;
      best = n;
    }
  }
  return best;
}

// Each repository held out in turn: N chosen on the others, then asked of it.
const tested = [];
const chosen = [];
for (const held of new Set(moments.map((m) => m.repo))) {
  const n = choose(moments.filter((m) => m.repo !== held));
  chosen.push(n);
  for (const m of moments.filter((x) => x.repo === held))
    tested.push({ ...m, says: m.idle >= n });
}

const idleDays = choose(moments);
const result = {
  predicts: `no commit in the next ${HORIZON} days`,
  rule: { idleDays, says: `idle ${idleDays} days or more` },
  fittedOn: new Date(now * 1000).toISOString().slice(0, 10),
  repositories: new Set(moments.map((m) => m.repo)).size,
  moments: moments.length,
  quietShare: round(moments.filter((m) => m.quiet).length / moments.length),
  test: {
    how: "each repository held out in turn, N chosen on the others",
    chosenBetween: [Math.min(...chosen), Math.max(...chosen)],
    ...marks(tested, (m) => m.says),
  },
  // What the rule has to beat.
  alwaysQuiet: marks(moments, () => true),
  noCommitThisMonth: marks(moments, (m) => !m.active30),
};

console.log(JSON.stringify(result, null, 2));
if (out) {
  writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
  console.error(`wrote ${out}`);
}
