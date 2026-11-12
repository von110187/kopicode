// A DUMMY organisation of about 1000 people, shaped after an engineering,
// construction, property and digital group. Every tribe, squad, guild,
// intention, KPI and figure here is invented. People are ids only.
import { catalogue } from "~/data/catalogue";
import { seeded } from "./random";
import { FAMILIES } from "./skills";
import type {
  Chapter,
  Department,
  DepartmentId,
  Intention,
  Membership,
  Org,
  Squad,
  Tribe,
} from "./types";

const homeSkills = (d: DepartmentId) =>
  FAMILIES.filter((f) => f.department === d).flatMap((f) => f.skills.map((s) => s.id));

export const DEPARTMENTS: Department[] = [
  { id: "sales-marketing", name: "Sales & Marketing", skills: homeSkills("sales-marketing") },
  { id: "engineering", name: "Development & Engineering", skills: homeSkills("engineering") },
  { id: "product", name: "Product", skills: homeSkills("product") },
  { id: "finance", name: "Finance & Accounting", skills: homeSkills("finance") },
  { id: "hr", name: "Human Resource", skills: homeSkills("hr") },
];

const DEPARTMENT_INTENTIONS: Intention[] = (
  [
    ["sales-tenders", "sales-marketing", "Win more public-sector tenders", "tenders won", 12, 8, 3],
    ["sales-property", "sales-marketing", "Sell the township launches", "units booked", 1200, 870, 2],
    ["eng-schedule", "engineering", "Deliver infrastructure packages on schedule", "% of packages on schedule", 90, 71, 3],
    ["eng-safety", "engineering", "Zero harm on every site", "% of months without a lost-time injury", 100, 92, 3],
    ["eng-reuse", "engineering", "Build once on the shared digital platform", "% of products on shared login", 80, 45, 2],
    ["product-problems", "product", "Every listed business problem has a project", "problems with a project", 18, 15, 3],
    ["product-users", "product", "Grow active users of our products", "monthly active users", 5000, 3700, 2],
    ["finance-cost", "finance", "Keep projects within budget", "% of projects within 5% of budget", 85, 64, 3],
    ["finance-close", "finance", "Close the books on time", "% of months closed on time", 100, 82, 1],
    ["hr-roles", "hr", "Fill critical roles", "critical roles filled", 30, 21, 3],
    ["hr-upskill", "hr", "Retrain people into the skills we lack", "people retrained this year", 150, 64, 2],
  ] as const
).map(([id, dept, says, kpi, target, actual, weight]) => ({
  id,
  owner: { kind: "department", id: dept },
  says,
  kpi,
  target,
  actual,
  weight,
  needs: [],
}));

// Each tribe: its mission, the departments its squads draw from, the skills
// its squads need, the department intentions it serves and its squads' themes.
type TribeSpec = Tribe & {
  areas?: ("Serve" | "Work" | "Build")[]; // catalogue apps of these areas get squads here
  mix: Partial<Record<DepartmentId, number>>;
  needs: string[];
  serves: string[];
  kpi: string;
  themes: string[];
};

