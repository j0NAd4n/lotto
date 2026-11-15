import * as THREE from 'three';
import { World, toLocal } from './world.js';
import { AIRCRAFT, Aircraft, buildModel } from './aircraft.js';
import { Controls } from './controls.js';
import { MissionRunner, MISSIONS } from './missions.js';
import { EngineSound } from './audio.js';
import { fetchCityFromOverpass } from './osm.js';

const $ = id => document.getElementById(id);
const D2R = Math.PI / 180;

// ---------- Settings (per-device convenience only) ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem('seoulsky.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('seoulsky.' + k, JSON.stringify(v)); } catch { } },
};
const settings = {
  quality: store.get('quality', matchMedia('(pointer: coarse)').matches ? 'mid' : 'high'),
  sound: store.get('sound', 'on'),
  assist: store.get('assist', 'on'),
  mode: '2',
};
const QUALITY = {
  low: { pixelRatio: 1, groundTex: 2048, far: 9000 },
  mid: { pixelRatio: 1.5, groundTex: 4096, far: 14000 },
  high: { pixelRatio: 2, groundTex: 4096, far: 22000 },
};

// ---------- Renderer / scene ----------
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY[settings.quality].pixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const maxTex = renderer.capabilities.maxTextureSize;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa9c8e6);
scene.fog = new THREE.Fog(0xc9d9e6, 800, QUALITY[settings.quality].far * 0.9);
scene.add(new THREE.HemisphereLight(0xdfefff, 0x5a5a48, 1.6));
const sun = new THREE.DirectionalLight(0xfff4e0, 1.9);
sun.position.set(-0.5, 1, 0.35).multiplyScalar(1000);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(65, 1, 0.1, QUALITY[settings.quality].far);
scene.add(camera);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- Loading ----------
let world, missions;
const progress = (p, msg) => { $('loadbar').style.width = (p * 100) + '%'; if (msg) $('loadmsg').textContent = msg; };

async function load() {
  progress(0.1, '지형 데이터 불러오는 중…');
  const terrain = await (await fetch('data/terrain.json')).json();
  progress(0.3, '서울 3D 건물 데이터 불러오는 중…');
  let city = null;
  try {
    const r = await fetch('data/city.json');
    if (r.ok) city = await r.json();
  } catch { }
  if (!city) {
    try { city = await fetchCityFromOverpass(m => progress(0.45, m)); }
    catch { toastLater = '건물 데이터를 받지 못해 지형만 표시합니다'; }
  }
  progress(0.7, '3D 도시 생성 중…');
  await new Promise(r => setTimeout(r, 30));
  const q = { ...QUALITY[settings.quality] };
  q.groundTex = Math.min(q.groundTex, maxTex);
  world = new World(scene, terrain, city, q);
  missions = new MissionRunner(scene, world);
  progress(1, '완료');
  buildMinimapBase();
  $('loading').classList.add('hidden');
  showMenu();
}
let toastLater = null;

// ---------- Menu ----------
let selAircraft = store.get('aircraft', 'quad');
let selTab = 'free';
let selMission = null;

function showMenu() {
  state = 'menu';
  document.body.classList.remove('flying');
  $('menu').classList.remove('hidden');
  $('hud').classList.add('hidden');
  $('dialog').classList.add('hidden');
  renderMenu();
}

