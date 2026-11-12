// STAND-IN for the person module, which is another team's scope and is not
// built here. It hands the metrics made-up values in the shape they read, so
// the demo has something to compute. Replace `standInValues` with the person
// module's values and every metric recomputes from them.
import { TRIBES } from "./mock-org";
import type { PersonValues, ValuesOf } from "./metrics";
import { seeded } from "./random";
import { FAMILIES, tagsOf } from "./skills";
import type { DepartmentId, Org } from "./types";

const COMMS = ["Meetings", "Chat", "Written", "Calls"] as const;
const LEANS: Record<DepartmentId, Partial<Record<(typeof COMMS)[number], number>>> = {
  "sales-marketing": { Calls: 4, Meetings: 3, Chat: 2, Written: 1 },
  engineering: { Chat: 3, Written: 3, Meetings: 2, Calls: 1 },
  product: { Meetings: 3, Written: 3, Chat: 2, Calls: 1 },
  finance: { Written: 4, Meetings: 2, Chat: 1, Calls: 1 },
  hr: { Meetings: 4, Calls: 2, Chat: 2, Written: 1 },
};
export const SCORE_NAMES = ["Delivery", "Collaboration", "Ownership", "Communication", "Craft"];
// This share of people is drawn with low scores and little proof behind them.
export const BORDERLINE_SHARE = 0.15;
// Specialist skills few people have, so some squads cannot borrow them.
const RARE = new Set([
  "geophysics", "vibrations", "fluid-mechanics", "tunnelling", "hydrogeology", "rail-systems",
  "valuation", "arboriculture", "town-planning", "ml", "security", "tax", "bid-writing",
]);

export function standInValues(org: Org): ValuesOf {
  const r = seeded("stand-in-values");
  const chapter = new Map(org.chapters.map((c) => [c.id, c]));
  const values = new Map<string, PersonValues>();
  const deptSkills = (d: DepartmentId) =>
    FAMILIES.filter((f) => f.department === d).flatMap((f) => f.skills.map((s) => s.id));

  // Some people have no values yet; of the rest, exactly BORDERLINE_SHARE are borderline.
  const people = [...new Set(org.memberships.map((m) => m.person))];
  const known = people.filter(() => !r.chance(0.03));
  const borderline = new Set(
    [...known].sort(() => r.next() - 0.5).slice(0, Math.round(people.length * BORDERLINE_SHARE)),
  );
  const knownSet = new Set(known);
  const draw = (from: string[]) => {
    // Rare skills are drawn a quarter as often.
    const w = Object.fromEntries(from.map((s) => [s, RARE.has(s) ? 0.25 : 1]));
    return r.weighted(w);
  };

  for (const m of org.memberships) {
    if (values.has(m.person) || !knownSet.has(m.person)) continue;
    const c = chapter.get(m.chapter)!;
    const home = deptSkills(c.department);
    // Most skills are the tribe's own work in the person's department; some are not.
    const local = TRIBES.find((t) => t.id === c.tribe)!.needs.filter((s) => home.includes(s));
    const skills = new Set<string>();
    const count = r.int(1, 3);
    while (skills.size < count)
      skills.add(local.length && r.chance(0.7) ? draw(local) : draw(home));
    const tags = [...skills].flatMap((s) =>
      [...tagsOf(s)].sort(() => r.next() - 0.5).slice(0, r.int(1, 2)),
    );

    const low = borderline.has(m.person);
    values.set(m.person, {
      skills: [...skills],
      tags,
      comms: r.weighted(LEANS[c.department]),
      scores: SCORE_NAMES.map((name) => ({
        name,
        value: Math.round((low ? 0.28 + r.next() * 0.22 : 0.52 + r.next() * 0.43) * 100) / 100,
        evidence: [
          ...(r.chance(low ? 0.25 : 0.85) ? [{ kind: "productivity" as const, says: "delivered work" }] : []),
          ...(r.chance(low ? 0.15 : 0.5) ? [{ kind: "social" as const, says: "peer endorsement" }] : []),
        ],
      })),
    });
  }
  return (p) => values.get(p);
}