export const TRIBES: TribeSpec[] = [
  {
    id: "digital",
    name: "Digital Products",
    mission: "Products for authorities, customers and site teams",
    areas: ["Serve", "Work"],
    mix: { engineering: 6, product: 2.5, "sales-marketing": 0.6, finance: 0.4 },
    needs: ["frontend", "backend", "qa", "devops", "product-mgmt", "ux-design", "user-research", "ml", "security"],
    serves: ["product-users", "product-problems"],
    kpi: "% of release plan delivered",
    themes: ["Applicant Journey", "Mobile", "Payments", "Notifications"],
  },
  {
    id: "platform",
    name: "Platform, Data & AI",
    mission: "The shared cloud, data and models every product stands on",
    areas: ["Build"],
    mix: { engineering: 8, product: 1 },
    needs: ["devops", "backend", "data-eng", "ml", "security", "iot", "qa", "bim"],
    serves: ["eng-reuse", "product-problems"],
    kpi: "% of products adopting",
    themes: ["Cloud Landing Zone", "Data Platform", "Document AI", "Digital Twin", "Observability", "Computer Vision on Site", "Sensor Network", "Cost of Cloud"],
  },
  {
    id: "rail",
    name: "Rail & Tunnelling",
    mission: "Underground lines, stations and their systems",
    mix: { engineering: 7, finance: 1, product: 0.3, hr: 0.2 },
    needs: ["tunnelling", "geotechnical", "geophysics", "ground-investigation", "vibrations", "fluid-mechanics", "rail-systems", "mechanical-plant", "surveying", "hse", "quantity-surveying", "construction-mgmt"],
    serves: ["eng-schedule", "eng-safety", "finance-cost"],
    kpi: "% of drive or package plan",
    themes: ["TBM Drive North", "TBM Drive South", "Underground Stations", "Tunnel Ventilation", "Ground Movement Monitoring", "Trackwork & Signalling", "Vibration Control", "Cross Passages", "Segment Factory"],
  },
  {
    id: "highways",
    name: "Highways & Bridges",
    mission: "Expressways, interchanges and bridges",
    mix: { engineering: 7, finance: 1.2, "sales-marketing": 0.2 },
    needs: ["highways", "bridges", "structural", "geotechnical", "hydraulics", "surveying", "site-supervision", "quality-control", "hse", "drones", "contracts"],
    serves: ["eng-schedule", "eng-safety", "finance-cost"],
    kpi: "% of package plan",
    themes: ["Expressway Package A", "Expressway Package B", "Interchanges", "Bridge Inspection", "Pavement", "Slope Works", "Traffic Management", "Drainage"],
  },
  {
    id: "water",
    name: "Water & Environment",
    mission: "Water, sewerage, flood mitigation and reclamation",
    mix: { engineering: 7, finance: 0.8, "sales-marketing": 0.3 },
    needs: ["water-treatment", "hydraulics", "fluid-mechanics", "hydrogeology", "eia", "esg", "mep", "power", "site-supervision", "hse"],
    serves: ["eng-schedule", "eng-safety"],
    kpi: "% of plant or network plan",
    themes: ["Water Treatment Plant", "Sewerage Network", "Flood Mitigation", "Dewatering", "Environmental Monitoring", "Coastal Reclamation", "Solar Farm"],
  },
  {
    id: "property",
    name: "Property & Townships",
    mission: "Townships planned, built, sold and looked after",
    mix: { "sales-marketing": 3, engineering: 3, finance: 1, product: 0.4 },
    needs: ["property-dev", "town-planning", "valuation", "real-estate-sales", "property-mgmt", "landscape-arch", "horticulture", "arboriculture", "mep", "quantity-surveying", "esg"],
    serves: ["sales-property", "finance-cost"],
    kpi: "% of launch or handover plan",
    themes: ["Township Masterplan", "Show Gallery & Sales", "Valuation Desk", "Parks & Landscape", "Estate Management", "Green Building", "Handover & Defects"],
  },
  {
    id: "corporate",
    name: "Growth & Corporate",
    mission: "Win work, and keep money and people in order",
    mix: { "sales-marketing": 2.5, finance: 3, hr: 2.5, engineering: 0.5 },
    needs: ["sales", "bid-writing", "partnerships", "marketing", "accounting", "procurement", "tax", "treasury", "costing", "recruitment", "learning", "people-ops", "payroll"],
    serves: ["sales-tenders", "finance-close", "hr-roles", "hr-upskill"],
    kpi: "% of plan",
    themes: ["Public Sector Bids", "Overseas Bids", "Partnerships & JV", "Brand & Digital", "Group Finance Close", "Procurement", "Tax & Treasury", "Talent Acquisition", "Learning Academy", "Payroll & Rewards"],
  },
];

const GUILDS = [
  { id: "ai", name: "AI Practitioners" },
  { id: "esg", name: "ESG" },
  { id: "safety", name: "Safety Champions" },
  { id: "bim", name: "BIM & Digital Twin" },
  { id: "geo", name: "Ground Engineering" },
  { id: "bids", name: "Bid Excellence" },
  { id: "cloud", name: "Cloud Community" },
];