function renderMenu() {
  const cards = $('cards');
  cards.innerHTML = '';
  for (const a of AIRCRAFT) {
    const b = document.createElement('button');
    b.className = 'card' + (a.id === selAircraft ? ' on' : '');
    b.innerHTML = `<b>${a.name}</b><span class="cls">${a.cls}</span><span class="desc">${a.desc}</span>
      <span class="st">최고 ${a.stats.속도}m/s · 최대고도 ${a.stats.고도.toLocaleString()}m · ${a.stats.비행시간}</span>`;
    b.onclick = () => { selAircraft = a.id; store.set('aircraft', a.id); selMission = null; renderMenu(); };
    cards.appendChild(b);
  }
  const def = AIRCRAFT.find(a => a.id === selAircraft);
  const ml = $('missions');
  ml.innerHTML = '';
  for (const m of MISSIONS.filter(m => m.for.includes(def.type))) {
    const b = document.createElement('button');
    b.className = 'mission' + (selMission === m.id ? ' on' : '');
    const best = store.get('best.' + m.id + '.' + def.id, null);
    b.innerHTML = `<b>${m.title}</b><p>${m.desc}</p>${best ? `<div class="best">최고 기록 ${fmtTime(best.time)}${best.score != null ? ` · ${best.score}점` : ''}</div>` : ''}`;
    b.onclick = () => { selMission = m.id; renderMenu(); };
    ml.appendChild(b);
  }
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === selTab));
  $('tab-aircraft').classList.toggle('hidden', selTab === 'settings');
  $('tab-mission').classList.toggle('hidden', selTab !== 'mission');
  $('tab-settings').classList.toggle('hidden', selTab !== 'settings');
  document.querySelectorAll('.seg').forEach(seg => {
    seg.querySelectorAll('button').forEach(btn => btn.classList.toggle('on', settings[seg.dataset.set] === btn.dataset.v));
  });
  $('startBtn').textContent = selTab === 'mission' ? (selMission ? '미션 시작 ▶' : '미션을 선택하세요') : '비행 시작 ▶';
  $('startBtn').disabled = selTab === 'mission' && !selMission;
  $('startBtn').style.opacity = $('startBtn').disabled ? 0.5 : 1;
}

document.querySelectorAll('.tab').forEach(t => t.onclick = () => { selTab = t.dataset.tab; renderMenu(); });
document.querySelectorAll('.seg').forEach(seg => seg.querySelectorAll('button').forEach(btn => btn.onclick = () => {
  settings[seg.dataset.set] = btn.dataset.v; store.set(seg.dataset.set, btn.dataset.v);
  if (seg.dataset.set === 'quality') toast('품질 변경은 새로고침 후 적용됩니다');
  renderMenu();
}));
$('startBtn').onclick = () => startFlight(selTab === 'mission' ? MISSIONS.find(m => m.id === selMission) : null);
$('fsBtn').onclick = goFullscreen;

function goFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (req) Promise.resolve(req.call(el)).then(() => screen.orientation?.lock?.('landscape').catch(() => { })).catch(() => { });
}

// ---------- Flight ----------
let state = 'loading';
let ac = null, model = null, def = null;
let camMode = 'chase';
let gimbalPitch = -15, zoom = 1;
const controls = new Controls($('stickL'), $('stickR'));
const sound = new EngineSound();
const chasePos = new THREE.Vector3();
let currentMission = null;
let shadow;

