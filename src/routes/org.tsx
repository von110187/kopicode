import {
  IconAddressBook,
  IconAtom,
  IconBriefcase,
  IconBuildingSkyscraper,
  IconCube3dSphere,
  IconHierarchy2,
  IconLayoutGrid,
  IconSparkles,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Nav } from "~/components/Nav";
import type { Placed, SceneGroup } from "~/components/OrgScene";
import { FloatingDock } from "~/components/ui/floating-dock";
import type { GroupMetrics, MemberRow } from "~/org/metrics";
import { type Level, type OrgSearch, parseOrgSearch, type View } from "~/org/search";
import { FAMILIES, SKILLS, skillName } from "~/org/skills";
import { getOrgView, type OrgView } from "~/server/org";
import appCss from "~/styles/app.css?url";
import twCss from "~/styles/tw.css?url";

// three.js is only loaded when the 3D view is opened, and only in the browser.
const OrgScene = lazy(() => import("~/components/OrgScene").then((m) => ({ default: m.OrgScene })));

export const Route = createFileRoute("/org")({
  validateSearch: parseOrgSearch,
  // Filters work on what is already loaded; only the grouping, groups and view refetch.
  loaderDeps: ({ search: { level, groups, view } }) => ({ level, groups, view }),
  loader: ({ deps }) => getOrgView({ data: deps }),
  head: () => ({
    meta: [{ title: "GTech City · Organisation" }],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: twCss },
    ],
  }),
  component: OrgPage,
});

type Data = OrgView;

const LEVEL_NAMES: Record<Level, [string, string]> = {
  department: ["Department", "Departments"],
  tribe: ["Tribe", "Tribes"],
  squad: ["Squad", "Squads"],
  chapter: ["Chapter", "Chapters"],
  guild: ["Guild", "Guilds"],
  domain: ["Domain", "Domains"],
};
const LEVEL_SAYS: Record<Level, string> = {
  department: "A functional home that cuts across every tribe.",
  tribe: "A mission area of up to ~150 people, made of squads.",
  squad: "A small team working towards one project intention.",
  chapter: "One department's people inside one tribe.",
  guild: "An interest community anyone can join, across tribes.",
  domain: "A field of skills that cuts across every tribe, squad and department.",
};
const VIEW_NAMES: Record<View, string> = { metrics: "Metrics", members: "Members", "3d": "3D" };
const STATUS_NAMES: Record<string, string> = {
  "": "Everyone",
  borderline: "Borderline behaviour or proof",
  overloaded: "Over 100% allocated",
  spare: "Has time to give (≤ 80%)",
  "fills-gap": "Could fill a lacking skill",
};
const DEPT_NAMES: Record<string, string> = {
  "": "All departments",
  "sales-marketing": "Sales & Marketing",
  engineering: "Development & Engineering",
  product: "Product",
  finance: "Finance & Accounting",
  hr: "Human Resource",
};
const COMMS = ["Meetings", "Chat", "Written", "Calls"];
const pct = (n: number) => `${Math.round(n * 100)}%`;
const icon = "h-full w-full";

function useGo() {
  const navigate = useNavigate({ from: Route.fullPath });
  return (s: Partial<OrgSearch>) => navigate({ search: (prev) => ({ ...prev, ...s }) });
}

// Who the people filters let through.
function useMatch(search: OrgSearch, lacking: Data["lacking"]) {
  const { dept, family, skill, tag, status } = search;
  return useMemo(() => {
    const gap = new Set(lacking.map((l) => l.skill));
    return (m: MemberRow) =>
      (!dept || m.department === dept) &&
      (!family || m.families.includes(family)) &&
      (!skill || (m.skills ?? []).includes(skill)) &&
      (!tag || m.tags.includes(tag)) &&
      (status === "" ||
        (status === "borderline" && m.borderline) ||
        (status === "overloaded" && m.load > 1) ||
        (status === "spare" && m.load <= 0.8) ||
        (status === "fills-gap" &&
          (m.skills ?? []).some((s) => gap.has(s)) &&
          (m.load <= 0.8 || m.borderline)));
  }, [dept, family, skill, tag, status, lacking]);
}

