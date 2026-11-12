// People as figures: smooth lathed bodies, textured clothes, and a look drawn
// at random from a seed (skin, hair, clothes, build, hat, glasses).
// One list of parts makes both a single figure (the city's teams) and
// instanced crowds (the organisation's 1000 people), and it is written
// against any three.js namespace passed in: the city still runs r128, the
// organisation view the current release.
import type * as T from "three";

type Three = typeof T;

export type Look = {
  skin: number;
  hair: number;
  hairStyle: "bald" | "short" | "long" | "bun" | "curly";
  outfit: "knit" | "stripes" | "checks" | "hivis" | "blazer" | "hoodie";
  outfitColor: number;
  pants: number;
  shoes: number;
  height: number; // 0.9 to 1.12
  build: number; // 0.88 to 1.18, how broad
  hat: "none" | "hardhat" | "cap";
  hatColor: number;
  glasses: boolean;
  headset: boolean;
  badge: boolean;
  lanyard: boolean;
};

const SKINS = [0xf6d3b3, 0xeac0a0, 0xd9a47e, 0xc68642, 0xa86b3c, 0x8d5524, 0x6b3f1d];
const HAIRS = [0x1d1a17, 0x2e221a, 0x4a3426, 0x6b4a2f, 0x8d6b3f, 0xb98a50, 0x9a9a9a, 0x2b2b3a];
const OUTFITS = [0x4f7cac, 0x6aa36f, 0xc96f53, 0xe0b04c, 0x7d6bb3, 0x3e8e8a, 0xb35c7a, 0x5a6b7d, 0xd98c3f, 0x2f4858];
const PANTS = [0x2e3a4f, 0x3b3b3b, 0x5b4a3a, 0x1f2a44, 0x6d6a5f, 0x44546a];
const SHOES = [0x2a2420, 0x3a2a1f, 0x1c1c1c, 0x5a4636, 0xe8e2d6];
const HIVIS = [0xf2e33a, 0xff8a1f];
const HARDHAT = [0xf6f6f2, 0xf2c230, 0x2e6fd8, 0xe8562a];

// A seeded random from a text, so a person's look is the same every time.
export function lookRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <V,>(xs: readonly V[]) => xs[Math.floor(next() * xs.length)];
  return { next, pick };
}

/**
 * A random look. `site` puts the person in a hard hat and hi-vis; `office`
 * favours blazers and lanyards. Anything in `fix` overrides the draw.
 */
export function randomLook(
  seed: string,
  opts: { site?: boolean; office?: boolean; fix?: Partial<Look> } = {},
): Look {
  const r = lookRandom(seed);
  const site = !!opts.site;
  const outfit: Look["outfit"] = site
    ? "hivis"
    : opts.office
      ? r.pick(["blazer", "blazer", "knit", "stripes", "checks"] as const)
      : r.pick(["knit", "stripes", "checks", "hoodie", "blazer"] as const);
  const look: Look = {
    skin: r.pick(SKINS),
    hair: r.pick(HAIRS),
    hairStyle: r.pick(["short", "short", "long", "bun", "curly", "bald"] as const),
    outfit,
    outfitColor: outfit === "hivis" ? r.pick(HIVIS) : r.pick(OUTFITS),
    pants: r.pick(PANTS),
    shoes: site ? r.pick([0x5a4636, 0x2a2420]) : r.pick(SHOES),
    height: 0.9 + r.next() * 0.22,
    build: 0.88 + r.next() * 0.3,
    hat: site ? "hardhat" : r.next() < 0.08 ? "cap" : "none",
    hatColor: site ? r.pick(HARDHAT) : r.pick(OUTFITS),
    glasses: r.next() < 0.3,
    headset: false,
    badge: false,
    lanyard: !site && r.next() < 0.45,
  };
  return { ...look, ...opts.fix };
}

export type Part = {
  geo: string;
  mat: string;
  color: number;
  p: [number, number, number];
  r?: [number, number, number];
  s?: [number, number, number];
};

const DARK = 0x23302a;

