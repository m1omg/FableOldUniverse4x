/* Evensong — small DOM helpers. */
(function (EV) {
  'use strict';

  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'class') n.className = attrs[k];
        else if (k === 'text') n.textContent = attrs[k];
        else if (k === 'html') n.innerHTML = attrs[k];
        else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      for (const c of [].concat(children)) {
        if (c === null || c === undefined) continue;
        n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    }
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  function byId(id) { return document.getElementById(id); }
  function esc(s) { return String(s); } // textContent used throughout; kept for clarity

  // one shared tooltip
  let tip = null;
  function showTip(x, y, text) {
    if (!tip) { tip = el('div', { id: 'tip' }); document.body.appendChild(tip); }
    tip.textContent = text;
    tip.style.display = 'block';
    const pad = 14;
    tip.style.left = Math.min(x + pad, window.innerWidth - 240) + 'px';
    tip.style.top = Math.min(y + pad, window.innerHeight - 60) + 'px';
  }
  function hideTip() { if (tip) tip.style.display = 'none'; }

  EV.dom = { el, clear, byId, esc, showTip, hideTip };
})(typeof window !== 'undefined' ? (window.EV = window.EV || {}) : (globalThis.EV = globalThis.EV || {}));
