import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { catalogue } from "~/data/catalogue";
import stall from "~/data/stall-model.json";
import { ViewSwitch } from "~/components/ViewSwitch";
import { createFigureKit, type FigureKit } from "~/three/figure-kit";
import cityCss from "~/styles/city.css?url";

export const Route = createFileRoute("/city")({
  head: () => ({
    meta: [{ title: "GTech City · 3D" }],
    links: [{ rel: "stylesheet", href: cityCss }],
  }),
  component: City,
});

declare global {
  interface Window {
    GTECH_CATALOGUE?: typeof catalogue;
    GTECH_DISTRICT_IDS?: string[];
    GTECH_STALL?: typeof stall;
    GTECH_FIGURES?: FigureKit;
    THREE?: unknown;
  }
}

const BASE = "/city/";

// Loads one classic script, in order. A missing file (no districts scanned yet) is not an error.
function load(src: string) {
  return new Promise<void>((done) => {
    const s = document.createElement("script");
    s.src = BASE + src;
    s.async = false;
    s.onload = s.onerror = () => done();
    document.body.appendChild(s);
  });
}

// city.js draws into the document once and keeps running, so it is started once a page load.
let started = false;

function City() {
  useEffect(() => {
    if (started) return;
    started = true;
    window.GTECH_CATALOGUE = catalogue;
    window.GTECH_STALL = stall; // the stall rule and how it did, for city.js to mark projects by
    (async () => {
      await load("vendor/three.min.js");
      await load("vendor/OrbitControls.js");
      // The figure kit, made against the page's own three.js, for people.js to draw people with.
      window.GTECH_FIGURES = createFigureKit(window.THREE as Parameters<typeof createFigureKit>[0]);
      await load("districts/index.js");
      for (const id of window.GTECH_DISTRICT_IDS ?? [])
        await load(`districts/${id}.js`);
      await load("dummy.js"); // a dummy inside for each project with no scanned repository
      await load("analysis.js"); // written by tools/analyze.mjs; the page works without it
      await load("people.js");
      await load("agent.js"); // the agent's moves, worked out by rule
      await load("city.js");
    })();
  }, []);

  return (
    <>
      <div id="bar">
        <h1>
          <a href="/" style={{ color: "inherit", textDecoration: "none" }}>
            GTech City
          </a>
        </h1>
        <ViewSwitch current="city" />
        <span id="districts"></span>
        <button id="explode" aria-pressed="false">
          Explode
        </button>
        <button id="wiring" aria-pressed="true">
          Wiring
        </button>
        <span className="rest"></span>
        <button id="tour" className="lead">
          Tour
        </button>
        <button id="staffing">Staffing</button>
        <button id="walk" aria-pressed="false">
          Walk
        </button>
        <button id="agent" className="lead">
          Agent
        </button>
        <button id="motion" aria-pressed="false" hidden>
          Play motion
        </button>
      </div>
      <aside id="card" hidden aria-live="polite"></aside>
      <div id="key">
        <b>Map key</b>
        <span>The shape is what it does</span>
        <span>Grey and overgrown: no commit in 90 days</span>
        <span>Taped off: under 10% tests</span>
        <span>Scaffolding: a young project</span>
        <span>A pennant: short of someone</span>
        <span>Amber tag: predicted to stall</span>
        <span>To let: planned, no code yet</span>
      </div>
      <div id="hint">
        A district is a repository. A building is one app or package, a floor
        one module, as tall as its file count. Drag to orbit, scroll to zoom,
        click a floor.
      </div>
    </>
  );
}
