// Missions: photo (촬영), recon checkpoints (정찰), race rings and high-altitude orbit.
import * as THREE from 'three';
import { toLocal } from './world.js';

export const LANDMARKS = {
  gwanghwamun: { name: '광화문', lat: 37.57594, lon: 126.97688, h: 12 },
  geunjeongjeon: { name: '경복궁 근정전', lat: 37.57860, lon: 126.97700, h: 14 },
  gyeonghoeru: { name: '경회루', lat: 37.57966, lon: 126.97597, h: 8 },
  sejong: { name: '세종대왕 동상', lat: 37.57266, lon: 126.97690, h: 6 },
  yisunsin: { name: '이순신 장군 동상', lat: 37.57103, lon: 126.97692, h: 10 },
  cheongwadae: { name: '청와대', lat: 37.58660, lon: 126.97480, h: 10 },
  bugaksan: { name: '북악산 정상', lat: 37.59340, lon: 126.97170, h: 2 },
  inwangsan: { name: '인왕산 정상', lat: 37.58500, lon: 126.95780, h: 2 },
  jongmyo: { name: '종묘 정전', lat: 37.57470, lon: 126.99390, h: 8 },
  injeongjeon: { name: '창덕궁 인정전', lat: 37.57940, lon: 126.99140, h: 12 },
  bosingak: { name: '보신각', lat: 37.56985, lon: 126.98300, h: 10 },
  cityhall: { name: '서울시청', lat: 37.56650, lon: 126.97800, h: 20 },
  cheonggye: { name: '청계광장', lat: 37.56900, lon: 126.97790, h: 2 },
  jogyesa: { name: '조계사', lat: 37.57400, lon: 126.98170, h: 10 },
  tapgol: { name: '탑골공원', lat: 37.57110, lon: 126.98830, h: 4 },
};

const P = (lat, lon) => ({ lat, lon });

export const MISSIONS = [
  {
    id: 'm1', for: ['multi', 'fpv'], title: '광화문 정면 촬영',
    desc: '광화문 앞으로 날아가 카메라 뷰에서 광화문을 화면 중앙에 맞추고 촬영하세요.',
    steps: [{ kind: 'photo', target: 'gwanghwamun', minD: 15, maxD: 220 }],
  },
  {
    id: 'm2', for: ['multi', 'fpv'], title: '동상 연속 촬영',
    desc: '이순신 장군 동상과 세종대왕 동상을 차례로 촬영하세요.',
    steps: [{ kind: 'photo', target: 'yisunsin', minD: 8, maxD: 120 }, { kind: 'photo', target: 'sejong', minD: 8, maxD: 120 }],
  },
  {
    id: 'm3', for: ['multi', 'fpv'], title: '근정전 부감 촬영',
    desc: '지상 60m 이상 고도에서 경복궁 근정전을 내려다보며 촬영하세요.',
    steps: [{ kind: 'photo', target: 'geunjeongjeon', minD: 40, maxD: 450, minAgl: 60 }],
  },
  {
    id: 'm4', for: ['multi', 'fpv', 'wing'], title: '궁궐 기록 촬영',
    desc: '경회루 → 창덕궁 인정전 → 종묘 정전 순서로 기록 사진을 남기세요.',
    steps: [{ kind: 'photo', target: 'gyeonghoeru', minD: 20, maxD: 500 }, { kind: 'photo', target: 'injeongjeon', minD: 20, maxD: 500 }, { kind: 'photo', target: 'jongmyo', minD: 20, maxD: 500 }],
  },
  {
    id: 'm5', for: ['multi', 'fpv', 'wing'], title: '북악산 등정',
    desc: '북악산 정상 상공에 도달한 뒤 청와대를 촬영하세요.',
    steps: [{ kind: 'reach', target: 'bugaksan', radius: 60, altMin: 10, altMax: 200 }, { kind: 'photo', target: 'cheongwadae', minD: 50, maxD: 1200 }],
  },
  {
    id: 'r1', for: ['fpv', 'multi'], title: 'FPV 레이스: 세종대로',
    desc: '서울시청에서 광화문까지 세종대로 위의 링을 통과하세요. 기록이 측정됩니다.', race: true,
    rings: [P(37.5672, 126.9779), P(37.5689, 126.9772), P(37.5703, 126.9769), P(37.5716, 126.9770), P(37.5731, 126.9768), P(37.5745, 126.9769), P(37.5755, 126.9772)],
    ringAlt: 18, ringR: 9, start: P(37.5662, 126.9780), startHeading: 0,
  },
  {
    id: 'w1', for: ['wing', 'multi', 'fpv'], title: '청계천 저공 정찰',
    desc: '지상 80m 이하로 청계천을 따라 체크포인트를 통과하세요.',
    steps: [
      { kind: 'reach', target: P(37.56900, 126.97900), radius: 70, altMin: 5, altMax: 80 },
      { kind: 'reach', target: P(37.56890, 126.98400), radius: 70, altMin: 5, altMax: 80 },
      { kind: 'reach', target: P(37.56870, 126.98900), radius: 70, altMin: 5, altMax: 80 },
      { kind: 'reach', target: P(37.56900, 126.99500), radius: 70, altMin: 5, altMax: 80 },
    ],
  },
  {
    id: 'w2', for: ['wing'], title: '도심 정찰 루트',
    desc: '종로 일대 정찰 경로를 비행하고 보신각을 촬영하세요.',
    steps: [
      { kind: 'reach', target: 'cityhall', radius: 120, altMin: 60, altMax: 600 },
      { kind: 'reach', target: 'jongmyo', radius: 120, altMin: 60, altMax: 600 },
      { kind: 'reach', target: 'injeongjeon', radius: 120, altMin: 60, altMax: 600 },
      { kind: 'photo', target: 'bosingak', minD: 60, maxD: 1500 },
    ],
  },
  {
    id: 'h1', for: ['wing'], title: '고고도 감시: 경복궁',
    desc: '고도 600m 이상에서 경복궁 반경 2.5km 안에 60초간 체공한 뒤, 근정전을 고배율로 촬영하세요.',
    steps: [
      { kind: 'orbit', target: 'geunjeongjeon', radius: 2500, altMin: 600, time: 60 },
      { kind: 'photo', target: 'geunjeongjeon', minD: 300, maxD: 6000, maxFrame: 0.25 },
    ],
  },
];