/** The parts of one figure, in its own space: feet on y = 0, facing +z. */
export function partsOf(look: Look): Part[] {
  const w = look.build;
  const parts: Part[] = [
    // legs and shoes
    { geo: "leg", mat: "denim", color: look.pants, p: [-0.19 * w, 0.62, 0] },
    { geo: "leg", mat: "denim", color: look.pants, p: [0.19 * w, 0.62, 0] },
    { geo: "shoe", mat: "plain", color: look.shoes, p: [-0.19 * w, 0.09, 0.07] },
    { geo: "shoe", mat: "plain", color: look.shoes, p: [0.19 * w, 0.09, 0.07] },
    // body
    { geo: "torso", mat: look.outfit, color: look.outfitColor, p: [0, 1.08, 0], s: [w, 1, w * 0.74] },
    { geo: "neck", mat: "skin", color: look.skin, p: [0, 2.2, 0] },
    // arms in sleeves, and hands
    { geo: "arm", mat: look.outfit, color: look.outfitColor, p: [-0.47 * w, 1.72, 0], r: [0, 0, -0.1] },
    { geo: "arm", mat: look.outfit, color: look.outfitColor, p: [0.47 * w, 1.72, 0], r: [0, 0, 0.1] },
    { geo: "hand", mat: "skin", color: look.skin, p: [-0.52 * w, 1.2, 0.02] },
    { geo: "hand", mat: "skin", color: look.skin, p: [0.52 * w, 1.2, 0.02] },
    // head and face
    { geo: "head", mat: "skin", color: look.skin, p: [0, 2.58, 0], s: [1, 1.08, 0.98] },
    { geo: "ear", mat: "skin", color: look.skin, p: [-0.36, 2.58, 0], s: [0.5, 1, 0.8] },
    { geo: "ear", mat: "skin", color: look.skin, p: [0.36, 2.58, 0], s: [0.5, 1, 0.8] },
    { geo: "nose", mat: "skin", color: look.skin, p: [0, 2.55, 0.36], s: [0.8, 1, 1] },
    { geo: "eye", mat: "gloss", color: 0xffffff, p: [-0.12, 2.64, 0.31] },
    { geo: "eye", mat: "gloss", color: 0xffffff, p: [0.12, 2.64, 0.31] },
    { geo: "pupil", mat: "gloss", color: 0x1b1612, p: [-0.12, 2.64, 0.355] },
    { geo: "pupil", mat: "gloss", color: 0x1b1612, p: [0.12, 2.64, 0.355] },
    { geo: "brow", mat: "plain", color: look.hair, p: [-0.12, 2.74, 0.33], r: [0, 0, 0.08] },
    { geo: "brow", mat: "plain", color: look.hair, p: [0.12, 2.74, 0.33], r: [0, 0, -0.08] },
    { geo: "mouth", mat: "plain", color: 0x9c3b3b, p: [0, 2.45, 0.335], r: [0, 0, Math.PI] },
  ];

  if (look.hat !== "hardhat")
    switch (look.hairStyle) {
      case "short":
        parts.push({ geo: "hairCap", mat: "hair", color: look.hair, p: [0, 2.6, -0.02] });
        break;
      case "long":
        parts.push({ geo: "hairCap", mat: "hair", color: look.hair, p: [0, 2.6, -0.02] });
        parts.push({ geo: "hairBack", mat: "hair", color: look.hair, p: [0, 2.38, -0.2], s: [1, 1, 0.55] });
        break;
      case "bun":
        parts.push({ geo: "hairCap", mat: "hair", color: look.hair, p: [0, 2.6, -0.02] });
        parts.push({ geo: "bun", mat: "hair", color: look.hair, p: [0, 2.92, -0.24] });
        break;
      case "curly":
        parts.push({ geo: "curls", mat: "hair", color: look.hair, p: [0, 2.72, -0.04], s: [1, 0.78, 1] });
        break;
    }

  if (look.hat === "hardhat") {
    parts.push({ geo: "hardhat", mat: "gloss", color: look.hatColor, p: [0, 2.66, 0] });
    parts.push({ geo: "brim", mat: "gloss", color: look.hatColor, p: [0, 2.7, 0.04], s: [1, 1, 1.08] });
  } else if (look.hat === "cap") {
    parts.push({ geo: "hairCap", mat: "plain", color: look.hatColor, p: [0, 2.64, -0.02] });
    parts.push({ geo: "visor", mat: "plain", color: look.hatColor, p: [0, 2.74, 0.3], s: [1, 1, 1.6] });
  }
  if (look.glasses) {
    parts.push({ geo: "lens", mat: "gloss", color: DARK, p: [-0.13, 2.64, 0.37] });
    parts.push({ geo: "lens", mat: "gloss", color: DARK, p: [0.13, 2.64, 0.37] });
    parts.push({ geo: "bridge", mat: "gloss", color: DARK, p: [0, 2.65, 0.38] });
  }
  if (look.headset) {
    parts.push({ geo: "band", mat: "gloss", color: 0x2b3a30, p: [0, 2.6, 0] });
    parts.push({ geo: "muff", mat: "gloss", color: 0x2b3a30, p: [-0.39, 2.58, 0], r: [0, 0, Math.PI / 2] });
    parts.push({ geo: "muff", mat: "gloss", color: 0x2b3a30, p: [0.39, 2.58, 0], r: [0, 0, Math.PI / 2] });
    parts.push({ geo: "mic", mat: "gloss", color: 0xd9534f, p: [0.3, 2.42, 0.3] });
  }
  if (look.badge)
    parts.push({ geo: "badge", mat: "gloss", color: 0x3f8f5f, p: [0.2 * w, 1.85, 0.33 * w], r: [Math.PI / 2, 0, 0] });
  if (look.lanyard) {
    parts.push({ geo: "strap", mat: "plain", color: 0x2b3a30, p: [0, 1.98, 0.29 * w], r: [0.25, 0, 0] });
    parts.push({ geo: "card", mat: "plain", color: 0xf4f1ea, p: [0, 1.66, 0.33 * w], r: [-0.1, 0, 0] });
  }
  return parts.map((part) => ({
    ...part,
    // Height scales the whole figure; build only the body's breadth.
    p: [part.p[0], part.p[1] * look.height, part.p[2]] as [number, number, number],
    s: [
      (part.s?.[0] ?? 1) * look.height,
      (part.s?.[1] ?? 1) * look.height,
      (part.s?.[2] ?? 1) * look.height,
    ] as [number, number, number],
  }));
}

