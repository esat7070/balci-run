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
      par: cfg.par || 120
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
    goal: [199, 15],
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
      .q(102, 10, 'honig', 3).q(136, 11, 'baklava').q(176, 11, 'gold');

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
    theme: 'garten', music: 'l2', w: 228, h: 18, spawn: [3, 15], par: 110,
    goal: [220, 15],
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
      .g(205, 227, 15);

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
      .q(196, 10, 'honig', 4);

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
    theme: 'gym', music: 'l3', w: 212, h: 26, spawn: [3, 23], par: 130,
    goal: [204, 11],
    intro: [
      ['huseyin', 'WILLKOMMEN IM FITNESSSTUDIO. KENNST DU NICHT, WA?'],
      ['yusuf', 'ICH WAR HIER. 2021. EINMAL. WAR VOLL.'],
      ['huseyin', 'DU WARST IM CAFE NEBENAN.'],
      ['yusuf', 'DAS GEBÄUDE ZÄHLT.'],
      ['huseyin', 'HEUTE IST BEINTAG.'],
      ['yusuf', 'BEI MIR IST HEUTE SITZTAG.']
    ],
    outro: [
      ['yusuf', 'ICH HAB DEN GANZEN LADEN GESTAMPFT. OHNE ANMELDUNG.'],
      ['huseyin', 'DAS IST KEIN TRAINING, YUSUF.'],
      ['yusuf', 'ICH HAB 11.000 SCHRITTE. IM SPRINGEN.']
    ]
  });

  lvl3.g(0, 22, 23).g(27, 40, 23).g(45, 56, 21).g(61, 74, 23)
      .g(79, 90, 19).g(95, 108, 23).g(113, 124, 17).g(129, 142, 21)
      .g(147, 158, 15).g(163, 176, 19).g(181, 192, 13).g(197, 211, 11);

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
      .q(186, 9, 'gold');

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

  lvl3.row('bro', 23, [12, 34, 68, 102, 106])
      .row('bro', 21, [50, 138])
      .row('bro', 19, [84, 170])
      .row('bro', 17, [120])
      .row('bro', 15, [152])
      .row('bro', 13, [188])
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
    theme: 'kueche', music: 'l4', w: 236, h: 18, spawn: [3, 15], par: 140,
    goal: [228, 15],
    intro: [
      ['yusuf', 'DIE KÜCHE. ENDLICH HEIMSPIEL.'],
      ['huseyin', 'ICH HABE DEN KÜHLSCHRANK UMGEBAUT.'],
      ['huseyin', 'DA IST JETZT SALAT DRIN. NUR SALAT.'],
      ['yusuf', 'DAS IST EIN VERBRECHEN.'],
      ['huseyin', 'DAS IST ERNÄHRUNG.'],
      ['yusuf', 'ICH HOL MIR MEIN GLASRECHT ZURÜCK.']
    ],
    outro: [
      ['yusuf', 'ICH HAB DEN SALAT GEFUNDEN. UND DEN DÖNER DAHINTER.'],
      ['huseyin', '...WIE HAST DU DEN GEFUNDEN?'],
      ['yusuf', 'ICH HÖRE DÖNER, HUSEYIN. ICH HÖRE IHN.']
    ]
  });

  lvl4.g(0, 16, 15).g(22, 32, 15).g(38, 46, 13).g(52, 62, 15)
      .g(68, 76, 12).g(82, 94, 15).g(100, 108, 13).g(114, 126, 15)
      .g(132, 140, 11).g(146, 158, 14).g(164, 172, 12).g(178, 190, 15)
      .g(196, 206, 13).g(212, 235, 15);

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
      .row('bro', 15, [56, 124, 190]);

  lvl4.cp(58, 15).cp(122, 15).cp(186, 15);

  lvl4.sign(5, 15, 'GABELN IM BODEN. GANZ NORMALE KÜCHE.')
      .sign(54, 15, 'NUR EIN DÖNER, HAT ER GESAGT. VOR NEUN DÖNERN.')
      .sign(116, 15, 'ÖL IST HEISS. DAS IST DER GANZE TRICK.')
      .sign(214, 15, 'LETZTES LEVEL. ER WARTET OBEN.');

  /* ---------------------------------------------------------------
     LEVEL 5 — Husseins Salat-Festung + Endgegner
     --------------------------------------------------------------- */

  var lvl5 = L({
    id: 5, name: 'HUSEYINS SALAT-FESTUNG', sub: 'GEBAUT AUS DISZIPLIN. UND SALAT.',
    theme: 'festung', music: 'l5', w: 214, h: 18, spawn: [3, 15], par: 150,
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
      .q(142, 7, 'doener').q(160, 10, 'gold')
      .q(176, 10, 'doener').q(196, 10, 'doener');

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
      .it('honig', 141, 6).it('honig', 183, 6).it('honig', 184, 6);

  lvl5.row('salat', 15, [12, 28, 62, 90, 126])
      .row('salat', 13, [44, 106])
      .row('broki', 15, [8, 32, 94, 122])
      .row('broki', 12, [74, 138])
      .row('broki', 11, [140])
      .row('bro', 15, [58, 96, 128])
      .row('bro', 13, [48, 110])
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
      ['', 'SIE ASSEN 40 GLÄSER HONIG.'],
      ['', 'HUSEYIN SAGTE, ES WAR PROTEIN.'],
      ['', 'YUSUF SCHLIEF DIREKT DANACH EIN.'],
      ['', 'ENDE.']
    ]
  };

  /* ---------------------------------------------------------------
     Sprüche, die zufällig eingestreut werden
     --------------------------------------------------------------- */

  var SLEEP_LINES = [
    'ZZZ...',
    'NUR KURZ DIE AUGEN ZU.',
    'ICH RUHE MICH TAKTISCH AUS.',
    'IM TRAUM BIN ICH SCHON IM ZIEL.',
    'DAS IST REGENERATION, HUSEYIN.',
    'ZZZ... DÖNER... ZZZ...'
  ];

  var HURT_LINES = [
    'AUA!', 'DAS WAR UNFAIR!', 'MEIN HONIG!', 'OKAY. AUTSCH.',
    'ICH BIN VERLETZT. SEELISCH.', 'DAS ZAHLT MEINE VERSICHERUNG NICHT.'
  ];

  var EAT_LINES = [
    'MHHHH.', 'GENAU DAS BRAUCHTE ICH.', 'DAS IST MEDIZIN.',
    'NOCH EINEN?', 'HÖ HÖ HÖÖÖ!', 'LECKER. WEITER.'
  ];

  var DEATH_LINES = [
    'NOCHMAL. DIESMAL RICHTIG.',
    'ICH WAR NUR KURZ ABGELENKT.',
    'DAS WAR EIN TEST. FÜR DICH.',
    'HUSEYIN HAT DAS NICHT GESEHEN.',
    'ICH BRAUCHE EINEN DÖNER UND EINE MINUTE.'
  ];

  var LEVELS = [lvl1.out(), lvl2.out(), lvl3.out(), lvl4.out(), lvl5.out()];

  global.Levels = {
    list: LEVELS,
    boss: BOSS_DIALOG,
    sleepLines: SLEEP_LINES,
    hurtLines: HURT_LINES,
    eatLines: EAT_LINES,
    deathLines: DEATH_LINES
  };

})(window);
