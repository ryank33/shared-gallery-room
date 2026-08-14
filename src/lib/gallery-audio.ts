/** Tiny Web Audio juice — no asset files. Unlocks on first user gesture. */

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ac();
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, when = 0) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + when;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function sfxFootstep() {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime;
  const buffer = a.createBuffer(1, Math.floor(a.sampleRate * 0.05), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420 + Math.random() * 180;
  const g = a.createGain();
  g.gain.setValueAtTime(0.045, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
  src.connect(filter);
  filter.connect(g);
  g.connect(a.destination);
  src.start(t0);
}

export function sfxPen() {
  tone(620 + Math.random() * 80, 0.04, "triangle", 0.018);
}

export function sfxChat() {
  tone(520, 0.07, "sine", 0.03);
  tone(780, 0.09, "sine", 0.018, 0.04);
}

export function sfxJoin() {
  tone(360, 0.12, "sine", 0.035);
  tone(540, 0.16, "sine", 0.02, 0.05);
}
