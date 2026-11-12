import {
  IconAddressBook,
  IconBriefcase,
  IconBuildingSkyscraper,
  IconHierarchy2,
  IconLayoutGrid,
  IconSparkles,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Nav } from "~/components/Nav";
import { FloatingDock } from "~/components/ui/floating-dock";
import type { GroupMetrics } from "~/org/metrics";
import { type Level, type OrgSearch, parseOrgSearch } from "~/org/search";
import { getOrgView, type OrgView } from "~/server/org";
import appCss from "~/styles/app.css?url";
import twCss from "~/styles/tw.css?url";

export const Route = createFileRoute("/org")({
  validateSearch: parseOrgSearch,
  loaderDeps: ({ search }) => search,
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
};
const LEVEL_SAYS: Record<Level, string> = {
  department: "A functional home that cuts across every tribe.",
  tribe: "A mission area of up to ~150 people, made of squads.",
  squad: "A small team working towards one project intention.",
  chapter: "One department's people inside one tribe.",
  guild: "An interest community anyone can join, across tribes.",
};
const COMMS = ["Meetings", "Chat", "Written", "Calls"];
const pct = (n: number) => `${Math.round(n * 100)}%`;
const icon = "h-full w-full";

function useGo() {
  const navigate = useNavigate({ from: Route.fullPath });
  return (s: Partial<OrgSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...s }) });
}

function OrgPage() {
  const data = Route.useLoaderData();
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
      }[l],
      active: level === l && view === "metrics",
      onClick: () => go({ level: l, groups: [], view: "metrics" }),
    })),
    {
      title: "Members",
      icon: <IconAddressBook className={icon} />,
      active: view === "members",
      onClick: () => go({ view: "members" }),
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
          [totals.tribes, "tribes"],
          [totals.squads, "squads"],
          [totals.chapters, "chapters"],
          [totals.guilds, "guilds"],
          [pct(totals.coverage), "skill coverage"],
          [pct(totals.proven), "scores with proof"],
          [pct(totals.impact), "impact vs intention"],
          [totals.overloaded, "people over 100%"],
          [totals.bottlenecks, "bottlenecks"],
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
            {(["metrics", "members"] as const).map((v) => (
              <button
                key={v}
                aria-pressed={view === v}
                onClick={() => go({ view: v })}
              >
                {v === "metrics" ? "Metrics" : "Members"}
              </button>
            ))}
          </div>
        </div>
        <Picker data={data} />
      </section>

      {view === "metrics" ? <Metrics data={data} /> : <Members data={data} />}

      <p className="note">
        The organisation is dummy data. People's values (skills, communication
        preference, scores and their proof) come from a stand-in for the person
        module, which is built separately; the metrics recompute from whatever
        values it supplies.
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
  const shown = data.options.filter((o) =>
    o.name.toLowerCase().includes(q.trim().toLowerCase()),
  );
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

function Metrics({ data }: { data: Data }) {
  const go = useGo();
  const tribeIds = Object.keys(data.names.tribe);
  const squadsOf = (tribe: string) =>
    Object.entries(data.names.squadTribe)
      .filter(([, t]) => t === tribe)
      .map(([s]) => s);

  return (
    <>
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
                  {d.lacking.slice(0, 4).map((l) => (
                    <span key={l.skill}>
                      {l.skill} <b>×{l.squads}</b>
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
                    <span key={m}>{m}</span>
                  ))}
                </p>
              )}
              <p className="sub">
                {r.bottlenecks} bottlenecks across its squads
                {r.singlePoints.length > 0 && `; only one person has ${r.singlePoints.slice(0, 3).join(", ")}`}
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
                <th>Bottlenecks · required</th>
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
                    {s.missing.length > 0 && <small>no {s.missing.join(", ")}</small>}
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
                    {s.required.length > 0 && (
                      <small className="req">Required: {s.required.join(" · ")}</small>
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

const PAGE = 100;

// Everyone in the picked groups, with where they sit and what the metrics read of them.
function Members({ data }: { data: Data }) {
  const [q, setQ] = useState("");
  const [overloadedOnly, setOverloadedOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const { names } = data;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.members.filter(
      (m) =>
        (!overloadedOnly || m.load > 1) &&
        (!needle ||
          m.person.includes(needle) ||
          m.skills?.some((s) => s.includes(needle)) ||
          m.squads.some((s) => names.squad[s].toLowerCase().includes(needle))),
    );
  }, [data.members, q, overloadedOnly, names]);

  return (
    <section className="panel">
      <div className="picker-bar">
        <input
          type="search"
          placeholder="Find by person, skill or squad"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setLimit(PAGE);
          }}
        />
        <label className="sub">
          <input
            type="checkbox"
            checked={overloadedOnly}
            onChange={(e) => setOverloadedOnly(e.target.checked)}
          />{" "}
          Over 100% only
        </label>
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
              <th>Skills</th>
              <th className="n">Proof</th>
              <th className="n">Proven score</th>
              <th>Guilds</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((m) => (
              <tr key={m.person} className={m.load > 1 ? "hot" : ""}>
                <td>{m.person}</td>
                <td>{names.department[m.department]}</td>
                <td>
                  {m.tribes.map((t) => names.tribe[t]).join(", ")}
                  <small>{m.squads.map((s) => names.squad[s]).join(", ")}</small>
                </td>
                <td className="n">{pct(m.load)}</td>
                <td>{m.comms ?? <small>no values</small>}</td>
                <td>{m.skills?.join(", ") ?? <small>no values</small>}</td>
                <td className="n">{m.proven == null ? "—" : pct(m.proven)}</td>
                <td className="n">{m.provenScore == null ? "—" : m.provenScore.toFixed(2)}</td>
                <td>{m.guilds.map((g) => names.guild[g]).join(", ")}</td>
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
  );
}
