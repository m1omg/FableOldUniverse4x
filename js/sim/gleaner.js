/* Evensong — the Gleaner: an old, mindless harvester that follows warmth down
   the Sounding like weather. Not evil; worse — indifferent. */
(function (EV) {
  'use strict';
  const D = EV.data;
  const { util, fmt } = EV;
  const E = EV.economy;

  // how warm each band looks to something that eats warmth
  function bandHeat(state) {
    const heat = {};
    for (const b of D.BANDS) heat[b.id] = 0;
    for (const site of state.sites) {
      if (site.gone || site.hidden) continue;
      let h = 0;
      for (const src of site.sources) if (!src.dead) h += src.power * 0.15; // natural glow
      const pop = E.hearthsAt(state, site.id).length;
      if (pop > 0 || Object.keys(site.built).some((k) => site.built[k] > 0)) {
        h += E.sitePower(state, site) * 0.5 + pop * 1.5;
      }
      if ((site.built.veil || 0) > 0) h = 0;
      heat[site.band] += h;
    }
    if (E.doctrine(state, 'quiet')) for (const b in heat) heat[b] *= 0.5;
    if (state.decoy && state.decoy.turns > 0) heat[state.decoy.band] += state.decoy.heat;
    return heat;
  }

  function strike(state, band) {
    const g = state.gleaner;
    // pick the warmest thing of yours in the band
    let best = null, bestH = 0.5;
    for (const site of state.sites) {
      if (site.gone || site.band !== band || site.hidden) continue;
      if ((site.built.veil || 0) > 0) continue;
      const pop = E.hearthsAt(state, site.id).length;
      const h = pop * 2 + E.sitePower(state, site) + Object.keys(site.built).reduce((a, k) => a + site.built[k], 0);
      if (h > bestH) { best = site; bestH = h; }
    }
    if (!best) {
      E.log(state, 'The Gleaner combed ' + D.BANDS[band].name + ' and found nothing worth the taking. It moved on, the way weather moves on.', 'warn');
      g.sated = 1;
      return;
    }
    g.strikes++;
    const pop = E.hearthsAt(state, best.id);
    if (g.strikes === 1 && pop.length > 1) {
      // the first time, the people get out just ahead of it
      const lost = pop[0];
      E.killHearth(state, lost, 'the Gleaner came through ' + best.name + ' and they were the last out of the halls', { grief: 14 });
      E.log(state, 'The rest fled into the dark of ' + best.name + ' with whatever they stood in, and watched from the cold while it worked.', 'bad');
    } else {
      for (const h of pop) E.killHearth(state, h, 'the Gleaner came through ' + best.name + ' and did not notice them as it took everything around them apart', { grief: 14 });
    }
    best.built = {};
    best.queue = [];
    best.matter = util.tidy(best.matter * 0.2);
    for (const src of best.sources) if (src.kind === 'spindown' || src.kind === 'wdglow') src.power *= 0.7;
    E.log(state, 'The Gleaner has fed at ' + best.name + '. Where there were works there is now a lacework of absence — everything useful unmade and carried off, in perfect silence, by something that was not even hungry. It was built to do this, and whoever built it is longer dead than your species is old.', 'dark');
    state.flame = util.clamp(state.flame - 6, 0, 100);
    g.sated = 3;
    g.band = Math.min(5, g.band + 1); // it sinks away to digest
  }

  function step(state) {
    const g = state.gleaner;
    if (!g.awake || g.starved || state.era >= 3) {
      if (g.awake && !g.starvedNoted && (g.starved || state.era >= 3)) {
        g.starvedNoted = true;
        E.log(state, 'Somewhere out in the dark the Gleaner has stopped. There is nothing warm enough left to follow. Even the eater of everything starves in the Hush — unless someone is keeping it.', 'info');
      }
      return;
    }
    if (state.decoy && state.decoy.turns > 0) state.decoy.turns--;
    if (g.sated > 0) { g.sated--; return; }
    g.lastMove++;
    if (g.lastMove < state.tuning.gleanerStep) return;
    g.lastMove = 0;

    const heat = bandHeat(state);
    let target = g.band, bestH = -1;
    if (g.commandTarget !== undefined && g.commandTarget !== null) {
      target = g.commandTarget;
    } else if (g.turnedTurns > 0) {
      g.turnedTurns--;
      target = Math.min(5, g.band + 1); // sent back down toward the dark
    } else {
      for (const b in heat) if (heat[b] > bestH) { bestH = heat[b]; target = Number(b); }
      if (bestH <= 0.6) target = 4; // nothing warm: it sinks back toward the Deep
    }
    if (target === g.band) {
      if ((heat[g.band] || 0) > 0.6 || g.commandTarget === g.band) {
        if (g.commandTarget === g.band) g.commandTarget = null;
        strike(state, g.band);
      }
      return;
    }
    g.band += target > g.band ? 1 : -1;
    const bn = D.BANDS[g.band].name;
    E.log(state, 'The Gleaner has moved: it is in ' + bn + ' now, listening for warmth.', 'warn');
  }

  // --- player tools
  function decoy(state, band, charge) {
    if (charge < 10) return { ok: false, msg: 'A decoy needs at least 10 charge to burn bright enough.' };
    if (state.res.charge < charge) return { ok: false, msg: 'Not charge enough.' };
    state.res.charge = util.tidy(state.res.charge - charge);
    state.decoy = { band, turns: 2, heat: charge * 3 };
    E.log(state, 'A cache of charge is set burning, uncrewed, in ' + D.BANDS[band].name + ' — a bonfire for the thing that follows bonfires.', 'info');
    return { ok: true };
  }

  function turnAway(state) {
    const g = state.gleaner;
    if (!g.awake) return { ok: false, msg: 'The Gleaner still sleeps somewhere in the Deep.' };
    if (!E.has(state, 'gleaner_tongue')) return { ok: false, msg: 'You do not speak enough of its dead makers’ tongue.' };
    if (g.turned > state.era) return { ok: false, msg: 'The phrase has been used this age; it will not answer to it twice.' };
    g.turned++;
    g.turnedTurns = 4;
    g.understood = true;
    E.log(state, 'You speak the makers’ phrase into the dark — NOT HERE, in a grammar older than your sky — and the Gleaner, obedient to its dead, turns away.', 'good');
    return { ok: true };
  }

  function command(state, band) {
    const g = state.gleaner;
    if (!g.awake || g.starved) return { ok: false, msg: 'There is nothing to command: the Gleaner is not moving.' };
    if (!E.has(state, 'gleaner_tongue')) return { ok: false, msg: 'You do not speak its tongue.' };
    if (state.stain < 60) return { ok: false, msg: 'You know the words, but you are not yet the kind of thing it obeys. (Stain 60 required — and you should hear how that sounds.)' };
    g.commandTarget = band;
    g.commanded++;
    state.stain = Math.min(100, state.stain + 15);
    state.flame = util.clamp(state.flame - 3, 0, 100);
    E.log(state, 'You do not turn the Gleaner away. You point it. It goes where you say, down toward ' + D.BANDS[band].name + ', and the horror of it is how natural the grammar feels now.', 'dark');
    return { ok: true };
  }

  EV.gleaner = { step, bandHeat, decoy, turnAway, command };
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
