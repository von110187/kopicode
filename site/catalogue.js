// A DUMMY apps catalogue, in the shape of an internal one: apps and services,
// each with a status and the day its documentation was last updated.
// EVERYTHING here is invented: every project's name, description, status,
// date, owner, user count and cost, and every business problem. No real
// project is named. An entry whose id is a scanned district's is drawn with
// that repository inside it.
window.GTECH_CATALOGUE = (function () {
  "use strict";
  var problems = [
    {
      id: "submission",
      name: "Submissions to authorities are slow and paper-bound",
      area: "Serve",
    },
    {
      id: "charges",
      name: "Development charges are worked out by hand",
      area: "Serve",
    },
    {
      id: "compliance",
      name: "Design compliance is checked manually",
      area: "Serve",
    },
    {
      id: "site-ops",
      name: "Site operations run on scattered tools",
      area: "Work",
    },
    {
      id: "papers",
      name: "Management papers are routed by email",
      area: "Work",
    },
    {
      id: "automation",
      name: "Repeated cross-product work is done by people",
      area: "Work",
    },
    {
      id: "spatial",
      name: "Map data needs a GIS analyst to answer",
      area: "Serve",
    },
    {
      id: "training",
      name: "Machine operators can only train on a live machine",
      area: "Build",
    },
    {
      id: "team-insight",
      name: "Delivery health across teams is not visible",
      area: "Work",
    },
    {
      id: "iot",
      name: "Each site wires its own sensors and cameras",
      area: "Build",
    },
    {
      id: "identity",
      name: "Every product builds its own login and billing",
      area: "Build",
    },
    {
      id: "comms",
      name: "Each product sends its own email and messages",
      area: "Build",
    },
    {
      id: "events",
      name: "Products cannot reliably notify each other",
      area: "Build",
    },
    {
      id: "knowledge",
      name: "Project documents cannot be searched or asked",
      area: "Work",
    },
    {
      id: "forms",
      name: "Every product rebuilds forms and approvals",
      area: "Work",
    },
    {
      id: "handover-memory",
      name: "Warranty and as-built knowledge is lost at handover",
      area: "Build",
    },
    {
      id: "tender-estimation",
      name: "Tender estimates are rebuilt from old spreadsheets",
      area: "Work",
    },
    {
      id: "esg-reporting",
      name: "ESG figures are gathered by email each quarter",
      area: "Serve",
    },
  ];
  var apps = [
    {
      id: "levyline",
      name: "LevyLine",
      type: "app",
      status: "Active",
      docs: "2026-05-11",
      what: "Development charge management",
      kind: "city",
      problems: ["charges"],
      owner: "Civic Products",
      users: 45,
      costMonth: 3800,
    },
    {
      id: "siteboard",
      name: "SiteBoard",
      type: "app",
      status: "Active",
      docs: "2026-10-07",
      what: "Construction operations platform",
      kind: "houses",
      problems: ["site-ops"],
      owner: "Site Digital",
      users: 2400,
      costMonth: 38000,
    },
    {
      id: "papertrail",
      name: "PaperTrail",
      type: "app",
      status: "Active",
      docs: "2026-10-14",
      what: "Management papers, routed and approved",
      kind: "city",
      problems: ["papers"],
      owner: "Corporate Systems",
      users: 650,
      costMonth: 6200,
    },
    {
      id: "submithub",
      name: "SubmitHub",
      type: "app",
      status: "Active",
      docs: "2026-06-20",
      what: "Applicant submissions and agency approvals",
      kind: "city",
      problems: ["submission"],
      owner: "Civic Products",
      users: 380,
      costMonth: 9400,
    },
    {
      id: "plancheck",
      name: "PlanCheck",
      type: "app",
      status: "Active",
      docs: "2026-07-16",
      what: "Automated compliance checking of building models",
      kind: "robot",
      problems: ["compliance"],
      owner: "Civic Products",
      users: 70,
      costMonth: 11800,
    },
    {
      id: "flowkit",
      name: "FlowKit",
      type: "app",
      status: "Active",
      docs: "2026-08-12",
      what: "Workflow automation builder",
      kind: "robot",
      problems: ["automation"],
      owner: "AI Platform",
      users: 210,
      costMonth: 7600,
    },
    {
      id: "portsubmit",
      name: "PortSubmit",
      type: "app",
      status: "Active",
      docs: "2026-05-21",
      what: "Submission, checking and signing for one development",
      kind: "city",
      problems: ["submission"],
      owner: "Civic Products",
      users: 90,
      costMonth: 8700,
    },
    {
      id: "mapask",
      name: "MapAsk",
      type: "app",
      status: "Active",
      docs: "2026-05-20",
      what: "Chat-driven geospatial analysis",
      kind: "map-stack",
      problems: ["spatial"],
      owner: "Geospatial",
      users: 60,
      costMonth: 9500,
    },
    {
      id: "drillsim",
      name: "DrillSim",
      type: "app",
      status: "Active",
      docs: "2026-06-24",
      what: "Training simulator for machine operators",
      kind: "tunnel",
      problems: ["training"],
      owner: "Site Digital",
      users: 35,
      costMonth: 5400,
    },
    {
      id: "pulse",
      name: "Pulse",
      type: "app",
      status: "Active",
      docs: "2026-04-16",
      what: "Team insight from tickets and commits",
      kind: "racks",
      problems: ["team-insight"],
      owner: null,
      users: 25,
      costMonth: 2900,
    },
    {
      id: "camsense",
      name: "CamSense",
      type: "service",
      status: "Pre-code",
      docs: "2026-05-13",
      what: "Camera analytics on the sensor platform",
      kind: "robot",
      problems: ["iot"],
      owner: "IoT",
      users: 0,
      costMonth: 0,
    },
    {
      id: "sensorhub",
      name: "SensorHub",
      type: "service",
      status: "Active",
      docs: "2026-10-10",
      what: "IoT management platform",
      kind: "racks",
      problems: ["iot"],
      owner: "IoT",
      users: 140,
      costMonth: 14500,
    },
    {
      id: "keyring",
      name: "Keyring",
      type: "service",
      status: "Active",
      docs: "2026-10-02",
      what: "Identity, roles, billing and metering",
      kind: "racks",
      problems: ["identity"],
      owner: "Platform",
      users: 3200,
      costMonth: 12800,
    },
    {
      id: "gatelib",
      name: "gatelib",
      type: "service",
      status: "Active",
      docs: "2026-09-17",
      what: "Auth and middleware library for backend services",
      kind: "racks",
      problems: ["identity"],
      owner: "Platform",
      users: 12,
      costMonth: 0,
    },
    {
      id: "courier",
      name: "Courier",
      type: "service",
      status: "Pre-code",
      docs: null,
      what: "Outbound email, messages and push",
      kind: "robot",
      problems: ["comms"],
      owner: "Platform",
      users: 0,
      costMonth: 0,
    },
    {
      id: "relay",
      name: "Relay",
      type: "service",
      status: "Pre-code",
      docs: "2026-05-06",
      what: "Webhook broker between products",
      kind: "racks",
      problems: ["events"],
      owner: null,
      users: 0,
      costMonth: 0,
    },
    {
      id: "docfinder",
      name: "DocFinder",
      type: "service",
      status: "Active",
      docs: "2026-05-22",
      what: "Document ingestion and retrieval",
      kind: "map-stack",
      problems: ["knowledge"],
      owner: "AI Platform",
      users: 520,
      costMonth: 16200,
    },
    {
      id: "docfinder-admin",
      name: "DocFinder Admin",
      type: "service",
      status: "Active",
      docs: "2026-05-22",
      what: "Control plane for DocFinder",
      kind: "racks",
      problems: ["knowledge"],
      owner: "AI Platform",
      users: 15,
      costMonth: 1900,
    },
    {
      id: "formkit",
      name: "FormKit",
      type: "service",
      status: "Active",
      docs: "2026-09-08",
      what: "Forms, conditional logic and e-signatures",
      kind: "city",
      problems: ["forms"],
      owner: "Platform",
      users: 780,
      costMonth: 6900,
    },
  ];

  var STALE_DAYS = 180; // documentation not updated in this many days
  var COSTLY = 100; // RM a user a month, above which a project is flagged

  /**
   * The gaps, by rule alone. `unlisted` names the scanned repositories the
   * catalogue does not list.
   */
  function gaps(today, unlisted) {
    var out = [];
    problems.forEach(function (p) {
      var solving = apps.filter(function (a) {
        return a.problems.indexOf(p.id) >= 0;
      });
      // Two services of one product are not an overlap: outward products only.
      var products = solving.filter(function (a) {
        return a.type === "app";
      });
      if (!solving.length)
        out.push({
          rule: "no-project",
          problem: p.id,
          apps: [],
          says: "No project works on: " + p.name,
        });
      if (products.length > 1)
        out.push({
          rule: "overlap",
          problem: p.id,
          apps: products.map(function (a) {
            return a.id;
          }),
          says:
            products
              .map(function (a) {
                return a.name;
              })
              .join(" and ") +
            " both work on: " +
            p.name,
        });
    });
    apps.forEach(function (a) {
      if (!a.owner)
        out.push({
          rule: "no-owner",
          apps: [a.id],
          says: a.name + " has no owner",
        });
      if (!a.docs)
        out.push({
          rule: "no-docs-date",
          apps: [a.id],
          says: a.name + " has no documentation date",
        });
      var days = a.docs
        ? Math.floor((today - new Date(a.docs + "T00:00:00")) / 86400000)
        : null;
      if (days != null && days > STALE_DAYS)
        out.push({
          rule: "stale-docs",
          apps: [a.id],
          says:
            a.name + "'s documentation was last updated " + days + " days ago",
        });
      var each = a.users ? a.costMonth / a.users : null;
      if (each != null && each > COSTLY)
        out.push({
          rule: "costly",
          apps: [a.id],
          says:
            a.name +
            " costs RM " +
            Math.round(each) +
            " a user a month (over RM " +
            COSTLY +
            ")",
        });
    });
    (unlisted || []).forEach(function (d) {
      out.push({
        rule: "unlisted",
        apps: [d.id],
        says: d.name + " has a repository and is not in the catalogue",
      });
    });
    return out;
  }

  return {
    problems: problems,
    apps: apps,
    gaps: gaps,
    STALE_DAYS: STALE_DAYS,
    COSTLY: COSTLY,
  };
})();
