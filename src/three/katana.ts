import * as THREE from 'three';

// Everything here is procedural: geometry, textures and environment are built in code,
// so the page also works when opened straight from disk (no WebGL image loading).

export const BLADE_LEN = 7.2;
export const HANDLE_LEN = 2.5;
export const TOTAL_LEN = BLADE_LEN + HANDLE_LEN;
const SORI = 0.26; // depth of the blade curve

/**
 * The blade's curve is (very nearly) an arc of this radius, centred at (0, SORI_RADIUS).
 * Sliding the scabbard along that arc keeps it wrapped around the blade, the way a
 * real curved sword is drawn, instead of the blade cutting through the scabbard wall.
 */
export const SORI_RADIUS = (BLADE_LEN * BLADE_LEN) / (2 * SORI);
/** How far the scabbard travels along the arc to come fully clear of the tip. */
export const DRAW_DISTANCE = BLADE_LEN + 0.35;

// Blade runs along -x from the guard (x = 0), handle along +x. Edge faces down.
const curveY = (x: number) => SORI * Math.pow(x / BLADE_LEN, 2);

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

function canvasTex(w: number, h: number, draw: Draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

// Wavy temper line (hamon) path shared by the colour and roughness maps.
function hamonPath(g: CanvasRenderingContext2D, w: number, h: number) {
  g.beginPath();
  g.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) {
    const y =
      h * 0.64 +
      Math.sin(x * 0.045) * h * 0.05 +
      Math.sin(x * 0.11 + 1.3) * h * 0.035 +
      Math.sin(x * 0.021 + 4) * h * 0.04;
    g.lineTo(x, y);
  }
  g.lineTo(w, h);
  g.closePath();
}

function bladeTextures() {
  const map = canvasTex(2048, 128, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#8d97a4');
    grad.addColorStop(0.42, '#b9c1cb');
    grad.addColorStop(1, '#a3acb8');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // ridge line (shinogi)
    g.fillStyle = 'rgba(20,24,34,0.35)';
    g.fillRect(0, h * 0.37, w, 1.5);
    hamonPath(g, w, h);
    g.fillStyle = '#f6f8fb';
    g.shadowColor = '#ffffff';
    g.shadowBlur = 6;
    g.fill();
  });
  const rough = canvasTex(
    2048,
    128,
    (g, w, h) => {
      g.fillStyle = 'rgb(0,34,0)';
      g.fillRect(0, 0, w, h);
      hamonPath(g, w, h);
      g.fillStyle = 'rgb(0,112,0)';
      g.fill();
    },
    false
  );
  return { map, rough };
}

function buildBlade() {
  const N = 140;
  const H = 0.34;
  const T = 0.075;
  // cross-section, y from -0.5 (edge) to 0.5 (spine)
  const prof = [
    [-0.5, 0],
    [0.12, 0.5],
    [0.44, 0.4],
    [0.5, 0],
    [0.44, -0.4],
    [0.12, -0.5],
  ];
  const ring = (u: number) => {
    const x = -u * BLADE_LEN;
    const taper = 1 - u * 0.24;
    let hs = 1;
    let ts = 1;
    const tipStart = 0.92;
    if (u > tipStart) {
      const s = (u - tipStart) / (1 - tipStart);
      hs = Math.max(0.015, Math.sqrt(1 - s * s));
      ts = Math.max(0.05, 1 - s * 0.9);
    }
    const h = H * taper;
    const shift = ((1 - hs) * h) / 2; // keep the spine straight, raise the edge
    return prof.map(([py, pz]) => [x, curveY(x) + shift + py * h * hs, pz * T * ts, py + 0.5]);
  };
  const pos: number[] = [];
  const uv: number[] = [];
  let prev = ring(0);
  for (let i = 1; i <= N; i++) {
    const u = i / N;
    const cur = ring(u);
    for (let j = 0; j < prof.length; j++) {
      const k = (j + 1) % prof.length;
      const a = prev[j], b = prev[k], c = cur[k], d = cur[j];
      const u0 = (i - 1) / N;
      for (const [p, uu] of [[a, u0], [b, u0], [c, u], [a, u0], [c, u], [d, u]] as const) {
        pos.push(p[0], p[1], p[2]);
        uv.push(uu, p[3]);
      }
    }
    prev = cur;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const { map, rough } = bladeTextures();
  const mat = new THREE.MeshPhysicalMaterial({
    map,
    roughnessMap: rough,
    roughness: 1,
    metalness: 1,
    envMapIntensity: 1.5,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(geo, mat);
}

// Sweep an ellipse along the blade curve (used for the scabbard).
function buildSweep(x0: number, x1: number, ry: number, rz: number, segs = 90, radial = 28) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const x = x0 + (x1 - x0) * u;
    // round off the far end
    const endS = Math.max(0, (u - 0.965) / 0.035);
    const k = Math.sqrt(Math.max(0.0004, 1 - endS * endS));
    const taper = 1 - u * 0.14;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      pos.push(x, curveY(x) + Math.cos(a) * ry * taper * k, Math.sin(a) * rz * taper * k);
      uv.push(u, j / radial);
    }
  }
  const row = radial + 1;
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function flameTexture() {
  return canvasTex(2048, 512, (g, w, h) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // tongues of fire, densest near the mouth of the scabbard (u = 0 → left)
    for (let i = 0; i < 150; i++) {
      const t = Math.pow(rnd(), 1.9);
      const x = w * (0.015 + t * 0.6);
      const y = rnd() * h;
      const len = (50 + rnd() * 240) * (1 - t * 0.5);
      const wid = 7 + rnd() * 26;
      const rot = (rnd() - 0.5) * 0.9;
      // wrap around the v seam so the pattern tiles around the scabbard
      for (const oy of [-h, 0, h]) {
        g.save();
        g.translate(x, y + oy);
        g.rotate(rot);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, len);
        const hot = rnd();
        gr.addColorStop(0, hot > 0.82 ? 'rgba(255,196,120,0.95)' : 'rgba(255,58,36,0.9)');
        gr.addColorStop(0.35, 'rgba(226,26,22,0.5)');
        gr.addColorStop(1, 'rgba(120,0,0,0)');
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(-len * 0.25, 0);
        g.bezierCurveTo(len * 0.1, -wid, len * 0.55, -wid * 0.5, len, 0);
        g.bezierCurveTo(len * 0.5, wid * 0.4, len * 0.15, wid, -len * 0.25, 0);
        g.fill();
        g.restore();
      }
    }
  });
}

