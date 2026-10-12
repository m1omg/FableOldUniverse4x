/* Evensong — the player's verbs. Every action validates, applies, and logs;
   the same API serves the interface and the headless autoplay bot. */
(function (EV) {
  'use strict';
  const D = EV.data;
  const { deeptime, util, fmt } = EV;
  const E = EV.economy;

  function err(msg) { return { ok: false, msg }; }
  function ok(msg) { return { ok: true, msg }; }

  // ------------------------------------------------------------- stride -----
  function strideBounds(state) {
    let width = D.STRIDE_WIDTH;
    const minded = state.hearths.filter((h) => !D.SHAPES[h.shape].unminded);
    const stilled = state.hearths.filter((h) => h.shape === 'stilled');
    if (minded.length && stilled.length >= minded.length * 0.5) width += 1;
    if (state.era >= 3) width += 1;
    if (state.flags.kingsScript) width += 0.5;
    return { lo: state.floorLog, hi: state.floorLog + width };
  }
  function setStride(state, log) {
    const b = strideBounds(state);
    state.strideLog = util.clamp(Math.round(log * 2) / 2, b.lo, b.hi);
    return ok();
  }

  // -------------------------------------------------------------- works -----
  function canBuild(state, site, workId) {
    const w = D.WORKS[workId];
    if (!w) return 'No such work.';
    if (site.gone) return 'The site is gone.';
    if (w.needInquiry && !E.has(state, w.needInquiry)) return 'Needs the inquiry: ' + (D.INQUIRIES.find((q) => q.id === w.needInquiry) || {}).name + '.';
    const have = (site.built[workId] || 0) + site.queue.filter((j) => j.work === workId).length;
    if (have >= w.max) return 'As many ' + w.name + 's stand here as the place will hold.';
    if (w.where === 'hasLight' && !site.sources.some((s) => !s.dead)) return 'Nothing shines here to collect.';
    if (w.where === 'hasMatter' && site.matter <= 0) return 'No matter here worth working.';
    if (w.where === 'scorching' && !(site.scorchAt && site.world)) return 'Nothing here needs shading.';
    if (w.where === 'blackhole' && site.kind !== 'blackhole') return 'Only a black hole will serve.';
    if (E.hearthsAt(state, site.id).length === 0) return 'No hands at ' + site.name + ' to build it.';
    if (state.res.matter < w.cost.m) return 'Not matter enough (' + w.cost.m + ' needed).';
    if (state.res.charge < w.cost.c) return 'Not charge enough (' + w.cost.c + ' needed).';
    return null;
  }
  function queueWork(state, siteId, workId) {
    const site = E.siteById(state, siteId);
    if (!site) return err('No such site.');
    const bad = canBuild(state, site, workId);
    if (bad) return err(bad);
    const w = D.WORKS[workId];
    state.res.matter = util.tidy(state.res.matter - w.cost.m);
    state.res.charge = util.tidy(state.res.charge - w.cost.c);
    site.queue.push({ work: workId, left: w.labor });
    if (workId === 'shade' && site.scorchAt) {
      site.scorchAt = deeptime.logAdd(site.scorchAt, Math.log10(1500));
      E.log(state, 'The Great Shade rises over ' + site.name + ': a parasol a continent wide, buying the Garden its last reprieve.');
    }
    return ok(w.name + ' begun at ' + site.name + '.');
  }
  function cancelWork(state, siteId, idx) {
    const site = E.siteById(state, siteId);
    if (!site || !site.queue[idx]) return err('Nothing to cancel.');
    const w = D.WORKS[site.queue[idx].work];
    site.queue.splice(idx, 1);
    state.res.matter = util.tidy(state.res.matter + Math.floor(w.cost.m / 2));
    return ok('Work abandoned; half the matter reclaimed.');
  }

  // -------------------------------------------------------- conversions -----
  function convCost(state, base) {
    let c = Object.assign({}, base);
    if (E.doctrine(state, 'garment')) { c.m = Math.max(0, c.m - 1); c.c = Math.max(0, c.c - 1); }
    if (E.doctrine(state, 'no_mind_unwilling')) c.c += 1;
    if (state.flags.pattern) c.c = Math.max(0, c.c - 1);
    return c;
  }
  function convGrief(state, base) {
    let g = base;
    if (E.doctrine(state, 'no_mind_unwilling')) g *= 0.5;
    if (E.doctrine(state, 'garment')) g *= 0.75;
    return g;
  }
  function hearthById(state, id) { return state.hearths.find((h) => h.id === id); }

  function engrave(state, hearthId) {
    if (!E.has(state, 'engraving')) return err('The practice of engraving must be relearned first (Book of Vessels).');
    const h = hearthById(state, hearthId);
    if (!h || h.shape !== 'embodied') return err('Only the Embodied can be engraved.');
    const site = E.siteById(state, h.siteId);
    if (E.roomAt(state, site, 'graven') < 1) return err('No substrate room at ' + site.name + '. Build substrate halls.');
    const cost = convCost(state, { m: 3, c: 2 });
    if (state.res.matter < cost.m || state.res.charge < cost.c) return err('Needs ' + cost.m + ' matter, ' + cost.c + ' charge.');
    state.res.matter = util.tidy(state.res.matter - cost.m);
    state.res.charge = util.tidy(state.res.charge - cost.c);
    h.shape = 'graven'; h.flags.prev = 'embodied';
    state.grief = util.tidy(state.grief + convGrief(state, 6));
    state.flame = util.clamp(state.flame - 1, 0, 100);
    state.stats.conversions++;
    E.log(state, h.name + ' has been engraved: the bodies rest, the minds go on in cold substrate. The funerals and the welcome-feasts are held on the same day, and no one is sure which to dress for.', 'info');
    return ok();
  }
  function weave(state, h1Id, h2Id) {
    if (!E.has(state, 'weave')) return err('The Weave is not yet understood.');
    const h1 = hearthById(state, h1Id), h2 = hearthById(state, h2Id);
    if (!h1 || !h2 || h1 === h2) return err('Choose two Graven hearths.');
    if (h1.shape !== 'graven' || h2.shape !== 'graven') return err('Only Graven can be woven.');
    if (h1.siteId !== h2.siteId) return err('They must share a site to be woven.');
    const cost = convCost(state, { m: 1, c: 3 });
    if (state.res.charge < cost.c || state.res.matter < cost.m) return err('Needs ' + cost.m + ' matter, ' + cost.c + ' charge.');
    state.res.charge = util.tidy(state.res.charge - cost.c);
    state.res.matter = util.tidy(state.res.matter - cost.m);
    const site = h1.siteId;
    state.hearths.splice(state.hearths.indexOf(h1), 1);
    state.hearths.splice(state.hearths.indexOf(h2), 1);
    const m = EV.world.mkHearth(state, 'manifold', site);
    m.name = 'A Manifold, woven of ' + shortName(h1) + ' and ' + shortName(h2);
    state.hearths.push(m);
    state.grief = util.tidy(state.grief + convGrief(state, 4));
    state.flame = util.clamp(state.flame + 2, 0, 100);
    state.stats.conversions++;
    E.log(state, m.name + ' speaks for the first time, in the plural, and then — after a pause everyone notices — in the singular. It cannot be undone, and it says, gently, that it would not want to be.', 'info');
    return ok();
  }
  function shortName(h) { return h.name.split(',')[0]; }
  function still(state, hearthId) {
    if (!E.has(state, 'stillness')) return err('Stillness is not yet understood.');
    const h = hearthById(state, hearthId);
    if (!h || (h.shape !== 'graven' && h.shape !== 'manifold')) return err('Only Graven or Manifold hearths can be stilled.');
    const free = state.flags.sleepdoor && state.era >= 3;
    if (!free && state.res.charge < 1) return err('Needs 1 charge for the cooling.');
    if (!free) state.res.charge = util.tidy(state.res.charge - 1);
    h.flags.prev = h.shape;
    h.shape = 'stilled';
    state.grief = util.tidy(state.grief + convGrief(state, 2));
    state.stats.conversions++;
    E.log(state, h.name + ' goes Still: thought slowed toward the temperature of the sky, one moment of theirs to an age of yours. They leave a note. It says: wake us for the good part.', 'info');
    return ok();
  }
  function wake(state, hearthId) {
    const h = hearthById(state, hearthId);
    if (!h || h.shape !== 'stilled') return err('Only the Stilled can be woken.');
    if (state.res.charge < 2) return err('Needs 2 charge for the warming.');
    state.res.charge = util.tidy(state.res.charge - 2);
    h.shape = h.flags.prev || 'graven';
    delete h.flags.prev;
    E.log(state, h.name + ' is woken, and asks — before anything else — how long, and listens to the answer all the way through.', 'info');
    return ok();
  }
  function forge(state, siteId) {
    const site = E.siteById(state, siteId);
    if (!site || site.gone) return err('No such site.');
    if ((site.built.forgeworks || 0) < 1) return err('Needs Forgeworks at the site.');
    if (state.res.matter < 5 || state.res.charge < 2) return err('Needs 5 matter, 2 charge.');
    state.res.matter = util.tidy(state.res.matter - 5);
    state.res.charge = util.tidy(state.res.charge - 2);
    const h = EV.world.mkHearth(state, 'wrought', siteId);
    state.hearths.push(h);
    E.log(state, h.name + ' is forged at ' + site.name + ': a crew of made things, patient as furniture, strong as weather. No one is inside. Everyone checks twice.', 'info');
    return ok();
  }
  function rekindle(state, hearthId) {
    if (!E.has(state, 'rekindling')) return err('Rekindling is not yet understood.');
    const h = hearthById(state, hearthId);
    if (!h || h.shape !== 'graven') return err('Only Graven patterns can be rekindled.');
    const site = E.siteById(state, h.siteId);
    const warm = (site.world && site.warm) || (site.built.hearthhall || 0) > 0;
    if (!warm) return err('Nowhere warm at ' + site.name + ' to grow bodies in.');
    if (E.roomAt(state, site, 'embodied') < 1) return err('No warm room at ' + site.name + '.');
    if (state.res.matter < 3 || state.res.charge < 3) return err('Needs 3 matter, 3 charge.');
    state.res.matter = util.tidy(state.res.matter - 3);
    state.res.charge = util.tidy(state.res.charge - 3);
    h.shape = 'embodied';
    state.flame = util.clamp(state.flame + 4, 0, 100);
    state.stats.conversions++;
    E.log(state, h.name + ' walks again in grown bodies — clumsy for a decade, laughing about it for a century. There are children in the halls. The halls had forgotten.', 'good');
    return ok();
  }

  function setStance(state, hearthId, stance) {
    const h = hearthById(state, hearthId);
    if (!h) return err('No such hearth.');
    if (!D.STANCES[stance]) return err('No such stance.');
    if (stance === 'slow' && !D.SHAPES[h.shape].canSlow) return err(D.SHAPES[h.shape].plural + ' cannot slow themselves.');
    if (stance === 'quick' && (h.shape === 'stilled' || h.shape === 'embodied')) return err('They cannot run quicker than they are.');
    h.stance = stance;
    return ok();
  }
  function setRiteFocus(state, n) {
    state.riteFocus = util.clamp(Math.round(n), 0, 2);
    return ok();
  }
  function setEar(state, bands) {
    const slots = earSlots(state);
    state.ear = (bands || []).slice(0, slots);
    return ok();
  }
  function earSlots(state) {
    let slots = 1;
    for (const s of state.sites) if (!s.gone) slots += s.built.watch || 0;
    return Math.min(3, slots);
  }

  // ------------------------------------------------------------ ferries -----
  function ferrySpeeds(state) {
    const v = [{ id: 'yard', c: 0.001, cost: 0.5, name: 'Yard ferry (0.001 c)' }];
    if (E.has(state, 'long_ferries')) v.push({ id: 'long', c: 0.01, cost: 2, name: 'Long ferry (0.01 c)' });
    if (E.has(state, 'sail_of_ages')) v.push({ id: 'sail', c: 0.1, cost: 8, name: 'Sail of ages (0.1 c)' });
    return v;
  }
  function ferryReach(state, from, to) {
    if (to.hidden || to.gone) return 'No harbor there.';
    const far = Math.max(from.ly, to.ly);
    if (far > 12 && !E.has(state, 'long_ferries')) return 'Beyond yard ferries: learn Long ferries (Book of Roads).';
    if (to.band === 5 && !E.has(state, 'last_road')) return 'The Forsaken needs the Last Road.';
    return null;
  }
  function ferryDist(from, to) {
    // sites sit on one sounding line; a light fudge stands in for geometry
    return Math.max(0.5, Math.abs(from.ly - to.ly) + 0.3 * Math.min(from.ly, to.ly));
  }
  function launchFerry(state, fromId, toId, hearthIds, matter, speedId) {
    const from = E.siteById(state, fromId), to = E.siteById(state, toId);
    if (!from || !to || from === to) return err('Choose two different sites.');
    const why = ferryReach(state, from, to);
    if (why) return err(why);
    const sp = ferrySpeeds(state).find((s) => s.id === speedId) || ferrySpeeds(state)[0];
    const cap = E.has(state, 'harbor_craft') ? { h: 4, m: 12 } : { h: 2, m: 6 };
    const hs = (hearthIds || []).map((id) => hearthById(state, id)).filter((h) => h && h.siteId === fromId);
    if (hs.length > cap.h) return err('Too many hearths for the hull (' + cap.h + ' at most).');
    const m = util.clamp(matter || 0, 0, Math.min(cap.m, state.res.matter));
    if (hs.length === 0 && m <= 0) return err('An empty ferry serves no one.');
    const mass = 2 + hs.length * 2 + m * 0.5;
    let cCost = mass * sp.cost * (E.has(state, 'cold_coasting') ? 0.5 : 1);
    cCost = Math.round(cCost * 10) / 10;
    if (state.res.matter < 3 + m) return err('Needs ' + (3 + m) + ' matter (hull and freight).');
    if (state.res.charge < cCost) return err('Needs ' + fmt.fmtNum(cCost) + ' charge for the launch.');
    state.res.matter = util.tidy(state.res.matter - 3 - m);
    state.res.charge = util.tidy(state.res.charge - cCost);
    const dist = ferryDist(from, to);
    const years = dist / sp.c;
    const arriveAt = deeptime.logAdd(state.ageLog, deeptime.log(years));
    const f = {
      id: 'f' + (state.ferryCount++),
      from: fromId, to: toId, speed: sp.id,
      hearthIds: hs.map((h) => h.id), matter: m,
      departed: state.ageLog, arriveAt,
    };
    for (const h of hs) { h.siteId = '__transit__' + f.id; }
    state.ferries.push(f);
    E.log(state, 'A ferry departs ' + from.name + ' for ' + to.name + ': ' + (hs.length ? hs.length + ' hearth(s)' : 'freight only') + (m ? ', ' + fmt.fmtNum(m, 0) + ' matter' : '') + '. The crossing will take ' + fmt.fmtYears(deeptime.log(years)) + '. There is no steering now, only arriving.');
    return ok();
  }

  function arriveFerries(state) {
    for (const f of state.ferries.slice()) {
      if (state.ageLog < f.arriveAt) continue;
      state.ferries.splice(state.ferries.indexOf(f), 1);
      let to = E.siteById(state, f.to);
      if (!to || to.gone || to.hidden) {
        // the harbor died while they were in the dark
        const alt = state.sites.find((s) => !s.gone && !s.hidden && s.band === (to ? to.band : 4));
        if (alt) {
          E.log(state, 'The ferry made harbor at ' + alt.name + ' instead: ' + (to ? to.name : 'its destination') + ' was gone when they arrived. They learned it from the silence, years out, and changed course without a word.', 'warn');
          to = alt;
        } else {
          for (const hid of f.hearthIds) {
            const h = state.hearths.find((x) => x.id === hid);
            if (h) E.killHearth(state, h, 'their harbor was gone and the dark between held no other', { grief: 14 });
          }
          E.log(state, 'A ferry’s harbor was gone when it arrived, and there was nowhere else within its fuel. The Chronicle keeps their manifest.', 'loss');
          continue;
        }
      }
      for (const hid of f.hearthIds) {
        const h = state.hearths.find((x) => x.id === hid);
        if (h) h.siteId = to.id;
      }
      state.res.matter = util.tidy(state.res.matter + f.matter);
      E.log(state, 'A ferry has arrived at ' + to.name + (f.hearthIds.length ? ': the travellers step out into a sky that aged while they slept' : ' with its freight') + '.', 'good');
    }
  }

  // --------------------------------------------------- inquiry & doctrine ---
  function setInquiry(state, id) {
    if (id === null) { state.inquiries.active = null; return ok(); }
    const def = D.INQUIRIES.find((q) => q.id === id);
    if (!def) return err('No such inquiry.');
    if (state.inquiries.done.indexOf(id) >= 0) return err('Already understood.');
    state.inquiries.active = id;
    return ok();
  }
  function inquiryCost(state, def) {
    let c = def.cost;
    if (def.id === 'seed_in_ice' && state.flags.soil) c = Math.round(c * 0.67);
    if (def.id === 'hawking_script' && state.flags.kingsScript) c = Math.round(c * 0.7);
    return c;
  }
  function doctrineMax(state) {
    return D.DOCTRINE_MAX + (state.hearths.some((h) => h.shape === 'manifold') ? 2 : 0);
  }
  function adoptDoctrine(state, id) {
    const def = D.DOCTRINES.find((d) => d.id === id);
    if (!def) return err('No such doctrine.');
    if (state.doctrines.indexOf(id) >= 0) return err('Already held.');
    if (state.doctrines.length >= doctrineMax(state)) return err('The book is full: repeal something first.');
    if (state.res.testament < def.cost) return err('Needs ' + def.cost + ' testament.');
    if (id === 'garment' && state.doctrines.indexOf('no_mind_unwilling') >= 0) return err('It cannot be held with No Mind Unwilling; the people will not say both.');
    if (id === 'no_mind_unwilling' && state.doctrines.indexOf('garment') >= 0) return err('It cannot be held with The Body Is a Garment.');
    state.res.testament = util.tidy(state.res.testament - def.cost);
    state.doctrines.push(id);
    if (id === 'garment') { state.flame = util.clamp(state.flame - 2, 0, 100); state.grief += 3; }
    if (id === 'open_door') state.flame = util.clamp(state.flame + 6, 0, 100);
    if (id === 'ash_sacrament') { state.stain = Math.min(100, state.stain + 10); state.flame = util.clamp(state.flame - 3, 0, 100); }
    E.log(state, 'Doctrine adopted: ' + def.name + '. ' + def.blurb, 'info');
    return ok();
  }
  function repealDoctrine(state, id) {
    const i = state.doctrines.indexOf(id);
    if (i < 0) return err('Not held.');
    const def = D.DOCTRINES.find((d) => d.id === id);
    const cost = Math.ceil(def.cost / 2);
    if (state.res.testament < cost) return err('Needs ' + cost + ' testament to unsay.');
    state.res.testament = util.tidy(state.res.testament - cost);
    state.doctrines.splice(i, 1);
    state.flame = util.clamp(state.flame - 2, 0, 100);
    E.log(state, 'Doctrine repealed: ' + def.name + '. What it did while it stood, stays done.', 'info');
    return ok();
  }

  // ------------------------------------------------------------- feeding ----
  function burnForge(state, amount) {
    if (!E.has(state, 'forge_of_ash')) return err('The Forge of Ash is not yet understood.');
    const a = Math.min(Math.floor(amount || 1), Math.floor(state.res.matter));
    if (a < 1) return err('No matter to burn.');
    state.res.matter = util.tidy(state.res.matter - a);
    state.res.charge = util.tidy(Math.min(state.res.chargeCap, state.res.charge + a * 6));
    E.log(state, 'The Forge of Ash burns ' + a + ' matter into ' + (a * 6) + ' charge, by appointment rather than desperation.');
    return ok();
  }

  function feedGullet(state, siteId, amount) {
    if (!E.has(state, 'gullet')) return err('The Gullet is not yet understood.');
    const site = E.siteById(state, siteId);
    if (!site || site.kind !== 'blackhole' || site.gone) return err('Only a living black hole will serve.');
    if (E.hearthsAt(state, siteId).length === 0 && !(site.built.mill > 0)) return err('No one of yours holds ' + site.name + '.');
    const a = Math.min(Math.floor(amount || 1), Math.floor(state.res.matter));
    if (a < 1) return err('No matter to feed it.');
    state.res.matter = util.tidy(state.res.matter - a);
    state.stats.matterFed += a;
    EV.events.flashGain(state, a * 40, a + ' matter went down the ' + site.name + '’s throat; the infall light was very bright');
    return ok();
  }
  function feedSite(state, siteId) {
    if (!E.doctrine(state, 'ash_sacrament')) return err('The people will not do this. (Needs the Ash Sacrament.)');
    const site = E.siteById(state, siteId);
    if (!site || site.gone || site.kind === 'blackhole') return err('No such place to spend.');
    const pop = E.hearthsAt(state, site.id);
    const matter = site.matter + 4;
    for (const h of pop) E.killHearth(state, h, 'their home was rendered down for the stores while they were still in it', { grief: 18 });
    state.res.matter = util.tidy(state.res.matter + matter);
    state.stain = Math.min(100, state.stain + (pop.length ? 20 : 8));
    state.grief += pop.length ? 15 : 4;
    site.gone = true;
    E.log(state, site.name + ' has been rendered: unmade to the last bolt and fed to the stores. (+' + fmt.fmtNum(matter, 0) + ' matter.) The Chronicle records who ordered it. The Chronicle records everything.', 'dark');
    return ok();
  }

  EV.actions = {
    setStride, strideBounds,
    queueWork, cancelWork, canBuild,
    engrave, weave, still, wake, forge, rekindle,
    setStance, setRiteFocus, setEar, earSlots,
    launchFerry, arriveFerries, ferrySpeeds, ferryReach, ferryDist,
    setInquiry, inquiryCost, adoptDoctrine, repealDoctrine, doctrineMax,
    feedGullet, feedSite, burnForge,
    sendLetter: (s, v, i) => EV.voices.sendLetter(s, v, i),
    decoy: (s, b, c) => EV.gleaner.decoy(s, b, c),
    turnGleaner: (s) => EV.gleaner.turnAway(s),
    commandGleaner: (s, b) => EV.gleaner.command(s, b),
    chooseThreshold: (s, c) => EV.events.applyThreshold(s, c),
    undertake: (s, id) => EV.endings.perform(s, id),
  };
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
