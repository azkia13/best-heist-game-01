// Tiny WebAudio beeps, no audio files: every sound is one oscillator
// shaped by a gain envelope. Created lazily on first use (browsers want a
// user gesture first), and silently inert when audio is unavailable.

export function createAudio() {
  return { ctx: null, muted: false };
}

function ensureCtx(audio) {
  if (audio.ctx) return audio.ctx;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audio.ctx = new Ctx();
  } catch {
    audio.ctx = null;
  }
  return audio.ctx;
}

function beep(audio, freq, duration, type, volume, slideTo) {
  if (audio.muted) return;
  const ctx = ensureCtx(audio);
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio is decoration; a failure must never break the game.
  }
}

// A bright coin chime when loot is pocketed.
export function playPickup(audio) {
  beep(audio, 880, 0.12, 'sine', 0.12);
  setTimeout(() => beep(audio, 1318, 0.16, 'sine', 0.1), 70);
}

// A low two-note alarm sting when a guard's suspicion maxes out.
export function playSpotted(audio) {
  beep(audio, 220, 0.22, 'square', 0.09, 165);
  setTimeout(() => beep(audio, 196, 0.28, 'square', 0.09, 147), 160);
}

// A rising siren blip as the alarm climbs past a threshold.
export function playAlarmTick(audio) {
  beep(audio, 520, 0.1, 'triangle', 0.08, 780);
}

// A soft puff for the smoke bomb.
export function playSmoke(audio) {
  beep(audio, 320, 0.3, 'sine', 0.08, 120);
}

// A metallic click for the lockpick finishing.
export function playUnlock(audio) {
  beep(audio, 660, 0.08, 'square', 0.07);
  setTimeout(() => beep(audio, 990, 0.12, 'square', 0.07), 90);
}

// A short fanfare arpeggio for the getaway.
export function playWin(audio) {
  [523, 659, 784, 1046].forEach((f, i) => {
    setTimeout(() => beep(audio, f, 0.22, 'triangle', 0.1), i * 110);
  });
}

// A dull thud for getting caught.
export function playCaught(audio) {
  beep(audio, 140, 0.5, 'sawtooth', 0.1, 60);
}
