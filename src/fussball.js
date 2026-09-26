/* =====================================================================
   fussball.js — Level 16: "Das Spiel des Jahres".

   Yusuf und Esat gegen Georgios und den anderen Alex, auf dem Bolzplatz.
   Gespielt wird mit der normalen Steuerung: Laufen treibt den Ball,
   Springen in den Ball ist ein Kopfball, B / Shift / E ist der Schuss,
   und der Bauch-Stampfer auf den Ball ist ein BAUCHSCHUSS, den nicht mal
   Alex mit seinen Kruecken haelt. Wer zuerst drei Tore hat, gewinnt.
   Links steht unser Tor (leer — Esat hilft hinten aus), rechts Alex.
   ===================================================================== */
(function (global) {
  'use strict';

  var T = 16;
  var P = global.Pixel, F = global.Font;
  var FLOOR = 15 * T;
  var TOR_W = 2 * T;              // so tief ist ein Tor
  var LATTE = 12 * T;             // Unterkante der Querlatte
  var PLATZ_W = 32 * T;
  var ZIEL = 3;                   // Tore zum Sieg
  var R = 5;                      // Ballradius

  function S() { return global.Sound; }
  function rnd(a) { return a[(Math.random() * a.length) | 0]; }
  function sprueche(k) { return (global.Levels.fussball || {})[k] || ['!']; }

  function neuerBall() { return { x: PLATZ_W / 2, y: FLOOR - 70, vx: 0, vy: 0, rot: 0, durch: 0 }; }

  function spieler(who, team, rolle, tx, scale) {
    return { who: who, team: team, rolle: rolle, x: tx * T, y: FLOOR, vx: 0, vy: 0,
             facing: team === 0 ? 1 : -1, anim: 0, grounded: true, scale: scale || 1,
             cool: 0, swing: 0, startX: tx * T };
  }

  function init(G, lvl) {
    return {
      score: [0, 0], phase: 'anstoss', t: 0, pauseT: 70,
      ball: neuerBall(),
      bots: [
        spieler('esat', 0, 'sturm', 12),
        spieler('georgios', 1, 'sturm', 20),
        spieler('alexg', 1, 'tor', 28.5, 1.35)
      ],
      shotCool: 0, niederlagen: 0, meldung: null, meldT: 0
    };
  }

  function melden(m, text, col) { m.meldung = { text: text, col: col || '#ffffff' }; m.meldT = 110; }

  /* ---------- Ablauf ---------- */

  function update(G, W, H) {
    var m = G.modus, p = G.player, b = m.ball, i;
    m.t++;
    if (m.meldT > 0) m.meldT--;
    if (m.shotCool > 0) m.shotCool--;

    if (m.phase === 'anstoss') {
      if (--m.pauseT <= 0) { m.phase = 'spiel'; S().play('select'); melden(m, 'ANSTOSS!', '#ffd257'); }
      return;
    }
    if (m.phase === 'tor') {
      if (--m.pauseT <= 0) aufstellen(G, m);
      return;
    }
    if (m.phase === 'sieg' || m.phase === 'niederlage') {
      if (--m.pauseT === 0) {
        if (m.phase === 'sieg') { if (G.onFussballDone) G.onFussballDone(); }
        else nochmal(G, m);
      }
      return;
    }

    // --- Der Ball ---
    b.vy += 0.28;
    b.vx *= 0.995;
    b.x += b.vx; b.y += b.vy;
    b.rot += b.vx * 0.12;
    if (b.durch > 0) b.durch--;
    if (b.y + R > FLOOR) {
      b.y = FLOOR - R;
      if (b.vy > 0) { b.vy = -b.vy * 0.6; if (Math.abs(b.vy) < 1.1) b.vy = 0; }
      b.vx *= 0.975;
    }
    if (b.y - R < 0) { b.y = R; b.vy = Math.abs(b.vy) * 0.6; }
    latte(b, TOR_W, true);
    latte(b, PLATZ_W - TOR_W, false);

    // Tor?
    if (b.y > LATTE + 2 && b.x - R < 4) { tor(G, m, 1); return; }
    if (b.y > LATTE + 2 && b.x + R > PLATZ_W - 4) { tor(G, m, 0); return; }
    // Sonst prallt er von der Bande ab
    if (b.x - R < 0) { b.x = R; b.vx = Math.abs(b.vx) * 0.7; }
    if (b.x + R > PLATZ_W) { b.x = PLATZ_W - R; b.vx = -Math.abs(b.vx) * 0.7; }

    // --- Yusuf am Ball ---
    var box = { x: b.x - R, y: b.y - R, w: 2 * R, h: 2 * R };
    var nah = Math.abs(b.x - p.cx()) < 26 && Math.abs(b.y - (p.y + p.h / 2)) < 26;
    if (nah && m.shotCool === 0 && global.Input.hit('throw')) {
      b.vx = p.facing * 8.6; b.vy = -4.6;
      m.shotCool = 20;
      S().play('shoot');
      G.floats.add(p.cx(), p.y - 10, rnd(['SCHUSS!', 'DER GEHT REIN.', 'HÖ HÖ HÖÖÖ!']), '#ffd257', 45);
      p.laughTimer = 30;
    } else if (!p.dead && overlap(box, p) && m.shotCool < 12) {
      if (p.pound === -1) {
        b.vx = p.facing * 11.5; b.vy = -2.2;
        m.shotCool = 24;
        G.shake(6, 14);
        S().play('pound');
        G.floats.add(p.cx(), p.y - 14, 'BAUCHSCHUSS!', '#ff9ec4', 70);
      } else if (p.vy < -1 && b.y < p.y + 10) {
        b.vy = -6.6; b.vx = p.facing * 4 + p.vx * 0.5;
        m.shotCool = 14;
        S().play('stomp');
        G.floats.add(p.cx(), p.y - 10, 'KOPFBALL!', '#ffe9a8', 40);
      } else {
        b.vx = p.vx * 1.4 + p.facing * 1.8;
        b.vy = Math.min(b.vy, -1.6);
        b.x = p.facing > 0 ? p.x + p.w + R + 1 : p.x - R - 1;
      }
    }

    // --- Die anderen ---
    for (i = 0; i < m.bots.length; i++) bot(G, m, m.bots[i]);
  }

  /** Querlatte: ein duenner Balken ueber dem Tor. Von unten und oben prallt
      der Ball ab, seitlich rollt er ins Tor oder dran vorbei. */
  function latte(b, kante, links) {
    var x0 = links ? 0 : kante, x1 = links ? kante : PLATZ_W;
    var y0 = LATTE - 5, y1 = LATTE;
    if (b.x + R < x0 || b.x - R > x1 || b.y + R < y0 || b.y - R > y1) return;
    if (b.vy > 0 && b.y < y0 + 2) { b.y = y0 - R; b.vy = -b.vy * 0.6; }
    else if (b.vy < 0 && b.y > y1 - 2) { b.y = y1 + R; b.vy = -b.vy * 0.6; }
    else { b.vx = -b.vx * 0.7; b.x += b.vx > 0 ? 3 : -3; }
    S().play('stomp');
  }

  function overlap(a, q) {
    return a.x < q.x + q.w && a.x + a.w > q.x && a.y < q.y + q.h && a.y + a.h > q.y;
  }

  /** Eine Figur: laeuft, springt, schiesst. Kein Koerperkontakt. */
  function bot(G, m, s) {
    var b = m.ball, zielX, tempo;
    if (s.cool > 0) s.cool--;
    if (s.swing > 0) s.swing--;

    if (s.rolle === 'tor') {
      // Alex bleibt vor seinem Kasten und stuetzt sich auf die Kruecken
      var komm = b.vx > 1.5 && b.x > 18 * T;
      zielX = Math.max(26 * T, Math.min(29.6 * T, komm ? b.x + 20 : s.startX));
      tempo = 1.4;
      if (s.grounded && komm && b.y < FLOOR - 42 && Math.abs(b.x - s.x) < 80) s.vy = -6.6;
    } else if (s.team === 0) {
      // Esat: hinten aushelfen, vorne mitlaufen
      zielX = b.x < 17 * T ? b.x - 8 : b.x - 56;
      tempo = 2.05;
    } else {
      // Georgios: immer zum Ball, von rechts, damit er nach links spielt
      zielX = b.x + 8;
      tempo = 2.3 + m.score[0] * 0.08;
    }
    var d = zielX - s.x;
    s.vx += Math.max(-0.35, Math.min(0.35, d * 0.05));
    s.vx = Math.max(-tempo, Math.min(tempo, s.vx));
    if (Math.abs(d) < 3) s.vx *= 0.7;
    if (s.rolle !== 'tor' && s.grounded && Math.abs(b.x - s.x) < 30 && b.y < s.y - 40 && b.vy > -1) s.vy = -7.2;
    s.vy += 0.5;
    s.x += s.vx; s.y += s.vy;
    if (s.y >= FLOOR) { s.y = FLOOR; s.vy = 0; s.grounded = true; } else s.grounded = false;
    s.x = Math.max(8, Math.min(PLATZ_W - 8, s.x));
    if (Math.abs(s.vx) > 0.3) s.facing = s.vx > 0 ? 1 : -1;
    else s.facing = b.x > s.x ? 1 : -1;
    s.anim = (Math.abs(s.vx) > 0.3) ? (m.t >> 2) : (m.t >> 4);

    // Am Ball?
    var hoehe = 30 * s.scale;
    var dran = Math.abs(b.x - s.x) < 10 * s.scale && b.y > s.y - hoehe && b.y < s.y + 2;
    if (!dran || s.cool > 0 || (s.rolle === 'tor' && b.durch > 0)) return;
    s.cool = 16;
    var sp = Math.abs(b.vx) + Math.abs(b.vy) * 0.5;
    if (s.rolle === 'tor') {
      var halt = sp < 5.5 ? 0.92 : (sp < 9.5 ? 0.5 : 0.12);
      if (Math.random() < halt) {
        b.vx = -(3 + Math.random() * 2.4); b.vy = -3.5;
        s.swing = 14;
        S().play('stomp');
        G.floats.add(s.x, s.y - 50, rnd(sprueche('parade')), '#cdb88c', 55);
      } else {
        b.durch = 20;
        G.floats.add(s.x, s.y - 50, rnd(sprueche('durch')), '#cdb88c', 55);
      }
      return;
    }
    var richtung = s.team === 0 ? 1 : -1;
    var schussZone = s.team === 0 ? b.x > 19 * T : b.x < 13 * T;
    if (schussZone) {
      b.vx = richtung * ((s.team === 0 ? 6.6 : 5.8) + Math.random() * 1.6);
      b.vy = -2.4 - Math.random() * 3;
      S().play('shoot');
      if (Math.random() < 0.5) G.floats.add(s.x, s.y - 40, rnd(sprueche(s.who)), s.team === 0 ? '#6fc8e8' : '#6a9ae8', 50);
    } else {
      b.vx = richtung * (2.8 + Math.random() * 1.2);
      b.vy = -1.8;
    }
  }

  function tor(G, m, team) {
    m.score[team]++;
    m.phase = 'tor';
    m.pauseT = 130;
    m.ball.vx *= 0.2; m.ball.vy = 0;
    G.shake(5, 20);
    if (team === 0) {
      S().play('oneUp');
      G.player.score += 1000;
      G.player.laughTimer = 90;
      melden(m, rnd(sprueche('tor')), '#8cd85a');
      G.particles.burst(m.ball.x, m.ball.y, 30, { col: '#ffd257', spread: 4, up: 1.4, life: 50 });
    } else {
      S().play('hurt');
      melden(m, rnd(sprueche('gegentor')), '#ff6a6a');
    }
    if (m.score[0] >= ZIEL) { m.phase = 'sieg'; m.pauseT = 150; melden(m, 'ABPFIFF! GEWONNEN!', '#8cd85a'); S().play('win'); }
    else if (m.score[1] >= ZIEL) { m.phase = 'niederlage'; m.pauseT = 150; melden(m, 'ABPFIFF. VERLOREN.', '#ff6a6a'); }
  }

  /** Nach einem Tor: alle zurueck auf Anfang, kurzer Anstoss. */
  function aufstellen(G, m) {
    var p = G.player;
    m.ball = neuerBall();
    for (var i = 0; i < m.bots.length; i++) {
      var s = m.bots[i];
      s.x = s.startX; s.y = FLOOR; s.vx = 0; s.vy = 0; s.cool = 20;
    }
    p.x = 8 * T; p.y = FLOOR - p.h; p.vx = 0; p.vy = 0; p.facing = 1;
    m.phase = 'anstoss';
    m.pauseT = 50;
  }

  function nochmal(G, m) {
    m.niederlagen++;
    G.player.deaths = (G.player.deaths || 0) + 1;
    m.score = [0, 0];
    melden(m, 'REVANCHE! NOCHMAL VON VORNE.', '#ffd257');
    aufstellen(G, m);
  }

  /* ---------- Zeichnen ---------- */

  function rect(ctx, x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function torZeichnen(ctx, camX, camY, links) {
    var x0 = (links ? 0 : PLATZ_W - TOR_W) - camX, y0 = LATTE - camY;
    var h = FLOOR - LATTE;
    // Netz
    ctx.globalAlpha = 0.55;
    for (var nx = 0; nx <= TOR_W; nx += 5) rect(ctx, x0 + nx, y0, 1, h, '#e8eef4');
    for (var ny = 0; ny <= h; ny += 5) rect(ctx, x0, y0 + ny, TOR_W, 1, '#e8eef4');
    ctx.globalAlpha = 1;
    // Pfosten vorne und Latte
    var px = links ? x0 + TOR_W - 3 : x0;
    rect(ctx, px, y0 - 5, 3, h + 5, '#ffffff');
    rect(ctx, x0, y0 - 5, TOR_W, 5, '#ffffff');
    rect(ctx, x0, y0 - 5, TOR_W, 1, '#c8ccd4');
  }

  function draw(ctx, G, camX, camY) {
    var m = G.modus, i;
    torZeichnen(ctx, camX, camY, true);
    torZeichnen(ctx, camX, camY, false);
    // Mittellinie und Anstosspunkt auf dem Rasen
    rect(ctx, PLATZ_W / 2 - 1 - camX, FLOOR - camY, 2, 4, '#ffffff');
    rect(ctx, PLATZ_W / 2 - 3 - camX, FLOOR - camY + 1, 6, 2, '#ffffff');

    for (i = 0; i < m.bots.length; i++) {
      var s = m.bots[i];
      var pose = !s.grounded ? (s.vy < 0 ? 'jump' : 'fall') : (Math.abs(s.vx) > 0.3 ? 'run' : 'idle');
      if (s.swing > 0) pose = 'punch';
      var face = (m.phase === 'tor' || m.phase === 'sieg' || m.phase === 'niederlage')
        ? (((m.phase === 'sieg') === (s.team === 0)) ? 'laugh' : 'hurt') : 'normal';
      if (s.rolle === 'tor') {
        // Die Kruecken stehen links und rechts neben ihm
        var kx = s.x - camX, ky = s.y - camY;
        ctx.strokeStyle = '#8a8e98'; ctx.lineWidth = 2;
        var sw = s.swing > 0 ? 10 : 0;
        ctx.beginPath(); ctx.moveTo(kx - 12, ky - 22); ctx.lineTo(kx - 16 - sw, ky); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(kx + 12, ky - 22); ctx.lineTo(kx + 16 + sw, ky); ctx.stroke();
        rect(ctx, kx - 14, ky - 26, 4, 4, '#c82a2a');
        rect(ctx, kx + 10, ky - 26, 4, 4, '#c82a2a');
      }
      P.drawChar(ctx, s.who, s.x - camX, s.y - camY, {
        pose: pose, face: face, frame: s.anim, flip: s.facing < 0, scale: s.scale
      });
    }

    var b = m.ball;
    var sp = P.get('ball');
    ctx.save();
    ctx.translate(Math.round(b.x - camX), Math.round(b.y - camY));
    ctx.rotate(b.rot);
    P.draw(ctx, 'ball', -sp.w / 2, -sp.h / 2);
    ctx.restore();
  }

  /** Spielstand oben in der Mitte, Meldungen darunter. */
  function hud(ctx, G, W) {
    var m = G.modus;
    var txt = 'YUSUF & ESAT  ' + m.score[0] + ' : ' + m.score[1] + '  GEORGIOS & ALEX';
    var w = F.measure(txt, 1, 1) + 16, x = Math.round((W - w) / 2);
    rect(ctx, x, 4, w, 15, 'rgba(8,5,12,0.8)');
    rect(ctx, x, 18, w, 1, '#ffd257');
    F.draw(ctx, txt, W / 2, 8, { color: '#ffffff', align: 'center' });
    if (m.meldT > 0 && m.meldung) {
      ctx.globalAlpha = Math.min(1, m.meldT / 20);
      F.draw(ctx, m.meldung.text, W / 2, 70, { color: m.meldung.col, align: 'center', scale: 2, shadow: true });
      ctx.globalAlpha = 1;
    }
    if (m.t < 400 && m.phase !== 'sieg') {
      F.draw(ctx, G.touch ? 'B = SCHUSS   IN DEN BALL SPRINGEN = KOPFBALL'
                          : 'SHIFT / E = SCHUSS   IN DEN BALL SPRINGEN = KOPFBALL',
             W / 2, 24, { color: '#c8b8e0', align: 'center', shadow: true });
    }
  }

  global.Fussball = { init: init, update: update, draw: draw, hud: hud, full: false };

})(window);
