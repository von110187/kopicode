import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Nav } from "~/components/Nav";
import type { App, Gap } from "~/data/catalogue";
import { getCatalogue } from "~/server/catalogue";
import appCss from "~/styles/app.css?url";
import catalogueCss from "~/styles/catalogue.css?url";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: catalogueCss },
    ],
  }),
  loader: () => getCatalogue(),
  component: Home,
});

type Rule = Gap["rule"];

// The rules in the order a business reader should meet them, each with the kind of
// trouble it is: work nobody does or does twice, a project nobody answers for, or upkeep.
const RULES: { id: Rule; name: string; tone: "work" | "owner" | "upkeep" }[] = [
  { id: "no-project", name: "No project", tone: "work" },
  { id: "overlap", name: "Overlap", tone: "work" },
  { id: "no-owner", name: "No owner", tone: "owner" },
  { id: "unlisted", name: "Unlisted", tone: "owner" },
  { id: "costly", name: "Costly", tone: "upkeep" },
  { id: "stale-docs", name: "Stale docs", tone: "upkeep" },
  { id: "no-docs-date", name: "No docs", tone: "upkeep" },
];
const ruleOf = (id: string) =>
  RULES.find((r) => r.id === id) ?? { id, name: id, tone: "upkeep" as const };
const rank = (id: string) => {
  const i = RULES.findIndex((r) => r.id === id);
  return i < 0 ? RULES.length : i;
};

const rm = (n: number) => "RM " + Math.round(n).toLocaleString("en-MY");
const count = (n: number | null) =>
  n == null ? "not recorded" : n.toLocaleString("en-MY");

type Sort = "gaps" | "cost" | "name";

function Tag({ rule }: { rule: string }) {
  const r = ruleOf(rule);
  return <span className={"tag " + r.tone}>{r.name}</span>;
}

