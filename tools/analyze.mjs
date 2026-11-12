#!/usr/bin/env node
// Asks Claude to read the mock people and the open seats, and writes what it
// says to site/analysis.js, which the page shows beside the rule's own score.
//   node tools/analyze.mjs [--dry]
// The key is read from the environment (ANTHROPIC_API_KEY, and
// ANTHROPIC_BASE_URL for a gateway) and never reaches the page.
// EVERYTHING SENT IS INVENTED: the people come from site/people.js and the
// catalogue from site/catalogue.js. Of a scanned repository only its id, its
// name and the reasons its seats are open are sent: no structure, no file.
// --dry prints what would be sent and calls nothing.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(HERE, "..", "site");
const OUT = path.join(SITE, "analysis.js");
const MODEL = "claude-opus-5-5";
const TOP = 5; // candidates a seat, as the rule ranks them

// The page's own scripts, run as the page runs them, so the people, the teams
// and the scores here are the ones the page shows.
const window = {};
const ctx = vm.createContext({ window });
const run = (file) =>
  vm.runInContext(fs.readFileSync(path.join(SITE, file), "utf8"), ctx, {
    filename: file,
  });
if (fs.existsSync(path.join(SITE, "districts", "index.js"))) {
  run("districts/index.js");
  for (const id of window.GTECH_DISTRICT_IDS || []) run(`districts/${id}.js`);
}
run("catalogue.js");
run("people.js");
const People = window.GTECH_PEOPLE;
const cat = window.GTECH_CATALOGUE;
const districts = window.GTECH_DISTRICTS || [];
if (!districts.length) {
  console.error("No project scanned yet: run tools/scan.mjs first.");
  process.exit(1);
}

// Teams are drawn exactly as the page draws them, from the same list.
const entries = cat.apps
  .map((a) => ({
    id: a.id,
    name: a.name,
    app: a,
    district: districts.find((d) => d.id === a.id) || null,
  }))
  .concat(
    districts
      .filter((d) => !cat.apps.some((a) => a.id === d.id))
      .map((d) => ({ id: d.id, name: d.name, app: null, district: d })),
  );
People.staff(entries);
const projects = entries
  .filter((e) => e.district)
  .map((e) => ({ app: e.app, d: e.district }));

const today = new Date();
const seats = projects.flatMap(({ app, d }) =>
  People.seats(d, app, cat.problems, today).map((seat) => ({
    key: `${d.id}/${seat.trait.key}`,
    project: d.name,
    seat: seat.trait.name,
    role: seat.trait.role,
    area: seat.area,
    openBecause: seat.reasons,
    team: People.teamOf(d).map((m) => m.id),
    ruleRanking: People.match(seat, d)
      .slice(0, TOP)
      .map((m) => ({
        id: m.person.id,
        ruleScore: m.score,
        parts: m.parts.map((x) => `${x.says}: ${x.got}/${x.of}`),
      })),
  })),
);

const people = People.roster.map((p) => ({
  id: p.id,
  name: p.name,
  traits: Object.fromEntries(
    People.TRAITS.map((t, i) => [t.name, p.scores[i]]),
  ),
  behaviour: Object.fromEntries(
    People.BEHAVIOURS.map((b) => {
      const v = p.behaviour[b.key];
      return [b.name, `${v}/100 (0 = ${b.low}, 100 = ${b.high})`];
    }),
  ),
  intention: {
    wantsToGrowAs: p.intention.grow.name,
    path: p.intention.path.says,
    drawnTo: p.intention.area,
    openToMove: p.intention.openToMove,
  },
  onProjects: p.projects.map((o) => o.name),
  spareWeekPercent: People.capacity(p),
}));

