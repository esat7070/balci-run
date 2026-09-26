/* =====================================================================
   doener.js — Level 20: "Döner. Selbst gemacht."

   Yusufs persoenlicher Doenermann laesst ihn hinter die Theke. Man belegt
   selbst: erst das Brot, dann alles, was schmeckt. Jede Zutat wiegt, und
   Sosse weicht das Brot auf. Ist der Doener zu voll, reisst er — dann
   ist er weg und kostet ein Herz. Rechtzeitig EINWICKELN, dann wird
   gegessen. Ziel: 10.000 Kalorien. Kombis geben Bonus.

   Steuerung: Zutat antippen / anklicken. Oder Pfeile + Sprung.
   RUNTER (oder die letzte Kiste) = einwickeln und essen.
   ===================================================================== */
(function (global) {
  'use strict';

  var P = global.Pixel, F = global.Font;

  var ZUTATEN = [
    { k: 'brot',    name: 'BROT',      kcal: 450, last: 0,  spr: 'brot' },
    { k: 'fleisch', name: 'FLEISCH',   kcal: 650, last: 18, spr: 'fleisch' },
    { k: 'pommes',  name: 'POMMES',    kcal: 420, last: 14, spr: 'food_pommes' },
    { k: 'kaese',   name: 'KÄSE',      kcal: 380, last: 8,  spr: 'kaese' },
    { k: 'sucuk',   name: 'SUCUK',     kcal: 520, last: 12, spr: 'sucuk' },
    { k: 'salat',   name: 'SALAT',     kcal: 5,   last: 4,  spr: 'salat' },
    { k: 'zwiebel', name: 'ZWIEBEL',   kcal: 12,  last: 3,  spr: 'zwiebel' },
    { k: 'tomate',  name: 'TOMATE',    kcal: 6,   last: 3,  spr: 'tomate' },
    { k: 'knobi',   name: 'KNOBLAUCH', kcal: 290, last: 4,  weich: 12, spr: 'sosse_k' },
    { k: 'scharf',  name: 'SCHARF',    kcal: 120, last: 3,  weich: 8,  spr: 'sosse_s' },
    { k: 'wickeln', name: 'WICKELN',   aktion: true }
  ];
  var STABIL = 100;

  function S() { return global.Sound; }
  function rnd(a) { return a[(Math.random() * a.length) | 0]; }
  function texte() { return global.Levels.doener || {}; }

  function neuerDoener() { return { brot: false, teile: [], last: 0, stabil: STABIL, kcal: 0 }; }

  function init(G, lvl) {
    return {
      phase: 'bauen', t: 0, kcal: 0, ziel: (lvl.doener && lvl.doener.ziel) || 10000,
      d: neuerDoener(), sel: 1, essT: 0, gegessen: 0, gerissen: 0,
      msg: null, msgT: 0, rede: null, redeT: 0, hintT: 360, anrufT: 900, wackel: 0, spiess: 0
    };
  }

  /* ---------- Masse ---------- */
  function layout(W, H) {
    var theke = H - 78;
    var n = ZUTATEN.length, bw = Math.min(44, Math.floor((W - 20) / n) - 2);
    return { W: W, H: H, theke: theke, bw: bw, bh: 40,
             x0: Math.round((W - n * (bw + 2)) / 2), yb: theke + 6,
             dx: Math.round(W * 0.5), dy: theke - 34, yx: Math.round(W * 0.16) };
  }
  function kiste(L, i) { return { x: L.x0 + i * (L.bw + 2), y: L.yb, w: L.bw, h: L.bh }; }

  function melde(e, t, col) { e.msg = { text: t, col: col || '#ffffff' }; e.msgT = 80; }
  function sagt(e, t) { e.rede = t; e.redeT = 110; }

  /* ---------- Ablauf ---------- */

  function update(G, W, H) {
    var e = G.modus;
    if (!e || G.dialog) return;
    var L = layout(W, H), In = global.Input, i;
    e.t++;
    e.spiess += 0.05;
    if (e.msgT > 0) e.msgT--;
    if (e.redeT > 0) e.redeT--;
    if (e.hintT > 0) e.hintT--;
    if (e.wackel > 0) e.wackel--;
    G.particles.update();
    G.floats.update();

    // Das Handy klingelt. Airsoft. Es wird ignoriert.
    if (--e.anrufT <= 0) {
      e.anrufT = 1100 + ((Math.random() * 400) | 0);
      S().play('ring');
      melde(e, rnd(texte().anruf || ['ESAT RUFT AN.']), '#6fc8e8');
      sagt(e, rnd(texte().ignorieren || ['GLEICH.']));
    }

    if (e.phase === 'essen') {
      if (--e.essT <= 0) { e.phase = e.kcal >= e.ziel ? 'fertig' : 'bauen'; e.t = 0; }
      return;
    }
    if (e.phase === 'fertig') {
      if (e.t === 50) {
        S().play('win');
        G.showDialog(G.lvl.fertig || [], function () { if (G.onDoenerDone) G.onDoenerDone(); });
      }
      return;
    }

    // Antippen
    var tp = In.tap ? In.tap() : null;
    if (tp) {
      for (i = 0; i < ZUTATEN.length; i++) {
        var k = kiste(L, i);
        if (tp.x >= k.x && tp.x < k.x + k.w && tp.y >= k.y - 10 && tp.y < k.y + k.h) {
          e.sel = i; nimm(G, e, i); return;
        }
      }
    }
    if (In.hit('right')) { e.sel = (e.sel + 1) % ZUTATEN.length; S().play('move'); }
    if (In.hit('left')) { e.sel = (e.sel + ZUTATEN.length - 1) % ZUTATEN.length; S().play('move'); }
    if (In.hit('down')) nimm(G, e, ZUTATEN.length - 1);
    else if (In.hit('jump') || (In.hit('confirm') && !tp)) nimm(G, e, e.sel);
  }

  function nimm(G, e, i) {
    var z = ZUTATEN[i], d = e.d, t = texte();
    if (z.aktion) { wickeln(G, e); return; }
    if (z.k === 'brot') {
      if (d.brot) { sagt(e, 'EIN BROT REICHT. SAGT MAN.'); S().play('move'); return; }
      d.brot = true; d.kcal += z.kcal;
      S().play('select');
      sagt(e, rnd(t.brot || ['DAS BROT.']));
      return;
    }
    if (!d.brot) { sagt(e, 'ERST DAS BROT. ICH BIN KEIN TIER.'); S().play('move'); return; }
    d.teile.push(z.k);
    d.last += z.last;
    if (z.weich) d.stabil -= z.weich;
    d.kcal += z.kcal;
    e.wackel = 8;
    S().play(z.weich ? 'move' : 'bite');
    var sp = (t.zutat || {})[z.k];
    if (sp && (Math.random() < 0.5 || d.teile.length === 1)) sagt(e, rnd(sp));
    if (d.last > d.stabil) reisst(G, e);
  }

  function reisst(G, e) {
    var p = G.player, L = layout(G.viewW(), 288);
    e.gerissen++;
    S().play('brk'); S().play('hurt');
    G.shake(7, 16);
    melde(e, 'GERISSEN! DAS BROT HAT AUFGEGEBEN.', '#ff6a6a');
    sagt(e, rnd((texte().riss) || ['NEIN!']));
    for (var i = 0; i < 26; i++) {
      G.particles.spawn({ x: L.dx, y: L.dy, vx: (Math.random() - 0.5) * 6, vy: -1 - Math.random() * 3, life: 40,
                          col: rnd(['#f0cc7a', '#a85a2e', '#8ac860', '#e03828', '#f4f2ea']), size: 3, grav: 0.2 });
    }
    // Nie toedlich — wie beim gesunden Essen in Level 8
    if (p.hp > 1) { p.hp--; p.hurtTimer = 24; p.invuln = 40; }
    e.d = neuerDoener();
  }

  /** Kombis: was zusammen auf einem Doener liegt, bringt Bonus. */
  function kombi(d) {
    var n = {}, verschieden = 0, k;
    d.teile.forEach(function (t) { n[t] = (n[t] || 0) + 1; });
    for (k in n) verschieden++;
    if ((n.fleisch || 0) >= 3 && n.pommes && n.kaese) return { name: 'YUSUF-SPEZIAL', x: 1.6 };
    if (verschieden >= 8) return { name: 'ALLES DRIN', x: 1.5 };
    if (n.fleisch && n.salat && n.zwiebel && n.tomate && (n.knobi || n.scharf)) return { name: 'DER KLASSIKER', x: 1.3 };
    if ((n.fleisch || 0) >= 4 && verschieden === 1) return { name: 'NUR FLEISCH. PURIST.', x: 1.2 };
    return null;
  }

  function wickeln(G, e) {
    var d = e.d, p = G.player;
    if (!d.brot || !d.teile.length) { sagt(e, 'DA IST JA NOCH NIX DRIN.'); S().play('move'); return; }
    var k = kombi(d), kcal = Math.round(d.kcal * (k ? k.x : 1));
    e.kcal += kcal;
    e.gegessen++;
    p.score += Math.round(kcal / 10);
    p.eatCount = (p.eatCount || 0) + 1;
    S().play('bite'); S().play('laugh');
    melde(e, (k ? k.name + '! ' : '') + '+' + kcal + ' KCAL', k ? '#ffd257' : '#ffe9a8');
    sagt(e, global.Levels.eatLine(e.gegessen + 10));
    // Einmal wickeln, dann ist er weg. In Sekunden. Stueck fuer Stueck,
    // mit beiden Haenden, und jede Zutat fliegt einzeln rein.
    var L = layout(G.viewW(), 288), spr = ['doener', 'brot'];
    d.teile.forEach(function (t) {
      for (var i = 0; i < ZUTATEN.length; i++) if (ZUTATEN[i].k === t) spr.push(ZUTATEN[i].spr);
    });
    var n = Math.min(18, 6 + d.teile.length);
    if (global.Fress) {
      global.Fress.schlingen(G, { von: { x: L.dx, y: L.dy + 8 }, mund: { x: L.yx + 13, y: L.theke - 66 },
                                  spr: spr, n: n, tempo: 3, gross: 1.8 });
    }
    e.phase = 'essen'; e.essT = Math.max(55, n * 3 + 16);
    e.d = neuerDoener();
    if (e.kcal >= e.ziel) melde(e, '10.000 KALORIEN! HÖ HÖ HÖÖÖ!', '#8cd85a');
  }

  /* ---------- Zeichnen ---------- */

  function rect(ctx, x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function big(ctx, name, x, y, sc) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(sc, sc);
    P.draw(ctx, name, 0, 0);
    ctx.restore();
  }

  function draw(ctx, G, W, H) {
    var e = G.modus;
    if (!e) return;
    var L = layout(W, H), i;
    // Laden: Fliesen, Menueschild, der Spiess
    rect(ctx, 0, 0, W, H, '#3a2418');
    for (var fy = 0; fy < L.theke; fy += 16) {
      for (var fx = (fy / 16) % 2 ? 8 : 0; fx < W; fx += 16) rect(ctx, fx, fy, 15, 15, (fx + fy) % 32 ? '#e8e0d0' : '#d8d0c0');
    }
    rect(ctx, W * 0.56, 14, W * 0.4, 56, '#141018');
    rect(ctx, W * 0.56 + 2, 16, W * 0.4 - 4, 52, '#1e1a2a');
    var karte = texte().karte || ['YUSUFS DÖNER'];
    for (i = 0; i < karte.length; i++) {
      F.draw(ctx, karte[i], W * 0.76, 22 + i * 11, { color: i ? '#ffe9a8' : '#ffd257', align: 'center' });
    }
    spiess(ctx, W * 0.36, 26, e.spiess);

    // Yusuf hinter der Theke
    var essen = e.phase === 'essen' || e.phase === 'fertig';
    var rausch = global.Fress && global.Fress.aktiv(G);
    P.drawChar(ctx, 'yusuf', L.yx, L.theke + 4 - (rausch ? (G.tick >> 1) % 2 : 0), {
      pose: essen && !rausch ? 'cheer' : 'idle',
      face: rausch ? global.Fress.gesicht(G) : (essen ? 'laugh' : (e.redeT > 0 ? 'laugh' : 'normal')),
      frame: G.tick >> 3, scale: 3
    });
    if (e.redeT > 0 && e.rede) blase(ctx, L.yx + 10, L.theke - 96, e.rede, '#ffc23c', W);

    // Theke
    rect(ctx, 0, L.theke, W, H - L.theke, '#8a8e98');
    rect(ctx, 0, L.theke, W, 3, '#c8ccd4');

    // Der Doener, der gerade entsteht — oder gerade verschwindet
    doenerZeichnen(ctx, G, e, L);
    if (global.Fress) global.Fress.draw(ctx, G, 0, 0);

    // Zutaten-Kisten
    for (i = 0; i < ZUTATEN.length; i++) {
      var z = ZUTATEN[i], k = kiste(L, i), sel = (i === e.sel);
      rect(ctx, k.x, k.y, k.w, k.h, z.aktion ? '#2a5a2a' : '#5a5e68');
      rect(ctx, k.x + 2, k.y + 2, k.w - 4, k.h - 14, z.aktion ? '#3a8a3a' : '#3a3e48');
      if (!z.aktion) {
        var sp = P.get(z.spr);
        var sc = Math.max(1, Math.min(2, Math.floor((k.w - 6) / sp.w)));
        big(ctx, z.spr, k.x + k.w / 2 - sp.w * sc / 2, k.y + 2 + (k.h - 14 - sp.h * sc) / 2, sc);
      } else {
        F.draw(ctx, 'WICKELN', k.x + k.w / 2, k.y + 10, { color: '#ffffff', align: 'center' });
        F.draw(ctx, '& ESSEN', k.x + k.w / 2, k.y + 19, { color: '#c8f0c0', align: 'center' });
      }
      F.draw(ctx, z.aktion ? '' : String(z.kcal), k.x + k.w / 2, k.y + k.h - 10, { color: '#ffe9a8', align: 'center' });
      if (sel && !G.touch && (G.tick >> 3) % 2 === 0) {
        ctx.strokeStyle = '#ffd257'; ctx.lineWidth = 2;
        ctx.strokeRect(k.x - 1, k.y - 1, k.w + 2, k.h + 2);
      }
    }
    if (!G.touch) {
      var zs = ZUTATEN[e.sel];
      F.draw(ctx, zs.aktion ? 'EINWICKELN UND ESSEN' : zs.name, W / 2, L.yb - 12, { color: '#ffffff', align: 'center', shadow: true });
    }

    // Kalorien oben
    var bw = Math.min(260, W - 120), bx = Math.round((W - bw) / 2);
    rect(ctx, bx - 2, 4, bw + 4, 18, 'rgba(6,4,10,0.85)');
    rect(ctx, bx, 6, bw, 14, '#241830');
    var pr = Math.min(1, e.kcal / e.ziel);
    rect(ctx, bx, 6, bw * pr, 14, pr < 1 ? '#ffc23c' : '#8cd85a');
    F.draw(ctx, fmt(e.kcal) + ' / ' + fmt(e.ziel) + ' KCAL', W / 2, 10, { color: '#ffffff', align: 'center', shadow: true });
    var p = G.player;
    for (i = 0; i < p.maxHp; i++) {
      if (i >= p.hp) ctx.globalAlpha = 0.28;
      P.draw(ctx, 'herz', bx + bw + 8 + i * 13, 7);
      ctx.globalAlpha = 1;
    }

    // Partikel und Meldungen
    var pl = G.particles.list;
    for (i = 0; i < pl.length; i++) {
      var q = pl[i];
      ctx.globalAlpha = Math.min(1, q.life / 20);
      rect(ctx, q.x - q.size / 2, q.y - q.size / 2, q.size, q.size, q.col);
    }
    ctx.globalAlpha = 1;
    if (e.msgT > 0 && e.msg) {
      ctx.globalAlpha = Math.min(1, e.msgT / 16);
      F.draw(ctx, e.msg.text, W / 2, 30, { color: e.msg.col, align: 'center', scale: 2, shadow: true });
      ctx.globalAlpha = 1;
    }
    if (e.hintT > 0) {
      ctx.globalAlpha = Math.min(1, e.hintT / 60);
      rect(ctx, 8, 46, W - 16, 27, 'rgba(6,4,10,0.82)');
      F.draw(ctx, G.touch ? 'ZUTAT ANTIPPEN. GRÜNE KISTE = WICKELN & ESSEN.'
                          : 'PFEILE + SPRUNG = BELEGEN. RUNTER = WICKELN & ESSEN.',
             W / 2, 50, { color: '#ffffff', align: 'center', shadow: true });
      F.draw(ctx, 'SOSSE WEICHT DAS BROT AUF. ZU VOLL = ES REISST.', W / 2, 61, { color: '#ffd257', align: 'center', shadow: true });
      ctx.globalAlpha = 1;
    }
  }

  function doenerZeichnen(ctx, G, e, L) {
    var d = e.d, x = L.dx, y = L.dy, w = e.wackel > 0 ? ((G.tick >> 1) % 2 ? 1 : -1) : 0;
    // Teller
    rect(ctx, x - 52, y + 22, 104, 6, '#f4f4f0');
    rect(ctx, x - 48, y + 28, 96, 3, '#c8ccd4');
    if (e.phase === 'essen') {
      // Nur noch Kruemel
      for (var k = 0; k < 9; k++) rect(ctx, x - 36 + ((k * 29) % 72), y + 19 - (k % 3), 2, 2, k % 2 ? '#c98f3e' : '#f0cc7a');
      return;
    }
    if (!d.brot) {
      F.draw(ctx, 'LEERER TELLER', x, y + 6, { color: '#8a7a6a', align: 'center' });
      return;
    }
    // Brot unten, darauf die Zutaten gestapelt
    big(ctx, 'brot', x - 30 + w, y + 6, 3);
    for (var i = 0; i < d.teile.length; i++) {
      var z = null;
      for (var j = 0; j < ZUTATEN.length; j++) if (ZUTATEN[j].k === d.teile[i]) z = ZUTATEN[j];
      if (!z) continue;
      var sp = P.get(z.spr);
      var sx = x - sp.w + ((i * 13) % 20) - 10 + w, sy = y + 4 - i * 5;
      if (z.weich) {
        // Sosse: ein Klecks statt der Flasche
        ctx.fillStyle = z.k === 'knobi' ? '#f4f2ea' : '#e03828';
        ctx.beginPath(); ctx.arc(x + ((i * 17) % 30) - 15 + w, sy + 6, 6, 0, 6.3); ctx.fill();
      } else {
        big(ctx, z.spr, sx, sy - sp.h, 2);
      }
    }
    // Haelt das Brot noch?
    var rest = Math.max(0, d.stabil - d.last), anteil = rest / STABIL;
    var bx = x - 50, by = y + 36;
    rect(ctx, bx, by, 100, 5, '#241830');
    rect(ctx, bx, by, 100 * anteil, 5, anteil > 0.4 ? '#8cd85a' : (anteil > 0.15 ? '#ffc23c' : '#ff4a4a'));
    F.draw(ctx, 'BROT HÄLT NOCH', x, by + 8, { color: anteil > 0.15 ? '#c8b8e0' : '#ff6a6a', align: 'center' });
    var k = kombi(d);
    if (k) F.draw(ctx, k.name, x, y - 12 - d.teile.length * 5, { color: '#ffd257', align: 'center', shadow: true });
  }

  function spiess(ctx, x, top, t) {
    rect(ctx, x - 1, top - 6, 3, 110, '#8a8e98');
    for (var i = 0; i < 9; i++) {
      var bw = 34 - Math.abs(i - 3) * 3, y = top + i * 10;
      rect(ctx, x - bw / 2, y, bw, 10, i % 2 ? '#a85a2e' : '#b86a36');
      var glanz = Math.round((Math.sin(t + i) * 0.5 + 0.5) * (bw - 6));
      rect(ctx, x - bw / 2 + glanz, y + 1, 4, 8, '#d88a4a');
    }
    rect(ctx, x - 20, top + 92, 40, 6, '#5a5e68');
    ctx.globalAlpha = 0.3;
    rect(ctx, x + 18, top, 8, 90, '#ff8a2a');
    ctx.globalAlpha = 1;
  }

  function blase(ctx, x, y, text, col, W) {
    var zeilen = F.wrap(text, 200, 1, 1);
    var tw = 0, i;
    for (i = 0; i < zeilen.length; i++) tw = Math.max(tw, F.measure(zeilen[i], 1, 1));
    tw += 10;
    var bx = Math.max(4, Math.min(W - tw - 4, Math.round(x - tw / 2))), by = Math.round(y - 4 - zeilen.length * 10);
    rect(ctx, bx, by, tw, zeilen.length * 10 + 6, 'rgba(10,6,16,0.9)');
    rect(ctx, bx, by + zeilen.length * 10 + 5, tw, 1, col);
    for (i = 0; i < zeilen.length; i++) F.draw(ctx, zeilen[i], bx + 5, by + 3 + i * 10, { color: col });
  }

  function fmt(n) {
    var s = String(Math.round(n));
    return s.length > 3 ? s.slice(0, s.length - 3) + '.' + s.slice(-3) : s;
  }

  global.DoenerBude = { init: init, update: update, draw: draw, full: true, ZUTATEN: ZUTATEN, _wickeln: wickeln, _nimm: nimm };

})(window);