function Home() {
  const { apps, problems, gaps } = Route.useLoaderData();
  const [rule, setRule] = useState<Rule | "all">("all");
  const [find, setFind] = useState("");
  const [sort, setSort] = useState<Sort>("gaps");

  const problemName = (id: string) =>
    problems.find((p) => p.id === id)?.name ?? id;
  const appName = (id: string) => apps.find((a) => a.id === id)?.name ?? id;

  const ordered = useMemo(
    () => gaps.slice().sort((a, b) => rank(a.rule) - rank(b.rule)),
    [gaps],
  );
  const gapsOf = (a: App) => ordered.filter((g) => g.apps.includes(a.id));
  const shown = ordered.filter((g) => rule === "all" || g.rule === rule);

  const cost = apps.reduce((s, a) => s + a.costMonth, 0);
  const uncovered = problems.filter(
    (p) => !apps.some((a) => a.problems.includes(p.id)),
  );

  const words = find.trim().toLowerCase();
  const listed = apps
    .filter(
      (a) =>
        !words ||
        [
          a.name,
          a.what,
          a.owner ?? "",
          a.status,
          ...a.problems.map(problemName),
        ]
          .join(" ")
          .toLowerCase()
          .includes(words),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "cost"
          ? b.costMonth - a.costMonth
          : gapsOf(b).length - gapsOf(a).length || a.name.localeCompare(b.name),
    );

  return (
    <main className="catalogue">
      <Nav />
      <p className="lede">
        What GTech runs, which business problem each project is for, and where
        the gaps are.
      </p>

      <div className="tiles">
        <div className="tile lead">
          <b>{gaps.length}</b>
          <span>gaps found by rule</span>
        </div>
        <div className="tile">
          <b>
            {uncovered.length} of {problems.length}
          </b>
          <span>problems with no project</span>
        </div>
        <div className="tile">
          <b>{apps.length}</b>
          <span>apps and services</span>
        </div>
        <div className="tile">
          <b>{rm(cost)}</b>
          <span>a month to run</span>
        </div>
      </div>

      <section aria-labelledby="gaps-h">
        <h2 id="gaps-h">Gaps</h2>
        <div
          className="filters"
          role="group"
          aria-label="Show gaps of one rule"
        >
          <button
            type="button"
            aria-pressed={rule === "all"}
            onClick={() => setRule("all")}
          >
            All <i>{gaps.length}</i>
          </button>
          {RULES.filter((r) => gaps.some((g) => g.rule === r.id)).map((r) => (
            <button
              type="button"
              key={r.id}
              aria-pressed={rule === r.id}
              onClick={() => setRule(rule === r.id ? "all" : r.id)}
            >
              {r.name} <i>{gaps.filter((g) => g.rule === r.id).length}</i>
            </button>
          ))}
        </div>
        <ul className="gap-rows">
          {shown.map((g, i) => (
            <li key={g.rule + i}>
              <Tag rule={g.rule} />
              <span className="says">{g.says}</span>
              {g.apps[0] && (
                <a href={"/city?enter=" + encodeURIComponent(g.apps[0])}>
                  See {appName(g.apps[0])} in the city
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="problems-h">
        <h2 id="problems-h">Business problems</h2>
        <p className="sub">
          Each problem the business has named, and the projects that work on it.
        </p>
        <table className="cover">
          <thead>
            <tr>
              <th>Problem</th>
              <th>Area</th>
              <th>Projects</th>
            </tr>
          </thead>
          <tbody>
            {problems
              .map((p) => ({
                p,
                on: apps.filter((a) => a.problems.includes(p.id)),
              }))
              .sort((a, b) => a.on.length - b.on.length)
              .map(({ p, on }) => (
                <tr key={p.id} className={on.length ? undefined : "bare"}>
                  <td>{p.name}</td>
                  <td>{p.area}</td>
                  <td>
                    {on.length ? (
                      <>
                        {on.map((a) => a.name).join(", ")}
                        {gaps.some(
                          (g) => g.rule === "overlap" && g.problem === p.id,
                        ) && <Tag rule="overlap" />}
                      </>
                    ) : (
                      <Tag rule="no-project" />
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="apps-h">
        <h2 id="apps-h">Apps and services</h2>
        <div className="tools">
          <label>
            <span>Find</span>
            <input
              type="search"
              value={find}
              onChange={(e) => setFind(e.target.value)}
              placeholder="a name, an owner, a problem"
            />
          </label>
          <label>
            <span>Order by</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
            >
              <option value="gaps">Most gaps first</option>
              <option value="cost">Cost a month</option>
              <option value="name">Name</option>
            </select>
          </label>
          <span className="shown" aria-live="polite">
            {listed.length} of {apps.length}
          </span>
        </div>
        <div className="cards">
          {listed.map((a) => {
            const mine = gapsOf(a);
            return (
              <article className="card" key={a.id}>
                <header>
                  <h3>{a.name}</h3>
                  <span className="status">
                    {a.type} · {a.status}
                  </span>
                </header>
                <p>{a.what}</p>
                <dl>
                  <div>
                    <dt>Owner</dt>
                    <dd className={a.owner ? undefined : "none"}>
                      {a.owner ?? "nobody"}
                    </dd>
                  </div>
                  <div>
                    <dt>Users</dt>
                    <dd className={a.users == null ? "none" : undefined}>
                      {count(a.users)}
                    </dd>
                  </div>
                  <div>
                    <dt>A month</dt>
                    <dd>{rm(a.costMonth)}</dd>
                  </div>
                </dl>
                <ul className="for">
                  {a.problems.map((p) => (
                    <li key={p}>{problemName(p)}</li>
                  ))}
                  {!a.problems.length && (
                    <li className="none">No business problem named</li>
                  )}
                </ul>
                <footer>
                  {mine.length ? (
                    mine.map((g, i) => (
                      <span key={i} title={g.says}>
                        <Tag rule={g.rule} />
                      </span>
                    ))
                  ) : (
                    <span className="clear">No gap found</span>
                  )}
                  <a href={"/city?enter=" + encodeURIComponent(a.id)}>
                    In the city
                  </a>
                </footer>
              </article>
            );
          })}
        </div>
        {!listed.length && (
          <p className="sub">Nothing in the catalogue matches "{find}".</p>
        )}
      </section>

      <p className="note">
        The catalogue is dummy data: every name, owner, user count and cost is
        invented.
      </p>
    </main>
  );
}
