/* =====================================================================
   levels.js — 5 Level, ein Endgegner und viel zu viele Sprüche.
   Koordinaten sind in Tiles (1 Tile = 16 Pixel).
   ===================================================================== */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------
     Kleiner Level-Baukasten
     --------------------------------------------------------------- */

  function Builder(cfg) {
    this.d = {
      id: cfg.id, name: cfg.name, sub: cfg.sub,
      theme: cfg.theme, music: cfg.music,
      w: cfg.w, h: cfg.h,
      spawn: cfg.spawn || [3, 14],
      solids: [], hazards: [], blocks: [], movers: [],
      enemies: [], items: [], checkpoints: [], signs: [],
      goal: cfg.goal || [cfg.w - 8, 14],
      boss: null,
      intro: cfg.intro || [], outro: cfg.outro || [],
      par: cfg.par || 120,
      diff: cfg.diff || 1,    // Gegner-Tempo; steigt von Level zu Level
      driving: !!cfg.driving, // Level 6: Yusuf sitzt im Mustang
      rescue: cfg.rescue || null
    };
  }

  Builder.prototype = {
    /** Boden: von x0 bis x1 (inklusive), Oberkante top, runter bis zum Rand. */
    g: function (x0, x1, top) {
      this.d.solids.push([x0, top, x1 - x0 + 1, this.d.h - top]);
      return this;
    },
    /** Plattform. */
    p: function (x, y, w, h) {
      this.d.solids.push([x, y, w, h || 1]);
      return this;
    },
    /** Treppe: n Stufen, dir=1 aufwärts nach rechts, -1 abwärts. */
    st: function (x, y, n, dir, depth) {
      for (var i = 0; i < n; i++) {
        var sy = y - (dir > 0 ? i : (n - 1 - i));
        this.d.solids.push([x + i, sy, 1, (depth || 3) + (dir > 0 ? i : (n - 1 - i))]);
      }
      return this;
    },
    /** Wand. */
    wall: function (x, y0, y1, w) {
      this.d.solids.push([x, y0, w || 1, y1 - y0 + 1]);
      return this;
    },
    /** Gefahrenzone (gabel = Gabeln, oel = Fritteusenöl, dressing = Salatdressing). */
    hz: function (x0, x1, y, type) {
      this.d.hazards.push([x0, y, x1 - x0 + 1, 1, type || 'gabel']);
      return this;
    },
    /** Fragezeichen-Block mit Inhalt. */
    q: function (x, y, item, count) {
      this.d.blocks.push({ x: x, y: y, type: 'q', item: item || 'honig', count: count || 1 });
      return this;
    },
    /** Kekskiste — zerbricht beim Bauch-Stampfer oder von unten. */
    k: function (x, y, item) {
      this.d.blocks.push({ x: x, y: y, type: 'kiste', item: item || null });
      return this;
    },
    /** Sprungkissen. */
    sp: function (x, y) {
      this.d.blocks.push({ x: x, y: y, type: 'feder' });
      return this;
    },
    /** Schwebendes Tablett. axis: 'x' oder 'y'. */
    mv: function (x, y, w, axis, range, speed) {
      this.d.movers.push({ x: x, y: y, w: w || 2, axis: axis || 'x',
                           range: range || 4, speed: speed || 0.5 });
      return this;
    },
    /** Gegner. y = Tile, auf dem er steht (fliegende: Flughöhe). */
    e: function (type, x, y, opt) {
      var o = { t: type, x: x, y: y };
      if (opt) for (var kk in opt) o[kk] = opt[kk];
      this.d.enemies.push(o);
      return this;
    },
    /** Mehrere gleiche Gegner auf einer Linie. */
    row: function (type, y, xs) {
      for (var i = 0; i < xs.length; i++) this.e(type, xs[i], y);
      return this;
    },
    /** Item frei in der Luft. */
    it: function (type, x, y) {
      this.d.items.push({ t: type, x: x, y: y });
      return this;
    },
    /** Honig-Spur: n Gläser ab x, Schrittweite dx, optional als Bogen. */
    trail: function (x, y, n, dx, arc) {
      for (var i = 0; i < n; i++) {
        var yy = y;
        if (arc) yy = y - Math.round(Math.sin((i + 0.5) / n * Math.PI) * arc);
        this.it('honig', x + i * (dx || 1), yy);
      }
      return this;
    },
    cp: function (x, y) { this.d.checkpoints.push([x, y]); return this; },
    sign: function (x, y, text) { this.d.signs.push({ x: x, y: y, text: text }); return this; },
    bossAt: function (x, y) { this.d.boss = { x: x, y: y }; return this; },
    out: function () { return this.d; }
  };

  function L(cfg) { return new Builder(cfg); }

  /* ---------------------------------------------------------------
     LEVEL 1 — Aufstehen ist schwer
     --------------------------------------------------------------- */

  var lvl1 = L({
    id: 1, name: 'AUFSTEHEN IST SCHWER', sub: 'YUSUFS ZIMMER, 6:45 UHR',
    theme: 'zimmer', music: 'l1', w: 208, h: 18, spawn: [3, 15], par: 90,
    goal: [199, 15], diff: 0.82,
    intro: [
      ['huseyin', 'YUSUF! AUFSTEHEN! ES IST SCHON 6:45!'],
      ['yusuf', 'NOCH FÜNF MINUTEN. ODER SECHZIG.'],
      ['huseyin', 'ICH WAR SCHON LAUFEN. ZWÖLF KILOMETER.'],
      ['yusuf', 'UND ICH HAB GETRÄUMT. VON DÖNER. GLEICHSTAND.'],
      ['huseyin', 'ICH HABE DEINEN HONIG VERSTECKT. IM GANZEN HAUS.'],
      ['yusuf', '...DU HAST WAS?'],
      ['yusuf', 'HÖ HÖ HÖÖÖ. SCHLECHTE IDEE, BRUDER.']
    ],
    outro: [
      ['yusuf', 'ALLE GLÄSER GEFUNDEN. HÖ HÖ HÖÖÖ.'],
      ['huseyin', 'DAS WAR LEVEL EINS VON FÜNF.'],
      ['yusuf', 'DU HAST DAS DURCHGEPLANT? DU HAST WIRKLICH ZEIT.']
    ]
  });

  lvl1.g(0, 20, 15).g(24, 44, 15).g(48, 58, 14).g(62, 78, 15)
      .g(82, 94, 13).g(98, 110, 15).g(114, 126, 12).g(130, 148, 15)
      .g(152, 162, 14).g(166, 180, 15).g(184, 207, 15);

  // Trittsteine über den Lücken. Wichtig: immer knapp über dem tieferen
  // Boden, sonst hängen sie genau in der Sprungbahn und blockieren sie.
  lvl1.p(21, 13, 3).p(45, 13, 3).p(59, 13, 3).p(79, 13, 3)
      .p(95, 13, 3).p(111, 13, 3).p(127, 13, 3).p(149, 13, 3)
      .p(163, 13, 3).p(181, 13, 3);

  lvl1.p(10, 10, 4).p(34, 9, 4).p(70, 10, 5).p(104, 9, 4).p(140, 8, 5).p(172, 10, 4);

  lvl1.q(14, 11, 'honig', 3).q(30, 11, 'doener').q(66, 11, 'honig', 3)
      .q(102, 10, 'honig', 3).q(136, 11, 'baklava').q(176, 11, 'gold')
      .q(90, 10, 'kippen');

  lvl1.k(38, 12).k(39, 12).k(88, 10, 'honig').k(120, 9).k(121, 9, 'doener');

  lvl1.sp(56, 13).sp(124, 11);

  lvl1.trail(5, 13, 5, 2).trail(25, 13, 6, 2, 2).trail(49, 12, 5, 2, 2)
      .trail(63, 13, 6, 2, 3).trail(83, 11, 5, 2, 2).trail(99, 13, 6, 2, 3)
      .trail(115, 10, 5, 2, 2).trail(131, 13, 7, 2, 3).trail(167, 13, 7, 2, 3)
      .trail(186, 13, 8, 2, 2);

  lvl1.it('herz', 35, 8).it('honig', 11, 9).it('honig', 12, 9)
      .it('honig', 71, 9).it('honig', 72, 9).it('honig', 141, 7).it('honig', 142, 7);

  lvl1.row('wecker', 15, [12, 28, 36, 74, 106, 144, 190, 196])
      .row('wecker', 14, [52, 156])
      .row('wecker', 13, [86, 92])
      .row('wecker', 12, [118])
      .e('biene', 40, 11).e('biene', 90, 9).e('biene', 146, 11).e('biene', 178, 10);

  lvl1.cp(70, 15).cp(140, 15);

  lvl1.sign(6, 15, '6:45 UHR. WER HAT DAS ERFUNDEN?')
      .sign(26, 15, 'SPRINGEN: LEERTASTE ODER PFEIL HOCH.')
      .sign(64, 15, 'IN DER LUFT NOCHMAL SPRINGEN = BAUCH-BOOST.')
      .sign(100, 15, 'RUNTER DRÜCKEN IN DER LUFT = BAUCH-STAMPFER.')
      .sign(168, 15, 'DER WECKER IST NICHT DEIN FREUND.');

  /* ---------------------------------------------------------------
     LEVEL 2 — Bienen haben ein langes Gedächtnis
     --------------------------------------------------------------- */

  var lvl2 = L({
    id: 2, name: 'BIENEN VERGESSEN NICHTS', sub: 'DER GARTEN HINTERM HAUS',
    theme: 'garten', music: 'l2', w: 262, h: 18, spawn: [3, 15], par: 110,
    goal: [256, 15], diff: 1.0,
    intro: [
      ['yusuf', 'DER GARTEN. HIER STEHEN DIE BIENENSTÖCKE.'],
      ['huseyin', 'VIEL SPASS. DIE BIENEN KENNEN DICH NOCH.'],
      ['yusuf', 'WIR HATTEN EINEN KONFLIKT. 2019. ES WAR KOMPLIZIERT.'],
      ['huseyin', 'DU HAST IHNEN 14 GLÄSER GEKLAUT.'],
      ['yusuf', 'ES WAREN 16. ABER WER ZÄHLT SCHON.']
    ],
    outro: [
      ['yusuf', 'VIER STICHE. ACHT GLÄSER. RECHNET SICH.'],
      ['huseyin', 'DAS IST KEIN GESUNDES VERHÄLTNIS, YUSUF.'],
      ['yusuf', 'ES IST EIN HONIG-VERHÄLTNIS.']
    ]
  });

  lvl2.g(0, 18, 15).g(23, 36, 15).g(41, 52, 13).g(57, 70, 15)
      .g(75, 84, 12).g(89, 100, 14).g(105, 118, 15).g(123, 132, 11)
      .g(137, 150, 14).g(155, 168, 15).g(173, 182, 12).g(187, 200, 15)
      .g(201, 229, 15);

  // Boss-Arena: flach, genau eine Bildschirmbreite
  lvl2.g(230, 261, 15);
  lvl2.p(236, 11, 5).p(250, 11, 5);
  lvl2.bossAt(246, 15);
  lvl2.d.bossType = 'mirkan';
  lvl2.d.arena = { x: 230, w: 32 };
  lvl2.q(240, 10, 'doener', 2).it('herz', 243, 9);

  lvl2.p(19, 13, 4).p(37, 13, 4).p(53, 13, 4).p(71, 13, 4)
      .p(85, 12, 4).p(101, 13, 4).p(119, 13, 4).p(133, 12, 4)
      .p(151, 13, 4).p(169, 13, 4).p(183, 13, 4).p(201, 13, 4);

  lvl2.p(8, 10, 5).p(28, 9, 4).p(62, 10, 5).p(94, 9, 4)
      .p(110, 10, 4).p(142, 9, 5).p(160, 10, 4).p(192, 9, 5);

  lvl2.mv(20, 10, 2, 'y', 4, 0.42).mv(54, 10, 2, 'x', 5, 0.55)
      .mv(86, 9, 2, 'y', 5, 0.5).mv(120, 10, 2, 'x', 6, 0.6)
      .mv(170, 9, 2, 'y', 5, 0.5).mv(202, 10, 2, 'x', 5, 0.55);

  lvl2.q(12, 11, 'honig', 4).q(45, 10, 'doener').q(66, 11, 'honig', 4)
      .q(97, 10, 'honig', 4).q(127, 8, 'gold').q(146, 10, 'baklava')
      .q(196, 10, 'honig', 4).q(94, 8, 'kippen');

  lvl2.k(32, 12).k(33, 12, 'honig').k(80, 9).k(114, 12).k(115, 12, 'doener')
      .k(164, 12).k(165, 12).k(166, 12, 'honig');

  lvl2.sp(50, 12).sp(116, 14).sp(180, 11);

  lvl2.trail(4, 13, 6, 2).trail(24, 13, 6, 2, 3).trail(42, 11, 5, 2, 2)
      .trail(58, 13, 6, 2, 3).trail(76, 10, 4, 2, 2).trail(90, 12, 5, 2, 2)
      .trail(106, 13, 6, 2, 3).trail(124, 9, 4, 2, 2).trail(138, 12, 6, 2, 3)
      .trail(156, 13, 6, 2, 3).trail(174, 10, 4, 2, 2).trail(188, 13, 6, 2, 3)
      .trail(206, 13, 9, 2, 2);

  lvl2.it('herz', 78, 10).it('herz', 158, 9)
      .it('honig', 9, 9).it('honig', 10, 9).it('honig', 11, 9)
      .it('honig', 143, 8).it('honig', 144, 8).it('honig', 145, 8);

  lvl2.row('biene', 11, [15, 35, 64, 88, 112, 135, 152, 176, 194, 214])
      .row('biene', 8, [48, 98, 130, 208])
      .row('broki', 15, [10, 30, 62, 110, 160, 192, 218])
      .row('broki', 13, [46, 50])
      .row('broki', 14, [94, 140, 144])
      .row('wecker', 15, [26, 66, 116, 166])
      .row('broki', 12, [78, 176]);

  lvl2.cp(78, 12).cp(148, 14);

  lvl2.sign(5, 15, 'HONIG NEHMEN: JA. ERWISCHT WERDEN: NEIN.')
      .sign(60, 15, 'BIENEN RECHNEN. BIENEN ERINNERN SICH.')
      .sign(108, 15, 'BROKKOLI IST GESUND. DESWEGEN IST ER BÖSE.')
      .sign(190, 15, 'NOCH DREI LEVEL. HUSEYIN WARTET.');

  /* ---------------------------------------------------------------
     LEVEL 3 — Muckibude des Grauens (vertikal)
     --------------------------------------------------------------- */

  var lvl3 = L({
    id: 3, name: 'MUCKIBUDE DES GRAUENS', sub: 'HUSEYINS ZWEITES ZUHAUSE',
    theme: 'gym', music: 'l3', w: 248, h: 26, spawn: [3, 23], par: 130,
    goal: [242, 11], diff: 1.15,
    intro: [
      ['huseyin', 'WILLKOMMEN IM FITNESSSTUDIO. KENNST DU NICHT, WA?'],
      ['yusuf', 'ICH WAR HIER. 2021. EINMAL. WAR VOLL.'],
      ['huseyin', 'DU WARST IM TANGENTE KAFFEE NEBENAN.'],
      ['yusuf', 'DAS GEBÄUDE ZÄHLT.'],
      ['huseyin', 'DU SITZT JEDEN TAG IM TANGENTE.'],
      ['yusuf', 'DAS IST MEIN BÜRO.'],
      ['huseyin', 'HEUTE IST BEINTAG.'],
      ['yusuf', 'BEI MIR IST HEUTE SITZTAG.'],
      ['huseyin', 'LENNART TRAINIERT HIER AUCH. VIEL SPASS.'],
      ['yusuf', 'LENNART FRAGT JEDES MAL, OB ICH INS GYM GEHE.']
    ],
    outro: [
      ['yusuf', 'ICH HAB DEN GANZEN LADEN GESTAMPFT. OHNE ANMELDUNG.'],
      ['huseyin', 'DAS IST KEIN TRAINING, YUSUF.'],
      ['yusuf', 'ICH HAB 11.000 SCHRITTE. IM SPRINGEN.']
    ]
  });

  lvl3.g(0, 22, 23).g(27, 40, 23).g(45, 56, 21).g(61, 74, 23)
      .g(79, 90, 19).g(95, 108, 23).g(113, 124, 17).g(129, 142, 21)
      .g(147, 158, 15).g(163, 176, 19).g(181, 192, 13).g(197, 215, 11);

  // Boss-Arena
  lvl3.g(216, 247, 11);
  lvl3.p(222, 7, 5).p(236, 7, 5);
  lvl3.bossAt(232, 11);
  lvl3.d.bossType = 'lennart';
  lvl3.d.arena = { x: 216, w: 32 };
  lvl3.q(226, 6, 'doener', 2).it('herz', 229, 5);

  // Kletterrouten nach oben
  lvl3.p(18, 20, 4).p(24, 17, 4).p(30, 14, 4).p(36, 11, 4).p(42, 8, 5)
      .p(52, 18, 4).p(58, 15, 4).p(66, 12, 4).p(72, 9, 4)
      .p(84, 16, 4).p(90, 13, 4).p(98, 10, 4).p(104, 7, 5)
      .p(118, 14, 4).p(124, 11, 4).p(132, 8, 4).p(140, 6, 4)
      .p(152, 12, 4).p(160, 9, 4).p(168, 6, 4)
      .p(184, 10, 4).p(190, 7, 5).p(196, 5, 6);

  // Trittsteine; bei grossen Höhenunterschieden zwei Stufen.
  lvl3.p(23, 21, 4).p(41, 21, 4).p(57, 21, 4).p(75, 21, 4)
      .p(91, 21, 4).p(109, 21, 2).p(111, 19, 2).p(125, 19, 4)
      .p(143, 19, 2).p(145, 17, 2).p(159, 17, 4)
      .p(177, 17, 2).p(179, 15, 2).p(193, 11, 4);

  lvl3.mv(46, 19, 2, 'y', 6, 0.5).mv(76, 17, 2, 'x', 6, 0.6)
      .mv(110, 15, 2, 'y', 7, 0.55).mv(144, 13, 2, 'x', 6, 0.65)
      .mv(178, 11, 2, 'y', 6, 0.5).mv(193, 9, 2, 'x', 4, 0.5);

  lvl3.q(20, 19, 'honig', 4).q(32, 13, 'doener').q(54, 17, 'honig', 4)
      .q(68, 11, 'gold').q(86, 15, 'honig', 4).q(100, 9, 'baklava')
      .q(120, 13, 'honig', 4).q(134, 7, 'doener').q(154, 11, 'honig', 4)
      .q(186, 9, 'gold').q(50, 18, 'kippen');

  // Hanteln liegen als zerstörbare Kisten herum
  lvl3.k(15, 22).k(16, 22).k(38, 10).k(64, 22).k(65, 22, 'honig')
      .k(102, 22).k(103, 22).k(132, 20).k(133, 20, 'doener')
      .k(150, 14).k(151, 14).k(174, 18).k(198, 10).k(199, 10, 'honig');

  lvl3.sp(30, 22).sp(62, 22).sp(96, 22).sp(130, 20).sp(164, 18);

  lvl3.trail(4, 21, 6, 2).trail(28, 21, 5, 2, 3).trail(46, 19, 5, 2, 2)
      .trail(62, 21, 6, 2, 3).trail(80, 17, 5, 2, 2).trail(96, 21, 6, 2, 3)
      .trail(114, 15, 5, 2, 2).trail(130, 19, 6, 2, 3).trail(148, 13, 5, 2, 2)
      .trail(164, 17, 6, 2, 3).trail(182, 11, 5, 2, 2).trail(198, 9, 5, 2, 2);

  lvl3.it('herz', 43, 6).it('herz', 105, 5).it('herz', 169, 4)
      .it('honig', 37, 9).it('honig', 43, 7).it('honig', 105, 6)
      .it('honig', 141, 5).it('honig', 169, 5).it('honig', 197, 4);

  lvl3.row('lennart', 23, [12, 34, 68, 102, 106])
      .row('lennart', 21, [50, 138])
      .row('lennart', 19, [84, 170])
      .row('lennart', 17, [120])
      .row('lennart', 15, [152])
      .row('lennart', 13, [188])
      .row('drohne', 16, [30, 56, 92, 126, 158, 186])
      .row('drohne', 10, [70, 136, 200])
      .row('wecker', 23, [20, 72, 98])
      .row('broki', 23, [8, 40, 64, 108]);

  lvl3.cp(66, 23).cp(120, 17).cp(185, 13);

  lvl3.sign(5, 23, 'HEUTE IST BEINTAG. FÜR DICH JEDEN TAG.')
      .sign(30, 23, 'STAMPFER ZERBRICHT KISTEN. RUNTER DRÜCKEN!')
      .sign(96, 23, 'NIEMAND HAT DICH GEFRAGT, BRO.')
      .sign(150, 15, 'KARDIO IST NUR WEGLAUFEN MIT EXTRA SCHRITTEN.');

  /* ---------------------------------------------------------------
     LEVEL 4 — Die Küche der Versuchung
     --------------------------------------------------------------- */

  var lvl4 = L({
    id: 4, name: 'DIE KÜCHE DER VERSUCHUNG', sub: 'GEFÄHRLICHSTER RAUM IM HAUS',
    theme: 'kueche', music: 'l4', w: 270, h: 18, spawn: [3, 15], par: 140,
    goal: [264, 15], diff: 1.22,
    intro: [
      ['yusuf', 'DIE KÜCHE. ENDLICH HEIMSPIEL.'],
      ['huseyin', 'ICH HABE DEN KÜHLSCHRANK UMGEBAUT.'],
      ['huseyin', 'DA IST JETZT SALAT DRIN. NUR SALAT.'],
      ['yusuf', 'DAS IST EIN VERBRECHEN.'],
      ['huseyin', 'DAS IST ERNÄHRUNG.'],
      ['yusuf', 'UND WO IST ERFAN?'],
      ['huseyin', 'DER KOCH? EINGESPERRT. GANZ HINTEN.'],
      ['huseyin', 'SOLANGE ER KUBIDE MACHT, HÖRST DU NIE AUF.'],
      ['yusuf', 'DU HAST EINEN IRANISCHEN KOCH EINGESPERRT.'],
      ['yusuf', 'DAS IST DAS SCHLIMMSTE, WAS DU JE GEMACHT HAST.']
    ],
    outro: [
      ['erfan', 'ICH MACH DIR KUBIDE. SO VIELE DU WILLST.'],
      ['yusuf', 'UND DEN SALAT?'],
      ['erfan', 'DER SALAT BLEIBT, WO ER IST.']
    ]
  });

  lvl4.g(0, 16, 15).g(22, 32, 15).g(38, 46, 13).g(52, 62, 15)
      .g(68, 76, 12).g(82, 94, 15).g(100, 108, 13).g(114, 126, 15)
      .g(132, 140, 11).g(146, 158, 14).g(164, 172, 12).g(178, 190, 15)
      .g(196, 206, 13).g(212, 237, 15);

  // Erfans Küche: hier kämpft er, weil Huseyin ihn dazu zwingt
  lvl4.g(238, 269, 15);
  lvl4.p(244, 11, 5).p(258, 11, 5);
  lvl4.bossAt(254, 15);
  lvl4.d.bossType = 'erfan';
  lvl4.d.arena = { x: 238, w: 32 };
  lvl4.q(248, 10, 'doener', 2).it('herz', 251, 9);

  // Gabeln im Boden. Ganz normale Küche.
  lvl4.hz(26, 29, 14, 'gabel').hz(56, 59, 14, 'gabel')
      .hz(88, 91, 14, 'gabel').hz(120, 123, 14, 'gabel')
      .hz(150, 154, 13, 'gabel').hz(184, 187, 14, 'gabel')
      .hz(218, 222, 14, 'gabel');

  lvl4.hz(42, 44, 12, 'oel').hz(104, 106, 12, 'oel').hz(200, 203, 12, 'oel');

  lvl4.p(17, 13, 5).p(33, 13, 5).p(47, 13, 5).p(63, 13, 5)
      .p(77, 13, 5).p(95, 13, 5).p(109, 13, 5).p(127, 13, 5)
      .p(141, 12, 5).p(159, 12, 5).p(173, 13, 5).p(191, 13, 5)
      .p(207, 13, 5);

  lvl4.p(8, 10, 5).p(44, 8, 4).p(72, 8, 4).p(88, 10, 4)
      .p(118, 9, 5).p(136, 7, 4).p(168, 8, 4).p(200, 9, 4).p(224, 10, 5);

  lvl4.mv(18, 10, 2, 'x', 4, 0.6).mv(48, 11, 2, 'y', 5, 0.5)
      .mv(78, 10, 2, 'x', 6, 0.7).mv(110, 11, 2, 'y', 5, 0.55)
      .mv(142, 9, 2, 'x', 6, 0.7).mv(174, 10, 2, 'y', 5, 0.55)
      .mv(208, 11, 2, 'x', 5, 0.6);

  lvl4.q(11, 11, 'honig', 5).q(29, 11, 'doener').q(58, 11, 'honig', 5)
      .q(74, 8, 'gold').q(92, 11, 'honig', 5).q(116, 10, 'baklava')
      .q(138, 7, 'doener').q(156, 10, 'honig', 5).q(188, 11, 'gold')
      .q(216, 11, 'honig', 5);

  lvl4.k(14, 12).k(15, 12, 'honig').k(40, 12).k(66, 11).k(67, 11)
      .k(98, 12).k(99, 12, 'doener').k(130, 10).k(131, 10)
      .k(162, 11).k(180, 12).k(181, 12, 'honig').k(210, 12).k(228, 12);

  lvl4.sp(24, 14).sp(70, 11).sp(90, 14).sp(120, 14).sp(186, 14);

  lvl4.trail(4, 13, 6, 2).trail(23, 13, 5, 2, 3).trail(39, 11, 4, 2, 2)
      .trail(53, 13, 5, 2, 3).trail(69, 10, 4, 2, 2).trail(83, 13, 6, 2, 3)
      .trail(101, 11, 4, 2, 2).trail(115, 13, 6, 2, 3).trail(133, 9, 4, 2, 2)
      .trail(147, 12, 6, 2, 3).trail(165, 10, 4, 2, 2).trail(179, 13, 6, 2, 3)
      .trail(197, 11, 5, 2, 2).trail(213, 13, 10, 2, 3);

  lvl4.it('herz', 45, 6).it('herz', 137, 5).it('herz', 225, 8)
      .it('honig', 9, 9).it('honig', 10, 9).it('honig', 73, 7)
      .it('honig', 137, 6).it('honig', 169, 7).it('honig', 201, 8);

  lvl4.row('salat', 15, [10, 25, 60, 86, 122, 186, 220, 230])
      .row('salat', 13, [42, 104, 202])
      .row('salat', 12, [72, 168])
      .row('salat', 14, [152])
      .row('broki', 15, [30, 90, 118, 216])
      .row('broki', 11, [136])
      .row('drohne', 9, [36, 80, 112, 160, 194])
      .row('biene', 10, [54, 128, 206])
      .row('lennart', 15, [56, 124, 190]);

  lvl4.cp(58, 15).cp(122, 15).cp(186, 15);

  lvl4.it('kubide', 45, 7).it('kubide', 121, 8).it('kubide', 202, 8);
  lvl4.q(50, 11, 'kippen').q(176, 10, 'kippen');

  lvl4.sign(5, 15, 'GABELN IM BODEN. GANZ NORMALE KÜCHE.')
      .sign(54, 15, 'NUR EIN DÖNER, HAT ER GESAGT. VOR NEUN DÖNERN.')
      .sign(116, 15, 'ÖL IST HEISS. DAS IST DER GANZE TRICK.')
      .sign(214, 15, 'HINTEN KOCHT JEMAND. LAUT.');

  /* ---------------------------------------------------------------
     LEVEL 5 — Husseins Salat-Festung + Endgegner
     --------------------------------------------------------------- */

  var lvl5 = L({
    id: 5, name: 'HUSEYINS SALAT-FESTUNG', sub: 'GEBAUT AUS DISZIPLIN. UND SALAT.',
    theme: 'festung', music: 'l5', w: 214, h: 18, spawn: [3, 15], par: 150,
    diff: 1.34,
    goal: [204, 14],
    intro: [
      ['huseyin', 'DU KOMMST NICHT WEITER. DAS IST MEINE FESTUNG.'],
      ['yusuf', 'DU HAST EINE FESTUNG GEBAUT. AUS SALAT.'],
      ['huseyin', 'AUS DISZIPLIN!'],
      ['yusuf', 'AUS SALAT.'],
      ['huseyin', 'DANN KOMM HOCH UND HOL DIR DEN LETZTEN HONIG.'],
      ['yusuf', 'ICH KOMME. LANGSAM. ABER ICH KOMME.']
    ],
    outro: []
  });

  lvl5.g(0, 18, 15).g(24, 34, 15).g(40, 50, 13).g(56, 66, 15)
      .g(72, 80, 12).g(86, 98, 15).g(104, 112, 13).g(118, 130, 15)
      .g(136, 144, 11).g(150, 162, 14);

  // Arena: geschlossener Boden. Der Eingang links wird erst zugemauert,
  // wenn Hussein auftaucht (siehe game.js) — sonst käme man gar nicht rein.
  lvl5.g(168, 213, 15);
  lvl5.wall(213, 2, 14, 1);
  lvl5.p(163, 12, 4);

  lvl5.hz(28, 31, 14, 'dressing').hz(60, 63, 14, 'dressing')
      .hz(92, 95, 14, 'dressing').hz(124, 127, 14, 'dressing')
      .hz(44, 47, 12, 'gabel').hz(108, 110, 12, 'gabel');

  lvl5.p(19, 13, 5).p(35, 13, 5).p(51, 13, 5).p(67, 13, 5)
      .p(81, 13, 5).p(99, 13, 5).p(113, 13, 5).p(131, 13, 5)
      .p(145, 12, 5);

  lvl5.p(9, 10, 5).p(46, 8, 4).p(76, 8, 4).p(108, 9, 4)
      .p(140, 7, 4).p(156, 10, 5);

  // Arena-Plattformen für den Bosskampf
  lvl5.p(174, 11, 5).p(190, 11, 5).p(182, 7, 6);

  lvl5.mv(20, 10, 2, 'y', 5, 0.55).mv(52, 11, 2, 'x', 6, 0.7)
      .mv(82, 10, 2, 'y', 6, 0.6).mv(114, 11, 2, 'x', 6, 0.7)
      .mv(146, 9, 2, 'y', 6, 0.6);

  lvl5.q(13, 11, 'honig', 5).q(31, 11, 'doener').q(64, 11, 'honig', 5)
      .q(78, 8, 'gold').q(96, 11, 'honig', 5).q(120, 10, 'baklava')
      .q(142, 7, 'doener').q(160, 10, 'gold').q(60, 11, 'kippen')
      .q(176, 10, 'doener', 3).q(196, 10, 'doener', 3)
      .q(186, 6, 'kippen');

  lvl5.k(16, 12).k(17, 12, 'honig').k(42, 12).k(70, 11).k(71, 11)
      .k(102, 12).k(103, 12, 'doener').k(134, 10).k(135, 10)
      .k(164, 11).k(186, 12).k(187, 12, 'honig');

  lvl5.sp(26, 14).sp(58, 14).sp(94, 14).sp(124, 14);

  lvl5.trail(4, 13, 7, 2).trail(25, 13, 5, 2, 3).trail(41, 11, 4, 2, 2)
      .trail(57, 13, 5, 2, 3).trail(73, 10, 4, 2, 2).trail(87, 13, 6, 2, 3)
      .trail(105, 11, 4, 2, 2).trail(119, 13, 6, 2, 3).trail(137, 9, 4, 2, 2)
      .trail(151, 12, 6, 2, 3);

  lvl5.it('herz', 47, 6).it('herz', 141, 5).it('herz', 157, 8)
      .it('honig', 10, 9).it('honig', 11, 9).it('honig', 77, 7)
      .it('honig', 141, 6).it('honig', 183, 6).it('honig', 184, 6)
      // Verpflegung in der Arena — der Kampf soll fordernd sein, nicht unfair
      .it('herz', 172, 9).it('herz', 194, 9).it('kubide', 183, 5);

  lvl5.row('salat', 15, [12, 28, 62, 90, 126])
      .row('salat', 13, [44, 106])
      .row('broki', 15, [8, 32, 94, 122])
      .row('broki', 12, [74, 138])
      .row('broki', 11, [140])
      .row('lennart', 15, [58, 96, 128])
      .row('lennart', 13, [48, 110])
      .row('drohne', 9, [38, 84, 116, 152])
      .row('biene', 10, [56, 100, 144])
      .row('biene', 8, [80, 148])
      .row('wecker', 15, [26, 64, 92, 158]);

  lvl5.cp(62, 15).cp(126, 15).cp(158, 14);

  lvl5.sign(5, 15, 'SALAT IST GEMÜSE MIT ZU VIEL SELBSTBEWUSSTSEIN.')
      .sign(58, 15, 'ER HAT DAS ALLES ALLEIN GEBAUT. AN EINEM WOCHENENDE.')
      .sign(120, 15, 'DU BIST FAST DA. ATME. ISS WAS.')
      .sign(153, 14, 'AB HIER NUR NOCH HUSEYIN.');

  lvl5.bossAt(202, 14);
  lvl5.d.bossType = 'huseyin';

  /* ---------------------------------------------------------------
     LEVEL 6 — Mustang nach Stilbruch (Fahr-Level + Siegerehrung)
     --------------------------------------------------------------- */

  var lvl6 = L({
    id: 6, name: 'MUSTANG NACH STILBRUCH', sub: 'SIEGERFAHRT, 2 UHR NACHTS',
    theme: 'strasse', music: 'l6', w: 268, h: 18, spawn: [3, 15], par: 100,
    goal: [258, 15], diff: 1.2, driving: true,
    intro: [
      ['huseyin', 'WAS IST DAS FÜR EIN AUTO?'],
      ['yusuf', 'MEIN MUSTANG. STEHT SEIT DREI JAHREN DA.'],
      ['huseyin', 'DU HAST NIE ERZÄHLT, DASS DU EIN AUTO HAST.'],
      ['yusuf', 'ICH BIN NIE GEFAHREN. ZU WEIT ZUM PARKPLATZ.'],
      ['huseyin', 'WO FAHREN WIR HIN?'],
      ['yusuf', 'STILBRUCH. ESAT WARTET SCHON.'],
      ['huseyin', 'UM ZWEI UHR NACHTS?'],
      ['yusuf', 'ESAT WARTET IMMER. STEIG EIN.'],
      ['', 'GAS GEBEN MIT RECHTS. SPERREN WERDEN ÜBERFAHREN.']
    ],
    outro: []
  });

  // Lange Strasse mit wenigen, klar sichtbaren Luecken
  lvl6.g(0, 46, 15).g(52, 96, 15).g(102, 148, 15)
      .g(154, 198, 15).g(204, 244, 15).g(250, 267, 15);

  // Trittsteine ueber den Luecken, damit der Sprung immer klappt
  lvl6.p(47, 13, 5).p(97, 13, 5).p(149, 13, 5).p(199, 13, 5).p(245, 13, 5);

  // Strassensperren: der Mustang raeumt sie einfach weg
  lvl6.k(14, 14).k(26, 14).k(38, 14).k(60, 14).k(61, 14)
      .k(74, 14).k(88, 14).k(110, 14).k(111, 14).k(124, 14)
      .k(138, 14).k(160, 14).k(161, 14).k(176, 14).k(190, 14)
      .k(210, 14).k(211, 14).k(224, 14).k(236, 14);

  lvl6.k(30, 11).k(82, 11).k(132, 11).k(184, 11).k(230, 11);

  lvl6.q(20, 11, 'honig', 6).q(68, 11, 'kubide').q(118, 11, 'honig', 6)
      .q(168, 11, 'kubide').q(218, 11, 'honig', 6);

  lvl6.trail(5, 13, 8, 2, 2).trail(54, 13, 8, 2, 2).trail(104, 13, 8, 2, 2)
      .trail(156, 13, 8, 2, 2).trail(206, 13, 8, 2, 2).trail(252, 13, 6, 2, 2);

  lvl6.it('herz', 44, 11).it('herz', 146, 11).it('herz', 242, 11);

  // Wer auf der Strasse steht, hat Pech
  lvl6.row('salat', 15, [18, 34, 66, 92, 116, 142, 172, 194, 222, 240])
      .row('broki', 15, [24, 58, 108, 158, 208, 234])
      .row('wecker', 15, [40, 80, 130, 186, 228])
      .row('biene', 10, [30, 90, 140, 200, 250]);

  lvl6.cp(110, 15).cp(212, 15);

  lvl6.sign(8, 15, 'GAS GEBEN. SPERREN SIND KEIN PROBLEM.')
      .sign(106, 15, 'NOCH 8 MINUTEN BIS STILBRUCH. SAGT ESAT.')
      .sign(208, 15, 'ESAT HAT SCHON BESTELLT. FÜR ALLE.');

  // Mirkan taucht dreimal auf und faehrt neben Yusuf her.
  lvl6.d.mirkan = [40, 120, 210];

  /* ---------------------------------------------------------------
     LEVEL 7 — Der letzte Kampf gegen Esat
     --------------------------------------------------------------- */

  var lvl7 = L({
    id: 7, name: 'DER LETZTE KAMPF', sub: 'ESAT HAT ES ZU WEIT GETRIEBEN',
    theme: 'strasse', music: 'boss', w: 56, h: 18, spawn: [4, 15], par: 200,
    goal: [52, 15], diff: 1.5,
    intro: [
      ['esat', 'YUSUF. JETZT BERUHIG DICH MAL.'],
      ['yusuf', 'ICH BIN RUHIG.'],
      ['esat', 'DU KNURRST SEIT ZWEI MINUTEN.'],
      ['yusuf', 'DAS IST MEINE RUHIGE STIMME.'],
      ['esat', 'OKAY. DANN MACHEN WIR DAS JETZT.'],
      ['huseyin', 'ICH HALT DIE SHISHA.']
    ],
    outro: []
  });

  lvl7.g(0, 55, 15);
  lvl7.wall(0, 2, 14, 1).wall(55, 2, 14, 1);
  lvl7.p(8, 11, 6).p(22, 8, 7).p(38, 11, 6).p(16, 5, 5).p(32, 4, 6);
  lvl7.p(46, 8, 6);

  lvl7.q(12, 7, 'doener', 4).q(42, 7, 'doener', 4).q(28, 11, 'kippen');
  lvl7.it('herz', 10, 9).it('herz', 44, 9).it('kubide', 28, 3);
  lvl7.trail(6, 13, 5, 2, 2).trail(44, 13, 5, 2, 2);

  lvl7.bossAt(46, 14);
  lvl7.d.bossType = 'esat';
  lvl7.d.arena = { x: 0, w: 56 };

  /* ---------------------------------------------------------------
     Dialoge für den Bosskampf & das Ende
     --------------------------------------------------------------- */

  var BOSS_DIALOG = {
    start: [
      ['huseyin', 'DA BIST DU. ICH HAB SCHON DREI MAL TRAINIERT.'],
      ['yusuf', 'ICH HAB DREI MAL GEGESSEN. WIR SIND QUITT.'],
      ['huseyin', 'ICH TRAINIERE SECHS MAL DIE WOCHE!'],
      ['yusuf', 'ICH SCHLAFE SIEBEN MAL DIE WOCHE. ICH FÜHRE.'],
      ['huseyin', 'DAS IST KEIN WETTBEWERB!'],
      ['yusuf', 'DANN HÖR AUF ZU ZÄHLEN, BRUDER.']
    ],
    phase2: [
      ['huseyin', 'DAS WAR NUR DAS AUFWÄRMEN!'],
      ['yusuf', 'DAS SAGST DU JEDES MAL.']
    ],
    phase3: [
      ['huseyin', 'ICH HABE EINEN PERSONAL TRAINER!'],
      ['yusuf', 'ICH HABE EINEN PERSONAL DÖNERMANN.'],
      ['huseyin', 'DAS IST NICHT DAS GLEICHE!'],
      ['yusuf', 'DOCH. MEINER RUFT ZURÜCK.']
    ],
    end: [
      ['huseyin', 'OKAY. OKAY! ICH GEBE AUF.'],
      ['huseyin', 'DU HAST GEWONNEN, YUSUF.'],
      ['yusuf', 'HÖ HÖ HÖÖÖ.'],
      ['huseyin', '...HAST DU NOCH VON DEM HONIG?'],
      ['yusuf', 'ICH HABE IMMER NOCH HONIG.'],
      ['yusuf', 'ICH HABE IMMER HONIG.'],
      ['huseyin', 'DANN LASS UNS ESSEN.'],
      ['yusuf', 'NICHT HIER. HIER RIECHT ALLES NACH SALAT.'],
      ['yusuf', 'ICH HOL DEN MUSTANG.'],
      ['huseyin', 'DU HAST EINEN MUSTANG?']
    ]
  };

  /* Siegerehrung im Stilbruch — und wie sie eskaliert. */
  var STILBRUCH_DIALOG = [
    ['', 'SHISHA-BAR STILBRUCH. 2:14 UHR.'],
    ['esat', 'DA SEID IHR JA ENDLICH.'],
    ['esat', 'ICH SITZ HIER SEIT HALB ZWÖLF.'],
    ['yusuf', 'ICH MUSSTE KURZ MEINEN BRUDER BESIEGEN.'],
    ['esat', 'WIEDER?'],
    ['huseyin', 'ES WAR KNAPP.'],
    ['yusuf', 'ES WAR NICHT KNAPP.'],
    ['esat', 'OKAY YUSUF. DU HAST ES GESCHAFFT.'],
    ['esat', 'ISS JETZT DEIN TEXAS BARBECUE BRISKET.'],
    ['esat', 'NUR 200 KALORIEN AUF 100 GRAMM.'],
    ['esat', 'UND GANZE 40 GRAMM EIWEISS.'],
    ['yusuf', 'DU HAST DAS NACHGESCHAUT.'],
    ['esat', 'ICH SCHAU IMMER NACH. ISS AUF.'],
    ['yusuf', 'ICH HAB EIGENTLICH GAR KEINEN HUNGER.'],
    ['huseyin', '...'],
    ['esat', '...'],
    ['yusuf', 'ABER ICH ESS DAS JETZT KOMPLETT.'],
    ['', 'YUSUF ISST DAS BRISKET. KOMPLETT.'],
    ['', 'ES DAUERT VIER MINUTEN. NIEMAND SPRICHT.'],
    ['esat', 'UND JETZT RAUCH AN DER PFEIFE.'],
    ['', 'YUSUF RAUCHT AN DER PFEIFE.'],
    ['yusuf', 'HÖ HÖ HÖÖÖ. DAS WAR EIN GUTER TAG.'],
    ['huseyin', 'MUSS ICH ZUGEBEN. WAR EIN GUTER TAG.'],
    ['esat', 'JA GUT, DU FETTSACK.'],
    ['esat', 'GEH JETZT ABER TROTZDEM INS GYM.'],
    ['', '...'],
    ['huseyin', 'ESAT.'],
    ['huseyin', 'ESAT, NEIN.'],
    ['yusuf', 'WAS HAST DU GESAGT.'],
    ['esat', 'WAS? ICH MEIN ES NUR GUT.'],
    ['yusuf', 'ICH HAB HEUTE MEINEN BRUDER BESIEGT.'],
    ['yusuf', 'ICH HAB EINEN KOCH AUS EINEM KÄFIG BEFREIT.'],
    ['yusuf', 'ICH BIN MIT EINEM MUSTANG HIERHER GEFAHREN.'],
    ['yusuf', 'ZUM ERSTEN MAL SEIT DREI JAHREN.'],
    ['yusuf', 'UND DU SAGST FETTSACK.'],
    ['esat', 'ICH... OKAY. VIELLEICHT WAR DAS ZU VIEL.'],
    ['yusuf', 'KRRRRRRR.'],
    ['huseyin', 'ER KNURRT. ESAT, LAUF.'],
    ['esat', 'ICH BIN DOCH DEIN BESTER KOLLEGE!'],
    ['yusuf', 'DANN WEISST DU JA, WIE SCHNELL ICH BIN.'],
    ['esat', 'DU BIST GAR NICHT SCHNELL!'],
    ['yusuf', 'BERGAB SCHON.'],
    ['', 'YUSUF BALCI IST WACH. WIRKLICH WACH.'],
    ['', 'DAS PASSIERT ZWEIMAL IM JAHR.'],
    ['', 'LETZTER KAMPF.']
  ];

  /* Nach dem Sieg über Esat. */
  var ESAT_DIALOG = {
    phase2: [
      ['esat', 'MOMENT. MOMENT!'],
      ['esat', 'ICH BRAUCH KURZ WAS.'],
      ['yusuf', 'ER DRÜCKT SNOOZE. MITTEN IM KAMPF.'],
      ['esat', 'NEUN MINUTEN. DANN BIN ICH EIN ANDERER MENSCH.'],
      ['huseyin', 'DAS FUNKTIONIERT SO NICHT!'],
      ['esat', 'BEI MIR SCHON.']
    ],
    phase3: [
      ['esat', 'OKAY, JETZT WIRD ES UNGEMÜTLICH.'],
      ['yusuf', 'DU HAST JETS GERUFEN.'],
      ['esat', 'ICH KENN DA JEMANDEN.'],
      ['yusuf', 'DU KENNST NIEMANDEN, DER JETS HAT.'],
      ['esat', 'ICH KENNE JEMANDEN, DER JEMANDEN KENNT.']
    ],
    end: [
      ['esat', 'OKAY! OKAY! TUT MIR LEID!'],
      ['esat', 'DU MUSST NICHT INS GYM.'],
      ['yusuf', 'DANKE.'],
      ['esat', 'ABER VIELLEICHT EINMAL DIE WOCHE—'],
      ['yusuf', 'KRRRR.'],
      ['esat', 'NICHTS. ICH HAB NICHTS GESAGT.'],
      ['huseyin', 'ICH GEH ÜBRIGENS MORGEN UM SECHS LAUFEN.'],
      ['yusuf', '...'],
      ['esat', '...'],
      ['huseyin', 'WAS DENN.'],
      ['', 'SIE BLIEBEN BIS VIER UHR MORGENS.'],
      ['', 'ESAT ZAHLTE. FREIWILLIG.'],
      ['', 'YUSUF ZOCKTE DANACH NOCH BIS SIEBEN.'],
      ['', 'ER SCHLIEF MIT DEM CONTROLLER IN DER HAND EIN.'],
      ['', 'ENDE.']
    ]
  };

  /* Die Level-Bosse. Jeder nervt auf seine eigene Art. */
  var MINI_DIALOG = {
    mirkan: {
      start: [
        ['mirkan', 'YUSUF! DA BIST DU JA!'],
        ['yusuf', 'MIRKAN. NICHT JETZT.'],
        ['mirkan', 'WO WARST DU? WAS MACHST DU? WARUM HIER?'],
        ['yusuf', 'DAS SIND DREI FRAGEN IN VIER SEKUNDEN.'],
        ['mirkan', 'IST DAS EINE ANTWORT ODER EINE KRITIK?'],
        ['yusuf', '...'],
        ['mirkan', 'ICH LASS DICH ERST DURCH, WENN DU ANTWORTEST.'],
        ['yusuf', 'DANN EBEN SO.']
      ],
      phase2: [
        ['mirkan', 'WARUM SPRINGST DU AUF MEIN AUTO?'],
        ['yusuf', 'DAS IST AUCH WIEDER EINE FRAGE.']
      ],
      end: [
        ['mirkan', 'OKAY! OKAY! ICH FRAG NICHTS MEHR!'],
        ['yusuf', 'DANKE.'],
        ['mirkan', 'NUR EINS NOCH: TUT DAS WEH?'],
        ['yusuf', 'MIRKAN.'],
        ['mirkan', 'ICH FAHR JA SCHON.']
      ]
    },
    lennart: {
      start: [
        ['lennart', 'EY! GEHST DU AUCH INS GYM?'],
        ['yusuf', 'ICH BIN GERADE IM GYM.'],
        ['lennart', 'JA, ABER TRAINIERST DU AUCH?'],
        ['yusuf', 'ICH BEWEGE MICH SEIT ZWEI STUNDEN.'],
        ['lennart', 'DAS IST KEIN TRAINING, DAS IST KARDIO.'],
        ['yusuf', 'KARDIO IST TRAINING.'],
        ['lennart', 'NICHT WENN MAN DABEI ISST.'],
        ['yusuf', 'OKAY. JETZT REICHT ES.']
      ],
      phase2: [
        ['lennart', 'LETZTE WIEDERHOLUNG! IMMER DIE LETZTE!'],
        ['yusuf', 'DAS SAGST DU SEIT ZEHN MINUTEN.']
      ],
      end: [
        ['lennart', 'OKAY. RESPEKT. DU HAST KRAFT.'],
        ['yusuf', 'ICH WEISS.'],
        ['lennart', 'WILLST DU MEINEN TRAININGSPLAN?'],
        ['yusuf', 'NEIN.'],
        ['lennart', 'ICH SCHICK IHN DIR TROTZDEM.']
      ]
    },
    erfan: {
      start: [
        ['erfan', 'RAUS! RAUS AUS MEINER KÜCHE!'],
        ['yusuf', 'ERFAN? ICH BINS, YUSUF!'],
        ['erfan', 'ICH KOCHE SEIT VIERZEHN TAGEN NUR SALAT!'],
        ['erfan', 'VIERZEHN TAGE. SALAT.'],
        ['yusuf', 'DAS IST FOLTER. DAS WEISS ICH.'],
        ['erfan', 'DEIN BRUDER HAT MEIN FLEISCH WEGGESPERRT!'],
        ['yusuf', 'ICH HOL ES ZURÜCK. ABER KOMM ERST RUNTER.'],
        ['erfan', 'ICH KOMME NICHT RUNTER!']
      ],
      phase2: [
        ['erfan', 'WEISST DU, WIE MAN SALAT WÜRZT?'],
        ['yusuf', 'NEIN.'],
        ['erfan', 'GAR NICHT! MAN KANN ES NICHT!']
      ],
      end: [
        ['erfan', 'OKAY... OKAY. ICH BIN RUHIG.'],
        ['yusuf', 'GEHT ES WIEDER?'],
        ['erfan', 'VIERZEHN TAGE, YUSUF.'],
        ['yusuf', 'ICH WEISS.'],
        ['erfan', 'DANKE, DASS DU GEKOMMEN BIST.'],
        ['erfan', 'HAST DU HUNGER?'],
        ['yusuf', 'ICH HAB EIGENTLICH GAR KEINEN HUNGER.'],
        ['erfan', '...'],
        ['yusuf', 'MACH VIERZEHN.']
      ]
    }
  };

  /* Mirkan faehrt Mercedes und hat Fragen. Sehr viele Fragen. */
  var MIRKAN_LINES = [
    'YUSUF! WAS MACHST DU?',
    'WO FÄHRST DU HIN?',
    'IST DAS DEIN AUTO?',
    'WAS HAT DER GEKOSTET?',
    'WARUM FÄHRST DU SO SCHNELL?',
    'HAST DU SCHON GEGESSEN?',
    'WAR DAS EIN MUSTANG?',
    'WIEVIEL PS HAT DER?',
    'KANN ICH MAL FAHREN?',
    'WARUM ANTWORTEST DU NICHT?',
    'BIST DU SAUER?',
    'ICH FRAG DOCH NUR.',
    'WO IST HUSEYIN?',
    'FAHRT IHR ZU ESAT?',
    'KANN ICH MITKOMMEN?',
    'YUSUF. YUSUF. YUSUF.',
    'HAST DU MEINE NACHRICHT GESEHEN?',
    'WARUM SCHREIBST DU NICHT ZURÜCK?',
    'ZOCKST DU HEUTE NOCH?',
    'WANN GEHST DU SCHLAFEN?'
  ];

  /* ---------------------------------------------------------------
     Sprüche, die zufällig eingestreut werden
     --------------------------------------------------------------- */

  var SLEEP_LINES = [
    'ZZZ...',
    'NUR KURZ DIE AUGEN ZU.',
    'ICH RUHE MICH TAKTISCH AUS.',
    'IM TRAUM BIN ICH SCHON IM ZIEL.',
    'DAS IST REGENERATION, HUSEYIN.',
    'ZZZ... DÖNER... ZZZ...',
    'NUR NOCH EINE RUNDE... ZZZ...',
    'ICH WAR BIS VIER WACH. ZOCKEN.',
    'ZZZ... RESPAWN... ZZZ...'
  ];

  var HURT_LINES = [
    'AUA!', 'DAS WAR UNFAIR!', 'MEIN HONIG!', 'OKAY. AUTSCH.',
    'ICH BIN VERLETZT. SEELISCH.', 'DAS ZAHLT MEINE VERSICHERUNG NICHT.',
    'DAS WAR EIN HITBOX-FEHLER.', 'DER HAT GECAMPT!'
  ];

  /* Der Laufgag: Yusuf hat NIE Hunger. Er isst trotzdem. Immer. */
  var EAT_LINES = [
    'ICH HAB EIGENTLICH KEINEN HUNGER.',
    'NUR EINEN. DANN IST SCHLUSS.',
    'DAS ZÄHLT NICHT, ICH STEH DABEI.',
    'ICH ESS NUR, DAMIT ER NICHT SCHLECHT WIRD.',
    'DAS IST MEIN ERSTER HEUTE. GLAUB ICH.',
    'ICH BIN SATT. ABER NICHT FERTIG.',
    'MEIN MAGEN HAT ANGERUFEN. ICH GEH RAN.',
    'ESSEN IST KEIN HOBBY. ES IST EIN BERUF.',
    'ICH HAB HEUTE SCHON GEGESSEN. VORGESTERN AUCH.',
    'DER LETZTE. ALSO DER VORLETZTE LETZTE.',
    'SATT IST EIN GEFÜHL. HUNGER IST EINE ENTSCHEIDUNG.',
    'ICH MACH DAS NUR AUS HÖFLICHKEIT.',
    'MHHHH. ABER HUNGER IST WAS ANDERES.',
    'ICH PROBIER NUR KURZ. SEIT ZWEI STUNDEN.'
  ];

  /* Eskaliert mit der Anzahl. Er sagt trotzdem, er hat keinen Hunger. */
  function eatLine(n) {
    if (n === 3) return 'DAS WAR DER DRITTE. ABER WER ZÄHLT.';
    if (n === 5) return 'FÜNF. ICH HAB KEINEN HUNGER, ICH SAMMLE NUR.';
    if (n === 8) return 'ACHT. IMMER NOCH KEIN HUNGER ÜBRIGENS.';
    if (n === 12) return 'ZWÖLF. ICH ESSE AUS RESPEKT VOR DEM KOCH.';
    if (n === 16) return 'SECHZEHN. DAS IST JETZT FORSCHUNG.';
    if (n === 20) return 'ZWANZIG. ICH BIN SATT SEIT NUMMER DREI.';
    if (n === 25) return 'FÜNFUNDZWANZIG. FRAG NICHT.';
    if (n === 30) return 'DREISSIG. ICH HAB NIE HUNGER GESAGT. NIE.';
    return EAT_LINES[(Math.random() * EAT_LINES.length) | 0];
  }

  var KUBIDE_LINES = [
    'KUBIDE! ENDLICH RICHTIGES ESSEN.',
    'IRANISCH SCHLÄGT ALLES. PUNKT.',
    'DAFÜR STEH ICH SOGAR AUF.',
    'ERFAN MACHT DAS BESSER. ABER OKAY.',
    'ICH HAB KEINEN HUNGER. ICH HAB RESPEKT.',
    'REIS UND FLEISCH. MEHR BRAUCHT KEINER.'
  ];

  function kubideLine(n) {
    if (n === 7) return 'SIEBEN KUBIDE. DAS IST KEINE MAHLZEIT, DAS IST EIN BESUCH.';
    if (n === 14) return 'VIERZEHN. ICH ZAHL DAS NATÜRLICH ALLES.';
    return KUBIDE_LINES[(Math.random() * KUBIDE_LINES.length) | 0];
  }

  /* Das tiefe Goblin-Knurren. */
  var GROWL_LINES = [
    'KRRRRR.', 'GRRRRH.', 'KRRRÖÖÖ.', 'HRRRMPF.',
    'KRRR... KRRR...', 'GRRR. ALLES GUT.', 'KRRRRRRR!'
  ];

  /* Lennart. Bulky. Sagt Dinge. */
  var LENNART_LINES = [
    'NOCH EINE WIEDERHOLUNG!', 'DAS IST NUR WASSER, BRO!',
    'BEINTAG IST JEDEN TAG!', 'HAST DU HEUTE SCHON TRAINIERT?',
    'GEHST DU AUCH INS GYM?', 'DAS SIND NUR 20 KILO!',
    'ICH MACH DAS IM DEFIZIT!', 'SITZ DU DA ODER TRAINIERST DU?'
  ];

  var DEATH_LINES = [
    'NOCHMAL. DIESMAL RICHTIG.',
    'ICH WAR NUR KURZ ABGELENKT.',
    'DAS WAR EIN TEST. FÜR DICH.',
    'HUSEYIN HAT DAS NICHT GESEHEN.',
    'ICH BRAUCHE EINEN DÖNER UND EINE MINUTE.',
    'LAG. EINDEUTIG LAG.',
    'MEIN CONTROLLER DRIFTET.',
    'DAS WAR DER SERVER, NICHT ICH.',
    'ICH HAB NUR KURZ AUFS HANDY GESCHAUT.'
  ];

  var LEVELS = [lvl1.out(), lvl2.out(), lvl3.out(), lvl4.out(),
                lvl5.out(), lvl6.out(), lvl7.out()];

  global.Levels = {
    list: LEVELS,
    boss: BOSS_DIALOG,
    esat: ESAT_DIALOG,
    mini: MINI_DIALOG,
    stilbruch: STILBRUCH_DIALOG,
    mirkanLines: MIRKAN_LINES,
    sleepLines: SLEEP_LINES,
    hurtLines: HURT_LINES,
    eatLines: EAT_LINES,
    deathLines: DEATH_LINES,
    growlLines: GROWL_LINES,
    lennartLines: LENNART_LINES,
    eatLine: eatLine,
    kubideLine: kubideLine
  };

})(window);
