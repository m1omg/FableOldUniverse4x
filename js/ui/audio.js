/* Evensong — procedural sound: a drone that thins by age, and small bells.
   No audio files. Everything is scheduled on the WebAudio clock, so it is
   independent of the display's refresh rate. */
(function (EV) {
  'use strict';

  let ctx = null, master = null, droneNodes = [], currentEra = -1, muted = false;

  // partials per era: the music loses voices as the universe does
  const ERA_DRONES = [
    { base: 55.0, partials: [1, 1.5, 2, 2.98, 4.02], level: 0.05, filter: 900 },  // the Vigil: a warm chord
    { base: 49.0, partials: [1, 1.5, 2.01], level: 0.04, filter: 500 },           // the Ash
    { base: 41.2, partials: [1, 1.99], level: 0.03, filter: 300 },                // the Wells
    { base: 32.7, partials: [1], level: 0.022, filter: 160 },                     // the Hush: one voice, almost silence
  ];

  function ensureCtx() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; return false; }
    return true;
  }

  function stopDrone() {
    for (const n of droneNodes) { try { n.stop ? n.stop() : n.disconnect(); } catch (e) { /* ignore */ } }
    droneNodes = [];
  }

  function startDrone(era) {
    if (!ensureCtx()) return;
    if (era === currentEra && droneNodes.length) return;
    currentEra = era;
    stopDrone();
    const cfg = ERA_DRONES[Math.max(0, Math.min(3, era))];
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cfg.filter;
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.connect(lp); lp.connect(master);
    bus.gain.linearRampToValueAtTime(cfg.level, ctx.currentTime + 6);
    droneNodes.push(bus, lp);
    cfg.partials.forEach((p, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'triangle' : 'sine';
      o.frequency.value = cfg.base * p * (1 + (i % 2 ? 0.0012 : -0.0009)); // slow beating
      const g = ctx.createGain();
      g.gain.value = 1 / (i + 1.3);
      // a very slow swell, different per partial (clock-based, not frame-based)
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.013 + i * 0.007;
      const lfoG = ctx.createGain();
      lfoG.gain.value = 0.3 / (i + 1.3);
      lfo.connect(lfoG); lfoG.connect(g.gain);
      o.connect(g); g.connect(bus);
      o.start(); lfo.start();
      droneNodes.push(o, g, lfo, lfoG);
    });
  }

  function bell(freq, dur, level) {
    if (!ensureCtx() || muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 2.76; // inharmonic partial: bell-like
    const g = ctx.createGain();
    const g2 = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g2.gain.setValueAtTime(level * 0.3, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.6);
    o.connect(g); o2.connect(g2); g.connect(master); g2.connect(master);
    o.start(t); o2.start(t);
    o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }

  const audio = {
    begin(era) { startDrone(era); },
    setEra(era) { if (ctx) startDrone(era); },
    wheel() { bell(98, 2.2, 0.12); },
    letter() { bell(392, 1.6, 0.06); },
    bad() { bell(62, 2.8, 0.1); },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 1;
      return muted;
    },
    get muted() { return muted; },
  };
  EV.audio = audio;
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
