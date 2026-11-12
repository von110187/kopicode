// The organisation as a world. Each domain is a raised island on hilly
// ground, with landmarks of its work, and everyone stands on the island of
// their domain and walks about on it. Whoever the filters pick is lit up,
// with a ring at their feet; the rest are greyed out, or hidden when singled out.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { MemberRow } from "~/org/metrics";
import { FAMILIES } from "~/org/skills";
import { createFigureKit, lookRandom, randomLook } from "~/three/figure-kit";

export type Zone = { id: string; name: string; hue: number };

const SITE = new Set(FAMILIES.filter((f) => f.site).map((f) => f.id));
const OFFICE = new Set(["finance", "hr", "sales-marketing"]);
const SCALE = 0.72;

const std = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

function shadowed<T extends THREE.Object3D>(o: T) {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return o;
}

function box(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0, extra = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(color, extra));
  m.position.set(x, y + h / 2, z);
  return m;
}
function cyl(rt: number, rb: number, h: number, color: number, x = 0, y = 0, z = 0, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), std(color));
  m.position.set(x, y + h / 2, z);
  return m;
}
function tree(scale = 1, hue = 0) {
  const g = new THREE.Group();
  g.add(cyl(0.18, 0.25, 1.4, 0x6b4a2f));
  const green = new THREE.Color().setHSL((110 + hue) / 360, 0.42, 0.38).getHex();
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.6, 10), std(green));
  top.position.y = 2.4;
  const top2 = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2, 10), std(green));
  top2.position.y = 3.3;
  g.add(top, top2);
  g.scale.setScalar(scale);
  return g;
}

