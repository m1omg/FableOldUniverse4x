/* Evensong — the Litany of First Steps: one quiet hint at a time, each shown
   once, each dismissible, the whole thing optional. */
(function (EV) {
  'use strict';
  const { el, clear, byId } = EV.dom;

  const HINTS = [
    {
      id: 'g_open',
      when: (s) => s.turn === 0,
      title: 'The first lamp',
      body: 'Your sun is blooming; the Garden has centuries, not ages. Keep the stride short (←) while things are urgent — the window under the wheel shows how many years a turn covers. When you are ready, Turn the Wheel.',
    },
    {
      id: 'g_scorch',
      when: (s) => s.turn >= 1 && s.sites.some((x) => x.scorchAt),
      title: 'The Garden is dying',
      body: 'Click Lanthorn on the Sounding. A Great Shade buys time; Hearthhalls keep the Embodied alive under a dead sky. Watch each source’s death date — nothing on the chart is a surprise.',
    },
    {
      id: 'g_stride',
      when: (s) => s.turn >= 2,
      title: 'The Wheel drags',
      body: 'The floor of the stride window rises every turn — you can never fall behind the universe. Longer strides cross more time (and more deaths); shorter ones buy attention inside a crisis.',
    },
    {
      id: 'g_rites',
      when: (s) => s.grief > 8,
      title: 'Grief is fuel, if tended',
      body: 'Losses add Grief. In Vessels (V) set the rite focus: tended grief becomes Testament — kept meaning — which pays for doctrines and, one day, for the endings. Untended grief eats the Flame.',
    },
    {
      id: 'g_inq',
      when: (s) => s.res.lore >= 10 && !s.inquiries.active && s.inquiries.done.length === 0,
      title: 'The Books are open',
      body: 'Choose an inquiry (I). Engraving is the door out of biology; the Forge of Ash turns matter into light; the Books of Roads and the Deep open the dark itself.',
    },
    {
      id: 'g_engrave',
      when: (s) => s.inquiries.done.indexOf('engraving') >= 0,
      title: 'The body is a question now',
      body: 'Click a hearth on its site panel: Embodied can be Engraved into substrate (build Substrate halls first). Cheaper to keep, able to slow, and the funerals are also welcome-feasts. What your people think of this depends on your doctrines (D).',
    },
    {
      id: 'g_ear',
      when: (s) => s.turn >= 4,
      title: 'The Ear',
      body: 'Light already reaches you from everything; only attention is scarce. Each turn the Ear resolves unknown sites in one band — unresolved names end in “?”. Watchhouses add attention.',
    },
    {
      id: 'g_voice',
      when: (s) => Object.keys(s.voices).some((v) => s.voices[v].known && s.voices[v].met),
      title: 'You are not alone, exactly',
      body: 'The Voices (L) answer at light speed — which is to say, slowly, and as whoever they are when your letter lands. Kindness compounds. So does the other thing.',
    },
    {
      id: 'g_ferry',
      when: (s) => s.inquiries.done.indexOf('long_ferries') >= 0,
      title: 'The roads are open',
      body: 'Ferries cross between stars now. A ferry is a commitment: it departs, and arrives after its years. As strides lengthen, the whole Sounding grows near. Move before the chart says you must.',
    },
    {
      id: 'g_gleaner',
      when: (s) => s.gleaner.awake,
      title: 'Something is moving',
      body: 'The Gleaner follows warmth like weather. Veils hide a site; the Quiet dims everything; a burning decoy misleads it; the Meek know more. It cannot be killed. It can be outlived.',
    },
    {
      id: 'g_threshold',
      when: (s) => s.era >= 1,
      title: 'The ages turn',
      body: 'Each age takes away a kind of warmth and leaves a colder one. Check the Forecast (T) and the Undertakings (U): the endings’ terms are written in advance, and the game is the long walk toward one of them.',
    },
    {
      id: 'g_hush',
      when: (s) => s.era >= 3,
      title: 'The Hush',
      body: 'Nothing makes light any more. What remains is arithmetic: stored charge, hoarded matter, slowed minds, and whichever ending you prepared. It was always going to come to this. You knew.',
    },
  ];

  let dismissedAll = false;

  function maybeShow(state) {
    const box = byId('guide');
    if (!state || !state.guide || dismissedAll || state.ending) { box.hidden = true; return; }
    if (EV.overlays.isOpen()) { box.hidden = true; return; }
    state.flags.guideSeen = state.flags.guideSeen || {};
    const hint = HINTS.find((h) => !state.flags.guideSeen[h.id] && h.when(state));
    if (!hint) { box.hidden = true; return; }
    clear(box);
    box.appendChild(el('div', { class: 'g-title', text: hint.title }));
    box.appendChild(el('div', { text: hint.body }));
    const actions = el('div', { class: 'g-actions' });
    actions.appendChild(el('button', { text: 'enough hints', onclick: () => { dismissedAll = true; state.guide = false; box.hidden = true; } }));
    actions.appendChild(el('button', { text: 'understood', onclick: () => { state.flags.guideSeen[hint.id] = 1; box.hidden = true; EV.ui.refresh(); } }));
    box.appendChild(actions);
    box.hidden = false;
  }

  EV.guide = { maybeShow };
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
