// Group metrics, recomputed from the org and from each person's values.
// The person module owns those values; this file only reads them, through
// `ValuesOf`, and rolls them up to squads, tribes and departments.
import type { DepartmentId, Intention, Membership, Org } from "./types";

export type Evidence = { kind: "social" | "productivity"; says: string };

// The values the metrics read about one person, as the person module supplies them.
export type PersonValues = {
  skills: string[];
  comms: string;
  scores: { name: string; value: number; evidence: Evidence[] }[];
};
export type ValuesOf = (person: string) => PersonValues | undefined;

export type GroupMetrics = {
  headcount: number;
  fte: number;
  coverage: number; // share of needed skills someone in the group has
  missing: string[]; // needed skills nobody has: resources lacking
  singlePoints: string[]; // needed skills only one person has
  overloaded: number; // people allocated over 100% across the org
  comms: Record<string, number>; // people by communication preference
  commsFit: number; // share of people on the group's most common preference
  proven: number; // share of scores backed by social or productivity evidence
  strength: number | null; // mean of proven scores only, 0 to 1
  strengths: string[]; // highest proven score names
  weaknesses: string[]; // lowest proven score names
  unknown: number; // people whose values the person module has not given
};

export type SquadMetrics = GroupMetrics & {
  id: string;
  name: string;
  tribe: string;
  app?: string;
  intention: Pick<Intention, "says" | "kpi" | "target" | "actual">;
  impact: number; // actual / target of its intention, capped at 1.5
  understaffed: boolean;
  bottlenecks: string[];
  required: string[];
};

export type RollUp = GroupMetrics & {
  id: string;
  name: string;
  impact: number;
  bottlenecks: number;
  squads: number;
};

export type DepartmentMetrics = RollUp & {
  intentions: (Pick<Intention, "id" | "says" | "kpi" | "target" | "actual"> & {
    progress: number;
    projects: number; // project intentions that serve it
    projectImpact: number | null;
  })[];
  lacking: { skill: string; squads: number }[]; // its skills missing in squads
};

const progress = (i: Pick<Intention, "target" | "actual">) =>
  i.target ? Math.min(1.5, i.actual / i.target) : 0;

function weighted(items: { value: number; weight: number }[]) {
  const w = items.reduce((s, i) => s + i.weight, 0);
  return w ? items.reduce((s, i) => s + i.value * i.weight, 0) / w : 0;
}

function measure(
  members: Membership[],
  needs: string[],
  valuesOf: ValuesOf,
  load: Map<string, number>,
): GroupMetrics {
  const people = [...new Set(members.map((m) => m.person))];
  const known = people
    .map((p) => ({ p, v: valuesOf(p) }))
    .filter((x): x is { p: string; v: PersonValues } => !!x.v);

  const holders = new Map<string, number>();
  for (const { v } of known)
    for (const s of new Set(v.skills)) holders.set(s, (holders.get(s) ?? 0) + 1);
  const missing = needs.filter((s) => !holders.get(s));
  const singlePoints = needs.filter((s) => holders.get(s) === 1);

  const comms: Record<string, number> = {};
  for (const { v } of known) comms[v.comms] = (comms[v.comms] ?? 0) + 1;
  const top = Math.max(0, ...Object.values(comms));

  const byName = new Map<string, number[]>();
  let scores = 0;
  let provenScores = 0;
  for (const { v } of known)
    for (const s of v.scores) {
      scores++;
      if (!s.evidence.length) continue; // a score without proof does not count
      provenScores++;
      byName.set(s.name, [...(byName.get(s.name) ?? []), s.value]);
    }
  const means = [...byName]
    .map(([name, vs]) => ({ name, mean: vs.reduce((a, b) => a + b, 0) / vs.length }))
    .sort((a, b) => b.mean - a.mean);
  const all = [...byName.values()].flat();

  return {
    headcount: people.length,
    fte: Math.round(members.reduce((s, m) => s + m.share, 0) * 10) / 10,
    coverage: needs.length ? (needs.length - missing.length) / needs.length : 1,
    missing,
    singlePoints,
    overloaded: people.filter((p) => (load.get(p) ?? 0) > 1).length,
    comms,
    commsFit: known.length ? top / known.length : 0,
    proven: scores ? provenScores / scores : 0,
    strength: all.length ? all.reduce((a, b) => a + b, 0) / all.length : null,
    strengths: means.slice(0, 2).map((m) => m.name),
    weaknesses: means.length > 2 ? means.slice(-2).reverse().map((m) => m.name) : [],
    unknown: people.length - known.length,
  };
}

