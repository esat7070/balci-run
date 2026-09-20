/* =====================================================================
   audio.js — Chiptune-Engine.
   Keine MP3s, keine Samples. Alles wird live aus Pulswellen, Dreieck
   und Rauschen erzeugt. Inklusive Yusufs Lachen (HÖ HÖ HÖÖÖ).
   ===================================================================== */
(function (global) {
  'use strict';

  var ctx = null, master = null, musicGain = null, sfxGain = null;
  var noiseBuf = null;
  var waves = {};
  var ready = false;

  var muted = false;
  try { muted = localStorage.getItem('balci_mute') === '1'; } catch (e) {}

  /* ------------------------- Noten ------------------------- */

  var NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function freq(note) {
    if (!note || note === '.' || note === '-') return 0;
    var m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(note.trim());
    if (!m) return 0;
    var semi = NOTE_IDX[m[1].toUpperCase()];
    if (m[2] === '#') semi += 1;
    else if (m[2] === 'b') semi -= 1;
    var oct = parseInt(m[3], 10);
    var midi = (oct + 1) * 12 + semi;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /* ------------------------- Setup ------------------------- */

  function init() {
    if (ready) return true;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    master.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.38;
    sfxGain.connect(master);

    // Rauschpuffer für Drums & Effekte
    var len = Math.floor(ctx.sampleRate * 1.2);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    waves.p50 = pulse(0.5);
    waves.p25 = pulse(0.25);
    waves.p125 = pulse(0.125);

    ready = true;
    return true;
  }

  /** Pulswelle über Fourier-Koeffizienten — der klassische NES-Klang. */
  function pulse(duty) {
    var n = 48;
    var real = new Float32Array(n), imag = new Float32Array(n);
    for (var i = 1; i < n; i++) {
      imag[i] = (2 / (i * Math.PI)) * Math.sin(Math.PI * i * duty);
    }
    return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  function resume() {
    if (!init()) return;
    if (ctx.state === 'suspended') ctx.resume();
  }

  /* ------------------------- Bausteine ------------------------- */

  function tone(o) {
    if (!ready || muted) return;
    var t0 = o.at !== undefined ? o.at : ctx.currentTime;
    var dur = o.dur || 0.12;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();

    if (o.wave && waves[o.wave]) osc.setPeriodicWave(waves[o.wave]);
    else osc.type = o.wave || 'square';

    osc.frequency.setValueAtTime(Math.max(1, o.f0 || 440), t0);
    if (o.f1 && o.f1 !== o.f0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + dur);
    }
    if (o.vibrato) {
      var lfo = ctx.createOscillator();
      var lg = ctx.createGain();
      lfo.frequency.value = o.vibrato;
      lg.gain.value = o.vibratoDepth || 12;
      lfo.connect(lg); lg.connect(osc.frequency);
      lfo.start(t0); lfo.stop(t0 + dur + 0.02);
    }

    var peak = o.gain === undefined ? 0.5 : o.gain;
    var atk = o.attack === undefined ? 0.005 : o.attack;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g);
    g.connect(o.bus || sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(o) {
    if (!ready || muted) return;
    var t0 = o.at !== undefined ? o.at : ctx.currentTime;
    var dur = o.dur || 0.1;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;

    var filt = ctx.createBiquadFilter();
    filt.type = o.filter || 'bandpass';
    filt.frequency.setValueAtTime(o.f0 || 1200, t0);
    if (o.f1) filt.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + dur);
    filt.Q.value = o.q === undefined ? 1 : o.q;

    var g = ctx.createGain();
    var peak = o.gain === undefined ? 0.35 : o.gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filt); filt.connect(g); g.connect(o.bus || sfxGain);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  /* ------------------------- Drums ------------------------- */

  function kick(at, bus) {
    tone({ at: at, wave: 'sine', f0: 160, f1: 42, dur: 0.16, gain: 0.85, bus: bus });
    noise({ at: at, filter: 'lowpass', f0: 900, f1: 120, dur: 0.05, gain: 0.25, bus: bus });
  }
  function snare(at, bus) {
    noise({ at: at, filter: 'highpass', f0: 1400, dur: 0.12, gain: 0.34, q: 0.6, bus: bus });
    tone({ at: at, wave: 'triangle', f0: 240, f1: 120, dur: 0.08, gain: 0.22, bus: bus });
  }
  function hat(at, bus) {
    noise({ at: at, filter: 'highpass', f0: 7200, dur: 0.035, gain: 0.16, q: 0.8, bus: bus });
  }

  /* ------------------------- Songs ------------------------- */

  function S(str) { return str.trim().split(/\s+/); }

  var SONGS = {
    menu: {
      bpm: 132, duty: 'p25',
      lead: S(`C5 . E5 . G5 . E5 . C5 . . . A4 . . .
               F4 . A4 . C5 . A4 . F4 . . . G4 . . .
               G4 . B4 . D5 . B4 . G4 . . . E5 . . .
               C5 . . . G4 . . . E4 . . . C4 . . .`),
      bass: S(`C3 . . . C3 . . . G2 . . . G2 . . .
               F2 . . . F2 . . . C3 . . . C3 . . .
               G2 . . . G2 . . . D3 . . . D3 . . .
               C3 . . . C3 . . . G2 . . . C3 . . .`),
      drums: 'K.h.S.h.K.h.S.h.'
    },

    // Level 1 — verschlafen, aber es geht schon irgendwie.
    l1: {
      bpm: 138, duty: 'p25',
      lead: S(`F4 . F4 . A4 . C5 . A4 . F4 . C5 . . .
               G4 . G4 . B4 . D5 . B4 . G4 . D5 . . .
               A4 . A4 . C5 . E5 . C5 . A4 . E5 . . .
               F5 . E5 . D5 . C5 . A4 . G4 . F4 . . .`),
      bass: S(`F2 . . F2 . . C3 . F2 . . F2 . . C3 .
               G2 . . G2 . . D3 . G2 . . G2 . . D3 .
               A2 . . A2 . . E3 . A2 . . A2 . . E3 .
               F2 . . F2 . . C3 . F2 . . C3 . . C3 .`),
      drums: 'K.h.S.h.K.hhS.h.'
    },

    // Level 2 — Sonne, Blumen, sehr wütende Bienen.
    l2: {
      bpm: 146, duty: 'p50',
      lead: S(`D5 . . A4 . . F#5 . . D5 . . A4 . . .
               E5 . . B4 . . G5 . . E5 . . B4 . . .
               F#5 . . D5 . . A5 . . F#5 . . D5 . . .
               E5 . D5 . C#5 . B4 . A4 . . . D5 . . .`),
      bass: S(`D2 . . . A2 . . . D2 . . . A2 . . .
               E2 . . . B2 . . . E2 . . . B2 . . .
               F#2 . . . C#3 . . . F#2 . . . C#3 . . .
               G2 . . . A2 . . . D2 . . . D2 . . .`),
      drums: 'K.h.S.hhK.h.S.hh'
    },

    // Level 3 — Muckibude. Bass wie ein Laufband.
    l3: {
      bpm: 158, duty: 'p125',
      lead: S(`A4 A4 . E5 . A4 . C5 . B4 . A4 . E4 . .
               G4 G4 . D5 . G4 . B4 . A4 . G4 . D4 . .
               F4 F4 . C5 . F4 . A4 . G4 . F4 . C4 . .
               E4 . G4 . B4 . E5 . D5 . C5 . B4 . A4 .`),
      bass: S(`A2 . A2 . A2 . A2 . E2 . E2 . E2 . E2 .
               G2 . G2 . G2 . G2 . D2 . D2 . D2 . D2 .
               F2 . F2 . F2 . F2 . C2 . C2 . C2 . C2 .
               E2 . E2 . E2 . E2 . E2 . E2 . E2 . E2 .`),
      drums: 'K.hKS.hKK.hKS.hh'
    },

    // Level 4 — Küche. Funky, fettig.
    l4: {
      bpm: 150, duty: 'p25',
      lead: S(`G4 . A#4 . D5 . . C5 . A#4 . G4 . . D4 .
               F4 . A4 . C5 . . A#4 . A4 . F4 . . C4 .
               D#4 . G4 . A#4 . . A4 . G4 . D#4 . . A#3 .
               D4 . F4 . A4 . . G4 . F4 . D4 . . G4 .`),
      bass: S(`G2 . . G2 . G2 . . D3 . . D3 . D3 . .
               F2 . . F2 . F2 . . C3 . . C3 . C3 . .
               D#2 . . D#2 . D#2 . . A#2 . . A#2 . A#2 . .
               D2 . . D2 . D2 . . G2 . . G2 . G2 . .`),
      drums: 'K.hhS.h.KKhhS.h.'
    },

    // Level 5 — Husseins Festung. Düster.
    l5: {
      bpm: 142, duty: 'p125',
      lead: S(`E4 . . G4 . . B4 . . E5 . . D5 . . .
               C5 . . B4 . . A4 . . G4 . . F#4 . . .
               E4 . . G4 . . B4 . . E5 . . G5 . . .
               F#5 . . E5 . . D5 . . B4 . . E4 . . .`),
      bass: S(`E2 . . . E2 . . . B2 . . . B2 . . .
               C3 . . . C3 . . . G2 . . . G2 . . .
               A2 . . . A2 . . . E2 . . . E2 . . .
               B2 . . . B2 . . . E2 . . . E2 . . .`),
      drums: 'K.h.S.h.K.h.S.hh'
    },

    // Level 6 — Mustang bei Nacht. Breit, triumphal, ein bisschen kitschig.
    l6: {
      bpm: 154, duty: 'p25',
      lead: S(`C5 . E5 . G5 . C6 . G5 . E5 . G5 . . .
               A#4 . D5 . F5 . A#5 . F5 . D5 . F5 . . .
               F4 . A4 . C5 . F5 . C5 . A4 . C5 . . .
               G4 . B4 . D5 . G5 . F5 . E5 . D5 . C5 .`),
      bass: S(`C3 . C3 . G2 . G2 . C3 . C3 . G2 . G2 .
               A#2 . A#2 . F2 . F2 . A#2 . A#2 . F2 . F2 .
               F2 . F2 . C3 . C3 . F2 . F2 . C3 . C3 .
               G2 . G2 . D3 . D3 . G2 . G2 . C3 . C3 .`),
      drums: 'K.hhS.h.K.hhS.hh'
    },

    // Level-Bosse: kuerzer, frecher, nicht so bedrohlich wie die Brueder.
    boss2: {
      bpm: 164, duty: 'p50',
      lead: S(`E5 . E5 . C5 . E5 . G5 . . . E5 . . .
               D5 . D5 . B4 . D5 . F5 . . . D5 . . .
               C5 . E5 . G5 . E5 . C5 . B4 . A4 . . .
               A4 . C5 . E5 . C5 . B4 . . . E5 . . .`),
      bass: S(`A2 . A2 . A2 . A2 . E2 . E2 . E2 . E2 .
               G2 . G2 . G2 . G2 . D2 . D2 . D2 . D2 .
               F2 . F2 . C3 . C3 . F2 . F2 . E2 . E2 .
               A2 . A2 . E2 . E2 . A2 . A2 . A2 . A2 .`),
      drums: 'K.hhS.h.K.hhS.hh'
    },

    // Der allerletzte Kampf. Schneller und haerter als alles davor.
    bossfinal: {
      bpm: 182, duty: 'p125',
      lead: S(`D5 D5 D5 . A#4 . D5 . F5 F5 . E5 . D5 . .
               C5 C5 C5 . G4 . C5 . E5 E5 . D5 . C5 . .
               A#4 A#4 A#4 . F4 . A#4 . D5 D5 . C5 . A#4 . .
               A5 . G5 . F5 . E5 . D5 . C5 . A#4 . A4 .`),
      bass: S(`D2 D2 . D2 . D2 D2 . D2 D2 . D2 . D2 D2 .
               C2 C2 . C2 . C2 C2 . C2 C2 . C2 . C2 C2 .
               A#1 A#1 . A#1 . A#1 A#1 . A#1 A#1 . A#1 . A#1 A#1 .
               A1 A1 . A1 . A1 A1 . A2 A2 . A2 . A2 A2 .`),
      drums: 'KKhKS.hKKKhKS.hh'
    },

    // Endgegner.
    boss: {
      bpm: 172, duty: 'p125',
      lead: S(`D5 D5 . A4 . D5 . F5 . E5 . D5 . A4 . .
               C5 C5 . G4 . C5 . E5 . D5 . C5 . G4 . .
               A#4 A#4 . F4 . A#4 . D5 . C5 . A#4 . F4 . .
               A4 . C5 . E5 . A5 . G5 . F5 . E5 . D5 .`),
      bass: S(`D2 . D2 . D2 . D2 . A2 . A2 . A2 . A2 .
               C2 . C2 . C2 . C2 . G2 . G2 . G2 . G2 .
               A#1 . A#1 . A#1 . A#1 . F2 . F2 . F2 . F2 .
               A1 . A1 . A1 . A1 . A2 . A2 . A2 . A2 .`),
      drums: 'KKh.S.hKKKh.S.hh'
    }
  };

  /* ------------------------- Sequencer ------------------------- */

  var cur = null, curName = null, stepIdx = 0, nextTime = 0, timer = null;

  function schedule() {
    if (!cur || !ready || muted) return;
    var stepDur = 60 / cur.bpm / 4; // 16tel
    var horizon = ctx.currentTime + 0.14;
    var guard = 0;
    while (nextTime < horizon && guard++ < 64) {
      playStep(stepIdx, nextTime, stepDur);
      nextTime += stepDur;
      stepIdx++;
    }
  }

  function playStep(i, at, stepDur) {
    var L = cur.lead, B = cur.bass, D = cur.drums;
    var ln = L[i % L.length];
    if (ln && ln !== '.') {
      var f = freq(ln);
      if (f) tone({ at: at, wave: cur.duty, f0: f, dur: stepDur * 2.6,
                    gain: 0.30, bus: musicGain, attack: 0.008 });
    }
    var bn = B[i % B.length];
    if (bn && bn !== '.') {
      var bf = freq(bn);
      if (bf) tone({ at: at, wave: 'triangle', f0: bf, dur: stepDur * 3.2,
                     gain: 0.46, bus: musicGain, attack: 0.006 });
    }
    var dch = D.charAt(i % D.length);
    if (dch === 'K') kick(at, musicGain);
    else if (dch === 'S') snare(at, musicGain);
    else if (dch === 'h' || dch === 'H') hat(at, musicGain);
  }

  function playMusic(name) {
    if (!init()) return;
    if (curName === name) return;
    var song = SONGS[name];
    curName = name;
    cur = song || null;
    stepIdx = 0;
    nextTime = ctx.currentTime + 0.06;
    if (!timer) timer = setInterval(schedule, 25);
  }

  function stopMusic() {
    cur = null; curName = null;
    if (timer) { clearInterval(timer); timer = null; }
  }

  /* ------------------------- Jingles ------------------------- */

  function jingle(notes, bpm, wave) {
    if (!init()) return;
    var t = ctx.currentTime + 0.02;
    var d = 60 / (bpm || 140) / 2;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n !== '.') {
        var f = freq(n);
        if (f) tone({ at: t, wave: wave || 'p25', f0: f, dur: d * 1.8, gain: 0.5 });
      }
      t += d;
    }
  }

  /* ------------------------- Soundeffekte ------------------------- */

  var SFX = {
    jump: function () {
      tone({ wave: 'p50', f0: 300, f1: 680, dur: 0.11, gain: 0.42 });
    },
    doubleJump: function () {
      tone({ wave: 'p25', f0: 480, f1: 980, dur: 0.13, gain: 0.40 });
      noise({ filter: 'highpass', f0: 3000, dur: 0.08, gain: 0.12 });
    },
    land: function () {
      noise({ filter: 'lowpass', f0: 800, f1: 180, dur: 0.07, gain: 0.20 });
    },
    honey: function (n) {
      var f = 900 + Math.min(n || 0, 12) * 45;
      tone({ wave: 'p25', f0: f, dur: 0.05, gain: 0.30 });
      tone({ at: (ctx ? ctx.currentTime : 0) + 0.045, wave: 'p25',
             f0: f * 1.5, dur: 0.09, gain: 0.28 });
    },
    stomp: function () {
      tone({ wave: 'p125', f0: 620, f1: 160, dur: 0.12, gain: 0.45 });
      noise({ filter: 'bandpass', f0: 1600, f1: 400, dur: 0.1, gain: 0.25 });
    },
    pound: function () {
      noise({ filter: 'lowpass', f0: 2400, f1: 90, dur: 0.22, gain: 0.42 });
      tone({ wave: 'sine', f0: 200, f1: 40, dur: 0.25, gain: 0.6 });
    },
    brk: function () {
      noise({ filter: 'bandpass', f0: 2600, f1: 500, dur: 0.16, gain: 0.34, q: 0.7 });
      tone({ wave: 'p50', f0: 420, f1: 120, dur: 0.12, gain: 0.25 });
    },
    hurt: function () {
      tone({ wave: 'sawtooth', f0: 420, f1: 110, dur: 0.30, gain: 0.42 });
      noise({ filter: 'lowpass', f0: 1400, f1: 200, dur: 0.18, gain: 0.18 });
    },
    heal: function () {
      jingle(['C5', 'E5', 'G5'], 300, 'p50');
    },
    power: function () {
      jingle(['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6'], 420, 'p25');
    },
    oneUp: function () {
      jingle(['E5', 'G5', 'C6', 'E6', '.', 'C6', 'E6'], 300, 'p25');
    },
    checkpoint: function () {
      jingle(['G4', 'C5', 'E5'], 320, 'p50');
    },
    // Yusufs Lachen. Unverwechselbar.
    laugh: function () {
      if (!init()) return;
      var t = ctx.currentTime;
      var pitches = [520, 470, 430, 395];
      for (var i = 0; i < pitches.length; i++) {
        tone({ at: t + i * 0.085, wave: 'p125', f0: pitches[i],
               f1: pitches[i] * 0.86, dur: 0.075, gain: 0.5,
               vibrato: 28, vibratoDepth: 22 });
      }
    },
    // Yusufs tiefes Goblin-Knurren. KRRRRR.
    growl: function () {
      if (!init()) return;
      var t = ctx.currentTime;
      tone({ at: t, wave: 'sawtooth', f0: 98, f1: 58, dur: 0.44, gain: 0.52,
             vibrato: 19, vibratoDepth: 28, attack: 0.02 });
      tone({ at: t + 0.015, wave: 'square', f0: 49, f1: 31, dur: 0.42, gain: 0.30,
             vibrato: 24, vibratoDepth: 13, attack: 0.02 });
      noise({ at: t, filter: 'lowpass', f0: 560, f1: 170, dur: 0.40,
              gain: 0.20, q: 0.7 });
    },
    // Kippe werfen
    flick: function () {
      tone({ wave: 'p125', f0: 1250, f1: 430, dur: 0.07, gain: 0.24 });
      noise({ filter: 'highpass', f0: 2700, dur: 0.09, gain: 0.13 });
    },
    // Päckchen aufheben: Feuerzeug-Klick, dann Fanfare
    smokePower: function () {
      noise({ filter: 'highpass', f0: 3400, dur: 0.05, gain: 0.24, q: 1.4 });
      jingle(['G4', 'C5', 'E5', 'G5', 'C6'], 400, 'p125');
    },
    bossHit: function () {
      tone({ wave: 'sawtooth', f0: 300, f1: 80, dur: 0.22, gain: 0.5 });
      noise({ filter: 'bandpass', f0: 900, f1: 200, dur: 0.2, gain: 0.3 });
    },
    bossRoar: function () {
      tone({ wave: 'sawtooth', f0: 90, f1: 230, dur: 0.6, gain: 0.5 });
      noise({ filter: 'lowpass', f0: 300, f1: 1800, dur: 0.6, gain: 0.25 });
    },
    shoot: function () {
      tone({ wave: 'p125', f0: 900, f1: 260, dur: 0.09, gain: 0.26 });
    },
    die: function () {
      stopMusic();
      jingle(['C5', 'B4', 'A#4', 'A4', 'G#4', 'G4', 'F#4', 'F4', 'E4', 'D#4', 'D4'],
             340, 'p50');
    },
    win: function () {
      stopMusic();
      jingle(['C5', 'C5', 'C5', 'C5', 'G#4', 'A#4', 'C5', '.', 'A#4', 'C5'],
             230, 'p25');
    },
    select: function () {
      tone({ wave: 'p50', f0: 660, dur: 0.05, gain: 0.26 });
    },
    move: function () {
      tone({ wave: 'p50', f0: 440, dur: 0.035, gain: 0.18 });
    },
    pause: function () {
      tone({ wave: 'p25', f0: 520, f1: 780, dur: 0.09, gain: 0.3 });
    },
    coinBlock: function () {
      tone({ wave: 'p25', f0: 990, dur: 0.04, gain: 0.32 });
      tone({ at: (ctx ? ctx.currentTime : 0) + 0.04, wave: 'p25',
             f0: 1480, dur: 0.12, gain: 0.3 });
    },
    snore: function () {
      tone({ wave: 'sawtooth', f0: 110, f1: 70, dur: 0.5, gain: 0.16,
             vibrato: 7, vibratoDepth: 14 });
    },
    // Level 8: Erfan ruft an. Zweiklang, zweimal — wie ein altes Handy.
    ring: function () {
      var t0 = ctx ? ctx.currentTime : 0;
      [0, 0.16].forEach(function (d) {
        tone({ at: t0 + d, wave: 'p50', f0: 1320, dur: 0.1, gain: 0.22 });
        tone({ at: t0 + d + 0.08, wave: 'p50', f0: 990, dur: 0.1, gain: 0.22 });
      });
    },
    // Ein Bissen.
    bite: function () {
      tone({ wave: 'sawtooth', f0: 260, f1: 90, dur: 0.11, gain: 0.26 });
      noise({ dur: 0.1, gain: 0.2, f0: 2600, f1: 600 });
    }
  };

  function play(name, arg) {
    if (!ready) { if (!init()) return; }
    if (muted) return;
    var fn = SFX[name];
    if (fn) fn(arg);
  }

  function setMuted(v) {
    muted = !!v;
    try { localStorage.setItem('balci_mute', muted ? '1' : '0'); } catch (e) {}
    if (master) master.gain.value = muted ? 0 : 0.85;
    if (muted) { /* Musik läuft weiter, ist nur stumm */ }
  }

  global.Sound = {
    init: init,
    resume: resume,
    play: play,
    music: playMusic,
    stopMusic: stopMusic,
    isMuted: function () { return muted; },
    setMuted: setMuted,
    toggleMute: function () { setMuted(!muted); return muted; }
  };

})(window);
