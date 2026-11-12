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

  var THIN_TESTS = 10; // % of source files that are tests, below which quality is a need
  var QUIET_DAYS = 90; // days since the last commit, after which delivery is a need
  var MAX_SEATS = 2;

  /**
   * The seats a project has open, by rule alone: which trait it is short of,
   * and why. A reason from the project's state (its tests, its last commit,
   * its owner) weighs 2; a trait nobody on the team has weighs 1. `app` is the
   * project's catalogue entry, or null where the catalogue does not list it;
   * `problems` are the catalogue's business problems.
   */
  function seats(d, app, problems, today) {
    var team = teamOf(d);
    var why = {};
    function add(key, weight, says) {
      why[key] = why[key] || { weight: 0, reasons: [] };
      why[key].weight += weight;
      why[key].reasons.push(says);
    }
    var share = d.totals.files
      ? Math.round((d.totals.tests / d.totals.files) * 100)
      : null;
    if (share != null && share < THIN_TESTS)
      add("guardian", 2, share + "% of its source files are tests");
    var quiet = d.git.lastCommit
      ? Math.floor((today - new Date(d.git.lastCommit + "T00:00:00")) / 86400000)
      : null;
    if (quiet != null && quiet > QUIET_DAYS)
      add("builder", 2, "no commit in " + quiet + " days");
    if (!app) add("connector", 2, "it is not in the catalogue");
    else if (!app.owner) add("connector", 2, "it has no owner");
    TRAITS.forEach(function (t) {
      var has = team.some(function (m) {
        return m.first.key === t.key || m.second.key === t.key;
      });
      if (!has)
        add(t.key, 1, "nobody on the team is a " + t.name.toLowerCase());
    });
    // The business area the seat sits in, for a person drawn to that work.
    var area = null;
    if (app && app.problems.length)
      (problems || []).forEach(function (pr) {
        if (!area && app.problems.indexOf(pr.id) >= 0) area = pr.area;
      });
    return TRAITS.filter(function (t) {
      return why[t.key];
    })
      .sort(function (a, b) {
        return why[b.key].weight - why[a.key].weight;
      })
      .slice(0, MAX_SEATS)
      .map(function (t) {
        return {
          project: d.id,
          trait: t,
          area: area,
          weight: why[t.key].weight,
          reasons: why[t.key].reasons,
        };
      });
  }

  // The habit a seat is best served by. Neither end of a behaviour is better
  // in itself; a seat only makes one end the more useful.
  var HABIT = {
    builder: { key: "pace", high: true },
    thinker: { key: "pace", high: false },
    connector: { key: "together", high: true },
    guardian: { key: "review", high: true },
  };
  var SPARE = 40; // % of a week, the least that counts as having time
  var SHORTLIST = 8;

  /**
   * Everyone not already on the project, scored for one of its seats, best
   * first. A score is behaviour (40), intention (40), time (20) and fit with
   * the team already there (20), each part
   * kept so the card can show where the number came from. A seat with no
   * business area leaves that part out and scores out of what is left.
   * The invented quality figure plays no part.
   */
  function match(seat, d, filters) {
    filters = filters || {};
    var team = teamOf(d);
    var t = seat.trait;
    var habit = HABIT[t.key];
    var b = BEHAVIOURS.filter(function (x) {
      return x.key === habit.key;
    })[0];
    var path = t.key === "connector" ? "lead" : "specialise";
    // The team as it is: how it works on average, and who in it wants to lead.
    var mean = function (key) {
      return (
        team.reduce(function (n, m) {
          return n + m.behaviour[key];
        }, 0) / team.length
      );
    };
    var teamHabit = mean(habit.key);
    var teamTogether = mean("together");
    var leads = team.filter(function (m) {
      return m.intention.path.key === "lead";
    }).length;
    var end = function (x, v) {
      return x.key === "pace" && v < 50 ? "steadily" : v < 50 ? x.low : x.high;
    };
    var bTogether = BEHAVIOURS.filter(function (x) {
      return x.key === "together";
    })[0];
    return roster
      .filter(function (p) {
        if (
          team.some(function (m) {
            return m.id === p.id;
          })
        )
          return false;
        if (filters.open && !p.intention.openToMove) return false;
        if (filters.spare && capacity(p) < SPARE) return false;
        if (filters.area && seat.area && p.intention.area !== seat.area)
          return false;
        return true;
      })
      .map(function (p) {
        var strength = p.scores[TRAITS.indexOf(t)];
        var v = p.behaviour[habit.key];
        var parts = [
          {
            group: "Behaviour",
            says: t.name + " strength " + strength,
            got: Math.round(strength * 0.25),
            of: 25,
          },
          {
            group: "Behaviour",
            says:
              b.name.toLowerCase() + " " + (v < 50 ? b.low : b.high),
            got: Math.round((habit.high ? v : 100 - v) * 0.15),
            of: 15,
          },
          {
            group: "Intention",
            says:
              "wants to grow as a " + p.intention.grow.name.toLowerCase(),
            got: p.intention.grow.key === t.key ? 15 : 0,
            of: 15,
          },
          {
            group: "Intention",
            says: p.intention.openToMove
              ? "open to joining another project"
              : "wants to stay where they are",
            got: p.intention.openToMove ? 10 : 0,
            of: 10,
          },
          {
            group: "Intention",
            says: p.intention.path.says,
            got: p.intention.path.key === path ? 5 : 0,
            of: 5,
          },
          {
            group: "Time",
            says: capacity(p) + "% of a week spare",
            got: Math.round(capacity(p) * 0.2),
            of: 20,
          },
        ];
        // Fit with the people already there. The seat's habit counts for more
        // where the team does not have it; a way of working counts for more
        // the closer it is to the team's; one more would-be lead is a clash.
        var mine = habit.high ? v : 100 - v;
        var theirs = habit.high ? teamHabit : 100 - teamHabit;
        var wantsLead = p.intention.path.key === "lead";
        parts.push(
          {
            group: "Team",
            says:
              "the team " +
              (b.key === "review" ? "reviews " : "works ") +
              end(b, teamHabit) +
              ", they " +
              (b.key === "review" ? "review " : "work ") +
              end(b, v),
            got: Math.round((mine / 100) * (1 - theirs / 100) * 10),
            of: 10,
          },
        );
        // Where the seat itself is there to bring people together, a likeness
        // to a team that works alone is no merit, so that part is left out.
        if (habit.key !== "together")
          parts.push(
          {
              group: "Team",
              says:
                "the team works " +
                end(bTogether, teamTogether) +
                ", they work " +
                end(bTogether, p.behaviour.together),
              got: Math.round(
                (1 - Math.abs(p.behaviour.together - teamTogether) / 100) * 5,
              ),
              of: 5,
            },
          );
        parts.push(
          {
            group: "Team",
            says: !wantsLead
              ? "does not compete to lead"
              : leads
                ? "would be one more who wants to lead (" + leads + " already)"
                : "wants to lead, and nobody on the team does",
            got: wantsLead && leads ? 0 : 5,
            of: 5,
          },
        );
        if (seat.area)
          parts.splice(3, 0, {
            group: "Intention",
            says: "drawn to " + p.intention.area + " work",
            got: p.intention.area === seat.area ? 10 : 0,
            of: 10,
          });
        var got = 0;
        var of = 0;
        parts.forEach(function (x) {
          got += x.got;
          of += x.of;
        });
        return { person: p, parts: parts, score: Math.round((got / of) * 100) };
      })
      .sort(function (x, y) {
        return y.score - x.score || (x.person.id < y.person.id ? -1 : 1);
      });
  }

  /** A match's parts added up by group: [{ group, got, of }]. */
  function groups(m) {
    var out = [];
    m.parts.forEach(function (x) {
      var g = out.filter(function (o) {
        return o.group === x.group;
      })[0];
      if (!g) out.push((g = { group: x.group, got: 0, of: 0 }));
      g.got += x.got;
      g.of += x.of;
    });
    return out;
  }

  /**
   * Draws a team for every project in the list, once, in an order that does
   * not depend on what is clicked: the scanned ones first (each as large as its
   * git contributor count), then the catalogue's other projects, which have no
   * repository to count, so their size and commits are invented from a seed.
   * `list` is [{ id, name, district }], `district` null where none is scanned.
   */
  function staff(list) {
    list
      .filter(function (e) {
        return e.district;
      })
      .forEach(function (e) {
        teamOf(e.district);
      });
    list
      .filter(function (e) {
        return !e.district;
      })
      .forEach(function (e) {
        var rnd = seeded("size:" + e.id);
        teamOf({
          id: e.id,
          name: e.name,
          git: {
            contributors: 2 + Math.floor(rnd() * 2),
            commits: 80 + Math.round(rnd() * 900),
          },
        });
      });
  }

  /** The people on a project that cannot be entered, for its card. */
  function teamCard(id) {
    var team = teams[id];
    if (!team) return "";
    return (
      '<h2 style="margin-top:14px;font-size:14px">Team</h2><table><tr><th>Person</th><th>Strongest as</th><th class="n">Spare</th></tr>' +
      team
        .map(function (m) {
          return (
            "<tr><td>" +
            esc(m.name) +
            '</td><td><span style="color:hsl(' +
            m.first.hue +
            ',55%,40%)">' +
            esc(m.first.name) +
            '</span></td><td class="n">' +
            capacity(m) +
            "%</td></tr>"
          );
        })
        .join("") +
      '</table><p class="sub" style="margin-top:8px">Invented people. Spare is the share of a week a person has left across every project they are on.</p>'
    );
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

  /** What a person is like and what they want: traits, behaviour, intention. */
  function profile(p, others) {
    return (
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
        ? '<p class="sub">' + (p.contributions ? "Also on " : "Now on ") +
          others
            .map(function (o) {
              return esc(o.name);
            })
            .join(", ") +
          ".</p>"
        : "")
    );
  }

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
      reading(p) +
      '<div class="facts"><div><b>' +
      p.contributions.toLocaleString("en-US") +
      "</b><span>contributions</span></div><div><b>" +
      p.quality +
      "</b><span>quality / 100</span></div><div><b>" +
      teamQuality +
      "</b><span>team quality</span></div></div>" +
      profile(p, others) +
      '<p class="sub" style="margin-top:10px">Mock data. This person, the four traits, the behaviour, the intention, the contributions and the quality figures are invented from a seed; nothing is read from git, HR or an interview.</p>'
    );
  }

  /** A project's open seats, for its card. */
  function seatsCard(list) {
    return (
      '<h2 style="margin-top:14px;font-size:14px">Open seats</h2>' +
      (list.length
        ? "<table>" +
          list
            .map(function (s, i) {
              return (
                '<tr data-seat="' +
                i +
                '" style="cursor:pointer"><td style="width:84px"><b style="color:hsl(' +
                s.trait.hue +
                ',55%,40%)">' +
                esc(s.trait.name) +
                "</b></td><td>" +
                esc(s.trait.role) +
                (s.area ? " · " + esc(s.area) : "") +
                '<br><span class="sub">' +
                esc(s.reasons.join("; ")) +
                "</span></td></tr>"
              );
            })
            .join("") +
          "</table>"
        : "<p>None: no rule finds this team short of anyone.</p>") +
      '<p class="sub" style="margin-top:8px">A seat is opened by rule: under ' +
      THIN_TESTS +
      "% tests, no commit in " +
      QUIET_DAYS +
      " days, no owner, or a trait nobody on the team has. The tests and commit figures are read from the repository; the team is invented. Click a seat for who could take it.</p>"
    );
  }

  // What a model said about these invented people, where tools/analyze.mjs has
  // been run. The page works without it: the rule's score is always there.
  function analysis() {
    return window.GTECH_ANALYSIS || null;
  }
  function byModel(a) {
    return (
      '<span class="sub">Written by ' +
      esc(a.model) +
      " on " +
      esc(a.generatedAt) +
      ", about invented people.</span>"
    );
  }
  var AI_BOX =
    'style="background:#f1ece1;border-radius:8px;padding:8px 10px;margin:8px 0"';
  function reading(p) {
    var a = analysis();
    return a && a.people[p.id]
      ? "<div " +
          AI_BOX +
          '><p class="sub" style="margin:0 0 4px">AI reading</p><p style="margin:0 0 4px">' +
          esc(a.people[p.id]) +
          "</p>" +
          byModel(a) +
          "</div>"
      : "";
  }
  function nameOf(id) {
    var p = roster.filter(function (x) {
      return x.id === id;
    })[0];
    return p ? p.name : id;
  }

  var BACK =
    'style="border:0;background:none;padding:0;margin:0 0 8px;color:#5d6a62;font:inherit;font-size:12px;cursor:pointer;text-decoration:underline"';
  var NO_SCORE =
    '<p class="sub" style="margin-top:10px">Mock data, scored by rule: behaviour 40, intention 40 (30 where the seat has no business area), time 20, fit with the team up to 20, shown as a share of 100. Every person is invented, so the ranking shows how the match works and says nothing about anyone real. The quality figure is not used.</p>';

  /** The people who could take a seat, best first, with the filters above them. */
  function shortlistCard(seat, d, list, filters) {
    filters = filters || {};
    var a = analysis();
    var ai = a && a.seats[seat.project + "/" + seat.trait.key];
    var box = function (key, text) {
      return (
        '<label style="display:block;font-size:12px;margin:2px 0;cursor:pointer"><input type="checkbox" data-filter="' +
        key +
        '"' +
        (filters[key] ? " checked" : "") +
        "> " +
        text +
        "</label>"
      );
    };
    return (
      "<button data-back=\"project\" " +
      BACK +
      ">← " +
      esc(d.name) +
      "</button><h2>" +
      esc(seat.trait.name) +
      ' seat</h2><p class="sub">' +
      esc(seat.trait.role) +
      (seat.area ? " · " + esc(seat.area) : "") +
      " · " +
      esc(seat.reasons.join("; ")) +
      "</p>" +
      (ai
        ? "<div " +
          AI_BOX +
          '><p class="sub" style="margin:0 0 4px">AI\'s pick</p><p style="margin:0 0 4px"><b>' +
          esc(nameOf(ai.pick)) +
          ".</b> " +
          esc(ai.why) +
          '</p><p style="margin:0 0 4px"><b>Watch:</b> ' +
          esc(ai.risk) +
          "</p>" +
          byModel(a) +
          "</div>"
        : '<p class="sub">No AI analysis of this seat: run <code>node tools/analyze.mjs</code>. The ranking below is the rule\'s alone.</p>') +
      box("open", "Open to joining another project") +
      box("spare", "At least " + SPARE + "% of a week spare") +
      (seat.area ? box("area", "Drawn to " + esc(seat.area) + " work") : "") +
      (list.length
        ? '<table style="margin-top:8px"><tr><th>Person</th><th class="n">Fit</th></tr>' +
          list
            .slice(0, SHORTLIST)
            .map(function (m) {
              return (
                '<tr data-candidate="' +
                m.person.id +
                '" style="cursor:pointer"><td>' +
                esc(m.person.name) +
                (ai && ai.pick === m.person.id ? " · AI's pick" : "") +
                '<br><span class="sub">' +
                groups(m)
                  .map(function (g) {
                    return g.group.toLowerCase() + " " + g.got + "/" + g.of;
                  })
                  .join(" · ") +
                '</span></td><td class="n"><b>' +
                m.score +
                "</b></td></tr>"
              );
            })
            .join("") +
          '</table><p class="sub" style="margin-top:8px">' +
          Math.min(SHORTLIST, list.length) +
          " of " +
          list.length +
          " people not on this team.</p>"
        : '<p style="margin-top:8px">Nobody passes these filters.</p>') +
      NO_SCORE
    );
  }

  /** One person against one seat: every part of the score, then the person. */
  function candidateCard(m, seat, d) {
    var p = m.person;
    var a = analysis();
    var ai = a && a.seats[seat.project + "/" + seat.trait.key];
    return (
      "<button data-back=\"shortlist\" " +
      BACK +
      ">← " +
      esc(seat.trait.name) +
      " seat</button><h2>" +
      esc(p.name) +
      '</h2><p class="sub">for the ' +
      esc(seat.trait.name.toLowerCase()) +
      " seat on " +
      esc(d.name) +
      ' · invented person</p><div class="facts"><div><b>' +
      m.score +
      "</b><span>fit / 100</span></div>" +
      groups(m)
        .slice(0, 2)
        .map(function (g) {
          return (
            "<div><b>" +
            g.got +
            "/" +
            g.of +
            "</b><span>" +
            g.group.toLowerCase() +
            "</span></div>"
          );
        })
        .join("") +
      "</div><table>" +
      m.parts
        .map(function (x) {
          return (
            '<tr><td style="width:70px" class="sub">' +
            x.group +
            "</td><td>" +
            esc(x.says) +
            '</td><td class="n" style="width:44px">' +
            x.got +
            "/" +
            x.of +
            "</td></tr>"
          );
        })
        .join("") +
      "</table>" +
      (ai && ai.candidates[p.id]
        ? "<div " +
          AI_BOX +
          '><p class="sub" style="margin:0 0 4px">AI on this match' +
          (ai.pick === p.id ? " · its pick for the seat" : "") +
          '</p><p style="margin:0 0 4px">' +
          esc(ai.candidates[p.id]) +
          "</p>" +
          byModel(a) +
          "</div>"
        : "") +
      reading(p) +
      '<p class="sub" style="margin:12px 0 4px">Traits</p>' +
      profile(p, p.projects) +
      (p.projects.length ? "" : '<p class="sub">On no project now.</p>') +
      NO_SCORE
    );
  }

  return {
    stand: stand,
    card: card,
    TRAITS: TRAITS,
    BEHAVIOURS: BEHAVIOURS,
    roster: roster,
    teamOf: teamOf,
    staff: staff,
    teamCard: teamCard,
    seats: seats,
    seatsCard: seatsCard,
    match: match,
    shortlistCard: shortlistCard,
    candidateCard: candidateCard,
    capacity: capacity,
  };
})();
