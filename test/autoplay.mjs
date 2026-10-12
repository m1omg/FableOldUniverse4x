// Evensong — headless autoplay: a simple but earnest bot plays whole games
// across many seeds while invariants are asserted every turn.
//
//   node test/autoplay.mjs             # default seed count
//   node test/autoplay.mjs --seeds 60  # more
//   node test/autoplay.mjs --trace 7   # chronicle of one seed to stdout
import { loadSim } from './loader.mjs';

const args = process.argv.slice(2);
function argOf(name, dflt) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
}
const SEEDS = Number(argOf('--seeds', 24));
const TRACE = argOf('--trace', null);
const TURN_CAP = 400;

function checkInvariants(EV, state, seed) {
  const bad = (msg) => { throw new Error('[seed ' + seed + ' turn ' + state.turn + '] ' + msg); };
  const R = state.res;
  for (const k of ['charge', 'chargeCap', 'matter', 'lore', 'testament']) {
    if (!isFinite(R[k])) bad('res.' + k + ' is ' + R[k]);
    if (R[k] < -1e-6) bad('res.' + k + ' negative: ' + R[k]);
  }
  if (R.charge > R.chargeCap + 1e-6) bad('charge above cap');
  for (const k of ['flame', 'grief', 'stain', 'ageLog', 'floorLog', 'strideLog']) {
    if (!isFinite(state[k])) bad(k + ' is ' + state[k]);
  }
  if (state.flame < 0 || state.flame > 100) bad('flame out of range: ' + state.flame);
  if (state.era < 0 || state.era > 3) bad('era out of range');
  if (state.hearths.length > 100) bad('hearth explosion');
  for (const h of state.hearths) {
    if (!EV.data.SHAPES[h.shape]) bad('unknown shape ' + h.shape);
  }
  const last = state.chronicle[state.chronicle.length - 1];
  if (last) for (const e of last.entries) {
    if (typeof e.t !== 'string' || /undefined|NaN|\[object/.test(e.t)) bad('bad chronicle text: ' + e.t);
  }
}

// ----------------------------------------------------------------- the bot --
function botTurn(EV, state, plan) {
  const A = EV.actions, E = EV.economy, D = EV.data;
  const R = state.res;

  // thresholds: choose on purpose
  if (state.threshold) {
    let pick;
    if (state.threshold.toEra === 1) pick = plan.ending === 'last_hearth' ? 'soil' : 'pattern';
    else if (state.threshold.toEra === 2) pick = 'wells';
    else pick = state.flame < 40 ? 'spend' : 'sleepdoor';
    A.chooseThreshold(state, pick);
  }

  // inquiries: the Loom outranks everything once matter is known to be mortal
  const loomNeeded = state.fateKnown && state.matterFate !== 'stable' && !E.has(state, 'lepton_loom');
  if (loomNeeded && state.inquiries.active !== 'lepton_loom') A.setInquiry(state, 'lepton_loom');
  else if (!state.inquiries.active) {
    for (const id of plan.inquiries) {
      if (state.inquiries.done.indexOf(id) < 0) { A.setInquiry(state, id); break; }
    }
  }

  // rites
  A.setRiteFocus(state, state.era >= 1 ? 2 : (state.grief > 25 ? 2 : state.grief > 4 ? 1 : 0));

  // the ear wanders
  A.setEar(state, [[1, 2, 3, 4][state.turn % 4]]);

  // stances and stillness under energy pressure: always keep two thinkers hot
  const thin = R.charge < R.chargeCap * 0.35 && (state.lastEcon ? state.lastEcon.net < 1 : false);
  const thinkers = state.hearths.filter((h) => h.shape === 'graven' || h.shape === 'manifold');
  thinkers.forEach((h, i) => A.setStance(state, h.id, i < 2 ? 'even' : (thin ? 'slow' : 'even')));
  if (thin && E.has(state, 'stillness')) {
    for (let i = 2; i < thinkers.length; i++) A.still(state, thinkers[i].id);
  }
  if (!thin && R.charge > R.chargeCap * 0.7 && (state.lastEcon ? state.lastEcon.net > 3 : false)) {
    const sleeper = state.hearths.find((h) => h.shape === 'stilled' && plan.ending !== 'slow_amen');
    if (sleeper) A.wake(state, sleeper.id);
  }

  // building priorities at inhabited sites
  const inhabited = {};
  for (const h of state.hearths) inhabited[h.siteId] = true;
  for (const siteId in inhabited) {
    const site = E.siteById(state, siteId);
    if (!site || site.gone || site.queue.length >= 2) continue;
    const want = [];
    if (site.scorchAt) want.push('shade');
    if ((site.built.hearthhall || 0) < 1 && (state.hearths.some((h) => h.siteId === siteId && h.shape === 'embodied')
      || (site.kind === 'blackhole' && plan.ending === 'last_hearth'))) want.push('hearthhall');
    if (site.matter > 2) want.push('forgeworks');
    want.push('collector');
    if ((site.built.cistern || 0) < 2) want.push('cistern');
    if ((site.built.substrate || 0) < 2) want.push('substrate');
    if (state.turn > 12 && !state.sites.some((s) => !s.gone && (s.built.vault || 0) > 0)) want.unshift('vault');
    if (state.gleaner.awake && E.has(state, 'veilcraft') && (site.built.veil || 0) === 0
      && E.hearthsAt(state, site.id).length >= 2) want.unshift('veil');
    if (site.kind === 'blackhole') want.push('mill');
    if ((site.built.watch || 0) < 1 && state.turn > 6) want.push('watch');
    for (const w of want) {
      const keepReserve = (w === 'forgeworks' || w === 'shade' || w === 'mill' || w === 'vault') ? 0 : 5;
      if (R.matter - (D.WORKS[w].cost.m || 0) < keepReserve) continue;
      if (!A.canBuild(state, site, w)) { A.queueWork(state, siteId, w); break; }
    }
  }

  // expansion: put hands on a second vein of matter early
  if (state.era <= 1 && state.turn >= 8 && R.matter >= 8) {
    const target = state.sites.find((s) => !s.gone && !s.hidden && s.band === 1 && s.matter >= 8 && E.hearthsAt(state, s.id).length === 0 && s.resolved);
    if (target) {
      const mover = state.hearths.find((h) => h.shape === 'wrought' && E.hearthsAt(state, h.siteId).length > 1)
        || state.hearths.find((h) => h.shape === 'graven' && E.hearthsAt(state, h.siteId).length > 1);
      if (mover) A.launchFerry(state, mover.siteId, target.id, [mover.id], 0, 'yard');
    }
  }
  // more hands when matter allows
  if (state.era >= 1 && R.matter > 12 && state.hearths.filter((h) => h.shape === 'wrought').length < 2) {
    const fsite = state.sites.find((s) => !s.gone && (s.built.forgeworks || 0) > 0 && E.hearthsAt(state, s.id).length > 0);
    if (fsite) A.forge(state, fsite.id);
  }
  if (false) { // (kept for structure)
    for (const w of []) {}
  }

  // energy or drift triage: engrave embodied who cannot ride the strides
  const emb = state.hearths.filter((h) => h.shape === 'embodied');
  const drifting = state.strideLog > D.SHAPES.embodied.horizon + 1 && !E.has(state, 'seed_in_ice');
  const sinking = state.lastEcon && state.lastEcon.net < 0 && R.charge < R.chargeCap * 0.4;
  if ((sinking || drifting) && emb.length > (drifting && plan.ending !== 'last_hearth' ? 0 : plan.keepEmbodied)
      && (R.matter >= 9 || sinking)) {
    A.engrave(state, emb[0].id);
  }
  // gullet feeding once understood
  if (E.has(state, 'gullet') && R.charge < R.chargeCap * 0.45 && R.matter > 8) {
    for (const s of state.sites) {
      if (!s.gone && s.kind === 'blackhole' && (E.hearthsAt(state, s.id).length > 0 || (s.built.mill || 0) > 0)) {
        A.feedGullet(state, s.id, 2); break;
      }
    }
  }

  // migration: flee doomed footing; head for the wells before the galaxy goes
  const fleeTime = state.ageLog > 16.3;
  if (process.env.EVDBG && fleeTime && state.turn % 2 === 0) console.log('  DBG flee t' + state.turn, 'age', state.ageLog.toFixed(2), 'hearths', state.hearths.map(h=>h.shape+'@'+h.siteId).join(' '));
  let launches = 0;
  for (const h of state.hearths.slice()) {
    if (launches >= 3) break;
    const site = E.siteById(state, h.siteId);
    if (!site || site.gone) continue;
    const doomed = site.fate && site.fate.at < Math.max(state.ageLog, state.strideLog) + 1.4;
    const wantFoundling = state.era === 1 && !fleeTime && h.shape === 'embodied' && site.id !== 'sisters';
    const wantWells = (fleeTime || state.era >= 2) && site.kind !== 'blackhole' && site.id !== 'shoal' && site.id !== 'hold';
    if (!(doomed || wantFoundling || wantWells)) continue;
    let dest = null;
    if (wantFoundling) dest = state.sites.find((s) => s.name === 'the Foundling' && !s.gone && s.sources.some((x) => !x.dead));
    if (!dest && (wantWells || doomed) && E.has(state, 'long_ferries')) {
      dest = state.sites.find((s) => !s.gone && s.id === 'anchor') || state.sites.find((s) => !s.gone && s.kind === 'blackhole');
    }
    if (!dest && doomed) dest = state.sites.find((s) => !s.gone && !s.hidden && s.id !== site.id && !s.fate);
    if (dest && dest.id !== site.id) {
      // cheapest sufficient hull: by the late ages even slow boats arrive at once
      const far = Math.max(site.ly, dest.ly);
      const speeds = A.ferrySpeeds(state);
      let speed = speeds[0].id;
      if (far > 12) speed = speeds.find((s) => s.id === 'long') ? 'long' : (speeds.find((s) => s.id === 'sail') ? 'sail' : speed);
      if (state.era === 0 && speeds.some((s) => s.id === 'sail')) speed = 'sail'; // early on, time matters
      while (R.charge < 20 && R.matter > 10) { if (!A.burnForge(state, 5).ok) break; }
      const r = A.launchFerry(state, site.id, dest.id, [h.id], Math.min(4, Math.max(0, Math.floor(R.matter - 6))), speed);
      if (process.env.EVDBG) console.log('  DBG launch t' + state.turn, site.id, '->', dest.id, speed, JSON.stringify(r), 'charge', R.charge.toFixed(1), 'matter', R.matter.toFixed(1));
      if (r.ok) launches++;
    }
  }

  // doctrines per plan
  for (const d of plan.doctrines) {
    if (state.doctrines.indexOf(d) < 0) { A.adoptDoctrine(state, d); break; }
  }
  if (state.era >= 3 && state.doctrines.indexOf('feast_of_lights') >= 0 && R.charge < R.chargeCap * 0.5) {
    A.repealDoctrine(state, 'feast_of_lights');
  }

  // letters: greet everyone once; tend the plan's friendships
  for (const vid in state.voices) {
    const vs = state.voices[vid];
    if (vs.known && vs.alive && !vs.met && !state.letters.out.some((L) => L.to === vid)) {
      A.sendLetter(state, vid, 'greet');
      break;
    }
  }
  if (plan.befriendChoir && state.voices.choir.met && state.voices.choir.alive) {
    if (!state.voices.choir.refugeOffered) A.sendLetter(state, 'choir', 'offer_refuge');
    else if (state.voices.choir.trust < 42 && R.charge > 14 && state.turn % 3 === 0) A.sendLetter(state, 'choir', 'beam');
  }
  if (plan.courtKings && state.voices.kings.met && state.turn % 4 === 0 && R.testament > 12) {
    A.sendLetter(state, 'kings', 'trade_lore');
  }
  if (plan.dark && state.turn % 8 === 0 && state.flame > 35) {
    const known = Object.keys(state.voices).filter((v) => state.voices[v].known && state.voices[v].alive);
    if (known.length) A.sendLetter(state, known[state.turn % known.length], 'siphon');
  }
  if (plan.dark && state.stain >= 60 && state.gleaner.awake && EV.economy.has(state, 'gleaner_tongue')) {
    A.commandGleaner(state, 1 + (state.turn % 4));
  }

  // gleaner defense
  if (state.gleaner.awake && !plan.dark) {
    const myBands = new Set(state.hearths.map((h) => (E.siteById(state, h.siteId) || {}).band));
    const near = myBands.has(state.gleaner.band) || myBands.has(state.gleaner.band + 1) || myBands.has(state.gleaner.band - 1);
    const unveiled = state.hearths.some((h) => { const s = E.siteById(state, h.siteId); return s && !(s.built.veil > 0); });
    if (near && unveiled && EV.economy.has(state, 'gleaner_tongue')) A.turnGleaner(state);
    if (near && unveiled && R.charge > 25) A.decoy(state, state.gleaner.band >= 4 ? 5 : Math.min(5, state.gleaner.band + 1), 12);
  }

  // conversions toward the plan's ending
  const graven = state.hearths.filter((h) => h.shape === 'graven');
  if (plan.ending === 'slow_amen' && state.era >= 2 && graven.length) A.still(state, graven[0].id);
  if (plan.ending === 'manifold_entire' && graven.length >= 2) A.weave(state, graven[0].id, graven[1].id);
  if (plan.ending === 'manifold_entire' && state.era >= 3) {
    const extraEmb = state.hearths.filter((h) => h.shape === 'embodied');
    if (extraEmb.length) A.engrave(state, extraEmb[0].id);
    const st = state.hearths.filter((h) => h.shape === 'stilled');
    if (st.length && R.charge > 10) A.wake(state, st[0].id);
  }

  // undertakings
  for (const u of EV.endings.undertakings(state)) {
    const wanted = u.id === plan.ending || (plan.dark && u.id === 'crown')
      || (u.id === 'still_here' && state.ageLog > 110)
      || (state.ageLog > 115 && u.ok);
    if (u.ok && wanted) { A.undertake(state, u.id); break; }
  }

  // stride: ride a little above the floor; drop to the floor during crises
  const b = A.strideBounds(state);
  const crisis = (state.lastEcon && state.lastEcon.net < 0) || state.gleaner.awake && state.hearths.some((h) => (E.siteById(state, h.siteId) || {}).band === state.gleaner.band);
  A.setStride(state, crisis ? b.lo : b.lo + 1);
}

function makePlan(seed) {
  const endings = ['slow_amen', 'manifold_entire', 'gardeners', 'still_here', 'gate', 'last_hearth'];
  const n = seed % 10;
  const dark = n === 9;
  const ending = dark ? 'crown' : endings[n % endings.length];
  const inquiries = ['engraving', 'cisterns', 'proton_watch', 'forge_of_ash', 'stillness', 'long_ferries', 'mill', 'starwell_tap'];
  if (ending === 'last_hearth') { inquiries.splice(1, 0, 'seed_in_ice'); inquiries.splice(4, 0, 'mill', 'gullet'); }
  if (ending === 'manifold_entire' || ending === 'slow_amen') inquiries.splice(4, 0, 'weave');
  inquiries.push('veilcraft', 'gleaner_tongue', 'deep_cisterns', 'gullet', 'sail_of_ages', 'hawking_lanterns');
  if (ending === 'slow_amen') inquiries.push('litany');
  if (ending === 'gardeners') inquiries.push('gardeners');
  if (ending === 'gate') inquiries.push('hawking_script');
  if (ending === 'last_hearth') inquiries.push('rekindling');
  inquiries.push('lepton_loom', 'deep_clocks', 'burst_catch', 'litany');
  return {
    ending, dark,
    inquiries,
    doctrines: dark ? ['feast_of_lights', 'nothing_wasted', 'ash_sacrament'] : ['ledger_of_names', 'long_grief', 'feast_of_lights'],
    keepEmbodied: ending === 'last_hearth' ? 3 : 1,
    befriendChoir: !dark,
    courtKings: ending === 'gate' || !dark,
    fate: ending === 'last_hearth' ? 'stable' : (seed % 7 === 0 ? 'told' : 'unknown'),
  };
}

// ----------------------------------------------------------------- runner ---
function runSeed(seed, trace) {
  const EV = loadSim();
  const plan = makePlan(seed);
  const state = EV.world.newGame({ seed: 'auto-' + seed, fate: plan.fate });
  let lastAge = state.ageLog, lastEra = 0;
  while (!state.ending && state.turn < TURN_CAP) {
    botTurn(EV, state, plan);
    if (state.ending) break; // an undertaking may end the game mid-turn
    EV.turn.endTurn(state);
    checkInvariants(EV, state, seed);
    if (state.ageLog <= lastAge) throw new Error('[seed ' + seed + '] age did not advance');
    if (state.era < lastEra) throw new Error('[seed ' + seed + '] era went backward');
    lastAge = state.ageLog; lastEra = state.era;
    if (trace) {
      const rec = state.chronicle[state.chronicle.length - 1];
      for (const e of rec.entries) console.log('  t' + state.turn + ' [' + e.k + '] ' + e.t);
    }
  }
  if (process.env.EVDBG && state.turn >= TURN_CAP) {
    console.log('CAP seed', seed, 'charge', state.res.charge.toFixed(1), 'matter', state.res.matter.toFixed(1),
      'test', state.res.testament.toFixed(1), 'flame', state.flame.toFixed(0),
      'hearths', state.hearths.map(h=>h.shape).join(','), 'fate', state.matterFate, state.fateKnown,
      'inq', state.inquiries.done.join('|'));
    for (const u of EV.endings.undertakings(state)) console.log('  ', u.id, u.ok ? 'OK' : ('need: ' + u.need));
  }
  return {
    seed, plan: plan.ending,
    ending: state.ending ? state.ending.id : 'none(cap)',
    victory: state.ending ? state.ending.victory : false,
    turns: state.turn, era: state.era,
    ageLog: Math.round(state.ageLog * 10) / 10,
    hearths: state.hearths.length,
  };
}

function determinismCheck() {
  const a = runSeed(1234, false);
  const b = runSeed(1234, false);
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error('determinism: two runs of the same seed diverged\n' + JSON.stringify(a) + '\n' + JSON.stringify(b));
  }
  // save/load mid-game must continue identically
  const EV = loadSim();
  const s1 = EV.world.newGame({ seed: 'detsave' });
  const plan = makePlan(5);
  for (let i = 0; i < 15; i++) { botTurn(EV, s1, plan); EV.turn.endTurn(s1); }
  const snap = EV.save.serialize(s1);
  const EV2 = loadSim();
  const s2 = EV2.save.deserialize(snap);
  for (let i = 0; i < 10; i++) {
    botTurn(EV, s1, plan); EV.turn.endTurn(s1);
    botTurn(EV2, s2, plan); EV2.turn.endTurn(s2);
  }
  if (Math.abs(s1.ageLog - s2.ageLog) > 1e-9 || s1.res.charge.toFixed(6) !== s2.res.charge.toFixed(6)) {
    throw new Error('determinism: save/load diverged (' + s1.ageLog + ' vs ' + s2.ageLog + ')');
  }
  console.log('determinism: ok');
}

if (TRACE !== null) {
  const r = runSeed(Number(TRACE), true);
  console.log(JSON.stringify(r));
  process.exit(0);
}

determinismCheck();
const results = [];
for (let s = 1; s <= SEEDS; s++) results.push(runSeed(s, false));

const byEnding = {};
let vic = 0, era2 = 0, era3 = 0;
for (const r of results) {
  byEnding[r.ending] = (byEnding[r.ending] || 0) + 1;
  if (r.victory) vic++;
  if (r.era >= 2) era2++;
  if (r.era >= 3) era3++;
}
console.table(results);
console.log('endings:', byEnding);
console.log('victories: ' + vic + '/' + SEEDS + ', reached Wells: ' + era2 + ', reached Hush: ' + era3);

const fails = [];
if (!results.some((r) => r.era >= 3)) fails.push('no run reached the Hush');
if (vic === 0) fails.push('no run ended in a victory');
if (results.some((r) => r.ending === 'none(cap)')) fails.push('a run hit the turn cap without ending');
if (fails.length) {
  console.error('AUTOPLAY FAILURES: ' + fails.join('; '));
  process.exit(1);
}
console.log('autoplay: ok');