function startFlight(mission) {
  def = AIRCRAFT.find(a => a.id === selAircraft);
  if (model) scene.remove(model);
  if (shadow) scene.remove(shadow);
  model = buildModel(def);
  scene.add(model);
  shadow = new THREE.Mesh(new THREE.CircleGeometry(def.size * 0.55, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);
  ac = new Aircraft(def, world);
  ac.assist = settings.assist === 'on';
  currentMission = mission;
  // spawn
  let sx = 0, sn = 0, hdg = 0;
  if (mission?.start) { const l = toLocal(mission.start.lat, mission.start.lon); sx = l.x; sn = l.n; hdg = mission.startHeading; }
  else if (def.id === 'raven') { sn = -900; }
  else if (def.id === 'hale') { sn = -4500; }
  ac.spawn(sx, sn, hdg);
  controls.setThrottleMode(def.centerThrottle, def.startThrottle ?? 0);
  $('lblL').textContent = def.centerThrottle ? '쓰로틀 / 요' : '쓰로틀(유지) / 요';
  if (mission) missions.start(mission); else missions.clear();
  camMode = 'chase'; gimbalPitch = def.type === 'wing' ? -35 : -15; zoom = 1;
  $('gimbalRange').value = gimbalPitch;
  chasePos.copy(ac.pos).add(new THREE.Vector3(0, def.camDist, def.camDist * 2));
  // UI
  $('menu').classList.add('hidden');
  $('dialog').classList.add('hidden');
  $('hud').classList.remove('hidden');
  document.body.classList.add('flying');
  const multi = def.type === 'multi';
  $('takeoffBtn').classList.toggle('hidden', def.type === 'wing');
  $('sportBtn').classList.toggle('hidden', !multi);
  $('avoidBtn').classList.toggle('hidden', def.type === 'fpv');
  updateSideButtons();
  $('mission').classList.toggle('hidden', !mission);
  sound.setEnabled(settings.sound === 'on');
  sound.start(def.id);
  state = 'flying';
  if (toastLater) { toast(toastLater); toastLater = null; }
  else toast(def.type === 'wing' ? '비행 중 — 쓰로틀을 유지하세요' : def.type === 'fpv' ? '왼쪽 스틱을 올려 쓰로틀을 높이세요' : '이륙 버튼 또는 왼쪽 스틱을 위로');
  if (matchMedia('(pointer: coarse)').matches) goFullscreen();
}

function updateSideButtons() {
  if (!ac) return;
  const t = def.type;
  $('takeoffBtn').textContent = ac.state === 'landed' ? '⬆ 이륙' : (t === 'fpv' ? '⟲ 리셋' : '⬇ 착륙');
  $('sportBtn').classList.toggle('on', ac.sport);
  $('modetag').textContent = t === 'wing' ? (ac.assist ? 'FBW' : 'MAN') : t === 'fpv' ? 'ANGLE' : ac.sport ? 'S' : 'N';
  $('modetag').classList.toggle('s', ac.sport || (t === 'wing' && !ac.assist));
  if (t === 'wing') { $('avoidBtn').textContent = ac.assist ? '보조 ON' : '보조 OFF'; $('avoidBtn').classList.toggle('on', ac.assist); }
  else { $('avoidBtn').textContent = ac.avoid ? '회피 ON' : '회피 OFF'; $('avoidBtn').classList.toggle('on', ac.avoid && !ac.sport); }
  $('camctl').classList.toggle('hidden', camMode !== 'gimbal');
  $('camframe').classList.toggle('hidden', camMode !== 'gimbal');
  $('gimbal').classList.toggle('hidden', def.type === 'fpv');
  $('viewBtn').textContent = { chase: '👁', gimbal: '📷', top: '🗺' }[camMode];
}

$('takeoffBtn').onclick = () => {
  if (!ac) return;
  if (def.type === 'fpv') { if (ac.state === 'landed') controls.setThrottleMode(false, 0.4); else { ac.spawn(ac.pos.x, -ac.pos.z, ac.heading / D2R); controls.setThrottleMode(false, 0); } }
  else if (ac.state === 'landed') ac.takeoff(); else ac.land();
  updateSideButtons();
};
$('sportBtn').onclick = () => { ac.sport = !ac.sport; toast(ac.sport ? '스포츠 모드 — 장애물 회피 꺼짐' : '일반 모드'); updateSideButtons(); };
$('avoidBtn').onclick = () => {
  if (def.type === 'wing') { ac.assist = !ac.assist; toast(ac.assist ? '비행 보조: 스틱 = 뱅크/상승각' : '수동 조종: 스틱 = 회전 속도'); }
  else { ac.avoid = !ac.avoid; toast(ac.avoid ? '장애물 회피 켜짐' : '장애물 회피 꺼짐'); }
  updateSideButtons();
};
$('viewBtn').onclick = cycleView;
function cycleView() {
  camMode = { chase: 'gimbal', gimbal: 'top', top: 'chase' }[camMode];
  toast({ chase: '3인칭 추적 시점', gimbal: def.type === 'fpv' ? 'FPV 고글 시점' : '짐벌 카메라', top: '탑뷰' }[camMode]);
  updateSideButtons();
}
$('gimbalRange').oninput = e => { gimbalPitch = +e.target.value; };
$('zoomIn').onclick = () => { zoom = Math.min(def.zoomMax, zoom * 1.5); };
$('zoomOut').onclick = () => { zoom = Math.max(1, zoom / 1.5); };
$('shutterBtn').onclick = takePhoto;
$('menuBtn').onclick = () => pauseMenu();
window.addEventListener('keydown', e => {
  if (state !== 'flying') return;
  if (e.code === 'Space') $('takeoffBtn').click();
  if (e.code === 'KeyC') cycleView();
  if (e.code === 'KeyP') { if (camMode !== 'gimbal') { camMode = 'gimbal'; updateSideButtons(); } else takePhoto(); }
  if (e.code === 'KeyR') { gimbalPitch = Math.min(20, gimbalPitch + 5); $('gimbalRange').value = gimbalPitch; }
  if (e.code === 'KeyF') { gimbalPitch = Math.max(-90, gimbalPitch - 5); $('gimbalRange').value = gimbalPitch; }
  if (e.code === 'Escape') pauseMenu();
});

function takePhoto() {
  if (camMode !== 'gimbal' || !ac) return;
  renderer.render(scene, camera);
  let img = null;
  try {
    const c = document.createElement('canvas'); c.width = 320; c.height = Math.round(320 * canvas.height / canvas.width);
    c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
    img = c.toDataURL('image/jpeg', 0.8);
  } catch { }
  $('flash').classList.add('on'); setTimeout(() => $('flash').classList.remove('on'), 60);
  const res = missions.shutter(camera, ac);
  if (!res) { toast('📷 촬영 완료'); return; }
  if (res.ok) {
    toast(`📷 ${res.name} 촬영 성공! ${res.score}점`);
    const p = missions.photos[missions.photos.length - 1]; if (p) p.img = img;
  } else toast('❌ ' + res.reason, 2500);
}

function pauseMenu() {
  state = 'paused';
  dialog(`<h2>일시정지</h2>
    <div class="row"><button class="btn" data-a="resume">계속 비행</button><button class="btn ghost" data-a="restart">다시 시작</button><button class="btn ghost" data-a="menu">메인 메뉴</button></div>
    <div class="help"><b>왼쪽</b> 쓰로틀·요 / <b>오른쪽</b> 피치·롤 · 👁 버튼으로 3인칭 → 카메라 → 탑뷰 전환</div>`);
}

function dialog(html) {
  $('dialogBox').innerHTML = html;
  $('dialog').classList.remove('hidden');
  $('dialogBox').querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    $('dialog').classList.add('hidden');
    if (a === 'resume') state = 'flying';
    if (a === 'restart') startFlight(currentMission);
    if (a === 'menu') { sound.update(0, def.id); showMenu(); }
  });
}

