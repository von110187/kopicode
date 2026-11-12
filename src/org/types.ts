// The organisation, in a simplified Spotify model, sized for about 1000 people.
//   Department: a functional home that cuts across the whole company.
//   Tribe:      a mission area of up to ~150 people, holding squads.
//   Squad:      a small team (about 6 to 10) that works towards one intention.
//   Chapter:    the people of one department inside one tribe; their line home.
//   Guild:      an interest community anyone may join, across tribes.
// People are referred to by id only. What a person is (skills, communication
// preference, scores) belongs to the person module, which is not built here.

export type DepartmentId =
  | "sales-marketing"
  | "engineering"
  | "product"
  | "finance"
  | "hr";

export type Department = {
  id: DepartmentId;
  name: string;
  skills: string[]; // the skills this department is the home of
};

// A company of the group. Its tribes are its people; a company cuts across
// departments and domains like a tribe does, one level up.
export type Company = { id: string; name: string };

export type Tribe = { id: string; name: string; mission: string; company: string };

export type Squad = {
  id: string;
  name: string;
  tribe: string;
  intention: string; // the project intention it works towards
  app?: string; // the catalogue app it builds, where it builds one
  minSize: number;
};

export type Chapter = { id: string; department: DepartmentId; tribe: string };

export type Guild = { id: string; name: string };

// What a department or a project means to achieve, and how far it has got.
// A project intention serves one department intention: its impact rolls up to it.
export type Intention = {
  id: string;
  owner: { kind: "department"; id: DepartmentId } | { kind: "project"; id: string };
  says: string;
  kpi: string;
  target: number;
  actual: number;
  weight: number; // 1 to 3, how much it matters to its owner
  needs: string[]; // skills it takes; project intentions only
  serves?: string; // the department intention a project intention serves
};

// Where a person is allocated. `share` is the fraction of their time; a person
// whose shares add up to more than 1 is overloaded.
export type Membership = {
  person: string;
  squad: string;
  chapter: string;
  share: number;
};

export type Org = {
  companies: Company[];
  departments: Department[];
  tribes: Tribe[];
  squads: Squad[];
  chapters: Chapter[];
  guilds: Guild[];
  guildMembers: Record<string, string[]>; // guild id → person ids
  intentions: Intention[];
  memberships: Membership[];
};
