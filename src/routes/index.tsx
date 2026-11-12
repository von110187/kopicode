import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "~/components/Nav";
import { getCatalogue } from "~/server/catalogue";
import appCss from "~/styles/app.css?url";

export const Route = createFileRoute("/")({
  head: () => ({ links: [{ rel: "stylesheet", href: appCss }] }),
  loader: () => getCatalogue(),
  component: Home,
});

const RULES: Record<string, string> = {
  "no-project": "No project",
  overlap: "Overlap",
  "no-owner": "No owner",
  "no-docs-date": "No docs",
  "stale-docs": "Stale docs",
  costly: "Costly",
  unlisted: "Unlisted",
};

function Home() {
  const { apps, problems, gaps } = Route.useLoaderData();
  const problemName = (id: string) =>
    problems.find((p) => p.id === id)?.name ?? id;

  return (
    <main>
      <Nav />
      <p className="lede">
        Every GTech project as a place in one city, so that someone in the
        business can see what exists, what state it is in, and where the gaps
        are, without reading a repository.
      </p>

      <h2>Gaps ({gaps.length})</h2>
      <ul className="gaps">
        {gaps.map((g, i) => (
          <li key={i}>
            <b>{RULES[g.rule] ?? g.rule}</b>
            {g.says}
          </li>
        ))}
      </ul>

      <h2>Catalogue ({apps.length})</h2>
      <div className="grid">
        {apps.map((a) => (
          <article className="app" key={a.id}>
            <h3>{a.name}</h3>
            <p>{a.what}</p>
            <div className="chips">
              <span>{a.type}</span>
              <span>{a.status}</span>
              <span>{a.owner ?? "no owner"}</span>
              {a.problems.map((p) => (
                <span key={p} title={problemName(p)}>
                  {p}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <p className="note">
        The catalogue is dummy data: every name, owner, user count and cost is
        invented.
      </p>
    </main>
  );
}
