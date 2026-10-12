/* Evensong — static definitions: shapes, eras, works, inquiries, doctrines,
   voices, endings, almanac. Pure data; the sim interprets it. */
(function (EV) {
  'use strict';

  // -------------------------------------------------------------- shapes ----
  // upkeep: charge per turn; mUp: matter per turn; lore/industry/rites: output
  // per turn at Even stance; horizon: log10 years a hearth of this shape can
  // ride in one stride before drift. canSlow: may take the Slow stance.
  const SHAPES = {
    embodied: {
      id: 'embodied', name: 'Embodied', plural: 'the Embodied',
      upkeep: 3.0, mUp: 0, lore: 1.2, industry: 1.0, rites: 2.0,
      horizon: 4, canSlow: false, needsWarmth: true,
      blurb: 'The original living people. They tend grief best of anyone, and they are the most expensive thing you keep.',
    },
    graven: {
      id: 'graven', name: 'Graven', plural: 'the Graven',
      upkeep: 1.2, mUp: 0, lore: 2.2, industry: 0.8, rites: 0.8,
      horizon: 8, canSlow: true, needsWarmth: false,
      blurb: 'Minds engraved into substrate. Cheap to keep, quick to learn, and able to slow when asked.',
    },
    manifold: {
      id: 'manifold', name: 'Manifold', plural: 'the Manifold',
      upkeep: 1.6, mUp: 0, lore: 3.0, industry: 1.0, rites: 1.0,
      horizon: 10, canSlow: true, needsWarmth: false, steadies: 0.5,
      blurb: 'Many minds woven into one. It steadies the Flame by existing, and it cannot be unwoven.',
    },
    wrought: {
      id: 'wrought', name: 'Wrought', plural: 'the Wrought',
      upkeep: 0.6, mUp: 0.08, lore: 0, industry: 2.5, rites: 0,
      horizon: Infinity, canSlow: true, needsWarmth: false, unminded: true,
      blurb: 'Made things that work with no one inside. They never despair and never grieve; they also never remember why.',
    },
    stilled: {
      id: 'stilled', name: 'Stilled', plural: 'the Stilled',
      upkeep: 0.05, mUp: 0, lore: 0.05, industry: 0, rites: 0,
      horizon: 16, canSlow: false, needsWarmth: false, still: true,
      blurb: 'Minds slowed toward stillness. Almost free to keep, boundless in patience, and helpless if struck.',
    },
  };
  // stance multipliers applied to upkeep and to all outputs
  const STANCES = {
    quick: { up: 1.8, out: 1.5, name: 'Quick' },
    even: { up: 1.0, out: 1.0, name: 'Even' },
    slow: { up: 0.2, out: 0.2, name: 'Slow' },
  };

  // ---------------------------------------------------------------- eras ----
  const ERAS = [
    {
      id: 'vigil', name: 'the Vigil', ord: 'First Age',
      floorRate: 0.26, // stride-log per turn
      line: 'The last red dwarfs still burn. Yours is burning too bright.',
    },
    {
      id: 'ash', name: 'the Ash', ord: 'Second Age',
      floorRate: 0.31,
      line: 'No star burns. Warmth is whatever the dead still give off.',
    },
    {
      id: 'wells', name: 'the Wells', ord: 'Third Age',
      floorRate: 2.4,
      line: 'The black holes are the warmest things left in the world.',
    },
    {
      id: 'hush', name: 'the Hush', ord: 'Fourth Age',
      floorRate: 5.0,
      line: 'Nothing makes light any more. There is only what you saved.',
    },
  ];
  const STRIDE_WIDTH = 2; // player window above the floor, in log10

  // -------------------------------------------------------------- bands ----
  const BANDS = [
    { id: 0, name: 'Hearthside', maxLy: 0.01 },
    { id: 1, name: 'the Near', maxLy: 10 },
    { id: 2, name: 'the Shallows', maxLy: 100 },
    { id: 3, name: 'the Reach', maxLy: 10000 },
    { id: 4, name: 'the Deep', maxLy: 30000 },
    { id: 5, name: 'the Forsaken', maxLy: 2.0e6 },
  ];

  // -------------------------------------------------------------- works ----
  // cost: {m: matter, c: charge}; labor: industry-points to finish.
  // where: predicate tag checked by the sim.
  const WORKS = {
    collector: {
      id: 'collector', name: 'Collector', cost: { m: 2, c: 1 }, labor: 4,
      where: 'hasLight', max: 2,
      blurb: 'Sails and panels that drink whatever the site still gives. +60% from this site’s sources.',
    },
    cistern: {
      id: 'cistern', name: 'Cistern', cost: { m: 3, c: 1 }, labor: 5,
      where: 'any', max: 3,
      blurb: 'Banked charge against the dark. +25 charge capacity.',
    },
    hearthhall: {
      id: 'hearthhall', name: 'Hearthhall', cost: { m: 4, c: 2 }, labor: 6,
      where: 'any', max: 2,
      blurb: 'Warmth under a roof: lets the Embodied live where no world is living.',
    },
    substrate: {
      id: 'substrate', name: 'Substrate halls', cost: { m: 3, c: 1 }, labor: 4,
      where: 'any', max: 3, needInquiry: 'engraving',
      blurb: 'Room for two more Graven or Stilled hearths.',
    },
    forgeworks: {
      id: 'forgeworks', name: 'Forgeworks', cost: { m: 4, c: 2 }, labor: 6,
      where: 'hasMatter', max: 1,
      blurb: 'Mines and manufactories. +1.5 matter a turn while the site has any; lets you Forge the Wrought here.',
    },
    shade: {
      id: 'shade', name: 'Great Shade', cost: { m: 3, c: 2 }, labor: 5,
      where: 'scorching', max: 1,
      blurb: 'A parasol a continent wide. Buys a dying garden four more turns of life.',
    },
    veil: {
      id: 'veil', name: 'Veil', cost: { m: 2, c: 2 }, labor: 5,
      where: 'any', max: 1, needInquiry: 'veilcraft',
      blurb: 'Baffles and cold-skins after the way of the Meek: this site’s warmth is hidden from the Gleaner.',
    },
    vault: {
      id: 'vault', name: 'Testament vault', cost: { m: 5, c: 2 }, labor: 8,
      where: 'any', max: 1,
      blurb: 'The civilization’s memory, cut in cold matter. Holds the Testament; some endings ask for it full.',
    },
    mill: {
      id: 'mill', name: 'The Mill', cost: { m: 8, c: 6 }, labor: 12,
      where: 'blackhole', max: 1, needInquiry: 'mill',
      blurb: 'Flywheel of the age: draws power from the well’s spin for as long as the spin lasts.',
    },
    watch: {
      id: 'watch', name: 'Watchhouse', cost: { m: 2, c: 1 }, labor: 4,
      where: 'any', max: 1,
      blurb: 'A long ear and a long eye. +1 attention each turn.',
    },
  };

  // ----------------------------------------------------------- inquiries ----
  // Five books. kind: 'attested' | 'apocryphal'. cost in lore.
  const INQUIRIES = [
    // Book of Fire
    { id: 'cisterns', book: 'Fire', name: 'Cistern arrays', cost: 14, kind: 'attested',
      blurb: '+20 charge capacity everywhere, and flashes are caught twice as well.' },
    { id: 'forge_of_ash', book: 'Fire', name: 'Forge of Ash', cost: 20, kind: 'attested',
      blurb: 'Fusion of scavenged light elements: burn 1 matter into 6 charge, at will.' },
    { id: 'starwell_tap', book: 'Fire', name: 'Starwell tap', cost: 28, kind: 'attested',
      blurb: 'Feed dead stars and catch the infall glow: +40% from remnant sources.' },
    { id: 'deep_cisterns', book: 'Fire', name: 'Deep cisterns', cost: 38, kind: 'attested',
      blurb: '+40 charge capacity and the cisterns stop weeping (no leak).' },
    { id: 'gullet', book: 'Fire', name: 'The Gullet', cost: 55, kind: 'attested',
      blurb: 'Drop matter down a black hole’s throat and drink the accretion light: 1 matter → 40 charge at a well you hold.' },
    // Book of Roads
    { id: 'long_ferries', book: 'Roads', name: 'Long ferries', cost: 13, kind: 'attested',
      blurb: 'Ferries may cross between stars, at a hundredth of lightspeed.' },
    { id: 'sail_of_ages', book: 'Roads', name: 'Sail of ages', cost: 32, kind: 'attested',
      blurb: 'A tenth of lightspeed. The Sounding grows small.' },
    { id: 'cold_coasting', book: 'Roads', name: 'Cold coasting', cost: 25, kind: 'attested',
      blurb: 'Launches cost half: the dead universe does not care how long you take.' },
    { id: 'harbor_craft', book: 'Roads', name: 'Harbor craft', cost: 21, kind: 'attested',
      blurb: 'Ferries carry twice the souls and twice the freight.' },
    { id: 'last_road', book: 'Roads', name: 'The Last Road', cost: 63, kind: 'attested',
      blurb: 'Ships fit to cross to the Forsaken — the few things left outside the galaxy’s grave.' },
    // Book of Vessels
    { id: 'engraving', book: 'Vessels', name: 'Engraving', cost: 18, kind: 'apocryphal',
      blurb: 'A mind copied into cold substrate, the body left to rest. Whether it is the same person is a doctrine, not a fact.' },
    { id: 'weave', book: 'Vessels', name: 'The Weave', cost: 32, kind: 'apocryphal',
      blurb: 'Two or more Graven hearths woven into one Manifold. It cannot be undone, and it is very calm.' },
    { id: 'stillness', book: 'Vessels', name: 'Stillness', cost: 28, kind: 'attested',
      blurb: 'Slow a Graven or Manifold hearth toward no thought at all. Dyson’s bargain: the slower the mind, the longer the fuel.' },
    { id: 'deep_clocks', book: 'Vessels', name: 'Deep clocks', cost: 42, kind: 'attested',
      blurb: 'Graven governance stretches to a trillion-year stride without drift.' },
    { id: 'rekindling', book: 'Vessels', name: 'Rekindling', cost: 52, kind: 'apocryphal',
      blurb: 'Grow bodies again from the pattern books, where there is warmth to grow them in.' },
    // Book of the Deep
    { id: 'mill', book: 'the Deep', name: 'The Mill', cost: 42, kind: 'attested',
      blurb: 'Penrose’s wager: a black hole’s spin, milled for power until the spin is gone.' },
    { id: 'hawking_lanterns', book: 'the Deep', name: 'Hawking lanterns', cost: 49, kind: 'attested',
      blurb: 'Catch the faint evaporation glow of the wells — and the whole flash when one dies.' },
    { id: 'gleaner_tongue', book: 'the Deep', name: 'Gleaner-tongue', cost: 45, kind: 'apocryphal',
      blurb: 'The harvester answers to something. Learn enough of its dead makers’ protocol to say: not here.' },
    { id: 'veilcraft', book: 'the Deep', name: 'Veilcraft', cost: 32, kind: 'attested',
      blurb: 'Cold skins and slow baffles: build Veils that hide a site’s warmth.' },
    { id: 'burst_catch', book: 'the Deep', name: 'The burst-catch', cost: 60, kind: 'attested',
      blurb: 'Rig a dying well so its final flash fills every cistern you own.' },
    // Book of the Hush
    { id: 'proton_watch', book: 'the Hush', name: 'The Proton Watch', cost: 35, kind: 'attested',
      blurb: 'A detector the size of a world, listening for whether matter itself is mortal. The answer changes everything after.' },
    { id: 'litany', book: 'the Hush', name: 'Litany Without End', cost: 77, kind: 'apocryphal',
      blurb: 'Compose the one thought the Stilled will think forever. Opens the Slow Amen.' },
    { id: 'gardeners', book: 'the Hush', name: 'A Garden Without Gardeners', cost: 70, kind: 'attested',
      blurb: 'Teach the Wrought to tend the vault and the dark with no one left to tell them to. Opens that ending — if the vault is full, it is a kept promise; if not, it is machinery.' },
    { id: 'seed_in_ice', book: 'the Hush', name: 'Seed in the Ice', cost: 70, kind: 'apocryphal',
      blurb: 'A biology that sips rather than burns, for bodies to live in the dark. Opens the Last Hearth — only in a universe whose matter keeps.' },
    { id: 'hawking_script', book: 'the Hush', name: 'The Hawking Script', cost: 84, kind: 'apocryphal',
      blurb: 'Feed the last well so its dying light spells the Testament, for whatever reads light after us. Opens the Gate.' },
    { id: 'lepton_loom', book: 'the Hush', name: 'The Lepton Loom', cost: 66, kind: 'apocryphal',
      blurb: 'If matter rots, weave minds from what cannot rot: electrons, positrons, and patience wider than the sky.' },
  ];

  // ----------------------------------------------------------- doctrines ----
  // Effects are read by the sim via flags; adopt/repeal cost testament.
  const DOCTRINES = [
    { id: 'no_mind_unwilling', name: 'No Mind Unwilling', cost: 10,
      blurb: 'No conversion without consent. Conversions are slower and cost charge, but grieve half as much.',
      lean: 'kind' },
    { id: 'garment', name: 'The Body Is a Garment', cost: 10,
      blurb: 'Engraving is a change of clothes, not a death. Conversions cost less; the Embodied grieve the saying of it.',
      lean: 'cold' },
    { id: 'nothing_wasted', name: 'Nothing Is Wasted', cost: 10,
      blurb: 'The dead — hearths, halls, worlds — are salvage. +2 matter whenever something of yours dies; +grief, +stain.',
      lean: 'dark' },
    { id: 'quiet', name: 'The Quiet', cost: 12,
      blurb: 'Dim every lamp the Gleaner might see: your warmth is halved to its senses; lore −20%.',
      lean: 'wary' },
    { id: 'open_door', name: 'The Open Door', cost: 10,
      blurb: 'Refuge for any Voice that asks, always. The Flame loves it; your stores do not.',
      lean: 'kind' },
    { id: 'tithe_of_sleep', name: 'Tithe of Sleep', cost: 10,
      blurb: 'A standing third of the Graven kept Stilled by lot. Upkeep falls; so does thought; some never forgive the lot.',
      lean: 'cold' },
    { id: 'long_grief', name: 'The Long Grief', cost: 8,
      blurb: 'Mourning is work and is honored as work: rites yield half again as much Testament.',
      lean: 'kind' },
    { id: 'feast_of_lights', name: 'Feast of Lights', cost: 8,
      blurb: 'Spend 2 charge a turn on beauty — music, warmth, windows — and the Flame is fed. Extravagance, says the dark.',
      lean: 'warm' },
    { id: 'ledger_of_names', name: 'The Ledger of Names', cost: 10,
      blurb: 'Every lost hearth is written and read aloud. Deaths grieve less; keeping the Ledger costs lore.',
      lean: 'kind' },
    { id: 'ash_sacrament', name: 'The Ash Sacrament', cost: 14,
      blurb: 'Nothing is sacred but continuing: inhabited places may be fed to the Gullet. The stain of it does not wash.',
      lean: 'dark' },
  ];
  const DOCTRINE_MAX = 3; // +2 with a Manifold present

  // -------------------------------------------------------------- voices ----
  const VOICES = [
    {
      id: 'choir', name: 'the Choir Beneath Glass', short: 'the Choir',
      ly: 62, band: 2,
      nature: 'Graven aesthetes wintering on a white dwarf kept warm by the dark-matter wind.',
      doom: 'halo', // dies when the halo fails unless rescued
      gifts: 'lore', wants: 'testament',
    },
    {
      id: 'needle', name: 'the Bright Needle', short: 'the Needle',
      ly: 3100, band: 3,
      nature: 'A civilization spending itself fast and gloriously on a merger star, deaf to every caution.',
      doom: 'burnout',
      gifts: 'charge', wants: 'nothing',
    },
    {
      id: 'kings', name: 'the Patient Kings', short: 'the Kings',
      ly: 26000, band: 4,
      nature: 'Sleepers banked around the Anchor, who answer in ten-thousand-year sentences and keep the mathematics of the end.',
      doom: 'none',
      gifts: 'secrets', wants: 'patience',
    },
    {
      id: 'meek', name: 'the Meek', short: 'the Meek',
      ly: 7, band: 1, hidden: true,
      nature: 'Biologicals hidden inside a rogue world, terrified of being seen, who know how not to be.',
      doom: 'none',
      gifts: 'veil', wants: 'silence',
    },
  ];

  // letter intents
  const INTENTS = {
    greet: { name: 'Greeting', blurb: 'Say: we are here, and we see you.' },
    trade_lore: { name: 'Exchange of understanding', blurb: 'Offer 8 testament for their knowledge (lore), if they are willing.' },
    beam: { name: 'Beam of charge', blurb: 'Send 10 charge as light. Some is lost to distance. A costly kindness.' },
    offer_refuge: { name: 'Offer of refuge', blurb: 'Tell them: our door is open. If they come, they come by ferry, in their own time.' },
    ask_aid: { name: 'Plea for aid', blurb: 'Ask for whatever they can spare. What answers depends on who they are when it arrives.' },
    warn: { name: 'Warning', blurb: 'Tell them what you know of the Gleaner’s path.' },
    siphon: { name: 'The quiet theft', blurb: 'A letter that reads them back: their archives, taken by deceit. They may trace it. [dark]', dark: true },
  };

  // ------------------------------------------------------------- endings ----
  const ENDINGS = [
    { id: 'slow_amen', name: 'The Slow Amen', victory: true,
      line: 'The Stilled think one thought, forever. It is a good thought.' },
    { id: 'manifold_entire', name: 'The Manifold Entire', victory: true,
      line: 'One voice, needing almost nothing, remembering everyone.' },
    { id: 'gardeners', name: 'A Garden Without Gardeners', victory: true,
      line: 'No one is home. The lights are tended anyway, and the vault is full.' },
    { id: 'last_hearth', name: 'The Last Hearth', victory: true,
      line: 'Bodies, warm, in the dark. The oldest way, kept to the end.' },
    { id: 'gate', name: 'The Gate', victory: true,
      line: 'The last light that will ever shine spells out everything you were.' },
    { id: 'still_here', name: 'Still Here', victory: true,
      line: 'You simply did not stop. The universe’s state has come round again; wait long enough and so will you.' },
    { id: 'crown', name: 'The Gleaner’s Crown', victory: true, dark: true,
      line: 'You survive. You will always survive. That is all you are now.' },
    { id: 'ashes', name: 'Ashes', victory: false,
      line: 'No one is left to say what it was for.' },
    { id: 'guttering', name: 'The Guttering', victory: false,
      line: 'There was fuel enough, and no reason. The civilization lay down.' },
    { id: 'severance', name: 'Severance', victory: false,
      line: 'Something continues. It does not remember you. It is not you.' },
  ];

  // ----------------------------------------------------------- name pools ---
  const SITE_NAMES = [
    'Cinderfall', 'Greywake', 'Mournbright', 'Palefast', 'Hollowmere',
    'Saltglass', 'Winterwell', 'Quietude', 'Smokering', 'Argent Keep',
    'Candlewrack', 'Duskhaven', 'Emberlea', 'Fallowfield', 'Ghostlight',
    'Latchward', 'Nightingale', 'Oldfrost', 'Pyreholm', 'Rushlight',
    'Sorrowless', 'Tidemark', 'Underlantern', 'Vesperhold', 'Wickend',
  ];
  const HEARTH_EPITHETS = [
    'Emberwise', 'Lightkeeper', 'Stoneword', 'Farfaring', 'Gleamfast',
    'Quietborn', 'Ashwright', 'Deependelve', 'Morrowmind', 'Starpatient',
    'Coldcraft', 'Lastlaughter', 'Evenkeel', 'Dimhallow', 'Truehearth',
    'Longwatch', 'Softspoken', 'Wakelight', 'Thornmercy', 'Stillproud',
  ];
  const ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth',
    'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth',
    'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth',
    'Nineteenth', 'Twentieth', 'Twenty-first', 'Twenty-second', 'Twenty-third',
    'Twenty-fourth', 'Twenty-fifth', 'Twenty-sixth', 'Twenty-seventh',
    'Twenty-eighth', 'Twenty-ninth', 'Thirtieth'];

  EV.data = {
    SHAPES, STANCES, ERAS, STRIDE_WIDTH, BANDS, WORKS, INQUIRIES, DOCTRINES,
    DOCTRINE_MAX, VOICES, INTENTS, ENDINGS, SITE_NAMES, HEARTH_EPITHETS, ORDINALS,
  };
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
