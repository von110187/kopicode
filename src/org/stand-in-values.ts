// STAND-IN for the person module, which is another team's scope and is not
// built here. It hands the metrics made-up values in the shape they read, so
// the demo has something to compute. Replace `standInValues` with the person
// module's values and every metric recomputes from them.
import { DEPARTMENTS } from "./mock-org";
import { seeded } from "./random";
import type { PersonValues, ValuesOf } from "./metrics";
import type { DepartmentId, Org } from "./types";

const COMMS = ["Meetings", "Chat", "Written", "Calls"] as const;
const LEANS: Record<DepartmentId, Partial<Record<(typeof COMMS)[number], number>>> = {
  "sales-marketing": { Calls: 4, Meetings: 3, Chat: 2, Written: 1 },
  engineering: { Chat: 4, Written: 3, Meetings: 1, Calls: 0.5 },
  product: { Meetings: 3, Written: 3, Chat: 2, Calls: 1 },
  finance: { Written: 4, Meetings: 2, Chat: 1, Calls: 1 },
  hr: { Meetings: 4, Calls: 2, Chat: 2, Written: 1 },
};
const SCORES = ["Delivery", "Collaboration", "Ownership", "Communication", "Craft"];

export function standInValues(org: Org): ValuesOf {
  const r = seeded("stand-in-values");
  const dept = new Map(org.chapters.map((c) => [c.id, c.department]));
  const values = new Map<string, PersonValues>();
  const all = DEPARTMENTS.flatMap((d) => d.skills);
  for (const m of org.memberships) {
    if (values.has(m.person) || r.chance(0.03)) continue; // some have no values yet
    const d = dept.get(m.chapter)!;
    const home = DEPARTMENTS.find((x) => x.id === d)!.skills;
    const skills = [r.pick(home), r.pick(home)];
    if (r.chance(0.15)) skills.push(r.pick(all));
    values.set(m.person, {
      skills,
      comms: r.weighted(LEANS[d]),
      scores: SCORES.map((name) => ({
        name,
        value: Math.round((0.3 + r.next() * 0.65) * 100) / 100,
        evidence: [
          ...(r.chance(0.6) ? [{ kind: "productivity" as const, says: "delivered work" }] : []),
          ...(r.chance(0.35) ? [{ kind: "social" as const, says: "peer endorsement" }] : []),
        ],
      })),
    });
  }
  return (p) => values.get(p);
}
