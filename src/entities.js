/* =====================================================================
   entities.js — Welt, Physik, Yusuf, Gegner, Items und Hussein.
   ===================================================================== */
(function (global) {
  'use strict';

  var T = 16;

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
    if (ax !== 0) {
      this.vx += ACC * ax;
      this.facing = ax > 0 ? 1 : -1;
    } else {
      this.vx *= this.grounded ? FRIC_GROUND : FRIC_AIR;
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
    }
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

  /** Einschlag des Bauch-Stampfers: Kisten unten drunter + Gegner in der Nähe. */
  Player.prototype.poundImpact = function (g) {
    var tx0 = Math.floor((this.x - 6) / T), tx1 = Math.floor((this.x + this.w + 6) / T);
    var ty = Math.floor((this.feet() + 2) / T);
    for (var tx = tx0; tx <= tx1; tx++) {
      var b = g.world.blockAt(tx, ty);
      if (b && !b.dead && b.type === 'kiste') this.breakCrate(g, b);
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
      if (bd < 56 && bdy < 34) g.boss.hit(g, 1, true);
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
    drohne:  { w: 16, h: 12, spr: ['drohne', 'drohne2'], score: 200, hp: 1, fly: true }
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
    else { this.w = 10; this.h = 14; this.spr = 'shaker'; this.grav = 0; }
  }

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

    if (this.t === 'kippe') {
      // Kippen hüpfen über den Boden wie Marios Feuerbälle.
      var below = Math.floor((this.y + this.h) / T);
      if (this.vy > 0 && g.world.solid(cxT, below)) {
        this.y = below * T - this.h;
        this.vy = -3.5;
        g.particles.spawn({ x: this.x + 5, y: this.y + 4, vx: 0, vy: -0.5,
                            life: 22, col: '#ffb43c', size: 2, grav: 0 });
        if (--this.bounces <= 0) this.pop(g, '#ffb43c');
      }
      var ahead = Math.floor((this.x + (this.vx > 0 ? this.w : 0)) / T);
      if (g.world.solid(ahead, cyT)) this.pop(g, '#ffb43c');
    } else if (g.world.solid(cxT, cyT)) {
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
        g.boss.hit(g, 1, false, null);
        this.pop(g, '#ffb43c');
      }
    } else if (!g.player.dead && overlap(this, g.player)) {
      this.dead = true;
      if (g.player.power > 0 || g.player.pound === -1) {
        g.particles.burst(this.x, this.y, 8, { col: '#ffd257', spread: 2, life: 18 });
      } else {
        g.player.hurt(g, 1, this.x + this.w / 2);
      }
    }
  };

  /* ================= Hussein — Endgegner ================= */

  function Boss(tx, ty) {
    this.w = 20; this.h = 58;           // 2x skaliert gezeichnet
    this.x = tx * T; this.y = ty * T - this.h;
    this.vx = 0; this.vy = 0;
    this.facing = -1;
    this.hp = 9; this.maxHp = 9;   // 3 Treffer pro Phase
    this.phase = 1;
    this.t0 = 0;
    this.anim = 0; this.animT = 0;
    this.state = 'idle';
    this.timer = 60;
    this.invuln = 0;
    this.flash = 0;
    this.dead = false;
    this.deadTimer = 0;
    this.grounded = false;
    this.pushups = 0;
    this.intro = true;
    this.homeY = this.y;
  }

  Boss.prototype.cx = function () { return this.x + this.w / 2; };

  Boss.prototype.update = function (g) {
    this.t0++;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;

    if (this.dead) {
      this.deadTimer++;
      this.vy += GRAV * 0.5;
      this.y += this.vy;
      if (this.deadTimer % 9 === 0) {
        g.particles.burst(this.cx() + (Math.random() - 0.5) * 20,
                          this.y + Math.random() * this.h, 6,
          { col: '#9dff6a', spread: 2.2, up: 0.6, life: 26 });
      }
      return;
    }

    if (this.intro) { this.vy += GRAV; this.doMove(g); return; }

    var p = g.player;
    var dx = p.cx() - this.cx();
    this.timer--;

    switch (this.state) {
      case 'idle':
        this.vx *= 0.86;
        this.facing = dx > 0 ? 1 : -1;
        if (this.timer <= 0) this.pickAttack(g, dx);
        break;

      case 'walk':
        this.vx = this.facing * (this.phase >= 2 ? 1.5 : 1.05);
        if (this.timer <= 0) { this.state = 'idle'; this.timer = 26; }
        break;

      case 'throw':
        this.vx *= 0.8;
        if (this.timer === 12) {
          var n = this.phase >= 3 ? 4 : (this.phase === 2 ? 3 : 2);
          for (var i = 0; i < n; i++) {
            g.addProjectile('blatt', this.cx(), this.y + 20,
              this.facing * (2.2 + i * 0.4), -2.6 - i * 0.55);
          }
          global.Sound.play('shoot');
        }
        // Nach jedem Angriff eine klare Lücke zum Draufspringen.
        if (this.timer <= 0) { this.state = 'idle'; this.timer = 48; }
        break;

      case 'shake':   // Protein-Shaker, waagerecht
        this.vx *= 0.8;
        if (this.timer === 14) {
          g.addProjectile('shaker', this.cx(), this.y + 24, this.facing * 3.0, 0);
          global.Sound.play('shoot');
        }
        if (this.timer <= 0) { this.state = 'idle'; this.timer = 44; }
        break;

      case 'jump':
        if (this.grounded && this.timer < 44) { this.state = 'idle'; this.timer = 42; }
        break;

      // Sichtbares Ausholen, damit der Sturmlauf fair ist
      case 'dashprep':
        this.vx *= 0.7;
        if (this.timer <= 0) {
          this.state = 'dash'; this.timer = 34;
          global.Sound.play('bossRoar');
          g.shake(3, 8);
        }
        break;

      case 'dash':
        this.vx = this.facing * 3.7;
        if (this.timer <= 0) { this.state = 'idle'; this.timer = 52; }
        break;

      // Der Gag: er macht mitten im Kampf Liegestütze, um sich zu "pushen".
      case 'pushups':
        this.vx = 0;
        this.pushups++;
        if (this.pushups % 16 === 0) {
          global.Sound.play('select');
          g.floats.add(this.cx(), this.y - 8,
            '' + Math.floor(this.pushups / 16), '#9dff6a', 30);
        }
        if (this.timer <= 0) {
          this.state = 'idle'; this.timer = 20;
          g.floats.add(this.cx(), this.y - 14, 'JETZT BIN ICH WARM!', '#9dff6a', 60);
        }
        break;

      case 'rain':
        this.vx *= 0.8;
        // Nur im sichtbaren Bereich regnen lassen — sonst verpufft es.
        if (this.timer % 18 === 0) {
          var rx = g.cam.x + 30 + Math.random() * 450;
          g.addProjectile('blatt', rx, g.cameraTopY(), 0, 1.3);
        }
        if (this.timer <= 0) { this.state = 'idle'; this.timer = 50; }
        break;
    }

    this.vy += GRAV;
    if (this.vy > MAX_FALL) this.vy = MAX_FALL;
    this.doMove(g);

    // Arena-Grenzen
    if (g.arena) {
      if (this.x < g.arena.x + 6) { this.x = g.arena.x + 6; this.facing = 1; }
      if (this.x + this.w > g.arena.x + g.arena.w - 6) {
        this.x = g.arena.x + g.arena.w - 6 - this.w; this.facing = -1;
      }
    }

    this.animT++;
    if (this.animT > (this.state === 'dash' ? 3 : 7)) { this.animT = 0; this.anim++; }

    // Kontakt. Zwei Regeln machen den Kampf ueberhaupt erst lernbar:
    //  1) nach einem Treffer ist er kurz komplett ungefaehrlich,
    //  2) waehrend er durchatmet (idle/Liegestuetze) tut er nichts.
    // Sonst verliert man Leben allein dadurch, dass man ihm nahe kommt —
    // und naeher kommen MUSS man, um auf seinen Kopf zu springen.
    // Nur der angekuendigte Sturmlauf tut weh. Sein blosser Koerper nicht —
    // sonst bestraft das Spiel genau die Bewegung, die es verlangt.
    // Die eigentliche Gefahr sind seine Wuerfe.
    this.open = (this.state !== 'dash');
    if (!p.dead && this.invuln <= 0 && overlap(this, p)) {
      var stomp = p.vy > 0.5 && (p.feet() - this.y) < 32;
      if (stomp || p.power > 0) this.hit(g, 1, false, p);
      else if (p.pound === -1) this.hit(g, 1, true, p);
      else if (!this.open) p.hurt(g, 1, this.cx());
    }
  };

  Boss.prototype.doMove = function (g) {
    moveX(this, g.world, this.vx);
    this.grounded = (moveY(this, g.world, this.vy) === 1);
  };

  Boss.prototype.pickAttack = function (g, dx) {
    var r = Math.random();
    var dist = Math.abs(dx);
    this.facing = dx > 0 ? 1 : -1;

    if (this.phase === 1) {
      if (r < 0.42) { this.state = 'throw'; this.timer = 40; }
      else if (r < 0.72) { this.state = 'walk'; this.timer = 56; }
      else { this.state = 'jump'; this.timer = 60; this.vy = -8.4; this.vx = this.facing * 1.6; }
    } else if (this.phase === 2) {
      if (r < 0.30) { this.state = 'throw'; this.timer = 36; }
      else if (r < 0.52) { this.state = 'shake'; this.timer = 34; }
      else if (r < 0.74) { this.state = 'dashprep'; this.timer = 26; }
      else { this.state = 'jump'; this.timer = 60; this.vy = -9.2; this.vx = this.facing * 2.1; }
    } else {
      if (r < 0.22) { this.state = 'rain'; this.timer = 86; }
      else if (r < 0.42) { this.state = 'dashprep'; this.timer = 22; }
      else if (r < 0.60) { this.state = 'shake'; this.timer = 30; }
      else if (r < 0.80) { this.state = 'throw'; this.timer = 32; }
      else { this.state = 'pushups'; this.timer = 82; this.pushups = 0; }
    }
    if (dist > 150 && this.state === 'throw') { this.state = 'walk'; this.timer = 52; }
  };

  Boss.prototype.hit = function (g, dmg, isPound, p) {
    if (this.invuln > 0 || this.dead) return;
    this.hp -= dmg;
    this.invuln = 54;
    this.flash = 16;
    this.state = 'idle';
    this.timer = 30;
    this.vx = (p && p.cx() > this.cx()) ? -2.6 : 2.6;
    if (p) { p.vy = -8.2; p.jumpsLeft = 1; p.laughTimer = 40; }
    global.Sound.play('bossHit');
    if (Math.random() < 0.5) global.Sound.play('laugh');
    g.shake(6, 14);
    g.particles.burst(this.cx(), this.y + 24, 16,
      { col: '#9dff6a', spread: 3, up: 1, life: 30 });
    g.floats.add(this.cx(), this.y - 6, 'TREFFER!', '#9dff6a', 45);

    var newPhase = this.hp > 6 ? 1 : (this.hp > 3 ? 2 : 3);
    if (newPhase !== this.phase && this.hp > 0) {
      this.phase = newPhase;
      g.onBossPhase(newPhase);
    }
    if (this.hp <= 0) {
      this.dead = true;
      this.deadTimer = 0;
      this.vy = -7;
      g.shake(10, 40);
      global.Sound.play('bossRoar');
      g.onBossDead();
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
