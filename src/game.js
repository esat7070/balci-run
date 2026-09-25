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
  var save = { unlocked: 1, best: [], completed: false };
  (function () {
    var raw = null;
    try { raw = localStorage.getItem('balci_save'); } catch (e) { return; }
    if (!raw || typeof raw !== 'string' || raw.length > 8000) return;
    var s;
    try { s = JSON.parse(raw); } catch (e) { return; }
    if (!s || typeof s !== 'object') return;

    var num = function (v, max) {
      var x = Math.floor(Number(v));
      return isFinite(x) ? Math.max(0, Math.min(max, x)) : 0;
    };

    var n = Math.floor(Number(s.unlocked));
    save.unlocked = isFinite(n) ? Math.max(1, Math.min(LV.list.length, n)) : 1;
    save.completed = (s.completed === true);

    if (Array.isArray(s.best)) {
      // Frueher fest "8": die Bestzeiten ab Level 9 gingen beim Neuladen verloren
      for (var i = 0; i < s.best.length && i < LV.list.length; i++) {
        var b = s.best[i];
        if (!b || typeof b !== 'object') { save.best[i] = null; continue; }
        save.best[i] = {
          honey: num(b.honey, 99999),
          score: num(b.score, 9999999),
          time: num(b.time, 359999)
        };
      }
    }

    // Laufender Durchgang (fuer "WEITER"). Die Pruefsumme wird erst
    // beim Benutzen kontrolliert — siehe validRun().
    var r = s.run;
    if (r && typeof r === 'object') {
      // Frueher auf Level 7 gedeckelt: ab Level 8 passte die Pruefsumme
      // nicht mehr und WEITER hat den Durchgang verworfen.
      var lastIdx = LV.list.length - 1;
      save.run = {
        from: num(r.from, lastIdx), next: num(r.next, lastIdx),
        s: num(r.s, 9999999), h: num(r.h, 99999), t: num(r.t, 359999),
        d: num(r.d, 9999), e: num(r.e, 9999), l: num(r.l, 99),
        g: typeof r.g === 'string' ? r.g.slice(0, 16) : ''
      };
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
    endScroll: 0,
    // Handy/Tablet: grobe Zeigergenauigkeit = Finger
    touch: !!(global.matchMedia && global.matchMedia('(pointer:coarse)').matches)
  };

  /** Etwas in N Spiel-Ticks ausführen. Bewusst NICHT setTimeout:
      das läuft in Echtzeit weiter, auch wenn das Spiel pausiert ist. */
  G.after = function (ticks, fn) { G.pending = { t: ticks, fn: fn }; };

  G.shake = function (amp, dur) {
    G.cam.shake = Math.max(G.cam.shake, dur);
    G.cam.shakeAmp = Math.max(G.cam.shakeAmp, amp);
  };
  G.cameraTopY = function () { return G.cam.y - 20; };
  G.viewW = function () { return W; };
  G.showDialog = function (lines, after) { startDialog(lines, after); };
  /** Sprechblase ueber einer Figur, ohne das Spiel anzuhalten (Level 12). */
  G.talk = {};
  G.say = function (who, text, dur) { G.talk[who] = { text: text, t: dur || 80, max: dur || 80 }; };
  /** Kurzes farbiges Aufblitzen, z.B. bei einer Boss-Verwandlung. */
  G.flashScreen = function (col, dur) { G.flashFx = { col: col, t: dur, max: dur }; };

  /** Geschosse und Gegner entschaerfen, OHNE die Listen zu veraendern.
      Diese Rueckrufe koennen mitten im Geschoss-Durchlauf kommen
      (Kippe trifft Boss) — geleert wird erst beim Aufraeumen danach. */
  function clearShots() {
    for (var i = 0; i < G.projectiles.length; i++) {
      if (G.projectiles[i]) G.projectiles[i].dead = true;
    }
  }
  function clearEnemies() {
    for (var i = 0; i < G.enemies.length; i++) {
      var e = G.enemies[i];
      if (e && !e.dead) { e.dead = true; e.deadTimer = 71; }
    }
  }
  G.addItem = function (t, x, y, popped) { G.items.push(new E.Item(t, x, y, popped)); };
  G.addProjectile = function (t, x, y, vx, vy, friendly) {
    var pr = new E.Projectile(t, x, y, vx, vy, friendly);
    // Alles, was waehrend eines Bosskampfes vom Gegner kommt, fliegt
    // durch die Arena-Plattformen hindurch (siehe Projectile.solidAt).
    pr.bossShot = !!(G.boss && !G.boss.dead && !friendly);
    G.projectiles.push(pr);
    return pr;
  };

  /* ================= Level laden ================= */

  function loadLevel(idx, fromCheckpoint) {
    // Ein noch offener Dialog gehoert zum alten Level
    G.dialog = null; G.dialogAfter = null;
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
    // Level 8 ist keine Huepfstrecke, sondern die Szene aus eat.js
    G.eat = (lvl.eat && global.Eat) ? global.Eat.init(G, lvl) : null;
    G.kasse = null;
    G.scene = null;           // Schlafengehen nach Level 11
    G.cut = null;             // Lennarts Auftritt in Level 12
    G.autoAx = null; G.autoMax = 0; G.camFocus = null;
    G.talk = {};
    // Der Rausch gehoert zum Kampf: wer stirbt, wacht nuechtern auf.
    G.drunk = 0;
    // Lennart bleibt liegen, auch wenn Yusuf danach mal stirbt
    if (!G.respawning) { G.lennartLie = null; G.kickHint = false; }

    var i;
    for (i = 0; i < lvl.enemies.length; i++) {
      var en = lvl.enemies[i];
      G.enemies.push(new E.Enemy(en.t, en.x, en.y));
    }
    // Eingesammeltes bleibt eingesammelt: nach einem Tod liegt nur das
    // wieder da, was seit dem letzten Checkpoint dazukam — alles davor
    // zaehlt ja noch auf dem Konto. Sonst faehrt man dieselbe Honigspur
    // beliebig oft ab.
    G.itemsTaken = fromCheckpoint ? copyMap(G.checkpointItems) : {};
    for (i = 0; i < lvl.items.length; i++) {
      if (G.itemsTaken[i]) continue;
      var it = lvl.items[i];
      var itObj = new E.Item(it.t, it.x * T + T / 2, it.y * T + T / 2, false);
      itObj.idx = i;
      G.items.push(itObj);
    }
    // Dasselbe fuer Bloecke und Kisten
    if (fromCheckpoint && G.checkpointBlocks) restoreBlocks(G.checkpointBlocks);

    G.checkpointsHit = [];
    var sp = (fromCheckpoint && G.checkpoint) ? G.checkpoint : lvl.spawn;
    if (!G.player) G.player = new E.Player(sp[0] * T, sp[1] * T - 26);
    else {
      var keep = {
        lives: G.player.lives, honey: G.player.honey, score: G.player.score,
        deaths: G.player.deaths || 0, eatCount: G.player.eatCount || 0
      };
      G.player.reset(sp[0] * T, sp[1] * T - 26);
      G.player.lives = keep.lives;
      G.player.deaths = keep.deaths;
      // Beim Tod zaehlt der Stand vom letzten Checkpoint. Sonst koennte
      // man den Honig einsammeln, absichtlich sterben und alles nochmal
      // einsammeln — beliebig oft.
      if (fromCheckpoint && G.checkpointStats) {
        G.player.honey = G.checkpointStats.honey;
        G.player.score = G.checkpointStats.score;
        G.player.eatCount = G.checkpointStats.eatCount;
      } else {
        G.player.honey = keep.honey;
        G.player.score = keep.score;
        G.player.eatCount = keep.eatCount;
      }
    }
    // Im Mustang ist die Trefferbox so breit wie das (doppelt grosse) Auto,
    // auf dem Fahrrad etwas breiter und hoeher als zu Fuss.
    G.player.w = lvl.driving ? 64 : (lvl.bike ? 20 : 12);
    G.player.h = lvl.driving ? 24 : (lvl.bike ? 28 : 26);
    G.player.y = sp[1] * T - G.player.h;
    // Esat kommt mit (Level 12 auf dem Rad, Level 14 und 15 zu Fuss) —
    // immer auf Yusufs Spur, siehe updateRider
    G.rider = (lvl.bike || lvl.buddy) ? { hist: [], talkT: 260 } : null;
    G.dizzy = 0;
    // Nach einem Tod kurz unverwundbar (blinkt), damit ein Gegner neben
    // dem Checkpoint nicht sofort das naechste Herz nimmt.
    if (G.respawning) G.player.invuln = 90;

    if (!fromCheckpoint) {
      saveCheckpointState();
      G.checkpointItems = {}; G.checkpointBlocks = null;
    }
    if (!fromCheckpoint) G.player.flipCount = 0;
    if (!fromCheckpoint) {
      G.checkpoint = null; G.bossIntroSeen = false; G.bossHalf = false;
    }
    // Wer in die Kolonne eingestiegen ist, bleibt es auch nach einem Tod —
    // sonst kommt Erfans Dialog nach jedem Sturz wieder.
    if (!G.respawning || !G.convoySeen) G.convoySeen = {};

    // Level 6: Kolonne und Ampeln. Wer schon eingestiegen war, ist nach
    // einem Checkpoint direkt wieder dabei — ohne den Dialog nochmal.
    G.convoy = [];
    G.convoyTriggers = [];
    (lvl.convoy || []).forEach(function (c) {
      if (c.at * T < G.player.x || G.convoySeen[c.who]) G.convoy.push(convoyCar(c.who));
      else G.convoyTriggers.push(c);
    });
    G.ampeln = (lvl.ampeln || []).map(function (ax, n) {
      return { x: ax * T, off: n * 97, passed: ax * T < G.player.x };
    });

    G.cam.x = Math.max(0, Math.min(lvl.w * T - W, G.player.cx() - W / 2));
    G.cam.y = Math.max(0, Math.min(lvl.h * T - H, G.player.y - H / 2));
    G.banner = 190;
    G.combo = 0;
    G.rescued = false;
    G.bossCleared = false;
    if (!fromCheckpoint) G.time = 0;
    G.frozen = false;
  }

  /* ================= Level 6: Kolonne & Ampeln ================= */

  // Autos in der Kolonne: fahren auf der hinteren Spur mit
  var CONVOY_CARS = {
    erfan:   { spr: 'cla',     head: 'erfan_head',   off: -86,  name: 'ERFAN',   col: '#e8c24a' },
    lennart: { spr: 'eklasse', head: 'lennart_head', off: -166, name: 'LENNART', col: '#e8b894' }
  };

  function convoyCar(who) {
    var p = G.player;
    return { who: who, def: CONVOY_CARS[who], x: p.cx() + CONVOY_CARS[who].off - 200,
             y: p.feet(), t: 0 };
  }

  var MIRKAN_OFF = 58;         // Mirkan faehrt leicht versetzt vorne mit
  var AMPEL_CYCLE = 360;      // gruen 0-179, gelb 180-219, rot 220-359
  function ampelColor(a) {
    var t = (G.tick + a.off) % AMPEL_CYCLE;
    return t < 180 ? 'gruen' : (t < 220 ? 'gelb' : 'rot');
  }

  function updateDriving(p) {
    var i;
    // Neue Kollegen
    if (G.convoyTriggers.length && p.cx() > G.convoyTriggers[0].at * T) {
      var c = G.convoyTriggers.shift();
      G.convoy.push(convoyCar(c.who));
      G.convoySeen[c.who] = true;
      S.play('oneUp');
      if (LV.convoy && LV.convoy[c.who]) {
        startDialog(LV.convoy[c.who], function () { G.state = 'play'; });
      }
    }
    // Kolonne folgt weich hinter Yusuf
    for (i = 0; i < G.convoy.length; i++) {
      var m = G.convoy[i];
      m.t++;
      m.x += ((p.cx() + m.def.off) - m.x) * 0.07;
      m.y += (p.feet() - m.y) * 0.12;
      if (m.t % 7 === 0) {
        G.particles.spawn({ x: m.x - 34, y: m.y - 14, vx: -0.6, vy: -0.2, life: 20,
                            col: '#8e8880', size: 2, grav: -0.01 });
      }
    }
    // Ampeln
    for (i = 0; i < G.ampeln.length; i++) {
      var a = G.ampeln[i];
      if (a.passed || p.dead || p.cx() < a.x + 8) continue;
      a.passed = true;
      var col = ampelColor(a);
      if (col === 'rot') {
        G.flashScreen('#ffffff', 22);
        S.play('bossHit');
        var pen = Math.min(p.score, 150);
        p.score -= pen;
        G.floats.add(p.cx(), p.y - 30, 'GEBLITZT! -' + pen, '#ff6a6a', 90);
        G.floats.add(p.cx(), p.y - 44, 'ROT WAR SCHON 3 SEKUNDEN.', '#f4f4ee', 90);
      } else if (col === 'gruen') {
        p.score += 50;
        G.floats.add(p.cx(), p.y - 30, 'GRÜNE WELLE +50', '#8cd85a', 70);
      } else {
        G.floats.add(p.cx(), p.y - 30, 'DUNKELGELB. GERADE NOCH.', '#ffd257', 70);
      }
    }
  }

  /* Szenen ohne Huepfen (eat.js): Schlafen, Essen am Tisch, Shisha. */
  function sceneMod() {
    var t = G.scene && G.scene.type;
    return t === 'mahl' ? global.Mahl : (t === 'shisha' ? global.Shisha : global.Schlaf);
  }

  /** Eine Szene starten: Blende ist schon dunkel, danach laeuft sie allein. */
  function startScene(sc) {
    G.scene = sc;
    G.particles.list.length = 0; G.floats.list.length = 0;
    G.frozen = true;
    G.state = 'play';
  }

  /* ================= Level 12: Esat faehrt mit ================= */

  // Esat faehrt Yusufs Spur nach, ein Stueck dahinter. So springt er ueber
  // dieselben Rampen und Luecken, ohne eigene Physik zu brauchen.
  var RIDER_GAP = 46;

  function updateRider(p) {
    var r = G.rider, h = r.hist;
    if (!h.length) h.push({ x: p.cx() - RIDER_GAP, y: p.feet(), a: 0, f: 1 });
    var last = h[h.length - 1];
    var here = { x: p.cx(), y: p.feet(), a: p.flipping ? p.flipA : 0, f: p.facing };
    r.moving = Math.abs(here.x - last.x) + Math.abs(here.y - last.y) >= 2;
    if (r.moving) {
      h.push(here);
      if (h.length > 160) h.shift();
    }
    // Von hinten die Wegstrecke abzaehlen, bis RIDER_GAP erreicht ist
    var rest = RIDER_GAP, i = h.length - 1, pos = h[0];
    while (i > 0) {
      var a = h[i], b = h[i - 1];
      var d = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
      if (d >= rest) {
        var k = rest / Math.max(0.001, d);
        pos = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, a: b.a, f: b.f };
        break;
      }
      rest -= d; i--;
    }
    r.pos = pos;
    if (r.moving) r.anim = (r.anim || 0) + 1;

    // Ab und zu hat Esat etwas zu sagen
    if (!G.cut && !p.dead && --r.talkT <= 0) {
      r.talkT = 420 + ((Math.random() * 300) | 0);
      var l = LV[G.lvl.buddyLines] || LV.esatRideLines;
      G.say('esat', l[(Math.random() * l.length) | 0], 100);
    }
  }

  /** Oberkante des Bodens an einer Stelle (fuer Lennart und seine Teile). */
  function groundAt(px) {
    var w = G.world, tx = Math.floor(px / T);
    if (tx < 0 || tx >= w.w) return null;
    for (var ty = 0; ty < w.h; ty++) if (w.solid(tx, ty)) return ty * T;
    return null;
  }

  /* ================= Level 12: Lennarts Auftritt =================
     Yusuf und Esat bremsen, es droehnt von hinten. Lennart rast heran,
     springt ueber die beiden (Standbild mit Namen, wie im Kino), macht
     einen Salto — und beim dritten Sprung fliegt er auf die Nase. Das
     Rad ist hin. Yusuf und Esat fahren einfach vorbei. */

  function updateLennart(p) {
    var c = G.cut, cl = LV.lennartCut, L;
    if (!c) {
      if (G.lennartLie || p.won || p.dead) return;
      var at = G.lvl.lennart.at * T;
      if (p.cx() > at && p.cx() < at + 12 * T) {
        G.cut = { t: 0, phase: 'stopp', bars: 0, L: null, debris: [], said: {} };
        G.autoAx = 0;                     // Yusuf und Esat bremsen
        G.autoMax = 0;
      }
      return;
    }

    c.t++;
    c.bars = (c.phase === 'aus') ? Math.max(0, c.bars - 0.06) : Math.min(1, c.bars + 0.05);
    L = c.L;
    if (L && c.phase !== 'karte') moveLennart(c, L);
    moveDebris(c.debris);

    switch (c.phase) {
      case 'stopp':
        if (c.t === 16) G.say('esat', cl.esatHear, 70);
        if (c.t === 24 || c.t === 46 || c.t === 64) { S.play('bossRoar'); G.shake(2, 10); }
        if (c.t === 50) G.say('yusuf', cl.yusufHear, 70);
        if (c.t >= 86) {
          // Er kommt von hinten, schon in der Luft
          var sx = G.cam.x - 40;
          var gy0 = groundAt(sx);
          c.L = L = { x: sx, y: (gy0 === null ? p.feet() : gy0) - 30, vx: 7.5, vy: -2,
                      a: 0, spin: 0, air: true, jumps: 0, rideT: 0, lie: false };
          c.phase = 'kommt';
          S.music('bossfinal');
          G.say('lennart', cl.jump1, 90);
        }
        break;

      case 'kommt':
        // Direkt hinter den beiden: Absprung, drueber weg
        if (L.jumps === 0 && !L.air && L.x > p.cx() - 90) {
          L.vy = -9; L.air = true; L.jumps = 1;
          S.play('doubleJump');
        }
        // Ganz oben: Standbild mit Namen
        if (L.jumps === 1 && L.air && L.vy >= -0.5 && !c.cardDone) {
          c.phase = 'karte'; c.card = 0; c.cardDone = true;
          G.flashScreen('#ffffff', 14);
          S.play('power');
        }
        break;

      case 'karte':
        c.card++;
        if (c.card >= 100) { c.phase = 'fahrt'; L.vx = 6.5; }
        break;

      case 'fahrt':
        G.camFocus = { x: L.x + 40, y: L.y - 20 };
        if (!L.air) L.rideT++;
        if (L.jumps === 1 && !L.air && L.rideT >= 18) {
          // Zweiter Sprung: ein sauberer Rueckwaertssalto
          L.vy = -9.5; L.air = true; L.jumps = 2; L.rideT = 0;
          L.spin = Math.PI * 2 / 36; L.spinLeft = Math.PI * 2;
          S.play('doubleJump');
        }
        if (L.jumps === 2 && !L.air && L.rideT === 1) G.say('lennart', cl.jump2, 70);
        if (L.jumps === 2 && !L.air && L.rideT >= 14) {
          // Dritter Sprung: dreht zu weit. Viel zu weit.
          L.vy = -9.5; L.air = true; L.jumps = 3; L.rideT = 0;
          L.spin = Math.PI * 2 / 28; L.spinLeft = 99;
          S.play('doubleJump');
          G.say('lennart', cl.jump3, 60);
        }
        break;

      case 'crash':
        G.camFocus = { x: L.x, y: L.y - 20 };
        if (++c.lieT === 34) G.say('lennart', cl.crash, 60);
        if (c.lieT === 100) G.say('lennart', cl.lying, 90);
        if (c.lieT >= 170) {
          c.phase = 'vorbei';
          G.camFocus = null;
          G.autoAx = 1;
          G.autoMax = 4.2;
        }
        break;

      case 'vorbei':
        // Einfach weiterfahren. Nichts gesehen.
        var dist = L.x - p.cx();
        G.autoMax = dist < 190 ? 2.2 : 4.2;
        if (dist < 170 && !c.said.e1) { c.said.e1 = true; G.say('esat', cl.esatPass, 90); }
        if (dist < 90 && !c.said.y1) { c.said.y1 = true; G.say('yusuf', cl.yusufPass, 70); }
        if (dist < 24 && !c.said.l1) { c.said.l1 = true; G.say('lennart', cl.lennartPass, 110); }
        if (dist < -70 && !c.said.e2) { c.said.e2 = true; G.say('esat', cl.esatAfter, 90); }
        if (dist < -110) {
          c.phase = 'aus';
          G.autoAx = null; G.autoMax = 0;
          G.lennartLie = { x: L.x, y: L.y, debris: c.debris };
          S.music(G.lvl.music);
        }
        break;

      case 'aus':
        if (c.bars <= 0) G.cut = null;
        break;
    }
  }

  function moveLennart(c, L) {
    if (L.lie) {
      // Er rutscht noch ein Stueck auf dem Bauch
      L.vx *= 0.85;
      L.x += L.vx;
      L.a += (Math.PI / 2 - L.a) * 0.3;
      return;
    }
    L.x += L.vx;
    if (L.air) {
      L.vy += 0.5;
      L.y += L.vy;
      if (L.spin) {
        L.a += L.spin;
        if (L.spinLeft !== undefined) {
          L.spinLeft -= Math.abs(L.spin);
          if (L.spinLeft <= 0) { L.spin = 0; L.a = 0; }
        }
      }
      var gy = groundAt(L.x);
      if (gy !== null && L.y >= gy && L.vy >= 0) {
        L.y = gy; L.vy = 0; L.air = false; L.rideT = 0;
        if (L.jumps >= 3) lennartCrash(c, L);
        else { L.a = 0; L.spin = 0; }
      }
    } else {
      var gy2 = groundAt(L.x);
      if (gy2 === null || gy2 > L.y + 2) L.air = true;
      else L.y = gy2;
    }
    // Nitro: Flammen aus dem Hinterrad, Staub vom Boden
    if (!L.lie && G.tick % 2 === 0) {
      G.particles.spawn({ x: L.x - 14, y: L.y - 8, vx: -2 - Math.random() * 2, vy: -0.3,
                          life: 14, col: (G.tick % 4) ? '#ff8a2a' : '#6fc8e8', size: 3, grav: -0.02 });
      if (!L.air) {
        G.particles.spawn({ x: L.x - 10, y: L.y - 2, vx: -1.5, vy: -0.8, life: 18,
                            col: '#c8a070', size: 2, grav: 0.05 });
      }
    }
  }

  function lennartCrash(c, L) {
    L.lie = true;
    L.vx = 3;
    // Beim Fahren dreht der Salto gegen den Uhrzeigersinn (siehe
    // drawBikeRider), liegend wird im Uhrzeigersinn gezeichnet.
    L.a = -(L.a % (Math.PI * 2));
    c.phase = 'crash';
    c.lieT = 0;
    S.stopMusic();                  // Stille. Nur der Aufprall.
    S.play('die');
    S.play('brk');
    G.shake(10, 30);
    G.particles.burst(L.x, L.y - 6, 30, { col: '#8a6440', spread: 3.6, up: 1.4, life: 34 });
    G.particles.burst(L.x, L.y - 10, 12, { col: '#ff6fa8', spread: 3, up: 1.6, life: 30 });
    // Das Rad fliegt auseinander
    c.debris.push({ spr: 'rad', x: L.x + 6, y: L.y - 12, vx: 4.2, vy: -6.5, a: 0 });
    c.debris.push({ spr: 'rad', x: L.x - 4, y: L.y - 12, vx: 2.6, vy: -8, a: 0 });
    c.debris.push({ spr: 'bike_kaputt', x: L.x, y: L.y - 8, vx: 1.4, vy: -4, a: 0 });
  }

  function moveDebris(list) {
    for (var i = 0; i < list.length; i++) {
      var d = list[i];
      if (d.rest) continue;
      d.vy += 0.5;
      d.x += d.vx; d.y += d.vy;
      if (d.spr === 'rad') d.a += d.vx * 0.18;
      var gy = groundAt(d.x);
      if (gy !== null && d.y >= gy) {
        d.y = gy;
        d.vy = -d.vy * 0.35;
        d.vx *= 0.8;
        if (Math.abs(d.vy) < 1 && Math.abs(d.vx) < 0.2) d.rest = true;
      }
      if (d.y > G.world.h * T + 40) d.rest = true;
    }
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
        G.respawning = true;
        loadLevel(G.lvlIndex, !!G.checkpoint);
        G.respawning = false;
        var l = LV.deathLines;
        G.floats.add(G.player.cx(), G.player.y - 12,
                     l[(Math.random() * l.length) | 0], '#ffd257', 100);
        S.music(G.lvl.music);
        G.state = 'play';
      });
    }
  };

  G.onMiniPhase = function (type) {
    G.bossHalf = true;
    clearShots();
    G.player.invuln = Math.max(G.player.invuln, 70);
    startDialog(LV.mini[type].phase2, function () { G.state = 'play'; });
  };

  G.onMiniDead = function (type) {
    G.frozen = true;
    clearShots();
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
    G.bossHalf = true;
    clearShots();
    G.player.invuln = Math.max(G.player.invuln, 80);
    var d = phase === 2 ? LV.esat.phase2 : LV.esat.phase3;
    startDialog(d, function () { G.state = 'play'; });
  };

  G.onEsatDead = function () {
    G.frozen = true;
    clearShots();
    clearEnemies();
    G.after(85, function () {
      startDialog(LV.esat.end, function () {
        // Nach Esat geht es zu Hause weiter: Level 8, der Morgen danach.
        save.unlocked = Math.max(save.unlocked, 8);
        persist();
        saveRun(7);
        fadeTo(function () {
          G.checkpoint = null;
          loadLevel(7, false);
          S.music(LV.list[7].music);
          G.state = 'play';
        });
      });
    });
  };

  /** Level 8 geschafft: 10.000 Kalorien sind drin — und der Kuehlschrank leer. */
  G.onEatDone = function () {
    save.unlocked = Math.max(save.unlocked, 9);
    persist();
    saveRun(8);
    fadeTo(function () {
      G.checkpoint = null;
      loadLevel(8, false);
      S.music(LV.list[8].music);
      startDialog(LV.list[8].intro, function () { G.state = 'play'; });
    });
  };

  /* ---------- Alex, Level 9 ---------- */

  G.onAlexPhase = function (phase) {
    G.bossHalf = true;
    clearShots();
    G.player.invuln = Math.max(G.player.invuln, 80);
    startDialog(phase === 2 ? LV.alex.phase2 : LV.alex.phase3,
                function () { G.state = 'play'; });
  };

  G.onAlexDead = function () {
    G.frozen = true;
    clearShots();
    clearEnemies();
    G.drunk = 0;                 // Kampf vorbei, Yusuf wird wieder nuechtern
    G.after(85, function () {
      startDialog(LV.alex.end, function () {
        // Alex hat hier Schicht: Uebergang an die Kasse
        fadeTo(function () {
          G.kasse = global.Kasse ? global.Kasse.init() : null;
          G.frozen = true;
          G.state = 'play';
          if (!G.kasse) { G.onKasseDone(); return; }
          G.after(40, function () {
            startDialog(LV.alex.kasse, function () { G.onKasseDone(); });
          });
        });
      });
    });
  };

  /** Abkassiert. Danach der Heimweg (Level 10). */
  G.onKasseDone = function () {
    save.unlocked = Math.max(save.unlocked, 10);
    persist();
    saveRun(9);
    fadeTo(function () {
      G.kasse = null;
      G.checkpoint = null;
      loadLevel(9, false);
      S.music(LV.list[9].music);
      startDialog(LV.list[9].intro, function () { G.state = 'play'; });
    });
  };

  /* ---------- Broke, Level 11 ---------- */

  G.onBrokePhase = function (phase) {
    G.bossHalf = true;
    clearShots();
    G.player.invuln = Math.max(G.player.invuln, 80);
    startDialog(phase === 2 ? LV.broke.phase2 : LV.broke.phase3,
                function () { G.state = 'play'; });
  };

  G.onBrokeDead = function () {
    G.frozen = true;
    clearShots();
    clearEnemies();              // die Mikas gehen mit nach Hause
    G.after(85, function () {
      startDialog(LV.broke.end, function () {
        // Test bestanden. Jetzt wird geschlafen.
        fadeTo(function () {
          startScene(global.Schlaf.init('morgen'));
          S.stopMusic();
        });
      });
    });
  };

  /** Ausgeschlafen, Esat hat angerufen: weiter mit Level 12, Downhill.
      Nach Level 15 ('ende') ist der Tag vorbei: Bestenliste. */
  G.onSchlafDone = function (mode) {
    if (mode === 'ende') { finishRun(); return; }
    save.unlocked = Math.max(save.unlocked, 12);
    persist();
    saveRun(11);
    fadeTo(function () {
      G.scene = null;
      G.checkpoint = null;
      loadLevel(11, false);
      S.music(LV.list[11].music);
      startDialog(LV.list[11].intro, function () { G.state = 'play'; });
    });
  };

  /* ---------- Gemeinsame Bausteine fuer die Bosse ab Level 13 ---------- */

  function bossPhase(lines) {
    G.bossHalf = true;
    clearShots();
    G.player.invuln = Math.max(G.player.invuln, 80);
    startDialog(lines, function () { G.state = 'play'; });
  }

  function bossDown(lines, after) {
    G.frozen = true;
    clearShots();
    clearEnemies();
    G.dizzy = 0;
    G.after(85, function () { startDialog(lines, after); });
  }

  /** Level idx beginnt: Stand speichern, Blende, Intro. */
  function nextLevel(idx) {
    save.unlocked = Math.max(save.unlocked, idx + 1);
    persist();
    saveRun(idx);
    fadeTo(function () {
      G.scene = null;
      G.checkpoint = null;
      loadLevel(idx, false);
      S.music(LV.list[idx].music);
      startDialog(LV.list[idx].intro, function () { G.state = 'play'; });
    });
  }

  /** Der Tag ist vorbei: alles freigeschaltet, ab in die Bestenliste. */
  function finishRun() {
    save.unlocked = LV.list.length;
    save.completed = true;
    save.run = null;
    persist();
    fadeTo(function () { G.scene = null; startNameEntry(); });
  }

  /* ---------- Hamza, Level 13 ---------- */

  G.onHamzaPhase = function (phase) {
    bossPhase(phase === 2 ? LV.hamza.phase2 : LV.hamza.phase3);
  };

  G.onHamzaDead = function () {
    bossDown(LV.hamza.end, function () {
      // Hamza macht Shawarma, und dann kommt Esat
      fadeTo(function () {
        startScene(global.Mahl.init('imbiss'));
        G.after(40, function () {
          startDialog(LV.hamza.essen, function () { G.onMahlDone('imbiss'); });
        });
      });
    });
  };

  /* ---------- Georgios, Level 15 ---------- */

  G.onGeorgiosPhase = function (phase) {
    bossPhase(phase === 2 ? LV.georgios.phase2 : LV.georgios.phase3);
  };

  G.onGeorgiosDead = function () {
    bossDown(LV.georgios.end, function () {
      fadeTo(function () {
        startScene(global.Mahl.init('taverne'));
        G.after(40, function () {
          startDialog(LV.georgios.essen, function () { G.onMahlDone('taverne'); });
        });
      });
    });
  };

  /** Satt. Nach Hamza geht es in den Stilbruch, nach Georgios ins Bett. */
  G.onMahlDone = function (kind) {
    if (kind === 'imbiss') { nextLevel(13); return; }
    fadeTo(function () {
      startScene(global.Schlaf.init('ende'));
      S.stopMusic();
    });
  };

  /** Drei Mal ausgepustet, und Yusuf hat Hunger: weiter zu Georgios. */
  G.onShishaDone = function () { nextLevel(14); };

  /** Ein Salto ist gelandet. Esat hat dazu eine Meinung. */
  G.onFlip = function (flips) {
    var r = G.rider;
    if (!r || G.cut) return;
    var l = LV.esatFlipLines;
    G.say('esat', flips > 1 ? 'ZWEI?! OKAY, DU BIST VERRÜCKT.' : l[(Math.random() * l.length) | 0], 90);
    r.talkT = Math.max(r.talkT, 200);
  };

  G.onBossPhase = function (phase) {
    // Alles Fliegende wegräumen, sonst hängt beim Weiterspielen noch
    // ein Salatblatt in der Luft, das man nie kommen sah.
    G.bossHalf = true;
    clearShots();
    G.player.invuln = Math.max(G.player.invuln, 70);
    var d = phase === 2 ? LV.boss.phase2 : LV.boss.phase3;
    startDialog(d, function () { G.state = 'play'; });
  };

  G.onBossDead = function () {
    G.frozen = true;
    clearShots();
    G.after(85, function () {
      startDialog(LV.boss.end, function () {
        save.unlocked = Math.max(save.unlocked, 6);
        persist();
        saveRun(5);
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
    if (G.flashFx && G.flashFx.t > 0 && G.state !== 'paused') G.flashFx.t--;

    global.Input.endFrame();
  }

  /** Das Menue haengt vom Fortschritt ab, darum wird es gebaut statt
      fest verdrahtet. Levelauswahl gibt es erst nach dem Durchspielen. */
  /** Wohin "WEITER" fuehrt: zum gespeicherten Durchgang, sonst zum
      zuletzt freigeschalteten Level. Menue und Start nutzen dieselbe Zahl. */
  function continueTarget() {
    var r = save.run && validRun(save.run.next) ? save.run : null;
    return r ? r.next : Math.min(LV.list.length - 1, save.unlocked - 1);
  }

  function menuItems() {
    var items = [{ k: 'play', label: 'NEUES SPIEL' }];
    if (save.unlocked > 1) {
      items.push({ k: 'continue', label: 'WEITER AB LEVEL ' + (continueTarget() + 1) });
    }
    // Levelauswahl ist immer da. Freigeschaltet wird Level fuer Level,
    // damit man nach einem Absturz nicht wieder von vorne anfangen muss.
    items.push({ k: 'select', label: 'LEVEL WÄHLEN' });
    items.push({ k: 'scores', label: 'BESTENLISTE' });
    items.push({ k: 'howto', label: 'STEUERUNG' });
    items.push({ k: 'sound', label: S.isMuted() ? 'TON: AUS' : 'TON: AN' });
    return items;
  }

  function inRect(tp, r) {
    return tp && tp.x >= r.x && tp.x < r.x + r.w && tp.y >= r.y && tp.y < r.y + r.h;
  }

  /* Wo die Dinge auf dem Titelbild liegen — Zeichnen und Antippen
     benutzen dieselben Masse. */
  function titleMenuTop(n) { return 160 - (n - 5) * 7; }
  function titleBoardRect() { return { x: W - 158, y: 110, w: 150, h: 96 }; }

  function activateMenu(it) {
    S.resume();
    S.play('select');
    if (it.k === 'play') startGame(0);
    else if (it.k === 'continue') startGame(continueTarget(), true);
    else if (it.k === 'select') { G.state = 'select'; G.selIdx = 0; }
    else if (it.k === 'scores') openScores();
    else if (it.k === 'howto') G.state = 'howto';
    else S.toggleMute();
  }

  function openScores() {
    G.scoreCat = 0;
    G.state = 'scores';
    if (global.Online) global.Online.refresh(true);
  }

  function updateTitle() {
    var items = menuItems();
    var n = items.length;
    if (G.menuIdx >= n) G.menuIdx = 0;
    if (global.Online && G.tick % 120 === 0) global.Online.refresh();

    // Am Handy: Menuepunkte direkt antippen
    var tp = global.Input.tap();
    if (tp) {
      var top0 = titleMenuTop(n);
      for (var i = 0; i < n; i++) {
        var half = F.measure(items[i].label, 1, 1) / 2 + 24;
        if (inRect(tp, { x: W / 2 - half, y: top0 + i * 15 - 5, w: half * 2, h: 15 })) {
          G.menuIdx = i;
          activateMenu(items[i]);
          return;
        }
      }
      if (inRect(tp, titleBoardRect())) { S.play('select'); openScores(); }
      return;   // daneben getippt: nichts tun, statt versehentlich zu starten
    }

    if (global.Input.hit('down')) { G.menuIdx = (G.menuIdx + 1) % n; S.play('move'); }
    if (global.Input.hit('up')) { G.menuIdx = (G.menuIdx + n - 1) % n; S.play('move'); }
    if (global.Input.hit('jump') || global.Input.hit('confirm')) activateMenu(items[G.menuIdx]);
    // Ton erst nach der ersten Beruehrung/Taste — vorher verweigert der
    // Browser ihn ohnehin und schreibt nur Warnungen in die Konsole.
    if (G.gestured && G.tick % 6 === 0) S.resume();
  }

  /** Karten-Masse der Levelauswahl — fuer Zeichnen und Antippen. */
  function selectCards() {
    // Ab elf Leveln passen die Karten nicht mehr in eine Reihe: dann zwei
    var nL = LV.list.length, gap = 6;
    var rows = nL > 10 ? 2 : 1;
    var perRow = Math.ceil(nL / rows);
    var cw = Math.min(76, Math.floor((W - 24 - gap * (perRow - 1)) / perRow));
    var ch = rows > 1 ? 72 : 130;
    var y0 = rows > 1 ? 56 : 80;
    var left0 = Math.round((W - (cw * perRow + gap * (perRow - 1))) / 2);
    return { n: nL, gap: gap, cw: cw, ch: ch, left0: left0, y: y0, rows: rows, perRow: perRow,
             bottom: y0 + rows * ch + (rows - 1) * 8 };
  }

  function cardRect(sc, i) {
    var row = Math.floor(i / sc.perRow), col = i % sc.perRow;
    return { x: sc.left0 + col * (sc.cw + sc.gap), y: sc.y + row * (sc.ch + 8), w: sc.cw, h: sc.ch };
  }

  function updateSelect() {
    var max = Math.min(LV.list.length, save.unlocked);
    var sc = selectCards();
    var tp = global.Input.tap();
    if (tp) {
      for (var i = 0; i < max; i++) {
        var cr = cardRect(sc, i);
        if (inRect(tp, { x: cr.x, y: cr.y - 8, w: cr.w, h: cr.h + 8 })) {
          if (G.selIdx === i) { S.play('select'); startGame(i); }
          else { G.selIdx = i; S.play('move'); }
          return;
        }
      }
      if (tp.y > H - 40) { G.state = 'title'; S.play('select'); }
      return;
    }
    if (global.Input.hit('right')) { G.selIdx = Math.min(max - 1, G.selIdx + 1); S.play('move'); }
    if (global.Input.hit('left')) { G.selIdx = Math.max(0, G.selIdx - 1); S.play('move'); }
    if (sc.rows > 1 && global.Input.hit('down') && G.selIdx + sc.perRow < max) {
      G.selIdx += sc.perRow; S.play('move');
    }
    if (sc.rows > 1 && global.Input.hit('up') && G.selIdx - sc.perRow >= 0) {
      G.selIdx -= sc.perRow; S.play('move');
    }
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

  function startGame(idx, cont) {
    fadeTo(function () {
      G.checkpoint = null;
      loadLevel(idx, false);
      var p = G.player, r = cont ? validRun(idx) : null;
      if (r) {
        // Gespeicherten Durchgang fortsetzen
        p.lives = Math.max(r.l, 2); p.honey = r.h; p.score = r.s;
        p.deaths = r.d; p.eatCount = r.e;
        G.run = { from: r.from };
        G.runTime = r.t * 60;
      } else {
        p.lives = 4; p.honey = 0; p.score = 0; p.deaths = 0; p.eatCount = 0;
        G.run = { from: idx };
        G.runTime = 0;
      }
      // Erst JETZT den Stand merken — vorher stand hier noch der Honig
      // der letzten Runde drin, und ein Tod vor dem ersten Checkpoint
      // hat ihn zurueckgeholt.
      saveCheckpointState();
      G.lastName = null; G.lastScore = null;
      S.music(LV.list[idx].music);
      startDialog(LV.list[idx].intro, function () { G.state = 'play'; });
    });
  }

  /** Antippbare Knoepfe fuer Pause und Game Over (am Handy gibt es kein ESC). */
  function touchButtons(y, labels) {
    var bw = 100, gap = 8, total = labels.length * bw + (labels.length - 1) * gap;
    var x0 = Math.round((W - total) / 2), out = [];
    for (var i = 0; i < labels.length; i++) {
      out.push({ x: x0 + i * (bw + gap), y: y, w: bw, h: 24, label: labels[i] });
    }
    return out;
  }

  function drawTouchButtons(btns) {
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      rect(b.x, b.y, b.w, b.h, 'rgba(38,26,54,0.95)');
      ctx.strokeStyle = '#ffc23c';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      F.draw(ctx, b.label, b.x + b.w / 2, b.y + 9, { color: '#ffe9a8', align: 'center' });
    }
  }

  function pauseButtons() {
    return touchButtons(170, ['WEITER', S.isMuted() ? 'TON AN' : 'TON AUS', 'HAUPTMENÜ']);
  }
  function gameoverButtons() {
    return touchButtons(H - 44, ['NOCHMAL', 'HAUPTMENÜ']);
  }

  function toTitle() {
    fadeTo(function () { G.state = 'title'; G.menuIdx = 0; S.music('menu'); });
  }

  function updatePaused() {
    var tp = global.Input.tap();
    if (tp) {
      var pb = pauseButtons();
      if (inRect(tp, pb[0])) { G.state = 'play'; S.play('pause'); }
      else if (inRect(tp, pb[1])) { G.muteState = S.toggleMute(); }
      else if (inRect(tp, pb[2])) toTitle();
      return;
    }
    if (global.Input.hit('pause') || global.Input.hit('confirm')) {
      G.state = 'play'; S.play('pause');
    }
    if (global.Input.hit('back')) toTitle();
  }

  function updatePlay() {
    if (global.Input.hit('pause')) { G.state = 'paused'; S.play('pause'); return; }
    G.time++;
    G.runTime = (G.runTime || 0) + 1;
    updateWorld();
  }

  /** Stand, auf den beim Tod zurueckgesetzt wird. */
  function snapshotStats() {
    var p = G.player;
    return { honey: p.honey, score: p.score, eatCount: p.eatCount || 0 };
  }

  function copyMap(src) {
    var out = {};
    for (var k in src) out[k] = src[k];
    return out;
  }

  /** Zustand aller Bloecke (leer, kaputt, wie viel noch drin). */
  function snapshotBlocks() {
    var out = {};
    for (var key in G.world.blocks) {
      var b = G.world.blocks[key];
      out[key] = { used: b.used, count: b.count, dead: b.dead };
    }
    return out;
  }

  function restoreBlocks(snap) {
    for (var key in snap) {
      var b = G.world.blocks[key], s = snap[key];
      if (!b) continue;
      b.used = s.used; b.count = s.count;
      if (s.dead && !b.dead) G.world.clearBlock(b);
    }
  }

  /** Alles merken, was beim Tod zurueckgesetzt wird: Stand, Items, Bloecke. */
  function saveCheckpointState() {
    G.checkpointStats = snapshotStats();
    G.checkpointItems = copyMap(G.itemsTaken);
    G.checkpointBlocks = snapshotBlocks();
  }

  /** Entfernt Einträge aus einer Liste — nur ausserhalb eines Durchlaufs. */
  function sweep(list, isGone) {
    for (var i = list.length - 1; i >= 0; i--) {
      if (!list[i] || isGone(list[i])) list.splice(i, 1);
    }
  }

  function updateWorld() {
    var p = G.player, i;
    // Level 8 hat seine eigene Welt (Couch, Schreibtisch, Essen)
    if (G.scene) { sceneMod().update(G, W, H); return; }
    if (G.kasse) { global.Kasse.update(G, W, H); return; }
    if (G.eat) { global.Eat.update(G, W, H); return; }
    // Während eines Dialogs steht die ganze Welt still. Vorher lief
    // Huseyin weiter und hat Yusuf verprügelt, während man nicht
    // steuern konnte — das war der unfairste Bug im Spiel.
    var frozen = G.frozen;

    if (!frozen) G.world.updateMovers();
    p.update(G);

    if (G.comboTimer > 0) { G.comboTimer--; if (G.comboTimer === 0) G.combo = 0; }
    if (p.grounded) G.comboTimer = Math.min(G.comboTimer, 20);

    // Level 12: Esat faehrt hinterher, Lennart hat seinen Auftritt
    if (G.rider && !frozen) updateRider(p);
    if (G.lvl.lennart && !frozen) updateLennart(p);

    // Waehrend Lennarts Auftritt steht der Rest der Welt still
    if (!frozen && !G.cut) {
      // WICHTIG: erst alles bewegen, dann aufräumen.
      // Ein Treffer kann mitten im Durchlauf einen Boss töten oder eine
      // Phase starten — und dabei wurden diese Listen geleert. Der
      // nächste Schleifenschritt griff dann ins Leere und das Spiel
      // stürzte ab. Darum wird hier nie während des Durchlaufs entfernt.
      for (i = G.enemies.length - 1; i >= 0; i--) {
        var e = G.enemies[i];
        if (!e) continue;
        var near = (e.x > G.cam.x - 160 && e.x < G.cam.x + W + 160);
        // Ansturm-Mikas laufen auch ausserhalb des Bildes weiter — sonst
        // bleiben sie am Rand der Arena stehen und kommen nie an.
        if (near || e.dead || e.stampede) e.update(G);
      }
      for (i = G.items.length - 1; i >= 0; i--) {
        var it = G.items[i];
        if (!it) continue;
        if (it.x > G.cam.x - 120 && it.x < G.cam.x + W + 120) it.update(G);
      }
      for (i = G.projectiles.length - 1; i >= 0; i--) {
        var pr = G.projectiles[i];
        if (!pr) continue;
        pr.update(G);
      }
    }
    // Auch im Dialog aufraeumen: dort werden Geschosse nur als "weg"
    // markiert und sollen nicht eingefroren sichtbar bleiben.
    sweep(G.enemies, function (x) { return x.dead && x.deadTimer > 70; });
    sweep(G.items, function (x) { return x.dead; });
    sweep(G.projectiles, function (x) { return x.dead; });

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
        saveCheckpointState();
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

      if (bt === 'alex' || bt === 'hamza' || bt === 'georgios') {
        var BossCls = bt === 'alex' ? E.BossAlex : (bt === 'hamza' ? E.BossHamza : E.BossGeorgios);
        G.boss = new BossCls(G.lvl.boss.x, G.lvl.boss.y);
        G.world.fill(aTile - 1, 2, 1, groundY - 1, 1);
        G.checkpoint = [aTile + 3, groundY];
        saveCheckpointState();
      } else if (bt === 'broke') {
        // Die Arena ist das ganze Level: Wiedereinstieg vor der Haustuer
        G.boss = new E.BossBroke(G.lvl.boss.x, G.lvl.boss.y);
        G.checkpoint = [G.lvl.spawn[0], G.lvl.spawn[1]];
        saveCheckpointState();
      } else if (bt === 'esat') {
        G.boss = new E.BossEsat(G.lvl.boss.x, G.lvl.boss.y);
        G.checkpoint = [G.lvl.spawn[0], G.lvl.spawn[1]];
      } else if (E.MINIBOSS[bt]) {
        G.boss = new E.MiniBoss(bt, G.lvl.boss.x, G.lvl.boss.y);
        // Zurueck geht nicht mehr, und der Wiedereinstieg liegt drinnen.
        G.world.fill(aTile - 1, 2, 1, groundY - 1, 1);
        G.checkpoint = [aTile + 3, groundY];
        saveCheckpointState();
      } else {
        G.boss = new E.Boss(G.lvl.boss.x, G.lvl.boss.y);
        G.world.fill(aTile - 1, 2, 1, 13, 1);
        G.checkpoint = [aTile + 4, 15];
        saveCheckpointState();
      }
      G.boss.intro = false;
      // Halbzeit-Checkpoint: wer nach der Verwandlung stirbt, faengt
      // nicht wieder bei voller Energie an. Mehr Leben pro Boss ist nur
      // fair, wenn man die erste Haelfte nicht immer wiederholen muss.
      if (G.bossHalf) {
        var hb = G.boss;
        hb.hp = Math.floor(hb.maxHp / 2);
        hb.onTransform(G);
        hb.phase = 2;
        hb.state = 'idle'; hb.timer = 70;
        // Nach einem Tod faengt der Kampf ab der Haelfte an — aber
        // nuechtern. Alex kippt nicht nochmal nach.
        G.drunk = 0;
        G.floats.add(hb.cx(), hb.y - 20, 'WEITER AB HALBZEIT', '#ffd257', 120);
      }
      // Jeder Kampf klingt anders
      S.music(bt === 'esat' ? 'bossfinal'
              : ((E.MINIBOSS[bt] || bt === 'alex' || bt === 'broke' || bt === 'hamza') ? 'boss2' : 'boss'));
      G.shake(5, 20);

      if (!G.bossIntroSeen) {
        G.bossIntroSeen = true;
        // Esat und Broke reden vorher schon im Level-Intro
        var d0 = (bt === 'esat' || bt === 'broke') ? null
               : (bt === 'alex') ? LV.alex.start
               : (bt === 'hamza') ? LV.hamza.start
               : (bt === 'georgios') ? LV.georgios.start
               : (E.MINIBOSS[bt] ? LV.mini[bt].start : LV.boss.start);
        if (d0) startDialog(d0, function () { G.state = 'play'; });
      }
    }

    if (G.lvl.driving && !frozen) updateDriving(p);

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
        G.floats.add(p.cx() + MIRKAN_OFF, p.y - 44, ml[G.mirkan.qi % ml.length], '#b8c0d4', 105);
        G.mirkan.qi++;
        S.play('move');
      }
      if (G.mirkan.t > G.mirkan.dur) {
        G.floats.add(p.cx() + MIRKAN_OFF, p.y - 44, 'OKAY. BIS SPÄTER DANN.', '#8f86a8', 90);
        G.mirkan = null;
      }
    }
    // Der Boss bewegt sich im Dialog nicht — nur seine Todesanimation läuft weiter.
    if (G.boss && (!frozen || G.boss.dead)) G.boss.update(G);

    // Ziel
    if (!p.won && !p.dead) {
      var gx = G.lvl.goal[0] * T, gy = G.lvl.goal[1] * T;
      // Level-Bosse geben das Ziel frei; Huseyin und Esat enden anders.
      var endsWithBoss = (G.lvl.bossType === 'huseyin' || G.lvl.bossType === 'esat' ||
                          G.lvl.bossType === 'alex' || G.lvl.bossType === 'broke' ||
                          G.lvl.bossType === 'hamza' || G.lvl.bossType === 'georgios');
      var canFinish = !G.lvl.boss || (!endsWithBoss && G.bossCleared);
      if (canFinish && Math.abs(p.cx() - (gx + 12)) < 30 &&
          p.feet() > gy - 60 && p.feet() < gy + 40) {
        finishLevel();
      }
    }

    G.particles.update();
    G.floats.update();
    for (var tk in G.talk) if (G.talk[tk].t > 0) G.talk[tk].t--;
    if (G.dizzy > 0 && !frozen) G.dizzy--;
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
    if (idx < LV.list.length - 1) saveRun(idx + 1);

    // Manche Level gehen ohne Zwischenbildschirm weiter: Level 10 endet
    // vor der Haustuer (da steht Broke), Level 12 unten am Berg (Shawarma).
    if (G.lvl.direct && idx < LV.list.length - 1) {
      G.after(60, function () {
        startDialog(G.lvl.outro, function () {
          fadeTo(function () {
            G.checkpoint = null;
            loadLevel(idx + 1, false);
            S.music(LV.list[idx + 1].music);
            startDialog(LV.list[idx + 1].intro, function () { G.state = 'play'; });
          });
        });
      });
      return;
    }

    // Level 14: der reservierte Tisch im Stilbruch. Jetzt wird geraucht.
    if (G.lvl.id === 14) {
      G.after(50, function () {
        fadeTo(function () {
          startScene(global.Shisha.init());
          G.after(30, function () {
            startDialog(LV.shisha.vorher, function () {
              if (G.scene) G.scene.phase = 'rauchen';
              G.state = 'play';
            });
          });
        });
      });
      return;
    }

    // Das letzte Level: unten am Berg. Danach geht es in die Shisha-Bar —
    // die kommt aber erst noch. Bis dahin: Bestenliste.
    if (idx === LV.list.length - 1) {
      G.after(60, function () {
        startDialog(G.lvl.outro, function () {
          save.unlocked = LV.list.length;
          save.completed = true;
          save.run = null;
          persist();
          fadeTo(function () { startNameEntry(); });
        });
      });
      return;
    }

    // Level 6 endet mit der Siegerehrung — und die eskaliert.
    if (G.lvl.id === 6) {
      G.after(50, function () {
        startDialog(LV.stilbruch, function () {
          fadeTo(function () {
            G.checkpoint = null;
            loadLevel(6, false);
            S.music('bossfinal');
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

  // Nur Zeichen, die die Pixelschrift kennt. Dieselbe Liste prueft auch
  // der Server (supabase-setup.sql), falls die weltweite Liste aktiv ist.
  var NAME_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ0123456789-. ';
  var NAME_MAX = 10;
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
    for (var i = 0; i < s.length && i < 40 && out.length < NAME_MAX; i++) {
      var c = s.charAt(i);
      if (NAME_CHARS.indexOf(c) >= 0) out += c;
    }
    // Wie bisher nur hinten kuerzen — sonst passen die Pruefsummen
    // alter Eintraege nicht mehr und sie verschwinden aus der Liste.
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

  /* ---------- Der laufende Durchgang ----------
     Punkte, Honig, Zeit und Tode zaehlen ueber ALLE Level. Nach jedem
     geschafften Level wird der Stand gespeichert — "WEITER" setzt ihn
     fort, ein Absturz kostet also nicht den Bestenlisten-Eintrag.
     In die Bestenliste kommt nur, wer bei Level 1 angefangen hat;
     sonst koennte man mit Level 7 allein die Zeitwertung gewinnen. */
  function runSig(r) {
    return hashStr(['run', r.from, r.next, r.s, r.h, r.t, r.d, r.e, r.l].join('|') + SCORE_SALT);
  }

  function saveRun(nextIdx) {
    // Nur echte Durchgaenge ab Level 1 merken. Sonst hat ein Nochmal-
    // Spielen ueber die Levelauswahl den gespeicherten Durchgang
    // ueberschrieben — und damit den Bestenlisten-Eintrag gekostet.
    if (!G.run || G.run.from !== 0) return;
    var p = G.player;
    var r = {
      from: G.run.from, next: nextIdx,
      s: clampInt(p.score, 0, 9999999), h: clampInt(p.honey, 0, 99999),
      t: clampInt(G.runTime / 60, 0, 359999), d: clampInt(p.deaths || 0, 0, 9999),
      e: clampInt(p.eatCount || 0, 0, 9999), l: clampInt(p.lives, 0, 99)
    };
    r.g = runSig(r);
    save.run = r;
    persist();
  }

  function validRun(idx) {
    var r = save.run;
    return (r && r.next === idx && r.g === runSig(r)) ? r : null;
  }

  function fullRun() { return !!(G.run && G.run.from === 0); }

  /** Die Liste, die angezeigt wird: weltweit, wenn eingerichtet und
      erreichbar — sonst die aus diesem Browser. Serverdaten werden genauso
      streng geprueft wie lokale: Namen nur aus der Pixelschrift, Zahlen
      begrenzt. Angezeigt wird ohnehin nur ueber die Pixelschrift, nie als
      HTML — eingeschleuster Code kann also nichts ausrichten. */
  function boardList() {
    var on = global.Online;
    var raw = on && on.enabled() ? on.list() : null;
    if (!raw) return { list: loadScores(), global: false };
    var out = [];
    for (var i = 0; i < raw.length && out.length < 100; i++) {
      var e = raw[i];
      if (!e || typeof e !== 'object') continue;
      out.push({
        n: cleanName(e.n), s: clampInt(e.s, 0, 9999999), h: clampInt(e.h, 0, 99999),
        t: clampInt(e.t, 0, 359999), d: clampInt(e.d, 0, 9999)
      });
    }
    return { list: out, global: true };
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

  /* ---------- Namenseingabe ----------
     Ein echtes Textfeld statt Buchstaben-Rad: am Handy kommt die normale
     Tastatur, am PC tippt man einfach. Es gibt keinen Zeitdruck — der
     Eintrag passiert erst beim Tippen auf EINTRAGEN (oder Enter).
     Vorher hat ein noch gedrueckter Sprung-Knopf aus dem Dialog den
     Namen sofort abgeschickt. */
  var nameForm = document.getElementById('nameform');
  var nameInput = document.getElementById('nfname');
  var nameOk = document.getElementById('nfok');

  function startNameEntry() {
    G.state = 'nameentry';
    G.nameSent = false;
    G.partialRun = !fullRun();
    G.nameTimer = 0;
    S.play('win');
    if (G.partialRun) return;            // nur ein Hinweis, kein Eintrag
    if (!nameForm) return;               // Testseiten ohne Formular
    global.Input.releaseAll();
    nameInput.value = '';
    nameOk.disabled = true;
    nameForm.hidden = false;
    // kurze Sperre gegen versehentliches Doppeltippen
    setTimeout(function () { nameOk.disabled = false; }, 800);
    if (!G.touch) setTimeout(function () { try { nameInput.focus(); } catch (e) {} }, 60);
  }

  function submitName(raw) {
    if (G.state !== 'nameentry' || G.nameSent) return;
    G.nameSent = true;
    if (nameForm) { nameForm.hidden = true; try { nameInput.blur(); } catch (e) {} }
    var sec = Math.floor((G.runTime || 0) / 60);
    var name = cleanName(String(raw || '').replace(/^\s+/, ''));
    G.lastName = name;
    G.lastScore = G.player.score;
    G.scoreList = storeScore(name, G.player.score, G.player.honey, sec, G.player.deaths || 0);
    if (global.Online) {
      global.Online.submit({
        n: name, s: clampInt(G.player.score, 0, 9999999), h: clampInt(G.player.honey, 0, 99999),
        t: clampInt(sec, 0, 359999), d: clampInt(G.player.deaths || 0, 0, 9999)
      });
    }
    G.scoreCat = 0;
    S.play('oneUp');
    fadeTo(function () { G.state = 'teaser'; G.endScroll = 0; });
  }

  if (nameForm) {
    document.getElementById('nfform').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!nameOk.disabled) submitName(nameInput.value);
    });
    // Nur erlaubte Zeichen — was die Pixelschrift nicht kennt, fliegt raus.
    // Erst beim Verlassen des Felds: waehrend des Tippens umschreiben
    // bringt manche Android-Tastaturen durcheinander.
    // Am Handy schiebt sich die Tastatur von unten rein: waehrend des
    // Tippens rutscht das Feld deshalb nach oben (siehe style.css).
    nameInput.addEventListener('focus', function () { nameForm.classList.add('typing'); });
    nameInput.addEventListener('blur', function () { nameForm.classList.remove('typing'); });
    nameInput.addEventListener('blur', function () {
      var v = nameInput.value.toUpperCase(), out = '';
      for (var i = 0; i < v.length && out.length < NAME_MAX; i++) {
        if (NAME_CHARS.indexOf(v.charAt(i)) >= 0) out += v.charAt(i);
      }
      if (out !== nameInput.value) nameInput.value = out;
    });
  }

  function updateNameEntry() {
    var go = global.Input.hit('jump') || global.Input.hit('confirm');
    G.nameTimer++;
    // Nicht ab Level 1 gespielt: nur Hinweis, dann weiter zum Teaser
    if (G.partialRun) {
      if (go && G.nameTimer > 45 && !G.nameSent) {
        G.nameSent = true;
        fadeTo(function () { G.state = 'teaser'; G.endScroll = 0; });
      }
      return;
    }
    // Ohne Formular (Testseiten): Sprung traegt einen Standardnamen ein
    if (!nameForm && go) submitName('YUSUF');
  }

  function updateScores() {
    var In = global.Input;
    if (global.Online && G.tick % 300 === 0) global.Online.refresh();
    var tp = In.tap();
    if (tp) {
      // Kategorie antippen = sortieren, sonst zurueck
      if (tp.y >= 38 && tp.y < 60) {
        var cx0 = 60;
        for (var c = 0; c < SCORE_CATS.length; c++) {
          var lw = F.measure(SCORE_CATS[c].k, 1, 1);
          if (tp.x >= cx0 - 12 && tp.x < cx0 + lw + 12) { G.scoreCat = c; S.play('move'); return; }
          cx0 += lw + 26;
        }
      }
      G.state = 'title'; S.play('select');
      return;
    }
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
    var tp = global.Input.tap();
    if (tp) {
      var gb = gameoverButtons();
      if (inRect(tp, gb[1])) { toTitle(); return; }
      if (!inRect(tp, gb[0])) return;
    }
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
    // Zwischensequenz: die Kamera schaut woanders hin (Lennart)
    if (G.camFocus) {
      tx = G.camFocus.x - W / 2;
      ty = G.camFocus.y - H / 2 - 10;
    }

    cam.x += (tx - cam.x) * 0.11;
    cam.y += (ty - cam.y) * 0.09;

    var maxX = Math.max(0, G.lvl.w * T - W);
    var maxY = Math.max(0, G.lvl.h * T - H + BOTTOM_PAD);

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
    applyView();
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
      drawDrunkOrPlain();
      if (G.flashFx && G.flashFx.t > 0) {
        ctx.globalAlpha = 0.5 * G.flashFx.t / G.flashFx.max;
        ctx.fillStyle = G.flashFx.col;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
      if (!G.eat && !G.kasse && !G.scene && !G.cut) drawHUD();
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
    } else if (theme === 'markt') {
      // Neonroehren an der Decke
      for (i = -1; i < 14; i++) {
        x = i * 96 - (f % 96);
        rect(x + 16, 0, 60, 5, '#ffffff');
        rect(x + 22, 5, 48, 3, 'rgba(255,255,255,0.4)');
      }
      // Regalreihen hinter dem Spielfeld, voll mit bunten Packungen
      var PROD = ['#e0483c', '#ffd257', '#4aa832', '#5c7fd8', '#ff8a2a',
                  '#f08aa8', '#a8e0f0', '#b07a3a'];
      for (i = -1; i < 10; i++) {
        x = i * 150 - (n % 150);
        rect(x, 118, 128, 130, t.far);
        rect(x, 118, 128, 3, '#9aa0ac');
        for (var sr = 0; sr < 4; sr++) {
          var sy2 = 126 + sr * 28;
          rect(x + 4, sy2 + 20, 120, 3, '#8a8e98');
          for (var sc = 0; sc < 7; sc++) {
            rect(x + 8 + sc * 17, sy2, 13, 19, PROD[(i + sr * 3 + sc) % PROD.length]);
            rect(x + 8 + sc * 17, sy2, 13, 4, 'rgba(255,255,255,0.35)');
          }
        }
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
    } else if (theme === 'siedlung') {
      // Nachmittagssonne ueber einer Reihe Einfamilienhaeuser
      ctx.fillStyle = '#fff2c0';
      ctx.beginPath(); ctx.arc(420 - f * 0.05, 58, 20, 0, 6.3); ctx.fill();
      for (i = -1; i < 12; i++) {
        x = i * 124 - (f % 124);
        var hh = 64 + ((i + 12) % 3) * 16;
        rect(x + 12, 250 - hh, 92, hh + 40, t.far);
        ctx.fillStyle = t.far;
        ctx.beginPath();
        ctx.moveTo(x + 2, 251 - hh); ctx.lineTo(x + 58, 216 - hh); ctx.lineTo(x + 114, 251 - hh);
        ctx.closePath(); ctx.fill();
        for (var wi = 0; wi < 3; wi++) rect(x + 24 + wi * 26, 262 - hh, 12, 12, '#b8c8e0');
      }
      for (i = -1; i < 14; i++) {
        x = i * 104 - (n % 104);
        rect(x, 214, 70, 30, '#4f7e3e');                 // Hecke
        rect(x, 214, 70, 4, '#6aa04e');
        rect(x + 84, 186, 6, 60, '#5a3a20');             // Baum
        ctx.fillStyle = '#3f6e34';
        ctx.beginPath(); ctx.arc(x + 87, 180, 20, 0, 6.3); ctx.fill();
      }
    } else if (theme === 'imbiss') {
      // Hamzas Laden: Fliesen, Karten mit Preisen, drehende Spiesse
      for (i = -1; i < 26; i++) {
        x = i * 32 - (f % 32);
        rect(x, 0, 1, H, 'rgba(255,220,180,0.05)');
      }
      for (i = -1; i < 8; i++) {
        x = i * 220 - (n % 220);
        rect(x + 20, 60, 44, 150, '#2a1a12');           // Grill-Nische
        rect(x + 24, 64, 36, 142, '#ff6a1a');
        rect(x + 28, 68, 28, 134, '#ffb43c');
        for (var sy = 0; sy < 110; sy += 3) {            // der Spiess dreht sich
          var sw = 24 - Math.abs(sy - 40) * 0.14;
          var so = ((sy * 3 + G.tick) >> 2) % 4;
          rect(x + 42 - sw / 2, 76 + sy, sw, 3, so < 2 ? '#b8643a' : '#8a4424');
        }
        rect(x + 41, 66, 2, 130, '#c8ccd6');
        rect(x + 90, 70, 96, 50, '#1a1210');            // Karte
        F.draw(ctx, 'SHAWARMA', x + 98, 78, { color: '#ffd257' });
        F.draw(ctx, 'FALAFEL', x + 98, 92, { color: '#ffe9a8' });
        F.draw(ctx, 'HUMMUS', x + 98, 106, { color: '#ffe9a8' });
      }
      for (i = -1; i < 5; i++) {
        x = i * 380 - (n % 380) + 200;
        rect(x, 140, 50, 8, '#d8282e'); rect(x, 148, 50, 14, '#f4f2ec'); rect(x, 162, 50, 8, '#d8282e');
        ctx.fillStyle = '#2a9a4a';
        ctx.beginPath(); ctx.moveTo(x + 25, 148); ctx.lineTo(x + 16, 160); ctx.lineTo(x + 34, 160);
        ctx.closePath(); ctx.fill();
      }
    } else if (theme === 'bar') {
      // Stilbruch von innen: Neon, Rauch, Shisha-Silhouetten
      for (i = -1; i < 10; i++) {
        x = i * 170 - (f % 170);
        var pulse2 = ((G.tick + i * 40) % 140) < 5 ? '#ffd8f0' : '#ff8ad8';
        F.draw(ctx, i % 2 ? 'SHISHA' : 'STILBRUCH', x + 60, 40, { color: pulse2, align: 'center', scale: 2 });
        rect(x + 10, 36, 100, 1, 'rgba(255,138,216,0.3)');
      }
      for (i = -1; i < 14; i++) {
        x = i * 110 - (n % 110);
        rect(x + 14, 150, 8, 70, t.far);                // Shisha-Schlauch-Stange
        rect(x + 6, 214, 24, 26, t.far);                 // Glas
        rect(x + 40, 196, 60, 44, t.near);               // Sofa
        rect(x + 40, 190, 60, 8, t.far);
      }
      ctx.fillStyle = 'rgba(200,190,230,0.05)';
      for (i = 0; i < 6; i++) {
        var rx2 = ((i * 97 + G.tick * 0.3) % (W + 100)) - 50;
        ctx.beginPath(); ctx.arc(rx2, 110 + (i % 3) * 30, 40, 0, 6.3); ctx.fill();
      }
    } else if (theme === 'taverne') {
      // Weisse Waende, blaue Fenster mit Meerblick, Maeanderband
      for (i = -1; i < 40; i++) {
        x = i * 16 - (f % 16);
        rect(x, 26, 12, 3, t.near);
        rect(x + 9, 26, 3, 9, t.near);
        rect(x + 3, 32, 9, 3, t.near);
      }
      for (i = -1; i < 9; i++) {
        x = i * 180 - (n % 180);
        rect(x + 30, 70, 64, 80, t.near);                // Fensterrahmen
        rect(x + 34, 74, 56, 72, '#6ab0e8');             // Himmel
        rect(x + 34, 118, 56, 28, '#2a6ab8');            // Meer
        rect(x + 60, 74, 4, 72, t.near);
        rect(x + 120, 170, 18, 40, '#c87a4a');           // Amphore
        rect(x + 116, 176, 26, 26, '#b8683a');
        rect(x + 124, 164, 10, 8, '#c87a4a');
      }
      for (i = -1; i < 5; i++) {
        x = i * 360 - (n % 360) + 150;
        for (var gs = 0; gs < 9; gs++) rect(x, 60 + gs * 4, 54, 4, gs % 2 ? '#f4f6fa' : '#2a5ab8');
        rect(x, 60, 20, 20, '#2a5ab8'); rect(x + 8, 60, 4, 20, '#f4f6fa'); rect(x, 68, 20, 4, '#f4f6fa');
      }
    } else if (theme === 'berg') {
      // Morgens am Hausberg: ferne Gipfel mit Schnee, davor Tannen
      ctx.fillStyle = '#fff6c8';
      ctx.beginPath(); ctx.arc(86, 48, 18, 0, 6.3); ctx.fill();
      for (i = -1; i < 9; i++) {
        x = i * 190 - (f * 0.6 % 190);
        var peak = 70 + ((i + 10) % 2) * 34;
        ctx.fillStyle = t.far;
        ctx.beginPath();
        ctx.moveTo(x - 20, 290); ctx.lineTo(x + 95, peak); ctx.lineTo(x + 210, 290);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#eef4fa';
        ctx.beginPath();
        ctx.moveTo(x + 95, peak); ctx.lineTo(x + 77, peak + 18); ctx.lineTo(x + 86, peak + 14);
        ctx.lineTo(x + 95, peak + 20); ctx.lineTo(x + 104, peak + 14); ctx.lineTo(x + 113, peak + 18);
        ctx.closePath(); ctx.fill();
      }
      for (i = -1; i < 16; i++) {
        x = i * 64 - (n % 64);
        var th = 46 + ((i + 16) % 3) * 12;
        rect(x + 14, 250 - 12, 5, 16, '#4a3220');
        for (var tl = 0; tl < 3; tl++) {
          var ty = 240 - th + tl * (th / 3.2), tw = 12 + tl * 6;
          ctx.fillStyle = tl % 2 ? '#245a30' : t.near;
          ctx.beginPath();
          ctx.moveTo(x + 16 - tw, ty + th / 3); ctx.lineTo(x + 16, ty - 4); ctx.lineTo(x + 17 + tw, ty + th / 3);
          ctx.closePath(); ctx.fill();
        }
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
    if (theme === 'garten' || theme === 'zimmer' || theme === 'siedlung' || theme === 'berg') {
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

    // Handy: eine Reihe Erde unter dem Level, damit die Knoepfe auf dem
    // Boden liegen und nicht im Spielfeld. Unter Gruben bleibt es dunkel.
    if (BOTTOM_PAD > 0 && camY + H > w.h * T) {
      for (var ex = tx0; ex <= tx1; ex++) {
        var hole = (ex < 0 || ex >= w.w || !w.solid(ex, w.h - 1));
        for (var ey = w.h; ey * T < camY + H; ey++) {
          if (hole) rect(ex * T - camX, ey * T - camY, T, T, '#07050b');
          else P.draw(ctx, deepSpr, ex * T - camX, ey * T - camY);
        }
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
      } else if (h.type === 'dornen') {
        for (var dx = 0; dx < h.w; dx += T) P.draw(ctx, 'dornbusch', px + dx, py);
      } else {
        // Oel, Salatdressing, Knoblauchsosse (toum) oder heisse Kohle
        var HZ = { oel: ['#3a2a12', '#8a6a2a'], toum: ['#d8d0c0', '#ffffff'],
                   kohle: ['#2a1008', (G.tick >> 3) % 2 ? '#ff6a1a' : '#ffb43c'] };
        var col = (HZ[h.type] || ['#6fa83c'])[0];
        var hi = (HZ[h.type] || [0, '#a8e05a'])[1];
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
    // Level 14 endet am reservierten Tisch im Stilbruch
    if (G.lvl.id === 14) {
      rect(gx - 34, gy - 30, 96, 30, '#5a1e3a');
      rect(gx - 34, gy - 30, 96, 4, '#7a2e52');
      rect(gx - 20, gy - 8, 70, 8, '#6b4522');
      P.draw(ctx, 'shisha', gx - 8, gy - 27);
      P.draw(ctx, 'shisha', gx + 20, gy - 27);
      rect(gx - 6, gy - 64, 56, 14, '#f4f2ec');
      F.draw(ctx, 'RESERVIERT', gx + 22, gy - 60, { color: '#3a2446', align: 'center' });
      if (G.tick % 9 === 0) {
        G.particles.spawn({ x: G.lvl.goal[0] * T - 2 + Math.random() * 30, y: G.lvl.goal[1] * T - 30,
                            vx: 0.1, vy: -0.4, life: 60, col: '#9aa8b8', size: 2, grav: -0.006 });
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

  /** Ampel: Mast, Kasten, drei Lichter. Rot leuchtet mit Schein. */
  function drawAmpeln(camX, camY) {
    for (var i = 0; i < G.ampeln.length; i++) {
      var a = G.ampeln[i];
      var px = Math.round(a.x - camX), gy = 15 * T - camY;
      if (px < -30 || px > W + 30) continue;
      var col = ampelColor(a);
      rect(px + 6, gy - 46, 3, 46, '#3a3a48');
      rect(px, gy - 74, 15, 30, '#101016');
      rect(px + 1, gy - 73, 13, 28, '#22222c');
      var lights = [['rot', '#ff3a30', '#4a1512'], ['gelb', '#ffc23c', '#4a3a12'],
                    ['gruen', '#4ae05a', '#123a18']];
      for (var l = 0; l < 3; l++) {
        var on = (lights[l][0] === col);
        var ly = gy - 69 + l * 8;
        if (on) {
          ctx.globalAlpha = 0.28;
          rect(px - 3, ly - 3, 21, 11, lights[l][1]);
          ctx.globalAlpha = 1;
        }
        rect(px + 4, ly, 7, 6, on ? lights[l][1] : lights[l][2]);
      }
      // Haltelinie auf der Strasse
      rect(px - 4, gy, 3, 3, col === 'rot' ? '#f4f4ee' : '#8a8a96');
    }
  }

  /** Auto samt Fahrer. (cx, feetY) = Mitte unten, s = Vergroesserung. */
  function drawCar(spr, head, headDX, cx, feetY, flip, s) {
    var sp = P.get(spr), hs = P.get(head);
    var left = Math.round(cx - sp.w * s / 2), top = Math.round(feetY - sp.h * s + s);
    ctx.save();
    ctx.translate(left, top);
    ctx.scale(s, s);
    // Kopf zuerst, Auto darueber — so schaut der Fahrer aus dem Fenster
    P.draw(ctx, head, flip ? (sp.w - headDX - hs.w) : headDX, -7, flip);
    P.draw(ctx, spr, 0, 0, flip);
    ctx.restore();
    return { left: left, top: top, w: sp.w * s };
  }

  /* Nach Alex' Flasche sieht Yusuf alles doppelt und schief.
     Das Bild wackelt, ein zweites halbdurchsichtiges Bild liegt
     versetzt darueber. */
  function drawDrunkOrPlain() {
    // Wackeln: nach Alex' Wodka (bis der Kampf vorbei ist) oder kurz nach
    // einer HHC-Welle von Hamza
    if (!G.drunk && !(G.dizzy > 0)) { drawScene(); return; }
    var dt = G.tick * 0.05;
    ctx.save();
    ctx.translate(W / 2 + Math.sin(dt) * 3, H / 2 + Math.cos(dt * 0.8) * 2);
    ctx.rotate(Math.sin(dt * 0.6) * 0.02);
    ctx.translate(-W / 2, -H / 2);
    drawScene();
    ctx.restore();
    // Doppeltes Sehen: das fertige Bild nochmal versetzt darueber legen.
    // (Die Szene ein zweites Mal zu zeichnen hat das Leuchten der Bosse
    // doppelt aufgetragen — Alex war dann nur noch ein oranger Fleck.)
    ctx.globalAlpha = 0.25;
    ctx.drawImage(canvas, Math.round(Math.sin(dt * 1.3) * 6), Math.round(Math.cos(dt) * 4));
    ctx.globalAlpha = 1;
    ctx.fillStyle = G.drunk ? 'rgba(255,150,60,0.07)' : 'rgba(120,230,110,0.09)';
    ctx.fillRect(0, 0, W, H);
  }

  function drawScene() {
    if (G.scene) {
      sceneMod().draw(ctx, G, W, H);
      return;
    }
    if (G.kasse) {
      global.Kasse.draw(ctx, G, W, H);
      return;
    }
    if (G.eat) {
      global.Eat.draw(ctx, G, W, H);
      if (G.banner > 0) drawBanner();
      return;
    }
    var camX = Math.round(G.cam.x + G.cam.sx), camY = Math.round(G.cam.y + G.cam.sy);
    drawSky(G.world.theme);
    // Der Hintergrund ist fuer 288 Pixel Hoehe gezeichnet. In der
    // naeheren Handy-Ansicht wird er mit dem Boden nach oben geschoben.
    ctx.save();
    if (H < 288) ctx.translate(0, H - 288 - BOTTOM_PAD);
    drawParallax(G.world.theme, camX, camY);
    ctx.restore();

    if (G.lvl.deko === 'haus') drawHaus(camX, camY);
    drawCheckpoints(camX, camY);
    if (G.ampeln.length) drawAmpeln(camX, camY);
    drawSigns(camX, camY);
    drawGoal(camX, camY);
    drawTiles(camX, camY);
    drawHazards(camX, camY);
    drawBlocks(camX, camY);
    drawMovers(camX, camY);
    if (G.world.kickers.length) drawKickers(camX, camY);

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
      if (pr.t === 'rauch' || pr.t === 'safran') {
        // Shisha-Schwaden grau, Safranstaub golden
        var gold = (pr.t === 'safran');
        var a2 = Math.min(0.72, pr.life / 90) * 0.9;
        ctx.globalAlpha = a2;
        ctx.fillStyle = gold ? '#d8a42a' : '#c8c2d8';
        var wx = pr.x - camX + (gold ? 12 : 13), wy = pr.y - camY + 9;
        var pf = Math.sin(pr.t0 * 0.06) * 1.5;
        ctx.beginPath(); ctx.arc(wx - 6, wy + 1, 7 + pf, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.arc(wx + 5, wy - 1, 8 - pf, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.arc(wx, wy + 4, 7, 0, 6.3); ctx.fill();
        ctx.fillStyle = gold ? '#ffd869' : '#e8e4f0';
        ctx.beginPath(); ctx.arc(wx - 2, wy - 3, 5, 0, 6.3); ctx.fill();
        ctx.globalAlpha = 1;
        if (gold && G.tick % 4 === 0) {
          G.particles.spawn({
            x: pr.x + 12 + (Math.random() - 0.5) * 20, y: pr.y + 9,
            vx: 0, vy: -0.3, life: 30, col: '#ffcf4a', size: 2, grav: 0.01
          });
        }
        continue;
      }
      if (pr.dead) continue;
      if (pr.t === 'welle') {
        // Bodenwelle: flackernde Zacken, die ueber den Boden rollen
        var wx2 = Math.round(pr.x - camX), wy2 = Math.round(pr.y - camY);
        var ph = (pr.t0 >> 2) % 2;
        ctx.globalAlpha = 0.9;
        rect(wx2, wy2 + 6, 14, 4, pr.col);
        rect(wx2 + 2 + ph * 2, wy2 + 2, 4, 4, pr.col);
        rect(wx2 + 8 - ph * 2, wy2, 4, 6, pr.col);
        rect(wx2 + 1, wy2 + 8, 12, 1, '#ffffff');
        ctx.globalAlpha = 1;
        continue;
      }
      if (pr.patch) {
        // Flecken am Boden: Alex' Pfuetzen, Hummus, Glut, Scherben.
        // (Die Pfuetzen waren frueher unsichtbar — man rutschte, ohne
        // zu sehen warum.)
        var fx2 = Math.round(pr.x - camX), fy2 = Math.round(pr.y - camY);
        ctx.globalAlpha = Math.min(1, pr.life / 30) * 0.9;
        if (pr.t === 'scherben') {
          for (var si = 0; si < pr.w; si += 4) {
            rect(fx2 + si, fy2 + 1 + (si % 8 ? 1 : 0), 3, 2, '#f4f6fa');
            rect(fx2 + si + 1, fy2 + 3, 2, 1, '#2a5ab8');
          }
        } else {
          rect(fx2 + 2, fy2 + 1, pr.w - 4, pr.h - 1, pr.col);
          rect(fx2, fy2 + 2, pr.w, pr.h - 2, pr.col);
          rect(fx2 + 3, fy2 + 1, pr.w - 8, 1,
               pr.t === 'glut' ? ((G.tick >> 2) % 2 ? '#ffd257' : '#ff8a2a') : 'rgba(255,255,255,0.5)');
        }
        ctx.globalAlpha = 1;
        continue;
      }
      if (pr.t === 'hhc') {
        // HHC-Welle: gruen-lila Schwaden, die auf und ab wogen
        var hx = pr.x - camX, hy = pr.y - camY;
        ctx.globalAlpha = Math.min(0.85, pr.life / 40);
        for (var hk = 0; hk < 4; hk++) {
          ctx.fillStyle = hk % 2 ? '#8ae07a' : '#b89ae8';
          ctx.beginPath();
          ctx.arc(hx + 5 + hk * 7, hy + 10 + Math.sin(pr.t0 * 0.2 + hk) * 3, 7, 0, 6.3);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        continue;
      }
      if (pr.t === 'faust') {
        // Kurzes Aufblitzen, wo der Handschuh trifft
        if (pr.life >= 4) {
          ctx.globalAlpha = 0.55;
          rect(pr.x - camX, pr.y - camY + pr.h / 2 - 2, pr.w, 4, '#ffffff');
          ctx.globalAlpha = 1;
        }
        continue;
      }
      if (!pr.spr) continue;
      if (pr.rot) {
        // Zangen, Teller und der Ball drehen sich im Flug
        var rs = P.get(pr.spr);
        ctx.save();
        ctx.translate(Math.round(pr.x - camX + pr.w / 2), Math.round(pr.y - camY + pr.h / 2));
        ctx.rotate(pr.rot);
        P.draw(ctx, pr.spr, -rs.w / 2, -rs.h / 2);
        ctx.restore();
        continue;
      }
      P.draw(ctx, pr.spr, pr.x - camX, pr.y - camY, pr.vx < 0);
    }

    // Die Kolonne faehrt auf der hinteren Spur mit (Level 6)
    var mp = G.player, BACK = 9;
    for (i = 0; i < G.convoy.length; i++) {
      var cv = G.convoy[i];
      var cr = drawCar(cv.def.spr, cv.def.head, 12, cv.x - camX, cv.y - camY - BACK,
                       mp.facing < 0, 2);
      if (cv.t < 360) {
        F.draw(ctx, cv.def.name, cr.left + cr.w / 2, cr.top - 26,
               { color: cv.def.col, align: 'center', shadow: true });
      }
    }

    // Mirkan faehrt neben Yusuf her und fragt
    if (G.mirkan) {
      var sway = Math.sin(G.mirkan.t * 0.07) * 4;
      var mr = drawCar('mercedes', 'mirkan_head', 13, mp.cx() + MIRKAN_OFF + sway - camX,
                       mp.feet() - camY - BACK, mp.facing < 0, 2);
      F.draw(ctx, 'MIRKAN', mr.left + mr.w / 2, mr.top - 26,
             { color: '#b8c0d4', align: 'center', shadow: true });
      if (G.tick % 5 === 0) {
        G.particles.spawn({
          x: mp.cx() + MIRKAN_OFF - 34 + sway, y: mp.feet() - 14,
          vx: -0.7, vy: -0.2, life: 22, col: '#8e8880', size: 2, grav: -0.01
        });
      }
    }

    if (G.boss) drawBoss(camX, camY);
    // Level 12: Lennart (liegend oder im Anflug) und Esat hinter Yusuf
    if (G.lennartLie) drawLennartLie(G.lennartLie, camX, camY);
    if (G.rider && G.rider.pos) drawRider(camX, camY);
    drawPlayer(camX, camY);
    if (G.cut && G.cut.L) drawLennartCut(G.cut, camX, camY);
    drawParticles(camX, camY);
    drawFloats(camX, camY);
    drawTalk(camX, camY);

    // leichte Abdunklung an den Rändern
    var vg = ctx.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, 'rgba(0,0,0,0.20)');
    vg.addColorStop(0.3, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    if (G.cut) drawCutFrame(G.cut);
    if (G.banner > 0) drawBanner();
  }

  /* ---------- Level 11: Yusufs Haus ---------- */

  function drawHaus(camX, camY) {
    var gy = 15 * T - camY, x0 = 6 - camX, w = 112;
    if (x0 > W || x0 + w < -20) return;
    // Hauswand, Dach, Fenster
    rect(x0, gy - 118, w, 118, '#d8c0a0');
    rect(x0, gy - 118, w, 4, '#b89c7c');
    for (var bx = 0; bx < w; bx += 16) rect(x0 + bx, gy - 110, 1, 110, 'rgba(0,0,0,0.05)');
    ctx.fillStyle = '#8a3a2e';
    ctx.beginPath();
    ctx.moveTo(x0 - 10, gy - 118); ctx.lineTo(x0 + w / 2, gy - 164); ctx.lineTo(x0 + w + 10, gy - 118);
    ctx.closePath(); ctx.fill();
    rect(x0 - 10, gy - 120, w + 20, 4, '#5e241c');
    // Fenster oben mit Vorhang
    rect(x0 + 14, gy - 102, 30, 24, '#3a4a6a'); rect(x0 + 14, gy - 102, 30, 3, '#6a82aa');
    rect(x0 + 68, gy - 102, 30, 24, '#3a4a6a'); rect(x0 + 68, gy - 102, 30, 3, '#6a82aa');
    rect(x0 + 14, gy - 102, 8, 24, '#c85a4a'); rect(x0 + 90, gy - 102, 8, 24, '#c85a4a');
    // Tuer mit Nummer und Klingelschild
    rect(x0 + 40, gy - 52, 32, 52, '#5a3a22');
    rect(x0 + 43, gy - 49, 26, 49, '#6e4a2c');
    rect(x0 + 64, gy - 28, 3, 3, '#ffd257');
    F.draw(ctx, '7', x0 + 56, gy - 44, { color: '#ffd257', align: 'center' });
    rect(x0 + 76, gy - 36, 34, 11, '#e8e4dc');
    rect(x0 + 76, gy - 36, 34, 1, '#ffffff');
    F.draw(ctx, 'BALCI', x0 + 93, gy - 34, { color: '#3a3a44', align: 'center' });
    // Die sechs Tueten stehen vor der Tuer
    for (var i = 0; i < 6; i++) {
      P.draw(ctx, 'tuete', x0 + 4 + (i % 3) * 11, gy - 9 - Math.floor(i / 3) * 8);
    }
  }

  /* ---------- Level 12: Rampen, Esat, Lennart ---------- */

  function drawKickers(camX, camY) {
    var ks = G.world.kickers;
    for (var i = 0; i < ks.length; i++) {
      var k = ks[i];
      var px = Math.round(k.x - camX), py = Math.round(k.y - camY);
      if (px < -40 || px - 40 > W) continue;
      // Holzrampe: flach anlaufend, vorne 10 Pixel hoch
      ctx.fillStyle = '#6b4522';
      ctx.beginPath();
      ctx.moveTo(px - 32, py); ctx.lineTo(px, py - 11); ctx.lineTo(px, py); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#b07a45';
      ctx.beginPath();
      ctx.moveTo(px - 32, py); ctx.lineTo(px, py - 11); ctx.lineTo(px, py - 8); ctx.lineTo(px - 26, py);
      ctx.closePath(); ctx.fill();
      rect(px - 2, py - 11, 2, 11, '#4a2c17');
      for (var s = 0; s < 3; s++) rect(px - 24 + s * 8, py - 3 - s * 3, 1, 3 + s * 3, '#8a5a30');
    }
  }

  /** Hebt das Fahrrad auf der Rampe an, damit es nicht durchs Holz faehrt. */
  function rampLift(x, feet) {
    var ks = G.world.kickers;
    for (var i = 0; i < ks.length; i++) {
      var k = ks[i];
      if (x > k.x - 32 && x <= k.x + 2 && Math.abs(feet - k.y) < 3) {
        return Math.round(Math.max(0, Math.min(1, (x - (k.x - 32)) / 32)) * 10);
      }
    }
    return 0;
  }

  /** Fahrrad mit Fahrer. (cx, feet) = Mitte unten, a = Drehung (Salto). */
  function drawBikeRider(who, bikeSpr, cx, feet, flip, a, travel, face) {
    // travel = gefahrene Strecke: alle 5 Pixel drehen sich die Speichen weiter
    var step = Math.floor(travel / 5);
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(feet - 9));
    if (a) ctx.rotate(flip ? a : -a);
    if (flip) ctx.scale(-1, 1);
    P.draw(ctx, bikeSpr + (step % 2 ? '2' : ''), -15, -8);
    if (who === 'lennart') P.draw(ctx, 'lennart', -12, -23);
    else P.drawChar(ctx, who, -2, 2, { pose: 'ride', frame: step >> 1, face: face || 'normal' });
    ctx.restore();
  }

  function drawRider(camX, camY) {
    var r = G.rider, pos = r.pos;
    var talking = G.talk.esat && G.talk.esat.t > 0;
    if (!G.lvl.bike) {
      // Zu Fuss: springt, wo Yusuf gesprungen ist
      var gy = groundAt(pos.x);
      var inAir = (gy !== null && pos.y < gy - 3);
      P.drawChar(ctx, 'esat', pos.x - camX, pos.y - camY, {
        pose: inAir ? 'jump' : (r.moving ? 'run' : 'idle'),
        frame: Math.floor(pos.x / 7), flip: pos.f < 0,
        face: talking ? 'laugh' : 'normal'
      });
      return;
    }
    var lift = rampLift(pos.x, pos.y);
    drawBikeRider('esat', 'bike_e', pos.x - camX, pos.y - camY - lift, pos.f < 0, pos.a,
                  pos.x, talking ? 'laugh' : 'normal');
  }

  function drawLennartCut(c, camX, camY) {
    var L = c.L;
    if (L.lie) {
      drawLennartLie({ x: L.x, y: L.y, a: L.a }, camX, camY);
      return;
    }
    drawBikeRider('lennart', 'bike_l', L.x - camX, L.y - camY, false, L.a, L.x, 'normal');
  }

  /** Lennart liegt auf dem Bauch, daneben die Reste seines Rades. */
  function drawLennartLie(o, camX, camY) {
    var i, deb = o.debris || (G.cut && G.cut.debris) || [];
    for (i = 0; i < deb.length; i++) {
      var d = deb[i], sp = P.get(d.spr);
      ctx.save();
      ctx.translate(Math.round(d.x - camX), Math.round(d.y - camY - sp.h / 2));
      if (d.a) ctx.rotate(d.a);
      P.draw(ctx, d.spr, -sp.w / 2, -sp.h / 2);
      ctx.restore();
    }
    var px = Math.round(o.x - camX), py = Math.round(o.y - camY);
    if (px < -40 || px > W + 40) return;
    ctx.save();
    ctx.translate(px, py - 10);
    ctx.rotate(o.a === undefined ? Math.PI / 2 : o.a);
    P.draw(ctx, 'lennart', -10, -11);
    ctx.restore();
    // Sternchen um den Kopf
    if ((G.tick >> 3) % 3 !== 0) {
      var st = G.tick * 0.12;
      F.draw(ctx, '*', px + 14 + Math.cos(st) * 7, py - 18 + Math.sin(st) * 3, { color: '#ffd257' });
    }
  }

  /** Sprechblasen ueber den Figuren (ohne das Spiel anzuhalten). */
  function drawTalk(camX, camY) {
    for (var who in G.talk) {
      var s = G.talk[who];
      if (!s || s.t <= 0) continue;
      var x, y, p = G.player;
      // Hoehen gestaffelt: Esat faehrt direkt hinter Yusuf, und Lennart
      // liegt beim Vorbeifahren daneben — sonst ueberdecken sich die Blasen.
      if (who === 'yusuf') { x = p.cx(); y = p.y - 22; }
      else if (who === 'esat' && G.rider && G.rider.pos) { x = G.rider.pos.x; y = G.rider.pos.y - 66; }
      else if (who === 'lennart') {
        var L = (G.cut && G.cut.L) || G.lennartLie;
        if (!L) continue;
        x = L.x; y = L.y - (L.lie || !G.cut ? 26 : 48);
      } else continue;
      var sx = Math.round(x - camX), sy = Math.round(y - camY);
      var tw = F.measure(s.text, 1, 1);
      var bx = Math.max(4, Math.min(W - tw - 12, sx - tw / 2 - 4));
      ctx.globalAlpha = Math.min(1, s.t / 12);
      ctx.fillStyle = 'rgba(14,9,20,0.82)';
      ctx.fillRect(bx, sy - 4, tw + 8, 14);
      F.draw(ctx, s.text, bx + 4, sy, { color: SPEAKER[who] ? SPEAKER[who].col : '#ffffff' });
      ctx.globalAlpha = 1;
    }
  }

  /** Kinobalken, Tempo-Streifen und das Standbild mit Namen. */
  function drawCutFrame(c) {
    var i;
    // Tempo-Streifen, solange Lennart rast
    if (c.L && !c.L.lie && c.phase !== 'karte') {
      for (i = 0; i < 7; i++) {
        var sy = 40 + ((i * 53 + G.tick * 3) % (H - 80));
        var sx = W - ((G.tick * 22 + i * 97) % (W + 120));
        rect(sx, sy, 60 + (i % 3) * 20, 1, 'rgba(255,255,255,0.35)');
      }
    }
    if (c.phase === 'karte') {
      // Standbild: warme Toene, Name gross und schraeg im Bild
      ctx.fillStyle = 'rgba(255,140,40,0.16)';
      ctx.fillRect(0, 0, W, H);
      var k = Math.min(1, c.card / 10);
      ctx.save();
      ctx.translate(W / 2, H / 2 - 10);
      ctx.rotate(-0.08);
      ctx.fillStyle = 'rgba(10,6,16,0.82)';
      ctx.fillRect(-W, -30 * k, W * 2, 60 * k);
      rect(-W, -30 * k, W * 2, 2, '#ff6fa8');
      rect(-W, 30 * k - 2, W * 2, 2, '#6fc8e8');
      if (c.card > 6) {
        F.draw(ctx, LV.lennartCut.card, 0, -20, {
          color: '#ffffff', align: 'center', scale: 4, shadow: true, shadowColor: '#ff6fa8'
        });
        F.draw(ctx, LV.lennartCut.cardSub, 0, 14, { color: '#6fc8e8', align: 'center' });
      }
      ctx.restore();
    }
    var bh = Math.round(26 * c.bars);
    if (bh > 0) {
      rect(0, 0, W, bh, '#000000');
      rect(0, H - bh, W, bh, '#000000');
    }
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
      // Doppelt so gross wie frueher — die Trefferbox ist entsprechend breit
      drawCar('mustang', 'y_head', 14, p.cx() - camX, p.feet() - camY, p.facing < 0, 2);
      // Auspuff
      if (Math.abs(p.vx) > 1 && G.tick % 3 === 0) {
        G.particles.spawn({
          x: p.cx() - p.facing * 42, y: p.feet() - 8,
          vx: -p.facing * 1.0, vy: -0.25, life: 26,
          col: '#8e8880', size: 3, grav: -0.01
        });
      }
      return;
    }

    // Level 12: Yusuf auf dem Fahrrad. Beim Salto dreht sich alles mit.
    if (G.lvl.bike && !p.dead) {
      var bps = p.pose();
      var bface = p.flipping ? 'laugh' : bps.face;
      var blift = p.grounded ? rampLift(p.cx(), p.feet()) : 0;
      drawBikeRider('yusuf', 'bike', p.cx() - camX, p.feet() - camY - blift, p.facing < 0,
                    p.flipping ? p.flipA : 0, p.x, bface);
      if (p.sleeping) {
        for (var zi = 0; zi < 3; zi++) {
          var zt = (G.tick * 0.02 + zi * 0.33) % 1;
          F.draw(ctx, 'Z', p.cx() - camX + 8 + zt * 12, p.y - camY - 10 - zt * 18, {
            color: 'rgba(200,185,255,' + (1 - zt).toFixed(2) + ')', scale: 1 + Math.floor(zt * 2)
          });
        }
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

    // Level 10: sechs Tueten. Mindestens.
    if (G.lvl.bags && !p.dead) {
      var bgx = Math.round(p.cx() - camX), bgy = Math.round(p.feet() - camY);
      P.draw(ctx, 'tuete', bgx - 17, bgy - 15);
      P.draw(ctx, 'tuete', bgx + 7, bgy - 13);
    }

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

  /* Angriffe, vor denen gewarnt wird — Beruehrung tut dann weh. */
  var BOSS_WARN = {
    chargeprep: 1, carjump: 1, slam: 1, doubleslam: 1, dashprep: 1,
    stampf: 1, drift: 1, wirbel: 1, tornado: 1, runter: 1,
    blitzprep: 1, sprung: 1,
    dribbelprep: 1, fallrueck: 1, upprep: 1, sirtaki: 1
  };

  /** Leuchtender Rand um einen verwandelten Boss (Sprite-Bosse). */
  function drawAura(sn, col) {
    ctx.globalAlpha = 0.45 + Math.sin(G.tick * 0.25) * 0.2;
    P.drawTint(ctx, sn, -1, 0, col);
    P.drawTint(ctx, sn, 1, 0, col);
    P.drawTint(ctx, sn, 0, -1, col);
    P.drawTint(ctx, sn, 0, 1, col);
    ctx.globalAlpha = 1;
  }

  /** Dasselbe fuer zusammengesetzte Figuren (Huseyin, Esat). */
  function drawCharAura(who, x, y, o, col) {
    // Nur ein Rand, keine Einfaerbung: sonst verschwindet die Figur
    // komplett hinter ihrem eigenen Leuchten.
    var d = (o.scale >= 3) ? 4 : 3;
    var a = { pose: o.pose, face: o.face, frame: o.frame, flip: o.flip, scale: o.scale,
              flash: col, flashAlpha: 1,
              alpha: 0.26 + Math.sin(G.tick * 0.25) * 0.1 };
    P.drawChar(ctx, who, x - d, y, a);
    P.drawChar(ctx, who, x + d, y, a);
    P.drawChar(ctx, who, x, y - d, a);
    P.drawChar(ctx, who, x, y + 1, a);
  }

  function drawBoss(camX, camY) {
    var b = G.boss;
    // Waehrend der Verwandlung zittert er
    var jit = (b.state === 'transform') ? ((G.tick >> 1) % 2 ? 1 : -1) : 0;
    var px = b.cx() - camX + jit, py = b.y + b.h - camY;
    var glow = b.rage && !b.dead;

    // Level-Bosse sind gezeichnete Sprites, keine zusammengesetzten Figuren
    if (E.MINIBOSS[G.lvl.bossType]) {
      var d = b.def;
      var sn = d.spr[b.anim % d.spr.length];
      var sp = P.get(sn);
      var sc = b.scale || d.scale;   // Lennart waechst mitten im Kampf
      var dw = sp.w * sc, dh = sp.h * sc;
      var dx0 = Math.round(b.cx() - camX - dw / 2) + jit;
      var dy0 = Math.round(b.y + b.h - camY - dh);
      // Mirkans Wagen federt beim Rasen
      if (b.t === 'mirkan' && !b.dead && b.grounded &&
          (b.state === 'charge' || b.state === 'drift')) {
        dy0 += (G.tick >> 1) % 2;
      }

      ctx.save();
      if (b.dead) ctx.globalAlpha = Math.max(0.15, 1 - b.deadTimer / 140);
      else if (b.invuln > 0 && b.state !== 'transform' && (G.tick >> 1) % 2 === 0) {
        ctx.globalAlpha = 0.55;
      }
      ctx.translate(dx0 + (b.facing < 0 ? dw : 0), dy0);
      ctx.scale(b.facing < 0 ? -sc : sc, sc);
      // Mirkan sitzt sichtbar am Steuer: Kopf zuerst, der Wagen darueber
      if (b.t === 'mirkan') {
        var bump = (b.state === 'charge' || b.state === 'drift') ? 1 : 0;
        if (glow) P.drawTint(ctx, 'mirkan_head', 9, -7 + bump, b.rageCol);
        P.draw(ctx, 'mirkan_head', 9, -6 + bump, false);
      }
      if (glow || b.state === 'transform') drawAura(sn, b.rageCol);
      if (b.flash > 0 && (G.tick >> 1) % 2 === 0) P.drawWhite(ctx, sn, 0, 0, false);
      else P.draw(ctx, sn, 0, 0, false);
      ctx.restore();

      // Tuning: Flammen aus dem Auspuff
      if (b.t === 'mirkan' && glow && G.tick % 2 === 0) {
        G.particles.spawn({
          x: b.cx() - b.facing * (b.w / 2 + 2), y: b.y + b.h - 8,
          vx: -b.facing * (1.5 + Math.random()), vy: -0.3, life: 14,
          col: (G.tick % 4) ? '#ff8a2a' : '#ffd257', size: 3, grav: -0.02
        });
      }

      if (!b.dead && BOSS_WARN[b.state] && (G.tick >> 2) % 2 === 0) {
        F.draw(ctx, '!', px, dy0 - 16, { color: '#ff6a6a', align: 'center', scale: 2 });
      }
      if (!b.dead && b.state === 'pushups') {
        F.draw(ctx, 'LIEGESTÜTZE', px, dy0 - 14,
               { color: '#ffd257', align: 'center', shadow: true });
      }
      return;
    }

    // Hamza: immer mit dem Ball am Fuss
    if (G.lvl.bossType === 'hamza') {
      var hp2 = 'idle', hf = 'normal';
      if (b.dead) { hp2 = 'hurt'; hf = 'hurt'; }
      else if (b.state === 'transform') { hp2 = 'cheer'; hf = 'rage'; }
      else if (b.state === 'dribbel' || b.state === 'walk') { hp2 = 'run'; hf = b.state === 'dribbel' ? 'rage' : 'normal'; }
      else if (!b.grounded) hp2 = b.vy < 0 ? 'jump' : 'fall';
      else if (b.state === 'humus' || b.state === 'humusregen' || b.state === 'hhc') { hp2 = 'cheer'; hf = 'laugh'; }
      else if (b.state === 'kick') hp2 = 'run';
      if (b.flash > 0) hf = 'hurt';
      else if (b.rage && !b.dead && hf === 'normal') hf = 'rage';
      var ho = { pose: hp2, face: hf, frame: b.anim, flip: b.facing < 0, scale: 2 };
      if (glow || b.state === 'transform') drawCharAura('hamza', px, py, ho, b.rageCol);
      if (b.dead) ho.alpha = Math.max(0.2, 1 - b.deadTimer / 160);
      if (b.flash > 0 && (G.tick >> 1) % 2 === 0) { ho.flash = '#ffffff'; ho.flashAlpha = 0.8; }
      if (b.invuln > 0 && b.state !== 'transform' && (G.tick >> 1) % 2 === 0 && !b.dead) ho.alpha = 0.55;
      P.drawChar(ctx, 'hamza', px, py, ho);
      if (!b.dead && b.ballAtFeet) P.draw(ctx, 'ball', px + (b.facing < 0 ? -20 : 10), py - 10);
      if (!b.dead && b.state === 'hhc' && b.timer > 16) {
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#8ae07a';
        ctx.beginPath(); ctx.arc(px + b.facing * 18, py - 34, 5 + (G.tick % 6), 0, 6.3); ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (!b.dead && BOSS_WARN[b.state] && (G.tick >> 2) % 2 === 0) {
        F.draw(ctx, '!', px, py - b.h - 12, { color: '#ff6a6a', align: 'center', scale: 2 });
      }
      return;
    }

    // Georgios: erst im Hemd, ab der Haelfte oben ohne mit Boxhandschuhen
    if (G.lvl.bossType === 'georgios') {
      var gp = 'idle', gf = 'normal';
      if (b.dead) { gp = 'hurt'; gf = 'hurt'; }
      else if (b.state === 'transform') { gp = 'cheer'; gf = 'rage'; }
      else if (b.boxer && b.punchT > 0) { gp = 'punch'; gf = 'rage'; }
      else if (b.state === 'dash' || b.state === 'sirtaki' || b.state === 'walk' || b.state === 'anlauf') {
        gp = 'run'; gf = b.state === 'walk' ? 'normal' : 'laugh';
      }
      else if (!b.grounded) gp = b.vy < 0 ? 'jump' : 'fall';
      else if (b.boxer) gp = 'guard';
      else if (b.state === 'teller' || b.state === 'oliven') { gp = 'cheer'; gf = 'laugh'; }
      if (b.flash > 0) gf = 'hurt';
      else if (b.rage && !b.dead && gf === 'normal') gf = 'rage';
      var gwho = b.boxer ? 'georgios_box' : 'georgios';
      var go = { pose: gp, face: gf, frame: b.anim, scale: 2,
                 flip: b.state === 'sirtaki' ? ((G.tick >> 2) % 2 === 0) : b.facing < 0 };
      if (glow || b.state === 'transform') drawCharAura(gwho, px, py, go, b.rageCol);
      if (b.dead) go.alpha = Math.max(0.2, 1 - b.deadTimer / 160);
      if (b.flash > 0 && (G.tick >> 1) % 2 === 0) { go.flash = '#ffffff'; go.flashAlpha = 0.8; }
      if (b.invuln > 0 && b.state !== 'transform' && (G.tick >> 1) % 2 === 0 && !b.dead) go.alpha = 0.55;
      P.drawChar(ctx, gwho, px, py, go);
      if (!b.dead && BOSS_WARN[b.state] && (G.tick >> 2) % 2 === 0) {
        F.draw(ctx, '!', px, py - b.h - 12, { color: '#ff6a6a', align: 'center', scale: 2 });
      }
      return;
    }

    // Broke: so schnell, dass er Nachbilder hinterlaesst
    if (G.lvl.bossType === 'broke') {
      var bp = 'idle', bf = 'normal';
      if (b.dead) { bp = 'hurt'; bf = 'hurt'; }
      else if (b.state === 'transform') { bp = 'cheer'; bf = 'rage'; }
      else if (b.state === 'dash' || b.state === 'blitz' || b.state === 'walk') {
        bp = 'run'; bf = b.state === 'walk' ? 'normal' : 'rage';
      }
      else if (b.state === 'mikas' || b.state === 'ansturm') { bp = 'cheer'; bf = 'laugh'; }
      else if (!b.grounded) bp = b.vy < 0 ? 'jump' : 'fall';
      if (b.flash > 0) bf = 'hurt';
      else if (b.rage && !b.dead && bf === 'normal') bf = 'rage';

      var trailCol = b.rage ? b.rageCol : '#9ad0ff';
      for (var ti = 0; ti < b.trail.length; ti++) {
        var tr = b.trail[ti];
        P.drawChar(ctx, 'broke', tr.x - camX, tr.y - camY, {
          pose: 'run', frame: tr.a, flip: tr.f < 0, scale: 2,
          flash: trailCol, flashAlpha: 1, alpha: 0.12 + 0.3 * (ti + 1) / b.trail.length
        });
      }
      var bo = { pose: bp, face: bf, frame: b.anim, flip: b.facing < 0, scale: 2 };
      if (glow || b.state === 'transform') drawCharAura('broke', px, py, bo, b.rageCol);
      if (b.dead) bo.alpha = Math.max(0.2, 1 - b.deadTimer / 160);
      if (b.flash > 0 && (G.tick >> 1) % 2 === 0) { bo.flash = '#ffffff'; bo.flashAlpha = 0.8; }
      if (b.invuln > 0 && b.state !== 'transform' && (G.tick >> 1) % 2 === 0 && !b.dead) {
        bo.alpha = 0.55;
      }
      P.drawChar(ctx, 'broke', px, py, bo);
      if (!b.dead && BOSS_WARN[b.state] && (G.tick >> 2) % 2 === 0) {
        F.draw(ctx, '!', px, py - b.h - 12, { color: '#ff6a6a', align: 'center', scale: 2 });
      }
      return;
    }

    // Alex: klettert auf die Regale und hat immer eine Flasche dabei
    if (G.lvl.bossType === 'alex') {
      var ap = 'idle', af = 'normal';
      if (b.dead) { ap = 'hurt'; af = 'hurt'; }
      else if (b.state === 'transform') { ap = 'cheer'; af = 'rage'; }
      else if (b.state === 'dash' || b.state === 'runter') { ap = 'run'; af = 'rage'; }
      else if (b.state === 'stotter') { ap = 'cheer'; af = 'rage'; }
      else if (b.state === 'walk') ap = 'run';
      else if (!b.grounded) ap = b.vy < 0 ? 'jump' : 'fall';
      else if (b.state === 'trinken' || b.sip > 0) ap = 'cheer';
      if (b.flash > 0) af = 'hurt';
      else if (b.rage && !b.dead && af === 'normal') af = 'drunk';

      var ao = { pose: ap, face: af, frame: b.anim, flip: b.facing < 0,
                 scale: b.rage ? 3 : 2 };
      // Der zweite Alex. Sieht fast gleich aus, macht aber nichts.
      if (b.schatten) {
        P.drawChar(ctx, 'alex', b.schatten.x + b.w / 2 - camX, b.schatten.y + b.h - camY, {
          pose: ap, face: af, frame: b.anim, flip: b.schatten.f < 0,
          scale: b.rage ? 3 : 2, alpha: 0.82, flash: '#6a8ad8', flashAlpha: 0.16
        });
      }
      if (glow || b.state === 'transform') drawCharAura('alex', px, py, ao, b.rageCol);
      if (b.dead) ao.alpha = Math.max(0.2, 1 - b.deadTimer / 160);
      if (b.flash > 0 && (G.tick >> 1) % 2 === 0) { ao.flash = '#ffffff'; ao.flashAlpha = 0.8; }
      if (b.invuln > 0 && b.state !== 'transform' && (G.tick >> 1) % 2 === 0 && !b.dead) {
        ao.alpha = 0.55;
      }
      P.drawChar(ctx, 'alex', px, py, ao);

      // Die Flasche in der Hand
      if (!b.dead && (b.sip > 0 || b.state === 'trinken' || b.state === 'wodka')) {
        P.draw(ctx, b.state === 'trinken' ? 'bier' : 'wodka',
               px + (b.facing < 0 ? -20 : 10), py - b.h * 0.78);
      }
      if (!b.dead && BOSS_WARN[b.state] && (G.tick >> 2) % 2 === 0) {
        F.draw(ctx, '!', px, py - b.h - 12, { color: '#ff6a6a', align: 'center', scale: 2 });
      }
      return;
    }

    // Esat hat eigene Zustaende
    if (G.lvl.bossType === 'esat') {
      var ep = 'idle', ef = 'normal';
      if (b.dead) { ep = 'hurt'; ef = 'hurt'; }
      else if (b.state === 'transform') { ep = 'cheer'; ef = 'rage'; }
      else if (b.state === 'dash') { ep = 'run'; ef = 'rage'; }
      else if (b.state === 'walk') ep = 'run';
      else if (!b.grounded) ep = b.vy < 0 ? 'jump' : 'fall';
      else if (b.state === 'shisha' || b.state === 'agents' || b.state === 'jets') {
        ep = 'cheer'; ef = 'laugh';
      }
      if (b.flash > 0) ef = 'hurt';
      else if (b.rage && !b.dead && ef === 'normal') ef = 'rage';

      var who = b.buff ? 'esat_buff' : 'esat';
      var eo = { pose: ep, face: ef, frame: b.anim, flip: b.facing < 0, scale: b.buff ? 3 : 2 };
      if (glow || b.state === 'transform') drawCharAura(who, px, py, eo, b.rageCol);
      if (b.dead) eo.alpha = Math.max(0.2, 1 - b.deadTimer / 160);
      if (b.flash > 0 && (G.tick >> 1) % 2 === 0) {
        eo.flash = '#ffffff'; eo.flashAlpha = 0.8;
      }
      if (b.invuln > 0 && b.state !== 'transform' && (G.tick >> 1) % 2 === 0 && !b.dead) {
        eo.alpha = 0.55;
      }
      P.drawChar(ctx, who, px, py, eo);

      // Die Snus-Dose in der Hand, solange er sich verwandelt
      if (b.state === 'transform' && b.timer > 60) {
        var sx = px + (b.facing < 0 ? -18 : 12), sy = py - 60;
        rect(sx, sy, 10, 5, '#1c6a8a');
        rect(sx, sy, 10, 1, '#6fc8e8');
        rect(sx + 3, sy + 2, 4, 1, '#ffffff');
      }
      if (!b.dead && BOSS_WARN[b.state] && (G.tick >> 2) % 2 === 0) {
        F.draw(ctx, '!', px, py - b.h - 12, { color: '#ff6a6a', align: 'center', scale: 2 });
      }
      return;
    }

    var pose = 'idle', face = 'normal', frame = b.anim;

    if (b.dead) pose = 'hurt';
    else if (b.state === 'transform') { pose = 'cheer'; face = 'laugh'; }
    else if (b.state === 'pushups') { pose = 'duck'; face = 'laugh'; frame = (G.tick >> 3); }
    else if (b.state === 'dash' || b.state === 'tornado') { pose = 'run'; face = 'laugh'; }
    else if (b.state === 'walk') pose = 'run';
    else if (!b.grounded) pose = b.vy < 0 ? 'jump' : 'fall';
    else if (b.state === 'throw' || b.state === 'shake' || b.state === 'rain') pose = 'cheer';
    if (b.flash > 0) face = 'hurt';
    else if (b.rage && !b.dead) face = 'laugh';

    var opts = {
      pose: pose, face: face, frame: frame,
      flip: b.state === 'tornado' ? ((G.tick >> 2) % 2 === 0) : b.facing < 0,
      scale: 2
    };
    if (glow || b.state === 'transform') drawCharAura('huseyin', px, py, opts, b.rageCol);
    if (b.dead) opts.alpha = Math.max(0.2, 1 - b.deadTimer / 160);
    if (b.flash > 0 && (G.tick >> 1) % 2 === 0) {
      opts.flash = '#ffffff'; opts.flashAlpha = 0.8;
    }
    if (b.invuln > 0 && b.state !== 'transform' && (G.tick >> 1) % 2 === 0 && !b.dead) {
      opts.alpha = 0.55;
    }
    P.drawChar(ctx, 'huseyin', px, py, opts);
    if (!b.dead && BOSS_WARN[b.state] && (G.tick >> 2) % 2 === 0) {
      F.draw(ctx, '!', px, py - b.h - 12, { color: '#ff6a6a', align: 'center', scale: 2 });
    }
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

    if (G.lvl.bike) {
      // Level 12: wie viele Saltos er schon gestanden hat
      F.draw(ctx, 'SALTOS ' + (p.flipCount || 0), 8, 58, { color: '#ffd257', shadow: true });
    } else {
      // Puste fuer die Arschbombe. Leer = kein Stampfer.
      var sw = 60, sf = Math.round(sw * Math.max(0, p.stamina) / p.stamMax);
      var voll = (p.stamina >= 42);
      rect(8, 58, sw, 6, 'rgba(6,4,10,0.6)');
      rect(8, 58, sf, 6, (p.pustT > 0 && (G.tick >> 2) % 2 === 0) ? '#ff6a6a'
                        : (voll ? '#8cd85a' : '#ffc23c'));
      rect(8, 58, sf, 2, 'rgba(255,255,255,0.3)');
      F.draw(ctx, 'BAUCH', 72, 58, { color: voll ? '#c8b8e0' : '#8f86a8', shadow: true });
    }

    // Nach Hamzas HHC-Welle
    if (G.dizzy > 0) {
      F.draw(ctx, 'HHC: ALLES DREHT SICH', 8 + Math.sin(G.tick * 0.12) * 2, 70,
             { color: '#8ae07a', shadow: true });
    }

    // Nach Alex' Dusche: wie viel Yusuf intus hat
    if (G.drunk) {
      F.draw(ctx, 'PROMILLE 1,4', 8 + Math.sin(G.tick * 0.12) * 2, 70,
             { color: '#ff8a2a', shadow: true });
    }

    // Punkte + Zeit. Am Handy liegen oben rechts Pause und Vollbild.
    var rx = G.touch ? W - 58 : W - 8;
    F.draw(ctx, 'PUNKTE ' + p.score, rx, 8, { color: '#ffe9a8', align: 'right', shadow: true });
    var sec = Math.floor(G.time / 60);
    F.draw(ctx, 'ZEIT ' + Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2),
           rx, 20, { color: '#d8cfe8', align: 'right', shadow: true });

    // Gold-Döner-Balken
    if (p.power > 0) {
      var bw = 70, pw = Math.round(bw * p.power / 560);
      rect(rx - bw, 34, bw, 6, 'rgba(0,0,0,0.5)');
      rect(rx - bw, 34, pw, 6, '#ffd257');
      F.draw(ctx, 'GOLD-DÖNER', rx - bw - 4, 34, { color: '#ffd257', align: 'right' });
    }

    // Bosslebensbalken
    if (G.boss && !G.boss.dead && G.bossStarted) {
      var bt2 = G.lvl.bossType;
      var isE = (bt2 === 'esat');
      var mini = E.MINIBOSS[bt2];
      // Der Balken sitzt ganz unten und der Name steht DARIN — sonst
      // liegt die Schrift mitten im Spielfeld und verdeckt den Gegner.
      // Am Handy liegen unten die Knoepfe — dort sitzt der Balken oben.
      var w2 = G.touch ? 190 : 250, x2 = Math.round((W - w2) / 2);
      var by2 = G.touch ? 8 : H - 20;
      if (!G.touch) rect(0, by2 - 4, W, 24, 'rgba(8,5,12,0.72)');
      rect(x2 - 2, by2 - 2, w2 + 4, 16, 'rgba(6,4,10,0.9)');
      rect(x2, by2, w2, 12, '#241830');
      var hw = Math.round(w2 * Math.max(0, G.boss.hp) / G.boss.maxHp);
      // Nach der Verwandlung wechselt der Balken die Farbe und pulsiert
      var isA = (bt2 === 'alex');
      var barCol = G.boss.rage ? G.boss.rageCol
        : (G.boss.barCol || (mini ? mini.col : (isE ? '#6fc8e8' : (isA ? '#c9a05a' : '#5ec24a'))));
      if (G.boss.rage && G.boss.phase >= 3 && (G.tick >> 3) % 2 === 0) barCol = '#ffffff';
      rect(x2, by2, hw, 12, barCol);
      rect(x2, by2, hw, 2, 'rgba(255,255,255,0.35)');
      // Markierung bei der Haelfte: dort verwandelt er sich
      if (!G.boss.rage) rect(x2 + Math.floor(w2 / 2), by2, 1, 12, 'rgba(255,255,255,0.6)');

      var bname = G.boss.barName ||
                  (mini ? mini.name : (isE ? 'ESAT' : (isA ? 'ALEX' : 'HUSEYIN BALCI')));
      F.draw(ctx, bname, W / 2, by2 + 3,
             { color: '#ffffff', align: 'center', shadow: true });

      var lbl = G.boss.rage ? G.boss.rageName : 'PH 1';
      var lblCol = G.boss.rage ? G.boss.rageCol : barCol;
      var openNow = G.boss.open && !G.boss.dead && (G.tick >> 3) % 2 === 0;
      if (G.touch) {
        // Oben ist es eng: Zusatzinfos unter den Balken
        F.draw(ctx, lbl, x2, by2 + 17, { color: lblCol, shadow: true });
        if (openNow) F.draw(ctx, 'OFFEN', x2 + w2, by2 + 17, { color: '#ffd257', align: 'right', shadow: true });
      } else {
        F.draw(ctx, lbl, x2 + w2 + 5, by2 + 3, { color: lblCol });
        // Offenes Fenster sichtbar machen — der Kampf soll lesbar sein
        if (openNow) F.draw(ctx, 'OFFEN', x2 - 5, by2 + 3, { color: '#ffd257', align: 'right' });
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
    mirkan:  { name: 'MIRKAN',  col: '#b8c0d4' },
    alex:    { name: 'ALEX',    col: '#c9a05a' },
    broke:   { name: 'BROKE',   col: '#d8b07a' },
    mika:    { name: 'MIKA',    col: '#9ad0ff' },
    hamza:   { name: 'HAMZA',   col: '#ff6a6a' },
    georgios: { name: 'GEORGIOS', col: '#6a9ae8' },
    typ:     { name: 'TYP VOM NEBENTISCH', col: '#c8c0d8' }
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
      ctx.scale(2, 2);
      P.draw(ctx, 'mirkan_head', 0, 1 + (talking ? 1 : 0));
    } else if (who === 'alex') {
      ctx.scale(2, 2);
      P.draw(ctx, talking ? 'a_head_angry' : 'a_head', 1, 1);
    } else if (who === 'broke') {
      ctx.scale(2, 2);
      P.draw(ctx, talking ? 'b_head_grin' : 'b_head', 1, 1);
    } else if (who === 'mika') {
      // Jeder Mika sieht gleich aus. Welcher gerade redet, weiss keiner.
      ctx.scale(2, 2);
      P.draw(ctx, 'mika', 2, 1 + (talking ? 1 : 0));
    } else if (who === 'hamza') {
      ctx.scale(2, 2);
      P.draw(ctx, talking ? 'ha_head_grin' : 'ha_head', 1, 1);
    } else if (who === 'georgios') {
      ctx.scale(2, 2);
      P.draw(ctx, talking ? 'ge_head_grin' : 'ge_head', 1, 1);
    } else if (who === 'typ') {
      ctx.scale(2, 2);
      P.draw(ctx, 'typ1', 2, 1 + (talking ? 1 : 0));
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
    for (var tx = 0; tx <= W / 16; tx++) {
      P.draw(ctx, SP.tileTop('zimmer'), tx * 16, 240);
      P.draw(ctx, SP.tileFill('zimmer'), tx * 16, 256);
      P.draw(ctx, SP.tileFill('zimmer'), tx * 16, 272);
    }

    // Yusuf & Hussein
    var f = (G.tick >> 3);
    P.drawChar(ctx, 'yusuf', 84, 240, { pose: 'idle', frame: f, face: (G.tick % 200 < 30) ? 'laugh' : 'normal' });
    P.drawChar(ctx, 'huseyin', 152, 240, { pose: 'idle', frame: f, flip: true, face: 'normal' });

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

    var items = menuItems();
    var top0 = titleMenuTop(items.length);
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      var sel = (i === G.menuIdx);
      var y = top0 + i * 15;
      if (sel) {
        F.draw(ctx, '|', W / 2 - F.measure(it.label, 1, 1) / 2 - 14, y,
               { color: '#ffd257' });
      }
      F.draw(ctx, it.label, W / 2, y, {
        color: sel ? '#ffffff' : '#a094b8', align: 'center', shadow: true
      });
    }

    // Bestenliste ist beim Start immer sichtbar: die besten fuenf
    drawTitleBoard();

    ctx.fillStyle = 'rgba(10,6,16,0.72)';
    ctx.fillRect(0, H - 17, W, 17);
    F.draw(ctx, 'EIN SPIEL ÜBER HONIG, SCHLAF UND BRÜDERLICHE GEWALT',
           W / 2, H - 12, { color: '#c0b4d4', align: 'center' });
  }

  function drawTitleBoard() {
    var r = titleBoardRect();
    var b = boardList();
    var list = b.list.slice().sort(SCORE_CATS[0].cmp);
    ctx.fillStyle = 'rgba(10,6,16,0.96)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    rect(r.x, r.y, r.w, 1, '#ffc23c');
    F.draw(ctx, 'BESTENLISTE', r.x + 6, r.y + 5, { color: '#ffd257' });
    F.draw(ctx, b.global ? 'WELTWEIT' : 'LOKAL', r.x + r.w - 6, r.y + 5,
           { color: b.global ? '#6fc8e8' : '#6a6280', align: 'right' });
    if (!list.length) {
      F.draw(ctx, 'NOCH LEER.', r.x + 6, r.y + 30, { color: '#c8b8e0' });
      F.draw(ctx, 'SEI DER ERSTE!', r.x + 6, r.y + 42, { color: '#8f86a8' });
    }
    for (var i = 0; i < list.length && i < 5; i++) {
      var e = list[i], y = r.y + 20 + i * 14;
      var col = i === 0 ? '#ffe9a8' : '#ffffff';
      F.draw(ctx, (i + 1) + '.', r.x + 6, y, { color: '#8f86a8' });
      F.draw(ctx, e.n, r.x + 20, y, { color: col });
      F.draw(ctx, '' + e.s, r.x + r.w - 6, y, { color: col, align: 'right' });
    }
    if ((G.tick >> 5) % 2 === 0) {
      F.draw(ctx, G.touch ? 'ANTIPPEN = ALLE' : 'MENÜ: BESTENLISTE', r.x + r.w / 2, r.y + r.h - 9,
             { color: '#6a6280', align: 'center' });
    }
  }

  function drawSelect() {
    drawSky('festung');
    drawParallax('festung', G.tick * 0.2, 0);
    ctx.fillStyle = 'rgba(8,5,12,0.66)';
    ctx.fillRect(0, 0, W, H);

    F.draw(ctx, 'LEVEL WÄHLEN', W / 2, 24, {
      color: '#ffd257', align: 'center', scale: 3, shadow: true
    });

    // Karten passen sich der Breite an — bei 7 Leveln war die letzte
    // Karte vorher halb abgeschnitten. Ab elf Leveln: zwei Reihen.
    var sc = selectCards();
    var two = sc.rows > 1;
    // Wo was auf der Karte steht: bei zwei Reihen sind die Karten flacher
    var o = two ? { num: 5, zu: 34, frueh: 46, hon: 30, honT: 35, pts: 50, time: 61, neu: 40 }
                : { num: 10, zu: 52, frueh: 64, hon: 48, honT: 53, pts: 72, time: 86, neu: 60 };
    for (var i = 0; i < sc.n; i++) {
      var unlocked = i < save.unlocked;
      var cr = cardRect(sc, i);
      var x = cr.x, y = cr.y, cw = cr.w, ch = cr.h;
      var sel = (i === G.selIdx);

      ctx.fillStyle = sel ? 'rgba(52,34,20,0.95)' : 'rgba(22,15,30,0.9)';
      ctx.fillRect(x, y + (sel ? -6 : 0), cw, ch);
      ctx.strokeStyle = !unlocked ? '#4a4258' : (sel ? '#ffd257' : '#6a5f80');
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1 + (sel ? -6 : 0), cw - 2, ch - 2);

      var yy = y + (sel ? -6 : 0);
      F.draw(ctx, '' + (i + 1), x + cw / 2, yy + o.num, {
        color: unlocked ? '#ffd257' : '#5d5470', align: 'center', scale: 3
      });

      if (!unlocked) {
        F.draw(ctx, 'ZU', x + cw / 2, yy + o.zu, { color: '#5d5470', align: 'center' });
        F.draw(ctx, 'FRÜH', x + cw / 2, yy + o.frueh, { color: '#5d5470', align: 'center' });
      } else {
        // Der Name steht gross unter der Reihe — bei zehn Karten ist
        // hier kein Platz mehr dafuer, da lief er frueher ueber den Rand.
        var b = save.best[i];
        if (b) {
          P.draw(ctx, 'honig', x + cw / 2 - 16, yy + o.hon);
          F.draw(ctx, 'x' + b.honey, x + cw / 2 - 2, yy + o.honT, { color: '#ffe9a8' });
          F.draw(ctx, '' + b.score, x + cw / 2, yy + o.pts,
                 { color: '#a094b8', align: 'center' });
          F.draw(ctx, fmtTime(b.time), x + cw / 2, yy + o.time,
                 { color: '#6a6280', align: 'center' });
        } else {
          F.draw(ctx, 'NEU', x + cw / 2, yy + o.neu, { color: '#8f86a8', align: 'center' });
        }
      }
    }

    // Name und Untertitel des gewaehlten Levels
    var selLvl = LV.list[Math.min(G.selIdx, sc.n - 1)];
    var offen = G.selIdx < save.unlocked;
    F.draw(ctx, offen ? selLvl.name : 'NOCH NICHT FREIGESPIELT',
           W / 2, sc.bottom + (two ? 10 : 14),
           { color: offen ? '#ffffff' : '#6a6280', align: 'center', scale: 2, shadow: true });
    if (offen) {
      F.draw(ctx, selLvl.sub, W / 2, sc.bottom + (two ? 28 : 34),
             { color: '#a094b8', align: 'center' });
    }

    F.draw(ctx, G.touch ? 'KARTE ANTIPPEN   -   NOCHMAL TIPPEN STARTET   -   HIER TIPPEN = ZURÜCK'
                        : 'PFEILE WÄHLEN   -   SPRUNG STARTET   -   ESC ZURÜCK',
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

    F.draw(ctx, G.touch ? 'TIPPEN = ZURÜCK' : 'BELIEBIGE TASTE = ZURÜCK', W / 2, H - 18,
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
    F.draw(ctx, G.partialRun ? 'DER BERG IST GESCHAFFT!' : 'TRAG DICH IN DIE BESTENLISTE EIN', W / 2, 56,
           { color: '#c8b8e0', align: 'center' });

    var sec = Math.floor((G.runTime || 0) / 60);
    F.draw(ctx, 'PUNKTE ' + G.player.score + '   HONIG ' + G.player.honey +
                '   ZEIT ' + fmtTime(sec) + '   TODE ' + (G.player.deaths || 0),
           W / 2, 72, { color: '#ffe9a8', align: 'center' });

    if (G.partialRun) {
      F.draw(ctx, 'IN DIE BESTENLISTE KOMMEN NUR DURCHGÄNGE,', W / 2, 118,
             { color: '#ffffff', align: 'center' });
      F.draw(ctx, 'DIE BEI LEVEL 1 ANFANGEN.', W / 2, 132, { color: '#ffffff', align: 'center' });
      F.draw(ctx, 'WEITER NACH EINEM ABSTURZ ZÄHLT TROTZDEM.', W / 2, 150,
             { color: '#8f86a8', align: 'center' });
      if (G.nameTimer > 45 && (G.tick >> 4) % 2 === 0) {
        F.draw(ctx, G.touch ? 'TIPPEN = WEITER' : 'SPRUNG = WEITER', W / 2, 180,
               { color: '#ffd257', align: 'center' });
      }
    } else if (G.nameSent) {
      // Das Textfeld selbst ist ein HTML-Formular ueber dem Bild (index.html).
      F.draw(ctx, 'EINGETRAGEN!', W / 2, 140, { color: '#ffd257', align: 'center', scale: 2 });
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

    F.draw(ctx, 'BESTENLISTE', W / 2, 7, {
      color: '#ffd257', align: 'center', scale: 3, shadow: true
    });

    var board = boardList();
    var list = board.list.slice();
    var cat = SCORE_CATS[G.scoreCat || 0];
    F.draw(ctx, board.global ? 'WELTWEIT' : 'NUR AUF DIESEM GERÄT', W / 2, 31,
           { color: board.global ? '#6fc8e8' : '#6a6280', align: 'center' });

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

    F.draw(ctx, G.touch ? 'KATEGORIE ANTIPPEN = SORTIEREN     SONST TIPPEN = ZURÜCK'
                        : 'LINKS / RECHTS = SORTIEREN     SPRUNG = ZURÜCK', W / 2, H - 14,
           { color: '#ffd257', align: 'center' });
  }

  function drawTeaser() {
    drawSky('strasse');
    drawParallax('strasse', G.tick * 0.3, 0);
    ctx.fillStyle = 'rgba(8,5,12,0.66)';
    ctx.fillRect(0, 0, W, H);
    drawParticles(0, 0);

    // Nach dem langen Tag: Yusuf schlaeft. Und das Handy klingelt bestimmt gleich.
    var a = Math.min(1, G.endScroll / 60);
    ctx.globalAlpha = a;
    F.draw(ctx, 'FORTSETZUNG', W / 2, 30, {
      color: '#ffd257', align: 'center', scale: 5, shadow: 1,
      shadowColor: '#5e2a10', wave: G.tick * 0.05, waveAmp: 1
    });
    F.draw(ctx, 'FOLGT', W / 2, 74, {
      color: '#ffe9a8', align: 'center', scale: 3, shadow: 1, shadowColor: '#5e2a10'
    });
    ctx.globalAlpha = 1;

    // Die Couch, darauf Yusuf. Daneben das Handy.
    var gy = H - 58;
    rect(0, gy, W, 3, '#5a5f6e');
    rect(W / 2 - 80, gy - 30, 160, 30, '#5a1e3a');
    rect(W / 2 - 80, gy - 30, 160, 4, '#7a2e52');
    ctx.save();
    ctx.translate(W / 2 + 36, gy - 26);
    ctx.rotate(-Math.PI / 2);
    P.drawChar(ctx, 'yusuf', 0, 0, { pose: 'idle', face: 'sleep', scale: 2 });
    ctx.restore();
    for (var zi = 0; zi < 3; zi++) {
      var zt = (G.tick * 0.02 + zi * 0.33) % 1;
      F.draw(ctx, 'Z', W / 2 - 30 + zt * 16, gy - 70 - zt * 24, {
        color: 'rgba(200,185,255,' + (1 - zt).toFixed(2) + ')', scale: 1 + Math.floor(zt * 2)
      });
    }
    var zit = ((G.tick >> 2) % 2) && (G.tick % 120 < 60) ? 1 : 0;
    P.draw(ctx, 'handy', W / 2 + 94 + zit, gy - 12);
    if (G.endScroll > 90) {
      F.draw(ctx, 'YUSUF SCHLÄFT. DAS HANDY LIEGT SCHON BEREIT.', W / 2, H - 44,
             { color: '#c8b8e0', align: 'center' });
    }
    if (G.endScroll > 150 && (G.tick >> 4) % 2 === 0) {
      F.draw(ctx, G.touch ? 'TIPPEN = BESTENLISTE' : 'SPRUNG = BESTENLISTE', W / 2, H - 18,
             { color: '#ffd257', align: 'center' });
    }
  }

  function drawPause() {
    ctx.fillStyle = 'rgba(8,5,12,0.78)';
    ctx.fillRect(0, 0, W, H);
    F.draw(ctx, 'PAUSE', W / 2, 100, { color: '#ffd257', align: 'center', scale: 4, shadow: true });
    F.draw(ctx, 'YUSUF MACHT SOWIESO GERADE PAUSE.', W / 2, 146,
           { color: '#c8b8e0', align: 'center' });
    if (G.touch) { drawTouchButtons(pauseButtons()); return; }
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
      F.draw(ctx, G.touch ? 'TIPPEN FÜR WEITER' : 'SPRUNG DRÜCKEN FÜR WEITER', W / 2, H - 26,
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
    if (G.touch) drawTouchButtons(gameoverButtons());
    else if ((G.tick >> 4) % 2 === 0) {
      F.draw(ctx, 'SPRUNG = NOCHMAL     ESC = HAUPTMENÜ', W / 2, H - 22,
             { color: '#ffd257', align: 'center' });
    }
  }

  function drawEnding() {
    drawSky('garten');
    drawParallax('garten', G.tick * 0.16, 0);
    ctx.fillStyle = 'rgba(8,5,12,0.42)';
    ctx.fillRect(0, 0, W, H);

    for (var tx = 0; tx <= W / 16; tx++) {
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
      F.draw(ctx, G.touch ? 'TIPPEN = HAUPTMENÜ' : 'SPRUNG = HAUPTMENÜ', W / 2, H - 16,
             { color: '#ffd257', align: 'center' });
    }
  }

  /* ================= Skalierung ================= */

  /* Am PC: feste 512x288, moeglichst ganzzahlig vergroessert.
     Am Handy fuellt das Bild den ganzen Bildschirm:
       - die Breite folgt dem Seitenverhaeltnis, also keine schwarzen Balken,
       - im Spiel ist die Ansicht naeher dran (weniger Himmel, groessere
         Figuren), und das Bodenband liegt unten, wo die Knoepfe sind.
     Menues behalten ihre 288 Pixel Hoehe, damit nichts abgeschnitten wird. */
  var PLAY_STATES = { play: 1, dialog: 1, paused: 1 };
  var BOTTOM_PAD = 0;   // Extra-Erde unter dem Level (nur Handy-Spielansicht)

  function wantedView() {
    var ww = window.innerWidth, wh = window.innerHeight;
    var aspect = ww / Math.max(1, wh);
    if (!G.touch || aspect < 1.6) return { w: 512, h: 288 };
    var play = !!PLAY_STATES[G.state];
    var h = play ? 232 : 288;
    var w = Math.round(h * aspect);
    w = Math.max(play ? 400 : 512, Math.min(play ? 580 : 660, w));
    return { w: w, h: h };
  }

  var inMenu = null;

  function applyView() {
    // Steuerknoepfe nur im Spiel zeigen; Menues bedient man per Antippen
    var menuNow = !(G.state === 'play' || G.state === 'dialog');
    if (menuNow !== inMenu) {
      inMenu = menuNow;
      document.body.classList.toggle('inmenu', menuNow);
    }
    var v = wantedView();
    if (v.w === W && v.h === H) return;
    W = v.w; H = v.h;
    BOTTOM_PAD = (H < 288) ? 16 : 0;
    canvas.width = W; canvas.height = H;
    ctx.imageSmoothingEnabled = false;
    resize();
  }

  function resize() {
    var ww = window.innerWidth, wh = window.innerHeight, s;
    if (G.touch) {
      s = Math.min(ww / W, wh / H);
    } else {
      s = Math.max(1, Math.min((ww - 24) / W, (wh - 24) / H));
      // Ganzzahlige Skalierung, solange sie nicht zu viel Platz verschenkt
      var si = Math.floor(s);
      if (si >= 1 && (s - si) < 0.34) s = si;
    }
    canvas.style.width = Math.round(W * s) + 'px';
    canvas.style.height = Math.round(H * s) + 'px';
  }
  function onResize() { applyView(); resize(); }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', function () { setTimeout(onResize, 150); });
  document.addEventListener('fullscreenchange', function () { setTimeout(onResize, 100); });
  document.addEventListener('webkitfullscreenchange', function () { setTimeout(onResize, 100); });

  /* ================= Start ================= */

  global.Input.init(canvas);
  applyView();
  resize();
  // Weltweite Bestenliste sofort holen, damit sie beim Start schon dasteht
  if (global.Online) global.Online.refresh(true);

  /* ---------- Handy: Vollbild ----------
     Browser erlauben Vollbild nur nach einem Tippen. Darum gibt es am
     Handy einen Startknopf: ein Tippen = Vollbild + Querformat sperren
     (Android) + Ton an. Das iPhone kann im Browser kein echtes Vollbild;
     dort hilft "Zum Home-Bildschirm" — von da startet das Spiel ohne
     Adressleiste (siehe manifest.webmanifest). */
  (function mobileStart() {
    var ov = document.getElementById('tapstart');
    var go = document.getElementById('startbtn');
    var hint = document.getElementById('fshint');
    var fsb = document.getElementById('fsbtn');
    if (!ov || !go) return;
    var de = document.documentElement;
    var canFs = !!(de.requestFullscreen || de.webkitRequestFullscreen);
    var ios = /iP(hone|od|ad)/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var standalone = navigator.standalone === true ||
      !!(global.matchMedia && global.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches);

    function isFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
    function lockLandscape() {
      try {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(function () {});
        }
      } catch (e) {}
    }
    function enterFs() {
      try {
        var r = de.requestFullscreen ? de.requestFullscreen({ navigationUI: 'hide' })
                                     : de.webkitRequestFullscreen();
        if (r && r.then) r.then(lockLandscape, function () {});
        else lockLandscape();
      } catch (e) {}
    }
    function exitFs() {
      try {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } catch (e) {}
    }

    if (fsb) {
      if (!canFs || standalone) fsb.hidden = true;
      fsb.addEventListener('click', function () { if (isFs()) exitFs(); else enterFs(); });
    }

    if (!G.touch || standalone) return;   // PC oder schon als App gestartet
    if (!canFs) hint.textContent = ios ? 'Echtes Vollbild: Teilen → Zum Home-Bildschirm' : '';
    ov.hidden = false;
    go.addEventListener('click', function () {
      if (canFs && !isFs()) enterFs();
      S.resume();
      if (G.state === 'title') S.music('menu');
      ov.hidden = true;
      setTimeout(onResize, 250);
    });
  })();

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
    G.gestured = true;
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
  G._board = boardList;
  G._saveCopy = function () { return JSON.parse(JSON.stringify(save)); };

  global.G = G;

})(window);
