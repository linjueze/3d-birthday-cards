import type { StickerId } from "./cards";

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

function noiseBuffer(ctx: AudioContext, dur: number, shape: (t: number) => number) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * shape(i / len);
  }
  return buf;
}

function tone(
  ctx: AudioContext,
  when: number,
  dur: number,
  freqStart: number,
  freqEnd: number,
  vol: number,
  type: OscillatorType = "sine",
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, when);
  if (freqEnd !== freqStart) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), when + dur * .85);
  }
  gain.gain.setValueAtTime(.0001, when);
  gain.gain.exponentialRampToValueAtTime(vol, when + Math.min(.012, dur * .2));
  gain.gain.exponentialRampToValueAtTime(.0001, when + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(when);
  osc.stop(when + dur + .02);
}

/**
 * Bespoke Web Audio sound signature tailored to each of the 12 stickers
 * (zero external audio files, gentle stationery volume, optional softer settle variant).
 */
export function playStickerStickSound(type?: StickerId, settle = false) {
  haptic(settle ? 8 : 14);
  const v = settle ? .55 : 1;
  withAudio((ctx, now) => {
    switch (type) {
      case "cake": {
        // Soft creamy pat + sweet 3-note birthday music-box sparkle (C5 -> D5 -> E5)
        tone(ctx, now, .07, 240, 140, .065 * v, "sine");
        tone(ctx, now + .02, .24, 1046.5, 1046.5, .042 * v, "triangle");
        tone(ctx, now + .085, .24, 1174.66, 1174.66, .042 * v, "triangle");
        tone(ctx, now + .15, .36, 1318.51, 1318.51, .048 * v, "sine");
        return 620;
      }
      case "candle": {
        // Delicate match strike + warm soft flame ignition whoosh
        const strike = ctx.createBufferSource();
        strike.buffer = noiseBuffer(ctx, .055, (t) => Math.pow(1 - t, 2.2));
        const sFilter = ctx.createBiquadFilter();
        sFilter.type = "highpass";
        sFilter.frequency.value = 2600;
        const sGain = ctx.createGain();
        sGain.gain.setValueAtTime(.055 * v, now);
        sGain.gain.exponentialRampToValueAtTime(.0001, now + .055);
        strike.connect(sFilter).connect(sGain).connect(ctx.destination);
        strike.start(now);

        const whoosh = ctx.createBufferSource();
        whoosh.buffer = noiseBuffer(ctx, .22, (t) => Math.sin(Math.PI * t) * Math.pow(1 - t, .6));
        const wFilter = ctx.createBiquadFilter();
        wFilter.type = "bandpass";
        wFilter.frequency.setValueAtTime(420, now + .025);
        wFilter.frequency.exponentialRampToValueAtTime(1100, now + .14);
        wFilter.frequency.exponentialRampToValueAtTime(520, now + .24);
        wFilter.Q.value = 1.6;
        const wGain = ctx.createGain();
        wGain.gain.setValueAtTime(.08 * v, now + .025);
        wGain.gain.exponentialRampToValueAtTime(.0001, now + .245);
        whoosh.connect(wFilter).connect(wGain).connect(ctx.destination);
        whoosh.start(now + .025);
        return 460;
      }
      case "balloon": {
        // Bouncy rubber balloon flick ("bloop-boing!")
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(195, now);
        osc.frequency.exponentialRampToValueAtTime(470, now + .055);
        osc.frequency.exponentialRampToValueAtTime(320, now + .12);
        osc.frequency.exponentialRampToValueAtTime(420, now + .19);
        gain.gain.setValueAtTime(.0001, now);
        gain.gain.exponentialRampToValueAtTime(.085 * v, now + .012);
        gain.gain.exponentialRampToValueAtTime(.0001, now + .22);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + .24);
        return 420;
      }
      case "crown": {
        // Regal golden metallic triad chime (E6 - G#6 - B6)
        tone(ctx, now, .42, 1318.51, 1318.51, .042 * v, "sine");
        tone(ctx, now + .035, .42, 1661.22, 1661.22, .038 * v, "triangle");
        tone(ctx, now + .07, .52, 1975.53, 1975.53, .044 * v, "sine");
        tone(ctx, now + .07, .35, 3951.07, 3951.07, .014 * v, "sine");
        return 760;
      }
      case "gift": {
        // Crisp gift-box lid tap + silky ribbon lift + cheerful mini chime
        tone(ctx, now, .065, 290, 145, .075 * v, "triangle");
        const rustle = ctx.createBufferSource();
        rustle.buffer = noiseBuffer(ctx, .13, (t) => Math.sin(Math.PI * t));
        const rFilter = ctx.createBiquadFilter();
        rFilter.type = "bandpass";
        rFilter.frequency.setValueAtTime(1600, now + .02);
        rFilter.frequency.exponentialRampToValueAtTime(3100, now + .14);
        rFilter.Q.value = 1.4;
        const rGain = ctx.createGain();
        rGain.gain.setValueAtTime(.04 * v, now + .02);
        rGain.gain.exponentialRampToValueAtTime(.0001, now + .15);
        rustle.connect(rFilter).connect(rGain).connect(ctx.destination);
        rustle.start(now + .02);
        tone(ctx, now + .06, .26, 880, 1174.66, .038 * v, "sine");
        return 500;
      }
      case "champagne": {
        // Crystal champagne glass clink + delicate effervescent bubbles!
        tone(ctx, now, .52, 2320, 2310, .052 * v, "sine");
        tone(ctx, now, .44, 3465, 3455, .026 * v, "sine");
        tone(ctx, now, .22, 5180, 5160, .012 * v, "sine");
        const bubbles = [
          [.08, 1780], [.125, 2140], [.165, 1960], [.21, 2480], [.255, 2240],
        ] as const;
        for (const [offset, freq] of bubbles) {
          tone(ctx, now + offset, .04, freq, freq * 1.18, .018 * v, "sine");
        }
        return 740;
      }
      case "bow": {
        // Silky satin ribbon swish + soft gentle tuck
        const silk = ctx.createBufferSource();
        silk.buffer = noiseBuffer(ctx, .24, (t) => Math.sin(Math.PI * t) * Math.pow(1 - t, .4));
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(2200, now);
        filter.frequency.exponentialRampToValueAtTime(4200, now + .12);
        filter.frequency.exponentialRampToValueAtTime(1900, now + .24);
        filter.Q.value = 2.4;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(.058 * v, now);
        gain.gain.exponentialRampToValueAtTime(.0001, now + .24);
        silk.connect(filter).connect(gain).connect(ctx.destination);
        silk.start(now);
        tone(ctx, now + .08, .12, 680, 920, .022 * v, "sine");
        return 460;
      }
      case "star": {
        // Magical celesta stardust twinkle arpeggio
        const notes = [1567.98, 2093.0, 2637.02, 3135.96];
        notes.forEach((freq, idx) => {
          tone(ctx, now + idx * .038, .32, freq, freq * 1.01, .036 * v, "sine");
        });
        return 620;
      }
      case "confetti": {
        // Mini party popper "pop!" + fluttering paper confetti crackles
        tone(ctx, now, .055, 420, 95, .095 * v, "triangle");
        const popNoise = ctx.createBufferSource();
        popNoise.buffer = noiseBuffer(ctx, .06, (t) => Math.pow(1 - t, 3));
        const pFilter = ctx.createBiquadFilter();
        pFilter.type = "bandpass";
        pFilter.frequency.value = 1500;
        const pGain = ctx.createGain();
        pGain.gain.setValueAtTime(.085 * v, now);
        pGain.gain.exponentialRampToValueAtTime(.0001, now + .06);
        popNoise.connect(pFilter).connect(pGain).connect(ctx.destination);
        popNoise.start(now);
        // Fluttering confetti sparkles
        const flutters = [
          [.05, 1950], [.085, 2450], [.115, 1720], [.15, 2800], [.185, 2150], [.22, 2600],
        ] as const;
        for (const [offset, freq] of flutters) {
          tone(ctx, now + offset, .045, freq, freq * .88, .02 * v, "triangle");
        }
        return 500;
      }
      case "bouquet": {
        // Soft botanical leaf rustle + warm floral harp strum (G4 - B4 - D5 - G5)
        const leaves = ctx.createBufferSource();
        leaves.buffer = noiseBuffer(ctx, .18, (t) => Math.sin(Math.PI * t) * .9);
        const lFilter = ctx.createBiquadFilter();
        lFilter.type = "bandpass";
        lFilter.frequency.value = 2600;
        lFilter.Q.value = 1.1;
        const lGain = ctx.createGain();
        lGain.gain.setValueAtTime(.036 * v, now);
        lGain.gain.exponentialRampToValueAtTime(.0001, now + .18);
        leaves.connect(lFilter).connect(lGain).connect(ctx.destination);
        leaves.start(now);
        const harp = [392.0, 493.88, 587.33, 783.99];
        harp.forEach((freq, idx) => {
          tone(ctx, now + .02 + idx * .036, .38, freq, freq, .036 * v, "triangle");
        });
        return 680;
      }
      case "bottle": {
        // Classic hollow wish-bottle cork "plop!" + dreamy glass echo
        tone(ctx, now, .095, 185, 690, .095 * v, "sine");
        tone(ctx, now + .075, .42, 1396.91, 1396.91, .034 * v, "sine");
        tone(ctx, now + .14, .46, 1760.0, 1760.0, .026 * v, "sine");
        return 760;
      }
      case "hat": {
        // Cheerful mini party-horn toot (rising playful fifth)
        const osc = ctx.createOscillator();
        const overtone = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        overtone.type = "triangle";
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(698.46, now + .11);
        osc.frequency.setValueAtTime(783.99, now + .12);
        overtone.frequency.setValueAtTime(1046.5, now);
        overtone.frequency.exponentialRampToValueAtTime(1396.91, now + .11);
        overtone.frequency.setValueAtTime(1567.98, now + .12);
        filter.type = "bandpass";
        filter.frequency.value = 1450;
        filter.Q.value = 1.9;
        gain.gain.setValueAtTime(.0001, now);
        gain.gain.exponentialRampToValueAtTime(.068 * v, now + .018);
        gain.gain.setValueAtTime(.058 * v, now + .18);
        gain.gain.exponentialRampToValueAtTime(.0001, now + .27);
        osc.connect(filter);
        overtone.connect(filter);
        filter.connect(gain).connect(ctx.destination);
        osc.start(now);
        overtone.start(now);
        osc.stop(now + .29);
        overtone.stop(now + .29);
        return 480;
      }
      default: {
        tone(ctx, now, .075, 340, 170, .085 * v, "sine");
        tone(ctx, now + .018, .12, 1320, 1760, .026 * v, "triangle");
        return 360;
      }
    }
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
