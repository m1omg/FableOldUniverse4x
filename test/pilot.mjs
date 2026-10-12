// Evensong — the pilot: one careful, deliberate strategy (the long quiet:
// engrave, bank, migrate early, veil, still, Slow Amen / Long Alarm) played
// across seeds. If a sound strategy cannot win most vigils, the balance is
// wrong — that is what this test is for.
//
//   node test/pilot.mjs            # 10 seeds, assert win rate
//   node test/pilot.mjs --trace 2  # one seed, chronicle to stdout
import { loadSim } from './loader.mjs';

const args = process.argv.slice(2);
const TRACE = args.indexOf('--trace') >= 0 ? Number(args[args.indexOf('--trace') + 1]) : null;
const SEEDS = 10;

function pilotTurn(EV, s) {
  const A = EV.actions, E = EV.economy;
  const R = s.res;

  if (s.threshold) {
    const pick = s.threshold.toEra === 1 ? 'names' : s.threshold.toEra === 2 ? 'wells' : 'sleepdoor';
    A.chooseThreshold(s, pick);
  }

  // --- inquiries: a disciplined order, with the Loom jumping the queue
  const ORDER = ['engraving', 'cisterns', 'forge_of_ash', 'stillness', 'long_ferries',
    'proton_watch', 'mill', 'starwell_tap', 'veilcraft', 'deep_cisterns', 'gullet',
    'weave', 'litany', 'deep_clocks', 'hawking_lanterns', 'burst_catch', 'gleaner_tongue'];
  const loomNeeded = s.fateKnown && s.matterFate !== 'stable' && !E.has(s, 'lepton_loom');
  if (loomNeeded) { if (s.inquiries.active !== 'lepton_loom') A.setInquiry(s, 'lepton_loom'); }
  else if (!s.inquiries.active) {
    for (const id of ORDER) if (s.inquiries.done.indexOf(id) < 0) { A.setInquiry(s, id); break; }
  }

  // --- rites and doctrines
  A.setRiteFocus(s, s.era >= 1 || s.grief > 10 ? 2 : 1);
  const wantDoc = ['ledger_of_names', 'long_grief', 'feast_of_lights'];
  for (const d of wantDoc) {
    if (s.doctrines.indexOf(d) < 0) { A.adoptDoctrine(s, d); break; }
  }
  if (s.era >= 3 && s.doctrines.indexOf('feast_of_lights') >= 0 && R.charge < R.chargeCap * 0.3) {
    A.repealDoctrine(s, 'feast_of_lights');
  }

  // --- builds: survival first, then banks, then the vault
  const mine = {};
  for (const h of s.hearths) mine[h.siteId] = true;
  for (const sid in mine) {
    const site = E.siteById(s, sid);
    if (!site || site.gone || site.queue.length >= 2) continue;
    const embHere = s.hearths.some((h) => h.siteId === sid && h.shape === 'embodied');
    const want = [];
    if (site.scorchAt) want.push('shade');
    if (embHere && (site.built.hearthhall || 0) < 1) want.push('hearthhall');
    if (site.kind === 'blackhole' && (site.built.mill || 0) < 1) want.push('mill');
    if (site.kind === 'blackhole' && s.turn > 10 && !s.sites.some((x) => !x.gone && (x.built.vault || 0) > 0)) want.push('vault');
    if (s.gleaner.awake && E.has(s, 'veilcraft') && (site.built.veil || 0) < 1) want.push('veil');
    if ((site.built.collector || 0) < 2) want.push('collector');
    if (site.matter > 2 && (site.built.forgeworks || 0) < 1) want.push('forgeworks');
    if ((site.built.substrate || 0) < 3) want.push('substrate');
    if ((site.built.cistern || 0) < 3) want.push('cistern');
    if (s.turn > 10 && !s.sites.some((x) => !x.gone && (x.built.vault || 0) > 0)) want.push('vault');
    if ((site.built.watch || 0) < 1 && s.turn > 8) want.push('watch');
    for (const w of want) {
      if (!A.canBuild(s, site, w)) { A.queueWork(s, sid, w); break; }
    }
  }

  // --- the body question: engrave under drift or energy pressure, never
  // into matter poverty
  const driftP = s.strideLog > 5;
  const energyP = s.lastEcon && s.lastEcon.net < 1 && R.charge < R.chargeCap * 0.5;
  if (driftP || energyP) {
    for (const h of s.hearths.filter((x) => x.shape === 'embodied')) {
      if (R.matter >= 10) A.engrave(s, h.id);
    }
  }

  // --- energy discipline: two hot thinkers until the Litany is written,
  // the Gullet only above a matter reserve, and a hard banking phase as the
  // Wells run out
  const thin = R.charge < R.chargeCap * 0.4;
  const thinkers = s.hearths.filter((h) => h.shape === 'graven' || h.shape === 'manifold');
  thinkers.forEach((h, i) => A.setStance(s, h.id, i < 2 ? 'even' : 'slow'));
  if (thin && E.has(s, 'stillness')) for (let i = 2; i < thinkers.length; i++) A.still(s, thinkers[i].id);
  const lateWells = s.era === 2 && s.ageLog > 70;
  const matterFloor = s.matterFate === 'stable' ? 18 : 10;
  if (E.has(s, 'gullet') && R.matter > matterFloor) {
    const wantCharge = lateWells ? R.chargeCap * 0.95 : R.chargeCap * 0.55;
    if (R.charge < wantCharge) {
      const well = s.sites.find((x) => !x.gone && x.kind === 'blackhole' && (E.hearthsAt(s, x.id).length > 0 || x.built.mill > 0));
      if (well) A.feedGullet(s, well.id, 2);
    }
  }

  // --- more hands while the forges still have something to eat
  if (s.era >= 1 && s.hearths.filter((h) => h.shape === 'wrought').length < 2 && R.matter > 14) {
    const fsite = s.sites.find((x) => !x.gone && (x.built.forgeworks || 0) > 0 && E.hearthsAt(s, x.id).length > 0);
    if (fsite) A.forge(s, fsite.id);
  }

  // --- migration discipline: second vein early; the wells before the end
  if (s.era <= 1 && s.turn >= 8 && R.matter >= 9) {
    const tgt = s.sites.find((x) => !x.gone && !x.hidden && x.band === 1 && x.matter >= 8 && E.hearthsAt(s, x.id).length === 0);
    if (tgt) {
      const mover = s.hearths.find((h) => h.shape === 'wrought' && E.hearthsAt(s, h.siteId).length > 1);
      if (mover) A.launchFerry(s, mover.siteId, tgt.id, [mover.id], 0, 'yard');
    }
  }
  const fleeTime = s.ageLog > 16.0;
  if (fleeTime && E.has(s, 'long_ferries')) {
    let launches = 0;
    const anchor = s.sites.find((x) => !x.gone && x.id === 'anchor') || s.sites.find((x) => !x.gone && x.kind === 'blackhole');
    for (const h of s.hearths.slice()) {
      if (launches >= 3 || !anchor) break;
      const site = E.siteById(s, h.siteId);
      if (!site || site.gone || site.kind === 'blackhole' || site.id === 'shoal' || site.id === 'hold') continue;
      while (R.charge < 18 && R.matter > 9) { if (!A.burnForge(s, 4).ok) break; }
      const r = A.launchFerry(s, site.id, anchor.id, [h.id], Math.min(4, Math.max(0, Math.floor(R.matter - 7))), 'long');
      if (r.ok) launches++;
    }
  }

  // --- friends
  for (const vid in s.voices) {
    const vs = s.voices[vid];
    if (vs.known && vs.alive && !vs.met && !s.letters.out.some((L) => L.to === vid)) { A.sendLetter(s, vid, 'greet'); break; }
  }
  if (s.voices.choir.met && s.voices.choir.alive && !s.voices.choir.refugeOffered) A.sendLetter(s, 'choir', 'offer_refuge');
  if (s.voices.kings.met && s.turn % 5 === 0 && R.testament > 42) A.sendLetter(s, 'kings', 'trade_lore');

  // --- gleaner: veils are primary; the tongue and decoys cover the gap
  if (s.gleaner.awake && s.era < 3) {
    const myBands = new Set(s.hearths.map((h) => (E.siteById(s, h.siteId) || {}).band));
    const unveiled = s.hearths.some((h) => { const x = E.siteById(s, h.siteId); return x && !(x.built.veil > 0); });
    if (unveiled && (myBands.has(s.gleaner.band) || myBands.has(s.gleaner.band + 1) || myBands.has(s.gleaner.band - 1))) {
      if (E.has(s, 'gleaner_tongue')) A.turnGleaner(s);
      if (R.charge > 30) A.decoy(s, s.gleaner.band >= 4 ? 5 : s.gleaner.band + 1, 12);
    }
  }

  // --- the long quiet: the Litany is written first, by warm minds; only
  // then does everyone lie down
  const litanyDone = E.has(s, 'litany');
  if (s.era >= 2 && E.has(s, 'stillness')) {
    const keep = litanyDone ? 1 : 2;
    const cand = thinkers.slice(keep);
    for (const h of cand) A.still(s, h.id);
  }
  // wake nobody in the Hush; send no letters; burn no decoys

  // --- endings: the Amen when ready; the Alarm as the fallback
  for (const u of EV.endings.undertakings(s)) {
    if (u.ok && (u.id === 'slow_amen' || (u.id === 'still_here' && s.ageLog > 105))) { A.undertake(s, u.id); break; }
  }

  // --- stride: short in the opening crisis and when the gleaner is close,
  // floor+1 otherwise
  const b = A.strideBounds(s);
  const crisis = s.turn < 10 || (s.lastEcon && s.lastEcon.net < 0 && R.charge < R.chargeCap * 0.25);
  A.setStride(s, crisis ? b.lo : b.lo + 1);
}

