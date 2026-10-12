/* Evensong — turning the Wheel: one turn's full resolution, in order. */
(function (EV) {
  'use strict';
  const D = EV.data;
  const { deeptime, util, fmt } = EV;
  const E = EV.economy;

  function earListen(state) {
    for (const band of state.ear) {
      let resolvedCount = 0;
      for (const site of state.sites) {
        if (site.band !== band || site.resolved || site.gone || site.hidden) continue;
        site.resolved = true;
        resolvedCount++;
        let extra = '';
        const roll = EV.rng.next(state);
        if (roll < 0.3) { state.res.lore = util.tidy(state.res.lore + 4); extra = ' In the noise, a finding: someone was here once. (+4 lore)'; }
        else if (roll < 0.5) { site.matter += 3; extra = ' The spectra promise unclaimed matter.'; }
        E.log(state, 'The Ear resolves ' + site.name + ' (' + fmt.fmtLy(site.ly) + '): ' + siteLine(site) + extra, 'info');
        if (resolvedCount >= 2) break;
      }
      // deep listening on known voices in that band
      for (const vid in state.voices) {
        const vd = D.VOICES.find((v) => v.id === vid);
        const vs = state.voices[vid];
        if (vd && vs.known && vs.alive && vd.band === band && EV.rng.chance(state, 0.4)) {
          vs.trust = Math.min(100, vs.trust + 1);
        }
      }
    }
  }
  function siteLine(site) {
    const k = {
      world: 'a living world', rogue: 'a rogue world, warm only at its heart',
      whitedwarf: 'a white dwarf, ember-lit', browndwarfs: 'two brown dwarfs, circling',
      neutronstar: 'a neutron star, still spinning', wdpair: 'two white dwarfs, falling slowly together',
      mergerstar: 'a star made of two dead ones', blackhole: 'a black hole, patient',
      remnants: 'a drift of remnants', star: 'a star', runaway: 'something flung out long ago', hold: 'the Hold',
    };
    return k[site.kind] || 'a quiet place';
  }

  function endTurn(state, opts) {
    if (state.ending) return state;
    if (state.threshold) {
      // a threshold must be answered before the Wheel turns again
      EV.events.applyThreshold(state, state.threshold.choices[0].id);
    }
    // state.logbuf may already hold entries from actions taken this turn
    const fromLog = state.ageLog;
    const span = state.strideLog;
    const toLog = deeptime.logAdd(fromLog, span);
    state.turn++;
    state.ageLog = toLog;

    // 1. the ear listens across the span
    earListen(state);
    // 2. the scheduled universe
    EV.events.processWindow(state, fromLog, toLog);
    // 3. ferries arrive
    EV.actions.arriveFerries(state);
    // 4. the economy of the turn
    E.resolve(state);
    // 5. the Gleaner
    EV.gleaner.step(state);
    // 6. the Voices and the mail
    EV.voices.step(state, fromLog, toLog);
    // 7. the age's own noise
    EV.events.randomTidings(state);
    // 8. era thresholds
    EV.events.maybeThreshold(state);
    // 9. endings
    EV.endings.checkDefeats(state);

    // 10. the Wheel drags the floor forward; the stride follows if it must
    const era = D.ERAS[state.era];
    state.floorLog += era.floorRate * state.tuning.floorScale;
    const b = EV.actions.strideBounds(state);
    state.strideLog = util.clamp(state.strideLog, b.lo, b.hi);

    // 11. stain bleeds very slowly if you stop feeding it
    if (state.stain > 0 && state.stain < 100) state.stain = util.tidy(Math.max(0, state.stain - 0.2));

    // 12. chronicle
    state.chronicle.push({
      turn: state.turn, ageLog: state.ageLog, strideLog: span,
      era: state.era, entries: state.logbuf,
    });
    if (state.chronicle.length > 400) state.chronicle.splice(0, state.chronicle.length - 400);
    state.logbuf = [];
    return state;
  }

  EV.turn = { endTurn };
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
