/* Evensong — the forecast: everything with a date on the chart, for the
   Vigil Line and the timeline panel. Foreseeable loss is the game's promise. */
(function (EV) {
  'use strict';
  const { fmt } = EV;
  const E = EV.economy;

  function list(state) {
    const out = [];
    const A = EV.world.ANCHORS;
    const add = (atLog, label, kind) => {
      if (atLog === null || atLog === undefined) return;
      if (atLog <= state.ageLog) return;
      out.push({ atLog, label, kind: kind || 'event' });
    };

    for (const site of state.sites) {
      if (site.gone || site.hidden) continue;
      for (const src of site.sources) {
        if (!src.dead && isFinite(src.diesLog)) add(src.diesLog, src.name + ' fails at ' + site.name, 'source');
      }
      if (site.scorchAt) add(site.scorchAt, site.name + '’s last weather', 'loss');
      if (site.collideAt) add(site.collideAt, 'The Sisters fall together', 'hope');
      if (site.mergeAt) add(site.mergeAt, 'The Brides meet', 'event');
      if (site.burstAt && !site.burstDone) add(site.burstAt, site.name + ' evaporates', 'loss');
      if (site.fate && !site.gone && site.fate.announced) {
        add(site.fate.at, site.name + (site.fate.kind === 'flung' ? ' is flung from the galaxy' : ' falls to the Anchor'), 'loss');
      }
    }
    if (!state.gleaner.awake) add(state.gleaner.wakeAt, 'Something stirs in the Deep', 'warn');
    if (state.voices.needle.alive && state.voices.needle.met && state.voices.needle.doomAt) {
      add(state.voices.needle.doomAt, 'The Needle burns out', 'loss');
    }
    if (state.voices.choir.alive && state.voices.choir.met) add(state.voices.choir.doomAt, 'The Choir’s glass goes cold', 'loss');
    add(A.haloFails, 'The dark-matter wind fails everywhere', 'loss');
    add(A.eraAshEnds, 'The galaxy is gone', 'era');
    if (state.fateKnown) {
      if (state.matterFate === 'decay') add(A.protonMidpoint, 'Half of all matter will have decayed', 'loss');
      if (state.matterFate === 'unmaking') add(A.unmakingMidpoint, 'Dense matter half-unmade [apocryphal]', 'loss');
      if (state.matterFate === 'stable') add(A.solidsFlow, 'Even solids begin to flow', 'warn');
    } else {
      add(A.protonMidpoint, 'If protons decay: half of matter gone (the Watch would tell you)', 'warn');
    }
    add(A.positronium, 'Positronium forms across the sky', 'event');
    add(A.positroniumDecays, 'The last atoms close', 'event');

    // ferries in flight
    for (const f of state.ferries) {
      const to = E.siteById(state, f.to);
      add(f.arriveAt, 'A ferry makes harbor at ' + (to ? to.name : 'nowhere'), 'hope');
    }

    out.sort((a, b) => a.atLog - b.atLog);
    return out;
  }

  // what the current stride will cross
  function crossings(state) {
    const toLog = EV.deeptime.logAdd(state.ageLog, state.strideLog);
    return list(state).filter((e) => e.atLog <= toLog);
  }

  EV.forecast = { list, crossings };
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