function resolve(t) {
  const p = typeof t === 'string' ? LANDMARKS[t] : t;
  const l = toLocal(p.lat, p.lon);
  return { ...l, name: p.name || '체크포인트', h: p.h ?? 0 };
}

export class MissionRunner {
  constructor(scene, world) {
    this.scene = scene; this.world = world;
    this.group = new THREE.Group(); scene.add(this.group);
    this.active = null;
  }

  missionsFor(type) { return MISSIONS.filter(m => m.for.includes(type)); }

  clear() {
    this.group.clear();
    this.active = null;
  }

  start(m) {
    this.clear();
    this.active = m; this.step = 0; this.time = 0; this.orbitT = 0; this.done = false; this.photos = [];
    if (m.race) {
      this.rings = m.rings.map(p => {
        const l = toLocal(p.lat, p.lon);
        const y = this.world.heightAt(l.x, l.n) + m.ringAlt;
        return { x: l.x, n: l.n, y };
      });
      this.rings.forEach((r, i) => {
        const next = this.rings[i + 1] || r, prev = this.rings[i - 1] || r;
        const ang = Math.atan2((next.x - prev.x), (next.n - prev.n));
        const mesh = new THREE.Mesh(new THREE.TorusGeometry(m.ringR, 0.6, 8, 32),
          new THREE.MeshBasicMaterial({ color: i === 0 ? 0x00ff88 : 0xffaa00, transparent: true, opacity: 0.85 }));
        mesh.position.set(r.x, r.y, -r.n);
        mesh.rotation.y = -ang;
        r.mesh = mesh; r.ang = ang;
        this.group.add(mesh);
      });
      this.raceStarted = false;
    } else this.placeMarker();
  }

  placeMarker() {
    this.group.clear();
    const s = this.active.steps[this.step];
    if (!s) return;
    const t = resolve(s.target);
    const gy = this.world.heightAt(t.x, t.n);
    const color = s.kind === 'photo' ? 0xffd200 : 0x00e0ff;
    const tall = s.kind === 'orbit' ? 2000 : 400;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(s.kind === 'orbit' ? 20 : 3, s.kind === 'orbit' ? 20 : 3, tall, 12, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.set(t.x, gy + tall / 2, -t.n);
    this.group.add(beam);
    if (s.kind === 'reach' || s.kind === 'orbit') {
      const r = s.radius;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, Math.max(1, r * 0.03), 6, 64),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(t.x, gy + (s.altMin + Math.min(s.altMax ?? s.altMin + 200, s.altMin + 400)) / 2, -t.n);
      this.group.add(ring);
    }
    this.target = { ...t, y: gy + t.h, gy };
  }

  // Returns a status object for the HUD
  update(dt, ac) {
    const m = this.active;
    if (!m || this.done) return;
    this.time += dt;
    if (m.race) return this.updateRace(dt, ac);
    const s = m.steps[this.step];
    const t = this.target;
    const dx = ac.pos.x - t.x, dn = -ac.pos.z - t.n;
    const dist = Math.hypot(dx, dn);
    const agl = ac.pos.y - t.gy;
    if (s.kind === 'reach') {
      if (dist < s.radius && agl >= s.altMin && agl <= s.altMax) this.advance();
    } else if (s.kind === 'orbit') {
      if (dist < s.radius && agl >= s.altMin) this.orbitT += dt;
      if (this.orbitT >= s.time) this.advance();
    }
  }

