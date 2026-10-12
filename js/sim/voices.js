/* Evensong — the Voices: other civilizations, reached only by letters at
   light speed. A reply is written by whoever the recipient is when the letter
   arrives — possibly by no one. */
(function (EV) {
  'use strict';
  const D = EV.data;
  const { deeptime, rng, util, fmt } = EV;
  const E = EV.economy;

  function vdef(id) { return D.VOICES.find((v) => v.id === id); }

  function sendLetter(state, voiceId, intent) {
    const vd = vdef(voiceId);
    const vs = state.voices[voiceId];
    if (!vd || !vs || !vs.known) return { ok: false, msg: 'You do not know where to send that.' };
    const it = D.INTENTS[intent];
    if (!it) return { ok: false, msg: 'No such thing to say.' };
    const R = state.res;
    // costs at sending
    if (intent === 'beam') {
      if (R.charge < 10) return { ok: false, msg: 'Not charge enough to beam.' };
      R.charge = util.tidy(R.charge - 10);
    }
    if (intent === 'trade_lore') {
      if (R.testament < 8) return { ok: false, msg: 'Not testament enough to offer.' };
      R.testament = util.tidy(R.testament - 8);
    }
    if (intent === 'offer_refuge') vs.refugeOffered = true;
    const arriveThere = deeptime.logAdd(state.ageLog, deeptime.log(vd.ly));
    state.letters.out.push({
      id: 'L' + (state.letters.count++),
      to: voiceId, intent,
      sentAt: state.ageLog, arriveThere, resolved: false,
    });
    state.stats.lettersSent++;
    E.log(state, 'A letter goes out to ' + vd.name + ' — ' + it.name.toLowerCase() + '. It will arrive in ' + fmt.fmtYears(deeptime.log(vd.ly)) + '; any answer, twice that.');
    if (intent === 'siphon') return doSiphon(state, voiceId);
    return { ok: true };
  }

  function doSiphon(state, voiceId) {
    const vs = state.voices[voiceId];
    const vd = vdef(voiceId);
    state.res.lore = util.tidy(state.res.lore + 25);
    state.stain += 15;
    vs.trust = Math.max(0, vs.trust - 40);
    vs.siphoned = true;
    state.flame = util.clamp(state.flame - 3, 0, 100);
    E.log(state, 'The letter reads them back. Their archives spill into yours (+25 lore). Some of your own people ask what, exactly, you have made them into.', 'dark');
    if (rng.chance(state, 0.6)) {
      for (const id in state.voices) if (id !== voiceId) state.voices[id].trust = Math.max(0, state.voices[id].trust - 15);
      E.log(state, 'The theft is traced, and the tracing travels: every Voice in the Sounding now carries ' + vd.short + '’s warning about you.', 'dark');
      if (voiceId === 'meek' || rng.chance(state, 0.3)) {
        if (voiceId === 'meek') {
          state.voices.meek.alive = false;
          E.log(state, 'Softstep goes silent — not dead; hidden, the way only they know how. You will not hear the Meek again.', 'loss');
        }
      }
    }
    return { ok: true };
  }

  // compose the reply when the letter reaches them
  function resolveLetter(state, L) {
    const vs = state.voices[L.to];
    const vd = vdef(L.to);
    L.resolved = true;
    const dead = !vs.alive;
    const back = deeptime.logAdd(L.arriveThere, deeptime.log(vd.ly));
    const reply = { id: 'R' + (state.letters.count++), from: L.to, intent: L.intent, arriveAt: back, dead, effects: {}, text: '' };
    if (dead) {
      reply.text = 'Your letter found ' + vd.name + '’s home dark. No one answers. The letter itself will orbit there, unread, for the rest of time.';
      state.letters.in.push(reply);
      return;
    }
    vs.met = true;
    switch (L.intent) {
      case 'greet':
        vs.trust = Math.min(100, vs.trust + 8);
        reply.text = greetText(L.to, vs);
        break;
      case 'warn':
        vs.trust = Math.min(100, vs.trust + 10);
        reply.text = vd.short + ' acknowledges the warning about the Gleaner’s path. ' + (L.to === 'needle' ? 'They reply: “Let it come. We will be gone before it is hungry.”' : 'They adjust their fires accordingly.');
        break;
      case 'trade_lore':
        if (vs.trust >= 25) {
          reply.effects.lore = 18;
          reply.text = vd.short + ' accepts the exchange: your testament for their understanding. Their reply is a library compressed to a whisper. (+18 lore)';
          vs.trust = Math.min(100, vs.trust + 6);
        } else {
          reply.text = vd.short + ' declines, politely, the way one declines a stranger. (They kept the testament; it was freely sent.)';
        }
        break;
      case 'beam':
        vs.trust = Math.min(100, vs.trust + 15);
        if (L.to === 'choir' && state.voices.choir.doomAt) {
          state.voices.choir.doomAt += 0.15;
          reply.text = 'The Choir drinks your light. Their reply is an hour of music written for your particular sky. The glass glows a little longer than the arithmetic said it would.';
        } else {
          reply.text = vd.short + ' receives the beam with something like astonishment. Warmth, given away, across that distance. They will not forget it.';
        }
        reply.effects.flame = 2;
        break;
      case 'ask_aid':
        if (vs.trust >= 40) {
          if (vd.gifts === 'charge') { reply.effects.charge = 15; reply.text = vd.short + ' answers with light: a beam, sustained for years, aimed where you asked. (+15 charge)'; }
          else if (vd.gifts === 'lore') { reply.effects.lore = 12; reply.text = vd.short + ' sends what they can: not power, but knowing. (+12 lore)'; }
          else if (vd.gifts === 'secrets') { reply.effects.lore = 10; reply.text = 'The Kings send a single page. It is the correct page. (+10 lore)'; }
          else { reply.effects.veil = true; reply.text = 'The Meek send instructions for being no one, written as if apologizing for knowing them.'; }
          vs.trust = Math.min(100, vs.trust + 4);
        } else {
          reply.text = vd.short + ' answers kindly and gives nothing. Trust is a slower light than light.';
        }
        break;
      case 'offer_refuge':
        vs.trust = Math.min(100, vs.trust + 12);
        reply.text = vd.short + ' keeps your offer like a coal in a pocket. “If the time comes, we will come.”';
        break;
      case 'siphon':
        reply.text = vd.short + '’s reply is bland and unknowing — or written to look it.';
        break;
    }
    // voice-specific riders
    if (L.to === 'kings') {
      vs.arc = (vs.arc || 0) + 1;
      vs.trust = Math.min(100, vs.trust + 6);
      if (vs.trust >= 60 && !state.flags.kingsScript) {
        state.flags.kingsScript = true;
        reply.text += ' Folded into the letter, unasked: half of a mathematics — how a dying well’s last light could be made to carry meaning. The other half, they write, is yours to find. (The Hawking Script will come easier now.)';
      }
    }
    if (L.to === 'meek') {
      if (E.doctrine(state, 'quiet')) vs.trust = Math.min(100, vs.trust + 10);
      else { vs.trust = Math.max(0, vs.trust - 5); reply.text += ' (Their reply is faint, reproachful: you spoke too loudly on the way in.)'; }
      if (vs.trust >= 50 && !state.flags.meekGift) {
        state.flags.meekGift = true;
        if (state.inquiries.done.indexOf('veilcraft') < 0) state.inquiries.done.push('veilcraft');
        reply.text += ' With it comes their one possession worth having: Veilcraft, whole, freely given. “Be small. Outlive it.”';
      }
    }
    state.letters.in.push(reply);
  }

  function greetText(id, vs) {
    if (id === 'choir') return 'The Choir Beneath Glass answers in close harmony: “We saw your sun go out. We sang it. We sing everything; it is how we stay. Be welcome in the cold, late neighbors.”';
    if (id === 'needle') return 'The Bright Needle answers at once and at volume: “NEIGHBORS! Come drink! The star is dying, we are dying, everything is dying — which is exactly why the lights are on. Bring your grief, we’ll burn it for fuel.”';
    if (id === 'kings') return 'After a silence that was itself the first page of the answer, the Patient Kings reply: “We note your existence. We note everything. There is time.”';
    if (id === 'meek') return 'The Meek answer barely above the noise floor: “Please do not look at us so directly. Yes. Hello. Please stop.”';
    return 'An answer arrives.';
  }

  // deliver due replies, apply gifts
  function deliverMail(state) {
    for (const L of state.letters.out) {
      if (!L.resolved && state.ageLog >= L.arriveThere) resolveLetter(state, L);
    }
    const due = state.letters.in.filter((r) => state.ageLog >= r.arriveAt && !r.delivered);
    for (const r of due) {
      r.delivered = true;
      const fx = r.effects || {};
      if (fx.lore) state.res.lore = util.tidy(state.res.lore + fx.lore);
      if (fx.charge) EV.events.flashGain(state, fx.charge, 'A beamed gift arrives');
      if (fx.flame) state.flame = util.clamp(state.flame + fx.flame, 0, 100);
      if (fx.veil && state.inquiries.done.indexOf('veilcraft') < 0) state.inquiries.done.push('veilcraft');
      E.log(state, 'A letter arrives. ' + r.text, 'letter');
      state.letters.archive.push(r);
    }
    state.letters.in = state.letters.in.filter((r) => !r.delivered);
    state.letters.out = state.letters.out.filter((L) => !L.resolved || state.letters.in.some((r) => r.from === L.to));
  }

  // dooms and arcs
  function step(state, fromLog, toLog) {
    deliverMail(state);
    // the Needle burns out
    const needle = state.voices.needle;
    if (needle.alive && needle.doomAt && toLog >= needle.doomAt) {
      needle.alive = false;
      const site = E.siteById(state, 'needle_home');
      if (site) for (const src of site.sources) src.dead = true;
      state.grief += needle.met ? 6 : 3;
      EV.events.flashGain(state, 40, 'The Bright Needle’s last act: every store they had, beamed outward to anyone listening');
      state.res.lore = util.tidy(state.res.lore + 20);
      E.log(state, 'The Needle’s Fire has gone dark. They spent their star to the last erg and spent themselves with it, and their final transmission is three seconds long: laughter, and “your turn.” (+20 lore)', 'loss');
      state.flame = util.clamp(state.flame + (needle.met ? 2 : 0) - 3, 0, 100);
    }
    // the Choir's sun fails with the halo
    const choir = state.voices.choir;
    if (choir.alive && choir.doomAt && toLog >= choir.doomAt) {
      if (choir.refugeOffered && choir.trust >= 40) {
        choir.alive = false; choir.refugeTaken = true;
        // they come to your best substrate site
        let dest = null;
        for (const s of state.sites) {
          if (!s.gone && (s.built.substrate || 0) > 0 && E.roomAt(state, s, 'graven') >= 2) { dest = s; break; }
        }
        if (!dest) dest = state.sites.find((s) => !s.gone && E.hearthsAt(state, s.id).length > 0);
        if (dest) {
          const h1 = EV.world.mkHearth(state, 'graven', dest.id);
          h1.name = 'The Choir, remade — first voice';
          const h2 = EV.world.mkHearth(state, 'graven', dest.id);
          h2.name = 'The Choir, remade — second voice';
          state.hearths.push(h1, h2);
          state.flame = util.clamp(state.flame + 8, 0, 100);
          state.res.testament = util.tidy(state.res.testament + 10);
          E.log(state, 'The Choir has come. Their glass went dark behind them and they did not look back; they stepped off the ferry already singing your names. Two hearths of Graven join you at ' + dest.name + '. The door you held open mattered. (+8 Flame, +10 testament)', 'good');
        }
      } else {
        choir.alive = false;
        state.grief += choir.met ? 8 : 4;
        state.res.lore = util.tidy(state.res.lore + 30);
        E.log(state, 'The dark-matter wind has failed at the Glass, and the Choir would not leave their instrument. Their last transmission is a song eleven years long, addressed to everyone, titled “It Was Enough.” The Ear kept all of it. (+30 lore)', 'loss');
        state.flame = util.clamp(state.flame - 4, 0, 100);
      }
    }
    // kings endure; meek endure unless betrayed (handled in siphon)
  }

  EV.voices = { sendLetter, step, deliverMail };
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
