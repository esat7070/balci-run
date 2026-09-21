/* =====================================================================
   eat.js — Level 8: "Der Morgen danach".

   Kein Jump'n'Run, sondern eine kleine Szene: Yusuf liegt mit Kruemeln
   auf der Couch, Erfan ruft an und bruellt ihn wach. Danach steht Yusuf
   am Schreibtisch und isst — man zieht ihm das Essen mit der Hand in den
   Mund (Maus, Finger) oder druckt A. Ziel: 10.000 Kalorien.
   ===================================================================== */
(function (global) {
  'use strict';

  var P = global.Pixel, F = global.Font, S = global.Sound;

  var SLOTS = 3;              // so viele Sachen liegen gleichzeitig da
  var FSC = 2;                // Essen wird doppelt so gross gezeichnet
  var REFILL = 18;            // Ticks, bis nachgelegt wird
  var CHEW = 26;              // Kau-Dauer

  function init(g, lvl) {
    var d = lvl.eat || {};
    var e = {
      phase: 'ring', t: 0, ringT: 0,
      goal: d.goal || 10000, kcal: 0, eaten: 0,
      foods: d.foods || [],
      bad: d.bad || [],
      order: [], next: 0,
      slots: [], drag: null, sel: 0,
      chew: 0, walk: 0, hintT: 0,
      lastKcal: 0
    };
    // Reihenfolge einmal mischen, damit nicht immer dasselbe kommt
    for (var i = 0; i < e.foods.length; i++) e.order.push(i);
    for (i = e.order.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0, tmp = e.order[i];
      e.order[i] = e.order[j]; e.order[j] = tmp;
    }
    for (i = 0; i < SLOTS; i++) e.slots.push({ food: null, wait: i * 6, pop: 0 });
    return e;
  }

  /* ---------- Masse der Szene. Haengen an der Bildgroesse, damit es
       am Handy genauso passt wie am PC. ---------- */
  function layout(g, W, H) {
    var floorY = H - 22;
    var deskX = Math.round(W * 0.50);
    var deskW = Math.min(230, Math.round(W * 0.46));
    return {
      floorY: floorY,
      couchX: Math.round(W * 0.19),
      couchY: floorY,
      deskX: deskX, deskW: deskW,
      deskY: floorY - 46,
      standX: deskX - 56,
      W: W, H: H
    };
  }

  function slotPos(L, i) {
    var step = (L.deskW - 20) / SLOTS;
    return { x: L.deskX + 10 + step * i + step / 2, y: L.deskY - 18 };
  }

  function yusufSpot(e, L) {
    if (e.phase === 'ring' || e.phase === 'call') {
      return { x: L.couchX + 10, y: L.couchY - 16, scale: 3 };
    }
    if (e.phase === 'stand') {
      var k = Math.min(1, e.walk / 70);
      return { x: L.couchX + 10 + (L.standX - L.couchX - 10) * k, y: L.floorY, scale: 3 };
    }
    return { x: L.standX, y: L.floorY, scale: 3 };
  }

  function mouth(e, L) {
    var y = yusufSpot(e, L);
    return { x: y.x + 12, y: y.y - 72 };
  }

  /* ---------- Ablauf ---------- */

  function update(g, W, H) {
    var e = g.eat;
    if (!e) return;
    var L = layout(g, W, H);
    e.t++;
    if (e.chew > 0) e.chew--;
    // Der Levelname muss auch hier wieder verschwinden. Vorher stand er
    // die ganze Szene lang im Bild, weil die Schleife hier frueher endet.
    if (g.banner > 0) g.banner--;

    if (!g.frozen) {
      switch (e.phase) {
        case 'ring': upRing(g, e, L); break;
        // Falls der Anruf irgendwie abbricht (z.B. Dialog von aussen
        // geschlossen), bleibt die Szene nicht haengen.
        case 'call':
          if (!g.dialog) { e.callWait = (e.callWait || 0) + 1; }
          if ((e.callWait || 0) > 20) { e.phase = 'stand'; e.walk = 0; }
          break;
        case 'stand': upStand(g, e, L); break;
        case 'eat': upEat(g, e, L); break;
        case 'full': upFull(g, e, L); break;
      }
    }

    g.particles.update();
    g.floats.update();
  }

  function upRing(g, e, L) {
    e.ringT++;
    if (e.ringT % 70 === 1) S.play('ring');
    if (e.ringT % 90 === 40) S.play('snore');
    // Handy zittert auf dem Sofa
    if (e.ringT % 6 === 0) {
      g.particles.spawn({
        x: L.couchX + 46 + (Math.random() - 0.5) * 6, y: L.couchY - 44,
        vx: (Math.random() - 0.5) * 0.6, vy: -0.5, life: 16,
        col: '#6fc8e8', size: 2, grav: -0.01
      });
    }
    var In = global.Input;
    var answered = e.ringT > 110 || In.hit('jump') || In.hit('confirm') || In.pointer().justDown;
    if (!answered) return;
    e.phase = 'call';
    S.play('select');
    g.showDialog((g.lvl.phone || []), function () {
      e.phase = 'stand'; e.walk = 0;
      g.state = 'play';
    });
  }

  function upStand(g, e, L) {
    e.walk++;
    // Kruemel fallen beim Aufstehen vom Bauch
    if (e.walk < 40 && e.walk % 4 === 0) {
      var y = yusufSpot(e, L);
      g.particles.spawn({
        x: y.x + (Math.random() - 0.5) * 26, y: y.y - 40,
        vx: (Math.random() - 0.5) * 1.2, vy: -0.6 - Math.random(),
        life: 40, col: (Math.random() < 0.5) ? '#c98f3e' : '#8a4a28', size: 2, grav: 0.22
      });
    }
    if (e.walk === 1) S.play('growl');
    if (e.walk >= 76) { e.phase = 'eat'; e.hintT = 260; }
  }

  function fillSlots(g, e) {
    for (var i = 0; i < e.slots.length; i++) {
      var s = e.slots[i];
      if (s.food) continue;
      if (s.wait > 0) { s.wait--; continue; }
      var def;
      // Ab und zu legt jemand etwas Gesundes dazwischen. Wer das isst,
      // verliert ein Herz — Yusuf verzeiht so etwas nicht.
      if (e.bad.length && e.eaten > 1 && Math.random() < 0.22) {
        def = e.bad[(Math.random() * e.bad.length) | 0];
      } else {
        def = e.foods[e.order[e.next % e.order.length]];
        e.next++;
      }
      s.food = def;
      s.pop = 10;
      s.dx = 0; s.dy = 0;
    }
  }

  function upEat(g, e, L) {
    var In = global.Input, ptr = In.pointer(), i, s, pos;
    if (e.hintT > 0) e.hintT--;
    fillSlots(g, e);

    // --- Ziehen mit Maus oder Finger ---
    if (ptr.justDown && !e.drag) {
      for (i = 0; i < e.slots.length; i++) {
        s = e.slots[i];
        if (!s.food) continue;
        pos = slotPos(L, i);
        if (Math.abs(ptr.x - (pos.x + s.dx)) < 26 && Math.abs(ptr.y - (pos.y + s.dy)) < 26) {
          e.drag = i; e.sel = i;
          S.play('move');
          break;
        }
      }
    }
    if (e.drag !== null && e.drag !== undefined) {
      s = e.slots[e.drag];
      pos = slotPos(L, e.drag);
      if (!s || !s.food) { e.drag = null; }
      else {
        s.dx = ptr.x - pos.x;
        s.dy = ptr.y - pos.y;
        if (!ptr.down) {
          var m = mouth(e, L);
          var hit = Math.abs(ptr.x - m.x) < 52 && Math.abs(ptr.y - m.y) < 58;
          if (hit) eatSlot(g, e, L, e.drag);
          else { s.dx = 0; s.dy = 0; S.play('move'); }
          e.drag = null;
        }
      }
    }

    // --- Ohne Maus: auswaehlen und A druecken ---
    if (In.hit('right')) { e.sel = (e.sel + 1) % SLOTS; S.play('move'); }
    if (In.hit('left')) { e.sel = (e.sel + SLOTS - 1) % SLOTS; S.play('move'); }
    if (In.hit('jump') || In.hit('confirm')) {
      if (e.slots[e.sel] && e.slots[e.sel].food) eatSlot(g, e, L, e.sel);
      else {
        for (i = 0; i < SLOTS; i++) {
          if (e.slots[i].food) { e.sel = i; eatSlot(g, e, L, i); break; }
        }
      }
    }

    for (i = 0; i < e.slots.length; i++) if (e.slots[i].pop > 0) e.slots[i].pop--;

    if (e.kcal >= e.goal) {
      e.phase = 'full'; e.t = 0;
      S.play('win');
    }
  }

  function eatSlot(g, e, L, i) {
    var s = e.slots[i];
    if (!s || !s.food) return;
    var def = s.food, m = mouth(e, L);
    s.food = null; s.dx = 0; s.dy = 0; s.wait = REFILL;

    // Gesundes Essen: kostet ein Herz und bringt keine einzige Kalorie.
    if (def.bad) {
      e.chew = CHEW;
      e.badEaten = (e.badEaten || 0) + 1;
      var p = g.player;
      S.play('hurt');
      g.shake(5, 14);
      g.floats.add(m.x, m.y - 26, def.line || 'IGITT! GESUND!', '#8cd85a', 90);
      // Nie toedlich — sonst faengt die ganze Szene von vorne an.
      if (p.hp > 1) { p.hp--; p.hurtTimer = 24; p.invuln = 40; }
      for (var b = 0; b < 12; b++) {
        g.particles.spawn({
          x: m.x, y: m.y + 4,
          vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 1.6,
          life: 30, col: '#8cd85a', size: 2, grav: 0.22
        });
      }
      return;
    }

    e.kcal += def.kcal;
    e.lastKcal = def.kcal;
    e.eaten++;
    e.chew = CHEW;
    g.player.score += Math.round(def.kcal / 10);
    g.player.eatCount = (g.player.eatCount || 0) + 1;

    S.play('bite');
    if (def.kcal >= 1000) g.shake(4, 10);
    g.floats.add(m.x, m.y - 26, '+' + def.kcal + ' KCAL', '#ffd257', 60);
    if (e.eaten % 4 === 0) {
      var line = global.Levels.eatLine(e.eaten);
      g.floats.add(m.x, m.y - 42, line, '#ffe9a8', 80);
      S.play('laugh');
    }
    for (var c = 0; c < 10; c++) {
      g.particles.spawn({
        x: m.x, y: m.y + 4,
        vx: (Math.random() - 0.5) * 2.6, vy: -0.8 - Math.random() * 1.4,
        life: 26, col: (c % 2) ? '#c98f3e' : '#ffcf4a', size: 2, grav: 0.24
      });
    }
  }

  function upFull(g, e, L) {
    e.t++;
    if (e.t === 60) {
      g.showDialog((g.lvl.full || []), function () {
        if (g.onEatDone) g.onEatDone();
      });
    }
  }

  /* ---------- Zeichnen ---------- */

  function draw(ctx, g, W, H) {
    var e = g.eat;
    if (!e) return;
    var L = layout(g, W, H), i, s, pos;

    drawRoom(ctx, g, L);

    // Schreibtisch
    rect(ctx, L.deskX, L.deskY, L.deskW, 8, '#8a5a30');
    rect(ctx, L.deskX, L.deskY, L.deskW, 3, '#b07a45');
    rect(ctx, L.deskX + 6, L.deskY + 8, 6, L.floorY - L.deskY - 8, '#6b4522');
    rect(ctx, L.deskX + L.deskW - 12, L.deskY + 8, 6, L.floorY - L.deskY - 8, '#6b4522');

    // Sofa
    ctx.save();
    ctx.translate(Math.round(L.couchX - 36), Math.round(L.couchY - 42));
    ctx.scale(3, 3);
    P.draw(ctx, 'sofa', 0, 0);
    ctx.restore();

    var y = yusufSpot(e, L);
    var face = 'normal', pose = 'idle', frame = (g.tick >> 3);

    if (e.phase === 'ring' || e.phase === 'call') { pose = 'sleep'; face = 'sleep'; }
    else if (e.phase === 'stand') { pose = e.walk < 70 ? 'run' : 'idle'; face = 'normal'; }
    else if (e.phase === 'full') { pose = 'cheer'; face = 'laugh'; }
    else if (e.chew > 0) { face = 'eat'; }
    else if (e.drag !== null && e.drag !== undefined) { face = 'laugh'; }

    P.drawChar(ctx, 'yusuf', y.x, y.y, {
      pose: pose, face: face, frame: frame, scale: y.scale, flip: false
    });

    // Kruemel und Snacks auf dem Bauch, solange er liegt
    if (e.phase === 'ring' || e.phase === 'call') {
      P.draw(ctx, 'food_chips', y.x - 18, y.y - 52);
      P.draw(ctx, 'doener', y.x + 4, y.y - 40);
      for (i = 0; i < 6; i++) {
        var cx2 = y.x - 22 + ((i * 37) % 44);
        rect(ctx, cx2, y.y - 30 + ((i * 13) % 9), 2, 2, '#c98f3e');
      }
      // Schlaf-Z
      for (i = 0; i < 3; i++) {
        var zt = (g.tick * 0.02 + i * 0.33) % 1;
        F.draw(ctx, 'Z', y.x + 22 + zt * 14, y.y - 74 - zt * 20, {
          color: 'rgba(200,185,255,' + (1 - zt).toFixed(2) + ')',
          scale: 1 + Math.floor(zt * 2)
        });
      }
      // Handy klingelt auf der Lehne
      var sh = (e.ringT % 10 < 5) ? 1 : -1;
      P.draw(ctx, 'handy', L.couchX + 42 + sh, L.couchY - 52);
      if (e.ringT % 70 < 35) {
        F.draw(ctx, 'ERFAN RUFT AN', L.couchX + 47, L.couchY - 66,
               { color: '#6fc8e8', align: 'center', shadow: true });
      }
    }

    // Essen auf dem Tisch
    if (e.phase === 'eat' || e.phase === 'full') {
      for (i = 0; i < e.slots.length; i++) {
        s = e.slots[i];
        if (!s.food) continue;
        pos = slotPos(L, i);
        var sp = P.get(s.food.spr);
        var dw = sp.w * FSC, dh = sp.h * FSC;
        var fx = Math.round(pos.x + s.dx - dw / 2);
        var fy = Math.round(pos.y + s.dy - dh / 2 - (s.pop > 0 ? s.pop : 0));
        var picked = (e.drag === i);
        var chosen = (!picked && e.sel === i && !g.touch);

        if (chosen && (g.tick >> 3) % 2 === 0) {
          ctx.strokeStyle = '#ffd257';
          ctx.lineWidth = 1;
          ctx.strokeRect(fx - 4.5, fy - 4.5, dw + 9, dh + 9);
        }
        ctx.save();
        ctx.translate(fx, fy);
        ctx.scale(FSC, FSC);
        P.draw(ctx, s.food.spr, 0, 0);
        ctx.restore();
        F.draw(ctx, s.food.bad ? 'GESUND!' : s.food.kcal + ' KCAL', pos.x + s.dx, fy - 13,
               { color: s.food.bad ? '#8cd85a' : '#ffe9a8', align: 'center', shadow: true });
        F.draw(ctx, s.food.name, pos.x + s.dx, fy + dh + 5,
               { color: '#c8b8e0', align: 'center', shadow: true });
        // Die Hand haelt, was gerade gezogen wird
        if (picked) P.draw(ctx, 'hand', fx + dw / 2 - 4, fy + dh - 6);
      }
    }

    drawParticles(ctx, g);
    drawFloats(ctx, g);
    if (e.phase === 'eat' || e.phase === 'full') drawCounter(ctx, g, e, L);

    if (e.phase === 'eat' && e.hintT > 0) {
      var a = Math.min(1, e.hintT / 60);
      ctx.globalAlpha = a;
      F.draw(ctx, g.touch ? 'ESSEN MIT DEM FINGER ZU YUSUF ZIEHEN'
                          : 'ESSEN MIT DER MAUS ZU YUSUF ZIEHEN',
             L.W / 2, 32, { color: '#ffffff', align: 'center', shadow: true });
      F.draw(ctx, g.touch ? 'ODER A DRÜCKEN' : 'ODER MIT PFEILEN WÄHLEN UND SPRUNG DRÜCKEN',
             L.W / 2, 44, { color: '#a094b8', align: 'center', shadow: true });
      ctx.globalAlpha = 1;
    }
  }

  function drawRoom(ctx, g, L) {
    var W = L.W, H = L.H;
    var grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#2a1d3a');
    grd.addColorStop(1, '#151020');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Tapete
    for (var x = 0; x < W; x += 24) rect(ctx, x, 0, 2, L.floorY, 'rgba(255,255,255,0.03)');
    // Fenster mit Nachmittagssonne
    rect(ctx, Math.round(W * 0.70), 26, 86, 60, '#1a1428');
    rect(ctx, Math.round(W * 0.70) + 3, 29, 80, 54, '#4a6a9a');
    rect(ctx, Math.round(W * 0.70) + 3, 29, 80, 26, '#7fa4c8');
    rect(ctx, Math.round(W * 0.70) + 41, 26, 3, 60, '#1a1428');
    // Boden
    rect(ctx, 0, L.floorY, W, H - L.floorY, '#3a2a1e');
    rect(ctx, 0, L.floorY, W, 3, '#5a4230');
  }

  function drawCounter(ctx, g, e, L) {
    var w = Math.min(260, L.W - 60), x = Math.round((L.W - w) / 2), y = 10;
    rect(ctx, x - 2, y - 2, w + 4, 18, 'rgba(6,4,10,0.85)');
    rect(ctx, x, y, w, 14, '#241830');
    var p = Math.max(0, Math.min(1, e.kcal / e.goal));
    rect(ctx, x, y, Math.round(w * p), 14, p < 1 ? '#ffc23c' : '#8cd85a');
    rect(ctx, x, y, Math.round(w * p), 3, 'rgba(255,255,255,0.35)');
    F.draw(ctx, fmt(e.kcal) + ' / ' + fmt(e.goal) + ' KCAL', L.W / 2, y + 4,
           { color: '#ffffff', align: 'center', shadow: true });

    // Herzen: hier kann man welche verlieren (gesundes Essen)
    var p = g.player;
    for (var i = 0; i < p.maxHp; i++) {
      var hx = x + w + 8 + i * 13;
      if (i >= p.hp) ctx.globalAlpha = 0.28;
      P.draw(ctx, 'herz', hx, y + 1);
      ctx.globalAlpha = 1;
    }
  }

  function fmt(n) {
    var s = String(Math.round(n));
    return s.length > 3 ? s.slice(0, s.length - 3) + '.' + s.slice(-3) : s;
  }

  function rect(ctx, x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawParticles(ctx, g) {
    var l = g.particles.list;
    for (var i = 0; i < l.length; i++) {
      var p = l[i];
      ctx.globalAlpha = Math.min(1, p.life / (p.max * 0.6));
      rect(ctx, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, p.col);
      ctx.globalAlpha = 1;
    }
  }

  function drawFloats(ctx, g) {
    var l = g.floats.list;
    for (var i = 0; i < l.length; i++) {
      var f = l[i];
      if (!f.text) continue;
      ctx.globalAlpha = Math.min(1, f.life / 22);
      F.draw(ctx, f.text, f.x, f.y, { color: f.col, align: 'center', shadow: true });
      ctx.globalAlpha = 1;
    }
  }

  /* =====================================================================
     DIE KASSE — Schlussszene von Level 9.
     Yusuf wirft seinen halben Einkauf aufs Band, Alex zieht alles durch.
     Gespielt wird hier nichts, geredet schon (Dialog laeuft darueber).
     ===================================================================== */

  var KASSE_SPR = ['food_beefy', 'food_rippen', 'food_chips', 'doener',
                   'food_pommes', 'food_schoko', 'food_nuggets', 'honig',
                   'baklava', 'kubide'];

  function kasseInit() {
    return { t: 0, items: [], total: 0, next: 10, beep: 0, spawned: 0 };
  }

  function kasseLayout(W, H) {
    // Alles sitzt oberhalb des Textkastens — sonst sieht man von der
    // Szene nichts, weil der Dialog die unteren 84 Pixel belegt.
    var floorY = H - 96;
    return {
      W: W, H: H, floorY: floorY,
      beltX: Math.round(W * 0.26), beltW: Math.round(W * 0.46),
      beltY: floorY - 40,
      yusufX: Math.round(W * 0.16),
      alexX: Math.round(W * 0.84)
    };
  }

  function kasseUpdate(g, W, H) {
    var k = g.kasse, L = kasseLayout(W, H), i;
    k.t++;
    if (g.banner > 0) g.banner--;

    // Yusuf legt nach — es hoert einfach nicht auf
    k.next--;
    if (k.next <= 0 && k.items.length < 16) {
      k.next = 24;
      k.spawned++;
      k.items.push({
        x: L.beltX + 6,
        spr: KASSE_SPR[(Math.random() * KASSE_SPR.length) | 0],
        price: 1 + Math.round(Math.random() * 900) / 100,
        scanned: false,
        hop: 8
      });
      S.play('select');
    }

    var scanX = L.beltX + L.beltW - 16;
    for (i = k.items.length - 1; i >= 0; i--) {
      var it = k.items[i];
      it.x += 0.8;
      if (it.hop > 0) it.hop--;
      if (!it.scanned && it.x > scanX) {
        it.scanned = true;
        k.total = Math.min(412.9, k.total + it.price);
        k.beep = 12;
        S.play('coinBlock');
        g.floats.add(L.alexX - 30, L.beltY - 24, '+' + it.price.toFixed(2).replace('.', ',') + ' EURO',
                     '#ffd257', 50);
      }
      if (it.x > L.beltX + L.beltW + 20) k.items.splice(i, 1);
    }
    if (k.beep > 0) k.beep--;

    g.particles.update();
    g.floats.update();
  }

  function kasseDraw(ctx, g, W, H) {
    var k = g.kasse, L = kasseLayout(W, H), i;

    // Markt-Hintergrund
    var grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#f4f7fb');
    grd.addColorStop(1, '#b0bccc');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    for (var x = 0; x < W; x += 64) rect(ctx, x, 0, 34, 5, '#ffffff');
    rect(ctx, 0, L.floorY, W, H - L.floorY, '#c8ccd6');
    rect(ctx, 0, L.floorY, W, 3, '#9aa0ac');
    // Kassenschild
    F.draw(ctx, 'KASSE 3', L.alexX, 42, { color: '#3c4048', align: 'center', scale: 2 });
    F.draw(ctx, 'ALEX HAT SCHICHT', L.alexX, 62, { color: '#787c86', align: 'center' });

    // Kassenband
    rect(ctx, L.beltX, L.beltY, L.beltW, 10, '#3c4048');
    rect(ctx, L.beltX, L.beltY, L.beltW, 3, '#5c6068');
    for (i = 0; i < L.beltW; i += 10) {
      rect(ctx, L.beltX + ((i + (k.t * 0.8)) % L.beltW), L.beltY + 4, 4, 3, '#787c86');
    }
    rect(ctx, L.beltX - 6, L.beltY + 10, L.beltW + 12, L.floorY - L.beltY - 10, '#98a0ae');

    // Alex an der Kasse
    P.draw(ctx, 'kasse', L.alexX - 4, L.beltY - 26);
    if (k.beep > 0) {
      F.draw(ctx, 'PIEP', L.alexX + 16, L.beltY - 36, { color: '#ff3a30', align: 'center' });
    }
    P.drawChar(ctx, 'alex', L.alexX + 30, L.floorY, {
      pose: 'idle', face: k.beep > 0 ? 'laugh' : 'normal', frame: (g.tick >> 3), flip: true, scale: 2
    });

    // Yusuf legt auf
    var legt = (k.next > 16);
    P.drawChar(ctx, 'yusuf', L.yusufX, L.floorY, {
      pose: legt ? 'cheer' : 'idle', face: 'laugh', frame: (g.tick >> 3), scale: 2
    });

    // Das Band voller Zeug
    for (i = 0; i < k.items.length; i++) {
      var it = k.items[i];
      var sp = P.get(it.spr);
      P.draw(ctx, it.spr, it.x - sp.w / 2, L.beltY - sp.h + 1 - (it.hop > 0 ? it.hop : 0));
    }

    drawParticles(ctx, g);
    drawFloats(ctx, g);

    // Anzeige der Kasse
    var tw = 120, tx = Math.round(L.alexX - tw / 2), ty = 16;
    rect(ctx, tx - 2, ty - 2, tw + 4, 20, 'rgba(6,4,10,0.85)');
    rect(ctx, tx, ty, tw, 16, '#1a2a1a');
    F.draw(ctx, 'SUMME', tx + 5, ty + 5, { color: '#8cd85a' });
    F.draw(ctx, k.total.toFixed(2).replace('.', ',') + ' EURO', tx + tw - 5, ty + 5,
           { color: '#8cd85a', align: 'right' });
  }

  global.Eat = { init: init, update: update, draw: draw };
  global.Kasse = { init: kasseInit, update: kasseUpdate, draw: kasseDraw };

})(window);