// A capsule as a lathe, which r128 can draw (it has no CapsuleGeometry).
function capsule(THREE: Three, radius: number, length: number, around = 20) {
  const pts: T.Vector2[] = [];
  const cap = 8;
  for (let i = 0; i <= cap; i++) {
    const a = -Math.PI / 2 + (i / cap) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * radius, -length / 2 + Math.sin(a) * radius));
  }
  for (let i = 0; i <= cap; i++) {
    const a = (i / cap) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * radius, length / 2 + Math.sin(a) * radius));
  }
  return new THREE.LatheGeometry(pts, around);
}

function torso(THREE: Three) {
  // Hips, waist, chest, shoulders and neck, as radius by height.
  const profile: [number, number][] = [
    [0.0, 0.0], [0.33, 0.0], [0.37, 0.12], [0.35, 0.32], [0.33, 0.45], [0.38, 0.68],
    [0.43, 0.86], [0.44, 0.96], [0.4, 1.04], [0.28, 1.1], [0.14, 1.13], [0.0, 1.14],
  ];
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    32,
  );
}

type Draw = (c: CanvasRenderingContext2D, n: number) => void;

function noise(c: CanvasRenderingContext2D, n: number, amount: number, seed: string) {
  const r = lookRandom(seed);
  const img = c.getImageData(0, 0, n, n);
  for (let i = 0; i < img.data.length; i += 4) {
    const d = (r.next() - 0.5) * amount;
    img.data[i] += d;
    img.data[i + 1] += d;
    img.data[i + 2] += d;
  }
  c.putImageData(img, 0, 0);
}

