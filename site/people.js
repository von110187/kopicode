/* global THREE */
// The people of a project, as characters that stand in front of it.
// EVERY PERSON HERE IS INVENTED. Names, traits, behaviour, intention,
// contributions and quality are drawn from a seed, so the same company and the
// same teams show each time. Nothing is read from git, HR or any other record.
window.GTECH_PEOPLE = (function () {
  "use strict";
  // Four traits, a mock of a short personality test. A person's strongest
  // trait decides what the character wears; the second its body's shape.
  var TRAITS = [
    {
      key: "builder",
      name: "Builder",
      says: "ships working things fast",
      hue: 28,
      role: "Engineer",
    },
    {
      key: "thinker",
      name: "Thinker",
      says: "designs before building",
      hue: 205,
      role: "Architect",
    },
    {
      key: "connector",
      name: "Connector",
      says: "links people and projects",
      hue: 330,
      role: "Product lead",
    },
    {
      key: "guardian",
      name: "Guardian",
      says: "keeps quality and safety",
      hue: 150,
      role: "Quality lead",
    },
  ];
  var NAMES = [
    "Aiman",
    "Bella",
    "Chong",
    "Devi",
    "Ehsan",
    "Farah",
    "Gopal",
    "Hana",
    "Imran",
    "Jia",
    "Kamal",
    "Lina",
    "Musa",
    "Nadia",
    "Omar",
    "Priya",
    "Qistina",
    "Ravi",
    "Suri",
    "Tan",
    "Umar",
    "Vani",
    "Wei",
    "Xin",
    "Yusof",
    "Zara",
    "Arif",
    "Bao",
    "Chitra",
    "Daniel",
    "Elina",
    "Faiz",
    "Grace",
    "Hafiz",
    "Indra",
    "Joon",
    "Kavita",
    "Lokman",
    "Mei",
    "Nurul",
  ];
  var SKIN = [0xf1c9a5, 0xe0ac7e, 0xc68642, 0x8d5524, 0xffdbac];

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

  // Behaviour: how a person works, as it would be observed. Each is 0 to 100
  // between two ends, and neither end is the better one.
  var BEHAVIOURS = [
    { key: "pace", name: "Pace", low: "steady", high: "in bursts" },
    { key: "together", name: "Working", low: "alone", high: "with others" },
    { key: "review", name: "Reviews", low: "rarely", high: "often" },
  ];
  // Intention: what a person wants, as they would declare it themselves.
  var AREAS = ["Serve", "Work", "Build"]; // the catalogue's business areas
  var PATHS = [
    { key: "lead", says: "wants to lead a team" },
    { key: "specialise", says: "wants to go deeper in a craft" },
  ];
  var ROSTER_SIZE = 40;

  /**
   * The whole company, invented once from one seed: the people on teams and
   * the people on none. A project's team is drawn from here, so one person
   * can stand in front of more than one project.
   */
  var roster = (function () {
    var rnd = seeded("roster");
    var pool = NAMES.slice();
    var out = [];
    for (var i = 0; i < ROSTER_SIZE; i++) {
      var scores = TRAITS.map(function () {
        return 25 + Math.round(rnd() * 70);
      });
      var order = [0, 1, 2, 3].sort(function (a, b) {
        return scores[b] - scores[a];
      });
      var behaviour = {};
      BEHAVIOURS.forEach(function (b) {
        behaviour[b.key] = Math.round(rnd() * 100);
      });
      // Most people want to grow a trait that is not yet their strongest.
      var grow = TRAITS[order[1 + Math.floor(rnd() * 3)]];
      out.push({
        id: "p" + (i + 1),
        name: pool.splice(Math.floor(rnd() * pool.length), 1)[0],
        scores: scores,
        first: TRAITS[order[0]],
        second: TRAITS[order[1]],
        behaviour: behaviour,
        intention: {
          grow: grow,
          area: AREAS[Math.floor(rnd() * AREAS.length)],
          path: PATHS[Math.floor(rnd() * PATHS.length)],
          openToMove: rnd() < 0.6,
        },
        quality: 62 + Math.round(rnd() * 36),
        height: 0.9 + rnd() * 0.3,
        skin: SKIN[Math.floor(rnd() * SKIN.length)],
        hueShift: Math.round(rnd() * 24 - 12),
        projects: [], // filled as teams are drawn: { id, name, contributions }
      });
    }
    return out;
  })();

  /** Spare time, as a share of a week: less with every project a person is on. */
  function capacity(p) {
    return Math.max(0, 100 - p.projects.length * 40);
  }

  var teams = {};
  /** A project's team: the same people each time, each with their share of its commits. */
  function teamOf(d) {
    if (teams[d.id]) return teams[d.id];
    var rnd = seeded("people:" + d.id);
    var n = Math.max(2, Math.min(8, d.git.contributors || 3));
    // Nobody is put on a third project while someone else has fewer.
    var free = roster.filter(function (p) {
      return p.projects.length < 2;
    });
    if (free.length < n) free = roster.slice();
    var shares = [];
    var total = 0;
    for (var i = 0; i < n; i++) {
      shares.push(0.2 + rnd() * rnd() * 3);
      total += shares[i];
    }
    var team = [];
    for (i = 0; i < n; i++) {
      var person = free.splice(Math.floor(rnd() * free.length), 1)[0];
      // A share of the project's own commit count, so the team adds up to it.
      var contributions = Math.max(
        1,
        Math.round(((d.git.commits || 100) * shares[i]) / total),
      );
      person.projects.push({
        id: d.id,
        name: d.name,
        contributions: contributions,
      });
      // A member is the person as they stand in this project.
      var member = Object.create(person);
      member.contributions = contributions;
      team.push(member);
    }
    teams[d.id] = team.sort(function (a, b) {
      return b.contributions - a.contributions;
    });
    return teams[d.id];
  }

  function mat(c) {
    return new THREE.MeshLambertMaterial({ color: c });
  }
  function put(mesh, x, y, z) {
    mesh.position.set(x, y, z);
    return mesh;
  }

  function figure(p) {
    var g = new THREE.Group();
    var c = new THREE.Color().setHSL(
      ((p.first.hue + p.hueShift + 360) % 360) / 360,
      0.55,
      0.58,
    );
    // The second trait is the body's shape.
    var body = {
      builder: new THREE.BoxGeometry(1.5, 1.9, 1.1),
      thinker: new THREE.CylinderGeometry(0.55, 0.8, 1.9, 16),
      connector: new THREE.CylinderGeometry(0.8, 0.55, 1.9, 16),
      guardian: new THREE.CylinderGeometry(0.75, 0.75, 1.9, 6),
    }[p.second.key];
    g.add(put(new THREE.Mesh(body, mat(c)), 0, 0.95, 0));
    g.add(
      put(
        new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 14), mat(p.skin)),
        0,
        2.45,
        0,
      ),
    );
    [-0.22, 0.22].forEach(function (x) {
      g.add(
        put(
          new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), mat(0x23302a)),
          x,
          2.52,
          0.56,
        ),
      );
    });
    // The strongest trait is what the character wears.
    if (p.first.key === "builder") {
      g.add(
        put(
          new THREE.Mesh(
            new THREE.SphereGeometry(
              0.68,
              18,
              10,
              0,
              Math.PI * 2,
              0,
              Math.PI / 2,
            ),
            mat(0xffc93c),
          ),
          0,
          2.62,
          0,
        ),
      );
      g.add(
        put(
          new THREE.Mesh(
            new THREE.CylinderGeometry(0.8, 0.8, 0.08, 18),
            mat(0xffc93c),
          ),
          0,
          2.64,
          0.1,
        ),
      );
    } else if (p.first.key === "thinker") {
      [-0.24, 0.24].forEach(function (x) {
        g.add(
          put(
            new THREE.Mesh(
              new THREE.TorusGeometry(0.17, 0.04, 8, 16),
              mat(0x23302a),
            ),
            x,
            2.52,
            0.6,
          ),
        );
      });
    } else if (p.first.key === "connector") {
      g.add(
        put(
          new THREE.Mesh(
            new THREE.TorusGeometry(0.66, 0.07, 8, 20, Math.PI),
            mat(0x2b3a30),
          ),
          0,
          2.5,
          0,
        ),
      );
      g.add(
        put(
          new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(0xd9534f)),
          0.66,
          2.4,
          0.1,
        ),
      );
    } else {
      var shield = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.12, 6),
        mat(0x3f8f5f),
      );
      shield.rotation.x = Math.PI / 2;
      g.add(put(shield, 0.75, 1.1, 0.65));
    }
    g.scale.setScalar(1.25 * p.height);
    g.userData.person = p;
    return g;
  }

  /** Stands a project's team along the front of its plot, inside the group given. */
  function stand(d, group, width, depth) {
    var team = teamOf(d);
    var step = Math.min(4.5, (width + 6) / team.length);
    return team.map(function (p, i) {
      var f = figure(p);
      f.position.set(
        width / 2 + (i - (team.length - 1) / 2) * step,
        0,
        depth + 3.2,
      );
      f.userData.district = d;
      group.add(f);
      return f;
    });
  }

  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };

  function card(p, d, team) {
    var teamQuality = Math.round(
      team.reduce(function (n, o) {
        return n + o.quality;
      }, 0) / team.length,
    );
    var others = p.projects.filter(function (o) {
      return o.id !== d.id;
    });
    return (
      "<h2>" +
      esc(p.name) +
      '</h2><p class="sub">' +
      esc(p.first.role) +
      " · " +
      esc(d.name) +
      " · invented person</p>" +
      "<p>" +
      esc(p.first.name) +
      " first, " +
      esc(p.second.name.toLowerCase()) +
      " second: " +
      esc(p.first.says) +
      ".</p>" +
      '<div class="facts"><div><b>' +
      p.contributions.toLocaleString("en-US") +
      "</b><span>contributions</span></div><div><b>" +
      p.quality +
      "</b><span>quality / 100</span></div><div><b>" +
      teamQuality +
      "</b><span>team quality</span></div></div>" +
      "<table>" +
      TRAITS.map(function (t, i) {
        return (
          '<tr><td style="width:84px">' +
          t.name +
          '</td><td><div style="height:8px;border-radius:4px;background:#eee7da"><div style="height:8px;border-radius:4px;width:' +
          p.scores[i] +
          "%;background:hsl(" +
          t.hue +
          ',55%,58%)"></div></div></td><td class="n" style="width:32px">' +
          p.scores[i] +
          "</td></tr>"
        );
      }).join("") +
      "</table>" +
      '<p class="sub" style="margin:12px 0 4px">Behaviour · how they work</p><table>' +
      BEHAVIOURS.map(function (b) {
        var v = p.behaviour[b.key];
        return (
          '<tr><td style="width:84px">' +
          b.name +
          '</td><td><div style="position:relative;height:8px;border-radius:4px;background:#eee7da"><div style="position:absolute;top:-2px;left:calc(' +
          v +
          '% - 6px);width:12px;height:12px;border-radius:6px;background:#2b3a30"></div></div></td><td class="n" style="width:84px">' +
          esc(v < 50 ? b.low : b.high) +
          "</td></tr>"
        );
      }).join("") +
      "</table>" +
      '<p class="sub" style="margin:12px 0 4px">Intention · what they want</p><p>Wants to grow as a ' +
      esc(p.intention.grow.name.toLowerCase()) +
      ", " +
      esc(p.intention.path.says) +
      ", drawn to " +
      esc(p.intention.area) +
      " work. " +
      (p.intention.openToMove
        ? "Open to joining another project"
        : "Wants to stay where they are") +
      "; " +
      capacity(p) +
      "% of a week spare.</p>" +
      (others.length
        ? '<p class="sub">Also on ' +
          others
            .map(function (o) {
              return esc(o.name);
            })
            .join(", ") +
          ".</p>"
        : "") +
      '<p class="sub" style="margin-top:10px">Mock data. This person, the four traits, the behaviour, the intention, the contributions and the quality figures are invented from a seed; nothing is read from git, HR or an interview.</p>'
    );
  }

  return {
    stand: stand,
    card: card,
    TRAITS: TRAITS,
    BEHAVIOURS: BEHAVIOURS,
    roster: roster,
    teamOf: teamOf,
    capacity: capacity,
  };
})();