// ---------- Toast ----------
let toastTimer;
function toast(msg, ms = 1800) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

// ---------- Camera ----------
const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
function updateCamera(dt) {
  const fwd = ac.forwardFromHeading();
  const s = def.camDist;
  if (camMode === 'chase') {
    let dir = fwd.clone();
    if (def.type === 'wing') { dir = ac.vel.clone(); dir.y *= 0.5; if (dir.lengthSq() < 1) dir = fwd.clone(); dir.normalize(); }
    const want = ac.pos.clone().addScaledVector(dir, -s).add(new THREE.Vector3(0, s * 0.38, 0));
    const k = 1 - Math.exp(-dt * (def.type === 'fpv' ? 10 : 6));
    chasePos.lerp(want, k);
    const minY = world.heightAt(chasePos.x, -chasePos.z) + 1.0;
    if (chasePos.y < minY) chasePos.y = minY;
    camera.position.copy(chasePos);
    camera.up.set(0, 1, 0);
    camera.lookAt(ac.pos.clone().addScaledVector(dir, s * 0.6).add(new THREE.Vector3(0, s * 0.1, 0)));
    camera.fov = 65;
  } else if (camMode === 'gimbal') {
    if (def.type === 'fpv') {
      camera.position.copy(ac.pos);
      tmpQ.copy(ac.quat).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), def.camUptilt * D2R));
      camera.quaternion.copy(tmpQ);
      camera.fov = 100;
    } else {
      const off = def.type === 'wing' ? new THREE.Vector3(0, -def.size * 0.03, -def.size * 0.15).applyQuaternion(ac.quat) : new THREE.Vector3(0, -def.size * 0.18, 0);
      camera.position.copy(ac.pos).add(off);
      camera.quaternion.setFromEuler(new THREE.Euler(gimbalPitch * D2R, -ac.heading, 0, 'YXZ'));
      camera.fov = 70 / zoom;
    }
  } else {
    const h = Math.max(70, def.size * 18) + ac.agl() * 0.3;
    camera.position.set(ac.pos.x, ac.pos.y + h, ac.pos.z);
    camera.up.copy(fwd);
    camera.lookAt(ac.pos);
    camera.fov = 60;
  }
  camera.near = camMode === 'gimbal' && def.size < 3 ? 0.05 : Math.max(0.1, def.size * 0.02);
  camera.updateProjectionMatrix();
}

