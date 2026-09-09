export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambient: GainNode | null = null;
  private humOsc: OscillatorNode | null = null;
  private volume = 0.42;

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    this.ctx = new AudioContextClass();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    this.ambient = this.ctx.createGain();
    this.ambient.gain.value = 0.045;
    this.ambient.connect(this.master);
    this.humOsc = this.ctx.createOscillator();
    this.humOsc.type = 'sine';
    this.humOsc.frequency.value = 47;
    this.humOsc.connect(this.ambient);
    this.humOsc.start();
  }
  setVolume(value: number) {
    this.volume = value;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(value, this.ctx.currentTime, .08);
  }
  tension(energy: number) {
    if (!this.ambient || !this.ctx) return;
    this.ambient.gain.setTargetAtTime(.028 + (1 - energy) * .05, this.ctx.currentTime, .25);
    if (this.humOsc) this.humOsc.frequency.setTargetAtTime(44 + (1 - energy) * 15, this.ctx.currentTime, .4);
  }
  tone(frequency: number, duration: number, type: OscillatorType = 'sine', gain = .12, slide = 0) {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(25, frequency + slide), now + duration);
    amp.gain.setValueAtTime(.001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + .012);
    amp.gain.exponentialRampToValueAtTime(.001, now + duration);
    osc.connect(amp); amp.connect(this.master);
    osc.start(now); osc.stop(now + duration + .02);
  }
  attack() { this.tone(180, .12, 'sawtooth', .09, 120); }
  hit() { this.tone(92, .16, 'square', .12, -38); this.tone(440, .04, 'triangle', .05, -140); }
  burst() { this.tone(260, .34, 'sine', .16, 420); this.tone(115, .26, 'triangle', .1, 70); }
  dash() { this.tone(320, .15, 'triangle', .08, 220); }
  hurt() { this.tone(74, .24, 'sawtooth', .13, -35); }
  boss() { this.tone(48, .7, 'sawtooth', .14, -9); }
}