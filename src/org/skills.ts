// The skills a Gamuda-wide organisation works with, as family → skill → tags.
// A squad needs skills; a person has skills, and tags narrow a skill down
// (DevOps → AWS, GCP). Invented for the demo, shaped after what an
// engineering, construction, property and digital group does.
import type { DepartmentId } from "./types";

export type SkillFamily = {
  id: string;
  name: string;
  department: DepartmentId; // the department that is the family's home
  site: boolean; // works on site: hard hat and hi-vis
  skills: { id: string; name: string; tags: string[] }[];
};

export const FAMILIES: SkillFamily[] = [
  {
    id: "software",
    name: "Software & Cloud",
    department: "engineering",
    site: false,
    skills: [
      { id: "frontend", name: "Frontend", tags: ["React", "TypeScript", "Accessibility"] },
      { id: "backend", name: "Backend", tags: ["Node.js", "Java", "Python", "PostgreSQL"] },
      { id: "devops", name: "DevOps", tags: ["AWS", "GCP", "Azure", "Kubernetes", "Terraform", "CI/CD"] },
      { id: "data-eng", name: "Data Engineering", tags: ["BigQuery", "Spark", "dbt", "Kafka"] },
      { id: "ml", name: "Machine Learning", tags: ["LLMs", "Computer Vision", "Forecasting"] },
      { id: "qa", name: "QA & Testing", tags: ["Automation", "Performance", "Playwright"] },
      { id: "security", name: "Cybersecurity", tags: ["IAM", "Pen testing", "ISO 27001"] },
      { id: "iot", name: "IoT & Sensors", tags: ["LoRaWAN", "SCADA", "Edge devices"] },
    ],
  },
  {
    id: "civil",
    name: "Civil & Structural",
    department: "engineering",
    site: true,
    skills: [
      { id: "structural", name: "Structural Design", tags: ["Eurocode", "Steel", "Precast", "Post-tensioning"] },
      { id: "bridges", name: "Bridge Engineering", tags: ["Segmental", "Cable-stayed", "Inspection"] },
      { id: "highways", name: "Highway Design", tags: ["Pavement", "Traffic", "Geometric design"] },
      { id: "hydraulics", name: "Drainage & Hydraulics", tags: ["Stormwater", "Flood modelling", "HEC-RAS"] },
      { id: "fluid-mechanics", name: "Fluid Mechanics", tags: ["CFD", "Pipe networks", "Ventilation"] },
      { id: "vibrations", name: "Vibrations & Dynamics", tags: ["Blast vibration", "Rail vibration", "Monitoring"] },
      { id: "bim", name: "BIM", tags: ["Revit", "Navisworks", "Tekla", "Digital twin"] },
    ],
  },
  {
    id: "geo",
    name: "Geotechnical & Earth Sciences",
    department: "engineering",
    site: true,
    skills: [
      { id: "geotechnical", name: "Geotechnical Engineering", tags: ["Slope stability", "Piling", "Retaining walls"] },
      { id: "tunnelling", name: "Tunnelling & TBM", tags: ["EPB", "Slurry", "Segment design", "NATM"] },
      { id: "geophysics", name: "Geophysics", tags: ["Seismic refraction", "GPR", "Resistivity (ERT)"] },
      { id: "geology", name: "Engineering Geology", tags: ["Karst", "Rock mass", "Mapping"] },
      { id: "ground-investigation", name: "Ground Investigation", tags: ["Boreholes", "SPT", "CPT", "Lab testing"] },
      { id: "hydrogeology", name: "Hydrogeology", tags: ["Dewatering", "Groundwater modelling"] },
    ],
  },
  {
    id: "mer",
    name: "Mechanical, Electrical & Rail",
    department: "engineering",
    site: true,
    skills: [
      { id: "mep", name: "MEP Design", tags: ["HVAC", "Fire protection", "Plumbing"] },
      { id: "rail-systems", name: "Rail Systems", tags: ["Signalling", "Traction power", "Trackwork"] },
      { id: "power", name: "Power & Energy", tags: ["Solar", "Substations", "Energy audit"] },
      { id: "mechanical-plant", name: "Mechanical Plant", tags: ["TBM maintenance", "Cranes", "Hydraulics"] },
      { id: "water-treatment", name: "Water Treatment", tags: ["Membranes", "Sewerage", "Process control"] },
    ],
  },
  {
    id: "site",
    name: "Site & Survey",
    department: "engineering",
    site: true,
    skills: [
      { id: "surveying", name: "Land Surveying", tags: ["GNSS", "Total station", "Setting out"] },
      { id: "site-supervision", name: "Site Supervision", tags: ["Earthworks", "Concreting", "Formwork"] },
      { id: "construction-mgmt", name: "Construction Management", tags: ["Primavera P6", "Planning", "Claims"] },
      { id: "hse", name: "Health, Safety & Environment", tags: ["ISO 45001", "Permit to work", "Incident review"] },
      { id: "quality-control", name: "Quality Control", tags: ["ISO 9001", "NCR", "Inspection & test plans"] },
      { id: "drones", name: "Drones & Photogrammetry", tags: ["LiDAR", "Orthomosaic", "Progress capture"] },
    ],
  },
  {
    id: "property",
    name: "Property & Valuation",
    department: "sales-marketing",
    site: false,
    skills: [
      { id: "valuation", name: "Valuation", tags: ["Registered valuer", "Land valuation", "Rental"] },
      { id: "property-dev", name: "Property Development", tags: ["Feasibility", "Township planning", "Launch"] },
      { id: "town-planning", name: "Town Planning", tags: ["Planning permission", "Zoning", "Master plans"] },
      { id: "property-mgmt", name: "Property Management", tags: ["Facilities", "Strata", "Leasing"] },
      { id: "real-estate-sales", name: "Real Estate Sales", tags: ["Show gallery", "Agency", "Bookings"] },
    ],
  },
  {
    id: "landscape",
    name: "Landscape & Environment",
    department: "engineering",
    site: true,
    skills: [
      { id: "horticulture", name: "Horticulture & Gardening", tags: ["Planting", "Turf", "Nursery"] },
      { id: "landscape-arch", name: "Landscape Architecture", tags: ["Parks", "Streetscape", "Green roofs"] },
      { id: "arboriculture", name: "Arboriculture", tags: ["Tree survey", "Tree protection"] },
      { id: "eia", name: "Environmental Assessment", tags: ["EIA", "Noise", "Air quality"] },
      { id: "esg", name: "ESG & Sustainability", tags: ["GHG accounting", "Green building", "Reporting"] },
    ],
  },
  {
    id: "commercial",
    name: "Commercial & Finance",
    department: "finance",
    site: false,
    skills: [
      { id: "quantity-surveying", name: "Quantity Surveying", tags: ["Bills of quantities", "Cost planning", "Final accounts"] },
      { id: "contracts", name: "Contracts Management", tags: ["FIDIC", "PAM", "Variations"] },
      { id: "procurement", name: "Procurement", tags: ["Tendering", "Vendor management"] },
      { id: "costing", name: "Project Costing", tags: ["Earned value", "Forecasting"] },
      { id: "accounting", name: "Accounting", tags: ["MFRS", "Consolidation", "Payables"] },
      { id: "tax", name: "Tax", tags: ["Indirect tax", "Transfer pricing"] },
      { id: "treasury", name: "Treasury", tags: ["Cash flow", "Hedging"] },
    ],
  },
  {
    id: "growth",
    name: "Sales & Marketing",
    department: "sales-marketing",
    site: false,
    skills: [
      { id: "sales", name: "Sales", tags: ["Enterprise", "Public sector", "Key accounts"] },
      { id: "marketing", name: "Marketing", tags: ["Digital", "Brand", "Content"] },
      { id: "bid-writing", name: "Bid Writing", tags: ["Tenders", "Pre-qualification"] },
      { id: "partnerships", name: "Partnerships", tags: ["Joint ventures", "Alliances"] },
      { id: "customer-success", name: "Customer Success", tags: ["Onboarding", "Renewals"] },
    ],
  },
  {
    id: "product",
    name: "Product & Design",
    department: "product",
    site: false,
    skills: [
      { id: "product-mgmt", name: "Product Management", tags: ["Roadmaps", "Discovery", "Metrics"] },
      { id: "ux-design", name: "UX Design", tags: ["Figma", "Design systems", "Prototyping"] },
      { id: "user-research", name: "User Research", tags: ["Interviews", "Usability testing", "Field studies"] },
    ],
  },
  {
    id: "people",
    name: "People",
    department: "hr",
    site: false,
    skills: [
      { id: "recruitment", name: "Recruitment", tags: ["Graduates", "Technical hiring", "Employer brand"] },
      { id: "people-ops", name: "People Operations", tags: ["Employee relations", "Policies"] },
      { id: "learning", name: "Learning & Development", tags: ["Upskilling", "Coaching", "Certification"] },
      { id: "payroll", name: "Payroll & Rewards", tags: ["Payroll", "Benefits", "Grading"] },
    ],
  },
];

export const SKILLS = FAMILIES.flatMap((f) =>
  f.skills.map((s) => ({ ...s, family: f.id })),
);
const byId = new Map(SKILLS.map((s) => [s.id, s]));
const familyById = new Map(FAMILIES.map((f) => [f.id, f]));

export const skillName = (id: string) => byId.get(id)?.name ?? id;
export const familyOf = (skill: string) => familyById.get(byId.get(skill)?.family ?? "");
export const skillsOfFamily = (family: string) =>
  familyById.get(family)?.skills.map((s) => s.id) ?? [];
export const familiesOfDepartment = (d: DepartmentId) =>
  FAMILIES.filter((f) => f.department === d).map((f) => f.id);
export const tagsOf = (skill: string) => byId.get(skill)?.tags ?? [];
