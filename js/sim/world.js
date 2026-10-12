/* Evensong — world generation: a new game's state. Everything is plain JSON
   (no classes, no functions in state) so saving is trivial and the sim is
   deterministic from (seed, options). Ages and spans are log10(years). */
(function (EV) {
  'use strict';
  const { rng, deeptime, util } = EV;
  const D = EV.data;

  const START_LOG = 14.0; // 1.0e14 years after the Big Bang

  // Timeline anchors, as log10(age in years). Where a date depends on the
  // seed it is drawn in newGame and stored in state.schedule.
  const ANCHORS = {
    start: START_LOG,
    haloFails: 19.8,       // dark-matter halo gone; galaxy largely evaporated
    galaxyLoosens: 18.4,   // evaporation fates begin landing
    eraAshEnds: 20.0,
    orphanDies: 69.6,      // 6 Msun black hole, t = 2e67 * M^3 yr
    bellDies: 77.2,        // 2e3 Msun
    anchorDies: 87.1,      // 4e6 Msun — the last loud thing inside the horizon
    positronium: 85.0,     // Page & McKee 1981
    positroniumDecays: 141.0,
    solidsFlow: 65.0,      // Dyson 1979, if matter is stable
    protonMidpoint: 38.5,  // if protons decay (tau ~ 2-3e38 yr)
    unmakingMidpoint: 66.0, // [apocryphal] curvature evaporation of dense matter
    recurrenceEta: 1e120,  // log10 of the recurrence age: the Long Alarm's target
  };

  function mkSource(kind, name, power, diesLog, extra) {
    return Object.assign({ kind, name, power, diesLog, dead: false }, extra || {});
  }

  function siteBase(id, name, band, ly, kind) {
    return {
      id, name, band, ly, kind,
      resolved: band <= 1, // near things are already known
      hidden: false,
      world: false, warm: false, scorchAt: null,
      matter: 0, sources: [],
      built: {},            // workId -> count
      queue: [],            // [{work, left}]
      fate: null,           // {kind:'flung'|'infall', at: ageLog, announced:false}
      gone: false,
      notes: [],
    };
  }

  function genSites(state) {
    const s = [];
    const pool = rng.shuffle(state, D.SITE_NAMES.slice());
    const take = () => pool.pop();

    // --- Hearthside: the Tallow (a late, small red dwarf) and Lanthorn ---
    const home = siteBase('home', 'Lanthorn', 0, 0, 'world');
    home.world = true; home.warm = true;
    home.matter = 30;
    home.scorchAt = deeptime.logAdd(START_LOG, Math.log10(1300)); // the sun blooms
    home.sources.push(mkSource('starlight', 'Tallowlight', 8, deeptime.logAdd(START_LOG, 11.48)));
    home.sources.push(mkSource('geothermal', 'The warm ground', 2, deeptime.logAdd(START_LOG, Math.log10(2600))));
    home.built = { collector: 1, substrate: 1 };
    home.resolved = true;
    s.push(home);

    // --- the Near ---
    const rogue = siteBase('rogue1', take(), 1, 6 + rng.range(state, 0, 3), 'rogue');
    rogue.world = true; rogue.warm = false; rogue.matter = 25;
    rogue.sources.push(mkSource('radiogenic', 'Old heat in the stone', 1.5, 16.5));
    s.push(rogue);

    const nearWd = siteBase('nearwd', take(), 1, 8 + rng.range(state, 0, 2), 'whitedwarf');
    nearWd.matter = 15;
    nearWd.sources.push(mkSource('wdglow', 'Dwarf-ember', 2, 21.5));
    nearWd.sources.push(mkSource('dmwarmth', 'The dark-matter wind', 1.5, ANCHORS.haloFails));
    s.push(nearWd);

    const meekHome = siteBase('meek_home', 'Softstep', 1, 7.2, 'rogue');
    meekHome.world = true; meekHome.hidden = true; meekHome.resolved = false;
    meekHome.matter = 6;
    meekHome.sources.push(mkSource('radiogenic', 'Old heat in the stone', 1.2, 17.0));
    s.push(meekHome);

    // --- the Shallows ---
    const choirWd = siteBase('choir_home', 'the Glass', 2, 62, 'whitedwarf');
    choirWd.matter = 8;
    choirWd.sources.push(mkSource('wdglow', 'Dwarf-ember', 2, 22.0));
    choirWd.sources.push(mkSource('dmwarmth', 'The dark-matter wind', 2, ANCHORS.haloFails));
    choirWd.voice = 'choir';
    s.push(choirWd);

    const sisters = siteBase('sisters', 'the Sisters', 2, 40 + rng.range(state, 0, 30), 'browndwarfs');
    sisters.matter = 10;
    // they fall together just after the Vigil ends: the Ash's one long summer
    sisters.collideAt = 14.06 + rng.range(state, 0, 0.08);
    s.push(sisters);

    const spindle = siteBase('spindle', 'the Spindle', 2, 70 + rng.range(state, 0, 20), 'neutronstar');
    spindle.matter = 30;
    spindle.sources.push(mkSource('spindown', 'The spun wheel', 3, 17.5));
    s.push(spindle);

    const brides = siteBase('brides', 'the Brides', 2, 85 + rng.range(state, 0, 10), 'wdpair');
    brides.matter = 9;
    brides.mergeAt = 15.4 + rng.range(state, 0, 1.0);
    brides.mergeKind = rng.chance(state, 0.5) ? 'supernova' : 'helium';
    s.push(brides);

    // --- the Reach ---
    const needleStar = siteBase('needle_home', 'the Needle’s Fire', 3, 3100, 'mergerstar');
    needleStar.voice = 'needle';
    needleStar.sources.push(mkSource('starlight', 'Merger-light', 9, 18.2));
    needleStar.matter = 6;
    s.push(needleStar);

    const orphan = siteBase('orphan', 'the Orphan', 3, 1800 + rng.range(state, 0, 800), 'blackhole');
    orphan.mass = 6; orphan.matter = 4;
    orphan.sources.push(mkSource('spin', 'The Orphan’s spin', 6, ANCHORS.orphanDies, { needs: 'mill' }));
    orphan.burstAt = ANCHORS.orphanDies;
    s.push(orphan);

    const keep = siteBase('keep', take(), 3, 5000 + rng.range(state, 0, 2000), 'remnants');
    keep.matter = 40;
    keep.sources.push(mkSource('wdglow', 'A street of embers', 2.5, 22.0));
    keep.sources.push(mkSource('dmwarmth', 'The dark-matter wind', 1.5, ANCHORS.haloFails));
    s.push(keep);

    // --- the Deep ---
    const bell = siteBase('bell', 'the Bell', 4, 16000, 'blackhole');
    bell.mass = 2000; bell.matter = 5;
    bell.sources.push(mkSource('spin', 'The Bell’s spin', 10, ANCHORS.bellDies, { needs: 'mill' }));
    bell.burstAt = ANCHORS.bellDies;
    s.push(bell);

    const anchor = siteBase('anchor', 'the Anchor', 4, 26000, 'blackhole');
    anchor.mass = 4e6; anchor.matter = 8;
    anchor.sources.push(mkSource('spin', 'The Anchor’s spin', 20, ANCHORS.anchorDies, { needs: 'mill' }));
    anchor.burstAt = ANCHORS.anchorDies;
    anchor.voice = 'kings';
    s.push(anchor);

    // --- the Forsaken ---
    const stray = siteBase('stray', 'the Stray', 5, 1.4e6, 'runaway');
    stray.resolved = false; stray.matter = 10;
    stray.sources.push(mkSource('wdglow', 'A light with no sky', 1.5, 23.0));
    s.push(stray);

    // Evaporation fates: who is flung, who falls in. Black holes sink and
    // stay; the home band is flung late; everything is announced in advance.
    for (const site of s) {
      if (site.kind === 'blackhole') continue;
      if (site.id === 'stray') continue;
      const at = ANCHORS.galaxyLoosens + rng.range(state, 0, 1.4);
      const kind = rng.chance(state, 0.65) ? 'flung' : 'infall';
      site.fate = { kind, at, announced: false };
    }
    return s;
  }

  function mkHearth(state, shape, siteId) {
    const n = state.hearthCount++;
    const ord = D.ORDINALS[Math.min(n, D.ORDINALS.length - 1)];
    const epi = D.HEARTH_EPITHETS[n % D.HEARTH_EPITHETS.length];
    return {
      id: 'h' + n,
      name: ord + ' Hearth, called ' + epi,
      shape, siteId,
      born: state.ageLog,
      stance: 'even',
      flags: {},
    };
  }

  function newGame(opts) {
    const o = Object.assign({ seed: 'evensong', difficulty: 'standard', length: 'full', fate: 'unknown', guide: true }, opts || {});
    const state = {
      v: 1,
      seed: String(o.seed),
      rs: rng.seed(String(o.seed)),
      difficulty: o.difficulty, length: o.length, guide: !!o.guide,
      turn: 0,
      ageLog: START_LOG,
      era: 0,
      floorLog: 2.0,
      strideLog: 2.0,
      hearthCount: 0,
      res: { charge: 20, chargeCap: 30, matter: 25, lore: 0, testament: 6 },
      flame: 70, flameZeroTurns: 0,
      grief: 4, stain: 0,
      riteFocus: 1,         // 0..2: how much of the people's heart goes to rites
      ear: [],              // band ids under attention this turn
      hearths: [],
      sites: [],
      ferries: [],
      ferryCount: 0,
      inquiries: { done: [], active: null, progress: 0 },
      doctrines: [],
      voices: {},
      letters: { out: [], in: [], archive: [], count: 0 },
      gleaner: { awake: false, wakeAt: 16.0, band: 4, sated: 0, strikes: 0, turned: 0, understood: false, commanded: 0, heat: {}, lastMove: 0 },
      schedule: {},         // misc one-shot dates
      matterFate: null, fateKnown: false,
      logbuf: [],           // entries gathered for the current turn's record
      chronicle: [],        // [{turn, ageLog, strideLog, entries: [..]}]
      tidings: [],          // persistent list of foreseen things (for the Vigil Line)
      threshold: null,      // pending threshold choice {era, choices}
      ending: null,
      onlyWroughtTurns: 0,
      decoy: null,          // {band, turns}
      stats: { griefTended: 0, hearthsLost: 0, conversions: 0, lettersSent: 0, matterFed: 0 },
      flags: {},
    };

    // the fate of matter
    if (o.fate === 'unknown' || o.fate === 'told') {
      const roll = rng.next(state);
      state.matterFate = roll < 0.4 ? 'decay' : roll < 0.75 ? 'stable' : 'unmaking';
      state.fateKnown = o.fate === 'told';
    } else {
      state.matterFate = o.fate; // 'decay' | 'stable' | 'unmaking'
      state.fateKnown = true;
    }

    state.sites = genSites(state);

    // founding hearths: four Embodied, one Graven (engraved once, long ago),
    // one Wrought. The practice of engraving itself must be relearned.
    for (let i = 0; i < 4; i++) state.hearths.push(mkHearth(state, 'embodied', 'home'));
    state.hearths.push(mkHearth(state, 'graven', 'home'));
    state.hearths.push(mkHearth(state, 'wrought', 'home'));

    // voices
    for (const v of D.VOICES) {
      state.voices[v.id] = {
        id: v.id, alive: true, known: !v.hidden, trust: v.id === 'kings' ? 5 : 10,
        met: false, refugeOffered: false, refugeTaken: false, siphoned: false,
        doomAt: null, lastWord: false, arc: 0,
      };
    }
    state.voices.needle.doomAt = 17.8 + rng.range(state, 0, 0.7);
    state.voices.choir.doomAt = ANCHORS.haloFails; // unless taken in

    // one-shot schedule
    state.schedule.tallowBloom1 = deeptime.logAdd(START_LOG, Math.log10(300));
    state.schedule.tallowBloom2 = deeptime.logAdd(START_LOG, Math.log10(800));
    state.schedule.meekReveal = 15.2 + rng.range(state, 0, 0.5);
    state.schedule.passStrip = 15.1 + rng.range(state, 0, 0.3); // close stellar pass

    // difficulty
    const diff = { gentle: { margin: 1.2, gleaner: 3, flameDecay: 0.8 }, standard: { margin: 1.0, gleaner: 2, flameDecay: 1.0 }, iron: { margin: 0.85, gleaner: 2, flameDecay: 1.25 } }[o.difficulty] || { margin: 1, gleaner: 2, flameDecay: 1 };
    state.tuning = {
      margin: diff.margin,
      gleanerStep: diff.gleaner,     // turns per band move
      flameDecay: diff.flameDecay,
      floorScale: o.length === 'brief' ? 1.6 : 1.0,
    };

    // opening chronicle
    state.chronicle.push({
      turn: 0, ageLog: state.ageLog, strideLog: state.strideLog, entries: [
        { k: 'open', t: 'The universe is 10¹⁴ years old. Star formation ended long ago; the Tallow, your sun, is one of the last red dwarfs that will ever burn, and it has begun to bloom. Lanthorn, the Garden, has about thirteen hundred years of weather left.' },
        { k: 'open', t: 'You keep what is kept. Choose your stride, and turn the Wheel.' },
      ],
    });
    EV.anchors = ANCHORS;
    return state;
  }

  EV.world = { newGame, ANCHORS, START_LOG, mkHearth, mkSource };
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
