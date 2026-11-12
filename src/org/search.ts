// What /org shows, kept in the URL: a grouping, the groups picked in it,
// how to show them (metrics, members or in 3D), and the filters on people.
import { FAMILIES, SKILLS } from "./skills";

export const LEVELS = ["department", "tribe", "squad", "chapter", "guild", "domain"] as const;
export type Level = (typeof LEVELS)[number];
export const VIEWS = ["metrics", "members", "3d"] as const;
export type View = (typeof VIEWS)[number];
export const STATUSES = ["", "borderline", "overloaded", "spare", "fills-gap"] as const;
export type Status = (typeof STATUSES)[number];
const DEPTS = ["", "sales-marketing", "engineering", "product", "finance", "hr"] as const;

export type OrgSearch = {
  level: Level;
  groups: string[];
  view: View;
  dept: (typeof DEPTS)[number];
  family: string;
  skill: string;
  tag: string;
  status: Status;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

export function parseOrgSearch(s: Record<string, unknown>): OrgSearch {
  const level = LEVELS.includes(s.level as Level) ? (s.level as Level) : "tribe";
  const groups = Array.isArray(s.groups)
    ? s.groups.filter((g): g is string => typeof g === "string").slice(0, 200)
    : [];
  const family = FAMILIES.some((f) => f.id === s.family) ? str(s.family) : "";
  // A skill must belong to the family picked, and a tag to the skill.
  const sk = SKILLS.find((x) => x.id === s.skill && (!family || x.family === family));
  const skill = sk ? sk.id : "";
  const tag = sk && sk.tags.includes(str(s.tag)) ? str(s.tag) : "";
  return {
    level,
    groups,
    view: VIEWS.includes(s.view as View) ? (s.view as View) : "metrics",
    dept: DEPTS.includes(s.dept as (typeof DEPTS)[number]) ? (s.dept as OrgSearch["dept"]) : "",
    family,
    skill,
    tag,
    status: STATUSES.includes(s.status as Status) ? (s.status as Status) : "",
  };
}

export const DEFAULT_SEARCH: OrgSearch = {
  level: "tribe",
  groups: [],
  view: "metrics",
  dept: "",
  family: "",
  skill: "",
  tag: "",
  status: "",
};
