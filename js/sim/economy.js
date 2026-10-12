/* Evensong — the per-turn economy. Production and upkeep are rates, so they
   are stride-independent by design; the stride decides the *schedule* (what
   dies, arrives and passes this turn), which events.js handles. */
(function (EV) {
  'use strict';
  const D = EV.data;
  const { util } = EV;

  function log(state, text, k) {
    state.logbuf.push({ k: k || 'info', t: text });
  }

  function has(state, inq) { return state.inquiries.done.indexOf(inq) >= 0; }
  function doctrine(state, id) { return state.doctrines.indexOf(id) >= 0; }

  function siteById(state, id) {
    for (const s of state.sites) if (s.id === id) return s;
    return null;
  }
  function hearthsAt(state, siteId) {
    return state.hearths.filter((h) => h.siteId === siteId);
  }
  function stanceOf(state, h) {
    const sh = D.SHAPES[h.shape];
    if (h.stance === 'slow' && !sh.canSlow) return D.STANCES.even;
    if (h.stance === 'quick' && (sh.still || sh.id === 'embodied')) return D.STANCES.even;
    return D.STANCES[h.stance] || D.STANCES.even;
  }
  function horizonOf(state, h) {
    const sh = D.SHAPES[h.shape];
    let hz = sh.horizon;
    if (h.shape === 'graven' && has(state, 'deep_clocks')) hz = 12;
    if (h.shape === 'manifold' && has(state, 'deep_clocks')) hz = 13;
    if (h.stance === 'slow' && sh.canSlow) hz += 4; // slowing is partial stillness
    if (h.shape === 'stilled' && has(state, 'litany')) hz = Infinity;
    // Seed in the Ice: a biology that sips — generations become their own
    // government at any span, which is the whole point of the inquiry.
    if (h.shape === 'embodied' && has(state, 'seed_in_ice')) hz = Infinity;
    if (has(state, 'lepton_loom')) hz = Infinity;
    return hz;
  }

  // power a site actually yields this turn (0 if nothing of yours is there)
  function sitePower(state, site) {
    if (site.gone) return 0;
    const present = hearthsAt(state, site.id).length > 0;
    const harvested = present || (site.built.collector || 0) > 0 || (site.built.mill || 0) > 0;
    if (!harvested) return 0;
    let p = 0;
    for (const src of site.sources) {
      if (src.dead) continue;
      if (src.needs === 'mill' && !(site.built.mill > 0)) continue;
      let v = src.power;
      if (has(state, 'starwell_tap') && (src.kind === 'wdglow' || src.kind === 'spindown' || src.kind === 'radiogenic')) v *= 1.4;
      p += v;
    }
    p *= 1 + 0.6 * (site.built.collector || 0);
    return p * state.tuning.margin;
  }

  // room checks ------------------------------------------------------------
  function roomAt(state, site, shape) {
    const hs = hearthsAt(state, site.id);
    if (shape === 'embodied') {
      const cap = (site.world && site.warm ? 3 : 0) + 2 * (site.built.hearthhall || 0);
      return cap - hs.filter((h) => h.shape === 'embodied').length;
    }
    if (shape === 'graven' || shape === 'stilled' || shape === 'manifold') {
      const cap = 2 * (site.built.substrate || 0);
      const used = hs.filter((h) => h.shape === 'graven' || h.shape === 'stilled').length
        + 2 * hs.filter((h) => h.shape === 'manifold').length;
      return cap - used - (shape === 'manifold' ? 1 : 0);
    }
    return 99; // wrought need no room
  }

  function killHearth(state, h, why, opts) {
    const o = opts || {};
    const i = state.hearths.indexOf(h);
    if (i >= 0) state.hearths.splice(i, 1);
    state.stats.hearthsLost++;
    let g = o.grief !== undefined ? o.grief : 10;
    if (doctrine(state, 'ledger_of_names')) g *= 0.6;
    state.grief += g;
    if (doctrine(state, 'nothing_wasted')) {
      state.res.matter += 2; state.grief += 1; state.stain += 1;
      log(state, h.name + ' is gone — ' + why + '. What could be kept of them, was. (+2 matter; the keeping has a weight.)', 'loss');
    } else {
      log(state, h.name + ' is gone — ' + why + '.', 'loss');
    }
    state.flame = util.clamp(state.flame - 3, 0, 100);
  }

  // the whole per-turn resolution -------------------------------------------
  function resolve(state) {
    const R = state.res;

    // --- matter mining & wrought matter upkeep
    let matterIn = 0;
    for (const site of state.sites) {
      if (site.gone) continue;
      if ((site.built.forgeworks || 0) > 0 && site.matter > 0 && hearthsAt(state, site.id).length > 0) {
        const take = Math.min(2, site.matter);
        site.matter = util.tidy(site.matter - take);
        matterIn += take;
      }
    }
    R.matter = util.tidy(R.matter + matterIn);

    // structure maintenance once solids flow (stable matter, Dyson 1979)
    if (state.matterFate === 'stable' && state.ageLog > 65) {
      let builtCount = 0;
      for (const s of state.sites) if (!s.gone) for (const k in s.built) builtCount += s.built[k];
      const cost = 0.1 * builtCount;
      R.matter = util.tidy(Math.max(0, R.matter - cost));
    }

    // --- production & upkeep
    let produced = 0;
    for (const site of state.sites) produced += sitePower(state, site);

    let upkeep = 0, loreOut = 0, riteCap = 0;
    const industryBySite = {};
    for (const h of state.hearths) {
      const sh = D.SHAPES[h.shape];
      const st = stanceOf(state, h);
      let up = sh.upkeep * st.up;
      let out = st.out;
      if (h.flags.leptonic) up *= 0.5;
      if (doctrine(state, 'tithe_of_sleep') && h.shape === 'graven') { up *= 0.75; out *= 0.75; }
      upkeep += up;
      if (sh.mUp && !has(state, 'lepton_loom')) {
        let m = sh.mUp;
        if (state.matterFate === 'stable' && state.ageLog > 65) m *= 2;
        R.matter = util.tidy(Math.max(0, R.matter - m));
      }
      loreOut += sh.lore * out;
      riteCap += sh.rites * out;
      industryBySite[h.siteId] = (industryBySite[h.siteId] || 0) + sh.industry * out;
    }
    if (doctrine(state, 'quiet')) loreOut *= 0.8;
    if (doctrine(state, 'ledger_of_names')) loreOut = Math.max(0, loreOut - 0.5);
    if (doctrine(state, 'feast_of_lights')) upkeep += 2;

    let net = produced - upkeep;
    state.lastEcon = { produced: util.tidy(produced), upkeep: util.tidy(upkeep), net: util.tidy(net), matterIn: util.tidy(matterIn), lore: 0 };

    // charge bookkeeping, deficits, the Dimming
    let charge = R.charge + net;
    if (charge < 0 && has(state, 'forge_of_ash') && R.matter > 0) {
      const need = Math.ceil(-charge / 6);
      const burn = Math.min(need, Math.floor(R.matter));
      if (burn > 0) {
        R.matter = util.tidy(R.matter - burn);
        charge += burn * 6;
        log(state, 'The Forge of Ash burned ' + burn + ' matter to keep the lights (' + EV.fmt.fmtNum(burn * 6, 0) + ' charge).');
      }
    }
    let dimmed = false;
    if (charge < 0) {
      dimmed = true;
      const severity = -charge / Math.max(1, upkeep);
      state.flame = util.clamp(state.flame - 5 * state.tuning.flameDecay * Math.min(2, severity + 0.4), 0, 100);
      log(state, 'The Dimming: there was not power enough. Halls went dark and cold in turn.', 'bad');
      // the warm die first
      const emb = state.hearths.filter((h) => h.shape === 'embodied');
      const gra = state.hearths.filter((h) => h.shape === 'graven' || h.shape === 'manifold');
      if (severity > 0.25 && emb.length) killHearth(state, emb[0], 'the cold came in', { grief: 14 });
      else if (severity > 0.45 && gra.length) killHearth(state, gra[0], 'their substrate starved and the pattern faded', { grief: 12 });
      charge = 0;
    }
    // cistern leak
    if (!has(state, 'deep_cisterns') && charge > 0) charge *= 0.985;
    R.charge = util.tidy(Math.min(charge, R.chargeCap));

    // --- works
    for (const site of state.sites) {
      if (site.gone || !site.queue.length) continue;
      let ind = industryBySite[site.id] || 0;
      while (ind > 0 && site.queue.length) {
        const job = site.queue[0];
        const spend = Math.min(ind, job.left);
        job.left = util.tidy(job.left - spend);
        ind -= spend;
        if (job.left <= 0) {
          site.queue.shift();
          site.built[job.work] = (site.built[job.work] || 0) + 1;
          const w = D.WORKS[job.work];
          if (job.work === 'cistern') R.chargeCap += 25;
          if (job.work === 'vault') state.flags.vaultEverBuilt = true;
          log(state, w.name + ' stands finished at ' + site.name + '.', 'good');
        }
      }
    }

    // --- lore and the active inquiry
    R.lore = util.tidy(R.lore + loreOut);
    state.lastEcon.lore = util.tidy(loreOut);
    const inq = state.inquiries;
    if (inq.active) {
      const def = D.INQUIRIES.find((q) => q.id === inq.active);
      if (def && R.lore >= def.cost) {
        R.lore = util.tidy(R.lore - def.cost);
        inq.done.push(def.id);
        inq.active = null;
        log(state, 'Inquiry complete: ' + def.name + ' [' + def.kind + ']. ' + def.blurb, 'good');
        if (def.id === 'cisterns') R.chargeCap += 20;
        if (def.id === 'deep_cisterns') R.chargeCap += 40;
        if (def.id === 'proton_watch') EV.events.revealFate(state);
      }
    }

    // --- rites: grief tended into testament
    const focusMul = [0, 1, 1.6][state.riteFocus] || 1;
    let cap = riteCap * focusMul;
    if (doctrine(state, 'long_grief')) cap *= 1.5;
    const tended = Math.min(state.grief, cap);
    if (tended > 0) {
      state.grief = util.tidy(state.grief - tended);
      R.testament = util.tidy(R.testament + tended * 0.5);
      state.stats.griefTended = util.tidy(state.stats.griefTended + tended);
    }
    // spare rite capacity tends memory as well as mourning
    const spare = Math.min(Math.max(0, cap - tended), 3);
    if (spare > 0 && state.riteFocus > 0) R.testament = util.tidy(R.testament + spare * 0.15);

    // --- embodied exposure: warmth or death
    for (const h of state.hearths.slice()) {
      if (h.shape !== 'embodied') continue;
      const site = siteById(state, h.siteId);
      if (!site || site.gone) continue;
      const warm = (site.world && site.warm) || (site.built.hearthhall || 0) > 0;
      if (!warm) {
        h.flags.cold = (h.flags.cold || 0) + 1;
        if (h.flags.cold === 1) log(state, h.name + ' has no warm roof at ' + site.name + '. Two turns more in the open and they die of it.', 'bad');
        else if (h.flags.cold >= 3) killHearth(state, h, 'there was no warmth left to live in', { grief: 14 });
      } else if (h.flags.cold) delete h.flags.cold;
    }

    // --- drift: strides longer than a mind can govern itself across.
    // A civilization mostly Stilled has accepted the deep time: the few
    // still awake carry it better.
    const mindedAll = state.hearths.filter((h) => !D.SHAPES[h.shape].unminded);
    const stilledAll = state.hearths.filter((h) => h.shape === 'stilled');
    const accepted = mindedAll.length > 0 && stilledAll.length >= mindedAll.length * 0.6;
    let drifted = 0;
    for (const h of state.hearths) {
      const hz = horizonOf(state, h);
      if (!isFinite(hz)) continue;
      const sh = D.SHAPES[h.shape];
      if (sh.unminded || sh.still && isFinite(hz) === false) continue;
      const excess = state.strideLog - hz;
      if (excess > 0) {
        drifted += Math.min(1.0, 0.25 * excess);
        h.flags.drift = (h.flags.drift || 0) + 1;
      } else if (h.flags.drift) delete h.flags.drift;
    }
    if (drifted > 0) {
      // drift never kills: whole generations simply live and die unguided
      // between decisions, and the Flame pays for what the Wheel outran
      drifted = Math.min(2.5, drifted);
      if (accepted) drifted *= 0.5;
      state.flame = util.clamp(state.flame - drifted, 0, 100);
      log(state, 'Ages passed between decisions that minds were not shaped to cross: whole histories, unguided, in the dark between turns. (−' + EV.fmt.fmtNum(drifted) + ' Flame — slow, still or reshape them)', 'bad');
    }

    // --- flame dynamics
    let dFlame = 0;
    if (state.grief > 25) dFlame -= 1 * state.tuning.flameDecay;
    if (state.grief > 50) dFlame -= 1 * state.tuning.flameDecay;
    for (const h of state.hearths) if (h.shape === 'manifold') dFlame += D.SHAPES.manifold.steadies;
    if (doctrine(state, 'feast_of_lights') && !dimmed) dFlame += 1.5;
    if (doctrine(state, 'open_door')) dFlame += 0.3;
    if (state.riteFocus >= 1 && state.grief < 10) dFlame += 0.4; // kept rites are a warmth of their own
    if (state.hearths.some((h) => h.shape === 'embodied')) dFlame += 0.2; // the old warmth
    state.flame = util.clamp(state.flame + dFlame, 0, 100);
    state.flameZeroTurns = state.flame <= 0 ? state.flameZeroTurns + 1 : 0;

    // --- the unminded remainder
    const minded = state.hearths.some((h) => !D.SHAPES[h.shape].unminded);
    state.onlyWroughtTurns = (!minded && state.hearths.length > 0) ? state.onlyWroughtTurns + 1 : 0;

    // --- the Fade: no one awake, and no means left to wake anyone
    const awake = state.hearths.some((h) => h.shape === 'embodied' || h.shape === 'graven' || h.shape === 'manifold');
    const canWake = state.hearths.some((h) => h.shape === 'stilled') && R.charge >= 2;
    state.fadeTurns = (!awake && minded && !canWake) ? (state.fadeTurns || 0) + 1 : 0;
    if (state.fadeTurns === 2) log(state, 'No one has been awake for an age, and there is no longer power enough to wake anyone. The sleepers dream toward the edge of the record.', 'warn');
  }

  EV.economy = { resolve, sitePower, hearthsAt, siteById, roomAt, killHearth, has, doctrine, horizonOf, log };
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
