import { createServerFn } from "@tanstack/react-start";
import {
  type Collab,
  computeOrg,
  type DepartmentMetrics,
  type DomainCell,
  domainsOf,
  type GroupMembers,
  memberRows,
  type MemberRow,
  type OrgMetrics,
  type PersonValues,
  type RollUp,
  type SquadMetrics,
  type ValuesOf,
} from "~/org/metrics";
import { mockOrg } from "~/org/mock-org";
import { loadRoster, valuesFromRoster } from "~/org/roster";
import { type Level, parseOrgSearch, type OrgSearch, type View } from "~/org/search";
import { FAMILIES } from "~/org/skills";
import { standInValues } from "~/org/stand-in-values";
import type { DepartmentId, Org } from "~/org/types";

// The roster's people join the org in the digital tribes, by the area they
// want to work in, spread over their squads. Their values come from the
// roster; their skills, which the roster does not hold, from the stand-in.
function withRoster(org: Org, standIn: ValuesOf): { values: ValuesOf; roster: number } {
  const roster = loadRoster();
  if (!roster) return { values: standIn, roster: 0 };
  const tribeOf = new Map(org.squads.map((s) => [s.id, s.tribe]));
  const pool = (tribe: string) =>
    [...new Set(org.memberships.filter((m) => tribeOf.get(m.squad) === tribe).map((m) => m.person))].filter(
      (_, i) => i % 3 === 0,
    );
  const pools: Record<string, string[]> = { digital: pool("digital"), platform: pool("platform") };
  const fromRoster = new Map<string, PersonValues>();
  for (const p of roster.roster) {
    const id = pools[p.intention.area === "Build" ? "platform" : "digital"].shift();
    if (!id) continue;
    const base = standIn(id);
    fromRoster.set(id, valuesFromRoster(p, roster.TRAITS, { skills: base?.skills ?? [], tags: base?.tags ?? [] }));
  }
  return { values: (id) => fromRoster.get(id) ?? standIn(id), roster: fromRoster.size };
}

// The org and its metrics are worked out once a server start: the mock does not change.
let cached: ReturnType<typeof build> | undefined;
function build() {
  const org = mockOrg();
  const { values, roster } = withRoster(org, standInValues(org));
  const metrics = computeOrg(org, values);
  return {
    org,
    values,
    roster,
    metrics,
    members: memberRows(org, values, metrics.plans),
    domains: new Map<Level, ReturnType<typeof domainsOf>>(),
  };
}

export type Names = Record<
  "company" | "tribe" | "squad" | "squadTribe" | "department" | "guild" | "domain" | "group" | "chapter",
  Record<string, string>
>;

export type Lacking = { skill: string; squads: number; borrowable: number };

export type OrgView = {
  lacking: Lacking[]; // skills squads lack, most lacking first
  totals: OrgMetrics["totals"] & { roster: number };
  level: Level;
  view: View;
  picked: string[];
  options: { id: string; name: string; headcount: number; tribe?: string }[];
  departments: DepartmentMetrics[];
  squads: SquadMetrics[];
  rollups: RollUp[];
  members: MemberRow[];
  // Domains across the groups shown: what each holds and lacks, and who could share.
  matrix: { rows: { id: string; name: string }[]; families: string[]; cells: Record<string, DomainCell[]> };
  collabs: Collab[];
  names: Names;
};

