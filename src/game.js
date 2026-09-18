/* =====================================================================
   game.js — Spielschleife, Kamera, Darstellung, Menüs, Dialoge.
   ===================================================================== */
(function (global) {
  'use strict';

  var W = 512, H = 288, T = 16;
  var P = global.Pixel, F = global.Font, S = global.Sound;
  var E = global.Ent, LV = global.Levels, SP = global.Sprites;

  var canvas = document.getElementById('screen');
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  /* ================= Speicherstand ================= */

  /* Spielstand ebenfalls streng pruefen: kaputte oder von Hand
     veraenderte Daten duerfen das Spiel nicht aus dem Tritt bringen. */
  var save = { unlocked: 1, best: [] };
  (function () {
    var raw = null;
    try { raw = localStorage.getItem('balci_save'); } catch (e) { return; }
    if (!raw || typeof raw !== 'string' || raw.length > 8000) return;
    var s;
    try { s = JSON.parse(raw); } catch (e) { return; }
    if (!s || typeof s !== 'object') return;

    var n = Math.floor(Number(s.unlocked));
    save.unlocked = isFinite(n) ? Math.max(1, Math.min(7, n)) : 1;

    if (Array.isArray(s.best)) {
      for (var i = 0; i < s.best.length && i < 8; i++) {
        var b = s.best[i];
        if (!b || typeof b !== 'object') { save.best[i] = null; continue; }
        var num = function (v, max) {
          var x = Math.floor(Number(v));
          return isFinite(x) ? Math.max(0, Math.min(max, x)) : 0;
        };
        save.best[i] = {
          honey: num(b.honey, 99999),
          score: num(b.score, 9999999),
          time: num(b.time, 359999)
        };
      }
    }
  })();

  function persist() {
    try { localStorage.setItem('balci_save', JSON.stringify(save)); } catch (e) {}
  }

  /* ================= Spielzustand ================= */

  var G = {
    state: 'title',
    tick: 0,
    world: new E.World(),
    player: null,
    enemies: [], items: [], projectiles: [],
    particles: new E.Particles(),
    floats: new E.Floats(),
    boss: null, arena: null, bossStarted: false,
    lvl: null, lvlIndex: 0,
    cam: { x: 0, y: 0, sx: 0, sy: 0, shake: 0, shakeAmp: 0 },
    frozen: false,
    combo: 0, comboTimer: 0,
    time: 0,
    checkpoint: null,
    banner: 0,
    fade: 0, fadeDir: 0, fadeCb: null,
    dialog: null, dialogIdx: 0, dialogChar: 0, dialogAfter: null,
    menuIdx: 0, selIdx: 0,
    resultTimer: 0,
    endScroll: 0
  };

  /** Etwas in N Spiel-Ticks ausführen. Bewusst NICHT setTimeout:
      das läuft in Echtzeit weiter, auch wenn das Spiel pausiert ist. */
  G.after = function (ticks, fn) { G.pending = { t: ticks, fn: fn }; };

  G.shake = function (amp, dur) {
    G.cam.shake = Math.max(G.cam.shake, dur);
    G.cam.shakeAmp = Math.max(G.cam.shakeAmp, amp);
  };
  G.cameraTopY = function () { return G.cam.y - 20; };
  G.addItem = function (t, x, y, popped) { G.items.push(new E.Item(t, x, y, popped)); };
  G.addProjectile = function (t, x, y, vx, vy, friendly) {
    var pr = new E.Projectile(t, x, y, vx, vy, friendly);
    G.projectiles.push(pr);
    return pr;
  };

  /* ================= Level laden ================= */

  function loadLevel(idx, fromCheckpoint) {
    G.lvlIndex = idx;
    var lvl = LV.list[idx];
    G.lvl = lvl;
    G.world.load(lvl);
    E.setDifficulty(lvl.diff || 1);

    G.enemies = []; G.items = []; G.projectiles = [];
    G.particles.list.length = 0; G.floats.list.length = 0;
    G.boss = null; G.bossStarted = false;
    G.arena = lvl.arena ? { x: lvl.arena.x * T, w: lvl.arena.w * T }
            : (lvl.boss ? { x: (lvl.boss.x - 34) * T, w: 45 * T } : null);
    G.mirkanTriggers = (lvl.mirkan || []).slice();
    G.mirkan = null;

    var i;
    for (i = 0; i < lvl.enemies.length; i++) {
      var en = lvl.enemies[i];
      G.enemies.push(new E.Enemy(en.t, en.x, en.y));
    }
    for (i = 0; i < lvl.items.length; i++) {
      var it = lvl.items[i];
      G.items.push(new E.Item(it.t, it.x * T + T / 2, it.y * T + T / 2, false));
    }

    G.checkpointsHit = [];
    var sp = (fromCheckpoint && G.checkpoint) ? G.checkpoint : lvl.spawn;
    if (!G.player) G.player = new E.Player(sp[0] * T, sp[1] * T - 26);
    else {
      var keep = {
        lives: G.player.lives, honey: G.player.honey, score: G.player.score,
        deaths: G.player.deaths || 0, eatCount: G.player.eatCount || 0
      };
      G.player.reset(sp[0] * T, sp[1] * T - 26);
      G.player.lives = keep.lives; G.player.honey = keep.honey;
      G.player.score = keep.score; G.player.deaths = keep.deaths;
      G.player.eatCount = keep.eatCount;
    }
    if (!fromCheckpoint) { G.checkpoint = null; G.bossIntroSeen = false; }

    G.cam.x = Math.max(0, Math.min(lvl.w * T - W, G.player.cx() - W / 2));
    G.cam.y = Math.max(0, Math.min(lvl.h * T - H, G.player.y - H / 2));
    G.banner = 190;
    G.combo = 0;
    G.rescued = false;
    G.bossCleared = false;
    if (!fromCheckpoint) G.time = 0;
    G.frozen = false;
  }

  /* ================= Dialoge ================= */

  function startDialog(lines, after) {
    if (!lines || !lines.length) { if (after) after(); return; }
    G.dialog = lines;
    G.dialogIdx = 0;
    G.dialogChar = 0;
    G.dialogAfter = after || null;
    G.frozen = true;
    G.state = 'dialog';
  }

  function updateDialog() {
    // Der Dialog kann schon beendet sein, während die Blende noch läuft
    // (die Rückruffunktion setzt den Zustand erst danach). Ohne diese
    // Zeile stürzt das Spiel direkt nach dem Bosssieg ab.
    if (!G.dialog) return;
    var line = G.dialog[G.dialogIdx];
    var full = line[1];
    if (G.dialogChar < full.length) {
      G.dialogChar += 1.6;
      if (G.dialogChar > full.length) G.dialogChar = full.length;
      if (global.Input.hit('jump') || global.Input.hit('confirm')) {
        G.dialogChar = full.length;
      }
    } else if (global.Input.hit('jump') || global.Input.hit('confirm') ||
               global.Input.hit('pause')) {
      G.dialogIdx++;
      G.dialogChar = 0;
      S.play('select');
      if (G.dialogIdx >= G.dialog.length) {
        G.dialog = null;
        G.frozen = false;
        var cb = G.dialogAfter; G.dialogAfter = null;
        if (cb) cb(); else G.state = 'play';
      }
    }
  }

  /* ================= Übergänge ================= */

  function fadeTo(cb) {
    G.fadeDir = 1; G.fadeCb = cb;
  }

  function updateFade() {
    if (G.fadeDir === 1) {
      G.fade += 0.055;
      if (G.fade >= 1) {
        G.fade = 1; G.fadeDir = -1;
        if (G.fadeCb) { var c = G.fadeCb; G.fadeCb = null; c(); }
      }
    } else if (G.fadeDir === -1) {
      G.fade -= 0.045;
      if (G.fade <= 0) { G.fade = 0; G.fadeDir = 0; }
    }
  }

  /* ================= Callbacks aus entities.js ================= */

  G.onPlayerDead = function () {
    G.player.deaths = (G.player.deaths || 0) + 1;
    G.player.lives--;
    if (G.player.lives < 0) {
      fadeTo(function () {
        G.state = 'gameover';
        S.stopMusic();
      });
    } else {
      fadeTo(function () {
        loadLevel(G.lvlIndex, !!G.checkpoint);
        var l = LV.deathLines;
        G.floats.add(G.player.cx(), G.player.y - 12,
                     l[(Math.random() * l.length) | 0], '#ffd257', 100);
        S.music(G.lvl.music);
        G.state = 'play';
      });
    }
  };

  G.onMiniPhase = function (type) {
    G.projectiles.length = 0;
    G.player.invuln = Math.max(G.player.invuln, 70);
    startDialog(LV.mini[type].phase2, function () { G.state = 'play'; });
  };

  G.onMiniDead = function (type) {
    G.frozen = true;
    G.projectiles.length = 0;
    if (type === 'erfan') G.rescued = true;
    G.after(70, function () {
      startDialog(LV.mini[type].end, function () {
        G.frozen = false;
        G.bossCleared = true;
        S.music(G.lvl.music);
        G.floats.add(G.player.cx(), G.player.y - 16, 'WEG IST FREI!', '#ffd257', 120);
        G.state = 'play';
      });
    });
  };

  G.onEsatPhase = function (phase) {
    G.projectiles.length = 0;
    G.player.invuln = Math.max(G.player.invuln, 80);
    var d = phase === 2 ? LV.esat.phase2 : LV.esat.phase3;
    startDialog(d, function () { G.state = 'play'; });
  };

  G.onEsatDead = function () {
    G.frozen = true;
    G.projectiles.length = 0;
    G.enemies.length = 0;
    G.after(85, function () {
      startDialog(LV.esat.end, function () {
        save.unlocked = LV.list.length;
        persist();
        fadeTo(function () { startNameEntry(); });
      });
    });
  };

  G.onBossPhase = function (phase) {
    // Alles Fliegende wegräumen, sonst hängt beim Weiterspielen noch
    // ein Salatblatt in der Luft, das man nie kommen sah.
    G.projectiles.length = 0;
    G.player.invuln = Math.max(G.player.invuln, 70);
    var d = phase === 2 ? LV.boss.phase2 : LV.boss.phase3;
    startDialog(d, function () { G.state = 'play'; });
  };

  G.onBossDead = function () {
    G.frozen = true;
    G.projectiles.length = 0;
    G.after(85, function () {
      startDialog(LV.boss.end, function () {
        save.unlocked = Math.max(save.unlocked, 6);
        persist();
        // Weiter geht's: Mustang, Stilbruch, Siegerehrung.
        fadeTo(function () {
          G.checkpoint = null;
          loadLevel(5, false);
          S.music('l6');
          startDialog(LV.list[5].intro, function () { G.state = 'play'; });
        });
      });
    });
  };

  /* ================= Update ================= */

  function update() {
    G.tick++;
    global.Input.poll();
    updateFade();

    if (G.pending && G.state !== 'paused') {
      if (--G.pending.t <= 0) {
        var pf = G.pending.fn; G.pending = null; pf();
      }
    }

    switch (G.state) {
      case 'title': updateTitle(); break;
      case 'select': updateSelect(); break;
      case 'howto': updateHowto(); break;
      case 'dialog': updateDialog(); updateWorld(); break;
      case 'play': updatePlay(); break;
      case 'paused': updatePaused(); break;
      case 'clear': updateClear(); break;
      case 'gameover': updateGameover(); break;
      case 'ending': updateEnding(); break;
      case 'nameentry': updateNameEntry(); break;
      case 'teaser': updateTeaser(); break;
      case 'scores': updateScores(); break;
    }

    if (global.Input.hit('mute')) {
      G.muteState = S.toggleMute();
      G.muteFlash = 60;
    }
    if (G.muteFlash > 0) G.muteFlash--;

    global.Input.endFrame();
  }

  function updateTitle() {
    var n = 5;
    if (global.Input.hit('down')) { G.menuIdx = (G.menuIdx + 1) % n; S.play('move'); }
    if (global.Input.hit('up')) { G.menuIdx = (G.menuIdx + n - 1) % n; S.play('move'); }
    if (global.Input.hit('jump') || global.Input.hit('confirm')) {
      S.resume(); S.play('select');
      if (G.menuIdx === 0) startGame(0);
      else if (G.menuIdx === 1) { G.state = 'select'; G.selIdx = 0; }
      else if (G.menuIdx === 2) { G.scoreList = loadScores(); G.state = 'scores'; }
      else if (G.menuIdx === 3) G.state = 'howto';
      else S.toggleMute();
    }
    if (G.tick % 6 === 0) S.resume();
  }

  function updateSelect() {
    var max = Math.min(LV.list.length, save.unlocked);
    if (global.Input.hit('right')) { G.selIdx = Math.min(max - 1, G.selIdx + 1); S.play('move'); }
    if (global.Input.hit('left')) { G.selIdx = Math.max(0, G.selIdx - 1); S.play('move'); }
    if (global.Input.hit('jump') || global.Input.hit('confirm')) {
      S.play('select'); startGame(G.selIdx);
    }
    if (global.Input.hit('back') || global.Input.hit('pause')) {
      G.state = 'title'; S.play('select');
    }
  }

  function updateHowto() {
    if (global.Input.anyHit()) { G.state = 'title'; S.play('select'); }
  }

  function startGame(idx) {
    fadeTo(function () {
      G.checkpoint = null;
      loadLevel(idx, false);
      G.player.lives = 4; G.player.honey = 0; G.player.score = 0;
      G.player.deaths = 0; G.player.eatCount = 0;
      G.lastName = null; G.lastScore = null;
      S.music(LV.list[idx].music);
      startDialog(LV.list[idx].intro, function () { G.state = 'play'; });
    });
  }

  function updatePaused() {
    if (global.Input.hit('pause') || global.Input.hit('confirm')) {
      G.state = 'play'; S.play('pause');
    }
    if (global.Input.hit('back')) {
      fadeTo(function () { G.state = 'title'; G.menuIdx = 0; S.music('menu'); });
    }
  }

  function updatePlay() {
    if (global.Input.hit('pause')) { G.state = 'paused'; S.play('pause'); return; }
    G.time++;
    updateWorld();
  }

  function updateWorld() {
    var p = G.player, i;
    // Während eines Dialogs steht die ganze Welt still. Vorher lief
    // Huseyin weiter und hat Yusuf verprügelt, während man nicht
    // steuern konnte — das war der unfairste Bug im Spiel.
    var frozen = G.frozen;

    if (!frozen) G.world.updateMovers();
    p.update(G);

    if (G.comboTimer > 0) { G.comboTimer--; if (G.comboTimer === 0) G.combo = 0; }
    if (p.grounded) G.comboTimer = Math.min(G.comboTimer, 20);

    if (!frozen) {
      // Gegner nur in der Nähe der Kamera bewegen
      for (i = G.enemies.length - 1; i >= 0; i--) {
        var e = G.enemies[i];
        var near = (e.x > G.cam.x - 160 && e.x < G.cam.x + W + 160);
        if (near || e.dead) e.update(G);
        if (e.dead && e.deadTimer > 70) G.enemies.splice(i, 1);
      }
      for (i = G.items.length - 1; i >= 0; i--) {
        var it = G.items[i];
        if (it.x > G.cam.x - 120 && it.x < G.cam.x + W + 120) it.update(G);
        if (it.dead) G.items.splice(i, 1);
      }
      for (i = G.projectiles.length - 1; i >= 0; i--) {
        G.projectiles[i].update(G);
        if (G.projectiles[i].dead) G.projectiles.splice(i, 1);
      }
    }

    // Blöcke "wackeln"
    for (var key in G.world.blocks) {
      var b = G.world.blocks[key];
      if (b.bump > 0) b.bump--;
    }

    // Checkpoints
    var cps = G.lvl.checkpoints;
    for (i = 0; i < cps.length; i++) {
      var cx = cps[i][0] * T, cy = cps[i][1] * T;
      if (!G.checkpointsHit[i] &&
          Math.abs(p.cx() - (cx + 12)) < 26 && Math.abs(p.feet() - cy) < 40) {
        G.checkpointsHit[i] = true;
        G.checkpoint = cps[i];
        S.play('checkpoint');
        G.floats.add(cx + 12, cy - 22, 'KURZES NICKERCHEN GESPEICHERT', '#ffd257', 100);
        G.particles.burst(cx + 12, cy - 6, 14, { col: '#ffd257', spread: 2.4, up: 1, life: 30 });
      }
    }

    // Boss auslösen
    if (G.arena && !G.bossStarted && p.cx() > G.arena.x + 56) {
      G.bossStarted = true;
      var bt = G.lvl.bossType;
      var aTile = Math.floor(G.arena.x / T);
      var groundY = G.lvl.boss.y;

      if (bt === 'esat') {
        G.boss = new E.BossEsat(G.lvl.boss.x, G.lvl.boss.y);
        G.checkpoint = [G.lvl.spawn[0], G.lvl.spawn[1]];
      } else if (E.MINIBOSS[bt]) {
        G.boss = new E.MiniBoss(bt, G.lvl.boss.x, G.lvl.boss.y);
        // Zurueck geht nicht mehr, und der Wiedereinstieg liegt drinnen.
        G.world.fill(aTile - 1, 2, 1, groundY - 1, 1);
        G.checkpoint = [aTile + 3, groundY];
      } else {
        G.boss = new E.Boss(G.lvl.boss.x, G.lvl.boss.y);
        G.world.fill(aTile - 1, 2, 1, 13, 1);
        G.checkpoint = [aTile + 4, 15];
      }
      G.boss.intro = false;
      S.music('boss');
      G.shake(5, 20);

      if (!G.bossIntroSeen) {
        G.bossIntroSeen = true;
        var d0 = (bt === 'esat') ? null
               : (E.MINIBOSS[bt] ? LV.mini[bt].start : LV.boss.start);
        if (d0) startDialog(d0, function () { G.state = 'play'; });
      }
    }

    // Mirkan faehrt neben Yusuf her und stellt Fragen. Sehr viele.
    if (G.mirkanTriggers.length && p.cx() > G.mirkanTriggers[0] * T) {
      G.mirkanTriggers.shift();
      G.mirkan = { t: 0, qi: (Math.random() * LV.mirkanLines.length) | 0, dur: 520 };
      S.play('select');
    }
    if (G.mirkan) {
      G.mirkan.t++;
      if (G.mirkan.t % 105 === 25) {
        var ml = LV.mirkanLines;
        G.floats.add(p.cx() - 76, p.y - 26, ml[G.mirkan.qi % ml.length], '#b8c0d4', 105);
        G.mirkan.qi++;
        S.play('move');
      }
      if (G.mirkan.t > G.mirkan.dur) {
        G.floats.add(p.cx() - 70, p.y - 30, 'OKAY. BIS SPÄTER DANN.', '#8f86a8', 90);
        G.mirkan = null;
      }
    }
    // Der Boss bewegt sich im Dialog nicht — nur seine Todesanimation läuft weiter.
    if (G.boss && (!frozen || G.boss.dead)) G.boss.update(G);

    // Ziel
    if (!p.won && !p.dead) {
      var gx = G.lvl.goal[0] * T, gy = G.lvl.goal[1] * T;
      // Level-Bosse geben das Ziel frei; Huseyin und Esat enden anders.
      var endsWithBoss = (G.lvl.bossType === 'huseyin' || G.lvl.bossType === 'esat');
      var canFinish = !G.lvl.boss || (!endsWithBoss && G.bossCleared);
      if (canFinish && Math.abs(p.cx() - (gx + 12)) < 30 &&
          p.feet() > gy - 60 && p.feet() < gy + 40) {
        finishLevel();
      }
    }

    G.particles.update();
    G.floats.update();
    updateCamera();
    if (G.banner > 0) G.banner--;
  }

  function finishLevel() {
    var p = G.player;
    p.won = true;
    p.cheer = 200;
    G.frozen = true;
    S.play('win');
    G.particles.burst(p.cx(), p.y, 40,
      { col: '#ffd257', spread: 4, up: 1.6, life: 60, grav: 0.12 });

    var idx = G.lvlIndex;
    var rec = save.best[idx] || { honey: 0, score: 0, time: 999999 };
    rec.honey = Math.max(rec.honey, p.honey);
    rec.score = Math.max(rec.score, p.score);
    rec.time = Math.min(rec.time, Math.floor(G.time / 60));
    save.best[idx] = rec;
    if (save.unlocked < idx + 2 && idx < LV.list.length - 1) save.unlocked = idx + 2;
    persist();

    // Level 6 endet mit der Siegerehrung — und die eskaliert.
    if (G.lvl.id === 6) {
      G.after(50, function () {
        startDialog(LV.stilbruch, function () {
          fadeTo(function () {
            G.checkpoint = null;
            loadLevel(6, false);
            S.music('boss');
            startDialog(LV.list[6].intro, function () { G.state = 'play'; });
          });
        });
      });
      return;
    }

    G.after(66, function () {
      startDialog(G.lvl.outro, function () {
        G.state = 'clear';
        G.resultTimer = 0;
      });
    });
  }

  /* ================= Bestenliste ================= */

  var NAME_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-. ';
  var SCORE_KEY = 'balci_scores_v2';
  var SCORE_SALT = 'balci-run-honig-v2';
  var MAX_SCORES = 10;

  /* Die Bestenliste liegt im Browser des Spielers. Ohne Server kann
     niemand sie wirklich absichern — wer will, editiert seinen eigenen
     Speicher. Was hier passiert, ist trotzdem wichtig:
       1. jeder Eintrag wird beim Laden streng geprueft und begrenzt,
          damit kaputte Daten das Spiel nicht abstuerzen lassen,
       2. eine Pruefsumme wirft von Hand veraenderte Eintraege raus. */
  function hashStr(s) {
    var h = 0x811c9dc5;              // FNV-1a
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(36);
  }

  function sigFor(e) {
    return hashStr([e.n, e.s, e.h, e.t, e.d].join('|') + SCORE_SALT);
  }

  function cleanName(raw) {
    var s = String(raw === null || raw === undefined ? '' : raw).toUpperCase();
    var out = '';
    for (var i = 0; i < s.length && out.length < 6; i++) {
      var c = s.charAt(i);
      if (NAME_CHARS.indexOf(c) >= 0) out += c;
    }
    out = out.replace(/\s+$/, '');
    return out || 'ANONYM';
  }

  function clampInt(v, min, max) {
    var n = Math.floor(Number(v));
    if (!isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function loadScores() {
    var raw = null;
    try { raw = localStorage.getItem(SCORE_KEY); } catch (e) { return []; }
    if (!raw || typeof raw !== 'string' || raw.length > 20000) return [];
    var list;
    try { list = JSON.parse(raw); } catch (e) { return []; }
    if (!Array.isArray(list)) return [];

    var out = [];
    for (var i = 0; i < list.length && out.length < MAX_SCORES; i++) {
      var e = list[i];
      if (!e || typeof e !== 'object') continue;
      var c = {
        n: cleanName(e.n),
        s: clampInt(e.s, 0, 9999999),
        h: clampInt(e.h, 0, 99999),
        t: clampInt(e.t, 0, 359999),
        d: clampInt(e.d, 0, 9999)
      };
      if (typeof e.g !== 'string' || e.g !== sigFor(c)) continue;  // verändert
      out.push(c);
    }
    return out;
  }

  function storeScore(name, score, honey, timeSec, deaths) {
    var c = {
      n: cleanName(name),
      s: clampInt(score, 0, 9999999),
      h: clampInt(honey, 0, 99999),
      t: clampInt(timeSec, 0, 359999),
      d: clampInt(deaths, 0, 9999)
    };
    c.g = sigFor(c);
    var l = loadScores();
    l.push(c);
    l.sort(function (a, b) { return b.s - a.s; });
    l = l.slice(0, MAX_SCORES);
    var withSig = l.map(function (e) {
      var o = { n: e.n, s: e.s, h: e.h, t: e.t, d: e.d };
      o.g = sigFor(o);
      return o;
    });
    try { localStorage.setItem(SCORE_KEY, JSON.stringify(withSig)); } catch (e) {}
    return l;
  }

  function fmtTime(sec) {
    sec = clampInt(sec, 0, 359999);
    return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
  }

  /* Die Liste laesst sich nach vier Werten sortieren. */
  var SCORE_CATS = [
    { k: 'PUNKTE', cmp: function (a, b) { return b.s - a.s; },
      val: function (e) { return '' + e.s; } },
    { k: 'HONIG', cmp: function (a, b) { return b.h - a.h; },
      val: function (e) { return 'x' + e.h; } },
    { k: 'ZEIT', cmp: function (a, b) { return a.t - b.t; },
      val: function (e) { return fmtTime(e.t); } },
    { k: 'TODE', cmp: function (a, b) { return a.d - b.d; },
      val: function (e) { return '' + e.d; } }
  ];

  function startNameEntry() {
    G.nameIdx = [24, 20, 18, 38, 38, 38];   // "YUS" + Leerzeichen als Vorschlag
    G.namePos = 0;
    G.state = 'nameentry';
    S.play('win');
  }

  function currentName() {
    var s = '';
    for (var i = 0; i < G.nameIdx.length; i++) s += NAME_CHARS.charAt(G.nameIdx[i]);
    return s.replace(/\s+$/, '') || 'YUSUF';
  }

  function updateNameEntry() {
    var In = global.Input;
    if (In.hit('right')) { G.namePos = (G.namePos + 1) % 6; S.play('move'); }
    if (In.hit('left')) { G.namePos = (G.namePos + 5) % 6; S.play('move'); }
    if (In.hit('up')) {
      G.nameIdx[G.namePos] = (G.nameIdx[G.namePos] + 1) % NAME_CHARS.length;
      S.play('move');
    }
    if (In.hit('down')) {
      G.nameIdx[G.namePos] = (G.nameIdx[G.namePos] + NAME_CHARS.length - 1) % NAME_CHARS.length;
      S.play('move');
    }
    if (In.hit('jump') || In.hit('confirm')) {
      var sec = Math.floor(G.time / 60);
      G.lastName = currentName();
      G.lastScore = G.player.score;
      G.scoreList = storeScore(G.lastName, G.player.score, G.player.honey,
                               sec, G.player.deaths || 0);
      G.scoreCat = 0;
      S.play('oneUp');
      fadeTo(function () { G.state = 'teaser'; G.endScroll = 0; });
    }
  }

  function updateScores() {
    var In = global.Input;
    if (In.hit('right')) { G.scoreCat = (G.scoreCat + 1) % SCORE_CATS.length; S.play('move'); }
    if (In.hit('left')) {
      G.scoreCat = (G.scoreCat + SCORE_CATS.length - 1) % SCORE_CATS.length;
      S.play('move');
    }
    if (In.hit('back') || In.hit('pause') || In.hit('jump') || In.hit('confirm')) {
      G.state = 'title'; S.play('select');
    }
  }

  function updateTeaser() {
    G.endScroll += 0.5;
    G.particles.update();
    if (G.tick % 10 === 0) {
      G.particles.spawn({
        x: Math.random() * W, y: H + 6,
        vx: (Math.random() - 0.5) * 0.4, vy: -0.7 - Math.random() * 0.5,
        life: 250, col: '#ffc23c', size: 2, grav: -0.002
      });
    }
    if (G.endScroll > 150 && (global.Input.hit('jump') || global.Input.hit('confirm'))) {
      fadeTo(function () {
        G.state = 'scores'; S.music('menu');
      });
    }
  }

  function updateClear() {
    G.resultTimer++;
    G.particles.update();
    if (G.resultTimer > 40 && (global.Input.hit('jump') || global.Input.hit('confirm'))) {
      S.play('select');
      var next = G.lvlIndex + 1;
      if (next >= LV.list.length) {
        fadeTo(function () { G.state = 'title'; S.music('menu'); });
      } else {
        fadeTo(function () {
          G.checkpoint = null;
          loadLevel(next, false);
          S.music(LV.list[next].music);
          startDialog(LV.list[next].intro, function () { G.state = 'play'; });
        });
      }
    }
  }

  function updateGameover() {
    if (global.Input.hit('jump') || global.Input.hit('confirm')) {
      S.play('select');
      fadeTo(function () {
        G.player.lives = 4;
        loadLevel(G.lvlIndex, false);
        S.music(G.lvl.music);
        G.state = 'play';
      });
    }
    if (global.Input.hit('back') || global.Input.hit('pause')) {
      fadeTo(function () { G.state = 'title'; S.music('menu'); });
    }
  }

  function updateEnding() {
    G.endScroll += 0.42;
    G.particles.update();
    if (G.tick % 12 === 0) {
      G.particles.spawn({
        x: Math.random() * W, y: H + 6,
        vx: (Math.random() - 0.5) * 0.4, vy: -0.7 - Math.random() * 0.5,
        life: 260, col: '#ffc23c', size: 2, grav: -0.002
      });
    }
    if (G.endScroll > 620 && (global.Input.hit('jump') || global.Input.hit('confirm'))) {
      fadeTo(function () { G.state = 'title'; G.menuIdx = 0; S.music('menu'); });
    }
  }

  function updateCamera() {
    var p = G.player, cam = G.cam;
    var tx = p.cx() - W / 2 + p.facing * 26;
    var ty = p.y + p.h / 2 - H / 2 - 10;

    cam.x += (tx - cam.x) * 0.11;
    cam.y += (ty - cam.y) * 0.09;

    var maxX = Math.max(0, G.lvl.w * T - W);
    var maxY = Math.max(0, G.lvl.h * T - H);

    if (G.arena && G.bossStarted) {
      cam.x = Math.max(G.arena.x, Math.min(G.arena.x + G.arena.w - W, cam.x));
    } else {
      cam.x = Math.max(0, Math.min(maxX, cam.x));
    }
    cam.y = Math.max(0, Math.min(maxY, cam.y));

    if (cam.shake > 0) {
      cam.shake--;
      var a = cam.shakeAmp * (cam.shake / 20);
      cam.sx = (Math.random() - 0.5) * a * 2;
      cam.sy = (Math.random() - 0.5) * a * 2;
      if (cam.shake === 0) { cam.shakeAmp = 0; cam.sx = 0; cam.sy = 0; }
    } else { cam.sx = 0; cam.sy = 0; }
  }

  /* ================= Rendering ================= */

  function render() {
    ctx.save();
    ctx.clearRect(0, 0, W, H);

    if (G.state === 'title') { drawTitle(); }
    else if (G.state === 'select') { drawSelect(); }
    else if (G.state === 'howto') { drawHowto(); }
    else if (G.state === 'ending') { drawEnding(); }
    else if (G.state === 'nameentry') { drawNameEntry(); }
    else if (G.state === 'teaser') { drawTeaser(); }
    else if (G.state === 'scores') { drawScores(); }
    else if (G.state === 'gameover') { drawScene(); drawGameover(); }
    else {
      drawScene();
      drawHUD();
      if (G.state === 'paused') drawPause();
      if (G.state === 'clear') drawResults();
      if (G.state === 'dialog') drawDialog();
    }

    if (G.muteFlash > 0) {
      F.draw(ctx, G.muteState ? 'TON AUS' : 'TON AN', W - 8, 8,
             { color: '#ffd257', align: 'right', shadow: true });
    }

    if (G.fade > 0) {
      ctx.fillStyle = 'rgba(8,5,12,' + G.fade + ')';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  /* ---------- Hintergrund ---------- */

  function drawSky(theme) {
    var t = SP.THEMES[theme];
    var grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, t.sky[0]);
    grd.addColorStop(0.42, t.sky[1]);
    grd.addColorStop(0.75, t.sky[2]);
    grd.addColorStop(1, t.sky[3]);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  }

  function rect(x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawParallax(theme, camX, camY) {
    var t = SP.THEMES[theme];
    var f = camX * 0.22, n = camX * 0.46;
    var i, x;

    if (theme === 'zimmer') {
      // Mond + Dächer bei Sonnenaufgang
      ctx.fillStyle = '#fff0c0';
      ctx.beginPath(); ctx.arc(446 - f * 0.06, 54, 17, 0, 6.3); ctx.fill();
      ctx.fillStyle = SP.THEMES.zimmer.sky[1];
      ctx.beginPath(); ctx.arc(440 - f * 0.06, 49, 15, 0, 6.3); ctx.fill();
      for (i = -1; i < 14; i++) {
        x = i * 112 - (f % 112);
        rect(x, 150, 74, 140, t.far);
        rect(x + 12, 138, 16, 14, t.far);
        rect(x + 80, 168, 52, 122, t.far);
        rect(x + 20, 128, 2, 12, t.far);
      }
      for (i = -1; i < 12; i++) {
        x = i * 146 - (n % 146);
        rect(x, 196, 96, 94, t.near);
        rect(x + 30, 182, 14, 16, t.near);
        rect(x + 104, 210, 60, 80, t.near);
      }
    } else if (theme === 'garten') {
      ctx.fillStyle = '#fff6b0';
      ctx.beginPath(); ctx.arc(76, 46, 22, 0, 6.3); ctx.fill();
      for (i = -1; i < 10; i++) {
        x = i * 150 - (f % 150);
        ctx.fillStyle = t.far;
        ctx.beginPath(); ctx.arc(x + 60, 244, 96, Math.PI, 0); ctx.fill();
      }
      for (i = -1; i < 14; i++) {
        x = i * 104 - (n % 104);
        rect(x + 28, 200, 8, 70, '#5a3a20');
        ctx.fillStyle = t.near;
        ctx.beginPath(); ctx.arc(x + 32, 194, 26, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 16, 206, 18, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 48, 206, 18, 0, 6.3); ctx.fill();
      }
      for (i = -1; i < 5; i++) {
        x = i * 320 - (camX * 0.6 % 320);
        P.draw(ctx, 'bienenstock', x + 60, 214);
      }
    } else if (theme === 'gym') {
      for (i = -1; i < 16; i++) {
        x = i * 96 - (f % 96);
        rect(x, 0, 90, H, t.far);
        rect(x + 6, 30, 78, 3, '#2a2140');
      }
      for (i = -1; i < 9; i++) {
        x = i * 180 - (n % 180);
        rect(x + 16, 96, 60, 84, t.near);
        rect(x + 20, 100, 52, 60, '#1b1626');
        F.draw(ctx, 'NO', x + 46, 108, { color: '#ff6fa8', align: 'center' });
        F.draw(ctx, 'PAIN', x + 46, 120, { color: '#ff6fa8', align: 'center' });
        F.draw(ctx, 'NO', x + 46, 132, { color: '#ff6fa8', align: 'center' });
        F.draw(ctx, 'GAIN', x + 46, 144, { color: '#ff6fa8', align: 'center' });
        P.draw(ctx, 'hantel', x + 110, 150);
      }
    } else if (theme === 'kueche') {
      for (i = -1; i < 20; i++) {
        for (var j = 0; j < 6; j++) {
          x = i * 48 - (f % 48);
          rect(x + 1, j * 48 + 1, 46, 46, t.far);
        }
      }
      for (i = -1; i < 8; i++) {
        x = i * 200 - (n % 200);
        rect(x, 40, 120, 56, t.near);
        rect(x + 4, 44, 52, 48, '#2a2230');
        rect(x + 62, 44, 54, 48, '#2a2230');
        rect(x + 140, 74, 44, 26, t.near);
        rect(x + 146, 66, 32, 8, '#6a6270');
      }
      // Iranische Flagge — Yusufs Lieblingskueche haengt an der Wand
      for (i = -1; i < 5; i++) {
        x = i * 380 - (n % 380) + 190;
        var fw = 52, fh = 30, fy = 108;
        rect(x - 3, fy - 6, 3, fh + 16, '#6a6270');      // Stange
        var wave = Math.sin(G.tick * 0.05 + i) * 2;
        rect(x, fy + wave, fw, fh / 3, '#2a9c4a');       // gruen
        rect(x, fy + fh / 3 + wave, fw, fh / 3, '#f2f2ec'); // weiss
        rect(x, fy + 2 * fh / 3 + wave, fw, fh / 3, '#d8342e'); // rot
        rect(x + fw / 2 - 4, fy + fh / 3 + 3 + wave, 8, 4, '#d8342e');
      }
    } else if (theme === 'strasse') {
      // Naechtliche Stadt, Neon, Strassenlaternen
      ctx.fillStyle = '#f4e8a0';
      ctx.beginPath(); ctx.arc(92, 44, 14, 0, 6.3); ctx.fill();
      for (i = -1; i < 16; i++) {
        x = i * 88 - (f % 88);
        var bh2 = 60 + ((i * 37) % 5) * 26;
        rect(x, H - 88 - bh2, 70, bh2 + 88, t.far);
        for (var wy = 0; wy < bh2; wy += 16) {
          for (var wx = 0; wx < 60; wx += 14) {
            if (((i * 7 + wy + wx) % 5) < 2) {
              rect(x + 6 + wx, H - 84 - bh2 + wy, 7, 8, '#ffd88a');
            }
          }
        }
      }
      for (i = -1; i < 11; i++) {
        x = i * 128 - (n % 128);
        rect(x, 150, 4, 140, '#12141c');         // Laternenmast
        rect(x - 8, 146, 20, 5, '#12141c');
        rect(x - 6, 151, 16, 3, '#ffe9a8');      // Licht
      }
    } else {
      // Festung: Türme, Blitze, Salatbanner
      for (i = -1; i < 10; i++) {
        x = i * 160 - (f % 160);
        rect(x + 20, 80, 46, 210, t.far);
        rect(x + 14, 68, 58, 14, t.far);
        rect(x + 100, 120, 34, 170, t.far);
      }
      for (i = -1; i < 8; i++) {
        x = i * 210 - (n % 210);
        rect(x + 40, 150, 54, 140, t.near);
        rect(x + 48, 162, 38, 60, '#4f7a33');
        rect(x + 52, 170, 30, 8, '#9dff6a');
        rect(x + 52, 186, 30, 8, '#9dff6a');
      }
      if ((G.tick % 190) < 5) {
        ctx.fillStyle = 'rgba(200,255,180,0.14)';
        ctx.fillRect(0, 0, W, H);
      }
    }

    // Wolken in hellen Welten
    if (theme === 'garten' || theme === 'zimmer') {
      for (i = -1; i < 8; i++) {
        x = i * 220 - ((camX * 0.12 + G.tick * 0.12) % 220);
        P.draw(ctx, 'wolke', x, 26 + (i % 3) * 26);
      }
    }
  }

  /* ---------- Welt ---------- */

  function drawTiles(camX, camY) {
    var w = G.world, theme = w.theme;
    var topSpr = SP.tileTop(theme), fillSpr = SP.tileFill(theme), deepSpr = SP.tileDeep(theme);
    var tx0 = Math.max(0, Math.floor(camX / T) - 1);
    var tx1 = Math.min(w.w - 1, Math.floor((camX + W) / T) + 1);
    var ty0 = Math.max(0, Math.floor(camY / T) - 1);
    var ty1 = Math.min(w.h - 1, Math.floor((camY + H) / T) + 1);

    for (var ty = ty0; ty <= ty1; ty++) {
      for (var tx = tx0; tx <= tx1; tx++) {
        if (!w.solid(tx, ty)) continue;
        if (w.blockAt(tx, ty)) continue;            // Blöcke zeichnen sich selbst
        var px = tx * T - camX, py = ty * T - camY;
        if (!w.solid(tx, ty - 1)) P.draw(ctx, topSpr, px, py);
        else if (!w.solid(tx, ty - 3)) P.draw(ctx, fillSpr, px, py);
        else P.draw(ctx, deepSpr, px, py);
      }
    }
  }

  function drawHazards(camX, camY) {
    for (var i = 0; i < G.world.hazards.length; i++) {
      var h = G.world.hazards[i];
      if (h.x > camX + W || h.x + h.w < camX) continue;
      var px = h.x - camX, py = h.y - camY;
      if (h.type === 'gabel') {
        for (var x = 0; x < h.w; x += 8) P.draw(ctx, 'gabel', px + x, py);
      } else {
        var col = h.type === 'oel' ? '#3a2a12' : '#6fa83c';
        var hi = h.type === 'oel' ? '#8a6a2a' : '#a8e05a';
        rect(px, py + 2, h.w, h.h - 2, col);
        for (var wv = 0; wv < h.w; wv += 4) {
          var yy = py + 1 + Math.sin((G.tick * 0.08) + wv * 0.4) * 1.4;
          rect(px + wv, yy, 3, 2, hi);
        }
        if (G.tick % 26 === 0) {
          G.particles.spawn({
            x: h.x + Math.random() * h.w, y: h.y,
            vx: 0, vy: -0.7, life: 26, col: hi, size: 2, grav: 0.04
          });
        }
      }
    }
  }

  function drawBlocks(camX, camY) {
    for (var key in G.world.blocks) {
      var b = G.world.blocks[key];
      if (b.dead) continue;
      var px = b.x * T - camX, py = b.y * T - camY - (b.bump > 0 ? (4 - Math.abs(b.bump - 4)) : 0);
      if (px < -20 || px > W + 20) continue;
      if (b.type === 'q') {
        if (b.used) P.draw(ctx, 'qblock_used', px, py);
        else {
          P.draw(ctx, 'qblock', px, py);
          if ((G.tick >> 3) % 8 === 0) {
            rect(px + 2, py + 2, 12, 1, 'rgba(255,255,255,0.55)');
          }
        }
      } else if (b.type === 'kiste') {
        // Auf der Strasse sind es Absperrungen statt Kekskisten.
        P.draw(ctx, G.lvl.driving ? 'sperre' : 'kiste', px, py);
      } else if (b.type === 'feder') {
        P.draw(ctx, 'feder', px, py);
      }
    }
  }

  function drawMovers(camX, camY) {
    for (var i = 0; i < G.world.movers.length; i++) {
      var m = G.world.movers[i];
      var px = m.x - camX, py = m.y - camY;
      if (px < -60 || px > W + 60) continue;
      P.draw(ctx, 'tablett', px, py);
    }
  }

  function drawSigns(camX, camY) {
    var p = G.player;
    for (var i = 0; i < G.world.signs.length; i++) {
      var s = G.world.signs[i];
      var px = s.x * T - camX, py = s.y * T - camY;
      if (px < -60 || px > W + 60) continue;
      // Pfosten + Brett
      rect(px + 7, py - 12, 3, 12, '#5a3a20');
      rect(px - 2, py - 24, 22, 13, '#8a5a30');
      rect(px - 1, py - 23, 20, 11, '#b07a45');
      rect(px + 3, py - 19, 12, 2, '#5a3a20');
      rect(px + 3, py - 15, 8, 2, '#5a3a20');

      var near = Math.abs(p.cx() - (s.x * T + 8)) < 56 &&
                 Math.abs(p.feet() - s.y * T) < 60;
      if (near) {
        var lines = F.wrap(s.text, 220, 1, 1);
        var bw = 0;
        for (var li = 0; li < lines.length; li++) bw = Math.max(bw, F.measure(lines[li], 1, 1));
        var bh = lines.length * 10 + 8;
        var bx = Math.round(px + 8 - bw / 2 - 5), by = Math.round(py - 30 - bh);
        bx = Math.max(4, Math.min(W - bw - 14, bx));
        ctx.fillStyle = 'rgba(14,9,20,0.86)';
        ctx.fillRect(bx, by, bw + 10, bh);
        ctx.strokeStyle = '#ffc23c';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 0.5, by + 0.5, bw + 9, bh - 1);
        for (li = 0; li < lines.length; li++) {
          F.draw(ctx, lines[li], bx + 5, by + 5 + li * 10, { color: '#ffe9a8' });
        }
      }
    }
  }

  function drawGoal(camX, camY) {
    if (G.lvl.bossType === 'huseyin' || G.lvl.bossType === 'esat') return;
    if (G.lvl.boss && !G.bossCleared) return;
    var gx = G.lvl.goal[0] * T - camX, gy = G.lvl.goal[1] * T - camY;
    var bob = Math.sin(G.tick * 0.05) * 2;

    // Level 6 endet nicht am Honigtopf, sondern vor dem Stilbruch.
    if (G.lvl.id === 6) {
      rect(gx - 40, gy - 104, 132, 104, '#241d3a');
      rect(gx - 34, gy - 98, 120, 54, '#17122a');
      rect(gx - 34, gy - 98, 120, 2, '#ff8ad8');
      var pulse = (G.tick % 90) < 6 ? '#ffd8f0' : '#ff8ad8';
      F.draw(ctx, 'STILBRUCH', gx + 26, gy - 90,
             { color: pulse, align: 'center', scale: 2, shadow: true });
      F.draw(ctx, 'SHISHA BAR', gx + 26, gy - 70,
             { color: '#8ad8e8', align: 'center' });
      F.draw(ctx, 'OFFEN', gx + 26, gy - 58,
             { color: '#ffe9a8', align: 'center' });
      rect(gx + 6, gy - 40, 38, 40, '#3a2a1e');
      rect(gx + 10, gy - 36, 30, 36, '#1a1220');
      P.draw(ctx, 'esat', gx + 54, gy - 23);
      P.draw(ctx, 'shisha', gx - 24, gy - 19);
      P.draw(ctx, 'brisket', gx - 4, gy - 14);
      if (G.tick % 6 === 0) {
        G.particles.spawn({
          x: G.lvl.goal[0] * T - 18 + Math.random() * 6,
          y: G.lvl.goal[1] * T - 20,
          vx: 0.1, vy: -0.4, life: 60, col: '#9aa8b8', size: 2, grav: -0.006
        });
      }
      return;
    }
    P.draw(ctx, 'ziel', gx, gy - 26 + bob);
    F.draw(ctx, 'ZIEL', gx + 12, gy - 40 + bob, {
      color: '#ffe9a8', align: 'center', shadow: true,
      wave: G.tick * 0.09, waveAmp: 1
    });
    if (G.tick % 8 === 0) {
      G.particles.spawn({
        x: G.lvl.goal[0] * T + 4 + Math.random() * 16,
        y: G.lvl.goal[1] * T - 4,
        vx: (Math.random() - 0.5) * 0.5, vy: -0.6,
        life: 40, col: '#ffd257', size: 2, grav: -0.01
      });
    }
  }

  function drawCheckpoints(camX, camY) {
    var cps = G.lvl.checkpoints;
    for (var i = 0; i < cps.length; i++) {
      var px = cps[i][0] * T - camX, py = cps[i][1] * T - camY - 16;
      if (px < -60 || px > W + 60) continue;
      P.draw(ctx, G.checkpointsHit[i] ? 'sofa_on' : 'sofa', px, py);
    }
  }

  function drawScene() {
    var camX = Math.round(G.cam.x + G.cam.sx), camY = Math.round(G.cam.y + G.cam.sy);
    drawSky(G.world.theme);
    drawParallax(G.world.theme, camX, camY);

    drawCheckpoints(camX, camY);
    drawSigns(camX, camY);
    drawGoal(camX, camY);
    drawTiles(camX, camY);
    drawHazards(camX, camY);
    drawBlocks(camX, camY);
    drawMovers(camX, camY);

    var i;
    for (i = 0; i < G.items.length; i++) {
      var it = G.items[i];
      var ix = it.x - camX, iy = it.y - camY;
      if (ix < -30 || ix > W + 30) continue;
      P.draw(ctx, it.spr, ix, iy);
      if (it.t === 'gold' && (G.tick >> 2) % 6 === 0) {
        G.particles.spawn({ x: it.x + 8, y: it.y + 6, vx: (Math.random() - 0.5), vy: -0.5,
                            life: 22, col: '#ffe38a', size: 2, grav: 0 });
      }
    }

    for (i = 0; i < G.enemies.length; i++) drawEnemy(G.enemies[i], camX, camY);

    for (i = 0; i < G.projectiles.length; i++) {
      var pr = G.projectiles[i];
      if (pr.t === 'rauch') {
        // Shisha-Wolke: weiche Schwaden, werden zum Ende hin blasser
        var a2 = Math.min(0.72, pr.life / 90) * 0.9;
        ctx.globalAlpha = a2;
        ctx.fillStyle = '#c8c2d8';
        var wx = pr.x - camX + 13, wy = pr.y - camY + 10;
        var pf = Math.sin(pr.t0 * 0.06) * 1.5;
        ctx.beginPath(); ctx.arc(wx - 6, wy + 1, 7 + pf, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.arc(wx + 5, wy - 1, 8 - pf, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.arc(wx, wy + 4, 7, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#e8e4f0';
        ctx.beginPath(); ctx.arc(wx - 2, wy - 3, 5, 0, 6.3); ctx.fill();
        ctx.globalAlpha = 1;
        continue;
      }
      if (!pr.spr) continue;
      P.draw(ctx, pr.spr, pr.x - camX, pr.y - camY, pr.vx < 0);
    }

    // Mirkan faehrt nebenher und fragt
    if (G.mirkan) {
      var mp = G.player;
      var mw = P.get('mercedes').w;
      var sway = Math.sin(G.mirkan.t * 0.07) * 4;
      var mx = mp.cx() - camX - 88 + sway - mw / 2;
      var my = mp.feet() - camY - P.get('mercedes').h + 1;
      P.draw(ctx, 'mercedes', mx, my, mp.facing < 0);
      F.draw(ctx, 'MIRKAN', mx + mw / 2, my - 12,
             { color: '#b8c0d4', align: 'center', shadow: true });
      if (G.tick % 5 === 0) {
        G.particles.spawn({
          x: mp.cx() - 108 + sway, y: mp.feet() - 5,
          vx: -0.7, vy: -0.2, life: 22, col: '#8e8880', size: 2, grav: -0.01
        });
      }
    }

    if (G.boss) drawBoss(camX, camY);
    drawPlayer(camX, camY);
    drawParticles(camX, camY);
    drawFloats(camX, camY);

    // leichte Abdunklung an den Rändern
    var vg = ctx.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, 'rgba(0,0,0,0.20)');
    vg.addColorStop(0.3, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    if (G.banner > 0) drawBanner();
  }

  function drawEnemy(e, camX, camY) {
    var px = e.x - camX, py = e.y - camY;
    if (px < -50 || px > W + 50) return;
    var spr = e.def.spr[e.anim % e.def.spr.length];
    if (e.dead) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - e.deadTimer / 60);
      ctx.translate(Math.round(px + e.w / 2), Math.round(py + e.h / 2));
      ctx.scale(1, -1);
      P.draw(ctx, spr, -e.w / 2, -e.h / 2, e.facing < 0);
      ctx.restore();
      return;
    }
    if (e.stun > 0) py += Math.sin(G.tick * 0.5) * 1;
    if (e.flash > 0 && (G.tick >> 1) % 2 === 0) P.drawWhite(ctx, spr, px, py, e.facing < 0);
    else P.draw(ctx, spr, px, py, e.facing < 0);

    if (e.t === 'bro' && e.charge > 0 && G.tick % 8 < 4) {
      F.draw(ctx, '!', px + e.w / 2, py - 10, { color: '#ff6fa8', align: 'center' });
    }
    if (e.stun > 0 && G.tick % 20 < 10) {
      F.draw(ctx, '*', px + e.w / 2, py - 8, { color: '#ffd257', align: 'center' });
    }
  }

  function drawPlayer(camX, camY) {
    var p = G.player;
    if (p.invuln > 0 && (G.tick >> 1) % 2 === 0 && !p.dead) return;

    // Level 6: Yusuf sitzt im Mustang.
    if (G.lvl.driving && !p.dead) {
      var cw = P.get('mustang').w, chh = P.get('mustang').h;
      var carX = Math.round(p.cx() - camX - cw / 2);
      var carY = Math.round(p.feet() - camY - chh + 1);
      // Kopf zuerst, Auto drueber — so schaut er aus dem Fenster
      P.draw(ctx, 'y_head', carX + (p.facing < 0 ? 12 : 14), carY - 7, p.facing < 0);
      P.draw(ctx, 'mustang', carX, carY, p.facing < 0);
      // Auspuff
      if (Math.abs(p.vx) > 1 && G.tick % 4 === 0) {
        G.particles.spawn({
          x: p.cx() - p.facing * 20, y: p.feet() - 5,
          vx: -p.facing * 0.8, vy: -0.25, life: 26,
          col: '#8e8880', size: 2, grav: -0.01
        });
      }
      return;
    }

    var ps = p.pose();
    var opts = {
      pose: ps.pose, face: ps.face,
      frame: p.anim, flip: p.facing < 0
    };
    if (p.power > 0) {
      // Gold-Döner: goldener Schimmer + Funken
      opts.flash = '#ffd257';
      opts.flashAlpha = 0.28 + Math.sin(G.tick * 0.3) * 0.16;
      if (G.tick % 3 === 0) {
        G.particles.spawn({
          x: p.cx() + (Math.random() - 0.5) * 14, y: p.y + Math.random() * p.h,
          vx: 0, vy: -0.5, life: 20, col: '#ffe38a', size: 2, grav: 0
        });
      }
    }
    if (p.dead) opts.alpha = Math.max(0, 1 - p.deadTimer / 110);
    P.drawChar(ctx, 'yusuf', p.cx() - camX, p.feet() - camY, opts);

    if (p.sleeping) {
      var zx = p.cx() - camX + 10 * p.facing, zy = p.y - camY - 6;
      for (var i = 0; i < 3; i++) {
        var t = (G.tick * 0.02 + i * 0.33) % 1;
        F.draw(ctx, 'Z', zx + t * 12 * p.facing, zy - t * 18, {
          color: 'rgba(200,185,255,' + (1 - t).toFixed(2) + ')',
          scale: 1 + Math.floor(t * 2)
        });
      }
    }
  }

  function drawBoss(camX, camY) {
    var b = G.boss;
    var px = b.cx() - camX, py = b.y + b.h - camY;

    // Level-Bosse sind gezeichnete Sprites, keine zusammengesetzten Figuren
    if (E.MINIBOSS[G.lvl.bossType]) {
      var d = b.def;
      var sn = d.spr[b.anim % d.spr.length];
      var sp = P.get(sn);
      var sc = d.scale;
      var dw = sp.w * sc, dh = sp.h * sc;
      var dx0 = Math.round(b.cx() - camX - dw / 2);
      var dy0 = Math.round(b.y + b.h - camY - dh);

      ctx.save();
      if (b.dead) ctx.globalAlpha = Math.max(0.15, 1 - b.deadTimer / 140);
      else if (b.invuln > 0 && (G.tick >> 1) % 2 === 0) ctx.globalAlpha = 0.55;
      ctx.translate(dx0 + (b.facing < 0 ? dw : 0), dy0);
      ctx.scale(b.facing < 0 ? -sc : sc, sc);
      if (b.flash > 0 && (G.tick >> 1) % 2 === 0) P.drawWhite(ctx, sn, 0, 0, false);
      else P.draw(ctx, sn, 0, 0, false);
      ctx.restore();

      if (!b.dead && b.state === 'chargeprep' && (G.tick >> 2) % 2 === 0) {
        F.draw(ctx, '!', px, dy0 - 14, { color: '#ff6a6a', align: 'center', scale: 2 });
      }
      if (!b.dead && b.state === 'pushups') {
        F.draw(ctx, 'LIEGESTÜTZE', px, dy0 - 14,
               { color: '#ffd257', align: 'center', shadow: true });
      }
      return;
    }

    // Esat hat eigene Zustaende
    if (G.lvl.bossType === 'esat') {
      var ep = 'idle', ef = 'normal';
      if (b.dead) { ep = 'hurt'; ef = 'hurt'; }
      else if (b.state === 'snooze') { ep = 'sleep'; ef = 'sleep'; }
      else if (b.state === 'dash') { ep = 'run'; ef = 'rage'; }
      else if (b.state === 'walk') ep = 'run';
      else if (!b.grounded) ep = b.vy < 0 ? 'jump' : 'fall';
      else if (b.state === 'shisha' || b.state === 'agents' || b.state === 'jets') {
        ep = 'cheer'; ef = 'laugh';
      }
      if (b.flash > 0) ef = 'hurt';
      else if (b.snoozed && !b.dead && ef === 'normal') ef = 'rage';

      var eo = { pose: ep, face: ef, frame: b.anim, flip: b.facing < 0, scale: 2 };
      if (b.dead) eo.alpha = Math.max(0.2, 1 - b.deadTimer / 160);
      if (b.flash > 0 && (G.tick >> 1) % 2 === 0) {
        eo.flash = '#ffffff'; eo.flashAlpha = 0.8;
      }
      if (b.invuln > 0 && (G.tick >> 1) % 2 === 0 && !b.dead) eo.alpha = 0.55;
      if (b.snoozed && !b.dead) {
        eo.flash = '#2fd39e';
        eo.flashAlpha = 0.14 + Math.sin(G.tick * 0.16) * 0.08;
      }
      P.drawChar(ctx, 'esat', px, py, eo);

      if (b.state === 'snooze' && !b.dead) {
        for (var z = 0; z < 3; z++) {
          var zt = (G.tick * 0.02 + z * 0.33) % 1;
          F.draw(ctx, 'Z', px + 12 + zt * 14, py - b.h - 4 - zt * 20, {
            color: 'rgba(200,255,220,' + (1 - zt).toFixed(2) + ')',
            scale: 1 + Math.floor(zt * 2)
          });
        }
      }
      if (b.state === 'dashprep' && (G.tick >> 2) % 2 === 0) {
        F.draw(ctx, '!', px, py - b.h - 10, { color: '#ff6a6a', align: 'center', scale: 2 });
      }
      return;
    }

    var pose = 'idle', face = 'normal', frame = b.anim;

    if (b.dead) pose = 'hurt';
    else if (b.state === 'pushups') { pose = 'duck'; face = 'laugh'; frame = (G.tick >> 3); }
    else if (b.state === 'dash') { pose = 'run'; face = 'laugh'; }
    else if (b.state === 'walk') pose = 'run';
    else if (!b.grounded) pose = b.vy < 0 ? 'jump' : 'fall';
    else if (b.state === 'throw' || b.state === 'shake' || b.state === 'rain') pose = 'cheer';
    if (b.flash > 0) face = 'hurt';
    if (b.phase >= 3 && !b.dead) face = 'laugh';

    var opts = {
      pose: pose, face: face, frame: frame,
      flip: b.facing < 0, scale: 2
    };
    if (b.dead) opts.alpha = Math.max(0.2, 1 - b.deadTimer / 160);
    if (b.flash > 0 && (G.tick >> 1) % 2 === 0) {
      opts.flash = '#ffffff'; opts.flashAlpha = 0.8;
    }
    if (b.invuln > 0 && (G.tick >> 1) % 2 === 0 && !b.dead) opts.alpha = 0.55;
    P.drawChar(ctx, 'huseyin', px, py, opts);
  }

  function drawParticles(camX, camY) {
    var l = G.particles.list;
    for (var i = 0; i < l.length; i++) {
      var p = l[i];
      var a = Math.min(1, p.life / (p.max * 0.6));
      ctx.globalAlpha = a;
      if (p.text) {
        F.draw(ctx, p.text, p.x - camX, p.y - camY, { color: p.col });
      } else {
        var s = p.shrink ? Math.max(1, Math.round(p.size * a)) : p.size;
        rect(p.x - camX - s / 2, p.y - camY - s / 2, s, s, p.col);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawFloats(camX, camY) {
    var l = G.floats.list;
    for (var i = 0; i < l.length; i++) {
      var f = l[i];
      if (!f.text) continue;
      ctx.globalAlpha = Math.min(1, f.life / 22);
      F.draw(ctx, f.text, f.x - camX, f.y - camY,
             { color: f.col, align: 'center', shadow: true });
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- HUD ---------- */

  function drawHUD() {
    var p = G.player;
    // Herzen
    for (var i = 0; i < p.maxHp; i++) {
      var hx = 8 + i * 13, hy = 8;
      if (i < p.hp) P.draw(ctx, 'herz', hx, hy);
      else {
        ctx.globalAlpha = 0.28;
        P.draw(ctx, 'herz', hx, hy);
        ctx.globalAlpha = 1;
      }
    }

    // Honig
    P.draw(ctx, 'honig', 8, 24);
    F.draw(ctx, 'x' + p.honey, 24, 29, { color: '#ffe9a8', shadow: true });

    // Leben
    F.draw(ctx, 'YUSUF x' + Math.max(0, p.lives), 8, 44, { color: '#f4bd91', shadow: true });

    // Punkte + Zeit
    F.draw(ctx, 'PUNKTE ' + p.score, W - 8, 8, { color: '#ffe9a8', align: 'right', shadow: true });
    var sec = Math.floor(G.time / 60);
    F.draw(ctx, 'ZEIT ' + Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2),
           W - 8, 20, { color: '#d8cfe8', align: 'right', shadow: true });

    // Gold-Döner-Balken
    if (p.power > 0) {
      var bw = 70, pw = Math.round(bw * p.power / 560);
      rect(W - 8 - bw, 34, bw, 6, 'rgba(0,0,0,0.5)');
      rect(W - 8 - bw, 34, pw, 6, '#ffd257');
      F.draw(ctx, 'GOLD-DÖNER', W - 8 - bw - 4, 34, { color: '#ffd257', align: 'right' });
    }

    // Bosslebensbalken
    if (G.boss && !G.boss.dead && G.bossStarted) {
      var bt2 = G.lvl.bossType;
      var isE = (bt2 === 'esat');
      var mini = E.MINIBOSS[bt2];
      // Der Balken sitzt ganz unten und der Name steht DARIN — sonst
      // liegt die Schrift mitten im Spielfeld und verdeckt den Gegner.
      var w2 = 250, x2 = (W - w2) / 2;
      var by2 = H - 20;
      rect(0, by2 - 4, W, 24, 'rgba(8,5,12,0.72)');
      rect(x2 - 2, by2 - 2, w2 + 4, 16, 'rgba(6,4,10,0.9)');
      rect(x2, by2, w2, 12, '#241830');
      var hw = Math.round(w2 * Math.max(0, G.boss.hp) / G.boss.maxHp);
      var barCol = mini ? mini.col
        : (isE ? (G.boss.snoozed ? '#2fd39e' : '#6fc8e8')
               : (G.boss.phase >= 3 ? '#9dff6a'
                 : (G.boss.phase === 2 ? '#c8e85a' : '#5ec24a')));
      rect(x2, by2, hw, 12, barCol);
      rect(x2, by2, hw, 2, 'rgba(255,255,255,0.35)');

      var bname = mini ? mini.name : (isE ? 'ESAT' : 'HUSEYIN BALCI');
      F.draw(ctx, bname, W / 2, by2 + 3,
             { color: '#ffffff', align: 'center', shadow: true });

      var lbl = (isE && G.boss.snoozed) ? 'SNOOZE'
              : (mini && G.boss.pumped) ? 'WARM'
              : 'PH ' + G.boss.phase;
      F.draw(ctx, lbl, x2 + w2 + 5, by2 + 3, { color: barCol });
      // Offenes Fenster sichtbar machen — der Kampf soll lesbar sein
      if (G.boss.open && !G.boss.dead && (G.tick >> 3) % 2 === 0) {
        F.draw(ctx, 'OFFEN', x2 - 5, by2 + 3, { color: '#ffd257', align: 'right' });
      }
    }
  }

  function drawBanner() {
    var a = Math.min(1, G.banner / 40);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(12,8,18,0.72)';
    ctx.fillRect(0, 96, W, 62);
    rect(0, 96, W, 2, '#ffc23c');
    rect(0, 156, W, 2, '#ffc23c');
    F.draw(ctx, 'LEVEL ' + G.lvl.id, W / 2, 106, { color: '#ffd257', align: 'center', scale: 1 });
    F.draw(ctx, G.lvl.name, W / 2, 118, { color: '#ffffff', align: 'center', scale: 2, shadow: true });
    F.draw(ctx, G.lvl.sub, W / 2, 142, { color: '#c8b8e0', align: 'center' });
    ctx.globalAlpha = 1;
  }

  /* ---------- Dialog ---------- */

  var SPEAKER = {
    yusuf:   { name: 'YUSUF',   col: '#ffc23c' },
    huseyin: { name: 'HUSEYIN', col: '#cfd4e0' },
    erfan:   { name: 'ERFAN',   col: '#e8c24a' },
    esat:    { name: 'ESAT',    col: '#6fc8e8' },
    lennart: { name: 'LENNART', col: '#e8b894' },
    mirkan:  { name: 'MIRKAN',  col: '#b8c0d4' }
  };

  function drawPortrait(who, x, y, talking) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.round(x), Math.round(y), 30, 30);
    ctx.clip();
    ctx.translate(Math.round(x), Math.round(y));
    if (who === 'huseyin') {
      ctx.scale(2, 2);
      P.draw(ctx, talking ? 'h_head_angry' : 'h_head', 0, 0, true);
    } else if (who === 'erfan') {
      ctx.scale(2, 2); P.draw(ctx, 'erfan', -1, 0);
    } else if (who === 'esat') {
      ctx.scale(2, 2); P.draw(ctx, talking ? 'e_head_grin' : 'e_head', -1, 0);
    } else if (who === 'lennart') {
      ctx.scale(2, 2); P.draw(ctx, talking ? 'lennart2' : 'lennart', -3, 0);
    } else if (who === 'mirkan') {
      // Mirkan hat kein Portraet. Er hat ein Fragezeichen.
      ctx.scale(2, 2);
      P.draw(ctx, 'frage', 3, 1 + (talking ? 1 : 0));
    } else {
      ctx.scale(2, 2);
      P.draw(ctx, talking ? 'y_head_laugh' : 'y_head', 0, 0);
    }
    ctx.restore();
  }

  function drawDialog() {
    if (!G.dialog) return;
    var line = G.dialog[G.dialogIdx];
    var who = line[0], full = line[1];
    var shown = full.substring(0, Math.floor(G.dialogChar));

    // Hintergrund abdunkeln: der Text soll lesbar sein und man soll
    // sofort sehen, dass das Spiel steht.
    ctx.fillStyle = 'rgba(6,4,10,0.55)';
    ctx.fillRect(0, 0, W, H);

    var bx = 16, by = H - 84, bw = W - 32, bh = 68;
    ctx.fillStyle = 'rgba(8,5,13,0.97)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = SPEAKER[who] ? SPEAKER[who].col : '#8f86a8';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
    rect(bx + 3, by + 3, bw - 6, 1, 'rgba(255,255,255,0.10)');

    if ((G.tick >> 5) % 2 === 0) {
      F.draw(ctx, 'PAUSE', bx + bw - 8, by - 11,
             { color: '#6a6280', align: 'right' });
    }

    var tx = bx + 12;
    var sp = SPEAKER[who];
    if (sp) {
      drawPortrait(who, bx + 10, by + 8,
                   Math.floor(G.dialogChar) < full.length && (G.tick >> 2) % 2 === 0);
      tx = bx + 46;
      F.draw(ctx, sp.name, tx, by + 8, { color: sp.col, shadow: true });
    }

    var lines = F.wrap(shown, bw - (sp ? 64 : 28), 1, 1);
    for (var i = 0; i < lines.length && i < 4; i++) {
      F.draw(ctx, lines[i], tx, by + (sp ? 24 : 16) + i * 11, { color: '#ffffff' });
    }

    if (Math.floor(G.dialogChar) >= full.length && (G.tick >> 3) % 2 === 0) {
      F.draw(ctx, '|', bx + bw - 18, by + bh - 16, { color: '#ffd257' });
    }
  }

  /* ---------- Menüs / Overlays ---------- */

  function drawTitle() {
    // Hintergrund: Küche bei Sonnenaufgang
    drawSky('zimmer');
    drawParallax('zimmer', G.tick * 0.28, 0);

    // Boden
    for (var tx = 0; tx < 33; tx++) {
      P.draw(ctx, SP.tileTop('zimmer'), tx * 16, 240);
      P.draw(ctx, SP.tileFill('zimmer'), tx * 16, 256);
      P.draw(ctx, SP.tileFill('zimmer'), tx * 16, 272);
    }

    // Yusuf & Hussein
    var f = (G.tick >> 3);
    P.drawChar(ctx, 'yusuf', 118, 240, { pose: 'idle', frame: f, face: (G.tick % 200 < 30) ? 'laugh' : 'normal' });
    P.drawChar(ctx, 'huseyin', 392, 240, { pose: 'idle', frame: f, flip: true, face: 'normal' });

    // schwebende Honiggläser
    for (var i = 0; i < 5; i++) {
      var hx = 40 + i * 108, hy = 126 + Math.sin(G.tick * 0.04 + i) * 8;
      P.draw(ctx, 'honig', hx, hy);
    }

    // Logo
    F.draw(ctx, 'BALCI RUN', W / 2, 40, {
      color: '#ffd257', align: 'center', scale: 5, shadow: true,
      shadowColor: '#5e2a10', wave: G.tick * 0.055, waveAmp: 1
    });
    F.draw(ctx, 'YUSUFS HONIG-JAGD', W / 2, 92, {
      color: '#ffe9a8', align: 'center', scale: 2, shadow: true
    });

    var items = ['SPIELEN', 'LEVEL WÄHLEN', 'BESTENLISTE', 'STEUERUNG',
                 S.isMuted() ? 'TON: AUS' : 'TON: AN'];
    for (i = 0; i < items.length; i++) {
      var sel = (i === G.menuIdx);
      var y = 166 + i * 15;
      if (sel) {
        F.draw(ctx, '|', W / 2 - F.measure(items[i], 1, 1) / 2 - 14, y,
               { color: '#ffd257' });
      }
      F.draw(ctx, items[i], W / 2, y, {
        color: sel ? '#ffffff' : '#a094b8', align: 'center', shadow: true
      });
    }

    // dunkler Streifen, damit die Zeile auf dem Boden lesbar bleibt
    ctx.fillStyle = 'rgba(10,6,16,0.72)';
    ctx.fillRect(0, H - 17, W, 17);
    F.draw(ctx, 'EIN SPIEL ÜBER HONIG, SCHLAF UND BRÜDERLICHE GEWALT',
           W / 2, H - 12, { color: '#c0b4d4', align: 'center' });
  }

  function drawSelect() {
    drawSky('festung');
    drawParallax('festung', G.tick * 0.2, 0);
    ctx.fillStyle = 'rgba(8,5,12,0.66)';
    ctx.fillRect(0, 0, W, H);

    F.draw(ctx, 'LEVEL WÄHLEN', W / 2, 24, {
      color: '#ffd257', align: 'center', scale: 3, shadow: true
    });

    for (var i = 0; i < LV.list.length; i++) {
      var unlocked = i < save.unlocked;
      var x = 14 + i * 82, y = 80, cw = 76, ch = 130;
      var sel = (i === G.selIdx);

      ctx.fillStyle = sel ? 'rgba(52,34,20,0.95)' : 'rgba(22,15,30,0.9)';
      ctx.fillRect(x, y + (sel ? -6 : 0), cw, ch);
      ctx.strokeStyle = !unlocked ? '#4a4258' : (sel ? '#ffd257' : '#6a5f80');
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1 + (sel ? -6 : 0), cw - 2, ch - 2);

      var yy = y + (sel ? -6 : 0);
      F.draw(ctx, '' + (i + 1), x + cw / 2, yy + 10, {
        color: unlocked ? '#ffd257' : '#5d5470', align: 'center', scale: 3
      });

      if (!unlocked) {
        F.draw(ctx, 'ZU', x + cw / 2, yy + 52, { color: '#5d5470', align: 'center' });
        F.draw(ctx, 'FRÜH', x + cw / 2, yy + 64, { color: '#5d5470', align: 'center' });
      } else {
        var name = LV.list[i].name;
        var lines = F.wrap(name, cw - 12, 1, 0);
        for (var li = 0; li < lines.length && li < 4; li++) {
          F.draw(ctx, lines[li], x + cw / 2, yy + 44 + li * 10,
                 { color: '#ffffff', align: 'center' });
        }
        var b = save.best[i];
        if (b) {
          P.draw(ctx, 'honig', x + 8, yy + 92);
          F.draw(ctx, 'x' + b.honey, x + 22, yy + 97, { color: '#ffe9a8' });
          F.draw(ctx, 'BEST ' + b.score, x + cw / 2, yy + 112,
                 { color: '#a094b8', align: 'center' });
        } else {
          F.draw(ctx, 'NEU', x + cw / 2, yy + 100, { color: '#8f86a8', align: 'center' });
        }
      }
    }

    F.draw(ctx, 'LINKS / RECHTS WÄHLEN   -   SPRUNG STARTET   -   ESC ZURÜCK',
           W / 2, H - 22, { color: '#a094b8', align: 'center' });
  }

  function drawHowto() {
    drawSky('gym');
    ctx.fillStyle = 'rgba(8,5,12,0.76)';
    ctx.fillRect(0, 0, W, H);
    F.draw(ctx, 'STEUERUNG', W / 2, 18, { color: '#ffd257', align: 'center', scale: 3, shadow: true });

    var rows = [
      ['PFEILE / A D', 'LAUFEN'],
      ['LEERTASTE / W', 'SPRINGEN'],
      ['NOCHMAL IN DER LUFT', 'BAUCH-BOOST (DOPPELSPRUNG)'],
      ['PFEIL RUNTER IN DER LUFT', 'BAUCH-STAMPFER'],
      ['SHIFT / E', 'RENNEN + KIPPE WERFEN'],
      ['ESC / P', 'PAUSE'],
      ['M', 'TON AN / AUS']
    ];
    for (var i = 0; i < rows.length; i++) {
      var y = 54 + i * 16;
      F.draw(ctx, rows[i][0], 30, y, { color: '#ffe9a8' });
      F.draw(ctx, rows[i][1], 210, y, { color: '#ffffff' });
    }

    F.draw(ctx, 'AUF GEGNER SPRINGEN MACHT SIE PLATT.', 30, 180, { color: '#a094b8' });
    F.draw(ctx, 'DER BAUCH-STAMPFER ZERBRICHT KISTEN.', 30, 192, { color: '#a094b8' });
    F.draw(ctx, 'MIT DEM KIPPEN-PÄCKCHEN WIRFST DU KIPPEN.', 30, 204, { color: '#a094b8' });
    F.draw(ctx, 'EIN TREFFER KOSTET DANN NUR DAS PÄCKCHEN.', 30, 216, { color: '#a094b8' });
    F.draw(ctx, '100 HONIG = EIN EXTRALEBEN.', 30, 228, { color: '#a094b8' });
    F.draw(ctx, 'STEH ZU LANGE STILL UND YUSUF SCHLÄFT EIN.', 30, 240, { color: '#a094b8' });
    F.draw(ctx, 'AM HANDY: QUER HALTEN. A = SPRUNG, B = KIPPE.', 30, 252, { color: '#8f86a8' });

    F.draw(ctx, 'BELIEBIGE TASTE = ZURÜCK', W / 2, H - 18,
           { color: '#ffd257', align: 'center' });
  }

  function drawNameEntry() {
    drawSky('strasse');
    drawParallax('strasse', G.tick * 0.2, 0);
    ctx.fillStyle = 'rgba(8,5,12,0.78)';
    ctx.fillRect(0, 0, W, H);

    F.draw(ctx, 'DURCHGESPIELT!', W / 2, 22, {
      color: '#ffd257', align: 'center', scale: 3, shadow: true,
      wave: G.tick * 0.06, waveAmp: 1
    });
    F.draw(ctx, 'TRAG DICH IN DIE BESTENLISTE EIN', W / 2, 56,
           { color: '#c8b8e0', align: 'center' });

    var sec = Math.floor(G.time / 60);
    F.draw(ctx, 'PUNKTE ' + G.player.score + '   HONIG ' + G.player.honey +
                '   ZEIT ' + fmtTime(sec) + '   TODE ' + (G.player.deaths || 0),
           W / 2, 72, { color: '#ffe9a8', align: 'center' });

    // Namensfelder
    var slotW = 34, total = 6 * slotW, sx = (W - total) / 2;
    for (var i = 0; i < 6; i++) {
      var x = sx + i * slotW, sel = (i === G.namePos);
      ctx.fillStyle = sel ? 'rgba(80,58,24,0.95)' : 'rgba(26,18,34,0.9)';
      ctx.fillRect(x + 2, 104, slotW - 6, 44);
      ctx.strokeStyle = sel ? '#ffd257' : '#6a5f80';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 3, 105, slotW - 8, 42);
      F.draw(ctx, NAME_CHARS.charAt(G.nameIdx[i]), x + slotW / 2 - 2, 116,
             { color: '#ffffff', align: 'center', scale: 3 });
      if (sel && (G.tick >> 3) % 2 === 0) {
        F.draw(ctx, '`', x + slotW / 2 - 2, 92, { color: '#ffd257', align: 'center' });
        F.draw(ctx, '\\', x + slotW / 2 - 2, 152, { color: '#ffd257', align: 'center' });
      }
    }

    F.draw(ctx, 'HOCH / RUNTER  =  BUCHSTABE', W / 2, 180,
           { color: '#a094b8', align: 'center' });
    F.draw(ctx, 'LINKS / RECHTS  =  FELD', W / 2, 194,
           { color: '#a094b8', align: 'center' });
    if ((G.tick >> 4) % 2 === 0) {
      F.draw(ctx, 'SPRUNG = EINTRAGEN', W / 2, 214,
             { color: '#ffd257', align: 'center', scale: 2 });
    }

    P.drawChar(ctx, 'yusuf', 60, H - 16, { pose: 'cheer', face: 'laugh', frame: (G.tick >> 3) });
    P.drawChar(ctx, 'huseyin', W - 60, H - 16,
               { pose: 'idle', face: 'normal', frame: (G.tick >> 3), flip: true });
  }

  function drawScores() {
    drawSky('zimmer');
    drawParallax('zimmer', G.tick * 0.14, 0);
    ctx.fillStyle = 'rgba(8,5,12,0.82)';
    ctx.fillRect(0, 0, W, H);

    F.draw(ctx, 'BESTENLISTE', W / 2, 16, {
      color: '#ffd257', align: 'center', scale: 3, shadow: true
    });

    var list = (G.scoreList || loadScores()).slice();
    var cat = SCORE_CATS[G.scoreCat || 0];

    // Kategorie-Leiste
    var cx0 = 60;
    for (var c = 0; c < SCORE_CATS.length; c++) {
      var on = (c === (G.scoreCat || 0));
      var label = SCORE_CATS[c].k;
      var lw = F.measure(label, 1, 1);
      if (on) rect(cx0 - 5, 42, lw + 10, 13, 'rgba(255,210,87,0.22)');
      F.draw(ctx, label, cx0, 45, { color: on ? '#ffd257' : '#8f86a8' });
      cx0 += lw + 26;
    }
    F.draw(ctx, '~ SORTIEREN |', W - 40, 45, { color: '#6a6280', align: 'right' });

    if (!list.length) {
      F.draw(ctx, 'NOCH NIEMAND HAT DURCHGESPIELT.', W / 2, 124,
             { color: '#c8b8e0', align: 'center' });
      F.draw(ctx, 'YUSUF FINDET DAS PEINLICH.', W / 2, 140,
             { color: '#8f86a8', align: 'center' });
    } else {
      list.sort(cat.cmp);
      F.draw(ctx, 'PLATZ', 40, 66, { color: '#8f86a8' });
      F.draw(ctx, 'NAME', 92, 66, { color: '#8f86a8' });
      F.draw(ctx, 'HONIG', 196, 66, { color: '#8f86a8' });
      F.draw(ctx, 'ZEIT', 258, 66, { color: '#8f86a8' });
      F.draw(ctx, 'TODE', 316, 66, { color: '#8f86a8' });
      F.draw(ctx, cat.k, W - 40, 66, { color: '#ffd257', align: 'right' });
      rect(36, 76, W - 72, 1, '#4a4258');

      for (var i = 0; i < list.length && i < MAX_SCORES; i++) {
        var e = list[i], y = 84 + i * 17;
        var mine = (G.lastName && e.n === G.lastName && e.s === G.lastScore);
        var col = mine ? '#ffd257' : (i === 0 ? '#ffe9a8' : '#ffffff');
        if (mine) rect(34, y - 3, W - 68, 15, 'rgba(255,210,87,0.14)');
        F.draw(ctx, (i + 1) + '.', 40, y, { color: col });
        F.draw(ctx, e.n, 92, y, { color: col });
        F.draw(ctx, 'x' + e.h, 196, y, { color: col });
        F.draw(ctx, fmtTime(e.t), 258, y, { color: col });
        F.draw(ctx, '' + e.d, 316, y, { color: col });
        F.draw(ctx, cat.val(e), W - 40, y, { color: col, align: 'right' });
      }
    }

    F.draw(ctx, 'LINKS / RECHTS = SORTIEREN     SPRUNG = ZURÜCK', W / 2, H - 14,
           { color: '#ffd257', align: 'center' });
  }

  function drawTeaser() {
    drawSky('strasse');
    drawParallax('strasse', G.tick * 0.3, 0);
    ctx.fillStyle = 'rgba(8,5,12,0.66)';
    ctx.fillRect(0, 0, W, H);
    drawParticles(0, 0);

    var a = Math.min(1, G.endScroll / 60);
    ctx.globalAlpha = a;
    F.draw(ctx, 'DEMNÄCHST', W / 2, 54, {
      color: '#8f86a8', align: 'center', scale: 2
    });
    F.draw(ctx, 'ESATS', W / 2, 84, {
      color: '#6fc8e8', align: 'center', scale: 5, shadow: 1,
      shadowColor: '#10303f', wave: G.tick * 0.05, waveAmp: 1
    });
    F.draw(ctx, "JUMP'N'RUN", W / 2, 132, {
      color: '#ffd257', align: 'center', scale: 4, shadow: 1, shadowColor: '#5e2a10'
    });
    ctx.globalAlpha = 1;

    P.draw(ctx, 'esat', W / 2 - 8, 178);
    if (G.endScroll > 90) {
      F.draw(ctx, 'ER WEISS NOCH NICHTS DAVON.', W / 2, H - 44,
             { color: '#c8b8e0', align: 'center' });
    }
    if (G.endScroll > 150 && (G.tick >> 4) % 2 === 0) {
      F.draw(ctx, 'SPRUNG = BESTENLISTE', W / 2, H - 18,
             { color: '#ffd257', align: 'center' });
    }
  }

  function drawPause() {
    ctx.fillStyle = 'rgba(8,5,12,0.78)';
    ctx.fillRect(0, 0, W, H);
    F.draw(ctx, 'PAUSE', W / 2, 100, { color: '#ffd257', align: 'center', scale: 4, shadow: true });
    F.draw(ctx, 'YUSUF MACHT SOWIESO GERADE PAUSE.', W / 2, 146,
           { color: '#c8b8e0', align: 'center' });
    F.draw(ctx, 'SPRUNG = WEITER    ESC = HAUPTMENÜ', W / 2, 176,
           { color: '#ffffff', align: 'center' });
    F.draw(ctx, 'M = TON ' + (S.isMuted() ? 'AN' : 'AUS'), W / 2, 192,
           { color: '#a094b8', align: 'center' });
  }

  function drawResults() {
    ctx.fillStyle = 'rgba(8,5,12,0.84)';
    ctx.fillRect(0, 0, W, H);
    var p = G.player;
    F.draw(ctx, 'LEVEL GESCHAFFT!', W / 2, 40, {
      color: '#ffd257', align: 'center', scale: 3, shadow: true,
      wave: G.tick * 0.07, waveAmp: 1
    });

    var sec = Math.floor(G.time / 60);
    var rows = [
      ['HONIG GESAMMELT', 'x' + p.honey],
      ['PUNKTE', '' + p.score],
      ['ZEIT', Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2)],
      ['LEBEN ÜBRIG', '' + Math.max(0, p.lives)]
    ];
    for (var i = 0; i < rows.length; i++) {
      var y = 96 + i * 20;
      F.draw(ctx, rows[i][0], 130, y, { color: '#c8b8e0' });
      F.draw(ctx, rows[i][1], W - 130, y, { color: '#ffffff', align: 'right' });
    }

    P.drawChar(ctx, 'yusuf', 90, 210, { pose: 'cheer', face: 'laugh', frame: (G.tick >> 3) });
    F.draw(ctx, 'HÖ HÖ HÖÖÖ!', 130, 186, { color: '#ffd257' });

    if (G.resultTimer > 40 && (G.tick >> 4) % 2 === 0) {
      F.draw(ctx, 'SPRUNG DRÜCKEN FÜR WEITER', W / 2, H - 26,
             { color: '#ffd257', align: 'center' });
    }
  }

  function drawGameover() {
    ctx.fillStyle = 'rgba(8,5,12,0.86)';
    ctx.fillRect(0, 0, W, H);
    F.draw(ctx, 'GAME OVER', W / 2, 70, { color: '#ff6a6a', align: 'center', scale: 4, shadow: true });
    F.draw(ctx, 'HUSEYIN HAT ES GESEHEN. LEIDER.', W / 2, 120,
           { color: '#c8b8e0', align: 'center' });
    F.draw(ctx, 'ER MACHT JETZT EINEN WITZ DARÜBER. JAHRELANG.', W / 2, 136,
           { color: '#8f86a8', align: 'center' });
    P.drawChar(ctx, 'yusuf', W / 2 - 60, 220, { pose: 'sleep', face: 'sleep', frame: (G.tick >> 4) });
    P.drawChar(ctx, 'huseyin', W / 2 + 60, 220, { pose: 'idle', face: 'laugh', frame: (G.tick >> 3), flip: true });
    if ((G.tick >> 4) % 2 === 0) {
      F.draw(ctx, 'SPRUNG = NOCHMAL     ESC = HAUPTMENÜ', W / 2, H - 22,
             { color: '#ffd257', align: 'center' });
    }
  }

  function drawEnding() {
    drawSky('garten');
    drawParallax('garten', G.tick * 0.16, 0);
    ctx.fillStyle = 'rgba(8,5,12,0.42)';
    ctx.fillRect(0, 0, W, H);

    for (var tx = 0; tx < 33; tx++) {
      P.draw(ctx, SP.tileTop('garten'), tx * 16, 240);
      P.draw(ctx, SP.tileFill('garten'), tx * 16, 256);
      P.draw(ctx, SP.tileFill('garten'), tx * 16, 272);
    }
    var f = (G.tick >> 3);
    P.drawChar(ctx, 'yusuf', 210, 240, { pose: 'idle', face: 'eat', frame: f });
    P.drawChar(ctx, 'huseyin', 300, 240, { pose: 'idle', face: 'eat', frame: f, flip: true });
    P.draw(ctx, 'honig', 248, 214);
    drawParticles(0, 0);

    var credits = [
      '', '', '',
      'BALCI RUN',
      '',
      'HAUPTROLLE',
      'YUSUF BALCI',
      'LOCKEN, GRÜNE AUGEN, GROSSES HERZ',
      '',
      'ENDGEGNER',
      'HUSEYIN BALCI',
      'DERSELBE MENSCH, NUR DÜNN UND LAUT',
      '',
      'HONIG',
      'SEHR VIEL HONIG',
      '',
      'DÖNER-BERATUNG',
      'YUSUF BALCI',
      '',
      'SCHLAF-KOORDINATION',
      'YUSUF BALCI',
      '',
      'UNGEFRAGTE ERNÄHRUNGSTIPPS',
      'HUSEYIN BALCI',
      '',
      'KEIN SALAT WURDE BEI DEN',
      'DREHARBEITEN GEGESSEN',
      '',
      'DANKE FÜRS SPIELEN!',
      '',
      'HÖ HÖ HÖÖÖ',
      '', '', ''
    ];
    for (var i = 0; i < credits.length; i++) {
      var y = H + 20 + i * 16 - G.endScroll;
      if (y < -20 || y > H) continue;
      var big = (credits[i] === 'BALCI RUN' || credits[i] === 'HÖ HÖ HÖÖÖ');
      F.draw(ctx, credits[i], W / 2, y, {
        color: big ? '#ffd257' : '#ffffff',
        align: 'center', scale: big ? 3 : 1, shadow: true
      });
    }

    if (G.endScroll > 620 && (G.tick >> 4) % 2 === 0) {
      F.draw(ctx, 'SPRUNG = HAUPTMENÜ', W / 2, H - 16,
             { color: '#ffd257', align: 'center' });
    }
  }

  /* ================= Skalierung ================= */

  function resize() {
    var pad = (window.matchMedia && window.matchMedia('(pointer:coarse)').matches) ? 0 : 24;
    var sw = (window.innerWidth - pad) / W;
    var sh = (window.innerHeight - pad) / H;
    var s = Math.max(1, Math.min(sw, sh));
    // Ganzzahlige Skalierung, solange sie nicht zu viel Platz verschenkt
    var si = Math.floor(s);
    if (si >= 1 && (s - si) < 0.34) s = si;
    canvas.style.width = Math.round(W * s) + 'px';
    canvas.style.height = Math.round(H * s) + 'px';
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });

  /* ================= Start ================= */

  global.Input.init(canvas);
  resize();

  // Dummy-Welt, damit das Titelbild etwas zum Zeichnen hat
  G.player = new E.Player(0, 0);
  loadLevel(0, false);
  G.state = 'title';
  G.banner = 0;

  var STEP = 1000 / 60;
  var acc = 0, last = performance.now();

  function frame(now) {
    var dt = now - last;
    last = now;
    if (dt > 250) dt = STEP;     // nach Tab-Wechsel nicht aufholen
    acc += dt;
    var guard = 0;
    while (acc >= STEP && guard++ < 5) { update(); acc -= STEP; }
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Musik erst nach der ersten Eingabe (Browser-Regel)
  function firstGesture() {
    S.resume();
    if (G.state === 'title') S.music('menu');
    window.removeEventListener('keydown', firstGesture);
    window.removeEventListener('pointerdown', firstGesture);
    window.removeEventListener('touchstart', firstGesture);
  }
  window.addEventListener('keydown', firstGesture);
  window.addEventListener('pointerdown', firstGesture);
  window.addEventListener('touchstart', firstGesture);

  // Debug-Haken: erlaubt schrittweises Durchlaufen ohne requestAnimationFrame.
  G._update = update;
  G._render = render;
  G._loadLevel = loadLevel;
  G._loadScores = loadScores;
  G._storeScore = storeScore;

  global.G = G;

})(window);
