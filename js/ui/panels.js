/* Evensong — the right-hand panel: whatever is selected, in full. */
(function (EV) {
  'use strict';
  const { el, clear } = EV.dom;
  const D = EV.data;
  const F = EV.fmt;

  function act(fn) {
    return function () {
      const r = fn();
      if (r && r.ok === false && r.msg) EV.ui.toast(r.msg);
      EV.ui.refresh();
    };
  }

  function sourceRow(state, src) {
    const row = el('div', { class: 'srcrow' + (src.dead ? ' dead' : '') });
    row.appendChild(el('span', { text: src.name + (src.needs === 'mill' && !src.dead ? ' (needs the Mill)' : '') }));
    const right = el('span', { class: 'dies' });
    if (src.dead) right.textContent = 'dark';
    else right.textContent = '⚡' + F.fmtNum(src.power, 1) + ' · fails ' + F.fmtWhen(EV.ui.state.ageLog, src.diesLog);
    row.appendChild(right);
    return row;
  }

  function hearthActions(state, h, site) {
    const A = EV.actions;
    const btns = el('div', { class: 'rowbtns' });
    const sh = D.SHAPES[h.shape];
    // stance
    if (sh.canSlow || h.shape === 'graven' || h.shape === 'manifold') {
      for (const st of ['quick', 'even', 'slow']) {
        if (st === 'slow' && !sh.canSlow) continue;
        if (st === 'quick' && (h.shape === 'stilled' || h.shape === 'embodied' || h.shape === 'wrought')) continue;
        btns.appendChild(el('button', {
          class: h.stance === st ? 'sel' : '',
          text: D.STANCES[st].name,
          title: st === 'slow' ? 'Dyson’s bargain: a fifth the upkeep, a fifth the output, and four more decades of stride without drift.' : st === 'quick' ? 'Nearly double the upkeep for half again the output.' : 'The ordinary tempo.',
          onclick: act(() => A.setStance(state, h.id, st)),
        }));
      }
    }
    if (h.shape === 'embodied') {
      btns.appendChild(el('button', { text: 'Engrave', title: 'Copy the minds to cold substrate. The bodies rest. (3 matter, 2 charge; needs substrate room)', onclick: act(() => A.engrave(state, h.id)) }));
    }
    if (h.shape === 'graven' || h.shape === 'manifold') {
      btns.appendChild(el('button', { text: 'Still', title: 'Slow them toward no thought at all: almost free to keep, boundless patience. (1 charge)', onclick: act(() => A.still(state, h.id)) }));
    }
    if (h.shape === 'graven') {
      const others = state.hearths.filter((x) => x !== h && x.shape === 'graven' && x.siteId === h.siteId);
      if (others.length) {
        btns.appendChild(el('button', { text: 'Weave', title: 'Weave this hearth with another Graven hearth here into one Manifold. It cannot be undone. (1 matter, 3 charge)', onclick: act(() => A.weave(state, h.id, others[0].id)) }));
      }
      btns.appendChild(el('button', { text: 'Rekindle', title: 'Grow bodies again from the pattern books. (3 matter, 3 charge; needs warmth)', onclick: act(() => A.rekindle(state, h.id)) }));
    }
    if (h.shape === 'stilled') {
      btns.appendChild(el('button', { text: 'Wake', title: 'Warm them back to thought. (2 charge)', onclick: act(() => A.wake(state, h.id)) }));
    }
    btns.appendChild(el('button', { text: 'Ferry…', title: 'Send this hearth across the dark.', onclick: () => EV.overlays.ferry(state, site.id, h.id) }));
    return btns;
  }

  function hearthRow(state, h, site) {
    const sh = D.SHAPES[h.shape];
    const row = el('div', { class: 'hearthrow' });
    row.appendChild(el('div', { class: 'hname' + (sh.unminded ? ' unminded' : ''), text: h.name }));
    const bits = [sh.name, D.STANCES[h.stance] ? D.STANCES[h.stance].name.toLowerCase() : 'even'];
    const hz = EV.economy.horizonOf(state, h);
    bits.push(isFinite(hz) ? 'rides to 10' + F.sup(hz) + ' yr' : 'rides any stride');
    if (h.flags.drift) bits.push('drifting');
    if (h.flags.cold) bits.push('freezing');
    row.appendChild(el('div', { class: 'hmeta', text: bits.join(' · ') }));
    row.appendChild(hearthActions(state, h, site));
    return row;
  }

  function buildButtons(state, site) {
    const A = EV.actions;
    const wrap = el('div', { class: 'rowbtns' });
    for (const wid in D.WORKS) {
      const w = D.WORKS[wid];
      const bad = A.canBuild(state, site, wid);
      if (bad && (w.needInquiry && !EV.economy.has(state, w.needInquiry))) continue;
      if (bad && /No such|only a black hole|Nothing here|Nothing shines|needs shading/i.test(bad)) continue;
      const b = el('button', {
        text: w.name + ' (' + w.cost.m + 'm ' + w.cost.c + 'c)',
        title: w.blurb + (bad ? ' — ' + bad : ''),
        onclick: act(() => A.queueWork(state, site.id, wid)),
      });
      if (bad) b.disabled = true;
      wrap.appendChild(b);
    }
    return wrap;
  }

  function renderSite(state, siteId) {
    const site = state.sites.find((s) => s.id === siteId);
    const panel = clear(EV.dom.byId('panel'));
    if (!site || site.gone) {
      panel.appendChild(el('p', { class: 'note', text: 'Nothing is here any more. Select a light on the Sounding.' }));
      return;
    }
    panel.appendChild(el('h3', { class: 'ph', text: site.name }));
    const kindLine = {
      world: 'A living world', rogue: 'A rogue world', whitedwarf: 'A white dwarf',
      browndwarfs: 'Two brown dwarfs, circling', neutronstar: 'A neutron star', wdpair: 'Two white dwarfs, inspiralling',
      mergerstar: 'A merger star', blackhole: 'A black hole', remnants: 'A drift of remnants',
      star: 'A star', runaway: 'A runaway, flung from the galaxy long ago', hold: 'All that remains, gathered',
    }[site.kind] || 'A place';
    panel.appendChild(el('p', { class: 'psub', text: kindLine + ' · ' + (site.ly <= 0 ? 'the home ground' : F.fmtLy(site.ly) + ' out') + (site.resolved ? '' : ' · unresolved (point the Ear at its band)') }));

    if (site.scorchAt) {
      panel.appendChild(el('p', { class: 'warntext', text: 'The last weather fails ' + F.fmtWhen(state.ageLog, site.scorchAt) + '. After that, only roofed warmth.' }));
    }
    if (site.fate && site.fate.announced && !site.gone) {
      panel.appendChild(el('p', { class: 'warntext', text: 'Charted: ' + (site.fate.kind === 'flung' ? 'to be flung from the galaxy' : 'to fall to the Anchor') + ' ' + F.fmtWhen(state.ageLog, site.fate.at) + '.' }));
    }

    if (site.resolved) {
      if (site.sources.length) {
        panel.appendChild(el('hr', { class: 'rule' }));
        for (const src of site.sources) panel.appendChild(sourceRow(state, src));
      }
      const kv = el('div');
      kv.appendChild(el('div', { class: 'kv' }, [el('span', { class: 'k', text: 'Matter in reach' }), el('span', { text: F.fmtNum(site.matter, 1) })]));
      const builtList = Object.keys(site.built).filter((k) => site.built[k] > 0).map((k) => D.WORKS[k].name + (site.built[k] > 1 ? ' ×' + site.built[k] : ''));
      kv.appendChild(el('div', { class: 'kv' }, [el('span', { class: 'k', text: 'Standing works' }), el('span', { text: builtList.join(', ') || '—' })]));
      if (site.queue.length) {
        kv.appendChild(el('div', { class: 'kv' }, [el('span', { class: 'k', text: 'Being built' }), el('span', { text: site.queue.map((j) => D.WORKS[j.work].name + ' (' + F.fmtNum(j.left, 0) + ' labor left)').join(', ') })]));
      }
      panel.appendChild(kv);
      panel.appendChild(el('hr', { class: 'rule' }));
      panel.appendChild(el('div', { class: 'note', text: 'Raise works here:' }));
      panel.appendChild(buildButtons(state, site));

      // special acts
      const special = el('div', { class: 'rowbtns' });
      if (site.kind === 'blackhole' && EV.economy.has(state, 'gullet')) {
        special.appendChild(el('button', {
          text: 'Feed the Gullet (1 matter → 40 charge)',
          title: 'Drop matter down the throat and drink the light of its falling.',
          onclick: act(() => EV.actions.feedGullet(state, site.id, 1)),
        }));
      }
      if (state.gleaner.awake && !state.gleaner.starved) {
        special.appendChild(el('button', {
          text: 'Burn a decoy here (12 charge)',
          title: 'Set an uncrewed cache alight in this band: a bonfire for the thing that follows bonfires.',
          onclick: act(() => EV.actions.decoy(state, site.band, 12)),
        }));
      }
      if (EV.economy.doctrine(state, 'ash_sacrament') && site.kind !== 'blackhole') {
        special.appendChild(el('button', {
          class: 'dark-act',
          text: 'Render this place for the stores',
          title: 'Unmake ' + site.name + ' entirely — works, matter, and whoever is standing in it — and feed it to the stores. The stain of it does not wash.',
          onclick: act(() => EV.actions.feedSite(state, site.id)),
        }));
      }
      if (special.children.length) panel.appendChild(special);
    }

    // the people here
    const folk = state.hearths.filter((h) => h.siteId === site.id);
    panel.appendChild(el('hr', { class: 'rule' }));
    panel.appendChild(el('div', { class: 'note', text: folk.length ? 'Who lives here:' : 'No one lives here.' }));
    for (const h of folk) panel.appendChild(hearthRow(state, h, site));
    if (site.notes && site.notes.length) {
      panel.appendChild(el('hr', { class: 'rule' }));
      for (const n of site.notes) panel.appendChild(el('p', { class: 'note', text: n }));
    }
  }

  EV.panels = { renderSite, act };
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
