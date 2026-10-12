/* Evensong — main: screens, the turn flow, the bottom bar, keys, autosave. */
(function (EV) {
  'use strict';
  const { el, clear, byId } = EV.dom;
  const D = EV.data;
  const F = EV.fmt;

  const ui = {
    state: null,
    selectedSite: 'home',
    refresh, toast, toTitle, adopt, saveSlot, loadSlot,
  };
  EV.ui = ui;

  // ------------------------------------------------------------ screens ---
  function show(name) {
    byId('title').hidden = name !== 'title';
    byId('setup').hidden = name !== 'setup';
    byId('game').hidden = name !== 'game';
  }

  function toTitle() {
    ui.state = null;
    show('title');
    byId('t-continue').hidden = !EV.save.load('evensong.autosave');
  }

  function adopt(state) {
    ui.state = state;
    ui.selectedSite = state.hearths.length ? state.hearths[0].siteId : 'home';
    if (String(ui.selectedSite).indexOf('__transit__') === 0) ui.selectedSite = 'home';
    EV.sounding.resetField();
    show('game');
    refresh();
  }

  // ------------------------------------------------------------- setup ----
  const setupChoice = { length: 'full', difficulty: 'standard', fate: 'unknown', guide: true, seed: '' };
  function renderSetup() {
    const grid = clear(byId('setup-grid'));
    function row(label, hint, opts, key) {
      const r = el('div', { class: 'setup-row' });
      r.appendChild(el('div', { class: 'lbl', text: label }));
      const line = el('div', { class: 'optline' });
      for (const [v, n] of opts) {
        line.appendChild(el('button', {
          class: setupChoice[key] === v ? 'sel' : '',
          text: n,
          onclick: () => { setupChoice[key] = v; renderSetup(); },
        }));
      }
      r.appendChild(line);
      if (hint) r.appendChild(el('div', { class: 'hint', text: hint }));
      grid.appendChild(r);
      return r;
    }
    row('The length of the vigil', 'Brief turns the Wheel harder: the same ages in fewer turns.', [['full', 'The full vigil (~110 turns)'], ['brief', 'A brief vigil (~70 turns)']], 'length');
    row('The weather of the universe', 'How thin the margins are, and how hungry the dark.', [['gentle', 'Gentle'], ['standard', 'Standard'], ['iron', 'Iron']], 'difficulty');
    row('The fate of matter', 'Whether protons decay is unknown in our universe too. Unknown is the intended game: the Proton Watch will tell you, mid-vigil, which world you were always in.', [
      ['unknown', 'Unknown, until the Watch'], ['told', 'Drawn, but told at the start'],
      ['decay', 'Protons decay'], ['stable', 'Matter keeps'], ['unmaking', 'The slow unmaking'],
    ], 'fate');
    row('The Litany of First Steps', 'One quiet hint at a time, each shown once.', [[true, 'Guide me'], [false, 'I have kept vigils before']], 'guide');
    const seedRow = el('div', { class: 'setup-row' });
    seedRow.appendChild(el('div', { class: 'lbl', text: 'The name of this universe (seed)' }));
    const inp = el('input', { type: 'text', placeholder: 'leave empty for a new one' });
    inp.value = setupChoice.seed;
    inp.addEventListener('input', () => { setupChoice.seed = inp.value; });
    seedRow.appendChild(inp);
    grid.appendChild(seedRow);
  }

  function beginGame() {
    const seed = setupChoice.seed.trim() || ('vigil-' + Math.random().toString(36).slice(2, 9));
    const state = EV.world.newGame({
      seed, difficulty: setupChoice.difficulty, length: setupChoice.length,
      fate: setupChoice.fate, guide: setupChoice.guide,
    });
    adopt(state);
    EV.audio.begin(0);
  }

  // ------------------------------------------------------------ bottom ----
  function resBox(state) {
    const box = clear(byId('resbox'));
    const R = state.res;
    const e = state.lastEcon || { produced: 0, upkeep: 0, net: 0, lore: 0 };
    const items = [
      ['Charge', F.fmtNum(R.charge, 0) + '/' + F.fmtNum(R.chargeCap, 0), e.net, 'Banked energy. Last turn: ' + F.fmtNum(e.produced, 1) + ' produced, ' + F.fmtNum(e.upkeep, 1) + ' spent.'],
      ['Matter', F.fmtNum(R.matter, 0), null, 'Mass in hand: substrates, hulls, works — and the deep battery.'],
      ['Lore', F.fmtNum(R.lore, 0), e.lore, 'Understanding, gathering toward the current inquiry.'],
      ['Testament', F.fmtNum(R.testament, 0), null, 'Kept meaning, distilled from tended grief. Pays for doctrines and endings.'],
    ];
    for (const [l, v, d, tip] of items) {
      const r = el('div', { class: 'res', title: tip });
      r.appendChild(el('div', { class: 'v', text: v }));
      r.appendChild(el('div', { class: 'l', text: l }));
      if (d !== null && d !== undefined && Math.abs(d) >= 0.05) {
        r.appendChild(el('div', { class: 'd ' + (d >= 0 ? 'up' : 'down'), text: F.fmtSigned(d, 1) }));
      }
      box.appendChild(r);
    }
  }

  function meters(state) {
    const box = clear(byId('meters'));
    function m(cls, label, v, max, tip) {
      const w = el('div', { class: 'meter ' + cls, title: tip });
      const lab = el('div', { class: 'l' });
      lab.appendChild(el('span', { text: label }));
      lab.appendChild(el('span', { text: F.fmtNum(v, 0) }));
      w.appendChild(lab);
      const bar = el('div', { class: 'bar' });
      bar.appendChild(el('div', { class: 'fill', style: 'width:' + Math.max(0, Math.min(100, (v / max) * 100)) + '%' }));
      w.appendChild(bar);
      box.appendChild(w);
    }
    m('flame', 'Flame', state.flame, 100, 'The will to go on. At nothing for three turns, the civilization lets go.');
    m('grief', 'Grief', state.grief, 60, 'Unmetabolized loss. Rites tend it into Testament; untended, it eats the Flame.');
    if (state.stain > 0) m('stain', 'Stain', state.stain, 100, 'What you became to survive. It does not wash.');
  }

  function strideBox(state) {
    const box = clear(byId('stridebox'));
    const b = EV.actions.strideBounds(state);
    box.appendChild(el('button', { text: '−', title: 'A shorter stride (←)', onclick: () => { EV.actions.setStride(state, state.strideLog - 0.5); refresh(); } }));
    const v = el('div', { class: 'stride-v', title: 'How much cosmic time the next turn covers. The window’s floor rises every turn: the universe does not wait.' });
    v.appendChild(el('div', { class: 'big', text: 'stride ' + F.fmtYears(state.strideLog) }));
    v.appendChild(el('div', { class: 'small', text: 'the Wheel allows 10' + F.sup(Math.round(b.lo * 10) / 10) + '–10' + F.sup(Math.round(b.hi * 10) / 10) + ' yr' }));
    box.appendChild(v);
    box.appendChild(el('button', { text: '+', title: 'A longer stride (→)', onclick: () => { EV.actions.setStride(state, state.strideLog + 0.5); refresh(); } }));
  }

  function chips(state) {
    const box = clear(byId('chips'));
    const add = (text, cls, fn, tip) => box.appendChild(el('button', { class: 'chip ' + (cls || ''), text, title: tip || '', onclick: fn }));
    if (state.threshold) add('a threshold waits', 'urgent', () => EV.overlays.threshold(state), 'The age is ending; an irreversible choice waits.');
    const unread = state.letters.archive.length && state.flags.lastReadLetters !== state.letters.archive.length;
    if (unread) add('letters', '', () => { state.flags.lastReadLetters = state.letters.archive.length; EV.overlays.letters(state); }, 'Word has come in from the dark.');
    if (!state.inquiries.active) {
      const any = D.INQUIRIES.some((q) => state.inquiries.done.indexOf(q.id) < 0);
      if (any) add('no inquiry chosen', '', () => EV.overlays.inquiries(state), 'Lore is gathering with nowhere to go.');
    }
    const crossings = EV.forecast.crossings(state).length;
    if (crossings) add(crossings + ' foreseen within this stride', '', () => EV.overlays.timeline(state), 'The Wheel will cross dates on the chart.');
    const ready = EV.endings.undertakings(state).filter((u) => u.ok);
    if (ready.length) add('an undertaking is ready', '', () => EV.overlays.undertakings(state), ready.map((u) => u.name).join('; '));
  }

  function ageBox(state) {
    byId('age-era').textContent = D.ERAS[state.era].ord + ' · ' + D.ERAS[state.era].name;
    byId('age-years').textContent = F.fmtAge(state.ageLog) + ' · turn ' + state.turn;
  }

  function chronicle(state) {
    const box = clear(byId('chronicle'));
    const recent = state.chronicle.slice(-14).reverse();
    for (const rec of recent) {
      const wrap = el('div', { class: 'chron-turn' });
      wrap.appendChild(el('div', { class: 'chron-head', text: 'TURN ' + rec.turn + ' · ' + F.fmtAge(rec.ageLog) + (rec.turn > 0 ? ' · a stride of ' + F.fmtYears(rec.strideLog) : '') }));
      for (const e of rec.entries) wrap.appendChild(el('div', { class: 'chron-e k-' + e.k, text: e.t }));
      if (!rec.entries.length) wrap.appendChild(el('div', { class: 'chron-e', text: 'The watch was kept. Nothing asked to be written.' }));
      box.appendChild(wrap);
    }
  }

  // --------------------------------------------------------------- turn ---
  function turnWheel() {
    const state = ui.state;
    if (!state || state.ending) return;
    if (state.threshold) { EV.overlays.threshold(state); return; }
    EV.audio.wheel();
    EV.turn.endTurn(state);
    EV.audio.setEra(state.era);
    const last = state.chronicle[state.chronicle.length - 1];
    if (last && last.entries.some((e) => e.k === 'letter')) EV.audio.letter();
    if (last && last.entries.some((e) => e.k === 'loss' || e.k === 'dark')) EV.audio.bad();
    EV.save.store('evensong.autosave', EV.save.serialize(state));
    if (state.threshold) EV.overlays.threshold(state);
    if (state.ending) { EV.save.remove('evensong.autosave'); EV.overlays.ending(state); }
    refresh();
  }

  // ------------------------------------------------------------ refresh ---
  function refresh() {
    const state = ui.state;
    if (!state) return;
    // selection hygiene
    const sel = state.sites.find((s) => s.id === ui.selectedSite && !s.gone && !s.hidden);
    if (!sel) {
      const fallback = state.hearths.map((h) => h.siteId).find((id) => String(id).indexOf('__transit__') !== 0);
      ui.selectedSite = fallback || (state.sites.find((s) => !s.gone && !s.hidden) || {}).id;
    }
    ageBox(state);
    resBox(state);
    meters(state);
    strideBox(state);
    chips(state);
    chronicle(state);
    EV.panels.renderSite(state, ui.selectedSite);
    EV.guide.maybeShow(state);
    byId('wheel').disabled = !!state.ending;
  }

  function toast(msg) {
    let t = byId('toast');
    if (!t) {
      t = el('div', { id: 'toast', style: 'position:fixed;bottom:5.2rem;left:50%;transform:translateX(-50%);background:#1a130d;border:1px solid #8a6b3c;color:#e8e2d2;padding:0.45rem 0.9rem;border-radius:4px;z-index:70;max-width:30rem;text-align:center' });
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(t._h);
    t._h = setTimeout(() => { t.style.display = 'none'; }, 3200);
  }

  // ------------------------------------------------------------- saves ----
  function saveSlot() {
    const state = ui.state;
    if (!state) return;
    // some hosts show no prompt dialogs; fall back to a sensible name
    let name = null;
    try { name = prompt('Name this vigil:', state.seed); } catch (e) { name = null; }
    name = (name === null ? state.seed + ' at turn ' + state.turn : name).trim();
    if (!name) return;
    const ok = EV.save.store('evensong.slot.' + name.replace(/[^\w\- ]+/g, ''), EV.save.serialize(state));
    toast(ok ? 'Kept as “' + name + '”.' : 'The browser would not keep it; export as text instead.');
  }
  function loadSlot(name) {
    const text = EV.save.load('evensong.slot.' + name);
    if (!text) { toast('That vigil is not in the book.'); return; }
    try { EV.overlays.close(); adopt(EV.save.deserialize(text)); EV.audio.begin(ui.state.era); } catch (e) { toast('That save cannot be read.'); }
  }

  // --------------------------------------------------------------- keys ---
  function onKey(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const state = ui.state;
    if (e.key === 'Escape') {
      if (EV.overlays.isOpen()) { EV.overlays.close(); }
      else if (state) EV.overlays.menu(state);
      return;
    }
    if (!state || byId('game').hidden) return;
    if (EV.overlays.isOpen() && e.key !== 'Escape') return;
    switch (e.key) {
      case 'Enter': turnWheel(); e.preventDefault(); break;
      case 'ArrowLeft': EV.actions.setStride(state, state.strideLog - 0.5); refresh(); break;
      case 'ArrowRight': EV.actions.setStride(state, state.strideLog + 0.5); refresh(); break;
      case 'l': case 'L': EV.overlays.letters(state); break;
      case 'i': case 'I': EV.overlays.inquiries(state); break;
      case 'd': case 'D': EV.overlays.doctrines(state); break;
      case 'v': case 'V': EV.overlays.vessels(state); break;
      case 't': case 'T': EV.overlays.timeline(state); break;
      case 'u': case 'U': EV.overlays.undertakings(state); break;
      case 'a': case 'A': EV.overlays.almanac(state); break;
      case '?': case 'h': case 'H': EV.overlays.rubric(); break;
      case 'c': case 'C': byId('chronicle').scrollTop = 0; break;
      case 'm': case 'M': EV.audio.toggleMute(); toast(EV.audio.muted ? 'The music rests.' : 'The music returns.'); break;
    }
  }

  // --------------------------------------------------------------- boot ---
  function boot() {
    // title
    byId('t-new').addEventListener('click', () => { renderSetup(); show('setup'); });
    byId('t-continue').addEventListener('click', () => {
      const text = EV.save.load('evensong.autosave');
      if (!text) return;
      try { adopt(EV.save.deserialize(text)); EV.audio.begin(ui.state.era); } catch (e) { toast('The autosave cannot be read.'); }
    });
    byId('t-rubric').addEventListener('click', () => EV.overlays.rubric());
    byId('t-almanac').addEventListener('click', () => EV.overlays.almanac(null));
    byId('t-load').addEventListener('click', () => {
      const slots = EV.save.listSlots();
      if (!slots.length) { toast('No vigils are kept in this browser yet.'); return; }
      EV.overlays.menu(ui.state || {});
    });
    byId('s-begin').addEventListener('click', beginGame);
    byId('s-back').addEventListener('click', () => show('title'));
    byId('wheel').addEventListener('click', turnWheel);
    byId('brand').addEventListener('click', () => ui.state && EV.overlays.menu(ui.state));
    document.addEventListener('keydown', onKey);

    EV.sounding.init(byId('sounding'), () => ui.state, (id) => { ui.selectedSite = id; refresh(); });
    EV.vigilline.init(byId('vigilline'), () => ui.state, () => ui.state && EV.overlays.timeline(ui.state));

    // the render loop: everything animated is a function of elapsed time,
    // never of frame count, so any refresh rate shows the same vigil.
    function frame(t) {
      if (!byId('game').hidden) {
        EV.sounding.draw(t);
        EV.vigilline.draw();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    toTitle();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
