// A DUMMY organisation of about 1000 people. Every tribe, squad, guild,
// intention, KPI and figure here is invented. People are ids only.
import { catalogue } from "~/data/catalogue";
import { seeded } from "./random";
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

export const DEPARTMENTS: Department[] = [
  {
    id: "sales-marketing",
    name: "Sales & Marketing",
    skills: ["sales", "marketing", "partnerships", "bid-writing"],
  },
  {
    id: "engineering",
    name: "Development & Engineering",
    skills: ["frontend", "backend", "data-eng", "devops", "qa", "ml", "iot"],
  },
  {
    id: "product",
    name: "Product",
    skills: ["product-mgmt", "ux-design", "user-research"],
  },
  {
    id: "finance",
    name: "Finance & Accounting",
    skills: ["accounting", "costing", "procurement"],
  },
  { id: "hr", name: "Human Resource", skills: ["recruitment", "people-ops", "learning"] },
];

const DEPARTMENT_INTENTIONS: Intention[] = (
  [
    ["sales-tenders", "sales-marketing", "Win more public-sector tenders", "tenders won", 12, 8, 3],
    ["sales-arr", "sales-marketing", "Grow recurring product revenue", "RM m recurring revenue", 20, 13, 2],
    ["eng-ship", "engineering", "Ship small and often, without breaking things", "deploys a week", 40, 31, 2],
    ["eng-reuse", "engineering", "Build once on the shared platform", "% of products on shared login", 80, 45, 3],
    ["product-problems", "product", "Every listed business problem has a project", "problems with a project", 18, 15, 3],
    ["product-users", "product", "Grow active users", "monthly active users", 5000, 3700, 2],
    ["finance-cost", "finance", "Keep each product under RM 100 a user a month", "products under the line", 19, 12, 3],
    ["finance-close", "finance", "Close the books on time", "% of months closed on time", 100, 82, 1],
    ["hr-roles", "hr", "Fill critical roles", "critical roles filled", 30, 21, 3],
    ["hr-retain", "hr", "Keep the people we have", "% retention", 92, 88, 2],
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
  area?: "Serve" | "Work" | "Build";
  mix: Partial<Record<DepartmentId, number>>;
  needs: string[];
  serves: string[];
  kpi: string;
  themes: string[];
};

const TRIBES: TribeSpec[] = [
  {
    id: "serve",
    name: "Serve",
    mission: "Products for authorities and customers",
    area: "Serve",
    mix: { engineering: 6, product: 2, "sales-marketing": 1, finance: 0.5 },
    needs: ["frontend", "backend", "qa", "product-mgmt", "ux-design", "user-research", "sales"],
    serves: ["product-users", "sales-arr", "product-problems"],
    kpi: "% of release plan delivered",
    themes: ["Applicant Journey", "Payments", "Notifications", "Mobile", "Authority Portal", "Accessibility"],
  },
  {
    id: "work",
    name: "Work",
    mission: "Tools for site and office work",
    area: "Work",
    mix: { engineering: 6, product: 2, finance: 0.5, hr: 0.3 },
    needs: ["frontend", "backend", "data-eng", "qa", "product-mgmt", "ux-design", "ml"],
    serves: ["product-problems", "product-users", "eng-ship"],
    kpi: "% of release plan delivered",
    themes: ["Approvals", "Field Capture", "Search", "Scheduling", "Offline Sync", "Reporting"],
  },
  {
    id: "build",
    name: "Build",
    mission: "The shared platform every product stands on",
    area: "Build",
    mix: { engineering: 8, product: 1 },
    needs: ["backend", "devops", "qa", "data-eng", "iot", "product-mgmt"],
    serves: ["eng-reuse", "eng-ship"],
    kpi: "% of products adopting",
    themes: ["Observability", "CI Pipelines", "Cloud Cost", "Developer Portal", "Secrets", "Edge"],
  },
  {
    id: "data-ai",
    name: "Data & AI",
    mission: "Data and models other squads build on",
    mix: { engineering: 6, product: 1.5, finance: 0.3 },
    needs: ["data-eng", "ml", "backend", "product-mgmt", "user-research"],
    serves: ["product-problems", "eng-reuse"],
    kpi: "% of model targets met",
    themes: ["Data Platform", "Document AI", "Forecasting", "Vision", "Assistants", "Data Quality", "Feature Store", "Evaluation"],
  },
  {
    id: "growth",
    name: "Growth",
    mission: "Find, win and keep customers",
    mix: { "sales-marketing": 6, product: 1, engineering: 1, finance: 0.5 },
    needs: ["sales", "marketing", "partnerships", "bid-writing", "costing", "frontend"],
    serves: ["sales-tenders", "sales-arr"],
    kpi: "% of pipeline target",
    themes: ["Public Sector Bids", "Enterprise Sales", "Partnerships", "Brand", "Web & Campaigns", "Customer Success", "Pricing", "Events"],
  },
  {
    id: "finance-ops",
    name: "Finance Ops",
    mission: "Money in, money out, on time",
    mix: { finance: 6, engineering: 1, "sales-marketing": 0.3 },
    needs: ["accounting", "costing", "procurement", "data-eng"],
    serves: ["finance-cost", "finance-close"],
    kpi: "% of close tasks on time",
    themes: ["Close", "Billing", "Procurement", "Project Costing", "Treasury", "Audit", "Cost per User"],
  },
  {
    id: "people",
    name: "People",
    mission: "Hire, grow and keep people",
    mix: { hr: 6, engineering: 0.6, product: 0.4 },
    needs: ["recruitment", "people-ops", "learning", "frontend"],
    serves: ["hr-roles", "hr-retain"],
    kpi: "% of hiring plan",
    themes: ["Talent Acquisition", "Onboarding", "Learning", "Rewards", "People Analytics", "Wellbeing", "Graduate Programme"],
  },
  {
    id: "site",
    name: "Site Delivery",
    mission: "Products in use on construction sites",
    mix: { engineering: 5, product: 1.5, finance: 1, "sales-marketing": 0.5 },
    needs: ["iot", "backend", "frontend", "costing", "product-mgmt", "user-research"],
    serves: ["eng-ship", "finance-cost", "product-users"],
    kpi: "% of site rollout plan",
    themes: ["Rollout North", "Rollout South", "Safety", "Handover", "Equipment", "Site Training", "Quality Checks"],
  },
];

const GUILDS = [
  { id: "ai", name: "AI Practitioners" },
  { id: "esg", name: "ESG" },
  { id: "security", name: "Security Champions" },
  { id: "design-systems", name: "Design Systems" },
  { id: "data-literacy", name: "Data Literacy" },
  { id: "bids", name: "Bid Excellence" },
];

const PEOPLE = 1000;
const PER_TRIBE = Math.round(PEOPLE / TRIBES.length);

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

  for (const t of TRIBES) {
    // The catalogue's apps in this tribe's area each get a squad first.
    const apps = t.area
      ? catalogue.apps.filter((a) =>
          catalogue.problems.some((p) => a.problems.includes(p.id) && p.area === t.area),
        )
      : [];
    const tribeStart = person;
    let n = 0;
    while (person - tribeStart < PER_TRIBE) {
      const app = apps[n];
      const theme = app ? app.name : t.themes[(n - apps.length) % t.themes.length];
      const round = app ? 0 : Math.floor((n - apps.length) / t.themes.length);
      const id = `${t.id}-${n + 1}`;
      const needs = [...t.needs].sort(() => r.next() - 0.5).slice(0, r.int(3, 5));
      const target = 100;
      intentions.push({
        id: `${id}-intention`,
        owner: { kind: "project", id },
        says: app ? app.what : `${theme}: ${t.mission.toLowerCase()}`,
        kpi: t.kpi,
        target,
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
      const size = Math.min(PER_TRIBE - (person - tribeStart), r.chance(0.15) ? minSize - 2 : r.int(minSize, minSize + 3));
      for (let i = 0; i < size; i++) {
        const dept = r.weighted(t.mix);
        memberships.push({
          person: `p${String(++person).padStart(4, "0")}`,
          squad: id,
          chapter: `${t.id}:${dept}`,
          share: 1,
        });
      }
      n++;
    }
  }

  // About one person in twelve is lent to a second squad of their tribe, overloading them.
  const base = [...memberships];
  for (const m of base) {
    if (!r.chance(1 / 12)) continue;
    const tribe = squads.find((s) => s.id === m.squad)!.tribe;
    const other = r.pick(squads.filter((s) => s.tribe === tribe && s.id !== m.squad));
    if (!other) continue;
    m.share = 0.8;
    memberships.push({ ...m, squad: other.id, share: 0.4 });
  }

  const guildMembers: Record<string, string[]> = {};
  for (const g of GUILDS) guildMembers[g.id] = [];
  for (let i = 1; i <= person; i++)
    if (r.chance(0.3))
      guildMembers[r.pick(GUILDS).id].push(`p${String(i).padStart(4, "0")}`);

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