// ---------- HUD ----------
const strip = $('strip');
(function buildCompass() {
  const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
  let html = '';
  for (let k = -2; k < 3; k++) for (let d = 0; d < 360; d += 15) html += `<span>${names[d] || (d % 45 === 0 ? d : '·')}</span>`;
  strip.innerHTML = html;
})();

let minimapBase;
function buildMinimapBase() {
  const size = 1024;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.drawImage(world.groundCanvas, 0, 0, size, size);
  const sx = size / (world.tx1 - world.tx0), sy = size / (world.tn1 - world.tn0);
  g.fillStyle = '#d8d2c4';
  for (const b of world.buildings) {
    g.beginPath();
    b.ring.forEach(([x, n], i) => { const px = (x - world.tx0) * sx, py = (world.tn1 - n) * sy; i ? g.lineTo(px, py) : g.moveTo(px, py); });
    g.fill();
  }
  minimapBase = { c, sx, sy };
}

function drawMinimap() {
  const mm = $('minimap'); const g = mm.getContext('2d');
  const W = mm.width;
  const range = def.type === 'wing' ? (def.id === 'hale' ? 6000 : 900) : 350; // metres across
  g.fillStyle = '#8c8a7e'; g.fillRect(0, 0, W, W);
  g.save();
  g.translate(W / 2, W / 2);
  g.rotate(-ac.heading);
  const scale = W / range;
  const px = (ac.pos.x - world.tx0) * minimapBase.sx, py = (world.tn1 - -ac.pos.z) * minimapBase.sy;
  const k = scale / minimapBase.sx;
  g.scale(k, k);
  g.drawImage(minimapBase.c, -px, -py);
  g.restore();
  // mission target
  const hud = missions.active ? missions.hud(ac) : null;
  if (hud?.target) {
    const dx = hud.target.x - ac.pos.x, dn = -hud.target.z + ac.pos.z;
    const c = Math.cos(-ac.heading), s = Math.sin(-ac.heading);
    let mx = (dx * c - dn * s) * scale, my = (-(dx * s + dn * c)) * scale;
    const r = W / 2 - 10, m = Math.hypot(mx, my);
    if (m > r) { mx *= r / m; my *= r / m; }
    g.fillStyle = '#ffb020'; g.beginPath(); g.arc(W / 2 + mx, W / 2 + my, 9, 0, Math.PI * 2); g.fill();
  }
  // home
  {
    const dx = ac.home.x - ac.pos.x, dn = -ac.home.z + ac.pos.z;
    const c = Math.cos(-ac.heading), s = Math.sin(-ac.heading);
    let mx = (dx * c - dn * s) * scale, my = (-(dx * s + dn * c)) * scale;
    const r = W / 2 - 10, m = Math.hypot(mx, my);
    if (m > r) { mx *= r / m; my *= r / m; }
    g.fillStyle = '#35c2ff'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('H', W / 2 + mx, W / 2 + my);
  }
  // aircraft
  g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(W / 2, W / 2 - 14); g.lineTo(W / 2 + 10, W / 2 + 10); g.lineTo(W / 2, W / 2 + 5); g.lineTo(W / 2 - 10, W / 2 + 10); g.closePath(); g.fill(); g.stroke();
}

