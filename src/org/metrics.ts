// Group metrics, recomputed from the org and from each person's values.
// The person module owns those values; this file only reads them, through
// `ValuesOf`, and rolls them up to squads, tribes and departments.
import { FAMILIES, familyOf, skillName } from "./skills";
import type { DepartmentId, Intention, Membership, Org } from "./types";

export type Evidence = { kind: "social" | "productivity"; says: string };

// The values the metrics read about one person, as the person module supplies them.
export type PersonValues = {
  skills: string[];
  tags?: string[]; // narrow a skill down, e.g. DevOps → AWS
  comms: string;
  scores: { name: string; value: number; evidence: Evidence[] }[];
  // Where the person module has them: who they are and what they want.
  name?: string;
  source?: "roster" | "stand-in";
  openToMove?: boolean;
  intention?: string;
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
  // For each skill it lacks: people elsewhere who have it and have time to give.
  borrow: { skill: string; people: Candidate[] }[];
  hire: string[]; // lacking skills nobody with time has: hire or retrain
};

export type Candidate = { person: string; squad: string; tribe: string; spare: number };

// A person is borderline when their scores are low or little proof stands behind them.
export const BORDERLINE = { score: 0.5, proof: 0.4 };

// What to do about one borderline person: move them where a skill they have is
// lacking, or retrain them into a lacking skill close to one they have. Either
// way, a mentor from their chapter helps build proof.
export type Plan = {
  action: "reallocate" | "retrain";
  skill: string;
  squad?: string; // where to move them, or where the retrained skill is lacking
  reason: string;
  mentor?: string;
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
      ...g.singlePoints.map((s) => `Only one person has ${skillName(s)}`),
      ...(g.overloaded ? [`${g.overloaded} member(s) allocated over 100%`] : []),
      ...(understaffed ? [`${g.fte} FTE against ${sq.minSize} needed`] : []),
      ...(g.headcount && g.commsFit < 0.4 ? ["No shared way of communicating"] : []),
    ];
    const required = [
      ...g.missing.map((s) => `Add ${skillName(s)}`),
      ...g.singlePoints.map((s) => `Back up ${skillName(s)}`),
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
      borrow: [],
      hire: [],
    };
  });

  // Who has time to give, and what they can do: the pool for borrowing across groups.
  const squadTribe = new Map(org.squads.map((s) => [s.id, s.tribe]));
  const homeSquad = new Map<string, string>();
  for (const m of org.memberships) if (!homeSquad.has(m.person)) homeSquad.set(m.person, m.squad);
  const spareBySkill = new Map<string, Candidate[]>();
  for (const [person, l] of load) {
    const v = valuesOf(person);
    if (!v || l > 0.8 || isBorderline(v)) continue;
    const squad = homeSquad.get(person)!;
    const c = { person, squad, tribe: squadTribe.get(squad)!, spare: Math.round((1 - l) * 100) / 100 };
    for (const s of new Set(v.skills)) spareBySkill.set(s, [...(spareBySkill.get(s) ?? []), c]);
  }
  for (const sq of squads) {
    for (const skill of sq.missing) {
      const people = (spareBySkill.get(skill) ?? [])
        .filter((c) => c.squad !== sq.id)
        // Most time first; between equals, someone from another tribe spreads the load.
        .sort((a, b) => b.spare - a.spare || Number(b.tribe !== sq.tribe) - Number(a.tribe !== sq.tribe))
        .slice(0, 3);
      if (people.length) sq.borrow.push({ skill, people });
      else sq.hire.push(skill);
    }
  }

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

  // Domains cut across everything: a family's people are whoever has one of its skills.
  const domains = FAMILIES.map((f) => {
    const ids = new Set(f.skills.map((x) => x.id));
    return over(
      f.id,
      f.name,
      org.memberships.filter((m) => valuesOf(m.person)?.skills.some((s) => ids.has(s))),
    );
  });

  const people = new Set(org.memberships.map((m) => m.person));
  const plans = planBorderline(org, valuesOf, squads);
  const gaps = squads.reduce((n, s) => n + s.missing.length, 0);
  return {
    plans,
    totals: {
      borderline: plans.size,
      utilisation: [...load.values()].reduce((a, b) => a + Math.min(1, b), 0) / (load.size || 1),
      spareFte: Math.round([...load.values()].reduce((a, b) => a + Math.max(0, 1 - b), 0)),
      gaps,
      borrowable: squads.reduce((n, s) => n + s.borrow.length, 0),
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
    domains,
  };
}