function wrapTexture() {
  // braided handle wrap: pale silk bands crossing over dark ray skin, leaving diamonds
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#15171d';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(210,214,225,${0.05 + Math.random() * 0.12})`;
      g.beginPath();
      g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.6, 0, 7);
      g.fill();
    }
    const band = (x0: number, y0: number, x1: number, y1: number) => {
      g.lineCap = 'butt';
      g.strokeStyle = '#77736b';
      g.lineWidth = 92;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.strokeStyle = '#ece9e1';
      g.lineWidth = 80;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.strokeStyle = 'rgba(120,116,106,0.55)';
      g.lineWidth = 1.5;
      for (let o = -30; o <= 30; o += 10) {
        const nx = (y1 - y0), ny = -(x1 - x0);
        const nl = Math.hypot(nx, ny);
        g.beginPath();
        g.moveTo(x0 + (nx / nl) * o, y0 + (ny / nl) * o);
        g.lineTo(x1 + (nx / nl) * o, y1 + (ny / nl) * o);
        g.stroke();
      }
    };
    band(-w * 0.5, -h * 0.5, w * 1.5, h * 1.5);
    band(-w * 0.5, h * 1.5, w * 1.5, -h * 0.5);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 11);
  return t;
}

export interface Katana {
  /** carries the pose of the whole katana (position, scale, tilt) */
  root: THREE.Group;
  /** blade, guard and handle: rolls around its own axis inside `root` */
  sword: THREE.Group;
  /** scabbard, child of `root`: its transform is relative to the un-rolled sword */
  saya: THREE.Group;
  /** faint copies of the scabbard, used as a motion trail while it tumbles */
  ghosts: { group: THREE.Group; setOpacity(alpha: number): void }[];
  lacquer: THREE.MeshPhysicalMaterial;
}