// Clothes are drawn light, so each person's colour tints them.
const PATTERNS: Record<string, Draw> = {
  knit: (c, n) => {
    c.fillStyle = "#f4f4f4";
    c.fillRect(0, 0, n, n);
    c.strokeStyle = "rgba(0,0,0,0.06)";
    for (let y = 0; y < n; y += 4) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(n, y);
      c.stroke();
    }
    noise(c, n, 18, "knit");
  },
  stripes: (c, n) => {
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, n, n);
    c.fillStyle = "rgba(0,0,0,0.22)";
    for (let y = 0; y < n; y += 16) c.fillRect(0, y, n, 7);
    noise(c, n, 12, "stripes");
  },
  checks: (c, n) => {
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, n, n);
    c.fillStyle = "rgba(0,0,0,0.16)";
    for (let i = 0; i < n; i += 24) {
      c.fillRect(i, 0, 10, n);
      c.fillRect(0, i, n, 10);
    }
    c.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 12; i < n; i += 24) {
      c.fillRect(i, 0, 2, n);
      c.fillRect(0, i, n, 2);
    }
    noise(c, n, 10, "checks");
  },
  hivis: (c, n) => {
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, n, n);
    // Two reflective bands round the body, and braces over the shoulders.
    c.fillStyle = "#c9cdd2";
    c.fillRect(0, n * 0.3, n, n * 0.07);
    c.fillRect(0, n * 0.52, n, n * 0.07);
    c.fillStyle = "rgba(255,255,255,0.9)";
    c.fillRect(0, n * 0.315, n, n * 0.02);
    c.fillRect(0, n * 0.535, n, n * 0.02);
    noise(c, n, 8, "hivis");
  },
  blazer: (c, n) => {
    c.fillStyle = "#e9e9e9";
    c.fillRect(0, 0, n, n);
    // A shirt front and lapels at the front of the body (u ≈ 0.25 faces +z).
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.moveTo(n * 0.2, n);
    c.lineTo(n * 0.25, n * 0.45);
    c.lineTo(n * 0.3, n);
    c.fill();
    c.strokeStyle = "rgba(0,0,0,0.35)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(n * 0.18, n);
    c.lineTo(n * 0.25, n * 0.42);
    c.lineTo(n * 0.32, n);
    c.stroke();
    c.fillStyle = "rgba(0,0,0,0.4)";
    for (const y of [0.3, 0.38]) c.fillRect(n * 0.245, n * y, 3, 3);
    noise(c, n, 10, "blazer");
  },
  hoodie: (c, n) => {
    c.fillStyle = "#f2f2f2";
    c.fillRect(0, 0, n, n);
    c.strokeStyle = "rgba(0,0,0,0.25)";
    c.lineWidth = 2;
    c.strokeRect(n * 0.17, n * 0.12, n * 0.16, n * 0.14); // pocket
    c.beginPath();
    c.moveTo(n * 0.23, n * 0.95);
    c.lineTo(n * 0.23, n * 0.75);
    c.moveTo(n * 0.27, n * 0.95);
    c.lineTo(n * 0.27, n * 0.75);
    c.stroke();
    noise(c, n, 16, "hoodie");
  },
  denim: (c, n) => {
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, n, n);
    c.strokeStyle = "rgba(0,0,0,0.08)";
    for (let i = -n; i < n; i += 3) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i + n, n);
      c.stroke();
    }
    noise(c, n, 22, "denim");
  },
  skin: (c, n) => {
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, n, n);
    noise(c, n, 8, "skin");
  },
  hair: (c, n) => {
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, n, n);
    c.strokeStyle = "rgba(0,0,0,0.18)";
    for (let x = 0; x < n; x += 2) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + 3, n);
      c.stroke();
    }
    noise(c, n, 20, "hair");
  },
};

export type FigureKit = ReturnType<typeof createFigureKit>;

