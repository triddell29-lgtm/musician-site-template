/* =========================================================
   Musician Site Template — sound.js
   Generative ambient score + plucked guitar strings (Web Audio).
   No audio files needed: pads are synthesized, plucks use
   Karplus–Strong string synthesis.
   Exposes window.SiteSound
   ========================================================= */
(() => {
  "use strict";

  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { window.SiteSound = { supported: false, start() {}, stop() {}, toggle() {}, strum() {}, duck() {}, enabled: false }; return; }

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // Note helpers (MIDI numbers)
  const N = { E2: 40, F2: 41, A2: 45, B2: 47, C3: 48, D3: 50, E3: 52, G3: 55, A3: 57, B3: 59, C4: 60, D4: 62, E4: 64, G4: 67, A4: 69, B4: 71 };

  // Progression: Am9 → Fmaj7 → Cmaj7 → Em7 (guitar voicings, low → high)
  const CHORDS = [
    { name: "Am9",   strings: [N.A2, N.E3, N.G3, N.B3, N.C4, N.E4], pad: [N.A2, N.E3, N.G3, N.B3, N.C4] },
    { name: "Fmaj7", strings: [N.F2, N.C3, N.E3, N.A3, N.C4, N.E4], pad: [N.F2, N.C3, N.E3, N.A3] },
    { name: "Cmaj7", strings: [N.C3, N.E3, N.G3, N.B3, N.E4, N.G4], pad: [N.C3, N.G3, N.B3, N.E4] },
    { name: "Em7",   strings: [N.E2, N.B2, N.D3, N.G3, N.B3, N.E4], pad: [N.E2, N.B2, N.D3, N.G3] },
  ];
  const CHORD_LEN = 8; // seconds per chord

  let ctx, master, ambientBus, plucksBus, reverb, wet, filterLfo;
  let enabled = false, schedTimer = null, nextChordTime = 0, chordIndex = 0, currentChord = CHORDS[0];
  const bufferCache = new Map();
  const lastPluck = [];

  function init() {
    if (ctx) return;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);

    // Reverb (generated impulse response)
    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(4.5, 2.6);
    wet = ctx.createGain(); wet.gain.value = 0.55;
    reverb.connect(wet).connect(master);

    ambientBus = ctx.createGain(); ambientBus.gain.value = 0.9;
    ambientBus.connect(master); ambientBus.connect(reverb);

    plucksBus = ctx.createGain(); plucksBus.gain.value = 1;
    plucksBus.connect(master); plucksBus.connect(reverb);

    // Shared slow LFO for pad filter movement
    filterLfo = ctx.createOscillator();
    filterLfo.frequency.value = 0.05;
    filterLfo.start();
  }

  function makeImpulse(seconds, decay) {
    const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  /* ---------- Karplus–Strong plucked string ---------- */
  function pluckBuffer(freq) {
    const key = Math.round(freq * 100);
    if (bufferCache.has(key)) return bufferCache.get(key);
    const rate = ctx.sampleRate, len = Math.floor(rate * 4);
    const buf = ctx.createBuffer(1, len, rate);
    const out = buf.getChannelData(0);
    // The two-point average adds half a sample of delay, so subtract it from the loop length
    const P = Math.max(2, Math.round(rate / freq - 0.5));
    // Warm (low-passed) noise burst = nylon-string excitation
    let lp = 0;
    for (let i = 0; i < P; i++) { lp += 0.45 * ((Math.random() * 2 - 1) - lp); out[i] = lp; }
    const decay = freq < 120 ? 0.9985 : freq < 250 ? 0.998 : 0.9965;
    for (let i = P; i < len; i++) {
      out[i] = decay * 0.5 * (out[i - P] + (out[i - P - 1] || 0));
    }
    // normalize
    let peak = 0; for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
    if (peak) for (let i = 0; i < len; i++) out[i] /= peak;
    bufferCache.set(key, buf);
    return buf;
  }

  function playNote(freq, { gain = 0.3, pan = 0, when = 0, bus = plucksBus, tone = 3200 } = {}) {
    const t = Math.max(ctx.currentTime, when);
    const src = ctx.createBufferSource();
    src.buffer = pluckBuffer(freq);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.9);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = tone; f.Q.value = 0.3;
    let node = src.connect(f).connect(g);
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; node = node.connect(p); }
    node.connect(bus);
    src.start(t);
    src.stop(t + 4);
  }

  /* ---------- Ambient pad ---------- */
  function playPad(chord, t) {
    const dur = CHORD_LEN, attack = 3, release = 4;
    chord.pad.forEach((n, i) => {
      const f = midi(n);
      const g = ctx.createGain();
      const level = (i === 0 ? 0.05 : 0.032);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(level, t + attack);
      g.gain.setValueAtTime(level, t + dur - 0.5);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + release);

      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 650 + i * 60; lp.Q.value = 0.6;
      const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 250;
      filterLfo.connect(lfoAmt).connect(lp.frequency);
      lp.connect(g).connect(ambientBus);

      [-6, 6].forEach((det) => {
        const o = ctx.createOscillator();
        o.type = i === 0 ? "triangle" : "sawtooth";
        o.frequency.value = f; o.detune.value = det;
        o.connect(lp);
        o.start(t); o.stop(t + dur + release + 0.1);
      });
      setTimeout(() => { try { lfoAmt.disconnect(); } catch (e) {} }, (t - ctx.currentTime + dur + release + 1) * 1000);
    });
  }

  // Soft, sparse arpeggio notes over the pad
  function playArp(chord, t) {
    const notes = chord.strings.slice(2);
    const count = 3 + Math.floor(Math.random() * 3);
    for (let k = 0; k < count; k++) {
      const n = notes[Math.floor(Math.random() * notes.length)] + (Math.random() < 0.3 ? 12 : 0);
      const when = t + 0.6 + k * (CHORD_LEN / count) + Math.random() * 0.4;
      playNote(midi(n), { gain: 0.08 + Math.random() * 0.05, pan: Math.random() * 1.2 - 0.6, when, bus: ambientBus, tone: 2200 });
    }
  }

  function scheduler() {
    while (nextChordTime < ctx.currentTime + 1.5) {
      const chord = CHORDS[chordIndex % CHORDS.length];
      const at = nextChordTime;
      playPad(chord, at);
      playArp(chord, at);
      // Switch interactive string tuning when the chord actually changes
      setTimeout(() => { currentChord = chord; }, Math.max(0, (at - ctx.currentTime) * 1000));
      nextChordTime += CHORD_LEN;
      chordIndex++;
    }
  }

  /* ---------- Public API ---------- */
  function start() {
    init();
    ctx.resume();
    if (enabled) return;
    enabled = true;
    const t = ctx.currentTime;
    // Strings are audible right away; the ambient bed swells in slowly
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0.9, t + 0.3);
    ambientBus.gain.cancelScheduledValues(t);
    ambientBus.gain.setValueAtTime(0, t);
    ambientBus.gain.linearRampToValueAtTime(0.9, t + 6);
    if (!schedTimer) {
      nextChordTime = ctx.currentTime + 0.1;
      scheduler();
      schedTimer = setInterval(scheduler, 400);
    }
    emit();
  }

  function stop() {
    if (!ctx || !enabled) return;
    enabled = false;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 1.5);
    setTimeout(() => {
      if (enabled) return;
      clearInterval(schedTimer); schedTimer = null;
      ctx.suspend();
    }, 1700);
    emit();
  }

  // Strum one hero string. index: 0 = top (highest) … 5 = bottom (bass)
  function strum(index, velocity = 0.5, xNorm = 0.5) {
    if (!enabled || !ctx) return;
    const now = performance.now();
    if (now - (lastPluck[index] || 0) < 70) return;
    lastPluck[index] = now;
    const note = currentChord.strings[5 - index];
    playNote(midi(note), {
      gain: 0.12 + Math.min(1, velocity) * 0.28,
      pan: (xNorm - 0.5) * 0.8,
      tone: 1800 + velocity * 3000,
    });
  }

  // Lower the ambient bed (e.g. while the music player plays a real track)
  function duck(on) {
    if (!ambientBus) return;
    const t = ctx.currentTime;
    ambientBus.gain.cancelScheduledValues(t);
    ambientBus.gain.setValueAtTime(ambientBus.gain.value, t);
    ambientBus.gain.linearRampToValueAtTime(on ? 0 : 0.9, t + 1.5);
  }

  const listeners = new Set();
  function emit() { listeners.forEach((fn) => fn(enabled)); }

  document.addEventListener("visibilitychange", () => {
    if (!ctx || !enabled) return;
    document.hidden ? ctx.suspend() : ctx.resume();
  });

  window.SiteSound = {
    supported: true,
    start, stop, strum, duck,
    toggle() { enabled ? stop() : start(); },
    onChange(fn) { listeners.add(fn); },
    get enabled() { return enabled; },
  };
})();
