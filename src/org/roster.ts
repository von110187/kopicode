// The person module's roster (public/city/people.js, built separately), read
// as the page reads it and turned into the values the metrics read. Nothing in
// the roster is changed here. What the roster does not hold (skills, tags)
// still comes from the stand-in.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { catalogue } from "~/data/catalogue";
import type { Evidence, PersonValues } from "./metrics";

export type RosterPerson = {
  id: string;
  name: string;
  scores: number[]; // one a trait, 0 to 100
  behaviour: { pace: number; together: number; review: number };
  intention: { area: string; path: { key: string }; openToMove: boolean; grow: { name: string } };
  quality: number;
  projects: { id: string; contributions: number }[];
};
type Roster = { roster: RosterPerson[]; TRAITS: { key: string; name: string }[] };

type Staffable = Roster & { staff?: (entries: unknown[]) => void };

/**
 * The roster, staffed onto every project exactly as the city page staffs it
 * (as tools/analyze.mjs does too), so each person's `projects` are the ones
 * the city shows them on. Null when the person module's file is not there.
 */
export function loadRoster(): Roster | null {
  const dir = path.join(process.cwd(), "public", "city");
  if (!fs.existsSync(path.join(dir, "people.js"))) return null;
  const window: {
    GTECH_PEOPLE?: Staffable;
    GTECH_CATALOGUE?: typeof catalogue;
    GTECH_DISTRICT_IDS?: string[];
    GTECH_DISTRICTS?: { id: string; name: string }[];
    GTECH_DUMMY?: (app: unknown) => unknown;
  } = {};
  const ctx = vm.createContext({ window, Date });
  const run = (file: string) => {
    const f = path.join(dir, file);
    if (fs.existsSync(f)) vm.runInContext(fs.readFileSync(f, "utf8"), ctx, { filename: file });
  };
  run("districts/index.js");
  for (const id of window.GTECH_DISTRICT_IDS ?? []) run(`districts/${id}.js`);
  window.GTECH_CATALOGUE = catalogue;
  run("dummy.js");
  run("people.js");
  const people = window.GTECH_PEOPLE;
  if (!people) return null;
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
        .map((d) => ({ id: d.id, name: d.name, app: null as never, district: d })),
    );
  people.staff?.(entries);
  return people;
}

/**
 * One roster person as metric values. Their traits are the scores; proof is
 * productivity where their work has quality or contributions behind it, and
 * social where they review others often. How they work decides how they
 * prefer to communicate.
 */
export function valuesFromRoster(
  p: RosterPerson,
  traits: Roster["TRAITS"],
  skills: Pick<PersonValues, "skills" | "tags">,
): PersonValues {
  const productivity: Evidence[] =
    p.quality >= 75 || p.projects.some((x) => x.contributions > 0)
      ? [{ kind: "productivity", says: `quality ${p.quality}/100` }]
      : [];
  const social: Evidence[] =
    p.behaviour.review >= 50 ? [{ kind: "social", says: "reviews others often" }] : [];
  const together = p.behaviour.together >= 50;
  return {
    ...skills,
    comms: together
      ? p.behaviour.pace >= 50
        ? "Calls"
        : "Meetings"
      : p.behaviour.pace >= 50
        ? "Chat"
        : "Written",
    scores: traits.map((t, i) => ({
      name: t.name,
      value: p.scores[i] / 100,
      // A trait well above the rest is shown in their work; others need the review habit.
      evidence: p.scores[i] >= 60 ? [...productivity, ...social] : social,
    })),
    name: p.name,
    source: "roster",
    openToMove: p.intention.openToMove,
    intention: `wants to ${p.intention.path.key === "lead" ? "lead" : "specialise"}, grow as ${p.intention.grow.name.toLowerCase()}, in ${p.intention.area}`,
  };
}
