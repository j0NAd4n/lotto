// Aircraft definitions, procedural 3D models and flight physics.
import * as THREE from 'three';

const G = 9.81;
const D2R = Math.PI / 180;

export const AIRCRAFT = [
  {
    id: 'quad', type: 'multi', name: 'M-3 접이식 쿼드', cls: '소형 촬영 드론 (DJI 매빅급)',
    desc: 'GPS 호버링, 스틱을 놓으면 그 자리에 정지. 장애물 회피 지원.',
    size: 0.38, radius: 0.3, maxH: 15, sportH: 21, maxUp: 6, maxDown: 4, yawRate: 110, accel: 7,
    battery: 900, centerThrottle: true, avoid: true, maxTilt: 30, camDist: 2.4, zoomMax: 4,
    stats: { 속도: 21, 고도: 500, 비행시간: '15분' },
  },
  {
    id: 'fpv', type: 'fpv', name: 'R-5 레이싱 FPV', cls: '5인치 FPV 레이서',
    desc: '자세(Angle) 모드. 쓰로틀 스틱은 놓아도 유지됩니다. 호버링 약 30%.',
    size: 0.25, radius: 0.15, twr: 3.4, maxTilt: 60, yawRate: 300, drag: 0.012, tiltRate: 8,
    battery: 300, centerThrottle: false, camDist: 2.2, camUptilt: 22, zoomMax: 1,
    stats: { 속도: 40, 고도: 500, 비행시간: '5분' },
  },
  {
    id: 'hexa', type: 'multi', name: 'A-6 헥사콥터', cls: '대형 농업·방재 드론',
    desc: '무겁고 안정적. 반응이 느리지만 바람에 강합니다.',
    size: 2.2, radius: 1.3, maxH: 10, sportH: 13, maxUp: 4, maxDown: 3, yawRate: 60, accel: 3,
    battery: 1200, centerThrottle: true, avoid: true, maxTilt: 20, camDist: 9, zoomMax: 2,
    stats: { 속도: 13, 고도: 300, 비행시간: '20분' },
  },
  {
    id: 'raven', type: 'wing', name: 'RQ-S 소형 정찰기', cls: '손 투척식 고정익 (레이븐급)',
    desc: '공중에서 시작. 실속 속도 이하로 느려지면 추락합니다.',
    size: 1.4, radius: 0.6, vs: 9, vmax: 30, cruise: 16, maxBank: 55, maxGamma: 25,
    pitchRate: 90, rollRate: 160, yawRate: 30, battery: 1500, startAlt: 120, startThrottle: 0.45,
    centerThrottle: false, camDist: 6, zoomMax: 6, crashV: 4,
    stats: { 속도: 30, 고도: 1000, 비행시간: '25분' },
  },
  {
    id: 'hale', type: 'wing', name: 'HALE 고고도 무인기', cls: '고고도 장기체공 정찰기 (글로벌호크급)',
    desc: '거대한 날개, 둔한 조작. 고배율 정찰 카메라 탑재.',
    size: 40, radius: 12, vs: 42, vmax: 180, cruise: 90, maxBank: 30, maxGamma: 12,
    pitchRate: 10, rollRate: 22, yawRate: 6, battery: 7200, startAlt: 1500, startThrottle: 0.45,
    centerThrottle: false, camDist: 75, zoomMax: 30, crashV: 3,
    stats: { 속도: 180, 고도: 18000, 비행시간: '30시간+' },
  },
];

// ---------------- Models ----------------
function mat(c, opts = {}) { return new THREE.MeshLambertMaterial({ color: c, ...opts }); }

function propDisc(r, color = 0x222222) {
  const g = new THREE.CircleGeometry(r, 20);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  const blade = new THREE.Mesh(new THREE.BoxGeometry(r * 2, r * 0.02, r * 0.16), mat(0x333333));
  const grp = new THREE.Group(); grp.add(m, blade); grp.userData.blade = blade;
  return grp;
}

