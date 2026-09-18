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

  global.addEventListener('keydown', function (e) {
    var acts = KEYMAP[e.code];
    if (!acts) return;
    // Scrollen und Seitensprünge unterdrücken
    if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
    if (e.repeat) return;
    for (var i = 0; i < acts.length; i++) setAction(acts[i], true);
  }, { passive: false });

  global.addEventListener('keyup', function (e) {
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

  function bindTouch() {
    var btns = document.querySelectorAll('#touch .tbtn');
    Array.prototype.forEach.call(btns, function (b) {
      var key = b.getAttribute('data-key');
      var acts = (key === 'jump') ? ['jump', 'confirm']
               : (key === 'pause') ? ['pause']
               : (key === 'throw') ? ['throw', 'run']
               : [key];

      function on(e) {
        e.preventDefault();
        touchState[key] = true;
        acts.forEach(function (a) { setAction(a, true); });
      }
      function off(e) {
        e.preventDefault();
        touchState[key] = false;
        acts.forEach(function (a) { setAction(a, false); });
      }

      b.addEventListener('touchstart', on, { passive: false });
      b.addEventListener('touchend', off, { passive: false });
      b.addEventListener('touchcancel', off, { passive: false });
      b.addEventListener('mousedown', on);
      b.addEventListener('mouseup', off);
      b.addEventListener('mouseleave', off);
    });
  }

  /* Tippen irgendwo auf dem Bild = Bestätigen (für Menüs auf dem Handy) */
  function bindScreenTap(canvas) {
    canvas.addEventListener('touchstart', function (e) {
      setAction('confirm', true);
      setTimeout(function () { setAction('confirm', false); }, 60);
    }, { passive: true });
    canvas.addEventListener('mousedown', function () {
      setAction('confirm', true);
      setTimeout(function () { setAction('confirm', false); }, 60);
    });
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
    endFrame: endFrame
  };

})(window);
