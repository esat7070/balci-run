/* =====================================================================
   bosse.js — die Bosse ab Level 17. Anders gebaut als die alten:

   DER ANDERE ALEX (Level 17) ist ein Riese. Draufspringen bringt nichts,
   nur seine Schwachstellen tun weh — und die gibt es immer nur kurz:
     SCHUH   nach dem Stampfer ist der Schnuersenkel auf
     BRILLE  wenn er sich bueckt, um den kleinen Yusuf zu suchen
     MUETZE  wenn er telefoniert und nicht aufpasst
     UHR     wenn er (ab der Haelfte) Rage-Bait tippt

   NILS (Level 19) ist klug. Man kommt nur an ihn ran, wenn er gerade
   nicht denkt: nach einer richtig beantworteten Quizfrage, wenn er
   Yusuf nachmacht und dabei (wie Yusuf) einschlaeft, oder wenn er sich
   mit Gedankenblitzen ueberhitzt hat.
   ===================================================================== */
(function (global) {
  'use strict';

  var E = global.Ent, K = E.bossKit, T = 16;
  var P = global.Pixel, F = global.Font;

  function S() { return global.Sound; }
  function rnd(a) { return a[(Math.random() * a.length) | 0]; }
  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function rect(ctx, x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  /** Trifft Yusuf gerade von oben (oder mit dem Bauch-Stampfer)? */
  function vonOben(p) { return p.pound === -1 || p.vy > 0.5; }

  /* =====================================================================
     DER ANDERE ALEX — Riese
     ===================================================================== */

  var RS = 5;                          // so viel groesser wird er gezeichnet

  // Schwachstellen relativ zur Fussmitte, in Pixeln der normalen Figur
  // (blickt nach rechts). Siehe CHARS.alexg in pixel.js.
  var PUNKTE = {
    schuh:  { x: 3,  y: -2,  w: 7,  h: 3,  name: 'SCHUH' },
    brille: { x: 0,  y: -25, w: 10, h: 4,  name: 'BRILLE' },
    muetze: { x: 1,  y: -30, w: 11, h: 3,  name: 'MÜTZE' },
    uhr:    { x: 7,  y: -15, w: 5,  h: 3,  name: 'UHR' }
  };

  function BossRiese(tx, ty) {
    this.floorRow = ty;
    this.w = 60; this.h = 150;
    this.x = tx * T - this.w / 2; this.y = ty * T - this.h;
    this.vx = 0; this.vy = 0;
    this.facing = -1;
    this.hp = 10; this.maxHp = 10;
    this.phase = 1; this.rage = false;
    this.state = 'idle'; this.timer = 70;
    this.invuln = 0; this.flash = 0;
    this.dead = false; this.deadTimer = 0;
    this.t0 = 0; this.anim = 0;
    this.lean = 0;                     // wie weit er sich bueckt (Radiant)
    this.fussHoch = 0;                 // vorderer Fuss angehoben (Pixel)
    this.offen = null;                 // welche Schwachstelle gerade offen ist
    this.kruecken = 2;                 // wie viele er noch in der Hand hat
    this.muetze = true;
    this.zielX = null;
    this.telefon = false;
    this.nixT = 0;                     // Abklingzeit fuer "DA SPUERT ER NIX"
    this.barName = 'DER ANDERE ALEX';
    this.barCol = '#cdb88c';
    this.rageName = 'RAGE-BAIT';
    this.rageCol = '#ff4a4a';
    this.open = false;
    this.brueckenT = 0;
  }

  BossRiese.prototype.cx = function () { return this.x + this.w / 2; };
  BossRiese.prototype.go = function (s, t) { this.state = s; this.timer = t; };
  BossRiese.prototype.onTransform = function () { this.rage = true; };

  /** Wo liegt eine Schwachstelle gerade in der Welt? Beruecksichtigt,
      wie weit er sich bueckt und wohin er schaut. */
  BossRiese.prototype.punkt = function (name) {
    var d = PUNKTE[name], dir = this.facing;
    var rx = d.x * RS * dir, ry = d.y * RS;
    if (name !== 'schuh' && this.lean) {
      var a = this.lean * dir, c = Math.cos(a), s = Math.sin(a);
      var nx = rx * c - ry * s, ny = rx * s + ry * c;
      rx = nx; ry = ny;
    }
    if (name === 'schuh') ry -= this.fussHoch;
    var w = d.w * RS, h = d.h * RS + 6;
    return { x: this.cx() + rx - w / 2, y: this.y + this.h + ry - h / 2, w: w, h: h, name: d.name };
  };

  BossRiese.prototype.update = function (g) {
    this.t0++;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
    if (this.nixT > 0) this.nixT--;
    if (this.dead) { K.death(this, g, '#cdb88c'); return; }

    var p = g.player, dx = p.cx() - this.cx();
    var spd = this.phase >= 3 ? 1.3 : (this.rage ? 1.15 : 1);
    this.timer--;
    K.rageSparks(this, g);

    switch (this.state) {
      case 'transform':
        this.lean = Math.max(0, this.lean - 0.05);
        if (this.timer === 90) g.floats.add(this.cx(), this.y + 10, 'NEUER KOMMENTAR VON GEORGIOS...', '#cdb88c', 80);
        if (K.tickTransform(this, g, 'RAGE-BAIT!', this.rageCol)) {
          this.go('idle', 20);
          this.phase = 2;
          g.onRiesePhase(2);
        }
        break;

      case 'idle':
        this.lean = Math.max(0, this.lean - 0.04);
        this.offen = null;
        this.facing = dx > 0 ? 1 : -1;
        if (this.timer <= 0) this.pick(g, dx);
        break;

      // Riesenschritte. Jeder Schritt wackelt.
      case 'gehen':
        var ziel = this.zielX - this.w / 2;
        this.vx = Math.sign(ziel - this.x) * 0.9 * spd;
        if (this.t0 % 34 === 0) {
          g.shake(3, 8);
          S().play('land');
          dust(g, this.cx(), this.y + this.h, '#9aa0ac');
        }
        if (Math.abs(ziel - this.x) < 4 || this.timer <= 0) { this.vx = 0; this.go('idle', 24); }
        break;

      // Fuss heben ... (man sieht den Schatten, wo er landet)
      case 'stampfprep':
        this.vx = 0;
        this.fussHoch = Math.min(46, this.fussHoch + 1.6);
        if (this.timer === 50) g.floats.add(this.cx(), this.y - 10, 'VORSICHT, KLEINER!', '#cdb88c', 60);
        if (this.timer <= 0) {
          this.fussHoch = 0;
          this.go('schuhOffen', 130);
          K.groundWaves(this, g, '#cdb88c', 3.6, this.rage ? 2 : 1);
          var fs = this.punkt('schuh');
          var pl = g.player;
          if (pl.feet() > fs.y - 4 && pl.cx() > fs.x - 10 && pl.cx() < fs.x + fs.w + 10) pl.hurt(g, 1, fs.x + fs.w / 2);
          g.floats.add(fs.x + fs.w / 2, fs.y - 24, 'SCHNÜRSENKEL OFFEN!', '#ffd257', 90);
        }
        break;

      // ... und danach: Schuh offen. Draufspringen!
      case 'schuhOffen':
        this.offen = 'schuh';
        if (this.timer <= 0) { this.offen = null; this.go('idle', 20); }
        break;

      case 'stolpern':
        this.offen = null;
        this.lean = Math.min(0.35, this.lean + 0.05);
        if (this.timer <= 0) this.go('idle', 30);
        break;

      // Eine Kruecke wirft er quer ueber die Etage, auf der Yusuf steht
      case 'kruecke':
        this.vx = 0;
        if (this.timer === 26) {
          var etage = Math.min(this.floorRow * T - 20, p.y + p.h / 2);
          var kr = g.addProjectile('kruecke', this.cx() + this.facing * 30, etage - 3,
                                   this.facing * 5.2 * spd, 0);
          if (kr) {
            kr.bumerang = this.rage;
            var self = this;
            kr.onWall = function (gg, pr) { self.bruecke(gg, pr); };
          }
          this.kruecken = Math.max(0, this.kruecken - 1);
          S().play('shoot');
          g.floats.add(this.cx(), this.y - 10, rnd(['FANG!', 'DIE BRAUCH ICH EH NICHT.', 'KRÜCKE!']), '#cdb88c', 55);
        }
        if (this.timer <= 0) { this.kruecken = 2; this.go('idle', 26); }
        break;

      // Bueckt sich, um den kleinen Yusuf zu suchen. Dann ist die Brille unten.
      case 'buecken':
        this.vx = 0;
        this.facing = dx > 0 ? 1 : -1;
        if (this.timer > 150) this.lean = Math.min(0.62, this.lean + 0.03);
        else if (this.timer < 30) this.lean = Math.max(0, this.lean - 0.03);
        if (this.timer === 170) g.floats.add(this.cx(), this.y + 20, rnd(['WO IST DER KLEINE?', 'ICH SEH NIX. BRILLE BESCHLAGEN.', 'YUSUF? BIST DU DA UNTEN?']), '#cdb88c', 80);
        this.offen = (this.lean > 0.4) ? 'brille' : null;
        // Er atmet schwer. Das schiebt.
        if (this.lean > 0.4 && this.t0 % 40 === 0) {
          var br = this.punkt('brille');
          if (Math.abs(p.cx() - (br.x + br.w / 2)) < 90 && Math.abs(p.y - br.y) < 60) {
            p.vx += this.facing * 2.2;
            g.floats.add(p.cx(), p.y - 10, 'HUCH. ATEM.', '#c8c0d8', 40);
          }
          for (var ai = 0; ai < 6; ai++) {
            g.particles.spawn({ x: br.x + br.w / 2, y: br.y + br.h, vx: this.facing * (1 + Math.random()),
                                vy: (Math.random() - 0.5) * 0.6, life: 26, col: '#e8f0f8', size: 2, grav: 0 });
          }
        }
        if (this.timer <= 0) { this.lean = 0; this.offen = null; this.go('idle', 20); }
        break;

      // Telefoniert. Passt nicht auf. Die Muetze ist offen.
      case 'telefon':
        this.vx = 0;
        this.telefon = true;
        if (this.timer === 200) { g.floats.add(this.cx(), this.y - 10, 'JA? NEIN. ICH BIN GERADE IM KAMPF.', '#cdb88c', 90); S().play('ring'); }
        if (this.timer === 110) g.floats.add(this.cx(), this.y - 10, 'NEIN, GEGEN YUSUF. JA. DER KLEINE.', '#cdb88c', 90);
        this.offen = this.muetze ? 'muetze' : 'brille';
        if (!this.muetze) this.lean = Math.min(0.3, this.lean + 0.02);
        if (this.t0 % 70 === 0) K.rainFromSky(g, 'buch', 1.2);   // aus der Tasche faellt was
        if (this.timer <= 0) { this.telefon = false; this.offen = null; this.go('idle', 24); }
        break;

      // Ab der Haelfte: tippt Rage-Bait. Die Woerter fallen vom Himmel.
      case 'ragebait':
        this.vx = 0;
        this.telefon = true;
        this.offen = 'uhr';
        if (this.timer === 190) g.floats.add(this.cx(), this.y - 10, 'WART, ICH SCHREIB WAS DRUNTER.', '#ff4a4a', 80);
        if (this.timer < 180 && this.timer % (this.phase >= 3 ? 16 : 22) === 0) {
          var wort = rnd(global.Levels.rageBait || ['L']);
          var vw = g.viewW ? g.viewW() : 512;
          var wx = g.cam.x + 20 + Math.random() * (vw - 40 - wort.length * 6);
          var w = g.addProjectile('wort', wx, g.cameraTopY(), 0, 1.2);
          if (w) { w.text = wort; w.w = wort.length * 6; }
        }
        if (this.timer <= 0) { this.telefon = false; this.offen = null; this.go('idle', 20); }
        break;

      // Ohne Kruecken huepft er auf einem Bein. Jeder Hopser bebt.
      case 'huepfen':
        if (this.grounded && this.timer % 46 === 0 && this.timer > 20) {
          this.vy = -7.5;
          this.vx = Math.sign(dx) * 1.4 * spd;
          this.landed = false;
          S().play('jump');
        }
        if (this.grounded && !this.landed && this.vy >= 0) {
          this.landed = true;
          this.vx = 0;
          K.groundWaves(this, g, '#ff4a4a', 3.8, 1);
        }
        if (this.timer <= 0) {
          this.vx = 0;
          this.go('wackeln', 120);
          g.floats.add(this.cx(), this.y + 10, 'PUH. KURZ... VERSCHNAUFEN.', '#ff4a4a', 90);
        }
        break;

      // Ausser Puste: vornuebergebeugt, Brille unten
      case 'wackeln':
        this.lean = Math.min(0.55, this.lean + 0.03);
        this.offen = this.lean > 0.4 ? 'brille' : null;
        if (this.timer <= 0) { this.lean = 0; this.offen = null; this.kruecken = 2; this.go('idle', 20); }
        break;

      // Beide Kruecken als Bumerang, auf zwei Hoehen
      case 'bumerang':
        this.vx = 0;
        if (this.timer === 30 || this.timer === 14) {
          var hoehe = this.timer === 30 ? this.floorRow * T - 20 : this.floorRow * T - 84;
          var bk = g.addProjectile('kruecke', this.cx() + this.facing * 30, hoehe,
                                   this.facing * 6 * spd, 0);
          if (bk) bk.bumerang = true;
          S().play('shoot');
          this.kruecken--;
        }
        if (this.timer === 30) g.floats.add(this.cx(), this.y - 10, 'BUMERANG! DIE KOMMEN WIEDER!', '#ff4a4a', 60);
        if (this.timer <= 0) this.go('huepfen', 150);
        break;
    }

    K.move(this, g);
    this.anim = (this.t0 >> 4);
    this.treffer(g, p);
  };

  /** Kruecke steckt in der Wand: fuer ein paar Sekunden eine Bruecke. */
  BossRiese.prototype.bruecke = function (g, pr) {
    var ty = Math.floor((pr.y + 3) / T);
    var links = pr.x < g.arena.x + g.arena.w / 2;
    var tx = links ? Math.floor(g.arena.x / T) + 1 : Math.floor((g.arena.x + g.arena.w) / T) - 4;
    // Nur, wo noch nichts ist — keine Plattform ueberschreiben und nie
    // mitten in Yusuf hinein
    for (var i = 0; i < 3; i++) if (g.world.solid(tx + i, ty)) return;
    if (overlap(g.player, { x: tx * T, y: ty * T, w: 3 * T, h: T })) return;
    g.world.fill(tx, ty, 3, 1, 1);
    this.bruecken = this.bruecken || [];
    this.bruecken.push({ tx: tx, ty: ty, t: 330 });
    S().play('stomp');
    g.shake(3, 8);
    g.floats.add(tx * T + 24, ty * T - 10, 'STECKT FEST. RAUFSPRINGEN!', '#ffd257', 80);
  };

  BossRiese.prototype.brueckenTick = function (g) {
    if (!this.bruecken) return;
    for (var i = this.bruecken.length - 1; i >= 0; i--) {
      var b = this.bruecken[i];
      if (--b.t > 0) continue;
      g.world.fill(b.tx, b.ty, 3, 1, 0);
      this.bruecken.splice(i, 1);
    }
  };

  /** Treffer auf eine Schwachstelle — oder eben nicht. */
  BossRiese.prototype.treffer = function (g, p) {
    this.brueckenTick(g);
    if (p.dead || this.invuln > 0 || this.state === 'transform') return;
    if (this.offen) {
      var z = this.punkt(this.offen);
      if (overlap(p, z) && vonOben(p)) {
        this.hit(g, p.pound === -1 ? K.POUND_BOSS_DMG : 1, p, this.offen);
        return;
      }
    }
    // Irgendwo anders draufgesprungen: tut ihm nicht weh
    var koerper = { x: this.cx() - 26, y: this.y + this.h - 150, w: 52, h: 150 };
    if (this.nixT === 0 && vonOben(p) && overlap(p, koerper) && p.feet() < this.y + this.h - 30) {
      this.nixT = 60;
      p.vy = -6.5;
      g.floats.add(p.cx(), p.y - 14, rnd(['DA SPÜRT ER NIX.', 'DAS KITZELT NUR.', 'SUCH DIE SCHWACHSTELLE!']), '#c8c0d8', 60);
    }
  };

  BossRiese.prototype.hit = function (g, dmg, p, wo) {
    if (this.invuln > 0 || this.dead || this.state === 'transform') return;
    // Kippen und Faeuste zaehlen hier nicht — nur die Schwachstellen
    if (!wo) return;
    this.hp -= dmg;
    this.invuln = 50; this.flash = 18;
    this.offen = null;
    this.fussHoch = 0;
    if (p) { p.vy = -8.6; p.jumpsLeft = 1; p.laughTimer = 40; }
    S().play('bossHit');
    g.shake(7, 16);
    var ort = this.punkt(wo);
    g.particles.burst(ort.x + ort.w / 2, ort.y + ort.h / 2, 18, { col: '#ffd257', spread: 3, up: 1, life: 30 });
    var AUA = {
      schuh: 'MEIN SCHUH!', brille: 'MEINE BRILLE!', muetze: 'MEINE MÜTZE!', uhr: 'MEINE UHR! DIE WAR VON OPA!'
    };
    g.floats.add(ort.x + ort.w / 2, ort.y - 16, AUA[wo], '#ff8a8a', 70);
    if (wo === 'muetze') this.muetze = false;
    if (wo === 'schuh') this.go('stolpern', 60);
    else { this.lean = Math.min(this.lean, 0.2); this.go('idle', 40); }
    if (this.hp <= 0) {
      this.dead = true; this.deadTimer = 0; this.vy = -3;
      g.shake(12, 50);
      S().play('bossRoar');
      g.onRieseDead();
      return;
    }
    if (!this.rage && this.hp <= this.maxHp / 2) { K.startTransform(this, g); return; }
    if (this.rage && this.phase < 3 && this.hp <= Math.ceil(this.maxHp / 4)) {
      this.phase = 3;
      g.onRiesePhase(3);
    }
  };

  BossRiese.prototype.pick = function (g, dx) {
    var r = Math.random();
    var ax = g.arena.x, aw = g.arena.w;
    // Nicht zweimal dasselbe hintereinander
    var last = this.last, next;
    if (!this.rage) {
      if (r < 0.22) next = 'stampfprep';
      else if (r < 0.44) next = 'buecken';
      else if (r < 0.62) next = 'kruecke';
      else if (r < 0.80) next = 'telefon';
      else next = 'gehen';
    } else {
      if (r < 0.2) next = 'ragebait';
      else if (r < 0.38) next = 'bumerang';
      else if (r < 0.56) next = 'stampfprep';
      else if (r < 0.74) next = 'buecken';
      else if (r < 0.86) next = 'telefon';
      else next = 'gehen';
    }
    if (next === last) next = (next === 'gehen') ? 'stampfprep' : 'gehen';
    this.last = next;
    this.facing = dx > 0 ? 1 : -1;
    var T0 = { stampfprep: 56, buecken: 200, kruecke: 40, telefon: 220, gehen: 150,
               ragebait: 200, bumerang: 44 };
    this.go(next, T0[next]);
    if (next === 'gehen') {
      // Er geht dahin, wo Yusuf ist — aber nie in die Tribuenen
      var ziel = g.player.cx();
      this.zielX = Math.max(ax + 15 * T, Math.min(ax + aw - 15 * T, ziel));
    }
  };

  function dust(g, x, y, col) {
    for (var i = 0; i < 10; i++) {
      g.particles.spawn({ x: x + (Math.random() - 0.5) * 60, y: y, vx: (Math.random() - 0.5) * 2,
                          vy: -Math.random() * 1.4, life: 24, col: col, size: 2, grav: 0.06 });
    }
  }

  /* ---------- Zeichnen ---------- */

  BossRiese.prototype.draw = function (ctx, camX, camY, G) {
    var bx = Math.round(this.cx() - camX), by = Math.round(this.y + this.h - camY);
    var dir = this.facing, i;
    var pose = 'idle', face = 'normal';
    if (this.dead) { pose = 'hurt'; face = 'hurt'; }
    else if (this.state === 'transform' || this.state === 'ragebait') { face = 'rage'; }
    else if (this.state === 'gehen' || this.state === 'huepfen') pose = 'run';
    if (this.flash > 0) face = 'hurt';
    else if (this.rage && face === 'normal') face = 'rage';
    if (!this.muetze && face !== 'hurt') face = 'bare';

    // Schatten, wo der Fuss gleich landet
    if (this.state === 'stampfprep') {
      var sch = this.punkt('schuh');
      ctx.globalAlpha = 0.3 + (this.fussHoch / 46) * 0.4;
      rect(ctx, sch.x - camX - 6, by - 3, sch.w + 12, 4, '#000000');
      ctx.globalAlpha = 1;
      if ((G.tick >> 2) % 2 === 0) {
        F.draw(ctx, '!', sch.x + sch.w / 2 - camX, by - 30, { color: '#ff6a6a', align: 'center', scale: 2 });
      }
    }

    ctx.save();
    ctx.translate(bx, by);
    if (this.lean) ctx.rotate(this.lean * dir);
    if (this.dead) ctx.globalAlpha = Math.max(0.15, 1 - this.deadTimer / 160);
    else if (this.invuln > 0 && (G.tick >> 1) % 2 === 0) ctx.globalAlpha = 0.7;

    // Die Kruecken: rot, lang, links und rechts aufgestuetzt
    var kr = this.state === 'huepfen' || this.state === 'wackeln' ? 0 : this.kruecken;
    for (i = 0; i < kr; i++) {
      var hand = (i === 0) ? 36 : -40;          // vorne / hinten
      var hx = hand * dir;
      ctx.strokeStyle = '#8a8e98'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(hx, -55); ctx.lineTo(hx + dir * (i === 0 ? 14 : -14), 0); ctx.stroke();
      rect(ctx, hx - 5, -64, 10, 8, '#c82a2a');
      rect(ctx, hx - 4, -72, 8, 6, '#ff5a4a');
    }
    // Die Figur selbst: dieselbe wie im Fussball, nur fuenfmal so gross
    var drawY = this.state === 'stolpern' ? 6 : 0;
    P.drawChar(ctx, 'alexg', 0, drawY, {
      pose: pose, face: face, frame: this.anim, flip: dir < 0, scale: RS,
      flash: this.flash > 0 && (G.tick >> 1) % 2 === 0 ? '#ffffff' : null, flashAlpha: 0.7
    });
    // Der gehobene Fuss: ueber dem echten Fuss nochmal gezeichnet
    if (this.fussHoch > 0) {
      rect(ctx, dir * 4 - 18, -this.fussHoch - 12, 36, 12, '#f2f2ee');
      rect(ctx, dir * 4 - 18, -this.fussHoch - 2, 36, 4, '#b8b8b0');
    }
    // Das Handy am Ohr
    if (this.telefon && !this.dead) {
      rect(ctx, dir * 44 - 8, -150, 16, 26, '#141418');
      rect(ctx, dir * 44 - 6, -147, 12, 18, (this.state === 'ragebait') ? '#ff6a6a' : '#6ab0e8');
    }
    ctx.restore();

    // Offene Schwachstelle: pulsierender Rahmen und Name
    if (this.offen && !this.dead) {
      var z = this.punkt(this.offen);
      var puls = (G.tick >> 2) % 2;
      ctx.strokeStyle = puls ? '#ffd257' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.round(z.x - camX) + 0.5, Math.round(z.y - camY) + 0.5, z.w, z.h);
      F.draw(ctx, z.name + '!', z.x + z.w / 2 - camX, z.y - camY - 12,
             { color: '#ffd257', align: 'center', shadow: true });
    }
    // Wo die Kruecken als Bruecke stecken
    if (this.bruecken) {
      for (i = 0; i < this.bruecken.length; i++) {
        var b = this.bruecken[i];
        var blink = b.t < 60 && (G.tick >> 2) % 2 === 0;
        if (blink) continue;
        rect(ctx, b.tx * T - camX, b.ty * T - camY + 5, 48, 6, '#c8ccd4');
        rect(ctx, b.tx * T - camX, b.ty * T - camY + 5, 48, 2, '#ffffff');
        rect(ctx, (b.tx * T + (b.tx * T < G.arena.x + G.arena.w / 2 ? 40 : 0)) - camX, b.ty * T - camY + 2, 8, 12, '#c82a2a');
      }
    }
  };

  /* =====================================================================
     NILS — Professor, Joker, Stirn.
     ===================================================================== */

  function BossNils(tx, ty) {
    this.floorRow = ty;
    this.w = 22; this.h = 62;
    this.x = tx * T; this.y = ty * T - this.h;
    this.vx = 0; this.vy = 0;
    this.facing = -1;
    this.hp = 10; this.maxHp = 10;
    this.phase = 1; this.rage = false; this.genie = false;
    this.state = 'idle'; this.timer = 60;
    this.invuln = 0; this.flash = 0;
    this.dead = false; this.deadTimer = 0;
    this.t0 = 0; this.anim = 0;
    this.grounded = false;
    this.stompY = 34;
    this.open = true;
    this.tafeln = null;               // Quiz-Antworten
    this.frage = null;
    this.fragenDa = [];
    this.blitze = 0;                  // wie oft er gerade gedacht hat
    this.tippGezeigt = false;
    this.chance = 0;                  // Treffer in der aktuellen Gelegenheit (hoechstens zwei)
    this.imKopf = 0;
    this.barName = 'NILS';
    this.barCol = '#8ae0ff';
    this.rageName = 'GENIE-MODUS';
    this.rageCol = '#8ae0ff';
    this.hpAlt = 3;
  }

  BossNils.prototype.cx = function () { return this.x + this.w / 2; };
  BossNils.prototype.go = function (s, t) { this.state = s; this.timer = t; };
  BossNils.prototype.onTransform = function () { this.rage = true; this.genie = true; };

  /** Verwundbar ist er nur, wenn er gerade nicht denkt. */
  BossNils.prototype.verwundbar = function () {
    return this.state === 'verwirrt' || this.state === 'schlaf' || this.state === 'ueberhitzt';
  };

  BossNils.prototype.update = function (g) {
    this.t0++;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
    if (this.dead) { K.death(this, g, '#8ae0ff'); return; }

    var p = g.player, dx = p.cx() - this.cx();
    var spd = this.phase >= 3 ? 1.3 : (this.genie ? 1.15 : 1);
    var ax = g.arena.x, aw = g.arena.w, i;
    this.timer--;
    K.rageSparks(this, g);

    // Er weiss es. Immer. Schon vorher.
    if (p.hurtTimer === 39 && this.state !== 'transform') {
      g.floats.add(this.cx(), this.y - 16, rnd(['ICH WUSSTE ES.', 'ICH WEISS. ICH WEISS.', 'STAND IN MEINEM KOPF.']), '#8ae0ff', 60);
    }

    switch (this.state) {
      case 'transform':
        if (this.timer === 90) g.floats.add(this.cx(), this.y - 16, 'MOMENT. ICH DENKE NACH.', '#8ae0ff', 80);
        if (K.tickTransform(this, g, 'GENIE-MODUS!', this.rageCol)) {
          this.go('idle', 20);
          this.phase = 2;
          g.onNilsPhase(2);
        }
        break;

      case 'idle':
        this.vx *= 0.8;
        this.facing = dx > 0 ? 1 : -1;
        if (this.timer <= 0) this.pick(g);
        break;

      // Haende hinter dem Ruecken, auf und ab. Wie in der Vorlesung.
      case 'gehen':
        this.vx = this.facing * 1.1 * spd;
        if (this.timer <= 0) this.go('idle', 20);
        break;

      /* ----- Quiz: richtig beantworten = er ist verwirrt ----- */
      case 'quiz':
        this.vx *= 0.7;
        if (!this.tafeln) this.stelleFrage(g);
        for (i = 0; i < this.tafeln.length; i++) {
          var tf = this.tafeln[i];
          if (tf.pop > 0) tf.pop--;
          if (!p.dead && overlap(p, tf)) { this.antwort(g, tf); break; }
        }
        if (this.state === 'quiz' && this.timer <= 0) {
          this.tafeln = null; this.frage = null;
          g.floats.add(this.cx(), this.y - 16, 'ZEIT UM. ES WAR IN MEINEM KOPF.', '#8ae0ff', 90);
          this.go('strafe', 110);
        }
        break;

      // Falsch oder zu langsam: Buecher von oben
      case 'strafe':
        this.vx *= 0.7;
        if (this.timer % 10 === 0) K.rainFromSky(g, 'buch', 1.6);
        if (this.timer <= 0) this.go('idle', 20);
        break;

      case 'verwirrt':
        this.vx *= 0.7;
        if (this.t0 % 8 === 0) {
          g.particles.spawn({ x: this.cx() + Math.cos(this.t0 * 0.2) * 14, y: this.y - 6 + Math.sin(this.t0 * 0.2) * 4,
                              vx: 0, vy: -0.2, life: 16, col: '#ffd257', size: 2, grav: 0 });
        }
        if (this.timer <= 0) this.go('idle', 20);
        break;

      /* ----- Nachmachen: er spiegelt Yusuf. Auch das Einschlafen. ----- */
      case 'nachmachen':
        var mitte = ax + aw / 2;
        var soll = mitte + (mitte - p.cx()) - this.w / 2;
        soll = Math.max(ax + 2 * T, Math.min(ax + aw - 2 * T - this.w, soll));
        this.vx = Math.max(-4, Math.min(4, (soll - this.x) * 0.2));
        this.facing = p.facing * -1;
        if (p.vy < -6 && this.grounded) this.vy = -9.4;
        if (this.timer % 70 === 0) g.floats.add(this.cx(), this.y - 16, rnd(['HÖ HÖ HÖÖÖ.', 'ICH BIN YUSUF.', 'KRRRRR.', 'ICH HAB KEINEN HUNGER.']), '#ffc23c', 60);
        if (!this.tippGezeigt && this.timer === 250) {
          this.tippGezeigt = true;
          g.floats.add(p.cx(), p.y - 24, 'ER MACHT ALLES NACH. AUCH NICKERCHEN?', '#ffd257', 120);
        }
        if (p.idle > 110 && p.grounded) {
          this.vx = 0;
          g.floats.add(this.cx(), this.y - 16, '...DAS MACH ICH AUCH NACH. ZZZ.', '#8ae0ff', 80);
          S().play('snore');
          this.chance = 0;
          this.go('schlaf', 200);
        } else if (this.timer <= 0) this.go('idle', 20);
        break;

      case 'schlaf':
        this.vx = 0;
        if (this.t0 % 40 === 0) {
          g.particles.spawn({ x: this.cx() + 6, y: this.y - 4, vx: 0.3, vy: -0.5, life: 60,
                              col: '#cfc0ff', size: 3, grav: -0.01, text: 'Z' });
        }
        if (this.timer <= 0) {
          g.floats.add(this.cx(), this.y - 16, 'HAB NUR GEBLINZELT.', '#8ae0ff', 70);
          this.go('idle', 16);
        }
        break;

      /* ----- Angriffe ----- */
      case 'buecher':
        this.vx *= 0.7;
        if (this.timer === 18) {
          var nb = this.genie ? 5 : 3;
          for (i = 0; i < nb; i++) {
            g.addProjectile('buch', this.cx() - 5, this.y + 10,
                            Math.sign(dx || 1) * (1.6 + i * 0.9) * spd, -5.4 + i * 0.3);
          }
          S().play('shoot');
          g.floats.add(this.cx(), this.y - 16, rnd(['LIES MAL WAS!', 'PFLICHTLEKTÜRE!', 'BAND ZWEI!']), '#8ae0ff', 55);
        }
        if (this.timer <= 0) this.go('idle', 22);
        break;

      case 'karten':
        this.vx *= 0.7;
        if (this.timer === 20 || (this.genie && this.timer === 8)) {
          for (i = 0; i < 5; i++) {
            var a = (i - 2) * 0.22;
            var dirx = Math.sign(dx || 1);
            g.addProjectile('karte', this.cx() - 4, this.y + 18,
                            dirx * Math.cos(a) * 4.6 * spd, Math.sin(a) * 4.6);
          }
          S().play('shoot');
          if (this.timer === 20) g.floats.add(this.cx(), this.y - 16, 'WARUM SO ERNST?', '#8ae0ff', 60);
        }
        if (this.timer <= 0) this.go('idle', 22);
        break;

      // Die Stirn leuchtet ... dann schlaegt es ein, wo Yusuf steht
      case 'blitzprep':
        this.vx = 0;
        if (this.timer === 44) g.floats.add(this.cx(), this.y - 16, 'GEDANKENBLITZ!', '#8ae0ff', 60);
        if (this.timer <= 0) {
          var ziele = [p.cx()];
          if (this.genie) ziele.push(p.cx() + p.vx * 34);        // er ahnt, wohin du laeufst
          for (i = 0; i < ziele.length; i++) {
            var zx = Math.max(ax + 20, Math.min(ax + aw - 20, ziele[i]));
            var bl = g.addProjectile('blitz', zx - 9, this.floorRow * T - 40 * 5, 0, 0);
            if (bl) { bl.h = 40 * 5; }
          }
          this.blitze++;
          this.go('idle', 36);
          if (this.genie && this.blitze >= 2) {
            this.blitze = 0;
            this.chance = 0;
            this.go('ueberhitzt', 150);
            g.floats.add(this.cx(), this.y - 16, 'ZU VIEL GEDACHT. STIRN ZU HEISS.', '#ff8a8a', 90);
          }
        }
        break;

      case 'ueberhitzt':
        this.vx = 0;
        if (this.t0 % 5 === 0) {
          g.particles.spawn({ x: this.cx() + (Math.random() - 0.5) * 16, y: this.y - 2, vx: 0, vy: -1,
                              life: 30, col: '#e8e8f0', size: 3, grav: -0.02 });
        }
        if (this.timer <= 0) this.go('idle', 20);
        break;

      // Genie-Modus: Formeln regnen
      case 'formeln':
        this.vx *= 0.7;
        if (this.timer % 14 === 0 && this.timer < 90) {
          var fm = rnd(['E=MC2', '2+2=5', 'X', 'PI', '%', 'A+B', '1:0', '?']);
          var vw = g.viewW ? g.viewW() : 512;
          var fx = g.cam.x + 20 + Math.random() * (vw - 40 - fm.length * 6);
          var fw = g.addProjectile('wort', fx, g.cameraTopY(), 0, 1.4);
          if (fw) { fw.text = fm; fw.w = fm.length * 6; fw.col = '#8ae0ff'; }
        }
        if (this.timer === 96) g.floats.add(this.cx(), this.y - 16, 'ICH RECHNE DAS MAL KURZ DURCH.', '#8ae0ff', 70);
        if (this.timer <= 0) this.go('idle', 20);
        break;
    }

    K.move(this, g);
    this.animT = (this.animT || 0) + 1;
    if (this.animT > (this.state === 'nachmachen' || this.state === 'gehen' ? 6 : 12)) { this.animT = 0; this.anim++; }

    this.open = true;
    this.kontakt(g, p);
  };

  /** Draufspringen: nur, wenn er gerade nicht nachdenkt. Sonst weiss er es. */
  BossNils.prototype.kontakt = function (g, p) {
    if (p.dead || this.invuln > 0 || this.state === 'transform' || !overlap(this, p)) return;
    var stomp = vonOben(p) && (p.feet() - this.y) < this.stompY;
    if (!stomp) return;
    if (this.verwundbar()) {
      this.hit(g, p.pound === -1 ? K.POUND_BOSS_DMG : 1, p);
    } else {
      p.vy = -7.5; p.jumpsLeft = 1;
      this.invuln = 20;
      if (this.imKopf <= 0) {
        this.imKopf = 1;
        g.floats.add(this.cx(), this.y - 16, 'ICH WEISS, DASS DU DAS VERSUCHST.', '#8ae0ff', 70);
      } else {
        g.floats.add(this.cx(), this.y - 16, rnd(['ICH WEISS. ICH WEISS. ICH WEISS.', 'STAND SCHON IN MEINEM KOPF.', 'NETTER VERSUCH. VORHERSEHBAR.']), '#8ae0ff', 60);
      }
    }
  };

  BossNils.prototype.hit = function (g, dmg, p) {
    if (this.invuln > 0 || this.dead || this.state === 'transform') return;
    // Faeuste und Stampfer zaehlen nur, wenn er gerade nicht denkt
    if (!this.verwundbar()) {
      g.floats.add(this.cx(), this.y - 16, 'ABGEWEHRT. MIT LOGIK.', '#8ae0ff', 50);
      this.invuln = 16;
      return;
    }
    var war = this.state, rest = this.timer;
    this.hp -= dmg;
    K.bounce(this, g, p, '#8ae0ff', dmg);
    // Hoechstens zwei Treffer pro Gelegenheit, dann ist er wieder wach
    this.chance++;
    if (this.chance < 2 && rest > 50) { this.state = war; this.timer = rest; this.invuln = 30; }
    else { this.chance = 0; this.go('idle', 30); }
    g.floats.add(this.cx(), this.y - 20, rnd(['DAS STAND NICHT IM BUCH!', 'AUA. UNLOGISCH.', 'MEINE STIRN!']), '#ff8a8a', 60);
    if (this.hp <= 0) {
      this.dead = true; this.deadTimer = 0; this.vy = -7;
      this.tafeln = null; this.frage = null;
      g.shake(10, 42);
      S().play('bossRoar');
      g.onNilsDead();
      return;
    }
    if (!this.rage && this.hp <= this.maxHp / 2) {
      this.tafeln = null; this.frage = null;
      K.startTransform(this, g);
      return;
    }
    if (this.rage && this.phase < 3 && this.hp <= Math.ceil(this.maxHp / 4)) {
      this.phase = 3;
      g.onNilsPhase(3);
    }
  };

  /** Eine Frage stellen und die Antworttafeln verteilen. */
  BossNils.prototype.stelleFrage = function (g) {
    var pool = this.genie ? (global.Levels.nilsQuiz2 || []) : (global.Levels.nilsQuiz || []);
    var frei = [];
    for (var i = 0; i < pool.length; i++) if (this.fragenDa.indexOf(pool[i].f) < 0) frei.push(pool[i]);
    if (!frei.length) { this.fragenDa = []; frei = pool.slice(); }
    var q = rnd(frei);
    this.fragenDa.push(q.f);
    this.frage = q.f;
    // Reihenfolge mischen, die richtige merken
    var antw = q.a.map(function (t, k) { return { text: t, richtig: k === 0 }; });
    for (i = antw.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0, tmp = antw[i]; antw[i] = antw[j]; antw[j] = tmp;
    }
    var ax = g.arena.x, aw = g.arena.w, n = antw.length;
    var yy = [9, 7, 9, 7];
    this.tafeln = antw.map(function (a, k) {
      var w = Math.max(44, a.text.length * 6 + 12);
      var cx = ax + aw * (k + 1) / (n + 1);
      return { x: cx - w / 2, y: yy[k] * T - 4, w: w, h: 22, text: a.text, richtig: a.richtig,
               buchst: 'ABCD'.charAt(k), pop: 12 };
    });
    S().play('select');
    g.floats.add(this.cx(), this.y - 16, 'QUIZ! SPRING IN DIE RICHTIGE ANTWORT.', '#8ae0ff', 110);
  };

  BossNils.prototype.antwort = function (g, tf) {
    var p = g.player;
    this.tafeln = null; this.frage = null;
    if (p.vy < 0) p.vy = 2;
    if (tf.richtig) {
      S().play('oneUp');
      g.floats.add(tf.x + tf.w / 2, tf.y - 12, 'RICHTIG!', '#8cd85a', 70);
      g.floats.add(this.cx(), this.y - 16, rnd(['WIE... WOHER WEISST DU DAS?', 'DAS... DAS STAND IN MEINEM KOPF!', 'UNMÖGLICH. DU HAST GERATEN.']), '#8ae0ff', 90);
      this.chance = 0;
      this.go('verwirrt', this.genie ? 150 : 180);
    } else {
      S().play('hurt');
      g.floats.add(tf.x + tf.w / 2, tf.y - 12, 'FALSCH!', '#ff6a6a', 70);
      g.floats.add(this.cx(), this.y - 16, 'ICH WEISS. ICH WEISS. ES WAR IN MEINEM KOPF.', '#8ae0ff', 90);
      this.go('strafe', 110);
    }
  };

  BossNils.prototype.pick = function (g) {
    var r = Math.random(), next;
    if (!this.genie) {
      if (r < 0.26) next = 'quiz';
      else if (r < 0.46) next = 'nachmachen';
      else if (r < 0.64) next = 'buecher';
      else if (r < 0.80) next = 'karten';
      else if (r < 0.92) next = 'blitzprep';
      else next = 'gehen';
    } else {
      if (r < 0.24) next = 'quiz';
      else if (r < 0.40) next = 'nachmachen';
      else if (r < 0.58) next = 'blitzprep';
      else if (r < 0.72) next = 'formeln';
      else if (r < 0.86) next = 'karten';
      else next = 'buecher';
    }
    // Nie zweimal dasselbe
    if (next === this.last) next = (next === 'quiz') ? 'buecher' : 'quiz';
    this.last = next;
    var T0 = { quiz: 560, nachmachen: 500, buecher: 30, karten: 32, blitzprep: 50,
               gehen: 60, formeln: 110 };
    this.go(next, T0[next]);
  };

  /* ---------- Zeichnen ---------- */

  BossNils.prototype.draw = function (ctx, camX, camY, G) {
    var px = Math.round(this.cx() - camX), py = Math.round(this.y + this.h - camY);
    var pose = 'idle', face = 'normal';
    if (this.dead) { pose = 'hurt'; face = 'hurt'; }
    else if (this.state === 'transform') { pose = 'cheer'; face = 'laugh'; }
    else if (this.state === 'schlaf') { pose = 'sleep'; face = 'sleep'; }
    else if (this.state === 'verwirrt' || this.state === 'ueberhitzt') { face = 'hurt'; }
    else if (this.state === 'nachmachen') {
      var pp = G.player.pose();
      pose = pp.pose; face = 'laugh';
    }
    else if (this.state === 'gehen') pose = 'run';
    else if (!this.grounded) pose = this.vy < 0 ? 'jump' : 'fall';
    else if (this.state === 'buecher' || this.state === 'karten' || this.state === 'formeln' || this.state === 'quiz') {
      pose = 'cheer'; face = 'laugh';
    }
    if (this.flash > 0) face = 'hurt';
    var who = this.genie ? 'nils_genie' : 'nils';
    var o = { pose: pose, face: face, frame: this.anim, flip: this.facing < 0, scale: 2 };
    if (this.rage && !this.dead) {
      ctx.globalAlpha = 0.35;
      P.drawChar(ctx, who, px, py + 1, { pose: pose, face: face, frame: this.anim, flip: this.facing < 0,
                                          scale: 2, flash: this.rageCol, flashAlpha: 1 });
      ctx.globalAlpha = 1;
    }
    if (this.dead) o.alpha = Math.max(0.2, 1 - this.deadTimer / 160);
    if (this.flash > 0 && (G.tick >> 1) % 2 === 0) { o.flash = '#ffffff'; o.flashAlpha = 0.8; }
    if (this.invuln > 0 && (G.tick >> 1) % 2 === 0 && !this.dead) o.alpha = 0.6;
    P.drawChar(ctx, who, px, py, o);

    // Die Stirn leuchtet, wenn er denkt
    var kopfY = py - (this.genie ? 62 : 54);
    if (this.state === 'blitzprep' && !this.dead) {
      ctx.globalAlpha = 0.3 + ((G.tick >> 2) % 2) * 0.3;
      ctx.fillStyle = '#8ae0ff';
      ctx.beginPath(); ctx.arc(px + (this.facing < 0 ? -2 : 2), kopfY, this.genie ? 22 : 16, 0, 6.3); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (this.verwundbar() && !this.dead && (G.tick >> 3) % 2 === 0) {
      F.draw(ctx, 'JETZT! STIRN!', px, kopfY - 30, { color: '#ffd257', align: 'center', shadow: true });
    }
    if (this.state === 'nachmachen' && !this.dead) {
      F.draw(ctx, 'NACHMACHEN', px, kopfY - 30, { color: '#ffc23c', align: 'center', shadow: true });
    }
    if (this.state === 'blitzprep' && !this.dead && (G.tick >> 2) % 2 === 0) {
      F.draw(ctx, '!', px, kopfY - 34, { color: '#ff6a6a', align: 'center', scale: 2 });
    }

    // Quiz: Tafel oben, Antworten in der Luft
    if (this.frage && !this.dead) {
      var bw = Math.min(480, Math.max(200, this.frage.length * 6 + 24)), bx = (G.viewW() - bw) / 2;
      rect(ctx, bx - 3, 36, bw + 6, 32, '#5a3a1e');
      rect(ctx, bx, 39, bw, 26, '#1e3a2a');
      F.draw(ctx, 'FRAGE:', bx + 8, 43, { color: '#8ae0ff' });
      F.draw(ctx, this.frage, bx + 8, 54, { color: '#f4f4ee' });
      var rest = Math.max(0, Math.ceil(this.timer / 60));
      F.draw(ctx, '' + rest, bx + bw - 8, 43, { color: rest <= 3 ? '#ff6a6a' : '#ffd257', align: 'right' });
    }
    if (this.tafeln && !this.dead) {
      for (var i = 0; i < this.tafeln.length; i++) {
        var t = this.tafeln[i];
        var tx = Math.round(t.x - camX), ty = Math.round(t.y - camY - (t.pop || 0));
        rect(ctx, tx - 2, ty - 2, t.w + 4, t.h + 4, '#141018');
        rect(ctx, tx, ty, t.w, t.h, '#f4f0e0');
        rect(ctx, tx, ty, t.w, 3, '#ffffff');
        F.draw(ctx, t.buchst, tx + 4, ty + 3, { color: '#b8282e' });
        F.draw(ctx, t.text, tx + t.w / 2, ty + 12, { color: '#141018', align: 'center' });
      }
    }
  };

  E.BossRiese = BossRiese;
  E.BossNils = BossNils;

})(window);
