/* =====================================================================
   input.js — Tastatur, Gamepad und Touch auf ein gemeinsames
   Aktions-Set abgebildet.
   ===================================================================== */
(function (global) {
  'use strict';

  var ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'run', 'throw',
                 'pause', 'mute', 'confirm', 'back'];

  var KEYMAP = {
    'ArrowLeft': ['left'], 'KeyA': ['left'],
    'ArrowRight': ['right'], 'KeyD': ['right'],
    'ArrowUp': ['up', 'jump'], 'KeyW': ['up', 'jump'],
    'ArrowDown': ['down'], 'KeyS': ['down'],
    'Space': ['jump', 'confirm'],
    'KeyK': ['jump'],
    'KeyJ': ['jump'],
    'ShiftLeft': ['run', 'throw'], 'ShiftRight': ['run', 'throw'],
    'KeyE': ['throw'], 'KeyF': ['throw'], 'KeyX': ['throw'],
    'Enter': ['confirm'],
    'NumpadEnter': ['confirm'],
    'Escape': ['pause', 'back'],
    'KeyP': ['pause'],
    'KeyM': ['mute'],
    'Backspace': ['back']
  };

  var held = {};      // Aktion -> true, solange gedrückt
  var pressed = {};   // Aktion -> true, nur in diesem Frame
  var released = {};
  var anyPressed = false;

  ACTIONS.forEach(function (a) { held[a] = false; pressed[a] = false; released[a] = false; });

  function setAction(a, v) {
    if (v && !held[a]) { pressed[a] = true; anyPressed = true; }
    if (!v && held[a]) released[a] = true;
    held[a] = v;
  }

  /* ---------------- Tastatur ---------------- */

  function typingInField(e) {
    var t = e.target;
    return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'));
  }

  global.addEventListener('keydown', function (e) {
    // Im Namensfeld tippt man Text, man steuert nicht Yusuf
    if (typingInField(e)) return;
    var acts = KEYMAP[e.code];
    if (!acts) return;
    // Scrollen und Seitensprünge unterdrücken
    if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
    if (e.repeat) return;
    for (var i = 0; i < acts.length; i++) setAction(acts[i], true);
  }, { passive: false });

  global.addEventListener('keyup', function (e) {
    if (typingInField(e)) return;
    var acts = KEYMAP[e.code];
    if (!acts) return;
    for (var i = 0; i < acts.length; i++) setAction(acts[i], false);
  });

  // Beim Fokusverlust alles loslassen, sonst rennt Yusuf für immer weiter.
  global.addEventListener('blur', function () {
    ACTIONS.forEach(function (a) { if (held[a]) setAction(a, false); });
  });

  /* ---------------- Touch ---------------- */

  var touchState = {};
  var tapPos = null;    // letztes Tippen aufs Bild, in Spielkoordinaten

  function actsFor(key) {
    return (key === 'jump') ? ['jump', 'confirm']
         : (key === 'pause') ? ['pause']
         : (key === 'throw') ? ['throw', 'run']
         : [key];
  }

  function setKey(key, v) {
    if (!!touchState[key] === v) return;
    touchState[key] = v;
    actsFor(key).forEach(function (a) { setAction(a, v); });
    var el = document.querySelector('#touch .tbtn[data-key="' + key + '"]');
    if (el) el.classList.toggle('on', v);
  }

  /* Alle Finger auf einmal auswerten: welcher Finger liegt gerade auf
     welchem Knopf? So kann man vom Links- auf den Rechts-Knopf rutschen,
     ohne den Daumen anzuheben — wie bei einem echten Steuerkreuz. */
  function refreshTouches(e) {
    e.preventDefault();
    var want = {};
    for (var i = 0; i < e.touches.length; i++) {
      var t = e.touches[i];
      var el = document.elementFromPoint(t.clientX, t.clientY);
      var k = el && el.getAttribute ? el.getAttribute('data-key') : null;
      if (k) want[k] = true;
    }
    var btns = document.querySelectorAll('#touch .tbtn[data-key]');
    for (var j = 0; j < btns.length; j++) {
      var key = btns[j].getAttribute('data-key');
      setKey(key, !!want[key]);
    }
  }

  function bindTouch() {
    var btns = document.querySelectorAll('#touch .tbtn[data-key]');
    Array.prototype.forEach.call(btns, function (b) {
      var key = b.getAttribute('data-key');
      ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(function (ev) {
        b.addEventListener(ev, refreshTouches, { passive: false });
      });
      // Maus (z.B. Tablet mit Maus oder Test am PC). Nach einem Fingertipp
      // kommt kein Mausklick hinterher, weil touchstart preventDefault ruft.
      b.addEventListener('mousedown', function (e) { e.preventDefault(); setKey(key, true); });
      b.addEventListener('mouseup', function () { setKey(key, false); });
      b.addEventListener('mouseleave', function () { setKey(key, false); });
    });
  }

  /* Tippen aufs Bild = Bestätigen. Zusätzlich merken wir uns WO getippt
     wurde, damit man Menüpunkte direkt antippen kann. */
  function bindScreenTap(canvas) {
    function tapAt(cx, cy) {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      tapPos = {
        x: (cx - r.left) / r.width * canvas.width,
        y: (cy - r.top) / r.height * canvas.height
      };
      setAction('confirm', true);
      setTimeout(function () { setAction('confirm', false); }, 60);
    }
    // Ein Tippen = eine Aktion. Frueher zaehlte ein Fingertipp doppelt:
    // einmal als "touchstart" und kurz danach nochmal als nachgeahmter
    // Mausklick des Browsers. Im Dialog wurden so Zeilen uebersprungen,
    // in der Levelauswahl startete ein Tipp direkt das Level.
    if (global.PointerEvent) {
      canvas.addEventListener('pointerdown', function (e) { tapAt(e.clientX, e.clientY); });
    } else {
      var lastTouch = 0;
      canvas.addEventListener('touchstart', function (e) {
        var t = e.changedTouches && e.changedTouches[0];
        lastTouch = Date.now();
        if (t) tapAt(t.clientX, t.clientY);
      }, { passive: true });
      canvas.addEventListener('mousedown', function (e) {
        if (Date.now() - lastTouch < 800) return;
        tapAt(e.clientX, e.clientY);
      });
    }
  }

  /* ---------------- Gamepad ---------------- */

  var padAxisThresh = 0.45;
  var padPrev = {};

  function pollPad() {
    if (!navigator.getGamepads) return;
    var pads = navigator.getGamepads();
    var p = null;
    for (var i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { p = pads[i]; break; }
    if (!p) return;

    var st = {
      left: (p.axes[0] !== undefined && p.axes[0] < -padAxisThresh) || btn(p, 14),
      right: (p.axes[0] !== undefined && p.axes[0] > padAxisThresh) || btn(p, 15),
      up: (p.axes[1] !== undefined && p.axes[1] < -padAxisThresh) || btn(p, 12),
      down: (p.axes[1] !== undefined && p.axes[1] > padAxisThresh) || btn(p, 13),
      jump: btn(p, 0) || btn(p, 1),
      run: btn(p, 2) || btn(p, 5) || btn(p, 7),
      throw: btn(p, 2) || btn(p, 5) || btn(p, 7),
      pause: btn(p, 9),
      confirm: btn(p, 0) || btn(p, 9),
      back: btn(p, 1) || btn(p, 8)
    };

    Object.keys(st).forEach(function (a) {
      if (st[a] !== padPrev[a]) {
        // Tastatur nicht überschreiben, wenn dort gerade gedrückt wird
        setAction(a, st[a] || false);
      }
      padPrev[a] = st[a];
    });
  }

  function btn(p, i) { return !!(p.buttons[i] && p.buttons[i].pressed); }

  /* ---------------- API ---------------- */

  function endFrame() {
    ACTIONS.forEach(function (a) { pressed[a] = false; released[a] = false; });
    anyPressed = false;
    tapPos = null;
  }

  /** Alles loslassen — z.B. wenn ein Eingabefeld den Fokus bekommt. */
  function releaseAll() {
    ACTIONS.forEach(function (a) { if (held[a]) setAction(a, false); });
    Object.keys(touchState).forEach(function (k) { setKey(k, false); });
  }

  global.Input = {
    init: function (canvas) { bindTouch(); bindScreenTap(canvas); },
    poll: pollPad,
    down: function (a) { return !!held[a]; },
    hit: function (a) { return !!pressed[a]; },
    up: function (a) { return !!released[a]; },
    anyHit: function () {
      for (var i = 0; i < ACTIONS.length; i++) if (pressed[ACTIONS[i]]) return true;
      return false;
    },
    axis: function () {
      return (held.right ? 1 : 0) - (held.left ? 1 : 0);
    },
    /** Wo in diesem Frame aufs Bild getippt wurde (oder null). */
    tap: function () { return tapPos; },
    releaseAll: releaseAll,
    endFrame: endFrame
  };

})(window);
