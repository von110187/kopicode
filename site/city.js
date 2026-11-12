/* global THREE */
// Draws every district the page loaded. Geometry rules, all of them here:
//   a building's side  = 4 + sqrt(files) / 4, kept between 5 and 14
//   a floor's height   = 0.6 + sqrt(files) / 3
//   floors stack largest first, so the widest module is the ground floor
(function () {
  "use strict";
  var districts = window.GTECH_DISTRICTS || [];
  var q = new URLSearchParams(location.search);
  var GAP = 2.2; // how far Explode pulls two floors apart
  var HUES = {
    apps: [205, 28, 265, 330],
    packages: [150, 95, 175, 60, 120, 190, 40, 80],
  };

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfbf6ee);
  scene.fog = new THREE.Fog(0xfbf6ee, 220, 520);
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

  function colour(h, s, l) {
    return new THREE.Color().setHSL(h / 360, s, l);
  }

  function label(text, size, ink) {
    var c = document.createElement("canvas");
    var g = c.getContext("2d");
    var font = "700 " + size + "px ui-sans-serif, system-ui, sans-serif";
    g.font = font;
    c.width = Math.ceil(g.measureText(text).width) + 24;
    c.height = size + 18;
    g.font = font;
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.beginPath();
    var r = c.height / 2;
    g.moveTo(r, 0);
    g.arcTo(c.width, 0, c.width, c.height, r);
    g.arcTo(c.width, c.height, 0, c.height, r);
    g.arcTo(0, c.height, 0, 0, r);
    g.arcTo(0, 0, c.width, 0, r);
    g.fill();
    g.fillStyle = ink || "#23302a";
    g.textBaseline = "middle";
    g.fillText(text, 12, c.height / 2 + 1);
    var tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    var s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        depthTest: false,
        transparent: true,
      }),
    );
    s.scale.set((c.width / c.height) * (size / 14), size / 14, 1);
    s.renderOrder = 10;
    return s;
  }

  var floors = []; // every floor mesh, for picking and Explode
  var tops = []; // { sprite, floor }: a building's name rides its top floor
  var wires = new THREE.Group();
  scene.add(wires);
  var plots = []; // { district, centre, radius }

  function buildDistrict(d, originX) {
    var groups = { apps: [], packages: [], other: [] };
    d.units.forEach(function (u) {
      (groups[u.group] || groups.other).push(u);
    });
    var rows = [groups.apps.concat(groups.other), groups.packages];
    var z = 0;
    var width = 0;
    var placed = {};
    var tallest = 0;
    rows.forEach(function (row, ri) {
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
        var cx = originX + x + side / 2;
        var cz = z + side / 2;
        var y = 0;
        var top = null;
        stack.forEach(function (f, i) {
          var h = 0.6 + Math.sqrt(f.files) / 3;
          var base =
            f.kind === "domain"
              ? colour(hue, 0.55, i % 2 ? 0.62 : 0.56)
              : colour(hue, 0.18, i % 2 ? 0.74 : 0.7);
          var m = new THREE.Mesh(
            new THREE.BoxGeometry(side, h - 0.12, side),
            new THREE.MeshLambertMaterial({ color: base }),
          );
          m.position.set(cx, y + h / 2, cz);
          m.userData = {
            district: d,
            unit: u,
            floor: f,
            index: i,
            baseY: y + h / 2,
            base: base,
            hue: hue,
          };
          scene.add(m);
          floors.push(m);
          y += h;
          top = m;
        });
        var name = label(u.id, 22);
        scene.add(name);
        tops.push({
          sprite: name,
          floor: top,
          lift: (0.6 + Math.sqrt(top.userData.floor.files) / 3) / 2 + 1.4,
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
        new THREE.MeshLambertMaterial({ color: 0xb9b2a3 }),
      );
      drum.position.set(originX + 1.5 + i * 6, 1.1, z + 1.5);
      scene.add(drum);
      var n = label(s.name, 16, "#5d6a62");
      n.position.set(drum.position.x, 3.4, drum.position.z);
      scene.add(n);
    });
    var depth = z + (run.length ? 5 : -3);
    width = Math.max(width, run.length * 6);

    var pad = 6;
    var plot = new THREE.Mesh(
      new THREE.BoxGeometry(width + pad * 2, 0.8, depth + pad * 2),
      new THREE.MeshLambertMaterial({ color: 0xdfe8d3 }),
    );
    plot.position.set(originX + width / 2, -0.42, depth / 2);
    scene.add(plot);
    var title = label(d.name, 34);
    title.position.set(originX + width / 2, 1.6, depth + pad + 2);
    scene.add(title);

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
        line.userData = { from: u.id, to: dep, district: d.id };
        wires.add(line);
      });
    });

    plots.push({
      district: d,
      centre: new THREE.Vector3(originX + width / 2, tallest * 0.45, depth / 2),
      // The view takes in the tallest building as well as the plot.
      radius: Math.max(width, depth, tallest * 1.5),
    });
    return width + pad * 2;
  }

  var x = 0;
  districts.forEach(function (d) {
    x += buildDistrict(d, x) + 18;
  });
  var ground = new THREE.Mesh(
    new THREE.CircleGeometry(900, 48),
    new THREE.MeshLambertMaterial({ color: 0xf3eee2 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.85;
  scene.add(ground);

  // Camera moves ease toward a goal, so a scope change reads as one place to another.
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
  function world() {
    if (!plots.length) return;
    var a = plots[0].centre;
    var b = plots[plots.length - 1].centre;
    var span =
      b.x - a.x + plots[0].radius / 2 + plots[plots.length - 1].radius / 2;
    look(
      new THREE.Vector3((a.x + b.x) / 2, Math.max(a.y, b.y), a.z),
      Math.max(span, plots[0].radius),
    );
  }

  var exploded = 0;
  var explodeGoal = q.has("explode") ? 1 : 0;
  var selected = null;

  function paint() {
    floors.forEach(function (m) {
      var u = m.userData;
      var on =
        selected &&
        selected.userData.unit === u.unit &&
        selected.userData.district === u.district;
      var dim = selected && !on;
      m.material.color.copy(u.base);
      if (dim) m.material.color.lerp(new THREE.Color(0xe4ded2), 0.72);
      m.material.emissive.setHex(m === selected ? 0x554400 : 0x000000);
    });
    wires.children.forEach(function (l) {
      var u = selected && selected.userData;
      var mine =
        u &&
        l.userData.district === u.district.id &&
        (l.userData.from === u.unit.id || l.userData.to === u.unit.id);
      l.material.opacity = selected ? (mine ? 0.9 : 0.05) : 0.28;
    });
  }

  var card = document.getElementById("card");
  var fmt = function (n) {
    return n.toLocaleString("en-US");
  };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };

  function showDistrict(d) {
    card.hidden = false;
    card.innerHTML =
      "<h2>" +
      esc(d.name) +
      '</h2><p class="sub">district · scanned ' +
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
      (d.git.commits == null ? "n/a" : fmt(d.git.commits)) +
      "</b><span>commits</span></div><div><b>" +
      (d.git.contributors == null ? "n/a" : d.git.contributors) +
      "</b><span>contributors</span></div><div><b>" +
      esc(d.git.lastCommit || "n/a") +
      "</b><span>last commit</span></div></div>" +
      '<table><tr><th>Building</th><th class="n">Floors</th><th class="n">Files</th></tr>' +
      d.units
        .map(function (u) {
          return (
            "<tr><td>" +
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
    else card.hidden = true;
  }

  card.addEventListener("click", function (e) {
    var row = e.target.closest("tr[data-floor]");
    if (!row || !selected) return;
    var u = selected.userData;
    var hit = floors.filter(function (m) {
      return (
        m.userData.unit === u.unit &&
        m.userData.district === u.district &&
        m.userData.floor.name === row.dataset.floor
      );
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
    var hit = ray.intersectObjects(floors)[0];
    select(hit ? hit.object : null);
  });

  var bar = document.getElementById("districts");
  function chip(text, fn) {
    var b = document.createElement("button");
    b.textContent = text;
    b.addEventListener("click", fn);
    bar.appendChild(b);
  }
  if (plots.length > 1)
    chip("World", function () {
      select(null);
      world();
    });
  plots.forEach(function (p) {
    chip(p.district.name, function () {
      selected = null;
      paint();
      showDistrict(p.district);
      look(p.centre, p.radius);
    });
  });

  var explodeBtn = document.getElementById("explode");
  explodeBtn.setAttribute("aria-pressed", String(explodeGoal === 1));
  explodeBtn.addEventListener("click", function () {
    explodeGoal = explodeGoal ? 0 : 1;
    explodeBtn.setAttribute("aria-pressed", String(explodeGoal === 1));
  });
  var wiringBtn = document.getElementById("wiring");
  wiringBtn.addEventListener("click", function () {
    wires.visible = !wires.visible;
    wiringBtn.setAttribute("aria-pressed", String(wires.visible));
  });

  addEventListener("resize", function () {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  if (!districts.length) {
    card.hidden = false;
    card.innerHTML =
      "<h2>No district yet</h2><p>Run <code>node tools/scan.mjs --repo &lt;path&gt; --id &lt;id&gt;</code>.</p>";
  }
  world();
  if (goal) {
    camera.position.copy(goal.position);
    controls.target.copy(goal.target);
    goal = null;
  }
  if (q.get("select")) {
    var want = q.get("select").split("/");
    var first = floors.filter(function (m) {
      return (
        m.userData.unit.id === want[0] &&
        (!want[1] || m.userData.floor.name === want[1])
      );
    })[0];
    if (first) select(first);
  }
  if (q.has("explode")) exploded = 1;

  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function frame() {
    requestAnimationFrame(frame);
    exploded = still ? explodeGoal : exploded + (explodeGoal - exploded) * 0.12;
    floors.forEach(function (m) {
      m.position.y = m.userData.baseY + exploded * m.userData.index * GAP;
    });
    tops.forEach(function (t) {
      t.sprite.position.set(
        t.floor.position.x,
        t.floor.position.y + t.lift,
        t.floor.position.z,
      );
    });
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