function run(seed, trace) {
  const EV = loadSim();
  const s = EV.world.newGame({ seed: 'pilot-' + seed, fate: 'unknown' });
  while (!s.ending && s.turn < 300) {
    pilotTurn(EV, s);
    if (s.ending) break;
    EV.turn.endTurn(s);
    if (trace && (s.turn === 60 || s.turn === 75 || s.turn === 92 || s.turn === 100)) {
      const anchor = s.sites.find(x => x.id === 'anchor') || {};
      const hold = s.sites.find(x => x.id === 'hold') || {};
      console.log('PROBE t' + s.turn, 'age', s.ageLog.toFixed(1), 'matter', s.res.matter.toFixed(1), 'charge', s.res.charge.toFixed(0) + '/' + s.res.chargeCap,
        'test', s.res.testament.toFixed(0), 'lore', s.res.lore.toFixed(0), 'flame', s.flame.toFixed(0),
        'anchor.built', JSON.stringify(anchor.built || null), 'hold.built', JSON.stringify(hold.built || null),
        'inq.active', s.inquiries.active, 'litany', s.inquiries.done.indexOf('litany') >= 0);
      for (const u of EV.endings.undertakings(s)) if (u.id === 'slow_amen' || u.id === 'still_here') console.log('  PROBE', u.id, u.ok);
    }
    if (trace) {
      const rec = s.chronicle[s.chronicle.length - 1];
      for (const e of rec.entries) console.log('  t' + s.turn + ' [' + e.k + '] ' + e.t);
    }
  }
  return {
    seed, fate: s.matterFate,
    ending: s.ending ? s.ending.id : 'none(cap)',
    victory: s.ending ? !!s.ending.victory : false,
    turns: s.turn, era: s.era, flame: Math.round(s.flame),
  };
}

if (TRACE !== null) {
  console.log(JSON.stringify(run(TRACE, true)));
  process.exit(0);
}
const results = [];
for (let i = 1; i <= SEEDS; i++) results.push(run(i, false));
console.table(results);
const wins = results.filter((r) => r.victory).length;
console.log('pilot: ' + wins + '/' + SEEDS + ' vigils ended in persistence');
if (wins < SEEDS * 0.5) {
  console.error('PILOT FAILURE: a careful strategy should win at least half its vigils');
  process.exit(1);
}
console.log('pilot: ok');