// The metrics of the groups picked in one grouping, and, when asked, their members.
// No groups picked means every group in the grouping.
export const getOrgView = createServerFn({ method: "GET" })
  .validator((d: Pick<OrgSearch, "level" | "groups" | "view">) => parseOrgSearch(d))
  .handler(async ({ data }): Promise<OrgView> => {
    cached ??= build();
    const { org, metrics, members, values } = cached;
    const { level, groups, view } = data;

    const all: (RollUp | SquadMetrics | DepartmentMetrics)[] = {
      company: metrics.companies,
      department: metrics.departments,
      tribe: metrics.tribes,
      squad: metrics.squads,
      chapter: metrics.chapters,
      guild: metrics.guilds,
      domain: metrics.domains,
    }[level];
    const picked = new Set(groups.filter((g) => all.some((x) => x.id === g)));
    const shown = picked.size ? all.filter((x) => picked.has(x.id)) : all;
    const tribeOf = new Map(org.squads.map((s) => [s.id, s.tribe]));
    const chapterDept = new Map(org.chapters.map((c) => [c.id, c.department]));

    const inGroup = (m: MemberRow, id: string) =>
      level === "company"
        ? m.companies.includes(id)
        : level === "department"
        ? m.department === id
        : level === "tribe"
          ? m.tribes.includes(id)
          : level === "squad"
            ? m.squads.includes(id)
            : level === "chapter"
              ? m.chapter === id
              : level === "guild"
                ? m.guilds.includes(id)
                : m.families.includes(id);

    // Domains are read across tribes when the grouping is the domains themselves.
    const across: Exclude<Level, "domain"> = level === "domain" ? "tribe" : level;
    const companyOf = new Map(org.tribes.map((t) => [t.id, t.company]));
    const membersOf = (id: string) =>
      org.memberships.filter((m) =>
        across === "company"
          ? companyOf.get(tribeOf.get(m.squad)!) === id
          : across === "department"
          ? chapterDept.get(m.chapter) === id
          : across === "tribe"
            ? tribeOf.get(m.squad) === id
            : across === "squad"
              ? m.squad === id
              : across === "chapter"
                ? m.chapter === id
                : (org.guildMembers[id] ?? []).includes(m.person),
      );
    if (!cached.domains.has(across)) {
      const list: GroupMembers[] = {
        company: metrics.companies,
        department: metrics.departments,
        tribe: metrics.tribes,
        squad: metrics.squads,
        chapter: metrics.chapters,
        guild: metrics.guilds,
      }[across].map((g) => ({
        id: g.id,
        members: membersOf(g.id),
        department:
          across === "department"
            ? (g.id as DepartmentId)
            : across === "chapter"
              ? chapterDept.get(g.id)
              : undefined,
      }));
      cached.domains.set(across, domainsOf(org, values, list));
    }
    const domains = cached.domains.get(across)!;
    const rowGroups = level === "domain" ? metrics.tribes : shown;
    const families = level === "domain" ? shown.map((s) => s.id) : FAMILIES.map((f) => f.id);
    const rowIds = new Set(rowGroups.map((g) => g.id));

    const groupNames = Object.fromEntries(
      {
        company: metrics.companies,
        department: metrics.departments,
        tribe: metrics.tribes,
        squad: metrics.squads,
        chapter: metrics.chapters,
        guild: metrics.guilds,
      }[across].map((g) => [g.id, g.name]),
    );

    return {
      lacking: lackingOf(),
      totals: { ...metrics.totals, roster: cached.roster },
      level,
      view,
      picked: [...picked],
      options: all.map((x) => ({
        id: x.id,
        name: x.name,
        headcount: x.headcount,
        tribe: level === "squad" ? tribeOf.get(x.id) : undefined,
      })),
      departments: level === "department" ? metrics.departments.filter((d) => shown.includes(d)) : [],
      squads: level === "squad" ? metrics.squads.filter((s) => shown.includes(s)) : [],
      rollups:
        level === "company" || level === "tribe" || level === "chapter" || level === "guild" || level === "domain"
          ? (shown as RollUp[])
          : [],
      members:
        view !== "metrics"
          ? members.filter((m) => !picked.size || [...picked].some((id) => inGroup(m, id)))
          : [],
      matrix: {
        rows: rowGroups.map((g) => ({ id: g.id, name: g.name })),
        families,
        cells: Object.fromEntries(
          rowGroups.map((g) => [g.id, (domains.cells[g.id] ?? []).filter((c) => families.includes(c.family))]),
        ),
      },
      collabs: domains.collabs
        .filter((c) => rowIds.has(c.group) && families.includes(c.family))
        .slice(0, 40),
      names: {
        ...baseNames(),
        group: groupNames,
      },
    };
  });

function baseNames(): Omit<Names, "group"> {
  const { org, metrics } = cached!;
  return {
        company: Object.fromEntries(org.companies.map((c) => [c.id, c.name])),
        chapter: Object.fromEntries(metrics.chapters.map((c) => [c.id, c.name])),
        tribe: Object.fromEntries(org.tribes.map((t) => [t.id, t.name])),
        squad: Object.fromEntries(org.squads.map((s) => [s.id, s.name])),
        squadTribe: Object.fromEntries(org.squads.map((s) => [s.id, s.tribe])),
        department: Object.fromEntries(org.departments.map((d) => [d.id, d.name])),
        guild: Object.fromEntries(org.guilds.map((g) => [g.id, g.name])),
        domain: Object.fromEntries(FAMILIES.map((f) => [f.id, f.name])),
  };
}

export type WorldGroup = { id: string; name: string; headcount: number };

export type OrgWorld = {
  members: MemberRow[];
  groups: Record<Level, WorldGroup[]>;
  names: Omit<Names, "group">;
  totals: OrgView["totals"];
  lacking: Lacking[];
};

// Everyone, once: the world shows all people, and any grouping highlights among them.
export const getOrgWorld = createServerFn({ method: "GET" }).handler(async (): Promise<OrgWorld> => {
  cached ??= build();
  const { metrics, members } = cached;
  const pick = (xs: { id: string; name: string; headcount: number }[]) =>
    xs.map(({ id, name, headcount }) => ({ id, name, headcount }));
  return {
    members,
    groups: {
      company: pick(metrics.companies),
      department: pick(metrics.departments),
      tribe: pick(metrics.tribes),
      squad: pick(metrics.squads),
      chapter: pick(metrics.chapters),
      guild: pick(metrics.guilds),
      domain: pick(metrics.domains),
    },
    names: baseNames(),
    totals: { ...metrics.totals, roster: cached.roster },
    lacking: lackingOf(),
  };
});

function lackingOf(): Lacking[] {
  const lacking = new Map<string, Lacking>();
  for (const sq of cached!.metrics.squads)
    for (const skill of sq.missing) {
      const l = lacking.get(skill) ?? { skill, squads: 0, borrowable: 0 };
      l.squads++;
      if (sq.borrow.some((b) => b.skill === skill)) l.borrowable++;
      lacking.set(skill, l);
    }
  return [...lacking.values()].sort((a, b) => b.squads - a.squads);
}