function rollUp(
  id: string,
  name: string,
  members: Membership[],
  squads: SquadMetrics[],
  valuesOf: ValuesOf,
  load: Map<string, number>,
): RollUp {
  const g = measure(members, [], valuesOf, load);
  return {
    ...g,
    id,
    name,
    // A roll-up's coverage is its squads' mean; what it lacks is what they lack.
    coverage: squads.length
      ? squads.reduce((s, q) => s + q.coverage, 0) / squads.length
      : 1,
    missing: [...new Set(squads.flatMap((s) => s.missing))],
    singlePoints: [...new Set(squads.flatMap((s) => s.singlePoints))],
    impact: weighted(squads.map((s) => ({ value: s.impact, weight: s.headcount }))),
    bottlenecks: squads.reduce((n, s) => n + s.bottlenecks.length, 0),
    squads: squads.length,
  };
}

export function computeOrg(org: Org, valuesOf: ValuesOf) {
  const load = new Map<string, number>();
  for (const m of org.memberships)
    load.set(m.person, (load.get(m.person) ?? 0) + m.share);
  const intention = new Map(org.intentions.map((i) => [i.id, i]));
  const chapterDept = new Map(org.chapters.map((c) => [c.id, c.department]));

  const squads: SquadMetrics[] = org.squads.map((sq) => {
    const members = org.memberships.filter((m) => m.squad === sq.id);
    const it = intention.get(sq.intention)!;
    const g = measure(members, it.needs, valuesOf, load);
    const understaffed = g.fte < sq.minSize * 0.75;
    const bottlenecks = [
      ...g.singlePoints.map((s) => `Only one person has ${s}`),
      ...(g.overloaded ? [`${g.overloaded} member(s) allocated over 100%`] : []),
      ...(understaffed ? [`${g.fte} FTE against ${sq.minSize} needed`] : []),
      ...(g.headcount && g.commsFit < 0.4 ? ["No shared way of communicating"] : []),
    ];
    const required = [
      ...g.missing.map((s) => `Add ${s}`),
      ...g.singlePoints.map((s) => `Back up ${s}`),
      ...(understaffed ? [`${Math.ceil(sq.minSize - g.fte)} more FTE`] : []),
    ];
    return {
      ...g,
      id: sq.id,
      name: sq.name,
      tribe: sq.tribe,
      app: sq.app,
      intention: { says: it.says, kpi: it.kpi, target: it.target, actual: it.actual },
      impact: progress(it),
      understaffed,
      bottlenecks,
      required,
    };
  });

  const tribes = org.tribes.map((t) =>
    rollUp(
      t.id,
      t.name,
      org.memberships.filter((m) => org.squads.find((s) => s.id === m.squad)?.tribe === t.id),
      squads.filter((s) => s.tribe === t.id),
      valuesOf,
      load,
    ),
  );

  const skillHome = new Map<string, DepartmentId>();
  for (const d of org.departments) for (const s of d.skills) skillHome.set(s, d.id);

  const departments: DepartmentMetrics[] = org.departments.map((d) => {
    const members = org.memberships.filter((m) => chapterDept.get(m.chapter) === d.id);
    const inSquads = new Set(members.map((m) => m.squad));
    const r = rollUp(
      d.id,
      d.name,
      members,
      squads.filter((s) => inSquads.has(s.id)),
      valuesOf,
      load,
    );
    const own = org.intentions.filter(
      (i) => i.owner.kind === "department" && i.owner.id === d.id,
    );
    const lackingCount = new Map<string, number>();
    for (const s of squads)
      for (const m of s.missing)
        if (skillHome.get(m) === d.id) lackingCount.set(m, (lackingCount.get(m) ?? 0) + 1);
    return {
      ...r,
      impact: weighted(own.map((i) => ({ value: progress(i), weight: i.weight }))),
      intentions: own.map((i) => {
        const projects = org.intentions.filter((p) => p.serves === i.id);
        return {
          id: i.id,
          says: i.says,
          kpi: i.kpi,
          target: i.target,
          actual: i.actual,
          progress: progress(i),
          projects: projects.length,
          projectImpact: projects.length
            ? weighted(projects.map((p) => ({ value: progress(p), weight: p.weight })))
            : null,
        };
      }),
      lacking: [...lackingCount]
        .map(([skill, n]) => ({ skill, squads: n }))
        .sort((a, b) => b.squads - a.squads),
    };
  });

  // A roll-up over any set of people: the squads it touches are the ones they sit in.
  const over = (id: string, name: string, members: Membership[]) => {
    const inSquads = new Set(members.map((m) => m.squad));
    return rollUp(id, name, members, squads.filter((s) => inSquads.has(s.id)), valuesOf, load);
  };
  const tribeName = new Map(org.tribes.map((t) => [t.id, t.name]));
  const deptName = new Map(org.departments.map((d) => [d.id, d.name]));
  const chapters = org.chapters.map((c) => ({
    ...over(
      c.id,
      `${deptName.get(c.department)} · ${tribeName.get(c.tribe)}`,
      org.memberships.filter((m) => m.chapter === c.id),
    ),
    department: c.department,
    tribe: c.tribe,
  }));
  const guilds = org.guilds.map((g) => {
    const people = new Set(org.guildMembers[g.id] ?? []);
    return over(g.id, g.name, org.memberships.filter((m) => people.has(m.person)));
  });

  const people = new Set(org.memberships.map((m) => m.person));
  return {
    totals: {
      people: people.size,
      departments: org.departments.length,
      tribes: org.tribes.length,
      squads: org.squads.length,
      chapters: org.chapters.length,
      guilds: org.guilds.length,
      overloaded: [...load.values()].filter((v) => v > 1).length,
      bottlenecks: squads.reduce((n, s) => n + s.bottlenecks.length, 0),
      coverage: squads.reduce((s, q) => s + q.coverage, 0) / (squads.length || 1),
      proven: weighted(squads.map((s) => ({ value: s.proven, weight: s.headcount }))),
      impact: weighted(squads.map((s) => ({ value: s.impact, weight: s.headcount }))),
    },
    departments,
    tribes,
    squads,
    chapters,
    guilds,
  };
}

