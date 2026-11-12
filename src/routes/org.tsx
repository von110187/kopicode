import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "~/components/Nav";
import type { GroupMetrics } from "~/org/metrics";
import { getOrgMetrics } from "~/server/org";
import appCss from "~/styles/app.css?url";

export const Route = createFileRoute("/org")({
  head: () => ({
    meta: [{ title: "GTech City · Organisation" }],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  loader: () => getOrgMetrics(),
  component: OrgPage,
});

const COMMS = ["Meetings", "Chat", "Written", "Calls"];
const pct = (n: number) => `${Math.round(n * 100)}%`;

function CommsBar({ comms }: { comms: GroupMetrics["comms"] }) {
  const total = Object.values(comms).reduce((a, b) => a + b, 0) || 1;
  return (
    <span
      className="comms"
      title={COMMS.map((c) => `${c}: ${comms[c] ?? 0}`).join(", ")}
    >
      {COMMS.map((c, i) => (
        <i
          key={c}
          className={`c${i}`}
          style={{ width: `${((comms[c] ?? 0) / total) * 100}%` }}
        />
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

function OrgPage() {
  const { totals, departments, tribes, squads, guilds } = Route.useLoaderData();

  return (
    <main>
      <Nav />
      <p className="lede">
        {totals.people} people in a simplified Spotify model: <b>tribes</b> of
        squads around a mission, <b>chapters</b> that keep each department's
        people together inside a tribe, and <b>guilds</b> anyone can join.
        Every metric is recomputed from the org and from each person's values.
      </p>

      <div className="tiles">
        {[
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

      <p className="legend">
        Communication preference:{" "}
        {COMMS.map((c, i) => (
          <span key={c}>
            <i className={`sw c${i}`} />
            {c}
          </span>
        ))}
      </p>

      <h2>Departments</h2>
      <p className="sub">
        Each department cuts across every tribe. Impact is how far its own
        intentions have got; projects is the impact of the squads that serve
        them.
      </p>
      <div className="grid wide">
        {departments.map((d) => (
          <article className="app" key={d.id}>
            <h3>
              {d.name} <small>{d.headcount} people</small>
            </h3>
            <dl className="kv">
              <dt>Impact</dt>
              <dd>
                <Bar value={d.impact} /> {pct(d.impact)}
              </dd>
              <dt>Proof</dt>
              <dd>{pct(d.proven)} of scores</dd>
              <dt>Comms</dt>
              <dd>
                <CommsBar comms={d.comms} /> {pct(d.commsFit)} share one
              </dd>
              {d.strengths.length > 0 && (
                <>
                  <dt>Strong</dt>
                  <dd>{d.strengths.join(", ")}</dd>
                  <dt>Weak</dt>
                  <dd>{d.weaknesses.join(", ")}</dd>
                </>
              )}
            </dl>
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
                      {i.projectImpact == null
                        ? "—"
                        : `${pct(i.projectImpact)} (${i.projects})`}
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
          </article>
        ))}
      </div>

      <h2>Tribes and squads</h2>
      {tribes.map((t, ti) => (
        <details className="tribe" key={t.id} open={ti === 0}>
          <summary>
            <b>{t.name}</b>
            <span>
              {t.headcount} people · {t.squads} squads · coverage{" "}
              {pct(t.coverage)} · impact {pct(t.impact)} · {t.bottlenecks}{" "}
              bottlenecks
            </span>
            <CommsBar comms={t.comms} />
          </summary>
          <div className="scroll">
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
                </tr>
              </thead>
              <tbody>
                {squads
                  .filter((s) => s.tribe === t.id)
                  .map((s) => (
                    <tr key={s.id} className={s.bottlenecks.length ? "hot" : ""}>
                      <td>
                        {s.name}
                        {s.app && <em> app</em>}
                        <small>{s.intention.says}</small>
                      </td>
                      <td className="n">
                        {s.headcount}
                        <small>{s.fte} FTE</small>
                      </td>
                      <td>
                        <Bar value={s.coverage} />
                        {s.missing.length > 0 && (
                          <small>no {s.missing.join(", ")}</small>
                        )}
                      </td>
                      <td>
                        <CommsBar comms={s.comms} />
                        <small>{pct(s.commsFit)} share one</small>
                      </td>
                      <td className="n">{pct(s.proven)}</td>
                      <td>
                        <Bar value={s.impact} />
                        <small>
                          {s.intention.actual}/{s.intention.target}{" "}
                          {s.intention.kpi}
                        </small>
                      </td>
                      <td>
                        {s.bottlenecks.map((b) => (
                          <small key={b} className="bn">
                            {b}
                          </small>
                        ))}
                        {s.required.length > 0 && (
                          <small className="req">
                            Required: {s.required.join(" · ")}
                          </small>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}

      <h2>Guilds</h2>
      <div className="chips">
        {guilds.map((g) => (
          <span key={g.id}>
            {g.name} · {g.members}
          </span>
        ))}
      </div>

      <p className="note">
        The organisation is dummy data. People's values (skills, communication
        preference, scores and their proof) come from a stand-in for the
        person module, which is built separately; the metrics recompute from
        whatever values it supplies.
      </p>
    </main>
  );
}