// A landmark of a domain's work, about 2 to 6 units across.
function landmark(domain: string, k: number): THREE.Object3D {
  const g = new THREE.Group();
  const r = lookRandom(`${domain}:${k}`);
  const alt = k % 2 === 0;
  switch (domain) {
    case "software": {
      if (alt) {
        for (let i = 0; i < 3; i++) {
          const rack = box(0.9, 2.6, 1.1, 0x2b3340, i * 1.05 - 1.05, 0, 0);
          g.add(rack);
          for (let j = 0; j < 5; j++)
            g.add(box(0.7, 0.06, 0.02, 0x46e08a, i * 1.05 - 1.05, 0.4 + j * 0.42, 0.56, { emissive: 0x2fbf6a, emissiveIntensity: 0.8 }));
        }
      } else {
        g.add(box(0.15, 1.2, 0.15, 0x555b66));
        g.add(box(2.2, 1.3, 0.12, 0x1f2430, 0, 1.2, 0));
        g.add(box(2, 1.1, 0.02, 0x4f9cf0, 0, 1.3, 0.07, { emissive: 0x2f6fd0, emissiveIntensity: 0.6 }));
      }
      break;
    }
    case "civil": {
      if (alt) {
        g.add(box(6, 0.4, 1.6, 0xb8b3a8, 0, 2, 0));
        g.add(box(0.6, 2, 0.6, 0x9a958a, -2.2, 0, 0), box(0.6, 2, 0.6, 0x9a958a, 2.2, 0, 0));
        const arch = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.12, 8, 24, Math.PI), std(0xd06b3a));
        arch.position.y = 2.4;
        g.add(arch);
      } else {
        for (let i = 0; i < 4; i++) g.add(box(3.4, 0.3, 0.35, 0x8a8f99, 0, i * 0.32, i % 2 ? 0.2 : -0.2));
      }
      break;
    }
    case "geo": {
      if (alt) {
        const colors = [0x8b6b4a, 0xb08d5f, 0x6f6a63, 0xc29b62, 0x5b5148];
        colors.forEach((c, i) => g.add(cyl(1.3 - i * 0.08, 1.4 - i * 0.08, 0.55, c, 0, i * 0.55, 0, 9)));
      } else {
        for (let i = 0; i < 3; i++) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.2, 6), std(0xe0a020));
          const a = (i / 3) * Math.PI * 2;
          leg.position.set(Math.cos(a) * 0.8, 2, Math.sin(a) * 0.8);
          leg.lookAt(0, 4.2, 0);
          leg.rotateX(Math.PI / 2);
          g.add(leg);
        }
        g.add(cyl(0.12, 0.12, 4.5, 0x555555), box(0.9, 0.6, 0.9, 0xd9534f, 0, 0, 0.9));
      }
      break;
    }
    case "mer": {
      if (alt) {
        g.add(box(0.12, 0.12, 7, 0x777777, -0.6, 0.15, 0), box(0.12, 0.12, 7, 0x777777, 0.6, 0.15, 0));
        for (let i = 0; i < 9; i++) g.add(box(1.8, 0.12, 0.3, 0x6b4a2f, 0, 0, -3.2 + i * 0.8));
      } else {
        g.add(cyl(0.12, 0.4, 6, 0x9aa0a8, 0, 0, 0, 4));
        g.add(box(3.2, 0.12, 0.12, 0x9aa0a8, 0, 5.2, 0), box(2.2, 0.12, 0.12, 0x9aa0a8, 0, 4.4, 0));
      }
      break;
    }
    case "site": {
      if (alt) {
        g.add(box(0.5, 7, 0.5, 0xf2c230));
        g.add(box(6, 0.35, 0.35, 0xf2c230, 2, 7, 0), box(1, 0.6, 0.8, 0x444444, -1.2, 6.8, 0));
        g.add(cyl(0.02, 0.02, 3, 0x333333, 4.4, 4, 0, 4), box(0.6, 0.4, 0.6, 0x8a8f99, 4.4, 3.6, 0));
      } else {
        for (let i = 0; i < 4; i++) {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 12), std(0xff7a1a));
          cone.position.set(i * 0.8 - 1.2, 0.35, (i % 2) * 0.4);
          g.add(cone);
        }
      }
      break;
    }
    case "property": {
      const wall = r.pick([0xf2e6d0, 0xe9d8c4, 0xdfe7ee, 0xf4dcd2]);
      if (alt) {
        g.add(box(2.2, 1.6, 2, wall));
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.1, 4), std(0xb5523b));
        roof.position.y = 2.15;
        roof.rotation.y = Math.PI / 4;
        g.add(roof, box(0.5, 0.9, 0.05, 0x6b4a2f, 0, 0, 1.01));
      } else {
        g.add(box(2, 5.5, 2, wall));
        for (let y = 0; y < 5; y++)
          for (const x of [-0.5, 0.5]) g.add(box(0.4, 0.5, 0.02, 0x7fb0d9, x, 0.6 + y * 1, 1.01));
      }
      break;
    }
    case "landscape": {
      g.add(tree(alt ? 1 : 0.8, k * 7));
      if (!alt)
        for (let i = 0; i < 6; i++) {
          const f = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), std(r.pick([0xe0607e, 0xf2c230, 0xffffff, 0xb07ad9])));
          f.position.set(Math.cos(i) * 1.6, 0.2, Math.sin(i) * 1.6);
          g.add(f);
        }
      break;
    }
    case "commercial": {
      for (let i = 0; i < 3; i++) {
        const n = 3 + ((k + i) % 4);
        for (let j = 0; j < n; j++) g.add(cyl(0.45, 0.45, 0.16, 0xe3b341, i * 1.1 - 1.1, j * 0.17, 0, 20));
      }
      break;
    }
    case "growth": {
      g.add(box(0.15, 2.4, 0.15, 0x555b66, -1.4), box(0.15, 2.4, 0.15, 0x555b66, 1.4));
      g.add(box(3.6, 1.8, 0.15, alt ? 0xd9534f : 0x4f7cac, 0, 2, 0, { emissive: alt ? 0x6a1f1c : 0x1f3a5a, emissiveIntensity: 0.35 }));
      break;
    }
    case "product": {
      g.add(box(3, 2, 0.12, 0xf7f4ee, 0, 0.6, 0), box(0.12, 0.6, 0.12, 0x777777, -1.2), box(0.12, 0.6, 0.12, 0x777777, 1.2));
      for (let i = 0; i < 9; i++)
        g.add(box(0.4, 0.4, 0.03, r.pick([0xffe066, 0xff9f80, 0x9fd8a0, 0x9fc6ff]), -1 + (i % 3) * 1, 0.85 + Math.floor(i / 3) * 0.55, 0.08));
      break;
    }
    case "people": {
      g.add(box(2.4, 0.12, 0.7, 0x8a6a4a, 0, 0.5, 0), box(2.4, 0.6, 0.1, 0x8a6a4a, 0, 0.6, -0.32));
      g.add(box(0.12, 0.5, 0.6, 0x555555, -1, 0, 0), box(0.12, 0.5, 0.6, 0x555555, 1, 0, 0));
      const pot = cyl(0.35, 0.28, 0.6, 0xb5523b, 1.8);
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), std(0x4f8a4a));
      bush.position.set(1.8, 1, 0);
      g.add(pot, bush);
      break;
    }
    default: {
      g.add(box(0.15, 2.4, 0.15, 0x777777), box(1.6, 0.6, 0.1, 0xf7f4ee, 0, 1.8, 0));
    }
  }
  return shadowed(g);
}

