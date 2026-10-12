/* Evensong — saving: the whole state is plain JSON. */
(function (EV) {
  'use strict';

  const SAVE_VERSION = 1;

  function serialize(state) {
    return JSON.stringify({ sv: SAVE_VERSION, state });
  }
  function deserialize(text) {
    const o = JSON.parse(text);
    if (!o || typeof o !== 'object' || !o.state) throw new Error('Not an Evensong save.');
    // room for future migrations keyed on o.sv
    const st = o.state;
    if (!st.logbuf) st.logbuf = [];
    return st;
  }

  // browser storage (guarded: storage can be absent or throw)
  function store(key, text) {
    try { localStorage.setItem(key, text); return true; } catch (e) { return false; }
  }
  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }
  function listSlots() {
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf('evensong.slot.') === 0) out.push(k.substring(14));
      }
    } catch (e) { /* ignore */ }
    return out.sort();
  }

  EV.save = { SAVE_VERSION, serialize, deserialize, store, load, remove, listSlots };
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
