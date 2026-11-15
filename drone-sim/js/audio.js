// Tiny synthesized engine sound (no audio files needed).
export class EngineSound {
  constructor() { this.ctx = null; this.enabled = true; }
  start(kind) {
    this.kind = kind;
    if (!this.enabled) return;
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.ctx.resume();
      this.stopNodes();
      const c = this.ctx;
      this.gain = c.createGain(); this.gain.gain.value = 0;
      const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = kind === 'hale' ? 900 : 2400;
      this.osc = c.createOscillator(); this.osc.type = kind === 'hale' ? 'sawtooth' : 'sawtooth';
      this.osc2 = c.createOscillator(); this.osc2.type = 'square';
      // noise for jet / prop wash
      const buf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = c.createBufferSource(); this.noise.buffer = buf; this.noise.loop = true;
      this.noiseGain = c.createGain(); this.noiseGain.gain.value = kind === 'hale' ? 0.5 : 0.15;
      this.osc.connect(filter); this.osc2.connect(filter);
      this.noise.connect(this.noiseGain); this.noiseGain.connect(filter);
      filter.connect(this.gain); this.gain.connect(c.destination);
      this.osc.start(); this.osc2.start(); this.noise.start();
      this.filter = filter;
    } catch { /* audio unsupported */ }
  }
  stopNodes() {
    try { this.osc?.stop(); this.osc2?.stop(); this.noise?.stop(); this.gain?.disconnect(); } catch { }
    this.osc = this.osc2 = this.noise = null;
  }
  update(motor, kind) {
    if (!this.osc || !this.ctx) return;
    const t = this.ctx.currentTime;
    const base = { quad: 170, fpv: 230, hexa: 85, raven: 120, hale: 60 }[kind] || 150;
    const f = base * (0.7 + motor * 0.9);
    this.osc.frequency.setTargetAtTime(f, t, 0.05);
    this.osc2.frequency.setTargetAtTime(f * 1.503, t, 0.05);
    const vol = this.enabled ? (motor > 0.01 ? 0.05 + motor * 0.07 : 0) : 0;
    this.gain.gain.setTargetAtTime(vol, t, 0.1);
  }
  setEnabled(on) { this.enabled = on; if (!on && this.gain) this.gain.gain.value = 0; }
}
