/* =====================================================================
   levels.js — Alle Level, alle Bosse und viel zu viele Sprüche.
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
      bike: !!cfg.bike,       // Level 12: Yusuf faehrt Fahrrad
      kickers: [],            // Rampen fuers Fahrrad
      direct: !!cfg.direct,   // nach dem Outro direkt ins naechste Level
      buddy: cfg.buddy || null,           // wer hinter Yusuf herlaeuft (Esat)
      buddyLines: cfg.buddyLines || null, // was er dabei sagt
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
    /** Rampe (nur Fahrrad): liegt auf den Kacheln x-1 und x, Boden bei y.
        An der rechten Kante hebt man ab. */
    kick: function (x, y) { this.d.kickers.push([x, y]); return this; },
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

  // MIRKANS ARENA: weite Strasse. Er stuermt mit dem Wagen, also braucht
  // man Platz zum Ausweichen und niedrige Stufen zum Runterspringen.
  lvl2.g(230, 261, 15);
  lvl2.p(234, 11, 4).p(244, 8, 4).p(254, 11, 4);
  lvl2.bossAt(246, 15);
  lvl2.d.bossType = 'mirkan';
  lvl2.d.arena = { x: 230, w: 32 };
  lvl2.q(240, 10, 'doener', 2).it('herz', 245, 7);

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

  // LENNARTS ARENA: Hanteln fliegen im Bogen. Eine Pyramide zum
  // Hochklettern, damit man von oben auf ihn drauf kommt.
  lvl3.g(216, 247, 11);
  lvl3.p(220, 7, 3).p(228, 5, 5).p(238, 7, 3).p(244, 6, 3);
  lvl3.bossAt(232, 11);
  lvl3.d.bossType = 'lennart';
  lvl3.d.arena = { x: 216, w: 32 };
  lvl3.q(226, 6, 'doener', 2).it('herz', 229, 4);

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
    goal: [264, 15], diff: 1.1,
    intro: [
      ['yusuf', 'DIE KÜCHE. ENDLICH HEIMSPIEL.'],
      ['huseyin', 'ICH HABE DEN KÜHLSCHRANK UMGEBAUT.'],
      ['huseyin', 'DA IST JETZT SALAT DRIN. NUR SALAT.'],
      ['yusuf', 'DAS IST EIN VERBRECHEN.'],
      ['huseyin', 'DAS IST ERNÄHRUNG.'],
      ['yusuf', 'UND WO IST ERFAN?'],
      ['huseyin', 'DER KOCH? GANZ HINTEN. SEHR SCHLECHT GELAUNT.'],
      ['huseyin', 'ICH HAB SEIN KUBIDE-FLEISCH WEGGESPERRT.'],
      ['huseyin', 'SOLANGE ER KUBIDE MACHT, HÖRST DU NIE AUF.'],
      ['yusuf', 'HAST DU SEINEN SAFRAN ANGEFASST?'],
      ['huseyin', '...NUR KURZ.'],
      ['yusuf', 'HUSEYIN.'],
      ['yusuf', 'DAS IST DAS SCHLIMMSTE, WAS DU JE GEMACHT HAST.']
    ],
    outro: [
      ['erfan', 'SAG DEINEM BRUDER, ER SOLL NICHTS MEHR ANFASSEN.'],
      ['yusuf', 'SAG ICH IHM.'],
      ['erfan', 'UND WENN DOCH, RUF MICH AN.']
    ]
  });

  lvl4.g(0, 16, 15).g(22, 32, 15).g(38, 46, 13).g(52, 62, 15)
      .g(68, 76, 12).g(82, 94, 15).g(100, 108, 13).g(114, 126, 15)
      .g(132, 140, 11).g(146, 158, 14).g(164, 172, 12).g(178, 190, 15)
      .g(196, 206, 13).g(212, 237, 15);

  // ERFANS ARENA: sein Pfannenschlag schickt Wellen ueber den Boden.
  // Drei kleine Inseln, auf denen man ihnen ausweichen kann.
  lvl4.g(238, 269, 15);
  lvl4.p(242, 11, 3).p(250, 11, 3).p(258, 11, 3).p(249, 7, 5);
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
      .q(74, 7, 'gold').q(92, 11, 'honig', 5).q(116, 10, 'baklava')
      .q(138, 6, 'doener').q(156, 10, 'honig', 5).q(188, 11, 'gold')
      .q(216, 11, 'honig', 5);

  lvl4.k(14, 12).k(15, 12, 'honig').k(40, 12).k(66, 11).k(67, 11)
      .k(98, 12).k(99, 12, 'doener').k(130, 10).k(131, 10)
      .k(162, 11).k(180, 12).k(181, 12, 'honig').k(210, 12).k(228, 12);

  // Sprungfedern NIE in ein Gabelfeld setzen — man federt hoch und
  // landet direkt wieder drin. Alle stehen jetzt daneben.
  lvl4.sp(24, 14).sp(70, 11).sp(84, 14).sp(116, 14).sp(181, 14);

  lvl4.trail(4, 13, 6, 2).trail(23, 13, 5, 2, 3).trail(39, 11, 4, 2, 2)
      .trail(53, 13, 5, 2, 3).trail(69, 10, 4, 2, 2).trail(83, 13, 6, 2, 3)
      .trail(101, 11, 4, 2, 2).trail(115, 13, 6, 2, 3).trail(133, 9, 4, 2, 2)
      .trail(147, 12, 6, 2, 3).trail(165, 10, 4, 2, 2).trail(179, 13, 6, 2, 3)
      .trail(197, 11, 5, 2, 2).trail(213, 13, 10, 2, 3);

  lvl4.it('herz', 45, 6).it('herz', 137, 5).it('herz', 225, 8)
      .it('herz', 89, 9).it('herz', 167, 7).it('doener', 101, 12)
      .it('honig', 9, 9).it('honig', 10, 9).it('honig', 73, 7)
      .it('honig', 137, 6).it('honig', 169, 7).it('honig', 201, 8);

  // Gegner stehen ebenfalls nicht mehr in Gabeln oder Öl
  lvl4.row('salat', 15, [10, 25, 60, 86, 125, 178, 214, 230])
      .row('salat', 13, [39, 101, 197])
      .row('salat', 12, [72, 168])
      .row('salat', 14, [147])
      .row('broki', 15, [30, 93, 118, 216])
      .row('broki', 11, [136])
      .row('drohne', 9, [36, 80, 112, 160, 194])
      .row('biene', 10, [54, 128, 206])
      .row('lennart', 15, [54, 124, 190]);

  // Checkpoints liegen HINTER den Gabelfeldern — vorher lagen sie mitten
  // drin, und man tauchte nach einem Tod direkt in den Gabeln wieder auf.
  lvl4.cp(61, 15).cp(125, 15).cp(189, 15);

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
      .q(78, 7, 'gold').q(96, 11, 'honig', 5).q(120, 10, 'baklava')
      .q(142, 6, 'doener').q(160, 9, 'gold').q(60, 11, 'kippen')
      .q(176, 10, 'doener', 3).q(196, 10, 'doener', 3)
      .q(186, 6, 'kippen');

  lvl5.k(16, 12).k(17, 12, 'honig').k(42, 12).k(70, 11).k(71, 11)
      .k(102, 12).k(103, 12, 'doener').k(134, 10).k(135, 10)
      .k(164, 11).k(186, 12).k(187, 12, 'honig');

  lvl5.sp(26, 14).sp(58, 14).sp(88, 14).sp(120, 14);

  lvl5.trail(4, 13, 7, 2).trail(25, 13, 5, 2, 3).trail(41, 11, 4, 2, 2)
      .trail(57, 13, 5, 2, 3).trail(73, 10, 4, 2, 2).trail(87, 13, 6, 2, 3)
      .trail(105, 11, 4, 2, 2).trail(119, 13, 6, 2, 3).trail(137, 9, 4, 2, 2)
      .trail(151, 12, 6, 2, 3);

  lvl5.it('herz', 47, 6).it('herz', 141, 5).it('herz', 157, 8)
      .it('honig', 10, 9).it('honig', 11, 9).it('honig', 77, 7)
      .it('honig', 141, 6).it('honig', 183, 6).it('honig', 184, 6)
      // Verpflegung in der Arena — der Kampf soll fordernd sein, nicht unfair
      .it('herz', 172, 9).it('herz', 194, 9).it('kubide', 183, 5);

  lvl5.row('salat', 15, [12, 24, 57, 90, 121])
      .row('salat', 13, [41, 106])
      .row('broki', 15, [8, 32, 97, 122])
      .row('broki', 12, [74, 138])
      .row('broki', 11, [140])
      .row('lennart', 15, [58, 96, 128])
      .row('lennart', 13, [48, 112])
      .row('drohne', 9, [38, 84, 116, 152])
      .row('biene', 10, [56, 100, 144])
      .row('biene', 8, [80, 148])
      .row('wecker', 15, [26, 64, 88, 158]);

  // Hinter den Dressing-Pfuetzen, nicht mitten drin (siehe Level 4)
  lvl5.cp(65, 15).cp(129, 15).cp(158, 14);

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
      ['', 'GAS GEBEN MIT RECHTS. SPERREN WERDEN ÜBERFAHREN.'],
      ['', 'ACHTUNG: ROTE AMPELN, POLIZEI UND STRAFZETTEL.']
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

  // Polizei am Strassenrand: wirft Strafzettel, hechtet vor dem Mustang weg
  lvl6.row('polizei', 15, [36, 72, 122, 164, 214]);

  lvl6.cp(110, 15).cp(212, 15);

  // Ampeln. Wer bei Rot drueberfaehrt, wird geblitzt.
  lvl6.d.ampeln = [30, 86, 136, 182, 232];

  // Die Kollegen stossen unterwegs dazu
  lvl6.d.convoy = [{ who: 'erfan', at: 20 }, { who: 'lennart', at: 114 }];

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
    theme: 'strasse', music: 'bossfinal', w: 56, h: 18, spawn: [4, 15], par: 200,
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
     LEVEL 8 — Der Morgen danach. Kein Springen, sondern Essen:
     Erfan ruft an, Yusuf steht auf und raeumt den Tisch leer.
     --------------------------------------------------------------- */

  var lvl8 = L({
    id: 8, name: 'DER MORGEN DANACH', sub: 'SONNTAG, 13:40 UHR',
    theme: 'zimmer', music: 'l1', w: 32, h: 18, spawn: [3, 15], par: 120,
    goal: [30, 15], diff: 1,
    intro: [], outro: []
  });
  lvl8.g(0, 31, 15);          // nur damit die Welt etwas zum Laden hat

  // Die Szene selbst steht in src/eat.js. Hier nur, was es zu essen gibt.
  lvl8.d.eat = {
    goal: 10000,
    foods: [
      { spr: 'food_beefy',   name: 'BEEFY',     kcal: 780 },
      { spr: 'food_rippen',  name: 'RIPPEN',    kcal: 640 },
      { spr: 'food_chips',   name: 'CHIPS',     kcal: 1100 },
      { spr: 'doener',       name: 'DÖNER',     kcal: 1300 },
      { spr: 'food_pommes',  name: 'POMMES',    kcal: 520 },
      { spr: 'food_schoko',  name: 'SCHOKO',    kcal: 550 },
      { spr: 'food_nuggets', name: 'NUGGETS',   kcal: 430 }
    ],
    // Dazwischen liegt manchmal etwas Gesundes. Das kostet ein Herz.
    bad: [
      { spr: 'salat', name: 'SALAT', kcal: 0, bad: true, line: 'SALAT? IN MEINER WOHNUNG?' },
      { spr: 'broki', name: 'BROKKOLI', kcal: 0, bad: true, line: 'DAS IST EIN BAUM!' },
      { spr: 'food_apfel', name: 'APFEL', kcal: 0, bad: true, line: 'DAS SIND NULL KALORIEN!' }
    ]
  };

  lvl8.d.phone = [
    ['', 'SONNTAG. 13:40 UHR.'],
    ['', 'DAS HANDY KLINGELT SEIT ZWANZIG MINUTEN.'],
    ['erfan', 'YUSUF! WACH AUF!'],
    ['yusuf', 'MMPFH.'],
    ['erfan', 'STEH AUF. SOFORT.'],
    ['yusuf', 'ICH BIN WACH. ICH LIEGE NUR NOCH.'],
    ['erfan', 'DU LIEGST AUF DEINEM ESSEN.'],
    ['yusuf', '...DAS IST MEIN FRÜHSTÜCK. VON GESTERN.'],
    ['erfan', 'ICH HAB DIR WAS AUF DEN TISCH GESTELLT.'],
    ['erfan', 'ISS ES AUF. ALLES. DANN REDEN WIR WEITER.'],
    ['yusuf', 'ICH HAB EIGENTLICH GAR KEINEN HUNGER.'],
    ['erfan', '...'],
    ['yusuf', 'ABER ICH ESS DAS JETZT KOMPLETT.'],
    ['', 'ZIEH DAS ESSEN ZU YUSUF. 10.000 KALORIEN.']
  ];

  lvl8.d.full = [
    ['', 'DER TISCH IST LEER. DER TELLER AUCH.'],
    ['yusuf', 'HÖ HÖ HÖÖÖ.'],
    ['yusuf', 'DAS WAR DIE VORSPEISE.'],
    ['erfan', 'DAS WAREN ZEHNTAUSEND KALORIEN, YUSUF.'],
    ['yusuf', 'ICH HAB IMMER NOCH HUNGER.'],
    ['erfan', 'ICH WEISS. DARUM KOMME ICH JETZT VORBEI.'],
    ['', 'YUSUF STEHT AUF. ZUM ZWEITEN MAL HEUTE.'],
    ['yusuf', 'IM KÜHLSCHRANK IST NICHTS MEHR.'],
    ['erfan', 'DANN GEH EINKAUFEN.'],
    ['yusuf', 'ICH NEHM DEN GROSSEN WAGEN.'],
    ['', 'SPARMARKT. NOCH 40 MINUTEN BIS LADENSCHLUSS.']
  ];

  /* ---------------------------------------------------------------
     LEVEL 9 — Sparmarkt. Gemuese, Snacks, Fleisch, und in der
     Getraenkeabteilung steht Alex.
     --------------------------------------------------------------- */

  var lvl9 = L({
    id: 9, name: 'SPARMARKT', sub: 'ER WOLLTE NUR EIN PAAR SACHEN',
    theme: 'markt', music: 'l4', w: 236, h: 18, spawn: [3, 15], par: 170,
    goal: [232, 15], diff: 1.35,
    intro: [
      ['', 'SPARMARKT. 14:20 UHR.'],
      ['yusuf', 'ICH BRAUCHE NUR EIN PAAR SACHEN.'],
      ['yusuf', 'EIN PAAR SACHEN HEISST HEUTE: ALLES.'],
      ['yusuf', 'ERFAN HAT GESAGT, ICH SOLL AUFHÖREN.'],
      ['yusuf', 'ERFAN IST NICHT HIER.'],
      ['', 'EIN EINKAUFSWAGEN ROLLT VORBEI. VON ALLEIN.'],
      ['yusuf', 'DAS IST EIN ZEICHEN. ICH NEHM ZWEI WAGEN.']
    ],
    outro: []
  });

  // Vier Abteilungen, dazwischen jeweils eine Luecke
  lvl9.g(0, 58, 15).g(63, 118, 15).g(123, 178, 15).g(183, 235, 15);
  lvl9.p(59, 13, 4).p(119, 13, 4).p(179, 13, 4);

  // Regale zum Draufspringen
  lvl9.p(8, 11, 6).p(20, 11, 6).p(32, 11, 6).p(44, 11, 6)
      .p(14, 8, 5).p(38, 8, 5);
  lvl9.p(68, 11, 6).p(80, 11, 6).p(92, 11, 6).p(104, 11, 6)
      .p(74, 8, 5).p(98, 8, 5);
  lvl9.p(128, 11, 6).p(140, 11, 6).p(152, 11, 6).p(164, 11, 6)
      .p(134, 8, 5).p(158, 8, 5);

  // ALEX' ARENA: die Getraenkeabteilung. Er klettert auf die Regale
  // und trinkt dort oben weiter, also stehen sie dichter.
  lvl9.p(190, 11, 5).p(200, 8, 6).p(212, 11, 5).p(222, 8, 5);
  lvl9.bossAt(216, 15);
  lvl9.d.bossType = 'alex';
  lvl9.d.arena = { x: 183, w: 53 };

  // Umgekipptes Zeug auf dem Boden
  lvl9.hz(36, 38, 14, 'oel').hz(88, 90, 14, 'oel').hz(148, 150, 14, 'oel');

  lvl9.q(28, 11, 'honig', 5).q(52, 11, 'doener').q(86, 11, 'honig', 5)
      .q(110, 11, 'kippen').q(146, 11, 'doener').q(170, 11, 'honig', 5)
      .q(196, 11, 'gold');

  lvl9.k(12, 14).k(24, 14).k(48, 14).k(72, 14).k(96, 14)
      .k(130, 14).k(154, 14).k(172, 14);

  lvl9.trail(4, 13, 6, 2).trail(64, 13, 6, 2, 2).trail(124, 13, 6, 2, 2)
      .trail(184, 13, 5, 2, 2);

  lvl9.it('herz', 30, 10).it('herz', 94, 10).it('herz', 168, 10)
      .it('kubide', 56, 10).it('doener', 112, 10);

  // Gemuese rollt, Wuerste laufen, Einkaufswagen sind ueberall
  lvl9.row('wagen', 15, [10, 26, 42, 70, 92, 104, 130, 144, 166, 188])
      .row('tomate', 15, [18, 34, 50, 78, 100])
      .row('broki', 15, [22, 46])
      .row('wurst', 15, [126, 138, 158, 174])
      .row('salat', 15, [14, 82, 128, 154])
      .row('drohne', 9, [36, 84, 132, 170]);

  lvl9.cp(64, 15).cp(124, 15).cp(186, 15);

  lvl9.sign(6, 15, 'SPARMARKT. SPAREN BIS ES WEHTUT.')
      .sign(30, 15, 'OBST & GEMÜSE. YUSUF GEHT HIER SCHNELLER.')
      .sign(70, 15, 'SNACKS. HIER WIRD ER LANGSAMER.')
      .sign(126, 15, 'FLEISCH & WURST. HEIMATGEFÜHL.')
      .sign(187, 15, 'GETRÄNKE. HIER STEHT IMMER JEMAND.');

  /* ---------------------------------------------------------------
     LEVEL 10 — Der Heimweg. Sechs Tueten, achthundert Meter.
     --------------------------------------------------------------- */

  var lvl10 = L({
    id: 10, name: 'DER HEIMWEG', sub: 'SECHS TÜTEN, ACHTHUNDERT METER',
    theme: 'strasse', music: 'l6', w: 160, h: 18, spawn: [3, 15], par: 130,
    goal: [156, 15], diff: 1.25, direct: true,
    intro: [
      ['', 'DRAUSSEN. 15:05 UHR. SECHS TÜTEN.'],
      ['yusuf', 'DER WEG IST NICHT WEIT. ACHTHUNDERT METER.'],
      ['yusuf', 'ICH SCHAFF DAS. ICH BIN IM GRUNDE EIN ATHLET.'],
      ['', 'DIE TÜTEN WIEGEN MEHR ALS YUSUF.']
    ],
    outro: [
      ['', 'DIE STRASSE. DAS HAUS. DIE HAUSTÜR.'],
      ['yusuf', 'GESCHAFFT. ACHTHUNDERT METER.'],
      ['yusuf', 'JETZT NUR NOCH REIN UND AUF DIE COUCH.'],
      ['', 'VOR DER HAUSTÜR STEHT JEMAND.'],
      ['', 'LEDERJACKE. HAARE WIE FRISCH AUS DEM WIND.'],
      ['yusuf', '...BROKE?']
    ]
  });

  // Der Heimweg geht nicht mehr geradeaus: Gehweg, Gerueste, Dächer,
  // Sprungkissen und eine Baustellen-Plattform.
  lvl10.g(0, 26, 15).g(31, 54, 15).g(59, 86, 15).g(91, 120, 15).g(125, 159, 15);
  lvl10.p(27, 13, 4).p(55, 13, 4).p(87, 13, 4).p(121, 13, 4);
  // Geparkte Autos und Mauern zum Draufspringen
  lvl10.p(8, 12, 6).p(18, 10, 5).p(68, 12, 6).p(78, 10, 5)
       .p(132, 12, 6).p(144, 10, 6);
  // Baugeruest: zwei Ebenen uebereinander
  lvl10.p(36, 11, 10).p(40, 7, 8).p(34, 4, 4);
  lvl10.st(94, 14, 4, 1, 2).p(100, 10, 7).p(110, 7, 6);
  lvl10.sp(24, 14).sp(82, 14);                 // Matratzen am Strassenrand
  lvl10.mv(64, 9, 3, 'x', 4, 0.6).mv(116, 8, 2, 'y', 3, 0.5);
  lvl10.hz(45, 46, 14, 'oel').hz(106, 107, 14, 'oel');
  lvl10.d.bags = true;          // er schleppt die Tueten mit

  lvl10.q(14, 10, 'honig', 5).q(44, 6, 'doener').q(72, 10, 'honig', 5)
       .q(104, 6, 'kippen').q(140, 9, 'honig', 5);
  lvl10.k(22, 14).k(62, 14).k(76, 14).k(128, 14).k(129, 14);
  lvl10.trail(3, 13, 5, 2).trail(37, 10, 5, 2, 2).trail(60, 13, 5, 2, 2)
       .trail(92, 13, 4, 2).trail(101, 9, 6, 2, 2).trail(126, 13, 6, 2, 2);
  lvl10.it('herz', 42, 6).it('doener', 113, 6).it('herz', 146, 9).it('kubide', 35, 3);

  // Aus dem Markt rollt ihm die halbe Gemueseabteilung hinterher
  lvl10.row('wagen', 15, [16, 50, 78, 112, 140])
       .row('tomate', 15, [34, 66, 98, 130])
       .row('broki', 15, [24, 84, 134])
       .row('salat', 15, [40, 100])
       .row('polizei', 15, [52, 118])
       .row('drohne', 9, [30, 72, 116])
       .row('biene', 10, [46, 92, 148])
       .e('wecker', 38, 11).e('salat', 42, 7).e('tomate', 102, 10).e('broki', 146, 10);

  lvl10.cp(32, 15).cp(92, 15).cp(127, 15);
  lvl10.sign(6, 15, 'ACHTHUNDERT METER. MIT SECHS TÜTEN.')
       .sign(33, 15, 'BAUSTELLE. SEIT ZWEI JAHREN.')
       .sign(60, 15, 'EINE TÜTE REISST IMMER. IMMER DIE SCHWERSTE.')
       .sign(126, 15, 'ER SIEHT SCHON SEIN HAUS. FAST.');

  /* ---------------------------------------------------------------
     LEVEL 11 — Vor der Haustuer. Broke wartet schon und will kaempfen.
     Nur zum Testen, sagt er. Und er hat die Mikas mitgebracht.
     --------------------------------------------------------------- */

  var lvl11 = L({
    id: 11, name: 'VOR DER HAUSTÜR', sub: 'BROKE WARTET SCHON',
    theme: 'siedlung', music: 'boss2', w: 60, h: 18, spawn: [5, 15], par: 150,
    goal: [56, 15], diff: 1.35,
    intro: [
      ['', 'VOR YUSUFS HAUS. 15:40 UHR.'],
      ['broke', 'YUSUF! DA BIST DU JA ENDLICH.'],
      ['yusuf', 'BROKE. WAS MACHST DU VOR MEINER TÜR?'],
      ['broke', 'ICH WARTE. SEIT ZWEI STUNDEN.'],
      ['yusuf', 'ICH WAR EINKAUFEN.'],
      ['broke', 'SEH ICH. STELL DIE TÜTEN AB. WIR KÄMPFEN.'],
      ['yusuf', 'WARUM DAS DENN?'],
      ['broke', 'NUR ZUM TESTEN. OB DU NOCH IN FORM BIST.'],
      ['yusuf', 'ICH WAR NIE IN FORM.'],
      ['broke', 'DANN WIRD ES EIN KURZER TEST.'],
      ['broke', 'ACH JA. ICH HAB DIE MIKAS MITGEBRACHT.'],
      ['yusuf', 'WER SIND DIE MIKAS?'],
      ['broke', 'MEINE KLEINEN KOLLEGEN. SIE HEISSEN ALLE MIKA.'],
      ['mika', 'HALLO.'],
      ['mika', 'HALLO.'],
      ['yusuf', 'DAS WAR ZWEIMAL DERSELBE.'],
      ['broke', 'NEIN. DAS WAREN ZWEI MIKAS. UND ES WERDEN MEHR.'],
      ['', 'YUSUF STELLT DIE TÜTEN AB. VORSICHTIG. EINE NACH DER ANDEREN.']
    ],
    outro: []
  });

  lvl11.g(0, 59, 15);
  lvl11.p(10, 11, 6).p(24, 8, 7).p(40, 11, 6).p(17, 5, 5).p(34, 4, 6).p(49, 8, 6);
  lvl11.q(13, 7, 'doener', 3).q(43, 7, 'doener', 3).q(30, 11, 'kippen');
  lvl11.it('herz', 11, 9).it('herz', 45, 9).it('kubide', 36, 2);
  lvl11.trail(8, 13, 5, 2, 2).trail(46, 13, 5, 2, 2);
  // Broke steht schon vor der Tuer, zwei Mikas daneben — die sagen HALLO
  lvl11.e('mika', 24, 15).e('mika', 27, 15);
  lvl11.bossAt(20, 15);
  lvl11.d.bossType = 'broke';
  lvl11.d.arena = { x: 0, w: 60 };
  lvl11.d.deko = 'haus';          // Yusufs Haus mit den Tueten vor der Tuer

  /* ---------------------------------------------------------------
     LEVEL 12 — Downhill mit Esat. Der Hausberg, von oben nach unten.
     Rampen, Rueckwaertssaltos, Honig in der Luft. Und auf halber
     Strecke hat Lennart seinen grossen Auftritt.
     --------------------------------------------------------------- */

  var lvl12 = L({
    id: 12, name: 'DOWNHILL', sub: 'MIT ESAT AM HAUSBERG',
    theme: 'berg', music: 'l2', w: 312, h: 42, spawn: [4, 8], par: 120,
    goal: [304, 39], diff: 1.2, bike: true, direct: true,
    buddy: 'esat', buddyLines: 'esatRideLines',
    intro: [
      ['', 'DER HAUSBERG. 9:10 UHR.'],
      ['esat', 'DAS IST MEIN HAUSBERG. ICH FAHR HIER JEDEN SONNTAG.'],
      ['yusuf', 'ES IST MONTAG.'],
      ['esat', 'DANN HALT AUCH MONTAGS.'],
      ['yusuf', 'WO IST DER LIFT?'],
      ['esat', 'ES GIBT KEINEN LIFT. WIR SIND OBEN. ES GEHT NUR NOCH RUNTER.'],
      ['yusuf', 'NUR RUNTER. DAS IST MEIN SPORT.'],
      ['esat', 'AUF DEN RAMPEN HEBST DU AB. IN DER LUFT: RÜCKWÄRTSSALTO.'],
      ['yusuf', 'EIN SALTO. MIT MIR DRAUF.'],
      ['esat', 'GIBT PUNKTE. UND UNTERWEGS LIEGT HONIG.'],
      ['yusuf', 'WARUM LIEGT HIER HONIG?'],
      ['esat', 'DAS FRAGST DU SEIT ELF LEVELN.'],
      ['', 'RECHTS = TRETEN. LINKS = BREMSEN. SPRUNG = HÜPFEN.'],
      ['', 'IN DER LUFT NOCHMAL SPRUNG = RÜCKWÄRTSSALTO. GERADE LANDEN!']
    ],
    outro: [
      ['', 'UNTEN. DIE BREMSEN QUALMEN. YUSUF AUCH.'],
      ['esat', 'NICHT SCHLECHT, YUSUF. WIRKLICH NICHT SCHLECHT.'],
      ['yusuf', 'ICH HAB EINEN RÜCKWÄRTSSALTO GEMACHT.'],
      ['esat', 'DU HAST DABEI GESCHRIEN.'],
      ['yusuf', 'VOR FREUDE.'],
      ['esat', 'UND LENNART?'],
      ['yusuf', 'WELCHER LENNART?'],
      ['esat', 'GENAU.'],
      ['esat', 'ICH MUSS KURZ HEIM. DUSCHEN.'],
      ['yusuf', 'UND ICH GEH SHAWARMA ESSEN.'],
      ['esat', 'DU HAST DOCH GAR KEINEN HUNGER.'],
      ['yusuf', 'NEIN. ABER HAMZA WARTET.']
    ]
  });

  // Von oben nach unten: jede Stufe ein Stueck tiefer. Das lange flache
  // Stueck (137-200) gehoert Lennart — da hat er seinen Auftritt.
  lvl12.g(0, 24, 8).g(25, 36, 10).g(37, 48, 12)
       .g(53, 70, 14).g(71, 84, 16).g(85, 104, 20)
       .g(105, 118, 22).g(124, 136, 23).g(137, 200, 24)
       .g(201, 212, 26).g(213, 234, 36).g(235, 252, 37)
       .g(258, 274, 38).g(275, 311, 39);

  // Rampen. Hinter jeder geht es weit runter oder ueber eine Luecke.
  lvl12.kick(46, 12).kick(80, 16).kick(116, 22).kick(210, 26).kick(250, 37);

  // Dornbuesche: nur mit einem Hopser drueber
  lvl12.hz(66, 66, 13, 'dornen').hz(112, 112, 21, 'dornen')
       .hz(244, 244, 36, 'dornen').hz(268, 269, 37, 'dornen');

  // Honig auf dem Weg — und in der Luft genau da, wo man hinfliegt
  lvl12.trail(6, 7, 7, 2).trail(26, 9, 5, 2).trail(38, 11, 4, 2)
       .trail(48, 10, 6, 2, 6).trail(60, 13, 3, 2)
       .trail(82, 14, 6, 2, 6).trail(96, 19, 4, 2)
       .trail(118, 20, 6, 2, 6).trail(142, 23, 5, 3)
       .trail(202, 25, 4, 2).trail(212, 24, 5, 2, 7)
       .it('honig', 222, 24).it('honig', 224, 29)
       .trail(236, 36, 4, 2).trail(252, 35, 6, 2, 6)
       .trail(276, 38, 8, 3);
  lvl12.q(92, 16, 'honig', 5).q(240, 33, 'herz').q(282, 35, 'honig', 5);
  lvl12.it('herz', 110, 19).it('kubide', 262, 35).it('doener', 180, 21);

  // Bienen verteidigen den Berg. Das Fahrrad faehrt einfach durch.
  lvl12.e('biene', 98, 17).e('biene', 128, 20).e('biene', 226, 32)
       .e('biene', 264, 34).e('biene', 292, 35);

  lvl12.cp(132, 23).cp(198, 24).cp(265, 38);

  lvl12.sign(8, 8, 'RECHTS = TRETEN. LINKS = BREMSEN.')
       .sign(40, 12, 'RAMPE = ABHEBEN. IN DER LUFT SPRUNG = SALTO.')
       .sign(58, 14, 'SCHIEF LANDEN TUT WEH. GERADE LANDEN.')
       .sign(204, 26, 'GROSSER SPRUNG. ZWEI SALTOS SCHAFFT NUR ESAT.')
       .sign(280, 39, 'FAST UNTEN. BREMSEN NICHT VERGESSEN.');

  // Lennarts Auftritt: ausgeloest ab Kachel 'at'. Er kommt von hinten,
  // springt ueber die beiden, macht einen Salto — und beim dritten
  // Sprung geht es schief.
  lvl12.d.lennart = { at: 138 };

  /* ---------------------------------------------------------------
     LEVEL 13 — Shawarma bei Hamza. Libanesisch. Der Spiess dreht sich,
     die Falafel rollen, und hinten wartet Hamza mit Hummus und Ball.
     --------------------------------------------------------------- */

  var lvl13 = L({
    id: 13, name: 'SHAWARMA BEI HAMZA', sub: 'LIBANESISCH. SEIT IMMER.',
    theme: 'imbiss', music: 'l4', w: 190, h: 18, spawn: [3, 15], par: 150,
    goal: [186, 15], diff: 1.35,
    intro: [
      ['', 'HAMZAS RESTAURANT. 12:40 UHR.'],
      ['', 'DER SPIESS DREHT SICH SEIT HEUTE MORGEN.'],
      ['yusuf', 'ES RIECHT NACH SHAWARMA.'],
      ['yusuf', 'UND NACH KNOBLAUCHSOSSE. AUF DEM BODEN.'],
      ['', 'AUS DER KÜCHE ROLLT EINE FALAFEL. SIE SIEHT WÜTEND AUS.'],
      ['yusuf', 'DAS IST MIR NOCH NIE PASSIERT. UND ICH ESSE VIEL FALAFEL.']
    ],
    outro: []
  });

  lvl13.g(0, 46, 15).g(51, 98, 15).g(103, 142, 15).g(147, 189, 15);
  lvl13.p(47, 13, 4).p(99, 13, 4).p(143, 13, 4);
  // Theke, Kueche, Gastraum: Tische und Tresen zum Draufspringen
  lvl13.p(10, 11, 5).p(22, 10, 8).p(36, 11, 5).p(26, 7, 4);
  lvl13.p(58, 11, 6).p(70, 9, 6).p(84, 11, 6).p(76, 6, 4);
  lvl13.p(108, 11, 5).p(118, 11, 5).p(128, 11, 5).p(113, 8, 4).p(123, 8, 4);
  // Hamzas Ecke: hinten im Laden, vor dem grossen Spiess
  lvl13.p(152, 11, 5).p(162, 8, 6).p(174, 11, 5).p(183, 8, 4);
  lvl13.bossAt(178, 15);
  lvl13.d.bossType = 'hamza';
  lvl13.d.arena = { x: 147, w: 43 };

  // Knoblauchsosse auf dem Boden
  lvl13.hz(29, 31, 14, 'toum').hz(64, 66, 14, 'toum')
       .hz(90, 92, 14, 'toum').hz(115, 117, 14, 'toum');

  lvl13.q(16, 11, 'honig', 5).q(62, 7, 'shawarma').q(100, 10, 'honig', 5)
       .q(125, 11, 'kippen').q(154, 7, 'honig', 4);
  lvl13.k(6, 14).k(44, 14).k(86, 14).k(138, 14);
  lvl13.trail(3, 13, 5, 2).trail(52, 13, 5, 2, 2).trail(104, 13, 5, 2, 2)
       .trail(148, 13, 4, 2, 2);
  lvl13.it('herz', 24, 8).it('shawarma', 78, 4).it('herz', 115, 6).it('shawarma', 186, 6);

  lvl13.row('falafel', 15, [12, 40, 60, 80, 110, 132])
       .row('peperoni', 15, [18, 34, 72, 96, 122])
       .row('pita', 9, [26, 66, 104, 128]);

  lvl13.cp(56, 15).cp(106, 15);
  lvl13.sign(5, 15, 'HAMZAS. LIBANESISCH. SEIT IMMER.')
       .sign(26, 15, 'KNOBLAUCHSOSSE AUF DEM BODEN. NICHT REINTRETEN.')
       .sign(54, 15, 'KÜCHE. DIE FALAFEL ROLLEN HIER FREI HERUM.')
       .sign(110, 15, 'GASTRAUM. BITTE NICHT AUF DIE TISCHE SPRINGEN.')
       .sign(150, 15, 'HAMZA. SEIN LADEN. SEIN HUMMUS.');

  /* ---------------------------------------------------------------
     LEVEL 14 — Stilbruch. Eine Shisha nach dem Essen, ganz entspannt.
     Dann ruelpst Yusuf. Esat geht die ganze Zeit mit.
     --------------------------------------------------------------- */

  var lvl14 = L({
    id: 14, name: 'STILBRUCH', sub: 'EINE SHISHA. GANZ ENTSPANNT.',
    theme: 'bar', music: 'l6', w: 200, h: 18, spawn: [3, 15], par: 160,
    goal: [196, 15], diff: 1.3, buddy: 'esat', buddyLines: 'esatBarLines',
    intro: [
      ['', 'SHISHA-BAR STILBRUCH. 21:10 UHR.'],
      ['esat', 'SO. JETZT GANZ ENTSPANNT. EINE SHISHA, DANN NACH HAUSE.'],
      ['yusuf', 'ICH HAB DREI SHAWARMA IM BAUCH.'],
      ['esat', 'VIER. ICH HAB MITGEZÄHLT.'],
      ['', 'YUSUF RÜLPST. SEHR LAUT. SEHR LANGE.'],
      ['', 'DIE GANZE BAR DREHT SICH UM.'],
      ['', 'AM NEBENTISCH STEHT JEMAND AUF. DANN NOCH JEMAND. DANN ALLE.'],
      ['typ', 'WAS WAR DAS, BRUDER?'],
      ['yusuf', 'EIN KOMPLIMENT AN DEN KOCH.'],
      ['typ', 'HIER GIBT ES KEINEN KOCH.'],
      ['esat', 'EY YUSUF. CHILL.'],
      ['yusuf', 'ICH BIN GECHILLT. DIE NICHT.'],
      ['', 'SIE GREIFEN ZU DEN ZANGEN. UND ZUR HEISSEN KOHLE.'],
      ['esat', 'OKAY. HINTEN IST UNSER TISCH RESERVIERT. DA WOLLEN WIR HIN.'],
      ['yusuf', 'DANN GEHEN WIR DA HIN.']
    ],
    outro: []
  });

  lvl14.g(0, 58, 15).g(59, 74, 13).g(75, 130, 15).g(131, 146, 12).g(147, 199, 15);
  // Sofas, Tische, die Lounge
  lvl14.p(10, 11, 6).p(24, 11, 6).p(38, 10, 6).p(50, 11, 5)
       .p(80, 11, 6).p(94, 10, 6).p(108, 11, 6).p(120, 9, 5)
       .p(152, 11, 6).p(166, 10, 6).p(180, 11, 6);
  // Umgekippte Kohle
  lvl14.hz(33, 34, 14, 'kohle').hz(88, 89, 14, 'kohle')
       .hz(160, 161, 14, 'kohle').hz(174, 175, 14, 'kohle');

  lvl14.q(18, 8, 'honig', 5).q(70, 9, 'doener').q(115, 6, 'kippen').q(160, 8, 'honig', 5);
  lvl14.trail(4, 13, 5, 2).trail(76, 13, 5, 2, 2).trail(132, 11, 6, 2).trail(148, 13, 5, 2, 2);
  lvl14.it('herz', 26, 9).it('herz', 122, 7).it('doener', 140, 10).it('herz', 182, 9);

  // Die Typen vom Nebentisch. Es sind viele.
  lvl14.row('typ1', 15, [16, 44, 84, 112, 156, 186])
       .row('typ2', 15, [28, 100, 170])
       .row('typ3', 15, [52, 124, 192])
       .e('typ2', 66, 13).e('typ1', 138, 12)
       .e('typ3', 40, 10).e('typ1', 96, 10).e('typ2', 168, 10);

  lvl14.cp(56, 15).cp(104, 15).cp(150, 15);
  lvl14.sign(6, 15, 'STILBRUCH. RAUCHEN ERLAUBT. RÜLPSEN NICHT.')
       .sign(62, 13, 'LOUNGE. BITTE NICHT STRESSEN.')
       .sign(134, 12, 'THEKE. HIER WIRD DIE KOHLE GEMACHT.')
       .sign(188, 15, 'RESERVIERT: ESAT UND BEGLEITUNG.');

  /* ---------------------------------------------------------------
     LEVEL 15 — Bei Georgios. Griechisch, kurz vor Kuechenschluss.
     Die Meeresfruechte sind frisch. Sehr frisch. Und Georgios ist schnell.
     --------------------------------------------------------------- */

  var lvl15 = L({
    id: 15, name: 'BEI GEORGIOS', sub: 'TAVERNE. KÜCHE BIS ELF.',
    theme: 'taverne', music: 'l3', w: 190, h: 18, spawn: [3, 15], par: 150,
    goal: [186, 15], diff: 1.45, buddy: 'esat', buddyLines: 'esatTaverneLines',
    intro: [
      ['', 'TAVERNE GEORGIOS. 22:45 UHR.'],
      ['esat', 'DIE KÜCHE MACHT UM ELF ZU. WIR HABEN FÜNFZEHN MINUTEN.'],
      ['yusuf', 'DAS REICHT FÜR EINE VORSPEISE.'],
      ['', 'IM AQUARIUM BEWEGT SICH ETWAS. ES KOMMT RAUS.'],
      ['esat', 'WARUM LAUFEN HIER KRABBEN RUM?'],
      ['yusuf', 'FRISCHER GEHT ES NICHT.']
    ],
    outro: []
  });

  lvl15.g(0, 44, 15).g(49, 96, 15).g(101, 142, 15).g(147, 189, 15);
  lvl15.p(45, 13, 4).p(97, 13, 4).p(143, 13, 4);
  lvl15.p(8, 11, 5).p(18, 9, 6).p(30, 11, 6).p(56, 11, 5).p(66, 8, 6).p(80, 11, 6)
       .p(106, 11, 5).p(116, 9, 5).p(128, 11, 6);
  // Georgios' Ecke
  lvl15.p(152, 11, 5).p(162, 8, 6).p(174, 11, 5).p(183, 8, 4);
  lvl15.bossAt(178, 15);
  lvl15.d.bossType = 'georgios';
  lvl15.d.arena = { x: 147, w: 43 };

  // Olivenoel auf dem Boden
  lvl15.hz(24, 26, 14, 'oel').hz(72, 74, 14, 'oel');

  lvl15.q(12, 7, 'honig', 5).q(60, 7, 'souvlaki').q(112, 6, 'honig', 5).q(154, 7, 'herz');
  lvl15.trail(3, 13, 5, 2).trail(50, 13, 5, 2, 2).trail(102, 13, 5, 2, 2).trail(148, 13, 4, 2, 2);
  lvl15.it('herz', 20, 7).it('souvlaki', 68, 6).it('herz', 118, 7).it('souvlaki', 186, 6);

  // Meeresfruechte. Frisch aus dem Aquarium, und sie wehren sich.
  lvl15.row('krabbe', 15, [12, 38, 60, 86, 114, 136])
       .row('krake', 15, [34, 78, 120])
       .e('fisch', 26, 7).e('fisch', 70, 6).e('fisch', 108, 8).e('fisch', 132, 8);

  lvl15.cp(54, 15).cp(104, 15);
  lvl15.sign(5, 15, 'TAVERNE GEORGIOS. KÜCHE BIS ELF.')
       .sign(52, 15, 'FRISCHER FISCH. SEHR FRISCH. ER WEHRT SICH.')
       .sign(108, 15, 'TELLER ZERSCHLAGEN ERLAUBT. SAGT GEORGIOS.')
       .sign(150, 15, 'GEORGIOS. SEHR SCHNELL. SAGT ER.');

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
      ['yusuf', 'DAS SAGST DU JEDES MAL.'],
      ['huseyin', 'ICH HAB HEUTE DREI SCHÜSSELN SALAT GEGESSEN.'],
      ['huseyin', 'OHNE DRESSING.'],
      ['yusuf', 'ER DREHT DURCH. ER HAT GRÜNE AUGEN WIE ICH.']
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
    ['yusuf', 'ICH HAB EINEN KOCH IM SAFRANRAUSCH BERUHIGT.'],
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
      ['yusuf', 'ER NIMMT SNUS. MITTEN IM KAMPF.'],
      ['esat', 'EIN SNUS UND ICH BIN EIN ANDERER MENSCH.'],
      ['huseyin', 'DAS IST NIKOTIN, KEIN PROTEIN!'],
      ['esat', 'BEI MIR IST DAS BEIDES.'],
      ['yusuf', 'WARUM IST ER JETZT DOPPELT SO BREIT?'],
      ['esat', 'DISZIPLIN, YUSUF. UND SNUS.']
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

  /* ALEX — Kollege, Endgegner in der Getraenkeabteilung.
     Streitthema: Yusuf hat kein einziges Spiel auf Platin. */
  var ALEX_DIALOG = {
    start: [
      ['alex', 'YUSUF? WAS MACHST DU HIER?'],
      ['yusuf', 'ALEX. ICH KAUFE EIN.'],
      ['alex', 'DU HAST VIER EINKAUFSWAGEN.'],
      ['yusuf', 'DREI. DER VIERTE IST MIR GEFOLGT.'],
      ['alex', 'EGAL. SAG MAL...'],
      ['alex', 'WIE VIELE SPIELE HAST DU AUF PLATIN?'],
      ['yusuf', 'WAS?'],
      ['alex', 'PLATIN. TROPHÄEN. WIE VIELE.'],
      ['yusuf', 'KEINE.'],
      ['alex', 'KEINE?!'],
      ['yusuf', 'ICH SPIELE ZUM SPASS.'],
      ['alex', 'ZUM SPASS! DER MANN SPIELT ZUM SPASS!'],
      ['yusuf', 'UND DU STEHST UM ZWEI IN DER GETRÄNKEABTEILUNG.'],
      ['alex', '...'],
      ['yusuf', 'WIE VIELE WAREN DAS DIESE WOCHE, ALEX?'],
      ['alex', 'DAS-DAS-DAS IST WAS GANZ ANDERES!'],
      ['alex', 'ICHSAGDIRWARUMDASANDERSIST WEIL PLATIN DISZIPLIN IST'],
      ['alex', 'UND DISZIPLIN HAST DU NICHT UND ICH HAB SIEBENUNDVIERZIG'],
      ['', 'ALEX REDET JETZT DOPPELT SO SCHNELL.'],
      ['yusuf', 'OKAY. DANN ZEIG MIR MAL DISZIPLIN.']
    ],
    phase2: [
      ['alex', 'WEISST DU WAS? TRINK MIT.'],
      ['', 'ALEX SCHÜTTET YUSUF DIE FLASCHE ÜBER DEN KOPF.'],
      ['yusuf', 'DAS WAR MEIN HEMD.'],
      ['alex', 'DAS WAR MEIN WODKA!'],
      ['', 'DIE REGALE FANGEN AN ZU SCHWANKEN.'],
      ['yusuf', 'WARUM SIND DA JETZT ZWEI ALEX.'],
      ['alex', 'WEIL ICH JETZT ULTRAPENNER BIN!']
    ],
    phase3: [
      ['alex', 'ICH HAB SIEBENUNDVIERZIG PLATIN!'],
      ['yusuf', 'DU HAST SIEBENUNDVIERZIG FLASCHEN.'],
      ['alex', 'DAS IST DASSELBE IN BLAU!']
    ],
    end: [
      ['alex', 'OKAY. OKAY! ICH HÖR AUF.'],
      ['yusuf', 'GUT.'],
      ['', 'YUSUF WIRD WIEDER NÜCHTERN. LEIDER AUCH WIEDER HUNGRIG.'],
      ['alex', 'ICH MUSS SOWIESO GLEICH AN DIE KASSE.'],
      ['yusuf', 'DU ARBEITEST HIER?'],
      ['alex', 'SCHICHT SEIT ZWEI. KOMM, ICH KASSIER DICH AB.']
    ],
    // An der Kasse. Yusuf laedt auf, Alex zieht durch.
    kasse: [
      ['', 'YUSUF LEGT AUF. UND LEGT AUF. UND LEGT AUF.'],
      ['alex', 'DAS SIND VIERUNDSIEBZIG TIEFKÜHLPIZZEN.'],
      ['yusuf', 'DIE WAREN IM ANGEBOT.'],
      ['alex', 'DAS WAREN SIE NICHT.'],
      ['alex', 'HAST DU EINE KUNDENKARTE?'],
      ['yusuf', 'ICH HABE EINE SEELE.'],
      ['alex', 'DAFÜR GIBT ES KEINE PUNKTE.'],
      ['alex', 'WILLST DU DIE TÜTEN ODER TRÄGST DU DAS SO?'],
      ['yusuf', 'ICH NEHM SECHS TÜTEN.'],
      ['alex', 'DAS SIND ZEHN CENT PRO TÜTE.'],
      ['yusuf', 'DANN NEHM ICH VIER.'],
      ['', 'SUMME: 205,40 EURO.'],
      ['yusuf', 'KANN ICH IN RATEN ZAHLEN?'],
      ['alex', 'NEIN.'],
      ['yusuf', 'KANN ICH IN KALORIEN ZAHLEN?'],
      ['alex', 'NEIN!'],
      ['', 'YUSUF ZAHLT. IN MÜNZEN. ES DAUERT.'],
      ['yusuf', 'SAG MAL, ALEX.'],
      ['yusuf', 'KOMM DOCH MAL WIEDER RAUS. MAN SIEHT DICH NIE.'],
      ['alex', 'JA JA. DIESMAL KOMM ICH.'],
      ['yusuf', 'DU KOMMST SOWIESO NICHT.'],
      ['alex', 'DOCH, DOCH. DIESMAL SCHON.'],
      ['yusuf', 'NEE. ICH GLAUB, DICH SEHEN WIR NICHT MEHR.'],
      ['alex', 'ICH SCHREIB DIR!'],
      ['yusuf', 'DU SCHREIBST AUCH NICHT.'],
      ['alex', '...'],
      ['alex', 'GEH NACH HAUSE, YUSUF.'],
      ['yusuf', 'ICH GEH JA SCHON.'],
      ['alex', 'UND MACH MAL EIN SPIEL AUF PLATIN!'],
      ['yusuf', 'ICH MACH MIR ERSTMAL WAS ZU ESSEN.']
    ]
  };

  /* Was Alex im Vortrag durcheinander bruellt. */
  var ALEX_LINES = [
    'PLATIN!',
    'DISZIPLIN!',
    'ALLE TROPHÄEN!',
    'HUNDERT PROZENT!',
    'DAS IST EINFACH!',
    'MIT EINER HAND!',
    'DU SPIELST ZUM SPASS!',
    'SPASS!',
    'SIEBENUNDVIERZIG!',
    'HAST DU NICHT!'
  ];

  /* BROKE — Kollege, wartet vor Yusufs Haus. Kein Streit, nur ein Test.
     (Was vor dem Kampf gesagt wird, steht im Intro von Level 11.) */
  var BROKE_DIALOG = {
    phase2: [
      ['broke', 'OKAY. DU BIST BESSER ALS GEDACHT.'],
      ['broke', 'ZEIT FÜR DIE GANZE MIKA-ARMEE.'],
      ['yusuf', 'WIE VIELE MIKAS GIBT ES DENN?'],
      ['broke', 'WEISS KEINER. NICHT MAL MIKA.'],
      ['mika', 'HALLO.']
    ],
    phase3: [
      ['broke', 'NOCH SCHNELLER! MIKAS, VOLLGAS!'],
      ['yusuf', 'ICH HAB SEIT DER KASSE NICHTS GEGESSEN.'],
      ['broke', 'DAS IST TEIL DES TESTS.']
    ],
    end: [
      ['broke', 'OKAY! OKAY! TEST BESTANDEN!'],
      ['yusuf', 'WAS WAR DAS ÜBERHAUPT FÜR EIN TEST?'],
      ['broke', 'OB DU NACH SECHS TÜTEN NOCH KÄMPFEN KANNST.'],
      ['yusuf', 'UND?'],
      ['broke', 'KANNST DU. RESPEKT, BRUDER.'],
      ['mika', 'RESPEKT.'],
      ['mika', 'RESPEKT.'],
      ['broke', 'KOMMT, JUNGS. WIR GEHEN.'],
      ['', 'BROKE GEHT. DIE MIKAS AUCH. ALLE.'],
      ['', 'DAS DAUERT EIN BISSCHEN.'],
      ['yusuf', 'ICH GEH JETZT SCHLAFEN.'],
      ['yusuf', 'NACH DEM ESSEN.']
    ]
  };

  /* Was die Mikas so sagen. Viel ist es nicht. */
  var MIKA_LINES = [
    'MIKA!', 'HALLO.', 'ICH BIN MIKA.', 'ICH BIN AUCH MIKA.',
    'WIR SIND ALLE MIKA.', 'NOCH EIN MIKA.', 'MIKA IST DA.', 'SERVUS.'
  ];

  /* Am naechsten Morgen: Esat ruft an. */
  var SCHLAF_DIALOG = [
    ['', 'AM NÄCHSTEN MORGEN. 7:30 UHR.'],
    ['esat', 'YUSUF! BIST DU WACH?'],
    ['yusuf', 'NEIN.'],
    ['esat', 'ZIEH DICH AN. WIR FAHREN DOWNHILL.'],
    ['yusuf', 'DOWNHILL?'],
    ['esat', 'MIT DEM FAHRRAD. DEN BERG RUNTER.'],
    ['yusuf', 'BERGAB?'],
    ['esat', 'NUR BERGAB.'],
    ['yusuf', 'BERGAB KANN ICH.'],
    ['', 'YUSUF STEHT AUF. FREIWILLIG. DAS GAB ES NOCH NIE.']
  ];

  /* Esat faehrt mit und hat zu allem eine Meinung. */
  var ESAT_RIDE_LINES = [
    'SCHNELLER, YUSUF!', 'BREMSEN IST FÜR LEUTE MIT ANGST.',
    'RAMPE! SALTO! JETZT!', 'DAS IST MEIN HAUSBERG.',
    'NICHT NACH UNTEN SCHAUEN.', 'LOCKER IN DEN KNIEN.',
    'ICH HAB HIER MAL EIN REH ÜBERHOLT.', 'DU FÄHRST WIE DU ISST. VIEL.'
  ];
  var ESAT_FLIP_LINES = [
    'SAUBER!', 'OKAY, RESPEKT.', 'NOCH EINEN!', 'WER HAT DIR DAS BEIGEBRACHT?',
    'DAS WAR KEIN SALTO. DAS WAR KUNST.'
  ];

  /* HAMZA — libanesischer Freund. Streitpunkt: sein Hummus. */
  var HAMZA_DIALOG = {
    start: [
      ['hamza', 'YUSUF! HABIBI! DA BIST DU JA!'],
      ['yusuf', 'HAMZA. EIN SHAWARMA. BITTE.'],
      ['hamza', 'EINS? DU WILLST EINS?'],
      ['yusuf', 'FÜR DEN ANFANG.'],
      ['hamza', 'WEISST DU NOCH, WAS DU LETZTES MAL GESAGT HAST?'],
      ['yusuf', 'NEIN.'],
      ['hamza', 'DU HAST GESAGT, MEIN HUMMUS IST ZU FLÜSSIG.'],
      ['yusuf', 'ER WAR ZU FLÜSSIG.'],
      ['hamza', '...'],
      ['hamza', 'YALLA. DANN PROBIER IHN JETZT.']
    ],
    phase2: [
      ['hamza', 'OKAY. JETZT WIRD ES ERNST.'],
      ['hamza', 'ICH HAB STRASSENFUSSBALL GESPIELT, HABIBI.'],
      ['yusuf', 'DU HAST AUF DEM SCHULHOF GESPIELT.'],
      ['hamza', 'DAS IST AUCH EINE STRASSE!']
    ],
    phase3: [
      ['hamza', 'NOCH NIE HAT JEMAND SO LANGE GEGEN MEINEN HUMMUS GEKÄMPFT.'],
      ['yusuf', 'ICH HAB HUNGER. DAS IST MEIN ANTRIEB.']
    ],
    end: [
      ['hamza', 'OKAY! OKAY! DU HAST GEWONNEN!'],
      ['hamza', 'SETZ DICH. ICH MACH DIR EIN SHAWARMA. AUFS HAUS.']
    ],
    // Am Tisch: Hamza bringt Shawarma, und dann kommt Esat
    essen: [
      ['', 'HAMZA BRINGT SHAWARMA. MIT EXTRA KNOBLAUCHSOSSE.'],
      ['yusuf', 'ICH HAB EIGENTLICH GAR KEINEN HUNGER.'],
      ['hamza', '...'],
      ['yusuf', 'MACH DREI.'],
      ['', 'DIE TÜR GEHT AUF. ESAT KOMMT REIN.'],
      ['esat', 'ICH HAB MIR GEDACHT, DASS DU HIER BIST.'],
      ['hamza', 'ESAT! HABIBI! AUCH EINS?'],
      ['esat', 'NUR EINS. ICH BIN IM DEFIZIT.'],
      ['', 'ESAT ISST EIN SHAWARMA. DANN NOCH EINS.'],
      ['esat', 'DAS ZWEITE ZÄHLT NICHT.'],
      ['esat', 'SO. JETZT STILBRUCH. EINE SHISHA ZUM VERDAUEN.'],
      ['yusuf', 'GANZ ENTSPANNT.'],
      ['hamza', 'UND KEINEN STRESS MACHEN, IHR ZWEI!'],
      ['yusuf', 'WANN HAB ICH JE STRESS GEMACHT?']
    ]
  };

  /* Stilbruch: der reservierte Tisch, endlich. Und dann die Shisha. */
  var SHISHA_DIALOG = {
    vorher: [
      ['', 'DIE TYPEN SETZEN SICH WIEDER HIN. ALS WÄRE NICHTS GEWESEN.'],
      ['esat', 'SO. JETZT ABER WIRKLICH: EINE SHISHA.'],
      ['', 'DER KELLNER BRINGT ZWEI PFEIFEN.'],
      ['esat', 'FÜR MICH TRAUBE-MINZE.'],
      ['yusuf', 'DOPPELAPFEL. WIE IMMER.'],
      ['esat', 'DU NIMMST SEIT ZEHN JAHREN DOPPELAPFEL.'],
      ['yusuf', 'NEVER CHANGE A WINNING TEAM.'],
      ['', 'ZIEHEN GEHT VON ALLEIN. C DRÜCKEN = AUSPUSTEN. DREIMAL.']
    ],
    nachher: [
      ['yusuf', 'HÖ HÖ HÖÖÖ.'],
      ['esat', 'UND? ENTSPANNT?'],
      ['yusuf', 'ICH HAB HUNGER.'],
      ['esat', 'DU HAST VOR ACHT STUNDEN VIER SHAWARMA GEGESSEN.'],
      ['yusuf', 'EBEN. VOR ACHT STUNDEN.'],
      ['esat', 'LASS ZU GEORGIOS.'],
      ['yusuf', 'GEORGIOS. JA. OKAY. LASS ZUM GRIECHEN.'],
      ['esat', 'DIE KÜCHE MACHT UM ELF ZU.'],
      ['yusuf', 'DANN RENNEN WIR.']
    ]
  };

  /* GEORGIOS — griechischer Freund. Schnell. Und oben ohne ziemlich breit. */
  var GEORGIOS_DIALOG = {
    start: [
      ['georgios', 'YUSUF! ESAT! KALISPERA!'],
      ['yusuf', 'GEORGIOS. WIR HABEN HUNGER.'],
      ['esat', 'ER HAT HUNGER. ICH BIN NUR DABEI.'],
      ['georgios', 'DIE KÜCHE MACHT GLEICH ZU.'],
      ['yusuf', 'ICH HAB HEUTE EINEN BERG BEZWUNGEN.'],
      ['yusuf', 'UND HAMZA. UND DIE HALBE SHISHA-BAR.'],
      ['georgios', 'DANN BEZWING MICH AUCH. DANN GIBT ES SOUVLAKI.'],
      ['georgios', 'ICH BIN SCHNELL, YUSUF. SEHR SCHNELL.'],
      ['yusuf', 'DAS SAGEN ALLE.']
    ],
    phase2: [
      ['georgios', 'OKAY. JETZT WIRD ES ERNST.'],
      ['', 'GEORGIOS ZIEHT SEIN HEMD AUS.'],
      ['yusuf', 'WARUM HAT ER EIN SIXPACK?'],
      ['esat', 'ER TRAINIERT. ANDERS ALS DU.'],
      ['', 'ER ZIEHT BOXHANDSCHUHE AN. WOHER AUCH IMMER.'],
      ['georgios', 'OPA!']
    ],
    phase3: [
      ['georgios', 'NIEMAND HÄLT SO LANGE DURCH GEGEN MICH!'],
      ['yusuf', 'ICH HAB NICHTS ANDERES VOR.']
    ],
    end: [
      ['georgios', 'OKAY! OKAY! DU HAST GEWONNEN!'],
      ['georgios', 'SETZ DICH. DIE KÜCHE MACHT NOCHMAL AUF.'],
      ['yusuf', 'NUR FÜR MICH?'],
      ['georgios', 'NUR FÜR DICH, FILE.']
    ],
    essen: [
      ['', 'EIN TELLER SOUVLAKI. DAZU EIN BERG TZATZIKI.'],
      ['georgios', 'DAS TZATZIKI IST VON MEINER OMA.'],
      ['yusuf', 'ICH HAB EIGENTLICH GAR KEINEN HUNGER.'],
      ['esat', '...'],
      ['georgios', '...'],
      ['yusuf', 'ABER ICH ESS DAS JETZT KOMPLETT.'],
      ['', 'YUSUF ISST ALLES AUF. DEN TELLER FAST AUCH.'],
      ['esat', 'HEUTE: 10.000 KALORIEN, VIER SHAWARMA, EINE SHISHA, SOUVLAKI.'],
      ['yusuf', 'EIN GANZ NORMALER TAG.'],
      ['yusuf', 'ICH GEH JETZT PENNEN.'],
      ['esat', 'MORGEN GYM?'],
      ['yusuf', 'KRRRRR.']
    ]
  };

  /* Was die Typen vom Nebentisch so rufen. */
  var TYP_LINES = [
    'WAS GUCKST DU?', 'BRUDER, WAS WAR DAS?', 'RÜLPS NOCHMAL!', 'ICH KENN DEINEN COUSIN!',
    'WILLST DU STRESS?', 'CHILL MAL!', 'MEINE SHISHA IST AUSGEGANGEN!', 'NICHT IN MEINE RICHTUNG!'
  ];

  /* Esat geht mit und kommentiert. */
  var ESAT_BAR_LINES = [
    'YUSUF, CHILL!', 'DAS WAR NUR EIN RÜLPSER, JUNGS!', 'NICHT DIE KOHLE ANFASSEN!',
    'ICH KENN DEN. ...NEIN, DOCH NICHT.', 'WIR WOLLTEN NUR RAUCHEN.',
    'WARUM WERFEN DIE MIT ZANGEN?', 'UNSER TISCH IST GANZ HINTEN.'
  ];
  var ESAT_TAVERNE_LINES = [
    'NOCH ZEHN MINUTEN BIS KÜCHENSCHLUSS!', 'DIE KRABBE HAT MICH ANGESCHAUT.',
    'ICH ESS NUR EINEN SALAT. VIELLEICHT.', 'DAS IST DER SCHNELLSTE GRIECHE DER STADT.',
    'OPA!', 'NICHT AUF DAS ÖL TRETEN!'
  ];

  /* Lennarts grosser Auftritt in Level 12 (Zwischensequenz). */
  var LENNART_CUT = {
    esatHear: 'HÖRST DU DAS?',
    yusufHear: 'IST DAS EIN MOTORRAD?',
    card: 'LENNART',
    cardSub: 'BEINTAG. JEDEN TAG.',
    jump1: 'PLATZ DA! PUMP IM BEIN!',
    jump2: 'ZU EASY, BRO!',
    jump3: 'UND JETZT DER DREIFACHE—',
    crash: 'AUA.',
    lying: 'ALLES GUT! DAS WAR GEPLANT!',
    esatPass: 'HAST DU WAS GESEHEN?',
    yusufPass: 'NÖ.',
    lennartPass: 'HAT JEMAND MEIN VORDERRAD GESEHEN?',
    esatAfter: 'SCHÖNES WETTER HEUTE.'
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
        ['yusuf', 'DAS IST AUCH WIEDER EINE FRAGE.'],
        ['mirkan', 'WEISST DU, WAS DAS HIER FÜR EIN KNOPF IST?'],
        ['mirkan', 'SPORT PLUS. TUNING-MODUS.'],
        ['yusuf', 'DEIN AUTO BRENNT HINTEN.'],
        ['mirkan', 'DAS SOLL SO! ...ODER? SOLL DAS SO?']
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
        ['yusuf', 'DAS SAGST DU SEIT ZEHN MINUTEN.'],
        ['lennart', 'JETZT IST MASSEPHASE.'],
        ['yusuf', 'DU BIST GERADE EINEN KOPF GEWACHSEN.'],
        ['lennart', 'DAS IST DER PUMP, BRO.']
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
        ['erfan', 'SIE HABEN MEINEN SAFRAN ANGEFASST.'],
        ['yusuf', '...WAS?'],
        ['erfan', 'ECHTER SAFRAN. AUS MASCHHAD.'],
        ['erfan', 'ZWEI GRAMM. DREISSIG EURO. ANGEFASST!'],
        ['yusuf', 'OKAY. DAS IST TATSÄCHLICH SCHLIMM.'],
        ['erfan', 'UND MEIN KUBIDE-FLEISCH IST WEG!'],
        ['erfan', 'VIERZEHN TAGE KEIN KUBIDE, YUSUF.'],
        ['yusuf', 'ICH HOL ALLES ZURÜCK. KOMM ERST RUNTER.'],
        ['erfan', 'ICH KOMME NICHT RUNTER!']
      ],
      phase2: [
        ['erfan', 'WEISST DU, WIE LANGE REIS BRAUCHT?'],
        ['yusuf', 'NEIN.'],
        ['erfan', 'GENAU SO LANGE WIE ER BRAUCHT!'],
        ['yusuf', 'DAS IST KEINE ANTWORT, ERFAN.'],
        ['erfan', 'DOCH! IN DER KÜCHE SCHON!'],
        ['erfan', 'ICH HAB AN DEM SAFRAN GEROCHEN.'],
        ['erfan', 'DEM GANZEN GLAS.'],
        ['yusuf', 'SEINE AUGEN SIND GOLDEN. DAS IST NICHT GUT.']
      ],
      end: [
        ['erfan', 'OKAY... OKAY. ICH BIN RUHIG.'],
        ['yusuf', 'GEHT ES WIEDER?'],
        ['erfan', 'VIERZEHN TAGE, YUSUF. VIERZEHN.'],
        ['yusuf', 'ICH WEISS.'],
        ['erfan', 'DER SAFRAN IST ÜBRIGENS NOCH DA.'],
        ['erfan', 'ICH HAB IHN VERSTECKT. IM REIS.'],
        ['yusuf', 'NATÜRLICH HAST DU DAS.'],
        ['erfan', 'ICH MACH DIR KUBIDE. MIT SAFRANREIS.'],
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

  /* Level 6: wer unterwegs dazukommt, und was die Polizei so sagt. */
  var CONVOY_DIALOG = {
    erfan: [
      ['erfan', 'YUSUF! WARTE! ICH KOMM MIT!'],
      ['yusuf', 'ERFAN? MIT DEM SCHWARZEN CLA?'],
      ['erfan', 'ICH HAB KUBIDE IM KOFFERRAUM. FÜR ALLE.'],
      ['huseyin', 'WARUM HAT HIER JEDER EIN AUTO AUSSER MIR?'],
      ['erfan', 'FAHR VOR. ICH BLEIB DIR IM NACKEN.']
    ],
    lennart: [
      ['lennart', 'BROOO! STILBRUCH? ICH BIN DABEI!'],
      ['yusuf', 'LENNART. IN EINER SILBERNEN E-KLASSE.'],
      ['lennart', 'DIE HAT MEIN OPA MIR GEGEBEN. SIE HAT SITZHEIZUNG.'],
      ['lennart', 'ICH HAB AUCH SHAKES DABEI. FALLS JEMAND WILL.'],
      ['yusuf', 'NIEMAND WILL, LENNART.']
    ]
  };

  var POLIZEI_LINES = [
    'HALT! POLIZEI!',
    'FÜHRERSCHEIN UND FAHRZEUGSCHEIN!',
    'WISSEN SIE, WIE SCHNELL SIE WAREN?',
    'HABEN SIE GETRUNKEN? HONIG ZÄHLT AUCH!',
    'DAS GIBT PUNKTE IN FLENSBURG!',
    'AUSSTEIGEN! ...BITTE.'
  ];

  /* Aufraeumen: kein Item darf in einer Wand oder in einem Block stecken.
     Die Honig-Boegen (trail mit Bogen) treffen sonst ab und zu eine
     Plattform, und das Glas klebt dann halb im Boden. Hier wird es so
     weit nach oben geschoben, bis es frei liegt. */
  function tidyItems(L) {
    var solid = {}, blocks = {}, key;
    L.solids.forEach(function (r) {
      for (var y = r[1]; y < r[1] + r[3]; y++) {
        for (var x = r[0]; x < r[0] + r[2]; x++) solid[x + ',' + y] = true;
      }
    });
    L.blocks.forEach(function (b) { blocks[b.x + ',' + b.y] = true; });

    var out = [];
    L.items.forEach(function (it) {
      var y = it.y, tries = 0;
      while (tries < 4) {
        key = it.x + ',' + y;
        if (!solid[key] && !blocks[key]) break;
        y--; tries++;
      }
      key = it.x + ',' + y;
      if (solid[key] || blocks[key]) return;     // kein Platz: lieber weglassen
      out.push({ t: it.t, x: it.x, y: y });
    });
    L.items = out;
    return L;
  }

  var LEVELS = [lvl1.out(), lvl2.out(), lvl3.out(), lvl4.out(),
                lvl5.out(), lvl6.out(), lvl7.out(), lvl8.out(),
                lvl9.out(), lvl10.out(), lvl11.out(), lvl12.out(),
                lvl13.out(), lvl14.out(), lvl15.out()].map(tidyItems);

  global.Levels = {
    alex: ALEX_DIALOG,
    alexLines: ALEX_LINES,
    broke: BROKE_DIALOG,
    mikaLines: MIKA_LINES,
    schlaf: SCHLAF_DIALOG,
    esatRideLines: ESAT_RIDE_LINES,
    esatFlipLines: ESAT_FLIP_LINES,
    esatBarLines: ESAT_BAR_LINES,
    esatTaverneLines: ESAT_TAVERNE_LINES,
    lennartCut: LENNART_CUT,
    hamza: HAMZA_DIALOG,
    georgios: GEORGIOS_DIALOG,
    shisha: SHISHA_DIALOG,
    typLines: TYP_LINES,
    convoy: CONVOY_DIALOG,
    polizeiLines: POLIZEI_LINES,
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
