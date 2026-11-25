const SFX_MUTE_KEY = "birthday-cards:sfx-muted";

let mutedCache: boolean | null = null;

export function isSfxMuted(): boolean {
  if (mutedCache !== null) return mutedCache;
  if (typeof window === "undefined") return false;
  try {
    mutedCache = localStorage.getItem(SFX_MUTE_KEY) === "1";
  } catch {
    mutedCache = false;
  }
  return mutedCache;
}

export function setSfxMuted(muted: boolean) {
  mutedCache = muted;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SFX_MUTE_KEY, muted ? "1" : "0");
  } catch {
    // Ignore storage quota errors.
  }
}

export function haptic(pattern: number | number[]) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some mobile WebViews block vibrate silently.
  }
}

function withAudio(run: (ctx: AudioContext, now: number) => number) {
  if (typeof window === "undefined" || !window.AudioContext || isSfxMuted()) return;
  try {
    const ctx = new AudioContext();
    void ctx.resume().then(() => {
      const ttl = run(ctx, ctx.currentTime + .008);
      window.setTimeout(() => {
        if (ctx.state !== "closed") void ctx.close().catch(() => {});
      }, ttl);
    }).catch(() => {
      if (ctx.state !== "closed") void ctx.close().catch(() => {});
    });
  } catch {
    // Web Audio unavailable.
  }
}

/** Soft linen paper swish when switching cardstock or flipping covers. */
export function playPaperSwishSound(pitchScale = 1) {
  haptic(8);
  withAudio((ctx, now) => {
    const dur = .19;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t) * Math.pow(1 - t, .55);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1100 * pitchScale, now);
    filter.frequency.exponentialRampToValueAtTime(2400 * pitchScale, now + dur * .7);
    filter.Q.value = 1.1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(.052, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(now);
    return 480;
  });
}

/** Crisp tactile pop when pressing a die-cut sticker onto cotton cardstock. */
export function playStickerStickSound() {
  haptic(14);
  withAudio((ctx, now) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(170, now + .065);
    gain.gain.setValueAtTime(.085, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .075);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + .085);

    const sparkle = ctx.createOscillator();
    const sGain = ctx.createGain();
    sparkle.type = "triangle";
    sparkle.frequency.setValueAtTime(1320, now + .018);
    sparkle.frequency.exponentialRampToValueAtTime(1760, now + .11);
    sGain.gain.setValueAtTime(.026, now + .018);
    sGain.gain.exponentialRampToValueAtTime(.0001, now + .14);
    sparkle.connect(sGain).connect(ctx.destination);
    sparkle.start(now + .018);
    sparkle.stop(now + .16);
    return 360;
  });
}

/** Delicate upward peel sound when removing a sticker. */
export function playStickerPeelSound() {
  haptic(10);
  withAudio((ctx, now) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + .085);
    gain.gain.setValueAtTime(.055, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .095);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + .11);
    return 320;
  });
}

/** Warm glossy bead drop plink when choosing a wax seal color. */
export function playWaxDropSound() {
  haptic(12);
  withAudio((ctx, now) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(290, now + .09);
    gain.gain.setValueAtTime(.07, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .11);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + .12);
    return 320;
  });
}

/** Bright sparkle arpeggio when triggering Random Studio Inspiration. */
export function playInspireSound() {
  haptic([10, 35, 16]);
  withAudio((ctx, now) => {
    const notes = [659.25, 783.99, 987.77, 1318.51];
    notes.forEach((freq, idx) => {
      const t = now + idx * .055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(.0001, t);
      gain.gain.exponentialRampToValueAtTime(.045, t + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, t + .42);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + .45);
    });
    return 900;
  });
}
