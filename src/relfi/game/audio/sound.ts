/**
 * Tiny Web Audio synth + optional MP3 clips. All sounds are generated on the
 * fly or loaded from /audio/rel-fi/ (see the README in that folder). Respects
 * an "on/off" flag from the game store. Audio context unlocks lazily on first
 * user gesture per browser autoplay policy. Missing MP3 files never break
 * gameplay — playback failures fall back to synth tones or are ignored.
 */

let ctx: AudioContext | null = null;
let unlocked = false;

// ===== MP3 clips (optional assets) =====

const RELFI_AUDIO_BASE = "/audio/rel-fi/";
type ClipName = "background" | "button-click" | "win" | "lose";
const clipFiles: Record<ClipName, string> = {
  background: `${RELFI_AUDIO_BASE}background.mp3`,
  "button-click": `${RELFI_AUDIO_BASE}button-click.mp3`,
  win: `${RELFI_AUDIO_BASE}win.mp3`,
  lose: `${RELFI_AUDIO_BASE}lose.mp3`,
};

let bgAudio: HTMLAudioElement | null = null;
let bgStarting = false;

/** Play a one-shot MP3 clip. Silent no-op if the file is missing or blocked. */
export function playClip(name: Exclude<ClipName, "background">, volume = 0.55) {
  if (typeof window === "undefined") return;
  try {
    const el = new Audio(clipFiles[name]);
    el.volume = volume;
    el.play().catch(() => {
      /* missing file or autoplay block — ignore */
    });
  } catch {
    /* ignore */
  }
}

/**
 * Start the looping background track. Deduplicated: only one element, one
 * playback at a time. If autoplay is blocked or the file is missing, a later
 * call (e.g. from a user gesture) will try again.
 */
export function startBackground() {
  if (typeof window === "undefined" || bgStarting) return;
  try {
    if (!bgAudio) {
      bgAudio = new Audio(clipFiles.background);
      bgAudio.loop = true;
      bgAudio.volume = 0.22;
    }
    bgStarting = true;
    bgAudio.play().catch(() => {
      bgStarting = false;
    });
  } catch {
    bgStarting = false;
  }
}

/** Pause + rewind the background track (safe to call repeatedly). */
export function stopBackground() {
  bgStarting = false;
  if (bgAudio) {
    try {
      bgAudio.pause();
      bgAudio.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const AC = w.AudioContext ?? w.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume();
  unlocked = true;
}

type ToneOpts = {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  release?: number;
  slideTo?: number;
};

function tone({
  freq,
  duration,
  type = "sine",
  gain = 0.15,
  attack = 0.005,
  release = 0.08,
  slideTo,
}: ToneOpts) {
  const c = getCtx();
  if (!c || !unlocked) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);
  osc.connect(g).connect(c.destination);
  osc.start(now);
  osc.stop(now + duration + release + 0.02);
}

function noise(duration = 0.15, gain = 0.08) {
  const c = getCtx();
  if (!c || !unlocked) return;
  const buffer = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = c.createGain();
  g.gain.value = gain;
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 800;
  src.connect(filter).connect(g).connect(c.destination);
  src.start();
}

export const sfx = {
  lock() {
    tone({ freq: 220, duration: 0.05, type: "square", gain: 0.18 });
    tone({ freq: 90, duration: 0.12, type: "triangle", gain: 0.22, slideTo: 60 });
    noise(0.08, 0.06);
  },
  tick() {
    tone({ freq: 1200, duration: 0.02, type: "square", gain: 0.06 });
  },
  heartbeat() {
    tone({ freq: 80, duration: 0.08, type: "sine", gain: 0.2 });
    setTimeout(() => tone({ freq: 60, duration: 0.1, type: "sine", gain: 0.15 }), 140);
  },
  reveal() {
    [329, 415, 523, 659].forEach((f, i) =>
      setTimeout(() => tone({ freq: f, duration: 0.18, type: "triangle", gain: 0.12 }), i * 80),
    );
  },
  tokenSmall() {
    tone({ freq: 660, duration: 0.08, type: "triangle", gain: 0.12 });
    setTimeout(() => tone({ freq: 880, duration: 0.1, type: "triangle", gain: 0.12 }), 60);
  },
  tokenBig() {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => tone({ freq: f, duration: 0.12, type: "triangle", gain: 0.15 }), i * 60),
    );
  },
  hover() {
    tone({ freq: 900, duration: 0.02, type: "sine", gain: 0.04 });
  },
  select() {
    tone({ freq: 520, duration: 0.05, type: "triangle", gain: 0.1 });
  },
  click() {
    playClip("button-click", 0.4);
    tone({ freq: 700, duration: 0.03, type: "triangle", gain: 0.07 });
  },
  win() {
    playClip("win", 0.6);
  },
  lose() {
    playClip("lose", 0.6);
  },
  roleReveal() {
    tone({ freq: 180, duration: 0.3, type: "sawtooth", gain: 0.1, slideTo: 440 });
  },
};