function label(text: string, sub: string, hue: number) {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 160;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (t: string, s: string) => {
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, 640, 160);
    g.fillStyle = "rgba(255,255,255,0.93)";
    g.beginPath();
    g.roundRect(6, 6, 628, 148, 36);
    g.fill();
    g.fillStyle = `hsl(${hue} 45% 45%)`;
    g.fillRect(36, 40, 12, 80);
    g.fillStyle = "#23302a";
    g.font = "bold 52px system-ui, sans-serif";
    g.fillText(t.length > 20 ? `${t.slice(0, 19)}…` : t, 68, 82);
    g.font = "34px system-ui, sans-serif";
    g.fillStyle = "#5d6a62";
    g.fillText(s, 68, 128);
    tex.needsUpdate = true;
  };
  draw(text, sub);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  sprite.scale.set(22, 5.5, 1);
  sprite.renderOrder = 10;
  return { sprite, draw };
}

// How a person stands against what is picked.
export type Fit = "fit" | "partial" | "none";

type Api = {
  setHighlight: (fn: ((i: number) => Fit) | null, single: boolean) => void;
  select: (i: number) => void;
  index: Map<string, number>;
};

export function WorldScene({
  people,
  zones,
  zoneOf,
  match,
  single,
  selected,
  onPick,
}: {
  people: MemberRow[];
  zones: Zone[];
  zoneOf: (row: MemberRow) => string;
  match: ((row: MemberRow) => Fit) | null; // null: nothing picked, everyone shown plainly
  single: boolean;
  selected: string | null;
  onPick: (person: string | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const sky = new THREE.Color(0xe6e9fb); // the middle of the sky every page shares
    scene.background = sky;
    const camera = new THREE.PerspectiveCamera(42, el.clientWidth / el.clientHeight, 0.5, 3000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.47;

    // Islands: one a domain, as wide as its people need, on a ring.
    const count = new Map<string, number[]>();
    people.forEach((p, i) => {
      const z = zoneOf(p);
      if (!count.has(z)) count.set(z, []);
      count.get(z)!.push(i);
    });
    const shown = zones.filter((z) => count.has(z.id));
    const radius = (n: number) => Math.sqrt(n) * 1.25 + 4;
    const circumference = shown.reduce((a, z) => a + radius(count.get(z.id)!.length) * 2 + 10, 0);
    const R = Math.max(40, circumference / (Math.PI * 2));
    let angle = 0;
    const island = new Map<string, { x: number; z: number; r: number; h: number }>();
    shown.forEach((z, k) => {
      const r = radius(count.get(z.id)!.length);
      angle += (r + 5) / R;
      island.set(z.id, { x: Math.cos(angle) * R, z: Math.sin(angle) * R, r, h: 2 + (k % 3) * 1.6 });
      angle += (r + 5) / R;
    });

    scene.fog = new THREE.Fog(sky, R * 2.2, R * 5.5);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b09a, 1.5));
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.2);
    sun.position.set(R * 0.8, R * 1.6, R * 0.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = sc.bottom = -R * 1.5;
    sc.right = sc.top = R * 1.5;
    sc.far = R * 5;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    // Ground: rolling hills that flatten near the islands and the plaza.
    const size = R * 6;
    const ground = new THREE.PlaneGeometry(size, size, 180, 180);
    ground.rotateX(-Math.PI / 2);
    const pos = ground.attributes.position;
    const colors: number[] = [];
    const col = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      let flat = Math.min(1, Math.max(0, (Math.hypot(x, z) - 16) / 14));
      for (const is of island.values())
        flat = Math.min(flat, Math.max(0, (Math.hypot(x - is.x, z - is.z) - is.r - 4) / 12));
      const hill =
        (Math.sin(x * 0.045) * Math.cos(z * 0.05) * 3 + Math.sin(x * 0.11 + z * 0.07) * 1.2 + Math.cos(z * 0.13) * 0.8) *
        flat;
      pos.setY(i, Math.max(-0.4, hill));
      col.setHSL(0.27 - hill * 0.01, 0.32, 0.6 + hill * 0.025);
      colors.push(col.r, col.g, col.b);
    }
    ground.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    ground.computeVertexNormals();
    const groundMesh = new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // The plaza: a pond and the group's tower in the middle.
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(15, 64), std(0xe8dfcc));
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.02;
    plaza.receiveShadow = true;
    const pond = new THREE.Mesh(new THREE.CircleGeometry(7, 48), std(0x6fa8c7, { roughness: 0.2, metalness: 0.1 }));
    pond.rotation.x = -Math.PI / 2;
    pond.position.y = 0.05;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.4, 22, 6), std(0xdfe5ea, { metalness: 0.2, roughness: 0.4 }));
    tower.position.y = 11;
    const crown = new THREE.Mesh(new THREE.OctahedronGeometry(1.6), std(0xfdf3b0, { emissive: 0xf2c230, emissiveIntensity: 0.7 }));
    crown.position.y = 23.5;
    scene.add(plaza, pond, shadowed(tower), crown);

    // Paths from the plaza to each island.
    for (const is of island.values()) {
      const len = Math.hypot(is.x, is.z) - is.r - 15;
      const path = new THREE.Mesh(new THREE.PlaneGeometry(3, len), std(0xe3d7bd));
      path.rotation.x = -Math.PI / 2;
      path.rotation.z = -Math.atan2(is.x, is.z);
      const mid = 15 + len / 2;
      const a = Math.atan2(is.z, is.x);
      path.position.set(Math.cos(a) * mid, 0.04, Math.sin(a) * mid);
      path.receiveShadow = true;
      scene.add(path);
    }

    // The islands: a rock mesa, a coloured top, a ramp to the path, landmarks round the rim.
    const labels = new Map<string, ReturnType<typeof label>>();
    shown.forEach((z, k) => {
      const is = island.get(z.id)!;
      const top = is.r + 3;
      const mesa = new THREE.Mesh(
        new THREE.LatheGeometry(
          [
            new THREE.Vector2(0, -0.5),
            new THREE.Vector2(top + 2.4, -0.5),
            new THREE.Vector2(top + 1.6, is.h * 0.45),
            new THREE.Vector2(top + 0.6, is.h * 0.85),
            new THREE.Vector2(top, is.h),
            new THREE.Vector2(0, is.h),
          ],
          48,
        ),
        std(new THREE.Color().setHSL(0.08, 0.22, 0.52 + (k % 3) * 0.04).getHex(), { flatShading: true }),
      );
      mesa.position.set(is.x, 0, is.z);
      const lawn = new THREE.Mesh(
        new THREE.CircleGeometry(top - 0.1, 48),
        std(new THREE.Color().setHSL(z.hue / 360, 0.38, 0.74).getHex()),
      );
      lawn.rotation.x = -Math.PI / 2;
      lawn.position.set(is.x, is.h + 0.02, is.z);
      lawn.receiveShadow = true;
      scene.add(shadowed(mesa), lawn);

      // A ramp down towards the plaza.
      const toward = Math.atan2(-is.z, -is.x);
      const run = is.h * 2.6;
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, Math.hypot(run, is.h)), std(0xd8ccb0));
      ramp.position.set(is.x + Math.cos(toward) * (top + run / 2), is.h / 2, is.z + Math.sin(toward) * (top + run / 2));
      ramp.rotation.y = -toward + Math.PI / 2;
      ramp.rotateX(Math.atan2(is.h, run));
      scene.add(shadowed(ramp));

      const n = 6 + Math.floor(is.r / 3);
      for (let j = 0; j < n; j++) {
        const a = toward + 0.5 + (j / n) * (Math.PI * 2 - 1);
        const lm = landmark(z.id, j);
        lm.position.set(is.x + Math.cos(a) * (is.r + 1.6), is.h, is.z + Math.sin(a) * (is.r + 1.6));
        lm.rotation.y = -a + Math.PI / 2;
        scene.add(lm);
      }
      const l = label(z.name, `${count.get(z.id)!.length} people`, z.hue);
      l.sprite.position.set(is.x, is.h + 12, is.z);
      scene.add(l.sprite);
      labels.set(z.id, l);
    });

    // Trees on the hills.
    const tr = lookRandom("trees");
    for (let t = 0; t < 160; t++) {
      const a = tr.next() * Math.PI * 2;
      const d = R * 0.35 + tr.next() * R * 1.6;
      const x = Math.cos(a) * d;
      const zz = Math.sin(a) * d;
      if ([...island.values()].some((is) => Math.hypot(x - is.x, zz - is.z) < is.r + 9)) continue;
      if (Math.hypot(x, zz) < 20) continue;
      const tt = shadowed(tree(0.8 + tr.next() * 0.9, tr.next() * 40 - 20));
      tt.position.set(x, 0, zz);
      scene.add(tt);
    }

    // The people.
    const kit = createFigureKit(THREE);
    const looks = people.map((p) =>
      randomLook(p.person, { site: p.families.some((f) => SITE.has(f)), office: OFFICE.has(p.department) }),
    );
    const crowd = kit.crowd(looks);
    scene.add(crowd.root);
    const N = people.length;
    const poses = new Float32Array(N * 6);
    const st = people.map((p, i) => {
      const is = island.get(zoneOf(p))!;
      const r = lookRandom(`walk:${p.person}`);
      const spot = () => {
        const a = r.next() * Math.PI * 2;
        const d = Math.sqrt(r.next()) * is.r;
        return [is.x + Math.cos(a) * d, is.z + Math.sin(a) * d] as const;
      };
      const [x, z] = spot();
      const [tx, tz] = spot();
      poses.set([x, is.h, z, r.next() * Math.PI * 2, 0, SCALE], i * 6);
      return { is, spot, tx, tz, speed: 0.7 + r.next() * 0.8, pause: r.next() * 3, r };
    });

    // Rings at the feet of whoever is lit up, and diamonds over the borderline among them.
    const ringGeo = new THREE.RingGeometry(0.55, 0.78, 28);
    ringGeo.rotateX(-Math.PI / 2);
    const rings = new THREE.InstancedMesh(ringGeo, std(0xf2a900, { emissive: 0xf2a900, emissiveIntensity: 0.6 }), N);
    rings.frustumCulled = false;
    rings.count = 0;
    const dia = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.2), std(0xe0602a, { emissive: 0xe0602a, emissiveIntensity: 0.5 }), N);
    dia.frustumCulled = false;
    dia.count = 0;
    const chosen = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.09, 10, 40),
      std(0x2b3a30, { emissive: 0x2b3a30, emissiveIntensity: 0.4 }),
    );
    chosen.rotation.x = Math.PI / 2;
    chosen.visible = false;
    scene.add(rings, dia, chosen);

    let lit: number[] = [];
    let flagged: number[] = [];
    let hidden: Uint8Array = new Uint8Array(N);
    let sel = -1;

    // Start above the plaza, looking out over the islands.
    camera.position.set(0, R * 1.45, R * 1.85);
    controls.target.set(0, 2, 0);
    controls.maxDistance = R * 4;
    controls.minDistance = 6;

    const index = new Map(people.map((p, i) => [p.person, i]));
    api.current = {
      index,
      setHighlight: (fn, single) => {
        const fits = fn ? people.map((_, i) => fn(i)) : null;
        crowd.tint(fits ? (i) => (fits[i] === "fit" ? 0 : fits[i] === "partial" ? 2 : 1) : () => 0);
        lit = [];
        flagged = [];
        hidden = new Uint8Array(N);
        const per = new Map<string, number>();
        for (let i = 0; i < N; i++) {
          const on = fits ? fits[i] === "fit" : false;
          if (on) {
            lit.push(i);
            if (people[i].borderline) flagged.push(i);
            const z = zoneOf(people[i]);
            per.set(z, (per.get(z) ?? 0) + 1);
          } else if (fits && single && fits[i] === "none") hidden[i] = 1;
        }
        for (const [z, l] of labels) {
          const total = count.get(z)!.length;
          const zone = zones.find((x) => x.id === z)!;
          l.draw(zone.name, fn ? `${per.get(z) ?? 0} of ${total} fit` : `${total} people`);
        }
      },
      select: (i) => {
        sel = i;
        chosen.visible = i >= 0;
      },
    };

    // Click, not drag, picks the person under the pointer.
    const ray = new THREE.Raycaster();
    let down = { x: 0, y: 0 };
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const b = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(
        new THREE.Vector2(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1),
        camera,
      );
      for (const m of crowd.root.children) (m as THREE.InstancedMesh).boundingSphere = null;
      const hit = ray.intersectObjects(crowd.root.children, false)[0];
      const owner = hit?.instanceId != null ? (hit.object.userData.owner as Int32Array)[hit.instanceId] : -1;
      pick.current(owner >= 0 && !hidden[owner] ? people[owner].person : null);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    const ro = new ResizeObserver(() => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);

    const o = new THREE.Object3D();
    const timer = new THREE.Timer();
    let frame = 0;
    const tick = (now?: number) => {
      frame = requestAnimationFrame(tick);
      timer.update(now);
      const dt = Math.min(0.05, timer.getDelta());
      // Walk: towards a spot on the island, pause, pick another.
      for (let i = 0; i < N; i++) {
        const s = st[i];
        const k = i * 6;
        if (s.pause > 0) {
          s.pause -= dt;
          poses[k + 4] *= 0.85; // legs come together
        } else {
          const dx = s.tx - poses[k];
          const dz = s.tz - poses[k + 2];
          const d = Math.hypot(dx, dz);
          if (d < 0.25) {
            s.pause = 0.5 + s.r.next() * 4;
            [s.tx, s.tz] = s.spot();
          } else {
            const step = Math.min(d, s.speed * dt);
            poses[k] += (dx / d) * step;
            poses[k + 2] += (dz / d) * step;
            const want = Math.atan2(dx, dz);
            let turn = want - poses[k + 3];
            turn = Math.atan2(Math.sin(turn), Math.cos(turn));
            poses[k + 3] += turn * Math.min(1, dt * 6);
            poses[k + 4] += step * 3.2;
          }
        }
        poses[k + 5] = hidden[i] ? 0 : SCALE;
      }
      crowd.pose(poses);

      lit.forEach((i, j) => {
        o.position.set(poses[i * 6], poses[i * 6 + 1] + 0.04, poses[i * 6 + 2]);
        o.rotation.set(0, 0, 0);
        o.scale.setScalar(1);
        o.updateMatrix();
        rings.setMatrixAt(j, o.matrix);
      });
      rings.count = lit.length;
      rings.instanceMatrix.needsUpdate = true;
      const t = timer.getElapsed();
      flagged.forEach((i, j) => {
        o.position.set(poses[i * 6], poses[i * 6 + 1] + 2.45 + Math.sin(t * 3 + i) * 0.08, poses[i * 6 + 2]);
        o.rotation.set(0, t * 2, 0);
        o.updateMatrix();
        dia.setMatrixAt(j, o.matrix);
      });
      dia.count = flagged.length;
      dia.instanceMatrix.needsUpdate = true;
      crown.rotation.y = t * 0.4;

      // Follow whoever is picked.
      if (sel >= 0) {
        const p = new THREE.Vector3(poses[sel * 6], poses[sel * 6 + 1], poses[sel * 6 + 2]);
        chosen.position.copy(p).setY(p.y + 0.06);
        const shift = p.clone().setY(p.y + 1.5).sub(controls.target).multiplyScalar(Math.min(1, dt * 3));
        controls.target.add(shift);
        camera.position.add(shift);
      }
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      api.current = null;
    };
  }, [people, zones, zoneOf]);

  useEffect(() => {
    api.current?.setHighlight(match ? (i) => match(people[i]) : null, single);
  }, [people, match, single]);

  useEffect(() => {
    const a = api.current;
    if (!a) return;
    const i = selected ? (a.index.get(selected) ?? -1) : -1;
    a.select(i);
  }, [selected, people]);

  return <div ref={host} className="world" />;
}
