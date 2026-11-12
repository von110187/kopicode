// A DUMMY inside for a catalogue project that has no scanned repository, so that
// every project can be entered. EVERYTHING it returns is invented from a seed
// (the project's id): the buildings, the floors, every file, line and test
// count, the dependencies, the stack, the services, the commits and the date of
// the last one. It is in the shape tools/scan.mjs writes, and marked `dummy`,
// so the page can say on the card that no repository was read.
window.GTECH_DUMMY = (function () {
  "use strict";
  function seeded(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++)
      h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return function () {
      h += 0x6d2b79f5;
      var t = Math.imul(h ^ (h >>> 15), 1 | h);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var APPS = ["web", "api", "worker", "admin", "mobile"];
  var SERVICE_APPS = ["api", "worker", "gateway"];
  var PACKAGES = ["ui", "shared", "db", "config", "auth-client", "sdk"];
  var DOMAINS = [
    "auth",
    "billing",
    "reports",
    "notifications",
    "search",
    "uploads",
    "workflow",
    "audit",
    "settings",
    "dashboard",
    "records",
    "payments",
    "users",
    "integrations",
  ];
  var SUPPORT = ["common", "config", "utils", "types"];
  var STACK = [
    "React",
    "Vite",
    "NestJS",
    "TypeORM",
    "Zod",
    "Tailwind",
    "TanStack Query",
    "BullMQ",
    "Hono",
    "Express",
  ];
  var SERVICES = [
    { name: "postgres", image: "postgres:16" },
    { name: "redis", image: "redis:7" },
    { name: "minio", image: "minio/minio" },
  ];

  var made = {};
  return function (app) {
    if (made[app.id]) return made[app.id];
    var rnd = seeded("dummy:" + app.id);
    var pick = function (pool, n) {
      var from = pool.slice();
      var out = [];
      while (out.length < n && from.length)
        out.push(from.splice(Math.floor(rnd() * from.length), 1)[0]);
      return out;
    };
    // Three projects in ten have almost no tests; the rest have a fair share.
    var testShare = rnd() < 0.3 ? rnd() * 0.08 : 0.1 + rnd() * 0.25;
    var unit = function (id, group, domainFloors) {
      var floors = pick(DOMAINS, domainFloors)
        .map(function (name) {
          return { name: name, kind: "domain" };
        })
        .concat(
          pick(SUPPORT, 1 + Math.floor(rnd() * 2)).map(function (name) {
            return { name: name, kind: "support" };
          }),
        )
        .map(function (f) {
          var files = 3 + Math.round(rnd() * rnd() * 60);
          return {
            name: f.name,
            kind: f.kind,
            files: files,
            lines: files * (40 + Math.round(rnd() * 100)),
            tests: Math.round(files * testShare * (0.5 + rnd())),
          };
        });
      var sum = function (key) {
        return floors.reduce(function (n, f) {
          return n + f[key];
        }, 0);
      };
      return {
        id: id,
        path: group + "/" + id,
        group: group,
        files: sum("files"),
        lines: sum("lines"),
        tests: sum("tests"),
        floors: floors,
        deps: [],
        stack: pick(STACK, 1 + Math.floor(rnd() * 3)),
        summary: "",
      };
    };
    var service = app.type === "service";
    var packages = pick(PACKAGES, service ? Math.floor(rnd() * 3) : 1 + Math.floor(rnd() * 3)).map(
      function (id) {
        return unit(id, "packages", Math.floor(rnd() * 2));
      },
    );
    var apps = pick(
      service ? SERVICE_APPS : APPS,
      service ? 1 + Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 3),
    ).map(function (id) {
      var u = unit(id, "apps", 2 + Math.floor(rnd() * 4));
      // An app leans on one or two of the project's own packages.
      u.deps = pick(
        packages.map(function (p) {
          return p.id;
        }),
        1 + Math.floor(rnd() * 2),
      );
      return u;
    });
    var units = apps.concat(packages);
    var total = function (key) {
      return units.reduce(function (n, u) {
        return n + u[key];
      }, 0);
    };
    // The last commit is a number of days back from today, so the demo does
    // not age: three projects in ten have been quiet for more than a quarter.
    var days = rnd() < 0.3 ? 95 + Math.round(rnd() * 200) : 1 + Math.round(rnd() * 60);
    var last = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    made[app.id] = {
      schema: "gtech-district/1",
      dummy: true,
      id: app.id,
      name: app.name,
      kind: app.kind,
      summary: app.what ? app.what + "." : "",
      scannedAt: null,
      git: {
        commits: 80 + Math.round(rnd() * 900),
        lastCommit: last,
        contributors: 2 + Math.floor(rnd() * 2),
      },
      totals: {
        files: total("files"),
        lines: total("lines"),
        tests: total("tests"),
      },
      units: units,
      services: pick(SERVICES, Math.floor(rnd() * 3)),
    };
    return made[app.id];
  };
})();
