/* global THREE */
// Two views of the same districts.
//   World:    every project is one object, its shape by the project's kind.
//   District: the project entered, as its buildings and floors.
// Geometry rules of a district, all of them here:
//   a building's side  = 4 + sqrt(files) / 4, kept between 5 and 14
//   a floor's height   = 0.6 + sqrt(files) / 3
//   floors stack largest first, so the widest module is the ground floor
(function () {
  "use strict";
  var districts = window.GTECH_DISTRICTS || [];
  var q = new URLSearchParams(location.search);
  var GAP = 2.2; // how far Explode pulls two floors apart
  var SPACING = 34; // between two projects in the world view
  var HUES = {
    apps: [205, 28, 265, 330],
    packages: [150, 95, 175, 60, 120, 190, 40, 80],
  };
  var PROJECT_HUES = [205, 28, 150, 265, 330, 95, 175, 45];

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfbf6ee);
  scene.fog = new THREE.Fog(0xfbf6ee, 260, 620);
  var camera = new THREE.PerspectiveCamera(
    40,
    innerWidth / innerHeight,
    0.5,
    1200,
  );
  var renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: q.has("shot"),
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);
  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 15;
  controls.maxDistance = 420;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc6b4, 0.95));
  var sun = new THREE.DirectionalLight(0xfff2d6, 0.55);
  sun.position.set(60, 120, 40);
  scene.add(sun);
  var ground = new THREE.Mesh(
    new THREE.CircleGeometry(900, 48),
    new THREE.MeshLambertMaterial({ color: 0xf3eee2 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.85;
  scene.add(ground);

  function colour(h, s, l) {
    return new THREE.Color().setHSL(h / 360, s, l);
  }
  function mat(c) {
    return new THREE.MeshLambertMaterial({ color: c });
  }
  function box(w, h, d, c) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
  }
  function at(mesh, x, y, z) {
    mesh.position.set(x, y, z);
    return mesh;
  }

  function label(text, size, ink) {
    var c = document.createElement("canvas");
    var g = c.getContext("2d");
    var font = "700 " + size * 2 + "px ui-sans-serif, system-ui, sans-serif";
    g.font = font;
    c.width = Math.ceil(g.measureText(text).width) + 48;
    c.height = size * 2 + 36;
    g.font = font;
    g.fillStyle = "rgba(255,255,255,0.92)";
    var r = c.height / 2;
    g.beginPath();
    g.moveTo(r, 0);
    g.arcTo(c.width, 0, c.width, c.height, r);
    g.arcTo(c.width, c.height, 0, c.height, r);
    g.arcTo(0, c.height, 0, 0, r);
    g.arcTo(0, 0, c.width, 0, r);
    g.fill();
    g.fillStyle = ink || "#23302a";
    g.textBaseline = "middle";
    g.fillText(text, 24, c.height / 2 + 2);
    var tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    var s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        depthTest: false,
        transparent: true,
      }),
    );
    s.scale.set((c.width / c.height) * (size / 10), size / 10, 1);
    s.renderOrder = 10;
    return s;
  }

  // ---- The kit: one object a kind, built of plain shapes. Each returns a
  // group about 12 across, and may give the frame loop something to move.
  var KIT = {
    city: function (hue) {
      var g = new THREE.Group();
      [
        [-3, 5, -2],
        [0.5, 8, -3],
        [3.5, 4, 0],
        [-2, 3, 2.5],
        [1.5, 6, 2],
      ].forEach(function (b, i) {
        g.add(
          at(
            box(2.6, b[1], 2.6, colour(hue, 0.5, i % 2 ? 0.64 : 0.56)),
            b[0],
            b[1] / 2,
            b[2],
          ),
        );
      });
      var dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        mat(colour(hue, 0.3, 0.8)),
      );
      g.add(at(dome, -3, 5, -2));
      return g;
    },
    "map-stack": function (hue) {
      var g = new THREE.Group();
      var sheets = [0, 1, 2, 3].map(function (i) {
        var s = box(10, 0.3, 10, colour((hue + i * 28) % 360, 0.5, 0.66));
        s.rotation.y = 0.12 * i;
        g.add(s);
        return s;
      });
      var pin = new THREE.Group();
      var cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.8, 2.2, 16),
        mat(0xd9534f),
      );
      cone.rotation.x = Math.PI;
      pin.add(at(cone, 0, 1.1, 0));
      pin.add(
        at(
          new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat(0xd9534f)),
          0,
          2.6,
          0,
        ),
      );
      g.add(pin);
      var ask = label("?", 26);
      g.add(ask);
      g.userData.tick = function (t) {
        var open = 1.6 + Math.sin(t * 0.8) * 0.7; // the sheets drift apart and back
        sheets.forEach(function (s, i) {
          s.position.y = 0.6 + i * open;
        });
        pin.position.set(1.5, 0.75 + 3 * open, -1);
        ask.position.set(4, 4.6 + 3 * open, -1);
      };
      g.userData.tick(0);
      return g;
    },
    racks: function (hue) {
      var g = new THREE.Group();
      [-3.6, 0, 3.6].forEach(function (x, i) {
        g.add(at(box(2.8, 8, 4.5, colour(hue, 0.2, 0.42)), x, 4, 0));
        for (var r = 0; r < 5; r++) {
          var led = box(2.2, 0.25, 0.1, (r + i) % 3 ? 0x7be08a : 0xffd166);
          led.material.emissive = led.material.color
            .clone()
            .multiplyScalar(0.5);
          g.add(at(led, x, 1.4 + r * 1.3, 2.3));
        }
      });
      return g;
    },
    houses: function (hue) {
      var g = new THREE.Group();
      [
        [-3, -2],
        [3, -2.5],
        [-3.2, 3],
        [2.6, 2.6],
      ].forEach(function (p, i) {
        g.add(at(box(3.4, 2.6, 3.4, colour(hue, 0.25, 0.86)), p[0], 1.3, p[1]));
        var roof = new THREE.Mesh(
          new THREE.ConeGeometry(3, 2, 4),
          mat(colour((hue + i * 12) % 360, 0.55, 0.55)),
        );
        roof.rotation.y = Math.PI / 4;
        g.add(at(roof, p[0], 3.6, p[1]));
      });
      return g;
    },
    tunnel: function (hue) {
      var g = new THREE.Group();
      var arch = new THREE.Mesh(
        new THREE.TorusGeometry(4.2, 1.5, 12, 28, Math.PI),
        mat(colour(hue, 0.25, 0.6)),
      );
      g.add(at(arch, 0, 0, 2));
      g.add(at(arch.clone(), 0, 0, -2));
      g.add(at(box(11.4, 3, 4, colour(hue, 0.25, 0.6)), 0, 5.2, 0));
      g.add(at(box(5.4, 0.3, 12, 0x5d6a62), 0, 0.15, 0));
      var train = box(3, 2.6, 5, 0xffd166);
      g.add(train);
      g.userData.tick = function (t) {
        train.position.set(0, 1.6, Math.sin(t * 0.6) * 3);
      };
      g.userData.tick(0);
      return g;
    },
    robot: function (hue) {
      var g = new THREE.Group();
      var body = new THREE.Group();
      body.add(at(box(5, 5, 3.6, colour(hue, 0.45, 0.62)), 0, 3.4, 0));
      body.add(at(box(3.6, 2.8, 3, colour(hue, 0.3, 0.82)), 0, 7.4, 0));
      [-0.8, 0.8].forEach(function (x) {
        body.add(
          at(
            new THREE.Mesh(
              new THREE.SphereGeometry(0.42, 12, 10),
              mat(0x23302a),
            ),
            x,
            7.6,
            1.5,
          ),
        );
      });
      body.add(at(box(0.25, 1.4, 0.25, 0x5d6a62), 0, 9.5, 0));
      body.add(
        at(
          new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), mat(0xd9534f)),
          0,
          10.3,
          0,
        ),
      );
      g.add(body);
      g.userData.tick = function (t) {
        body.position.y = Math.sin(t * 1.4) * 0.35;
      };
      return g;
    },
  };

  // ---- A district: its buildings, floors, wiring and services, about its own origin.
  function buildDistrict(d) {
    var g = new THREE.Group();
    var floors = [];
    var tops = [];
    var wires = new THREE.Group();
    g.add(wires);
    var groups = { apps: [], packages: [], other: [] };
    d.units.forEach(function (u) {
      (groups[u.group] || groups.other).push(u);
    });
    var z = 0;
    var width = 0;
    var tallest = 0;
    var placed = {};
    [groups.apps.concat(groups.other), groups.packages].forEach(function (row) {
      if (!row.length) return;
      var x = 0;
      var deepest = 0;
      row.forEach(function (u, ui) {
        var side = Math.max(5, Math.min(14, 4 + Math.sqrt(u.files) / 4));
        var hues = HUES[u.group] || HUES.apps;
        var hue = hues[ui % hues.length];
        var stack = u.floors.length
          ? u.floors
          : [
              {
                name: u.id,
                kind: "support",
                files: u.files,
                lines: u.lines,
                tests: u.tests,
              },
            ];
        var cx = x + side / 2;
        var cz = z + side / 2;
        var y = 0;
        var top = null;
        stack.forEach(function (f, i) {
          var h = 0.6 + Math.sqrt(f.files) / 3;
          var base =
            f.kind === "domain"
              ? colour(hue, 0.55, i % 2 ? 0.62 : 0.56)
              : colour(hue, 0.18, i % 2 ? 0.74 : 0.7);
          var m = at(box(side, h - 0.12, side, base), cx, y + h / 2, cz);
          m.userData = {
            district: d,
            unit: u,
            floor: f,
            index: i,
            baseY: y + h / 2,
            base: base,
            hue: hue,
          };
          g.add(m);
          floors.push(m);
          y += h;
          top = m;
        });
        var name = label(u.id, 18);
        g.add(name);
        tops.push({
          sprite: name,
          floor: top,
          lift: (0.6 + Math.sqrt(top.userData.floor.files) / 3) / 2 + 1.8,
        });
        placed[u.id] = { x: cx, z: cz, top: y };
        tallest = Math.max(tallest, y);
        x += side + 4;
        deepest = Math.max(deepest, side);
      });
      width = Math.max(width, x - 4);
      z += deepest + 7;
    });

    // What the district runs beside its code: one small drum a compose image.
    var run = d.services.filter(function (s) {
      return s.image;
    });
    run.forEach(function (s, i) {
      var drum = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.5, 2.2, 20),
        mat(0xb9b2a3),
      );
      g.add(at(drum, 1.5 + i * 7, 1.1, z + 1.5));
      g.add(at(label(s.name, 13, "#5d6a62"), 1.5 + i * 7, 3.6, z + 1.5));
    });
    var depth = z + (run.length ? 5 : -3);
    width = Math.max(width, run.length * 7);
    g.add(
      at(
        box(width + 12, 0.8, depth + 12, 0xdfe8d3),
        width / 2,
        -0.42,
        depth / 2,
      ),
    );

    // A building's dependencies inside its own repository, as arcs between roofs.
    d.units.forEach(function (u) {
      u.deps.forEach(function (dep) {
        var a = placed[u.id];
        var b = placed[dep];
        if (!a || !b) return;
        var mid = new THREE.Vector3(
          (a.x + b.x) / 2,
          Math.max(a.top, b.top) + 6 + Math.hypot(a.x - b.x, a.z - b.z) * 0.15,
          (a.z + b.z) / 2,
        );
        var curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(a.x, a.top, a.z),
          mid,
          new THREE.Vector3(b.x, b.top, b.z),
        );
        var line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(curve.getPoints(28)),
          new THREE.LineBasicMaterial({
            color: 0x2b3a30,
            transparent: true,
            opacity: 0.28,
          }),
        );
        line.userData = { from: u.id, to: dep };
        wires.add(line);
      });
    });

    // The project's team, where the page has the people module (all of it mock).
    var people = window.GTECH_PEOPLE
      ? window.GTECH_PEOPLE.stand(d, g, width, depth)
      : [];
    g.visible = false;
    scene.add(g);
    return {
      district: d,
      group: g,
      floors: floors,
      people: people,
      tops: tops,
      wires: wires,
      centre: new THREE.Vector3(width / 2, tallest * 0.45, depth / 2),
      // The view takes in the tallest building as well as the plot.
      // and the team in front of it, however small the project.
      radius: Math.max(width, depth + 8, tallest * 1.5, 26),
    };
  }

  // ---- The world: one object a project, on a grid about the origin.
  var world = new THREE.Group();
  scene.add(world);
  // What stands in it: the catalogue's apps (each with its scanned repository
  // where there is one), then scanned repositories the catalogue does not list,
  // then an empty plot for each business problem no project works on.
  var cat = window.GTECH_CATALOGUE || {
    apps: [],
    problems: [],
    gaps: function () {
      return [];
    },
  };
  var scanned = {};
  districts.forEach(function (d) {
    scanned[d.id] = d;
  });
  var entries = cat.apps
    .map(function (a) {
      return {
        id: a.id,
        name: a.name,
        kind: a.kind,
        app: a,
        district: scanned[a.id] || null,
      };
    })
    .concat(
      districts
        .filter(function (d) {
          return !cat.apps.some(function (a) {
            return a.id === d.id;
          });
        })
        .map(function (d) {
          return {
            id: d.id,
            name: d.name,
            kind: d.kind,
            app: null,
            district: d,
          };
        }),
    );
  // Every project has a team (all of it mock), drawn here once so that who is
  // on what does not depend on which project is opened first.
  if (window.GTECH_PEOPLE) window.GTECH_PEOPLE.staff(entries);
  var gapList = cat.gaps(
    new Date(),
    entries.filter(function (e) {
      return !e.app;
    }),
  );
  gapList
    .filter(function (g) {
      return g.rule === "no-project";
    })
    .forEach(function (g) {
      var p = cat.problems.filter(function (x) {
        return x.id === g.problem;
      })[0];
      entries.push({
        id: "gap-" + p.id,
        name: "No project",
        kind: "empty",
        problem: p,
        app: null,
        district: null,
      });
    });
  var gapsOf = function (id) {
    return gapList.filter(function (g) {
      return g.apps.indexOf(id) >= 0;
    });
  };

  var cols = Math.ceil(Math.sqrt(entries.length)) || 1;
  var rows = Math.ceil(entries.length / cols) || 1;
  var places = entries.map(function (entry, i) {
    var d = entry.district;
    var p = d ? buildDistrict(d) : { district: null };
    p.entry = entry;
    var hue = PROJECT_HUES[i % PROJECT_HUES.length];
    var icon;
    if (entry.kind === "empty") {
      // A problem with no project: a ring where one would stand.
      icon = new THREE.Group();
      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(6, 0.35, 8, 40),
        mat(0xd9534f),
      );
      ring.rotation.x = Math.PI / 2;
      icon.add(at(ring, 0, 0.4, 0));
    } else {
      icon = (KIT[entry.kind] || KIT.city)(hue);
      // A larger project is a somewhat larger object: a decade of files is a quarter more.
      icon.scale.setScalar(d ? 0.75 + Math.log10(d.totals.files + 10) / 4 : 1);
    }
    var flagged = gapsOf(entry.id).length;
    if (flagged) {
      var flag = label(
        flagged + (flagged > 1 ? " gaps" : " gap"),
        20,
        "#b3261e",
      );
      flag.position.set(0, 17, 0);
      p.flag = flag;
    }
    var spot = new THREE.Group();
    if (p.flag) spot.add(p.flag);
    spot.position.set(
      ((i % cols) - (cols - 1) / 2) * SPACING,
      0,
      (Math.floor(i / cols) - (rows - 1) / 2) * SPACING,
    );
    spot.add(
      at(
        new THREE.Mesh(
          new THREE.CylinderGeometry(11, 11, 0.8, 40),
          mat(0xdfe8d3),
        ),
        0,
        -0.42,
        0,
      ),
    );
    spot.add(icon);
    spot.add(at(label(entry.name, 26), 0, 1.4, 12.5));
    world.add(spot);
    p.spot = spot;
    p.icon = icon;
    return p;
  });

  // Camera moves ease toward a goal, so entering a project reads as going somewhere.
  var goal = null;
  function look(centre, radius) {
    goal = {
      target: centre.clone(),
      position: centre
        .clone()
        .add(
          new THREE.Vector3(radius * 0.75, radius * 0.7 + 10, radius * 1.15),
        ),
    };
  }

  var inside = null; // the place entered, or null in the world view
  var selected = null;
  var exploded = 0;
  var explodeGoal = q.has("explode") ? 1 : 0;

  var card = document.getElementById("card");
  var hint = document.getElementById("hint");
  var explodeBtn = document.getElementById("explode");
  var wiringBtn = document.getElementById("wiring");
  var fmt = function (n) {
    return n == null ? "n/a" : n.toLocaleString("en-US");
  };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  var share = function (a, b) {
    return b ? Math.round((a / b) * 100) + "%" : "n/a";
  };

  function paint() {
    if (!inside) return;
    inside.floors.forEach(function (m) {
      var on = selected && selected.userData.unit === m.userData.unit;
      m.material.color.copy(m.userData.base);
      if (selected && !on)
        m.material.color.lerp(new THREE.Color(0xe4ded2), 0.72);
      m.material.emissive.setHex(m === selected ? 0x554400 : 0x000000);
    });
    inside.wires.children.forEach(function (l) {
      var u = selected && selected.userData.unit.id;
      l.material.opacity = selected
        ? l.userData.from === u || l.userData.to === u
          ? 0.9
          : 0.05
        : 0.28;
    });
  }

  var rm = function (n) {
    return "RM " + fmt(n);
  };
  var DUMMY =
    '<p class="sub" style="margin-top:10px">A dummy catalogue: every project, status, date, owner, user count, cost and business problem here is invented.</p>';

  // The business view of one entry: what it is for, who owns it, what it costs, its gaps.
  function businessHtml(entry) {
    var a = entry.app;
    var mine = gapsOf(entry.id);
    var gaps = mine.length
      ? "<table><tr><th>Gaps</th></tr>" +
        mine
          .map(function (g) {
            return (
              "<tr><td>" +
              esc(g.says) +
              (g.dummy ? " (dummy)" : "") +
              "</td></tr>"
            );
          })
          .join("") +
        "</table>"
      : '<p class="sub">No gap found by the rules.</p>';
    if (!a) return gaps;
    var solves = cat.problems
      .filter(function (p) {
        return a.problems.indexOf(p.id) >= 0;
      })
      .map(function (p) {
        return p.name + " (" + p.area + ")";
      });
    return (
      '<p class="sub">' +
      esc(a.type) +
      " · " +
      esc(a.status) +
      " · docs " +
      esc(a.docs || "no date") +
      "</p><p>" +
      esc(a.what) +
      ".</p>" +
      '<p class="sub">Problem: ' +
      esc(solves.join("; ")) +
      "</p>" +
      '<div class="facts"><div><b>' +
      esc(a.owner || "none") +
      "</b><span>owner</span></div><div><b>" +
      fmt(a.users) +
      "</b><span>users</span></div><div><b>" +
      rm(a.costMonth) +
      "</b><span>a month</span></div></div>" +
      gaps
    );
  }

  function showEntry(entry) {
    card.hidden = false;
    card.innerHTML = entry.problem
      ? '<h2>No project</h2><p class="sub">a business problem nobody works on · ' +
        esc(entry.problem.area) +
        "</p><p>" +
        esc(entry.problem.name) +
        ".</p>" +
        DUMMY
      : "<h2>" +
        esc(entry.name) +
        "</h2>" +
        businessHtml(entry) +
        (window.GTECH_PEOPLE ? window.GTECH_PEOPLE.teamCard(entry.id) : "") +
        (entry.district
          ? ""
          : '<p class="sub" style="margin-top:10px">No repository scanned for it yet, so it has no inside.</p>') +
        DUMMY;
  }

  function showBusiness() {
    var live = cat.apps;
    var cost = live.reduce(function (n, a) {
      return n + a.costMonth;
    }, 0);
    card.hidden = false;
    card.innerHTML =
      "<h2>GTech at a glance</h2>" +
      '<div class="facts"><div><b>' +
      live.length +
      "</b><span>apps and services</span></div><div><b>" +
      rm(cost) +
      "</b><span>a month (dummy)</span></div><div><b>" +
      gapList.length +
      "</b><span>gaps</span></div></div>" +
      "<table><tr><th>Gaps, by rule</th></tr>" +
      gapList
        .map(function (g) {
          var id = g.apps[0] || "gap-" + g.problem;
          return (
            '<tr data-entry="' +
            esc(id) +
            '"><td>' +
            esc(g.says) +
            (g.dummy ? " (dummy)" : "") +
            "</td></tr>"
          );
        })
        .join("") +
      "</table>" +
      '<table style="margin-top:12px"><tr><th>Project</th><th>Status</th><th class="n">Users</th><th class="n">RM / month</th></tr>' +
      live
        .map(function (a) {
          return (
            '<tr data-entry="' +
            esc(a.id) +
            '"><td>' +
            esc(a.name) +
            "</td><td>" +
            esc(a.status) +
            '</td><td class="n">' +
            fmt(a.users) +
            '</td><td class="n">' +
            fmt(a.costMonth) +
            "</td></tr>"
          );
        })
        .join("") +
      "</table>" +
      DUMMY;
  }

  function showWorld() {
    if (cat.apps.length) return showBusiness();
    card.hidden = !districts.length;
    card.innerHTML =
      '<h2>Every project</h2><p class="sub">click a project to go inside</p>' +
      '<table><tr><th>Project</th><th class="n">Files</th><th class="n">Lines</th><th class="n">Tests</th><th class="n">Commits</th><th class="n">Last</th></tr>' +
      districts
        .map(function (d) {
          return (
            '<tr data-enter="' +
            esc(d.id) +
            '"><td>' +
            esc(d.name) +
            '</td><td class="n">' +
            fmt(d.totals.files) +
            '</td><td class="n">' +
            fmt(d.totals.lines) +
            '</td><td class="n">' +
            share(d.totals.tests, d.totals.files) +
            '</td><td class="n">' +
            fmt(d.git.commits) +
            '</td><td class="n">' +
            esc(d.git.lastCommit || "n/a") +
            "</td></tr>"
          );
        })
        .join("") +
      '</table><p class="sub" style="margin-top:8px">Tests is the share of source files that are test files.</p>';
  }

  function showDistrict(d) {
    card.hidden = false;
    card.innerHTML =
      "<h2>" +
      esc(d.name) +
      '</h2><p class="sub">project · scanned ' +
      esc(d.scannedAt) +
      "</p>" +
      (d.summary ? "<p>" + esc(d.summary) + "</p>" : "") +
      '<div class="facts"><div><b>' +
      fmt(d.totals.files) +
      "</b><span>source files</span></div><div><b>" +
      fmt(d.totals.lines) +
      "</b><span>lines</span></div><div><b>" +
      fmt(d.totals.tests) +
      "</b><span>test files</span></div>" +
      "<div><b>" +
      fmt(d.git.commits) +
      "</b><span>commits</span></div><div><b>" +
      fmt(d.git.contributors) +
      "</b><span>contributors</span></div><div><b>" +
      esc(d.git.lastCommit || "n/a") +
      "</b><span>last commit</span></div></div>" +
      '<table><tr><th>Building</th><th class="n">Floors</th><th class="n">Files</th></tr>' +
      d.units
        .map(function (u) {
          return (
            '<tr data-unit="' +
            esc(u.id) +
            '"><td>' +
            esc(u.id) +
            '</td><td class="n">' +
            u.floors.length +
            '</td><td class="n">' +
            fmt(u.files) +
            "</td></tr>"
          );
        })
        .join("") +
      "</table>";
  }

  function showUnit(m) {
    var u = m.userData.unit;
    var f = m.userData.floor;
    var usedBy = m.userData.district.units
      .filter(function (o) {
        return o.deps.indexOf(u.id) >= 0;
      })
      .map(function (o) {
        return o.id;
      });
    card.hidden = false;
    card.innerHTML =
      "<h2>" +
      esc(u.id) +
      '</h2><p class="sub">' +
      esc(u.path) +
      " · in " +
      esc(m.userData.district.name) +
      "</p>" +
      (u.summary ? "<p>" + esc(u.summary) + "</p>" : "") +
      '<div class="facts"><div><b>' +
      fmt(u.files) +
      "</b><span>source files</span></div><div><b>" +
      fmt(u.lines) +
      "</b><span>lines</span></div><div><b>" +
      fmt(u.tests) +
      "</b><span>test files</span></div></div>" +
      (u.stack.length
        ? '<div class="chips">' +
          u.stack
            .map(function (s) {
              return "<span>" + esc(s) + "</span>";
            })
            .join("") +
          "</div>"
        : "") +
      '<p class="sub">Uses: ' +
      (u.deps.length ? esc(u.deps.join(", ")) : "nothing here") +
      "<br>Used by: " +
      (usedBy.length ? esc(usedBy.join(", ")) : "nothing here") +
      "</p>" +
      '<table><tr><th>Floor</th><th class="n">Files</th><th class="n">Lines</th><th class="n">Tests</th></tr>' +
      (u.floors.length ? u.floors : [f])
        .map(function (x) {
          var sw =
            x.kind === "domain"
              ? colour(m.userData.hue, 0.55, 0.58)
              : colour(m.userData.hue, 0.18, 0.72);
          return (
            '<tr data-floor="' +
            esc(x.name) +
            '"' +
            (x === f ? ' class="on"' : "") +
            '><td><span class="sw" style="background:#' +
            sw.getHexString() +
            '"></span>' +
            esc(x.name) +
            '</td><td class="n">' +
            fmt(x.files) +
            '</td><td class="n">' +
            fmt(x.lines) +
            '</td><td class="n">' +
            fmt(x.tests) +
            "</td></tr>"
          );
        })
        .join("") +
      "</table>";
  }

  function select(m) {
    selected = m;
    paint();
    if (m) showUnit(m);
    else if (inside) showDistrict(inside.district);
  }

  function chips() {
    Array.prototype.forEach.call(
      document.querySelectorAll("#districts button"),
      function (b) {
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.id === (inside ? inside.district.id : "")),
        );
      },
    );
    explodeBtn.hidden = wiringBtn.hidden = !inside;
    hint.textContent = inside
      ? "A building is one app or package, a floor one module, as tall as its file count. Drag to orbit, scroll to zoom, click a floor."
      : "Every project is one object, its shape by what the project is. Click one to go inside.";
  }

  // The seats of the project the page is inside, and the one being looked at.
  var seats = [];
  var seat = null;
  var filters = {};
  var People = window.GTECH_PEOPLE;

  /** The card of the project the page is inside: its facts, its seats, its business. */
  function showProject() {
    var p = inside;
    seat = null;
    showDistrict(p.district);
    if (People) {
      seats = People.seats(p.district, p.entry.app, cat.problems, new Date());
      card.innerHTML += People.seatsCard(seats);
    }
    card.innerHTML +=
      '<h2 style="margin-top:14px;font-size:14px">Business</h2>' +
      businessHtml(p.entry) +
      DUMMY;
  }

  function showShortlist(i) {
    if (i != null) {
      seat = seats[i];
      filters = {};
    }
    if (!seat) return;
    selected = null;
    paint();
    card.hidden = false;
    card.innerHTML = People.shortlistCard(
      seat,
      inside.district,
      People.match(seat, inside.district, filters),
      filters,
    );
    card.scrollTop = 0;
  }

  function showCandidate(id) {
    // Scored without the filters, so a person is the same whatever is ticked.
    var m = People.match(seat, inside.district).filter(function (x) {
      return x.person.id === id;
    })[0];
    if (!m) return;
    card.innerHTML = People.candidateCard(m, seat, inside.district);
    card.scrollTop = 0;
  }

  function enter(p) {
    if (inside) inside.group.visible = false;
    inside = p;
    selected = null;
    world.visible = false;
    p.group.visible = true;
    paint();
    showProject();
    look(p.centre, p.radius);
    chips();
  }

  function leave() {
    if (inside) inside.group.visible = false;
    inside = null;
    selected = null;
    world.visible = true;
    showWorld();
    look(
      new THREE.Vector3(0, 4, 0),
      Math.max(cols, rows) * SPACING * 0.75 + 14,
    );
    chips();
  }

  var byId = function (id) {
    return places.filter(function (p) {
      return p.district && p.district.id === id;
    })[0];
  };

  card.addEventListener("click", function (e) {
    var back = e.target.closest("[data-back]");
    if (back)
      return back.dataset.back === "shortlist" ? showShortlist() : showProject();
    var box = e.target.closest("input[data-filter]");
    if (box) {
      filters[box.dataset.filter] = box.checked;
      return showShortlist();
    }
    if (e.target.closest("label")) return; // its checkbox's own click follows
    var row = e.target.closest("tr");
    if (!row) return;
    if (row.dataset.seat) return showShortlist(Number(row.dataset.seat));
    if (row.dataset.candidate) return showCandidate(row.dataset.candidate);
    if (row.dataset.enter) return enter(byId(row.dataset.enter));
    if (row.dataset.entry) {
      var place = places.filter(function (p) {
        return p.entry.id === row.dataset.entry;
      })[0];
      if (!place) return;
      return place.district ? enter(place) : showEntry(place.entry);
    }
    if (!inside) return;
    var hit = inside.floors.filter(function (m) {
      return row.dataset.unit
        ? m.userData.unit.id === row.dataset.unit
        : selected &&
            m.userData.unit === selected.userData.unit &&
            m.userData.floor.name === row.dataset.floor;
    })[0];
    if (hit) select(hit);
  });

  var ray = new THREE.Raycaster();
  var down = null;
  renderer.domElement.addEventListener("pointerdown", function (e) {
    down = { x: e.clientX, y: e.clientY };
  });
  renderer.domElement.addEventListener("pointerup", function (e) {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return; // a drag is an orbit
    ray.setFromCamera(
      new THREE.Vector2(
        (e.clientX / innerWidth) * 2 - 1,
        -(e.clientY / innerHeight) * 2 + 1,
      ),
      camera,
    );
    if (inside) {
      // A person stands in front of the buildings, so a click on one is theirs first.
      var who = ray.intersectObjects(inside.people, true)[0];
      if (who) {
        var fig = who.object;
        while (fig && !fig.userData.person) fig = fig.parent;
        selected = null;
        paint();
        card.hidden = false;
        card.innerHTML = window.GTECH_PEOPLE.card(
          fig.userData.person,
          inside.district,
          inside.people.map(function (f) {
            return f.userData.person;
          }),
        );
        return;
      }
      var hit = ray.intersectObjects(inside.floors)[0];
      return select(hit ? hit.object : null);
    }
    // In the world a click anywhere on a project's object, or its plot, enters it.
    var best = null;
    places.forEach(function (p) {
      var h = ray.intersectObject(p.spot, true)[0];
      if (h && (!best || h.distance < best.distance))
        best = { distance: h.distance, place: p };
    });
    // A project with a scanned repository is entered; any other shows its business card.
    if (best && best.place.district) enter(best.place);
    else if (best) showEntry(best.place.entry);
    else showWorld();
  });

  var bar = document.getElementById("districts");
  function chip(text, id, fn) {
    var b = document.createElement("button");
    b.textContent = text;
    b.dataset.id = id;
    b.addEventListener("click", fn);
    bar.appendChild(b);
  }
  chip("World", "", leave);
  places.forEach(function (p) {
    if (!p.district) return; // only a project with a scanned repository has an inside
    chip(p.district.name, p.district.id, function () {
      enter(p);
    });
  });

  explodeBtn.setAttribute("aria-pressed", String(explodeGoal === 1));
  explodeBtn.addEventListener("click", function () {
    explodeGoal = explodeGoal ? 0 : 1;
    explodeBtn.setAttribute("aria-pressed", String(explodeGoal === 1));
  });
  var wired = true;
  wiringBtn.addEventListener("click", function () {
    wired = !wired;
    wiringBtn.setAttribute("aria-pressed", String(wired));
  });

  addEventListener("resize", function () {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  if (!districts.length) {
    card.hidden = false;
    card.innerHTML =
      "<h2>No project yet</h2><p>Run <code>node tools/scan.mjs --repo &lt;path&gt; --id &lt;id&gt;</code>.</p>";
  }
  var first = byId(q.get("enter"));
  if (first) enter(first);
  else leave();
  if (goal) {
    camera.position.copy(goal.position);
    controls.target.copy(goal.target);
    goal = null;
  }
  if (inside && q.get("select")) {
    var want = q.get("select").split("/");
    var pick = inside.floors.filter(function (m) {
      return (
        m.userData.unit.id === want[0] &&
        (!want[1] || m.userData.floor.name === want[1])
      );
    })[0];
    if (pick) select(pick);
  }
  if (inside && q.has("person") && inside.people[Number(q.get("person"))]) {
    card.innerHTML = window.GTECH_PEOPLE.card(
      inside.people[Number(q.get("person"))].userData.person,
      inside.district,
      inside.people.map(function (f) {
        return f.userData.person;
      }),
    );
  }
  if (inside && q.has("seat") && seats[Number(q.get("seat"))]) {
    showShortlist(Number(q.get("seat")));
    if (q.get("candidate")) showCandidate(q.get("candidate"));
  }
  if (q.has("explode")) exploded = 1;

  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    var t = clock.getElapsedTime();
    if (inside) {
      exploded = still
        ? explodeGoal
        : exploded + (explodeGoal - exploded) * 0.12;
      inside.floors.forEach(function (m) {
        m.position.y = m.userData.baseY + exploded * m.userData.index * GAP;
      });
      inside.tops.forEach(function (o) {
        o.sprite.position.set(
          o.floor.position.x,
          o.floor.position.y + o.lift,
          o.floor.position.z,
        );
      });
      inside.wires.visible = wired;
    } else if (!still) {
      places.forEach(function (p) {
        if (p.icon.userData.tick) p.icon.userData.tick(t);
      });
    }
    if (goal) {
      camera.position.lerp(goal.position, still ? 1 : 0.08);
      controls.target.lerp(goal.target, still ? 1 : 0.08);
      if (camera.position.distanceTo(goal.position) < 0.3) goal = null;
    }
    controls.update();
    renderer.render(scene, camera);
  }
  frame();
})();