function OrgPage() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const go = useGo();
  const { level, view, totals } = data;

  const dock = [
    ...(Object.keys(LEVEL_NAMES) as Level[]).map((l) => ({
      title: LEVEL_NAMES[l][1],
      icon: {
        department: <IconBriefcase className={icon} />,
        tribe: <IconUsersGroup className={icon} />,
        squad: <IconUsers className={icon} />,
        chapter: <IconHierarchy2 className={icon} />,
        guild: <IconSparkles className={icon} />,
        domain: <IconAtom className={icon} />,
      }[l],
      active: level === l,
      onClick: () => go({ level: l, groups: [] }),
    })),
    {
      title: "Members",
      icon: <IconAddressBook className={icon} />,
      active: view === "members",
      onClick: () => go({ view: "members" }),
    },
    {
      title: "3D people",
      icon: <IconCube3dSphere className={icon} />,
      active: view === "3d",
      onClick: () => go({ view: "3d" }),
    },
    { title: "Catalogue", icon: <IconLayoutGrid className={icon} />, href: "/" },
    { title: "3D city", icon: <IconBuildingSkyscraper className={icon} />, href: "/city" },
  ];

  return (
    <main className="with-dock">
      <Nav />
      <div className="tiles">
        {[
          [totals.people, "people"],
          [totals.roster, "from the person roster"],
          [`${totals.tribes} · ${totals.squads}`, "tribes · squads"],
          [pct(totals.utilisation), "utilisation"],
          [totals.spareFte, "FTE free to borrow"],
          [pct(totals.coverage), "skill coverage"],
          [`${totals.borrowable} / ${totals.gaps}`, "lacking skills borrowable"],
          [`${totals.borderline} (${pct(totals.borderline / totals.people)})`, "borderline people"],
          [pct(totals.proven), "scores with proof"],
          [pct(totals.impact), "impact vs intention"],
          [totals.overloaded, "people over 100%"],
        ].map(([v, l]) => (
          <div key={l}>
            <b>{v}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{LEVEL_NAMES[level][1]}</h2>
            <p className="sub">{LEVEL_SAYS[level]}</p>
          </div>
          <div className="seg" role="group" aria-label="View">
            {(Object.keys(VIEW_NAMES) as View[]).map((v) => (
              <button key={v} aria-pressed={view === v} onClick={() => go({ view: v })}>
                {VIEW_NAMES[v]}
              </button>
            ))}
          </div>
        </div>
        <Picker data={data} />
        {view !== "metrics" && <Filters search={search} />}
      </section>

      {view === "metrics" && <Metrics data={data} />}
      {view === "members" && <Members data={data} search={search} />}
      {view === "3d" && <Scene data={data} search={search} />}

      <p className="note">
        The organisation is dummy data. People's values (skills, tags, communication preference,
        scores and their proof) come from a stand-in for the person module, which is built
        separately; the metrics recompute from whatever values it supplies.
      </p>

      <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center">
        <FloatingDock
          items={dock}
          desktopClassName="border border-[#d9d2c4] bg-white/90 shadow-lg backdrop-blur"
        />
      </div>
    </main>
  );
}

// Which groups of the grouping to look at. None picked means all of them.
function Picker({ data }: { data: Data }) {
  const go = useGo();
  const [q, setQ] = useState("");
  const picked = new Set(data.picked);
  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    go({ groups: [...next] });
  };
  const shown = data.options.filter((o) => o.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="picker">
      <div className="picker-bar">
        {data.options.length > 10 && (
          <input
            type="search"
            placeholder={`Find a ${LEVEL_NAMES[data.level][0].toLowerCase()}`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        )}
        <span className="sub">
          {picked.size
            ? `${picked.size} of ${data.options.length} picked`
            : `All ${data.options.length} shown; pick some to compare`}
        </span>
        {picked.size > 0 && (
          <button className="link" onClick={() => go({ groups: [] })}>
            Clear
          </button>
        )}
      </div>
      <div className="options">
        {shown.map((o) => (
          <button
            key={o.id}
            aria-pressed={picked.has(o.id)}
            onClick={() => toggle(o.id)}
            title={o.tribe ? data.names.tribe[o.tribe] : undefined}
          >
            {o.name} <small>{o.headcount}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

// Dropdowns on people: department, then skill family → skill → tag, then status.
function Filters({ search }: { search: OrgSearch }) {
  const go = useGo();
  const family = FAMILIES.find((f) => f.id === search.family);
  const skill = SKILLS.find((s) => s.id === search.skill);
  const any = search.dept || search.family || search.status;
  return (
    <div className="filters">
      <label>
        <span>Department</span>
        <select value={search.dept} onChange={(e) => go({ dept: e.target.value as OrgSearch["dept"] })}>
          {Object.entries(DEPT_NAMES).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Skill family</span>
        <select
          value={search.family}
          onChange={(e) => go({ family: e.target.value, skill: "", tag: "" })}
        >
          <option value="">All families</option>
          {FAMILIES.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      {family && (
        <label>
          <span>Skill</span>
          <select value={search.skill} onChange={(e) => go({ skill: e.target.value, tag: "" })}>
            <option value="">Any {family.name.toLowerCase()} skill</option>
            {family.skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {skill && (
        <label>
          <span>Tag</span>
          <select value={search.tag} onChange={(e) => go({ tag: e.target.value })}>
            <option value="">Any tag</option>
            {skill.tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        <span>Status</span>
        <select value={search.status} onChange={(e) => go({ status: e.target.value as OrgSearch["status"] })}>
          {Object.entries(STATUS_NAMES).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {any && (
        <button
          className="link"
          onClick={() => go({ dept: "", family: "", skill: "", tag: "", status: "" })}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function CommsBar({ comms }: { comms: GroupMetrics["comms"] }) {
  const total = Object.values(comms).reduce((a, b) => a + b, 0) || 1;
  return (
    <span className="comms" title={COMMS.map((c) => `${c}: ${comms[c] ?? 0}`).join(", ")}>
      {COMMS.map((c, i) => (
        <i key={c} className={`c${i}`} style={{ width: `${((comms[c] ?? 0) / total) * 100}%` }} />
      ))}
    </span>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <span className="bar" title={pct(value)}>
      <i
        className={value >= 1 ? "ok" : value >= 0.7 ? "mid" : "low"}
        style={{ width: `${Math.min(1, value) * 100}%` }}
      />
    </span>
  );
}

function Legend() {
  return (
    <p className="legend">
      Communication preference:{" "}
      {COMMS.map((c, i) => (
        <span key={c}>
          <i className={`sw c${i}`} />
          {c}
        </span>
      ))}
    </p>
  );
}

const skills = (ids: string[]) => ids.map(skillName).join(", ");

// The metrics every group has, whatever its grouping.
function GroupFacts({ g }: { g: GroupMetrics & { impact: number } }) {
  return (
    <dl className="kv">
      <dt>People</dt>
      <dd>
        {g.headcount} · {g.fte} FTE
        {g.overloaded > 0 && ` · ${g.overloaded} over 100%`}
      </dd>
      <dt>Impact</dt>
      <dd>
        <Bar value={g.impact} /> {pct(g.impact)}
      </dd>
      <dt>Coverage</dt>
      <dd>
        <Bar value={g.coverage} /> {pct(g.coverage)}
      </dd>
      <dt>Proof</dt>
      <dd>{pct(g.proven)} of scores</dd>
      <dt>Comms</dt>
      <dd>
        <CommsBar comms={g.comms} /> {pct(g.commsFit)} share one
      </dd>
      {g.strengths.length > 0 && (
        <>
          <dt>Strong</dt>
          <dd>{g.strengths.join(", ")}</dd>
          <dt>Weak</dt>
          <dd>{g.weaknesses.join(", ")}</dd>
        </>
      )}
    </dl>
  );
}

function Lacking({ data }: { data: Data }) {
  return (
    <section className="panel">
      <h2>Lacking across the organisation</h2>
      <p className="sub">
        Skills squads need and nobody in them has. Borrowable: someone elsewhere has it and has time
        to give. The rest need hiring, or retraining borderline people into them.
      </p>
      <div className="lack-grid">
        {data.lacking.slice(0, 18).map((l) => (
          <div key={l.skill}>
            <b>{skillName(l.skill)}</b>
            <span>
              {l.squads} squads · {l.borrowable} borrowable
              {l.squads - l.borrowable > 0 && ` · ${l.squads - l.borrowable} hire or retrain`}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metrics({ data }: { data: Data }) {
  const go = useGo();
  const tribeIds = Object.keys(data.names.tribe);
  const squadsOf = (tribe: string) =>
    Object.entries(data.names.squadTribe)
      .filter(([, t]) => t === tribe)
      .map(([s]) => s);

  return (
    <>
      <Domains data={data} />
      <Collabs data={data} />
      <Lacking data={data} />
      <Legend />
      {data.level === "department" && (
        <div className="grid wide">
          {data.departments.map((d) => (
            <article className="app" key={d.id}>
              <h3>{d.name}</h3>
              <GroupFacts g={d} />
              <table>
                <thead>
                  <tr>
                    <th>Intention</th>
                    <th className="n">Own</th>
                    <th className="n">Projects</th>
                  </tr>
                </thead>
                <tbody>
                  {d.intentions.map((i) => (
                    <tr key={i.id}>
                      <td>
                        {i.says}
                        <small>
                          {i.actual} / {i.target} {i.kpi}
                        </small>
                      </td>
                      <td className="n">{pct(i.progress)}</td>
                      <td className="n">
                        {i.projectImpact == null ? "—" : `${pct(i.projectImpact)} (${i.projects})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {d.lacking.length > 0 && (
                <p className="lacking">
                  Lacking:{" "}
                  {d.lacking.slice(0, 5).map((l) => (
                    <span key={l.skill}>
                      {skillName(l.skill)} <b>×{l.squads}</b>
                    </span>
                  ))}
                </p>
              )}
              <div className="actions">
                <button
                  onClick={() =>
                    go({ level: "chapter", groups: tribeIds.map((t) => `${t}:${d.id}`), view: "metrics" })
                  }
                >
                  Its chapters
                </button>
                <button onClick={() => go({ groups: [d.id], view: "members" })}>Members</button>
                <button onClick={() => go({ groups: [d.id], view: "3d" })}>In 3D</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {data.rollups.length > 0 && (
        <div className="grid wide">
          {data.rollups.map((r) => (
            <article className="app" key={r.id}>
              <h3>
                {r.name} <small>{r.squads} squads</small>
              </h3>
              <GroupFacts g={r} />
              {r.missing.length > 0 && (
                <p className="lacking">
                  Lacking:{" "}
                  {r.missing.map((m) => (
                    <span key={m}>{skillName(m)}</span>
                  ))}
                </p>
              )}
              <p className="sub">
                {r.bottlenecks} bottlenecks across its squads
                {r.singlePoints.length > 0 &&
                  `; only one person has ${skills(r.singlePoints.slice(0, 3))}`}
              </p>
              <div className="actions">
                {data.level === "tribe" && (
                  <button onClick={() => go({ level: "squad", groups: squadsOf(r.id), view: "metrics" })}>
                    Its squads
                  </button>
                )}
                {data.level === "chapter" && (
                  <button
                    onClick={() =>
                      go({ level: "squad", groups: squadsOf(r.id.split(":")[0]), view: "metrics" })
                    }
                  >
                    Its tribe's squads
                  </button>
                )}
                <button onClick={() => go({ groups: [r.id], view: "members" })}>Members</button>
                <button onClick={() => go({ groups: [r.id], view: "3d" })}>In 3D</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {data.level === "squad" && (
        <div className="scroll panel">
          <table className="squads">
            <thead>
              <tr>
                <th>Squad</th>
                <th className="n">People</th>
                <th>Coverage</th>
                <th>Comms</th>
                <th className="n">Proof</th>
                <th>Impact</th>
                <th>Bottlenecks · borrow from other groups</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.squads.map((s) => (
                <tr key={s.id} className={s.bottlenecks.length ? "hot" : ""}>
                  <td>
                    {s.name}
                    {s.app && <em> app</em>}
                    <small>
                      {data.names.tribe[s.tribe]} · {s.intention.says}
                    </small>
                  </td>
                  <td className="n">
                    {s.headcount}
                    <small>{s.fte} FTE</small>
                  </td>
                  <td>
                    <Bar value={s.coverage} />
                    {s.missing.length > 0 && <small>no {skills(s.missing)}</small>}
                  </td>
                  <td>
                    <CommsBar comms={s.comms} />
                    <small>{pct(s.commsFit)} share one</small>
                  </td>
                  <td className="n">{pct(s.proven)}</td>
                  <td>
                    <Bar value={s.impact} />
                    <small>
                      {s.intention.actual}/{s.intention.target} {s.intention.kpi}
                    </small>
                  </td>
                  <td>
                    {s.bottlenecks.map((b) => (
                      <small key={b} className="bn">
                        {b}
                      </small>
                    ))}
                    {s.borrow.map((b) => (
                      <small key={b.skill} className="borrow">
                        {skillName(b.skill)} ←{" "}
                        {b.people
                          .map(
                            (c) =>
                              `${c.person} (${data.names.squad[c.squad]}${c.tribe !== s.tribe ? `, ${data.names.tribe[c.tribe]}` : ""}, ${pct(c.spare)} free)`,
                          )
                          .join("; ")}
                      </small>
                    ))}
                    {s.hire.length > 0 && (
                      <small className="req">Hire or retrain: {skills(s.hire)}</small>
                    )}
                  </td>
                  <td>
                    <button className="link" onClick={() => go({ groups: [s.id], view: "members" })}>
                      Members
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function planText(m: MemberRow, names: Data["names"]) {
  const p = m.plan;
  if (!p) return null;
  return p.action === "reallocate"
    ? `Reallocate to ${names.squad[p.squad!]} (${names.tribe[names.squadTribe[p.squad!]]})`
    : `Retrain in ${skillName(p.skill)}`;
}

// The borderline people, and what the plans say to do with them.
function Borderline({ data, search }: { data: Data; search: OrgSearch }) {
  const go = useGo();
  const b = data.members.filter((m) => m.borderline);
  const moves = b.filter((m) => m.plan?.action === "reallocate").length;
  const retrain = b.filter((m) => m.plan?.action === "retrain").length;
  return (
    <section className="panel border-panel">
      <div>
        <b>
          {b.length} borderline people ({pct(b.length / (data.members.length || 1))} of{" "}
          {data.picked.length ? "the groups picked" : "the organisation"})
        </b>
        <span className="sub">
          Low behaviour scores, or little social or productivity proof behind them. {moves} to reallocate
          where a skill they have is lacking and the squad works the way they do; {retrain} to
          retrain into a skill nobody can be borrowed for, close to what they know. Each has a mentor from their chapter to help build proof.
        </span>
      </div>
      {search.status !== "borderline" && (
        <button onClick={() => go({ status: "borderline" })}>Show only them</button>
      )}
    </section>
  );
}

const PAGE = 100;

// Everyone in the picked groups who passes the filters.
function Members({ data, search }: { data: Data; search: OrgSearch }) {
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const { names } = data;
  const match = useMatch(search, data.lacking);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.members.filter(
      (m) =>
        match(m) &&
        (!needle ||
          m.person.includes(needle) ||
          m.name?.toLowerCase().includes(needle) ||
          m.tags.some((t) => t.toLowerCase().includes(needle)) ||
          m.skills?.some((s) => skillName(s).toLowerCase().includes(needle)) ||
          m.squads.some((s) => names.squad[s].toLowerCase().includes(needle))),
    );
  }, [data.members, q, match, names]);

  return (
    <>
      <Borderline data={data} search={search} />
      <section className="panel">
        <div className="picker-bar">
          <input
            type="search"
            placeholder="Find by person, skill, tag or squad"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
          />
          <span className="sub">
            {rows.length} of {data.members.length} members
          </span>
        </div>
        <div className="scroll">
          <table className="squads">
            <thead>
              <tr>
                <th>Person</th>
                <th>Department</th>
                <th>Tribe · squad</th>
                <th className="n">Load</th>
                <th>Comms</th>
                <th>Skills · tags</th>
                <th className="n">Proof</th>
                <th className="n">Score</th>
                <th>Plan</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((m) => (
                <tr key={m.person} className={m.borderline ? "warn" : m.load > 1 ? "hot" : ""}>
                  <td>
                    <Who m={m} />
                  </td>
                  <td>{names.department[m.department]}</td>
                  <td>
                    {m.tribes.map((t) => names.tribe[t]).join(", ")}
                    <small>{m.squads.map((s) => names.squad[s]).join(", ")}</small>
                  </td>
                  <td className="n">{pct(m.load)}</td>
                  <td>{m.comms ?? <small>no values</small>}</td>
                  <td>
                    {m.skills ? skills(m.skills) : <small>no values</small>}
                    {m.tags.length > 0 && <small>{m.tags.join(", ")}</small>}
                  </td>
                  <td className="n">{m.proven == null ? "—" : pct(m.proven)}</td>
                  <td className="n">{m.meanScore == null ? "—" : m.meanScore.toFixed(2)}</td>
                  <td>
                    {m.plan ? (
                      <>
                        {planText(m, names)}
                        <small>
                          {m.plan.reason}
                          {m.plan.mentor && ` · mentor ${m.plan.mentor}`}
                        </small>
                      </>
                    ) : (
                      ""
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > limit && (
          <button className="more" onClick={() => setLimit(limit + PAGE)}>
            Show {Math.min(PAGE, rows.length - limit)} more
          </button>
        )}
      </section>
    </>
  );
}

// The picked groups in 3D, their people on them, the filters greying out the rest.
function Scene({ data, search }: { data: Data; search: OrgSearch }) {
  const match = useMatch(search, data.lacking);
  const [selected, setSelected] = useState<string | null>(null);
  const [client, setClient] = useState(false);
  useEffect(() => setClient(true), []);
  const { names } = data;

  const { people, groups } = useMemo(() => {
    const shown = data.picked.length ? data.options.filter((o) => data.picked.includes(o.id)) : data.options;
    const ids = new Set(shown.map((o) => o.id));
    const groupOf = (m: MemberRow) =>
      data.level === "department"
        ? m.department
        : data.level === "tribe"
          ? m.tribes[0]
          : data.level === "squad"
            ? m.squads.find((s) => ids.has(s))
            : data.level === "chapter"
              ? m.chapter
              : data.level === "guild"
                ? m.guilds.find((g) => ids.has(g))
                : m.families.find((f) => ids.has(f));
    const people: Placed[] = [];
    for (const row of data.members) {
      const group = groupOf(row);
      if (group && ids.has(group)) people.push({ row, group });
    }
    const groups: SceneGroup[] = shown.map((o, k) => ({ id: o.id, name: o.name, hue: (k * 47 + 20) % 360 }));
    return { people, groups };
  }, [data]);

  const person = selected ? data.members.find((m) => m.person === selected) : undefined;
  const count = people.filter((p) => match(p.row)).length;

  return (
    <>
      <Borderline data={data} search={search} />
      <section className="scene-wrap">
        {client ? (
          <Suspense fallback={<div className="scene loading">Loading 3D…</div>}>
            <OrgScene people={people} groups={groups} match={match} selected={selected} onPick={setSelected} />
          </Suspense>
        ) : (
          <div className="scene loading">Loading 3D…</div>
        )}
        <div className="scene-key">
          <b>{count}</b> of {people.length} people match ·{" "}
          <span className="k-amber">◆</span> borderline · <span className="k-red">◯</span> over 100% ·
          drag to orbit, scroll to zoom, click a person
        </div>
        {person && (
          <aside className="person-card">
            <button className="link close" onClick={() => setSelected(null)} aria-label="Close">
              ×
            </button>
            <h3>
              <Who m={person} />
            </h3>
            {person.intention && <p className="sub">Intention: {person.intention}</p>}
            <p className="sub">
              {names.department[person.department]} · {person.tribes.map((t) => names.tribe[t]).join(", ")}
            </p>
            <dl className="kv">
              <dt>Squads</dt>
              <dd>{person.squads.map((s) => names.squad[s]).join(", ")}</dd>
              <dt>Load</dt>
              <dd>{pct(person.load)}</dd>
              <dt>Skills</dt>
              <dd>{person.skills ? skills(person.skills) : "no values"}</dd>
              {person.tags.length > 0 && (
                <>
                  <dt>Tags</dt>
                  <dd>{person.tags.join(", ")}</dd>
                </>
              )}
              <dt>Comms</dt>
              <dd>{person.comms ?? "—"}</dd>
              <dt>Score</dt>
              <dd>
                {person.meanScore == null ? "—" : person.meanScore.toFixed(2)} ·{" "}
                {person.proven == null ? "—" : pct(person.proven)} with proof
              </dd>
              {person.guilds.length > 0 && (
                <>
                  <dt>Guilds</dt>
                  <dd>{person.guilds.map((g) => names.guild[g]).join(", ")}</dd>
                </>
              )}
            </dl>
            {person.plan && (
              <div className="plan">
                <b>{planText(person, names)}</b>
                <span>{person.plan.reason}</span>
                {person.plan.mentor && <span>Mentor: {person.plan.mentor}</span>}
              </div>
            )}
          </aside>
        )}
      </section>
    </>
  );
}

// A person by name where the person roster names them, else by id.
function Who({ m }: { m: MemberRow }) {
  return (
    <>
      {m.name ?? m.person}
      {m.source === "roster" && <em className="roster">roster</em>}
      {m.name && <small>{m.person}</small>}
    </>
  );
}

const SHORT: Record<string, string> = {
  software: "Software",
  civil: "Civil",
  geo: "Geo",
  mer: "M&E · Rail",
  site: "Site",
  property: "Property",
  landscape: "Landscape",
  commercial: "Commercial",
  growth: "Sales",
  product: "Product",
  people: "People",
};

// Groups by domains: how many people hold each, and which needed skills nobody has.
function Domains({ data }: { data: Data }) {
  const { rows, families, cells } = data.matrix;
  const across = data.level === "domain" ? "tribes" : LEVEL_NAMES[data.level][1].toLowerCase();
  return (
    <section className="panel">
      <h2>Domains across {across}</h2>
      <p className="sub">
        People in each group with a skill of the domain. Amber, −n: the group's squads need a
        domain's skills n more times than the group has people with them; hover to see which.
      </p>
      <div className="scroll">
        <table className="matrix">
          <thead>
            <tr>
              <th />
              {families.map((f) => (
                <th key={f} title={data.names.domain[f]}>
                  {SHORT[f] ?? f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 60).map((r) => (
              <tr key={r.id}>
                <th>{r.name}</th>
                {(cells[r.id] ?? []).map((c) => (
                  <td
                    key={c.family}
                    className={c.lacking.length ? "lack" : c.holders ? "have" : "none"}
                    title={
                      c.lacking.length
                        ? `Lacking: ${c.lacking.map(skillName).join(", ")}`
                        : `${c.holders} people`
                    }
                  >
                    {c.holders || ""}
                    {c.shortfall > 0 && <b>−{c.shortfall}</b>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 60 && <p className="sub">First 60 of {rows.length}; pick groups to narrow it.</p>}
    </section>
  );
}

// Who could share knowledge: a group lacking a domain's skills, the group
// strongest in them, and the people there who work the way the first group does.
function Collabs({ data }: { data: Data }) {
  if (!data.collabs.length) return null;
  const n = data.names;
  return (
    <section className="panel">
      <h2>Knowledge sharing across groups</h2>
      <p className="sub">
        Pairings that close a domain gap without moving anyone: people strong in the skill,
        sharing the group's way of communicating where possible (✓).
      </p>
      <div className="collabs">
        {data.collabs.slice(0, 16).map((c) => (
          <div key={`${c.group}/${c.family}`}>
            <b>
              {n.group[c.group]} ← {n.group[c.partner]}
            </b>
            <span className="sub">
              {n.domain[c.family]}: short of {c.skills.map(skillName).join(", ")}; {c.partnerHolders}{" "}
              to spare there
            </span>
            <ul>
              {c.people.map((p) => (
                <li key={p.person}>
                  {p.name ?? p.person} · {skillName(p.skill)} · {p.comms}
                  {p.fit && " ✓"}
                  {p.spare > 0 && ` · ${pct(p.spare)} free`}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
