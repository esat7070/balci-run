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
      rescue: cfg.rescue || null,
      mode: cfg.mode || null,           // eigene Spielart (fussball, rennen, doener)
      punch: !!cfg.punch                // Level 19: B / Shift = Boxen
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
    /** Goldhonig. Drei pro Level, immer da, wo es unbequem ist. */
    gold: function (x, y) { return this.it('goldhonig', x, y); },
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
    theme: 'zimmer', music: 'l1', w: 304, h: 18, spawn: [3, 15], par: 90,
    goal: [295, 15], diff: 0.82,
    intro: [
      ['huseyin', 'YUSUF! AUFSTEHEN! ES IST SCHON 6:45!'],
      ['yusuf', 'SCHON? DU SAGST DAS, ALS WÄRE DAS WAS GUTES.'],
      ['huseyin', 'ICH WAR SCHON LAUFEN. ZWÖLF KILOMETER.'],
      ['yusuf', 'ICH BIN IM TRAUM ZUM DÖNERLADEN GELAUFEN. HIN UND ZURÜCK. ZWEIMAL.'],
      ['huseyin', 'DAS ZÄHLT NICHT.'],
      ['yusuf', 'MEINE UHR SAGT WAS ANDERES.'],
      ['huseyin', 'DU HAST KEINE UHR.'],
      ['yusuf', 'EBEN. BEWEIS MIR DAS GEGENTEIL.'],
      ['huseyin', 'ICH HABE DEINEN HONIG VERSTECKT. IM GANZEN HAUS.'],
      ['yusuf', '...'],
      ['yusuf', 'DU HAST WAS?'],
      ['huseyin', 'FÜR DEINE GESUNDHEIT. DU WIRST MIR NOCH DANKEN.'],
      ['yusuf', 'HÖ HÖ HÖÖÖ. DU HAST MIR GERADE EINEN GRUND ZUM AUFSTEHEN GEGEBEN. GROSSER FEHLER.']
    ],
    outro: [
      ['yusuf', 'ALLE GLÄSER GEFUNDEN. HÖ HÖ HÖÖÖ.'],
      ['huseyin', 'DAS WAR ERST DEIN ZIMMER. ES GIBT FÜNFZEHN LEVEL.'],
      ['yusuf', 'FÜNFZEHN? ICH HAB MIT DREI GERECHNET. UND EINEM NICKERCHEN DAZWISCHEN.'],
      ['huseyin', 'UND DEN GOLDHONIG HAB ICH GANZ OBEN VERSTECKT. DA KOMMST DU NIE HIN.'],
      ['yusuf', 'DU UNTERSCHÄTZT, WIE HOCH ICH FÜR ZUCKER KLETTERE.']
    ]
  });

  lvl1.g(0, 20, 15).g(24, 44, 15).g(48, 58, 14).g(62, 78, 15)
      .g(82, 94, 13).g(98, 110, 15).g(114, 126, 12).g(130, 148, 15)
      .g(152, 162, 14).g(166, 180, 15).g(280, 303, 15);

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
      .trail(282, 13, 8, 2, 2);

  lvl1.it('herz', 35, 8).it('honig', 11, 9).it('honig', 12, 9)
      .it('honig', 71, 9).it('honig', 72, 9).it('honig', 141, 7).it('honig', 142, 7);

  lvl1.row('wecker', 15, [12, 28, 36, 74, 106, 144, 286, 292])
      .row('wecker', 14, [52, 156])
      .row('wecker', 13, [86, 92])
      .row('wecker', 12, [118])
      .e('biene', 40, 11).e('biene', 90, 9).e('biene', 146, 11).e('biene', 178, 10);

  lvl1.cp(70, 15).cp(140, 15);

  // Goldhonig 1: auf dem Kleiderhaken ueber dem Regal
  lvl1.p(147, 4, 3).gold(148, 3);

  /* Abschnitt 2: der Kleiderschrank. Vier Ebenen — unten der Waescheberg,
     darueber die Kommode, dann das lange Regalbrett, ganz oben das
     Schrankdach. Unten kommt man immer durch; oben liegt das Gold. */
  lvl1.g(184, 196, 15).g(200, 214, 15).g(215, 226, 13).g(230, 244, 15)
      .g(248, 262, 14).g(266, 279, 15);
  lvl1.p(197, 13, 3).p(227, 13, 3).p(245, 13, 3).p(263, 13, 3);
  lvl1.p(188, 11, 5).p(204, 11, 5).p(236, 11, 5).p(252, 10, 5).p(270, 11, 4);   // Kommode
  lvl1.p(208, 7, 12).p(223, 7, 7).p(233, 7, 10).p(246, 7, 6);                   // Regalbrett
  lvl1.p(213, 3, 5).p(257, 4, 3);                                               // Schrankdach
  lvl1.sp(201, 14).sp(261, 13);
  lvl1.q(195, 11, 'doener').q(228, 10, 'honig', 4).q(274, 10, 'kippen');
  lvl1.k(218, 12).k(219, 12, 'honig').k(256, 13, 'doener');
  lvl1.trail(185, 13, 5, 2).trail(200, 13, 4, 2, 2).trail(209, 6, 6, 2)
      .trail(223, 6, 4, 2).trail(233, 6, 5, 2).trail(230, 13, 6, 2, 3)
      .trail(266, 13, 6, 2, 2);
  lvl1.it('herz', 249, 6).it('doener', 216, 11);
  lvl1.gold(215, 2).gold(258, 3);
  lvl1.row('wecker', 15, [190, 206, 236, 272])
      .e('wecker', 220, 13).e('wecker', 254, 14).e('wecker', 214, 7)
      .e('biene', 226, 4).e('biene', 244, 9);
  lvl1.cp(232, 15);

  lvl1.sign(6, 15, '6:45 UHR. WER HAT DAS ERFUNDEN? UND WARUM HAT IHN NIEMAND AUFGEHALTEN?')
      .sign(26, 15, 'SPRINGEN: LEERTASTE ODER PFEIL HOCH. JA, AUCH MIT DEM BAUCH.')
      .sign(64, 15, 'IN DER LUFT NOCHMAL SPRINGEN = BAUCH-BOOST. PHYSIK IST NUR EINE MEINUNG.')
      .sign(100, 15, 'RUNTER DRÜCKEN IN DER LUFT = BAUCH-STAMPFER. DER BODEN HAT ES VERDIENT.')
      .sign(168, 15, 'DER WECKER IST NICHT DEIN FREUND. ER WAR ES NIE.')
      .sign(186, 15, 'KLEIDERSCHRANK. DIE WÄSCHE VON 2022 WOHNT HIER JETZT. SIE ZAHLT KEINE MIETE.')
      .sign(268, 15, 'GOLDHONIG: DREI PRO LEVEL, IMMER GANZ OBEN. HUSEYIN HATTE EINE LEITER.');

  /* ---------------------------------------------------------------
     LEVEL 2 — Bienen haben ein langes Gedächtnis
     --------------------------------------------------------------- */

  var lvl2 = L({
    id: 2, name: 'BIENEN VERGESSEN NICHTS', sub: 'DER GARTEN HINTERM HAUS',
    theme: 'garten', music: 'l2', w: 352, h: 18, spawn: [3, 15], par: 110,
    goal: [346, 15], diff: 1.0,
    intro: [
      ['yusuf', 'DER GARTEN. HIER WOHNEN DIE BIENEN.'],
      ['huseyin', 'VIEL SPASS. DIE BIENEN KENNEN DICH NOCH.'],
      ['yusuf', 'WIR HATTEN EINEN KONFLIKT. 2019. ES WAR KOMPLIZIERT.'],
      ['huseyin', 'DU HAST IHNEN VIERZEHN GLÄSER GEKLAUT.'],
      ['yusuf', 'SECHZEHN. ICH LASS MIR MEINE LEISTUNG NICHT KLEINREDEN.'],
      ['huseyin', 'SIE HABEN DICH BIS ZUR BUSHALTESTELLE VERFOLGT.'],
      ['yusuf', 'UND ICH HAB DEN BUS NOCH GEKRIEGT. MEIN EINZIGER SPRINT. ICH ERZÄHLE IHN BIS HEUTE.']
    ],
    outro: [
      ['yusuf', 'VIER STICHE. ACHT GLÄSER. RECHNET SICH.'],
      ['huseyin', 'DAS IST KEIN GESUNDES VERHÄLTNIS, YUSUF.'],
      ['yusuf', 'ES IST EIN HONIG-VERHÄLTNIS. DIE SIND NIE GESUND.'],
      ['huseyin', 'UND WARUM STAND MIRKAN MIT DEM AUTO IM GARTEN?'],
      ['yusuf', 'HAB ICH IHN AUCH GEFRAGT. ER HAT MIT EINER GEGENFRAGE GEANTWORTET.']
    ]
  });

  lvl2.g(0, 18, 15).g(23, 36, 15).g(41, 52, 13).g(57, 70, 15)
      .g(75, 84, 12).g(89, 100, 14).g(105, 118, 15).g(123, 132, 11)
      .g(137, 150, 14).g(155, 168, 15).g(173, 182, 12).g(187, 200, 15)
      .g(291, 319, 15);

  // MIRKANS ARENA: weite Strasse. Er stuermt mit dem Wagen, also braucht
  // man Platz zum Ausweichen und niedrige Stufen zum Runterspringen.
  lvl2.g(320, 351, 15);
  lvl2.p(324, 11, 4).p(334, 8, 4).p(344, 11, 4);
  lvl2.bossAt(336, 15);
  lvl2.d.bossType = 'mirkan';
  lvl2.d.arena = { x: 320, w: 32 };
  lvl2.q(330, 10, 'doener', 2).it('herz', 335, 7);

  lvl2.p(19, 13, 4).p(37, 13, 4).p(53, 13, 4).p(71, 13, 4)
      .p(85, 12, 4).p(101, 13, 4).p(119, 13, 4).p(133, 12, 4)
      .p(151, 13, 4).p(169, 13, 4).p(183, 13, 4).p(291, 13, 4);

  lvl2.p(8, 10, 5).p(28, 9, 4).p(62, 10, 5).p(94, 9, 4)
      .p(110, 10, 4).p(142, 9, 5).p(160, 10, 4).p(192, 9, 5);

  lvl2.mv(20, 10, 2, 'y', 4, 0.42).mv(54, 10, 2, 'x', 5, 0.55)
      .mv(86, 9, 2, 'y', 5, 0.5).mv(120, 10, 2, 'x', 6, 0.6)
      .mv(170, 9, 2, 'y', 5, 0.5).mv(292, 10, 2, 'x', 5, 0.55);

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
      .trail(296, 13, 9, 2, 2);

  lvl2.it('herz', 78, 10).it('herz', 158, 9)
      .it('honig', 9, 9).it('honig', 10, 9).it('honig', 11, 9)
      .it('honig', 143, 8).it('honig', 144, 8).it('honig', 145, 8);

  lvl2.row('biene', 11, [15, 35, 64, 88, 112, 135, 152, 176, 194, 304])
      .row('biene', 8, [48, 98, 130, 298])
      .row('broki', 15, [10, 30, 62, 110, 160, 192, 308])
      .row('broki', 13, [46, 50])
      .row('broki', 14, [94, 140, 144])
      .row('wecker', 15, [26, 66, 116, 166])
      .row('broki', 12, [78, 176]);

  lvl2.cp(78, 12).cp(148, 14);

  // Goldhonig 1: ueber dem Hochbeet, nur mit Bauch-Boost
  lvl2.p(130, 5, 3).gold(131, 4);

  /* Abschnitt 2: das Baumhaus. Unten Wiese, darueber die Aeste, oben
     das Baumhaus selbst, ganz oben das Dach mit den Bienenstoecken.
     Die Bienen wohnen da. Sie wissen, dass Yusuf kommt. */
  lvl2.g(201, 212, 15).g(217, 232, 15).g(233, 240, 12).g(245, 262, 15).g(266, 290, 15);
  lvl2.p(213, 13, 4).p(241, 13, 4).p(263, 13, 3);
  lvl2.p(205, 11, 5).p(219, 11, 4).p(247, 11, 5).p(258, 11, 4).p(270, 11, 5);   // Aeste
  lvl2.p(212, 7, 8).p(224, 7, 8).p(236, 6, 8).p(248, 7, 10).p(262, 7, 6);       // Baumhaus
  lvl2.p(216, 3, 4).p(252, 3, 5);                                               // Dach
  lvl2.mv(282, 9, 2, 'x', 3, 0.5);
  lvl2.sp(203, 14).sp(246, 14);
  lvl2.q(214, 10, 'honig', 4).q(244, 9, 'doener').q(272, 8, 'honig', 4);
  lvl2.k(230, 14).k(231, 14, 'honig');
  lvl2.trail(202, 13, 5, 2).trail(212, 6, 4, 2).trail(224, 6, 4, 2).trail(236, 5, 4, 2)
      .trail(248, 6, 5, 2).trail(217, 13, 4, 2, 3).trail(266, 13, 8, 2, 2);
  lvl2.it('herz', 256, 6).it('doener', 239, 11);
  lvl2.gold(217, 2).gold(254, 2);
  lvl2.row('broki', 15, [208, 228, 250, 276])
      .e('broki', 236, 12).e('broki', 252, 7)
      .row('biene', 11, [210, 238, 280])
      .e('biene', 222, 5).e('biene', 244, 4).e('biene', 262, 5)
      .e('wecker', 260, 15);
  lvl2.cp(236, 12);

  lvl2.sign(5, 15, 'HONIG NEHMEN: JA. ERWISCHT WERDEN: NEIN. BISHERIGE QUOTE: EHER JA.')
      .sign(60, 15, 'BIENEN VERGESSEN NICHTS. SIE FÜHREN EINE LISTE. DU BIST GANZ OBEN.')
      .sign(108, 15, 'BROKKOLI IST GESUND. DESWEGEN IST ER BÖSE. LOGIK.')
      .sign(190, 15, 'NOCH DREIZEHN LEVEL. DAS IST KEIN DRUCKFEHLER.')
      .sign(210, 15, 'BAUMHAUS. GEBAUT 2009. TÜV-ABNAHME: NIE.')
      .sign(267, 15, 'OBEN WOHNEN DIE BIENEN. SIE ZAHLEN MIETE IN HONIG. YUSUF TREIBT SIE EIN.');

  /* ---------------------------------------------------------------
     LEVEL 3 — Muckibude des Grauens (vertikal)
     --------------------------------------------------------------- */

  var lvl3 = L({
    id: 3, name: 'MUCKIBUDE DES GRAUENS', sub: 'HUSEYINS ZWEITES ZUHAUSE',
    theme: 'gym', music: 'l3', w: 336, h: 26, spawn: [3, 23], par: 130,
    goal: [330, 11], diff: 1.15,
    intro: [
      ['huseyin', 'WILLKOMMEN IM FITNESSSTUDIO. KENNST DU NICHT, WA?'],
      ['yusuf', 'DOCH. 2021. EINMAL. ES WAR VOLL. ICH BIN WIEDER GEGANGEN.'],
      ['huseyin', 'DU WARST IM TANGENTE KAFFEE NEBENAN.'],
      ['yusuf', 'DAS GEBÄUDE ZÄHLT. ICH HAB DURCHS FENSTER MITTRAINIERT.'],
      ['huseyin', 'DU SITZT JEDEN TAG IM TANGENTE.'],
      ['yusuf', 'DAS IST MEIN BÜRO. ICH BIN DORT SEHR PRODUKTIV. IM SITZEN.'],
      ['huseyin', 'HEUTE IST BEINTAG.'],
      ['yusuf', 'BEI MIR IST JEDER TAG SITZTAG. DAS NENNT MAN KONSEQUENZ.'],
      ['huseyin', 'LENNART TRAINIERT HIER AUCH.'],
      ['yusuf', 'LENNART FRAGT MICH JEDES MAL, OB ICH INS GYM GEHE.'],
      ['huseyin', 'UND?'],
      ['yusuf', 'ICH SAG JEDES MAL: GLEICH. SEIT VIER JAHREN.']
    ],
    outro: [
      ['yusuf', 'ICH HAB DEN GANZEN LADEN GESTAMPFT. OHNE MITGLIEDSCHAFT.'],
      ['huseyin', 'DAS IST KEIN TRAINING, YUSUF.'],
      ['yusuf', 'ICH HAB 11.000 SCHRITTE. ALLE IM SPRINGEN. DAS SIND EIGENTLICH 22.000.'],
      ['huseyin', 'SO FUNKTIONIERT DAS NICHT.'],
      ['yusuf', 'ERKLÄR DAS MEINEN BEINEN.']
    ]
  });

  lvl3.g(0, 22, 23).g(27, 40, 23).g(45, 56, 21).g(61, 74, 23)
      .g(79, 90, 19).g(95, 108, 23).g(113, 124, 17).g(129, 142, 21)
      .g(147, 158, 15).g(163, 176, 19).g(181, 192, 13).g(285, 303, 11);

  // LENNARTS ARENA: Hanteln fliegen im Bogen. Eine Pyramide zum
  // Hochklettern, damit man von oben auf ihn drauf kommt.
  lvl3.g(304, 335, 11);
  lvl3.p(308, 7, 3).p(316, 5, 5).p(326, 7, 3).p(332, 6, 3);
  lvl3.bossAt(320, 11);
  lvl3.d.bossType = 'lennart';
  lvl3.d.arena = { x: 304, w: 32 };
  lvl3.q(314, 6, 'doener', 2).it('herz', 317, 4);

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
      .k(150, 14).k(151, 14).k(174, 18).k(286, 10).k(287, 10, 'honig');

  lvl3.sp(30, 22).sp(62, 22).sp(96, 22).sp(130, 20).sp(164, 18);

  lvl3.trail(4, 21, 6, 2).trail(28, 21, 5, 2, 3).trail(46, 19, 5, 2, 2)
      .trail(62, 21, 6, 2, 3).trail(80, 17, 5, 2, 2).trail(96, 21, 6, 2, 3)
      .trail(114, 15, 5, 2, 2).trail(130, 19, 6, 2, 3).trail(148, 13, 5, 2, 2)
      .trail(164, 17, 6, 2, 3).trail(182, 11, 5, 2, 2).trail(286, 9, 5, 2, 2);

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
      .row('drohne', 10, [70, 136, 288])
      .row('wecker', 23, [20, 72, 98])
      .row('broki', 23, [8, 40, 64, 108]);

  lvl3.cp(66, 23).cp(120, 17).cp(185, 13);

  /* Abschnitt 2: Umkleide und Kletterwand. Unten der Keller mit den
     Hanteln, oben die Galerie mit dem Laufband-Tablett, ganz oben das
     Dach. Wer in den Keller faellt, klettert rechts wieder raus. */
  lvl3.g(197, 206, 13).g(207, 232, 21).g(233, 246, 16).g(247, 262, 13).g(263, 284, 11);
  lvl3.p(229, 18, 3).p(221, 12, 3);                                              // Keller-Ausgang, Nische
  lvl3.p(204, 9, 4).p(210, 9, 4).p(221, 9, 4).p(227, 8, 4).p(233, 9, 6);         // Galerie
  lvl3.p(214, 5, 4).p(240, 4, 4);                                                // Dach
  lvl3.mv(215, 9, 2, 'x', 3, 0.55);
  lvl3.sp(226, 20);
  lvl3.q(213, 17, 'honig', 4).q(236, 12, 'doener').q(268, 7, 'kippen');
  lvl3.k(215, 20).k(216, 20, 'honig').k(250, 12);
  lvl3.trail(198, 12, 4, 2).trail(208, 19, 5, 2, 2).trail(210, 8, 4, 1).trail(221, 8, 4, 1)
      .trail(234, 15, 6, 2).trail(248, 12, 6, 2, 2).trail(264, 10, 8, 2, 2);
  lvl3.it('herz', 230, 17).it('kubide', 205, 12);
  lvl3.gold(215, 4).gold(241, 3).gold(222, 11);
  lvl3.e('wecker', 200, 13).row('lennart', 21, [212, 222]).e('lennart', 243, 16)
      .e('lennart', 252, 13).e('broki', 258, 13).row('wecker', 11, [270, 278])
      .e('drohne', 216, 15).e('drohne', 256, 8);
  lvl3.cp(234, 16);

  lvl3.sign(5, 23, 'HEUTE IST BEINTAG. MORGEN AUCH. DAS IST HIER KEIN STUDIO, DAS IST EINE SEKTE.')
      .sign(30, 23, 'STAMPFER ZERBRICHT KISTEN: IN DER LUFT RUNTER DRÜCKEN. ENDLICH EINE ÜBUNG FÜR DICH.')
      .sign(96, 23, 'NIEMAND HAT DICH GEFRAGT, BRO. LENNART FRAGT TROTZDEM.')
      .sign(150, 15, 'KARDIO IST NUR WEGLAUFEN MIT EXTRA SCHRITTEN.')
      .sign(199, 13, 'UMKLEIDE. UNTEN IST DER KELLER. DA TRAINIEREN DIE, DIE DEN AUSGANG NICHT FINDEN.')
      .sign(209, 21, 'KELLER. SEIT 2014 KEIN TAGESLICHT. SEIT 2014 KEIN RUHETAG.')
      .sign(264, 11, 'ZEHN KILO HANTEL. ZWANZIG KILO EGO.');

  /* ---------------------------------------------------------------
     LEVEL 4 — Die Küche der Versuchung
     --------------------------------------------------------------- */

  var lvl4 = L({
    id: 4, name: 'DIE KÜCHE DER VERSUCHUNG', sub: 'GEFÄHRLICHSTER RAUM IM HAUS',
    theme: 'kueche', music: 'l4', w: 362, h: 18, spawn: [3, 15], par: 140,
    goal: [356, 15], diff: 1.1,
    intro: [
      ['yusuf', 'DIE KÜCHE. ENDLICH EIN HEIMSPIEL.'],
      ['huseyin', 'ICH HABE DEN KÜHLSCHRANK UMGEBAUT.'],
      ['huseyin', 'DA IST JETZT SALAT DRIN. NUR SALAT. NACH FARBE SORTIERT.'],
      ['yusuf', 'SALAT HAT NUR EINE FARBE, HUSEYIN.'],
      ['huseyin', 'FÜNFZIG GRÜNTÖNE.'],
      ['yusuf', 'DAS IST DER TRAURIGSTE SATZ, DEN ICH JE GEHÖRT HABE.'],
      ['yusuf', 'UND WO IST ERFAN?'],
      ['huseyin', 'DER KOCH? GANZ HINTEN. SEHR SCHLECHT GELAUNT.'],
      ['huseyin', 'ICH HAB SEIN KUBIDE-FLEISCH WEGGESPERRT. SOLANGE ER KUBIDE MACHT, HÖRST DU NIE AUF.'],
      ['yusuf', 'HAST DU SEINEN SAFRAN ANGEFASST?'],
      ['huseyin', '...NUR KURZ.'],
      ['yusuf', 'HUSEYIN.'],
      ['yusuf', 'MAN FASST ERFANS SAFRAN NICHT AN. DAS WEISS JEDES KIND. SOGAR DIE NACHBARN.']
    ],
    outro: [
      ['erfan', 'SAG DEINEM BRUDER, ER SOLL NICHTS MEHR ANFASSEN.'],
      ['yusuf', 'SAG ICH IHM.'],
      ['erfan', 'UND WENN DOCH, RUF MICH AN.'],
      ['yusuf', 'UND DANN?'],
      ['erfan', 'DANN KOCH ICH IHM WAS. MIT SEHR VIEL BUTTER. DAS IST MEINE RACHE.']
    ]
  });

  lvl4.g(0, 16, 15).g(22, 32, 15).g(38, 46, 13).g(52, 62, 15)
      .g(68, 76, 12).g(82, 94, 15).g(100, 108, 13).g(114, 126, 15)
      .g(132, 140, 11).g(146, 158, 14).g(164, 172, 12).g(178, 190, 15)
      .g(196, 206, 13).g(304, 329, 15);

  // ERFANS ARENA: sein Pfannenschlag schickt Wellen ueber den Boden.
  // Drei kleine Inseln, auf denen man ihnen ausweichen kann.
  lvl4.g(330, 361, 15);
  lvl4.p(334, 11, 3).p(342, 11, 3).p(350, 11, 3).p(341, 7, 5);
  lvl4.bossAt(346, 15);
  lvl4.d.bossType = 'erfan';
  lvl4.d.arena = { x: 330, w: 32 };
  lvl4.q(340, 10, 'doener', 2).it('herz', 343, 9);

  // Gabeln im Boden. Ganz normale Küche.
  lvl4.hz(26, 29, 14, 'gabel').hz(56, 59, 14, 'gabel')
      .hz(88, 91, 14, 'gabel').hz(120, 123, 14, 'gabel')
      .hz(150, 154, 13, 'gabel').hz(184, 187, 14, 'gabel')
      .hz(310, 314, 14, 'gabel');

  lvl4.hz(42, 44, 12, 'oel').hz(104, 106, 12, 'oel').hz(200, 203, 12, 'oel');

  lvl4.p(17, 13, 5).p(33, 13, 5).p(47, 13, 5).p(63, 13, 5)
      .p(77, 13, 5).p(95, 13, 5).p(109, 13, 5).p(127, 13, 5)
      .p(141, 12, 5).p(159, 12, 5).p(173, 13, 5).p(191, 13, 5)
      .p(207, 13, 5);

  lvl4.p(8, 10, 5).p(44, 8, 4).p(72, 8, 4).p(88, 10, 4)
      .p(118, 9, 5).p(136, 7, 4).p(168, 8, 4).p(200, 9, 4).p(316, 10, 5);

  lvl4.mv(18, 10, 2, 'x', 4, 0.6).mv(48, 11, 2, 'y', 5, 0.5)
      .mv(78, 10, 2, 'x', 6, 0.7).mv(110, 11, 2, 'y', 5, 0.55)
      .mv(142, 9, 2, 'x', 6, 0.7).mv(174, 10, 2, 'y', 5, 0.55)
      .mv(208, 11, 2, 'x', 5, 0.6);

  lvl4.q(11, 11, 'honig', 5).q(29, 11, 'doener').q(58, 11, 'honig', 5)
      .q(74, 7, 'gold').q(92, 11, 'honig', 5).q(116, 10, 'baklava')
      .q(138, 6, 'doener').q(156, 10, 'honig', 5).q(188, 11, 'gold')
      .q(308, 11, 'honig', 5);

  lvl4.k(14, 12).k(15, 12, 'honig').k(40, 12).k(66, 11).k(67, 11)
      .k(98, 12).k(99, 12, 'doener').k(130, 10).k(131, 10)
      .k(162, 11).k(180, 12).k(181, 12, 'honig').k(210, 12).k(320, 12);

  // Sprungfedern NIE in ein Gabelfeld setzen — man federt hoch und
  // landet direkt wieder drin. Alle stehen jetzt daneben.
  lvl4.sp(24, 14).sp(70, 11).sp(84, 14).sp(116, 14).sp(181, 14);

  lvl4.trail(4, 13, 6, 2).trail(23, 13, 5, 2, 3).trail(39, 11, 4, 2, 2)
      .trail(53, 13, 5, 2, 3).trail(69, 10, 4, 2, 2).trail(83, 13, 6, 2, 3)
      .trail(101, 11, 4, 2, 2).trail(115, 13, 6, 2, 3).trail(133, 9, 4, 2, 2)
      .trail(147, 12, 6, 2, 3).trail(165, 10, 4, 2, 2).trail(179, 13, 6, 2, 3)
      .trail(197, 11, 5, 2, 2).trail(305, 13, 10, 2, 3);

  lvl4.it('herz', 45, 6).it('herz', 137, 5).it('herz', 317, 8)
      .it('herz', 89, 9).it('herz', 167, 7).it('doener', 101, 12)
      .it('honig', 9, 9).it('honig', 10, 9).it('honig', 73, 7)
      .it('honig', 137, 6).it('honig', 169, 7).it('honig', 201, 8);

  // Gegner stehen ebenfalls nicht mehr in Gabeln oder Öl
  lvl4.row('salat', 15, [10, 25, 60, 86, 125, 178, 306, 322])
      .row('salat', 13, [39, 101, 197])
      .row('salat', 12, [72, 168])
      .row('salat', 14, [147])
      .row('broki', 15, [30, 93, 118, 308])
      .row('broki', 11, [136])
      .row('drohne', 9, [36, 80, 112, 160, 194])
      .row('biene', 10, [54, 128, 206])
      .row('lennart', 15, [54, 124, 190]);

  // Checkpoints liegen HINTER den Gabelfeldern — vorher lagen sie mitten
  // drin, und man tauchte nach einem Tod direkt in den Gabeln wieder auf.
  lvl4.cp(61, 15).cp(125, 15).cp(189, 15);

  lvl4.it('kubide', 45, 7).it('kubide', 121, 8).it('kubide', 202, 8);
  lvl4.q(50, 11, 'kippen').q(176, 10, 'kippen');

  // Goldhonig 1: auf dem Dunstabzug
  lvl4.p(142, 3, 3).gold(143, 2);

  /* Abschnitt 2: die Speisekammer. Regale bis unter die Decke, unten
     Gabeln und Oel, in der Mitte die Arbeitsplatte. Huseyin hat hier
     alles umsortiert. Nach Farbe. */
  lvl4.g(212, 224, 15).g(228, 240, 12).g(245, 258, 15).g(262, 276, 13).g(280, 303, 15);
  lvl4.p(225, 13, 3).p(241, 13, 4).p(259, 13, 3).p(277, 13, 3);
  lvl4.hz(217, 219, 14, 'gabel').hz(250, 252, 14, 'oel').hz(288, 290, 14, 'gabel');
  lvl4.p(214, 11, 5).p(232, 8, 5).p(247, 11, 5).p(265, 9, 5).p(283, 11, 5);    // Regal unten
  lvl4.p(220, 7, 8).p(236, 5, 8).p(248, 7, 8).p(262, 5, 6).p(274, 7, 6);       // Regal oben
  lvl4.p(226, 3, 3).p(256, 3, 3);                                              // Dunstabzug
  lvl4.sp(213, 14).sp(246, 14);
  lvl4.q(222, 11, 'honig', 5).q(258, 11, 'honig', 5).q(292, 11, 'kippen');
  lvl4.k(230, 11).k(231, 11, 'honig').k(270, 12);
  lvl4.trail(214, 12, 5, 2, 3).trail(221, 6, 4, 2).trail(229, 10, 5, 2).trail(237, 4, 4, 2)
      .trail(248, 13, 6, 2, 3).trail(262, 12, 6, 2).trail(281, 13, 8, 2, 3);
  lvl4.it('herz', 266, 8).it('kubide', 277, 6);
  lvl4.gold(227, 2).gold(257, 2);
  lvl4.row('salat', 15, [214, 247, 284, 296]).e('salat', 234, 12).e('broki', 238, 12)
      .e('broki', 250, 7).e('lennart', 268, 13)
      .row('drohne', 9, [230, 258]).e('biene', 244, 9).e('biene', 278, 4);
  lvl4.cp(233, 12).cp(282, 15);

  lvl4.sign(5, 15, 'GABELN IM BODEN. GANZ NORMALE KÜCHE. HUSEYIN NENNT DAS PORTIONSKONTROLLE.')
      .sign(54, 15, 'NUR EIN DÖNER, HAT ER GESAGT. VOR NEUN DÖNERN.')
      .sign(116, 15, 'ÖL IST HEISS. MEHR MUSS MAN ÜBER ÖL NICHT WISSEN.')
      .sign(306, 15, 'HINTEN KOCHT JEMAND. LAUT.')
      .sign(229, 12, 'SPEISEKAMMER. HUSEYIN HAT UMSORTIERT. DIE CHIPS STEHEN JETZT UNTER: FEINDE.')
      .sign(281, 15, 'DER DUNSTABZUG IST NUR DEKO. DER GERUCH BLEIBT. FÜR IMMER.');

  /* ---------------------------------------------------------------
     LEVEL 5 — Husseins Salat-Festung + Endgegner
     --------------------------------------------------------------- */

  var lvl5 = L({
    id: 5, name: 'HUSEYINS SALAT-FESTUNG', sub: 'GEBAUT AUS DISZIPLIN. UND SALAT.',
    theme: 'festung', music: 'l5', w: 304, h: 18, spawn: [3, 15], par: 150,
    diff: 1.34,
    goal: [294, 14],
    intro: [
      ['huseyin', 'DU KOMMST NICHT WEITER. DAS IST MEINE FESTUNG.'],
      ['yusuf', 'DU HAST EINE FESTUNG GEBAUT. AUS SALAT.'],
      ['huseyin', 'AUS DISZIPLIN!'],
      ['yusuf', 'AUS SALAT.'],
      ['huseyin', 'DISZIPLIN IN FORM VON SALAT!'],
      ['yusuf', 'DAS IST DAS ERSTE MAL, DASS SALAT FÜR IRGENDWAS GUT IST.'],
      ['huseyin', 'KOMM HOCH UND HOL DIR DEN LETZTEN HONIG. WENN DU KANNST.'],
      ['yusuf', 'ICH KOMME. LANGSAM. ABER UNAUFHALTSAM. WIE EIN GLETSCHER.']
    ],
    outro: []
  });

  lvl5.g(0, 18, 15).g(24, 34, 15).g(40, 50, 13).g(56, 66, 15)
      .g(72, 80, 12).g(86, 98, 15).g(104, 112, 13).g(118, 130, 15)
      .g(136, 144, 11).g(150, 162, 14);

  // Arena: geschlossener Boden. Der Eingang links wird erst zugemauert,
  // wenn Hussein auftaucht (siehe game.js) — sonst käme man gar nicht rein.
  lvl5.g(258, 303, 15);
  lvl5.wall(303, 2, 14, 1);
  lvl5.p(253, 12, 4);

  lvl5.hz(28, 31, 14, 'dressing').hz(60, 63, 14, 'dressing')
      .hz(92, 95, 14, 'dressing').hz(124, 127, 14, 'dressing')
      .hz(44, 47, 12, 'gabel').hz(108, 110, 12, 'gabel');

  lvl5.p(19, 13, 5).p(35, 13, 5).p(51, 13, 5).p(67, 13, 5)
      .p(81, 13, 5).p(99, 13, 5).p(113, 13, 5).p(131, 13, 5)
      .p(145, 12, 5);

  lvl5.p(9, 10, 5).p(46, 8, 4).p(76, 8, 4).p(108, 9, 4)
      .p(140, 7, 4).p(156, 10, 5);

  // Arena-Plattformen für den Bosskampf
  lvl5.p(264, 11, 5).p(280, 11, 5).p(272, 7, 6);

  lvl5.mv(20, 10, 2, 'y', 5, 0.55).mv(52, 11, 2, 'x', 6, 0.7)
      .mv(82, 10, 2, 'y', 6, 0.6).mv(114, 11, 2, 'x', 6, 0.7)
      .mv(146, 9, 2, 'y', 6, 0.6);

  lvl5.q(13, 11, 'honig', 5).q(31, 11, 'doener').q(64, 11, 'honig', 5)
      .q(78, 7, 'gold').q(96, 11, 'honig', 5).q(120, 10, 'baklava')
      .q(142, 6, 'doener').q(160, 9, 'gold').q(60, 11, 'kippen')
      .q(266, 10, 'doener', 3).q(286, 10, 'doener', 3)
      .q(276, 6, 'kippen');

  lvl5.k(16, 12).k(17, 12, 'honig').k(42, 12).k(70, 11).k(71, 11)
      .k(102, 12).k(103, 12, 'doener').k(134, 10).k(135, 10)
      .k(254, 11).k(276, 12).k(277, 12, 'honig');

  lvl5.sp(26, 14).sp(58, 14).sp(88, 14).sp(120, 14);

  lvl5.trail(4, 13, 7, 2).trail(25, 13, 5, 2, 3).trail(41, 11, 4, 2, 2)
      .trail(57, 13, 5, 2, 3).trail(73, 10, 4, 2, 2).trail(87, 13, 6, 2, 3)
      .trail(105, 11, 4, 2, 2).trail(119, 13, 6, 2, 3).trail(137, 9, 4, 2, 2)
      .trail(151, 12, 6, 2, 3);

  lvl5.it('herz', 47, 6).it('herz', 141, 5).it('herz', 157, 8)
      .it('honig', 10, 9).it('honig', 11, 9).it('honig', 77, 7)
      .it('honig', 141, 6).it('honig', 273, 6).it('honig', 274, 6)
      // Verpflegung in der Arena — der Kampf soll fordernd sein, nicht unfair
      .it('herz', 262, 9).it('herz', 284, 9).it('kubide', 273, 5);

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

  // Goldhonig 1: ueber dem Aufzug-Tablett
  lvl5.p(151, 5, 3).gold(152, 4);

  /* Abschnitt 2: die Salatmauer. Drei Tuerme, dazwischen Graeben voller
     Dressing, oben der Wehrgang, ganz oben die Fahnenmasten. Huseyin hat
     auf jede Fahne ein Bild von sich geklebt. Beim Training. */
  lvl5.g(163, 171, 15).g(175, 180, 10).g(181, 198, 15).g(199, 204, 10)
      .g(205, 220, 15).g(221, 226, 9).g(227, 240, 14).g(241, 252, 14);
  lvl5.p(172, 12, 3).p(186, 12, 2).p(191, 12, 2);
  lvl5.hz(185, 193, 14, 'dressing').hz(209, 211, 14, 'gabel').hz(232, 234, 13, 'dressing');
  lvl5.p(179, 6, 8).p(190, 6, 8).p(201, 5, 6).p(210, 6, 10).p(224, 4, 6);     // Wehrgang
  lvl5.p(194, 2, 2).p(235, 3, 3);                                              // Fahnenmasten
  lvl5.mv(188, 10, 2, 'x', 3, 0.6);
  lvl5.sp(198, 14);
  lvl5.q(166, 11, 'honig', 5).q(214, 11, 'kubide').q(230, 9, 'kippen').q(246, 10, 'doener', 2);
  lvl5.k(168, 14).k(169, 14, 'honig').k(218, 14).k(238, 13);
  lvl5.trail(164, 13, 4, 2).trail(176, 9, 3, 2).trail(180, 5, 4, 2).trail(185, 12, 5, 2, 3)
      .trail(190, 5, 4, 2).trail(206, 13, 5, 2, 2).trail(211, 5, 5, 2).trail(228, 12, 6, 2, 3)
      .trail(242, 12, 5, 2);
  lvl5.it('herz', 200, 9).it('herz', 226, 3).it('kubide', 221, 8);
  lvl5.gold(194, 1).gold(236, 2);
  lvl5.e('salat', 166, 15).e('broki', 177, 10).row('salat', 15, [182, 196])
      .e('lennart', 202, 10).row('broki', 15, [206, 216]).e('salat', 224, 9)
      .row('lennart', 14, [229, 244]).e('drohne', 188, 8).e('drohne', 214, 2)
      .e('biene', 232, 6).e('wecker', 212, 6);
  lvl5.cp(206, 15).cp(242, 14);

  lvl5.sign(5, 15, 'SALAT IST GEMÜSE MIT ZU VIEL SELBSTBEWUSSTSEIN.')
      .sign(58, 15, 'ER HAT DAS ALLES ALLEIN GEBAUT. AN EINEM WOCHENENDE. ZWISCHEN ZWEI LÄUFEN.')
      .sign(120, 15, 'DU BIST FAST DA. ATME. ISS WAS. REIHENFOLGE EGAL.')
      .sign(243, 14, 'AB HIER NUR NOCH HUSEYIN.')
      .sign(164, 15, 'DIE SALATMAUER. FÜR JEDEN TURM GIBT ES EINEN TRAININGSPLAN.')
      .sign(219, 15, 'DAS DRESSING IST OHNE ÖL. DESHALB IST ES SO WÜTEND.');

  lvl5.bossAt(292, 14);
  lvl5.d.bossType = 'huseyin';

  /* ---------------------------------------------------------------
     LEVEL 6 — Mustang nach Stilbruch (Fahr-Level + Siegerehrung)
     --------------------------------------------------------------- */

  var lvl6 = L({
    id: 6, name: 'MUSTANG NACH STILBRUCH', sub: 'SIEGERFAHRT, 2 UHR NACHTS',
    theme: 'strasse', music: 'l6', w: 368, h: 18, spawn: [3, 15], par: 100,
    goal: [358, 15], diff: 1.2, driving: true,
    intro: [
      ['huseyin', 'WAS IST DAS FÜR EIN AUTO?'],
      ['yusuf', 'MEIN MUSTANG. STEHT SEIT DREI JAHREN IN DER GARAGE.'],
      ['huseyin', 'DU HAST NIE ERZÄHLT, DASS DU EIN AUTO HAST.'],
      ['yusuf', 'ICH BIN NIE GEFAHREN. DER WEG ZUR GARAGE WAR ZU WEIT.'],
      ['huseyin', 'DIE GARAGE IST UNTER DEINEM ZIMMER.'],
      ['yusuf', 'EBEN. TREPPEN.'],
      ['huseyin', 'WO FAHREN WIR HIN?'],
      ['yusuf', 'STILBRUCH. ESAT WARTET SCHON.'],
      ['huseyin', 'UM ZWEI UHR NACHTS?'],
      ['yusuf', 'ESAT WARTET IMMER. DAS IST SEIN HOBBY. STEIG EIN.'],
      ['', 'GAS GEBEN MIT RECHTS. SPERREN WERDEN ÜBERFAHREN.'],
      ['', 'ACHTUNG: ROTE AMPELN, POLIZEI UND STRAFZETTEL.'],
      ['', 'UND JA: DER MUSTANG KANN SPRINGEN. SOGAR ZWEIMAL. FRAG NICHT.']
    ],
    outro: []
  });

  // Lange Strasse mit wenigen, klar sichtbaren Luecken
  lvl6.g(0, 46, 15).g(52, 96, 15).g(102, 148, 15)
      .g(154, 198, 15).g(304, 344, 15).g(350, 367, 15);

  // Trittsteine ueber den Luecken, damit der Sprung immer klappt
  lvl6.p(47, 13, 5).p(97, 13, 5).p(149, 13, 5).p(199, 13, 5).p(345, 13, 5);

  // Strassensperren: der Mustang raeumt sie einfach weg
  lvl6.k(14, 14).k(26, 14).k(38, 14).k(60, 14).k(61, 14)
      .k(74, 14).k(88, 14).k(110, 14).k(111, 14).k(124, 14)
      .k(138, 14).k(160, 14).k(161, 14).k(176, 14).k(190, 14)
      .k(310, 14).k(311, 14).k(324, 14).k(336, 14);

  lvl6.k(30, 11).k(82, 11).k(132, 11).k(184, 11).k(330, 11);

  lvl6.q(20, 11, 'honig', 6).q(68, 11, 'kubide').q(118, 11, 'honig', 6)
      .q(168, 11, 'kubide').q(318, 11, 'honig', 6);

  lvl6.trail(5, 13, 8, 2, 2).trail(54, 13, 8, 2, 2).trail(104, 13, 8, 2, 2)
      .trail(156, 13, 8, 2, 2).trail(306, 13, 8, 2, 2).trail(352, 13, 6, 2, 2);

  lvl6.it('herz', 44, 11).it('herz', 146, 11).it('herz', 342, 11);

  // Wer auf der Strasse steht, hat Pech
  lvl6.row('salat', 15, [18, 34, 66, 92, 116, 142, 172, 194, 322, 340])
      .row('broki', 15, [24, 58, 108, 158, 308, 334])
      .row('wecker', 15, [40, 80, 130, 186, 328])
      .row('biene', 10, [30, 90, 140, 200, 350]);

  // Polizei am Strassenrand: wirft Strafzettel, hechtet vor dem Mustang weg
  lvl6.row('polizei', 15, [36, 72, 122, 164, 314]);

  lvl6.cp(110, 15).cp(312, 15);

  // Ampeln. Wer bei Rot drueberfaehrt, wird geblitzt.
  lvl6.d.ampeln = [30, 86, 136, 182, 332];

  // Die Kollegen stossen unterwegs dazu
  lvl6.d.convoy = [{ who: 'erfan', at: 20 }, { who: 'lennart', at: 114 }];

  // Goldhonig 1: auf dem Parkhausdach — nur mit Doppelsprung, auch im Auto
  lvl6.p(160, 8, 6).gold(162, 7);

  /* Abschnitt 2: die Hochstrasse. Unten die Baustelle, oben die
     Hochstrasse ueber die Luecken, ganz oben die Schilderbruecke.
     Der Mustang springt. Niemand weiss, warum. Er tut es einfach. */
  lvl6.g(204, 230, 15).g(236, 262, 15).g(268, 303, 15);
  lvl6.p(231, 13, 5).p(263, 13, 5);
  lvl6.st(212, 14, 4, 1, 2);
  lvl6.p(218, 10, 20).p(242, 9, 14).p(260, 8, 16);                             // Hochstrasse
  lvl6.p(246, 4, 6);                                                           // Schilderbruecke
  lvl6.k(210, 14).k(226, 14).k(248, 14).k(249, 14).k(276, 14).k(290, 14).k(291, 14);
  lvl6.q(208, 11, 'honig', 6).q(282, 11, 'kubide');
  lvl6.trail(206, 13, 3, 2).trail(219, 9, 9, 2).trail(243, 8, 6, 2).trail(261, 7, 7, 2)
      .trail(238, 13, 8, 2, 2).trail(270, 13, 10, 2, 2);
  lvl6.it('herz', 256, 7);
  lvl6.gold(248, 3).gold(273, 7);
  lvl6.row('salat', 15, [222, 240, 258, 296]).row('broki', 15, [228, 252, 284])
      .row('polizei', 15, [246]).e('polizei', 250, 9).e('wecker', 270, 15)
      .e('biene', 232, 6).e('biene', 266, 5);
  lvl6.cp(238, 15);

  lvl6.sign(8, 15, 'GAS GEBEN. SPERREN SIND KEIN PROBLEM. SIE SIND EIN VORSCHLAG.')
      .sign(106, 15, 'NOCH 8 MINUTEN BIS STILBRUCH. SAGT ESAT. SEIT 40 MINUTEN.')
      .sign(308, 15, 'ESAT HAT SCHON BESTELLT. FÜR ALLE. ZWEIMAL.')
      .sign(206, 15, 'HOCHSTRASSE. FÜR AUTOS MIT FLÜGELN UND FAHRER OHNE ANGST.')
      .sign(269, 15, 'SCHILD OBEN: STILBRUCH 2 KM. DAS SCHILD LÜGT SEIT 2016.');

  // Mirkan taucht dreimal auf und faehrt neben Yusuf her.
  lvl6.d.mirkan = [40, 120, 310];

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
      ['yusuf', 'DAS IST MEINE RUHIGE STIMME. MEINE UNRUHIGE WILLST DU NICHT HÖREN.'],
      ['esat', 'OKAY. DANN MACHEN WIR DAS JETZT. UNTER FREUNDEN.'],
      ['yusuf', 'UNTER FREUNDEN.'],
      ['huseyin', 'ICH HALT DIE SHISHA. UND FILM DAS.']
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
      { spr: 'food_apfel', name: 'APFEL', kcal: 0, bad: true, line: 'NULL KALORIEN? DAS IST BETRUG!' }
    ]
  };

  lvl8.d.phone = [
    ['', 'SONNTAG. 13:40 UHR.'],
    ['', 'DAS HANDY KLINGELT SEIT ZWANZIG MINUTEN.'],
    ['erfan', 'YUSUF! WACH AUF!'],
    ['yusuf', 'MMPFH.'],
    ['erfan', 'STEH AUF. SOFORT.'],
    ['yusuf', 'ICH BIN WACH. ICH LIEGE NUR NOCH. DAS SIND ZWEI VERSCHIEDENE DINGE.'],
    ['erfan', 'DU LIEGST AUF DEINEM ESSEN.'],
    ['yusuf', '...DAS IST MEIN FRÜHSTÜCK. VON GESTERN. ES IST NOCH WARM.'],
    ['erfan', 'WEIL DU DRAUF LIEGST.'],
    ['erfan', 'ICH HAB DIR WAS AUF DEN TISCH GESTELLT. ISS ES AUF. ALLES. DANN REDEN WIR.'],
    ['yusuf', 'ICH HAB EIGENTLICH GAR KEINEN HUNGER.'],
    ['erfan', '...'],
    ['yusuf', 'ABER ICH ESS DAS JETZT KOMPLETT.'],
    ['', 'ZIEH DAS ESSEN ZU YUSUF. 10.000 KALORIEN. FINGER WEG VOM GEMÜSE.']
  ];

  lvl8.d.full = [
    ['', 'DER TISCH IST LEER. DER TELLER AUCH. DIE SERVIETTE IST VERSCHWUNDEN.'],
    ['yusuf', 'HÖ HÖ HÖÖÖ.'],
    ['yusuf', 'DAS WAR DIE VORSPEISE.'],
    ['erfan', 'DAS WAREN ZEHNTAUSEND KALORIEN, YUSUF.'],
    ['yusuf', 'VORSPEISEN SIND HEUTZUTAGE HALT GROSSZÜGIG.'],
    ['yusuf', 'ICH HAB IMMER NOCH HUNGER.'],
    ['erfan', 'ICH WEISS. ICH KENNE DICH.'],
    ['', 'YUSUF STEHT AUF. ZUM ZWEITEN MAL HEUTE. PERSÖNLICHER REKORD.'],
    ['yusuf', 'IM KÜHLSCHRANK IST NICHTS MEHR.'],
    ['erfan', 'DANN GEH EINKAUFEN.'],
    ['yusuf', 'ICH NEHM DEN GROSSEN WAGEN.'],
    ['erfan', 'ES GIBT NUR EINE GRÖSSE.'],
    ['yusuf', 'DANN NEHM ICH ZWEI.'],
    ['', 'SPARMARKT. NOCH 40 MINUTEN BIS LADENSCHLUSS.']
  ];

  /* ---------------------------------------------------------------
     LEVEL 9 — Sparmarkt. Gemuese, Snacks, Fleisch, und in der
     Getraenkeabteilung steht Alex.
     --------------------------------------------------------------- */

  var lvl9 = L({
    id: 9, name: 'SPARMARKT', sub: 'ER WOLLTE NUR EIN PAAR SACHEN',
    theme: 'markt', music: 'l4', w: 326, h: 18, spawn: [3, 15], par: 170,
    goal: [322, 15], diff: 1.35,
    intro: [
      ['', 'SPARMARKT. 14:20 UHR.'],
      ['yusuf', 'ICH BRAUCHE NUR EIN PAAR SACHEN.'],
      ['yusuf', 'EIN PAAR SACHEN HEISST HEUTE: ALLES. UND DANN NOCH MAL ALLES.'],
      ['yusuf', 'ERFAN HAT GESAGT, ICH SOLL AUFHÖREN.'],
      ['yusuf', 'ERFAN IST NICHT HIER. ERFAN SIEHT NICHTS.'],
      ['', 'EIN EINKAUFSWAGEN ROLLT VORBEI. VON ALLEIN.'],
      ['yusuf', 'DAS IST EIN ZEICHEN. ICH NEHM ZWEI WAGEN.'],
      ['', 'DER WAGEN DREHT SICH UM. ER SIEHT NICHT FREUNDLICH AUS.']
    ],
    outro: []
  });

  // Vier Abteilungen, dazwischen jeweils eine Luecke
  lvl9.g(0, 58, 15).g(63, 118, 15).g(123, 178, 15).g(273, 325, 15);
  lvl9.p(59, 13, 4).p(119, 13, 4).p(269, 13, 4);

  // Regale zum Draufspringen
  lvl9.p(8, 11, 6).p(20, 11, 6).p(32, 11, 6).p(44, 11, 6)
      .p(14, 8, 5).p(38, 8, 5);
  lvl9.p(68, 11, 6).p(80, 11, 6).p(92, 11, 6).p(104, 11, 6)
      .p(74, 8, 5).p(98, 8, 5);
  lvl9.p(128, 11, 6).p(140, 11, 6).p(152, 11, 6).p(164, 11, 6)
      .p(134, 8, 5).p(158, 8, 5);

  // ALEX' ARENA: die Getraenkeabteilung. Er klettert auf die Regale
  // und trinkt dort oben weiter, also stehen sie dichter.
  lvl9.p(280, 11, 5).p(290, 8, 6).p(302, 11, 5).p(312, 8, 5);
  lvl9.bossAt(306, 15);
  lvl9.d.bossType = 'alex';
  lvl9.d.arena = { x: 273, w: 53 };

  // Umgekipptes Zeug auf dem Boden
  lvl9.hz(36, 38, 14, 'oel').hz(88, 90, 14, 'oel').hz(148, 150, 14, 'oel');

  lvl9.q(28, 11, 'honig', 5).q(52, 11, 'doener').q(86, 11, 'honig', 5)
      .q(110, 11, 'kippen').q(146, 11, 'doener').q(170, 11, 'honig', 5)
      .q(286, 11, 'gold');

  lvl9.k(12, 14).k(24, 14).k(48, 14).k(72, 14).k(96, 14)
      .k(130, 14).k(154, 14).k(172, 14);

  lvl9.trail(4, 13, 6, 2).trail(64, 13, 6, 2, 2).trail(124, 13, 6, 2, 2)
      .trail(274, 13, 5, 2, 2);

  lvl9.it('herz', 30, 10).it('herz', 94, 10).it('herz', 168, 10)
      .it('kubide', 56, 10).it('doener', 112, 10);

  // Gemuese rollt, Wuerste laufen, Einkaufswagen sind ueberall
  lvl9.row('wagen', 15, [10, 26, 42, 70, 92, 104, 130, 144, 166, 278])
      .row('tomate', 15, [18, 34, 50, 78, 100])
      .row('broki', 15, [22, 46])
      .row('wurst', 15, [126, 138, 158, 174])
      .row('salat', 15, [14, 82, 128, 154])
      .row('drohne', 9, [36, 84, 132, 170]);

  lvl9.cp(64, 15).cp(124, 15).cp(276, 15);

  // Goldhonig 1: ganz oben auf dem Chipsregal
  lvl9.p(104, 4, 3).gold(105, 3);

  /* Abschnitt 5 (zwischen Fleisch und Getraenken): Tiefkuehl. Unten die
     Truhen, darueber Regale bis unter die Decke. Die Einkaufswagen sind
     hier besonders schnell. Die Kaelte. */
  lvl9.p(179, 13, 4);
  lvl9.g(183, 200, 15).g(205, 230, 15).g(235, 268, 15);
  lvl9.p(201, 13, 4).p(231, 13, 4);
  lvl9.p(186, 13, 4, 2).p(196, 13, 4, 2).p(210, 13, 5, 2).p(222, 12, 4, 3)     // Truhen
      .p(242, 13, 4, 2).p(256, 13, 4, 2);
  lvl9.p(190, 10, 6).p(214, 10, 6).p(238, 10, 6).p(260, 10, 6);                // Regal Mitte
  lvl9.p(196, 7, 10).p(220, 7, 12).p(246, 7, 10);                              // Regal oben
  lvl9.p(208, 4, 4).p(258, 4, 4);                                              // unter der Decke
  lvl9.hz(226, 228, 14, 'oel').hz(252, 253, 14, 'oel');
  lvl9.q(192, 6, 'honig', 5).q(233, 9, 'doener').q(264, 6, 'kippen');
  lvl9.k(240, 14);
  lvl9.trail(184, 13, 4, 2).trail(191, 9, 3, 2).trail(197, 6, 5, 2).trail(205, 13, 3, 2)
      .trail(221, 6, 6, 2).trail(236, 13, 3, 2).trail(247, 6, 5, 2).trail(261, 13, 4, 2, 2);
  lvl9.it('herz', 230, 6).it('kubide', 262, 9);
  lvl9.gold(209, 3).gold(259, 3);
  lvl9.row('wagen', 15, [184, 206, 236, 262]).row('tomate', 15, [194, 218, 248])
      .e('wurst', 212, 13).e('wurst', 248, 7).e('salat', 216, 15)
      .e('drohne', 214, 5).e('drohne', 250, 4);
  lvl9.cp(207, 15).cp(237, 15);

  lvl9.sign(6, 15, 'SPARMARKT. SPAREN BIS ES WEHTUT.')
      .sign(30, 15, 'OBST & GEMÜSE. YUSUF GEHT HIER SCHNELLER. MIT GESCHLOSSENEN AUGEN.')
      .sign(70, 15, 'SNACKS. HIER WIRD ER LANGSAMER. UND LEISER. FAST ANDÄCHTIG.')
      .sign(126, 15, 'FLEISCH & WURST. HEIMATGEFÜHL.')
      .sign(277, 15, 'GETRÄNKE. HIER STEHT IMMER JEMAND. MEISTENS ALEX.')
      .sign(185, 15, 'TIEFKÜHL. KÄLTER ALS ALEX, WENN MAN IHN FRAGT, OB ER MAL RAUSKOMMT.')
      .sign(238, 15, 'ALLES REDUZIERT. AUSSER YUSUF.');

  /* ---------------------------------------------------------------
     LEVEL 10 — Der Heimweg. Sechs Tueten, achthundert Meter.
     --------------------------------------------------------------- */

  var lvl10 = L({
    id: 10, name: 'DER HEIMWEG', sub: 'SECHS TÜTEN, ACHTHUNDERT METER',
    theme: 'strasse', music: 'l6', w: 250, h: 18, spawn: [3, 15], par: 130,
    goal: [246, 15], diff: 1.25, direct: true,
    intro: [
      ['', 'DRAUSSEN. 15:05 UHR. SECHS TÜTEN.'],
      ['yusuf', 'DER WEG IST NICHT WEIT. ACHTHUNDERT METER.'],
      ['yusuf', 'ICH SCHAFF DAS. ICH BIN IM GRUNDE EIN ATHLET. NUR OHNE DAS TRAINING.'],
      ['', 'DIE TÜTEN WIEGEN MEHR ALS YUSUF. FAST.']
    ],
    outro: [
      ['', 'DIE STRASSE. DAS HAUS. DIE HAUSTÜR.'],
      ['yusuf', 'GESCHAFFT. ACHTHUNDERT METER. OHNE PAUSE. MIT ZWEI PAUSEN.'],
      ['yusuf', 'JETZT NUR NOCH REIN UND AUF DIE COUCH.'],
      ['', 'VOR DER HAUSTÜR STEHT JEMAND.'],
      ['', 'LEDERJACKE. HAARE WIE FRISCH AUS DEM WINDKANAL.'],
      ['yusuf', '...BROKE?']
    ]
  });

  // Der Heimweg geht nicht mehr geradeaus: Gehweg, Gerueste, Dächer,
  // Sprungkissen und eine Baustellen-Plattform.
  lvl10.g(0, 26, 15).g(31, 54, 15).g(59, 86, 15).g(91, 120, 15).g(215, 249, 15);
  lvl10.p(27, 13, 4).p(55, 13, 4).p(87, 13, 4).p(211, 13, 4);
  // Geparkte Autos und Mauern zum Draufspringen
  lvl10.p(8, 12, 6).p(18, 10, 5).p(68, 12, 6).p(78, 10, 5)
       .p(222, 12, 6).p(234, 10, 6);
  // Baugeruest: zwei Ebenen uebereinander
  lvl10.p(36, 11, 10).p(40, 7, 8).p(34, 4, 4);
  lvl10.st(94, 14, 4, 1, 2).p(100, 10, 7).p(110, 7, 6);
  lvl10.sp(24, 14).sp(82, 14);                 // Matratzen am Strassenrand
  lvl10.mv(64, 9, 3, 'x', 4, 0.6).mv(116, 8, 2, 'y', 3, 0.5);
  lvl10.hz(45, 46, 14, 'oel').hz(106, 107, 14, 'oel');
  lvl10.d.bags = true;          // er schleppt die Tueten mit

  lvl10.q(14, 10, 'honig', 5).q(44, 6, 'doener').q(72, 10, 'honig', 5)
       .q(104, 6, 'kippen').q(230, 9, 'honig', 5);
  lvl10.k(22, 14).k(62, 14).k(76, 14).k(218, 14).k(219, 14);
  lvl10.trail(3, 13, 5, 2).trail(37, 10, 5, 2, 2).trail(60, 13, 5, 2, 2)
       .trail(92, 13, 4, 2).trail(101, 9, 6, 2, 2).trail(216, 13, 6, 2, 2);
  lvl10.it('herz', 42, 6).it('doener', 113, 6).it('herz', 236, 9).it('kubide', 35, 3);

  // Aus dem Markt rollt ihm die halbe Gemueseabteilung hinterher
  lvl10.row('wagen', 15, [16, 50, 78, 112, 230])
       .row('tomate', 15, [34, 66, 98, 220])
       .row('broki', 15, [24, 84, 224])
       .row('salat', 15, [40, 100])
       .row('polizei', 15, [52, 118])
       .row('drohne', 9, [30, 72, 116])
       .row('biene', 10, [46, 92, 238])
       .e('wecker', 38, 11).e('salat', 42, 7).e('tomate', 102, 10).e('broki', 236, 10);

  lvl10.cp(32, 15).cp(92, 15).cp(217, 15);
  /* Abschnitt 2: Spielplatz und Garagendaecher. Das Klettergeruest
     geht bis ganz oben, von dort kommt man auf die Daecher. Mit sechs
     Tueten. Die Kinder schauen zu. Niemand hilft. */
  lvl10.g(121, 140, 15).g(145, 162, 15).g(167, 190, 15).g(195, 210, 15);
  lvl10.p(141, 13, 4).p(163, 13, 4).p(191, 13, 4);
  lvl10.p(124, 12, 3).p(128, 9, 3).p(124, 6, 3).p(128, 3, 3);                  // Klettergeruest
  lvl10.p(148, 12, 5).p(170, 12, 5).p(186, 11, 4).p(198, 12, 6);               // Autos
  lvl10.p(134, 8, 8).p(146, 7, 8).p(158, 8, 10).p(172, 7, 6).p(182, 8, 8);     // Garagendaecher
  lvl10.p(162, 3, 3).p(193, 4, 3);                                             // Antennen
  lvl10.hz(152, 153, 14, 'oel');
  lvl10.sp(123, 14);
  lvl10.q(137, 11, 'honig', 5).q(165, 9, 'kippen').q(196, 11, 'doener');
  lvl10.k(175, 14);
  lvl10.trail(122, 13, 4, 2).trail(135, 7, 4, 2).trail(146, 6, 4, 2).trail(158, 7, 5, 2)
       .trail(167, 13, 6, 2, 2).trail(182, 7, 4, 2).trail(195, 13, 6, 2, 2);
  lvl10.it('herz', 152, 11).it('doener', 174, 6);
  lvl10.gold(129, 2).gold(163, 2).gold(194, 3);
  lvl10.row('wagen', 15, [136, 176]).row('tomate', 15, [156]).row('broki', 15, [184, 200])
       .row('polizei', 15, [180]).e('salat', 150, 12).e('wecker', 135, 8).e('broki', 160, 8)
       .e('biene', 140, 5).e('biene', 176, 4).e('drohne', 156, 4);
  lvl10.cp(146, 15).cp(196, 15);

  lvl10.sign(6, 15, 'ACHTHUNDERT METER. MIT SECHS TÜTEN. UND EINER ENTSCHEIDUNG, DIE ER BEREUT.')
       .sign(33, 15, 'BAUSTELLE. SEIT ZWEI JAHREN. GEARBEITET WURDE HIER EINMAL. IM MÄRZ.')
       .sign(60, 15, 'EINE TÜTE REISST IMMER. IMMER DIE SCHWERSTE.')
       .sign(216, 15, 'ER SIEHT SCHON SEIN HAUS. FAST.')
       .sign(121, 15, 'SPIELPLATZ. FÜR KINDER BIS 12. YUSUF FÜHLT SICH ANGESPROCHEN.')
       .sign(168, 15, 'GARAGENDÄCHER. BETRETEN VERBOTEN. STEHT NUR UNTEN DRAN.');

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
      ['yusuf', 'DU HÄTTEST ANRUFEN KÖNNEN.'],
      ['broke', 'HAB ICH. DEIN HANDY LAG IN DER TIEFKÜHLTRUHE.'],
      ['yusuf', 'DA WAR ES SICHER.'],
      ['broke', 'STELL DIE TÜTEN AB. WIR KÄMPFEN.'],
      ['yusuf', 'WARUM DAS DENN?'],
      ['broke', 'NUR ZUM TESTEN. OB DU NOCH IN FORM BIST.'],
      ['yusuf', 'ICH WAR NIE IN FORM. ICH BIN RUND. RUND IST AUCH EINE FORM.'],
      ['broke', 'DANN WIRD ES EIN KURZER TEST.'],
      ['broke', 'ACH JA. ICH HAB DIE MIKAS MITGEBRACHT.'],
      ['yusuf', 'WER SIND DIE MIKAS?'],
      ['broke', 'MEINE KLEINEN KOLLEGEN. SIE HEISSEN ALLE MIKA.'],
      ['mika', 'HALLO.'],
      ['mika', 'HALLO.'],
      ['yusuf', 'DAS WAR ZWEIMAL DERSELBE.'],
      ['broke', 'NEIN. DAS WAREN ZWEI MIKAS. UND ES WERDEN MEHR.'],
      ['yusuf', 'WIE VIELE MEHR?'],
      ['mika', 'JA.'],
      ['', 'YUSUF STELLT DIE TÜTEN AB. VORSICHTIG. EINE NACH DER ANDEREN. DIE EIER ZULETZT.']
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
    theme: 'berg', music: 'l2', w: 1234, h: 98, spawn: [4, 8], par: 120,
    goal: [1226, 95], diff: 1.2, bike: true, direct: true,
    buddy: 'esat', buddyLines: 'esatRideLines',
    intro: [
      ['', 'DER HAUSBERG. DIENSTAG, 9:10 UHR.'],
      ['esat', 'DAS IST MEIN HAUSBERG. ICH FAHR HIER JEDEN SONNTAG.'],
      ['yusuf', 'ES IST DIENSTAG.'],
      ['esat', 'DANN HALT AUCH DIENSTAGS. ICH BIN FLEXIBEL.'],
      ['esat', 'GESTERN WAR ÜBRIGENS PERFEKTES WETTER.'],
      ['yusuf', 'GESTERN WAR ICH BESCHÄFTIGT.'],
      ['yusuf', 'WO IST DER LIFT?'],
      ['esat', 'ES GIBT KEINEN LIFT. WIR SIND OBEN. ES GEHT NUR NOCH RUNTER.'],
      ['yusuf', 'NUR RUNTER. ENDLICH EIN SPORT, DER ZU MIR PASST.'],
      ['esat', 'AUF DEN RAMPEN HEBST DU AB. IN DER LUFT: RÜCKWÄRTSSALTO.'],
      ['yusuf', 'EIN SALTO. MIT MIR DRAUF. DAS FAHRRAD HAT DAS NICHT VERDIENT.'],
      ['esat', 'GIBT PUNKTE. UND UNTERWEGS LIEGT HONIG.'],
      ['yusuf', 'WARUM LIEGT HIER HONIG?'],
      ['esat', 'DAS FRAGST DU SEIT ELF LEVELN. HAST DU JE EINE ANTWORT GEKRIEGT?'],
      ['yusuf', 'NEIN. ABER JEDES MAL HONIG.'],
      ['', 'RECHTS = TRETEN. LINKS = BREMSEN. SPRUNG = HÜPFEN.'],
      ['', 'IN DER LUFT NOCHMAL SPRUNG = RÜCKWÄRTSSALTO. GERADE LANDEN!']
    ],
    outro: [
      ['', 'UNTEN. DIE BREMSEN QUALMEN. YUSUF AUCH.'],
      ['esat', 'NICHT SCHLECHT, YUSUF. WIRKLICH NICHT SCHLECHT.'],
      ['yusuf', 'ICH HAB EINEN RÜCKWÄRTSSALTO GEMACHT.'],
      ['esat', 'DU HAST DABEI GESCHRIEN.'],
      ['yusuf', 'VOR FREUDE. IN MOLL.'],
      ['esat', 'UND LENNART?'],
      ['yusuf', 'WELCHER LENNART?'],
      ['esat', 'GENAU.'],
      ['esat', 'ICH MUSS KURZ HEIM. DUSCHEN.'],
      ['yusuf', 'UND ICH GEH SHAWARMA ESSEN.'],
      ['esat', 'DU HAST DOCH GAR KEINEN HUNGER.'],
      ['yusuf', 'NEIN. ABER HAMZA WARTET. MAN LÄSST HAMZA NICHT WARTEN.']
    ]
  });

  // Von oben nach unten: jede Stufe ein Stueck tiefer. Das lange flache
  // Stueck (137-200) gehoert Lennart — da hat er seinen Auftritt.
  lvl12.g(0, 24, 8).g(25, 36, 10).g(37, 48, 12)
       .g(53, 70, 14).g(71, 84, 16).g(85, 104, 20)
       .g(105, 118, 22).g(124, 136, 23).g(137, 200, 24)
       .g(201, 212, 26).g(213, 234, 36).g(235, 252, 37)
       .g(258, 274, 38).g(1197, 1233, 95);

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
       .trail(1198, 94, 8, 3);
  lvl12.q(92, 16, 'honig', 5).q(240, 33, 'herz').q(1204, 91, 'honig', 5);
  lvl12.it('herz', 110, 19).it('kubide', 262, 35).it('doener', 180, 21);

  // Bienen verteidigen den Berg. Das Fahrrad faehrt einfach durch.
  lvl12.e('biene', 98, 17).e('biene', 128, 20).e('biene', 226, 32)
       .e('biene', 264, 34).e('biene', 1214, 91);

  lvl12.cp(132, 23).cp(198, 24).cp(265, 38);

  // Goldhonig 1: ueber dem Honigbogen der dritten Rampe — nur mit Vollgas
  lvl12.gold(123, 11);

  /* Abschnitt 2: die Abfahrt durch die Kiesgrube. Noch zwei Rampen, eine
     davon ueber eine Luecke, und oben auf dem Geruest liegt Gold. Man muss
     nur richtig schnell sein. Oder richtig verrueckt. Oder Esat. */
  lvl12.g(275, 290, 40).g(291, 302, 42).g(310, 326, 45).g(327, 350, 46).g(351, 374, 47);
  lvl12.p(333, 39, 6);                                                        // Geruest
  lvl12.kick(301, 42).kick(325, 45);
  lvl12.hz(285, 285, 39, 'dornen').hz(344, 345, 45, 'dornen');
  lvl12.q(318, 41, 'herz');
  lvl12.trail(276, 39, 6, 2).trail(302, 40, 6, 2, 7).trail(311, 44, 5, 2)
       .trail(326, 43, 5, 2, 5).trail(352, 46, 8, 2);
  lvl12.gold(307, 32).gold(336, 38);
  lvl12.e('biene', 296, 38).e('biene', 347, 42);
  lvl12.cp(312, 45).cp(352, 47);

  /* Abschnitt 3: der lange Rest vom Berg. Stufen, Rampen ueber Luecken,
     Dornen, Bienen, ein paar Abgruende — immer weiter runter. */
  global.Abschnitte.bergab(lvl12, 375, 47).folge([
        'stufen', 'dornen', 'rampe', 'bienen', 'huckel', 'rast', 'rampe', 'abgrund',
        'dornen', 'stufen', 'bienen', 'rampe', 'rast', 'huckel', 'rampe', 'dornen',
        'abgrund', 'bienen', 'stufen', 'rast', 'rampe', 'huckel', 'dornen', 'rampe',
        'bienen', 'abgrund', 'stufen', 'rast', 'rampe', 'dornen'
  ]);

  lvl12.sign(8, 8, 'RECHTS = TRETEN. LINKS = BREMSEN.')
       .sign(40, 12, 'RAMPE = ABHEBEN. IN DER LUFT SPRUNG = SALTO.')
       .sign(58, 14, 'SCHIEF LANDEN TUT WEH. DAS WEISS DAS FAHRRAD AUCH.')
       .sign(204, 26, 'GROSSER SPRUNG. ZWEI SALTOS SCHAFFT NUR ESAT. SAGT ESAT.')
       .sign(1202, 95, 'FAST UNTEN. BREMSEN NICHT VERGESSEN.')
       .sign(277, 40, 'KIESGRUBE. HIER HAT ESAT MAL EIN REH ÜBERHOLT. SAGT ESAT.')
       .sign(353, 47, 'GOLD GIBT ES NUR MIT VOLLGAS. BREMSEN IST FÜR LEUTE MIT ZUKUNFT.');

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
    theme: 'imbiss', music: 'l4', w: 798, h: 18, spawn: [3, 15], par: 150,
    goal: [793, 15], diff: 1.35,
    intro: [
      ['', 'HAMZAS RESTAURANT. 12:40 UHR.'],
      ['', 'DER SPIESS DREHT SICH SEIT HEUTE MORGEN. ER IST MÜDE.'],
      ['yusuf', 'ES RIECHT NACH SHAWARMA.'],
      ['yusuf', 'UND NACH KNOBLAUCHSOSSE. AUF DEM BODEN. WARUM AUF DEM BODEN?'],
      ['', 'AUS DER KÜCHE ROLLT EINE FALAFEL. SIE SIEHT WÜTEND AUS.'],
      ['yusuf', 'DAS IST MIR NOCH NIE PASSIERT. UND ICH ESSE SEHR VIEL FALAFEL.'],
      ['yusuf', '...VIELLEICHT IST DAS DER GRUND.']
    ],
    outro: []
  });

  lvl13.g(0, 46, 15).g(51, 98, 15).g(103, 142, 15).g(754, 797, 15);
  lvl13.p(47, 13, 4).p(99, 13, 4).p(750, 13, 4);
  // Theke, Kueche, Gastraum: Tische und Tresen zum Draufspringen
  lvl13.p(10, 11, 5).p(22, 10, 8).p(36, 11, 5).p(26, 7, 4);
  lvl13.p(58, 11, 6).p(70, 9, 6).p(84, 11, 6).p(76, 6, 4);
  lvl13.p(108, 11, 5).p(118, 11, 5).p(128, 11, 5).p(113, 8, 4).p(123, 8, 4);
  // Hamzas Gastraum: unten der Boden, links und rechts je ein Tisch und
  // eine Stufe, oben die Empore (die VIP-Loge seiner Mutter). In der
  // zweiten Halbzeit spielt Hamza von da oben.
  lvl13.p(757, 11, 5).p(761, 8, 2)                 // links: Tisch, Stufe
       .p(764, 6, 24)                              // die Empore
       .p(789, 8, 2).p(790, 11, 5);                // rechts: Stufe, Tisch
  lvl13.bossAt(785, 15);
  lvl13.d.bossType = 'hamza';
  lvl13.d.arena = { x: 754, w: 44 };
  lvl13.d.empore = { x0: 764, x1: 787, y: 6 };

  // Knoblauchsosse auf dem Boden
  lvl13.hz(29, 31, 14, 'toum').hz(64, 66, 14, 'toum')
       .hz(90, 92, 14, 'toum').hz(115, 117, 14, 'toum');

  lvl13.q(16, 11, 'honig', 5).q(62, 7, 'shawarma').q(100, 10, 'honig', 5)
       .q(125, 11, 'kippen').q(770, 11, 'shawarma').q(781, 11, 'herz');
  lvl13.k(6, 14).k(44, 14).k(86, 14).k(138, 14);
  lvl13.trail(3, 13, 5, 2).trail(52, 13, 5, 2, 2).trail(104, 13, 5, 2, 2)
       .trail(755, 13, 4, 2, 2);
  lvl13.it('herz', 24, 8).it('shawarma', 78, 4).it('herz', 115, 6).it('shawarma', 792, 9)
       .it('herz', 759, 9).it('herz', 775, 4);

  lvl13.row('falafel', 15, [12, 40, 60, 80, 110, 132])
       .row('peperoni', 15, [18, 34, 72, 96, 122])
       .row('pita', 9, [26, 66, 104, 128]);

  lvl13.cp(56, 15).cp(106, 15);
  // Goldhonig 1: ueber dem Tresen
  lvl13.p(82, 3, 3).gold(83, 2);

  /* Abschnitt 2: das Lager hinter der Kueche. Regale mit Kichererbsen in
     drei Etagen, auf dem Boden Knoblauchsosse. Hamza lagert hier
     Hummus fuer die naechsten zwanzig Jahre. Er ist zu fluessig. */
  lvl13.g(143, 160, 15).g(165, 184, 15).g(189, 210, 15).g(215, 232, 15);
  lvl13.p(161, 13, 4).p(185, 13, 4).p(211, 13, 4);
  lvl13.hz(150, 152, 14, 'toum').hz(198, 200, 14, 'toum');
  lvl13.p(146, 11, 4).p(168, 11, 6).p(192, 11, 5).p(218, 11, 6);               // Regal unten
  lvl13.p(153, 7, 10).p(176, 7, 12).p(200, 7, 10).p(222, 7, 6);               // Regal oben
  lvl13.p(163, 3, 3).p(211, 3, 3);                                            // Luefterschacht
  lvl13.sp(175, 14);
  lvl13.q(166, 10, 'honig', 5).q(203, 11, 'shawarma').q(226, 11, 'kippen');
  lvl13.k(147, 14).k(230, 14);
  lvl13.trail(144, 13, 4, 2).trail(154, 6, 5, 2).trail(165, 13, 5, 2, 2).trail(177, 6, 6, 2)
       .trail(189, 13, 5, 2, 3).trail(201, 6, 5, 2).trail(215, 13, 8, 2, 2);
  lvl13.it('herz', 186, 6).it('shawarma', 225, 6);
  lvl13.gold(164, 2).gold(212, 2);
  lvl13.row('falafel', 15, [146, 170, 194, 224]).row('peperoni', 15, [157, 180, 206, 228])
       .e('falafel', 180, 7).e('peperoni', 158, 7).e('pita', 188, 4).e('pita', 214, 9);
  lvl13.cp(167, 15).cp(216, 15);

  /* Abschnitt 3: Hamzas Hinterzimmer, Lager, Kuehlraum, Innenhof — alles
     voller Falafel. Aus dem Baukasten (abschnitte.js). */
  global.Abschnitte.zufuss(lvl13, 233, { boden: ['falafel', 'peperoni'], flug: ['pita'], gefahr: 'toum',
      essen: 'shawarma', schilder: [
        'NOCH EIN LAGER. HAMZA LAGERT VIEL.',
        'HIER LANG ZUR KÜCHE. ODER ZUM LAGER. ODER ZUM ANDEREN LAGER.',
        'DIE FALAFEL SIND AUSGEBROCHEN. ZUM DRITTEN MAL DIESE WOCHE.',
        'HAMZA SAGT: DER HUMMUS IST NICHT ZU FLÜSSIG.',
        'PERSONAL ONLY. YUSUF ZÄHLT ALS PERSONAL. SAGT YUSUF.'] }).folge([
        'rast', 'flach', 'luecken', 'treppe', 'kisten', 'ebenen', 'rast', 'tabletts',
        'arena', 'mauer', 'turm', 'rast', 'luecken', 'kisten', 'ebenen', 'treppe',
        'rast', 'arena', 'flach'
  ]);

  lvl13.sign(5, 15, 'HAMZAS. LIBANESISCH. SEIT IMMER.')
       .sign(26, 15, 'KNOBLAUCHSOSSE AUF DEM BODEN. NICHT REINTRETEN. NICHT PROBIEREN. YUSUF.')
       .sign(54, 15, 'KÜCHE. DIE FALAFEL ROLLEN HIER FREI HERUM. BIO. AUS FREILAUFHALTUNG.')
       .sign(110, 15, 'GASTRAUM. BITTE NICHT AUF DIE TISCHE SPRINGEN. DANKE FÜRS LESEN. UND FÜRS IGNORIEREN.')
       .sign(757, 15, 'HAMZA. SEIN LADEN. SEIN HUMMUS. ER IST NICHT ZU FLÜSSIG.')
       .sign(144, 15, 'LAGER. KICHERERBSEN FÜR ZWANZIG JAHRE. ODER FÜR YUSUF EINE WOCHE.')
       .sign(190, 15, 'OBEN IM LÜFTERSCHACHT LIEGT GOLDHONIG. FRAG NICHT, WIE ER DA HINKAM.');

  /* ---------------------------------------------------------------
     LEVEL 14 — Stilbruch. Eine Shisha nach dem Essen, ganz entspannt.
     Dann ruelpst Yusuf. Esat geht die ganze Zeit mit.
     --------------------------------------------------------------- */

  var lvl14 = L({
    id: 14, name: 'STILBRUCH', sub: 'EINE SHISHA. GANZ ENTSPANNT.',
    theme: 'bar', music: 'l6', w: 833, h: 18, spawn: [3, 15], par: 160,
    goal: [829, 15], diff: 1.3, buddy: 'esat', buddyLines: 'esatBarLines',
    intro: [
      ['', 'SHISHA-BAR STILBRUCH. 21:10 UHR.'],
      ['esat', 'SO. JETZT GANZ ENTSPANNT. EINE SHISHA, DANN NACH HAUSE.'],
      ['yusuf', 'ICH HAB DREI SHAWARMA IM BAUCH.'],
      ['esat', 'VIER. ICH HAB MITGEZÄHLT. ICH ZÄHLE IMMER MIT.'],
      ['', 'YUSUF RÜLPST. SEHR LAUT. SEHR LANGE. IN MEHREREN AKTEN.'],
      ['', 'DIE GANZE BAR DREHT SICH UM. DIE MUSIK AUCH.'],
      ['', 'AM NEBENTISCH STEHT JEMAND AUF. DANN NOCH JEMAND. DANN ALLE.'],
      ['typ', 'WAS WAR DAS, BRUDER?'],
      ['yusuf', 'EIN KOMPLIMENT AN DEN KOCH.'],
      ['typ', 'HIER GIBT ES KEINEN KOCH.'],
      ['yusuf', 'DANN AN DEN, DER IHN ENTLASSEN HAT.'],
      ['esat', 'EY YUSUF. CHILL.'],
      ['yusuf', 'ICH BIN GECHILLT. DIE NICHT.'],
      ['', 'SIE GREIFEN ZU DEN ZANGEN. UND ZUR HEISSEN KOHLE.'],
      ['esat', 'OKAY. HINTEN IST UNSER TISCH RESERVIERT. DA WOLLEN WIR HIN. SCHNELL.'],
      ['yusuf', 'SCHNELL KANN ICH NICHT. ICH KANN ENTSCHLOSSEN.']
    ],
    outro: []
  });

  lvl14.g(0, 58, 15).g(59, 74, 13).g(75, 130, 15).g(131, 146, 12).g(780, 832, 15);
  // Sofas, Tische, die Lounge
  lvl14.p(10, 11, 6).p(24, 11, 6).p(38, 10, 6).p(50, 11, 5)
       .p(80, 11, 6).p(94, 10, 6).p(108, 11, 6).p(120, 9, 5)
       .p(785, 11, 6).p(799, 10, 6).p(813, 11, 6);
  // Umgekippte Kohle
  lvl14.hz(33, 34, 14, 'kohle').hz(88, 89, 14, 'kohle')
       .hz(793, 794, 14, 'kohle').hz(807, 808, 14, 'kohle');

  lvl14.q(18, 8, 'honig', 5).q(70, 9, 'doener').q(115, 6, 'kippen').q(793, 8, 'honig', 5);
  lvl14.trail(4, 13, 5, 2).trail(76, 13, 5, 2, 2).trail(132, 11, 6, 2).trail(781, 13, 5, 2, 2);
  lvl14.it('herz', 26, 9).it('herz', 122, 7).it('doener', 140, 10).it('herz', 815, 9);

  // Die Typen vom Nebentisch. Es sind viele.
  lvl14.row('typ1', 15, [16, 44, 84, 112, 789, 819])
       .row('typ2', 15, [28, 100, 803])
       .row('typ3', 15, [52, 124, 825])
       .e('typ2', 66, 13).e('typ1', 138, 12)
       .e('typ3', 40, 10).e('typ1', 96, 10).e('typ2', 801, 10);

  lvl14.cp(56, 15).cp(104, 15).cp(783, 15);
  // Goldhonig 1: auf dem Lautsprecher
  lvl14.p(126, 4, 3).gold(127, 3);

  /* Abschnitt 2: Empore und Dachterrasse. Unten das DJ-Pult und die
     zweite Bar, oben die Empore, ganz oben die Terrasse. Da sitzt
     niemand. Da ist es zu kalt. Da liegt Gold. */
  lvl14.g(147, 166, 15).g(167, 178, 13).g(179, 200, 15).g(201, 212, 12).g(213, 236, 15);
  lvl14.hz(154, 155, 14, 'kohle').hz(188, 189, 14, 'kohle').hz(222, 223, 14, 'kohle');
  lvl14.p(150, 11, 5).p(170, 9, 5).p(183, 11, 5).p(216, 11, 5).p(228, 11, 5);  // Sofas
  lvl14.p(157, 7, 10).p(176, 6, 8).p(190, 7, 10).p(203, 8, 8).p(214, 7, 10);  // Empore
  lvl14.p(168, 3, 4).p(225, 3, 4);                                            // Dachterrasse
  lvl14.sp(212, 11);
  lvl14.q(158, 11, 'honig', 5).q(181, 10, 'doener').q(208, 4, 'kippen');
  lvl14.k(175, 12).k(234, 14);
  lvl14.trail(148, 13, 3, 2).trail(158, 6, 5, 2).trail(168, 12, 5, 2).trail(177, 5, 4, 2)
       .trail(191, 6, 5, 2).trail(201, 11, 5, 2).trail(215, 6, 5, 2).trail(226, 13, 5, 2, 2);
  lvl14.it('herz', 199, 6).it('doener', 211, 7);
  lvl14.gold(169, 2).gold(226, 2);
  lvl14.row('typ1', 15, [150, 184, 218]).row('typ2', 15, [162, 196, 232])
       .e('typ3', 172, 13).e('typ2', 206, 12).e('typ1', 194, 7).e('typ3', 160, 7);
  lvl14.cp(180, 15).cp(215, 15);

  /* Abschnitt 3: die Bar ist groesser als gedacht. Viel groesser.
     Aus dem Baukasten (abschnitte.js). */
  global.Abschnitte.zufuss(lvl14, 237, { boden: ['typ1', 'typ2', 'typ3'], zaeh: 'typ2', gefahr: 'kohle',
      essen: 'doener', schilder: [
        'DIE BAR IST GRÖSSER ALS SIE VON AUSSEN AUSSIEHT.',
        'VIP-BEREICH. DAS V STEHT FÜR VOLL.',
        'HIER LANG ZUM RESERVIERTEN TISCH. SAGT ESAT. SEIT EINER STUNDE.',
        'KOHLE NICHT ANFASSEN. AUCH NICHT, WENN SIE NETT GUCKT.',
        'ZWEITE BAR. DRITTE BAR. WER BAUT SO EINE BAR?'] }).folge([
        'rast', 'flach', 'treppe', 'kisten', 'luecken', 'ebenen', 'rast', 'arena',
        'mauer', 'tabletts', 'turm', 'rast', 'kisten', 'luecken', 'ebenen', 'treppe',
        'rast', 'arena', 'flach', 'mauer'
  ]);

  lvl14.sign(6, 15, 'STILBRUCH. RAUCHEN ERLAUBT. RÜLPSEN NICHT.')
       .sign(62, 13, 'LOUNGE. BITTE NICHT STRESSEN. ZU SPÄT.')
       .sign(134, 12, 'THEKE. HIER WIRD DIE KOHLE GEMACHT. UND GEWORFEN.')
       .sign(821, 15, 'RESERVIERT: ESAT UND BEGLEITUNG. DIE BEGLEITUNG HAT SCHON WIEDER HUNGER.')
       .sign(148, 15, 'EMPORE. VIP-BEREICH. DAS V STEHT FÜR VERBOTEN.')
       .sign(213, 15, 'DACHTERRASSE GESCHLOSSEN. WEGEN WIND. UND WEGEN YUSUF.');

  /* ---------------------------------------------------------------
     LEVEL 15 — Bei Georgios. Griechisch, kurz vor Kuechenschluss.
     Die Meeresfruechte sind frisch. Sehr frisch. Und Georgios ist schnell.
     --------------------------------------------------------------- */

  var lvl15 = L({
    id: 15, name: 'BEI GEORGIOS', sub: 'TAVERNE. KÜCHE BIS ELF.',
    theme: 'taverne', music: 'l3', w: 797, h: 18, spawn: [3, 15], par: 150,
    goal: [793, 15], diff: 1.45, buddy: 'esat', buddyLines: 'esatTaverneLines',
    intro: [
      ['', 'TAVERNE GEORGIOS. 22:45 UHR.'],
      ['esat', 'DIE KÜCHE MACHT UM ELF ZU. WIR HABEN FÜNFZEHN MINUTEN.'],
      ['yusuf', 'DAS REICHT FÜR EINE VORSPEISE. UND FÜR EINE ZWEITE VORSPEISE.'],
      ['', 'IM AQUARIUM BEWEGT SICH ETWAS. ES KOMMT RAUS.'],
      ['esat', 'WARUM LAUFEN HIER KRABBEN RUM?'],
      ['yusuf', 'FRISCHER GEHT ES NICHT. DIE LIEFERN SICH SELBST.']
    ],
    outro: []
  });

  lvl15.g(0, 44, 15).g(49, 96, 15).g(101, 142, 15).g(754, 796, 15);
  lvl15.p(45, 13, 4).p(97, 13, 4).p(750, 13, 4);
  lvl15.p(8, 11, 5).p(18, 9, 6).p(30, 11, 6).p(56, 11, 5).p(66, 8, 6).p(80, 11, 6)
       .p(106, 11, 5).p(116, 9, 5).p(128, 11, 6);
  // Georgios' Ecke
  lvl15.p(759, 11, 5).p(769, 8, 6).p(781, 11, 5).p(790, 8, 4);
  lvl15.bossAt(785, 15);
  lvl15.d.bossType = 'georgios';
  lvl15.d.arena = { x: 754, w: 43 };

  // Olivenoel auf dem Boden
  lvl15.hz(24, 26, 14, 'oel').hz(72, 74, 14, 'oel');

  lvl15.q(12, 7, 'honig', 5).q(60, 7, 'souvlaki').q(112, 6, 'honig', 5).q(761, 7, 'herz');
  lvl15.trail(3, 13, 5, 2).trail(50, 13, 5, 2, 2).trail(102, 13, 5, 2, 2).trail(755, 13, 4, 2, 2);
  lvl15.it('herz', 20, 7).it('souvlaki', 68, 6).it('herz', 118, 7).it('souvlaki', 793, 6);

  // Meeresfruechte. Frisch aus dem Aquarium, und sie wehren sich.
  lvl15.row('krabbe', 15, [12, 38, 60, 86, 114, 136])
       .row('krake', 15, [34, 78, 120])
       .e('fisch', 26, 7).e('fisch', 70, 6).e('fisch', 108, 8).e('fisch', 132, 8);

  lvl15.cp(54, 15).cp(104, 15);
  // Goldhonig 1: auf dem Weinregal
  lvl15.p(73, 4, 3).gold(74, 3);

  /* Abschnitt 2: die Terrasse. Unten Weinfaesser, darueber die Pergola
     mit den Reben, ganz oben das Dach. Die Krabben sind ueberall. Auch
     da, wo Krabben nicht hinkommen. */
  lvl15.g(143, 158, 15).g(163, 182, 15).g(183, 190, 12).g(191, 208, 15).g(213, 232, 15);
  lvl15.p(159, 13, 4).p(209, 13, 4);
  lvl15.hz(150, 152, 14, 'oel').hz(199, 201, 14, 'oel');
  lvl15.p(146, 11, 4).p(166, 11, 5).p(194, 11, 4).p(216, 11, 5);               // Tische
  lvl15.p(152, 7, 9).p(172, 7, 10).p(184, 7, 6).p(199, 7, 10).p(221, 7, 8);    // Pergola
  lvl15.p(162, 3, 3).p(210, 3, 3);                                            // Dach
  lvl15.sp(192, 14);
  lvl15.q(164, 10, 'honig', 5).q(188, 4, 'souvlaki').q(214, 10, 'kippen');
  lvl15.k(180, 14).k(230, 14);
  lvl15.trail(144, 13, 4, 2).trail(153, 6, 4, 2).trail(163, 13, 5, 2, 2).trail(173, 6, 5, 2)
       .trail(185, 11, 3, 2).trail(195, 12, 4, 2, 2).trail(200, 6, 5, 2).trail(213, 13, 8, 2, 2);
  lvl15.it('herz', 181, 6).it('souvlaki', 228, 6);
  lvl15.gold(163, 2).gold(211, 2);
  lvl15.row('krabbe', 15, [146, 170, 196, 218]).row('krake', 15, [156, 204, 226])
       .e('krabbe', 186, 12).e('krabbe', 176, 7).e('krabbe', 203, 7)
       .e('fisch', 165, 5).e('fisch', 192, 4).e('fisch', 224, 9);
  lvl15.cp(165, 15).cp(214, 15);

  /* Abschnitt 3: Keller, Vorratskammer, Hinterhof der Taverne.
     Aus dem Baukasten (abschnitte.js). */
  global.Abschnitte.zufuss(lvl15, 233, { boden: ['krabbe', 'krake'], flug: ['fisch'], zaeh: 'krake', gefahr: 'oel',
      essen: 'souvlaki', schilder: [
        'DIE TAVERNE HAT EINEN KELLER. UND NOCH EINEN.',
        'OMAS VORRATSKAMMER. NICHTS ANFASSEN. NICHTS!',
        'DIE KRABBEN HABEN EINE GEWERKSCHAFT GEGRÜNDET.',
        'NOCH FÜNF MINUTEN BIS KÜCHENSCHLUSS. SEIT ZWANZIG MINUTEN.',
        'OLIVENÖL AUF DEM BODEN. EXTRA VERGINE.'] }).folge([
        'rast', 'luecken', 'flach', 'ebenen', 'kisten', 'rast', 'tabletts', 'turm',
        'arena', 'rast', 'treppe', 'mauer', 'luecken', 'ebenen', 'rast', 'kisten',
        'arena', 'flach', 'treppe'
  ]);

  lvl15.sign(5, 15, 'TAVERNE GEORGIOS. KÜCHE BIS ELF. FÜR YUSUF BIS ZWÖLF.')
       .sign(52, 15, 'FRISCHER FISCH. SEHR FRISCH. ER WEHRT SICH.')
       .sign(108, 15, 'TELLER ZERSCHLAGEN ERLAUBT. SAGT GEORGIOS. ER ZÄHLT TROTZDEM MIT.')
       .sign(757, 15, 'GEORGIOS. SEHR SCHNELL. SAGT ER.')
       .sign(144, 15, 'TERRASSE MIT MEERBLICK. DAS MEER IST EIN POSTER.')
       .sign(213, 15, 'OBEN AUF DEM DACH LIEGT GOLDHONIG. WIE IMMER. KEINER WEISS, WARUM.');


  /* ---------------------------------------------------------------
     LEVEL 16 — Das Spiel des Jahres. Fussball, zwei gegen zwei.
     Gespielt wird in fussball.js; hier steht nur der Platz.
     --------------------------------------------------------------- */

  var lvl16 = L({
    id: 16, name: 'DAS SPIEL DES JAHRES', sub: 'BOLZPLATZ, 11:00 UHR',
    theme: 'stadion', music: 'fussball', w: 32, h: 18, spawn: [8, 15], par: 150,
    goal: [31, 15], diff: 1.4, mode: 'fussball',
    intro: [
      ['', 'BOLZPLATZ HINTER DER SCHULE. 11:00 UHR.'],
      ['georgios', 'YUSUF! ESAT! KALIMERA!'],
      ['alexg', 'SERVUS. ICH BIN DER ANDERE ALEX.'],
      ['yusuf', 'DER ANDERE ALEX. SO STELLST DU DICH VOR?'],
      ['alexg', 'ES GIBT ZU VIELE ALEXE. ICH HAB MICH DAMIT ABGEFUNDEN.'],
      ['yusuf', 'WARUM HAST DU KRÜCKEN?'],
      ['alexg', 'BÄNDERRISS. ICH STEH TROTZDEM IM TOR.'],
      ['esat', 'IST DAS NICHT UNFAIR?'],
      ['alexg', 'FÜR EUCH? JA.'],
      ['georgios', 'WER ZUERST DREI TORE HAT. DER VERLIERER ZAHLT DAS ESSEN.'],
      ['yusuf', 'ICH ZAHLE NIE DAS ESSEN. DAS IST MEIN GANZER LEBENSPLAN.'],
      ['', 'LAUFEN = DRIBBELN. SHIFT / E ODER B = SCHUSS. IN DEN BALL SPRINGEN = KOPFBALL.'],
      ['', 'BAUCH-STAMPFER AUF DEN BALL = BAUCHSCHUSS. DEN HÄLT KEINER.']
    ],
    outro: [
      ['', 'ABPFIFF. YUSUF UND ESAT GEWINNEN.'],
      ['esat', 'YUSUF! DU KANNST JA FUSSBALL!'],
      ['yusuf', 'ICH KANN ALLES, WAS RUND IST.'],
      ['alexg', 'DAS WAR GEORGIOS SCHULD. ER LÄUFT WIE EIN KELLNER.'],
      ['georgios', 'ICH BIN KELLNER, ALEX.'],
      ['alexg', 'EBEN. MAN MERKT ES.'],
      ['georgios', 'UND DU HÄLTST WIE EIN KLEIDERSCHRANK. GROSS, ABER ALLES FÄLLT DURCH.'],
      ['georgios', 'DREI TORE. GEGEN EINEN, DER GESTERN VIERUNDZWANZIG STUNDEN GESCHLAFEN HAT.'],
      ['alexg', 'ICH HATTE DIE SONNE IM GESICHT.'],
      ['esat', 'ES IST BEWÖLKT.'],
      ['alexg', 'DANN HATTE ICH DIE WOLKEN IM GESICHT.'],
      ['', 'ALEX SAGT NICHTS MEHR. ER WIRD NUR GRÖSSER.'],
      ['yusuf', 'ESAT. IST DER GERADE GEWACHSEN?'],
      ['esat', 'DAS NENNT MAN RAGE-BAIT. BEIDE SIND DRAUF REINGEFALLEN.'],
      ['alexg', 'YUSUF. DU UND ICH. JETZT.'],
      ['yusuf', 'ICH BIN GANZ KLEIN. VON HIER UNTEN.'],
      ['alexg', 'EBEN.']
    ]
  });
  lvl16.g(0, 31, 15);

  /* ---------------------------------------------------------------
     LEVEL 17 — Der andere Alex. Ein Riese auf der Tribuene (bosse.js).
     Drei Etagen links und rechts, oben die Flutlichtmasten.
     --------------------------------------------------------------- */

  var lvl17 = L({
    id: 17, name: 'DER ANDERE ALEX', sub: 'VON UNTEN SIEHT JEDER GROSS AUS',
    theme: 'stadion', music: 'riese', w: 40, h: 22, spawn: [4, 20], par: 200,
    goal: [36, 20], diff: 1.5,
    intro: [
      ['', 'DIE TRIBÜNE. ALEX STEHT DAVOR. ALEX IST JETZT SO GROSS WIE DIE TRIBÜNE.'],
      ['esat', 'DAS PASSIERT BEI IHM, WENN MAN IHN RAGE-BAITET.'],
      ['yusuf', 'UND WIE KRIEGT MAN IHN WIEDER KLEIN?'],
      ['esat', 'MAN RAGE-BAITET IHN NICHT.'],
      ['yusuf', 'DAFÜR IST ES JETZT ZU SPÄT.']
    ],
    outro: []
  });
  lvl17.g(0, 39, 20).wall(0, 0, 19).wall(39, 0, 19);
  lvl17.p(1, 16, 9).p(1, 12, 7).p(1, 8, 6)          // Tribuene links
       .p(30, 16, 9).p(32, 12, 7).p(33, 8, 6)       // Tribuene rechts
       .p(12, 4, 5).p(23, 4, 5);                    // Flutlichtmasten
  lvl17.it('herz', 3, 15).it('doener', 36, 15).it('herz', 14, 3).it('kubide', 25, 3)
       .trail(3, 11, 4, 1).trail(34, 11, 4, 1);
  lvl17.bossAt(20, 20);
  lvl17.d.bossType = 'riese';
  lvl17.d.arena = { x: 0, w: 40 };

  /* ---------------------------------------------------------------
     LEVEL 18 — Das Rennen. Mustang gegen Audi, aus Yusufs Sicht
     (rennen.js). Hier steht nur, was drumherum gesagt wird.
     --------------------------------------------------------------- */

  var lvl18 = L({
    id: 18, name: 'MUSTANG GEGEN AUDI', sub: 'LANDSTRASSE, 22:30 UHR',
    theme: 'strasse', music: 'rennen', w: 32, h: 18, spawn: [4, 15], par: 150,
    goal: [30, 15], diff: 1.4, mode: 'rennen',
    intro: [
      ['', 'LANDSTRASSE RICHTUNG TANKSTELLE. 22:30 UHR.'],
      ['alexg', 'BIS ZUR TANKSTELLE. WER ZUERST DA IST.'],
      ['yusuf', 'UND DIE BLITZER?'],
      ['alexg', 'ICH BREMSE AN BLITZERN. ICH BIN NICHT BLÖD.'],
      ['yusuf', 'ICH BREMSE NIE. ICH BIN EIN MUSTANG.'],
      ['esat', 'DU BIST KEIN MUSTANG. DU FÄHRST EINEN.'],
      ['yusuf', 'DAS IST EINE FRAGE DER EINSTELLUNG.'],
      ['esat', 'ICH SITZ DANEBEN UND SAG NICHTS. VERSPROCHEN.'],
      ['', 'ESAT HAT DAS VERSPRECHEN NACH ZWÖLF SEKUNDEN GEBROCHEN.']
    ],
    outro: [
      ['', 'TANKSTELLE. YUSUF IST ERSTER.'],
      ['yusuf', 'HÖ HÖ HÖÖÖ! MUSTANG SCHLÄGT AUDI!'],
      ['alexg', 'ICH HAB AN DEN BLITZERN GEBREMST.'],
      ['esat', 'ER HAT AN DEN BLITZERN GEBREMST, YUSUF.'],
      ['yusuf', 'UND?'],
      ['', 'BLAULICHT. EIN STREIFENWAGEN HÄLT NEBEN DEM MUSTANG.'],
      ['polizist', 'GUTEN ABEND. SIE SIND GEBLITZT WORDEN. MEHRFACH.'],
      ['yusuf', 'ICH? ES WAR DUNKEL. DAS KÖNNTE JEDER GEWESEN SEIN.'],
      ['polizist', 'SIE LACHEN AUF JEDEM FOTO.'],
      ['esat', 'ER LACHT WIRKLICH AUF JEDEM FOTO.'],
      ['polizist', 'VERBOTENES KRAFTFAHRZEUGRENNEN. SIE KOMMEN MIT.'],
      ['yusuf', 'UND ALEX?'],
      ['polizist', 'DER HAT GEBREMST.'],
      ['alexg', 'ICH HAB GEBREMST.'],
      ['yusuf', 'ESAT! SAG WAS!'],
      ['esat', 'ICH NEHM DEN MUSTANG MIT. KEINE SORGE.'],
      ['yusuf', 'UM DEN MUSTANG HAB ICH MIR KEINE SORGEN GEMACHT.'],
      ['', 'YUSUF VERBRINGT DIE NACHT IM KNAST. ES GIBT KEINEN DÖNER.'],
      ['', 'ES GIBT NICHT MAL EINE SPEISEKARTE.']
    ]
  });
  lvl18.g(0, 31, 15);

  /* ---------------------------------------------------------------
     LEVEL 19 — Der Knast. Yusuf boxt sich raus (B / Shift / E), durch
     Zellentrakt, Waescherei, Kantine und Hof. In der Bibliothek wartet
     Nils. Gebaut aus dem Baukasten (abschnitte.js), die Bibliothek von Hand.
     --------------------------------------------------------------- */

  var lvl19 = L({
    id: 19, name: 'DER KNAST', sub: 'JVA, ZELLE 14, 23:50 UHR',
    theme: 'knast', music: 'knast', w: 820, h: 18, spawn: [3, 15], par: 400,
    diff: 1.45, punch: true,
    intro: [
      ['', 'JUSTIZVOLLZUGSANSTALT. 23:50 UHR.'],
      ['waerter', 'WILLKOMMEN. ZELLE 14. FRÜHSTÜCK UM SECHS.'],
      ['yusuf', 'UM SECHS? DAS IST FOLTER.'],
      ['waerter', 'DAS IST DIE HAUSORDNUNG.'],
      ['yusuf', 'EINE FRAGE. GIBT ES HIER DÖNER?'],
      ['waerter', 'NEIN.'],
      ['yusuf', 'DANN MUSS ICH HIER RAUS.'],
      ['waerter', 'DAS SAGEN ALLE.'],
      ['yusuf', 'ALLE HATTEN NICHT SO VIEL HUNGER WIE ICH.'],
      ['', 'YUSUF BRICHT AUS. NICHT AUS WUT. AUS HUNGER.'],
      ['', 'IM KNAST GIBT ES KEINE KIPPEN. SHIFT / E ODER B = BOXEN.']
    ],
    outro: []
  });
  lvl19.g(0, 11, 15);
  lvl19.sign(4, 15, 'ZELLE 14. BELEGT VON: YUSUF. GRUND: ZU SCHNELL, ZU GLÜCKLICH.');
  global.Abschnitte.zufuss(lvl19, 12, {
    boden: ['insasse', 'insasse', 'waerter'], flug: ['drohne'], zaeh: 'schlaeger',
    gefahr: 'strom', essen: 'doener', schilder: [
      'ZELLENTRAKT B. BITTE NICHT AUSBRECHEN. DANKE.',
      'WÄSCHEREI. HIER WIRD ALLES ORANGE.',
      'KANTINE. HEUTE: SALAT. ES GIBT EINEN AUFSTAND.',
      'HOFGANG: 30 MINUTEN. YUSUF: 30 SEKUNDEN.',
      'WER HAT HIER EINEN DÖNER REINGESCHMUGGELT? DANKE.',
      'BESUCHSZEIT: NIE. BESUCH: ESAT. TROTZDEM.',
      'BIBLIOTHEK GERADEAUS. PSST.'] }).folge([
        'flach', 'kisten', 'luecken', 'treppe', ['ebenen', { gold: true }], 'arena',
        'rast', 'tabletts', 'mauer', 'kisten', 'turm', 'flach', 'rast', 'luecken',
        ['turm', { gold: true }], 'arena', 'kisten', 'mauer', 'rast', 'ebenen',
        'tabletts', 'treppe', 'kisten', ['ebenen', { gold: true }], 'arena', 'rast',
        'flach'
  ]);
  lvl19.cp(40, 15);

  // Die Gefaengnisbibliothek: Nils' Arena. Regale zum Draufspringen,
  // oben haengt seine Tafel.
  var BIB = 12 + 752;
  lvl19.g(BIB, BIB + 35, 15).wall(BIB + 35, 2, 14, 1);
  lvl19.p(BIB + 5, 11, 5).p(BIB + 15, 12, 6).p(BIB + 27, 11, 5);
  lvl19.it('herz', BIB + 7, 9).it('doener', BIB + 29, 9).it('herz', BIB + 18, 10);
  lvl19.sign(BIB - 4, 15, 'BIBLIOTHEK. RUHE BITTE. NILS DENKT.');
  lvl19.bossAt(BIB + 26, 15);
  lvl19.d.bossType = 'nils';
  lvl19.d.arena = { x: BIB, w: 35 };
  lvl19.d.w = BIB + 36;
  lvl19.d.goal = [BIB + 30, 15];

  /* ---------------------------------------------------------------
     LEVEL 20 — Doener. Selbst gemacht. Yusuf belegt seinen eigenen
     Doener (doener.js). Danach: Airsoft. Irgendwann.
     --------------------------------------------------------------- */

  var lvl20 = L({
    id: 20, name: 'DÖNER. SELBST GEMACHT.', sub: 'DÖNERLADEN AN DER ECKE, 10:40 UHR',
    theme: 'imbiss', music: 'doener', w: 32, h: 18, spawn: [4, 15], par: 200,
    goal: [30, 15], diff: 1, mode: 'doener',
    intro: [
      ['', 'DÖNERLADEN AN DER ECKE. 10:40 UHR.'],
      ['', 'HINTER DER THEKE: YUSUFS PERSÖNLICHER DÖNERMANN.'],
      ['', 'DER, DER IMMER ZURÜCKRUFT.'],
      ['yusuf', 'ICH HAB EIGENTLICH GAR KEINEN HUNGER.'],
      ['', 'DER DÖNERMANN SCHWEIGT. ER KENNT DAS.'],
      ['yusuf', 'ABER HEUTE MACH ICH IHN MIR SELBST.'],
      ['', 'DER DÖNERMANN TRITT ZUR SEITE. EHRFÜRCHTIG.'],
      ['', 'ZIEL: 10.000 KALORIEN. SOSSE WEICHT DAS BROT AUF. ZU VOLL = ES REISST.']
    ],
    outro: []
  });
  lvl20.g(0, 31, 15);
  lvl20.d.doener = { ziel: 10000 };
  lvl20.d.fertig = [
    ['', 'ZEHNTAUSEND KALORIEN. DER DÖNERMANN KLATSCHT. LANGSAM.'],
    ['yusuf', 'HÖ HÖ HÖÖÖ.'],
    ['', 'DAS HANDY KLINGELT. ZUM ZWÖLFTEN MAL.'],
    ['esat', 'YUSUF. WO BIST DU.'],
    ['yusuf', 'UNTERWEGS.'],
    ['esat', 'DU KAUST.'],
    ['yusuf', 'ICH KAUE UNTERWEGS.'],
    ['lennart', 'WIR WARTEN SEIT EINER STUNDE, BRO! MIT TARNFARBE!'],
    ['yusuf', 'ICH KOMME. LANGSAM. ABER ICH KOMME.'],
    ['', 'YUSUF STEHT AUF. ER HAT TATSÄCHLICH KEINEN HUNGER MEHR.'],
    ['', 'DAS IST NOCH NIE PASSIERT. MERKT EUCH DIESEN TAG.'],
    ['', 'FORTSETZUNG FOLGT: AIRSOFT.']
  ];

  /* ---------------------------------------------------------------
     Dialoge für den Bosskampf & das Ende
     --------------------------------------------------------------- */

  var BOSS_DIALOG = {
    start: [
      ['huseyin', 'DA BIST DU. ICH HAB HEUTE SCHON DREIMAL TRAINIERT.'],
      ['yusuf', 'ICH HAB DREIMAL GEFRÜHSTÜCKT. WIR SIND QUITT.'],
      ['huseyin', 'ICH TRAINIERE SECHSMAL DIE WOCHE!'],
      ['yusuf', 'ICH SCHLAFE SIEBENMAL DIE WOCHE. ICH FÜHRE.'],
      ['huseyin', 'DAS IST KEIN WETTBEWERB!'],
      ['yusuf', 'DANN HÖR AUF ZU ZÄHLEN, BRUDER.'],
      ['huseyin', 'ICH ZÄHLE NICHT. MEINE UHR ZÄHLT.'],
      ['yusuf', 'DANN GIB MIR DIE UHR. ICH SETZ MICH DRAUF.']
    ],
    phase2: [
      ['huseyin', 'DAS WAR NUR DAS AUFWÄRMEN!'],
      ['yusuf', 'DAS SAGST DU JEDES MAL. DEIN GANZES LEBEN IST AUFWÄRMEN.'],
      ['huseyin', 'ICH HAB HEUTE DREI SCHÜSSELN SALAT GEGESSEN.'],
      ['huseyin', 'OHNE DRESSING.'],
      ['yusuf', 'ER DREHT DURCH. DAS PASSIERT, WENN MAN NUR GRÜNZEUG ISST.']
    ],
    phase3: [
      ['huseyin', 'ICH HABE EINEN PERSONAL TRAINER!'],
      ['yusuf', 'ICH HABE EINEN PERSONAL DÖNERMANN.'],
      ['huseyin', 'DAS IST NICHT DAS GLEICHE!'],
      ['yusuf', 'DOCH. MEINER RUFT ZURÜCK. UND ER BRINGT SOSSE MIT.']
    ],
    end: [
      ['huseyin', 'OKAY. OKAY! ICH GEBE AUF.'],
      ['huseyin', 'DU HAST GEWONNEN, YUSUF.'],
      ['yusuf', 'HÖ HÖ HÖÖÖ.'],
      ['huseyin', '...HAST DU NOCH VON DEM HONIG?'],
      ['yusuf', 'ICH HABE IMMER NOCH HONIG.'],
      ['yusuf', 'ICH HABE IMMER HONIG. DAS IST KEIN VORRAT. DAS IST EINE HALTUNG.'],
      ['huseyin', 'DANN LASS UNS ESSEN.'],
      ['yusuf', 'NICHT HIER. HIER RIECHT ALLES NACH SALAT UND EHRGEIZ.'],
      ['yusuf', 'ICH HOL DEN MUSTANG.'],
      ['huseyin', 'DU HAST EINEN MUSTANG?'],
      ['yusuf', 'ICH HAB VIELE GEHEIMNISSE. DIE MEISTEN SIND ESSEN. EINS IST EIN MUSTANG.']
    ]
  };

  /* Siegerehrung im Stilbruch — und wie sie eskaliert. */
  var STILBRUCH_DIALOG = [
    ['', 'SHISHA-BAR STILBRUCH. 2:14 UHR.'],
    ['esat', 'DA SEID IHR JA ENDLICH.'],
    ['esat', 'ICH SITZ HIER SEIT HALB ZWÖLF. DER KELLNER KENNT JETZT MEINE KINDHEIT.'],
    ['yusuf', 'ICH MUSSTE KURZ MEINEN BRUDER BESIEGEN.'],
    ['esat', 'WIEDER?'],
    ['huseyin', 'ES WAR KNAPP.'],
    ['yusuf', 'ES WAR NICHT KNAPP.'],
    ['huseyin', 'ES WAR EMOTIONAL KNAPP.'],
    ['esat', 'OKAY YUSUF. DU HAST ES GESCHAFFT. ICH HAB DIR WAS BESTELLT.'],
    ['esat', 'TEXAS BARBECUE BRISKET. NUR 200 KALORIEN AUF 100 GRAMM.'],
    ['esat', 'UND GANZE 40 GRAMM EIWEISS.'],
    ['yusuf', 'DU HAST DAS NACHGESCHAUT.'],
    ['esat', 'ICH SCHAU IMMER NACH. ICH HAB EINE APP. DIE APP HAT ANGST VOR DIR.'],
    ['yusuf', 'ICH HAB EIGENTLICH GAR KEINEN HUNGER.'],
    ['huseyin', '...'],
    ['esat', '...'],
    ['yusuf', 'ABER ICH ESS DAS JETZT KOMPLETT.'],
    ['', 'YUSUF ISST DAS BRISKET. KOMPLETT.'],
    ['', 'ES DAUERT VIER MINUTEN. NIEMAND SPRICHT. DER KELLNER WEINT LEISE.'],
    ['esat', 'UND JETZT RAUCH AN DER PFEIFE.'],
    ['', 'YUSUF RAUCHT AN DER PFEIFE.'],
    ['yusuf', 'HÖ HÖ HÖÖÖ. DAS WAR EIN GUTER TAG.'],
    ['huseyin', 'MUSS ICH ZUGEBEN. WAR EIN GUTER TAG.'],
    ['esat', 'JA GUT, DU FETTSACK.'],
    ['esat', 'GEH JETZT ABER TROTZDEM INS GYM.'],
    ['', '...'],
    ['', 'DIE MUSIK HÖRT AUF. IRGENDWO FÄLLT EIN LÖFFEL.'],
    ['huseyin', 'ESAT.'],
    ['huseyin', 'ESAT, NEIN.'],
    ['yusuf', 'WAS HAST DU GESAGT.'],
    ['esat', 'WAS? ICH MEIN ES NUR GUT. DAS WAR LIEBEVOLL.'],
    ['yusuf', 'ICH HAB HEUTE MEINEN BRUDER BESIEGT.'],
    ['yusuf', 'ICH HAB EINEN KOCH IM SAFRANRAUSCH BERUHIGT.'],
    ['yusuf', 'ICH HAB MIRKANS FRAGEN ÜBERLEBT. ALLE.'],
    ['yusuf', 'ICH BIN MIT EINEM MUSTANG HIERHER GEFAHREN. ZUM ERSTEN MAL SEIT DREI JAHREN.'],
    ['yusuf', 'UND DU SAGST GYM.'],
    ['esat', 'ICH HAB AUCH FETTSACK GESAGT.'],
    ['yusuf', 'DAS WAR MIR EGAL. DAS MIT DEM GYM NICHT.'],
    ['esat', 'ICH... OKAY. VIELLEICHT WAR DAS ZU VIEL.'],
    ['yusuf', 'KRRRRRRR.'],
    ['huseyin', 'ER KNURRT. ESAT, LAUF.'],
    ['esat', 'ICH BIN DOCH DEIN BESTER KOLLEGE!'],
    ['yusuf', 'DANN WEISST DU JA, WIE SCHNELL ICH BIN.'],
    ['esat', 'DU BIST GAR NICHT SCHNELL!'],
    ['yusuf', 'BERGAB SCHON.'],
    ['esat', 'HIER IST ES FLACH!'],
    ['yusuf', 'NOCH.'],
    ['', 'YUSUF BALCI IST WACH. WIRKLICH WACH.'],
    ['', 'DAS PASSIERT ZWEIMAL IM JAHR. BEIDE MALE GING ES UM ESSEN.'],
    ['', 'LETZTER KAMPF. FÜR HEUTE.']
  ];

  /* Esat verwandelt sich, ruft Jets und gibt auf. */
  var ESAT_DIALOG = {
    phase2: [
      ['esat', 'MOMENT. MOMENT!'],
      ['esat', 'ICH BRAUCH KURZ WAS.'],
      ['yusuf', 'ER NIMMT SNUS. MITTEN IM KAMPF. WIE EIN PROFI.'],
      ['esat', 'EIN SNUS UND ICH BIN EIN ANDERER MENSCH.'],
      ['huseyin', 'DAS IST NIKOTIN, KEIN PROTEIN!'],
      ['esat', 'BEI MIR IST DAS BEIDES. ICH HAB DAS GEGOOGELT. FALSCH, ABER GEGOOGELT.'],
      ['yusuf', 'WARUM IST ER JETZT DOPPELT SO BREIT?'],
      ['esat', 'DISZIPLIN, YUSUF. UND SNUS. HAUPTSÄCHLICH SNUS.']
    ],
    phase3: [
      ['esat', 'OKAY, JETZT WIRD ES UNGEMÜTLICH.'],
      ['yusuf', 'DU HAST JETS GERUFEN.'],
      ['esat', 'ICH KENN DA JEMANDEN.'],
      ['yusuf', 'DU KENNST NIEMANDEN, DER JETS HAT.'],
      ['esat', 'ICH KENNE JEMANDEN, DER JEMANDEN KENNT, DER MAL IN EINEM SASS.'],
      ['huseyin', 'DAS WAR EIN FLUG NACH ANTALYA, ESAT.']
    ],
    end: [
      ['esat', 'OKAY! OKAY! TUT MIR LEID!'],
      ['esat', 'DU MUSST NICHT INS GYM.'],
      ['yusuf', 'DANKE.'],
      ['esat', 'ABER VIELLEICHT EINMAL DIE WOCHE—'],
      ['yusuf', 'KRRRR.'],
      ['esat', 'NICHTS. ICH HAB NICHTS GESAGT. ICH HAB NUR GEATMET.'],
      ['huseyin', 'ICH GEH ÜBRIGENS MORGEN UM SECHS LAUFEN.'],
      ['yusuf', '...'],
      ['esat', '...'],
      ['huseyin', 'WAS DENN.'],
      ['', 'SIE BLIEBEN BIS VIER UHR MORGENS.'],
      ['', 'ESAT ZAHLTE. FREIWILLIG. SAGT ER.'],
      ['', 'YUSUF ZOCKTE DANACH NOCH BIS SIEBEN.'],
      ['', 'ER SCHLIEF MIT DEM CONTROLLER IN DER HAND EIN. UND MIT EINEM LÄCHELN.'],
      ['', 'ENDE. DACHTE ER.']
    ]
  };

  /* ALEX — Kollege, Endgegner in der Getraenkeabteilung.
     Streitthema: Yusuf hat kein einziges Spiel auf Platin. */
  var ALEX_DIALOG = {
    start: [
      ['alex', 'YUSUF? WAS MACHST DU HIER?'],
      ['yusuf', 'ALEX. ICH KAUFE EIN.'],
      ['alex', 'DU HAST VIER EINKAUFSWAGEN.'],
      ['yusuf', 'DREI. DER VIERTE IST MIR GEFOLGT. ER HAT SICH FÜR MICH ENTSCHIEDEN.'],
      ['alex', 'EGAL. SAG MAL...'],
      ['alex', 'WIE VIELE SPIELE HAST DU AUF PLATIN?'],
      ['yusuf', 'WAS?'],
      ['alex', 'PLATIN. TROPHÄEN. WIE VIELE.'],
      ['yusuf', 'KEINE.'],
      ['alex', 'KEINE?!'],
      ['yusuf', 'ICH SPIELE ZUM SPASS.'],
      ['alex', 'ZUM SPASS! DER MANN SPIELT ZUM SPASS! HAT DAS JEMAND GEHÖRT?'],
      ['', 'NIEMAND HAT ES GEHÖRT. ES IST NIEMAND DA.'],
      ['yusuf', 'UND DU STEHST UM ZWEI IN DER GETRÄNKEABTEILUNG.'],
      ['alex', '...'],
      ['yusuf', 'WIE VIELE WAREN DAS DIESE WOCHE, ALEX?'],
      ['alex', 'DAS-DAS-DAS IST WAS GANZ ANDERES!'],
      ['alex', 'ICHSAGDIRWARUMDASANDERSIST WEIL PLATIN DISZIPLIN IST'],
      ['alex', 'UND DISZIPLIN HAST DU NICHT UND ICH HAB SIEBENUNDVIERZIG'],
      ['', 'ALEX REDET JETZT DOPPELT SO SCHNELL. UND HALB SO VERSTÄNDLICH.'],
      ['yusuf', 'OKAY. DANN ZEIG MIR MAL DISZIPLIN.']
    ],
    phase2: [
      ['alex', 'WEISST DU WAS? TRINK MIT.'],
      ['', 'ALEX SCHÜTTET YUSUF DIE FLASCHE ÜBER DEN KOPF.'],
      ['yusuf', 'DAS WAR MEIN HEMD.'],
      ['alex', 'DAS WAR MEIN WODKA!'],
      ['yusuf', 'DANN HABEN WIR BEIDE HEUTE WAS VERLOREN.'],
      ['', 'DIE REGALE FANGEN AN ZU SCHWANKEN. ODER YUSUF. SCHWER ZU SAGEN.'],
      ['yusuf', 'WARUM SIND DA JETZT ZWEI ALEX.'],
      ['alex', 'WEIL ICH JETZT ULTRAPENNER BIN! DAS IST AUCH EINE TROPHÄE!']
    ],
    phase3: [
      ['alex', 'ICH HAB SIEBENUNDVIERZIG PLATIN!'],
      ['yusuf', 'DU HAST SIEBENUNDVIERZIG FLASCHEN.'],
      ['alex', 'DAS IST DASSELBE IN BLAU!'],
      ['yusuf', 'DIE FLASCHEN SIND GRÜN, ALEX.']
    ],
    end: [
      ['alex', 'OKAY. OKAY! ICH HÖR AUF.'],
      ['yusuf', 'GUT.'],
      ['', 'YUSUF WIRD WIEDER NÜCHTERN. LEIDER AUCH WIEDER HUNGRIG.'],
      ['alex', 'ICH MUSS SOWIESO GLEICH AN DIE KASSE.'],
      ['yusuf', 'DU ARBEITEST HIER?'],
      ['alex', 'SCHICHT SEIT ZWEI. DAS HIER WAR MEINE PAUSE.'],
      ['yusuf', 'DEINE PAUSE WAR EIN BOSSKAMPF.'],
      ['alex', 'JEDE PAUSE IST EIN BOSSKAMPF. KOMM, ICH KASSIER DICH AB.']
    ],
    // An der Kasse. Yusuf laedt auf, Alex zieht durch.
    kasse: [
      ['', 'YUSUF LEGT AUF. UND LEGT AUF. UND LEGT AUF.'],
      ['', 'DAS BAND LÄUFT HEISS.'],
      ['alex', 'DAS SIND VIERUNDSIEBZIG TIEFKÜHLPIZZEN.'],
      ['yusuf', 'DIE WAREN IM ANGEBOT.'],
      ['alex', 'DAS WAREN SIE NICHT.'],
      ['yusuf', 'FÜR MICH SCHON. ICH HAB MIR SELBST EIN ANGEBOT GEMACHT.'],
      ['alex', 'HAST DU EINE KUNDENKARTE?'],
      ['yusuf', 'ICH HABE EINE SEELE.'],
      ['alex', 'DAFÜR GIBT ES KEINE PUNKTE.'],
      ['alex', 'WILLST DU TÜTEN ODER TRÄGST DU DAS SO?'],
      ['yusuf', 'ICH NEHM SECHS TÜTEN.'],
      ['alex', 'DAS SIND ZEHN CENT PRO TÜTE.'],
      ['yusuf', 'DANN NEHM ICH VIER. DEN REST TRAG ICH IM HERZEN.'],
      ['', 'SUMME: 205,40 EURO.'],
      ['yusuf', 'KANN ICH IN RATEN ZAHLEN?'],
      ['alex', 'NEIN.'],
      ['yusuf', 'KANN ICH IN KALORIEN ZAHLEN?'],
      ['alex', 'NEIN!'],
      ['yusuf', 'IN PLATIN-TROPHÄEN?'],
      ['alex', '...WIE VIELE HAST DU DENN?'],
      ['yusuf', 'KEINE.'],
      ['alex', 'DANN NEIN.'],
      ['', 'YUSUF ZAHLT. IN MÜNZEN. DIE SCHLANGE HINTER IHM GRÜNDET EINE WHATSAPP-GRUPPE.'],
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
      ['yusuf', 'ICH MACH MIR ERSTMAL WAS ZU ESSEN. DAS IST MEINE PLATIN-TROPHÄE.']
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
    'HAST DU NICHT!',
    'AUF SCHWER!',
    'OHNE LÖSUNGSBUCH!'
  ];

  /* BROKE — Kollege, wartet vor Yusufs Haus. Kein Streit, nur ein Test.
     (Was vor dem Kampf gesagt wird, steht im Intro von Level 11.) */
  var BROKE_DIALOG = {
    phase2: [
      ['broke', 'OKAY. DU BIST BESSER ALS GEDACHT.'],
      ['yusuf', 'WAS HAST DU DENN GEDACHT?'],
      ['broke', 'ICH HAB MIT NICHTS GERECHNET. DAS HAST DU KNAPP ÜBERTROFFEN.'],
      ['broke', 'ZEIT FÜR DIE GANZE MIKA-ARMEE.'],
      ['yusuf', 'WIE VIELE MIKAS GIBT ES DENN?'],
      ['broke', 'WEISS KEINER. NICHT MAL MIKA.'],
      ['mika', 'HALLO.']
    ],
    phase3: [
      ['broke', 'NOCH SCHNELLER! MIKAS, VOLLGAS!'],
      ['yusuf', 'ICH HAB SEIT DER KASSE NICHTS GEGESSEN.'],
      ['broke', 'DAS WAR VOR ZWANZIG MINUTEN.'],
      ['yusuf', 'EBEN.']
    ],
    end: [
      ['broke', 'OKAY! OKAY! TEST BESTANDEN!'],
      ['yusuf', 'WAS WAR DAS ÜBERHAUPT FÜR EIN TEST?'],
      ['broke', 'OB DU NACH SECHS TÜTEN NOCH KÄMPFEN KANNST.'],
      ['yusuf', 'VIER TÜTEN. ZWEI TRAG ICH IM HERZEN.'],
      ['broke', 'KANNST DU JEDENFALLS. RESPEKT, BRUDER.'],
      ['mika', 'RESPEKT.'],
      ['mika', 'RESPEKT.'],
      ['mika', 'WER IST DAS EIGENTLICH?'],
      ['broke', 'KOMMT, JUNGS. WIR GEHEN.'],
      ['', 'BROKE GEHT. DIE MIKAS AUCH. ALLE.'],
      ['', 'DAS DAUERT EIN BISSCHEN.'],
      ['', 'EIN BISSCHEN LÄNGER.'],
      ['yusuf', 'ICH GEH JETZT SCHLAFEN.'],
      ['mika', 'ES IST VIER UHR NACHMITTAGS.'],
      ['yusuf', 'EBEN. ICH BIN SPÄT DRAN.'],
      ['yusuf', 'NACH DEM ESSEN. NACH DEM ZWEITEN ESSEN. OKAY, NACH DEM DRITTEN.'],
      ['', 'SONNTAG, 16:40 UHR. YUSUF LEGT SICH HIN. NUR KURZ.']
    ]
  };

  /* Was die Mikas so sagen. Viel ist es nicht. */
  var MIKA_LINES = [
    'MIKA!', 'HALLO.', 'ICH BIN MIKA.', 'ICH BIN AUCH MIKA.',
    'WIR SIND ALLE MIKA.', 'NOCH EIN MIKA.', 'MIKA IST DA.', 'SERVUS.',
    'ICH BIN DER ECHTE MIKA.', 'NEIN, ICH.'
  ];

  /* Einen ganzen Tag spaeter: Esat ruft an. Schon wieder. */
  var SCHLAF_DIALOG = [
    ['', 'DIENSTAG. 7:30 UHR. DEN MONTAG HAT YUSUF KOMPLETT VERSCHLAFEN.'],
    ['esat', 'YUSUF! BIST DU WACH?'],
    ['yusuf', 'NEIN.'],
    ['esat', 'DU REDEST DOCH.'],
    ['yusuf', 'IM SCHLAF. DAS IST EIN TALENT.'],
    ['esat', 'ICH HAB DICH GESTERN ZWÖLFMAL ANGERUFEN.'],
    ['yusuf', 'GESTERN WAR SONNTAG.'],
    ['esat', 'GESTERN WAR MONTAG. HEUTE IST DIENSTAG.'],
    ['yusuf', 'ICH HAB NUR KURZ DIE AUGEN ZUGEMACHT.'],
    ['esat', 'VIERZIG STUNDEN LANG.'],
    ['yusuf', 'DANN HAB ICH DEN MONTAG ÜBERSPRUNGEN. DAS WOLLTE ICH SCHON IMMER MAL.'],
    ['esat', 'ZIEH DICH AN. WIR FAHREN DOWNHILL.'],
    ['yusuf', 'DOWNHILL?'],
    ['esat', 'MIT DEM FAHRRAD. DEN BERG RUNTER.'],
    ['yusuf', 'BERGAB?'],
    ['esat', 'NUR BERGAB.'],
    ['yusuf', 'BERGAB KANN ICH. DAS MACHT DIE SCHWERKRAFT. ICH BIN NUR DABEI.'],
    ['', 'YUSUF STEHT AUF. FREIWILLIG. DIE NACHBARN RUFEN SICH GEGENSEITIG AN.']
  ];

  /* Esat faehrt mit und hat zu allem eine Meinung. */
  var ESAT_RIDE_LINES = [
    'SCHNELLER, YUSUF!', 'BREMSEN IST FÜR LEUTE MIT ANGST.',
    'RAMPE! SALTO! JETZT!', 'DAS IST MEIN HAUSBERG.',
    'NICHT NACH UNTEN SCHAUEN.', 'LOCKER IN DEN KNIEN.',
    'ICH HAB HIER MAL EIN REH ÜBERHOLT.', 'DU FÄHRST WIE DU ISST. VIEL.',
    'NICHT DIE BIENEN ANSCHAUEN. DIE MERKEN SICH DAS.', 'WENN DU FÄLLST: SCHÖN FALLEN.'
  ];
  var ESAT_FLIP_LINES = [
    'SAUBER!', 'OKAY, RESPEKT.', 'NOCH EINEN!', 'WER HAT DIR DAS BEIGEBRACHT?',
    'DAS WAR KEIN SALTO. DAS WAR KUNST.', 'ICH HAB NICHT HINGESCHAUT. NOCHMAL.'
  ];

  /* HAMZA — libanesischer Freund. Streitpunkt: sein Hummus. */
  var HAMZA_DIALOG = {
    start: [
      ['hamza', 'YUSUF! HABIBI! DA BIST DU JA!'],
      ['yusuf', 'HAMZA. EIN SHAWARMA. BITTE.'],
      ['hamza', 'EINS? DU WILLST EINS?'],
      ['yusuf', 'FÜR DEN ANFANG. ZUM ANWÄRMEN.'],
      ['hamza', 'WEISST DU NOCH, WAS DU LETZTES MAL GESAGT HAST?'],
      ['yusuf', 'NEIN. ICH HATTE DEN MUND VOLL.'],
      ['hamza', 'DU HAST GESAGT, MEIN HUMMUS IST ZU FLÜSSIG.'],
      ['yusuf', 'ER WAR ZU FLÜSSIG. ICH HAB IHN MIT STROHHALM GEGESSEN.'],
      ['hamza', '...'],
      ['hamza', 'YALLA. DANN PROBIER IHN JETZT. AUS NÄCHSTER NÄHE.']
    ],
    phase2: [
      ['', 'HALBZEIT. HAMZA TRINKT EINEN AYRAN. IN EINEM ZUG.'],
      ['hamza', 'ZWEITE HALBZEIT, HABIBI. JETZT SPIEL ICH VON OBEN.'],
      ['yusuf', 'DU STEHST AUF DER EMPORE.'],
      ['hamza', 'DAS IST DIE VIP-LOGE. DA SITZT SONST MEINE MUTTER.'],
      ['yusuf', 'UND WO IST SIE JETZT?'],
      ['hamza', 'IN DER KÜCHE. SIE MACHT DEN ECHTEN HUMMUS.'],
      ['hamza', 'ICH HAB STRASSENFUSSBALL GESPIELT, YUSUF.'],
      ['yusuf', 'DU HAST AUF DEM SCHULHOF GESPIELT.'],
      ['hamza', 'DAS IST AUCH EINE STRASSE! NUR MIT HAUSMEISTER!']
    ],
    phase3: [
      ['hamza', 'NOCH NIE HAT JEMAND SO LANGE GEGEN MEINEN HUMMUS GEKÄMPFT.'],
      ['yusuf', 'ICH HAB HUNGER. DAS IST MEIN ANTRIEB. MEIN EINZIGER.']
    ],
    end: [
      ['hamza', 'OKAY! OKAY! DU HAST GEWONNEN!'],
      ['hamza', 'UND? DER HUMMUS?'],
      ['yusuf', 'IMMER NOCH ZU FLÜSSIG. JETZT AUCH IM GESICHT.'],
      ['hamza', 'SETZ DICH. ICH MACH DIR EIN SHAWARMA. AUFS HAUS.']
    ],
    // Am Tisch: Hamza bringt Shawarma, und dann kommt Esat
    essen: [
      ['', 'HAMZA BRINGT SHAWARMA. MIT EXTRA KNOBLAUCHSOSSE.'],
      ['yusuf', 'ICH HAB EIGENTLICH GAR KEINEN HUNGER.'],
      ['hamza', '...'],
      ['yusuf', 'MACH DREI.'],
      ['', 'DIE TÜR GEHT AUF. ESAT KOMMT REIN.'],
      ['esat', 'ICH WUSSTE, DASS DU HIER BIST. ICH BIN EINFACH DEM KNOBLAUCH NACHGEGANGEN.'],
      ['hamza', 'ESAT! HABIBI! AUCH EINS?'],
      ['esat', 'NUR EINS. ICH BIN IM DEFIZIT.'],
      ['', 'ESAT ISST EIN SHAWARMA. DANN NOCH EINS.'],
      ['esat', 'DAS ZWEITE ZÄHLT NICHT. DAS WAR IM STEHEN.'],
      ['yusuf', 'SO FUNKTIONIERT DAS NICHT.'],
      ['esat', 'SAGT DER RICHTIGE.'],
      ['esat', 'SO. JETZT STILBRUCH. EINE SHISHA ZUM VERDAUEN.'],
      ['yusuf', 'GANZ ENTSPANNT.'],
      ['hamza', 'UND KEINEN STRESS MACHEN, IHR ZWEI!'],
      ['yusuf', 'WANN HAB ICH JE STRESS GEMACHT?'],
      ['hamza', '...'],
      ['esat', '...'],
      ['yusuf', 'DAS WAR RHETORISCH.']
    ]
  };

  /* Stilbruch: der reservierte Tisch, endlich. Und dann die Shisha. */
  var SHISHA_DIALOG = {
    vorher: [
      ['', 'DIE TYPEN SETZEN SICH WIEDER HIN. ALS WÄRE NICHTS GEWESEN.'],
      ['', 'EINER WINKT. ER HAT NOCH EINE ZANGE IN DER HAND.'],
      ['esat', 'SO. JETZT ABER WIRKLICH: EINE SHISHA.'],
      ['', 'DER KELLNER BRINGT ZWEI PFEIFEN. ER SCHAUT YUSUF NICHT IN DIE AUGEN.'],
      ['esat', 'FÜR MICH TRAUBE-MINZE.'],
      ['yusuf', 'DOPPELAPFEL. WIE IMMER.'],
      ['esat', 'DU NIMMST SEIT ZEHN JAHREN DOPPELAPFEL.'],
      ['yusuf', 'NEVER CHANGE A WINNING TEAM.'],
      ['esat', 'DU HAST NOCH NIE WAS GEWONNEN.'],
      ['yusuf', 'DER APFEL SCHON. ZWEIMAL. DESHALB DOPPEL.'],
      ['', 'ZIEHEN GEHT VON ALLEIN. WENN JETZT! BLINKT: C, B ODER TIPPEN = AUSPUSTEN. ACHT ZÜGE.']
    ],
    nachher: [
      ['yusuf', 'HÖ HÖ HÖÖÖ.'],
      ['esat', 'UND? ENTSPANNT?'],
      ['yusuf', 'ICH HAB HUNGER.'],
      ['esat', 'DU HAST VOR ACHT STUNDEN VIER SHAWARMA GEGESSEN.'],
      ['yusuf', 'EBEN. VOR ACHT STUNDEN. DAS IST PRAKTISCH EIN FASTENTAG.'],
      ['esat', 'LASS ZU GEORGIOS.'],
      ['yusuf', 'GEORGIOS. JA. OKAY. LASS ZUM GRIECHEN.'],
      ['esat', 'DIE KÜCHE MACHT UM ELF ZU.'],
      ['yusuf', 'DANN RENNEN WIR.'],
      ['esat', 'DU RENNST NICHT.'],
      ['yusuf', 'FÜR GYROS SCHON.']
    ]
  };

  /* GEORGIOS — griechischer Freund. Schnell. Und oben ohne ziemlich breit. */
  var GEORGIOS_DIALOG = {
    start: [
      ['georgios', 'YUSUF! ESAT! KALISPERA!'],
      ['yusuf', 'GEORGIOS. WIR HABEN HUNGER.'],
      ['esat', 'ER HAT HUNGER. ICH BIN NUR DABEI. ALS ZEUGE.'],
      ['georgios', 'DIE KÜCHE MACHT GLEICH ZU.'],
      ['yusuf', 'ICH HAB HEUTE EINEN BERG BEZWUNGEN.'],
      ['yusuf', 'UND HAMZA. UND DIE HALBE SHISHA-BAR.'],
      ['georgios', 'DANN BEZWING MICH AUCH. DANN GIBT ES SOUVLAKI.'],
      ['georgios', 'ICH BIN SCHNELL, YUSUF. SEHR SCHNELL.'],
      ['yusuf', 'DAS HAT BROKE AM SONNTAG AUCH GESAGT.'],
      ['georgios', 'UND? WAR ER SCHNELL?'],
      ['yusuf', 'JA. ABER ER HATTE KEINE TELLER DABEI.']
    ],
    phase2: [
      ['georgios', 'OKAY. JETZT WIRD ES ERNST.'],
      ['', 'GEORGIOS HOLT EINEN HELM AUS DEM WEINKELLER. UND EINEN SCHILD. UND EINEN SPEER.'],
      ['yusuf', 'WARUM HAST DU DAS IM WEINKELLER?'],
      ['georgios', 'FÜR NOTFÄLLE.'],
      ['esat', 'WAS FÜR EIN NOTFALL BRAUCHT EINEN SPEER?'],
      ['georgios', 'DIESER.'],
      ['georgios', 'DAS IST SPARTA!'],
      ['yusuf', 'DAS IST EINE TAVERNE. MIT KARIERTEN TISCHDECKEN.']
    ],
    phase3: [
      ['', 'AUS DER KÜCHE KOMMT EINE STIMME. SIE IST 91 JAHRE ALT.'],
      ['', 'OMA: GEORGIOS! MACH ENDLICH! DAS ESSEN WIRD KALT!'],
      ['georgios', 'JA, OMA!'],
      ['esat', 'DIE OMA WIRFT MIT TZATZIKI.'],
      ['yusuf', 'DAS IST DIE BESTE OMA DER WELT.'],
      ['georgios', 'DAS IST MEINE OMA!'],
      ['yusuf', 'ICH WEISS. ICH HAB SIE SCHON ADOPTIERT.']
    ],
    end: [
      ['georgios', 'OKAY! OKAY! DU HAST GEWONNEN!'],
      ['georgios', 'SETZ DICH. DIE KÜCHE MACHT NOCHMAL AUF.'],
      ['yusuf', 'NUR FÜR MICH?'],
      ['georgios', 'NUR FÜR DICH, FILE.'],
      ['esat', 'UND FÜR MICH?'],
      ['georgios', 'DU HAST DOCH GESAGT, DU BIST NUR ALS ZEUGE DA.']
    ],
    essen: [
      ['', 'EIN TELLER SOUVLAKI. DAZU EIN BERG TZATZIKI.'],
      ['georgios', 'DAS TZATZIKI IST VON MEINER OMA. SIE IST 91. SIE MACHT DAS SEIT 80 JAHREN.'],
      ['yusuf', 'ICH HAB EIGENTLICH GAR KEINEN HUNGER.'],
      ['esat', '...'],
      ['georgios', '...'],
      ['yusuf', 'ABER ICH ESS DAS JETZT KOMPLETT.'],
      ['', 'YUSUF ISST ALLES AUF. DEN TELLER FAST AUCH.'],
      ['esat', 'IN DREI TAGEN: 10.000 KALORIEN, 74 PIZZEN, VIER SHAWARMA, EINE SHISHA, SOUVLAKI.'],
      ['yusuf', 'UND EIN FASTENTAG. DEN MONTAG HAB ICH DURCHGESCHLAFEN.'],
      ['esat', 'SCHLAFEN IST KEIN FASTEN.'],
      ['yusuf', 'VIERUNDZWANZIG STUNDEN NICHTS GEGESSEN. DAS IST FASTEN. FRAG MEINEN MAGEN.'],
      ['yusuf', 'ICH GEH JETZT PENNEN.'],
      ['esat', 'MORGEN GYM?'],
      ['yusuf', 'KRRRRR.'],
      ['esat', 'ICH NEHM DAS ALS VIELLEICHT.']
    ]
  };

  /* Was die Typen vom Nebentisch so rufen. */
  var TYP_LINES = [
    'WAS GUCKST DU?', 'BRUDER, WAS WAR DAS?', 'RÜLPS NOCHMAL!', 'ICH KENN DEINEN COUSIN!',
    'WILLST DU STRESS?', 'CHILL MAL!', 'MEINE SHISHA IST AUSGEGANGEN!', 'NICHT IN MEINE RICHTUNG!',
    'DAS WAR MEINE KOHLE!', 'MEIN COUSIN KENNT DEINEN COUSIN!'
  ];

  /* Esat geht mit und kommentiert. */
  var ESAT_BAR_LINES = [
    'YUSUF, CHILL!', 'DAS WAR NUR EIN RÜLPSER, JUNGS!', 'NICHT DIE KOHLE ANFASSEN!',
    'ICH KENN DEN. ...NEIN, DOCH NICHT.', 'WIR WOLLTEN NUR RAUCHEN.',
    'WARUM WERFEN DIE MIT ZANGEN?', 'UNSER TISCH IST GANZ HINTEN.',
    'NICHT ZURÜCKRÜLPSEN!', 'ICH ZAHL DIE NÄCHSTE RUNDE! ...SAG ICH NUR.'
  ];
  var ESAT_TAVERNE_LINES = [
    'NOCH ZEHN MINUTEN BIS KÜCHENSCHLUSS!', 'DIE KRABBE HAT MICH ANGESCHAUT.',
    'ICH ESS NUR EINEN SALAT. VIELLEICHT.', 'DAS IST DER SCHNELLSTE GRIECHE DER STADT.',
    'OPA!', 'NICHT AUF DAS ÖL TRETEN!', 'DER FISCH HAT MICH GEDUZT.'
  ];

  /* Lennarts grosser Auftritt in Level 12 (Zwischensequenz). */
  var LENNART_CUT = {
    esatHear: 'HÖRST DU DAS?',
    yusufHear: 'IST DAS EIN MOTORRAD?',
    card: 'LENNART',
    cardSub: 'BEINTAG. JEDEN TAG. AUCH HEUTE.',
    jump1: 'PLATZ DA! PUMP IM BEIN!',
    jump2: 'ZU EASY, BRO!',
    jump3: 'UND JETZT DER DREIFACHE—',
    crash: 'AUA.',
    lying: 'ALLES GUT! DAS WAR GEPLANT! DAS IST EIN TREND!',
    esatPass: 'HAST DU WAS GESEHEN?',
    yusufPass: 'NÖ.',
    lennartPass: 'HAT JEMAND MEIN VORDERRAD GESEHEN? ES WAR NEU.',
    esatAfter: 'SCHÖNES WETTER HEUTE.'
  };

  /* Die Level-Bosse. Jeder nervt auf seine eigene Art. */
  var MINI_DIALOG = {
    mirkan: {
      start: [
        ['mirkan', 'YUSUF! DA BIST DU JA!'],
        ['yusuf', 'MIRKAN. NICHT JETZT.'],
        ['mirkan', 'WO WARST DU? WAS MACHST DU? WARUM HIER? WARUM MIT HONIG?'],
        ['yusuf', 'DAS SIND VIER FRAGEN IN VIER SEKUNDEN.'],
        ['mirkan', 'IST DAS EINE ANTWORT ODER EINE KRITIK?'],
        ['yusuf', 'WARUM STEHT DEIN MERCEDES IN UNSEREM GARTEN?'],
        ['mirkan', 'WARUM STEHT EUER GARTEN UM MEINEN MERCEDES?'],
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
        ['mirkan', 'DAS SOLL SO! ...ODER? SOLL DAS SO? WEISST DU, OB DAS SO SOLL?']
      ],
      end: [
        ['mirkan', 'OKAY! OKAY! ICH FRAG NICHTS MEHR!'],
        ['yusuf', 'DANKE.'],
        ['mirkan', 'NUR EINS NOCH: TUT DAS WEH?'],
        ['yusuf', 'MIRKAN.'],
        ['mirkan', 'ICH FAHR JA SCHON. ...WO IST HIER DER AUSGANG?'],
        ['yusuf', 'DA, WO DU REINGEKOMMEN BIST. DURCH DEN ZAUN.']
      ]
    },
    lennart: {
      start: [
        ['lennart', 'EY! GEHST DU AUCH INS GYM?'],
        ['yusuf', 'ICH BIN GERADE IM GYM.'],
        ['lennart', 'JA, ABER TRAINIERST DU AUCH?'],
        ['yusuf', 'ICH BEWEGE MICH SEIT ZWEI STUNDEN. DURCH DEINE HANTELN.'],
        ['lennart', 'DAS IST KEIN TRAINING, DAS IST KARDIO.'],
        ['yusuf', 'KARDIO IST TRAINING.'],
        ['lennart', 'NICHT WENN MAN DABEI ISST.'],
        ['yusuf', '...WOHER WEISST DU DAS?'],
        ['lennart', 'DU HAST NOCH EINEN DÖNER IN DER HAND, BRO.'],
        ['yusuf', 'OKAY. JETZT REICHT ES.']
      ],
      phase2: [
        ['lennart', 'LETZTE WIEDERHOLUNG! IMMER DIE LETZTE!'],
        ['yusuf', 'DAS SAGST DU SEIT ZEHN MINUTEN.'],
        ['lennart', 'JETZT IST MASSEPHASE.'],
        ['yusuf', 'DU BIST GERADE EINEN KOPF GEWACHSEN.'],
        ['lennart', 'DAS IST DER PUMP, BRO. DER GEHT NIE WIEDER WEG.']
      ],
      end: [
        ['lennart', 'OKAY. RESPEKT. DU HAST KRAFT.'],
        ['yusuf', 'ICH WEISS. ICH TRAG JEDEN TAG MICH SELBST.'],
        ['lennart', 'WILLST DU MEINEN TRAININGSPLAN?'],
        ['yusuf', 'NEIN.'],
        ['lennart', 'ICH SCHICK IHN DIR TROTZDEM. ALS SPRACHNACHRICHT. ZWÖLF MINUTEN.']
      ]
    },
    erfan: {
      start: [
        ['erfan', 'RAUS! RAUS AUS MEINER KÜCHE!'],
        ['yusuf', 'ERFAN? ICH BINS, YUSUF!'],
        ['erfan', 'SIE HABEN MEINEN SAFRAN ANGEFASST.'],
        ['yusuf', '...WAS?'],
        ['erfan', 'ECHTER SAFRAN. AUS MASCHHAD.'],
        ['erfan', 'ZWEI GRAMM. DREISSIG EURO. ANGEFASST! MIT FINGERN!'],
        ['yusuf', 'OKAY. DAS IST TATSÄCHLICH SCHLIMM.'],
        ['erfan', 'UND MEIN KUBIDE-FLEISCH IST WEG!'],
        ['erfan', 'VIERZEHN TAGE KEIN KUBIDE, YUSUF. VIERZEHN.'],
        ['yusuf', 'DAS IST KEINE DIÄT MEHR. DAS IST EINE STRAFE.'],
        ['yusuf', 'ICH HOL ALLES ZURÜCK. KOMM ERST RUNTER.'],
        ['erfan', 'ICH KOMME NICHT RUNTER! ICH HABE SAFRAN GEROCHEN!']
      ],
      phase2: [
        ['erfan', 'WEISST DU, WIE LANGE REIS BRAUCHT?'],
        ['yusuf', 'NEIN.'],
        ['erfan', 'GENAU SO LANGE WIE ER BRAUCHT!'],
        ['yusuf', 'DAS IST KEINE ANTWORT, ERFAN.'],
        ['erfan', 'DOCH! IN DER KÜCHE SCHON!'],
        ['erfan', 'ICH HAB NOCHMAL AN DEM SAFRAN GEROCHEN.'],
        ['erfan', 'AN DEM GANZEN GLAS.'],
        ['yusuf', 'SEINE AUGEN SIND GOLDEN. DAS IST NICHT GUT. DAS IST NICHT MAL LEGAL.']
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
        ['yusuf', 'MACH VIERZEHN. EINS FÜR JEDEN TAG.']
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
    'WANN GEHST DU SCHLAFEN?',
    'IST DAS HONIG AUF DEM SITZ?',
    'DARF ICH HUPEN? ...WARUM HUPE ICH?'
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
    'ZZZ... RESPAWN... ZZZ...',
    'ICH SPARE ENERGIE. FÜRS ESSEN.',
    'ZZZ... GOLDHONIG... ZZZ...'
  ];

  var HURT_LINES = [
    'AUA!', 'DAS WAR UNFAIR!', 'MEIN HONIG!', 'OKAY. AUTSCH.',
    'ICH BIN VERLETZT. SEELISCH.', 'DAS ZAHLT MEINE VERSICHERUNG NICHT.',
    'DAS WAR EIN HITBOX-FEHLER.', 'DER HAT GECAMPT!',
    'DAS GEHT AN MEINEN ANWALT.', 'DAS SPÜR ICH MORGEN. ODER NIE.'
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
    'ICH PROBIER NUR KURZ. SEIT ZWEI STUNDEN.',
    'DAS IST KEIN SNACK. DAS IST TRADITION.'
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
    if (n === 40) return 'VIERZIG. ESAT HAT MITGEZÄHLT. ESAT ZÄHLT IMMER.';
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
    if (n === 14) return 'VIERZEHN. EINS FÜR JEDEN TAG OHNE.';
    return KUBIDE_LINES[(Math.random() * KUBIDE_LINES.length) | 0];
  }

  /* Goldhonig. Huseyin hat ihn versteckt, immer ganz oben — er dachte,
     da kommt Yusuf nie hin. Er hat Yusuf unterschaetzt. Und Zucker. */
  var GOLD_LINES = [
    'GOLDHONIG. DER GUTE. AUS DEM OBERSTEN REGAL.',
    'HUSEYIN DACHTE, SO HOCH KOMM ICH NICHT.',
    'DAFÜR BIN ICH GEKLETTERT. FREIWILLIG. NOTIERT DAS.',
    'GOLD. WIE MEIN CHARAKTER.',
    'ICH HAB KEINE HÖHENANGST. ICH HAB HONIGLUST.'
  ];

  function goldLine(got, all) {
    if (got >= all) return 'ALLE ' + all + '. HUSEYIN WIRD DAS NIE ERFAHREN.';
    if (got === 1) return GOLD_LINES[(Math.random() * GOLD_LINES.length) | 0];
    return 'NOCH ' + (all - got) + '. DER IST BESTIMMT AUCH GANZ OBEN.';
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
    'ICH MACH DAS IM DEFIZIT!', 'SITZ DU DA ODER TRAINIERST DU?',
    'NUR NOCH EIN SATZ!', 'PROTEIN IST EIN GEFÜHL!'
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
    'ICH HAB NUR KURZ AUFS HANDY GESCHAUT.',
    'DAS WAR TAKTISCH.',
    'ICH HAB DEN BODEN GETESTET. ER HÄLT NICHT.'
  ];

  /* Level 6: wer unterwegs dazukommt, und was die Polizei so sagt. */
  var CONVOY_DIALOG = {
    erfan: [
      ['erfan', 'YUSUF! WARTE! ICH KOMM MIT!'],
      ['yusuf', 'ERFAN? MIT DEM SCHWARZEN CLA?'],
      ['erfan', 'ICH HAB KUBIDE IM KOFFERRAUM. FÜR ALLE.'],
      ['huseyin', 'WARUM HAT HIER JEDER EIN AUTO AUSSER MIR?'],
      ['yusuf', 'DU LÄUFST DOCH SO GERN.'],
      ['erfan', 'FAHR VOR. ICH BLEIB DIR IM NACKEN.']
    ],
    lennart: [
      ['lennart', 'BROOO! STILBRUCH? ICH BIN DABEI!'],
      ['yusuf', 'LENNART. IN EINER SILBERNEN E-KLASSE.'],
      ['lennart', 'DIE HAT MEIN OPA MIR GEGEBEN. SIE HAT SITZHEIZUNG.'],
      ['lennart', 'ICH HAB AUCH SHAKES DABEI. FALLS JEMAND WILL.'],
      ['yusuf', 'NIEMAND WILL, LENNART.'],
      ['lennart', 'DANN TRINK ICH SIE ALLE. DAS WAR SOWIESO DER PLAN.']
    ]
  };

  var POLIZEI_LINES = [
    'HALT! POLIZEI!',
    'FÜHRERSCHEIN UND FAHRZEUGSCHEIN!',
    'WISSEN SIE, WIE SCHNELL SIE WAREN?',
    'HABEN SIE GETRUNKEN? HONIG ZÄHLT AUCH!',
    'DAS GIBT PUNKTE IN FLENSBURG!',
    'AUSSTEIGEN! ...BITTE.',
    'IST DAS IHR MUSTANG? SEIT WANN?'
  ];

  /* ---------------------------------------------------------------
     Level 15-20: Sparta, Fussball, der andere Alex, Rennen, Knast, Doener
     --------------------------------------------------------------- */

  /* Zeitraffer beim Schlafen: was passiert, waehrend Yusuf einen ganzen
     Tag verpennt. m = Minute ab Mitternacht des Tages, an dem er
     einschlaeft (1440 = der naechste Tag). anrufe: landen als verpasste
     Anrufe auf dem Handy. dreh: er wirft sich herum. klopf: jemand
     klopft oder klingelt. */
  var SCHLAF_TAG = {
    // Sonntag 16:40 bis Dienstag 7:30. Zwoelf Anrufe am Montag.
    morgen: [
      { m: 1080, text: 'SONNTAG, 18:00. HÜSEYIN SCHREIBT: "GYM?" YUSUF ANTWORTET MIT SCHNARCHEN.' },
      { m: 1380, text: 'SONNTAG, 23:00. DRAUSSEN GEHEN DIE LETZTEN MIKAS NACH HAUSE.' },
      { m: 1800, text: 'MONTAG, 6:00. HÜSEYIN GEHT LAUFEN. YUSUF DREHT SICH UM.', dreh: true },
      { m: 2160, text: 'MONTAG, 12:00. ESAT HAT SCHON DREIMAL ANGERUFEN. YUSUF TRÄUMT VOM MITTAGESSEN. ER NIMMT ZWEIMAL NACH.', anrufe: 3 },
      { m: 2460, text: 'MONTAG, 17:00. DER PAKETBOTE KLINGELT DREIMAL. DANN GIBT ER AUF.', klopf: true },
      { m: 2760, text: 'MONTAG, 22:00. ESAT RUFT AN. UND AN. UND AN. EIN GANZER MONTAG, EINFACH WEG.', anrufe: 9 },
      { m: 3060, text: 'DIENSTAG, 3:00. DER NACHBAR KLOPFT GEGEN DIE WAND. YUSUF SCHNARCHT ZURÜCK.', klopf: true, dreh: true }
    ],
    // Mittwoch 1:20 bis Donnerstag 9:40
    fussball: [
      { m: 150, text: 'MITTWOCH, 2:30. DAS SOUVLAKI ARBEITET. MAN HÖRT ES BIS INS TREPPENHAUS.' },
      { m: 420, text: 'MITTWOCH, 7:00. HÜSEYIN WINKT BEIM LAUFEN DURCHS FENSTER. KEINE REAKTION.', dreh: true },
      { m: 720, text: 'MITTWOCH, 12:00. GEORGIOS SCHREIBT: "OMA FRAGT, OB DU NOCH LEBST."' },
      { m: 1020, text: 'MITTWOCH, 17:00. ESAT RUFT AN. SIEBENMAL. DAS HANDY LIEGT UNTER YUSUF.', anrufe: 7 },
      { m: 1320, text: 'MITTWOCH, 22:00. DER MITTWOCH IST VORBEI. YUSUF HAT NICHTS DAVON MITBEKOMMEN. DER MITTWOCH AUCH NICHT VON YUSUF.' },
      { m: 1680, text: 'DONNERSTAG, 4:00. YUSUF DREHT SICH UM. DER LATTENROST REICHT SEINE KÜNDIGUNG EIN.', dreh: true, klopf: true },
      { m: 1890, text: 'DONNERSTAG, 7:30. AUF DEM BOLZPLATZ DEHNT SICH DER ANDERE ALEX. MIT KRÜCKEN.', anrufe: 1 }
    ],
    // Freitag 2:10 bis Samstag 10:15
    airsoft: [
      { m: 240, text: 'FREITAG, 4:00. IN ZELLE 14 LIEGT NILS WACH. ER WEISS, DASS YUSUF GERADE SCHNARCHT.' },
      { m: 480, text: 'FREITAG, 8:00. DIE POST BRINGT DEN BUSSGELDBESCHEID. SIEBEN FOTOS. AUF ALLEN LACHT ER.', klopf: true },
      { m: 780, text: 'FREITAG, 13:00. LENNART SCHREIBT "BROOO". DANN "BROOOOO". DANN EINE SPRACHNACHRICHT. VIER MINUTEN.' },
      { m: 1080, text: 'FREITAG, 18:00. DER DÖNERMANN RUFT AN. ER MACHT SICH SORGEN. SO LANGE WAR YUSUF NOCH NIE WEG.', anrufe: 1, dreh: true },
      { m: 1320, text: 'FREITAG, 22:00. ESAT UND LENNART PLANEN AIRSOFT. YUSUF IST EINGEPLANT. ALS ZIELSCHEIBE.', anrufe: 8 },
      { m: 1620, text: 'SAMSTAG, 3:00. YUSUF RIECHT IM TRAUM DÖNER. SEIN MAGEN KNURRT. DIE NACHBARN WACHEN AUF.', dreh: true, klopf: true },
      { m: 1860, text: 'SAMSTAG, 7:00. DER DÖNERMANN SCHÄRFT SEIN MESSER. ER HAT SO EIN GEFÜHL.', anrufe: 1 }
    ]
  };

  /* Nach Georgios: einen ganzen Tag schlafen. Dann ruft Esat an. */
  var SCHLAF_FUSSBALL = [
    ['', 'DONNERSTAG. 9:40 UHR. DER MITTWOCH HAT OHNE YUSUF STATTGEFUNDEN.'],
    ['esat', 'YUSUF! AUFSTEHEN! WIR SPIELEN FUSSBALL!'],
    ['yusuf', 'JETZT? ICH HAB GERADE ERST DIE AUGEN ZUGEMACHT.'],
    ['esat', 'DAS WAR VORGESTERN. GESTERN WAR MITTWOCH. DU WARST NICHT DABEI.'],
    ['yusuf', 'WAR ER GUT?'],
    ['esat', 'ES WAR EIN MITTWOCH.'],
    ['yusuf', 'DANN HAB ICH NIX VERPASST.'],
    ['yusuf', 'ICH HAB VORGESTERN VIER SHAWARMA UND EIN SOUVLAKI GEGESSEN.'],
    ['esat', 'DESWEGEN JA. DAS MUSS RAUS.'],
    ['yusuf', 'WIE LANGE DAUERT EIN FUSSBALLSPIEL?'],
    ['esat', 'NEUNZIG MINUTEN.'],
    ['yusuf', 'DANN BRAUCH ICH NEUNZIG MINUTEN FRÜHSTÜCK.'],
    ['esat', 'GEORGIOS UND SEIN KUMPEL ALEX SPIELEN GEGEN UNS.'],
    ['yusuf', 'ALEX? DER VON DER KASSE?'],
    ['esat', 'NEIN. DER ANDERE ALEX. DER GROSSE.'],
    ['yusuf', 'WIE VIELE ALEXE GIBT ES EIGENTLICH?'],
    ['esat', 'GENUG. ZIEH DICH AN.'],
    ['', 'YUSUF STEHT AUF. ER IST ÜBERRASCHEND GUT IM FUSSBALL. DAS WEISS NUR KEINER.']
  ];

  /* Nach dem Knast: einen ganzen Tag schlafen. Dann der Gruppenanruf. */
  var SCHLAF_AIRSOFT = [
    ['', 'SAMSTAG. 10:15 UHR. DEN FREITAG HAT YUSUF KOMPLETT VERSCHLAFEN.'],
    ['', 'GRUPPENANRUF: ESAT, LENNART.'],
    ['lennart', 'BROOO! AUFSTEHEN!'],
    ['esat', 'WIR GEHEN JETZT AIRSOFT SPIELEN. STEH AUF, DU PENNER.'],
    ['yusuf', 'ICH WAR GESTERN IM KNAST.'],
    ['esat', 'DAS WAR VORGESTERN. GESTERN WARST DU NUR IM BETT.'],
    ['lennart', 'ICH HAB DIR EINE SPRACHNACHRICHT GESCHICKT. VIER MINUTEN.'],
    ['yusuf', 'ICH HAB SIE MIR ANGEHÖRT. IM SCHLAF.'],
    ['lennart', 'UND? HAST DU IM KNAST TRAINIERT?'],
    ['yusuf', 'ICH HAB EINEN PROFESSOR BESIEGT. MIT WISSEN.'],
    ['esat', 'SCHÖN. IN EINER STUNDE AM PLATZ. MIT TARNKLEIDUNG.'],
    ['yusuf', 'ICH HAB KEINE TARNKLEIDUNG.'],
    ['lennart', 'DU BRAUCHST AUCH KEINE. DICH SIEHT MAN SOWIESO.'],
    ['yusuf', '...'],
    ['yusuf', 'ICH GEH ERST DÖNER ESSEN.'],
    ['esat', 'YUSUF. NEIN.'],
    ['yusuf', 'YUSUF. DOCH.'],
    ['', 'YUSUF LEGT AUF. ER HAT EINEN PERSÖNLICHEN DÖNERMANN. DER RUFT IMMER ZURÜCK.']
  ];

  /* Fussball: was auf dem Platz gerufen wird */
  var FUSSBALL = {
    tor: ['TOOOR! HÖ HÖ HÖÖÖ!', 'TOR! DER BAUCH TRIFFT!', 'TOR! ALEX GUCKT HINTERHER!'],
    gegentor: ['GEGENTOR. ESAT GUCKT WEG.', 'GEORGIOS TRIFFT. SAGT ER.', 'TOR FÜR DIE GRIECHEN.'],
    parade: ['PARIERT! MIT DER KRÜCKE!', 'KRÜCKEN-PARADE!', 'NICHT MIT MIR!'],
    durch: ['DURCH DIE BEINE!', 'DEN HAB ICH NICHT GESEHEN.', 'ZU SCHARF!'],
    esat: ['VOLLEY!', 'FÜR YUSUF!', 'WIE IM TRAINING. DAS ICH NIE MACHE.'],
    georgios: ['OPA!', 'SIRTAKI-SCHUSS!', 'WIE IN ATHEN!']
  };

  /* Der andere Alex als Riese (Level 17) */
  var RIESE_DIALOG = {
    start: [
      ['alexg', 'VON DA UNTEN SIEHT MAN DICH KAUM, YUSUF.'],
      ['yusuf', 'DU BIST GRÖSSER ALS DIE TRIBÜNE.'],
      ['alexg', 'ICH HAB MICH NUR AUFGEREGT.'],
      ['esat', 'YUSUF! DRAUFSPRINGEN BRINGT NIX! SUCH SEINE SCHWACHSTELLEN!'],
      ['yusuf', 'WAS SIND SEINE SCHWACHSTELLEN?'],
      ['esat', 'SCHUH, BRILLE, MÜTZE. UND KRITIK.'],
      ['alexg', 'ICH HAB KEINE SCHWACHSTELLEN.'],
      ['', 'SEIN SCHNÜRSENKEL IST OFFEN.']
    ],
    phase2: [
      ['', 'ALEX GUCKT AUFS HANDY. GEORGIOS HAT WAS KOMMENTIERT.'],
      ['alexg', 'L. ER HAT L GESCHRIEBEN. UNTER MEIN TORWART-VIDEO.'],
      ['yusuf', 'WAS HEISST L?'],
      ['esat', 'LOSER. ODER LAUCH. KOMMT AUF DEN KONTEXT AN.'],
      ['alexg', 'JETZT SCHREIB ICH WAS ZURÜCK. AN ALLE.'],
      ['esat', 'DIE UHR! WENN ER TIPPT, IST DIE UHR UNTEN!']
    ],
    phase3: [
      ['alexg', 'NULL LIKES?! NACH ZWEI MINUTEN?!'],
      ['yusuf', 'VIELLEICHT, WEIL ES DREI UHR NACHMITTAGS IST.']
    ],
    end: [
      ['alexg', 'OKAY. OKAY. DU HAST GEWONNEN.'],
      ['alexg', 'MEINE MÜTZE IST WEG, MEINE BRILLE HAT EINEN SPRUNG UND MEINE UHR GEHT NACH.'],
      ['yusuf', 'DEIN SCHNÜRSENKEL IST AUCH NOCH OFFEN.'],
      ['alexg', 'ICH WEISS.'],
      ['', 'ALEX SCHRUMPFT WIEDER AUF NORMALGRÖSSE. FAST.'],
      ['alexg', 'GUT FUSSBALL GESPIELT, YUSUF. ABER IM AUTORENNEN BIN ICH BESSER.'],
      ['yusuf', 'ICH HAB EINEN MUSTANG.'],
      ['alexg', 'ICH HAB EINEN AUDI.'],
      ['esat', 'OH NEIN. SIE VERGLEICHEN AUTOS.'],
      ['alexg', 'HEUTE ABEND. LANDSTRASSE. WER VERLIERT, ZAHLT DAS ESSEN.'],
      ['yusuf', 'ICH ZAHLE NIE DAS ESSEN.'],
      ['esat', 'ICH FAHR MIT. BEIFAHRER. DAS WILL ICH SEHEN.']
    ]
  };

  /* Rage-Bait: was als Woerter vom Himmel faellt */
  var RAGE_BAIT = ['L', 'COPE', 'RATIO', 'SKILL ISSUE', '0:3', 'NOOB', 'GG EZ', 'BOT',
                   'MIMIMI', 'ANFÄNGER', 'KLEIDERSCHRANK'];

  /* Rennen: Schilder, Esat, Alex, Erfans Auftritt */
  var RENNEN = {
    schilder: ['DÖNER 2 KM', 'TANKSTELLE: GLEICH', 'BLITZER? WELCHE BLITZER?', 'GYM: NEIN',
               'STILBRUCH 300 KM', 'ESAT HAT SCHON BESTELLT', 'HONIG. ÜBERALL.',
               'LANGSAM! KINDER! (KEINE DA)', 'AUDI FAHRER BREMSEN HIER', 'MUSTANG: JA'],
    esatStart: ['ICH SITZ HIER NUR. ICH HAB NIX GESEHEN.'],
    esat: ['LINKS! NEIN, RECHTS!', 'ICH HAB DIE HAND AM TÜRGRIFF.', 'DAS IST EIN FASS, YUSUF.',
           'DER AUDI HAT MEHR PS.', 'ICH FILM DAS.', 'SCHNELLER! NEIN, LANGSAMER!',
           'DU FÄHRST WIE DU ISST.', 'WANN HAST DU DEN FÜHRERSCHEIN GEMACHT?',
           'NITRO IST SPRUNG. HAB ICH GELESEN.'],
    blitzer: ['LÄCHELN!', 'DAS WAR SCHON WIEDER EINER.', 'DIE KENNEN DICH JETZT.',
              'SCHICKST DU MIR DAS FOTO?', 'DU LACHST AUF JEDEM.'],
    crash: ['MEIN RÜCKEN!', 'ICH STEIG AUS. NACHHER.', 'DAS HAT DER MUSTANG NICHT VERDIENT.'],
    rampe: ['ABHEBEN!', 'MUSTANG KANN FLIEGEN!', 'FESTHALTEN!'],
    landung: ['GELANDET!', 'SAUBER!', 'DIE ACHSE HÄLT!'],
    alexBlitzer: ['BLITZER. ICH BREMS MAL.', 'VERKEHRSREGELN, YUSUF!', 'ICH HAB NUR NOCH ZWEI PUNKTE.'],
    alexRempel: ['EY! MEIN AUDI!', 'PASS AUF DEN LACK AUF!', 'DAS WAR ABSICHT!'],
    erfanCut: {
      esatSpiegel: 'IM RÜCKSPIEGEL. EIN SCHWARZER CLA.',
      karte: 'ERFAN',
      karteSub: 'HAT KUBIDE IM KOFFERRAUM. UND SPANISCHE MUSIK.',
      hola: 'HOLA, YUSUF! OLE!',
      drift: ['OLE!', 'DRIFT!', 'KUBIDE FÜR ALLE!', 'ARRIBA!', 'AY, ESTO ES VIDA!'],
      aua: 'AY CARAMBA.',
      kubide: 'MEIN KUBIDE!',
      esatPass: 'HAST DU WAS GESEHEN?',
      yusufPass: 'YUSUF: NÖ.',
      alexPass: 'ICH AUCH NICHT.'
    }
  };

  /* Knast */
  var KNAST_LINES = ['WAS GUCKST DU?', 'NEUER, HM?', 'DAS IST MEIN TABLETT!', 'WEGEN WAS BIST DU HIER?',
                     'ICH BIN UNSCHULDIG!', 'DÖNER GIBT ES HIER NICHT!', 'ZELLE 14? BEILEID.'];
  var SCHLAEGER_LINES = ['ZELLENBLOCK C, BRO!', 'HOFGANG IST JEDEN TAG!', 'ICH TRAINIER HIER SEIT 2019!',
                         'GEHST DU AUCH IN DEN KRAFTRAUM?', 'NUR NOCH EIN SATZ!'];
  var WAERTER_LINES = ['ZURÜCK IN DIE ZELLE!', 'NACHTRUHE!', 'DAS GIBT EINEN EINTRAG!',
                       'HÄNDE, WO ICH SIE SEHE!', 'KEIN ESSEN NACH ZEHN!'];

  /* NILS */
  var NILS_DIALOG = {
    start: [
      ['nils', 'YUSUF. ICH HAB DICH ERWARTET.'],
      ['yusuf', 'NILS?! WAS MACHST DU IM KNAST?'],
      ['nils', 'ICH BIN HIER FREIWILLIG. BIBLIOTHEK. 40.000 BÜCHER.'],
      ['nils', 'ICH HAB ALLE GELESEN.'],
      ['yusuf', 'IN EINER NACHT?'],
      ['nils', 'IN EINER STUNDE. DEN REST DER NACHT HAB ICH NACHGEDACHT.'],
      ['yusuf', 'ICH MUSS HIER RAUS. ICH HAB HUNGER.'],
      ['nils', 'ICH WEISS.'],
      ['yusuf', 'WIE, DU WEISST?'],
      ['nils', 'ES WAR IN MEINEM KOPF.'],
      ['yusuf', 'DA IST JA AUCH GENUG PLATZ.'],
      ['nils', 'WENN DU RAUS WILLST, MUSST DU MICH BESIEGEN. MIT WISSEN.'],
      ['yusuf', 'KANN ICH AUCH EINFACH DRAUFSPRINGEN?'],
      ['nils', 'NUR WENN ICH GERADE NICHT DENKE. ALSO NIE.']
    ],
    phase2: [
      ['nils', 'INTERESSANT. DU BIST BESSER, ALS ICH BERECHNET HABE.'],
      ['nils', 'ZEIT FÜR DEN GENIE-MODUS.'],
      ['', 'NILS DENKT SO DOLL NACH, DASS SEINE STIRN WÄCHST.'],
      ['yusuf', 'DEINE STIRN. SIE WIRD GRÖSSER.'],
      ['nils', 'ICH WEISS. ICH WEISS. ICH WEISS.'],
      ['yusuf', 'DA PASST JETZT EINE LANDKARTE DRAUF.'],
      ['nils', 'EINE WELTKARTE. MIT LEGENDE.']
    ],
    phase3: [
      ['nils', 'HÖ HÖ HÖÖÖ.'],
      ['yusuf', 'HÖR AUF, MICH NACHZUMACHEN.'],
      ['nils', 'HÖR AUF, MICH NACHZUMACHEN.'],
      ['yusuf', '...'],
      ['nils', '...']
    ],
    end: [
      ['nils', 'OKAY. DU HAST GEWONNEN. DAS WAR... NICHT IN MEINEM KOPF.'],
      ['yusuf', 'WIE KOMM ICH JETZT HIER RAUS?'],
      ['nils', 'DURCH DIE TÜR.'],
      ['yusuf', 'DIE IST ABGESCHLOSSEN.'],
      ['nils', 'NEIN. DIE WAR NIE ABGESCHLOSSEN.'],
      ['yusuf', 'WAS?!'],
      ['nils', 'ICH WEISS. ICH WEISS. ICH WEISS.'],
      ['yusuf', 'SEIT WANN WEISST DU DAS?'],
      ['nils', 'ES WAR IN MEINEM KOPF.'],
      ['', 'YUSUF GEHT DURCH DIE TÜR. SIE WAR WIRKLICH NICHT ABGESCHLOSSEN.'],
      ['', 'DRAUSSEN WARTET ESAT IM MUSTANG. ER HAT SCHON BESTELLT.'],
      ['yusuf', 'ICH GEH JETZT SCHLAFEN. ZU HAUSE. DA IST DAS ESSEN BESSER.']
    ]
  };

  /* Nils' Quiz. Die erste Antwort ist die richtige (wird gemischt). */
  var NILS_QUIZ = [
    { f: 'WIE VIELE KALORIEN HAT EIN DÖNER?', a: ['1300', '7', 'EINER IST KEINER'] },
    { f: 'WIE VIELE PLATIN-TROPHÄEN HAT YUSUF?', a: ['KEINE', '47', 'ALLE'] },
    { f: 'WAS RAUCHT YUSUF IN DER SHISHA?', a: ['DOPPELAPFEL', 'TRAUBE-MINZE', 'SALAT'] },
    { f: 'WIE VIELE TAGE KEIN KUBIDE?', a: ['VIERZEHN', 'ZWEI', 'NIE'] },
    { f: 'WIE VIELE MIKAS GIBT ES?', a: ['WEISS KEINER', 'VIER', 'EINEN'] },
    { f: 'HAT YUSUF HUNGER?', a: ['IMMER', 'NEIN', 'EIGENTLICH NICHT'] },
    { f: '3 DÖNER + 4 DÖNER = ?', a: ['7', '34', 'ZU WENIG'] },
    { f: 'WO SITZT YUSUF JEDEN TAG?', a: ['IM TANGENTE', 'IM GYM', 'IN DER BIBLIOTHEK'] }
  ];
  var NILS_QUIZ2 = [
    { f: 'WIE GROSS IST MEINE STIRN?', a: ['RIESIG', 'KLEIN', 'NORMAL', 'WELCHE STIRN?'] },
    { f: 'WIE HEISST DER ANDERE ALEX?', a: ['ALEX', 'BROKE', 'MIKA', 'GEORGIOS'] },
    { f: 'WIE SCHNELL IST GEORGIOS?', a: ['SEHR. SAGT ER.', 'LANGSAM', 'NORMAL', 'GAR NICHT'] },
    { f: 'WAS SAGT ESAT IMMER?', a: ['GEH INS GYM', 'ICH ZAHLE', 'GUTE NACHT', 'SALAT?'] },
    { f: 'WIE VIELE KALORIEN WAREN ES AM SONNTAG?', a: ['10.000', '100', '0', '42'] },
    { f: 'WER BREMST AN BLITZERN?', a: ['ALEX', 'YUSUF', 'ESAT', 'ERFAN'] }
  ];

  /* Doenerbude (Level 20) */
  var DOENER = {
    karte: ['YUSUFS DÖNER', 'ALLES MIT ALLEM', 'SALAT: NUR DEKO', 'SOSSE: JA'],
    anruf: ['ESAT RUFT AN. AIRSOFT.', 'LENNART RUFT AN. BRO.', 'GRUPPENANRUF. SCHON WIEDER.'],
    ignorieren: ['GLEICH.', 'ICH HAB DIE HÄNDE VOLL.', 'SAG IHNEN, ICH BIN UNTERWEGS.'],
    brot: ['DAS FUNDAMENT.', 'FRISCH. WARM. MEINS.'],
    zutat: {
      fleisch: ['FLEISCH. DAS IST DER SINN.', 'NOCH MEHR FLEISCH.'],
      pommes: ['POMMES IM DÖNER. SO GEHÖRT DAS.'],
      kaese: ['KÄSE. WARUM NICHT.'],
      sucuk: ['SUCUK. FÜR DIE SEELE.'],
      salat: ['SALAT. FÜR DIE FARBE.', 'NUR DEKO.'],
      zwiebel: ['ZWIEBELN. ESAT WIRD SICH FREUEN.'],
      tomate: ['DIE TOMATE GUCKT BÖSE.'],
      knobi: ['KNOBLAUCH. MEINE AIRSOFT-WAFFE.'],
      scharf: ['SCHARF. ICH SCHWITZE SCHON.']
    },
    riss: ['NEIN! DER SCHÖNE DÖNER!', 'DAS BROT WAR SCHWACH.', 'ZU VIEL LIEBE.']
  };

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
    L.gold = out.filter(function (it) { return it.t === 'goldhonig'; }).length;
    return L;
  }

  var LEVELS = [lvl1.out(), lvl2.out(), lvl3.out(), lvl4.out(),
                lvl5.out(), lvl6.out(), lvl7.out(), lvl8.out(),
                lvl9.out(), lvl10.out(), lvl11.out(), lvl12.out(),
                lvl13.out(), lvl14.out(), lvl15.out(), lvl16.out(),
                lvl17.out(), lvl18.out(), lvl19.out(), lvl20.out()].map(tidyItems);

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
    goldLine: goldLine,
    kubideLine: kubideLine,
    schlafFussball: SCHLAF_FUSSBALL,
    schlafTag: SCHLAF_TAG,
    schlafAirsoft: SCHLAF_AIRSOFT,
    fussball: FUSSBALL,
    riese: RIESE_DIALOG,
    rageBait: RAGE_BAIT,
    rennen: RENNEN,
    knastLines: KNAST_LINES,
    schlaegerLines: SCHLAEGER_LINES,
    waerterLines: WAERTER_LINES,
    nils: NILS_DIALOG,
    nilsQuiz: NILS_QUIZ,
    nilsQuiz2: NILS_QUIZ2,
    doener: DOENER
  };

})(window);
