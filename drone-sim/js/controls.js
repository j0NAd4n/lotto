// Mode 2 dual-stick input: left = throttle (Y) / yaw (X), right = pitch (Y) / roll (X).
// Touch sticks are relative (no jump when you put your thumb down). Keyboard + gamepad for desktop.

export class Controls {
  constructor(leftEl, rightEl) {
    this.left = new Stick(leftEl);
    this.right = new Stick(rightEl);
    this.keys = new Set();
    this.centerThrottle = true;
    this.kbThrottle = 0;
    window.addEventListener('keydown', e => { this.keys.add(e.code); });
    window.addEventListener('keyup', e => { this.keys.delete(e.code); });
    window.addEventListener('blur', () => this.keys.clear());
  }

  setThrottleMode(centering, initial = 0) {
    this.centerThrottle = centering;
    this.left.centerY = centering;
    this.left.y = centering ? 0 : initial * 2 - 1;
    this.kbThrottle = initial;
    this.left.render();
  }

  read(dt) {
    const k = this.keys;
    const axis = (neg, pos) => (k.has(pos) ? 1 : 0) - (k.has(neg) ? 1 : 0);
    let thrKey = axis('KeyS', 'KeyW');
    let yaw = this.left.x + axis('KeyA', 'KeyD');
    let pitch = this.right.y + axis('ArrowDown', 'ArrowUp');
    let roll = this.right.x + axis('ArrowLeft', 'ArrowRight');
    let thrStick = this.left.y; // -1..1
    // Gamepad (standard mapping, Mode 2)
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p || p.axes.length < 4) continue;
      const dz = v => (Math.abs(v) < 0.08 ? 0 : v);
      yaw += dz(p.axes[0]); thrKey += -dz(p.axes[1]);
      roll += dz(p.axes[2]); pitch += -dz(p.axes[3]);
      break;
    }
    let throttle;
    if (this.centerThrottle) {
      throttle = clamp(thrStick + thrKey, -1, 1);
    } else {
      if (thrKey) {
        this.kbThrottle = clamp(this.kbThrottle + thrKey * dt * 0.6, 0, 1);
        this.left.y = this.kbThrottle * 2 - 1; this.left.render();
      } else this.kbThrottle = (thrStick + 1) / 2;
      throttle = this.kbThrottle;
    }
    return { throttle, yaw: expo(clamp(yaw, -1, 1)), pitch: expo(clamp(pitch, -1, 1)), roll: expo(clamp(roll, -1, 1)) };
  }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function expo(v) { return v * (0.45 + 0.55 * v * v); }

class Stick {
  constructor(el) {
    this.el = el;
    this.knob = el.querySelector('.knob');
    this.x = 0; this.y = 0;
    this.centerY = true;
    this.id = null;
    el.addEventListener('pointerdown', e => this.down(e));
    el.addEventListener('pointermove', e => this.move(e));
    el.addEventListener('pointerup', e => this.up(e));
    el.addEventListener('pointercancel', e => this.up(e));
    el.addEventListener('lostpointercapture', e => this.up(e));
    this.render();
  }
  radius() { return this.el.querySelector('.base').getBoundingClientRect().width * 0.42; }
  down(e) {
    if (this.id !== null) return;
    e.preventDefault();
    this.id = e.pointerId;
    this.el.setPointerCapture(e.pointerId);
    this.sx = e.clientX; this.sy = e.clientY;
    this.startY = this.centerY ? 0 : this.y;
    this.el.classList.add('active');
  }
  move(e) {
    if (e.pointerId !== this.id) return;
    e.preventDefault();
    const r = this.radius();
    let dx = (e.clientX - this.sx) / r, dy = -(e.clientY - this.sy) / r;
    const m = Math.hypot(dx, dy);
    if (this.centerY && m > 1) { dx /= m; dy /= m; }
    this.x = clamp(dx, -1, 1);
    this.y = clamp(this.startY + dy, -1, 1);
    this.render();
  }
  up(e) {
    if (e.pointerId !== this.id) return;
    this.id = null;
    this.x = 0;
    if (this.centerY) this.y = 0;
    this.el.classList.remove('active');
    this.render();
  }
  render() {
    const pct = 100; // knob is 42% of base, travel = 42% of base
    this.knob.style.transform = `translate(calc(-50% + ${this.x * pct}%), calc(-50% + ${-this.y * pct}%))`;
    this.el.classList.toggle('hold', !this.centerY);
  }
}
