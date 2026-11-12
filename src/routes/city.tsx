import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { catalogue } from "~/data/catalogue";
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
    (async () => {
      await load("vendor/three.min.js");
      await load("vendor/OrbitControls.js");
      await load("districts/index.js");
      for (const id of window.GTECH_DISTRICT_IDS ?? [])
        await load(`districts/${id}.js`);
      await load("analysis.js"); // written by tools/analyze.mjs; the page works without it
      await load("people.js");
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
        <span id="districts"></span>
        <button id="explode" aria-pressed="false">
          Explode
        </button>
        <button id="wiring" aria-pressed="true">
          Wiring
        </button>
      </div>
      <aside id="card" hidden aria-live="polite"></aside>
      <div id="hint">
        A district is a repository. A building is one app or package, a floor
        one module, as tall as its file count. Drag to orbit, scroll to zoom,
        click a floor.
      </div>
    </>
  );
}
