/* =====================================================================
   rennen.js — Level 18: "Das Rennen". Yusuf im Mustang gegen den anderen
   Alex im Audi, aus Yusufs Sicht (Pseudo-3D wie bei alten Arcade-Rennern).

   Steuerung: LINKS/RECHTS lenken, A / SPRUNG = Nitro, RUNTER = Bremse.
   Gas gibt der Mustang von allein — er ist ein Mustang.

   Auf der Strecke: Blitzer (wer zu schnell ist, wird fotografiert —
   Alex bremst an jedem Blitzer, deshalb landet am Ende nur Yusuf im
   Knast), Rampen (fliegen!), explosive Faesser, Kegel, Streifenwagen,
   Nitro und Honig. Auf halber Strecke hat Erfan seinen Auftritt.
   ===================================================================== */
(function (global) {
  'use strict';

  var P = global.Pixel, F = global.Font;

  var SEG = 200;                  // Laenge eines Strassenstuecks
  var ROAD = 2000;                // halbe Strassenbreite
  var RUMBLE = 3;
  var CAM_H = 1000;
  var DEPTH = 1 / Math.tan(50 * Math.PI / 180);
  var DRAW = 140;                 // so weit schaut man voraus (Stuecke)
  var PLAYER_Z = CAM_H * DEPTH;
  var MAX = SEG * 0.92;           // Hoechstgeschwindigkeit pro Tick
  var SK = 12;                    // Sprite-Groesse auf der Strasse
  var LIMIT = 100;                // ab so viel km/h blitzt es
  var ERFAN_SEG = 1180;           // hier hat Erfan seinen Auftritt

  function S() { return global.Sound; }
  function rnd(a) { return a[(Math.random() * a.length) | 0]; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeIn(a, b, t) { return a + (b - a) * t * t; }
  function easeInOut(a, b, t) { return a + (b - a) * ((-Math.cos(t * Math.PI) / 2) + 0.5); }
  function sprueche(k) { return (global.Levels.rennen || {})[k] || ['!']; }

  /* ---------- Strecke bauen ---------- */

  function Strecke() { this.segs = []; }
  Strecke.prototype.lastY = function () {
    var n = this.segs.length;
    return n ? this.segs[n - 1].p2.world.y : 0;
  };
  Strecke.prototype.add = function (curve, y) {
    var n = this.segs.length;
    this.segs.push({
      i: n, curve: curve, sprites: [], dunkel: Math.floor(n / RUMBLE) % 2,
      p1: { world: { y: this.lastY(), z: n * SEG }, camera: {}, screen: {} },
      p2: { world: { y: y, z: (n + 1) * SEG }, camera: {}, screen: {} }
    });
  };
  Strecke.prototype.road = function (enter, hold, leave, curve, hill) {
    var y0 = this.lastY(), y1 = y0 + (hill || 0) * SEG, tot = enter + hold + leave, n;
    for (n = 0; n < enter; n++) this.add(easeIn(0, curve, n / enter), easeInOut(y0, y1, n / tot));
    for (n = 0; n < hold; n++) this.add(curve, easeInOut(y0, y1, (enter + n) / tot));
    for (n = 0; n < leave; n++) this.add(easeInOut(curve, 0, n / leave), easeInOut(y0, y1, (enter + hold + n) / tot));
  };
  Strecke.prototype.put = function (i, s) { if (this.segs[i]) this.segs[i].sprites.push(s); };

  function baueStrecke() {
    var tr = new Strecke();
    tr.road(20, 40, 20, 0, 0);            // Start
    tr.road(40, 60, 40, 2, 0);
    tr.road(30, 50, 30, 0, 20);           // Huegel
    tr.road(40, 50, 40, -3, -10);
    tr.road(30, 80, 30, 0, 0);            // lange Gerade mit Rampen
    tr.road(40, 40, 40, 4, 30);
    tr.road(40, 40, 40, -4, -30);
    tr.road(20, 60, 20, 0, 0);
    tr.road(30, 60, 30, 3, -20);
    tr.road(20, 100, 20, 0, 0);           // Erfans Gerade
    tr.road(30, 50, 30, -2, 40);
    tr.road(30, 50, 30, 2, -40);
    tr.road(40, 70, 40, -3, 10);
    tr.road(20, 70, 20, 0, -10);
    tr.road(40, 50, 40, 4, 0);
    tr.road(40, 50, 40, -4, 20);
    tr.road(20, 120, 20, 0, -20);         // Zielgerade
    var len = tr.segs.length, i;

    // Laternen und Haeuser am Rand, alle paar Stuecke
    for (i = 10; i < len; i += 8) {
      tr.put(i, { art: 'laterne', off: -1.25 });
      tr.put(i + 4, { art: 'laterne', off: 1.25 });
    }
    for (i = 30; i < len; i += 55) {
      tr.put(i, { art: 'schild', off: (i % 110 < 55) ? -1.9 : 1.9, text: rnd(sprueche('schilder')) });
    }
    // Blitzer: am Strassenrand, mit Tempolimit-Schild davor
    var blitzer = [260, 520, 780, 1040, 1500, 1760, 2020];
    blitzer.forEach(function (b) {
      tr.put(b - 30, { art: 'limit', off: -1.5 });
      tr.put(b, { art: 'blitzer', off: 1.35, blitzer: true });
    });
    // Rampen auf der langen Geraden und spaeter
    [430, 470, 900, 1600, 1900].forEach(function (r, k) {
      tr.put(r, { art: 'rampe', off: (k % 2 ? 0.45 : -0.45), rampe: true, bw: 0.34 });
    });
    // Explosive Faesser, Kegel, Nitro, Honig
    var mix = [
      [150, 'kegel', 0.5], [155, 'kegel', 0.2], [300, 'fass', -0.5], [305, 'fass', 0.1],
      [360, 'nitro', 0.6], [620, 'fass', 0.4], [640, 'fass', -0.3], [700, 'nitro', -0.6],
      [820, 'kegel', 0], [826, 'kegel', 0.5], [950, 'fass', 0], [1000, 'nitro', 0.2],
      [1350, 'fass', -0.4], [1356, 'fass', 0.4], [1420, 'kegel', -0.6], [1560, 'nitro', 0],
      [1680, 'fass', -0.2], [1700, 'fass', 0.6], [1830, 'kegel', 0.1], [1960, 'fass', -0.5],
      [1962, 'fass', 0.5], [2080, 'nitro', -0.4], [2140, 'fass', 0]
    ];
    mix.forEach(function (o) {
      var bw = o[1] === 'fass' ? 0.13 : (o[1] === 'kegel' ? 0.09 : 0.12);
      tr.put(o[0], { art: o[1], off: o[2], hit: o[1], bw: bw });
    });
    for (i = 60; i < len - 200; i += 120) {
      for (var h = 0; h < 5; h++) tr.put(i + h * 3, { art: 'honig', off: Math.sin(i) * 0.5, hit: 'honig', bw: 0.12 });
    }
    // Erfans Unfallstelle: ein Stapel Faesser am Rand
    for (i = 0; i < 4; i++) tr.put(ERFAN_SEG + 40 + i, { art: 'fass', off: 1.45 + (i % 2) * 0.15, deko: true });
    // Ziel
    tr.ziel = len - 60;
    tr.put(tr.ziel, { art: 'ziel', off: 0 });
    tr.len = len;
    tr.laenge = len * SEG;
    return tr;
  }

  /* ---------- Zustand ---------- */

  function init(G, lvl) {
    var tr = baueStrecke();
    return {
      tr: tr, pos: 0, x: 0, speed: 0, steer: 0,
      nitro: 60, air: 0, airH: 0, bumpT: 0,
      alex: { z: PLAYER_Z + SEG * 4, x: 0.45, speed: 0, zielX: 0.45, rede: null, redeT: 0, fertig: false },
      verkehr: [
        { z: SEG * 700, x: -0.5, speed: MAX * 0.45, spr: 'polizei_heck' },
        { z: SEG * 1450, x: 0.4, speed: MAX * 0.5, spr: 'polizei_heck' },
        { z: SEG * 1800, x: -0.3, speed: MAX * 0.42, spr: 'polizei_heck' }
      ],
      phase: 'start', t: 0, startT: 150,
      blitz: 0, blitzT: 0, geblitzt: 0,
      esat: { text: sprueche('esatStart')[0], t: 150, next: 420 },
      bang: [], funken: [],
      cut: null, erfanDa: false, wrack: null,
      sky: 0, msg: null, msgT: 0
    };
  }

  function findSeg(r, z) { return r.tr.segs[Math.floor(z / SEG) % r.tr.len]; }
  function melde(r, text, col, t) { r.msg = { text: text, col: col || '#ffffff' }; r.msgT = t || 90; }
  function esatSagt(r, text) { r.esat.text = text; r.esat.t = 150; }

  /* ---------- Ablauf ---------- */

  function update(G, W, H) {
    var r = G.modus;
    if (!r || G.dialog) return;
    var In = global.Input, p = G.player;
    r.t++;
    if (r.msgT > 0) r.msgT--;
    if (r.blitzT > 0) r.blitzT--;
    if (r.bumpT > 0) r.bumpT--;
    if (r.esat.t > 0) r.esat.t--;
    tickFunken(r);

    if (r.phase === 'start') {
      if (r.startT % 50 === 0 && r.startT > 0) S().play('select');
      if (--r.startT <= 0) { r.phase = 'rennen'; S().play('power'); melde(r, 'LOS!', '#8cd85a', 60); }
      return;
    }
    if (r.phase === 'crash' || r.phase === 'verloren') {
      r.speed *= 0.95;
      r.pos += r.speed;
      if (--r.endT === 0) G.onPlayerDead();
      return;
    }
    if (r.phase === 'sieg') {
      r.speed *= 0.97;
      r.pos += r.speed;
      if (--r.endT === 0 && G.onRennenDone) G.onRennenDone(r.geblitzt);
      return;
    }
    if (r.cut) { erfanCut(G, r); return; }

    // --- Gas, Nitro, Bremse ---
    var nitro = In.down('jump') && r.nitro > 0;
    var bremse = In.down('down');
    var max = nitro ? MAX * 1.25 : MAX;
    if (bremse) r.speed -= MAX / 70;
    else if (r.speed < max) r.speed += MAX / (nitro ? 90 : 170);
    else r.speed -= MAX / 200;
    if (nitro) {
      r.nitro = Math.max(0, r.nitro - 0.5);
      if (r.t % 3 === 0) funke(r, W / 2 + (Math.random() - 0.5) * 60, H - 30, '#6ab0ff');
    }
    var imGelaende = Math.abs(r.x) > 1.05;
    if (imGelaende && r.air <= 0 && r.speed > MAX * 0.35) {
      r.speed -= MAX / 60;
      if (r.t % 6 === 0) G.shake(2, 4);
    }
    r.speed = Math.max(0, r.speed);

    // --- Lenken und Fliehkraft ---
    var anteil = r.speed / MAX;
    var lenk = (In.down('left') ? -1 : 0) + (In.down('right') ? 1 : 0);
    r.steer += (lenk - r.steer) * 0.25;
    var seg = findSeg(r, r.pos + PLAYER_Z);
    if (r.air <= 0) r.x += r.steer * anteil * 0.038;
    else r.x += r.steer * anteil * 0.02;
    r.x -= anteil * seg.curve * 0.0105;
    r.x = Math.max(-2.1, Math.min(2.1, r.x));

    // --- Vorwaerts ---
    var alterSeg = Math.floor((r.pos + PLAYER_Z) / SEG);
    r.pos += r.speed;
    r.sky += seg.curve * anteil * 0.6;
    if (r.air > 0) {
      r.air--;
      r.airH = Math.sin((1 - r.air / r.airMax) * Math.PI) * 700;
      if (r.air === 0) { r.airH = 0; G.shake(6, 12); S().play('land'); melde(r, rnd(sprueche('landung')), '#ffd257', 60); p.score += 200; }
    }
    var neuerSeg = Math.floor((r.pos + PLAYER_Z) / SEG);
    for (var sg = alterSeg + 1; sg <= neuerSeg; sg++) ueberfahren(G, r, r.tr.segs[sg % r.tr.len]);

    // --- Alex, Verkehr, Erfan ---
    alex(G, r);
    verkehr(G, r);
    if (!r.erfanDa && neuerSeg >= ERFAN_SEG) startErfan(G, r);

    // --- Esat hat zu allem eine Meinung ---
    if (--r.esat.next <= 0) {
      r.esat.next = 380 + ((Math.random() * 260) | 0);
      esatSagt(r, rnd(sprueche('esat')));
    }

    // --- Ziel ---
    var meinZ = r.pos + PLAYER_Z;
    if (!r.alex.fertig && r.alex.z >= r.tr.ziel * SEG) {
      r.alex.fertig = true;
      alexSagt(r, 'ERSTER! AUDI SCHLÄGT MUSTANG!');
    }
    if (meinZ >= r.tr.ziel * SEG) {
      if (r.alex.fertig) {
        r.phase = 'verloren'; r.endT = 150;
        melde(r, 'ALEX WAR ZUERST DA. NOCHMAL!', '#ff6a6a', 150);
        S().play('hurt');
      } else {
        r.phase = 'sieg'; r.endT = 130;
        p.score += 3000;
        melde(r, 'ERSTER! HÖ HÖ HÖÖÖ!', '#8cd85a', 130);
        S().play('win');
      }
    }
  }

  /** Was auf diesem Strassenstueck liegt, wird jetzt ueberfahren (oder nicht). */
  function ueberfahren(G, r, seg) {
    var p = G.player;
    for (var i = 0; i < seg.sprites.length; i++) {
      var s = seg.sprites[i];
      if (s.weg) continue;
      if (s.blitzer) {
        var kmh = Math.round(r.speed / MAX * 240);
        if (kmh > LIMIT) {
          r.geblitzt++;
          r.blitzT = 20;
          S().play('bossHit');
          var pen = Math.min(p.score, 150);
          p.score -= pen;
          melde(r, 'GEBLITZT! ' + kmh + ' KM/H. -' + pen, '#ffffff', 90);
          if (r.geblitzt === 1) esatSagt(r, 'DAS FOTO WIRD GUT. DU HAST GELACHT.');
          else if (Math.random() < 0.5) esatSagt(r, rnd(sprueche('blitzer')));
        } else {
          p.score += 100;
          melde(r, 'BRAV. ' + kmh + ' KM/H. +100', '#8cd85a', 60);
        }
        continue;
      }
      if (r.air > 0) continue;
      var bw = s.bw || 0.12;
      if (Math.abs(s.off - r.x) > bw + 0.17) continue;
      if (s.rampe) {
        if (r.speed > MAX * 0.3) {
          r.airMax = r.air = 40 + Math.round(r.speed / MAX * 25);
          S().play('doubleJump');
          melde(r, rnd(sprueche('rampe')), '#ffd257', 60);
        }
        continue;
      }
      if (s.deko) continue;
      if (s.hit === 'honig') {
        s.weg = true;
        p.honey++; p.score += 50;
        S().play('honey', p.honey % 13);
        continue;
      }
      if (s.hit === 'nitro') {
        s.weg = true;
        r.nitro = Math.min(100, r.nitro + 40);
        S().play('power');
        melde(r, 'NITRO!', '#6ab0ff', 45);
        continue;
      }
      if (s.hit === 'kegel') {
        s.weg = true;
        r.speed *= 0.8;
        S().play('brk');
        melde(r, 'KEGEL!', '#ff9a4a', 40);
        continue;
      }
      if (s.hit === 'fass') {
        s.weg = true;
        explosion(G, r, 256, 190, 1);
        r.speed *= 0.25;
        schaden(G, r, 'BUMM!');
      }
    }
  }

  function schaden(G, r, text) {
    var p = G.player;
    p.hp--;
    G.shake(10, 24);
    S().play('hurt');
    melde(r, text, '#ff6a6a', 60);
    if (Math.random() < 0.6) esatSagt(r, rnd(sprueche('crash')));
    if (p.hp <= 0) {
      r.phase = 'crash'; r.endT = 110;
      p.deaths = p.deaths;              // gezaehlt wird in onPlayerDead
      melde(r, 'TOTALSCHADEN. DER MUSTANG RAUCHT.', '#ff6a6a', 110);
      S().play('die');
    }
  }

  function explosion(G, r, x, y, gross) {
    S().play('pound');
    S().play('brk');
    for (var i = 0; i < 40 * gross; i++) {
      var a = Math.random() * Math.PI * 2, v = (1 + Math.random() * 4) * gross;
      r.funken.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 30 + Math.random() * 20,
                      col: rnd(['#ffd257', '#ff8a2a', '#ff4a2a', '#ffffff', '#8a8e98']), size: 2 + Math.random() * 4 * gross });
    }
  }
  function funke(r, x, y, col) {
    r.funken.push({ x: x, y: y, vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2, life: 16, col: col, size: 2 });
  }
  function tickFunken(r) {
    for (var i = r.funken.length - 1; i >= 0; i--) {
      var f = r.funken[i];
      f.x += f.vx; f.y += f.vy; f.vy += 0.15;
      if (--f.life <= 0) r.funken.splice(i, 1);
    }
  }

  /** Alex im Audi: faehrt sauber, weicht aus — und bremst an jedem Blitzer. */
  function alex(G, r) {
    var a = r.alex, meinZ = r.pos + PLAYER_Z;
    if (a.redeT > 0) a.redeT--;
    if (a.fertig) { a.speed *= 0.97; a.z += a.speed; return; }
    var abstand = (a.z - meinZ) / SEG;
    var ziel = MAX * 0.9;
    if (abstand > 22) ziel = MAX * 0.8;
    if (abstand < -12) ziel = MAX * 1.04;
    // Blitzer in Sicht? Alex bremst. Immer.
    var aSeg = Math.floor(a.z / SEG);
    for (var k = 0; k < 40; k++) {
      var s = r.tr.segs[(aSeg + k) % r.tr.len];
      for (var j = 0; j < s.sprites.length; j++) {
        if (s.sprites[j].blitzer) {
          ziel = MAX * 0.4;
          if (a.redeT === 0 && k === 30) alexSagt(r, rnd(sprueche('alexBlitzer')));
        }
      }
    }
    a.speed += (ziel - a.speed) * 0.03;
    a.z += a.speed;
    // Hindernissen ausweichen
    for (k = 3; k < 16; k++) {
      var s2 = r.tr.segs[(aSeg + k) % r.tr.len];
      for (j = 0; j < s2.sprites.length; j++) {
        var o = s2.sprites[j];
        if (!o.hit || o.weg || o.hit === 'honig' || o.hit === 'nitro') continue;
        if (Math.abs(o.off - a.zielX) < 0.35) a.zielX = o.off > 0 ? -0.5 : 0.5;
      }
    }
    a.x += (a.zielX - a.x) * 0.05;
    // Rempeln
    if (Math.abs(a.z - meinZ) < SEG * 0.9 && Math.abs(a.x - r.x) < 0.36 && r.bumpT === 0 && r.air <= 0) {
      r.bumpT = 50;
      r.speed *= 0.85;
      r.x += (r.x < a.x ? -0.22 : 0.22);
      G.shake(5, 10);
      S().play('stomp');
      alexSagt(r, rnd(sprueche('alexRempel')));
    }
  }
  function alexSagt(r, t) { r.alex.rede = t; r.alex.redeT = 110; }

  /** Langsame Streifenwagen. Nicht reinfahren. */
  function verkehr(G, r) {
    var meinZ = r.pos + PLAYER_Z;
    for (var i = 0; i < r.verkehr.length; i++) {
      var c = r.verkehr[i];
      c.z += c.speed;
      if (r.air > 0 || c.weg) continue;
      if (Math.abs(c.z - meinZ) < SEG * 0.8 && Math.abs(c.x - r.x) < 0.34) {
        c.weg = true;
        explosion(G, r, 256, 200, 1.4);
        r.speed *= 0.3;
        schaden(G, r, 'KRACH! STREIFENWAGEN!');
      }
    }
  }

  /* ---------- Erfans Auftritt ---------- */

  function startErfan(G, r) {
    r.erfanDa = true;
    r.cut = { t: 0, phase: 'spiegel', bars: 0, cla: { z: r.pos + PLAYER_Z - SEG * 6, x: 0.9, speed: 0 }, rede: null, redeT: 0 };
    S().music('spanisch');
  }

  function erfanCut(G, r) {
    var c = r.cut, cla = c.cla, meinZ = r.pos + PLAYER_Z, cl = sprueche('erfanCut');
    c.t++;
    if (c.redeT > 0) c.redeT--;
    c.bars = (c.phase === 'aus') ? Math.max(0, c.bars - 0.05) : Math.min(1, c.bars + 0.05);
    // Die beiden fahren gemuetlich weiter, Lenkung zur Mitte
    var reise = MAX * 0.55;
    r.speed += (reise - r.speed) * 0.05;
    r.x += (0.1 - r.x) * 0.03;
    if (c.phase !== 'karte') {
      r.pos += r.speed;
      r.alex.z += r.speed;
      r.alex.x += (-0.5 - r.alex.x) * 0.04;
    }
    switch (c.phase) {
      case 'spiegel':
        // Im Rueckspiegel: ein schwarzer CLA. Er kommt schnell.
        cla.speed = r.speed * 1.35;
        cla.z += cla.speed;
        if (c.t === 20) esatSagt(r, cl.esatSpiegel);
        if (cla.z > meinZ + SEG * 1.5) { c.phase = 'karte'; c.k = 0; S().play('power'); if (G.flashScreen) G.flashScreen('#ffffff', 14); }
        break;
      case 'karte':
        if (++c.k >= 110) { c.phase = 'fahrt'; c.rede = cl.hola; c.redeT = 120; }
        break;
      case 'fahrt':
        cla.speed = r.speed * 1.12;
        cla.z += cla.speed;
        cla.x = 0.2 + Math.sin(c.t * 0.08) * 0.5;          // Drift, Drift, Drift
        if (c.t % 60 === 0) { c.rede = rnd(cl.drift); c.redeT = 70; }
        if (cla.z > (ERFAN_SEG + 40) * SEG) {
          c.phase = 'crash'; c.ct = 0;
          cla.x = 1.4; cla.speed = 0;
          c.rede = cl.aua; c.redeT = 90;
          r.wrack = { z: cla.z, x: 1.4 };
          c.bang = 26;
          G.shake(14, 40);
          S().stopMusic();
          S().play('die');
        }
        break;
      case 'crash':
        c.ct++;
        if (c.bang > 0) c.bang--;
        if (c.ct === 60) esatSagt(r, cl.esatPass);
        if (c.ct === 120) { c.rede = cl.kubide; c.redeT = 100; }
        if (c.ct === 150) melde(r, cl.yusufPass, '#ffc23c', 70);
        if (c.ct === 220) { alexSagt(r, cl.alexPass); }
        if (c.ct >= 260) { c.phase = 'aus'; S().music('rennen'); }
        break;
      case 'aus':
        if (c.bars <= 0) { r.cut = null; melde(r, 'WEITER GEHT\'S!', '#ffd257', 60); }
        break;
    }
  }

  /* ---------- Zeichnen ---------- */

  function project(pt, camX, camY, camZ, W, H) {
    pt.camera.x = (pt.world.x || 0) - camX;
    pt.camera.y = (pt.world.y || 0) - camY;
    pt.camera.z = (pt.world.z || 0) - camZ;
    pt.screen.scale = DEPTH / pt.camera.z;
    pt.screen.x = Math.round(W / 2 + pt.screen.scale * pt.camera.x * W / 2);
    pt.screen.y = Math.round(H / 2 - pt.screen.scale * pt.camera.y * H / 2);
    pt.screen.w = Math.round(pt.screen.scale * ROAD * W / 2);
  }

  function poly(ctx, x1, y1, x2, y2, x3, y3, x4, y4, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4);
    ctx.closePath(); ctx.fill();
  }
  function rect(ctx, x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawSeg(ctx, W, s, p1, p2) {
    var dunkel = s.dunkel;
    var r1 = p1.w / 7, r2 = p2.w / 7;
    // Gras / Buergersteig
    rect(ctx, 0, p2.y, W, p1.y - p2.y, dunkel ? '#1e2a24' : '#24332c');
    // Randstreifen
    poly(ctx, p1.x - p1.w - r1, p1.y, p1.x - p1.w, p1.y, p2.x - p2.w, p2.y, p2.x - p2.w - r2, p2.y, dunkel ? '#c82a2a' : '#f4f4ee');
    poly(ctx, p1.x + p1.w + r1, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x + p2.w + r2, p2.y, dunkel ? '#c82a2a' : '#f4f4ee');
    // Asphalt
    poly(ctx, p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, dunkel ? '#3a3a44' : '#42424c');
    // Spuren
    if (!dunkel) {
      var l1 = p1.w / 40, l2 = p2.w / 40;
      for (var k = -1; k <= 1; k += 2) {
        var lx1 = p1.x + k * p1.w / 3, lx2 = p2.x + k * p2.w / 3;
        poly(ctx, lx1 - l1, p1.y, lx1 + l1, p1.y, lx2 + l2, p2.y, lx2 - l2, p2.y, '#d8d8d0');
      }
    }
  }

  /** Ein Pixel-Sprite auf der Strasse, skaliert nach Entfernung. */
  function sprite(ctx, name, scale, x, y, W, clip, ax) {
    var sp = P.get(name);
    var dw = sp.w * scale * (W / 2) * SK, dh = sp.h * scale * (W / 2) * SK;
    var dx = x + dw * (ax === undefined ? -0.5 : ax), dy = y - dh;
    if (dw < 1 || dh < 1 || dw > W * 3) return;
    var clipH = clip ? Math.max(0, dy + dh - clip) : 0;
    if (clipH >= dh) return;
    ctx.drawImage(sp.c, 0, 0, sp.w, sp.h - sp.h * clipH / dh, Math.round(dx), Math.round(dy),
                  Math.round(dw), Math.round(dh - clipH));
  }

  /** Dinge, die selbst gezeichnet werden (Laterne, Schild, Rampe, Ziel). */
  function kulisse(ctx, s, scale, x, y, W, clip, t) {
    var u = scale * (W / 2) * SK;              // ein "Pixel" in dieser Entfernung
    if (u < 0.05) return;
    ctx.save();
    if (clip) { ctx.beginPath(); ctx.rect(0, 0, W, clip); ctx.clip(); }
    if (s.art === 'laterne') {
      rect(ctx, x - u, y - 60 * u, 2 * u, 60 * u, '#5a5e68');
      rect(ctx, x - 6 * u, y - 62 * u, 12 * u, 3 * u, '#5a5e68');
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath(); ctx.arc(x, y - 58 * u, 14 * u, 0, 6.3); ctx.fill();
      ctx.globalAlpha = 1;
      rect(ctx, x - 3 * u, y - 60 * u, 6 * u, 2 * u, '#fff4c8');
    } else if (s.art === 'schild' || s.art === 'limit') {
      if (s.art === 'limit') {
        rect(ctx, x - u, y - 30 * u, 2 * u, 30 * u, '#8a8e98');
        ctx.fillStyle = '#e02a2a'; ctx.beginPath(); ctx.arc(x, y - 36 * u, 9 * u, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y - 36 * u, 7 * u, 0, 6.3); ctx.fill();
        if (u > 0.4) F.draw(ctx, '' + LIMIT, x, y - 36 * u - 3 * Math.max(1, Math.floor(u)),
                            { color: '#141418', align: 'center', scale: Math.max(1, Math.floor(u)) });
      } else {
        var bw = 70 * u, bh = 26 * u;
        rect(ctx, x - u * 2, y - 26 * u, 4 * u, 26 * u, '#5a5e68');
        rect(ctx, x - bw / 2, y - 26 * u - bh, bw, bh, '#2a1e3a');
        rect(ctx, x - bw / 2 + u, y - 25 * u - bh, bw - 2 * u, bh - 2 * u, '#ff8ad8');
        rect(ctx, x - bw / 2 + 2 * u, y - 24 * u - bh, bw - 4 * u, bh - 4 * u, '#1a1028');
        if (u >= 0.9) {
          var sc = Math.max(1, Math.floor(u * 0.9));
          var zeilen = F.wrap(s.text, bw - 6 * u, sc, 1);
          for (var z = 0; z < zeilen.length && z < 2; z++) {
            F.draw(ctx, zeilen[z], x, y - 22 * u - bh + z * 9 * sc + 2, { color: '#ffd257', align: 'center', scale: sc });
          }
        }
      }
    } else if (s.art === 'rampe') {
      var rw = 36 * u, rh = 12 * u;
      poly(ctx, x - rw, y, x + rw, y, x + rw * 0.8, y - rh, x - rw * 0.8, y - rh, '#ffd257');
      for (var st = -3; st <= 3; st += 2) {
        poly(ctx, x + st * rw / 4 - rw / 10, y, x + st * rw / 4 + rw / 10, y,
             x + st * rw * 0.2 + rw / 12, y - rh, x + st * rw * 0.2 - rw / 12, y - rh, '#141418');
      }
    } else if (s.art === 'ziel') {
      var zw = 150 * u;
      rect(ctx, x - zw, y - 70 * u, 4 * u, 70 * u, '#f4f4ee');
      rect(ctx, x + zw - 4 * u, y - 70 * u, 4 * u, 70 * u, '#f4f4ee');
      for (var q = 0; q < 20; q++) {
        rect(ctx, x - zw + q * zw / 10, y - 70 * u, zw / 10, 6 * u, q % 2 ? '#141418' : '#f4f4ee');
        rect(ctx, x - zw + q * zw / 10, y - 64 * u, zw / 10, 6 * u, q % 2 ? '#f4f4ee' : '#141418');
      }
    }
    ctx.restore();
  }

  function draw(ctx, G, W, H) {
    var r = G.modus;
    if (!r) return;
    var segs = r.tr.segs, len = r.tr.len, n, s;
    var camH = CAM_H + r.airH;

    // Himmel: Nacht ueber der Stadt
    var grd = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    grd.addColorStop(0, '#0a0818'); grd.addColorStop(1, '#3a2050');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    for (n = 0; n < 40; n++) {
      rect(ctx, ((n * 97 + r.sky * 0.3) % W + W) % W, (n * 37) % 90, 1, 1, '#ffffff');
    }
    ctx.fillStyle = '#fff0c0'; ctx.beginPath(); ctx.arc(W * 0.78 - (r.sky * 0.2 % W), 40, 14, 0, 6.3); ctx.fill();
    skyline(ctx, W, H, r.sky * 0.5, '#1c1430', 60, 0);
    skyline(ctx, W, H, r.sky, '#120c22', 38, 1);

    // Strasse
    var base = findSeg(r, r.pos);
    var basePct = (r.pos % SEG) / SEG;
    var pSeg = findSeg(r, r.pos + PLAYER_Z);
    var pPct = ((r.pos + PLAYER_Z) % SEG) / SEG;
    var pY = lerp(pSeg.p1.world.y, pSeg.p2.world.y, pPct);
    var maxy = H, x = 0, dx = -(base.curve * basePct);
    for (n = 0; n < DRAW; n++) {
      s = segs[(base.i + n) % len];
      s.looped = s.i < base.i;
      s.clip = maxy;
      var camZ = r.pos - (s.looped ? r.tr.laenge : 0);
      project(s.p1, r.x * ROAD - x, pY + camH, camZ, W, H);
      project(s.p2, r.x * ROAD - x - dx, pY + camH, camZ, W, H);
      x += dx; dx += s.curve;
      if (s.p1.camera.z <= DEPTH || s.p2.screen.y >= s.p1.screen.y || s.p2.screen.y >= maxy) continue;
      drawSeg(ctx, W, s, s.p1.screen, s.p2.screen);
      maxy = s.p1.screen.y;
    }

    // Autos und Kulisse, von hinten nach vorn
    var autos = [];
    autos.push({ z: r.alex.z, x: r.alex.x, spr: 'audi_heck', alex: true });
    for (n = 0; n < r.verkehr.length; n++) if (!r.verkehr[n].weg) autos.push({ z: r.verkehr[n].z, x: r.verkehr[n].x, spr: r.verkehr[n].spr, blau: true });
    if (r.cut && r.cut.phase !== 'spiegel') autos.push({ z: r.cut.cla.z, x: r.cut.cla.x, spr: 'cla_heck', erfan: true });
    if (r.wrack) autos.push({ z: r.wrack.z, x: r.wrack.x, spr: 'cla_heck', wrack: true });
    for (n = DRAW - 1; n > 0; n--) {
      s = segs[(base.i + n) % len];
      var sc = s.p1.screen.scale;
      if (!(sc > 0)) continue;
      for (var i = 0; i < s.sprites.length; i++) {
        var o = s.sprites[i];
        if (o.weg) continue;
        var ox = s.p1.screen.x + sc * o.off * ROAD * W / 2, oy = s.p1.screen.y;
        if (o.art === 'laterne' || o.art === 'schild' || o.art === 'limit' || o.art === 'rampe' || o.art === 'ziel') {
          kulisse(ctx, o, sc, ox, oy, W, s.clip, G.tick);
        } else if (o.art === 'honig') {
          sprite(ctx, 'honig', sc * 1.4, ox, oy - sc * W / 2 * SK * 8, W, s.clip);
        } else {
          sprite(ctx, o.art, sc * (o.art === 'blitzer' ? 2.2 : 1.6), ox, oy, W, s.clip);
        }
      }
      for (i = 0; i < autos.length; i++) {
        var a = autos[i];
        var aSegI = Math.floor(a.z / SEG) % len;
        if (aSegI !== s.i) continue;
        var pct = (a.z % SEG) / SEG;
        var asc = lerp(s.p1.screen.scale, s.p2.screen.scale, pct);
        var ax = lerp(s.p1.screen.x, s.p2.screen.x, pct) + asc * a.x * ROAD * W / 2;
        var ay = lerp(s.p1.screen.y, s.p2.screen.y, pct);
        if (!(asc > 0)) continue;
        sprite(ctx, a.spr, asc * 2.2, ax, ay - (a.wrack ? 0 : ((G.tick >> 2) % 2) * asc * 300), W, s.clip);
        var u = asc * (W / 2) * SK;
        if (a.blau && (G.tick >> 3) % 2 === 0) {
          rect(ctx, ax - 10 * u, ay - 40 * u, 8 * u, 3 * u, '#3a6aff');
          rect(ctx, ax + 2 * u, ay - 40 * u, 8 * u, 3 * u, '#ff3a3a');
        }
        if (a.alex && r.alex.redeT > 0 && u > 0.3) blase(ctx, ax, ay - 46 * u, r.alex.rede, '#cdb88c', W);
        if (a.erfan && r.cut && r.cut.redeT > 0 && u > 0.2) blase(ctx, ax, ay - 46 * u, r.cut.rede, '#e8c24a', W);
        if (a.wrack && G.tick % 3 === 0 && u > 0.1) {
          r.funken.push({ x: ax + (Math.random() - 0.5) * 30 * u, y: ay - 20 * u, vx: (Math.random() - 0.5), vy: -1.5,
                          life: 20, col: rnd(['#ff8a2a', '#ffd257', '#5a5a64']), size: 2 + u });
        }
      }
    }

    // Funken und Explosionen
    for (n = 0; n < r.funken.length; n++) {
      var f = r.funken[n];
      ctx.globalAlpha = Math.min(1, f.life / 20);
      rect(ctx, f.x - f.size / 2, f.y - f.size / 2, f.size, f.size, f.col);
    }
    ctx.globalAlpha = 1;
    if (r.cut && r.cut.bang > 0) {
      ctx.globalAlpha = r.cut.bang / 26;
      rect(ctx, 0, 0, W, H, '#ffb43c');
      ctx.globalAlpha = 1;
    }

    cockpit(ctx, G, r, W, H);

    // Blitz vom Blitzer
    if (r.blitzT > 0) {
      ctx.globalAlpha = r.blitzT / 20;
      rect(ctx, 0, 0, W, H, '#ffffff');
      ctx.globalAlpha = 1;
    }
    if (r.cut) erfanOverlay(ctx, G, r, W, H);
    hud(ctx, G, r, W, H);
  }

  function skyline(ctx, W, H, off, col, hoch, seed) {
    var hz = H * 0.5;
    ctx.fillStyle = col;
    for (var i = -1; i < 14; i++) {
      var bx = i * 48 - ((off % 48) + 48) % 48;
      var bh = hoch * (0.4 + ((i * 7 + seed * 3 + 100) % 5) / 5);
      ctx.fillRect(bx, hz - bh, 44, bh + 4);
      if (seed === 0) {
        for (var wy = 0; wy < bh - 8; wy += 8) {
          for (var wx = 4; wx < 40; wx += 8) {
            if (((i * 13 + wy + wx) % 3) === 0) rect(ctx, bx + wx, hz - bh + 4 + wy, 3, 3, '#ffd87a');
          }
        }
      }
    }
  }

  /** Die Motorhaube vom Mustang, das Lenkrad, der Tacho und Esat daneben. */
  function cockpit(ctx, G, r, W, H) {
    var hood = H - 58, bob = r.air > 0 ? 0 : ((G.tick >> 1) % 2) * (r.speed > MAX * 0.5 ? 1 : 0);
    // Motorhaube
    poly(ctx, W * 0.12, H, W * 0.88, H, W * 0.72, hood + bob, W * 0.28, hood + bob, '#8a1414');
    poly(ctx, W * 0.44, H, W * 0.48, H, W * 0.487, hood + bob, W * 0.47, hood + bob, '#141418');
    poly(ctx, W * 0.52, H, W * 0.56, H, W * 0.53, hood + bob, W * 0.513, hood + bob, '#141418');
    rect(ctx, W * 0.28, hood + bob, W * 0.44, 2, '#c83030');
    // Armaturenbrett
    rect(ctx, 0, H - 20, W, 20, '#16141c');
    rect(ctx, 0, H - 20, W, 2, '#2e2a38');
    // Lenkrad
    var lx = W * 0.3, ly = H - 8;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(r.steer * 0.5);
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, 0, 30, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-26, -12); ctx.lineTo(0, -4); ctx.lineTo(26, -12); ctx.stroke();
    // Yusufs Haende
    rect(ctx, -32, -20, 9, 8, '#f0b487');
    rect(ctx, 23, -20, 9, 8, '#f0b487');
    ctx.restore();
    // Esat auf dem Beifahrersitz
    ctx.save();
    ctx.translate(W - 70, H - 4);
    ctx.scale(3, 3);
    P.draw(ctx, esatGrinst(r) ? 'e_head_grin' : 'e_head', -7, -13, true);
    ctx.restore();
    if (r.esat.t > 0) blase(ctx, W - 70, H - 52, r.esat.text, '#6fc8e8', W);
    // Rueckspiegel
    var mx = W / 2 - 34, my = 4;
    rect(ctx, mx - 2, my - 2, 72, 22, '#16141c');
    rect(ctx, mx, my, 68, 18, '#1c2230');
    rect(ctx, mx + 24, my + 8, 20, 10, '#42424c');
    var meinZ = r.pos + PLAYER_Z;
    if (r.cut && r.cut.phase === 'spiegel') {
      var nah = Math.max(0.3, 1 - (meinZ - r.cut.cla.z) / (SEG * 6));
      var cs = P.get('cla_heck');
      ctx.drawImage(cs.c, mx + 34 - 12 * nah, my + 4, 24 * nah, 13 * nah);
    } else if (r.alex.z < meinZ && meinZ - r.alex.z < SEG * 12) {
      var an = Math.max(0.3, 1 - (meinZ - r.alex.z) / (SEG * 12));
      var as = P.get('audi_heck');
      ctx.drawImage(as.c, mx + 34 - 12 * an, my + 4, 24 * an, 13 * an);
    }
    rect(ctx, mx, my, 68, 2, 'rgba(255,255,255,0.15)');
  }
  function esatGrinst(r) { return r.esat.t > 0 && (r.t >> 3) % 2 === 0; }

  function blase(ctx, x, y, text, col, W) {
    if (!text) return;
    var tw = F.measure(text, 1, 1) + 10;
    var bx = Math.max(4, Math.min(W - tw - 4, Math.round(x - tw / 2))), by = Math.round(y - 14);
    rect(ctx, bx, by, tw, 13, 'rgba(10,6,16,0.9)');
    rect(ctx, bx, by + 12, tw, 1, col);
    F.draw(ctx, text, bx + 5, by + 3, { color: col });
  }

  function erfanOverlay(ctx, G, r, W, H) {
    var c = r.cut, bh = Math.round(c.bars * 26);
    rect(ctx, 0, 0, W, bh, '#000000');
    rect(ctx, 0, H - bh, W, bh, '#000000');
    if (c.phase === 'karte') {
      var k = c.k, x = Math.min(40, -300 + k * 18);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
      rect(ctx, x, H / 2 - 36, 300, 58, '#e8c24a');
      rect(ctx, x + 4, H / 2 - 32, 292, 50, '#141018');
      var cl = sprueche('erfanCut');
      F.draw(ctx, cl.karte, x + 18, H / 2 - 24, { color: '#e8c24a', scale: 3, shadow: true });
      F.draw(ctx, cl.karteSub, x + 18, H / 2 + 4, { color: '#ffffff' });
      ctx.save();
      ctx.translate(x + 250, H / 2 + 12);
      ctx.scale(3, 3);
      P.draw(ctx, 'erfan', -8, -16);
      ctx.restore();
    }
  }

  function hud(ctx, G, r, W, H) {
    var p = G.player;
    var kmh = Math.round(r.speed / MAX * 240);
    // Tacho
    F.draw(ctx, kmh + ' KM/H', W * 0.5, H - 15, { color: kmh > LIMIT ? '#ff6a6a' : '#ffe9a8', align: 'center', scale: 2 });
    // Nitro
    rect(ctx, W * 0.62, H - 14, 60, 6, '#241830');
    rect(ctx, W * 0.62, H - 14, 60 * r.nitro / 100, 6, '#6ab0ff');
    F.draw(ctx, 'NITRO', W * 0.62, H - 22, { color: '#8ab8ff' });
    // Herzen
    for (var i = 0; i < p.maxHp; i++) {
      if (i >= p.hp) ctx.globalAlpha = 0.28;
      P.draw(ctx, 'herz', 8 + i * 13, 8);
      ctx.globalAlpha = 1;
    }
    P.draw(ctx, 'honig', 8, 24);
    F.draw(ctx, 'x' + p.honey, 24, 29, { color: '#ffe9a8', shadow: true });
    F.draw(ctx, 'YUSUF x' + Math.max(0, p.lives), 8, 44, { color: '#f4bd91', shadow: true });
    // Platz und Strecke
    var meinZ = r.pos + PLAYER_Z, ziel = r.tr.ziel * SEG;
    var platz = (r.alex.z > meinZ || r.alex.fertig) ? 2 : 1;
    F.draw(ctx, 'PLATZ ' + platz + '/2', W - 8, 8, { color: platz === 1 ? '#8cd85a' : '#ff8a8a', align: 'right', scale: 2, shadow: true });
    F.draw(ctx, 'GEBLITZT: ' + r.geblitzt, W - 8, 28, { color: '#ffffff', align: 'right', shadow: true });
    var bx = W - 108, by = 42;
    rect(ctx, bx, by, 100, 4, '#241830');
    rect(ctx, bx + 100 * Math.min(1, meinZ / ziel) - 2, by - 2, 4, 8, '#ff5a4a');
    rect(ctx, bx + 100 * Math.min(1, r.alex.z / ziel) - 2, by - 2, 4, 8, '#c8ccd6');
    F.draw(ctx, 'DU', bx + 100 * Math.min(1, meinZ / ziel), by + 8, { color: '#ff8a8a', align: 'center' });
    // Meldungen
    if (r.msgT > 0 && r.msg) {
      ctx.globalAlpha = Math.min(1, r.msgT / 16);
      F.draw(ctx, r.msg.text, W / 2, 64, { color: r.msg.col, align: 'center', scale: 2, shadow: true });
      ctx.globalAlpha = 1;
    }
    if (r.phase === 'start') {
      var z = Math.ceil(r.startT / 50);
      F.draw(ctx, z > 0 ? '' + z : 'LOS!', W / 2, 90, { color: '#ffd257', align: 'center', scale: 5, shadow: true });
      F.draw(ctx, G.touch ? 'LENKEN: PFEILE   A = NITRO   RUNTER = BREMSE'
                          : 'LENKEN: PFEILE   SPRUNG = NITRO   RUNTER = BREMSE',
             W / 2, 140, { color: '#ffffff', align: 'center', shadow: true });
      F.draw(ctx, 'BLITZER: AB ' + LIMIT + ' KM/H WIRD FOTOGRAFIERT.', W / 2, 152, { color: '#c8b8e0', align: 'center', shadow: true });
    }
  }

  global.Rennen = { init: init, update: update, draw: draw, full: true, ERFAN_SEG: ERFAN_SEG, SEG: SEG };

})(window);