export function createFigureKit(THREE: Three) {
  const geos: Record<string, T.BufferGeometry> = {
    leg: capsule(THREE, 0.16, 0.95),
    shoe: new THREE.SphereGeometry(0.17, 20, 12).scale(1, 0.6, 1.7),
    torso: torso(THREE),
    neck: new THREE.CylinderGeometry(0.12, 0.13, 0.22, 20),
    arm: capsule(THREE, 0.11, 0.78, 16),
    hand: new THREE.SphereGeometry(0.115, 16, 12),
    head: new THREE.SphereGeometry(0.36, 40, 28),
    ear: new THREE.SphereGeometry(0.09, 12, 10),
    nose: new THREE.SphereGeometry(0.055, 12, 10),
    eye: new THREE.SphereGeometry(0.06, 14, 10),
    pupil: new THREE.SphereGeometry(0.032, 10, 8),
    brow: new THREE.BoxGeometry(0.13, 0.025, 0.03),
    mouth: new THREE.TorusGeometry(0.075, 0.016, 8, 20, Math.PI),
    hairCap: new THREE.SphereGeometry(0.385, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hairBack: capsule(THREE, 0.34, 0.42, 24),
    bun: new THREE.SphereGeometry(0.15, 18, 14),
    curls: new THREE.IcosahedronGeometry(0.43, 2),
    hardhat: new THREE.SphereGeometry(0.42, 36, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
    brim: new THREE.CylinderGeometry(0.5, 0.5, 0.04, 36),
    visor: new THREE.CylinderGeometry(0.22, 0.22, 0.03, 24, 1, false, -Math.PI / 2, Math.PI),
    lens: new THREE.TorusGeometry(0.09, 0.016, 8, 24),
    bridge: new THREE.BoxGeometry(0.08, 0.02, 0.02),
    band: new THREE.TorusGeometry(0.4, 0.03, 8, 28, Math.PI),
    muff: new THREE.CylinderGeometry(0.1, 0.1, 0.07, 18),
    mic: new THREE.SphereGeometry(0.05, 10, 8),
    badge: new THREE.CylinderGeometry(0.12, 0.12, 0.04, 6),
    strap: new THREE.TorusGeometry(0.2, 0.012, 6, 20, Math.PI),
    card: new THREE.BoxGeometry(0.14, 0.18, 0.015),
  };
  // The strap hangs from the neck: turn its arc to open upwards.
  geos.strap.rotateZ(Math.PI);
  // A lathe's u = 0 faces +z; turn the torso so u = 0.25, where shirt fronts are drawn, does.
  geos.torso.rotateY(-Math.PI / 2);

  const textures: Record<string, T.Texture> = {};
  const texture = (name: string) => {
    if (textures[name]) return textures[name];
    const n = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = n;
    PATTERNS[name](canvas.getContext("2d")!, n);
    const tex = new THREE.CanvasTexture(canvas);
    if ("colorSpace" in tex) (tex as T.Texture).colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return (textures[name] = tex);
  };
  const mats: Record<string, T.Material> = {};
  const material = (name: string) => {
    if (mats[name]) return mats[name];
    const m =
      name === "gloss"
        ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.05 })
        : name === "plain"
          ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
          : new THREE.MeshStandardMaterial({
              color: 0xffffff,
              roughness: name === "skin" ? 0.65 : 0.88,
              map: texture(name),
            });
    return (mats[name] = m);
  };

  const local = (part: Part) => {
    const o = new THREE.Object3D();
    o.position.set(...part.p);
    if (part.r) o.rotation.set(...part.r);
    if (part.s) o.scale.set(...part.s);
    o.updateMatrix();
    return o.matrix;
  };

  /** One figure, as a group of meshes. Colours are per mesh, not shared. */
  function mesh(look: Look) {
    const g = new THREE.Group();
    for (const part of partsOf(look)) {
      const base = material(part.mat) as T.MeshStandardMaterial;
      const m = base.clone();
      m.color.setHex(part.color);
      const mesh = new THREE.Mesh(geos[part.geo], m);
      mesh.applyMatrix4(local(part));
      g.add(mesh);
    }
    return g;
  }

  /**
   * Many figures, one instanced mesh for each kind of part. `place` sets
   * where figure i stands. Each mesh keeps, for each instance, which figure
   * it belongs to (`userData.owner`) and its own colour (`userData.base`).
   */
  function crowd(looks: Look[], place: (i: number, o: T.Object3D) => void) {
    const groups = new Map<string, { part: Part; owner: number }[]>();
    looks.forEach((look, owner) => {
      for (const part of partsOf(look)) {
        const key = `${part.geo}|${part.mat}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push({ part, owner });
      }
    });
    const where = looks.map((_, i) => {
      const o = new THREE.Object3D();
      place(i, o);
      o.updateMatrix();
      return o.matrix.clone();
    });
    const root = new THREE.Group();
    const m4 = new THREE.Matrix4();
    const c = new THREE.Color();
    for (const [key, list] of groups) {
      const [geo, mat] = key.split("|");
      const im = new THREE.InstancedMesh(geos[geo], material(mat), list.length);
      const owners = new Int32Array(list.length);
      const base = new Float32Array(list.length * 3);
      list.forEach(({ part, owner }, i) => {
        m4.multiplyMatrices(where[owner], local(part));
        im.setMatrixAt(i, m4);
        c.setHex(part.color);
        im.setColorAt(i, c);
        owners[i] = owner;
        base.set([c.r, c.g, c.b], i * 3);
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.userData = { owner: owners, base };
      root.add(im);
    }
    return root;
  }

  /** Greys out the figures `dim` says, and restores the rest. */
  function dimCrowd(root: T.Group, dim: (owner: number) => boolean) {
    const c = new THREE.Color();
    const grey = new THREE.Color(0xd8d4cc);
    for (const child of root.children) {
      const im = child as T.InstancedMesh;
      const { owner, base } = im.userData as { owner: Int32Array; base: Float32Array };
      for (let i = 0; i < owner.length; i++) {
        c.setRGB(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]);
        if (dim(owner[i])) c.lerp(grey, 0.82);
        im.setColorAt(i, c);
      }
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  }

  return { mesh, crowd, dimCrowd, randomLook, partsOf };
}