export function createKatana(): Katana {
  const gold = new THREE.MeshStandardMaterial({ color: 0xd2a850, metalness: 1, roughness: 0.28, envMapIntensity: 1.3 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x14161c, metalness: 0.85, roughness: 0.42 });
  const lacquer = new THREE.MeshPhysicalMaterial({
    color: 0x07080c,
    metalness: 0.2,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    emissive: 0xffffff,
    emissiveMap: flameTexture(),
    emissiveIntensity: 1.7,
  });
  const cordRed = new THREE.MeshStandardMaterial({ color: 0xd9271f, roughness: 0.7 });

  const sword = new THREE.Group(); // blade + guard + handle
  const saya = new THREE.Group(); // scabbard
  const root = new THREE.Group();
  root.add(sword, saya);
  root.rotation.order = 'ZYX'; // yaw, then tilt on screen

  // ellipse band around the x axis
  const band = (x: number, len: number, ry: number, rz: number, mat: THREE.Material, parent: THREE.Group = sword, y = 0) => {
    const geo = new THREE.CylinderGeometry(1, 1, len, 40);
    geo.rotateZ(Math.PI / 2);
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(1, ry, rz);
    m.position.set(x, y, 0);
    parent.add(m);
    return m;
  };

  // ── blade
  sword.add(buildBlade());
  const habaki = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.1), gold);
  habaki.position.set(-0.17, 0, 0);
  sword.add(habaki);

  // ── guard (tsuba) with gold inlay
  const R = 0.5;
  const tsubaGeo = new THREE.CylinderGeometry(R, R, 0.075, 72);
  tsubaGeo.rotateZ(Math.PI / 2);
  const tsuba = new THREE.Mesh(tsubaGeo, iron);
  tsuba.scale.set(1, 1, 0.92);
  sword.add(tsuba);
  const rimGeo = new THREE.TorusGeometry(R, 0.03, 14, 80);
  rimGeo.rotateY(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, gold);
  rim.scale.set(1, 1, 0.92);
  sword.add(rim);
  const petal = new THREE.SphereGeometry(0.05, 14, 10);
  for (const side of [-1, 1]) {
    const innerGeo = new THREE.TorusGeometry(R * 0.5, 0.014, 10, 60);
    innerGeo.rotateY(Math.PI / 2);
    const inner = new THREE.Mesh(innerGeo, gold);
    inner.position.x = side * 0.04;
    sword.add(inner);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const cy = Math.cos(a) * R * 0.74;
      const cz = Math.sin(a) * R * 0.74 * 0.92;
      // five-petal blossom
      for (let p = 0; p < 6; p++) {
        const m = new THREE.Mesh(petal, gold);
        const pa = (p / 5) * Math.PI * 2;
        const pr = p === 5 ? 0 : 0.055;
        m.position.set(side * 0.042, cy + Math.cos(pa) * pr, cz + Math.sin(pa) * pr);
        m.scale.set(0.35, p === 5 ? 0.7 : 1, p === 5 ? 0.7 : 1);
        sword.add(m);
      }
    }
  }
  band(-0.055, 0.03, 0.24, 0.14, gold);
  band(0.055, 0.03, 0.24, 0.14, gold);

  // ── handle (tsuka)
  const wrap = wrapTexture();
  const handleGeo = new THREE.CylinderGeometry(1, 0.94, HANDLE_LEN, 48, 1, true);
  handleGeo.rotateZ(-Math.PI / 2);
  const handle = new THREE.Mesh(
    handleGeo,
    new THREE.MeshStandardMaterial({ map: wrap, bumpMap: wrap, bumpScale: 2.2, roughness: 0.78, metalness: 0.05 })
  );
  handle.scale.set(1, 0.2, 0.135);
  handle.position.set(0.08 + HANDLE_LEN / 2, 0, 0);
  sword.add(handle);
  band(0.17, 0.2, 0.215, 0.148, gold); // collar
  band(0.08 + HANDLE_LEN + 0.06, 0.16, 0.2, 0.14, iron); // pommel
  const capGeo = new THREE.SphereGeometry(1, 28, 16);
  const cap = new THREE.Mesh(capGeo, gold);
  cap.scale.set(0.07, 0.19, 0.13);
  cap.position.set(0.08 + HANDLE_LEN + 0.14, 0, 0);
  sword.add(cap);
  for (const side of [-1, 1]) {
    const menuki = new THREE.Mesh(capGeo, gold);
    menuki.scale.set(0.26, 0.06, 0.03);
    menuki.position.set(0.08 + HANDLE_LEN * 0.52, 0.02, side * 0.135);
    sword.add(menuki);
  }

  // ── scabbard (saya)
  const SRY = 0.25;
  const SRZ = 0.125;
  saya.add(new THREE.Mesh(buildSweep(-0.09, -(BLADE_LEN + 0.3), SRY, SRZ), lacquer));
  band(-0.13, 0.1, SRY + 0.012, SRZ + 0.012, gold, saya);
  band(-1.5, 0.14, SRY + 0.006, SRZ + 0.01, cordRed, saya, curveY(-1.5));
  band(-1.72, 0.05, SRY + 0.004, SRZ + 0.008, gold, saya, curveY(-1.72));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), iron);
  knob.scale.set(0.16, 0.07, 0.07);
  knob.position.set(-1.5, curveY(-1.5), SRZ + 0.04);
  saya.add(knob);
  const tipX = -(BLADE_LEN + 0.12);
  band(tipX, 0.22, SRY * 0.86 + 0.01, SRZ * 0.86 + 0.01, gold, saya, curveY(tipX));

  const ghosts = [0, 1, 2].map(() => {
    const group = saya.clone(true);
    const materials: THREE.Material[] = [];
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const material = (object.material as THREE.Material).clone();
      material.transparent = true;
      material.depthWrite = false;
      material.opacity = 0;
      object.material = material;
      materials.push(material);
    });
    group.visible = false;
    root.add(group);
    return {
      group,
      setOpacity(alpha: number) {
        group.visible = alpha > 0.004;
        for (const material of materials) material.opacity = alpha;
      },
    };
  });

  return { root, sword, saya, ghosts, lacquer };
}
