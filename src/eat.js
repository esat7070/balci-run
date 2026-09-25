/* =====================================================================
   eat.js — Level 8: "Der Morgen danach".

   Kein Jump'n'Run, sondern eine kleine Szene: Yusuf liegt mit Kruemeln
   auf der Couch, Erfan ruft an und bruellt ihn wach. Danach steht Yusuf
   am Schreibtisch und isst — man zieht ihm das Essen mit der Hand in den
   Mund (Maus, Finger) oder druckt A. Ziel: 10.000 Kalorien.

   Weiter unten stehen die anderen Szenen ohne Huepfen: die Kasse am
   Ende von Level 9, das Schlafen (nach Level 11 und nach Level 15),
   das Essen am Tisch (nach Hamza und nach Georgios) und die Shisha
   am Ende von Level 14.
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
      var def, j;
      // Ab und zu legt jemand etwas Gesundes dazwischen. Wer das isst,
      // verliert ein Herz — Yusuf verzeiht so etwas nicht.
      // Zwei Regeln: es liegt IMMER etwas Richtiges mit auf dem Tisch
      // (nie drei Gesunde gleichzeitig), und im ganzen Level kommen
      // hoechstens drei gesunde Sachen vor.
      var gesundDa = 0;
      for (j = 0; j < e.slots.length; j++) {
        if (e.slots[j].food && e.slots[j].food.bad) gesundDa++;
      }
      var darf = e.bad.length && e.eaten > 1 &&
                 (e.badSpawned || 0) < 3 && gesundDa < SLOTS - 1;
      if (darf && Math.random() < 0.3) {
        def = e.bad[(Math.random() * e.bad.length) | 0];
        e.badSpawned = (e.badSpawned || 0) + 1;
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

    // Yusuf legt nach. Nicht alles — die Haelfte reicht fuers Bild.
    k.next--;
    if (k.next <= 0 && k.spawned < 8) {
      k.next = 40;
      k.spawned++;
      k.items.push({
        x: L.beltX + 6,
        spr: KASSE_SPR[(Math.random() * KASSE_SPR.length) | 0],
        price: 15 + Math.round(Math.random() * 2000) / 100,
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
        k.total = Math.min(205.4, k.total + it.price);
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

  /* =====================================================================
     SCHLAFEN — der Uebergang von Level 11 nach Level 12.
     Yusuf liegt im Bett, die Uhr laeuft im Zeitraffer durch die Nacht,
     draussen wird es hell. Um 7:30 klingelt das Handy: Esat.
     ===================================================================== */

  var NACHT = 22 * 60 + 40;           // Minuten seit Mitternacht
  var WECKEN = 24 * 60 + 7 * 60 + 30; // 7:30 am naechsten Morgen
  // Am Ende des Tages (nach Georgios) wird erst um 1:20 geschlafen
  var SPAET = 24 * 60 + 1 * 60 + 20, TIEF = 24 * 60 + 4 * 60;

  /** mode 'morgen': nach Level 11, Esat weckt ihn. mode 'ende': nach
      Level 15, einfach schlafen. Kein Anruf. */
  function schlafInit(mode) {
    var ende = (mode === 'ende');
    return { type: 'schlaf', mode: ende ? 'ende' : 'morgen', t: 0, phase: 'nacht',
             min: ende ? SPAET : NACHT, ringT: 0, upT: 0, endT: 0 };
  }

  function schlafLayout(W, H) {
    // Alles sitzt ueber dem Textkasten, der spaeter fuer den Anruf kommt
    var floorY = H - 92;
    var bedX = Math.round(W * 0.24);
    return {
      W: W, H: H, floorY: floorY,
      bedX: bedX, bedW: 150, bedY: floorY - 24,
      standX: Math.round(Math.max(40, bedX - 30)),
      tischX: bedX + 162,
      winX: Math.round(W * 0.64), winY: 26, winW: 110, winH: 76
    };
  }

  /** 0 = tiefe Nacht, 1 = heller Morgen. Hell wird es ab halb sechs. */
  function hellwert(min) {
    return Math.max(0, Math.min(1, (min - (24 * 60 + 5 * 60 + 30)) / 120));
  }

  function mischen(a, b, t) {
    var pa = [parseInt(a.substr(1, 2), 16), parseInt(a.substr(3, 2), 16), parseInt(a.substr(5, 2), 16)];
    var pb = [parseInt(b.substr(1, 2), 16), parseInt(b.substr(3, 2), 16), parseInt(b.substr(5, 2), 16)];
    return 'rgb(' + Math.round(pa[0] + (pb[0] - pa[0]) * t) + ',' +
           Math.round(pa[1] + (pb[1] - pa[1]) * t) + ',' +
           Math.round(pa[2] + (pb[2] - pa[2]) * t) + ')';
  }

  function uhrzeit(min) {
    var m = Math.floor(min) % (24 * 60);
    var h = Math.floor(m / 60), mm = m % 60;
    return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
  }

  function schlafUpdate(g, W, H) {
    var k = g.scene;
    k.t++;
    if (g.banner > 0) g.banner--;
    g.particles.update();
    g.floats.update();
    if (g.dialog) return;                 // waehrend des Anrufs steht die Szene
    var In = global.Input;

    if (k.phase === 'nacht' && k.mode === 'ende') {
      // Tagesende: er schlaeft einfach. Mit Schuhen.
      if (k.t > 70) k.min += 2;
      if (k.t % 90 === 30) S.play('snore');
      if (k.t > 30 && (In.hit('jump') || In.hit('confirm') || In.tap())) k.min = TIEF;
      if (k.min >= TIEF) { k.min = TIEF; k.phase = 'ende'; k.endT = 0; }
    } else if (k.phase === 'ende') {
      k.endT++;
      if (k.t % 90 === 30) S.play('snore');
      if (k.endT === 170 && g.onSchlafDone) g.onSchlafDone('ende');
    } else if (k.phase === 'nacht') {
      // Erst ein bisschen schlafen, dann rast die Nacht vorbei
      if (k.t > 70) k.min += 3;
      if (k.t % 90 === 30) S.play('snore');
      // Wer nicht warten will: Sprung spult vor
      if (k.t > 30 && (In.hit('jump') || In.hit('confirm') || In.tap())) {
        k.min = Math.max(k.min, WECKEN - 12);
      }
      if (k.min >= WECKEN) { k.min = WECKEN; k.phase = 'ring'; k.ringT = 0; }
    } else if (k.phase === 'ring') {
      k.ringT++;
      if (k.ringT % 70 === 1) S.play('ring');
      if (k.ringT === 80) {
        k.phase = 'anruf';
        g.showDialog(global.Levels.schlaf || [], function () {
          k.phase = 'auf'; k.upT = 0;
          g.state = 'play';
        });
      }
    } else if (k.phase === 'auf') {
      k.upT++;
      if (k.upT === 1) S.play('growl');
      if (k.upT === 90 && g.onSchlafDone) g.onSchlafDone();
    }
  }

  function schlafDraw(ctx, g, W, H) {
    var k = g.scene, L = schlafLayout(W, H), i;
    var hell = hellwert(k.min);

    // Wand: nachts dunkelblau, morgens warm
    ctx.fillStyle = mischen('#141026', '#5a4462', hell);
    ctx.fillRect(0, 0, W, H);
    for (var x = 0; x < W; x += 24) rect(ctx, x, 0, 2, L.floorY, 'rgba(255,255,255,0.03)');

    // Fenster: Sterne und Mond gehen, die Sonne kommt
    rect(ctx, L.winX - 4, L.winY - 4, L.winW + 8, L.winH + 8, '#1a1428');
    var sky = ctx.createLinearGradient(0, L.winY, 0, L.winY + L.winH);
    sky.addColorStop(0, mischen('#060818', '#6aa8e0', hell));
    sky.addColorStop(1, mischen('#1a1a48', '#f4b060', hell));
    ctx.fillStyle = sky;
    ctx.fillRect(L.winX, L.winY, L.winW, L.winH);
    ctx.save();
    ctx.beginPath(); ctx.rect(L.winX, L.winY, L.winW, L.winH); ctx.clip();
    var nacht = Math.max(0, Math.min(1, (k.min - NACHT) / (WECKEN - NACHT)));
    ctx.globalAlpha = Math.max(0, 1 - hell * 1.6);
    for (i = 0; i < 14; i++) {
      rect(ctx, L.winX + (i * 37) % L.winW, L.winY + (i * 23) % (L.winH - 20), 1, 1, '#ffffff');
    }
    ctx.fillStyle = '#fff0c0';
    ctx.beginPath();
    ctx.arc(L.winX + 24 + nacht * 70, L.winY + 16 + nacht * 70, 9, 0, 6.3);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (hell > 0) {
      ctx.fillStyle = '#ffd86a';
      ctx.beginPath();
      ctx.arc(L.winX + 76, L.winY + L.winH + 12 - hell * 60, 12, 0, 6.3);
      ctx.fill();
    }
    ctx.restore();
    rect(ctx, L.winX + L.winW / 2 - 1, L.winY, 3, L.winH, '#1a1428');
    rect(ctx, L.winX, L.winY + L.winH / 2 - 1, L.winW, 3, '#1a1428');

    // Boden
    rect(ctx, 0, L.floorY, W, H - L.floorY, '#3a2a1e');
    rect(ctx, 0, L.floorY, W, 3, '#5a4230');

    // Die sechs Tueten stehen noch da. Einraeumen ist fuer morgen.
    for (i = 0; i < 6; i++) {
      P.draw(ctx, 'tuete', 10 + (i % 3) * 11, L.floorY - 9 - Math.floor(i / 3) * 8);
    }

    // Bett
    rect(ctx, L.bedX - 6, L.bedY - 30, 6, 30 + 22, '#6b4522');        // Kopfteil
    rect(ctx, L.bedX, L.bedY + 8, L.bedW, 12, '#8a5a30');              // Gestell
    rect(ctx, L.bedX + 4, L.bedY + 20, 6, L.floorY - L.bedY - 20, '#5a3a1e');
    rect(ctx, L.bedX + L.bedW - 10, L.bedY + 20, 6, L.floorY - L.bedY - 20, '#5a3a1e');
    rect(ctx, L.bedX, L.bedY, L.bedW, 9, '#e8e4dc');                   // Matratze
    rect(ctx, L.bedX + 4, L.bedY - 9, 32, 10, '#f4f2ec');              // Kissen

    var liegt = (k.phase !== 'auf');
    var decke = mischen('#3a5a9a', '#4a6aaa', hell);
    if (liegt) {
      // Yusuf liegt auf der Seite, Kopf auf dem Kissen
      ctx.save();
      ctx.translate(L.bedX + 72, L.bedY - 14);
      ctx.rotate(-Math.PI / 2);
      P.drawChar(ctx, 'yusuf', 0, 0, {
        pose: 'idle', face: 'sleep', frame: (k.t >> 5), scale: 2
      });
      ctx.restore();
      // Decke bis zur Schulter, der Bauch drunter hebt und senkt sich.
      var atem = Math.round(Math.sin(k.t * 0.05) * 1.5);
      rect(ctx, L.bedX + 36, L.bedY - 36 - atem, L.bedW - 42, 45 + atem, decke);
      rect(ctx, L.bedX + 36, L.bedY - 36 - atem, L.bedW - 42, 3, 'rgba(255,255,255,0.18)');
      rect(ctx, L.bedX + 36, L.bedY - 33 - atem, 3, 42 + atem, 'rgba(0,0,0,0.15)');
      // Zzz
      for (i = 0; i < 3; i++) {
        var zt = (k.t * 0.02 + i * 0.33) % 1;
        F.draw(ctx, 'Z', L.bedX + 20 + zt * 18, L.bedY - 36 - zt * 26, {
          color: 'rgba(200,185,255,' + (1 - zt).toFixed(2) + ')', scale: 1 + Math.floor(zt * 2)
        });
      }
    } else {
      // Die Decke liegt zerknuellt am Fussende, Yusuf steht daneben
      rect(ctx, L.bedX + L.bedW - 50, L.bedY - 8, 46, 10, decke);
      var up = k.upT;
      P.drawChar(ctx, 'yusuf', L.standX, L.floorY, {
        pose: up < 45 ? 'idle' : 'cheer', face: up < 30 ? 'sleep' : 'growl',
        frame: (g.tick >> 3), scale: 2
      });
    }

    // Nachttisch mit Wecker und Handy
    rect(ctx, L.tischX, L.floorY - 30, 44, 30, '#6b4522');
    rect(ctx, L.tischX, L.floorY - 30, 44, 3, '#8a5a30');
    rect(ctx, L.tischX + 3, L.floorY - 44, 26, 14, '#101014');
    var blink = (k.phase === 'nacht' && (k.t >> 4) % 2 === 0);
    var zeit = uhrzeit(k.min);
    F.draw(ctx, blink ? zeit.replace(':', ' ') : zeit, L.tischX + 16, L.floorY - 40,
           { color: '#ff3a30', align: 'center' });
    var zit = (k.phase === 'ring' && k.ringT % 10 < 5) ? 1 : 0;
    P.draw(ctx, 'handy', L.tischX + 32 + zit, L.floorY - 40);
    if (k.phase === 'ring' && k.ringT % 70 < 40) {
      F.draw(ctx, 'ESAT RUFT AN', L.tischX + 36, L.floorY - 54,
             { color: '#6fc8e8', align: 'center', shadow: true });
    }

    // Oben: die Uhrzeit gross, solange die Nacht vorbeirast
    if (k.phase === 'nacht' && k.t > 50) {
      F.draw(ctx, zeit, W / 2, 14, { color: '#ffe9a8', align: 'center', scale: 3, shadow: true });
      if ((k.t >> 4) % 2 === 0) {
        F.draw(ctx, g.touch ? 'TIPPEN = VORSPULEN' : 'SPRUNG = VORSPULEN', W / 2, 44,
               { color: '#8f86a8', align: 'center' });
      }
    }
    // Tagesende
    if (k.phase === 'ende') {
      var ea = Math.min(1, k.endT / 40);
      ctx.globalAlpha = ea;
      F.draw(ctx, 'ENDE. FÜR HEUTE.', W / 2, 20, { color: '#ffd257', align: 'center', scale: 3, shadow: true });
      F.draw(ctx, 'YUSUF SCHLÄFT. MIT SCHUHEN.', W / 2, 52, { color: '#c8b8e0', align: 'center' });
      ctx.globalAlpha = 1;
    }
    drawParticles(ctx, g);
    drawFloats(ctx, g);
  }

  /* =====================================================================
     ESSEN AM TISCH — nach Hamza (Shawarma) und nach Georgios (Souvlaki).
     Gespielt wird nichts, der Dialog laeuft darueber. Was auf dem Tisch
     steht und wer gerade isst, richtet sich nach der Dialogzeile.
     ===================================================================== */

  var MAHL = {
    imbiss:  { host: 'hamza', food: 'shawarma', esatSpaeter: true,
               wand: ['#3a2014', '#7a4a2e'], boden: '#5a3a22' },
    taverne: { host: 'georgios', food: 'souvlaki', esatSpaeter: false,
               wand: ['#eef4fa', '#b8d0ea'], boden: '#8a6640' }
  };

  function mahlInit(kind) {
    var c = MAHL[kind] || MAHL.imbiss;
    return { type: 'mahl', kind: kind, t: 0,
             esatDa: !c.esatSpaeter, esatWalk: c.esatSpaeter ? 0 : 60,
             yusufRest: 1, esatRest: 0, isst: false, esatIsst: false, kauT: 0, esatKauT: 0 };
  }

  function mahlLayout(W, H) {
    var floorY = H - 96, mid = Math.round(W / 2);
    return { W: W, H: H, floorY: floorY, mid: mid,
             tischX: mid - 84, tischW: 168, tischY: floorY - 24,
             yusufX: mid - 46, esatX: mid + 48, hostX: Math.round(W * 0.86) };
  }

  function mahlUpdate(g, W, H) {
    var k = g.scene, L = mahlLayout(W, H);
    k.t++;
    if (g.banner > 0) g.banner--;
    g.particles.update();
    g.floats.update();
    var line = g.dialog ? g.dialog[g.dialogIdx] : null;
    var txt = line ? line[1] : '';

    // Was die Dialogzeile gerade erzaehlt, passiert auch auf dem Tisch
    if (/^MACH DREI/.test(txt) && !k.nachschlag) { k.nachschlag = true; k.yusufRest = 3; }
    if (/^DIE TÜR GEHT AUF/.test(txt)) k.esatDa = true;
    if (/^ESAT ISST/.test(txt) && !k.esatBekommt) { k.esatBekommt = true; k.esatRest = 2; k.esatIsst = true; }
    if (k.kind === 'taverne' && /^EIN TELLER SOUVLAKI/.test(txt) && !k.teller) { k.teller = true; k.yusufRest = 3; }
    if (/^ABER ICH ESS DAS JETZT KOMPLETT|^MACH DREI|^ICH HAB EIGENTLICH/.test(txt)) k.isst = true;
    if (/^YUSUF ISST ALLES AUF/.test(txt)) { k.yusufRest = 0; k.leer = true; }
    if (k.esatDa && k.esatWalk < 60) k.esatWalk++;

    // Kauen
    if (k.isst && k.yusufRest > 0 && k.t % 80 === 0) {
      k.yusufRest--; k.kauT = 30; S.play('bite');
      krumel(g, L.yusufX, L.floorY - 70);
    }
    if (k.esatIsst && k.esatRest > 0 && k.t % 95 === 40) {
      k.esatRest--; k.esatKauT = 30; S.play('bite');
    }
    if (k.kauT > 0) k.kauT--;
    if (k.esatKauT > 0) k.esatKauT--;
  }

  function krumel(g, x, y) {
    for (var i = 0; i < 8; i++) {
      g.particles.spawn({ x: x + (Math.random() - 0.5) * 10, y: y,
                          vx: (Math.random() - 0.5) * 2, vy: -0.8 - Math.random(),
                          life: 24, col: (i % 2) ? '#c98f3e' : '#f0d8a0', size: 2, grav: 0.22 });
    }
  }

  function mahlDraw(ctx, g, W, H) {
    var k = g.scene, c = MAHL[k.kind] || MAHL.imbiss, L = mahlLayout(W, H), i;
    var grd = ctx.createLinearGradient(0, 0, 0, L.floorY);
    grd.addColorStop(0, c.wand[0]);
    grd.addColorStop(1, c.wand[1]);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    if (k.kind === 'imbiss') {
      // Der Spiess an der Wand, dahinter das gluehende Heizelement
      var sx = Math.round(W * 0.16);
      rect(ctx, sx - 20, 30, 40, 110, '#2a1a12');
      rect(ctx, sx - 16, 34, 32, 102, '#ff6a1a');
      rect(ctx, sx - 12, 38, 24, 94, '#ffb43c');
      spiess(ctx, sx, 40, k.t);
      // Karte
      rect(ctx, Math.round(W * 0.34), 26, 150, 58, '#1a1210');
      F.draw(ctx, 'SHAWARMA  6,50', Math.round(W * 0.34) + 8, 34, { color: '#ffd257' });
      F.draw(ctx, 'FALAFEL   5,00', Math.round(W * 0.34) + 8, 48, { color: '#ffe9a8' });
      F.draw(ctx, 'HUMMUS    4,50', Math.round(W * 0.34) + 8, 62, { color: '#ffe9a8' });
      zeder(ctx, Math.round(W * 0.74), 30);
    } else {
      // Weisse Wand, blaue Fensterrahmen, Maeanderband
      for (var mx = 0; mx < W; mx += 16) {
        rect(ctx, mx, 18, 12, 3, '#2a5ab8');
        rect(ctx, mx + 9, 18, 3, 9, '#2a5ab8');
        rect(ctx, mx + 3, 24, 9, 3, '#2a5ab8');
      }
      rect(ctx, Math.round(W * 0.2), 40, 70, 60, '#2a5ab8');
      rect(ctx, Math.round(W * 0.2) + 4, 44, 62, 52, '#0e1a3a');
      ctx.fillStyle = '#fff6c8';
      ctx.beginPath(); ctx.arc(Math.round(W * 0.2) + 46, 58, 6, 0, 6.3); ctx.fill();
      griechenflagge(ctx, Math.round(W * 0.66), 38);
    }

    rect(ctx, 0, L.floorY, W, H - L.floorY, c.boden);
    rect(ctx, 0, L.floorY, W, 3, 'rgba(255,255,255,0.18)');

    // Der Wirt steht daneben und freut sich
    P.drawChar(ctx, c.host, L.hostX, L.floorY, {
      pose: 'idle', face: 'laugh', frame: (g.tick >> 4), flip: true, scale: 2
    });

    // Yusuf und Esat sitzen am Tisch (der Tisch verdeckt die Beine)
    P.drawChar(ctx, 'yusuf', L.yusufX, L.floorY - 6, {
      pose: 'idle', face: k.kauT > 0 ? 'eat' : 'laugh', frame: (g.tick >> 4), scale: 2
    });
    if (k.esatDa) {
      var ex = L.esatX + (60 - k.esatWalk) * 5;
      var sitzt = k.esatWalk >= 60;
      P.drawChar(ctx, 'esat', ex, L.floorY - (sitzt ? 6 : 0), {
        pose: sitzt ? 'idle' : 'run', face: k.esatKauT > 0 ? 'eat' : 'normal',
        frame: (g.tick >> 3), flip: true, scale: 2
      });
    }

    rect(ctx, L.tischX, L.tischY, L.tischW, 7, '#8a5a30');
    rect(ctx, L.tischX, L.tischY, L.tischW, 2, '#b07a45');
    rect(ctx, L.tischX + 8, L.tischY + 7, 6, L.floorY - L.tischY - 7, '#5a3a1e');
    rect(ctx, L.tischX + L.tischW - 14, L.tischY + 7, 6, L.floorY - L.tischY - 7, '#5a3a1e');

    // Was auf dem Tisch steht
    var fsp = P.get(c.food);
    if (k.kind === 'taverne') {
      rect(ctx, L.yusufX - 26, L.tischY - 3, 52, 3, '#f4f6fa');
      if (!k.leer) P.draw(ctx, 'tzatziki', L.yusufX + 8, L.tischY - 8);
    }
    for (i = 0; i < k.yusufRest; i++) {
      P.draw(ctx, c.food, L.yusufX - 24 + i * (fsp.w - 2), L.tischY - fsp.h - (k.kind === 'taverne' ? 3 : 0));
    }
    for (i = 0; i < k.esatRest; i++) {
      P.draw(ctx, c.food, L.esatX - 10 + i * (fsp.w - 2), L.tischY - fsp.h);
    }

    drawParticles(ctx, g);
    drawFloats(ctx, g);
  }

  /** Ein Doener-Spiess, der sich dreht: Streifen wandern mit der Zeit. */
  function spiess(ctx, cx, top, t) {
    for (var y = 0; y < 86; y += 2) {
      var w = 22 - Math.abs(y - 30) * 0.18;
      var off = ((y * 3 + t) >> 2) % 4;
      rect(ctx, cx - w / 2, top + y, w, 2, off < 2 ? '#b8643a' : '#8a4424');
    }
    rect(ctx, cx - 1, top - 8, 2, 100, '#c8ccd6');
  }

  /** Libanesische Flagge: rot-weiss-rot, gruene Zeder in der Mitte. */
  function zeder(ctx, x, y) {
    rect(ctx, x, y, 60, 10, '#d8282e');
    rect(ctx, x, y + 10, 60, 20, '#f4f2ec');
    rect(ctx, x, y + 30, 60, 10, '#d8282e');
    ctx.fillStyle = '#2a9a4a';
    for (var i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 30, y + 11 + i * 5);
      ctx.lineTo(x + 20 - i * 2, y + 18 + i * 5);
      ctx.lineTo(x + 40 + i * 2, y + 18 + i * 5);
      ctx.closePath(); ctx.fill();
    }
    rect(ctx, x + 29, y + 27, 2, 3, '#2a9a4a');
  }

  /** Griechische Flagge: neun Streifen, Kreuz links oben. */
  function griechenflagge(ctx, x, y) {
    for (var i = 0; i < 9; i++) rect(ctx, x, y + i * 4, 60, 4, i % 2 ? '#f4f6fa' : '#2a5ab8');
    rect(ctx, x, y, 22, 20, '#2a5ab8');
    rect(ctx, x + 9, y, 4, 20, '#f4f6fa');
    rect(ctx, x, y + 8, 22, 4, '#f4f6fa');
  }

  /* =====================================================================
     SHISHA — am Ende von Level 14. Esat raucht Traube-Minze, Yusuf
     Doppelapfel. Gezogen wird von allein, mit C wird ausgepustet.
     Zu frueh auspusten heisst husten. Nach drei Zuegen: Hunger.
     ===================================================================== */

  function shishaInit() {
    return { type: 'shisha', t: 0, phase: 'vorher', zug: 0, puffs: 0,
             ringe: [], hust: 0, lacht: 0, esatT: 70, fertigT: 0 };
  }

  function shishaLayout(W, H) {
    var floorY = H - 92, mid = Math.round(W / 2);
    return { W: W, H: H, floorY: floorY, mid: mid,
             yusufX: mid - 70, esatX: mid + 70, sofaY: floorY - 40,
             pfeifeY: floorY - 38 };
  }

  function shishaUpdate(g, W, H) {
    var k = g.scene, L = shishaLayout(W, H), i;
    k.t++;
    if (g.banner > 0) g.banner--;
    g.particles.update();
    g.floats.update();
    for (i = k.ringe.length - 1; i >= 0; i--) {
      var r = k.ringe[i];
      r.r += 0.3; r.y -= 0.35; r.x += r.vx;
      if (--r.life <= 0) k.ringe.splice(i, 1);
    }
    if (k.hust > 0) k.hust--;
    if (k.lacht > 0) k.lacht--;
    if (g.dialog) return;

    // Esat raucht nebenher, ganz entspannt
    if (--k.esatT <= 0) {
      k.esatT = 150;
      k.ringe.push({ x: L.esatX - 8, y: L.floorY - 64, r: 3, vx: -0.2, life: 90, col: '200,255,220' });
    }

    if (k.phase === 'rauchen') {
      k.rT = (k.rT || 0) + 1;
      k.zug = Math.min(1, k.zug + 1 / 70);
      if (k.zug < 1 && k.t % 16 === 0) S.play('move');   // blubb
      var In = global.Input;
      // Die Taste, die eben den Dialog geschlossen hat, zaehlt noch nicht
      var puste = k.rT > 12 && (In.hit('puff') || In.hit('throw') || In.hit('jump') ||
                                In.hit('confirm') || !!In.tap());
      if (puste) {
        if (k.zug >= 0.55) {
          k.puffs++;
          k.lacht = 40;
          var mx = L.yusufX + 10, my = L.floorY - 66;
          k.ringe.push({ x: mx, y: my, r: 3 + k.zug * 2, vx: 0.25, life: 110, col: '220,220,235' });
          for (i = 0; i < 16; i++) {
            g.particles.spawn({ x: mx, y: my, vx: 0.4 + Math.random() * 1.2, vy: -0.4 - Math.random() * 0.6,
                                life: 50, col: '#d8d8e8', size: 3, grav: -0.01 });
          }
          S.play('shoot');
          g.player.score += 150;
          var sp = ['RAUCHRING!', 'SAUBER.', 'WIE EIN PROFI.'];
          g.floats.add(mx, my - 14, sp[Math.min(2, k.puffs - 1)] + ' +150', '#ffe9a8', 70);
        } else {
          k.hust = 40;
          S.play('hurt');
          g.floats.add(L.yusufX, L.floorY - 80, 'HUST! HUST! ZU FRÜH.', '#c8c0d8', 60);
        }
        k.zug = 0;
      }
      if (k.puffs >= 3) { k.phase = 'fertig'; k.fertigT = 0; }
    } else if (k.phase === 'fertig') {
      k.fertigT++;
      if (k.fertigT === 60) {
        k.phase = 'nachher';
        g.showDialog(global.Levels.shisha.nachher, function () {
          g.state = 'play';
          if (g.onShishaDone) g.onShishaDone();
        });
      }
    }
  }

  function shishaDraw(ctx, g, W, H) {
    var k = g.scene, L = shishaLayout(W, H), i;
    var grd = ctx.createLinearGradient(0, 0, 0, L.floorY);
    grd.addColorStop(0, '#0e0816');
    grd.addColorStop(1, '#2e1840');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Neon an der Wand
    var neon = (k.t % 120) < 5 ? '#ffd8f0' : '#ff8ad8';
    F.draw(ctx, 'STILBRUCH', L.mid, 14, { color: neon, align: 'center', scale: 3, shadow: true });

    // Hinten sitzen die Typen wieder friedlich an ihren Tischen
    var typen = ['typ1', 'typ2', 'typ3', 'typ1'];
    for (i = 0; i < 4; i++) {
      var tx = 20 + i * (W - 60) / 3;
      rect(ctx, tx - 6, L.floorY - 60, 34, 4, '#3a2446');
      ctx.globalAlpha = 0.6;
      P.draw(ctx, typen[i], tx, L.floorY - 78, i % 2 === 1);
      ctx.globalAlpha = 1;
    }

    rect(ctx, 0, L.floorY, W, H - L.floorY, '#3e2046');
    rect(ctx, 0, L.floorY, W, 3, '#5a3060');

    // Das Sofa, darauf die beiden
    rect(ctx, L.mid - 130, L.sofaY - 22, 260, 26, '#5a1e3a');
    rect(ctx, L.mid - 130, L.sofaY - 22, 260, 4, '#7a2e52');
    P.drawChar(ctx, 'yusuf', L.yusufX, L.sofaY + 14, {
      pose: 'idle', frame: (g.tick >> 4), scale: 2,
      face: k.hust > 0 ? 'hurt' : (k.lacht > 0 ? 'laugh' : (k.zug > 0.3 ? 'eat' : 'normal'))
    });
    P.drawChar(ctx, 'esat', L.esatX, L.sofaY + 14, {
      pose: 'idle', frame: (g.tick >> 4), flip: true, scale: 2,
      face: k.esatT > 120 ? 'laugh' : 'normal'
    });
    rect(ctx, L.mid - 140, L.sofaY, 280, 12, '#4a1830');

    // Niedriger Tisch mit den zwei Pfeifen und den Schlaeuchen
    rect(ctx, L.mid - 60, L.floorY - 8, 120, 6, '#6b4522');
    var px1 = L.mid - 36, px2 = L.mid + 12;
    [px1, px2].forEach(function (px, n) {
      ctx.save();
      ctx.translate(px, L.floorY - 46);
      ctx.scale(2, 2);
      P.draw(ctx, 'shisha', 0, 0);
      ctx.restore();
      // Blubbern im Wasser
      if ((n === 0 && k.phase === 'rauchen' && k.zug < 1) || (n === 1 && k.esatT > 110)) {
        var b = (k.t >> 2) % 3;
        rect(ctx, px + 8 + b * 3, L.floorY - 16 - b * 2, 2, 2, '#e8f8ff');
      }
      ctx.strokeStyle = '#3a6a8a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      var mx = n === 0 ? L.yusufX + 12 : L.esatX - 12;
      ctx.moveTo(px + 20, L.floorY - 20);
      ctx.bezierCurveTo(px + (n === 0 ? -30 : 60), L.floorY + 4, mx, L.floorY - 30, mx, L.floorY - 60);
      ctx.stroke();
    });
    F.draw(ctx, 'DOPPELAPFEL', px1 + 12, L.floorY + 6, { color: '#ff8a8a', align: 'center' });
    F.draw(ctx, 'TRAUBE-MINZE', px2 + 12, L.floorY + 18, { color: '#8ae0c8', align: 'center' });

    // Rauchringe
    for (i = 0; i < k.ringe.length; i++) {
      var r = k.ringe[i];
      ctx.strokeStyle = 'rgba(' + r.col + ',' + Math.min(0.8, r.life / 60).toFixed(2) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(Math.round(r.x), Math.round(r.y), r.r, 0, 6.3); ctx.stroke();
    }
    drawParticles(ctx, g);
    drawFloats(ctx, g);

    // Anzeige: wie tief gezogen, wie oft ausgepustet
    if (k.phase === 'rauchen') {
      var bw = 120, bx = L.mid - bw / 2, by = 44;
      rect(ctx, bx - 2, by - 2, bw + 4, 12, 'rgba(6,4,10,0.85)');
      rect(ctx, bx, by, bw, 8, '#241830');
      rect(ctx, bx + Math.round(bw * 0.55), by, Math.round(bw * 0.45), 8, 'rgba(140,216,90,0.25)');
      rect(ctx, bx, by, Math.round(bw * k.zug), 8, k.zug >= 0.55 ? '#8cd85a' : '#ffc23c');
      F.draw(ctx, 'ZIEHEN', bx - 6, by, { color: '#c8b8e0', align: 'right' });
      F.draw(ctx, k.puffs + '/3', bx + bw + 6, by, { color: '#ffd257' });
      if ((k.t >> 4) % 2 === 0) {
        F.draw(ctx, g.touch ? 'B ODER TIPPEN = AUSPUSTEN' : 'C = AUSPUSTEN', L.mid, by + 16,
               { color: '#ffffff', align: 'center', shadow: true });
      }
    }
  }

  global.Eat = { init: init, update: update, draw: draw };
  global.Mahl = { init: mahlInit, update: mahlUpdate, draw: mahlDraw };
  global.Shisha = { init: shishaInit, update: shishaUpdate, draw: shishaDraw };
  global.Kasse = { init: kasseInit, update: kasseUpdate, draw: kasseDraw };
  global.Schlaf = { init: schlafInit, update: schlafUpdate, draw: schlafDraw };

})(window);