const SYSTEM = `You are helping a business lead staff software projects, in a demo built on invented data.

Every person below is made up: the names, trait scores, behaviour and intentions are generated from a random seed and describe nobody real. Write as you would about real colleagues, though, because the demo is there to show what this analysis would look like.

Each person has:
- traits: four scores from 0 to 100 (Builder ships working things fast, Thinker designs before building, Connector links people and projects, Guardian keeps quality and safety)
- behaviour: how they work, as it would be observed. Each scale runs between two ends and neither end is better in itself.
- intention: what they want, as they would say it themselves.

Each open seat names the trait a project is short of, why the seat is open, who is already on the team, and the five people a simple scoring rule ranked highest, with the parts of each score. The rule adds up points. Its view of the team is crude: it compares the candidate with the team's averages and counts who wants to lead, and it cannot see how particular people would get on.

Your job has two parts.

1. For every person, write a reading of one or two sentences: what they are like to work with and what they are after. Say what the numbers add up to rather than repeating them. Where behaviour and intention pull in different directions, say so, because that tension is what a staffing lead most needs to know.

2. For every seat, say in a sentence for each of the five candidates what would go well or badly if they took it, then pick the one you would put in the seat and say why. You may disagree with the rule's order, and where you do, say what the rule missed: for example someone who wants the role and has little strength in it yet, or a habit that would clash with the people already on the team. Then name the main risk in your pick, the thing to watch in the first month.

Write plainly, for a reader who has ten seats to fill and no time. No headings, no lists, no hedging. Use people's names, never their ids, in the text. Choose your pick only from the seat's five candidates.`;

const Out = z.object({
  people: z.array(z.object({ id: z.string(), reading: z.string() })),
  seats: z.array(
    z.object({
      key: z.string(),
      candidates: z.array(z.object({ id: z.string(), says: z.string() })),
      pick: z.string().describe("the id of the person chosen for the seat"),
      why: z.string(),
      risk: z.string(),
    }),
  ),
});

const user = `<people>\n${JSON.stringify(people)}\n</people>\n\n<open_seats>\n${JSON.stringify(seats)}\n</open_seats>`;

if (process.argv.includes("--dry")) {
  console.log(SYSTEM + "\n\n" + user);
  console.error(
    `\n${people.length} people, ${seats.length} seats, ${user.length} characters. Nothing was sent.`,
  );
  process.exit(0);
}

const client = new Anthropic();
let response;
try {
  response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium", format: zodOutputFormat(Out) },
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
  });
} catch (error) {
  if (error instanceof Anthropic.AuthenticationError)
    console.error("The key was refused: set ANTHROPIC_API_KEY.");
  else if (error instanceof Anthropic.RateLimitError)
    console.error("Rate limited: wait and run it again.");
  else if (error instanceof Anthropic.APIError)
    console.error(`API error ${error.status}: ${error.message}`);
  else console.error(String(error?.message ?? error));
  process.exit(1);
}
if (response.stop_reason === "refusal") {
  console.error(
    `The model declined (${response.stop_details?.category ?? "no category"}). Nothing was written.`,
  );
  process.exit(1);
}
if (response.stop_reason === "max_tokens" || !response.parsed_output) {
  console.error(
    `No usable answer (stop reason: ${response.stop_reason}). Nothing was written.`,
  );
  process.exit(1);
}

// Only what matches the page's own data is kept: a reading for a person who
// exists, a pick from the seat's own candidates.
const got = response.parsed_output;
const known = new Set(people.map((p) => p.id));
const out = {
  model: response.model,
  generatedAt: today.toISOString().slice(0, 10),
  people: {},
  seats: {},
};
for (const p of got.people) if (known.has(p.id)) out.people[p.id] = p.reading;
let dropped = 0;
for (const s of got.seats) {
  const seat = seats.find((x) => x.key === s.key);
  const ids = seat ? seat.ruleRanking.map((r) => r.id) : [];
  if (!seat || !ids.includes(s.pick)) {
    dropped++;
    continue;
  }
  out.seats[s.key] = {
    pick: s.pick,
    why: s.why,
    risk: s.risk,
    candidates: Object.fromEntries(
      s.candidates.filter((c) => ids.includes(c.id)).map((c) => [c.id, c.says]),
    ),
  };
}

fs.writeFileSync(
  OUT,
  "// Written by tools/analyze.mjs. What a model said about INVENTED people.\n" +
    "window.GTECH_ANALYSIS = " +
    JSON.stringify(out, null, 1) +
    ";\n",
);
console.log(
  `${path.relative(process.cwd(), OUT)}: ${Object.keys(out.people).length} of ${people.length} people, ` +
    `${Object.keys(out.seats).length} of ${seats.length} seats` +
    (dropped ? ` (${dropped} dropped: unknown seat or a pick outside its candidates)` : "") +
    `, by ${response.model}; ${response.usage.input_tokens} tokens in, ${response.usage.output_tokens} out.`,
);