let hudTimer = 0;
function updateHud(dt) {
  hudTimer += dt;
  updateMarker();
  if (hudTimer < 0.08) return;
  hudTimer = 0;
  const h = ac.pos.y - ac.home.y;
  const d = Math.hypot(ac.pos.x - ac.home.x, ac.pos.z - ac.home.z);
  $('tH').textContent = h.toFixed(h < 100 ? 1 : 0);
  $('tD').textContent = d < 1000 ? d.toFixed(0) : (d / 1000).toFixed(1) + 'k';
  $('tHS').textContent = (Math.hypot(ac.vel.x, ac.vel.z) * 3.6).toFixed(0);
  $('tVS').textContent = ac.vel.y.toFixed(1);
  const b = Math.round(ac.battery * 100);
  $('battTxt').textContent = b + '%';
  $('batt').style.color = b > 30 ? 'var(--good)' : b > 15 ? 'var(--warn)' : 'var(--bad)';
  $('batt').querySelector('i').style.setProperty('--lvl', `calc(${b}% - 2px)`);
  const hdg = ((ac.heading / D2R) % 360 + 360) % 360;
  strip.style.transform = `translateX(${-(360 * 2 + hdg) / 15 * 30 - 15}px)`;
  $('zoomTxt').textContent = zoom.toFixed(1) + 'x';
  drawMinimap();
  // messages
  if (ac.message) { toast(ac.message); ac.message = ''; }
  if (def.type === 'wing' && ac.stalled && ac.state === 'flying') toast('⚠ 실속! 기수를 내리고 쓰로틀을 올리세요', 600);
  if (ac.battery < 0.15 && ac.battery > 0 && !lowBattWarned) { lowBattWarned = true; toast('⚠ 배터리 부족 — 귀환하세요', 2500); }
  const range = def.id === 'hale' ? 25000 : 6000;
  if (Math.hypot(ac.pos.x, ac.pos.z) > range) toast('⚠ 작전 구역 이탈 — 돌아오세요', 600);
  // mission
  if (missions.active) {
    const m = missions.hud(ac);
    if (m.done) return missionComplete(m);
    $('mTitle').textContent = m.title + (m.step ? `  (${m.step})` : '');
    $('mText').textContent = m.text;
    $('mTime').textContent = m.time != null ? '⏱ ' + fmtTime(m.time) : '';
    if (missions.flash) { toast(missions.flash); missions.flash = null; }
  }
  updateSideButtons();
}
let lowBattWarned = false;

function updateMarker() {
  const el = $('marker');
  const m = missions.active && !missions.done ? missions.hud(ac) : null;
  if (!m?.target) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  const p = m.target.clone().project(camera);
  const W = window.innerWidth, H = window.innerHeight;
  const dist = ac.pos.distanceTo(m.target);
  $('markerTxt').textContent = `${m.targetName} ${dist < 1000 ? dist.toFixed(0) + 'm' : (dist / 1000).toFixed(1) + 'km'}`;
  const behind = p.z > 1;
  if (!behind && Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.9) {
    el.classList.remove('edge');
    el.style.left = ((p.x + 1) / 2 * W) + 'px'; el.style.top = ((1 - p.y) / 2 * H) + 'px';
  } else {
    el.classList.add('edge');
    let x = p.x, y = p.y;
    if (behind) { x = -x; y = -y; }
    const a = Math.atan2(x, y);
    const r = 0.8;
    const k = r / Math.max(Math.abs(Math.sin(a)), Math.abs(Math.cos(a)));
    el.style.left = ((Math.sin(a) * k + 1) / 2 * W) + 'px';
    el.style.top = ((1 - Math.cos(a) * k) / 2 * H) + 'px';
    el.style.setProperty('--a', a / D2R + 'deg');
  }
}

