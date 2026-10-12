/* Evensong — overlays: letters, inquiries, doctrines, vessels, the timeline,
   the Almanac, the Rubric, undertakings, thresholds, endings, menu, ferries. */
(function (EV) {
  'use strict';
  const { el, clear, byId } = EV.dom;
  const D = EV.data;
  const F = EV.fmt;

  let openName = null;

  function card() { return byId('overlay-card'); }
  function open(name) {
    byId('overlay').hidden = false;
    openName = name;
    const c = clear(card());
    c.appendChild(el('button', { class: 'ov-close', text: 'close (Esc)', onclick: close }));
    return c;
  }
  function close() {
    byId('overlay').hidden = true;
    openName = null;
    if (EV.ui) EV.ui.refresh();
  }
  function isOpen() { return openName; }

  const act = (fn) => () => {
    const r = fn();
    if (r && r.ok === false && r.msg) EV.ui.toast(r.msg);
    reopen();
  };
  function reopen() {
    const n = openName;
    if (!n) { EV.ui.refresh(); return; }
    close();
    if (overlays[n]) overlays[n](EV.ui.state);
  }

  // ---------------------------------------------------------- letters ----
  function letters(state) {
    const c = open('letters');
    c.appendChild(el('h2', { text: 'The Voices' }));
    c.appendChild(el('p', { class: 'note', text: 'Everything between civilizations moves at light speed. A letter is answered by whoever its reader is when it arrives — possibly by no one.' }));
    const cols = el('div', { class: 'ov-cols' });
    for (const vd of D.VOICES) {
      const vs = state.voices[vd.id];
      if (!vs.known) continue;
      const cd = el('div', { class: 'card' });
      cd.appendChild(el('h4', { text: vd.name }));
      cd.appendChild(el('p', { text: vd.nature }));
      const bits = [F.fmtLy(vd.ly) + ' out', 'a letter takes ' + F.fmtYears(EV.deeptime.log(vd.ly))];
      if (!vs.alive) bits.push('silent — ' + (vs.refugeTaken ? 'they came to you' : 'gone'));
      else bits.push('trust ' + Math.round(vs.trust));
      cd.appendChild(el('p', { class: 'cost', text: bits.join(' · ') }));
      if (vs.alive) {
        const btns = el('div', { class: 'rowbtns' });
        for (const iid in D.INTENTS) {
          const it = D.INTENTS[iid];
          btns.appendChild(el('button', {
            class: it.dark ? 'dark-act' : '',
            text: it.name,
            title: it.blurb,
            onclick: act(() => EV.actions.sendLetter(state, vd.id, iid)),
          }));
        }
        cd.appendChild(btns);
      }
      cols.appendChild(cd);
    }
    if (!cols.children.length) cols.appendChild(el('p', { class: 'note', text: 'No one is known yet. The dark is not empty; it is shy.' }));
    c.appendChild(cols);

    const pend = state.letters.out.filter((L) => !L.resolved);
    if (pend.length) {
      c.appendChild(el('hr', { class: 'rule' }));
      c.appendChild(el('p', { class: 'note', text: 'In flight: ' + pend.map((L) => D.INTENTS[L.intent].name + ' to ' + (D.VOICES.find((v) => v.id === L.to) || {}).short).join('; ') }));
    }
    const arch = state.letters.archive.slice(-6).reverse();
    if (arch.length) {
      c.appendChild(el('hr', { class: 'rule' }));
      c.appendChild(el('h2', { text: 'Kept letters' }));
      for (const r of arch) c.appendChild(el('div', { class: 'letterbody', text: r.text }));
    }
  }

  // -------------------------------------------------------- inquiries ----
  function inquiries(state) {
    const c = open('inquiries');
    c.appendChild(el('h2', { text: 'The Five Books' }));
    c.appendChild(el('p', { class: 'note', text: 'Lore gathers each turn (' + F.fmtNum(state.lastEcon ? state.lastEcon.lore : 0, 1) + ' last turn · ' + F.fmtNum(state.res.lore, 0) + ' in hand). [attested] follows the physics; [apocryphal] is the game speculating, and saying so.' }));
    const books = {};
    for (const q of D.INQUIRIES) (books[q.book] = books[q.book] || []).push(q);
    for (const b in books) {
      c.appendChild(el('h2', { text: 'Book of ' + b, style: 'font-size:1.05rem;margin-bottom:0.4rem' }));
      const cols = el('div', { class: 'ov-cols' });
      for (const q of books[b]) {
        const done = state.inquiries.done.indexOf(q.id) >= 0;
        const active = state.inquiries.active === q.id;
        const cost = EV.actions.inquiryCost(state, q);
        const cd = el('div', { class: 'card' + (done ? ' done' : '') + (active ? ' active' : '') });
        cd.appendChild(el('h4', {}, [
          el('span', { text: q.name + ' ' }),
          el('span', { class: 'tag ' + (q.kind === 'apocryphal' ? 'apoc' : 'att'), text: q.kind }),
        ]));
        cd.appendChild(el('p', { text: q.blurb }));
        cd.appendChild(el('p', { class: 'cost', text: done ? 'understood' : cost + ' lore' + (active ? ' · the current inquiry' : '') }));
        if (!done && !active) {
          cd.appendChild(el('button', { text: 'Pursue', onclick: act(() => EV.actions.setInquiry(state, q.id)) }));
        }
        cols.appendChild(cd);
      }
      c.appendChild(cols);
    }
  }

  // -------------------------------------------------------- doctrines ----
  function doctrines(state) {
    const c = open('doctrines');
    c.appendChild(el('h2', { text: 'Doctrines' }));
    c.appendChild(el('p', { class: 'note', text: 'What the people say they are. At most ' + EV.actions.doctrineMax(state) + ' held; adopting or unsaying costs Testament, and what a doctrine did while it stood stays done. Testament in hand: ' + F.fmtNum(state.res.testament, 0) + '.' }));
    const cols = el('div', { class: 'ov-cols' });
    for (const d of D.DOCTRINES) {
      const held = state.doctrines.indexOf(d.id) >= 0;
      const cd = el('div', { class: 'card' + (held ? ' active' : '') });
      cd.appendChild(el('h4', { text: d.name + (held ? ' — held' : '') }));
      cd.appendChild(el('p', { text: d.blurb }));
      cd.appendChild(el('p', { class: 'cost', text: (held ? 'unsay for ' + Math.ceil(d.cost / 2) : 'adopt for ' + d.cost) + ' testament' }));
      cd.appendChild(el('button', {
        class: d.lean === 'dark' && !held ? 'dark-act' : '',
        text: held ? 'Unsay it' : 'Adopt it',
        onclick: act(() => held ? EV.actions.repealDoctrine(state, d.id) : EV.actions.adoptDoctrine(state, d.id)),
      }));
      cols.appendChild(cd);
    }
    c.appendChild(cols);
  }

  // ---------------------------------------------------------- vessels ----
  function vessels(state) {
    const c = open('vessels');
    c.appendChild(el('h2', { text: 'The Vessels' }));
    const counts = {};
    for (const h of state.hearths) counts[h.shape] = (counts[h.shape] || 0) + 1;
    c.appendChild(el('p', { class: 'note', text: Object.keys(D.SHAPES).map((s) => (counts[s] || 0) + ' ' + D.SHAPES[s].name).join(' · ') + ' · rite focus: ' + ['none', 'kept', 'deep'][state.riteFocus] }));
    const rf = el('div', { class: 'rowbtns' });
    [['0', 'No rites'], ['1', 'Keep the rites'], ['2', 'Deep mourning']].forEach(([v, n]) => {
      rf.appendChild(el('button', {
        class: state.riteFocus === Number(v) ? 'sel' : '',
        text: n,
        title: 'How much of the people’s heart goes to tending grief into Testament.',
        onclick: act(() => EV.actions.setRiteFocus(state, Number(v))),
      }));
    });
    c.appendChild(rf);
    c.appendChild(el('hr', { class: 'rule' }));
    for (const sid of [...new Set(state.hearths.map((h) => h.siteId))]) {
      const site = state.sites.find((s) => s.id === sid);
      const name = site ? site.name : 'in transit';
      c.appendChild(el('h2', { text: name, style: 'font-size:1rem;margin:0.6rem 0 0.2rem' }));
      for (const h of state.hearths.filter((x) => x.siteId === sid)) {
        const sh = D.SHAPES[h.shape];
        const row = el('div', { class: 'hearthrow' });
        row.appendChild(el('div', { class: 'hname' + (sh.unminded ? ' unminded' : ''), text: h.name + ' — ' + sh.name }));
        row.appendChild(el('div', { class: 'hmeta', text: sh.blurb }));
        c.appendChild(row);
      }
    }
  }

  // --------------------------------------------------------- timeline ----
  function timeline(state) {
    const c = open('timeline');
    c.appendChild(el('h2', { text: 'The Forecast' }));
    c.appendChild(el('p', { class: 'note', text: 'Everything with a date on the chart. Nothing here is a surprise; that is the chart’s one kindness. Now: ' + F.fmtAge(state.ageLog) + ' after the beginning.' }));
    const marks = EV.forecast.list(state);
    const toLog = EV.deeptime.logAdd(state.ageLog, state.strideLog);
    for (const m of marks.slice(0, 40)) {
      const inStride = m.atLog <= toLog;
      const row = el('div', { class: 'kv' });
      row.appendChild(el('span', { class: m.kind === 'loss' || m.kind === 'source' ? 'warntext' : m.kind === 'hope' ? 'goodtext' : 'k', text: m.label }));
      row.appendChild(el('span', { class: inStride ? 'embertext' : 'k', text: F.fmtWhen(state.ageLog, m.atLog) + (inStride ? ' — within this stride' : '') }));
      c.appendChild(row);
    }
    if (!marks.length) c.appendChild(el('p', { class: 'note', text: 'Nothing is written ahead. That is either very good or very bad.' }));
  }

  // ---------------------------------------------------------- almanac ----
  function almanac(state) {
    const c = open('almanac');
    c.appendChild(el('h2', { text: 'The Almanac' }));
    c.appendChild(el('p', { class: 'note', text: 'The real physics behind the vigil. [attested] follows the literature; [apocryphal] is the game speculating, and saying so.' }));
    for (const a of EV.almanacText) {
      const cd = el('div', { class: 'card', style: 'margin-bottom:0.7rem' });
      cd.appendChild(el('h4', {}, [el('span', { text: a.t + ' ' }), el('span', { class: 'tag ' + (a.k === 'apocryphal' ? 'apoc' : 'att'), text: a.k })]));
      cd.appendChild(el('p', { text: a.b }));
      c.appendChild(cd);
    }
  }

  // ----------------------------------------------------------- rubric ----
  function rubric() {
    const c = open('rubric');
    c.appendChild(el('h2', { text: 'The Rubric — how to keep a vigil' }));
    const secs = [
      ['The Wheel', 'Each turn covers a stretch of cosmic time: the stride, a power of ten of years. Choose it with ←/→ or the −/+ buttons, inside the window the Wheel allows, then press Turn the Wheel (Enter). The floor of that window rises every turn — the universe does not wait — and everything scheduled inside your stride happens: deaths, arrivals, letters, dawns.'],
      ['Energy', 'Power produced minus power spent, each turn. Surplus banks into Charge (up to your cisterns); deficit drains Charge, then burns Matter (once you know the Forge), then people start to die. Every source on the Sounding shows the date it fails. Believe the dates.'],
      ['Matter', 'The deep battery and the stuff of everything: substrates, works, hulls, and — at a black hole, late — almost pure energy. Mine it with Forgeworks while a site has any. If the Proton Watch says matter is mortal, hoard accordingly.'],
      ['The Shapes', 'Your people live in hearths of five Shapes: Embodied (warm, costly, best at rites), Graven (engraved minds, cheap, quick to learn), Manifold (many woven into one, steadying), Wrought (no one inside; never despair, never remember), Stilled (minds slowed toward stillness, almost free, boundless). Changing Shape is how you outlast each age — and each change is a doctrine fight and a small grief.'],
      ['Stride and drift', 'Each Shape can govern itself across only so long a stride (its horizon; Slow stance stretches it). Stride past it and generations live and die unguided between your decisions: the Flame pays. The Stilled and the Wrought ride anything.'],
      ['Grief, rites, Testament, Flame', 'Losses add Grief. Rites tend Grief into Testament — kept meaning — which pays for doctrines and the great endings, and steadies the Flame: the will to go on. If the Flame gutters to nothing for three turns, the vigil fails with the stores still half full.'],
      ['The Sounding and the Ear', 'The map is a line paid out into the dark; depth is light-distance. Light already reaches you — attention is what is scarce. Each turn the Ear resolves unknown sites in one band (more with Watchhouses). Click a site to read it; click names in the panel to act.'],
      ['Ferries', 'A ferry is a commitment, not a unit: load it, pick a speed, and it is a date in the Chronicle until it arrives. As strides lengthen, crossings that took ten turns take one. Nothing outruns light; patience is the only ship.'],
      ['The Voices', 'Other civilizations, reached only by letters at light speed. Trade, warn, beam warmth, offer refuge — or steal, if you are becoming that. Their replies are written by whoever they are when your letter lands.'],
      ['The Gleaner', 'An old, mindless harvester that follows warmth down the Sounding like weather. Hide (Veils, the Quiet), decoy it, outlive it, learn to say “not here” — or learn to point it, and see what that costs.'],
      ['Ways to end', 'Open Undertakings (U) to see every ending’s terms. Persistence has many shapes: the Slow Amen, the Manifold Entire, a Garden Without Gardeners, the Last Hearth, the Gate, Still Here — and one with a crown. None of them is “right.”'],
      ['Keys', 'Enter: turn the Wheel · ←/→: stride · C: chronicle top · L: letters · I: inquiries · D: doctrines · V: vessels · T: forecast · U: undertakings · A: almanac · ?: this rubric · M: mute · Esc: close / menu.'],
    ];
    for (const [t, b] of secs) {
      const cd = el('div', { class: 'card', style: 'margin-bottom:0.7rem' });
      cd.appendChild(el('h4', { text: t }));
      cd.appendChild(el('p', { text: b }));
      c.appendChild(cd);
    }
  }

  // ----------------------------------------------------- undertakings ----
  function undertakings(state) {
    const c = open('undertakings');
    c.appendChild(el('h2', { text: 'Undertakings — the shapes of persistence' }));
    c.appendChild(el('p', { class: 'note', text: 'Every way this can end in something other than silence. Each is performed on purpose, when its terms are met. None of them is the right one.' }));
    const cols = el('div', { class: 'ov-cols' });
    for (const u of EV.endings.undertakings(state)) {
      const cd = el('div', { class: 'card' + (u.ok ? ' active' : '') });
      cd.appendChild(el('h4', { text: u.name }));
      cd.appendChild(el('p', { text: u.blurb }));
      cd.appendChild(el('p', { class: 'cost', text: 'Terms: ' + u.need }));
      const b = el('button', {
        class: u.dark ? 'dark-act' : '',
        text: u.ok ? 'Perform it' : 'Not yet',
        onclick: act(() => EV.actions.undertake(state, u.id)),
      });
      if (!u.ok) b.disabled = true;
      cd.appendChild(b);
      cols.appendChild(cd);
    }
    c.appendChild(cols);
  }

  // ------------------------------------------------------------ ferry ----
  function ferry(state, fromId, hearthId) {
    const c = open('ferry');
    const from = state.sites.find((s) => s.id === fromId);
    c.appendChild(el('h2', { text: 'A ferry from ' + from.name }));
    c.appendChild(el('p', { class: 'note', text: 'A ferry is a commitment: once it departs there is no steering, only arriving. Hull costs 3 matter plus freight; the launch costs charge by hull and speed.' }));
    const state2 = { dest: null, speed: EV.actions.ferrySpeeds(state)[0].id, hearthIds: hearthId ? [hearthId] : [], matter: 0 };

    const destWrap = el('div', { class: 'rowbtns' });
    for (const s of state.sites) {
      if (s.gone || s.hidden || s.id === fromId) continue;
      const why = EV.actions.ferryReach(state, from, s);
      const b = el('button', {
        text: s.name + ' (' + F.fmtLy(s.ly) + ')',
        title: why || 'A reachable harbor.',
        onclick: () => { state2.dest = s.id; render(); },
      });
      if (why) b.disabled = true;
      destWrap.appendChild(b);
    }
    const speedWrap = el('div', { class: 'rowbtns' });
    const crewWrap = el('div', { class: 'rowbtns' });
    const matterWrap = el('div', { class: 'rowbtns' });
    const foot = el('div');
    c.appendChild(el('p', { text: 'To:' })); c.appendChild(destWrap);
    c.appendChild(el('p', { text: 'Speed:' })); c.appendChild(speedWrap);
    c.appendChild(el('p', { text: 'Souls aboard:' })); c.appendChild(crewWrap);
    c.appendChild(el('p', { text: 'Matter as freight:' })); c.appendChild(matterWrap);
    c.appendChild(foot);

    function render() {
      clear(speedWrap); clear(crewWrap); clear(matterWrap); clear(foot);
      for (const sp of EV.actions.ferrySpeeds(state)) {
        speedWrap.appendChild(el('button', { class: state2.speed === sp.id ? 'sel' : '', text: sp.name, onclick: () => { state2.speed = sp.id; render(); } }));
      }
      for (const h of state.hearths.filter((x) => x.siteId === fromId)) {
        const on = state2.hearthIds.indexOf(h.id) >= 0;
        crewWrap.appendChild(el('button', {
          class: on ? 'sel' : '', text: h.name.split(',')[0] + ' (' + D.SHAPES[h.shape].name + ')',
          onclick: () => { if (on) state2.hearthIds = state2.hearthIds.filter((i) => i !== h.id); else state2.hearthIds.push(h.id); render(); },
        }));
      }
      for (const m of [0, 2, 4, 6, 12]) {
        matterWrap.appendChild(el('button', { class: state2.matter === m ? 'sel' : '', text: String(m), onclick: () => { state2.matter = m; render(); } }));
      }
      if (state2.dest) {
        const to = state.sites.find((s) => s.id === state2.dest);
        const sp = EV.actions.ferrySpeeds(state).find((s) => s.id === state2.speed);
        const years = EV.actions.ferryDist(from, to) / sp.c;
        foot.appendChild(el('p', { class: 'note', text: 'To ' + to.name + ': the crossing takes ' + F.fmtYears(EV.deeptime.log(years)) + ' of cosmic time.' }));
        foot.appendChild(el('button', {
          class: 'big', text: 'Launch',
          onclick: () => {
            const r = EV.actions.launchFerry(state, fromId, state2.dest, state2.hearthIds, state2.matter, state2.speed);
            if (r.ok === false) { EV.ui.toast(r.msg); return; }
            close();
          },
        }));
      } else {
        foot.appendChild(el('p', { class: 'note', text: 'Choose a harbor.' }));
      }
    }
    render();
  }

  // -------------------------------------------------------- threshold ----
  function threshold(state) {
    const th = state.threshold;
    if (!th) return;
    const c = open('threshold');
    c.appendChild(el('h2', { text: th.title }));
    c.appendChild(el('p', { class: 'threshold-text', text: th.text }));
    const list = el('div', { class: 'choice-list' });
    for (const ch of th.choices) {
      list.appendChild(el('button', {
        onclick: () => { EV.actions.chooseThreshold(state, ch.id); close(); EV.ui.refresh(); },
      }, [el('div', { class: 'cn', text: ch.name }), el('div', { class: 'cb', text: ch.blurb })]));
    }
    c.appendChild(list);
  }

  // ----------------------------------------------------------- ending ----
  function ending(state) {
    const e = state.ending;
    if (!e) return;
    const c = open('ending');
    c.appendChild(el('div', { class: 'ending-title', text: e.name }));
    c.appendChild(el('div', { class: 'ending-line', text: (e.victory ? (e.dark ? 'a dark persistence' : 'a way to persist') : 'a way to end') + ' · turn ' + e.turn + ' · ' + F.fmtAge(e.ageLog) }));
    c.appendChild(el('p', { class: 'ending-text', text: e.closing }));
    c.appendChild(el('hr', { class: 'rule' }));
    c.appendChild(el('p', { class: 'note', text: 'The record: ' + e.stats.hearthsLost + ' hearths lost · ' + F.fmtNum(e.stats.griefTended, 0) + ' grief tended into meaning · ' + e.stats.conversions + ' changes of Shape · ' + e.stats.lettersSent + ' letters sent into the dark.' }));
    const btns = el('div', { class: 'rowbtns' });
    btns.appendChild(el('button', { class: 'big', text: 'Keep the Chronicle open', onclick: close }));
    btns.appendChild(el('button', { class: 'big', text: 'Begin another vigil', onclick: () => { close(); EV.ui.toTitle(); } }));
    c.appendChild(btns);
  }

  // ------------------------------------------------------------- menu ----
  function menu(state) {
    const c = open('menu');
    c.appendChild(el('h2', { text: 'The vestry' }));
    const live = state && state.sites && state.sites.length;
    const btns = el('div', { class: 'choice-list' });
    if (live) {
      btns.appendChild(el('button', { text: 'Save this vigil', onclick: () => { EV.ui.saveSlot(); } }));
      btns.appendChild(el('button', { text: 'Export as text (keep it anywhere)', onclick: () => exportSave(state) }));
    }
    btns.appendChild(el('button', { text: 'Import a save', onclick: () => importSave() }));
    btns.appendChild(el('button', { text: (EV.audio.muted ? 'Unmute' : 'Mute') + ' the music (M)', onclick: () => { EV.audio.toggleMute(); reopen(); } }));
    btns.appendChild(el('button', { text: 'The Rubric', onclick: () => { rubric(); } }));
    if (live) btns.appendChild(el('button', { text: 'Abandon this vigil (back to title)', onclick: () => { close(); EV.ui.toTitle(); } }));
    c.appendChild(btns);
    const slots = EV.save.listSlots();
    if (slots.length) {
      c.appendChild(el('hr', { class: 'rule' }));
      c.appendChild(el('p', { class: 'note', text: 'Saved vigils:' }));
      for (const s of slots) {
        const row = el('div', { class: 'rowbtns' });
        row.appendChild(el('button', { text: 'Load “' + s + '”', onclick: () => { EV.ui.loadSlot(s); } }));
        row.appendChild(el('button', { text: 'forget', onclick: () => { EV.save.remove('evensong.slot.' + s); reopen(); } }));
        c.appendChild(row);
      }
    }
  }

  function exportSave(state) {
    const text = EV.save.serialize(state);
    const c = card();
    const ta = el('textarea', { style: 'width:100%;height:9rem;background:#0b0d12;color:#c9c4b4;border:1px solid #23262e;font-size:0.7rem' });
    ta.value = text;
    c.appendChild(ta);
    const row = el('div', { class: 'rowbtns' });
    row.appendChild(el('button', {
      text: 'Download as a file',
      onclick: () => {
        const blob = new Blob([text], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'evensong-turn' + state.turn + '.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      },
    }));
    c.appendChild(row);
    ta.select();
  }

  function importSave() {
    const c = card();
    const ta = el('textarea', { style: 'width:100%;height:9rem;background:#0b0d12;color:#c9c4b4;border:1px solid #23262e;font-size:0.7rem', placeholder: 'Paste a saved vigil here…' });
    c.appendChild(ta);
    c.appendChild(el('button', {
      text: 'Take it up',
      onclick: () => {
        try {
          const st = EV.save.deserialize(ta.value);
          close();
          EV.ui.adopt(st);
        } catch (e) { EV.ui.toast('That is not a vigil this book can read.'); }
      },
    }));
  }

  const overlays = {
    letters, inquiries, doctrines, vessels, timeline, almanac, rubric,
    undertakings, threshold, ending, menu, ferry,
  };
  overlays.close = close;
  overlays.isOpen = isOpen;
  EV.overlays = overlays;
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
