// The organisation in 3D: each group a platform, its people standing on it.
// People who do not match the filters are greyed out; borderline people wear
// an amber marker, people over 100% a red ring. Click a person to pick them.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createFigureKit, randomLook } from "~/three/figure-kit";
import type { MemberRow } from "~/org/metrics";
import { FAMILIES } from "~/org/skills";

export type Placed = { row: MemberRow; group: string };
export type SceneGroup = { id: string; name: string; hue: number };

const SITE = new Set(FAMILIES.filter((f) => f.site).map((f) => f.id));
const OFFICE = new Set(["finance", "hr", "sales-marketing"]);
const STEP = 1.7; // between two people on a platform

function label(text: string, sub: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.beginPath();
  g.roundRect(4, 4, 504, 120, 28);
  g.fill();
  g.fillStyle = "#23302a";
  g.font = "bold 44px system-ui, sans-serif";
  g.textAlign = "center";
  g.fillText(text.length > 22 ? `${text.slice(0, 21)}…` : text, 256, 62);
  g.font = "30px system-ui, sans-serif";
  g.fillStyle = "#5d6a62";
  g.fillText(sub, 256, 104);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  s.scale.set(10, 2.5, 1);
  return s;
}

export function OrgScene({
  people,
  groups,
  match,
  selected,
  onPick,
}: {
  people: Placed[];
  groups: SceneGroup[];
  match: (row: MemberRow) => boolean;
  selected: string | null;
  onPick: (person: string | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{
    setDim: (dim: (i: number) => boolean) => void;
    setSelected: (i: number) => void;
    index: Map<string, number>;
  } | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  // The scene: rebuilt when the people or the groups change.
  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = false;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfbf6ee);
    const camera = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, 0.5, 2000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.48;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc6b4, 1.6));
    const sun = new THREE.DirectionalLight(0xfff2d6, 1.6);
    sun.position.set(40, 90, 60);
    scene.add(sun);

    // Platforms on a grid, each as wide as its people need.
    const byGroup = new Map<string, number[]>();
    people.forEach((p, i) => {
      if (!byGroup.has(p.group)) byGroup.set(p.group, []);
      byGroup.get(p.group)!.push(i);
    });
    const shown = groups.filter((g) => byGroup.has(g.id));
    const radius = (n: number) => Math.sqrt(n) * STEP * 0.62 + 2;
    const cell = Math.max(...shown.map((g) => radius(byGroup.get(g.id)!.length))) * 2 + 4;
    const cols = Math.ceil(Math.sqrt(shown.length * 1.6));
    const rows = Math.ceil(shown.length / cols);
    const spot = new Map<number, THREE.Vector3>();
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(cell * Math.max(cols, rows) * 0.9 + 20, 64),
      new THREE.MeshStandardMaterial({ color: 0xf3eee2, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.31;
    scene.add(ground);

    shown.forEach((g, k) => {
      const cx = ((k % cols) - (cols - 1) / 2) * cell;
      const cz = (Math.floor(k / cols) - (rows - 1) / 2) * cell;
      const list = byGroup.get(g.id)!;
      const r = radius(list.length);
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r + 0.3, 0.3, 64),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(g.hue / 360, 0.35, 0.86),
          roughness: 0.9,
        }),
      );
      disc.position.set(cx, -0.15, cz);
      scene.add(disc);
      const tag = label(g.name, `${list.length} people`);
      tag.position.set(cx, 5.2, cz - r * 0.75);
      scene.add(tag);
      // A sunflower spiral spaces people evenly over the disc.
      list.forEach((i, j) => {
        const a = j * 2.39996;
        const d = Math.sqrt(j + 0.5) * STEP * 0.6;
        spot.set(i, new THREE.Vector3(cx + Math.cos(a) * d, 0, cz + Math.sin(a) * d));
      });
    });

    const kit = createFigureKit(THREE);
    const looks = people.map((p) =>
      randomLook(p.row.person, {
        site: p.row.families.some((f) => SITE.has(f)),
        office: OFFICE.has(p.row.department),
      }),
    );
    const crowd = kit.crowd(looks, (i, o) => {
      const at = spot.get(i) ?? new THREE.Vector3(0, -100, 0);
      o.position.copy(at);
      // Facing the camera's side, with a little turn each.
      o.rotation.y = ((i * 37) % 60) / 100 - 0.3;
      o.scale.setScalar(0.72);
    });
    scene.add(crowd);

    // Markers: amber diamonds over borderline people, red rings round people over 100%.
    const marker = (geo: THREE.BufferGeometry, color: number, which: number[], y: number, flat: boolean) => {
      const m = new THREE.InstancedMesh(
        geo,
        new THREE.MeshStandardMaterial({ color, roughness: 0.4, emissive: color, emissiveIntensity: 0.25 }),
        Math.max(1, which.length),
      );
      m.count = which.length;
      const o = new THREE.Object3D();
      which.forEach((i, k) => {
        o.position.copy(spot.get(i)!).setY(y);
        o.rotation.set(flat ? Math.PI / 2 : 0, 0, 0);
        o.updateMatrix();
        m.setMatrixAt(k, o.matrix);
      });
      m.userData = { owner: Int32Array.from(which) };
      scene.add(m);
      return m;
    };
    const has = (f: (r: MemberRow) => boolean) =>
      people.map((p, i) => (f(p.row) && spot.has(i) ? i : -1)).filter((i) => i >= 0);
    const amber = marker(new THREE.OctahedronGeometry(0.22), 0xe0a020, has((r) => r.borderline), 2.5, false);
    const red = marker(new THREE.TorusGeometry(0.55, 0.06, 8, 32), 0xd9534f, has((r) => r.load > 1), 0.12, true);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.09, 10, 40),
      new THREE.MeshStandardMaterial({ color: 0x2b3a30, emissive: 0x2b3a30, emissiveIntensity: 0.3 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.visible = false;
    scene.add(ring);

    // Frame everything.
    const span = Math.max(cols, rows) * cell;
    camera.position.set(0, span * 0.42 + 10, span * 0.52 + 12);
    controls.target.set(0, 0, 0);
    controls.maxDistance = span * 3 + 60;
    controls.minDistance = 4;

    const index = new Map(people.map((p, i) => [p.row.person, i]));
    api.current = {
      index,
      setDim: (dim) => {
        kit.dimCrowd(crowd, dim);
        for (const m of [amber, red]) {
          const owner = m.userData.owner as Int32Array;
          const o = new THREE.Object3D();
          owner.forEach((i, k) => {
            o.position.copy(spot.get(i)!).setY(m === amber ? 2.5 : 0.12);
            o.rotation.set(m === red ? Math.PI / 2 : 0, 0, 0);
            o.scale.setScalar(dim(i) ? 0.0001 : 1); // hidden when its person is greyed out
            o.updateMatrix();
            m.setMatrixAt(k, o.matrix);
          });
          m.instanceMatrix.needsUpdate = true;
        }
      },
      setSelected: (i) => {
        ring.visible = i >= 0 && spot.has(i);
        if (ring.visible) ring.position.copy(spot.get(i)!).setY(0.08);
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
      const hit = ray.intersectObjects(crowd.children, false)[0];
      const owner = hit?.instanceId != null ? (hit.object.userData.owner as Int32Array)[hit.instanceId] : -1;
      pick.current(owner >= 0 ? people[owner].row.person : null);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    const resize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
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
  }, [people, groups]);

  // Filters and selection: recoloured in place, without rebuilding the scene.
  useEffect(() => {
    api.current?.setDim((i) => !match(people[i].row));
  }, [people, match]);
  useEffect(() => {
    const a = api.current;
    a?.setSelected(selected ? (a.index.get(selected) ?? -1) : -1);
  }, [selected, people]);

  return <div ref={host} className="scene" />;
}