function fmtTime(t) { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s.toFixed(1).padStart(4, '0')}`; }

function missionComplete(m) {
  state = 'paused';
  const key = 'best.' + currentMission.id + '.' + def.id;
  const prev = store.get(key, null);
  const better = !prev || (currentMission.race ? m.time < prev.time : (m.score ?? 0) >= (prev.score ?? 0));
  if (better) store.set(key, { time: m.time, score: m.score });
  const photos = (m.photos || []).filter(p => p.img).map(p => `<figure><img src="${p.img}" alt=""><figcaption>${p.name} · ${p.score}점</figcaption></figure>`).join('');
  dialog(`<h2>🎉 미션 완료</h2><div><b>${m.title}</b></div>
    <div>기록 ${fmtTime(m.time)}${m.score != null ? ` · 사진 점수 ${m.score}점` : ''}${better ? ' · <span style="color:var(--good)">최고 기록!</span>' : ''}</div>
    ${photos ? `<div class="photos">${photos}</div>` : ''}
    <div class="row"><button class="btn" data-a="restart">다시 하기</button><button class="btn ghost" data-a="resume">계속 비행</button><button class="btn ghost" data-a="menu">메뉴</button></div>`);
  missions.active = null;
  $('mission').classList.add('hidden');
}

function crashed() {
  state = 'paused';
  sound.update(0, def.id);
  dialog(`<h2>💥 추락</h2><div>${ac.message || '기체가 파손되었습니다'}</div>
    <div class="row"><button class="btn" data-a="restart">다시 시작</button><button class="btn ghost" data-a="menu">메인 메뉴</button></div>`);
}

// ---------- Main loop ----------
let last = performance.now();
const STEP = 1 / 120;
let acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state === 'flying' && ac) {
    const inp = controls.read(dt);
    acc += dt;
    while (acc >= STEP) { ac.update(STEP, inp); acc -= STEP; }
    missions.update(dt, ac);
    if (ac.state === 'crashed') crashed();
    // model
    model.position.copy(ac.pos);
    model.quaternion.copy(ac.quat);
    model.visible = !(camMode === 'gimbal');
    for (const p of model.userData.props) {
      const spd = ac.motor * 60 * (p.userData.dir || 1);
      if (p.userData.axis === 'z') p.rotation.z += spd * dt; else p.rotation.y += spd * dt;
      p.userData.blade.visible = ac.motor < 0.05;
    }
    const gy = world.heightAt(ac.pos.x, -ac.pos.z);
    shadow.position.set(ac.pos.x, gy + 0.08, ac.pos.z);
    shadow.material.opacity = Math.max(0, 0.35 - (ac.pos.y - gy) / (def.size * 40));
    sound.update(ac.state === 'crashed' ? 0 : ac.motor, def.id);
    updateCamera(dt);
    updateHud(dt);
    world.sky.position.copy(camera.position);
  } else if (state === 'menu' && world) {
    // slow orbit around Gwanghwamun as menu backdrop
    const t = now / 1000 * 0.05;
    camera.position.set(Math.sin(t) * 900, 380, -Math.cos(t) * 900 - 500);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 40, -500);
    camera.fov = 60; camera.updateProjectionMatrix();
    world.sky.position.copy(camera.position);
  }
  if (world) { world.sky.scale.setScalar(camera.far * 0.8); renderer.render(scene, camera); }
}
requestAnimationFrame(frame);

load().catch(e => { progress(1, '불러오기 실패: ' + e.message); console.error(e); });

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