const PEOPLE = 1000;
// Exactly PEOPLE in all: the first tribes take one more where it does not divide.
const quota = (k: number) =>
  Math.floor(PEOPLE / TRIBES.length) + (k < PEOPLE % TRIBES.length ? 1 : 0);
export const personId = (n: number) => `p${String(n).padStart(4, "0")}`;

export function mockOrg(): Org {
  const r = seeded("gtech-org");
  const tribes: Tribe[] = TRIBES.map(({ id, name, mission }) => ({ id, name, mission }));
  const chapters: Chapter[] = TRIBES.flatMap((t) =>
    (Object.keys(t.mix) as DepartmentId[]).map((d) => ({
      id: `${t.id}:${d}`,
      department: d,
      tribe: t.id,
    })),
  );
  const intentions: Intention[] = [...DEPARTMENT_INTENTIONS];
  const squads: Squad[] = [];
  const memberships: Membership[] = [];
  let person = 0;

  for (const [k, t] of TRIBES.entries()) {
    const PER_TRIBE = quota(k);
    // The catalogue's apps in this tribe's areas each get a squad first.
    const apps = t.areas
      ? catalogue.apps.filter((a) =>
          catalogue.problems.some(
            (p) => a.problems.includes(p.id) && t.areas!.includes(p.area),
          ),
        )
      : [];
    const tribeStart = person;
    let n = 0;
    while (person - tribeStart < PER_TRIBE) {
      const app = apps.find((a) => !squads.some((s) => s.app === a.id));
      const k = n - apps.length;
      const theme = app ? app.name : t.themes[k % t.themes.length];
      const round = app ? 0 : Math.floor(k / t.themes.length);
      const id = `${t.id}-${n + 1}`;
      const needs = [...t.needs].sort(() => r.next() - 0.5).slice(0, r.int(4, 6));
      intentions.push({
        id: `${id}-intention`,
        owner: { kind: "project", id },
        says: app ? app.what : `${theme}: ${t.mission.toLowerCase()}`,
        kpi: t.kpi,
        target: 100,
        actual: r.int(35, 125),
        weight: r.int(1, 3),
        needs,
        serves: r.pick(t.serves),
      });
      const minSize = r.int(6, 9);
      squads.push({
        id,
        name: round ? `${theme} ${round + 1}` : theme,
        tribe: t.id,
        intention: `${id}-intention`,
        app: app?.id,
        minSize,
      });
      // Some squads are short of people, so understaffing shows.
      const left = PER_TRIBE - (person - tribeStart);
      const want = r.chance(0.15) ? minSize - 2 : r.int(minSize, minSize + 3);
      const size = left - want < 4 ? left : want; // no squad of one or two at the end
      for (let i = 0; i < size; i++) {
        const dept = r.weighted(t.mix);
        // About one person in ten is only part-allocated, and has time to give.
        const share = r.chance(1 / 10) ? r.pick([0.5, 0.6, 0.7]) : 1;
        memberships.push({
          person: personId(++person),
          squad: id,
          chapter: `${t.id}:${dept}`,
          share,
        });
      }
      n++;
    }
  }

  // About one person in twelve is lent to a second squad of their tribe, overloading them.
  const base = [...memberships];
  for (const m of base) {
    if (m.share < 1 || !r.chance(1 / 12)) continue;
    const tribe = squads.find((s) => s.id === m.squad)!.tribe;
    const other = r.pick(squads.filter((s) => s.tribe === tribe && s.id !== m.squad));
    if (!other) continue;
    m.share = 0.8;
    memberships.push({ ...m, squad: other.id, share: 0.4 });
  }

  const guildMembers: Record<string, string[]> = {};
  for (const g of GUILDS) guildMembers[g.id] = [];
  for (let i = 1; i <= person; i++)
    if (r.chance(0.3)) guildMembers[r.pick(GUILDS).id].push(personId(i));

  return {
    departments: DEPARTMENTS,
    tribes,
    squads,
    chapters,
    guilds: GUILDS,
    guildMembers,
    intentions,
    memberships,
  };
}
