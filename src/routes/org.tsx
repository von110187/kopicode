import {
  IconAddressBook,
  IconAlertTriangle,
  IconAtom,
  IconBriefcase,
  IconBuildingCommunity,
  IconBuildingSkyscraper,
  IconChartBar,
  IconHierarchy2,
  IconLayoutGrid,
  IconSparkles,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ViewSwitch } from "~/components/ViewSwitch";
import { lazy, type ReactNode, Suspense, useEffect, useMemo, useState } from "react";
import type { Fit, Zone } from "~/components/WorldScene";
import { FloatingDock } from "~/components/ui/floating-dock";
import type { GroupMetrics, MemberRow } from "~/org/metrics";
import { type Dim, LEVELS, type Level, type OrgSearch, parseOrgSearch, type Picks, type Status } from "~/org/search";
import { FAMILIES, skillName } from "~/org/skills";
import { getOrgView, getOrgWorld, type Lacking, type Names, type OrgView, type OrgWorld } from "~/server/org";
import appCss from "~/styles/app.css?url";
import twCss from "~/styles/tw.css?url";

// three.js is loaded only in the browser, with the world.
const WorldScene = lazy(() => import("~/components/WorldScene").then((m) => ({ default: m.WorldScene })));

export const Route = createFileRoute("/org")({
  validateSearch: parseOrgSearch,
  // Everyone is loaded once; picks only change who is lit up.
  loader: () => getOrgWorld(),
  staleTime: Infinity,
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
  company: ["Company", "Companies"],
  department: ["Department", "Departments"],
  tribe: ["Tribe", "Tribes"],
  squad: ["Squad", "Squads"],
  chapter: ["Chapter", "Chapters"],
  guild: ["Guild", "Guilds"],
  domain: ["Domain", "Domains"],
};
const STATUS_NAMES: Record<Status, string> = {
  borderline: "Borderline behaviour or proof",
  overloaded: "Over 100% allocated",
  spare: "Has time to give (≤ 80%)",
  "fills-gap": "Could fill a lacking skill",
};
const DIM_NAMES: Record<Dim, string> = {
  ...Object.fromEntries(LEVELS.map((l) => [l, LEVEL_NAMES[l][1]])),
  domain: "Domains, skills & tags",
  skill: "Skills",
  tag: "Tags",
  status: "Status",
} as Record<Dim, string>;
const COMMS = ["Meetings", "Chat", "Written", "Calls"];
const pct = (n: number) => `${Math.round(n * 100)}%`;
const icon = "h-full w-full";

// Each domain is an island; people without values yet stand on their own.
const ZONES: Zone[] = [
  ...FAMILIES.map((f, i) => ({ id: f.id, name: f.name, hue: (i * 33 + 10) % 360 })),
  { id: "unknown", name: "Not yet profiled", hue: 40 },
];
const zoneOf = (m: MemberRow) => m.families[0] ?? "unknown";

function useGo() {
  const navigate = useNavigate({ from: Route.fullPath });
  return (s: Partial<OrgSearch>) => navigate({ search: (prev) => ({ ...prev, ...s }), replace: true });
}

// Does a person meet one dock's picks? Any pick in the dock will do.
function meets(d: Dim, picks: string[], m: MemberRow, gaps: Set<string>) {
  const any = (xs: readonly string[]) => xs.some((x) => picks.includes(x));
  switch (d) {
    case "company":
      return any(m.companies);
    case "department":
      return picks.includes(m.department);
    case "tribe":
      return any(m.tribes);
    case "squad":
      return any(m.squads);
    case "chapter":
      return picks.includes(m.chapter);
    case "guild":
      return any(m.guilds);
    case "domain":
      return any(m.families);
    case "skill":
      return any(m.skills ?? []);
    case "tag":
      return any(m.tags);
    case "status":
      return picks.some((s) =>
        s === "borderline"
          ? m.borderline
          : s === "overloaded"
            ? m.load > 1
            : s === "spare"
              ? m.load <= 0.8
              : (m.skills ?? []).some((k) => gaps.has(k)) && (m.load <= 0.8 || m.borderline),
      );
  }
}

// Fit: meets every dock picked. Partial: meets some but not all. None: no picks met.
function useFit(pick: Picks, lacking: Lacking[]) {
  return useMemo(() => {
    const dims = (Object.keys(pick) as Dim[]).filter((d) => pick[d]?.length);
    if (!dims.length) return null;
    const gaps = new Set(lacking.map((l) => l.skill));
    return (m: MemberRow): Fit => {
      const met = dims.filter((d) => meets(d, pick[d]!, m, gaps)).length;
      return met === dims.length ? "fit" : met > 0 ? "partial" : "none";
    };
  }, [pick, lacking]);
}

function OrgPage() {
  const world = Route.useLoaderData();
  const search = Route.useSearch();
  const go = useGo();
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState<Dim | null>(null);
  const [pinned, setPinned] = useState(false);
  const [client, setClient] = useState(false);
  useEffect(() => setClient(true), []);

  const fit = useFit(search.pick, world.lacking);
  const counts = useMemo(() => {
    const c = { fit: 0, partial: 0 };
    if (fit) for (const m of world.members) {
      const f = fit(m);
      if (f !== "none") c[f]++;
    }
    return c;
  }, [fit, world.members]);
  const person = selected ? world.members.find((m) => m.person === selected) : undefined;
  const picked = (Object.keys(search.pick) as Dim[]).filter((d) => search.pick[d]?.length);

  const toggle = (d: Dim, id: string) => {
    const cur = search.pick[d] ?? [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    go({ pick: { ...search.pick, [d]: next } });
  };
  // Metrics and members are read by the first grouping picked, for its picks.
  const readBy: Level = LEVELS.find((l) => search.pick[l]?.length) ?? "tribe";
  const openDrawer = (view: "metrics" | "members") =>
    go({ view: search.view === view ? "3d" : view, level: readBy, groups: search.pick[readBy] ?? [] });

  const dockDims: [Dim, ReactNode][] = [
    ["company", <IconBuildingCommunity className={icon} />],
    ["department", <IconBriefcase className={icon} />],
    ["tribe", <IconUsersGroup className={icon} />],
    ["squad", <IconUsers className={icon} />],
    ["chapter", <IconHierarchy2 className={icon} />],
    ["guild", <IconSparkles className={icon} />],
    ["domain", <IconAtom className={icon} />],
    ["status", <IconAlertTriangle className={icon} />],
  ];
  const badge = (d: Dim) =>
    d === "domain"
      ? (search.pick.domain?.length ?? 0) + (search.pick.skill?.length ?? 0) + (search.pick.tag?.length ?? 0)
      : (search.pick[d]?.length ?? 0);
  const dock = [
    ...dockDims.map(([d, ic]) => ({
      title: DIM_NAMES[d],
      icon: ic,
      active: open === d,
      badge: badge(d),
      onHover: () => {
        if (!pinned) setOpen(d);
      },
      onClick: () => {
        if (open === d && pinned) {
          setOpen(null);
          setPinned(false);
        } else {
          setOpen(d);
          setPinned(true);
        }
      },
    })),
    {
      title: "Metrics",
      icon: <IconChartBar className={icon} />,
      active: search.view === "metrics",
      onClick: () => openDrawer("metrics"),
    },
    {
      title: "Members",
      icon: <IconAddressBook className={icon} />,
      active: search.view === "members",
      onClick: () => openDrawer("members"),
    },
    { title: "Catalogue", icon: <IconLayoutGrid className={icon} />, href: "/" },
    { title: "3D city", icon: <IconBuildingSkyscraper className={icon} />, href: "/city" },
  ];

  return (
    <div className="org-world">
      {client ? (
        <Suspense fallback={<div className="world loading">Building the world…</div>}>
          <WorldScene
            people={world.members}
            zones={ZONES}
            zoneOf={zoneOf}
            match={fit}
            single={search.single}
            selected={selected}
            onPick={setSelected}
          />
        </Suspense>
      ) : (
        <div className="world loading">Building the world…</div>
      )}

      <header className="hud-top">
        <div className="brand">
          <div className="brand-row">
            <Link to="/">GTech City</Link>
            <ViewSwitch current="org" />
          </div>
          <span>
            {world.totals.people} people · {world.totals.roster} from the person roster · each domain an island
          </span>
        </div>
        {fit ? (
          <div className="fitbar">
            <b>{counts.fit}</b> fit everything picked
            {picked.length > 1 && (
              <>
                {" "}
                · <b className="red">{counts.partial}</b> fit some but not all
              </>
            )}
            <label>
              <input type="checkbox" checked={search.single} onChange={(e) => go({ single: e.target.checked })} />{" "}
              Single out
            </label>
            <button className="link" onClick={() => go({ pick: {}, single: false })}>
              Clear
            </button>
          </div>
        ) : (
          <div className="fitbar muted">Hover the dock to pick groups, domains, skills, tags or status.</div>
        )}
      </header>

      {picked.length > 0 && (
        <div className="hud-picks">
          {picked.flatMap((d) =>
            search.pick[d]!.map((id) => (
              <button key={`${d}:${id}`} onClick={() => toggle(d, id)} title={`Remove (${DIM_NAMES[d]})`}>
                <small>{d}</small> {chipName(d, id, world.names)} ×
              </button>
            )),
          )}
        </div>
      )}

      <div className="hud-key">
        <span className="k-ring">◯</span> fits everything picked
        {picked.length > 1 && (
          <>
            {" "}
            · <span className="k-red">■</span> fits some, not all
          </>
        )}{" "}
        · <span className="k-amber">◆</span> borderline among them · click someone to follow them
      </div>

      {person && <PersonCard m={person} names={world.names} onClose={() => setSelected(null)} />}

      <div className="dock-zone">
        {/* One hover area for the panel, the dock and the gap between, so moving up keeps it open. */}
        <div
          className="dock-stack"
          onMouseLeave={() => {
            if (!pinned) setOpen(null);
          }}
        >
        {open && (
          <DockPanel
            dim={open}
            world={world}
            pick={search.pick}
            toggle={toggle}
            pinned={pinned}
            onClose={() => {
              setOpen(null);
              setPinned(false);
            }}
          />
        )}
        <FloatingDock
          items={dock}
          desktopClassName="border border-[#d9d2c4] bg-white/90 shadow-lg backdrop-blur"
        />
        </div>
      </div>

      {search.view !== "3d" && <Drawer search={search} />}
    </div>
  );
}

function chipName(d: Dim, id: string, names: OrgWorld["names"]) {
  if (d === "skill") return skillName(id);
  if (d === "tag" || d === "status") return d === "status" ? STATUS_NAMES[id as Status] : id;
  const table = (names as Record<string, Record<string, string>>)[d];
  return table?.[id] ?? id;
}

// Everything under one dock, as chips to pick, each with how many people it holds.
function DockPanel({
  dim,
  world,
  pick,
  toggle,
  pinned,
  onClose,
}: {
  dim: Dim;
  world: OrgWorld;
  pick: Picks;
  toggle: (d: Dim, id: string) => void;
  pinned: boolean;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const on = (d: Dim, id: string) => pick[d]?.includes(id) ?? false;
  const count = useMemo(() => {
    const c = new Map<string, number>();
    const add = (k: string) => c.set(k, (c.get(k) ?? 0) + 1);
    for (const m of world.members) {
      for (const s of m.skills ?? []) add(`skill:${s}`);
      for (const t of new Set(m.tags)) add(`tag:${t}`);
    }
    return c;
  }, [world.members]);
  const chip = (d: Dim, id: string, label: string, n?: number, cls = "") => (
    <button key={`${d}:${id}`} className={cls} aria-pressed={on(d, id)} onClick={() => toggle(d, id)}>
      {label}
      {n != null && <small>{n}</small>}
    </button>
  );

  let body: ReactNode;
  if (dim === "domain") {
    body = (
      <div className="domain-cols">
        {FAMILIES.map((f) => {
          const group = world.groups.domain.find((g) => g.id === f.id);
          const skills = f.skills.filter(
            (s) =>
              !needle ||
              f.name.toLowerCase().includes(needle) ||
              s.name.toLowerCase().includes(needle) ||
              s.tags.some((t) => t.toLowerCase().includes(needle)),
          );
          if (!skills.length) return null;
          return (
            <div key={f.id} className="domain-col">
              {chip("domain", f.id, f.name, group?.headcount, "head")}
              {skills.map((s) => (
                <div key={s.id} className="skill-row">
                  {chip("skill", s.id, s.name, count.get(`skill:${s.id}`) ?? 0)}
                  <div className="tags">
                    {s.tags.map((t) => chip("tag", t, t, count.get(`tag:${t}`) ?? 0, "tag"))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  } else if (dim === "status") {
    body = (
      <div className="chips-wrap">
        {(Object.keys(STATUS_NAMES) as Status[]).map((s) => chip("status", s, STATUS_NAMES[s]))}
      </div>
    );
  } else {
    const groups = world.groups[dim as Level].filter((g) => !needle || g.name.toLowerCase().includes(needle));
    body =
      dim === "squad" ? (
        <div className="domain-cols">
          {Object.entries(world.names.tribe).map(([tribe, name]) => {
            const mine = groups.filter((g) => world.names.squadTribe[g.id] === tribe);
            if (!mine.length) return null;
            return (
              <div key={tribe} className="domain-col">
                <b className="col-head">{name}</b>
                <div className="chips-wrap">{mine.map((g) => chip("squad", g.id, g.name, g.headcount))}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="chips-wrap">{groups.map((g) => chip(dim, g.id, g.name, g.headcount))}</div>
      );
  }

  return (
    <div className="dock-panel" role="dialog" aria-label={DIM_NAMES[dim]}>
      <div className="dock-panel-head">
        <b>{DIM_NAMES[dim]}</b>
        <span className="sub">
          Any pick here matches; picks in different docks must all match.
        </span>
        {(dim === "domain" || dim === "squad" || dim === "chapter") && (
          <input type="search" placeholder="Find" value={q} onChange={(e) => setQ(e.target.value)} />
        )}
        {pinned && (
          <button className="link" onClick={onClose}>
            Close
          </button>
        )}
      </div>
      {body}
    </div>
  );
}

function PersonCard({ m, names, onClose }: { m: MemberRow; names: OrgWorld["names"]; onClose: () => void }) {
  return (
    <aside className="person-card hud-card">
      <button className="link close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <h3>
        <Who m={m} />
      </h3>
      <p className="sub">
        {names.department[m.department]} · {m.companies.map((c) => names.company[c]).join(", ")}
      </p>
      {m.intention && <p className="sub">Intention: {m.intention}</p>}
      <dl className="kv">
        <dt>Tribe</dt>
        <dd>{m.tribes.map((t) => names.tribe[t]).join(", ")}</dd>
        <dt>Squads</dt>
        <dd>{m.squads.map((s) => names.squad[s]).join(", ")}</dd>
        <dt>Load</dt>
        <dd>{pct(m.load)}</dd>
        <dt>Domains</dt>
        <dd>{m.families.map((f) => names.domain[f]).join(", ") || "—"}</dd>
        <dt>Skills</dt>
        <dd>{m.skills ? skills(m.skills) : "no values"}</dd>
        {m.tags.length > 0 && (
          <>
            <dt>Tags</dt>
            <dd>{m.tags.join(", ")}</dd>
          </>
        )}
        <dt>Comms</dt>
        <dd>{m.comms ?? "—"}</dd>
        <dt>Score</dt>
        <dd>
          {m.meanScore == null ? "—" : m.meanScore.toFixed(2)} · {m.proven == null ? "—" : pct(m.proven)} with proof
        </dd>
        {m.guilds.length > 0 && (
          <>
            <dt>Guilds</dt>
            <dd>{m.guilds.map((g) => names.guild[g]).join(", ")}</dd>
          </>
        )}
      </dl>
      {m.plan && (
        <div className="plan">
          <b>{planText(m, names)}</b>
          <span>{m.plan.reason}</span>
          {m.mentor && <span>Mentor: {m.mentor}</span>}
        </div>
      )}
    </aside>
  );
}

// Metrics or members over the world, for the grouping and groups picked.
function Drawer({ search }: { search: OrgSearch }) {
  const go = useGo();
  const [data, setData] = useState<OrgView | null>(null);
  const key = JSON.stringify([search.level, search.groups, search.view]);
  useEffect(() => {
    let live = true;
    setData(null);
    getOrgView({ data: { level: search.level, groups: search.groups, view: search.view } }).then((d) => {
      if (live) setData(d);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <aside className="drawer">
      <div className="drawer-head">
        <div className="seg" role="group" aria-label="View">
          {(["metrics", "members"] as const).map((v) => (
            <button key={v} aria-pressed={search.view === v} onClick={() => go({ view: v })}>
              {v === "metrics" ? "Metrics" : "Members"}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Read by">
          {LEVELS.map((l) => (
            <button key={l} aria-pressed={search.level === l} onClick={() => go({ level: l, groups: search.pick[l] ?? [] })}>
              {LEVEL_NAMES[l][1]}
            </button>
          ))}
        </div>
        <button className="link" onClick={() => go({ view: "3d" })}>
          Close
        </button>
      </div>
      {!data ? (
        <p className="sub">Loading…</p>
      ) : search.view === "metrics" ? (
        <Metrics data={data} />
      ) : (
        <Members data={data} search={search} />
      )}
    </aside>
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
                <button onClick={() => go({ pick: { department: [d.id] }, view: "3d" })}>In 3D</button>
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
                <button onClick={() => go({ pick: { [data.level]: [r.id] }, view: "3d" })}>In 3D</button>
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

function planText(m: MemberRow, names: Omit<Names, "group">) {
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
      {!search.pick.status?.includes("borderline") && (
        <button onClick={() => go({ pick: { ...search.pick, status: ["borderline"] }, view: "3d" })}>
          Light them up in 3D
        </button>
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
  const fit = useFit(search.pick, data.lacking);
  const match = useMemo(() => (fit ? (m: MemberRow) => fit(m) === "fit" : () => true), [fit]);

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
                          {m.mentor && ` · mentor ${m.mentor}`}
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

// A person by name, marked where the person roster is who names them, with their id under it.
function Who({ m }: { m: MemberRow }) {
  return (
    <>
      {m.name}
      {m.source === "roster" && <em className="roster">roster</em>}
      <small>{m.person}</small>
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
