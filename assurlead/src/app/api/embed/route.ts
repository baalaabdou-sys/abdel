import { NextResponse } from 'next/server';
import { appUrl } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The capture snippet, served as plain JavaScript.
 *
 * It is deliberately dependency-free, framework-agnostic and defensive: it must
 * never break the client's existing page. Every entry point is wrapped, and if
 * anything fails the visitor's own form submission proceeds untouched.
 *
 * Usage on the client's page:
 *   <script src="https://app.example.fr/api/embed" data-assurlead-key="alp_..." defer></script>
 *
 * It then, automatically:
 *   - keeps the ?alid tracking token from the campaign link across the visit,
 *   - records a page view and the first form interaction,
 *   - forwards the submitted fields so a scored lead is created.
 *
 * For a form it should not touch, add data-assurlead-ignore to the <form>.
 * For a custom flow, call window.assurlead.submit({ ...fields }) directly.
 */
export async function GET() {
  const base = appUrl();

  const script = `/* ASSURLEAD AI — capture snippet. Public key only; no secrets here. */
(function () {
  'use strict';
  if (window.__assurleadLoaded) return;
  window.__assurleadLoaded = true;

  var ENDPOINT = ${JSON.stringify(base)};
  var TOKEN_PARAM = 'alid';
  var STORAGE_TOKEN = 'assurlead_token';
  var STORAGE_SESSION = 'assurlead_session';

  function currentScript() {
    if (document.currentScript) return document.currentScript;
    var all = document.getElementsByTagName('script');
    for (var i = all.length - 1; i >= 0; i--) {
      if (all[i].src && all[i].src.indexOf('/api/embed') !== -1) return all[i];
    }
    return null;
  }

  var script = currentScript();
  var KEY = script ? script.getAttribute('data-assurlead-key') : null;
  if (!KEY) {
    console.warn('[assurlead] data-assurlead-key manquant : capture désactivée.');
    return;
  }

  function store(key, value) {
    try { window.sessionStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }
  function read(key) {
    try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
  }

  // The campaign link carries ?alid=<token>; keep it for the whole visit so a
  // lead submitted three pages later is still attributed to the campaign.
  function resolveToken() {
    var fromUrl = null;
    try {
      fromUrl = new URLSearchParams(window.location.search).get(TOKEN_PARAM);
    } catch (e) { /* very old browser */ }
    if (fromUrl) { store(STORAGE_TOKEN, fromUrl); return fromUrl; }
    return read(STORAGE_TOKEN);
  }

  function resolveSession() {
    var existing = read(STORAGE_SESSION);
    if (existing) return existing;
    var generated = 'als-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    store(STORAGE_SESSION, generated);
    return generated;
  }

  var token = resolveToken();
  var sessionId = resolveSession();

  function post(path, payload, useBeacon) {
    var body = JSON.stringify(Object.assign({ key: KEY, token: token, sessionId: sessionId, pageUrl: window.location.href }, payload));
    if (useBeacon && navigator.sendBeacon) {
      try {
        navigator.sendBeacon(ENDPOINT + path, new Blob([body], { type: 'application/json' }));
        return Promise.resolve({ ok: true });
      } catch (e) { /* fall through to fetch */ }
    }
    return fetch(ENDPOINT + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body,
      credentials: 'omit',
      keepalive: true
    }).then(function (r) { return r.json().catch(function () { return {}; }); });
  }

  function track(type, extra) {
    try { return post('/api/capture/event', Object.assign({ type: type }, extra || {}), type === 'LANDING_VIEW'); }
    catch (e) { return Promise.resolve({}); }
  }

  // ── Page view ───────────────────────────────────────────────
  track('LANDING_VIEW');

  // ── Form capture ────────────────────────────────────────────
  function collect(form) {
    var fields = {};
    var data;
    try { data = new FormData(form); } catch (e) { return fields; }
    data.forEach(function (value, name) {
      if (!name) return;
      if (typeof File !== 'undefined' && value instanceof File) return;
      if (fields[name] !== undefined) {
        // Multi-value inputs (checkbox groups) collapse to a comma list.
        fields[name] = fields[name] + ', ' + value;
      } else {
        fields[name] = value;
      }
    });
    // Unchecked checkboxes are absent from FormData; record them explicitly so
    // an unticked consent box reads as "not given" rather than "not asked".
    var boxes = form.querySelectorAll('input[type=checkbox]');
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].name && fields[boxes[i].name] === undefined) fields[boxes[i].name] = false;
      else if (boxes[i].name && boxes[i].checked) fields[boxes[i].name] = true;
    }
    return fields;
  }

  function submitLead(fields, extra) {
    return post('/api/capture/lead', Object.assign({ fields: fields }, extra || {}));
  }

  var started = {};
  function watch(form) {
    if (!form || form.__assurleadWatched) return;
    if (form.hasAttribute('data-assurlead-ignore')) return;
    form.__assurleadWatched = true;

    form.addEventListener('input', function () {
      if (started[form.__assurleadId]) return;
      form.__assurleadId = form.__assurleadId || Math.random().toString(36).slice(2);
      started[form.__assurleadId] = true;
      track('FORM_START');
    }, { passive: true, once: false });

    // Capture phase, so the lead is sent even if the page's own handler
    // calls preventDefault or navigates away immediately afterwards.
    form.addEventListener('submit', function () {
      try {
        var fields = collect(form);
        if (Object.keys(fields).length === 0) return;
        submitLead(fields);
      } catch (e) {
        // Never let capture break the client's own submission.
      }
    }, true);
  }

  function scan() {
    var forms = document.querySelectorAll('form');
    for (var i = 0; i < forms.length; i++) watch(forms[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  // Forms injected later (single-page flows, multi-step wizards) are picked up.
  try {
    new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) { /* no MutationObserver */ }

  // ── Public API for custom flows ──────────────────────────────
  window.assurlead = {
    token: token,
    sessionId: sessionId,
    /** Send a lead by hand: assurlead.submit({ email: '…', telephone: '…' }) */
    submit: function (fields, extra) { return submitLead(fields || {}, extra); },
    /** Record a step in a multi-step form: assurlead.step(2) */
    step: function (n) { return track('FORM_STEP', { step: Number(n) || 1 }); },
    /** Record the start of the form explicitly. */
    start: function () { return track('FORM_START'); }
  };
})();
`;

  return new NextResponse(script, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=300',
      'access-control-allow-origin': '*',
    },
  });
}
