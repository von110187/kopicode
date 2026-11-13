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
  // The page's sky shows through behind the scene; distance fades into it.
  scene.fog = new THREE.Fog(0xe9e6fb, 460, 980);
  var camera = new THREE.PerspectiveCamera(
    40,
    innerWidth / innerHeight,
    0.5,
    1200,
  );
  var renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: q.has("shot"),
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 15;
  controls.maxDistance = 420;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc6b4, 0.95));
  var sun = new THREE.DirectionalLight(0xfff2d6, 0.55);
  sun.position.set(70, 125, -85); // behind the world as it is first seen, so shade falls toward the viewer
  // The sun's shadows cover the whole island, soft enough to read as a clear day.
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -210;
  sun.shadow.camera.right = sun.shadow.camera.top = 210;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 420;
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  scene.add(sun);
  /** Lets every solid, lit shape under `root` cast a shadow and take one. People are left out: they have a spot of shade of their own. */
  function shade(root) {
    (function down(o) {
      if (o.userData.noShade) return;
      var m = o.material;
      if (o.isMesh && m && m.isMeshLambertMaterial && !m.transparent) o.castShadow = o.receiveShadow = true;
      o.children.forEach(down);
    })(root);
  }
  // The ground is an island floating on the sky: grass on top, earth at its edge.
  var ground = new THREE.Group();
  var grass = new THREE.Mesh(
    new THREE.CylinderGeometry(175, 175, 2, 72),
    // Unlit, so the grass keeps its colour under the scene's bright light.
    new THREE.MeshBasicMaterial({ color: 0xcbe3b8 }),
  );
  grass.position.y = -1.85;
  var earth = new THREE.Mesh(
    new THREE.CylinderGeometry(175, 120, 34, 72),
    new THREE.MeshLambertMaterial({ color: 0xd9b384 }),
  );
  earth.position.y = -19.9;
  ground.add(grass, earth);
  // The grass is unlit, so shade falls on a sheet of its own just over the ground.
  var shadeSheet = new THREE.Mesh(
    new THREE.CircleGeometry(175, 72),
    new THREE.ShadowMaterial({ opacity: 0.4, depthWrite: false }),
  );
  shadeSheet.rotation.x = -Math.PI / 2;
  // Half a unit up: over the white ground each project stands on, and, as found by
  // trying, as low as a broad shape's shade still falls on it whole.
  shadeSheet.position.y = 0.5;
  shadeSheet.receiveShadow = true;
  shadeSheet.renderOrder = 1;
  ground.add(shadeSheet);
  scene.add(ground);

  // Clouds round the island and below its edge, drifting: it floats in the sky.
  var clouds = new THREE.Group();
  (function () {
    var h = 77;
    var r = function () {
      h = (h * 16807) % 2147483647;
      return h / 2147483647;
    };
    var white = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    for (var i = 0; i < 16; i++) {
      var c = new THREE.Group();
      var puffs = 3 + Math.floor(r() * 3);
      for (var k = 0; k < puffs; k++) {
        var puff = new THREE.Mesh(new THREE.SphereGeometry(7 + r() * 7, 12, 9), white);
        puff.position.set((k - puffs / 2) * 9 + r() * 4, r() * 4, r() * 8 - 4);
        puff.scale.y = 0.6;
        c.add(puff);
      }
      var a = (i / 16) * Math.PI * 2 + r() * 0.3;
      var far = 235 + r() * 120;
      c.position.set(Math.cos(a) * far, -34 + r() * 44, Math.sin(a) * far);
      c.scale.setScalar(0.8 + r() * 1.3);
      clouds.add(c);
    }
  })();
  scene.add(clouds);

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

  // ---- What a project's object says about its state, beside what it is.
  var QUIET = 90; // days with no commit, after which the object goes dark and overgrown
  // The stall rule, fitted and tested on real repositories by tools/backtest.mjs: a project
  // idle this many days or more is predicted to have no commit in the next 30.
  var STALL = window.GTECH_STALL || null;
  // The agent's moves (agent.js) as last worked out, and which of them are applied to the city.
  var Agent = window.GTECH_AGENT || null;
  var agentMoves = [];
  var applied = {};
  var THIN = 10; // % of source files that are tests, under which it is taped off
  var YOUNG = 150; // commits, under which the scaffolding is still up

  /** The facts an object is dressed by: read from a scan, invented for a dummy inside. */
  function stateOf(entry, d) {
    var quiet =
      d && d.git.lastCommit
        ? Math.floor((Date.now() - new Date(d.git.lastCommit + "T00:00:00")) / 86400000)
        : null;
    var share =
      d && d.totals.files ? Math.round((d.totals.tests / d.totals.files) * 100) : null;
    var precode = !!(entry.app && entry.app.status === "Pre-code");
    return {
      precode: precode,
      young: !precode && !!d && d.git.commits != null && d.git.commits < YOUNG,
      quiet: quiet,
      stale: quiet != null && quiet > QUIET,
      share: share,
      thin: share != null && share < THIN,
      unowned: !!(entry.app && !entry.app.owner),
      // Idle long enough for the rule, and not yet so long that it is already overgrown.
      stalling: !!STALL && !precode && quiet != null && quiet >= STALL.rule.idleDays && quiet <= QUIET,
    };
  }

  /** A project with no code yet: a fenced plot, a foundation and the plan on a board. */
  function plotOf() {
    var g = new THREE.Group();
    g.add(at(box(9, 0.5, 9, 0xcfc6b0), 0, 0.25, 0));
    [-5.5, 5.5].forEach(function (x) {
      [-5.5, 5.5].forEach(function (z) {
        g.add(at(box(0.35, 2.4, 0.35, 0x8a7a5c), x, 1.2, z));
      });
      g.add(at(box(0.2, 0.2, 11, 0x8a7a5c), x, 1.9, 0));
      g.add(at(box(11, 0.2, 0.2, 0x8a7a5c), 0, 1.9, x));
    });
    g.add(at(box(0.3, 4, 0.3, 0x8a7a5c), -3.4, 2, 6.4));
    g.add(at(box(0.3, 4, 0.3, 0x8a7a5c), -0.6, 2, 6.4));
    g.add(at(box(4.2, 2.6, 0.2, 0xeaf2fb), -2, 3.6, 6.4));
    g.add(at(box(2.6, 0.18, 0.24, 0x3b6ea5), -2, 3.9, 6.45));
    g.add(at(box(1.6, 0.18, 0.24, 0x3b6ea5), -2.5, 3.2, 6.45));
    return g;
  }

  /**
   * Dresses a project's spot by its state: dark and overgrown where no commit
   * has landed in months, taped off where it has almost no tests, a board out
   * front where nobody owns it, scaffolding and a crane while it is young.
   * Returns what the frame loop moves and how to bring the lights back on.
   */
  function dress(spot, icon, st) {
    var out = { tick: null, relight: function () {} };
    if (st.stale) {
      var live = icon.userData.tick;
      var paints = [];
      icon.traverse(function (o) {
        if (!o.material || !o.material.color || o.isSprite) return;
        o.material = o.material.clone();
        paints.push({ m: o.material, c: o.material.color.clone() });
        o.material.color.lerp(new THREE.Color(0x8f9690), 0.78);
        if (o.material.emissive) o.material.emissive.setHex(0x000000);
      });
      icon.userData.tick = null; // nothing moves on a project nobody is working on
      var weeds = new THREE.Group();
      for (var i = 0; i < 16; i++) {
        var a = (i / 16) * Math.PI * 2 + (i % 3) * 0.2;
        var w = new THREE.Mesh(
          new THREE.ConeGeometry(0.45, 1.4 + (i % 4) * 0.5, 5),
          mat(i % 2 ? 0x4f8f3a : 0x6aa84f),
        );
        weeds.add(at(w, Math.cos(a) * (6.6 + (i % 3)), 0.6, Math.sin(a) * (6.6 + (i % 3))));
      }
      spot.add(weeds);
      out.relight = function () {
        paints.forEach(function (x) {
          x.m.color.copy(x.c);
        });
        icon.userData.tick = live;
        weeds.visible = false;
      };
    }
    if (st.thin) {
      for (var k = 0; k < 30; k++) {
        var b = (k / 30) * Math.PI * 2;
        var seg = box(1.75, 0.55, 0.14, k % 2 ? 0x23302a : 0xf2c230);
        seg.rotation.y = -b + Math.PI / 2;
        spot.add(at(seg, Math.cos(b) * 8.4, 1.3, Math.sin(b) * 8.4));
      }
      for (var q4 = 0; q4 < 6; q4++) {
        var c = (q4 / 6) * Math.PI * 2;
        spot.add(at(box(0.25, 1.6, 0.25, 0x5d6a62), Math.cos(c) * 8.4, 0.8, Math.sin(c) * 8.4));
      }
    }
    if (st.unowned) {
      spot.add(at(box(0.3, 5, 0.3, 0x7a6a52), 8.2, 2.5, 7));
      spot.add(at(label("TO LET", 21, "#b3261e"), 8.2, 6, 7));
    }
    if (st.young) {
      var bar = 0xb58a3a;
      [-6.2, 6.2].forEach(function (x) {
        [-6.2, 0, 6.2].forEach(function (z) {
          spot.add(at(box(0.18, 9, 0.18, bar), x, 4.5, z));
          spot.add(at(box(0.18, 9, 0.18, bar), z, 4.5, x));
        });
      });
      [2.5, 5.5, 8.5].forEach(function (y) {
        [-6.2, 6.2].forEach(function (x) {
          spot.add(at(box(0.14, 0.14, 12.4, bar), x, y, 0));
          spot.add(at(box(12.4, 0.14, 0.14, bar), 0, y, x));
        });
      });
      spot.add(at(box(0.45, 15, 0.45, 0xc98a1e), -8, 7.5, -7));
      spot.add(at(box(9, 0.4, 0.4, 0xc98a1e), -3.8, 14.8, -7));
      var hook = new THREE.Group();
      hook.add(at(box(0.1, 4, 0.1, 0x5d6a62), 0, -2, 0));
      hook.add(at(box(0.9, 0.7, 0.9, 0xc98a1e), 0, -4.2, 0));
      hook.position.set(-0.5, 14.6, -7);
      spot.add(hook);
      out.tick = function (t) {
        hook.rotation.z = Math.sin(t * 1.2) * 0.18;
      };
    }
    return out;
  }

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
        // A project with no scanned repository gets a dummy inside, so it can be entered.
        district:
          scanned[a.id] || (window.GTECH_DUMMY ? window.GTECH_DUMMY(a) : null),
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
  // A business problem with no project is a line in the gaps list; it has no place in the world.
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
      p.state = stateOf(entry, d);
      icon = p.state.precode ? plotOf() : (KIT[entry.kind] || KIT.city)(hue);
      // A larger project is a somewhat larger object: a decade of files is a quarter more.
      if (!p.state.precode)
        icon.scale.setScalar(d ? 0.75 + Math.log10(d.totals.files + 10) / 4 : 1);
    }
    var flagged = gapsOf(entry.id).length;
    if (flagged) {
      var flag = label(
        flagged + (flagged > 1 ? " gaps" : " gap"),
        30,
        "#b3261e",
      );
      flag.position.set(0, 17, 0);
      p.flag = flag;
    }
    var spot = new THREE.Group();
    if (p.flag) spot.add(p.flag);
    // An amber tag over a project the stall rule marks, above its gaps where it has any.
    if (p.state && p.state.stalling) {
      p.stallTag = at(label("likely to stall", 28, "#9a5b00"), 0, p.flag ? 20.6 : 17, 0);
      spot.add(p.stallTag);
    }
    // A dot above a project for each seat it has open, in the colour of the trait it needs.
    var P = window.GTECH_PEOPLE;
    if (P && !entry.problem) {
      var open = P.seats(
        d || P.projectOf(entry.id),
        entry.app,
        cat.problems,
        new Date(),
      );
      p.openSeats = open;
      if (open.length) {
        // A pennant for a project that is short of someone, in the colour of what it needs most.
        var pennant = new THREE.Group();
        pennant.add(at(box(0.28, 5, 0.28, 0x23302a), 0, 2.5, 0));
        var flagCloth = new THREE.Mesh(
          new THREE.ConeGeometry(1.25, 3.2, 3),
          new THREE.MeshLambertMaterial({
            color: new THREE.Color().setHSL(open[0].trait.hue / 360, 0.7, 0.5),
          }),
        );
        flagCloth.rotation.z = -Math.PI / 2;
        pennant.add(at(flagCloth, 1.7, 4.1, 0));
        pennant.position.set(0, 11.5, 0);
        pennant.userData.place = p;
        spot.add(pennant);
        p.pennant = pennant;
      }
    }
    spot.position.set(
      ((i % cols) - (cols - 1) / 2) * SPACING,
      0,
      (Math.floor(i / cols) - (rows - 1) / 2) * SPACING,
    );
    // The ground a project stands on, kept so a lens can colour it by a figure.
    p.pad = at(
      new THREE.Mesh(
        new THREE.CylinderGeometry(11, 11, 0.8, 40),
        mat(0xeef4e6),
      ),
      0,
      -0.42,
      0,
    );
    spot.add(p.pad);
    spot.add(icon);
    if (p.state) p.dressed = dress(spot, icon, p.state);
    spot.add(at(label(entry.name, 26), 0, 1.4, 12.5));
    world.add(spot);
    p.spot = spot;
    p.icon = icon;
    return p;
  });

  // ---- The people, in the world: everyone at the project they work on, moving
  // the way they work. Whoever is on no project keeps to a commons at the edge.
  var commons = new THREE.Group();
  commons.position.set(-((cols - 1) / 2 + 1.1) * SPACING, 0, 0);
  commons.add(
    at(
      new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 0.8, 48), mat(0xf3ecd9)),
      0,
      -0.42,
      0,
    ),
  );
  commons.add(at(label("On no project", 22), 0, 1.4, 16.5));
  world.add(commons);

  // ---- A lens: the ground under each project coloured by one figure, deeper for more,
  // with the figure written over its name. One hue a lens; the figure is always in words too.
  var LENSES = {
    gaps: {
      hue: 4,
      says: "gaps found by rule",
      of: function (p) {
        return gapsOf(p.entry.id).length;
      },
      word: function (v) {
        return v + (v === 1 ? " gap" : " gaps");
      },
    },
    cost: {
      hue: 265,
      says: "cost a month (dummy)",
      of: function (p) {
        return p.entry.app ? p.entry.app.costMonth : null;
      },
      word: function (v) {
        return "RM " + Math.round(v).toLocaleString("en-MY");
      },
    },
    idle: {
      hue: 32,
      says: "days since the last commit",
      of: function (p) {
        return p.state && p.state.quiet != null ? p.state.quiet : null;
      },
      word: function (v) {
        return v + (v === 1 ? " day idle" : " days idle");
      },
    },
    users: {
      hue: 212,
      says: "users (dummy)",
      of: function (p) {
        return p.entry.app ? p.entry.app.users : null;
      },
      word: function (v) {
        return Math.round(v).toLocaleString("en-MY") + (v === 1 ? " user" : " users");
      },
    },
  };
  function setLens(id) {
    var lens = LENSES[id];
    var values = places.map(function (p) {
      return lens ? lens.of(p) : null;
    });
    var most = Math.max.apply(
      null,
      values.map(function (v) {
        return v || 0;
      }),
    );
    places.forEach(function (p, i) {
      if (p.lensTag) {
        p.spot.remove(p.lensTag);
        p.lensTag.material.map.dispose();
        p.lensTag.material.dispose();
        p.lensTag = null;
      }
      var v = values[i];
      if (!lens) return p.pad.material.color.set(0xeef4e6);
      if (v == null) return p.pad.material.color.set(0xdcdcdc);
      // Square-rooted, so one very large figure does not leave every other project white.
      var t = most ? Math.sqrt(v / most) : 0;
      p.pad.material.color.setHSL(lens.hue / 360, 0.8, 0.92 - t * 0.5);
      p.lensTag = at(label(lens.word(v), 24, "#" + new THREE.Color().setHSL(lens.hue / 360, 0.8, 0.3).getHexString()), 0, 4.6, 12.5);
      p.spot.add(p.lensTag);
    });
    return lens
      ? "The ground under each project is coloured by " + lens.says + ": the deeper the colour, the more. Grey ground has no figure."
      : null;
  }
  var lensPick = document.getElementById("lens");
  if (lensPick)
    lensPick.addEventListener("change", function () {
      var says = setLens(lensPick.value);
      if (!inside && !fp) hint.textContent = says || WORLD_HINT;
    });

  var trees = []; // kept, so a new project can clear the ground it is built on

  // ---- The ground between the projects: a path from each to its neighbours, and
  // trees wherever nothing stands. Drawn from a count of their own, so the people's
  // places, which are drawn from another, stay where they were.
  (function () {
    var h = 4242;
    var r = function () {
      h = (h * 16807) % 2147483647;
      return h / 2147483647;
    };
    var sand = new THREE.MeshBasicMaterial({ color: 0xe6ecd2, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    var path = function (a, b) {
      var len = Math.hypot(b.x - a.x, b.z - a.z);
      var strip = new THREE.Mesh(new THREE.PlaneGeometry(2.4, len), sand);
      strip.rotation.x = -Math.PI / 2;
      strip.rotation.z = Math.atan2(b.x - a.x, b.z - a.z);
      strip.position.set((a.x + b.x) / 2, -0.8, (a.z + b.z) / 2);
      world.add(strip);
    };
    places.forEach(function (p, i) {
      var here = p.spot.position;
      if ((i + 1) % cols && places[i + 1]) path(here, places[i + 1].spot.position);
      if (places[i + cols]) path(here, places[i + cols].spot.position);
    });
    path(commons.position, places[Math.floor((rows - 1) / 2) * cols].spot.position);
    var centres = places
      .map(function (p) {
        return { at: p.spot.position, keep: 14.5 };
      })
      .concat([{ at: commons.position, keep: 18.5 }]);
    var planted = 0;
    for (var tries = 0; planted < 90 && tries < 2000; tries++) {
      var a = r() * Math.PI * 2;
      var far = Math.sqrt(r()) * 164;
      var x = Math.cos(a) * far;
      var z = Math.sin(a) * far;
      var clear = centres.every(function (c) {
        return Math.hypot(x - c.at.x, z - c.at.z) > c.keep;
      });
      if (!clear) continue;
      var tree = new THREE.Group();
      tree.add(at(box(0.6, 1.8, 0.6, 0x9b7653), 0, 0.9, 0));
      var crown = new THREE.Mesh(
        new THREE.ConeGeometry(1.7, 4.2, 7),
        mat(colour(105 + r() * 40, 0.42, 0.5 + r() * 0.12)),
      );
      tree.add(at(crown, 0, 3.6, 0));
      tree.position.set(x, -0.85, z);
      tree.scale.setScalar(0.8 + r() * 0.9);
      tree.rotation.y = r() * 6;
      world.add(tree);
      trees.push(tree);
      planted++;
    }
  })();

  var walkers = [];
  // A person's shade is one soft spot at their feet: two hundred of them cast nothing.
  var spotGeo = new THREE.CircleGeometry(0.75, 16);
  var spotMat = new THREE.MeshBasicMaterial({ color: 0x1c2860, transparent: true, opacity: 0.2, depthWrite: false });
  function shadeSpot() {
    var s = new THREE.Mesh(spotGeo, spotMat);
    s.rotation.x = -Math.PI / 2;
    s.position.y = 0.05;
    return s;
  }
  var rand = (function () {
    var h = 20261112;
    return function () {
      h = (h * 16807) % 2147483647;
      return h / 2147483647;
    };
  })();
  /** A point on the ring of ground around a project, clear of its object. */
  function ringAt(centre, far) {
    var a = rand() * Math.PI * 2;
    var r = centre === commons.position ? 2 + rand() * (far ? 12 : 9) : (far ? 11.2 : 9.2) + rand() * 1.4;
    return { x: centre.x + Math.cos(a) * r, z: centre.z + Math.sin(a) * r };
  }
  if (window.GTECH_PEOPLE && window.GTECH_PEOPLE.figure) {
    window.GTECH_PEOPLE.roster.forEach(function (person) {
      var homes = person.projects
        .map(function (o) {
          return places.filter(function (p) {
            return p.entry.id === o.id;
          })[0];
        })
        .filter(Boolean)
        .map(function (p) {
          return p.spot.position;
        });
      var fig = window.GTECH_PEOPLE.figure(person);
      fig.scale.multiplyScalar(1.5);
      fig.userData.noShade = true;
      fig.add(shadeSpot());
      var at0 = ringAt(homes[0] || commons.position, false);
      fig.position.set(at0.x, 0, at0.z);
      world.add(fig);
      walkers.push({
        person: person,
        fig: fig,
        homes: homes,
        hi: 0,
        tx: at0.x,
        tz: at0.z,
        wait: rand() * 3,
        burst: 0,
        swap: 8 + rand() * 10,
        visit: 12 + rand() * 14,
        phase: rand() * 6,
        called: null,
        arrived: false,
        speed: 0,
      });
    });
    // Those who work with others keep to the first such person at their place.
    walkers.forEach(function (w, i) {
      if (w.person.behaviour.together < 55) return;
      var lead = walkers.filter(function (o, k) {
        return (
          k < i &&
          !o.lead &&
          o.person.behaviour.together >= 55 &&
          (o.homes[0] || commons.position) === (w.homes[0] || commons.position)
        );
      })[0];
      if (lead) {
        w.lead = lead;
        w.off = { x: (rand() - 0.5) * 3.4, z: (rand() - 0.5) * 3.4 };
      }
    });
  }

  /** Moves everyone on by `dt` seconds: how a person walks is how they work. */
  function walk(dt, t) {
    walkers.forEach(function (w) {
      var b = w.person.behaviour;
      var v = 2.4; // a steady walk
      if (w.called) {
        v = w.arrived ? 0 : w.speed;
      } else if (w.lead && !w.lead.called) {
        w.tx = w.lead.fig.position.x + w.off.x;
        w.tz = w.lead.fig.position.z + w.off.z;
        v = 3;
      } else {
        // Someone on two projects walks between them; a frequent reviewer calls on another team.
        if (w.homes.length > 1 && (w.swap -= dt) < 0) {
          w.swap = 14 + rand() * 8;
          w.hi = 1 - w.hi;
          w.wait = 0;
        }
        if (b.review >= 80 && w.homes.length === 1 && (w.visit -= dt) < 0) {
          w.visit = 22 + rand() * 12;
          var other = places[Math.floor(rand() * places.length)].spot.position;
          var o = ringAt(other, false);
          w.tx = o.x;
          w.tz = o.z;
          w.wait = 12;
        }
        if ((w.wait -= dt) < 0) {
          // Someone open to moving strays further from their own project.
          var n = ringAt(w.homes[w.hi] || commons.position, w.person.intention.openToMove);
          w.tx = n.x;
          w.tz = n.z;
          w.wait = b.pace >= 60 ? 1 + rand() * 2 : 4 + rand() * 5;
        }
        // In bursts: a dash, then a stop. Otherwise an even walk.
        if (b.pace >= 60) {
          w.burst -= dt;
          if (w.burst < -1.1) w.burst = 0.5 + rand() * 0.6;
          v = w.burst > 0 ? 9 : 0;
        }
      }
      var dx = w.tx - w.fig.position.x;
      var dz = w.tz - w.fig.position.z;
      var d = Math.hypot(dx, dz);
      var moving = d > 0.15 && v > 0;
      if (moving) {
        var s = Math.min(d, v * dt);
        w.fig.position.x += (dx / d) * s;
        w.fig.position.z += (dz / d) * s;
        w.fig.rotation.y = Math.atan2(dx, dz);
      } else if (w.called && !w.arrived && d <= 0.15) {
        w.arrived = true;
        w.fig.rotation.y = 0;
        if (w.onArrive) w.onArrive();
      }
      w.fig.position.y = moving ? Math.abs(Math.sin(t * 9 + w.phase)) * 0.28 : 0;
    });
  }

  // What the world view says of itself, under the scene.
  var WORLD_HINT =
    "Every project is one object, its shape by what the project is. People stand at the project they work on, and walk the way they work. A pennant is a project short of someone: click it to send up its flare. Click a project to go inside.";

  // ---- A flare: a project that is short of someone calls the people who fit,
  // and they walk to it, the best fit arriving first.
  var flare = null;
  function sendHome() {
    walkers.forEach(function (w) {
      if (!w.called) return;
      w.called = null;
      w.arrived = false;
      w.onArrive = null;
      w.wait = 0;
      if (w.tag) w.fig.remove(w.tag);
      if (w.beam) w.fig.remove(w.beam);
      w.tag = w.beam = null;
    });
    if (flare) {
      flare.place.spot.remove(flare.mesh);
      if (flare.place.pennant) flare.place.pennant.visible = true;
    }
    flare = null;
  }
  function showComing() {
    if (!flare) return showWorld();
    card.hidden = false;
    card.innerHTML = People.comingCard(
      flare.seat,
      flare.d,
      flare.list,
      walkers
        .filter(function (w) {
          return w.called === flare.place && w.arrived;
        })
        .map(function (w) {
          return w.person.id;
        }),
      flare.place.openSeats,
      flare.index,
    );
  }
  function sendFlare(place, index) {
    sendHome();
    var d = place.district || People.projectOf(place.entry.id);
    var need = place.openSeats[index];
    var list = People.match(need, d).slice(0, 5);
    var a = window.GTECH_ANALYSIS;
    var ai = a && a.seats[d.id + "/" + need.trait.key];
    var hue = need.trait.hue / 360;
    var mesh = new THREE.Group();
    var glow = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 20, 14),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(hue, 0.9, 0.58) }),
    );
    var halo = new THREE.Mesh(
      new THREE.SphereGeometry(3.4, 20, 14),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(hue, 0.9, 0.6),
        transparent: true,
        opacity: 0.25,
      }),
    );
    var trail = box(0.18, 1, 0.18, 0xffffff);
    trail.material = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(hue, 0.9, 0.6) });
    mesh.add(glow, halo, trail);
    place.spot.add(mesh);
    if (place.pennant) place.pennant.visible = false;
    flare = { place: place, d: d, seat: need, list: list, index: index, mesh: mesh, glow: glow, halo: halo, trail: trail, born: clock ? clock.getElapsedTime() : 0 };
    // The seat in hand is the need, so a candidate's card can be opened from the list.
    seat = need;
    ctx = { d: d, back: showComing, coming: true };
    list.forEach(function (m, i) {
      var w = walkers.filter(function (x) {
        return x.person.id === m.person.id;
      })[0];
      if (!w) return;
      w.called = place;
      w.arrived = false;
      w.tx = place.spot.position.x + (i - (list.length - 1) / 2) * 4.6;
      w.tz = place.spot.position.z + 15.5 + (i % 2) * 1.6;
      // The better the fit, the sooner they arrive, however far off they start.
      w.speed = Math.hypot(w.tx - w.fig.position.x, w.tz - w.fig.position.z) / (4 + i * 1.7);
      var pick = ai && ai.pick === m.person.id;
      w.tag = label(m.person.name + " " + m.score + (pick ? " · AI" : ""), 15, pick ? "#2a44e0" : null);
      // Every other tag sits higher, so five people in a row can each be read.
      w.tag.position.set(0, i % 2 ? 6.4 : 4.7, 0);
      w.fig.add(w.tag);
      w.onArrive = function () {
        if (place.dressed) place.dressed.relight(); // someone has come: the lights go back on
        if (pick) {
          // The model's pick stands in a spotlight.
          w.beam = new THREE.Mesh(
            new THREE.ConeGeometry(2.2, 16, 24, 1, true),
            new THREE.MeshBasicMaterial({
              color: 0xffe9a6,
              transparent: true,
              opacity: 0.38,
              side: THREE.DoubleSide,
              depthWrite: false,
            }),
          );
          w.beam.position.set(0, 8, 0);
          w.fig.add(w.beam);
        }
        if (!inside && flare && flare.place === place && card.querySelector("[data-home]")) showComing();
      };
    });
    // Asked afresh: a flare can be sent from the address before the page has read the setting.
    if (typeof still === "boolean" ? still : matchMedia("(prefers-reduced-motion: reduce)").matches)
      walkers.forEach(function (w) {
        if (w.called !== place) return;
        w.fig.position.set(w.tx, 0, w.tz);
        w.fig.rotation.y = 0;
        w.arrived = true;
        if (w.onArrive) w.onArrive();
      });
    showComing();
    // The camera flies to the project, so the people can be watched coming in.
    if (!inside && !fp) look(place.spot.position.clone().setY(4), 46);
  }

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

  // The project whose seats the card is on, entered or not, and the way back to its card.
  var ctx = null;
  /** Works out a project's open seats, makes it the one in hand, and returns their card. */
  function seatsOf(entry, back) {
    if (typeof setGhost === "function") setGhost(null);
    var P = window.GTECH_PEOPLE;
    var d = P && (entry.district || P.projectOf(entry.id));
    if (!d) return "";
    ctx = { d: d, back: back };
    seat = null;
    seats = P.seats(d, entry.app, cat.problems, new Date());
    return P.seatsCard(seats);
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
        seatsOf(entry, function () {
          showEntry(entry);
        }) +
        (entry.district
          ? ""
          : '<p class="sub" style="margin-top:10px">No repository scanned for it yet, so it has no inside.</p>') +
        DUMMY;
  }

  /** The projects that are short of someone, each a row that sends up its flare. */
  function shortOf() {
    var rows = places.filter(function (p) {
      return p.openSeats && p.openSeats.length;
    });
    if (!rows.length) return "";
    return (
      "<table><tr><th>Short of someone</th><th>Needs</th></tr>" +
      rows
        .map(function (p) {
          return (
            '<tr data-flare-place="' +
            esc(p.entry.id) +
            '" style="cursor:pointer"><td>' +
            esc(p.entry.name) +
            "</td><td>" +
            p.openSeats
              .map(function (s) {
                return (
                  '<span style="color:hsl(' +
                  s.trait.hue +
                  ',55%,38%);font-weight:600">' +
                  esc(s.trait.name.toLowerCase()) +
                  "</span>"
                );
              })
              .join(", ") +
            "</td></tr>"
          );
        })
        .join("") +
      '</table><p class="sub" style="margin:8px 0 12px">Click a row, or the project\'s pennant, to send up its flare and see who walks over.</p>'
    );
  }

  // The order the card lists gaps in: what the business lacks or pays twice for first, upkeep last.
  var GAP_ORDER = ["no-project", "overlap", "costly", "no-owner", "unlisted", "stale-docs", "no-docs-date"];
  // A rule the list does not know comes last, never first.
  function gapRank(rule) {
    var i = GAP_ORDER.indexOf(rule);
    return i < 0 ? GAP_ORDER.length : i;
  }

  /** The business problems a project works on, by name. */
  function problemNames(entry) {
    return (entry.app ? entry.app.problems : []).map(function (id) {
      var problem = cat.problems.filter(function (x) {
        return x.id === id;
      })[0];
      return problem ? problem.name : id;
    });
  }
  /** The projects the stall rule marks, but for one an applied move of the agent's has staffed or retired. */
  function stalling() {
    return places.filter(function (p) {
      return p.state && p.state.stalling && !applied["staff:" + p.entry.id] && !applied["merge:" + p.entry.id];
    });
  }
  /** What the catalogue costs a month. */
  function costNow() {
    return cat.apps.reduce(function (n, a) {
      return n + a.costMonth;
    }, 0);
  }

  /** The projects the stall rule marks, longest idle first, each with the business problems it works on, and how the rule did where it was tested. */
  function stallOf() {
    if (!STALL) return "";
    var rows = stalling()
      .sort(function (a, b) {
        return b.state.quiet - a.state.quiet;
      });
    if (!rows.length) return "";
    return (
      '<table><tr><th>Likely to stall</th><th class="n">Idle</th></tr>' +
      rows
        .map(function (p) {
          var risk = problemNames(p.entry);
          return (
            '<tr data-entry="' +
            esc(p.entry.id) +
            '"><td>' +
            esc(p.entry.name) +
            (risk.length
              ? '<br><span style="color:var(--muted);font-size:11px">at risk: ' + esc(risk.join("; ")) + "</span>"
              : "") +
            '</td><td class="n" style="white-space:nowrap">' +
            p.state.quiet +
            " days</td></tr>"
          );
        })
        .join("") +
      '</table><p class="sub" style="margin:8px 0 0">Predicted: no commit in the next 30 days, for a project idle ' +
      STALL.rule.idleDays +
      " days or more. Tested on " +
      STALL.repositories +
      " real repositories, none of them GTech's: right " +
      STALL.test.right +
      " of " +
      STALL.test.of +
      " times. The idle days here are dummy.</p>"
    );
  }

  function showBusiness() {
    var live = cat.apps;
    // Repositories scanned here that the catalogue does not list: the home page cannot see them.
    var unlisted = gapList.filter(function (g) {
      return g.rule === "unlisted";
    }).length;
    var short = shortOf();
    var stall = stallOf();
    // The figures as the agent's applied moves leave them; with none applied, as they are.
    var base = agentBase();
    var now = Agent ? Agent.after(base, agentMoves, applied) : base;
    var moved = agentMoves.filter(function (m) {
      return applied[m.id];
    });
    var closed = {};
    moved.forEach(function (m) {
      m.closes.forEach(function (says) {
        closed[says] = true;
      });
    });
    card.hidden = false;
    card.innerHTML =
      "<h2>GTech at a glance</h2>" +
      '<div class="facts"><div><b>' +
      live.length +
      "</b><span>apps and services</span></div><div><b>" +
      rm(now.cost) +
      "</b><span>a month (dummy)</span></div><div><b>" +
      now.gaps +
      "</b><span>gaps" +
      (unlisted ? ": " + (now.gaps - unlisted) + " in the catalogue, " + unlisted + " outside it" : "") +
      "</span></div></div>" +
      (moved.length
        ? '<p class="sub" style="margin:0 0 10px">With ' +
          moved.length +
          " of the agent's moves applied. Before them: " +
          base.gaps +
          " gaps, " +
          rm(base.cost) +
          " a month.</p>"
        : "") +
      // The gaps lead the card: they are what a business viewer came for.
      "<table><tr><th>Gaps, by rule</th></tr>" +
      gapList
        .slice()
        .sort(function (a, b) {
          return gapRank(a.rule) - gapRank(b.rule);
        })
        .map(function (g) {
          // A problem with no project has nothing in the world to go to, so its row is no link.
          return (
            "<tr" +
            (g.apps[0] ? ' data-entry="' + esc(g.apps[0]) + '"' : "") +
            "><td>" +
            esc(g.says) +
            (g.dummy ? " (dummy)" : "") +
            "</td></tr>"
          );
        })
        .join("") +
      "</table>" +
      (stall ? '<div style="margin-top:12px">' + stall + "</div>" : "") +
      (short ? '<div style="margin-top:12px">' + short + "</div>" : "") +
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
    // A gap an applied move closes is struck through, not taken out, so what changed can be seen.
    Array.prototype.forEach.call(card.querySelectorAll("tr > td:only-child"), function (td) {
      if (closed[td.textContent.replace(/ \(dummy\)$/, "")])
        td.style.cssText = "text-decoration:line-through;color:var(--muted)";
    });
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
      '</h2><p class="sub">' +
      (d.dummy
        ? "project · dummy inside: no repository scanned"
        : "project · scanned " + esc(d.scannedAt)) +
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
    if (typeof here !== "undefined") {
      here.hidden = !inside;
      if (!here.hidden) {
        here.textContent = inside.district.name;
        here.setAttribute("aria-pressed", "true");
      }
    }
    explodeBtn.hidden = !inside;
    // With no dependency between its buildings a project has no wiring to show.
    wiringBtn.hidden = !inside || !inside.wires.children.length;
    hint.textContent = inside
      ? "A building is one app or package, a floor one module, as tall as its file count. Drag to orbit, scroll to zoom, click a floor."
      : WORLD_HINT;
    // The tour and the map key belong to the world view.
    ["tour", "agent", "walk", "lens-wrap", "key"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.hidden = !!inside;
      // The lens's label is laid out as a row, which the hidden attribute alone does not undo.
      if (el && id === "lens-wrap") el.style.display = inside ? "none" : "";
    });
  }

  // The seats of the project the page is inside, and the one being looked at.
  var seats = [];
  var seat = null;
  var filters = {};
  var sort = "fit";
  var People = window.GTECH_PEOPLE;

  /** The card of the project the page is inside: its facts, its seats, its business. */
  function showProject() {
    var p = inside;
    showDistrict(p.district);
    if (p.district.dummy)
      card.innerHTML +=
        '<p class="sub" style="margin-top:8px">Every building, floor, count, dependency and date above is invented, so that the project has an inside. Scan its repository to replace it.</p>';
    card.innerHTML +=
      (People ? People.teamCard(p.district.id) : "") +
      seatsOf(p.entry, showProject);
    card.scrollTop = 0; // a project's card opens at its top, wherever the last one was left
    card.innerHTML +=
      '<h2 style="margin-top:14px;font-size:14px">Business</h2>' +
      businessHtml(p.entry) +
      DUMMY;
  }

  function showShortlist(i) {
    if (i != null) {
      seat = seats[i];
      filters = {};
      sort = "fit";
    }
    if (!seat) return;
    selected = null;
    paint();
    card.hidden = false;
    card.innerHTML = People.shortlistCard(
      seat,
      ctx.d,
      { filters: filters, sort: sort },
      ctx.from,
    );
    // Whoever heads the list as it is shown stands in the seat.
    var first = card.querySelector("tr[data-candidate]");
    setGhost(first ? People.person(first.dataset.candidate) : null);
    card.scrollTop = 0;
  }

  // A candidate stands, see-through, at the end of the team they would join:
  // only inside the project the seat belongs to, where there is a team to stand by.
  var ghost = null;
  function setGhost(person) {
    if (ghost) {
      ghost.parent.remove(ghost);
      ghost = null;
    }
    if (!person || !inside || !ctx || ctx.d !== inside.district) return;
    var figs = inside.people;
    if (!figs.length) return;
    var x = Math.max.apply(
      null,
      figs.map(function (f) {
        return f.position.x;
      }),
    );
    ghost = new THREE.Group();
    ghost.add(People.ghost(person));
    // A ring on the ground marks the seat itself.
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.7, 0.14, 8, 32),
      new THREE.MeshLambertMaterial({
        color: new THREE.Color().setHSL(seat.trait.hue / 360, 0.6, 0.5),
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.12;
    ghost.add(ring);
    ghost.position.set(x + 4.6, 0, figs[0].position.z);
    inside.group.add(ghost);
  }

  /** Every open seat and every person, on one card. */
  function showStaffing() {
    setGhost(null);
    selected = null;
    paint();
    seat = null;
    ctx = { d: null, back: showStaffing };
    card.hidden = false;
    card.innerHTML = People.staffingCard(
      entries
        .filter(function (e) {
          return !e.problem;
        })
        .map(function (e) {
          return {
            id: e.id,
            name: e.name,
            seats: People.seats(
              e.district || People.projectOf(e.id),
              e.app,
              cat.problems,
              new Date(),
            ),
          };
        }),
    );
    card.scrollTop = 0;
  }
  if (People)
    document.getElementById("staffing").addEventListener("click", showStaffing);
  else document.getElementById("staffing").hidden = true;

  // ---- The agent: its moves are worked out by agent.js; here they are shown, and
  // applied to the city or taken back.
  var placeOf = function (id) {
    return places.filter(function (p) {
      return p.entry.id === id;
    })[0];
  };
  /** The figures the moves are set against: as the city is, with no move applied. */
  function agentBase() {
    return {
      gaps: gapList.length,
      cost: costNow(),
      stall: places.filter(function (p) {
        return p.state && p.state.stalling;
      }).length,
    };
  }
  /** What the moves are worked out from: the catalogue, its gaps, the stalling projects with an open seat and who fits it, and the people on no project. */
  function agentWorld() {
    return {
      apps: cat.apps,
      problems: cat.problems,
      gaps: gapList,
      stallingIds: places
        .filter(function (p) {
          return p.state && p.state.stalling;
        })
        .map(function (p) {
          return p.entry.id;
        }),
      stalling: !People
        ? []
        : places
            .filter(function (p) {
              return p.state && p.state.stalling && p.openSeats && p.openSeats.length;
            })
            .map(function (p) {
              var d = p.district || People.projectOf(p.entry.id);
              return {
                id: p.entry.id,
                name: p.entry.name,
                app: p.entry.app,
                quiet: p.state.quiet,
                seat: p.openSeats[0].trait.name,
                problems: problemNames(p.entry),
                candidates: People.match(p.openSeats[0], d)
                  .slice(0, 2)
                  .map(function (m) {
                    return { name: m.person.name, score: m.score, spare: People.capacity(m.person) };
                  }),
              };
            }),
      free: !People
        ? []
        : People.roster
            .filter(function (p) {
              return !p.projects.length;
            })
            .map(function (p) {
              return { name: p.name, area: p.intention.area, spare: People.capacity(p) };
            }),
    };
  }
  function showAgent() {
    setGhost(null);
    selected = null;
    paint();
    agentMoves = Agent.moves(agentWorld());
    card.hidden = false;
    card.innerHTML = Agent.listCard(agentMoves, applied, agentBase());
    card.scrollTop = 0;
  }
  var moveOf = function (id) {
    return agentMoves.filter(function (m) {
      return m.id === id;
    })[0];
  };
  function showMove(id) {
    var m = moveOf(id);
    if (!m) return showAgent();
    card.innerHTML = Agent.moveCard(m, agentMoves, applied, agentBase());
    card.scrollTop = 0;
    var where = placeOf(m.places[0]);
    if (where) look(where.spot.position.clone().setY(4), 46);
  }
  /** Applies a move to the city, or takes it back: the figures follow on every card, and the world shows it where it can. */
  // ---- What an applied move looks like in the world.
  // A merge: the retired product's users cross to the one kept, as dots along an arc.
  var flows = [];
  function flowBetween(a, b) {
    var from = a.spot.position.clone().setY(9);
    var to = b.spot.position.clone().setY(9);
    var top = from.clone().add(to).multiplyScalar(0.5).setY(9 + from.distanceTo(to) * 0.35);
    var curve = new THREE.QuadraticBezierCurve3(from, top, to);
    var group = new THREE.Group();
    group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)),
        new THREE.LineBasicMaterial({ color: 0x1b5e8a, transparent: true, opacity: 0.5 }),
      ),
    );
    var dots = [];
    var blue = new THREE.MeshBasicMaterial({ color: 0x1b8ad6 });
    for (var i = 0; i < 10; i++) {
      var dot = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 8), blue);
      dot.position.copy(curve.getPoint(i / 10));
      group.add(dot);
      dots.push(dot);
    }
    world.add(group);
    var flow = { group: group, curve: curve, dots: dots };
    flows.push(flow);
    return flow;
  }
  // A start: a plot is fenced off on the next free ground, and its team walks over.
  var started = {};
  function startPlot(m) {
    var n = places.length + Object.keys(started).length;
    var spot = new THREE.Group();
    spot.position.set(
      ((n % cols) - (cols - 1) / 2) * SPACING,
      0,
      (Math.floor(n / cols) - (rows - 1) / 2) * SPACING,
    );
    spot.add(at(new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 0.8, 40), mat(0xeef4e6)), 0, -0.42, 0));
    spot.add(plotOf());
    var name = m.title.replace(/^Start a project for: /, "");
    spot.add(at(label(name.length > 34 ? name.slice(0, 33) + "…" : name, 22), 0, 1.4, 12.5));
    spot.add(at(label("new project", 28, "#17663f"), 0, 12, 0));
    shade(spot);
    world.add(spot);
    var cleared = trees.filter(function (t) {
      return t.visible && Math.hypot(t.position.x - spot.position.x, t.position.z - spot.position.z) < 15;
    });
    cleared.forEach(function (t) {
      t.visible = false;
    });
    var team = m.people
      .map(function (who) {
        return walkers.filter(function (w) {
          return w.person.name === who.name;
        })[0];
      })
      .filter(Boolean)
      .map(function (w) {
        var was = { w: w, homes: w.homes, hi: w.hi, lead: w.lead };
        w.homes = [spot.position];
        w.hi = 0;
        w.lead = null;
        w.wait = 0;
        return was;
      });
    return { spot: spot, cleared: cleared, team: team };
  }
  function endPlot(s) {
    world.remove(s.spot);
    s.cleared.forEach(function (t) {
      t.visible = true;
    });
    s.team.forEach(function (was) {
      was.w.homes = was.homes;
      was.w.hi = was.hi;
      was.w.lead = was.lead;
      was.w.wait = 0;
    });
  }

  function applyMove(id) {
    var m = moveOf(id);
    if (!m) return;
    var on = (applied[id] = !applied[id]);
    if (m.kind === "start") {
      if (on) {
        started[id] = startPlot(m);
        if (!fp) look(started[id].spot.position.clone().setY(4), 52);
      } else if (started[id]) {
        endPlot(started[id]);
        delete started[id];
      }
    }
    if (m.kind === "staff") {
      // The people who fit walk over, and the project's stall tag comes down.
      var staffed = placeOf(m.flare);
      if (staffed.stallTag) staffed.stallTag.visible = !on;
      if (on) sendFlare(staffed, 0);
      else sendHome();
    }
    if (m.kind === "merge") {
      // The retired product says where it is going.
      var retired = placeOf(m.retire);
      if (retired && on && !retired.mergeTag) {
        retired.mergeTag = at(
          label("merging into " + placeOf(m.places[0]).entry.name, 26, "#1b5e8a"),
          0,
          retired.flag ? 24.2 : 20.6,
          0,
        );
        retired.spot.add(retired.mergeTag);
      }
      if (retired && retired.mergeTag) retired.mergeTag.visible = on;
      if (retired && retired.stallTag) retired.stallTag.visible = !on;
      var kept = placeOf(m.places[0]);
      if (retired && kept && on && !retired.flow) {
        retired.flow = flowBetween(retired, kept);
        var between = retired.spot.position.clone().add(kept.spot.position).multiplyScalar(0.5).setY(4);
        if (!fp) look(between, retired.spot.position.distanceTo(kept.spot.position) * 1.1 + 52);
      }
      if (retired && retired.flow && !on) {
        world.remove(retired.flow.group);
        flows.splice(flows.indexOf(retired.flow), 1);
        retired.flow = null;
      }
    }
    showMove(id);
  }
  if (Agent) document.getElementById("agent").addEventListener("click", showAgent);
  else document.getElementById("agent").hidden = true;

  /** Opens one seat of one project from the staffing card, which is where back leads. */
  function openSeat(key) {
    var id = key.slice(0, key.lastIndexOf("/"));
    var trait = key.slice(key.lastIndexOf("/") + 1);
    var entry = entries.filter(function (e) {
      return e.id === id;
    })[0];
    if (!entry) return;
    seatsOf(entry, showStaffing);
    ctx.from = "Staffing";
    for (var i = 0; i < seats.length; i++)
      if (seats[i].trait.key === trait) return showShortlist(i);
  }

  function showCandidate(id) {
    // Scored without the filters, so a person is the same whatever is ticked.
    var m = People.match(seat, ctx.d).filter(function (x) {
      return x.person.id === id;
    })[0];
    if (!m) return;
    card.innerHTML = People.candidateCard(m, seat, ctx.d);
    setGhost(m.person);
    card.scrollTop = 0;
  }

  function enter(p) {
    if (typeof stopTour === "function") stopTour();
    stopWalk(true);
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

  /** The middle of the world as the camera should hold it: clear of the card on a wide screen. */
  function worldCentre() {
    return innerWidth > 900 ? new THREE.Vector3(13, 4, -8.5) : new THREE.Vector3(0, 4, 0);
  }

  function leave() {
    setGhost(null);
    if (inside) inside.group.visible = false;
    inside = null;
    selected = null;
    world.visible = true;
    showWorld();
    look(worldCentre(), Math.max(cols, rows) * SPACING * 0.75 + 34);
    chips();
  }

  var byId = function (id) {
    return places.filter(function (p) {
      return p.district && p.district.id === id;
    })[0];
  };

  card.addEventListener("click", function (e) {
    if (e.target.closest("[data-home]")) {
      sendHome();
      return showWorld();
    }
    var other = e.target.closest("[data-flare]");
    if (other && flare) return sendFlare(flare.place, Number(other.dataset.flare));
    var back = e.target.closest("[data-back]");
    if (back)
      return back.dataset.back === "shortlist" && !ctx.coming ? showShortlist() : ctx.back();
    var by = e.target.closest("[data-sort]");
    if (by) {
      sort = by.dataset.sort;
      return showShortlist();
    }
    var box = e.target.closest("input[data-filter]");
    if (box) {
      filters[box.dataset.filter] = box.checked;
      return showShortlist();
    }
    var apply = e.target.closest("[data-apply]");
    if (apply) return applyMove(apply.dataset.apply);
    if (e.target.closest("[data-agent]")) return showAgent();
    if (e.target.closest("[data-agent-home]")) return showWorld();
    if (e.target.closest("label")) return; // its checkbox's own click follows
    var row = e.target.closest("tr");
    if (!row) return;
    if (row.dataset.flarePlace) {
      var short = places.filter(function (p) {
        return p.entry.id === row.dataset.flarePlace;
      })[0];
      if (short) {
        sendFlare(short, 0);
        look(short.spot.position.clone().setY(4), 46);
      }
      return;
    }
    if (row.dataset.move) return showMove(row.dataset.move);
    if (row.dataset.open) return openSeat(row.dataset.open);
    if (row.dataset.who) {
      card.innerHTML = People.personCard(row.dataset.who, "Staffing");
      card.scrollTop = 0;
      return;
    }
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
      setGhost(null);
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
    // In the world a pennant is clicked first: it sends up the project's flare.
    var flags = places
      .filter(function (p) {
        return p.pennant && p.pennant.visible;
      })
      .map(function (p) {
        return p.pennant;
      });
    var hitFlag = ray.intersectObjects(flags, true)[0];
    if (hitFlag) {
      var fl = hitFlag.object;
      while (fl && !fl.userData.place) fl = fl.parent;
      sendFlare(fl.userData.place, 0);
      return look(fl.userData.place.spot.position.clone().setY(4), 46);
    }
    // Then a person: they stand in front of the projects.
    var hitWho = ray.intersectObjects(
      walkers.map(function (w) {
        return w.fig;
      }),
      true,
    )[0];
    if (hitWho) {
      var f = hitWho.object;
      while (f && !f.userData.person) f = f.parent;
      ctx = { d: null, back: showWorld };
      card.hidden = false;
      card.innerHTML = People.personCard(f.userData.person.id, "World");
      card.scrollTop = 0;
      return;
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
  // Every project is entered from the world; one more chip names the project the page is inside.
  chip("", "here", function () {});
  var here = bar.lastChild;
  here.hidden = true;

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
    controls.target.copy(goal.target);
    if (first || q.has("shot") || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      camera.position.copy(goal.position);
      goal = null;
    } else {
      // The world is come down to from high above it, once, as the page opens.
      camera.position.copy(goal.target).add(goal.position.clone().sub(goal.target).multiplyScalar(2.4));
      camera.position.y += 140;
    }
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
  if (q.has("staffing") && People) showStaffing();
  // ?flare=<project id> sends that project's flare; &ahead=<seconds> walks everyone on, for a still picture.
  if (!inside && q.get("flare")) {
    var called = places.filter(function (p) {
      return p.entry.id === q.get("flare") && p.openSeats && p.openSeats.length;
    })[0];
    if (called) {
      sendFlare(called, Number(q.get("need")) || 0);
      for (var ah = 0; ah < (Number(q.get("ahead")) || 0) * 20; ah++) walk(0.05, ah * 0.05);
      flare.born = -10;
    }
  }
  if (inside && q.has("seat") && seats[Number(q.get("seat"))]) {
    showShortlist(Number(q.get("seat")));
    if (q.get("candidate")) showCandidate(q.get("candidate"));
  }
  if (q.has("explode")) exploded = 1;

  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clock = new THREE.Clock();
  // Where the device asks for less motion nothing walks, and a button offers to play it anyway.
  var motionBtn = document.getElementById("motion");
  if (motionBtn) {
    motionBtn.hidden = !still;
    motionBtn.addEventListener("click", function () {
      still = !still;
      motionBtn.setAttribute("aria-pressed", String(!still));
      motionBtn.textContent = still ? "Play motion" : "Motion on";
    });
  }
  // ---- The tour: the camera walks through what the world says, with a line for each stop.
  var tourBtn = document.getElementById("tour");
  var tourTimer = null;
  function stopTour() {
    clearTimeout(tourTimer);
    tourTimer = null;
    if (tourBtn) tourBtn.textContent = "Tour";
  }
  function startTour() {
    var by = function (test) {
      return places.filter(function (p) {
        return p.state && test(p);
      })[0];
    };
    var healthy = by(function (p) {
      return !p.state.stale && !p.state.precode && !p.state.thin && !p.state.young;
    });
    var plot = by(function (p) {
      return p.state.precode;
    });
    var quiet = by(function (p) {
      return p.state.stale && p.openSeats && p.openSeats.length;
    });
    var picked = places.filter(function (p) {
      var a = window.GTECH_ANALYSIS;
      return p.openSeats && p.openSeats.length && a && a.seats[p.entry.id + "/" + p.openSeats[0].trait.key];
    })[0];
    var near = function (p, r) {
      look(p.spot.position.clone().setY(4), r || 34);
    };
    var whole = function () {
      look(worldCentre(), Math.max(cols, rows) * SPACING * 0.75 + 34);
    };
    var steps = [
      [5, whole, "Every project is an object shaped by what it does, and everyone stands at the project they work on."],
    ];
    if (healthy)
      steps.push([7, function () { near(healthy); }, healthy.entry.name + " is in good shape. Watch how its people walk: some keep together, some dash and stop, someone on two projects walks between them."]);
    if (plot)
      steps.push([6, function () { near(plot); }, plot.entry.name + " has no code yet, so it is a fenced plot with the plan on a board."]);
    if (quiet) {
      steps.push([7, function () { near(quiet); }, quiet.entry.name + " has had no commit in " + quiet.state.quiet + " days: grey and overgrown. Its pennant says it is short of a " + quiet.openSeats[0].trait.name.toLowerCase() + "."]);
      steps.push([12, function () { sendFlare(quiet, 0); near(quiet, 52); }, "It sends up a flare. The people who fit walk over, the best fit arriving first, and the colour comes back."]);
    }
    if (picked) {
      var need = picked.openSeats[0];
      var pick = window.GTECH_ANALYSIS.seats[picked.entry.id + "/" + need.trait.key].pick;
      steps.push([13, function () { sendFlare(picked, 0); near(picked, 46); }, picked.entry.name + " needs a " + need.trait.name.toLowerCase() + ". The rule ranks five people; the AI's own pick, " + People.person(pick).name + ", is the one who ends up in the spotlight."]);
    }
    steps.push([1, function () { sendHome(); showWorld(); whole(); }, WORLD_HINT]);
    var i = 0;
    // A tour is asked for, so it plays even where the device prefers less motion.
    if (still && motionBtn) motionBtn.click();
    stopWalk(true);
    if (inside) leave();
    sendHome();
    tourBtn.textContent = "Stop tour";
    (function next() {
      if (i >= steps.length) return stopTour();
      var s = steps[i++];
      s[1]();
      hint.textContent = s[2];
      tourTimer = setTimeout(next, s[0] * 1000);
    })();
  }
  if (tourBtn)
    tourBtn.addEventListener("click", function () {
      if (tourTimer) {
        stopTour();
        sendHome();
        showWorld();
        hint.textContent = WORLD_HINT;
      } else startTour();
    });

  // ---- A walk: the world at eye height. While a flare is up the walk is taken with
  // the best fit still on the way, through their eyes; otherwise it is the viewer's own.
  var fp = null;
  var keys = {};
  var walkBtn = document.getElementById("walk");
  var EYE = 4; // a figure's own eye height
  var WALK_HINT =
    "Walking. W A S D or the arrow keys to move, drag to look, Shift to hurry, Esc to leave.";
  function getOff() {
    if (!fp || !fp.rider) return;
    fp.rider.fig.visible = true;
    fp.yaw = fp.head + Math.PI + fp.turn;
    fp.rider = null;
    hint.textContent = WALK_HINT;
  }
  function startWalk() {
    if (inside || fp) return;
    stopTour();
    goal = null;
    var dir = controls.target.clone().sub(camera.position).setY(0);
    if (dir.lengthSq() < 0.01) dir.set(0, 0, -1);
    dir.normalize();
    var from = controls.target.clone().addScaledVector(dir, -20);
    fp = { x: from.x, z: from.z, yaw: Math.atan2(-dir.x, -dir.z), pitch: 0, rider: null, head: 0, turn: 0 };
    if (flare) {
      var coming = flare.list
        .map(function (m) {
          return walkers.filter(function (w) {
            return w.person.id === m.person.id && w.called === flare.place;
          })[0];
        })
        .filter(Boolean);
      var rider =
        coming.filter(function (w) {
          return !w.arrived;
        })[0] || coming[0];
      if (rider) {
        fp.rider = rider;
        fp.head = rider.fig.rotation.y;
        rider.fig.visible = false;
      }
    }
    camera.fov = 62;
    camera.updateProjectionMatrix();
    camera.rotation.order = "YXZ";
    controls.enabled = false;
    if (minimap) minimap.hidden = false;
    if (stick) stick.hidden = !touchy;
    if (tip) tip.hidden = true;
    walkBtn.textContent = "Leave walk";
    walkBtn.setAttribute("aria-pressed", "true");
    hint.textContent = fp.rider
      ? "Walking with " +
        fp.rider.person.name +
        " to " +
        flare.place.entry.name +
        ". Drag to look around, press W or an arrow key to walk on your own, Esc to leave."
      : WALK_HINT;
  }
  /** Ends the walk. `quiet` leaves the camera to whoever asked, as when a project is entered. */
  function stopWalk(quiet) {
    if (!fp) return;
    if (fp.rider) fp.rider.fig.visible = true;
    fp = null;
    keys = {};
    push.x = push.y = 0;
    if (minimap) minimap.hidden = true;
    if (stick) stick.hidden = true;
    camera.fov = 40;
    camera.updateProjectionMatrix();
    controls.enabled = true;
    if (walkBtn) {
      walkBtn.textContent = "Walk";
      walkBtn.setAttribute("aria-pressed", "false");
    }
    if (quiet) return;
    hint.textContent = WORLD_HINT;
    if (flare) look(flare.place.spot.position.clone().setY(4), 46);
    else look(worldCentre(), Math.max(cols, rows) * SPACING * 0.75 + 34);
  }
  function stepWalk(dt) {
    var bob = 0;
    // Whoever is walked with was sent home: the walk goes on alone from where they stood.
    if (fp.rider && !fp.rider.called) getOff();
    if (fp.rider) {
      var w = fp.rider;
      var at = w.fig.position;
      var to = w.arrived ? w.called.spot.position : { x: w.tx, z: w.tz };
      var want = Math.atan2(to.x - at.x, to.z - at.z);
      // Turned the short way round, and not at once, so a change of course is not a jolt.
      fp.head += Math.atan2(Math.sin(want - fp.head), Math.cos(want - fp.head)) * Math.min(1, dt * 4);
      fp.x = at.x;
      fp.z = at.z;
      bob = at.y;
    } else {
      var on = function (a, b) {
        return keys[a] || keys[b] ? 1 : 0;
      };
      var fwd = on("KeyW", "ArrowUp") - on("KeyS", "ArrowDown") - push.y;
      var side = on("KeyD") - on("KeyA");
      fp.yaw += (on("ArrowLeft") - on("ArrowRight") - push.x) * 1.8 * dt;
      var step = (on("ShiftLeft", "ShiftRight") ? 30 : 14) * dt;
      var sin = Math.sin(fp.yaw);
      var cos = Math.cos(fp.yaw);
      fp.x += (-sin * fwd + cos * side) * step;
      fp.z += (-cos * fwd - sin * side) * step;
      // Kept on the island, and out of the middle of a project's object.
      var far = Math.hypot(fp.x, fp.z);
      if (far > 168) {
        fp.x *= 168 / far;
        fp.z *= 168 / far;
      }
      places.forEach(function (p) {
        var dx = fp.x - p.spot.position.x;
        var dz = fp.z - p.spot.position.z;
        var d = Math.hypot(dx, dz);
        if (d < 7 && d > 0.001) {
          fp.x = p.spot.position.x + (dx / d) * 7;
          fp.z = p.spot.position.z + (dz / d) * 7;
        }
      });
    }
    camera.position.set(fp.x, EYE + bob, fp.z);
    camera.rotation.set(fp.pitch, fp.rider ? fp.head + Math.PI + fp.turn : fp.yaw, 0);
    drawMap();
  }
  if (walkBtn) {
    walkBtn.addEventListener("click", function () {
      if (fp) stopWalk();
      else startWalk();
    });
    addEventListener("keydown", function (e) {
      if (!fp || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (e.code === "Escape") return stopWalk();
      if (!/^(Key[WASD]|Arrow(Up|Down|Left|Right)|Shift(Left|Right))$/.test(e.code)) return;
      e.preventDefault();
      keys[e.code] = true;
      if (!/^Shift/.test(e.code)) getOff();
    });
    addEventListener("keyup", function (e) {
      keys[e.code] = false;
    });
    addEventListener("blur", function () {
      keys = {};
    });
    renderer.domElement.addEventListener("pointermove", function (e) {
      if (!fp || !e.buttons) return;
      if (fp.rider) fp.turn -= e.movementX * 0.004;
      else fp.yaw -= e.movementX * 0.004;
      fp.pitch = Math.max(-1.1, Math.min(1.1, fp.pitch - e.movementY * 0.004));
    });
  }

  // A stick for a touch screen, which has no keys: up and down walk, left and right turn.
  var stick = document.getElementById("stick");
  var push = { x: 0, y: 0 };
  var touchy = matchMedia("(pointer: coarse)").matches || q.has("stick");
  if (stick) {
    var knob = stick.firstElementChild;
    var lean = function (e) {
      var box = stick.getBoundingClientRect();
      var x = (e.clientX - box.left) / box.width - 0.5;
      var y = (e.clientY - box.top) / box.height - 0.5;
      var far = Math.hypot(x, y);
      if (far > 0.5) {
        x *= 0.5 / far;
        y *= 0.5 / far;
      }
      push.x = x * 2;
      push.y = y * 2;
      knob.style.transform = "translate(" + x * 68 + "px," + y * 68 + "px)";
      getOff();
    };
    var rest = function () {
      push.x = push.y = 0;
      knob.style.transform = "";
    };
    stick.addEventListener("pointerdown", function (e) {
      stick.setPointerCapture(e.pointerId);
      lean(e);
    });
    stick.addEventListener("pointermove", function (e) {
      if (e.buttons || e.pointerType === "touch") lean(e);
    });
    stick.addEventListener("pointerup", rest);
    stick.addEventListener("pointercancel", rest);
  }

  // The map of a walk: where the projects are, which are flagged, and which way one faces.
  var minimap = document.getElementById("minimap");
  function drawMap() {
    if (!minimap) return;
    var g = minimap.getContext("2d");
    var mid = minimap.width / 2;
    // Drawn to the ground the projects stand on, not the whole island, so each can be told apart.
    var k = (mid - 10) / 120;
    g.clearRect(0, 0, minimap.width, minimap.height);
    g.fillStyle = "#cbe3b8";
    g.beginPath();
    g.arc(mid, mid, 120 * k, 0, Math.PI * 2);
    g.fill();
    places.forEach(function (p) {
      var st = p.state && p.state.stalling && !(p.stallTag && !p.stallTag.visible);
      g.fillStyle = flare && flare.place === p ? "#f72c8f" : st ? "#d98a00" : p.flag ? "#d9534f" : "#ffffff";
      g.beginPath();
      g.arc(mid + p.spot.position.x * k, mid + p.spot.position.z * k, 11, 0, Math.PI * 2);
      g.fill();
    });
    // The walker: an arrow pointing the way the camera looks.
    var yaw = fp.rider ? fp.head + Math.PI + fp.turn : fp.yaw;
    g.save();
    var out = Math.max(1, Math.hypot(fp.x, fp.z) / 112);
    g.translate(mid + (fp.x / out) * k, mid + (fp.z / out) * k);
    g.rotate(-yaw);
    g.fillStyle = "#3d5afe";
    g.strokeStyle = "#ffffff";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, -15);
    g.lineTo(10, 11);
    g.lineTo(0, 5);
    g.lineTo(-10, 11);
    g.closePath();
    g.stroke();
    g.fill();
    g.restore();
  }

  // ---- Over a project in the world, the pointer says what it is before any click.
  var tip = document.getElementById("tip");
  var hover = null;
  var tipRay = new THREE.Raycaster();
  places.forEach(function (p) {
    p.icon.userData.tipOf = p;
  });
  function tipFor(p) {
    var a = p.entry.app;
    var n = gapsOf(p.entry.id).length;
    var bits = [n ? n + (n > 1 ? " gaps" : " gap") : "no gap"];
    if (a) bits.push("RM " + Math.round(a.costMonth).toLocaleString("en-MY") + " a month");
    if (a && a.users != null) bits.push(a.users.toLocaleString("en-MY") + " users");
    if (p.state && p.state.quiet != null) bits.push("idle " + p.state.quiet + " days");
    return "<b>" + esc(p.entry.name) + "</b><span>" + esc(bits.join(" · ")) + "</span>";
  }
  if (tip)
    renderer.domElement.addEventListener("pointermove", function (e) {
      if (inside || fp || e.buttons || e.pointerType === "touch") {
        tip.hidden = true;
        hover = null;
        renderer.domElement.style.cursor = "";
        return;
      }
      tipRay.setFromCamera(
        new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1),
        camera,
      );
      var hit = tipRay.intersectObjects(
        places.map(function (p) {
          return p.icon;
        }),
        true,
      )[0];
      var o = hit && hit.object;
      while (o && !o.userData.tipOf) o = o.parent;
      var p = o ? o.userData.tipOf : null;
      if (p !== hover) {
        hover = p;
        tip.hidden = !p;
        if (p) tip.innerHTML = tipFor(p);
        renderer.domElement.style.cursor = p ? "pointer" : "";
      }
      if (p) {
        tip.style.left = Math.min(e.clientX + 14, innerWidth - 280) + "px";
        tip.style.top = e.clientY + 16 + "px";
      }
    });
  renderer.domElement.addEventListener("pointerleave", function () {
    if (tip) tip.hidden = true;
    hover = null;
  });

  shade(world);
  places.forEach(function (p) {
    if (p.group) shade(p.group);
  });

  var lastT = 0;
  function frame() {
    requestAnimationFrame(frame);
    var t = clock.getElapsedTime();
    if (!still) {
      clouds.rotation.y = t * 0.006;
      flows.forEach(function (f) {
        f.dots.forEach(function (dot, i) {
          dot.position.copy(f.curve.getPoint((t * 0.16 + i / f.dots.length) % 1));
        });
      });
    }
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
      walk(Math.min(0.05, t - lastT), t);
      places.forEach(function (p) {
        if (p.icon.userData.tick) p.icon.userData.tick(t);
        if (p.dressed && p.dressed.tick) p.dressed.tick(t);
      });
    }
    if (flare && !inside) {
      // With motion off the flare simply stands at its height.
      var up = still ? 1 : Math.min(1, (t - flare.born) / 1.2);
      var top = 12 + up * 12;
      var beat = still ? 1 : 1 + Math.sin(t * 6) * 0.18;
      flare.glow.position.y = flare.halo.position.y = top;
      flare.glow.scale.setScalar(beat);
      flare.halo.scale.setScalar(beat * 1.1);
      flare.trail.scale.y = Math.max(0.01, top - 11);
      flare.trail.position.y = 11 + (top - 11) / 2;
    }
    if (fp) {
      goal = null;
      stepWalk(Math.min(0.05, t - lastT));
    } else {
      if (goal) {
        camera.position.lerp(goal.position, still ? 1 : 0.08);
        controls.target.lerp(goal.target, still ? 1 : 0.08);
        if (camera.position.distanceTo(goal.position) < 0.3) goal = null;
      }
      controls.update();
    }
    lastT = t;
    renderer.render(scene, camera);
  }
  frame();
})();
