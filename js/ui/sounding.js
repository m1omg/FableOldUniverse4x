/* Evensong — the Sounding: a line paid out into the dark. Depth is light-
   distance from home. All animation is a pure function of elapsed time, so
   the map looks the same at any display refresh rate. */
(function (EV) {
  'use strict';
  const D = EV.data;

  let cv, cx, getState, onSelect;
  let layout = {};      // siteId -> {x, y, r}
  let stars = null;     // background points, seeded once per game seed
  let reduced = false;

  const BAND_FRAC = [0.09, 0.15, 0.18, 0.2, 0.2, 0.18];

  function hashFrac(s, salt) {
    let h = 2166136261 >>> 0;
    const str = s + ':' + salt;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 8) % 10000) / 10000;
  }

  function bandTop(i, H) {
    let y = 0;
    for (let b = 0; b < i; b++) y += BAND_FRAC[b];
    return y * H;
  }

  function computeLayout(state, W, H) {
    layout = {};
    const byBand = {};
    for (const s of state.sites) {
      if (s.gone || s.hidden) continue;
      (byBand[s.band] = byBand[s.band] || []).push(s);
    }
    for (const b in byBand) {
      const list = byBand[b];
      list.sort((a, c) => a.ly - c.ly);
      const top = bandTop(Number(b), H), hgt = BAND_FRAC[b] * H;
      list.forEach((s, i) => {
        const fy = (i + 0.6) / (list.length + 0.2);
        const fx = 0.2 + 0.6 * hashFrac(s.id, 'x');
        layout[s.id] = {
          x: fx * W,
          y: top + fy * hgt,
          r: s.kind === 'blackhole' ? 9 : s.kind === 'remnants' ? 8 : 6,
        };
      });
    }
  }

  function starField(state) {
    const n = 90;
    const pts = [];
    for (let i = 0; i < n; i++) {
      pts.push({
        fx: hashFrac(state.seed, 'sx' + i),
        fy: hashFrac(state.seed, 'sy' + i),
        p: hashFrac(state.seed, 'sp' + i),
      });
    }
    return pts;
  }

  // temperature palette for the dying things
  function glowColor(site, state) {
    const live = site.sources.filter((s) => !s.dead);
    if (site.kind === 'blackhole') return '#060608';
    if (!live.length) return '#2a2420';
    const strong = Math.max.apply(null, live.map((s) => s.power));
    if (strong >= 7) return '#e8b568';
    if (strong >= 4) return '#c98a52';
    if (strong >= 2) return '#9c5f44';
    return '#6e4638';
  }

  function drawSiteGlyph(site, L, state, t, selected) {
    const x = L.x, y = L.y;
    const col = glowColor(site, state);
    const inhabited = state.hearths.some((h) => h.siteId === site.id);
    cx.save();

    const tw = reduced ? 1 : (0.88 + 0.12 * Math.sin(t / 1700 + hashFrac(site.id, 'tw') * 6.28));
    if (site.kind === 'blackhole') {
      cx.beginPath(); cx.arc(x, y, 7, 0, 6.2832);
      cx.fillStyle = '#010102'; cx.fill();
      cx.strokeStyle = (site.built.mill > 0) ? 'rgba(216,168,96,0.8)' : 'rgba(150,140,130,0.35)';
      cx.lineWidth = 1.2;
      cx.stroke();
      // a faint lensing arc
      cx.beginPath(); cx.arc(x, y, 10.5, 2.2, 3.6);
      cx.strokeStyle = 'rgba(190,180,170,' + (0.22 * tw) + ')';
      cx.lineWidth = 0.8; cx.stroke();
    } else if (site.kind === 'browndwarfs' || site.kind === 'wdpair') {
      const d = 4;
      cx.fillStyle = col;
      cx.globalAlpha = 0.9 * tw;
      cx.beginPath(); cx.arc(x - d, y, 2.3, 0, 6.2832); cx.fill();
      cx.beginPath(); cx.arc(x + d, y + 1, 2.0, 0, 6.2832); cx.fill();
      cx.globalAlpha = 1;
    } else if (site.kind === 'remnants' || site.kind === 'hold') {
      cx.fillStyle = col;
      for (let i = 0; i < 4; i++) {
        const ox = (hashFrac(site.id, 'rx' + i) - 0.5) * 16;
        const oy = (hashFrac(site.id, 'ry' + i) - 0.5) * 12;
        cx.globalAlpha = (0.4 + 0.5 * hashFrac(site.id, 'ra' + i)) * tw;
        cx.beginPath(); cx.arc(x + ox, y + oy, 1.8, 0, 6.2832); cx.fill();
      }
      cx.globalAlpha = 1;
      if (site.kind === 'hold') {
        cx.strokeStyle = 'rgba(127,216,207,0.8)'; cx.lineWidth = 1;
        cx.strokeRect(x - 10, y - 8, 20, 16);
      }
    } else if (site.kind === 'neutronstar') {
      cx.fillStyle = '#cfd6e0';
      cx.globalAlpha = tw;
      cx.beginPath(); cx.arc(x, y, 2.2, 0, 6.2832); cx.fill();
      cx.globalAlpha = 0.5 * tw;
      cx.beginPath(); cx.moveTo(x - 8, y - 5); cx.lineTo(x + 8, y + 5);
      cx.strokeStyle = '#8f98a8'; cx.lineWidth = 0.7; cx.stroke();
      cx.globalAlpha = 1;
    } else {
      // worlds, dwarfs, stars
      const r = site.kind === 'star' || site.kind === 'mergerstar' ? 5.5 : 4.2;
      const glow = site.sources.some((s) => !s.dead);
      if (glow) {
        const g = cx.createRadialGradient(x, y, 0, x, y, r * 3.2);
        g.addColorStop(0, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        cx.globalAlpha = 0.5 * tw;
        cx.fillStyle = g;
        cx.beginPath(); cx.arc(x, y, r * 3.2, 0, 6.2832); cx.fill();
        cx.globalAlpha = 1;
      }
      cx.fillStyle = site.world && site.warm ? '#d9c28a' : col;
      cx.beginPath(); cx.arc(x, y, r, 0, 6.2832); cx.fill();
      if (!glow) { // outline the cold
        cx.strokeStyle = 'rgba(120,115,105,0.5)'; cx.lineWidth = 0.7;
        cx.beginPath(); cx.arc(x, y, r, 0, 6.2832); cx.stroke();
      }
    }

    if (inhabited) { // thin neon where people still live
      cx.strokeStyle = 'rgba(127,216,207,0.85)';
      cx.lineWidth = 1;
      cx.beginPath(); cx.arc(x, y, L.r + 6, 0, 6.2832); cx.stroke();
    }
    if (site.built && (site.built.veil || 0) > 0) {
      cx.strokeStyle = 'rgba(127,216,207,0.3)';
      cx.setLineDash([2, 4]);
      cx.beginPath(); cx.arc(x, y, L.r + 10, 0, 6.2832); cx.stroke();
      cx.setLineDash([]);
    }
    if (selected) {
      cx.strokeStyle = '#d8a860';
      cx.setLineDash([3, 3]);
      cx.lineWidth = 1;
      cx.beginPath(); cx.arc(x, y, L.r + 9, 0, 6.2832); cx.stroke();
      cx.setLineDash([]);
    }

    // name
    cx.font = '11px Georgia, serif';
    cx.textAlign = 'left';
    cx.fillStyle = inhabited ? 'rgba(127,216,207,0.9)' : site.resolved ? 'rgba(141,137,124,0.85)' : 'rgba(90,87,78,0.7)';
    const label = site.resolved ? site.name : site.name + ' ?';
    cx.fillText(label, x + L.r + 14, y + 3.5);
    cx.restore();
  }

  function draw(t) {
    if (!cv || !getState) return;
    const state = getState();
    const W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    const dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    }
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, W, H);
    cx.fillStyle = '#050608';
    cx.fillRect(0, 0, W, H);
    if (!state) return;

    computeLayout(state, W, H);
    if (!stars) stars = starField(state);

    // background stars thin out by era: honest skies
    const starAlpha = [0.5, 0.22, 0.06, 0][state.era];
    if (starAlpha > 0) {
      for (const p of stars) {
        const a = starAlpha * (reduced ? 0.8 : (0.55 + 0.45 * Math.sin(t / 2400 + p.p * 6.28)));
        cx.fillStyle = 'rgba(200,195,185,' + a.toFixed(3) + ')';
        cx.fillRect(p.fx * W, p.fy * H, 1, 1);
      }
    }

    // band lines and names
    cx.font = '10px Georgia, serif';
    for (let b = 0; b < D.BANDS.length; b++) {
      const yTop = bandTop(b, H);
      cx.strokeStyle = 'rgba(35,38,46,0.9)';
      cx.beginPath(); cx.moveTo(0, yTop); cx.lineTo(W, yTop); cx.stroke();
      cx.fillStyle = 'rgba(90,87,78,0.9)';
      const bn = D.BANDS[b];
      const earHere = state.ear && state.ear.indexOf(b) >= 0;
      cx.fillText(bn.name.toUpperCase() + (b > 0 ? '  ·  to ' + EV.fmt.fmtLy(bn.maxLy) : ''), 8, yTop + 12);
      if (earHere) {
        cx.fillStyle = 'rgba(127,216,207,0.75)';
        cx.fillText('◉ the Ear listens here', 8, yTop + 24);
      }
      // the Gleaner's tide-mark
      if (state.gleaner.awake && !state.gleaner.starved && state.gleaner.band === b && state.era < 3) {
        const gy = yTop + BAND_FRAC[b] * H * 0.5;
        const pulse = reduced ? 0.4 : 0.3 + 0.18 * Math.sin(t / 900);
        const g = cx.createRadialGradient(W - 26, gy, 2, W - 26, gy, 22);
        g.addColorStop(0, 'rgba(154,118,201,' + pulse + ')');
        g.addColorStop(1, 'rgba(154,118,201,0)');
        cx.fillStyle = g;
        cx.beginPath(); cx.arc(W - 26, gy, 22, 0, 6.2832); cx.fill();
        cx.fillStyle = 'rgba(154,118,201,0.85)';
        cx.fillText('the Gleaner', W - 78, gy + 26);
      }
      if (state.decoy && state.decoy.turns > 0 && state.decoy.band === b) {
        const gy = yTop + BAND_FRAC[b] * H * 0.72;
        cx.fillStyle = 'rgba(216,168,96,0.9)';
        cx.fillText('▲ decoy burning', W - 96, gy);
      }
    }

    // ferries in flight
    for (const f of state.ferries) {
      const A = layout[f.from], B = layout[f.to];
      if (!A || !B) continue;
      const span = f.arriveAt - f.departed;
      const prog = span > 0 ? Math.max(0, Math.min(1, (state.ageLog - f.departed) / span)) : 1;
      cx.strokeStyle = 'rgba(127,216,207,0.3)';
      cx.setLineDash([2, 5]);
      cx.beginPath();
      const mx = (A.x + B.x) / 2 + 30, my = (A.y + B.y) / 2;
      cx.moveTo(A.x, A.y); cx.quadraticCurveTo(mx, my, B.x, B.y);
      cx.stroke();
      cx.setLineDash([]);
      const q = (p) => {
        const u = 1 - p;
        return [u * u * A.x + 2 * u * p * mx + p * p * B.x, u * u * A.y + 2 * u * p * my + p * p * B.y];
      };
      const [px, py] = q(prog);
      cx.fillStyle = '#7fd8cf';
      cx.beginPath(); cx.arc(px, py, 2.2, 0, 6.2832); cx.fill();
    }

    // sites
    const sel = EV.ui ? EV.ui.selectedSite : null;
    for (const s of state.sites) {
      if (s.gone || s.hidden) continue;
      const L = layout[s.id];
      if (L) drawSiteGlyph(s, L, state, t, sel === s.id);
    }
  }

  function siteAt(px, py) {
    let best = null, bd = 1e9;
    for (const id in layout) {
      const L = layout[id];
      const d = Math.hypot(px - L.x, py - L.y);
      if (d < Math.max(16, L.r + 10) && d < bd) { bd = d; best = id; }
    }
    return best;
  }

  function init(canvas, getStateFn, onSelectFn) {
    cv = canvas;
    cx = cv.getContext('2d');
    getState = getStateFn;
    onSelect = onSelectFn;
    reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    cv.addEventListener('click', (e) => {
      const r = cv.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const id = siteAt(px, py);
      if (id && onSelect) { onSelect(id); return; }
      // empty sky: turn the Ear to this band
      const st = getState();
      if (!st) return;
      const H = cv.clientHeight;
      let band = D.BANDS.length - 1;
      for (let b = 0; b < D.BANDS.length; b++) {
        if (py < bandTop(b + 1 > 5 ? 5 : b + 1, H) || b === 5) { band = b; break; }
      }
      const slots = EV.actions.earSlots(st);
      let ear = st.ear.slice();
      if (ear.indexOf(band) >= 0) ear = ear.filter((x) => x !== band);
      else { ear.push(band); while (ear.length > slots) ear.shift(); }
      EV.actions.setEar(st, ear);
      EV.ui.toast(ear.indexOf(band) >= 0 ? 'The Ear turns to ' + D.BANDS[band].name + '.' : 'The Ear turns away from ' + D.BANDS[band].name + '.');
      EV.ui.refresh();
    });
    cv.addEventListener('mousemove', (e) => {
      const r = cv.getBoundingClientRect();
      const id = siteAt(e.clientX - r.left, e.clientY - r.top);
      if (id) {
        const st = getState();
        const s = st.sites.find((x) => x.id === id);
        const pop = st.hearths.filter((h) => h.siteId === id).length;
        EV.dom.showTip(e.clientX, e.clientY, s.name + ' · ' + EV.fmt.fmtLy(s.ly) + (pop ? ' · ' + pop + ' hearth' + (pop > 1 ? 's' : '') : ''));
        cv.style.cursor = 'pointer';
      } else { EV.dom.hideTip(); cv.style.cursor = 'default'; }
    });
    cv.addEventListener('mouseleave', () => EV.dom.hideTip());
  }

  function resetField() { stars = null; }

  EV.sounding = { init, draw, resetField };
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
