// What /org shows, kept in the URL: a grouping, the groups picked in it, and
// whether to show their metrics or their members.
export const LEVELS = ["department", "tribe", "squad", "chapter", "guild"] as const;
export type Level = (typeof LEVELS)[number];
export type View = "metrics" | "members";
export type OrgSearch = { level: Level; groups: string[]; view: View };

export function parseOrgSearch(s: Record<string, unknown>): OrgSearch {
  const level = LEVELS.includes(s.level as Level) ? (s.level as Level) : "tribe";
  const groups = Array.isArray(s.groups)
    ? s.groups.filter((g): g is string => typeof g === "string").slice(0, 200)
    : [];
  return { level, groups, view: s.view === "members" ? "members" : "metrics" };
}

export const DEFAULT_SEARCH: OrgSearch = { level: "tribe", groups: [], view: "metrics" };
