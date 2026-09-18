/* =====================================================================
   online.js — weltweite Bestenliste (optional).

   Solange unten keine Adresse eingetragen ist, passiert hier gar nichts
   und das Spiel nutzt nur die Bestenliste im eigenen Browser.

   Einrichten: siehe README, Abschnitt "Weltweite Bestenliste".
   Der "anon"-Schluessel von Supabase ist zum Veroeffentlichen gedacht —
   was er darf, bestimmen allein die Regeln in supabase-setup.sql
   (nur lesen und neue Eintraege anlegen; aendern und loeschen geht nicht).
   Niemals einen "service_role"-Schluessel oder ein GitHub-Token hier
   eintragen: alles in dieser Datei ist fuer jeden lesbar.
   ===================================================================== */
(function (global) {
  'use strict';

  var CONFIG = {
    url: 'https://njiibgalxrpyzcwpvfmh.supabase.co',
    key: 'sb_publishable_mS2HnfX2BOT738bn3x8SMA__53_LkxW'   // oeffentlich, siehe oben
  };

  var TABLE = 'scores';
  var REFRESH_MS = 30000;
  var TIMEOUT_MS = 7000;

  var cache = null;          // letzte erfolgreich geladene Liste (roh)
  var lastFetch = 0;
  var busy = false;
  var status = 'aus';        // 'aus' | 'laedt' | 'ok' | 'fehler'

  function enabled() {
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(CONFIG.url) && CONFIG.key.length > 20;
  }

  function request(method, path, body) {
    var headers = {
      'apikey': CONFIG.key,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };
    // Aeltere "anon"-Schluessel sind JWTs und gehoeren zusaetzlich in den
    // Authorization-Kopf; die neuen "publishable"-Schluessel nicht.
    if (CONFIG.key.indexOf('eyJ') === 0) headers['Authorization'] = 'Bearer ' + CONFIG.key;
    var opts = {
      method: method,
      headers: headers,
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer'
    };
    if (body) opts.body = JSON.stringify(body);
    var ctrl = global.AbortController ? new AbortController() : null;
    if (ctrl) {
      opts.signal = ctrl.signal;
      setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
    }
    return fetch(CONFIG.url + '/rest/v1/' + path, opts).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return method === 'GET' ? r.json() : null;
    });
  }

  /** Liste neu holen — hoechstens alle 30 Sekunden. */
  function refresh(force) {
    if (!enabled() || busy) return;
    if (!force && cache && Date.now() - lastFetch < REFRESH_MS) return;
    busy = true;
    if (!cache) status = 'laedt';
    request('GET', TABLE + '?select=n,s,h,t,d&order=s.desc&limit=100')
      .then(function (rows) {
        cache = Array.isArray(rows) ? rows.slice(0, 100) : [];
        lastFetch = Date.now();
        status = 'ok';
      })
      .catch(function () { status = cache ? 'ok' : 'fehler'; lastFetch = Date.now(); })
      .then(function () { busy = false; });
  }

  /** Neuen Eintrag senden. Die Werte sind vom Spiel schon bereinigt. */
  function submit(e) {
    if (!enabled()) return;
    request('POST', TABLE, { n: e.n, s: e.s, h: e.h, t: e.t, d: e.d })
      .then(function () { refresh(true); })
      .catch(function () {});
  }

  global.Online = {
    enabled: enabled,
    refresh: refresh,
    submit: submit,
    /** Rohdaten vom Server — das Spiel prueft sie selbst noch einmal. */
    list: function () { return cache; },
    status: function () { return enabled() ? status : 'aus'; }
  };

})(window);