export function isBorderline(v: PersonValues) {
  if (!v.scores.length) return false;
  const mean = v.scores.reduce((a, s) => a + s.value, 0) / v.scores.length;
  const proof = v.scores.filter((s) => s.evidence.length).length / v.scores.length;
  return mean < BORDERLINE.score || proof < BORDERLINE.proof;
}

// A plan for every borderline person: reallocate where a skill of theirs is
// lacking, else retrain into the most lacking skill of a family they know.
function planBorderline(org: Org, valuesOf: ValuesOf, squads: SquadMetrics[]) {
  const plans = new Map<string, Plan>();
  const home = new Map<string, Membership>();
  for (const m of org.memberships) if (!home.has(m.person)) home.set(m.person, m);

  // Lacking skills, most lacking first, with the squads that lack them.
  const lacking = new Map<string, SquadMetrics[]>();
  for (const sq of squads) for (const s of sq.missing) lacking.set(s, [...(lacking.get(s) ?? []), sq]);
  const demand = [...lacking].sort((a, b) => b[1].length - a[1].length);

  // Mentors: people with strong, proven scores, by chapter.
  const mentors = new Map<string, { person: string; skills: string[]; score: number }[]>();
  for (const [person, m] of home) {
    const v = valuesOf(person);
    if (!v || isBorderline(v)) continue;
    const proven = v.scores.filter((s) => s.evidence.length);
    const score = proven.reduce((a, s) => a + s.value, 0) / (proven.length || 1);
    if (score < 0.75) continue;
    mentors.set(m.chapter, [...(mentors.get(m.chapter) ?? []), { person, skills: v.skills, score }]);
  }

  for (const [person, m] of home) {
    const v = valuesOf(person);
    if (!v || !isBorderline(v)) continue;
    const mentor = (mentors.get(m.chapter) ?? [])
      .filter((x) => x.skills.some((s) => v.skills.includes(s)))
      .sort((a, b) => b.score - a.score)[0] ?? (mentors.get(m.chapter) ?? [])[0];

    // Reallocate: a skill they have that another squad lacks, in a squad whose
    // most common way of communicating is theirs, so the move also fixes fit.
    const dominant = (sq: SquadMetrics) =>
      Object.entries(sq.comms).sort((a, b) => b[1] - a[1])[0]?.[0];
    const move = v.skills
      .flatMap((skill) => (lacking.get(skill) ?? []).map((sq) => ({ skill, sq })))
      // Nobody who has said they want to stay is moved.
      .filter((x) => v.openToMove !== false && x.sq.id !== m.squad && dominant(x.sq) === v.comms)
      // A gap nobody can be borrowed for first.
      .sort((a, b) => Number(b.sq.hire.includes(b.skill)) - Number(a.sq.hire.includes(a.skill)))[0];
    if (move) {
      plans.set(person, {
        action: "reallocate",
        skill: move.skill,
        squad: move.sq.id,
        reason: `Has ${skillName(move.skill)}, which ${move.sq.name} lacks`,
        mentor: mentor?.person,
      });
      continue;
    }
    // Retrain: into a skill squads lack and cannot borrow, in a family they
    // already work in where there is one; else the most lacking such skill.
    const families = new Set(v.skills.map((s) => familyOf(s)?.id));
    const unborrowable = demand.filter(([s, sqs]) => sqs.some((sq) => sq.hire.includes(s)));
    const pool = unborrowable.length ? unborrowable : demand;
    const near = pool.find(([s]) => families.has(familyOf(s)?.id) && !v.skills.includes(s));
    const any = near ?? pool.find(([s]) => !v.skills.includes(s));
    if (!any) continue;
    const [skill, short] = any;
    plans.set(person, {
      action: "retrain",
      skill,
      squad: short[0].id,
      reason: `${short.length} squad(s) lack ${skillName(skill)}${near ? `, close to their ${skillName(v.skills.find((s) => familyOf(s)?.id === familyOf(skill)?.id) ?? v.skills[0])}` : ""}`,
      mentor: mentor?.person,
    });
  }
  return plans;
}