  updateRace(dt, ac) {
    const r = this.rings[this.step];
    if (!r) return;
    const dx = ac.pos.x - r.x, dy = ac.pos.y - r.y, dn = -ac.pos.z - r.n;
    // distance along ring axis vs radial
    const ax = Math.sin(r.ang), an = Math.cos(r.ang);
    const along = dx * ax + dn * an;
    const radial = Math.hypot(dx - along * ax, dn - along * an, dy);
    if (Math.abs(along) < 3 && radial < this.active.ringR) {
      r.mesh.material.color.set(0x44ff44); r.mesh.material.opacity = 0.25;
      if (this.step === 0) { this.raceStarted = true; this.time = 0; }
      this.step++;
      const n = this.rings[this.step];
      if (n) n.mesh.material.color.set(0x00ff88);
      else this.finish();
      this.flash = `링 ${this.step}/${this.rings.length}`;
    }
    if (!this.raceStarted) this.time = 0;
  }

  advance() {
    this.step++;
    this.flash = '체크포인트 통과!';
    if (this.step >= this.active.steps.length) this.finish();
    else this.placeMarker();
  }

  finish() {
    this.done = true;
    this.group.clear();
    this.resultTime = this.time;
  }

  currentStep() { return this.active && !this.done && !this.active.race ? this.active.steps[this.step] : null; }

  // Evaluate a photo taken with the gimbal camera
  shutter(camera, ac) {
    const s = this.currentStep();
    if (!s || s.kind !== 'photo') return null;
    const t = this.target;
    const p = new THREE.Vector3(t.x, t.y, -t.n);
    const camPos = camera.getWorldPosition(new THREE.Vector3());
    const dist = camPos.distanceTo(p);
    const ndc = p.clone().project(camera);
    const inFront = ndc.z < 1 && ndc.z > -1;
    const frame = s.maxFrame ?? 0.4;
    const centered = inFront && Math.abs(ndc.x) < frame && Math.abs(ndc.y) < frame;
    const agl = ac.pos.y - this.world.heightAt(ac.pos.x, -ac.pos.z);
    let reason = null;
    if (!centered) reason = `${t.name}이(가) 화면 중앙에 없습니다`;
    else if (dist > s.maxD) reason = `너무 멉니다 (${dist.toFixed(0)}m, 최대 ${s.maxD}m)`;
    else if (dist < s.minD) reason = `너무 가깝습니다 (${dist.toFixed(0)}m)`;
    else if (s.minAgl && agl < s.minAgl) reason = `고도가 낮습니다 (지상 ${agl.toFixed(0)}m, ${s.minAgl}m 이상 필요)`;
    else if (!this.world.lineOfSight(camPos, p)) reason = '건물에 가려 보이지 않습니다';
    if (reason) return { ok: false, reason };
    const score = Math.round(100 - Math.hypot(ndc.x, ndc.y) / frame * 40);
    this.photos.push({ name: t.name, score });
    this.advance();
    return { ok: true, score, name: t.name };
  }

  hud(ac) {
    const m = this.active;
    if (!m) return null;
    if (this.done) {
      const avg = this.photos.length ? Math.round(this.photos.reduce((a, b) => a + b.score, 0) / this.photos.length) : null;
      return { done: true, title: m.title, time: this.resultTime, score: avg, photos: this.photos };
    }
    if (m.race) {
      const r = this.rings[this.step];
      return { title: m.title, text: this.raceStarted ? `링 ${this.step}/${this.rings.length}` : '첫 번째 링(초록)을 통과하면 시작', time: this.raceStarted ? this.time : null, target: r ? new THREE.Vector3(r.x, r.y, -r.n) : null, targetName: '다음 링' };
    }
    const s = m.steps[this.step];
    const t = this.target;
    let text;
    if (s.kind === 'photo') text = `📷 ${t.name} 촬영 (${s.minD}~${s.maxD}m${s.minAgl ? `, 지상 ${s.minAgl}m↑` : ''})`;
    else if (s.kind === 'reach') text = `📍 ${t.name} 도달 (지상 ${s.altMin}~${s.altMax}m)`;
    else text = `🛰 반경 ${s.radius / 1000}km · 고도 ${s.altMin}m↑ 체공 ${Math.floor(this.orbitT)}/${s.time}초`;
    return { title: m.title, text, step: `${this.step + 1}/${m.steps.length}`, time: this.time, target: new THREE.Vector3(t.x, t.y, -t.n), targetName: t.name, photoStep: s.kind === 'photo' };
  }
}
