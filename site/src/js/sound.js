// Tiny synthesised sound kit (Web Audio, no files). Off by default.
// Browsers only allow audio after a click or key press. The sound toggle's
// click is that permission; if the visitor chose "on" before, audio unlocks
// at their first click or key press on the next visit.
const KEY = 'apf-sound';
const MASTER = 0.3; // never louder than ~30%

let wanted = false;
try {
  wanted = localStorage.getItem(KEY) === 'on';
} catch {}

let ctx = null;
let master = null;
let noise = null;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = MASTER;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Unlock on the first gesture if the visitor wants sound
for (const ev of ['pointerdown', 'keydown']) {
  window.addEventListener(ev, () => wanted && ensure(), { capture: true });
}

export const soundOn = () => wanted;

export function setSound(on) {
  wanted = on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {}
  if (on) ensure();
  window.dispatchEvent(new CustomEvent('sound:change', { detail: { on } }));
}

const ready = () => wanted && ctx && ctx.state === 'running';
const vary = (v, amount = 0.08) => v * (1 + (Math.random() - 0.5) * 2 * amount);

// One pitched blip with a fast attack and exponential decay
function tone({ from, to = from, dur = 0.1, type = 'sine', gain = 0.5, delay = 0 }) {
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBuffer() {
  if (noise) return noise;
  const len = ctx.sampleRate * 0.6;
  noise = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

export const sfx = {
  // Button press: soft low "thock" with a tiny click on top
  press() {
    if (!ready()) return;
    tone({ from: vary(240), to: 120, dur: 0.09, gain: 0.6 });
    tone({ from: 1800, to: 1200, dur: 0.02, type: 'triangle', gain: 0.12 });
  },
  // Bubble wrap: a few tiny pops a moment apart
  bubbles() {
    if (!ready()) return;
    for (let i = 0; i < 3; i++) {
      tone({ from: vary(900, 0.25), to: 300, dur: 0.05, gain: 0.22, delay: i * 0.025 + Math.random() * 0.01 });
    }
  },
  // Card landing
  thump() {
    if (!ready()) return;
    tone({ from: 140, to: 55, dur: 0.18, gain: 0.7 });
  },
  // Shape springs into a prop
  boing() {
    if (!ready()) return;
    tone({ from: vary(260), to: 620, dur: 0.16, type: 'triangle', gain: 0.25 });
    tone({ from: 620, to: 420, dur: 0.14, type: 'sine', gain: 0.18, delay: 0.12 });
  },
  // Coin pickup
  ding() {
    if (!ready()) return;
    tone({ from: 988, dur: 0.09, type: 'square', gain: 0.08 });
    tone({ from: 1319, dur: 0.3, type: 'square', gain: 0.08, delay: 0.08 });
  },
  // Poking a shape
  hit() {
    if (!ready()) return;
    tone({ from: vary(320), to: 140, dur: 0.11, type: 'triangle', gain: 0.4 });
  },
  // Entering the site: quick rising arpeggio
  enter() {
    if (!ready()) return;
    [523, 659, 784, 1047].forEach((f, i) => tone({ from: f, dur: 0.16, type: 'triangle', gain: 0.22, delay: i * 0.06 }));
  },
  // Charging the big button: short blip, pitch rises with k (0..1)
  charge(k) {
    if (!ready()) return;
    tone({ from: 300 + 700 * k, dur: 0.05, type: 'triangle', gain: 0.12 });
  },
  // Catching an idea: two quick square blips; each one in a chain is 2 semitones higher
  collect(n = 0) {
    if (!ready()) return;
    const f = 784 * Math.pow(2, Math.min(n, 8) * (2 / 12));
    tone({ from: f, dur: 0.07, type: 'square', gain: 0.07 });
    tone({ from: f * 1.5, dur: 0.16, type: 'square', gain: 0.07, delay: 0.06 });
  },
  // Counter tick
  tick() {
    if (!ready()) return;
    tone({ from: 2200, to: 1800, dur: 0.015, type: 'square', gain: 0.05 });
  },
  // Card riffle: a quick run of soft clicks
  riffle() {
    if (!ready()) return;
    for (let i = 0; i < 7; i++) {
      tone({ from: vary(1400, 0.2), to: 700, dur: 0.025, type: 'triangle', gain: 0.1, delay: i * 0.035 });
    }
  },
  // See-games launch: filtered noise sweeping up
  whoosh() {
    if (!ready()) return;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(300, t0);
    filter.frequency.exponentialRampToValueAtTime(2400, t0 + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
    src.connect(filter).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + 0.6);
  },
};
