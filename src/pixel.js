/* =====================================================================
   pixel.js — Sprite-Engine + die beiden Balci-Brüder.
   Jedes Pixel hier ist von Hand gesetzt. Keine Bilddateien, nichts
   heruntergeladen. Die Figuren bestehen aus Einzelteilen (Kopf, Rumpf,
   Arm, Bein), damit sie sich richtig bewegen statt nur zu ruckeln.

   Yusuf:   volle dunkle Locken, Schnurrbart, grüne Augen,
            helle Jeansjacke über weissem Pulli, kräftige Statur.
   Huseyin: gleiche Familie, aber Fade-Schnitt, Vollbart,
            schwarze Lederjacke mit Silberkette, schmal.
   ===================================================================== */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------
     Kern: Art-Strings -> gebackene Canvas-Sprites
     --------------------------------------------------------------- */

  var palettes = {};
  var sprites = {};

  /** Template-String zu sauberem Zeilen-Array (gleiche Länge). */
  function art(str) {
    var rows = String(str).split('\n');
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i].replace(/\s+$/, '').replace(/^[ \t]+/, '');
      if (r.length) out.push(r);
    }
    var w = 0, j;
    for (j = 0; j < out.length; j++) w = Math.max(w, out[j].length);
    for (j = 0; j < out.length; j++) {
      while (out[j].length < w) out[j] += '.';
    }
    return out;
  }

  function palette(name, map) { palettes[name] = map; return map; }

  function hexToRGBA(hex) {
    if (!hex || hex === '.') return null;
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var a = 255;
    if (h.length === 8) { a = parseInt(h.substr(6, 2), 16); h = h.substr(0, 6); }
    return [
      parseInt(h.substr(0, 2), 16),
      parseInt(h.substr(2, 2), 16),
      parseInt(h.substr(4, 2), 16),
      a
    ];
  }

  function bake(rows, pal) {
    var h = rows.length, w = rows[0].length;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    var img = ctx.createImageData(w, h);
    var data = img.data;
    var cache = {};

    for (var y = 0; y < h; y++) {
      var row = rows[y];
      for (var x = 0; x < w; x++) {
        var ch = row.charAt(x);
        if (ch === '.' || ch === ' ' || ch === undefined) continue;
        var col = cache[ch];
        if (col === undefined) { col = hexToRGBA(pal[ch]); cache[ch] = col; }
        if (!col) continue;
        var p = (y * w + x) * 4;
        data[p] = col[0]; data[p + 1] = col[1]; data[p + 2] = col[2]; data[p + 3] = col[3];
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  function mirror(src) {
    var c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    var x = c.getContext('2d');
    x.translate(src.width, 0); x.scale(-1, 1);
    x.drawImage(src, 0, 0);
    return c;
  }

  /** Verdunkelte Kopie — für hintere Arme/Beine (Tiefenwirkung). */
  function darken(src, amount) {
    var c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    var x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(20,10,30,' + amount + ')';
    x.fillRect(0, 0, c.width, c.height);
    return c;
  }

  /** Vollflächig eingefärbte Silhouette — für Treffer-Blitze. */
  function silhouette(src, color) {
    var c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    var x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    return c;
  }

  function def(name, rowsOrStr, palName) {
    var rows = (typeof rowsOrStr === 'string') ? art(rowsOrStr) : rowsOrStr;
    var pal = palettes[palName] || palName || palettes.main;
    var c = bake(rows, pal);
    var s = { name: name, w: c.width, h: c.height, c: c, f: null, d: null, df: null, white: null };
    sprites[name] = s;
    return s;
  }

  function get(name) {
    var s = sprites[name];
    if (!s) throw new Error('Sprite fehlt: ' + name);
    return s;
  }

  function flipped(s) { if (!s.f) s.f = mirror(s.c); return s.f; }
  function dark(s) { if (!s.d) s.d = darken(s.c, 0.33); return s.d; }
  function darkFlipped(s) { if (!s.df) s.df = mirror(dark(s)); return s.df; }
  function white(s) { if (!s.white) s.white = silhouette(s.c, '#ffffff'); return s.white; }

  function draw(ctx, name, x, y, flip, back) {
    var s = get(name);
    var img = back ? (flip ? darkFlipped(s) : dark(s)) : (flip ? flipped(s) : s.c);
    ctx.drawImage(img, Math.round(x), Math.round(y));
  }

  function drawWhite(ctx, name, x, y, flip) {
    var s = get(name);
    var img = white(s);
    if (flip) {
      ctx.save();
      ctx.translate(Math.round(x) + s.w, Math.round(y));
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    } else ctx.drawImage(img, Math.round(x), Math.round(y));
  }

  /* ---------------------------------------------------------------
     Paletten
     --------------------------------------------------------------- */

  palette('yusuf', {
    k: '#1b1220', // Outline
    h: '#2f1d12', // dunkle Locken
    H: '#4a301c', // Locken-Glanz
    s: '#f0b487', // Haut
    d: '#ce8f66', // Haut-Schatten
    w: '#ffffff', // Augenweiß
    g: '#3ad368', // GRÜNE Augen
    G: '#1d7d3c',
    m: '#8e2f2c', // Mund
    t: '#ff8e96', // Zunge
    r: '#a8c6e4', // Jeansjacke hell
    R: '#7699bd', // Jeansjacke dunkel
    y: '#f2f1ea', // weisser Pulli
    Y: '#d6d4cb',
    b: '#4a6fa8', // Jeans
    B: '#33507d',
    n: '#dedad2', // Sneaker
    N: '#9d998f',
    c: '#f4f2ec', // Zigarettenpapier
    o: '#ff8a2a'  // Glut
  });

  palette('huseyin', {
    k: '#140f1c',
    h: '#241610', // sehr dunkle Locken oben
    H: '#3d2718',
    j: '#5a4232', // Bart / rasierte Seiten
    s: '#eab488',
    d: '#c78c62',
    w: '#ffffff',
    g: '#3ad368', // gleiche grüne Augen — ist ja der Bruder
    G: '#1d7d3c',
    m: '#7d2724',
    t: '#ff8e96',
    r: '#33323c', // Lederjacke
    R: '#1d1d24',
    y: '#cfd4e0', // Silberkette
    Y: '#f2f4fa',
    b: '#22222b', // dunkle Hose
    B: '#141419',
    n: '#e4e4ea', // weisse Sneaker
    N: '#a6a6b0'
  });

  /* ---------------------------------------------------------------
     YUSUF — Kopf (14 x 13). Volle Locken, Schnurrbart, grüne Augen.
     --------------------------------------------------------------- */

  var Y_HEAD = `
    ....kkkkkk....
    ..kkhhhhhhkk..
    .khhHhhhhhHhhk
    khhhhhhhhhhhhk
    khhssssssssHhk
    khssssssssssdk
    khsgwsssswgsdk
    khssssdsssssdk
    khsssHHHHsssdk
    khsskmmmmksddk
    kdssssssssssdk
    .kddddddddddk.
    ..kddddddddk..
  `;

  // Sein Lachen ist... speziell. HÖ HÖ HÖÖÖ.
  var Y_HEAD_LAUGH = `
    ....kkkkkk....
    ..kkhhhhhhkk..
    .khhHhhhhhHhhk
    khhhhhhhhhhhhk
    khhssssssssHhk
    khssssssssssdk
    khskksssskksdk
    khssssdsssssdk
    khsssHHHHsssdk
    khskmmmmmmksdk
    kdkmtttttttmkd
    .kdkmmmmmmmkd.
    ..kddddddddk..
  `;

  var Y_HEAD_HURT = `
    ....kkkkkk....
    ..kkhhhhhhkk..
    .khhHhhhhhHhhk
    khhhhhhhhhhhhk
    khhssssssssHhk
    khssssssssssdk
    khskskssksksdk
    khssssdsssssdk
    khsssHHHHsssdk
    khssskmmksssdk
    kdssskmmksssdk
    .kddddddddddk.
    ..kddddddddk..
  `;

  // Yusufs Lieblingszustand.
  var Y_HEAD_SLEEP = `
    ....kkkkkk....
    ..kkhhhhhhkk..
    .khhHhhhhhHhhk
    khhhhhhhhhhhhk
    khhssssssssHhk
    khssssssssssdk
    khskksssskksdk
    khssssdsssssdk
    khsssHHHHsssdk
    khsssskmmkssdk
    kdsssskmmkssdk
    .kddddddddddk.
    ..kddddddddk..
  `;

  // Backen voll. Kauen ist ein Vollzeitjob.
  var Y_HEAD_EAT = `
    ....kkkkkk....
    ..kkhhhhhhkk..
    .khhHhhhhhHhhk
    khhhhhhhhhhhhk
    khhssssssssHhk
    khssssssssssdk
    khskkssssgwsdk
    khssssdsssssdk
    khsdsHHHHsdsdk
    khsdkmmmmkdsdk
    kdsddssssddsdk
    .kddddddddddk.
    ..kddddddddk..
  `;

  // Das tiefe Goblin-Knurren. KRRRRR.
  var Y_HEAD_GROWL = `
    ....kkkkkk....
    ..kkhhhhhhkk..
    .khhHhhhhhHhhk
    khhhhhhhhhhhhk
    khhssssssssHhk
    khkkssssskkhdk
    khsgwsssswgsdk
    khssssdsssssdk
    khsssHHHHsssdk
    khkmmmmmmmmkdk
    kdkmwwwwwwmkdk
    .kdkmmmmmmkdk.
    ..kddddddddk..
  `;

  // Mit Kippe im Mundwinkel.
  var Y_HEAD_SMOKE = `
    ....kkkkkk....
    ..kkhhhhhhkk..
    .khhHhhhhhHhhk
    khhhhhhhhhhhhk
    khhssssssssHhk
    khssssssssssdk
    khsgwsssswgsdk
    khssssdsssssdk
    khsssHHHHsssdk
    khsskmmkcccok.
    kdssssssssssdk
    .kddddddddddk.
    ..kddddddddk..
  `;

  /* ---------------------------------------------------------------
     HUSEYIN — Kopf (14 x 13). Fade an den Seiten, Vollbart.
     --------------------------------------------------------------- */

  var H_HEAD = `
    ....kkkkkk....
    ...khhhhhhk...
    ..khhhhhhhhk..
    .khhHhhhhHhhk.
    .kjhhhhhhhhjk.
    .kjssssssssjk.
    .kjsgwsswgsjk.
    .kjsssdssssjk.
    .kjssHHHHssjk.
    .kjjskmmksjjk.
    ..kjjssssjjk..
    ...kjjjjjjk...
    .....kddk.....
  `;

  var H_HEAD_ANGRY = `
    ....kkkkkk....
    ...khhhhhhk...
    ..khhhhhhhhk..
    .khhHhhhhHhhk.
    .kjhhhhhhhhjk.
    .kjskssssksjk.
    .kjsgwsswgsjk.
    .kjsssdssssjk.
    .kjssHHHHssjk.
    .kjjkmmmmkjjk.
    ..kjjmmmmjjk..
    ...kjjjjjjk...
    .....kddk.....
  `;

  var H_HEAD_HURT = `
    ....kkkkkk....
    ...khhhhhhk...
    ..khhhhhhhhk..
    .khhHhhhhHhhk.
    .kjhhhhhhhhjk.
    .kjssssssssjk.
    .kjskskskssjk.
    .kjsssdssssjk.
    .kjssHHHHssjk.
    .kjjskmmksjjk.
    ..kjjskmksjk..
    ...kjjjjjjk...
    .....kddk.....
  `;

  /* ---------------------------------------------------------------
     RÜMPFE
     --------------------------------------------------------------- */

  // Yusuf: 20 breit. Schmale Schultern, runder Bauch.
  // Offene Jeansjacke, weisser Pulli spannt darunter.
  var TORSO_FAT = `
    ...kkkkkkkkkkkkkk...
    ..krrrrrrrrrrrrrrk..
    ..krrrryyyyyyrrrrk..
    .krrrryyyyyyyyrrrrk.
    .krrryyyyyyyyyyrrrk.
    krrryyyyyyyyyyyyrrrk
    krrryyyyyyyyyyyyrrrk
    krRryyyyyyyyyyyyrRrk
    kRrryyyyyyyyyyyyrrRk
    kRRryyyyyyyyyyyyrRRk
    .kYyyyyyyyyyyyyyYk..
    ..kYYYYYYYYYYYYYk...
  `;

  // Huseyin: 8 breit. Lederjacke, Silberkette, kein Gramm zu viel.
  var TORSO_THIN = `
    ..kkkk..
    .krrrrk.
    krrRRrrk
    krRyyRrk
    krRRRRrk
    krRRRRrk
    krRRRRrk
    kRRRRRRk
    kRRRRRRk
    .kRRRRk.
    .kdssdk.
    ..kkkk..
  `;

  /* ---------------------------------------------------------------
     ARME & BEINE
     --------------------------------------------------------------- */

  var ARM_FAT = `
    .kkkk.
    krrrrk
    krrrrk
    kRRRRk
    .kssk.
    kssddk
    kssddk
    .kkkk.
  `;

  var ARM_THIN = `
    .kk.
    krrk
    krrk
    kRRk
    .kk.
    .ksk
    ksdk
    ksdk
    .kk.
  `;

  var LEG_FAT = `
    .kkkkk.
    kbbbbbk
    kbbbbbk
    kbBBBbk
    kbbbbbk
    .kbbbk.
    knnnnnk
    kNNNNNk
  `;

  var LEG_THIN = `
    .kk.
    kbbk
    kbbk
    kBBk
    kbbk
    .kk.
    .kk.
    knnk
    kNNk
  `;

  def('y_head', Y_HEAD, 'yusuf');
  def('y_head_laugh', Y_HEAD_LAUGH, 'yusuf');
  def('y_head_hurt', Y_HEAD_HURT, 'yusuf');
  def('y_head_sleep', Y_HEAD_SLEEP, 'yusuf');
  def('y_head_eat', Y_HEAD_EAT, 'yusuf');
  def('y_head_growl', Y_HEAD_GROWL, 'yusuf');
  def('y_head_smoke', Y_HEAD_SMOKE, 'yusuf');
  def('y_torso', TORSO_FAT, 'yusuf');
  def('y_arm', ARM_FAT, 'yusuf');
  def('y_leg', LEG_FAT, 'yusuf');

  def('h_head', H_HEAD, 'huseyin');
  def('h_head_angry', H_HEAD_ANGRY, 'huseyin');
  def('h_head_hurt', H_HEAD_HURT, 'huseyin');
  def('h_torso', TORSO_THIN, 'huseyin');
  def('h_arm', ARM_THIN, 'huseyin');
  def('h_leg', LEG_THIN, 'huseyin');

  /* ---------------------------------------------------------------
     Figuren-Konfiguration & Posen
     --------------------------------------------------------------- */

  var CHARS = {
    yusuf: {
      heads: { normal: 'y_head', laugh: 'y_head_laugh', hurt: 'y_head_hurt',
               sleep: 'y_head_sleep', eat: 'y_head_eat',
               growl: 'y_head_growl', smoke: 'y_head_smoke' },
      torso: 'y_torso', arm: 'y_arm', leg: 'y_leg',
      headOX: 3, headOY: -11,
      armBackOX: -4, armFrontOX: 18, armOY: 2,
      legLOX: 2, legROX: 11, legOY: 10,
      footY: 18,
      height: 29, width: 20
    },
    huseyin: {
      heads: { normal: 'h_head', laugh: 'h_head_angry', hurt: 'h_head_hurt',
               sleep: 'h_head', eat: 'h_head_angry' },
      torso: 'h_torso', arm: 'h_arm', leg: 'h_leg',
      headOX: -3, headOY: -11,
      armBackOX: -3, armFrontOX: 7, armOY: 2,
      legLOX: 0, legROX: 4, legOY: 10,
      footY: 19,
      height: 30, width: 8
    }
  };

  /* Posen: h=Kopf-Versatz, t=Rumpf-Versatz, l*=Beine, a*=Arme [dx,dy] */
  var POSES = {
    // h ist der Versatz des Kopfes ZUSAETZLICH zum Rumpf (t). Beide auf
    // denselben Wert zu setzen verdoppelt die Bewegung — das sieht aus
    // wie Zittern. Darum bewegt sich hier nur der Rumpf.
    idle: [
      { h: 0, t: 0, lL: [0, 0], lR: [0, 0], aB: [0, 0], aF: [0, 0] },
      { h: 0, t: 1, lL: [0, 0], lR: [0, 0], aB: [0, 1], aF: [0, 1] }
    ],
    run: [
      { h: 0, t: 0, lL: [-2, -1], lR: [3, 0], aB: [2, 1], aF: [-3, 0] },
      { h: 0, t: -1, lL: [0, 0], lR: [1, 0], aB: [0, 0], aF: [0, 0] },
      { h: 0, t: 0, lL: [3, 0], lR: [-2, -1], aB: [-3, 0], aF: [2, 1] },
      { h: 0, t: -1, lL: [1, 0], lR: [0, 0], aB: [0, 0], aF: [0, 0] }
    ],
    jump: [{ h: -1, t: 0, lL: [-1, -2], lR: [2, 1], aB: [1, -3], aF: [-2, -3] }],
    fall: [{ h: 1, t: 0, lL: [-2, 1], lR: [3, -1], aB: [2, -4], aF: [-3, -4] }],
    pound: [{ h: 2, t: 1, lL: [1, -3], lR: [0, -3], aB: [3, 2], aF: [-4, 2] }],
    hurt: [{ h: 0, t: 0, lL: [-3, 0], lR: [4, 0], aB: [3, -3], aF: [-4, -3] }],
    duck: [{ h: 4, t: 4, lL: [0, -3], lR: [0, -3], aB: [2, 2], aF: [-2, 2] }],
    sleep: [
      { h: 3, t: 3, lL: [-1, -3], lR: [1, -3], aB: [3, 3], aF: [-3, 3] },
      { h: 4, t: 3, lL: [-1, -3], lR: [1, -3], aB: [3, 3], aF: [-3, 3] }
    ],
    cheer: [
      { h: -1, t: 0, lL: [0, 0], lR: [0, 0], aB: [2, -6], aF: [-2, -6] },
      { h: 0, t: 1, lL: [0, 0], lR: [0, 0], aB: [1, -4], aF: [-1, -4] }
    ]
  };

  // Ein Scratch-Canvas, damit Spiegeln & Zeichenreihenfolge einfach bleiben.
  var scratch = document.createElement('canvas');
  scratch.width = 64; scratch.height = 64;
  var sctx = scratch.getContext('2d');
  var ORIGIN_X = 32, ORIGIN_Y = 56; // Fußmitte im Scratch-Canvas

  /**
   * Figur zeichnen. (x, y) = Fußmitte in Weltkoordinaten.
   * opts: {pose, frame, face, flip, flash, flashAlpha, alpha, scale}
   */
  function drawChar(ctx, who, x, y, opts) {
    opts = opts || {};
    var cfg = CHARS[who];
    var frames = POSES[opts.pose || 'idle'] || POSES.idle;
    var p = frames[(opts.frame || 0) % frames.length];

    sctx.clearRect(0, 0, 64, 64);

    var tw = get(cfg.torso).w;
    var tx = ORIGIN_X - Math.floor(tw / 2);
    var ty = ORIGIN_Y - cfg.footY + (p.t || 0);

    draw(sctx, cfg.arm, tx + cfg.armBackOX + p.aB[0], ty + cfg.armOY + p.aB[1], false, true);
    draw(sctx, cfg.leg, tx + cfg.legLOX + p.lL[0], ty + cfg.legOY + p.lL[1], false, true);
    draw(sctx, cfg.leg, tx + cfg.legROX + p.lR[0], ty + cfg.legOY + p.lR[1], false, false);
    draw(sctx, cfg.torso, tx, ty, false, false);
    var headName = cfg.heads[opts.face || 'normal'] || cfg.heads.normal;
    draw(sctx, headName, tx + cfg.headOX, ty + cfg.headOY + (p.h || 0), false, false);
    draw(sctx, cfg.arm, tx + cfg.armFrontOX + p.aF[0], ty + cfg.armOY + p.aF[1], false, false);

    if (opts.flash) {
      sctx.save();
      sctx.globalCompositeOperation = 'source-atop';
      sctx.fillStyle = (typeof opts.flash === 'string') ? opts.flash : '#ffffff';
      sctx.globalAlpha = opts.flashAlpha === undefined ? 1 : opts.flashAlpha;
      sctx.fillRect(0, 0, 64, 64);
      sctx.restore();
    }

    ctx.save();
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    var sc = opts.scale || 1;
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(opts.flip ? -sc : sc, sc);
    ctx.drawImage(scratch, -ORIGIN_X, -ORIGIN_Y);
    ctx.restore();
  }

  global.Pixel = {
    art: art, palette: palette, def: def, get: get,
    draw: draw, drawWhite: drawWhite, drawChar: drawChar,
    CHARS: CHARS, POSES: POSES, _sprites: sprites
  };

})(window);