export type MemberRow = {
  person: string;
  department: DepartmentId;
  tribes: string[];
  squads: string[];
  chapter: string;
  guilds: string[];
  load: number;
  // What the metrics read from the person module; null where it has no values.
  skills: string[] | null;
  comms: string | null;
  proven: number | null; // share of the person's scores that carry proof
  provenScore: number | null; // mean of their proven scores
};

// Everyone in the org, one row a person, with where they sit and what the metrics read of them.
export function memberRows(org: Org, valuesOf: ValuesOf): MemberRow[] {
  const chapter = new Map(org.chapters.map((c) => [c.id, c]));
  const squad = new Map(org.squads.map((s) => [s.id, s]));
  const guildsOf = new Map<string, string[]>();
  for (const [g, people] of Object.entries(org.guildMembers))
    for (const p of people) guildsOf.set(p, [...(guildsOf.get(p) ?? []), g]);
  const byPerson = new Map<string, Membership[]>();
  for (const m of org.memberships)
    byPerson.set(m.person, [...(byPerson.get(m.person) ?? []), m]);
  return [...byPerson].map(([person, ms]) => {
    const v = valuesOf(person);
    const proven = v?.scores.filter((s) => s.evidence.length) ?? [];
    return {
      person,
      department: chapter.get(ms[0].chapter)!.department,
      tribes: [...new Set(ms.map((m) => squad.get(m.squad)!.tribe))],
      squads: ms.map((m) => m.squad),
      chapter: ms[0].chapter,
      guilds: guildsOf.get(person) ?? [],
      load: Math.round(ms.reduce((s, m) => s + m.share, 0) * 100) / 100,
      skills: v ? [...new Set(v.skills)] : null,
      comms: v?.comms ?? null,
      proven: v && v.scores.length ? proven.length / v.scores.length : null,
      provenScore: proven.length
        ? proven.reduce((s, x) => s + x.value, 0) / proven.length
        : null,
    };
  });
}

export type OrgMetrics = ReturnType<typeof computeOrg>;
