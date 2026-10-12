/* Evensong — core: namespace, seeded RNG, deep-time math, formatting.
   Plain script (no modules): attaches to the shared EV namespace so the game
   runs from file:// in a browser and under plain require() in Node tests. */
(function (EV) {
  'use strict';

  // ---------------------------------------------------------------- RNG ----
  // Deterministic, save-friendly: the generator state is a single uint32 kept
  // in game state (`state.rs`), so a reloaded save replays identically.
  function hashSeed(str) {
    let h = 2166136261 >>> 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry(u) {
    // one mulberry32 step: returns [nextState, float in [0,1)]
    let a = (u + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const f = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return [a, f];
  }
  const rng = {
    seed: hashSeed,
    next(state) {
      const [a, f] = mulberry(state.rs >>> 0);
      state.rs = a;
      return f;
    },
    int(state, n) { return Math.floor(rng.next(state) * n); },
    pick(state, arr) { return arr[rng.int(state, arr.length)]; },
    chance(state, p) { return rng.next(state) < p; },
    range(state, lo, hi) { return lo + rng.next(state) * (hi - lo); },
    shuffle(state, arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = rng.int(state, i + 1);
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },
  };

  // ---------------------------------------------------------- deep time ----
  // The age of the universe is carried as log10(years). Adding a span of
  // 10^s years to an age of 10^a years must stay exact when the two differ
  // by hundreds of orders of magnitude, so all time arithmetic goes through
  // a stable log-sum-exp.
  const deeptime = {
    logAdd(a, s) {
      // log10(10^a + 10^s)
      if (a === -Infinity) return s;
      if (s === -Infinity) return a;
      const hi = Math.max(a, s), lo = Math.min(a, s);
      const d = lo - hi;            // <= 0
      if (d < -15) return hi;       // the smaller term is lost in a double anyway
      return hi + Math.log10(1 + Math.pow(10, d));
    },
    logSub(a, b) {
      // log10(10^a - 10^b), a > b; -Infinity when the difference underflows
      if (b === -Infinity) return a;
      const d = b - a;
      if (d >= 0) return -Infinity;
      const m = 1 - Math.pow(10, d);
      if (m <= 0) return -Infinity;
      return a + Math.log10(m);
    },
    // years (double) -> log; safe for y >= 0
    log(y) { return y <= 0 ? -Infinity : Math.log10(y); },
  };

  // --------------------------------------------------------- formatting ----
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  function sup(n) {
    return String(n).split('').map((c) => SUP[c] !== undefined ? SUP[c] : c).join('');
  }
  function pow10(log, digits) {
    // "3.2×10^38 years" style; mantissa rounded, exponent adjusted if the
    // mantissa rounds up to 10 (decimal arithmetic done carefully).
    const d = digits === undefined ? 1 : digits;
    let e = Math.floor(log);
    let m = Math.pow(10, log - e);
    m = Number(m.toFixed(d));
    if (m >= 10) { m = m / 10; e += 1; m = Number(m.toFixed(d)); }
    const ms = (d === 0 || Number.isInteger(m)) ? String(Math.round(m)) : m.toFixed(d);
    return ms + '×' + '10' + sup(e);
  }
  const NAMES = [
    [12, 'trillion'], [9, 'billion'], [6, 'million'], [3, 'thousand'],
  ];
  function fmtYears(log) {
    // A span or age in years, from "140 years" through "92 trillion years"
    // to "4.6×10^38 years".
    if (log === -Infinity) return 'no time at all';
    if (log < 15) {
      const y = Math.pow(10, log);
      for (const [e, name] of NAMES) {
        if (y >= Math.pow(10, e)) {
          const v = y / Math.pow(10, e);
          const s = v >= 100 ? String(Math.round(v)) : v.toFixed(1).replace(/\.0$/, '');
          return s + ' ' + name + ' years';
        }
      }
      return String(Math.round(y)) + ' years';
    }
    return pow10(log) + ' years';
  }
  function fmtAge(log) { return fmtYears(log); }
  function fmtEta(etaLog) {
    // For the far end: eta = log10(years); when eta itself is huge we show
    // 10^(10^k) years.
    if (etaLog < 300) return pow10(etaLog) + ' years';
    return '10^(10' + sup(Math.round(Math.log10(etaLog))) + ') years';
  }
  function fmtNum(v, d) {
    // Display rounding that never shows float dust (0.30000000000000004).
    const digits = d === undefined ? 1 : d;
    if (!isFinite(v)) return '—';
    const r = Number(v.toFixed(digits));
    if (Number.isInteger(r)) return String(r);
    return r.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
  }
  function fmtLy(ly) {
    if (ly <= 0) return 'here';
    if (ly < 1) return fmtNum(ly, 2) + ' ly';
    if (ly < 1000) return fmtNum(ly, 0) + ' ly';
    if (ly < 1e6) return fmtNum(ly / 1000, 1) + ' kly';
    return fmtNum(ly / 1e6, 1) + ' Mly';
  }
  function fmtSigned(v, d) {
    const s = fmtNum(Math.abs(v), d);
    return (v < 0 ? '−' : '+') + s;
  }

  // small numeric hygiene: snap float dust to zero, never go negative
  function tidy(v) {
    if (!isFinite(v)) return 0;
    if (Math.abs(v) < 1e-9) return 0;
    return v;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  EV.rng = rng;
  EV.deeptime = deeptime;
  EV.fmt = { sup, pow10, fmtYears, fmtAge, fmtEta, fmtNum, fmtLy, fmtSigned };
  EV.util = { tidy, clamp };
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
