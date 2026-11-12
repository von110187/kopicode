import { createServerFn } from "@tanstack/react-start";
import {
  computeOrg,
  type DepartmentMetrics,
  memberRows,
  type MemberRow,
  type OrgMetrics,
  type RollUp,
  type SquadMetrics,
} from "~/org/metrics";
import { mockOrg } from "~/org/mock-org";
import { type Level, parseOrgSearch, type OrgSearch, type View } from "~/org/search";
import { standInValues } from "~/org/stand-in-values";

// The org and its metrics are worked out once a server start: the mock does not change.
let cached: ReturnType<typeof build> | undefined;
function build() {
  const org = mockOrg();
  const values = standInValues(org);
  return { org, metrics: computeOrg(org, values), members: memberRows(org, values) };
}

export type OrgView = {
  totals: OrgMetrics["totals"];
  level: Level;
  view: View;
  picked: string[];
  options: { id: string; name: string; headcount: number; tribe?: string }[];
  departments: DepartmentMetrics[];
  squads: SquadMetrics[];
  rollups: RollUp[];
  members: MemberRow[];
  names: Record<"tribe" | "squad" | "squadTribe" | "department" | "guild", Record<string, string>>;
};

// The metrics of the groups picked in one grouping, and, when asked, their members.
// No groups picked means every group in the grouping.
export const getOrgView = createServerFn({ method: "GET" })
  .validator((d: OrgSearch) => parseOrgSearch(d))
  .handler(async ({ data }): Promise<OrgView> => {
    cached ??= build();
    const { org, metrics, members } = cached;
    const { level, groups, view } = data;

    const all: (RollUp | SquadMetrics | DepartmentMetrics)[] =
      level === "department"
        ? metrics.departments
        : level === "tribe"
          ? metrics.tribes
          : level === "squad"
            ? metrics.squads
            : level === "chapter"
              ? metrics.chapters
              : metrics.guilds;
    const picked = new Set(groups.filter((g) => all.some((x) => x.id === g)));
    const shown = picked.size ? all.filter((x) => picked.has(x.id)) : all;
    const tribeOf = new Map(org.squads.map((s) => [s.id, s.tribe]));

    const inGroup = (m: MemberRow, id: string) =>
      level === "department"
        ? m.department === id
        : level === "tribe"
          ? m.tribes.includes(id)
          : level === "squad"
            ? m.squads.includes(id)
            : level === "chapter"
              ? m.chapter === id
              : m.guilds.includes(id);

    return {
      totals: metrics.totals,
      level,
      view,
      picked: [...picked],
      options: all.map((x) => ({
        id: x.id,
        name: x.name,
        headcount: x.headcount,
        tribe: level === "squad" ? tribeOf.get(x.id) : undefined,
      })),
      departments:
        level === "department" ? metrics.departments.filter((d) => shown.includes(d)) : [],
      squads: level === "squad" ? metrics.squads.filter((s) => shown.includes(s)) : [],
      rollups:
        level === "tribe" || level === "chapter" || level === "guild"
          ? metrics[level === "tribe" ? "tribes" : level === "chapter" ? "chapters" : "guilds"].filter(
              (r) => shown.includes(r),
            )
          : [],
      members:
        view === "members"
          ? members.filter((m) => !picked.size || [...picked].some((id) => inGroup(m, id)))
          : [],
      names: {
        tribe: Object.fromEntries(org.tribes.map((t) => [t.id, t.name])),
        squad: Object.fromEntries(org.squads.map((s) => [s.id, s.name])),
        squadTribe: Object.fromEntries(org.squads.map((s) => [s.id, s.tribe])),
        department: Object.fromEntries(org.departments.map((d) => [d.id, d.name])),
        guild: Object.fromEntries(org.guilds.map((g) => [g.id, g.name])),
      },
    };
  });