export type MemberRow = {
  person: string;
  name: string | null; // where the person module names them
  source: "roster" | "stand-in" | null;
  intention: string | null;
  department: DepartmentId;
  tribes: string[];
  squads: string[];
  chapter: string;
  guilds: string[];
  load: number;
  // What the metrics read from the person module; null where it has no values.
  skills: string[] | null;
  tags: string[];
  families: string[];
  comms: string | null;
  proven: number | null; // share of the person's scores that carry proof
  provenScore: number | null; // mean of their proven scores
  meanScore: number | null; // mean of all their scores, proven or not
  borderline: boolean;
  plan: Plan | null;
};

// Everyone in the org, one row a person, with where they sit and what the metrics read of them.
export function memberRows(
  org: Org,
  valuesOf: ValuesOf,
  plans: Map<string, Plan>,
): MemberRow[] {
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
    const skills = v ? [...new Set(v.skills)] : null;
    return {
      person,
      name: v?.name ?? null,
      source: v ? (v.source ?? "stand-in") : null,
      intention: v?.intention ?? null,
      department: chapter.get(ms[0].chapter)!.department,
      tribes: [...new Set(ms.map((m) => squad.get(m.squad)!.tribe))],
      squads: ms.map((m) => m.squad),
      chapter: ms[0].chapter,
      guilds: guildsOf.get(person) ?? [],
      load: Math.round(ms.reduce((s, m) => s + m.share, 0) * 100) / 100,
      skills,
      tags: v?.tags ?? [],
      families: [...new Set((skills ?? []).map((s) => familyOf(s)?.id ?? ""))].filter(Boolean),
      comms: v?.comms ?? null,
      proven: v && v.scores.length ? proven.length / v.scores.length : null,
      provenScore: proven.length
        ? proven.reduce((s, x) => s + x.value, 0) / proven.length
        : null,
      meanScore: v && v.scores.length ? v.scores.reduce((a, s) => a + s.value, 0) / v.scores.length : null,
      borderline: v ? isBorderline(v) : false,
      plan: plans.get(person) ?? null,
    };
  });
}

// ---- Domains: skill families, cut across every grouping.

export type DomainCell = {
  family: string;
  holders: number; // people in the group with a skill of the family
  needed: number; // skills of the family the group's squads need
  lacking: string[]; // needed skills fewer people have than squads need them
  shortfall: number; // squads, summed over those skills, nobody in the group can cover
};

export type Sharer = {
  person: string;
  name: string | null;
  skill: string;
  comms: string;
  fit: boolean; // communicates the way the group mostly does
  spare: number;
};

// A group lacking skills of a domain, paired with the group strongest in them
// and the people there best placed to share what they know.
export type Collab = {
  group: string;
  family: string;
  skills: string[];
  partner: string;
  partnerHolders: number;
  people: Sharer[];
};

// A department or chapter is held only to the domains its department is home to.
export type GroupMembers = { id: string; members: Membership[]; department?: DepartmentId };

