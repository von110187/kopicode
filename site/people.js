/* global THREE */
// The people of a project, as characters that stand in front of it.
// EVERY PERSON HERE IS INVENTED. Names, traits, contributions and quality are
// drawn from a seed (the project's id), so the same project shows the same
// mock team each time. Nothing is read from git, HR or any other record.
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

  function teamOf(d) {
    var rnd = seeded("people:" + d.id);
    var n = Math.max(2, Math.min(8, d.git.contributors || 3));
    var pool = NAMES.slice();
    var shares = [];
    var total = 0;
    for (var i = 0; i < n; i++) {
      shares.push(0.2 + rnd() * rnd() * 3);
      total += shares[i];
    }
    var team = [];
    for (i = 0; i < n; i++) {
      var scores = TRAITS.map(function () {
        return 25 + Math.round(rnd() * 70);
      });
      var order = [0, 1, 2, 3].sort(function (a, b) {
        return scores[b] - scores[a];
      });
      team.push({
        name: pool.splice(Math.floor(rnd() * pool.length), 1)[0],
        scores: scores,
        first: TRAITS[order[0]],
        second: TRAITS[order[1]],
        // A share of the project's own commit count, so the team adds up to it.
        contributions: Math.max(
          1,
          Math.round(((d.git.commits || 100) * shares[i]) / total),
        ),
        quality: 62 + Math.round(rnd() * 36),
        height: 0.9 + rnd() * 0.3,
        skin: SKIN[Math.floor(rnd() * SKIN.length)],
        hueShift: Math.round(rnd() * 24 - 12),
      });
    }
    return team.sort(function (a, b) {
      return b.contributions - a.contributions;
    });
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
      '</table><p class="sub" style="margin-top:10px">Mock data. This person, the four traits, the contributions and the quality figures are invented from a seed; nothing is read from git, HR or an interview.</p>'
    );
  }

  return { stand: stand, card: card, TRAITS: TRAITS };
})();
