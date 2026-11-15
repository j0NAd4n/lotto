// World: terrain, ground texture, buildings and collision for the Gwanghwamun / Jongno area.
// Coordinates: local metres, x = east, n = north. Three.js: (x, up, -n).
import * as THREE from 'three';

const ORIGIN = [37.5720, 126.9769];
const MX = 111320 * Math.cos(ORIGIN[0] * Math.PI / 180);
const MY = 110540;

export function toLocal(lat, lon) {
  return { x: (lon - ORIGIN[1]) * MX, n: (lat - ORIGIN[0]) * MY };
}

// Deterministic pseudo random
function hash(i) {
  let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export class World {
  constructor(scene, terrainData, cityData, quality) {
    this.scene = scene;
    this.quality = quality;
    this.setupTerrain(terrainData);
    this.city = cityData;
    this.buildings = [];
    this.groundCanvas = this.paintGround(cityData, quality.groundTex);
    this.buildTerrainMesh();
    if (cityData) this.buildCity(cityData);
    this.buildSky();
  }

  // ---------- Terrain ----------
  setupTerrain(t) {
    const [S, W, N, E] = t.bbox;
    const sw = toLocal(S, W), ne = toLocal(N, E);
    this.tx0 = sw.x; this.tx1 = ne.x; this.tn0 = sw.n; this.tn1 = ne.n;
    this.grid = t.grid;
    this.h = Float32Array.from(t.h);
  }

  rawHeight(x, n) {
    const g = this.grid;
    const u = (x - this.tx0) / (this.tx1 - this.tx0) * (g - 1);
    const v = (this.tn1 - n) / (this.tn1 - this.tn0) * (g - 1); // row 0 = north
    const cu = Math.min(Math.max(u, 0), g - 1.001), cv = Math.min(Math.max(v, 0), g - 1.001);
    const i = Math.floor(cu), j = Math.floor(cv), fu = cu - i, fv = cv - j;
    const h = this.h;
    const a = h[j * g + i], b = h[j * g + i + 1], c = h[(j + 1) * g + i], d = h[(j + 1) * g + i + 1];
    return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv;
  }

  // Ground height with a smooth fade to 0 outside the DEM area
  heightAt(x, n) {
    const m = 400;
    const dx = Math.max(this.tx0 - x, x - this.tx1, 0);
    const dn = Math.max(this.tn0 - n, n - this.tn1, 0);
    const inset = Math.min(x - this.tx0, this.tx1 - x, n - this.tn0, this.tn1 - n);
    let f = 1;
    if (dx > 0 || dn > 0) f = 0;
    else if (inset < m) f = inset / m;
    f = f * f * (3 - 2 * f);
    return f > 0 ? this.rawHeight(x, n) * f : 0;
  }

  paintGround(city, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const W = this.tx1 - this.tx0, H = this.tn1 - this.tn0;
    const sx = size / W, sy = size / H;
    this.groundMap = { sx, sy };
    // base: urban ground, greener where the terrain rises (mountains)
    const img = g.createImageData(size, size);
    const step = 4;
    for (let py = 0; py < size; py += step) {
      for (let px = 0; px < size; px += step) {
        const x = this.tx0 + px / sx, n = this.tn1 - py / sy;
        const h = this.rawHeight(x, n);
        const t = Math.min(Math.max((h - 35) / 50, 0), 1);
        const nz = hash(px * 7919 + py) * 14 - 7;
        const r = (150 * (1 - t) + 58 * t + nz) | 0, gg = (146 * (1 - t) + 92 * t + nz) | 0, b = (136 * (1 - t) + 52 * t + nz) | 0;
        for (let yy = 0; yy < step; yy++) for (let xx = 0; xx < step; xx++) {
          const o = ((py + yy) * size + px + xx) * 4;
          img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = b; img.data[o + 3] = 255;
        }
      }
    }
    g.putImageData(img, 0, 0);
    if (!city) return c;
    const s = city.scale;
    const P = (arr, k) => [(arr[k] / s - this.tx0) * sx, (this.tn1 - arr[k + 1] / s) * sy];
    const poly = (arr, start, fill) => {
      g.beginPath();
      for (let k = start; k < arr.length; k += 2) { const [x, y] = P(arr, k); k === start ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.closePath(); g.fillStyle = fill; g.fill();
    };
    for (const a of city.green) poly(a, 0, '#5d8a4a');
    for (const a of city.water) poly(a, 0, '#3f6f8f');
    g.lineCap = 'round'; g.lineJoin = 'round';
    const line = (arr, w, col) => {
      g.beginPath();
      for (let k = 1; k < arr.length; k += 2) { const [x, y] = P(arr, k); k === 1 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.lineWidth = Math.max(1, w * sx); g.strokeStyle = col; g.stroke();
    };
    for (const a of city.rivers) line(a, a[0], '#3f6f8f');
    const roads = [...city.roads].sort((a, b) => a[0] - b[0]);
    for (const a of roads) line(a, a[0] + 2, '#8a8780');   // sidewalk edge
    for (const a of roads) line(a, a[0], '#4a4c50');       // asphalt
    for (const a of roads) if (a[0] >= 13) line(a, 0.4, 'rgba(240,230,200,0.55)'); // centre line
    return c;
  }

  buildTerrainMesh() {
    const segs = this.grid - 1;
    const W = this.tx1 - this.tx0, H = this.tn1 - this.tn0;
    const geo = new THREE.PlaneGeometry(W, H, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const cx = (this.tx0 + this.tx1) / 2, cn = (this.tn0 + this.tn1) / 2;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + cx, n = -pos.getZ(i) + cn;
      pos.setXYZ(i, x, this.heightAt(x, n), -n);
    }
    geo.computeVertexNormals();
    const tex = new THREE.CanvasTexture(this.groundCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    const mesh = new THREE.Mesh(geo, mat);
    this.scene.add(mesh);
    // Endless outer ground
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(80000, 80000), new THREE.MeshLambertMaterial({ color: 0x8c8a7e }));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -0.5;
    this.scene.add(outer);
  }

  // ---------- Buildings ----------
  windowTexture() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#7d8a99'; g.fillRect(10, 18, 44, 30);
    g.fillStyle = '#9fb0c2'; g.fillRect(12, 20, 18, 26);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  buildCity(city) {
    const s = city.scale;
    const wallPos = [], wallNor = [], wallCol = [], wallUv = [];
    const roofPos = [], roofCol = [];
    const palette = [[0.86, 0.84, 0.80], [0.78, 0.76, 0.72], [0.70, 0.72, 0.74], [0.88, 0.82, 0.72], [0.62, 0.64, 0.66], [0.80, 0.70, 0.62]];
    const glass = [[0.55, 0.66, 0.76], [0.48, 0.58, 0.66], [0.62, 0.70, 0.74]];
    const cell = 30;
    this.cell = cell;
    this.cells = new Map();
    let idx = 0;
    for (const b of city.b) {
      const h = b[0] / s, mh = b[1] / s, kind = b[2];
      const ring = [];
      for (let k = 3; k < b.length; k += 2) ring.push([b[k] / s, b[k + 1] / s]);
      let base = Infinity, minx = Infinity, maxx = -Infinity, minn = Infinity, maxn = -Infinity;
      for (const [x, n] of ring) {
        base = Math.min(base, this.heightAt(x, n));
        minx = Math.min(minx, x); maxx = Math.max(maxx, x); minn = Math.min(minn, n); maxn = Math.max(maxn, n);
      }
      const bottom = base + mh - (mh > 0 ? 0 : 1), top = base + h;
      const rec = { ring, bottom, top, minx, maxx, minn, maxn, kind };
      this.buildings.push(rec);
      for (let cx = Math.floor(minx / cell); cx <= Math.floor(maxx / cell); cx++)
        for (let cn = Math.floor(minn / cell); cn <= Math.floor(maxn / cell); cn++) {
          const key = cx * 100000 + cn;
          let arr = this.cells.get(key); if (!arr) this.cells.set(key, arr = []);
          arr.push(rec);
        }
      // colours
      const r = hash(idx++);
      let col;
      if (kind === 1) col = [0.80, 0.74, 0.66];
      else if (h > 40 && r < 0.6) col = glass[(r * 30 | 0) % glass.length];
      else col = palette[(r * 60 | 0) % palette.length];
      const shade = 0.9 + hash(idx * 3) * 0.2;
      const wc = col.map(v => v * shade);
      const windows = kind !== 1 && h > 7;
      // walls
      let per = 0;
      for (let i = 0; i < ring.length; i++) {
        const [x1, n1] = ring[i], [x2, n2] = ring[(i + 1) % ring.length];
        const len = Math.hypot(x2 - x1, n2 - n1);
        if (len < 0.01) continue;
        const nx = (n2 - n1) / len, nz = (x2 - x1) / len;
        const A = [x1, bottom, -n1], B = [x2, bottom, -n2], C = [x2, top, -n2], D = [x1, top, -n1];
        wallPos.push(...A, ...B, ...C, ...A, ...C, ...D);
        for (let k = 0; k < 6; k++) { wallNor.push(nx, 0, nz); wallCol.push(...wc); }
        if (windows) {
          const u0 = per / 4, u1 = (per + len) / 4, v0 = (bottom - base) / 3.6, v1 = (top - base) / 3.6;
          wallUv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
        } else for (let k = 0; k < 6; k++) wallUv.push(0.02, 0.02);
        per += len;
      }
      // roof
      const contour = ring.map(([x, n]) => new THREE.Vector2(x, n));
      let tris;
      try { tris = THREE.ShapeUtils.triangulateShape(contour, []); } catch { tris = []; }
      const rc = kind === 1 ? [0.24, 0.26, 0.29] : wc.map(v => v * 0.72);
      for (const t of tris) {
        let [a, bb, c] = t;
        const [ax, an] = ring[a], [bx, bn] = ring[bb], [cx, cn] = ring[c];
        if ((bx - ax) * (cn - an) - (bn - an) * (cx - ax) < 0) [bb, c] = [c, bb];
        for (const v of [a, bb, c]) { roofPos.push(ring[v][0], top, -ring[v][1]); roofCol.push(...rc); }
      }
    }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wallPos, 3));
    wg.setAttribute('normal', new THREE.Float32BufferAttribute(wallNor, 3));
    wg.setAttribute('color', new THREE.Float32BufferAttribute(wallCol, 3));
    wg.setAttribute('uv', new THREE.Float32BufferAttribute(wallUv, 2));
    const walls = new THREE.Mesh(wg, new THREE.MeshLambertMaterial({ vertexColors: true, map: this.windowTexture() }));
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(roofPos, 3));
    rg.setAttribute('color', new THREE.Float32BufferAttribute(roofCol, 3));
    rg.computeVertexNormals();
    const roofs = new THREE.Mesh(rg, new THREE.MeshLambertMaterial({ vertexColors: true }));
    this.scene.add(walls, roofs);
    this.triangles = (wallPos.length + roofPos.length) / 9;
  }

  buildSky() {
    const geo = new THREE.SphereGeometry(1, 24, 12);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x3d7fd6) }, bottom: { value: new THREE.Color(0xd8e6f0) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float t = clamp(vP.y*1.6,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, pow(t,0.7)),1.0); }',
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);
  }

  // ---------- Collision ----------
  // Returns the building hit by a sphere at (x, y, n) with radius r, or null.
  buildingAt(x, y, n, r) {
    const cell = this.cell;
    if (!this.cells) return null;
    for (let cx = Math.floor((x - r) / cell); cx <= Math.floor((x + r) / cell); cx++)
      for (let cn = Math.floor((n - r) / cell); cn <= Math.floor((n + r) / cell); cn++) {
        const arr = this.cells.get(cx * 100000 + cn);
        if (!arr) continue;
        for (const b of arr) {
          if (y > b.top + r || y < b.bottom - r) continue;
          if (x < b.minx - r || x > b.maxx + r || n < b.minn - r || n > b.maxn + r) continue;
          if (insideOrNear(b.ring, x, n, r)) return b;
        }
      }
    return null;
  }

  // Line of sight test between two points (three.js vectors)
  lineOfSight(a, b) {
    const d = a.distanceTo(b);
    const steps = Math.ceil(d / 4);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, z = a.z + (b.z - a.z) * t;
      if (y < this.heightAt(x, -z) - 0.5) return false;
      if (this.buildingAt(x, y, -z, 0)) return false;
    }
    return true;
  }
}

function insideOrNear(ring, x, n, r) {
  let inside = false;
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, ni] = ring[i], [xj, nj] = ring[j];
    if ((ni > n) !== (nj > n) && x < (xj - xi) * (n - ni) / (nj - ni) + xi) inside = !inside;
    if (r > 0) {
      const dx = xj - xi, dn = nj - ni;
      const l2 = dx * dx + dn * dn || 1;
      const t = Math.max(0, Math.min(1, ((x - xi) * dx + (n - ni) * dn) / l2));
      const ex = xi + t * dx - x, en = ni + t * dn - n;
      best = Math.min(best, ex * ex + en * en);
    }
  }
  return inside || best < r * r;
}