export function domainsOf(
  org: Org,
  valuesOf: ValuesOf,
  groups: GroupMembers[],
): { cells: Record<string, DomainCell[]>; collabs: Collab[] } {
  const needsOf = new Map(org.squads.map((s) => [s.id, org.intentions.find((i) => i.id === s.intention)!.needs]));
  const load = new Map<string, number>();
  for (const m of org.memberships) load.set(m.person, (load.get(m.person) ?? 0) + m.share);

  const facts = groups.map((g) => {
    const people = [...new Set(g.members.map((m) => m.person))];
    const vs = people.map((p) => ({ p, v: valuesOf(p) })).filter((x) => x.v) as { p: string; v: PersonValues }[];
    // Supply: people a skill. Demand: the group's squads that need it.
    const supply = new Map<string, number>();
    for (const x of vs) for (const sk of new Set(x.v.skills)) supply.set(sk, (supply.get(sk) ?? 0) + 1);
    const demand = new Map<string, number>();
    for (const sq of new Set(g.members.map((m) => m.squad)))
      for (const sk of needsOf.get(sq) ?? [])
        if (!g.department || familyOf(sk)?.department === g.department)
          demand.set(sk, (demand.get(sk) ?? 0) + 1);
    const comms: Record<string, number> = {};
    for (const { v } of vs) comms[v.comms] = (comms[v.comms] ?? 0) + 1;
    const dominant = Object.entries(comms).sort((a, b) => b[1] - a[1])[0]?.[0];
    return { id: g.id, vs, supply, demand, dominant };
  });

  const cells: Record<string, DomainCell[]> = {};
  for (const f of facts)
    cells[f.id] = FAMILIES.map((fam) => {
      const ids = new Set(fam.skills.map((s) => s.id));
      const needed = [...f.demand.keys()].filter((s) => ids.has(s));
      const short = (s: string) => Math.max(0, f.demand.get(s)! - (f.supply.get(s) ?? 0));
      return {
        family: fam.id,
        holders: f.vs.filter((x) => x.v.skills.some((s) => ids.has(s))).length,
        needed: needed.length,
        lacking: needed.filter((s) => short(s) > 0),
        shortfall: needed.reduce((n, s) => n + short(s), 0),
      };
    });

  const collabs: Collab[] = [];
  for (const f of facts)
    for (const cell of cells[f.id]) {
      if (!cell.lacking.length) continue;
      // The other group with the most people to spare in the lacking skills:
      // holders beyond what its own squads need.
      const partner = facts
        .filter((o) => o.id !== f.id)
        .map((o) => ({
          o,
          n: cell.lacking.reduce(
            (n, s) => n + Math.max(0, (o.supply.get(s) ?? 0) - (o.demand.get(s) ?? 0)),
            0,
          ),
        }))
        .sort((a, b) => b.n - a.n)[0];
      if (!partner || !partner.n) continue;
      const people = partner.o.vs
        .filter((x) => !isBorderline(x.v) && x.v.skills.some((s) => cell.lacking.includes(s)))
        .map((x) => {
          const proven = x.v.scores.filter((s) => s.evidence.length);
          return {
            person: x.p,
            name: x.v.name ?? null,
            skill: x.v.skills.find((s) => cell.lacking.includes(s))!,
            comms: x.v.comms,
            fit: x.v.comms === f.dominant,
            spare: Math.max(0, Math.round((1 - (load.get(x.p) ?? 1)) * 100) / 100),
            score: proven.reduce((a, s) => a + s.value, 0) / (proven.length || 1),
          };
        })
        // Same way of working first, then the most proven, then the most time.
        .sort((a, b) => Number(b.fit) - Number(a.fit) || b.score - a.score || b.spare - a.spare)
        .slice(0, 3)
        .map(({ score: _score, ...rest }) => rest);
      if (!people.length) continue; // nobody there fit to share it
      collabs.push({
        group: f.id,
        family: cell.family,
        skills: cell.lacking,
        partner: partner.o.id,
        partnerHolders: partner.n,
        people,
      });
    }
  const short = new Map(collabs.map((c) => [c, cells[c.group].find((x) => x.family === c.family)!.shortfall]));
  collabs.sort((a, b) => short.get(b)! - short.get(a)!);
  return { cells, collabs };
}

export type OrgMetrics = ReturnType<typeof computeOrg>;
