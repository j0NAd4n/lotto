// Fallback: download OpenStreetMap data straight from the phone via Overpass and convert it
// to the same compact format produced by tools/build_city.py.
import { toLocal } from './world.js';

const BBOX = '37.562,126.962,37.592,127.002';
const ROAD_W = { motorway: 22, trunk: 20, primary: 18, secondary: 13, tertiary: 10, residential: 6, unclassified: 6, pedestrian: 8 };

export async function fetchCityFromOverpass(onStatus) {
  const q = `[out:json][timeout:90];(way["building"](${BBOX});way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|pedestrian)$"](${BBOX});way["waterway"](${BBOX});way["natural"="water"](${BBOX});way["leisure"="park"](${BBOX});way["landuse"~"^(grass|forest)$"](${BBOX});way["natural"="wood"](${BBOX}););out body;>;out skel qt;`;
  const servers = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  let data = null;
  for (const s of servers) {
    try {
      onStatus?.('OpenStreetMap에서 서울 건물 데이터를 받는 중…');
      const r = await fetch(s, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      if (r.ok) { data = await r.json(); break; }
    } catch { /* try next */ }
  }
  if (!data) throw new Error('Overpass 다운로드 실패');
  onStatus?.('3D 도시 변환 중…');
  return convert(data);
}

const num = v => { const m = /([0-9]+(?:\.[0-9]+)?)/.exec(v ?? ''); return m ? parseFloat(m[1]) : null; };

function convert(data) {
  const nodes = new Map();
  for (const e of data.elements) if (e.type === 'node') nodes.set(e.id, toLocal(e.lat, e.lon));
  const out = { scale: 10, b: [], roads: [], water: [], rivers: [], green: [] };
  const flat = pts => pts.flatMap(p => [Math.round(p.x * 10), Math.round(p.n * 10)]);
  for (const e of data.elements) {
    if (e.type !== 'way') continue;
    const t = e.tags || {};
    const pts = e.nodes.map(n => nodes.get(n)).filter(Boolean);
    if (pts.length < 2) continue;
    const closed = e.nodes[0] === e.nodes[e.nodes.length - 1];
    if (t.building && closed) {
      let ring = pts.slice(0, -1);
      if (ring.length < 3) continue;
      let a = 0;
      for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; a += p.x * q.n - q.x * p.n; }
      a /= 2;
      if (Math.abs(a) < 8) continue;
      if (a < 0) ring = ring.reverse();
      let h = num(t.height) ?? (num(t['building:levels']) != null ? num(t['building:levels']) * 3.3 + 1 : null);
      const fa = Math.abs(a);
      if (h == null) h = ['house', 'hut', 'shed', 'garage', 'roof'].includes(t.building) ? 4.5 : t.building === 'apartments' ? 35 : t.historic ? 9 : fa < 120 ? 5 : fa < 400 ? 9 : fa < 1500 ? 15 : 22;
      const mh = num(t.min_height) ?? (num(t['building:min_level']) ?? 0) * 3.3;
      const kind = t.historic || ['temple', 'shrine', 'palace'].includes(t.building) ? 1 : 0;
      out.b.push([Math.round(Math.min(Math.max(h, 2.5), 600) * 10), Math.round(mh * 10), kind, ...flat(ring)]);
    } else if (t.highway) out.roads.push([ROAD_W[t.highway] || 6, ...flat(pts)]);
    else if (t.waterway) out.rivers.push([['river', 'stream', 'canal'].includes(t.waterway) ? 12 : 4, ...flat(pts)]);
    else if (closed && t.natural === 'water') out.water.push(flat(pts.slice(0, -1)));
    else if (closed) out.green.push(flat(pts.slice(0, -1)));
  }
  return out;
}
