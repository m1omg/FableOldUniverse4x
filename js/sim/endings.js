/* Evensong — endings: defeats checked every turn; victories are Undertakings
   the player performs when their conditions hold. None of them is "right". */
(function (EV) {
  'use strict';
  const D = EV.data;
  const { util, fmt } = EV;
  const E = EV.economy;

  function endGame(state, id, closing) {
    const def = D.ENDINGS.find((e) => e.id === id);
    state.ending = {
      id, name: def.name, victory: def.victory, dark: !!def.dark,
      line: def.line, closing: closing || '',
      turn: state.turn, ageLog: state.ageLog,
      stats: JSON.parse(JSON.stringify(state.stats)),
    };
    E.log(state, '— ' + def.name + '. ' + def.line, 'era');
  }

  // ---------------------------------------------------------- defeats -------
  function checkDefeats(state) {
    if (state.ending) return;
    if (state.hearths.length === 0) {
      endGame(state, 'ashes',
        'The stores outlasted the people. For a while the works went on out of habit; then the habit, too, ran down. '
        + 'The universe did not notice. It was ' + fmt.fmtAge(state.ageLog) + ' old, and it had never noticed anything.');
      return;
    }
    if (state.flameZeroTurns >= 3) {
      endGame(state, 'guttering',
        'There was charge in the cisterns and matter in the holds. There was simply no longer a reason anyone could say aloud. '
        + 'The last entry in the Chronicle is unfinished, and it is not interrupted — it just stops.');
      return;
    }
    if ((state.fadeTurns || 0) >= 4) {
      endGame(state, 'severance',
        'The Stilled were to be woken for the good part. The charge to wake them ran out an age ago, and the last calendar with a date '
        + 'on it has long since failed. They are still there — patterns at the temperature of the sky, dreaming nothing — '
        + 'and nothing is coming. Continuity did not end. It frayed, in the dark, slowly, and then it was not there.');
      return;
    }
    if (state.onlyWroughtTurns >= 2) {
      // under proton decay no matter vault sees 10^100 years: the Loom itself
    // becomes the archive, which is the point of the Loom
    const vault = state.sites.some((s) => !s.gone && (s.built.vault || 0) > 0) || E.has(state, 'lepton_loom');
      if (E.has(state, 'gardeners') && vault && state.res.testament >= 60) {
        endGame(state, 'gardeners',
          'No one is left inside, and that was the plan, written while there was still someone to write it. The Wrought keep the vault, '
          + 'tend the dark, repair one another, and read the Testament aloud on the old feast-days to an audience of none. '
          + 'It is not nothing. It was chosen. Whether a kept promise needs a keeper to be kept — the Almanac leaves that page uncut.');
      } else {
        endGame(state, 'severance',
          'Only the Wrought remain, and no one ever taught them what it was for. They continue — flawlessly, indefinitely, '
          + 'tending works whose purpose went out of the world. Something continues. It does not remember you. It is not you.');
      }
    }
  }

  // ------------------------------------------------------- undertakings -----
  // Victory endings the player can perform when conditions hold.
  function undertakings(state) {
    const out = [];
    if (state.ending) return out;
    const R = state.res;
    const hush = state.era >= 3;
    const minded = state.hearths.filter((h) => !D.SHAPES[h.shape].unminded);
    const stilled = state.hearths.filter((h) => h.shape === 'stilled');
    const embodied = state.hearths.filter((h) => h.shape === 'embodied');
    const manifolds = state.hearths.filter((h) => h.shape === 'manifold');
    // under proton decay no matter vault sees 10^100 years: the Loom itself
    // becomes the archive, which is the point of the Loom
    const vault = state.sites.some((s) => !s.gone && (s.built.vault || 0) > 0) || E.has(state, 'lepton_loom');

    out.push({
      id: 'slow_amen', name: 'The Slow Amen',
      ok: hush && E.has(state, 'litany') && minded.length > 0 && stilled.length >= Math.ceil(minded.length * 0.7) && R.charge >= 15 && vault,
      need: 'The Hush · Litany Without End · ≥7 of 10 minded hearths Stilled · a vault · 15 charge',
      blurb: 'Still every mind that consents, set the one thought going, and let the turns of the Wheel become the beats of a single everlasting prayer.',
    });
    out.push({
      id: 'manifold_entire', name: 'The Manifold Entire',
      ok: hush && E.has(state, 'weave') && minded.length >= 1 && minded.length === manifolds.length && manifolds.length === 1 && R.testament >= 40,
      need: 'The Hush · the Weave · every minded hearth woven into one Manifold · 40 testament',
      blurb: 'The last weaving: one voice, carrying everyone, needing almost nothing, remembering it all.',
    });
    out.push({
      id: 'gardeners', name: 'A Garden Without Gardeners: Lay Down the Watch',
      ok: state.era >= 3 && E.has(state, 'gardeners') && vault && R.testament >= 60
        && state.hearths.some((h) => h.shape === 'wrought'),
      need: 'The Hush · A Garden Without Gardeners · a vault · 60 testament · Wrought to keep it',
      blurb: 'The minded go out together, on a chosen day, leaving the Wrought the vault, the instructions, and the feast-day calendar. A kept promise — if a promise can keep itself.',
    });
    out.push({
      id: 'last_hearth', name: 'The Last Hearth',
      ok: hush && E.has(state, 'seed_in_ice') && state.matterFate === 'stable' && embodied.length >= 2 && R.matter >= 10,
      need: 'The Hush · Seed in the Ice · matter must keep (the Watch must say so) · ≥2 Embodied · 10 matter',
      blurb: 'Bodies, warm, in the dark — a biology that sips. The oldest way of being anyone, kept to the end of everything.',
    });
    out.push({
      id: 'gate', name: 'The Gate',
      ok: !state.flags.anchorGone && state.era === 2 && E.has(state, 'hawking_script') && state.voices.kings.trust >= 60 && R.testament >= 50
        && state.hearths.some((h) => h.siteId === 'anchor'),
      need: 'Before the Anchor dies · the Hawking Script · the Kings’ trust · a presence at the Anchor · 50 testament',
      blurb: 'Feed the Anchor so that its final evaporation spells the Testament — a message in the last light, for whatever reads light after us. [apocryphal]',
    });
    out.push({
      id: 'still_here', name: 'Still Here: the Long Alarm',
      ok: hush && state.ageLog >= 100 && (stilled.length >= 1 || manifolds.length >= 1) && vault && R.charge >= 20,
      need: 'The Hush, past 10¹⁰⁰ years · a Stilled or Manifold hearth · a vault · 20 charge',
      blurb: 'Set the alarm for the recurrence time — 10^(10¹²⁰) years, when the universe’s state comes round again — and simply refuse to stop existing.',
    });
    out.push({
      id: 'crown', name: 'The Gleaner’s Crown',
      ok: state.stain >= 100 && state.gleaner.commanded >= 2,
      need: 'Stain at 100 · the Gleaner commanded, more than once',
      dark: true,
      blurb: 'Stop pretending there was ever a difference. Put on the Crown; become the weather.',
    });
    return out;
  }

  function perform(state, id) {
    const u = undertakings(state).find((x) => x.id === id);
    if (!u) return { ok: false, msg: 'No such undertaking.' };
    if (!u.ok) return { ok: false, msg: 'Not yet: ' + u.need };
    const R = state.res;
    switch (id) {
      case 'slow_amen':
        R.charge = util.tidy(R.charge - 15);
        endGame(state, 'slow_amen',
          'The last waking mind checks the vault seals twice, the way you check a sleeping child, and lies down into the long tempo. '
          + 'One thought, begun before the proton question was even settled, is still being thought — will always be being thought — '
          + 'each beat of it an age longer than the one before, out past the death of the last particle with a name. '
          + 'Dyson was right: a finite fire, banked slowly enough, is indistinguishable from an eternal one. Amen was always a long word.');
        break;
      case 'gardeners':
        state.hearths = state.hearths.filter((h) => h.shape === 'wrought');
        endGame(state, 'gardeners',
          'The last day is chosen a century in advance and kept like a feast. The minded walk the halls once more, touch the vault, '
          + 'leave their letters where the Wrought will read them aloud each feast-day — to no one; exactly; that is the instruction — '
          + 'and go out together, unhurried, mid-sentence by choice. The lights stay on. The garden is tended. '
          + 'Whether a kept promise needs a keeper to be kept, the Almanac leaves to you.');
        break;
      case 'manifold_entire':
        R.testament = util.tidy(R.testament - 40);
        endGame(state, 'manifold_entire',
          'The weaving takes a thousand years and feels, from inside, like everyone finally finishing one another’s sentences. '
          + 'Afterward there is one voice in the Hold, and it needs almost nothing, and it spends the rest of forever '
          + 'doing what it was woven to do: remembering everyone, in order, by name, with love. No one is missing. That was the point.');
        break;
      case 'last_hearth':
        R.matter = util.tidy(R.matter - 10);
        endGame(state, 'last_hearth',
          'Warm bodies in a warm room in an infinite cold: the universe’s whole remaining supply of weather, '
          + 'held in a hall the size of a village. They grow things. They argue. They have children, slowly, by quota and by love. '
          + 'Matter keeps; so does breakfast. Of all the shapes persistence took, this one would have been legible to the first people '
          + 'who ever banked a fire against the night — and that legibility, says the last Chronicle, was itself the treasure.');
        break;
      case 'gate':
        R.testament = util.tidy(R.testament - 50);
        endGame(state, 'gate',
          'For the rest of the Anchor’s life you feed it — gently, precisely, a mass-stream modulated like a voice — '
          + 'so that when it dies, ages hence, its final light will not be noise. It will be the Testament: everyone’s names, '
          + 'the recipes, the songs, the apology, the joke. Whether anything is there to read it, no physics can say. [apocryphal] '
          + 'But every lighthouse ever built was built on that same faith, and the last one is the truest.');
        break;
      case 'still_here':
        R.charge = util.tidy(R.charge - 20);
        endGame(state, 'still_here',
          'The alarm is set: 10^(10¹²⁰) years. The sleepers do not dream — at this tempo, dreaming would be an extravagance — '
          + 'but twice an aeon a circuit opens one eye, finds the universe still dark, still flat, still patient, and files its report: still here. '
          + 'Poincaré’s arithmetic is the last friend awake: wait long enough and every arrangement of things recurs, '
          + 'the sky refills, the kettle boils again somewhere. It is not a plan so much as a refusal, kept by machinery, '
          + 'and it is kept.');
        break;
      case 'crown':
        state.stain = 100;
        endGame(state, 'crown',
          'The Gleaner does not kneel — it has no knees, no ceremony, no self — but it answers, and that is coronation enough. '
          + 'You survive. You will survive everything now: you have become the reason other things don’t. '
          + 'Somewhere in the stores there is a vault of testament no one reads any more, because reading it hurts, '
          + 'and the thing that wears your name goes on down the Sounding, following warmth, '
          + 'exactly as advertised. The universe never had an antagonist. Now it does.');
        break;
    }
    return { ok: true };
  }

  EV.endings = { checkDefeats, undertakings, perform, endGame };
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
