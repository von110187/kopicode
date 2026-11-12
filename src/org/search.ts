// What /org shows, kept in the URL. The world always shows everyone; picks
// made in the dock light up who fits. Within one dock any pick matches;
// across docks every dock must match.
import { SKILLS } from "./skills";

export const LEVELS = ["company", "department", "tribe", "squad", "chapter", "guild", "domain"] as const;
export type Level = (typeof LEVELS)[number];
// The dock's dimensions: the groupings, then skills, tags and status.
export const DIMS = [...LEVELS, "skill", "tag", "status"] as const;
export type Dim = (typeof DIMS)[number];
// Metrics and members open over the world; "3d" is the world alone.
export const VIEWS = ["3d", "metrics", "members"] as const;
export type View = (typeof VIEWS)[number];
export const STATUSES = ["borderline", "overloaded", "spare", "fills-gap"] as const;
export type Status = (typeof STATUSES)[number];

export type Picks = Partial<Record<Dim, string[]>>;

export type OrgSearch = {
  level: Level; // the grouping metrics and members are read by
  groups: string[]; // the groups of that grouping they are read for
  view: View;
  pick: Picks;
  single: boolean; // hide who fits nothing picked, instead of greying them out
};

const SKILL_IDS = new Set(SKILLS.map((s) => s.id));
const TAGS = new Set(SKILLS.flatMap((s) => s.tags));
const strings = (v: unknown, max = 200) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length < 80).slice(0, max) : [];

export function parseOrgSearch(s: Record<string, unknown>): OrgSearch {
  const level = LEVELS.includes(s.level as Level) ? (s.level as Level) : "tribe";
  const raw = (s.pick && typeof s.pick === "object" ? s.pick : {}) as Record<string, unknown>;
  const pick: Picks = {};
  for (const d of DIMS) {
    let v = strings(raw[d]);
    if (d === "skill") v = v.filter((x) => SKILL_IDS.has(x));
    if (d === "tag") v = v.filter((x) => TAGS.has(x));
    if (d === "status") v = v.filter((x) => (STATUSES as readonly string[]).includes(x));
    if (v.length) pick[d] = v;
  }
  return {
    level,
    groups: strings(s.groups),
    view: VIEWS.includes(s.view as View) ? (s.view as View) : "3d",
    pick,
    single: s.single === true || s.single === "true",
  };
}

export const DEFAULT_SEARCH: OrgSearch = {
  level: "tribe",
  groups: [],
  view: "3d",
  pick: {},
  single: false,
};
