/* Evensong — the Vigil Line: a log-time ribbon from 10^14 years to the far
   end, with every foreseen death marked on it. Clicking opens the timeline. */
(function (EV) {
  'use strict';

  let cv, cx, getState, onClick;

  // the ribbon's time axis: log10(age). Segments compress the far end.
  const SEGS = [
    { from: 14, to: 14.01, w: 0.14 },  // the Vigil in close-up
    { from: 14.01, to: 20, w: 0.3 },
    { from: 20, to: 90, w: 0.34 },
    { from: 90, to: 150, w: 0.22 },
  ];
  function xOf(ageLog, W) {
    let acc = 0;
    for (const s of SEGS) {
      if (ageLog <= s.to) {
        const f = Math.max(0, Math.min(1, (ageLog - s.from) / (s.to - s.from)));
        return (acc + f * s.w) * W;
      }
      acc += s.w;
    }
    return W;
  }

  const KIND_COLOR = {
    source: 'rgba(201,111,95,0.9)',
    loss: 'rgba(201,111,95,0.9)',
    warn: 'rgba(216,168,96,0.9)',
    era: 'rgba(216,168,96,1)',
    hope: 'rgba(163,201,138,0.9)',
    event: 'rgba(141,137,124,0.8)',
  };

  function draw() {
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
    if (!state) return;
    const mid = H * 0.58;

    // the line itself, dimming toward the end
    const grad = cx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, 'rgba(216,168,96,0.8)');
    grad.addColorStop(0.5, 'rgba(160,120,80,0.55)');
    grad.addColorStop(1, 'rgba(90,87,78,0.3)');
    cx.strokeStyle = grad;
    cx.lineWidth = 1.4;
    cx.beginPath(); cx.moveTo(4, mid); cx.lineTo(W - 4, mid); cx.stroke();

    // era ticks
    cx.font = '9px Georgia, serif';
    cx.fillStyle = 'rgba(90,87,78,0.9)';
    const eras = [[14, 'VIGIL'], [14.01, ''], [20, 'WELLS'], [87.1, 'HUSH']];
    cx.fillText('ASH', xOf(15.5, W) - 8, mid - 10);
    for (const [a, n] of eras) {
      const x = xOf(a, W);
      cx.strokeStyle = 'rgba(90,87,78,0.6)';
      cx.beginPath(); cx.moveTo(x, mid - 7); cx.lineTo(x, mid + 7); cx.stroke();
      if (n) cx.fillText(n, Math.min(x + 3, W - 34), mid - 10);
    }

    // foreseen marks
    const marks = EV.forecast.list(state).slice(0, 60);
    for (const m of marks) {
      const x = xOf(m.atLog, W);
      cx.strokeStyle = KIND_COLOR[m.kind] || KIND_COLOR.event;
      cx.beginPath(); cx.moveTo(x, mid - 4); cx.lineTo(x, mid + 4); cx.stroke();
    }

    // the stride window: where the Wheel will land
    const x0 = xOf(state.ageLog, W);
    const x1 = xOf(EV.deeptime.logAdd(state.ageLog, state.strideLog), W);
    cx.fillStyle = 'rgba(216,168,96,0.16)';
    cx.fillRect(x0, mid - 6, Math.max(2, x1 - x0), 12);

    // you are here
    cx.fillStyle = '#e8e2d2';
    cx.beginPath();
    cx.moveTo(x0, mid - 8); cx.lineTo(x0 - 3.5, mid - 14); cx.lineTo(x0 + 3.5, mid - 14);
    cx.closePath(); cx.fill();
  }

  function init(canvas, getStateFn, onClickFn) {
    cv = canvas; cx = cv.getContext('2d');
    getState = getStateFn; onClick = onClickFn;
    cv.addEventListener('click', () => onClick && onClick());
    cv.title = 'The Vigil Line — what is coming, and when (click for the full forecast)';
  }

  EV.vigilline = { init, draw };
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