function multirotorModel(def) {
  const s = def.size;
  const g = new THREE.Group();
  const props = [];
  const arms = def.id === 'hexa' ? 6 : 4;
  const bodyCol = def.id === 'hexa' ? 0xe8e8e8 : def.id === 'fpv' ? 0x222222 : 0x55595e;
  const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.32, s * 0.14, s * 0.55), mat(bodyCol));
  g.add(body);
  if (def.id === 'quad') {
    const cam = new THREE.Mesh(new THREE.SphereGeometry(s * 0.06, 12, 8), mat(0x111111));
    cam.position.set(0, -s * 0.07, -s * 0.3); g.add(cam);
    const top = new THREE.Mesh(new THREE.BoxGeometry(s * 0.24, s * 0.05, s * 0.4), mat(0x6d7176));
    top.position.y = s * 0.09; g.add(top);
  }
  if (def.id === 'hexa') {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.14, s * 0.14, s * 0.3, 16), mat(0x2f80c0));
    tank.position.y = -s * 0.18; g.add(tank);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(s * 0.7, s * 0.02, s * 0.02), mat(0x444444));
    legs.position.y = -s * 0.35; g.add(legs);
    const legs2 = legs.clone(); legs2.rotation.y = Math.PI / 2; g.add(legs2);
  }
  if (def.id === 'fpv') {
    const cam = new THREE.Mesh(new THREE.BoxGeometry(s * 0.12, s * 0.12, s * 0.1), mat(0xff6a00));
    cam.position.set(0, s * 0.02, -s * 0.3); g.add(cam);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.01, s * 0.01, s * 0.3), mat(0xff3300));
    ant.position.set(0, s * 0.15, s * 0.25); ant.rotation.x = 0.6; g.add(ant);
  }
  const armLen = s * 0.55;
  for (let i = 0; i < arms; i++) {
    const a = (i + 0.5) / arms * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(s * 0.05, s * 0.04, armLen), mat(0x333333));
    arm.position.set(Math.sin(a) * armLen / 2, 0, Math.cos(a) * armLen / 2);
    arm.rotation.y = a; g.add(arm);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.04, s * 0.04, s * 0.06, 10), mat(0x1a1a1a));
    motor.position.set(Math.sin(a) * armLen, s * 0.04, Math.cos(a) * armLen); g.add(motor);
    const p = propDisc(s * (arms === 6 ? 0.28 : 0.24));
    p.position.set(Math.sin(a) * armLen, s * 0.08, Math.cos(a) * armLen);
    p.userData.dir = i % 2 ? 1 : -1;
    g.add(p); props.push(p);
  }
  // front marker lights
  const l1 = new THREE.Mesh(new THREE.SphereGeometry(s * 0.025, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
  l1.position.set(s * 0.2, 0, -s * 0.25); g.add(l1);
  const l2 = l1.clone(); l2.material = new THREE.MeshBasicMaterial({ color: 0x20ff40 }); l2.position.x = -s * 0.2; g.add(l2);
  g.userData.props = props;
  return g;
}

function wingModel(def) {
  const g = new THREE.Group();
  const props = [];
  if (def.id === 'raven') {
    const s = def.size; // wingspan
    const col = mat(0x7a8a6a);
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.035, s * 0.025, s * 0.7, 10), col);
    fus.rotation.x = Math.PI / 2; g.add(fus);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.012, s * 0.14), col);
    wing.position.set(0, s * 0.05, -s * 0.05); g.add(wing);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.01, s * 0.01, s * 0.4), col);
    boom.rotation.x = Math.PI / 2; boom.position.set(0, s * 0.02, s * 0.45); g.add(boom);
    const ht = new THREE.Mesh(new THREE.BoxGeometry(s * 0.35, s * 0.01, s * 0.08), col);
    ht.position.set(0, s * 0.03, s * 0.63); g.add(ht);
    const vt = new THREE.Mesh(new THREE.BoxGeometry(s * 0.01, s * 0.12, s * 0.08), col);
    vt.position.set(0, s * 0.09, s * 0.63); g.add(vt);
    const p = propDisc(s * 0.11); p.rotation.x = Math.PI / 2; p.position.set(0, s * 0.05, s * 0.18);
    p.userData.dir = 1; p.userData.axis = 'z'; g.add(p); props.push(p);
  } else {
    // HALE: slender fuselage, bulbous nose, long straight wing, V-tail, dorsal engine
    const s = def.size; // 40 m span
    const L = 14.5;
    const white = mat(0xd9dde2);
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.45, L, 16), white);
    fus.rotation.x = Math.PI / 2; g.add(fus);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12), white);
    nose.scale.set(1, 0.95, 1.6); nose.position.set(0, 0.25, -L / 2 + 0.6); g.add(nose);
    const wingShape = new THREE.BoxGeometry(s, 0.25, 2.2);
    const wing = new THREE.Mesh(wingShape, white); wing.position.set(0, 0.55, -0.8); g.add(wing);
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.55, 4.2, 14), mat(0xb8bcc2));
    eng.rotation.x = Math.PI / 2; eng.position.set(0, 1.35, 4.2); g.add(eng);
    for (const sgn of [-1, 1]) {
      const vt = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.2, 1.6), white);
      vt.position.set(sgn * 1.3, 1.6, L / 2 - 0.6); vt.rotation.z = -sgn * 0.6; g.add(vt);
    }
    const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), mat(0x222222));
    sensor.position.set(0, -0.7, -L / 2 + 2); g.add(sensor);
  }
  const nav = new THREE.Mesh(new THREE.SphereGeometry(def.size * 0.012, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
  nav.position.set(-def.size / 2, def.id === 'hale' ? 0.55 : def.size * 0.05, 0); g.add(nav);
  const nav2 = nav.clone(); nav2.material = new THREE.MeshBasicMaterial({ color: 0x20ff40 }); nav2.position.x = def.size / 2; g.add(nav2);
  g.userData.props = props;
  return g;
}

export function buildModel(def) {
  return def.type === 'wing' ? wingModel(def) : multirotorModel(def);
}

// ---------------- Physics ----------------
// Input: { throttle, yaw, pitch, roll } each -1..1 (throttle 0..1 for non-centering sticks)
export class Aircraft {
  constructor(def, world) {
    this.def = def;
    this.world = world;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.quat = new THREE.Quaternion();
    this.heading = 0; // radians, 0 = north, positive = clockwise (east)
    this.battery = 1;
    this.state = 'landed'; // landed | flying | crashed
    this.motor = 0; // 0..1 for sound/props
    this.sport = false;
    this.avoid = !!def.avoid;
    this.assist = true;
    this.home = new THREE.Vector3();
    // multirotor/fpv attitude
    this.pitchA = 0; this.rollA = 0;
    this.autoMode = null; // 'takeoff' | 'land'
    this.message = '';
  }

  spawn(x, n, headingDeg) {
    const d = this.def;
    this.heading = headingDeg * D2R;
    const ground = this.world.heightAt(x, n);
    this.vel.set(0, 0, 0);
    this.battery = 1;
    this.pitchA = this.rollA = 0;
    this.autoMode = null;
    if (d.type === 'wing') {
      this.pos.set(x, ground + d.startAlt, -n);
      const fwd = this.forwardFromHeading();
      this.vel.copy(fwd).multiplyScalar(d.cruise * 1.1);
      this.state = 'flying';
      this.quat.setFromEuler(new THREE.Euler(0, -this.heading, 0, 'YXZ'));
    } else {
      this.pos.set(x, ground + 0.15 + d.size * 0.1, -n);
      this.state = 'landed';
      this.updateMultiQuat();
    }
    this.home.copy(this.pos);
  }

  forwardFromHeading() {
    return new THREE.Vector3(Math.sin(this.heading), 0, -Math.cos(this.heading));
  }

  groundY() { return this.world.heightAt(this.pos.x, -this.pos.z); }
  agl() { return this.pos.y - this.groundY(); }

  takeoff() {
    if (this.state === 'landed' && this.def.type !== 'wing' && this.battery > 0) {
      this.state = 'flying';
      this.autoMode = this.def.type === 'multi' ? 'takeoff' : null;
      this.takeoffTarget = this.pos.y + 1.5;
    }
  }
  land() { if (this.state === 'flying' && this.def.type === 'multi') this.autoMode = 'land'; }

  update(dt, inp) {
    if (this.state === 'crashed') return;
    const d = this.def;
    const drain = (this.state === 'flying' ? 1 : 0) * (0.6 + 0.4 * this.motor) / d.battery;
    this.battery = Math.max(0, this.battery - drain * dt);
    if (d.type === 'multi') this.updateMulti(dt, inp);
    else if (d.type === 'fpv') this.updateFpv(dt, inp);
    else this.updateWing(dt, inp);
    this.collide(dt);
  }

  // DJI-style velocity-command flight (GPS mode)
  updateMulti(dt, inp) {
    const d = this.def;
    if (this.state === 'landed') {
      this.motor = Math.max(0, this.motor - dt);
      if (inp.throttle > 0.6 && this.battery > 0.02) this.takeoff();
      return;
    }
    let { throttle, yaw, pitch, roll } = inp;
    this.lastThrottle = throttle;
    if (Math.abs(throttle) > 0.15 || Math.abs(pitch) > 0.15 || Math.abs(roll) > 0.15) {
      if (this.autoMode === 'land' || (this.autoMode === 'takeoff' && throttle < 0)) this.autoMode = null;
    }
    if (this.battery <= 0) { this.autoMode = 'land'; this.message = '배터리 방전 — 강제 착륙'; }
    const vmax = this.sport ? d.sportH : d.maxH;
    let vUp = throttle > 0 ? throttle * d.maxUp : throttle * d.maxDown;
    if (this.autoMode === 'takeoff') {
      vUp = Math.max(Math.min(2, (this.takeoffTarget - this.pos.y) * 2), throttle * d.maxUp);
      if (this.pos.y >= this.takeoffTarget - 0.1) this.autoMode = null;
    } else if (this.autoMode === 'land') {
      vUp = -Math.min(2.5, Math.max(0.6, this.agl() * 0.5));
      pitch = roll = 0;
    }
    this.heading += yaw * d.yawRate * D2R * dt;
    const fwd = this.forwardFromHeading();
    const right = new THREE.Vector3(Math.cos(this.heading), 0, Math.sin(this.heading));
    const target = fwd.multiplyScalar(pitch * vmax).add(right.multiplyScalar(roll * vmax));
    target.y = vUp;
    // Obstacle avoidance: brake if the path ahead is blocked
    if (this.avoid && !this.sport) {
      const look = Math.max(4, new THREE.Vector3(target.x, 0, target.z).length() * 1.2);
      const dir = new THREE.Vector3(target.x, 0, target.z);
      if (dir.lengthSq() > 0.01) {
        dir.normalize();
        const p = this.pos.clone().addScaledVector(dir, look);
        if (this.world.buildingAt(p.x, p.y, -p.z, d.radius + 1)) {
          target.x = target.z = 0;
          this.message = '장애물 감지 — 정지';
          this.avoidFlash = 1;
        }
      }
    }
    const acc = this.sport ? d.accel * 1.4 : d.accel;
    const dv = target.clone().sub(this.vel);
    const hv = new THREE.Vector2(dv.x, dv.z);
    const maxDv = acc * dt;
    if (hv.length() > maxDv) hv.setLength(maxDv);
    const vy = Math.max(-maxDv * 1.5, Math.min(maxDv * 1.5, dv.y));
    this.vel.x += hv.x; this.vel.z += hv.y; this.vel.y += vy;
    // gentle wind drift for realism
    const t = performance.now() / 1000;
    const gust = 0.15 * (1 / Math.max(1, d.size));
    this.vel.x += Math.sin(t * 0.7) * gust * dt; this.vel.z += Math.cos(t * 0.53) * gust * dt;
    this.pos.addScaledVector(this.vel, dt);
    // visual tilt follows horizontal acceleration
    const fl = this.forwardFromHeading();
    const rl = new THREE.Vector3(Math.cos(this.heading), 0, Math.sin(this.heading));
    const aF = hv.x / dt * fl.x + hv.y / dt * fl.z, aR = hv.x / dt * rl.x + hv.y / dt * rl.z;
    const vF = this.vel.dot(fl), vR = this.vel.dot(rl);
    const lim = d.maxTilt * D2R;
    const tp = THREE.MathUtils.clamp(Math.atan2(aF + vF * 0.25, G), -lim, lim);
    const tr = THREE.MathUtils.clamp(Math.atan2(aR + vR * 0.25, G), -lim, lim);
    this.pitchA += (tp - this.pitchA) * Math.min(1, dt * 6);
    this.rollA += (tr - this.rollA) * Math.min(1, dt * 6);
    this.motor = 0.55 + 0.25 * Math.abs(vUp) / d.maxUp + 0.2 * Math.hypot(pitch, roll);
    this.updateMultiQuat();
  }

  updateMultiQuat() {
    this.quat.setFromEuler(new THREE.Euler(-this.pitchA, -this.heading, -this.rollA, 'YXZ'));
  }

  // FPV angle mode: stick = attitude, throttle = collective thrust
  updateFpv(dt, inp) {
    const d = this.def;
    const thr = this.battery > 0 ? Math.max(0, inp.throttle) : 0;
    if (this.state === 'landed') {
      this.motor = thr;
      if (thr * d.twr > 1.05) { this.state = 'flying'; }
      else return;
    }
    const lim = d.maxTilt * D2R;
    this.pitchA += (inp.pitch * lim - this.pitchA) * Math.min(1, dt * d.tiltRate);
    this.rollA += (inp.roll * lim - this.rollA) * Math.min(1, dt * d.tiltRate);
    this.heading += inp.yaw * d.yawRate * D2R * dt;
    this.updateMultiQuat();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quat);
    const acc = up.multiplyScalar(thr * d.twr * G);
    acc.y -= G;
    acc.addScaledVector(this.vel, -d.drag * this.vel.length());
    this.vel.addScaledVector(acc, dt);
    this.pos.addScaledVector(this.vel, dt);
    this.motor = thr;
  }

  // Fixed-wing: lift/drag model with fly-by-wire assist (stick = bank / climb angle)
  updateWing(dt, inp) {
    const d = this.def;
    if (!this.k) {
      const CLmax = 1.3;
      this.k = G / (d.vs * d.vs * CLmax); // lift accel = k * V^2 * CL
      const CLv = G / (this.k * d.vmax * d.vmax);
      this.CD0 = 0.03; this.Ki = 0.06;
      this.Tmax = this.k * d.vmax * d.vmax * (this.CD0 + this.Ki * CLv * CLv);
      this.CLmax = CLmax;
    }
    const thr = this.battery > 0 ? Math.max(0, inp.throttle) : 0;
    const q = this.quat;
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    const u = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const r = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    const V = Math.max(0.1, this.vel.length());
    const vhat = this.vel.clone().divideScalar(V);
    const alpha = Math.atan2(-this.vel.dot(u), this.vel.dot(f));
    const beta = Math.atan2(this.vel.dot(r), this.vel.dot(f));
    const aStall = 15 * D2R;
    let CL = 0.25 + alpha * (this.CLmax - 0.25) / aStall;
    let stalled = false;
    if (Math.abs(alpha) > aStall) { CL = Math.sign(alpha) * Math.max(0.3, this.CLmax - (Math.abs(alpha) - aStall) * 3); stalled = true; }
    this.stalled = stalled || V < d.vs * 0.92;
    const qd = this.k * V * V;
    const liftDir = u.clone().addScaledVector(vhat, -u.dot(vhat)).normalize();
    const acc = liftDir.multiplyScalar(qd * CL);
    acc.addScaledVector(vhat, -qd * (this.CD0 + this.Ki * CL * CL + (stalled ? 0.15 : 0)));
    acc.addScaledVector(r, -qd * 0.6 * beta);
    acc.addScaledVector(f, thr * this.Tmax);
    acc.y -= G;

    // Attitude
    const euler = new THREE.Euler().setFromQuaternion(q, 'YXZ');
    const bank = -euler.z; // right wing down positive
    const gamma = Math.asin(THREE.MathUtils.clamp(vhat.y, -1, 1));
    const eff = THREE.MathUtils.clamp(V / d.cruise, 0.25, 1.3);
    let p, qr, rr; // body rates: roll, pitch, yaw (rad/s)
    if (this.assist) {
      const bankT = inp.roll * d.maxBank * D2R;
      let gammaT = inp.pitch * d.maxGamma * D2R;
      // envelope protection: near stall speed the FBW lowers the nose
      const margin = (V - d.vs * 1.12) / (d.vs * 0.25);
      if (margin < 1) gammaT = Math.min(gammaT, margin * d.maxGamma * D2R);
      p = THREE.MathUtils.clamp((bankT - bank) * 2.5, -d.rollRate * D2R, d.rollRate * D2R);
      const gdot = (gamma - (this.lastGamma ?? gamma)) / dt;
      this.lastGamma = gamma;
      // pitch to hold climb angle, plus extra pull to stay level in a bank
      qr = (gammaT - gamma) * 3 - gdot * 0.6 + (G / Math.max(V, 1)) * Math.cos(gamma) * (1 / Math.max(Math.cos(bank), 0.3) - 1);
      qr = THREE.MathUtils.clamp(qr, -d.pitchRate * D2R, d.pitchRate * D2R);
    } else {
      p = inp.roll * d.rollRate * D2R;
      qr = inp.pitch * d.pitchRate * D2R - alpha * 0.8;
    }
    rr = inp.yaw * d.yawRate * D2R + beta * 2.0;
    // weathercock: nose follows the flight path
    qr += -alpha * 0.4 * (this.assist ? 0.3 : 1);
    if (stalled) qr -= 0.6; // nose drops in a stall
    p *= eff; qr *= eff; rr *= eff;
    const dq = new THREE.Quaternion().setFromEuler(new THREE.Euler(qr * dt, -rr * dt, -p * dt, 'XYZ'));
    q.multiply(dq).normalize();

    if (this.state === 'landed') {
      // rolling on the ground
      acc.y = Math.max(acc.y, 0);
      const hvel = new THREE.Vector3(this.vel.x, 0, this.vel.z);
      acc.addScaledVector(hvel, -0.25);
      const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
      e.z *= 0.8; e.x = Math.max(e.x, 0) * 0.9;
      q.setFromEuler(e);
      if (acc.y > 0.5 && V > d.vs) this.state = 'flying';
    }
    this.vel.addScaledVector(acc, dt);
    this.pos.addScaledVector(this.vel, dt);
    this.heading = -euler.y;
    this.motor = thr;
    this.bank = bank; this.alpha = alpha;
  }

  collide(dt) {
    const d = this.def;
    const gy = this.groundY();
    const bottom = this.pos.y - d.size * 0.12;
    if (bottom <= gy) {
      const vy = this.vel.y;
      if (d.type === 'wing') {
        const e = new THREE.Euler().setFromQuaternion(this.quat, 'YXZ');
        if (-vy > d.crashV || Math.abs(e.z) > 0.5 || e.x < -0.35) return this.crash('지면 충돌');
        this.pos.y = gy + d.size * 0.12;
        this.vel.y = Math.max(0, this.vel.y);
        if (this.state !== 'landed') { this.state = 'landed'; this.message = '착지'; }
      } else {
        if (-vy > 6 || this.vel.length() > 9) return this.crash('지면 충돌');
        this.pos.y = gy + d.size * 0.12;
        if (this.state === 'flying' && (vy <= 0.2)) {
          if (d.type === 'multi' && (this.autoMode === 'land' || this.lastThrottle < -0.5 || this.vel.y < -0.2)) {
            this.state = 'landed'; this.autoMode = null; this.vel.set(0, 0, 0); this.message = '착륙 완료';
          } else if (d.type === 'fpv') {
            this.vel.y = 0; this.vel.multiplyScalar(0.9);
            if (this.motor * d.twr < 1) { this.state = 'landed'; this.vel.set(0, 0, 0); }
          } else this.vel.y = Math.max(0, this.vel.y);
        }
      }
    }
    if (this.state === 'flying') {
      const b = this.world.buildingAt(this.pos.x, this.pos.y, -this.pos.z, d.radius);
      if (b) {
        const sp = this.vel.length();
        if (sp > (d.type === 'multi' ? 3 : 1.5)) return this.crash('건물 충돌');
        // gentle bump: push back
        this.pos.addScaledVector(this.vel, -dt * 2);
        this.vel.multiplyScalar(-0.3);
      }
    }
  }

  crash(reason) {
    this.state = 'crashed';
    this.message = reason;
    this.motor = 0;
  }
}
