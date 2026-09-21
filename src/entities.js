/* =====================================================================
   entities.js — Welt, Physik, Yusuf, Gegner, Items und Hussein.
   ===================================================================== */
(function (global) {
  'use strict';

  var T = 16;
  var W_VIEW = 512;   // Bildbreite; nur fuer "ist das noch sichtbar"-Tests

  /* ================= Konstanten ================= */

  var GRAV = 0.55;
  var MAX_FALL = 11;
  var ACC = 0.55;
  var FRIC_GROUND = 0.74;
  var FRIC_AIR = 0.93;
  var MAX_WALK = 2.15;
  var MAX_RUN = 3.15;
  var JUMP_V = -8.9;
  var JUMP2_V = -7.5;
  var COYOTE = 6;
  var BUFFER = 8;
  var POUND_CHARGE = 8;
  var POUND_SPEED = 13;
  var POUND_BOSS_DMG = 0.5;   // Arschbombe auf Bosse: halber Schaden
  var SLEEP_AFTER = 300;  // 5 Sekunden nichts tun -> Yusuf pennt

  /* Schwierigkeitsgrad pro Level. Wirkt auf Tempo und Angriffslust
     der Gegner, damit es von Level zu Level anzieht. */
  var DIFF = 1;
  function setDifficulty(d) { DIFF = d || 1; }

  /* ================= Welt ================= */

  function World() {
    this.reset();
  }

  World.prototype.reset = function () {
    this.w = 0; this.h = 0;
    this.grid = null; this.special = null;
    this.blocks = {}; this.hazards = [];
    this.movers = []; this.signs = [];
    this.theme = 'zimmer';
  };

  World.prototype.load = function (lvl) {
    this.reset();
    this.w = lvl.w; this.h = lvl.h;
    this.theme = lvl.theme;
    this.grid = new Uint8Array(lvl.w * lvl.h);
    this.special = new Uint8Array(lvl.w * lvl.h);
    this.blocks = {};
    this.signs = lvl.signs.slice();

    var i, j, r;
    for (i = 0; i < lvl.solids.length; i++) {
      r = lvl.solids[i];
      this.fill(r[0], r[1], r[2], r[3], 1);
    }

    for (i = 0; i < lvl.blocks.length; i++) {
      var b = lvl.blocks[i];
      var idx = b.y * this.w + b.x;
      this.grid[idx] = 1;
      this.special[idx] = (b.type === 'feder') ? 2 : 1;
      this.blocks[idx] = {
        x: b.x, y: b.y, type: b.type, item: b.item,
        count: b.count || 1, used: false, bump: 0, dead: false
      };
    }

    this.hazards = [];
    for (i = 0; i < lvl.hazards.length; i++) {
      r = lvl.hazards[i];
      this.hazards.push({
        x: r[0] * T, y: r[1] * T + (r[4] === 'gabel' ? 0 : 8),
        w: r[2] * T, h: r[4] === 'gabel' ? T : T - 8,
        type: r[4], tx: r[0], ty: r[1], tw: r[2]
      });
    }

    this.movers = [];
    for (i = 0; i < lvl.movers.length; i++) {
      var m = lvl.movers[i];
      this.movers.push({
        x: m.x * T, y: m.y * T, w: m.w * T, h: 6,
        ox: m.x * T, oy: m.y * T,
        axis: m.axis, range: m.range * T, speed: m.speed,
        dir: 1, dx: 0, dy: 0
      });
    }
  };

  World.prototype.fill = function (x, y, w, h, v) {
    for (var ty = y; ty < y + h; ty++) {
      if (ty < 0 || ty >= this.h) continue;
      for (var tx = x; tx < x + w; tx++) {
        if (tx < 0 || tx >= this.w) continue;
        this.grid[ty * this.w + tx] = v;
      }
    }
  };

  World.prototype.solid = function (tx, ty) {
    if (tx < 0 || tx >= this.w) return true;      // Levelrand ist Wand
    if (ty < 0) return false;                      // oben offen
    if (ty >= this.h) return false;                // unten offen -> Sturz
    return this.grid[ty * this.w + tx] === 1;
  };

  World.prototype.specialAt = function (tx, ty) {
    if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return 0;
    return this.special[ty * this.w + tx];
  };

  World.prototype.blockAt = function (tx, ty) {
    return this.blocks[ty * this.w + tx] || null;
  };

  World.prototype.clearBlock = function (b) {
    var idx = b.y * this.w + b.x;
    this.grid[idx] = 0;
    this.special[idx] = 0;
    b.dead = true;
  };

  World.prototype.updateMovers = function () {
    for (var i = 0; i < this.movers.length; i++) {
      var m = this.movers[i];
      var px = m.x, py = m.y;
      if (m.axis === 'x') {
        m.x += m.speed * m.dir;
        if (m.x > m.ox + m.range) { m.x = m.ox + m.range; m.dir = -1; }
        if (m.x < m.ox - m.range) { m.x = m.ox - m.range; m.dir = 1; }
      } else {
        m.y += m.speed * m.dir;
        if (m.y > m.oy + m.range) { m.y = m.oy + m.range; m.dir = -1; }
        if (m.y < m.oy - m.range) { m.y = m.oy - m.range; m.dir = 1; }
      }
      m.dx = m.x - px; m.dy = m.y - py;
    }
  };

  /* ================= Kollision ================= */

  function moveX(e, world, dx) {
    e.x += dx;
    var y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - 1) / T);
    var tx, ty;
    if (dx > 0) {
      tx = Math.floor((e.x + e.w - 1) / T);
      for (ty = y0; ty <= y1; ty++) {
        if (world.solid(tx, ty)) {
          e.x = tx * T - e.w; e.vx = 0; e.wallTile = [tx, ty]; return 1;
        }
      }
    } else if (dx < 0) {
      tx = Math.floor(e.x / T);
      for (ty = y0; ty <= y1; ty++) {
        if (world.solid(tx, ty)) {
          e.x = (tx + 1) * T; e.vx = 0; e.wallTile = [tx, ty]; return -1;
        }
      }
    }
    return 0;
  }

  function moveY(e, world, dy) {
    e.y += dy;
    var x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - 1) / T);
    var tx, ty;
    if (dy > 0) {
      // WICHTIG: hier KEIN "-1". Sonst greift die Kollision erst, wenn die
      // Figur schon einen Pixel im Boden steckt — sie sinkt ein, wird
      // zurueckgeschnappt und gilt jeden zweiten Frame als "in der Luft".
      // Genau das war das Zittern.
      ty = Math.floor((e.y + e.h) / T);
      for (tx = x0; tx <= x1; tx++) {
        if (world.solid(tx, ty)) {
          e.y = ty * T - e.h; e.vy = 0;
          e.landTile = [tx, ty];
          return 1;
        }
      }
    } else if (dy < 0) {
      ty = Math.floor(e.y / T);
      for (tx = x0; tx <= x1; tx++) {
        if (world.solid(tx, ty)) {
          e.y = (ty + 1) * T; e.vy = 0;
          e.headTile = [tx, ty];
          return -1;
        }
      }
    }
    return 0;
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /* ================= Partikel ================= */

  function Particles() { this.list = []; }

  Particles.prototype.spawn = function (o) {
    this.list.push({
      x: o.x, y: o.y,
      vx: o.vx || 0, vy: o.vy || 0,
      life: o.life || 30, max: o.life || 30,
      col: o.col || '#ffc23c',
      size: o.size || 2,
      grav: o.grav === undefined ? 0.18 : o.grav,
      text: o.text || null,
      shrink: o.shrink !== false
    });
  };

  Particles.prototype.burst = function (x, y, n, o) {
    o = o || {};
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = (o.spread || 2) * (0.35 + Math.random() * 0.65);
      this.spawn({
        x: x, y: y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - (o.up || 0.6),
        life: (o.life || 26) + Math.random() * 10 | 0,
        col: o.col || '#ffc23c',
        size: o.size || 2,
        grav: o.grav === undefined ? 0.2 : o.grav
      });
    }
  };

  Particles.prototype.update = function () {
    for (var i = this.list.length - 1; i >= 0; i--) {
      var p = this.list[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += p.grav;
      p.vx *= 0.98;
      if (--p.life <= 0) this.list.splice(i, 1);
    }
  };

  /* ================= Fließtexte ================= */

  function Floats() { this.list = []; }
  Floats.prototype.add = function (x, y, text, col, life) {
    this.list.push({ x: x, y: y, text: text, col: col || '#fff3c8',
                     life: life || 60, max: life || 60 });
  };
  Floats.prototype.update = function () {
    for (var i = this.list.length - 1; i >= 0; i--) {
      var f = this.list[i];
      f.y -= 0.45;
      if (--f.life <= 0) this.list.splice(i, 1);
    }
  };

  /* ================= Spieler ================= */

  function Player(x, y) {
    this.w = 12; this.h = 26;
    this.reset(x, y);
    this.lives = 4;
    this.honey = 0;
    this.score = 0;
    this.maxHp = 3;
    this.eatCount = 0;   // fuer den Laufgag: er hat NIE Hunger
    this.deaths = 0;     // fuer die Bestenliste
  }

  Player.prototype.reset = function (x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.grounded = false;
    this.coyote = 0; this.buffer = 0;
    this.jumpsLeft = 2;
    this.jumpHeld = false;
    this.pound = 0;          // 0 aus, >0 Aufladen, -1 Sturz
    this.poundCharge = 0;
    this.hp = this.maxHp || 3;
    this.invuln = 0;
    this.hurtTimer = 0;
    this.dead = false;
    this.deadTimer = 0;
    this.deadHandled = false;
    this.power = 0;          // Gold-Döner
    this.idle = 0;
    this.sleeping = false;
    this.snore = 0;
    this.eatTimer = 0;
    this.laughTimer = 0;
    this.slip = 0;           // auf einer Pfuetze ausgerutscht
    this.smoke = false;      // Kippen-Power-Up aktiv
    this.smokeCool = 0;
    this.growlTimer = 0;
    this.growlCool = 0;
    this.anim = 0;
    this.animT = 0;
    this.ridingY = null;
    this.landTile = null;
    this.headTile = null;
    this.won = false;
    this.cheer = 0;
  };

  Player.prototype.cx = function () { return this.x + this.w / 2; };
  Player.prototype.feet = function () { return this.y + this.h; };

  Player.prototype.update = function (g) {
    var world = g.world, In = global.Input;
    var frozen = g.frozen;

    if (this.dead) { this.deadUpdate(g); return; }

    if (this.invuln > 0) this.invuln--;
    if (this.hurtTimer > 0) this.hurtTimer--;
    if (this.power > 0) {
      this.power--;
      if (this.power === 0) g.floats.add(this.cx(), this.y - 6, 'VORBEI', '#ffd257');
    }
    if (this.eatTimer > 0) this.eatTimer--;
    if (this.laughTimer > 0) this.laughTimer--;
    if (this.growlTimer > 0) this.growlTimer--;
    if (this.growlCool > 0) this.growlCool--;
    if (this.smokeCool > 0) this.smokeCool--;

    // Knurrt einfach so vor sich hin. Tiefe Goblin-Stimme.
    if (!frozen && !this.sleeping && this.growlCool === 0 && Math.random() < 0.0034) {
      this.doGrowl(g);
    }

    var ax = frozen ? 0 : In.axis();
    var wantJump = !frozen && In.hit('jump');
    var holdJump = !frozen && In.down('jump');
    var wantDown = !frozen && In.down('down');
    var running = !frozen && In.down('run');

    /* --- Kippe werfen (nur mit Päckchen) --- */
    if (!frozen && this.smoke && this.smokeCool === 0 && In.hit('throw')) {
      this.smokeCool = 20;
      g.addProjectile('kippe', this.cx() + this.facing * 9, this.y + 11,
                      this.facing * 4.3, -1.7, true);
      global.Sound.play('flick');
      g.particles.spawn({ x: this.cx() + this.facing * 10, y: this.y + 11,
                          vx: this.facing * 0.3, vy: -0.4, life: 26,
                          col: '#9a9088', size: 2, grav: -0.012 });
      if (Math.random() < 0.3) this.doGrowl(g);
    }

    /* --- Schlaf-Gag --- */
    if (!frozen && (ax !== 0 || wantJump || wantDown || !this.grounded)) {
      if (this.sleeping) {
        this.sleeping = false;
        g.floats.add(this.cx(), this.y - 8, 'OH! SCHON DRAN?', '#ffe9a8');
      }
      this.idle = 0;
    } else if (this.grounded && Math.abs(this.vx) < 0.15) {
      this.idle++;
      if (this.idle === SLEEP_AFTER) {
        this.sleeping = true;
        var lines = global.Levels.sleepLines;
        g.floats.add(this.cx(), this.y - 8, lines[(Math.random() * lines.length) | 0],
                     '#bda8ff', 110);
      }
    }
    if (this.sleeping) {
      this.snore++;
      if (this.snore % 96 === 0) {
        global.Sound.play('snore');
        g.particles.spawn({ x: this.cx() + 6 * this.facing, y: this.y - 2,
                            vx: 0.25 * this.facing, vy: -0.5, life: 60,
                            col: '#cfc0ff', size: 3, grav: -0.01, text: 'Z' });
      }
    }

    /* --- Horizontal --- */
    var driving = !!(g.lvl && g.lvl.driving);
    var maxS = running ? MAX_RUN : MAX_WALK;
    if (this.power > 0) maxS += 0.5;
    if (driving) maxS = running ? 4.8 : 3.8;   // der Mustang zieht
    // Auf einer Pfuetze: kaum Grip, er rutscht weiter.
    if (this.slip > 0) {
      this.slip--;
      ax *= 0.35;
      if (this.grounded) this.vx *= 0.995;
    }
    if (ax !== 0) {
      this.vx += ACC * ax;
      this.facing = ax > 0 ? 1 : -1;
    } else {
      // Besoffen rutscht er nach: Alex hat ihm eine Flasche uebergekippt.
      this.vx *= this.grounded ? (g.drunk ? 0.9 : FRIC_GROUND) : FRIC_AIR;
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
    }
    if (g.drunk && !this.dead) this.vx += Math.sin(g.tick * 0.043) * 0.085;
    if (this.vx > maxS) this.vx = maxS;
    if (this.vx < -maxS) this.vx = -maxS;

    /* --- Bauch-Stampfer --- */
    if (this.pound === 0 && !this.grounded && wantDown && this.vy > -3) {
      this.pound = POUND_CHARGE;
      this.vy = 0; this.vx = 0;
      global.Sound.play('select');
    }
    if (this.pound > 0) {
      this.pound--;
      this.vx = 0; this.vy = 0;
      if (this.pound === 0) { this.pound = -1; global.Sound.play('pound'); }
    }

    /* --- Sprung --- */
    if (this.grounded) { this.coyote = COYOTE; this.jumpsLeft = 2; }
    else if (this.coyote > 0) this.coyote--;
    if (wantJump) this.buffer = BUFFER;
    else if (this.buffer > 0) this.buffer--;

    if (this.buffer > 0 && this.pound >= 0) {
      if (this.coyote > 0) {
        this.vy = JUMP_V; this.grounded = false; this.coyote = 0;
        this.jumpsLeft = 1; this.buffer = 0;
        global.Sound.play('jump');
        g.particles.burst(this.cx(), this.feet(), 5,
          { col: '#e8dcc0', spread: 1.3, up: 0.2, life: 16, grav: 0.1 });
      } else if (this.jumpsLeft > 0) {
        this.vy = JUMP2_V; this.jumpsLeft = 0; this.buffer = 0;
        this.pound = 0;
        global.Sound.play('doubleJump');
        // Bauch-Boost: Yusuf drückt sich an der Luft ab. Physik ist relativ.
        for (var i = 0; i < 8; i++) {
          var a = Math.PI + (i / 7) * Math.PI;
          g.particles.spawn({ x: this.cx(), y: this.feet() - 4,
            vx: Math.cos(a) * 1.7, vy: -Math.sin(a) * 1.1 + 0.4,
            life: 20, col: '#fff0c0', size: 2, grav: 0.06 });
        }
      }
    }
    // Sprung abschneiden, wenn losgelassen
    if (!holdJump && this.vy < -2.5 && this.pound >= 0) this.vy *= 0.52;
    this.jumpHeld = holdJump;

    /* --- Schwerkraft --- */
    if (this.pound === 0) {
      this.vy += GRAV;
      if (this.vy > MAX_FALL) this.vy = MAX_FALL;
    } else if (this.pound === -1) {
      this.vy = POUND_SPEED;
    }

    /* --- Bewegung + Kollision --- */
    var wasGrounded = this.grounded;
    this.landTile = null; this.headTile = null; this.wallTile = null;

    var keepVx = this.vx;
    var hitX = moveX(this, world, this.vx);
    // Im Mustang werden Strassensperren einfach ueberfahren.
    if (driving && hitX !== 0 && this.wallTile) {
      var wb = world.blockAt(this.wallTile[0], this.wallTile[1]);
      if (wb && !wb.dead && wb.type === 'kiste') {
        this.breakCrate(g, wb);
        this.vx = keepVx * 0.85;
        g.shake(3, 6);
      }
    }

    this.grounded = false;
    var hitY = moveY(this, world, this.vy);
    if (hitY === 1) this.grounded = true;
    if (hitY === -1 && this.headTile) this.bumpBlock(g, this.headTile);

    /* --- Bewegliche Tabletts --- */
    this.rideMovers(world);

    /* --- Landung --- */
    if (this.grounded && !wasGrounded) {
      if (this.pound === -1) {
        this.pound = 0;
        g.shake(7, 14);
        global.Sound.play('land');
        g.particles.burst(this.cx(), this.feet(), 16,
          { col: '#e8dcc0', spread: 3.4, up: 0.2, life: 24, grav: 0.22 });
        this.poundImpact(g);
      } else if (this.vy >= 0) {
        global.Sound.play('land');
        g.particles.burst(this.cx(), this.feet(), 4,
          { col: '#e8dcc0', spread: 1.2, up: 0.1, life: 12, grav: 0.14 });
      }
      // Sprungkissen?
      if (this.landTile) {
        var sp = world.specialAt(this.landTile[0], this.landTile[1]);
        if (sp === 2) {
          this.vy = -12.4; this.grounded = false; this.jumpsLeft = 1;
          global.Sound.play('doubleJump');
          g.floats.add(this.cx(), this.y - 4, 'HOPP!', '#ff9ec4', 40);
          g.particles.burst(this.cx(), this.feet(), 10,
            { col: '#ff9ec4', spread: 2.2, up: 1, life: 22 });
        }
      }
    }

    /* --- Gefahren --- */
    for (var hi = 0; hi < world.hazards.length; hi++) {
      if (overlap(this, world.hazards[hi])) {
        this.hurt(g, world.hazards[hi].type === 'gabel' ? 1 : 1,
                  world.hazards[hi].x + world.hazards[hi].w / 2);
        break;
      }
    }

    /* --- Aus der Welt gefallen --- */
    if (this.y > world.h * T + 40) this.kill(g, true);

    /* --- Rauchfahne --- */
    if (this.smoke && g.tick % 9 === 0) {
      g.particles.spawn({
        x: this.cx() + this.facing * 9, y: this.y + 10,
        vx: this.facing * 0.12 + (Math.random() - 0.5) * 0.25, vy: -0.42,
        life: 48, col: '#8e8880', size: 2, grav: -0.008
      });
    }

    /* --- Animation --- */
    // Ruhig halten: Laufzyklus ca. 5 Frames pro Bild, Atmen im Stand sehr langsam.
    this.animT += Math.max(0.022, Math.abs(this.vx) * 0.065);
    while (this.animT >= 1) { this.animT -= 1; this.anim++; }
  };

  Player.prototype.rideMovers = function (world) {
    for (var i = 0; i < world.movers.length; i++) {
      var m = world.movers[i];
      var feet = this.y + this.h;
      if (this.x + this.w > m.x + 1 && this.x < m.x + m.w - 1 &&
          feet >= m.y - 2 && feet <= m.y + m.h + Math.max(3, this.vy + 2) &&
          this.vy >= -0.5) {
        this.y = m.y - this.h;
        this.vy = 0;
        this.grounded = true;
        this.x += m.dx;
        if (m.dy < 0) this.y += m.dy;
      }
    }
  };

  /** Block von unten anstoßen. */
  Player.prototype.bumpBlock = function (g, tile) {
    var b = g.world.blockAt(tile[0], tile[1]);
    if (!b || b.dead) return;
    if (b.type === 'q') {
      if (b.used) { global.Sound.play('select'); return; }
      b.bump = 8;
      b.count--;
      this.spawnFromBlock(g, b);
      if (b.count <= 0) b.used = true;
    } else if (b.type === 'kiste') {
      b.bump = 8;
      this.breakCrate(g, b);
    }
  };

  Player.prototype.spawnFromBlock = function (g, b) {
    var item = b.item || 'honig';
    var px = b.x * T + T / 2, py = b.y * T - 4;
    if (item === 'honig') {
      g.addItem('honig', px, py, true);
      global.Sound.play('coinBlock');
    } else {
      g.addItem(item, px, py, true);
      global.Sound.play('power');
    }
    g.particles.burst(px, b.y * T, 6, { col: '#ffe38a', spread: 1.8, up: 1.2, life: 18 });
  };

  Player.prototype.breakCrate = function (g, b) {
    global.Sound.play('brk');
    g.particles.burst(b.x * T + 8, b.y * T + 8, 14,
      { col: '#c79a5a', spread: 2.6, up: 0.6, life: 28, size: 3 });
    g.particles.burst(b.x * T + 8, b.y * T + 8, 6,
      { col: '#7d5224', spread: 2, up: 0.4, life: 24, size: 2 });
    if (b.item) g.addItem(b.item, b.x * T + 8, b.y * T - 2, true);
    g.world.clearBlock(b);
    this.score += 50;
    g.floats.add(b.x * T + 8, b.y * T, '+50', '#e8dcc0', 40);
  };

  /** Einschlag des Bauch-Stampfers: Blöcke drunter + Gegner in der Nähe. */
  Player.prototype.poundImpact = function (g) {
    var tx0 = Math.floor((this.x - 6) / T), tx1 = Math.floor((this.x + this.w + 6) / T);
    var ty = Math.floor((this.feet() + 2) / T);
    for (var tx = tx0; tx <= tx1; tx++) {
      var b = g.world.blockAt(tx, ty);
      if (!b || b.dead) continue;
      if (b.type === 'kiste') this.breakCrate(g, b);
      // Fragezeichen-Bloecke, die auf Boden oder einer Plattform stehen,
      // kann man von unten gar nicht erreichen. Der Stampfer von oben
      // loest sie deshalb genauso aus.
      else if (b.type === 'q' && !b.used) {
        b.bump = 8;
        b.count--;
        this.spawnFromBlock(g, b);
        if (b.count <= 0) b.used = true;
      }
    }
    // Schockwelle
    for (var i = 0; i < g.enemies.length; i++) {
      var e = g.enemies[i];
      if (e.dead) continue;
      var d = Math.abs(e.x + e.w / 2 - this.cx());
      var dy = Math.abs(e.y + e.h - this.feet());
      if (d < 52 && dy < 30) e.squash(g, this);
    }
    if (g.boss && !g.boss.dead) {
      var bd = Math.abs(g.boss.x + g.boss.w / 2 - this.cx());
      var bdy = Math.abs(g.boss.y + g.boss.h - this.feet());
      // WICHTIG: alle Boss-Klassen erwarten hier den Spieler als dritten
      // Wert. Frueher stand hier ein "true" — das hat beim Bauch-Stampfer
      // auf Mirkan, Lennart, Erfan und Esat das Spiel abstuerzen lassen.
      if (bd < 56 && bdy < 34) g.boss.hit(g, POUND_BOSS_DMG, this);
    }
    for (var s = 0; s < 14; s++) {
      g.particles.spawn({
        x: this.cx(), y: this.feet(),
        vx: (s / 13 - 0.5) * 8, vy: -Math.random() * 1.6,
        life: 22, col: '#fff0c0', size: 2, grav: 0.3
      });
    }
  };

  /** Das tiefe Knurren. Kommt oft. Ohne Vorwarnung. */
  Player.prototype.doGrowl = function (g, line) {
    if (this.growlCool > 0 || this.dead) return;
    this.growlCool = 80;
    this.growlTimer = 24;
    global.Sound.play('growl');
    var l = global.Levels.growlLines;
    g.floats.add(this.cx(), this.y - 6,
                 line || l[(Math.random() * l.length) | 0], '#d8b478', 48);
  };

  Player.prototype.hurt = function (g, dmg, fromX) {
    if (this.invuln > 0 || this.dead) return;
    if (this.power > 0) return;

    // Mit Kippen im Sack kostet ein Treffer nur das Päckchen, kein Herz.
    if (this.smoke) {
      this.smoke = false;
      this.invuln = 90;
      this.hurtTimer = 30;
      this.sleeping = false;
      var d0 = (fromX !== undefined && fromX > this.cx()) ? -1 : 1;
      this.vx = d0 * 2.6; this.vy = -3.6; this.grounded = false;
      g.shake(4, 8);
      global.Sound.play('hurt');
      g.floats.add(this.cx(), this.y - 8, 'MEINE KIPPEN!', '#ffb46a', 60);
      g.particles.burst(this.cx(), this.y + 10, 12,
        { col: '#9a9088', spread: 2.2, up: 0.8, life: 34, grav: -0.02 });
      this.doGrowl(g, 'KRRRRR!');
      return;
    }

    this.hp -= dmg;
    this.invuln = 96;
    this.hurtTimer = 40;
    this.sleeping = false;
    this.pound = 0;
    var dir = (fromX !== undefined && fromX > this.cx()) ? -1 : 1;
    this.vx = dir * 3.1;
    this.vy = -4.2;
    this.grounded = false;
    g.shake(5, 10);
    global.Sound.play('hurt');
    var lines = global.Levels.hurtLines;
    g.floats.add(this.cx(), this.y - 6, lines[(Math.random() * lines.length) | 0], '#ff8a8a', 55);
    if (this.hp <= 0) this.kill(g);
  };

  Player.prototype.kill = function (g, fell) {
    if (this.dead) return;
    this.dead = true;
    this.deadTimer = 0;
    this.hp = 0;
    this.vy = fell ? 4 : -9;
    this.vx = 0;
    global.Sound.play('die');
    g.shake(6, 16);
  };

  Player.prototype.deadUpdate = function (g) {
    this.deadTimer++;
    this.vy += GRAV * 0.75;
    this.y += this.vy;
    // Nur EINMAL melden — sonst frisst die Blende alle Leben auf.
    if (this.deadTimer > 100 && !this.deadHandled) {
      this.deadHandled = true;
      g.onPlayerDead();
    }
  };

  Player.prototype.heal = function (g, n) {
    if (this.hp >= this.maxHp) { this.score += 200; g.floats.add(this.cx(), this.y - 6, '+200', '#ffd257'); return; }
    this.hp = Math.min(this.maxHp, this.hp + n);
    global.Sound.play('heal');
  };

  Player.prototype.pose = function () {
    if (this.dead) return { pose: 'hurt', face: 'hurt' };
    if (this.won || this.cheer > 0) return { pose: 'cheer', face: 'laugh' };
    if (this.sleeping) return { pose: 'sleep', face: 'sleep' };
    var face = 'normal';
    if (this.growlTimer > 0) face = 'growl';
    else if (this.hurtTimer > 0) face = 'hurt';
    else if (this.eatTimer > 0) face = 'eat';
    else if (this.laughTimer > 0) face = 'laugh';
    else if (this.smoke) face = 'smoke';

    if (this.pound > 0) return { pose: 'duck', face: face };
    if (this.pound === -1) return { pose: 'pound', face: face };
    if (!this.grounded) return { pose: this.vy < 0 ? 'jump' : 'fall', face: face };
    if (global.Input.down('down')) return { pose: 'duck', face: face };
    if (Math.abs(this.vx) > 0.3) return { pose: 'run', face: face };
    return { pose: 'idle', face: face };
  };

  /* ================= Gegner ================= */

  var ENEMY = {
    wecker:  { w: 14, h: 14, spr: ['wecker', 'wecker2'], score: 100, hp: 1 },
    biene:   { w: 13, h: 11, spr: ['biene', 'biene2'], score: 150, hp: 1, fly: true },
    broki:   { w: 14, h: 14, spr: ['broki', 'broki2'], score: 120, hp: 1 },
    salat:   { w: 14, h: 12, spr: ['salat', 'salat2'], score: 140, hp: 1 },
    lennart: { w: 20, h: 22, spr: ['lennart', 'lennart2'], score: 320, hp: 2 },
    drohne:  { w: 16, h: 12, spr: ['drohne', 'drohne2'], score: 200, hp: 1, fly: true },
    agent:   { w: 14, h: 12, spr: ['agent', 'agent2'], score: 180, hp: 1, fly: true },
    polizei: { w: 14, h: 24, spr: ['polizei', 'polizei2'], score: 250, hp: 1 },
    // Level 9, Sparmarkt
    wagen:   { w: 21, h: 14, spr: ['wagen', 'wagen2'], score: 170, hp: 1 },
    tomate:  { w: 10, h: 10, spr: ['tomate', 'tomate2'], score: 130, hp: 1 },
    wurst:   { w: 14, h: 9, spr: ['wurst', 'wurst2'], score: 150, hp: 1 }
  };

  function Enemy(type, tx, ty) {
    var d = ENEMY[type];
    this.t = type;
    this.w = d.w; this.h = d.h;
    this.def = d;
    this.hp = d.hp;
    this.x = tx * T + (T - d.w) / 2;
    this.y = d.fly ? ty * T : ty * T - d.h;
    this.homeY = this.y;
    this.homeX = this.x;
    this.vx = (Math.random() < 0.5 ? -1 : 1) * 0.7;
    this.vy = 0;
    this.facing = this.vx > 0 ? 1 : -1;
    this.anim = 0; this.animT = 0;
    this.t0 = (Math.random() * 120) | 0;
    this.dead = false;
    this.deadTimer = 0;
    this.stun = 0;
    this.charge = 0;
    this.roll = 0;
    this.flash = 0;
    this.grounded = false;
    this.active = false;
  }

  Enemy.prototype.cx = function () { return this.x + this.w / 2; };

  Enemy.prototype.update = function (g) {
    if (this.dead) {
      this.deadTimer++;
      this.y += this.vy; this.vy += GRAV * 0.6;
      this.x += this.vx;
      return;
    }
    this.t0++;
    if (this.flash > 0) this.flash--;
    if (this.stun > 0) { this.stun--; this.vx = 0; }

    var p = g.player;
    var dx = p.cx() - this.cx();
    var dist = Math.abs(dx);

    switch (this.t) {
      case 'wecker': this.upWecker(g, dx, dist); break;
      case 'biene': this.upBiene(g, p, dx); break;
      case 'broki': this.upWalker(g, 0.72 * DIFF); break;
      case 'salat': this.upSalat(g); break;
      case 'lennart': this.upLennart(g, dx, dist); break;
      case 'drohne': this.upDrohne(g, p, dx); break;
      case 'agent': this.upAgent(g, p); break;
      case 'polizei': this.upPolizei(g, p, dx, dist); break;
      case 'wagen': this.upWagen(g, dx, dist); break;
      case 'tomate': this.upSalat(g); break;
      case 'wurst': this.upWalker(g, 0.9 * DIFF); break;
    }

    this.animT += 1;
    if (this.animT > (this.def.fly ? 5 : 10)) { this.animT = 0; this.anim ^= 1; }

    // Kontakt mit Yusuf
    if (overlap(this, p) && !p.dead) {
      // Im Auto wird nicht diskutiert.
      if (p.power > 0 || p.pound === -1 || (g.lvl && g.lvl.driving)) {
        this.squash(g, p);
      } else if (p.vy > 0.8 && p.feet() - this.y < 14) {
        this.stomped(g, p);
      } else {
        p.hurt(g, 1, this.cx());
      }
    }
  };

  Enemy.prototype.upWecker = function (g, dx, dist) {
    this.vy += GRAV;
    if (this.grounded && this.stun <= 0 && this.t0 % Math.round(62 / DIFF) === 0) {
      this.vy = -5.4;
      this.vx = (dist < 150 ? (dx > 0 ? 0.95 : -0.95) * DIFF : this.vx);
      this.facing = this.vx > 0 ? 1 : -1;
    }
    this.grounded = false;
    if (moveX(this, g.world, this.vx) !== 0) { this.vx = -this.vx; this.facing = -this.facing; }
    if (moveY(this, g.world, this.vy) === 1) { this.grounded = true; this.vx *= 0.82; }
  };

  Enemy.prototype.upBiene = function (g, p, dx) {
    // Fliegt Sinus und driftet langsam auf Yusuf zu.
    var target = this.homeX + Math.sin(this.t0 * 0.028) * 40;
    if (Math.abs(dx) < 130) target = p.cx() - this.w / 2;
    this.x += Math.max(-1.05, Math.min(1.05, (target - this.x) * 0.045));
    this.y = this.homeY + Math.sin(this.t0 * 0.062) * 16;
    this.facing = (p.cx() > this.cx()) ? 1 : -1;
  };

  Enemy.prototype.upWalker = function (g, spd) {
    if (this.stun > 0) { this.vy += GRAV; moveY(this, g.world, this.vy); return; }
    this.vx = (this.facing > 0 ? spd : -spd);
    this.vy += GRAV;
    if (moveX(this, g.world, this.vx) !== 0) this.facing = -this.facing;
    // Kante erkennen, damit sie nicht runterfallen
    var aheadX = this.facing > 0 ? this.x + this.w + 2 : this.x - 2;
    var below = Math.floor((this.y + this.h + 4) / T);
    if (this.grounded && !g.world.solid(Math.floor(aheadX / T), below)) {
      this.facing = -this.facing;
    }
    this.grounded = (moveY(this, g.world, this.vy) === 1);
  };

  Enemy.prototype.upSalat = function (g) {
    this.vy += GRAV * 0.9;
    if (moveX(this, g.world, this.vx) !== 0) this.vx = -this.vx;
    if (moveY(this, g.world, this.vy) === 1) this.vy = -6.2;  // hüpft ewig
    this.facing = this.vx > 0 ? 1 : -1;
    if (Math.abs(this.vx) < 1) this.vx = this.vx >= 0 ? 1.15 : -1.15;
  };

  Enemy.prototype.upLennart = function (g, dx, dist) {
    this.vy += GRAV;
    if (this.stun > 0) { this.grounded = (moveY(this, g.world, this.vy) === 1); return; }

    if (this.charge > 0) {
      this.charge--;
      this.vx = this.facing * 2.75 * DIFF;
      if (this.charge === 0) this.vx = 0;
    } else if (dist < 80 * DIFF && Math.abs(dx) > 8 && this.t0 % 30 === 0) {
      this.facing = dx > 0 ? 1 : -1;
      this.charge = 42;
      global.Sound.play('shoot');
      var lines = global.Levels.lennartLines;
      g.floats.add(this.cx(), this.y - 8,
                   lines[(Math.random() * lines.length) | 0], '#ffd257', 55);
    } else {
      this.vx = this.facing * 0.85;
    }

    if (moveX(this, g.world, this.vx) !== 0) { this.facing = -this.facing; this.charge = 0; }
    var aheadX = this.facing > 0 ? this.x + this.w + 2 : this.x - 2;
    var below = Math.floor((this.y + this.h + 4) / T);
    if (this.grounded && this.charge === 0 &&
        !g.world.solid(Math.floor(aheadX / T), below)) this.facing = -this.facing;
    this.grounded = (moveY(this, g.world, this.vy) === 1);
  };

  Enemy.prototype.upDrohne = function (g, p, dx) {
    this.y = this.homeY + Math.sin(this.t0 * 0.045) * 9;
    if (Math.abs(dx) < 190) {
      this.x += Math.max(-0.62, Math.min(0.62, dx * 0.02));
    } else {
      this.x = this.homeX + Math.sin(this.t0 * 0.02) * 30;
    }
    this.facing = dx > 0 ? 1 : -1;
    if (this.t0 % Math.round(120 / DIFF) === 0 && Math.abs(dx) < 170) {
      g.addProjectile('sellerie', this.cx() - 3, this.y + this.h, 0, 1.2);
      global.Sound.play('shoot');
    }
  };

  /** Einkaufswagen: rollt gemuetlich — bis Yusuf vor ihm steht. */
  Enemy.prototype.upWagen = function (g, dx, dist) {
    var rollt = (dist < 150 && (dx > 0) === (this.facing > 0));
    if (rollt && this.roll < 60) this.roll = 60;
    if (this.roll > 0) this.roll--;
    var spd = (this.roll > 0 ? 2.7 : 0.9) * DIFF;
    this.vx = this.facing * spd;
    this.vy += GRAV;
    if (moveX(this, g.world, this.vx) !== 0) { this.facing = -this.facing; this.roll = 0; }
    var aheadX = this.facing > 0 ? this.x + this.w + 2 : this.x - 2;
    var below = Math.floor((this.y + this.h + 4) / T);
    if (this.grounded && !g.world.solid(Math.floor(aheadX / T), below)) {
      this.facing = -this.facing; this.roll = 0;
    }
    this.grounded = (moveY(this, g.world, this.vy) === 1);
    if (this.roll > 0 && this.t0 % 6 === 0) {
      g.particles.spawn({ x: this.cx(), y: this.y + this.h, vx: -this.facing * 0.8,
                          vy: -0.3, life: 14, col: '#c8ccd6', size: 2, grav: 0.1 });
    }
  };

  /** Polizist: steht am Strassenrand und wirft Strafzettel im Bogen.
      Kommt der Mustang, hechtet er zur Seite (siehe die()). */
  Enemy.prototype.upPolizei = function (g, p, dx, dist) {
    this.vy += GRAV;
    this.facing = dx > 0 ? 1 : -1;
    this.vx = 0;
    var every = Math.round(96 / DIFF);
    if (dist < 230 && dist > 24 && this.t0 % every === 0) {
      // Vorhalten: dahin werfen, wo der Wagen gleich sein wird
      var lead = p.vx * 26;
      var tvx = Math.max(-3.6, Math.min(3.6, (dx + lead) / 38));
      g.addProjectile('zettel', this.cx() - 5, this.y + 4, tvx, -4.6);
      global.Sound.play('shoot');
      if (Math.random() < 0.5) {
        var pl = global.Levels.polizeiLines || ['HALT! POLIZEI!'];
        g.floats.add(this.cx(), this.y - 10, pl[(Math.random() * pl.length) | 0], '#8ab4ff', 60);
      }
    }
    this.grounded = (moveY(this, g.world, this.vy) === 1);
  };

  /** KI-Agent: verfolgt hartnaeckig, aber traege. Stampfbar. */
  Enemy.prototype.upAgent = function (g, p) {
    var tx = p.cx() - this.w / 2;
    var ty = p.y + p.h / 2 - this.h / 2 - 14;
    var sp = 0.055;
    this.x += Math.max(-1.5, Math.min(1.5, (tx - this.x) * sp));
    this.y += Math.max(-1.2, Math.min(1.2, (ty - this.y) * sp));
    this.y += Math.sin(this.t0 * 0.09) * 0.4;
    this.facing = (p.cx() > this.cx()) ? 1 : -1;
    if (this.t0 > 540) this.dead = true;   // loesen sich irgendwann auf
  };

  /** Von oben plattgemacht. */
  Enemy.prototype.stomped = function (g, p) {
    this.hp--;
    this.flash = 8;
    global.Sound.play('stomp');
    p.vy = global.Input.down('jump') ? -9.4 : -6.6;
    p.jumpsLeft = 1;
    g.shake(3, 6);
    g.particles.burst(this.cx(), this.y + 4, 8,
      { col: '#fff0c0', spread: 2.2, up: 0.8, life: 20 });
    if (this.hp <= 0) this.die(g, p);
    else {
      this.stun = 70;
      g.floats.add(this.cx(), this.y - 8, 'AUTSCH, BRO!', '#ffd257', 45);
    }
  };

  /** Vom Bauch-Stampfer oder Gold-Döner erwischt. */
  Enemy.prototype.squash = function (g, p) {
    if (this.dead) return;
    this.hp = 0;
    this.die(g, p);
    g.shake(2, 5);
  };

  Enemy.prototype.die = function (g, p) {
    this.dead = true;
    this.vy = -3.4;
    this.vx = (this.cx() < p.cx() ? -1.4 : 1.4);
    if (this.t === 'polizei') {
      // Niemand wird ueberfahren: er hechtet in hohem Bogen zur Seite.
      this.vy = -7.5;
      this.vx *= 2.2;
      g.floats.add(this.cx(), this.y - 18, 'HEY! FÜHRERSCHEIN!', '#8ab4ff', 70);
    }
    p.score += this.def.score;
    p.laughTimer = 34;
    if (Math.random() < 0.35) global.Sound.play('laugh');
    g.floats.add(this.cx(), this.y - 6, '+' + this.def.score, '#fff3c8', 45);
    g.particles.burst(this.cx(), this.y + this.h / 2, 10,
      { col: '#ffe38a', spread: 2.6, up: 0.9, life: 26 });

    // Combo: mehrere Gegner ohne Bodenkontakt geben Bonus.
    g.combo++;
    g.comboTimer = 120;
    if (g.combo >= 2) {
      var bonus = this.def.score * (g.combo - 1);
      p.score += bonus;
      g.floats.add(this.cx(), this.y - 20, 'COMBO x' + g.combo + '  +' + bonus,
                   '#ff9ec4', 60);
    }
  };

  /* ================= Items ================= */

  var ITEM = {
    honig: { w: 12, h: 14, spr: 'honig' },
    doener: { w: 14, h: 11, spr: 'doener' },
    baklava: { w: 13, h: 9, spr: 'baklava' },
    herz: { w: 11, h: 10, spr: 'herz' },
    gold: { w: 16, h: 13, spr: 'golddoener' },
    kippen: { w: 12, h: 14, spr: 'kippen' },
    kubide: { w: 16, h: 12, spr: 'kubide' }
  };

  function Item(type, x, y, popped) {
    var d = ITEM[type] || ITEM.honig;
    this.t = type;
    this.w = d.w; this.h = d.h;
    this.spr = d.spr;
    this.x = x - d.w / 2; this.y = y - d.h / 2;
    this.oy = this.y;
    this.t0 = (Math.random() * 100) | 0;
    this.dead = false;
    this.vy = popped ? -3.6 : 0;
    this.popped = !!popped;
    this.settle = popped ? 0 : 1;
  }

  Item.prototype.update = function (g) {
    this.t0++;
    if (this.settle === 0) {
      this.vy += GRAV * 0.55;
      this.y += this.vy;
      var ty = Math.floor((this.y + this.h) / T);
      var tx = Math.floor((this.x + this.w / 2) / T);
      if (this.vy > 0 && g.world.solid(tx, ty)) {
        this.y = ty * T - this.h;
        this.oy = this.y;
        this.settle = 1;
      }
      if (this.t0 > 160) { this.oy = this.y; this.settle = 1; }
    } else {
      this.y = this.oy + Math.sin(this.t0 * 0.075) * 2;
    }

    if (!g.player.dead && overlap(this, g.player)) this.collect(g);
  };

  Item.prototype.collect = function (g) {
    var p = g.player;
    this.dead = true;
    switch (this.t) {
      case 'honig':
        p.honey++; p.score += 50;
        global.Sound.play('honey', p.honey % 13);
        g.particles.burst(this.x + this.w / 2, this.y + this.h / 2, 6,
          { col: '#ffc23c', spread: 1.8, up: 0.8, life: 20 });
        if (p.honey % 100 === 0) {
          p.lives++;
          global.Sound.play('oneUp');
          g.floats.add(p.cx(), p.y - 14, '100 HONIG = EXTRALEBEN!', '#ffd257', 100);
        }
        break;
      case 'doener':
        p.heal(g, 1); p.score += 150; p.eatTimer = 50; p.eatCount++;
        g.floats.add(p.cx(), p.y - 8, global.Levels.eatLine(p.eatCount), '#ffd257', 70);
        if (Math.random() < 0.4) p.doGrowl(g);
        break;
      case 'kubide':
        // Yusufs Lieblingsküche. Da wird nicht diskutiert.
        p.heal(g, 1); p.score += 220; p.eatTimer = 60; p.eatCount++;
        global.Sound.play('heal');
        g.floats.add(p.cx(), p.y - 8, global.Levels.kubideLine(p.eatCount), '#ffd257', 80);
        if (Math.random() < 0.6) p.doGrowl(g);
        break;
      case 'kippen':
        p.smoke = true; p.score += 250; p.laughTimer = 30;
        global.Sound.play('smokePower');
        g.shake(2, 6);
        g.floats.add(p.cx(), p.y - 12, 'KIPPEN! WERFEN MIT SHIFT / E', '#ffb46a', 130);
        g.particles.burst(p.cx(), p.y + 10, 18,
          { col: '#9a9088', spread: 2.4, up: 0.8, life: 44, grav: -0.02 });
        p.doGrowl(g, 'KRRRR... DANKE.');
        break;
      case 'herz':
        p.heal(g, 1); p.score += 100;
        g.floats.add(p.cx(), p.y - 8, '+1 HERZ', '#ff8aa0', 55);
        break;
      case 'baklava':
        p.lives++; p.score += 500; p.eatTimer = 60; p.eatCount++;
        global.Sound.play('oneUp');
        g.floats.add(p.cx(), p.y - 10, 'EXTRALEBEN! BAKLAVA!', '#ffd257', 95);
        break;
      case 'gold':
        p.power = 560; p.eatTimer = 60; p.laughTimer = 60; p.score += 300;
        global.Sound.play('power');
        g.shake(3, 8);
        g.floats.add(p.cx(), p.y - 12, 'GOLD-DÖNER! UNAUFHALTSAM!', '#ffe38a', 110);
        g.particles.burst(p.cx(), p.y + 8, 26,
          { col: '#ffd257', spread: 3.4, up: 1.2, life: 34 });
        break;
    }
  };

  /* ================= Projektile ================= */

  function Projectile(type, x, y, vx, vy, friendly) {
    this.t = type;
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.t0 = 0;
    this.dead = false;
    this.friendly = !!friendly;
    this.bounces = 3;
    if (type === 'sellerie') { this.w = 6; this.h = 12; this.spr = 'sellerie'; this.grav = 0.1; }
    else if (type === 'blatt') { this.w = 10; this.h = 8; this.spr = 'blatt'; this.grav = 0.14; }
    else if (type === 'kippe') { this.w = 10; this.h = 5; this.spr = 'kippe'; this.grav = 0.26; }
    else if (type === 'rauch') {
      // Shisha-Wolke: langsam, gross, bleibt lange stehen.
      this.w = 26; this.h = 20; this.spr = null; this.grav = -0.004;
      this.life = 140; this.ghost = true;
    }
    else if (type === 'safran') {
      // Safranwolke: goldener Staub, treibt langsam durch die Kueche.
      this.w = 24; this.h = 18; this.spr = null; this.grav = -0.008;
      this.life = 85; this.ghost = true; this.gold = true;
    }
    else if (type === 'reis') { this.w = 6; this.h = 5; this.spr = 'reis'; this.grav = 0.16; }
    else if (type === 'bombe') { this.w = 8; this.h = 12; this.spr = 'bombe'; this.grav = 0.22; }
    else if (type === 'frage') { this.w = 10; this.h = 12; this.spr = 'frage'; this.grav = 0.12; }
    else if (type === 'hantel') { this.w = 22; this.h = 10; this.spr = 'hantel'; this.grav = 0.2; }
    else if (type === 'spiess') { this.w = 16; this.h = 12; this.spr = 'kubide'; this.grav = 0.04; }
    else if (type === 'jet') {
      this.w = 32; this.h = 9; this.spr = 'jet'; this.grav = 0;
      this.ghost = true; this.harmless = true; this.dropAt = 20; this.bombs = 3;
    }
    else if (type === 'zettel') { this.w = 10; this.h = 7; this.spr = 'zettel'; this.grav = 0.2; }
    else if (type === 'wodka') { this.w = 7; this.h = 13; this.spr = 'wodka'; this.grav = 0.24; }
    else if (type === 'bier') { this.w = 7; this.h = 8; this.spr = 'bier'; this.grav = 0.16; }
    else if (type === 'kotze') { this.w = 10; this.h = 5; this.spr = 'kotze'; this.grav = 0.3; }
    else if (type === 'pfuetze') {
      // Was liegen bleibt: Kotze oder zerdepperter Wodka. Nicht reintreten.
      this.w = 20; this.h = 5; this.spr = null; this.grav = 0;
      this.life = 200; this.col = '#7fc24a';
    }
    else if (type === 'welle') {
      // Bodenwelle nach einem Einschlag: flach, schnell, drueberspringen.
      this.w = 14; this.h = 10; this.spr = null; this.grav = 0;
      this.life = 110; this.col = '#e8b894';
    }
    else { this.w = 10; this.h = 14; this.spr = 'shaker'; this.grav = 0; }
  }

  /** Welt aus Sicht eines Geschosses. Boss-Angriffe fliegen durch die
      schwebenden Arena-Plattformen — sonst stellt man sich einfach
      darunter und der Kampf laeuft von allein. */
  Projectile.prototype.solidAt = function (g, tx, ty) {
    if (this.bossShot && g.boss && ty < g.boss.floorRow) return false;
    return g.world.solid(tx, ty);
  };

  Projectile.prototype.pop = function (g, col) {
    if (this.dead) return;
    this.dead = true;
    g.particles.burst(this.x + this.w / 2, this.y + this.h / 2, 7,
      { col: col || '#8cd85a', spread: 2, up: 0.5, life: 20 });
  };

  Projectile.prototype.update = function (g) {
    this.t0++;
    this.vy += this.grav;
    this.x += this.vx; this.y += this.vy;

    var cxT = Math.floor((this.x + this.w / 2) / T);
    var cyT = Math.floor((this.y + this.h / 2) / T);

    if (this.t === 'jet') {
      // Fliegt durch, wirft im Vorbeiflug Bomben ab.
      if (this.t0 > this.dropAt && this.t0 % 26 === 0 && this.bombs > 0) {
        this.bombs--;
        g.addProjectile('bombe', this.x + 14, this.y + 8, this.vx * 0.3, 0.6);
      }
      var vw = g.viewW ? g.viewW() : W_VIEW;
      if (this.x < g.cam.x - 200 || this.x > g.cam.x + vw + 200) this.dead = true;
      return;
    }

    if (this.t === 'welle') {
      if (--this.life <= 0) { this.pop(g, this.col); return; }
      if (this.t0 % 3 === 0) {
        g.particles.spawn({ x: this.x + 7, y: this.y + this.h, vx: -this.vx * 0.1,
                            vy: -1 - Math.random(), life: 14, col: this.col,
                            size: 2, grav: 0.1 });
      }
      var ahead2 = Math.floor((this.x + (this.vx > 0 ? this.w : 0)) / T);
      if (this.solidAt(g, ahead2, cyT)) { this.pop(g, this.col); return; }
      if (!g.player.dead && overlap(this, g.player)) {
        this.pop(g, this.col);
        if (g.player.power <= 0 && g.player.pound !== -1) {
          g.player.hurt(g, 1, this.x + this.w / 2);
        }
      }
      return;
    }

    // Pfuetze: klebt am Boden. Sie tut nicht weh — man rutscht darauf
    // aus. Schaden waere hier unfair, weil Alex sie sich direkt vor die
    // Fuesse wirft, also genau dahin, wo man angreifen muss.
    if (this.t === 'pfuetze') {
      if (--this.life <= 0) { this.dead = true; return; }
      var pl = g.player;
      if (!pl.dead && overlap(this, pl) && pl.slip <= 0 && pl.grounded) {
        pl.slip = 50;
        global.Sound.play('move');
        g.floats.add(pl.cx(), pl.y - 14, 'AUSGERUTSCHT!', '#bfe6ff', 50);
      }
      return;
    }

    // Flasche und Kotze hinterlassen eine Pfuetze, wenn sie aufschlagen.
    if (this.t === 'wodka' || this.t === 'kotze') {
      var lty = Math.floor((this.y + this.h) / T);
      if (this.vy > 0 && this.solidAt(g, cxT, lty)) {
        this.dead = true;
        var glas = (this.t === 'wodka');
        // Hoechstens drei Pfuetzen gleichzeitig — sonst ist der ganze
        // Boden belegt und der Kampf nicht mehr fair.
        var pfn = 0, aeltest = null;
        for (var pi = 0; pi < g.projectiles.length; pi++) {
          var q = g.projectiles[pi];
          if (q && q.t === 'pfuetze' && !q.dead) {
            pfn++;
            if (!aeltest || q.life < aeltest.life) aeltest = q;
          }
        }
        if (pfn >= 3 && aeltest) aeltest.dead = true;

        var pf = g.addProjectile('pfuetze', this.x - 6, lty * T - 5, 0, 0);
        if (pf) {
          pf.col = glas ? '#bfe6ff' : '#7fc24a';
          pf.life = glas ? 90 : 130;
          pf.bossShot = this.bossShot;
        }
        global.Sound.play(glas ? 'brk' : 'hurt');
        g.particles.burst(this.x + this.w / 2, lty * T - 4, glas ? 12 : 8,
          { col: glas ? '#cfe8ff' : '#8fd85a', spread: 2.6, up: 0.9, life: 26 });
        return;
      }
    }

    if (this.t === 'rauch' || this.t === 'safran') {
      this.x += Math.sin(this.t0 * 0.03) * 0.25;
      if (--this.life <= 0) this.pop(g, this.gold ? '#ffcf4a' : '#b8b0c8');
      if (!g.player.dead && overlap(this, g.player) &&
          g.player.power <= 0 && g.player.pound !== -1) {
        g.player.hurt(g, 1, this.x + this.w / 2);
      }
      return;
    }

    if (this.t === 'bombe') {
      var bty = Math.floor((this.y + this.h) / T);
      if (this.vy > 0 && this.solidAt(g, cxT, bty)) {
        this.dead = true;
        g.shake(4, 10);
        global.Sound.play('pound');
        g.particles.burst(this.x + 4, bty * T, 20,
          { col: '#ffb43c', spread: 3.4, up: 1.2, life: 26 });
        // Druckwelle am Boden
        var px2 = this.x + 4;
        if (!g.player.dead && Math.abs(g.player.cx() - px2) < 40 &&
            Math.abs(g.player.feet() - bty * T) < 30) {
          g.player.hurt(g, 1, px2);
        }
        return;
      }
    }

    if (this.t === 'kippe') {
      // Kippen hüpfen über den Boden statt geradeaus zu fliegen.
      var below = Math.floor((this.y + this.h) / T);
      if (this.vy > 0 && this.solidAt(g, cxT, below)) {
        this.y = below * T - this.h;
        this.vy = -3.5;
        g.particles.spawn({ x: this.x + 5, y: this.y + 4, vx: 0, vy: -0.5,
                            life: 22, col: '#ffb43c', size: 2, grav: 0 });
        if (--this.bounces <= 0) this.pop(g, '#ffb43c');
      }
      var ahead = Math.floor((this.x + (this.vx > 0 ? this.w : 0)) / T);
      if (this.solidAt(g, ahead, cyT)) this.pop(g, '#ffb43c');
    } else if (this.solidAt(g, cxT, cyT)) {
      this.pop(g);
    }

    if (this.t0 > 420 || this.y > g.world.h * T + 60) this.dead = true;
    if (this.dead) return;

    if (this.friendly) {
      for (var i = 0; i < g.enemies.length; i++) {
        var e = g.enemies[i];
        if (e.dead || !overlap(this, e)) continue;
        e.squash(g, g.player);
        this.pop(g, '#ffb43c');
        return;
      }
      if (g.boss && !g.boss.dead && overlap(this, g.boss)) {
        g.boss.hit(g, 1, null);
        this.pop(g, '#ffb43c');
      }
    } else if (!g.player.dead && overlap(this, g.player)) {
      this.dead = true;
      if (g.player.power > 0 || g.player.pound === -1) {
        g.particles.burst(this.x, this.y, 8, { col: '#ffd257', spread: 2, life: 18 });
      } else {
        if (this.t === 'zettel' && g.player.invuln <= 0) {
          g.floats.add(g.player.cx(), g.player.y - 22, 'STRAFZETTEL! 35 EURO!', '#f4f4ee', 70);
        }
        g.player.hurt(g, 1, this.x + this.w / 2);
      }
    }
  };

  /* ================= BOSSE — gemeinsame Regeln =================
     Alle fuenf Bosse teilen sich diese Bausteine:
       - Draufspringen trifft. Beruehrung tut nur waehrend eines
         angekuendigten Angriffs weh (Sturmlauf, Einschlag, Wirbel).
       - Ab halber Energie verwandeln sie sich: kurze Show, dann
         schneller, wilder und mit neuen Angriffen.
       - Sie laufen durch schwebende Arena-Plattformen hindurch.
     ============================================================== */

  /** Welt aus Sicht eines Bosses: nur der Boden zaehlt.
      Vorher liefen grosse Bosse gegen die Kanten niedriger Plattformen
      und blieben dort einfach stehen. */
  function bossWorld(g, floorRow) {
    return {
      solid: function (tx, ty) { return ty >= floorRow && g.world.solid(tx, ty); }
    };
  }

  function bossMove(b, g) {
    if (!b.bw) b.bw = bossWorld(g, b.floorRow);
    b.vy += GRAV;
    if (b.vy > MAX_FALL) b.vy = MAX_FALL;
    moveX(b, b.bw, b.vx);
    b.grounded = (moveY(b, b.bw, b.vy) === 1);
    if (g.arena) {
      var lo = g.arena.x + 6, hi = g.arena.x + g.arena.w - 6;
      if (b.x < lo) { b.x = lo; b.facing = 1; }
      if (b.x + b.w > hi) { b.x = hi - b.w; b.facing = -1; }
    }
  }

  function bossContact(b, g) {
    var p = g.player;
    if (p.dead || b.invuln > 0 || b.state === 'transform' || !overlap(b, p)) return;
    var stomp = p.vy > 0.5 && (p.feet() - b.y) < b.stompY;
    // Die Arschbombe macht nur halben Schaden. Vorher konnte man jeden
    // Boss einfach mit Bauch-Stampfern zuspammen und ueberrennen.
    if (p.power > 0) b.hit(g, 1, p);
    else if (p.pound === -1) b.hit(g, POUND_BOSS_DMG, p);
    else if (stomp) b.hit(g, 1, p);
    else if (!b.open) p.hurt(g, 1, b.cx());
  }

  function bossDeath(b, g, col) {
    b.deadTimer++;
    b.vy += GRAV * 0.5;
    b.y += b.vy;
    if (b.deadTimer % 8 === 0) {
      g.particles.burst(b.cx() + (Math.random() - 0.5) * b.w,
                        b.y + Math.random() * b.h, 6,
        { col: col, spread: 2.4, up: 0.6, life: 28 });
    }
  }

  /** Geschosse entschaerfen, OHNE die Liste zu veraendern. Treffer koennen
      mitten im Geschoss-Durchlauf passieren — die Liste dort zu leeren,
      hat frueher das Spiel abstuerzen lassen. */
  function clearShots(g) {
    for (var i = 0; i < g.projectiles.length; i++) {
      if (g.projectiles[i]) g.projectiles[i].dead = true;
    }
  }

  function bossBounce(b, g, p, col, dmg) {
    b.invuln = b.rage ? 40 : 48;
    b.flash = 16;
    b.state = 'idle';
    b.timer = b.rage ? 14 : 24;
    b.landed = true;
    b.vx = (p && p.cx() > b.cx()) ? -2.6 : 2.6;
    if (p) { p.vy = -8.2; p.jumpsLeft = 1; p.laughTimer = 40; }
    global.Sound.play('bossHit');
    // Sichtbar machen, warum der Balken kaum kleiner wird
    if (dmg && dmg < 1) g.floats.add(b.cx(), b.y - 20, 'NUR HALB!', '#c8c0d8', 50);
    g.shake(6, 14);
    g.particles.burst(b.cx(), b.y + b.h / 2, 16, { col: col, spread: 3, up: 1, life: 30 });
  }

  /** Verwandlung starten. Der Dialog kommt erst, wenn sie vorbei ist. */
  function startTransform(b, g) {
    // Halbzeit ist erreicht, sobald die Verwandlung beginnt — auch wer
    // genau jetzt stirbt, macht danach ab der Haelfte weiter.
    g.bossHalf = true;
    b.state = 'transform';
    b.timer = 96;
    b.invuln = 140;
    b.vx = 0;
    clearShots(g);
    g.shake(4, 20);
    global.Sound.play('bossRoar');
  }

  /** Laeuft jeden Frame waehrend der Verwandlung. Gibt true zurueck, wenn fertig. */
  function tickTransform(b, g, label, col) {
    b.vx = 0;
    if (b.timer % 4 === 0) {
      g.particles.spawn({
        x: b.cx() + (Math.random() - 0.5) * b.w * 1.8, y: b.y + b.h,
        vx: (Math.random() - 0.5) * 0.6, vy: -1.4 - Math.random() * 1.8,
        life: 42, col: col, size: 3, grav: -0.02
      });
    }
    if (b.timer === 60) {
      b.onTransform(g);          // hier waechst er / nimmt Snus / tuned den Wagen
      g.shake(10, 34);
      global.Sound.play('power');
      if (g.flashScreen) g.flashScreen(col, 26);
      g.floats.add(b.cx(), b.y - 20, label, col, 130);
      g.particles.burst(b.cx(), b.y + b.h / 2, 48, { col: col, spread: 4.6, up: 1.4, life: 54 });
    }
    return b.timer <= 0;
  }

  /** Einschlag: Staub, Kamerawackeln und Bodenwellen nach beiden Seiten. */
  function groundWaves(b, g, col, speed, rows, life) {
    g.shake(8, 20);
    global.Sound.play('pound');
    for (var i = 0; i < 18; i++) {
      g.particles.spawn({
        x: b.cx(), y: b.y + b.h,
        vx: (i / 17 - 0.5) * 9, vy: -Math.random() * 2.2,
        life: 26, col: col, size: 2, grav: 0.3
      });
    }
    for (var k = 0; k < (rows || 1); k++) {
      var sp = (speed || 3.2) * (1 - k * 0.3);
      var wl = g.addProjectile('welle', b.cx() - 7, b.y + b.h - 10, -sp, 0);
      var wr = g.addProjectile('welle', b.cx() - 7, b.y + b.h - 10, sp, 0);
      if (wl) { wl.col = col; if (life) wl.life = life; }
      if (wr) { wr.col = col; if (life) wr.life = life; }
    }
  }

  /** Geschosse fallen von oben ueber die ganze Bildbreite. */
  function rainFromSky(g, type, vy) {
    var vw = g.viewW ? g.viewW() : 512;
    var rx = g.cam.x + 24 + Math.random() * (vw - 48);
    g.addProjectile(type, rx, g.cameraTopY(), (Math.random() - 0.5) * 0.4, vy || 1.4);
  }

  function rageSparks(b, g) {
    if (!b.rage || b.t0 % 4 !== 0) return;
    g.particles.spawn({
      x: b.cx() + (Math.random() - 0.5) * b.w,
      y: b.y + b.h * (0.3 + Math.random() * 0.6),
      vx: -b.vx * 0.2, vy: -0.8 - Math.random(), life: 26,
      col: b.rageCol, size: 2, grav: -0.02
    });
  }

  /* ================= HUSEYIN ================= */

  function Boss(tx, ty) {
    this.w = 20; this.h = 58;             // 2x skaliert gezeichnet
    this.x = tx * T; this.y = ty * T - this.h;
    this.floorRow = ty;
    this.vx = 0; this.vy = 0;
    this.facing = -1;
    this.hp = 13; this.maxHp = 13;
    this.phase = 1;
    this.rage = false;
    this.t0 = 0; this.anim = 0; this.animT = 0;
    this.state = 'idle'; this.timer = 50;
    this.invuln = 0; this.flash = 0;
    this.dead = false; this.deadTimer = 0;
    this.grounded = false;
    this.pushups = 0;
    this.intro = true;
    this.stompY = 32;
    this.open = true;
    this.landed = true;
    this.rageName = 'SALAT-BERSERKER';
    this.rageCol = '#9dff6a';
  }

  Boss.prototype.cx = function () { return this.x + this.w / 2; };
  Boss.prototype.go = function (s, t) { this.state = s; this.timer = t; };
  Boss.prototype.onTransform = function () { this.rage = true; };

  Boss.prototype.update = function (g) {
    this.t0++;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
    if (this.dead) { bossDeath(this, g, '#9dff6a'); return; }
    if (this.intro) { bossMove(this, g); return; }

    var p = g.player;
    var dx = p.cx() - this.cx();
    var spd = !this.rage ? 1 : (this.phase >= 3 ? 1.6 : 1.35);
    var i;
    this.timer--;
    rageSparks(this, g);

    switch (this.state) {
      case 'transform':
        if (tickTransform(this, g, 'SALAT-BERSERKER!', this.rageCol)) {
          this.go('idle', 12);
          this.phase = 2;
          g.onBossPhase(2);
        }
        break;

      case 'idle':
        this.vx *= 0.8;
        this.facing = dx > 0 ? 1 : -1;
        if (this.timer <= 0) this.pickAttack(g, dx);
        break;

      case 'walk':
        this.vx = this.facing * 1.3 * spd;
        if (this.timer <= 0) this.go('idle', this.rage ? 10 : 18);
        break;

      case 'throw':
        this.vx *= 0.8;
        if (this.timer === 12) {
          var n = this.phase >= 3 ? 5 : (this.rage ? 4 : 2);
          for (i = 0; i < n; i++) {
            g.addProjectile('blatt', this.cx(), this.y + 20,
              this.facing * (2.2 + i * 0.4) * (this.rage ? 1.15 : 1), -2.6 - i * 0.5);
          }
          global.Sound.play('shoot');
        }
        if (this.timer <= 0) this.go('idle', this.rage ? 18 : 32);
        break;

      case 'shake':   // Protein-Shaker, waagerecht
        this.vx *= 0.8;
        if (this.timer === 14 || (this.phase >= 3 && this.timer === 4)) {
          g.addProjectile('shaker', this.cx(), this.y + 24, this.facing * 3.4 * spd, 0);
          global.Sound.play('shoot');
        }
        if (this.timer <= 0) this.go('idle', this.rage ? 18 : 30);
        break;

      case 'jump':
        if (this.grounded && this.timer < 44) this.go('idle', this.rage ? 14 : 28);
        break;

      // Sein Markenzeichen: kurze schnelle Hopser. Er bleibt nie stehen.
      case 'hop':
        this.facing = dx > 0 ? 1 : -1;
        if (this.grounded) {
          this.vy = -6.4 - this.phase * 0.5;
          this.vx = this.facing * (1.8 + this.phase * 0.5) * (this.rage ? 1.2 : 1);
          global.Sound.play('jump');
          if (this.rage && Math.random() < 0.6) {
            g.addProjectile('blatt', this.cx(), this.y + 20, this.facing * 2.2, -1.8);
          }
        }
        if (this.timer <= 0) this.go('idle', this.rage ? 14 : 24);
        break;

      case 'dashprep':
        this.vx *= 0.7;
        if (this.timer <= 0) {
          this.go('dash', 32);
          global.Sound.play('bossRoar');
          g.shake(3, 8);
        }
        break;

      case 'dash':
        this.vx = this.facing * 4.0 * spd;
        if (this.timer <= 0) this.go('idle', this.rage ? 20 : 36);
        break;

      // Neu nach der Verwandlung: er wirbelt durch die Arena und
      // verteilt Salatblaetter in alle Richtungen.
      case 'tornado':
        this.facing = ((this.t0 >> 2) & 1) ? 1 : -1;
        this.vx = (dx > 0 ? 1 : -1) * 2.4 * spd;
        if (this.timer % 9 === 0) {
          var ang = this.t0 * 0.9;
          g.addProjectile('blatt', this.cx() - 5, this.y + 16,
                          Math.cos(ang) * 2.8, -2.0 - Math.abs(Math.sin(ang)) * 1.8);
        }
        if (this.timer <= 0) this.go('idle', 24);
        break;

      // Der Gag: mitten im Kampf Liegestuetze.
      case 'pushups':
        this.vx = 0;
        this.pushups++;
        if (this.pushups % 16 === 0) {
          global.Sound.play('select');
          g.floats.add(this.cx(), this.y - 8, '' + Math.floor(this.pushups / 16), '#9dff6a', 30);
        }
        if (this.timer <= 0) {
          this.go('idle', 12);
          g.floats.add(this.cx(), this.y - 14, 'JETZT BIN ICH WARM!', '#9dff6a', 60);
        }
        break;

      case 'rain':
        this.vx *= 0.8;
        if (this.timer % (this.phase >= 3 ? 11 : 15) === 0) rainFromSky(g, 'blatt', 1.4);
        if (this.timer <= 0) this.go('idle', 24);
        break;
    }

    bossMove(this, g);

    this.animT++;
    if (this.animT > (this.state === 'dash' || this.state === 'tornado' ? 3 : 7)) {
      this.animT = 0; this.anim++;
    }

    this.open = !(this.state === 'dash' || this.state === 'tornado');
    bossContact(this, g);
  };

  Boss.prototype.pickAttack = function (g, dx) {
    var r = Math.random();
    this.facing = dx > 0 ? 1 : -1;
    this.landed = true;

    if (!this.rage) {
      if (r < 0.28) this.go('throw', 38);
      else if (r < 0.44) this.go('walk', 42);
      else if (r < 0.70) this.go('hop', 66);
      else if (r < 0.86) { this.go('jump', 60); this.vy = -9.2; this.vx = this.facing * 2.2; }
      else this.go('dashprep', 28);
    } else if (this.phase === 2) {
      if (r < 0.18) this.go('throw', 30);
      else if (r < 0.32) this.go('shake', 28);
      else if (r < 0.52) this.go('tornado', 78);
      else if (r < 0.66) this.go('dashprep', 20);
      else if (r < 0.84) this.go('hop', 64);
      else this.go('rain', 64);
    } else {
      if (r < 0.24) this.go('tornado', 90);
      else if (r < 0.42) this.go('rain', 70);
      else if (r < 0.58) this.go('dashprep', 16);
      else if (r < 0.72) this.go('shake', 26);
      else if (r < 0.90) this.go('hop', 72);
      else { this.go('pushups', 56); this.pushups = 0; }
    }
    if (Math.abs(dx) > 150 && this.state === 'throw') this.go('walk', 44);
  };

  /** Einheitliche Signatur fuer ALLE Bosse: (spiel, schaden, spieler). */
  Boss.prototype.hit = function (g, dmg, p) {
    if (this.invuln > 0 || this.dead || this.state === 'transform') return;
    this.hp -= dmg;
    bossBounce(this, g, p, '#9dff6a', dmg);
    if (Math.random() < 0.5) global.Sound.play('laugh');
    g.floats.add(this.cx(), this.y - 6, 'TREFFER!', '#9dff6a', 45);

    if (this.hp <= 0) {
      this.dead = true; this.deadTimer = 0; this.vy = -7;
      g.shake(10, 40);
      global.Sound.play('bossRoar');
      g.onBossDead();
      return;
    }
    if (!this.rage && this.hp <= Math.floor(this.maxHp / 2)) {
      startTransform(this, g);
      return;
    }
    if (this.rage && this.phase < 3 && this.hp <= Math.ceil(this.maxHp / 4)) {
      this.phase = 3;
      g.onBossPhase(3);
    }
  };

  /* ================= LEVEL-BOSSE: Mirkan, Lennart, Erfan ================= */

  var MINIBOSS = {
    mirkan: {
      w: 60, h: 28, hp: 10, name: 'MIRKAN', col: '#dfe4f0',
      spr: ['mercedes', 'mercedes'], scale: 2, stompY: 22, score: 1500,
      rageName: 'TUNING-MODUS', rageCol: '#ff5a3c'
    },
    lennart: {
      w: 30, h: 44, hp: 11, name: 'LENNART', col: '#e8b894',
      spr: ['lennart', 'lennart2'], scale: 2, stompY: 22, score: 1800,
      rageName: 'MASSEPHASE', rageCol: '#ff6a4a'
    },
    erfan: {
      w: 26, h: 56, hp: 12, name: 'ERFAN', col: '#e8c24a',
      spr: ['erfan', 'erfan'], scale: 2, stompY: 26, score: 2200,
      rageName: 'SAFRAN-EKSTASE', rageCol: '#ff8a1a'
    }
  };

  function MiniBoss(type, tx, ty) {
    var d = MINIBOSS[type];
    this.t = type;
    this.def = d;
    this.w = d.w; this.h = d.h;
    this.x = tx * T - (d.w - T) / 2; this.y = ty * T - this.h;
    this.floorRow = ty;
    this.vx = 0; this.vy = 0;
    this.facing = -1;
    this.hp = d.hp; this.maxHp = d.hp;
    this.phase = 1;
    this.rage = false;
    this.t0 = 0; this.anim = 0; this.animT = 0;
    this.state = 'idle'; this.timer = 60;
    this.invuln = 0; this.flash = 0;
    this.dead = false; this.deadTimer = 0;
    this.grounded = false;
    this.open = true;
    this.pumped = false;
    this.spin = 0;
    this.scale = d.scale;
    this.stompY = d.stompY;
    this.rageName = d.rageName;
    this.rageCol = d.rageCol;
    this.landed = true;
  }

  MiniBoss.prototype.cx = function () { return this.x + this.w / 2; };
  MiniBoss.prototype.go = function (s, t) { this.state = s; this.timer = t; };

  /** Was bei der Verwandlung passiert. */
  MiniBoss.prototype.onTransform = function () {
    this.rage = true;
    if (this.t === 'lennart' && this.scale < 3) {
      // Lennart wird sichtbar groesser
      var footY = this.y + this.h, mid = this.cx();
      this.scale = 3;
      this.w = 44; this.h = 66; this.stompY = 32;
      this.y = footY - this.h;
      this.x = mid - this.w / 2;
      this.pumped = true;
    }
  };

  /** Mirkans Hupe: schiebt Yusuf weg, tut aber nicht weh. */
  MiniBoss.prototype.honk = function (g, p, dx) {
    global.Sound.play('bossRoar');
    g.shake(5, 14);
    g.floats.add(this.cx(), this.y - 18, 'TUUUUT!', '#ffd257', 50);
    for (var h = 0; h < 18; h++) {
      g.particles.spawn({
        x: this.cx(), y: this.y + 6,
        vx: (h / 17 - 0.5) * 7, vy: -Math.random() * 1.4,
        life: 26, col: '#dfe4f0', size: 2, grav: 0.1
      });
    }
    if (Math.abs(dx) < 130) {
      p.vx += (dx > 0 ? 1 : -1) * 4.8;
      p.vy = Math.min(p.vy, -3.2);
    }
  };

  MiniBoss.prototype.update = function (g) {
    this.t0++;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
    if (this.dead) { bossDeath(this, g, this.def.col); return; }

    var p = g.player;
    var dx = p.cx() - this.cx();
    var spd = this.rage ? (this.t === 'mirkan' ? 1.22 : 1.35) : 1;
    var i, s;
    this.timer--;
    rageSparks(this, g);

    switch (this.state) {
      case 'transform':
        if (tickTransform(this, g, this.rageName + '!', this.rageCol)) {
          this.go('idle', 12);
          this.phase = 2;
          g.onMiniPhase(this.t);
        }
        break;

      case 'idle':
        this.vx *= 0.82;
        this.facing = dx > 0 ? 1 : -1;
        if (this.timer <= 0) this.pick(g, dx);
        break;

      case 'walk':
        this.vx = this.facing * (this.t === 'mirkan' ? 2.4 : 1.5) * spd;
        if (this.timer <= 0) this.go('idle', this.rage ? 10 : 20);
        break;

      case 'chargeprep':
        this.vx *= 0.7;
        if (this.timer <= 0) {
          this.go('charge', this.t === 'mirkan' ? 44 : 32);
          global.Sound.play('bossRoar');
          g.shake(3, 8);
        }
        break;

      case 'charge':
        this.vx = this.facing * (this.t === 'mirkan' ? 6.0 : 3.8) * spd;
        if (this.t === 'mirkan' && this.timer % 18 === 0) {
          g.addProjectile('frage', this.cx() - 5, this.y + 2, -this.facing * 0.6, -2.2);
        }
        if (this.t0 % 2 === 0) {
          g.particles.spawn({
            x: this.cx() - this.facing * this.w / 2, y: this.y + this.h - 2,
            vx: -this.facing * 1.0, vy: -0.4, life: 18,
            col: this.rage ? this.rageCol : '#c8c0b0', size: 2, grav: -0.01
          });
        }
        if (this.timer <= 0) this.go('idle', this.rage ? 18 : 34);
        break;

      case 'jump':
        if (this.grounded && this.timer < 44) this.go('idle', this.rage ? 12 : 24);
        break;

      /* ---------------- MIRKAN ---------------- */

      case 'fragen':
        this.vx *= 0.8;
        if (this.timer === 16 || this.timer === 4) {
          var nq = this.rage ? 3 : 2;   // erster Boss: nicht zu viele Fragen auf einmal
          for (i = 0; i < nq; i++) {
            s = (i - (nq - 1) / 2) * 1.15;
            g.addProjectile('frage', this.cx() - 5, this.y - 4,
                            this.facing * 1.6 + s, -3.4 - Math.abs(s) * 0.2);
          }
          global.Sound.play('shoot');
          if (this.timer === 16) {
            var ql = global.Levels.mirkanLines;
            g.floats.add(this.cx(), this.y - 16,
                         ql[(Math.random() * ql.length) | 0], '#dfe4f0', 60);
          }
        }
        if (this.timer <= 0) this.go('idle', this.rage ? 16 : 30);
        break;

      case 'hupe':
        this.vx *= 0.9;
        if (this.timer === 20) this.honk(g, p, dx);
        if (this.timer <= 0) this.go('idle', this.rage ? 14 : 28);
        break;

      // Er setzt mit dem Wagen ueber und knallt auf den Boden
      case 'carjump':
        // Vorher heult der Motor auf: kurzes Zittern und Qualm als Warnung
        if (this.timer > 34) {
          this.vx *= 0.8;
          if (this.timer % 3 === 0) {
            g.particles.spawn({ x: this.cx() - this.facing * this.w / 2, y: this.y + this.h - 4,
                                vx: -this.facing * 1.4, vy: -0.6, life: 18, col: '#8e8880',
                                size: 3, grav: -0.02 });
          }
        }
        if (this.timer === 34) {
          this.vy = -10.5;
          this.vx = (dx > 0 ? 1 : -1) * 3.4 * spd;
          this.landed = false;
          global.Sound.play('bossRoar');
        }
        if (this.grounded && !this.landed && this.vy >= 0 && this.timer < 30) {
          this.landed = true;
          // Erster Boss: Wellen erst in der zweiten Form, und sie laufen nicht weit
          if (this.rage) groundWaves(this, g, '#dfe4f0', 3.0, 1, 55);
          else { g.shake(8, 20); global.Sound.play('pound'); }
          this.go('idle', this.rage ? 16 : 30);
        }
        // Erst nach der Landung aufhoeren — vorher lief die Zeit in der Luft
        // ab, und die Bodenwelle beim Aufprall kam nie.
        if (this.timer <= 0 && (this.grounded || this.timer < -90)) this.go('idle', 24);
        break;

      // TUNING-MODUS: Zickzack quer durch die Arena
      case 'drift':
        this.vx = this.facing * 5.6;
        if (this.timer > 0 && this.timer % 32 === 0) {
          this.facing = -this.facing;
          g.shake(3, 6);
          global.Sound.play('shoot');
        }
        if (this.t0 % 2 === 0) {
          g.particles.spawn({
            x: this.cx() - this.facing * this.w / 2, y: this.y + this.h - 2,
            vx: -this.facing * 1.2, vy: -0.4, life: 22,
            col: '#ff5a3c', size: 3, grav: -0.02
          });
        }
        if (this.timer <= 0) this.go('idle', 20);
        break;

      // TUNING-MODUS: drei Hupen hintereinander, jede mit Fragen
      case 'hupkonzert':
        this.vx *= 0.85;
        if (this.timer === 60 || this.timer === 40 || this.timer === 20) {
          this.honk(g, p, dx);
          g.addProjectile('frage', this.cx() - 5, this.y - 4, (Math.random() < 0.5 ? -1 : 1) * 1.6, -3.8);
        }
        if (this.timer <= 0) this.go('idle', 16);
        break;

      /* ---------------- LENNART ---------------- */

      case 'hantel':
        this.vx *= 0.8;
        if (this.timer === 18) {
          var hn = this.rage ? 4 : 2;
          for (i = 0; i < hn; i++) {
            g.addProjectile('hantel', this.cx() - 11, this.y + 8,
                            this.facing * (2.2 + i * 0.7) * spd, -3.6 - i * 0.35);
          }
          global.Sound.play('shoot');
          var ll = global.Levels.lennartLines;
          g.floats.add(this.cx(), this.y - 14,
                       ll[(Math.random() * ll.length) | 0], '#ffd257', 60);
        }
        if (this.timer <= 0) this.go('idle', this.rage ? 16 : 30);
        break;

      // Springt hoch und kommt mit vollem Gewicht runter
      case 'slam':
        if (this.timer === 44) {
          this.vy = -10;
          this.vx = (dx > 0 ? 1 : -1) * 1.8 * spd;
          this.landed = false;
        }
        if (this.grounded && !this.landed && this.vy >= 0 && this.timer < 40) {
          this.landed = true;
          groundWaves(this, g, this.rage ? '#ff6a4a' : '#e8b894', 3.2, this.rage ? 2 : 1);
          g.addProjectile('hantel', this.cx() - 11, this.y + this.h - 14, -3.2, -2.4);
          g.addProjectile('hantel', this.cx() - 11, this.y + this.h - 14, 3.2, -2.4);
          this.go('idle', this.rage ? 16 : 32);
        }
        if (this.timer <= 0 && (this.grounded || this.timer < -90)) this.go('idle', 24);
        break;

      // MASSEPHASE: zwei Einschlaege direkt hintereinander
      case 'doubleslam':
        if (this.timer === 86 || this.timer === 46) {
          this.vy = -9.6;
          this.vx = (dx > 0 ? 1 : -1) * 2.4;
          this.landed = false;
        }
        if (this.grounded && !this.landed && this.vy >= 0) {
          this.landed = true;
          groundWaves(this, g, '#ff6a4a', 3.6, 2);
        }
        if (this.timer <= 0 && (this.grounded || this.timer < -90)) this.go('idle', 20);
        break;

      // MASSEPHASE: Hanteln fallen von oben
      case 'hantelregen':
        this.vx *= 0.8;
        if (this.timer === 70) {
          g.floats.add(this.cx(), this.y - 14, 'HANTELN VON OBEN!', '#ff6a4a', 60);
        }
        if (this.timer % 12 === 0) rainFromSky(g, 'hantel', 1.2);
        if (this.timer <= 0) this.go('idle', 18);
        break;

      // MASSEPHASE: Shaker, gerade und schnell
      case 'shakewurf':
        this.vx *= 0.8;
        if (this.timer === 16 || this.timer === 6) {
          g.addProjectile('shaker', this.cx() - 5, this.y + this.h * 0.4, this.facing * 4.4, 0);
          global.Sound.play('shoot');
        }
        if (this.timer <= 0) this.go('idle', 16);
        break;

      case 'pushups':
        this.vx = 0;
        this.spin++;
        if (this.spin % 14 === 0) {
          global.Sound.play('select');
          g.floats.add(this.cx(), this.y - 10, '' + Math.floor(this.spin / 14), '#ffd257', 26);
        }
        if (this.timer <= 0) {
          this.go('idle', 20);
          this.pumped = true;
          g.floats.add(this.cx(), this.y - 16, 'JETZT BIN ICH WARM!', '#ffd257', 70);
        }
        break;

      /* ---------------- ERFAN ---------------- */

      case 'spiesse':
        this.vx *= 0.8;
        if (this.timer === 18) {
          var sn = this.rage ? 4 : 2;
          for (i = 0; i < sn; i++) {
            g.addProjectile('spiess', this.cx() - 8, this.y + 14 + i * 9,
                            this.facing * (3.0 + i * 0.4) * spd, -0.5);
          }
          global.Sound.play('shoot');
          g.floats.add(this.cx(), this.y - 14, 'KUBIDE FLIEGT!', '#e8c24a', 60);
        }
        if (this.timer <= 0) this.go('idle', this.rage ? 16 : 30);
        break;

      case 'safran':
        this.vx *= 0.8;
        if (this.timer === 16) {
          var sc2 = this.rage ? 2 : 1;
          for (i = 0; i < sc2; i++) {
            g.addProjectile('safran', this.cx() - 12 + this.facing * (18 + i * 24),
                            this.y + 12 + i * 5, this.facing * (0.6 + i * 0.2), -0.15);
          }
          global.Sound.play('shoot');
          g.floats.add(this.cx(), this.y - 14, 'SAFRAN! ECHTER SAFRAN!', '#ffcf4a', 70);
        }
        if (this.timer <= 0) this.go('idle', this.rage ? 16 : 30);
        break;

      case 'reis':
        this.vx *= 0.85;
        if (this.timer === 20) {
          var nr = this.rage ? 8 : 5;
          for (i = 0; i < nr; i++) {
            g.addProjectile('reis', this.cx() - 3, this.y + 10,
                            this.facing * (1.3 + i * (this.rage ? 0.42 : 0.6)), -4.0 + i * 0.4);
          }
          global.Sound.play('shoot');
          g.floats.add(this.cx(), this.y - 14, 'UND REIS DAZU!', '#f8f6ee', 60);
        }
        if (this.timer <= 0) this.go('idle', this.rage ? 16 : 28);
        break;

      // Er springt mit der Pfanne und schickt Wellen ueber den Boden
      case 'pfanne':
        if (this.timer === 28) { this.vy = -7.8; this.landed = false; }
        if (this.grounded && !this.landed && this.vy >= 0 && this.timer < 26) {
          this.landed = true;
          groundWaves(this, g, '#e8c24a', 3.6, this.rage ? 2 : 1);
          this.go('idle', this.rage ? 16 : 30);
        }
        if (this.timer <= 0 && (this.grounded || this.timer < -90)) this.go('idle', 24);
        break;

      // SAFRAN-EKSTASE: Kubide faellt vom Himmel
      case 'spiessregen':
        this.vx *= 0.8;
        if (this.timer === 70) {
          g.floats.add(this.cx(), this.y - 14, 'KUBIDE-REGEN!', '#ffcf4a', 60);
        }
        if (this.timer % 10 === 0) rainFromSky(g, 'spiess', 1.8);
        if (this.timer <= 0) this.go('idle', 16);
        break;

      // SAFRAN-EKSTASE: er dreht sich und verteilt Spiesse im Kreis
      case 'wirbel':
        this.facing = ((this.t0 >> 2) & 1) ? 1 : -1;
        this.vx = (dx > 0 ? 1 : -1) * 1.7;
        if (this.timer % 8 === 0) {
          var an = this.t0 * 0.8;
          g.addProjectile('spiess', this.cx() - 8, this.y + this.h * 0.35,
                          Math.cos(an) * 3.2, -Math.abs(Math.sin(an)) * 2.6 - 0.6);
        }
        if (this.timer <= 0) this.go('idle', 20);
        break;

      // SAFRAN-EKSTASE: Dampf aus dem Samowar
      case 'samowar':
        this.vx *= 0.8;
        if (this.timer === 20) {
          for (i = 0; i < 3; i++) {
            g.addProjectile('rauch', this.cx() - 13 + (i - 1) * 40, this.y + this.h - 22,
                            (i - 1) * 0.5, -0.2);
          }
          global.Sound.play('shoot');
          g.floats.add(this.cx(), this.y - 14, 'DER TEE IST FERTIG!', '#f8f6ee', 60);
        }
        if (this.timer <= 0) this.go('idle', 18);
        break;
    }

    bossMove(this, g);

    this.animT++;
    var fast = (this.state === 'charge' || this.state === 'drift' || this.state === 'wirbel');
    if (this.animT > (fast ? 3 : 8)) { this.animT = 0; this.anim++; }

    this.open = !(this.state === 'charge' || this.state === 'carjump' ||
                  this.state === 'slam' || this.state === 'doubleslam' ||
                  this.state === 'drift' || this.state === 'wirbel');
    bossContact(this, g);
  };

  MiniBoss.prototype.pick = function (g, dx) {
    var r = Math.random();
    this.facing = dx > 0 ? 1 : -1;
    this.landed = true;
    var R = this.rage;

    if (this.t === 'mirkan') {
      if (!R) {
        if (r < 0.26) this.go('fragen', 38);
        else if (r < 0.44) this.go('hupe', 40);
        else if (r < 0.70) this.go('chargeprep', 22);
        else if (r < 0.88) this.go('carjump', 50);
        else this.go('walk', 40);
      } else {
        if (r < 0.20) this.go('fragen', 36);
        else if (r < 0.36) this.go('hupkonzert', 66);
        else if (r < 0.58) this.go('drift', 97);
        else if (r < 0.76) this.go('chargeprep', 16);
        else this.go('carjump', 50);
      }
    } else if (this.t === 'lennart') {
      if (!R) {
        if (r < 0.30) this.go('hantel', 40);
        else if (r < 0.50) this.go('slam', 48);
        else if (r < 0.64) this.go('chargeprep', 24);
        else if (r < 0.78 && !this.pumped) { this.go('pushups', 76); this.spin = 0; }
        else if (r < 0.90) this.go('walk', 42);
        else { this.go('jump', 58); this.vy = -9.2; this.vx = this.facing * 2.0; }
      } else {
        if (r < 0.22) this.go('hantel', 34);
        else if (r < 0.40) this.go('doubleslam', 90);
        else if (r < 0.56) this.go('hantelregen', 72);
        else if (r < 0.72) this.go('shakewurf', 26);
        else if (r < 0.86) this.go('chargeprep', 18);
        else this.go('slam', 48);
      }
    } else {
      if (!R) {
        if (r < 0.24) this.go('spiesse', 38);
        else if (r < 0.42) this.go('safran', 40);
        else if (r < 0.58) this.go('reis', 42);
        else if (r < 0.78) this.go('pfanne', 56);
        else if (r < 0.90) { this.go('jump', 56); this.vy = -9.0; this.vx = this.facing * 2.2; }
        else this.go('walk', 40);
      } else {
        if (r < 0.18) this.go('spiesse', 32);
        else if (r < 0.34) this.go('wirbel', 80);
        else if (r < 0.50) this.go('spiessregen', 70);
        else if (r < 0.62) this.go('samowar', 40);
        else if (r < 0.76) this.go('reis', 36);
        else if (r < 0.90) this.go('pfanne', 50);
        else this.go('safran', 36);
      }
    }
    if (Math.abs(dx) > 130 && this.state === 'fragen') this.go('walk', 40);
  };

  MiniBoss.prototype.hit = function (g, dmg, p) {
    if (this.invuln > 0 || this.dead || this.state === 'transform') return;
    this.hp -= dmg;
    bossBounce(this, g, p, this.def.col, dmg);
    if (this.hp <= 0) {
      this.dead = true; this.deadTimer = 0; this.vy = -6;
      (p || g.player).score += this.def.score;
      g.shake(8, 30);
      global.Sound.play('bossRoar');
      g.onMiniDead(this.t);
      return;
    }
    if (!this.rage && this.hp <= Math.floor(this.maxHp / 2)) startTransform(this, g);
  };

  /* ================= ESAT — der allerletzte Kampf =================
     Haerter als alle davor. Bei halber Energie nimmt er Snus: er wird
     groesser, muskuloeser und schneller und stampft den Boden weg.
     ============================================================== */

  function BossEsat(tx, ty) {
    this.w = 22; this.h = 58;
    this.x = tx * T; this.y = ty * T - this.h;
    this.floorRow = ty;
    this.vx = 0; this.vy = 0;
    this.facing = -1;
    this.hp = 15; this.maxHp = 15;
    this.phase = 1;
    this.rage = false;      // nach dem Snus
    this.buff = false;      // groesser und muskuloeser
    this.t0 = 0; this.anim = 0; this.animT = 0;
    this.state = 'idle'; this.timer = 70;
    this.invuln = 0; this.flash = 0;
    this.dead = false; this.deadTimer = 0;
    this.grounded = false;
    this.open = true;
    this.stompY = 32;
    this.landed = true;
    this.rageName = 'SNUS AKTIV';
    this.rageCol = '#2fd39e';
  }

  BossEsat.prototype.cx = function () { return this.x + this.w / 2; };
  BossEsat.prototype.go = function (s, t) { this.state = s; this.timer = t; };

  /** Der Snus wirkt: groesser, muskuloeser, schneller. */
  BossEsat.prototype.onTransform = function () {
    this.rage = true;
    this.buff = true;
    var footY = this.y + this.h, mid = this.cx();
    this.w = 36; this.h = 86; this.stompY = 42;
    this.y = footY - this.h;
    this.x = mid - this.w / 2;
  };

  BossEsat.prototype.spawnJet = function (g, fromLeft) {
    var vw = g.viewW ? g.viewW() : 512;
    var jx = fromLeft ? g.cam.x - 60 : g.cam.x + vw + 28;
    var jv = (fromLeft ? 3.4 : -3.4) * (this.rage ? 1.2 : 1);
    g.addProjectile('jet', jx, g.cam.y + 30 + (fromLeft ? 0 : 16), jv, 0);
  };

  BossEsat.prototype.update = function (g) {
    this.t0++;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
    if (this.dead) { bossDeath(this, g, '#2fd39e'); return; }

    var p = g.player;
    var dx = p.cx() - this.cx();
    var spd = !this.rage ? 1 : (this.phase >= 3 ? 1.55 : 1.4);
    var i;
    this.timer--;
    rageSparks(this, g);

    switch (this.state) {
      // Er nimmt Snus. Das ist die Verwandlung.
      case 'transform':
        if (this.timer === 88) {
          g.floats.add(this.cx(), this.y - 14, 'MOMENT. KURZ SNUS.', '#ffd257', 80);
          global.Sound.play('select');
        }
        if (tickTransform(this, g, 'SNUS WIRKT!', this.rageCol)) {
          this.go('idle', 12);
          this.phase = 2;
          g.onEsatPhase(2);
        }
        break;

      case 'idle':
        this.vx *= 0.85;
        this.facing = dx > 0 ? 1 : -1;
        if (this.timer <= 0) this.pickAttack(g, dx);
        break;

      case 'walk':
        this.vx = this.facing * 1.5 * spd;
        if (this.timer <= 0) this.go('idle', this.rage ? 10 : 20);
        break;

      // Shisha-Wolke: bleibt stehen und versperrt den Weg
      case 'shisha':
        this.vx *= 0.8;
        if (this.timer === 18) {
          var n = this.phase >= 3 ? 3 : (this.rage ? 2 : 1);
          for (i = 0; i < n; i++) {
            g.addProjectile('rauch', this.cx() - 13 + this.facing * (20 + i * 26),
                            this.y + this.h * 0.25 + i * 4,
                            this.facing * (0.5 + i * 0.15), -0.12);
          }
          global.Sound.play('shoot');
          g.floats.add(this.cx(), this.y - 10, 'ZIEH MAL DURCH', '#b8b0c8', 50);
        }
        if (this.timer <= 0) this.go('idle', this.rage ? 18 : 34);
        break;

      // KI-Agenten spawnen — hoechstens vier gleichzeitig
      case 'agents':
        this.vx *= 0.8;
        if (this.timer === 20) {
          var live = 0;
          for (var li = 0; li < g.enemies.length; li++) {
            var en = g.enemies[li];
            if (en && en.t === 'agent' && !en.dead) live++;
          }
          var count = Math.min(this.rage ? 3 : 2, 4 - live);
          for (var a = 0; a < count; a++) {
            var e = new Enemy('agent', 0, 0);
            e.x = this.cx() - 7 + (a - 1) * 22;
            e.y = this.y + 6;
            e.homeX = e.x; e.homeY = e.y;
            g.enemies.push(e);
          }
          global.Sound.play('power');
          g.floats.add(this.cx(), this.y - 10, 'ICH LASS DAS KURZ MACHEN', '#2fd39e', 60);
        }
        if (this.timer <= 0) this.go('idle', this.rage ? 20 : 40);
        break;

      // Tuerkische Jets im Anflug — in Phase 3 von beiden Seiten
      case 'jets':
        this.vx *= 0.8;
        if (this.timer === 30) {
          var vw = g.viewW ? g.viewW() : 512;
          var fromLeft = p.cx() > g.cam.x + vw / 2;
          this.spawnJet(g, fromLeft);
          if (this.phase >= 3) this.spawnJet(g, !fromLeft);
          global.Sound.play('bossRoar');
          g.floats.add(this.cx(), this.y - 10, 'DECKUNG.', '#e03a30', 60);
          g.shake(3, 10);
        }
        if (this.timer <= 0) this.go('idle', this.rage ? 18 : 40);
        break;

      case 'dashprep':
        this.vx *= 0.7;
        if (this.timer <= 0) {
          this.go('dash', 28);
          global.Sound.play('bossRoar');
          g.shake(3, 8);
        }
        break;

      case 'dash':
        this.vx = this.facing * 4.2 * spd;
        if (this.timer <= 0) this.go('idle', this.rage ? 18 : 36);
        break;

      case 'jump':
        if (this.grounded && this.timer < 44) this.go('idle', this.rage ? 12 : 26);
        break;

      // Nach dem Snus: er springt hoch und stampft den Boden weg
      case 'stampf':
        if (this.timer === 46) {
          this.vy = -10.8;
          this.vx = (dx > 0 ? 1 : -1) * 2.4 * spd;
          this.landed = false;
        }
        if (this.grounded && !this.landed && this.vy >= 0 && this.timer < 42) {
          this.landed = true;
          groundWaves(this, g, '#2fd39e', 3.8, 2);
          this.go('idle', this.phase >= 3 ? 12 : 18);
        }
        if (this.timer <= 0 && (this.grounded || this.timer < -90)) this.go('idle', 20);
        break;
    }

    bossMove(this, g);

    this.animT++;
    if (this.animT > (this.state === 'dash' ? 3 : 7)) { this.animT = 0; this.anim++; }

    this.open = !(this.state === 'dash' || this.state === 'stampf');
    bossContact(this, g);
  };

  BossEsat.prototype.pickAttack = function (g, dx) {
    var r = Math.random();
    this.facing = dx > 0 ? 1 : -1;
    this.landed = true;

    if (!this.rage) {
      if (r < 0.36) this.go('shisha', 42);
      else if (r < 0.60) this.go('agents', 48);
      else if (r < 0.76) this.go('walk', 44);
      else if (r < 0.90) { this.go('jump', 60); this.vy = -8.8; this.vx = this.facing * 1.9; }
      else this.go('dashprep', 24);
    } else if (this.phase === 2) {
      if (r < 0.20) this.go('shisha', 36);
      else if (r < 0.38) this.go('agents', 42);
      else if (r < 0.54) this.go('jets', 58);
      else if (r < 0.70) this.go('stampf', 50);
      else if (r < 0.86) this.go('dashprep', 18);
      else { this.go('jump', 60); this.vy = -10; this.vx = this.facing * 2.4; }
    } else {
      if (r < 0.24) this.go('jets', 56);
      else if (r < 0.42) this.go('stampf', 48);
      else if (r < 0.58) this.go('agents', 40);
      else if (r < 0.74) this.go('dashprep', 16);
      else this.go('shisha', 32);
    }
  };

  BossEsat.prototype.hit = function (g, dmg, p) {
    if (this.invuln > 0 || this.dead || this.state === 'transform') return;
    this.hp -= dmg;
    bossBounce(this, g, p, '#2fd39e', dmg);
    if (this.hp <= 0) {
      this.dead = true; this.deadTimer = 0; this.vy = -7;
      g.shake(10, 44);
      global.Sound.play('bossRoar');
      g.onEsatDead();
      return;
    }
    if (!this.rage && this.hp <= Math.floor(this.maxHp / 2)) {
      startTransform(this, g);
      return;
    }
    if (this.rage && this.phase < 3 && this.hp <= Math.ceil(this.maxHp / 4)) {
      this.phase = 3;
      g.onEsatPhase(3);
    }
  };

  /* ================= ALEX — Endgegner in der Alkoholabteilung =========
     Yusufs Kollege. Wirft Wodkaflaschen, kotzt Pfuetzen auf den Boden und
     klettert als einziger Boss auf die Regale, um dort in Ruhe ein Bier
     zu trinken. Ab der Haelfte kippt er Yusuf Alkohol ueber — ab da
     wackelt das Bild (siehe g.drunk in game.js).
     ================================================================= */

  function BossAlex(tx, ty) {
    this.w = 20; this.h = 58;
    this.x = tx * T; this.y = ty * T - this.h;
    this.floorRow = ty;
    this.vx = 0; this.vy = 0;
    this.facing = -1;
    this.hp = 16; this.maxHp = 16;
    this.phase = 1;
    this.rage = false;
    this.t0 = 0; this.anim = 0; this.animT = 0;
    this.state = 'idle'; this.timer = 60;
    this.invuln = 0; this.flash = 0;
    this.dead = false; this.deadTimer = 0;
    this.grounded = false;
    this.open = true;
    this.stompY = 32;
    this.landed = true;
    this.sip = 0;              // trinkt gerade einen Schluck
    this.stuckT = 0;
    this.ranted = false;
    this.rageName = 'ULTRAPENNER';
    this.rageCol = '#ff8a2a';
  }

  BossAlex.prototype.cx = function () { return this.x + this.w / 2; };
  BossAlex.prototype.go = function (s, t) { this.state = s; this.timer = t; };

  /** Alex benutzt die echte Welt: er soll auf die Regale klettern.
      Damit er nicht wie frueher an Kanten klebt, springt er, wenn er
      zweimal gegen dasselbe Hindernis laeuft. */
  function alexMove(b, g) {
    b.vy += GRAV;
    if (b.vy > MAX_FALL) b.vy = MAX_FALL;
    var hit = moveX(b, g.world, b.vx);
    b.grounded = (moveY(b, g.world, b.vy) === 1);
    if (b.grounded) {
      if (hit !== 0 && Math.abs(b.vx) > 0.3) {
        b.stuckT++;
        if (b.stuckT > 10) { b.vy = -9.6; b.stuckT = 0; }
      } else b.stuckT = 0;
    }
    if (g.arena) {
      var lo = g.arena.x + 6, hi = g.arena.x + g.arena.w - 6;
      if (b.x < lo) { b.x = lo; b.facing = 1; }
      if (b.x + b.w > hi) { b.x = hi - b.w; b.facing = -1; }
    }
  }

  /** Steht er oben auf einem Regal? */
  function alexOben(b) {
    return (b.y + b.h) < (b.floorRow * T - 8);
  }

  BossAlex.prototype.onTransform = function (g) {
    this.rage = true;
    // Ultrapenner: groesser und breiter
    var footY = this.y + this.h, mid = this.cx();
    this.w = 30; this.h = 80; this.stompY = 40;
    this.y = footY - this.h;
    this.x = mid - this.w / 2;
    // Der Kern der zweiten Haelfte: Yusuf bekommt den Rest der Flasche ab.
    g.drunk = 1;
    g.drunkT = 0;
    var p = g.player;
    g.floats.add(p.cx(), p.y - 30, 'PROST.', '#ff8a2a', 90);
    g.particles.burst(p.cx(), p.y + 6, 40,
      { col: '#bfe6ff', spread: 3.4, up: 1.2, life: 50 });
    global.Sound.play('growl');
  };

  BossAlex.prototype.update = function (g) {
    this.t0++;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
    if (this.sip > 0) this.sip--;
    if (this.dead) { bossDeath(this, g, '#ff8a2a'); return; }

    var p = g.player;
    var dx = p.cx() - this.cx();
    var spd = this.rage ? (this.phase >= 3 ? 1.5 : 1.3) : 1;
    var i;
    this.timer--;
    rageSparks(this, g);

    switch (this.state) {
      case 'transform':
        if (tickTransform(this, g, 'ULTRAPENNER!', this.rageCol)) {
          this.go('idle', 12);
          this.phase = 2;
          g.onAlexPhase(2);
        }
        break;

      case 'idle':
        this.vx *= 0.84;
        this.facing = dx > 0 ? 1 : -1;
        // Sein Ruhezustand: nochmal kurz ansetzen.
        if (this.timer === 14 && Math.random() < 0.5) { this.sip = 28; global.Sound.play('select'); }
        if (this.timer <= 0) this.pick(g, dx);
        break;

      case 'walk':
        this.vx = this.facing * 1.5 * spd;
        if (this.timer <= 0) this.go('idle', this.rage ? 12 : 22);
        break;

      // Wodkaflaschen im Bogen. Beim Aufschlag bleibt eine Pfuetze.
      case 'wodka':
        this.vx *= 0.8;
        if (this.timer === 18 || (this.rage && this.timer === 6)) {
          var n = this.rage ? 3 : 2;
          for (i = 0; i < n; i++) {
            g.addProjectile('wodka', this.cx() - 3, this.y + 14,
                            this.facing * (2.0 + i * 0.7) * spd, -4.2 - i * 0.4);
          }
          global.Sound.play('shoot');
          g.floats.add(this.cx(), this.y - 14, 'DIE WAR NOCH HALB VOLL!', '#bfe6ff', 60);
        }
        if (this.timer <= 0) this.go('idle', this.rage ? 18 : 30);
        break;

      // Was rein geht, kommt auch wieder raus.
      case 'kotze':
        this.vx *= 0.85;
        if (this.timer === 20 || this.timer === 8) {
          g.addProjectile('kotze', this.cx() - 5, this.y + 20,
                          this.facing * 2.4, -2.6);
          global.Sound.play('hurt');
        }
        if (this.timer === 20) {
          g.floats.add(this.cx(), this.y - 14, 'MIR IST SCHLECHT.', '#8fd85a', 60);
        }
        if (this.timer <= 0) this.go('idle', this.rage ? 18 : 32);
        break;

      // Er klettert aufs Regal und trinkt dort in Ruhe weiter.
      case 'bierjump':
        if (this.timer === 34) {
          this.vy = -11.2;
          this.vx = (dx > 0 ? 1 : -1) * 2.2 * spd;
          global.Sound.play('jump');
        }
        if (this.timer < 28 && this.grounded) {
          if (alexOben(this)) this.go('trinken', 80);
          else this.go('idle', 20);
        }
        if (this.timer <= 0 && this.grounded) this.go('idle', 20);
        break;

      case 'trinken':
        this.vx *= 0.7;
        this.sip = 30;
        if (this.timer === 60) {
          g.floats.add(this.cx(), this.y - 16, 'EINS GEHT NOCH.', '#ffd257', 70);
        }
        if (this.timer === 44 || this.timer === 24) {
          g.addProjectile('bier', this.cx() - 3, this.y + 18,
                          (dx > 0 ? 1 : -1) * 2.6, -1.2);
          global.Sound.play('shoot');
        }
        if (this.timer <= 0) this.go('runter', 40);
        break;

      // Und dann kommt er von oben runter.
      case 'runter':
        if (this.timer === 34) {
          this.vy = -5.5;
          this.vx = (dx > 0 ? 1 : -1) * 3.0 * spd;
          this.landed = false;
          global.Sound.play('bossRoar');
        }
        if (this.grounded && !this.landed && this.vy >= 0 && this.timer < 30) {
          this.landed = true;
          groundWaves(this, g, '#ff8a2a', 3.2, this.rage ? 2 : 1);
          this.go('idle', this.rage ? 16 : 28);
        }
        if (this.timer <= 0 && (this.grounded || this.timer < -90)) this.go('idle', 22);
        break;

      case 'dashprep':
        this.vx *= 0.7;
        if (this.timer <= 0) {
          this.go('dash', 30);
          global.Sound.play('bossRoar');
          g.shake(3, 8);
        }
        break;

      case 'dash':
        // Torkeln: er laeuft nicht gerade.
        this.vx = this.facing * 3.8 * spd + Math.sin(this.t0 * 0.3) * 0.8;
        if (this.timer <= 0) this.go('idle', this.rage ? 18 : 34);
        break;

      // Der Vortrag ueber Platin-Trophaeen. Sehr schnell, sehr laut.
      case 'stotter':
        this.vx *= 0.8;
        if (this.timer % 14 === 0) {
          var rl = global.Levels.alexLines;
          g.floats.add(this.cx() + (Math.random() - 0.5) * 40, this.y - 10 - (this.timer % 40),
                       rl[(Math.random() * rl.length) | 0], '#ffd257', 55);
          global.Sound.play('move');
        }
        if (this.timer % 20 === 10) {
          g.addProjectile('wodka', this.cx() - 3, this.y + 14,
                          this.facing * 2.6, -3.6);
        }
        if (this.timer <= 0) this.go('idle', 20);
        break;

      // ULTRAPENNER: Dosen vom Himmel.
      case 'bierregen':
        this.vx *= 0.8;
        if (this.timer === 70) {
          g.floats.add(this.cx(), this.y - 16, 'RUNDE FÜR ALLE!', '#ff8a2a', 70);
        }
        if (this.timer % 11 === 0) rainFromSky(g, 'bier', 1.4);
        if (this.timer <= 0) this.go('idle', 18);
        break;
    }

    alexMove(this, g);

    this.animT++;
    if (this.animT > (this.state === 'dash' ? 3 : 7)) { this.animT = 0; this.anim++; }

    this.open = !(this.state === 'dash' || this.state === 'runter');
    bossContact(this, g);
  };

  BossAlex.prototype.pick = function (g, dx) {
    var r = Math.random();
    this.facing = dx > 0 ? 1 : -1;
    this.landed = true;

    // Einmal pro Kampf haelt er seinen Vortrag.
    if (!this.ranted && this.hp <= this.maxHp - 3) {
      this.ranted = true;
      this.go('stotter', 84);
      return;
    }
    if (!this.rage) {
      if (r < 0.26) this.go('wodka', 38);
      else if (r < 0.46) this.go('kotze', 40);
      else if (r < 0.64) this.go('bierjump', 44);
      else if (r < 0.80) this.go('dashprep', 24);
      else this.go('walk', 42);
    } else if (this.phase === 2) {
      if (r < 0.22) this.go('wodka', 32);
      else if (r < 0.40) this.go('bierregen', 76);
      else if (r < 0.58) this.go('bierjump', 44);
      else if (r < 0.74) this.go('kotze', 34);
      else if (r < 0.90) this.go('dashprep', 18);
      else this.go('walk', 36);
    } else {
      if (r < 0.24) this.go('bierregen', 80);
      else if (r < 0.44) this.go('wodka', 28);
      else if (r < 0.62) this.go('dashprep', 15);
      else if (r < 0.80) this.go('kotze', 30);
      else this.go('bierjump', 44);
    }
  };

  BossAlex.prototype.hit = function (g, dmg, p) {
    if (this.invuln > 0 || this.dead || this.state === 'transform') return;
    this.hp -= dmg;
    bossBounce(this, g, p, '#ff8a2a', dmg);
    if (this.hp <= 0) {
      this.dead = true; this.deadTimer = 0; this.vy = -7;
      g.shake(10, 42);
      global.Sound.play('bossRoar');
      g.onAlexDead();
      return;
    }
    if (!this.rage && this.hp <= Math.floor(this.maxHp / 2)) {
      startTransform(this, g);
      return;
    }
    if (this.rage && this.phase < 3 && this.hp <= Math.ceil(this.maxHp / 4)) {
      this.phase = 3;
      g.onAlexPhase(3);
    }
  };

  /* ================= Export ================= */

  global.Ent = {
    T: T,
    World: World,
    Player: Player,
    Enemy: Enemy,
    Item: Item,
    Projectile: Projectile,
    Boss: Boss,
    BossEsat: BossEsat,
    BossAlex: BossAlex,
    MiniBoss: MiniBoss,
    MINIBOSS: MINIBOSS,
    Particles: Particles,
    Floats: Floats,
    ENEMY: ENEMY,
    ITEM: ITEM,
    setDifficulty: setDifficulty,
    overlap: overlap,
    moveX: moveX,
    moveY: moveY,
    GRAV: GRAV
  };

})(window);
