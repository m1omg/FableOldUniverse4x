/* Evensong — the scheduled universe. Everything whose date falls inside the
   turn's stride happens, in date order: suns bloom and collapse, sources die,
   worlds are stripped or swallowed, the galaxy loosens, matter itself keeps
   or fails. Also era thresholds and the random tidings of each age. */
(function (EV) {
  'use strict';
  const D = EV.data;
  const { deeptime, rng, util, fmt } = EV;
  const E = EV.economy;

  function between(a, lo, hi) { return a > lo && a <= hi; }

  // charge gained from a brief flash: storage decides how much is kept
  function flashGain(state, amount, label) {
    let head = Math.max(0, state.res.chargeCap - state.res.charge);
    if (E.has(state, 'cisterns')) head = Math.min(amount, head * 2);
    const kept = Math.min(amount, head);
    state.res.charge = util.tidy(Math.min(state.res.chargeCap, state.res.charge + kept));
    const lost = amount - kept;
    if (lost > 0.5) E.log(state, label + ' — ' + fmt.fmtNum(kept, 0) + ' charge caught, the rest spent on no one. The cisterns were not deep enough for all of it.', 'info');
    else E.log(state, label + ' — ' + fmt.fmtNum(kept, 0) + ' charge caught.', 'good');
  }

  function loseSite(state, site, why, opts) {
    const o = opts || {};
    site.gone = true;
    const lost = E.hearthsAt(state, site.id);
    for (const h of lost) E.killHearth(state, h, why, { grief: o.grief || 12 });
    if (o.toShoal && site.matter > 1) {
      let shoal = state.sites.find((x) => x.id === 'shoal');
      if (!shoal) {
        shoal = { id: 'shoal', name: 'the Shoal', band: 4, ly: 25000, kind: 'remnants', resolved: true, hidden: false, world: false, warm: false, matter: 0, sources: [], built: {}, queue: [], fate: null, gone: false, notes: ['Wreckage rafted up where the galaxy’s debris falls toward the Anchor.'] };
        state.sites.push(shoal);
        E.log(state, 'What falls toward the Anchor gathers: the Shoal, a raft of the galaxy’s wreckage, lies in the Deep.', 'info');
      }
      shoal.matter = util.tidy(shoal.matter + site.matter * 0.6);
    }
  }

  // ------------------------------------------------- the scheduled window ---
  function processWindow(state, fromLog, toLog) {
    const S = state.schedule;
    const A = EV.world.ANCHORS;

    // the Tallow blooms, then collapses
    const home = E.siteById(state, 'home');
    if (home) {
      const tallow = home.sources[0];
      if (S.tallowBloom1 && between(S.tallowBloom1, fromLog, toLog)) {
        tallow.power = 12; S.tallowBloom1 = null;
        E.log(state, 'The Tallow blooms: your sun, near its end, burns half again as bright. The Garden’s weather is breaking.', 'bad');
      }
      if (S.tallowBloom2 && between(S.tallowBloom2, fromLog, toLog)) {
        tallow.power = 16; S.tallowBloom2 = null;
        E.log(state, 'The Tallow blooms again. From Lanthorn’s plains it fills a tenth of the sky. There is no saving the Garden now, only the people on it.', 'bad');
      }
      if (home.scorchAt && between(home.scorchAt, fromLog, toLog)) {
        home.warm = false; home.world = false; home.scorchAt = null;
        home.name = 'Lanthorn (bare)';
        E.log(state, 'Lanthorn’s last weather has burned away. The Garden where your people began is bare glass under a swollen sun. Whoever still lives here lives under roofs now, or not at all.', 'loss');
        state.grief += 8;
      }
    }

    // source deaths (every site, every source)
    for (const site of state.sites) {
      if (site.gone) continue;
      for (const src of site.sources) {
        if (!src.dead && between(src.diesLog, fromLog, toLog)) {
          src.dead = true;
          if (site.id === 'home' && src.kind === 'starlight') {
            // the Tallow collapses to a white dwarf: new, fainter sources
            site.sources.push(EV.world.mkSource('wdglow', 'The Tallow’s ember', 2.5, 22.0));
            site.sources.push(EV.world.mkSource('dmwarmth', 'The dark-matter wind', 1.5, A.haloFails));
            E.log(state, 'The Tallow has gone out. It guttered, swelled once more, and fell in upon itself: a white dwarf now, a coal where a candle was. Its ember will outlast everything you have ever built — and it is not enough to live on as you have lived.', 'loss');
            state.grief += 10;
            state.flags.tallowOut = true;
          } else if (src.kind === 'dmwarmth') {
            E.log(state, 'The dark-matter wind has failed at ' + site.name + ': the halo that fed it is scattering with the galaxy. The dead stars begin their last cooling.', 'bad');
          } else if (src.kind === 'spin') {
            // handled with bursts below
          } else {
            E.log(state, 'A source has died: ' + src.name + ' at ' + site.name + '. It was always going to; the date was on the chart.', 'bad');
          }
        }
      }
      // black hole bursts
      if (site.burstAt && !site.burstDone && between(site.burstAt, fromLog, toLog)) {
        site.burstDone = true;
        const big = site.id === 'anchor';
        if (E.has(state, 'hawking_lanterns') || E.has(state, 'burst_catch')) {
          const amt = (big ? 120 : 50) * (E.has(state, 'burst_catch') ? 2 : 1);
          flashGain(state, amt, 'The ' + site.name + ' has evaporated — the long whisper, then the burst');
        } else {
          E.log(state, site.name + ' has evaporated: a flash brighter than any age of stars, and no one had rigged a single lantern to drink it.', 'bad');
        }
        if (big) state.flags.anchorGone = true;
        for (const src of site.sources) src.dead = true;
      }
      // brown dwarfs collide: a new star at the end of the world
      if (site.collideAt && between(site.collideAt, fromLog, toLog)) {
        site.collideAt = null;
        site.name = 'the Foundling';
        site.kind = 'star'; site.world = true; site.warm = true;
        site.sources.push(EV.world.mkSource('starlight', 'Foundling-light', 7, deeptime.logAdd(toLog, 13)));
        E.log(state, 'Tidings, ' + fmt.fmtLy(site.ly) + ' old: the Sisters have fallen together, and where two failed stars circled there is a new red dwarf — the Foundling. A star born after the death of stars. It will burn for ten trillion years: the last long summer anyone will ever be offered.', 'good');
        state.flame = util.clamp(state.flame + 6, 0, 100);
      }
      // white dwarfs merge
      if (site.mergeAt && between(site.mergeAt, fromLog, toLog)) {
        site.mergeAt = null;
        if (site.mergeKind === 'supernova') {
          E.log(state, 'Tidings, ' + fmt.fmtLy(site.ly) + ' old: the Brides have met at last, and met the weight limit of their kind. The supernova outshone every ember in the Sounding. Nothing of the site remains.', 'bad');
          flashGain(state, 25, 'Light from the Brides’ ending washed over every collector you own');
          loseSite(state, site, 'the Brides’ supernova took them', { grief: 10 });
        } else {
          site.name = 'the Brand';
          site.sources.push(EV.world.mkSource('starlight', 'Helium fire', 9, deeptime.logAdd(toLog, 8.5)));
          E.log(state, 'Tidings, ' + fmt.fmtLy(site.ly) + ' old: the Brides have merged and lit — a helium star, the Brand, furious and brief. A few hundred million years of real daylight, for whoever can get there.', 'good');
        }
      }
      // galaxy evaporation fates
      if (site.fate && !site.gone) {
        const f = site.fate;
        if (!f.announced && toLog > A.galaxyLoosens - 2.5) {
          f.announced = true;
          E.log(state, 'The chart is updated: ' + site.name + ' will be ' + (f.kind === 'flung' ? 'flung from the galaxy' : 'let fall toward the Anchor') + ' near ' + fmt.pow10(f.at, 1) + ' years. What stands on it then goes with it.', 'warn');
        }
        if (between(f.at, fromLog, toLog)) {
          if (f.kind === 'flung') {
            loseSite(state, site, 'their footing was thrown from the galaxy, out into the dark between, beyond any road', { grief: 12 });
            E.log(state, site.name + ' has been cast loose. The galaxy, emptying itself one slingshot at a time, has thrown it into the dark between galaxies. It is not destroyed. It is merely gone where nothing can follow.', 'loss');
          } else {
            loseSite(state, site, 'the long fall to the Anchor took them', { grief: 12, toShoal: true });
            E.log(state, site.name + ' has fallen inward, down the long drain to the Anchor. Its matter rafts up on the Shoal.', 'loss');
          }
        }
      }
    }

    // close stellar pass strips the rogue world
    if (S.passStrip && between(S.passStrip, fromLog, toLog)) {
      S.passStrip = null;
      const rogue = E.siteById(state, 'rogue1');
      if (rogue && !rogue.gone) {
        E.log(state, 'A dead star passed within an astronomical unit of ' + rogue.name + ' — the kind of visit every world gets, once in 10¹⁵ years — and took its orbit with it. The world survives, flung onto a stranger path; its old sky does not.', 'warn');
        rogue.notes.push('Stripped loose by a close stellar pass.');
      }
    }

    // the Meek reveal themselves (or are found)
    if (S.meekReveal && between(S.meekReveal, fromLog, toLog)) {
      S.meekReveal = null;
      const mh = E.siteById(state, 'meek_home');
      if (mh) { mh.hidden = false; mh.resolved = true; }
      state.voices.meek.known = true;
      E.log(state, 'A letter with no owner’s mark, seven years old, from seven light-years away: “We are the Meek. We have watched you bury a sun and keep going. Be quieter, or be eaten.” There are people inside the rogue world Softstep, and they are afraid of being heard.', 'good');
    }

    // the Gleaner wakes
    if (!state.gleaner.awake && toLog >= state.gleaner.wakeAt) {
      state.gleaner.awake = true;
      E.log(state, 'Something old has begun to move in the Deep. It is not a mind. It follows warmth the way water follows a slope, and it strips what it reaches. The Meek call it the Gleaner. It has been doing this since before your people were people.', 'warn');
    }

    // positronium, late and gentle
    if (!state.flags.positronium && between(A.positronium, fromLog, toLog)) {
      state.flags.positronium = true;
      E.log(state, 'The Almanac notes, without ceremony: electrons and positrons have begun to find each other across spans wider than the old observable universe, and to orbit — atoms of almost nothing, wider than everything. They will take 10¹⁴¹ years to fall together. Some of your Graven call them beautiful.', 'info');
    }

    // matter's fate, continuous
    applyMatterFate(state, fromLog, toLog);
  }

  // --------------------------------------------------------- matter fate ----
  function applyMatterFate(state, fromLog, toLog) {
    const fate = state.matterFate;
    const R = state.res;
    let frac = 1;
    if (fate === 'decay') {
      const tau = 2.5e38;
      if (toLog > 35) {
        const dt = Math.pow(10, Math.min(308, toLog)) - Math.pow(10, Math.min(308, fromLog));
        frac = Math.exp(-dt / tau);
      }
    } else if (fate === 'unmaking') {
      const tau = 3e66; // [apocryphal] curvature evaporation of dense matter
      if (toLog > 62) {
        const dt = Math.pow(10, Math.min(308, toLog)) - Math.pow(10, Math.min(308, fromLog));
        frac = Math.exp(-dt / tau);
      }
    }
    if (frac < 0.9999) {
      R.matter = util.tidy(R.matter * frac);
      for (const s of state.sites) if (!s.gone) s.matter = util.tidy(s.matter * frac);
      if (!state.flags.fateFelt && frac < 0.95) {
        state.flags.fateFelt = true;
        if (fate === 'decay') E.log(state, 'It is no longer deniable: matter is leaving. Protons, patient for 10³⁸ years, are dying one by one, and everything made of them — stores, substrates, bodies — is quietly becoming light.', 'bad');
        else E.log(state, 'It is no longer deniable: the dense dead stars are evaporating — not decay but a slow unmaking, spacetime itself taking back what was bent into it. The Almanac marks the page [apocryphal], for whatever comfort that is.', 'bad');
      }
      // flesh and unwoven substrate cannot cross this
      if (frac < 0.5 && !state.flags.baryonDoom) {
        state.flags.baryonDoom = true;
        E.log(state, 'The arithmetic is plain: within an age, nothing baryonic will remain — no stone, no substrate, no body. Only patterns rewoven into what cannot rot (the Lepton Loom) can continue past this.', 'warn');
      }
      // the rot of everything made: gradual, then total
      if (frac < 0.75) {
        if (E.has(state, 'lepton_loom')) {
          if (!state.flags.loomCrossed) {
            state.flags.loomCrossed = true;
            E.log(state, 'The last baryon with your name on it is going — and nobody dies. The Loom holds: minds and works alike run now on electrons, positrons and patience, woven wider than old skies. [apocryphal] You are outliving matter itself.', 'good');
          }
        } else if (state.hearths.length) {
          const order = ['embodied', 'graven', 'manifold', 'stilled', 'wrought'];
          const next = order.map((s) => state.hearths.find((h) => h.shape === s)).find((h) => h);
          if (frac < 0.02) {
            for (const h of state.hearths.slice()) E.killHearth(state, h, 'what they were made of ceased to exist', { grief: 8 });
          } else if (next) {
            E.killHearth(state, next, 'their substance thinned past holding a pattern — the age is unmaking everything they were written on', { grief: 10 });
            E.log(state, 'Without the Lepton Loom, nothing baryonic will see the far side of this. The arithmetic gives you very little time.', 'warn');
          }
        }
        if (R.matter < 0.5) R.matter = 0;
      }
    }
    if (fate === 'stable' && !state.flags.solidsFlow && toLog > 65) {
      state.flags.solidsFlow = true;
      E.log(state, 'Matter keeps — but at 10⁶⁵ years even diamond remembers it is a liquid. Everything you build now slumps, and must be tended like a garden.', 'info');
    }
  }

  function revealFate(state) {
    state.fateKnown = true;
    const f = state.matterFate;
    if (f === 'decay') E.log(state, 'The Proton Watch reports, after ages of silence: a flash in the tank. Then another. The proton is mortal — half of everything will be gone by about 2×10³⁸ years: stores, substrates, bodies, vaults. Matter is a loan. Only the Lepton Loom (Book of the Hush) can carry minds across the repayment.', 'warn');
    else if (f === 'stable') E.log(state, 'The Proton Watch reports: silence, deeper than the experiment can measure. As far as anyone will ever know, matter keeps. The dark will be long, and it will be furnished.', 'good');
    else E.log(state, 'The Proton Watch reports something it was not built to hear: dense matter is evaporating of itself, spacetime unmaking what was bent into it [apocryphal]. Slower than proton-death, stranger, and just as final.', 'warn');
  }

  // ------------------------------------------------------- random tidings ---
  function randomTidings(state) {
    const era = state.era;
    if (!rng.chance(state, 0.3)) return;
    const roll = rng.next(state);
    if (era === 0) {
      if (roll < 0.3) {
        state.res.lore = util.tidy(state.res.lore + 4);
        E.log(state, 'Dust from a dead civilization drifted through the system: etched foil, a child’s arithmetic, a map of stars that no longer exist. (+4 lore)', 'info');
      } else if (roll < 0.55) {
        E.log(state, 'The Tallow flared in its sleep. Collectors rode it out; the night side of Lanthorn watched their shadows thrown across the ice.', 'info');
      } else if (roll < 0.8) {
        flashGain(state, 6, 'A comet fell into the Tallow; the flash was worth catching');
      } else {
        E.log(state, 'A signal repeated nine times from far down the Reach, then stopped. It has not come again. The Ear keeps the recording.', 'info');
      }
    } else if (era === 1) {
      if (roll < 0.3) {
        flashGain(state, 10, 'A frozen world, spiralling for aeons on gravity’s last leak, fell into its dead sun; the infall flash crossed the Sounding');
      } else if (roll < 0.55) {
        E.log(state, 'The sky is emptier again: the survey counts a thousand fewer embers than an age ago. The galaxy is not dying so much as leaving.', 'info');
      } else if (roll < 0.8) {
        state.res.matter = util.tidy(state.res.matter + 3);
        E.log(state, 'A dark comet shoal drifted through the holdings — ice and iron with no sun to mind them. (+3 matter)', 'info');
      } else {
        E.log(state, 'For one turn the Ear heard singing from the direction of the Glass — or something shaped like singing. The Choir does not explain.', 'info');
      }
    } else if (era === 2) {
      if (roll < 0.35 && E.has(state, 'hawking_lanterns')) {
        flashGain(state, 15, 'Somewhere small and far, a black hole no heavier than a mountain finished dying; the lanterns drank the burst');
      } else if (roll < 0.6) {
        E.log(state, 'The Mill’s bearings sang for a thousand years. The engineers’ descendants’ descendants fixed it. The entry in the maintenance log is the whole history of their kind.', 'info');
      } else {
        E.log(state, 'Nothing happened for ten thousand times longer than your species existed before this game began. The watch was kept anyway.', 'info');
      }
    } else {
      E.log(state, 'The dark does not change. The count is kept. That the count is kept is the only event.', 'info');
    }
  }

  // ------------------------------------------------------ era thresholds ----
  function maybeThreshold(state) {
    if (state.threshold || state.ending) return;
    const A = EV.world.ANCHORS;
    if (state.era === 0 && state.flags.tallowOut && state.ageLog > deeptime.logAdd(A.start, 11.4)) {
      state.threshold = {
        toEra: 1,
        title: 'Threshold: the Ash',
        text: 'The last red dwarfs in the Sounding have guttered and fallen in. No star burns anywhere your light will ever reach again — saving the accidents, the collisions, the brief mergers of the already-dead. The Vigil is over. What warmth there is now is the warmth of embers and of the invisible wind. Before the long cooling begins, decide what the people carry out of the age of light.',
        choices: [
          { id: 'soil', name: 'Carry the Soil', blurb: 'Seedbanks, wombs, weather: the stubborn claim that bodies belong in the dark. (Seed in the Ice will cost a third less; +3 Flame)' },
          { id: 'pattern', name: 'Carry the Pattern', blurb: 'The books of how to be rewritten: engraving and weaving come easier. (+10 lore; conversions cost 1 less charge)' },
          { id: 'names', name: 'Carry Nothing but Names', blurb: 'Let the age go, and keep only who was in it. (+15 testament; −10 grief)' },
        ],
      };
    } else if (state.era === 1 && state.ageLog >= A.eraAshEnds) {
      state.threshold = {
        toEra: 2,
        title: 'Threshold: the Wells',
        text: 'The galaxy is gone — not destroyed; dispersed. A hundred billion dead suns, flung one by one into the intergalactic dark or swallowed down the middle, and the sky your ancestors meant by “sky” is over. What remains in reach: the black holes, sinking and patient, the warmest things left in the world. You will live on gravity now.',
        choices: [
          { id: 'wells', name: 'Hold the Wells', blurb: 'Bring everyone down to the black holes in one great crossing. (All hearths and stores moved to the Deep, free)' },
          { id: 'lamp', name: 'Keep a Far Lamp', blurb: 'Leave one manned light burning away from the Wells, against all sense. (Keep one outer site; +6 Flame; its upkeep is yours)' },
          { id: 'salvage', name: 'Let the Dark Take the Rest', blurb: 'Strip every holding you cannot keep. (+12 matter; +5 grief; +3 stain)' },
        ],
      };
    } else if (state.era === 2 && state.flags.anchorGone) {
      state.threshold = {
        toEra: 3,
        title: 'Threshold: the Hush',
        text: 'The Anchor has evaporated — the last loud thing that will ever happen inside your horizon. (Larger wells survive in other galaxies’ graves, and their final bursts will never reach you: the expansion took the distance away long ago.) Nothing makes light any more. There is the Hold, the vault, the stores, and the question the whole game has been asking.',
        choices: [
          { id: 'spend', name: 'Spend It Bright', blurb: 'One last festival, defiant, warm, unwise. (+8 Flame; −15 charge)' },
          { id: 'hoard', name: 'Hoard the Grave', blurb: 'Every joule accounted, every gram. (−4 Flame; +15% charge cap)' },
          { id: 'sleepdoor', name: 'Open the Door of Sleep', blurb: 'Let any Graven or Manifold who wishes go Still now, freely. (Those conversions are free this age)' },
        ],
      };
    }
  }

  function applyThreshold(state, choiceId) {
    const th = state.threshold;
    if (!th) return;
    state.threshold = null;
    state.era = th.toEra;
    const R = state.res;
    E.log(state, '— ' + D.ERAS[th.toEra].ord + ': ' + D.ERAS[th.toEra].name + '. ' + D.ERAS[th.toEra].line, 'era');
    if (choiceId === 'soil') { state.flags.soil = true; state.flame = util.clamp(state.flame + 3, 0, 100); }
    if (choiceId === 'pattern') { state.flags.pattern = true; R.lore = util.tidy(R.lore + 10); }
    if (choiceId === 'names') { R.testament = util.tidy(R.testament + 15); state.grief = Math.max(0, state.grief - 10); }
    if (choiceId === 'wells') {
      const deepSites = state.sites.filter((s) => !s.gone && s.kind === 'blackhole');
      const dest = deepSites.find((s) => s.id === 'anchor') || deepSites[0];
      if (dest) {
        for (const h of state.hearths) {
          if (String(h.siteId).indexOf('__transit__') !== 0) h.siteId = dest.id;
        }
        dest.built.substrate = Math.max(dest.built.substrate || 0, 4);
        dest.built.hearthhall = Math.max(dest.built.hearthhall || 0, 1);
        E.log(state, 'The great crossing is made: everyone who is anyone you know now lives at ' + dest.name + '.', 'info');
      }
    }
    if (choiceId === 'lamp') { state.flags.farLamp = true; state.flame = util.clamp(state.flame + 6, 0, 100); }
    if (choiceId === 'salvage') {
      R.matter = util.tidy(R.matter + 12); state.grief += 5; state.stain += 3;
      for (const s of state.sites) {
        if (!s.gone && s.kind !== 'blackhole' && E.hearthsAt(state, s.id).length === 0 && s.id !== 'shoal') s.gone = true;
      }
    }
    if (choiceId === 'spend') { state.flame = util.clamp(state.flame + 8, 0, 100); R.charge = util.tidy(Math.max(0, R.charge - 15)); }
    if (choiceId === 'hoard') { state.flame = util.clamp(state.flame - 4, 0, 100); R.chargeCap = Math.round(R.chargeCap * 1.15); }
    if (choiceId === 'sleepdoor') state.flags.sleepdoor = true;

    if (th.toEra === 3) consolidateHold(state);
  }

  // the Hush: one place, one budget, one question
  function consolidateHold(state) {
    const hold = {
      id: 'hold', name: 'the Hold', band: 4, ly: 25000, kind: 'hold',
      resolved: true, hidden: false, world: false, warm: false,
      matter: 0, sources: [], built: { vault: 0, hearthhall: 1, substrate: 6 },
      queue: [], fate: null, gone: false,
      notes: ['Everything that is still yours, gathered in one dark place.'],
    };
    let vaults = 0, cisterns = 0;
    for (const s of state.sites) {
      if (s.gone) continue;
      vaults += s.built.vault || 0;
      cisterns += s.built.cistern || 0;
      hold.matter = util.tidy(hold.matter + s.matter);
      s.gone = true;
    }
    hold.built.vault = vaults > 0 ? 1 : 0;
    hold.built.cistern = cisterns;
    state.sites.push(hold);
    for (const h of state.hearths) h.siteId = 'hold';
    state.gleaner.starved = true;
    E.log(state, 'The long gathering is complete. All that remains of everyone lives in the Hold now: stores, vault, and the people in whatever shapes they chose. Outside is the longest night there will ever be.', 'era');
  }

  EV.events = { processWindow, randomTidings, maybeThreshold, applyThreshold, revealFate, flashGain, loseSite };
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
