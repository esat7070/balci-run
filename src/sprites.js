/* =====================================================================
   sprites.js — Gegner, Items, Blöcke, Deko und Tiles.
   Alles handgepixelt. Die Tiles entstehen aus zwei selbstgezeichneten
   Masken plus einer Farbpalette pro Welt.
   ===================================================================== */
(function (global) {
  'use strict';

  var P = global.Pixel;

  /* ---------------------------------------------------------------
     Paletten für Objekte
     --------------------------------------------------------------- */

  P.palette('obj', {
    k: '#1b1220',
    // Metall
    m: '#b9c1d6', M: '#6f7791', f: '#f2f2ee', b: '#2a2030',
    // Rot / Gelb
    r: '#e0483c', R: '#a72e26',
    y: '#ffc23c', Y: '#ffe38a', o: '#e08a1e',
    w: '#ffffff', W: '#b9c2d0',
    // Grün
    g: '#4aa832', G: '#2d6b1f', l: '#8cd85a', L: '#c4f08a',
    // Braun / Essen
    n: '#b07a3a', N: '#7d5224', c: '#d8a05a', C: '#8a5a2a',
    p: '#f0cc7a', z: '#5e3a1e',
    s: '#f4bd91', d: '#d1946b', t: '#d94040',
    e: '#6fbf4a', u: '#a85a2e', v: '#7d3f1e',
    x: '#fff3c8', q: '#8a5a1e'
  });

  P.palette('heart', {
    k: '#2a0a14', r: '#ff4d6a', R: '#c02040', w: '#ffb3c0'
  });

  P.palette('shake', {
    k: '#1b1220', w: '#eef2f7', W: '#b9c2d0', p: '#ff6fa8', c: '#3a3f4d'
  });

  /* ---------------------------------------------------------------
     GEGNER
     --------------------------------------------------------------- */

  /* Der Wecker. Yusufs natürlicher Feind. */
  P.def('wecker', `
    .kk........kk.
    kmmk......kmmk
    kmMk......kmMk
    .kkkkkkkkkkkk.
    .kmmmmmmmmmmk.
    kmffffffffffmk
    kmfbffffffbfmk
    kmffffffffffmk
    kmffkkkkkkffmk
    kmfffrrrrfffmk
    kmffffrfffffmk
    .kmmmmmmmmmmk.
    .kMMMMMMMMMMk.
    ..kkk....kkk..
  `, 'obj');

  P.def('wecker2', `
    ..kk......kk..
    .kmmk....kmmk.
    .kmMk....kmMk.
    .kkkkkkkkkkkk.
    .kmmmmmmmmmmk.
    kmffffffffffmk
    kmfbffffffbfmk
    kmffffffffffmk
    kmfkkkkkkkkfmk
    kmfffrrrrfffmk
    kmfffffrfffbmk
    .kmmmmmmmmmmk.
    .kMMMMMMMMMMk.
    .kkk......kkk.
  `, 'obj');

  /* Bienen. Sie wissen, wer ihren Honig klaut. */
  P.def('biene', `
    ..ww.....ww..
    .wwww...wwww.
    ..www...www..
    ...kkkkkkk...
    ..kyybbyyyk..
    .kyybbyyybbk.
    kyyybbyyybbyk
    kwybbyyybbyyk
    .kyybbyyybbk.
    ..kyybbyyk...
    ...kkkkkkk...
  `, {
    k: '#1b1220', y: '#ffc23c', b: '#2a2030', w: '#e8f4ff'
  });

  P.def('biene2', `
    .............
    .............
    ...kkkkkkk...
    ..kyybbyyyk..
    .kyybbyyybbk.
    kyyybbyyybbyk
    kwybbyyybbyyk
    .kyybbyyybbk.
    ..kyybbyyk...
    ...kkkkkkk...
    ..ww.....ww..
  `, {
    k: '#1b1220', y: '#ffc23c', b: '#2a2030', w: '#e8f4ff'
  });

  /* Wütender Brokkoli. Gesund und deswegen böse. */
  P.def('broki', `
    ....kkkkkk....
    ..kkggggggkk..
    .kgglggggglgk.
    kgggggllgggggk
    kglggggggggglk
    kgggwbggwbgggk
    kGggkkkkkkggGk
    ..kGgggggggk..
    ...kGgggggk...
    ....kssssk....
    ....kssssk....
    ....kssssk....
    ...kssssssk...
    ...kkk..kkk...
  `, {
    k: '#14200f', g: '#4aa832', G: '#2d6b1f', l: '#7fd44a',
    s: '#bde08a', w: '#ffffff', b: '#1b1220'
  });

  P.def('broki2', `
    ....kkkkkk....
    ..kkggggggkk..
    .kgglggggglgk.
    kgggggllgggggk
    kglggggggggglk
    kgggwbggwbgggk
    kGggkkkkkkggGk
    ..kGgggggggk..
    ...kGgggggk...
    ....kssssk....
    ....kssssk....
    ...kssssssk...
    ...kssssssk...
    ..kkk....kkk..
  `, {
    k: '#14200f', g: '#4aa832', G: '#2d6b1f', l: '#7fd44a',
    s: '#bde08a', w: '#ffffff', b: '#1b1220'
  });

  /* Hüpfender Salatkopf. */
  P.def('salat', `
    ....kkkkkk....
    ..kkllllllkk..
    .kllggllggllk.
    kllllllllllllk
    klgllllllllglk
    kllwbllllwbllk
    kllllllllllllk
    kllllkmmkllllk
    kglllllllllglk
    .kgllllllllgk.
    ..kGgllllgGk..
    ...kkkkkkkk...
  `, {
    k: '#16260f', l: '#8cd85a', g: '#4aa832', G: '#2d6b1f',
    w: '#ffffff', b: '#1b1220', m: '#7d2724'
  });

  P.def('salat2', `
    ..............
    ....kkkkkk....
    ..kkllllllkk..
    .kllggllggllk.
    kllllllllllllk
    klgllllllllglk
    kllwbllllwbllk
    kllkkmmmmkkllk
    kglllllllllglk
    .kgllllllllgk.
    ..kGgllllgGk..
    ...kkkkkkkk...
  `, {
    k: '#16260f', l: '#8cd85a', g: '#4aa832', G: '#2d6b1f',
    w: '#ffffff', b: '#1b1220', m: '#7d2724'
  });

  /* LENNART. Bulky. Dunkelblond, kurze Seiten, braunes Polo mit
     weissem Kragenstreifen. Fragt dich trotzdem, ob du ins Gym gehst. */
  var LENNART_PAL = {
    k: '#1b1220', h: '#8a6a3a', H: '#a8874a',
    s: '#e8b894', d: '#c99a72',
    w: '#6b4a34', W: '#f2eee6',     // Polo + Kragenstreifen
    b: '#2f3344', g: '#4a3524', e: '#ffffff',
    m: '#8e2f2c', n: '#d8d4cc'
  };

  P.def('lennart', `
    .......kkkkkk.......
    .....kkhhhhhhkk.....
    ....khhhhhhhhhhk....
    ....khHhhhhhhHhk....
    ....khsssssssshk....
    ....ksegssssgesk....
    ....kssssdssssk.....
    ....ksskmmmmkssk....
    .....kssssssssk.....
    .kksssssssssssssskk.
    kssssWWWWWWWWWWssssk
    kssssswwwwwwwwsssssk
    kdssssWwwwwwwWssssdk
    kdsssswwwwwwwwssssdk
    .kdsswwwwwwwwwwssdk.
    .kwwwwwwwwwwwwwwwwk.
    ..kwwwwwwwwwwwwwwk..
    ..kbbbbbbbbbbbbbbk..
    ..kbbbbbbkkbbbbbbk..
    ..kbbbk......kbbbk..
    ..ksssk......ksssk..
    .knnnnk......knnnnk.
  `, LENNART_PAL);

  P.def('lennart2', `
    .......kkkkkk.......
    .....kkhhhhhhkk.....
    ....khhhhhhhhhhk....
    ....khHhhhhhhHhk....
    ....khsssssssshk....
    ....ksegssssgesk....
    ....kssssdssssk.....
    ....kskkmmmmkksk....
    .....kssssssssk.....
    .kksssssssssssssskk.
    kssssWWWWWWWWWWssssk
    kssssswwwwwwwwsssssk
    kdssssWwwwwwwWssssdk
    kdsssswwwwwwwwssssdk
    .kdsswwwwwwwwwwssdk.
    .kwwwwwwwwwwwwwwwwk.
    ..kwwwwwwwwwwwwwwk..
    ..kbbbbbbbbbbbbbbk..
    ..kbbbbbbkkbbbbbbk..
    ..kbbkk......kkbbk..
    .ksssk........ksssk.
    knnnnk........knnnnk
  `, LENNART_PAL);

  /* Kubide vom Spiess. Yusufs Lieblingskueche ist iranisch. */
  P.def('kubide', `
    .....kkkkkk.....
    ...kkmmmmmmkk...
    ..kmmmmmmmmmmk..
    .kmmMmmmmmmMmmk.
    skmmmmmmmmmmmmks
    skmMmmmmmmmmMmks
    .kmmmmmmmmmmmmk.
    ..kmmmmmmmmmmk..
    ...kkmmmmmmkk...
    .....kkkkkk.....
    ..krrrrrrrrrrk..
    ..kkkkkkkkkkkk..
  `, {
    k: '#3a2410', m: '#a8542a', M: '#7a3818', s: '#c8cede', r: '#f4f0e4'
  });

  /* ERFAN — der Koch. Glatze, Vollbart mit freier Kinnmitte,
     schwarzes Hemd, Goldkette. Und eine Schuerze, weil er arbeitet. */
  var ERFAN_PAL = {
    k: '#140f18', s: '#e0a478', d: '#bc8256', S: '#f0b890',
    j: '#2a1c14', J: '#42301f',       // Bart
    w: '#ffffff', g: '#3a2a1a',       // Augen
    m: '#7d2724', H: '#2a1c14',
    r: '#26262c', R: '#16161a',       // schwarzes Hemd
    y: '#e8c24a', Y: '#fff0a8',       // Goldkette
    a: '#eceae2', A: '#c2c0b8',       // Schuerze
    b: '#2a2a34', n: '#d8d4cc'
  };

  P.def('erfan', `
    ....kkkkkkkk....
    ..kkSSSSSSSSkk..
    .kSSSSSSSSSSSSk.
    .kSssssssssssSk.
    ..ksssssssssssk.
    ..kjssssssssjk..
    ..kjsgwsswgsjk..
    ..kjsssdssssjk..
    ..kjssHHHHssjk..
    ..kjjskmmksjjk..
    ...kjjssssjjk...
    ....kJssssJk....
    .....kssssk.....
    ..kkrrrrrrrrkk..
    .krryyyyyyyyrrk.
    krrrryyYYyyrrrrk
    krrrrryyyyrrrrrk
    krrrrrrrrrrrrrrk
    krrrrrrrrrrrrrrk
    kaaaaaaaaaaaaaak
    kaaaaaaaaaaaaaak
    kaaaaaaaaaaaaaak
    .kaaaaaaaaaaaak.
    .kAAAAAAAAAAAAk.
    .kbbbbkkkkbbbbk.
    .kbbbk....kbbbk.
    .knnnk....knnnk.
    .kkkkk....kkkkk.
  `, ERFAN_PAL);

  /* Erfan frei und gluecklich — Arme hoch. */
  P.def('erfan_frei', `
    ....kkkkkkkk....
    ..kkSSSSSSSSkk..
    .kSSSSSSSSSSSSk.
    .kSssssssssssSk.
    ..ksssssssssssk.
    ..kjssssssssjk..
    ..kjskwsswksjk..
    ..kjsssdssssjk..
    ..kjssHHHHssjk..
    ..kjjkmmmmkjjk..
    ...kjjmmmmjjk...
    ....kJssssJk....
    .....kssssk.....
    kk.kkrrrrrrrrkk.
    krkrryyyyyyyyrrk
    krkrryyYYyyrrrrk
    krrrrryyyyrrrrrk
    .krrrrrrrrrrrrk.
    .krrrrrrrrrrrrk.
    kaaaaaaaaaaaaaak
    kaaaaaaaaaaaaaak
    kaaaaaaaaaaaaaak
    .kaaaaaaaaaaaak.
    .kAAAAAAAAAAAAk.
    .kbbbbkkkkbbbbk.
    .kbbbk....kbbbk.
    .knnnk....knnnk.
    .kkkkk....kkkkk.
  `, ERFAN_PAL);

  /* Der Kaefig, in dem Huseyin ihn eingesperrt hat. */
  P.def('kaefig', `
    kkkkkkkkkkkkkkkkkkkkkkkk
    kkkkkkkkkkkkkkkkkkkkkkkk
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    kkkkkkkkkkkkkkkkkkkkkkkk
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    kkkkkkkkkkkkkkkkkkkkkkkk
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    kkkkkkkkkkkkkkkkkkkkkkkk
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    k...k...k...k...k...k..k
    kkkkkkkkkkkkkkkkkkkkkkkk
    kkkkkkkkkkkkkkkkkkkkkkkk
  `, { k: '#7c8399' });

  /* Das Kippen-Päckchen. Macht Yusuf rauchig. */
  P.def('kippen', `
    ..kkkkkkkk..
    .kwwwwwwwwk.
    .kwyywyywwk.
    .kkkkkkkkkk.
    krrrrrrrrrrk
    krrrrrrrrrrk
    krrwwwwwwrrk
    krwwwwwwwwrk
    krwwRRRRwwrk
    krwwwwwwwwrk
    krrwwwwwwrrk
    krrrrrrrrrrk
    kRRRRRRRRRRk
    .kkkkkkkkkk.
  `, {
    k: '#2a1018', r: '#d8342e', R: '#8f1f1c', w: '#f4f2ec', y: '#e8c86a'
  });

  /* Die geworfene Kippe. Glut vorne, Filter hinten. */
  P.def('kippe', `
    .kkkkkkkk.
    koRwwwwyyk
    korwwwwyyk
    koRwwwwyyk
    .kkkkkkkk.
  `, {
    k: '#2a1018', o: '#ffb43c', R: '#ff5a24', r: '#e03a12',
    w: '#f4f2ec', y: '#e8c86a'
  });

  /* Alter Fitness-Bro bleibt als Sprite erhalten (unbenutzt, aber harmlos). */
  P.def('bro', `
    .....kkkkkk.....
    ...kkhhhhhhkk...
    ..khhhhhhhhhhk..
    ..khsssssssshk..
    ..kssssssssssk..
    ..kbbbbbbbbbbk..
    ..kssssssssssk..
    ..ksskmmmmkssk..
    ...kssssssssk...
    ....kssssssk....
    .kssssssssssssk.
    ksswwwwwwwwwwssk
    ksswwWWWWWWwwssk
    ksswwwwwwwwwwssk
    kdswwwwwwwwwwsdk
    .kdwwwwwwwwwwdk.
    .kssssssssssssk.
    ..kbbbbbbbbbbk..
    ..kbbbbkkbbbbk..
    ..kbbk....kbbk..
    ..kssk....kssk..
    .kWWWk...kWWWk..
  `, {
    k: '#1b1220', h: '#e8c86a', s: '#e0a068', d: '#b87c4a',
    b: '#2a2030', w: '#f2f4f8', W: '#c0c6d2', m: '#8e2f2c'
  });

  P.def('bro2', `
    .....kkkkkk.....
    ...kkhhhhhhkk...
    ..khhhhhhhhhhk..
    ..khsssssssshk..
    ..kssssssssssk..
    ..kbbbbbbbbbbk..
    ..kssssssssssk..
    ..kskkmmmmkksk..
    ...kssssssssk...
    ....kssssssk....
    .kssssssssssssk.
    ksswwwwwwwwwwssk
    ksswwWWWWWWwwssk
    ksswwwwwwwwwwssk
    kdswwwwwwwwwwsdk
    .kdwwwwwwwwwwdk.
    .kssssssssssssk.
    ..kbbbbbbbbbbk..
    ..kbbbbkkbbbbk..
    ..kbbkk..kkbbk..
    .kssk......kssk.
    kWWWk......kWWWk
  `, {
    k: '#1b1220', h: '#e8c86a', s: '#e0a068', d: '#b87c4a',
    b: '#2a2030', w: '#f2f4f8', W: '#c0c6d2', m: '#8e2f2c'
  });

  /* Diät-Drohne. Überwacht deine Kalorien aus der Luft. */
  P.def('drohne', `
    .bbbb......bbbb.
    ..kk........kk..
    ..kMk......kMk..
    ..kMkkkkkkkkMk..
    ...kmmmmmmmmk...
    ..kmmwwwwwwmmk..
    ..kmwrwwwwrwmk..
    ..kmmwwwwwwmmk..
    ...kMMMMMMMMk...
    ....kMMMMMMk....
    .....krrrrk.....
    ......krrk......
  `, {
    k: '#1b1220', m: '#b9c1d6', M: '#6f7791',
    w: '#dce6f5', r: '#e0483c', b: '#8a93ab'
  });

  P.def('drohne2', `
    ...bb........bb.
    ..kk........kk..
    ..kMk......kMk..
    ..kMkkkkkkkkMk..
    ...kmmmmmmmmk...
    ..kmmwwwwwwmmk..
    ..kmwrwwwwrwmk..
    ..kmmwwwwwwmmk..
    ...kMMMMMMMMk...
    ....kMMMMMMk....
    .....kyyyyk.....
    ......kyyk......
  `, {
    k: '#1b1220', m: '#b9c1d6', M: '#6f7791', w: '#dce6f5',
    r: '#e0483c', y: '#ffc23c', b: '#8a93ab'
  });

  /* ---------------------------------------------------------------
     PROJEKTILE
     --------------------------------------------------------------- */

  P.def('sellerie', `
    ..kk..
    .kggk.
    .kggk.
    .klgk.
    .kggk.
    .klgk.
    .kggk.
    .klgk.
    .kggk.
    .kggk.
    ..kk..
    ..kk..
  `, { k: '#16260f', g: '#4aa832', l: '#8cd85a' });

  P.def('blatt', `
    ...kkkk...
    .kklllgkk.
    kllllllggk
    klllllgggk
    kllglllggk
    kgllllgggk
    .kgllggggk
    ..kkkkkk..
  `, { k: '#16260f', l: '#8cd85a', g: '#4aa832' });

  P.def('shaker', `
    ..kkkkkk..
    .kcccccck.
    .kcccccck.
    .kkkkkkkk.
    kwwwwwwwwk
    kwWwwwwwWk
    kwppppppwk
    kwppppppwk
    kwppppppwk
    kwppppppwk
    kwWppppWwk
    kwwwwwwwwk
    .kWWWWWWk.
    ..kkkkkk..
  `, 'shake');

  /* ---------------------------------------------------------------
     ITEMS
     --------------------------------------------------------------- */

  /* Das Honigglas. Der Grund für alles. */
  P.def('honig', `
    ..kkkkkkkk..
    .kmmmmmmmmk.
    .kMMMMMMMMk.
    ..kkkkkkkk..
    .kyyyyyyyyk.
    kyYyyyyyyyyk
    kyYyyyyyyyyk
    kyYyyyyoyyyk
    kyyyyyoooyyk
    kyyyyoooooyk
    kyyyooooooyk
    kyooooooooyk
    .kooooooook.
    ..kkkkkkkk..
  `, {
    k: '#3a2410', y: '#ffc23c', Y: '#ffe9a8', o: '#e08a1e',
    m: '#a8763c', M: '#6b4522'
  });

  /* Döner. Heilt Wunden, Kummer und Montage. */
  P.def('doener', `
    ..kkkkkkkkkk..
    .kBBBBBBBBBBk.
    kBBBBBBBBBBBBk
    kBssmmsstmmsBk
    kBmmssmmttssmk
    kBwwwwwwwwwwBk
    kBsstmmsstmmBk
    kBMmsstmmsstBk
    kbBBBBBBBBBBbk
    .kbBBBBBBBBbk.
    ..kkkkkkkkkk..
  `, {
    k: '#3a2410', B: '#e8c48a', b: '#c49a5c', m: '#a85a2e',
    M: '#7d3f1e', s: '#6fbf4a', t: '#d94040', w: '#f4f0e0'
  });

  /* Baklava. Ein Extraleben. Natürlich. */
  P.def('baklava', `
    ..kkkkkkkkk..
    .kpppppppppk.
    kpPpPpPpPpPpk
    kphhhhhhhhhpk
    kphnnnnnnnhpk
    kphhnnnnnhhpk
    kpPpPpPpPpPpk
    .kPPPPPPPPPk.
    ..kkkkkkkkk..
  `, {
    k: '#3a2410', p: '#f0cc7a', P: '#d9a441',
    h: '#ffb52e', n: '#7fb04a'
  });

  P.def('herz', `
    ..kk...kk..
    .krrk.krrk.
    krwrrkrrrrk
    krwrrrrrrrk
    krwrrrrrrrk
    .krrrrrrrk.
    ..krrrrrk..
    ...krrrk...
    ....krk....
    .....k.....
  `, 'heart');

  /* Der GOLD-DÖNER. Kurzzeitig unbesiegbar. Wissenschaftlich fundiert. */
  P.def('golddoener', `
    ....kkkkkkkk....
    ..kkyYYYYYYykk..
    .kyYYYYYYYYYYyk.
    kyYYYYYYYYYYYYyk
    kyYmmYYmmYYmmYyk
    kyYYmmYYmmYYmmyk
    kywwwwwwwwwwwwyk
    kyYmmYYmmYYmmYyk
    kyYYmmYYmmYYmmyk
    kyYYYYYYYYYYYYyk
    .kyYYYYYYYYYYyk.
    ..kkyYYYYYYykk..
    ....kkkkkkkk....
  `, {
    k: '#6b4a10', y: '#e8a81e', Y: '#ffd868', m: '#c0762a', w: '#fff6d8'
  });

  /* ---------------------------------------------------------------
     BLÖCKE
     --------------------------------------------------------------- */

  P.def('qblock', `
    kkkkkkkkkkkkkkkk
    kwwyyyyyyyyyyook
    kwyyyyyyyyyyyyok
    kyyyyyddddyyyyok
    kyyyydyyyydyyyok
    kyyyyyyyyddyyyok
    kyyyyyyyddyyyyok
    kyyyyyyddyyyyyok
    kyyyyyyddyyyyyok
    kyyyyyyyyyyyyyok
    kyyyyyyddyyyyyok
    kyyyyyyddyyyyyok
    kyyyyyyyyyyyyyok
    kyyyyyyyyyyyyyok
    kyyooooooooooook
    kkkkkkkkkkkkkkkk
  `, { k: '#5e3a10', y: '#ffc23c', o: '#d98a1e', w: '#fff3c8', d: '#7d4a12' });

  P.def('qblock_used', `
    kkkkkkkkkkkkkkkk
    kooooooooooooook
    kooooooooooooook
    koOOOOOOOOOOOOok
    koOOOOOOOOOOOOok
    koOOOOOOOOOOOOok
    koOOOOOOOOOOOOok
    koOOOOOOOOOOOOok
    koOOOOOOOOOOOOok
    koOOOOOOOOOOOOok
    koOOOOOOOOOOOOok
    koOOOOOOOOOOOOok
    koOOOOOOOOOOOOok
    kooooooooooooook
    kooooooooooooook
    kkkkkkkkkkkkkkkk
  `, { k: '#4a2c0c', o: '#a8742c', O: '#8a5c1e' });

  /* Kekskiste. Zerbricht beim Bauch-Stampfer. */
  P.def('kiste', `
    kkkkkkkkkkkkkkkk
    knnnnnnnnnnnnnnk
    knNnnnnnnnnnnNnk
    knnkkkkkkkkkknnk
    knnkccccccccknnk
    knnkcbccccbcknnk
    knnkcccbccccknnk
    knnkcbcccccbknnk
    knnkccccbcccknnk
    knnkcbccccccknnk
    knnkccccccbcknnk
    knnkccccccccknnk
    knnkkkkkkkkkknnk
    knNnnnnnnnnnnNnk
    knnnnnnnnnnnnnnk
    kkkkkkkkkkkkkkkk
  `, { k: '#3a2410', n: '#b07a3a', N: '#7d5224', c: '#d8a05a', b: '#5e3a1e' });

  /* Sofa-Kissen als Sprungfeder. */
  P.def('feder', `
    ..kkkkkkkkkkkk..
    .kppppppppppppk.
    kpwpppppppppPpk.
    kppppppppppppppk
    kppppppppppppppk
    kPPPPPPPPPPPPPPk
    .kPPPPPPPPPPPPk.
    ..kkkkkkkkkkkk..
    ...kk......kk...
    ...kk......kk...
    ...kk......kk...
    ...kk......kk...
    ...kk......kk...
    ..kkkk....kkkk..
  `, { k: '#3a0f22', p: '#ff7aa8', P: '#c94a78', w: '#ffc4d8' });

  /* Schwebendes Tablett. */
  P.def('tablett', `
    kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
    kmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk
    kmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk
    kMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMk
    .kkMMMMMMMMMMMMMMMMMMMMMMMMMMkk.
    ...kkkkkkkkkkkkkkkkkkkkkkkkkk...
  `, { k: '#1b1220', m: '#c4cada', M: '#7c8399' });

  /* Gabeln statt Stacheln. Küche ist gefährlich. */
  P.def('gabel', `
    .m.m.m..
    kmkmkmk.
    kmkmkmk.
    kmkmkmk.
    kmmmmmk.
    kmmMmmk.
    .kmmmk..
    .kmMmk..
    .kmmmk..
    .kmMmk..
    .kmmmk..
    .kmMmk..
    .kmmmk..
    .kmMmk..
    .kmmmk..
    .kkkkk..
  `, { k: '#1b1220', m: '#c8cede', M: '#8189a0' });

  /* ---------------------------------------------------------------
     DEKO / ZIELE
     --------------------------------------------------------------- */

  /* Der Riesen-Honigtopf: das Ziel jedes Levels. */
  P.def('ziel', `
    .......kkkkkkkkkk.......
    ......kmmmmmmmmmmk......
    .....kmmmmmmmmmmmmk.....
    .....kMMMMMMMMMMMMk.....
    ....kkkkkkkkkkkkkkkk....
    ...kyyyyyyyyyyyyyyyyk...
    ..kyYyyyyyyyyyyyyyyyyk..
    .kyYyyyyyyyyyyyyyyyyyyk.
    kyYyyyyyyyyyyyyyyyyyyyyk
    kyYyyyyyyyyyyyyyyyyyyyyk
    kyYyyyyyyyoooyyyyyyyyyyk
    kyyyyyyyyoooooyyyyyyyyyk
    kyyyyyyoooooooooyyyyyyyk
    kyyyyoooooooooooooyyyyyk
    kyyoooooooooooooooooyyyk
    kyoooooooooooooooooooyyk
    kyooooooooooooooooooooyk
    kooooooooooooooooooooook
    kooooooooooooooooooooook
    kooooooooooooooooooooook
    kyooooooooooooooooooooyk
    .kooooooooooooooooooook.
    ..kooooooooooooooooook..
    ...kkooooooooooooookk...
    ....kkkkkkkkkkkkkkkk....
    .....kMMMMMMMMMMMMk.....
  `, {
    k: '#3a2410', y: '#ffc23c', Y: '#ffe9a8', o: '#e08a1e',
    m: '#a8763c', M: '#6b4522'
  });

  /* Checkpoint: ein Sofa. Yusuf braucht einfach ab und zu ein Nickerchen. */
  P.def('sofa', `
    ..kkkkkkkkkkkkkkkkkkkk..
    .kcccccccccccccccccccck.
    kcccccccccccccccccccccck
    kccCCccccccccccccccCCcck
    kcckppppppppppppppppkcck
    kcckppppppppppppppppkcck
    kcckppppppppppppppppkcck
    kcccccccccccccccccccccck
    kcCCCCCCCCCCCCCCCCCCCCck
    kcccccccccccccccccccccck
    kcccccccccccccccccccccck
    .kcccccccccccccccccccck.
    .kCCCCCCCCCCCCCCCCCCCCk.
    ..kkk..............kkk..
    ..kCk..............kCk..
    ..kkk..............kkk..
  `, { k: '#2a1020', c: '#8a4a6a', C: '#5e2f48', p: '#ffd257' });

  /* Sofa mit Honig-Fahne — Checkpoint aktiviert. */
  P.def('sofa_on', `
    ..kkkkkkkkkkkkkkkkkkkk..
    .kcccccccccccccccccccck.
    kcccccccccccccccccccccck
    kccCCccccccccccccccCCcck
    kcckyyyyyyyyyyyyyyyykcck
    kcckyYYYYYYYYYYYYYYykcck
    kcckyyyyyyyyyyyyyyyykcck
    kcccccccccccccccccccccck
    kcCCCCCCCCCCCCCCCCCCCCck
    kcccccccccccccccccccccck
    kcccccccccccccccccccccck
    .kcccccccccccccccccccck.
    .kCCCCCCCCCCCCCCCCCCCCk.
    ..kkk..............kkk..
    ..kCk..............kCk..
    ..kkk..............kkk..
  `, { k: '#2a1020', c: '#8a4a6a', C: '#5e2f48', y: '#ffc23c', Y: '#fff0b8' });

  P.def('wolke', `
    ........kkkkkk............
    ......kkwwwwwwkk..........
    .....kwwwwwwwwwwk.........
    ...kkwwwwwwwwwwwwkkkk.....
    ..kwwwwwwwwwwwwwwwwwwkk...
    .kwwwwwwwwwwwwwwwwwwwwwk..
    kwwwwwwwwwwwwwwwwwwwwwwwk.
    kwwwwwwwwwwwwwwwwwwwwwwwk.
    kWWWWWWWWWWWWWWWWWWWWWWWk.
    .kkkkkkkkkkkkkkkkkkkkkkk..
  `, { k: '#c8d8f0', w: '#ffffff', W: '#e0e8f8' });

  P.def('bienenstock', `
    ......kkkkkkk.......
    ....kkyyyyyyykk.....
    ...kyyyyyyyyyyyk....
    ...kYYYYYYYYYYYk....
    ..kyyyyyyyyyyyyyk...
    ..koooooooooooook...
    .kyyyyyyyyyyyyyyyk..
    .kYYYYYYYYYYYYYYYk..
    .koooooooooooooook..
    kyyyyyyyyyyyyyyyyyk.
    kYYYYYYYbbbYYYYYYYk.
    kyyyyyybbbbbyyyyyyk.
    koooooobbbbbooooook.
    kyyyyyyybbbyyyyyyyk.
    kYYYYYYYYYYYYYYYYYk.
    koooooooooooooooook.
    .kyyyyyyyyyyyyyyyk..
    .kYYYYYYYYYYYYYYYk..
    ..koooooooooooook...
    ..kkkkkkkkkkkkkkk...
    .....kkkk.kkkk......
    .....kkkk.kkkk......
  `, { k: '#5e3a18', y: '#e8b44a', Y: '#ffd88a', o: '#b8802c', b: '#2a1a0c' });

  P.def('hantel', `
    .kkkk..........kkkk...
    kmmmmk........kmmmmk..
    kmMMmk........kmMMmk..
    kmMMmkkkkkkkkkkmMMmk..
    kmMMmkMMMMMMMMkmMMmk..
    kmMMmkMMMMMMMMkmMMmk..
    kmMMmkkkkkkkkkkmMMmk..
    kmMMmk........kmMMmk..
    kmmmmk........kmmmmk..
    .kkkk..........kkkk...
  `, { k: '#1b1220', m: '#8a93ab', M: '#5b6376' });

  /* ---------------------------------------------------------------
     LEVEL 6 — Mustang, Stilbruch, Siegerehrung
     --------------------------------------------------------------- */

  /* Der Mustang. Yusuf faehrt, Huseyin sitzt hinten und sagt nichts. */
  P.def('mustang', `
    ..........kkkkkkkkkkkkk.................
    .........kkwwwwwwwwwwwkk................
    ........kkwwwwwwwwwwwwwkk...............
    .......kkwwwwwwwwwwwwwwwkk..............
    kkkkkkkkrrrrrrrrrrrrrrrrrkkkkkkkkkkkkkkk
    krrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrllk
    krrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrllk
    kRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRk
    kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
    ....kkkkkk.............kkkkkk...........
    ...kttttttk...........kttttttk..........
    ..kttTTTTttk.........kttTTTTttk.........
    ..kttTTTTttk.........kttTTTTttk.........
    ...kttttttk...........kttttttk..........
    ....kkkkkk.............kkkkkk...........
  `, {
    k: '#1b1220', r: '#d8342e', R: '#8f1f1c', w: '#8ec8e8',
    l: '#fff0a8', t: '#241f28', T: '#b9c1d6'
  });

  /* ESAT — bester Kollege. Steht bei der Siegerehrung daneben. */
  P.def('esat', `
    ....kkkkkkkk....
    ..kkhhhhhhhhkk..
    .khhhhhhhhhhhhk.
    .khhssssssssHhk.
    .khssssssssssdk.
    .khsgwsssswgsdk.
    .khssssdssssssk.
    .khsskmmmmkssdk.
    ..kdssssssssdk..
    ...kddddddddk...
    .....kddddk.....
    ..kkkkkkkkkkkk..
    .kppppppppppppk.
    kppppppppppppppk
    kppPPPPPPPPPPppk
    kppPPPPPPPPPPppk
    kppppppppppppppk
    kppppppppppppppk
    .kbbbbbbbbbbbbk.
    .kbbbbbkkbbbbbk.
    .kbbbk....kbbbk.
    .knnnk....knnnk.
    .kkkkk....kkkkk.
  `, {
    k: '#1b1220', h: '#2b1d14', H: '#46301d', s: '#f0b487', d: '#ce8f66',
    w: '#ffffff', g: '#5a8ad8', m: '#8e2f2c',
    p: '#3aa88a', P: '#26775f', b: '#2f3344', n: '#d8d4cc'
  });

  /* Shisha. Steht bei der Siegerehrung bereit. */
  P.def('shisha', `
    .....kk.....
    ....kmmk....
    ....kmmk....
    ...kmmmmk...
    ...kbbbbk...
    ....kmmk....
    ....kmmk....
    ....kmmk....
    ....kmmk....
    ....kmmk....
    ...kmmmmk...
    ..kmmmmmmk..
    ..kwwwwwwk..
    .kwwwwwwwwk.
    .kwwwwwwwwk.
    .kwwwwwwwwk.
    ..kwwwwwwk..
    ..kmmmmmmk..
    ...kkkkkk...
  `, {
    k: '#1b1220', m: '#c8a24a', b: '#5e3a18', w: '#8ad8e8'
  });

  /* Texas Barbecue Brisket. Verdient. */
  P.def('brisket', `
    ................
    ....kkkkkkkk....
    ..kkmmmmmmmmkk..
    .kmmMMmmmmMMmmk.
    .kmMMMMmmMMMMmk.
    kmmMMMMMMMMMMmmk
    kmMMMMMMMMMMMMmk
    kmmMMMMMMMMMMmmk
    .kmmMMMMMMMMmmk.
    ..kkmmmmmmmmkk..
    .kwwwwwwwwwwwwk.
    kwwwwwwwwwwwwwwk
    .kWWWWWWWWWWWWk.
    ..kkkkkkkkkkkk..
  `, {
    k: '#2a1810', m: '#8f3a1e', M: '#5e2410', w: '#e8e4dc', W: '#b8b4ac'
  });

  /* Strassensperre, die der Mustang wegraeumt. */
  P.def('sperre', `
    kkkkkkkkkkkkkkkk
    kyyyykkkkyyyykkk
    kyyyykkkkyyyykkk
    kkkkyyyykkkkyyyk
    kkkkyyyykkkkyyyk
    kyyyykkkkyyyykkk
    kyyyykkkkyyyykkk
    kkkkyyyykkkkyyyk
    kkkkyyyykkkkyyyk
    kyyyykkkkyyyykkk
    kyyyykkkkyyyykkk
    kkkkyyyykkkkyyyk
    kkkkyyyykkkkyyyk
    kyyyykkkkyyyykkk
    kyyyykkkkyyyykkk
    kkkkkkkkkkkkkkkk
  `, { k: '#3a3a44', y: '#ffb43c' });

  /* ---------------------------------------------------------------
     LETZTER KAMPF — Esats Arsenal
     --------------------------------------------------------------- */

  /* Ein KI-Agent. Esat laesst sie scharenweise spawnen. */
  P.def('agent', `
    ...kkkkkkkk...
    .kkwwwwwwwwkk.
    kwwwwwwwwwwwwk
    kwwkkwwwwkkwwk
    kwwkkwwwwkkwwk
    kwwwwwwwwwwwwk
    kwwwkkkkkkwwwk
    kwwwwwwwwwwwwk
    .kkwwwwwwwwkk.
    ..kkkkkkkkkk..
    ....k....k....
    ...kk....kk...
  `, { k: '#0c2b22', w: '#2fd39e' });

  P.def('agent2', `
    ...kkkkkkkk...
    .kkwwwwwwwwkk.
    kwwwwwwwwwwwwk
    kwwwwwwwwwwwwk
    kwwkkkwwkkkwwk
    kwwwwwwwwwwwwk
    kwwwwkkkkwwwwk
    kwwwwwwwwwwwwk
    .kkwwwwwwwwkk.
    ..kkkkkkkkkk..
    ...kk....kk...
    ....k....k....
  `, { k: '#0c2b22', w: '#2fd39e' });

  /* Jet. Fliegt ueber die Arena und laesst etwas fallen. */
  P.def('jet', `
    .................kkkkkk.........
    ...............kkwwwwwwkk.......
    .kkkkk........kkwwwwwwwwwkk.....
    kccwwwkkkkkkkkwwwwrrrwwwwwwkkk..
    kccwwwwwwwwwwwwwwwrrrwwwwwwwwwk.
    kccwwwkkkkkkkkwwwwrrrwwwwwwkkk..
    .kkkkk........kkwwwwwwwwwkk.....
    ...............kkwwwwwwkk.......
    .................kkkkkk.........
  `, {
    k: '#1b1220', w: '#c8cede', W: '#8189a0', r: '#e03a30', c: '#8ec8e8'
  });

  /* Was der Jet fallen laesst. */
  P.def('bombe', `
    ...kk...
    ..kwwk..
    .kwwwwk.
    kwwwwwwk
    kwWwwwWk
    kwwwwwwk
    kwwwwwwk
    kwwwwwwk
    .kwwwwk.
    ..kkkk..
    .k.kk.k.
    k..kk..k
  `, { k: '#1b1220', w: '#6f7791', W: '#454b5e' });

  /* Erfans Reiskorn. Kommt selten allein. */
  P.def('reis', `
    .kkkk.
    kwwwwk
    kwWWwk
    kwwwwk
    .kkkk.
  `, { k: '#8a8478', w: '#f8f6ee', W: '#d8d4c6' });

  /* Mirkans Fragen. Sie kommen als Geschoss. */
  P.def('frage', `
    ..kkkkkk..
    .kyyyyyyk.
    kyykkkkyyk
    kykk..kkyk
    ....kkyyk.
    ...kkyyk..
    ..kkyyk...
    ..kyyk....
    ..kkkk....
    ..........
    ..kyyk....
    ..kkkk....
  `, { k: '#1b2436', y: '#b8c0d4' });

  /* MIRKAN. Haar nach oben, Fade an den Seiten, Vollbart. */
  P.def('mirkan_head', `
    ....kkkkkk....
    ..kkhhhhhhkk..
    .khhhhhhhhhhk.
    khhHhhhhhhHhhk
    kkhssssssssHhk
    .khssssssssshk
    .khsgwsswgsdk.
    .khsssdssssdk.
    .khjjjjjjjjdk.
    .khjkmmmmkjdk.
    .kdjjjjjjjjdk.
    ..kdjjjjjjdk..
    ...kddddddk...
  `, {
    k: '#12101a', h: '#1e1712', H: '#382a20', j: '#241c15',
    s: '#e8ac7e', d: '#c2865c', w: '#ffffff', g: '#3a2a1a', m: '#7d2724'
  });

  /* Sein weisser Mercedes. */
  P.def('mercedes', `
    .........kkkkkkkkkkkkkkk........
    ........kkwwwwwwwwwwwwwkk.......
    .......kkwwwwwwwwwwwwwwwkk......
    ......kkwwwwwwwwwwwwwwwwwkk.....
    kkkkkkkkssssssssssssssssssskkkkk
    kssssssssssssssssssssssssssssllk
    kssssssssssssssssssssssssssssllk
    kSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSk
    kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
    ....kkkkkk.............kkkkkk...
    ...kttttttk...........kttttttk..
    ..kttTTTTttk.........kttTTTTttk.
    ..kttTTTTttk.........kttTTTTttk.
    ...kttttttk...........kttttttk..
    ....kkkkkk.............kkkkkk...
  `, {
    k: '#12141c', s: '#eceef2', S: '#b2b8c2', w: '#5d7a92',
    l: '#fff0a8', t: '#241f28', T: '#c8cede'
  });

  /* Erfans schwarzer CLA: flaches Coupe-Dach. */
  P.def('cla', `
    ...........kkkkkkkkkkk............
    .........kkwwwwwwwwwwwkkk.........
    .......kkwwwwwwwwwwwwwwwwkk.......
    .....kkwwwwwwwwwwwwwwwwwwwwkk.....
    kkkkksssssssssssssssssssssssskkkkk
    kssssssssssssssssssssssssssssssllk
    kcsssssssssssssssssssssssssssssllk
    kSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSk
    kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
    ....kkkkkk..............kkkkkk....
    ...kttttttk............kttttttk...
    ..kttTTTTttk..........kttTTTTttk..
    ..kttTTTTttk..........kttTTTTttk..
    ...kttttttk............kttttttk...
    ....kkkkkk..............kkkkkk....
  `, {
    k: '#060608', s: '#25262e', S: '#111116', w: '#3e5068',
    l: '#fff0a8', c: '#aeb6c6', t: '#1c1a20', T: '#9aa2b4'
  });

  /* Lennarts silberne E-Klasse: kantiger, mit Mittelsaeule. */
  P.def('eklasse', `
    .........kkkkkkkkkkkkkkk..........
    ........kwwwwwwkwwwwwwwwk.........
    .......kwwwwwwwkwwwwwwwwwk........
    ......kwwwwwwwwkwwwwwwwwwwk.......
    kkkkkksssssssssssssssssssssskkkkkk
    kssssssssssssssssssssssssssssssllk
    kccccccccccccccccccccccccccccccllk
    kSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSk
    kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
    ....kkkkkk..............kkkkkk....
    ...kttttttk............kttttttk...
    ..kttTTTTttk..........kttTTTTttk..
    ..kttTTTTttk..........kttTTTTttk..
    ...kttttttk............kttttttk...
    ....kkkkkk..............kkkkkk....
  `, {
    k: '#14161c', s: '#c4c9d2', S: '#868d9a', w: '#46607a',
    l: '#fff0a8', c: '#eef2f8', t: '#1c1a20', T: '#d4d9e4'
  });

  /* Erfans Kopf fuers Autofenster: Glatze, Vollbart, Kinn frei. */
  P.def('erfan_head', `
    ....kkkkkk....
    ..kksssssskk..
    .kssssssssssk.
    ksssssssssssHk
    kssssssssssssk
    .kssgwsswgsdk.
    .kjssssdsssjk.
    .kjjssssssjjk.
    .kjjkmmmmkjjk.
    .kjjjsssjjjdk.
    ..kjjsssjjdk..
    ...kjdddjdk...
    ....kkkkkk....
  `, {
    k: '#12101a', s: '#d9a276', d: '#b5805a', H: '#f2c9a0', j: '#1d1712',
    g: '#2a2016', w: '#ffffff', m: '#7d2724'
  });

  /* Lennarts Kopf: kurze braune Haare, breiter Nacken. */
  P.def('lennart_head', `
    ....kkkkkk....
    ..kkhhhhhhkk..
    .khhhhhhhhhhk.
    khhhhhhhhhhhhk
    khsssssssssshk
    .ksgwsssswgsk.
    .kssssdssssdk.
    .kssssssssssk.
    .ksskmmmmkssk.
    ..kssssssssk..
    ...kddddddk...
  `, {
    k: '#12101a', h: '#6a4424', s: '#f0c09a', d: '#cf9a74',
    g: '#2a3a5a', w: '#ffffff', m: '#8a3030'
  });

  /* Polizei. Blaue Uniform, Muetze, Schnurrbart, Strafzettel-Block. */
  var POLIZEI_PAL = {
    k: '#10121c', b: '#2c4a8c', B: '#1e3566', y: '#22242c', s: '#f0c09a',
    d: '#cf9a74', g: '#1a1a1a', m: '#5a3a28', w: '#ffd257', n: '#1f2a44'
  };
  P.def('polizei', `
    ...kkkkkkkk...
    ..kbbbbbbbbk..
    ..kbbbwwbbbk..
    .kkkkkkkkkkkk.
    ..kssssssssk..
    ..ksgsssgsdk..
    ..kssssssssk..
    ..kssmmmmssk..
    ...kssssssk...
    ..kkbbbbbbkk..
    .kbbbbwbbbbbk.
    kbbbbbbbbbbbbk
    kbBbbbbbbbbBbk
    ksbbbbbbbbbbsk
    kskbbbbbbbbksk
    .kkyyyyyyyykk.
    ..knnnnnnnnk..
    ..knnnnnnnnk..
    ..knnnkknnnk..
    ..knnnkknnnk..
    ..knnnkknnnk..
    ..knnk..knnk..
    .kkkkk..kkkkk.
    .kkkkk..kkkkk.
  `, POLIZEI_PAL);
  P.def('polizei2', `
    ...kkkkkkkk...
    ..kbbbbbbbbk..
    ..kbbbwwbbbk..
    .kkkkkkkkkkkk.
    ..kssssssssk..
    ..ksgsssgsdk..
    ..kssssssssk..
    ..kssmmmmssk..
    ...kssssssk...
    ..kkbbbbbbkk..
    .kbbbbwbbbbbk.
    kbbbbbbbbbbbbk
    kbBbbbbbbbbBbk
    ksbbbbbbbbbbsk
    kskbbbbbbbbksk
    .kkyyyyyyyykk.
    ..knnnnnnnnk..
    ..knnnnnnnnk..
    ..knnnkknnnk..
    .knnnk..knnnk.
    .knnk....knnk.
    .knnk....knnk.
    kkkkk....kkkkk
    kkkkk....kkkkk
  `, POLIZEI_PAL);

  /* Strafzettel. Fliegt im Bogen. */
  P.def('zettel', `
    kkkkkkkkkk
    kwwwwwwwwk
    kwkkkkwwwk
    kwwwwwwwwk
    kwkkkkkkwk
    kwwwwwwwwk
    kkkkkkkkkk
  `, { k: '#3a3a48', w: '#f4f4ee' });

  /* ---------------------------------------------------------------
     LEVEL 8 — der Morgen danach: Handy, Hand und sehr viel Essen
     --------------------------------------------------------------- */

  P.palette('food', {
    k: '#3a2412',
    b: '#e8b55c', B: '#c98f3e', w: '#fff4d8', l: '#6fbf4a',
    m: '#8a4a28', M: '#5e3018', c: '#ffcf4a', q: '#7d2318',
    r: '#e0483c', R: '#a72e26', y: '#ffd257', Y: '#e0a81e',
    n: '#d8a05a', N: '#a8763c', o: '#f0e0d0', s: '#f4bd91',
    z: '#2a2030', Z: '#4a4258', f: '#f2f2ee'
  });

  /* Beefy — der grosse Burger. */
  P.def('food_beefy', `
    ..kkkkkkkkkkkk..
    .kbbbbbbbbbbbbk.
    kbbwbbbwbbbwbbbk
    kbbbbbbbbbbbbbbk
    kllllllllllllllk
    kmmmmmmmmmmmmmmk
    kcccccccccccccck
    kBBBBBBBBBBBBBBk
    .kkkkkkkkkkkkkk.
  `, 'food');

  /* Rippen-Burger. Sauce bis zum Ellenbogen. */
  P.def('food_rippen', `
    ..kkkkkkkkkkkk..
    .kbbbbbbbbbbbbk.
    kbbbbbbbbbbbbbbk
    kqqqqqqqqqqqqqqk
    kmqmqmqmqmqmqmqk
    kqqqqqqqqqqqqqqk
    kooooooooooooook
    kBBBBBBBBBBBBBBk
    .kkkkkkkkkkkkkk.
  `, 'food');

  /* Chipstuete. */
  P.def('food_chips', `
    .kkkkkkkkkk.
    kwwwwwwwwwwk
    kwrrrrrrrrwk
    kwrwwwwwwrwk
    kwrwyyyywrwk
    kwrwyyyywrwk
    kwrwwwwwwrwk
    kwrrrrrrrrwk
    kwwwwwwwwwwk
    kwrrrrrrrrwk
    kwwwwwwwwwwk
    .kkkkkkkkkk.
  `, 'food');

  /* Pommes in der roten Schachtel. */
  P.def('food_pommes', `
    ...yy..yy.....
    ..yy..yy..yy..
    ..yy..yy..yy..
    .kkkkkkkkkkkk.
    .krrrrrrrrrrk.
    .krwwwwwwwwrk.
    .krrrrrrrrrrk.
    .krrrrrrrrrrk.
    ..krrrrrrrrk..
    ..kkkkkkkkkk..
  `, 'food');

  /* Tafel Schokolade. */
  P.def('food_schoko', `
    kkkkkkkkkkkkkkkk
    kMMMMMMMMMMMMMMk
    kMnnMnnMnnMnnMMk
    kMnnMnnMnnMnnMMk
    kMMMMMMMMMMMMMMk
    kMnnMnnMnnMnnMMk
    kMnnMnnMnnMnnMMk
    kMMMMMMMMMMMMMMk
    kffffffffffffffk
    kkkkkkkkkkkkkkkk
  `, 'food');

  /* Nuggets in der Schachtel. */
  P.def('food_nuggets', `
    ...nnn...nnn....
    ..nnnnn.nnnnn...
    ..nnnnn.nnnnn...
    kkkkkkkkkkkkkkkk
    krrrrrrrrrrrrrrk
    krrwwwwwwwwwwrrk
    krrwwwwwwwwwwrrk
    krrrrrrrrrrrrrrk
    .kkkkkkkkkkkkkk.
    ..kkkkkkkkkkkk..
  `, 'food');

  /* Ein Apfel. In diesem Spiel eine Bedrohung. */
  P.def('food_apfel', `
    .....kz.....
    ....kzlk....
    ..kkrrrrkk..
    .krrrrrrrrk.
    krrrrrrrrrrk
    krrwrrrrrrrk
    krwrrrrrrrrk
    krrrrrrrrrrk
    krrrrrrrrrrk
    .krrrrrrrrk.
    ..kkrrrrkk..
    ....kkkk....
  `, 'food');

  /* Das Handy. Erfan ruft an, und zwar hartnaeckig. */
  P.def('handy', `
    kkkkkkkkkk
    kZZZZZZZZk
    kZffffffZk
    kZffffffZk
    kZffffffZk
    kZffffffZk
    kZffffffZk
    kZffffffZk
    kZZZZZZZZk
    kZZkkkkZZk
    kkkkkkkkkk
  `, 'food');

  /* Yusufs Hand — damit zieht man das Essen zum Mund. */
  P.def('hand', `
    ...kk.......
    ..kssk......
    ..kssk.kk...
    ..kssk.ksk..
    ..ksskkkssk.
    .kkssssssssk
    .ksssssssssk
    .ksssssssssk
    .ksssssssssk
    ..kssssssssk
    ..kssssssskk
    ...kkkkkkkk.
  `, 'food');

  /* ---------------------------------------------------------------
     LEVEL 9 — Sparmarkt: Einkaufswagen, Gemuese, Wurst, Alkohol
     --------------------------------------------------------------- */

  P.palette('markt', {
    k: '#2a2a34',
    m: '#c8ccd6', M: '#8a8e98', f: '#f2f4f8',
    r: '#e0483c', R: '#a72e26', g: '#4aa832', G: '#2d6b1f',
    y: '#ffd257', Y: '#e0a81e', o: '#ff8a2a',
    b: '#5c7fd8', B: '#36508f', w: '#ffffff', W: '#b9c2d0',
    n: '#b07a3a', N: '#7d5224', s: '#f4bd91', d: '#d1946b',
    p: '#f08aa8', P: '#c05878', z: '#6fbf4a', c: '#a8e0f0',
    v: '#8fd8ff', x: '#3a5a3a'
  });

  /* Einkaufswagen. Rollt, wenn er dich sieht. */
  P.def('wagen', `
    k......kkkkkkkkkkk...
    kk....kmmmmmmmmmmk...
    .kk..kmMmMmMmMmMmk...
    ..kkkkmmmmmmmmmmmk...
    ...kmmMmMmMmMmMmMk...
    ...kmmmmmmmmmmmmmk...
    ...kMmMmMmMmMmMmMk...
    ...kmmmmmmmmmmmmk....
    ...kkkkkkkkkkkkk.....
    ...k...........k.....
    ..kkk.........kkk....
    .kMMMk.......kMMMk...
    .kMMMk.......kMMMk...
    ..kkk.........kkk....
  `, 'markt');

  P.def('wagen2', `
    k......kkkkkkkkkkk...
    kk....kmmmmmmmmmmk...
    .kk..kmMmMmMmMmMmk...
    ..kkkkmmmmmmmmmmmk...
    ...kmmMmMmMmMmMmMk...
    ...kmmmmmmmmmmmmmk...
    ...kMmMmMmMmMmMmMk...
    ...kmmmmmmmmmmmmk....
    ...kkkkkkkkkkkkk.....
    ...k...........k.....
    ..kkk.........kkk....
    .kMkMk.......kMkMk...
    .kMkMk.......kMkMk...
    ..kkk.........kkk....
  `, 'markt');

  /* Wuetende Tomate aus der Gemueseabteilung. */
  P.def('tomate', `
    ....xx....
    ..xxzzxx..
    ...kkkk...
    ..krrrrk..
    .krrrrrrk.
    krrwrrwrrk
    krrrkkrrrk
    krrrrrrrrk
    .kRRRRRRk.
    ..kkkkkk..
  `, 'markt');

  P.def('tomate2', `
    ....xx....
    ..xxzzxx..
    ...kkkk...
    ..krrrrk..
    .krrrrrrk.
    krwrrrrwrk
    krrkkkkrrk
    krrrrrrrrk
    .kRRRRRRk.
    ..kkkkkk..
  `, 'markt');

  /* Wurst aus der Fleischtheke. Laeuft. Irgendwie. */
  P.def('wurst', `
    ..kkkkkkkkkk..
    .kRRRRRRRRRRk.
    krRRwRRRwRRRk.
    krRRkRRRkRRRk.
    krRRRRRRRRRRk.
    .kRRRRRRRRRRk.
    ..kkkkkkkkkk..
    ...k......k...
    ..kkk....kkk..
  `, 'markt');

  P.def('wurst2', `
    ..kkkkkkkkkk..
    .kRRRRRRRRRRk.
    krRRwRRRwRRRk.
    krRRkRRRkRRRk.
    krRRRRRRRRRRk.
    .kRRRRRRRRRRk.
    ..kkkkkkkkkk..
    ..k........k..
    .kkk......kkk.
  `, 'markt');

  /* Wodkaflasche — Alex' Lieblingswurfgeschoss. */
  P.def('wodka', `
    ..kkk..
    ..kwk..
    ..kwk..
    .kkwkk.
    .kwwwk.
    kwvvvwk
    kwvvvwk
    kwvvvwk
    kwfffwk
    kwvvvwk
    kwvvvwk
    .kwwwk.
    ..kkk..
  `, 'markt');

  /* Bierdose. */
  P.def('bier', `
    kkkkkkk
    kMMMMMk
    kyyyyyk
    kyrrryk
    kyyyyyk
    kMMMMMk
    kMMMMMk
    kkkkkkk
  `, 'markt');

  /* Kotze. Wir haben es versucht, schoen zu machen. */
  P.def('kotze', `
    ..zzz.....
    .zzggzz...
    zzgggggz..
    .zggzggz..
    ..zzzzz...
  `, 'markt');

  /* Preisschild fuer die Regale. */
  P.def('preis', `
    kkkkkkkkkk
    kyyyyyyyyk
    kyrrrrrryk
    kyyyyyyyyk
    kkkkkkkkkk
  `, 'markt');

  /* Kasse am Ausgang. */
  P.def('kasse', `
    ......kkkkkkkk......
    .....kmmmmmmmmk.....
    ....kmffffffffmk....
    ....kmfvvvvvvfmk....
    ....kmffffffffmk....
    .....kmmmmmmmmk.....
    kkkkkkkkkkkkkkkkkkkk
    kMMMMMMMMMMMMMMMMMMk
    kMkkkkkkkkkkkkkkkkMk
    kMkmmmmmmmmmmmmmmkMk
    kMkkkkkkkkkkkkkkkkMk
    kMMMMMMMMMMMMMMMMMMk
    kkkkkkkkkkkkkkkkkkkk
  `, 'markt');

  /* Einkaufstuete fuer den Heimweg. */
  P.def('tuete', `
    .kk....kk.
    kkkkkkkkkk
    kyyyyyyyyk
    kyzzyyzzyk
    kyyyyyyyyk
    kyrryyrryk
    kyyyyyyyyk
    kyyyyyyyyk
    kkkkkkkkkk
  `, 'markt');

  /* ---------------------------------------------------------------
     LEVEL 11 — Broke und die Mikas
     --------------------------------------------------------------- */

  /* Ein Mika. Brokes kleiner Kollege — und davon gibt es viele.
     Schwarze Haare mit Seitenscheitel, duenner Schnurrbart, schwarzes Shirt. */
  var MIKA_PAL = {
    k: '#0c0a10', h: '#231c24', H: '#443a46', s: '#e4b088', d: '#c8926a',
    g: '#1e1614', w: '#ffffff', j: '#2a1e18', m: '#8a3a34',
    y: '#1c1c24', b: '#2e3448', n: '#e8e8ee'
  };
  P.def('mika', `
    ...kkkkk...
    ..khhhhhk..
    .khhhHHhhk.
    .khhhhhhhk.
    .ksshhhhsk.
    .ksgwsgwsk.
    .ksssdsssk.
    .kssjjjssk.
    .ksskmkssk.
    ..kssssdk..
    .kyyyyyyyk.
    kyyyyyyyyyk
    ksyyyyyyysk
    .kbbbbbbbk.
    .kbbk.kbbk.
    .knnk.knnk.
  `, MIKA_PAL);
  P.def('mika2', `
    ...kkkkk...
    ..khhhhhk..
    .khhhHHhhk.
    .khhhhhhhk.
    .ksshhhhsk.
    .ksgwsgwsk.
    .ksssdsssk.
    .kssjjjssk.
    .ksskmkssk.
    ..kssssdk..
    .kyyyyyyyk.
    kyyyyyyyyyk
    ksyyyyyyysk
    .kbbbbbbbk.
    kbbk...kbbk
    knnk...knnk
  `, MIKA_PAL);

  /* ---------------------------------------------------------------
     LEVEL 12 — Downhill. Drei Fahrraeder, ein kaputtes.
     --------------------------------------------------------------- */

  var BIKE_ART = `
    .................kkkkk........
    ...................k..........
    .........kkkkk.....k..........
    ...........f.......kF.........
    .....kkkkk.ffffffffFFkkkk.....
    ...kktttttFkFFFFFFFFFFtttkk...
    ..kktt.T.tFkf....kkfFFT.ttkk..
    ..kt...T.F.tf....kf..FF...tk..
    .ktt...TF..tfk..fft..FF...ttk.
    .kt....TF...fk.fkt....FF...tk.
    .ktTTTTFFFFctff.ktTTTTFFTTTtk.
    .kt....T...FFc..kt....T....tk.
    .ktt...T...ttk.cktt...T...ttk.
    ..kt...T...tk....kt...T...tk..
    ..kktt.T.ttkk....kktt.T.ttkk..
    ...kktttttkk......kktttttkk...
    .....kkkkk..........kkkkk.....
  `;
  // Zweites Bild: die Speichen stehen schraeg, das Rad dreht sich
  var BIKE_ART2 = `
    .................kkkkk........
    ...................k..........
    .........kkkkk.....k..........
    ...........f.......kF.........
    .....kkkkk.ffffffffFFkkkk.....
    ...kktttttFkFFFFFFFFFFtttkk...
    ..kktt...tFkf....kkfFF..ttkk..
    ..ktT....FTtf....kfT.FF..Ttk..
    .ktt.T..FT.tfk..fft.TFF.T.ttk.
    .kt...T.F...fk.fkt...TFF...tk.
    .kt....FFFFctff.kt....FF...tk.
    .kt...T.T..FFc..kt...T.T...tk.
    .ktt.T...T.ttk.cktt.T...T.ttk.
    ..ktT.....Ttk....ktT.....Ttk..
    ..kktt...ttkk....kktt...ttkk..
    ...kktttttkk......kktttttkk...
    .....kkkkk..........kkkkk.....
  `;
  function bikePal(frame, frameDark) {
    return { k: '#15121a', t: '#2c2a30', T: '#8a8a96', o: '#c8c8d0',
             f: frame, F: frameDark, c: '#6a6a74' };
  }
  // Yusuf: honiggelb. Esat: tuerkis. Lennart: pink, natuerlich.
  P.def('bike', BIKE_ART, bikePal('#ffb43c', '#c87a1e'));
  P.def('bike2', BIKE_ART2, bikePal('#ffb43c', '#c87a1e'));
  P.def('bike_e', BIKE_ART, bikePal('#4ad8c8', '#1e8a86'));
  P.def('bike_e2', BIKE_ART2, bikePal('#4ad8c8', '#1e8a86'));
  P.def('bike_l', BIKE_ART, bikePal('#ff6fa8', '#b83a70'));
  P.def('bike_l2', BIKE_ART2, bikePal('#ff6fa8', '#b83a70'));

  /* Was von Lennarts Rad uebrig ist. */
  P.def('bike_kaputt', `
    ....................kk..
    ....kkkkk............kkk
    ......f.............k...
    .......f...........k....
    .......f.........ff.F...
    .......ff......ff...F...
    ...ffff..FFF.ff......F..
    .ff.........c........F..
    .............c........F.
  `, bikePal('#ff6fa8', '#b83a70'));

  /* Ein einzelnes Rad. Rollt davon. */
  P.def('rad', `
    ....kkkkk....
    ..kktttttkk..
    .kktt.T.ttkk.
    .kt...T...tk.
    ktt...T...ttk
    kt....T....tk
    ktTTTToTTTTtk
    kt....T....tk
    ktt...T...ttk
    .kt...T...tk.
    .kktt.T.ttkk.
    ..kktttttkk..
    ....kkkkk....
  `, bikePal('#ff6fa8', '#b83a70'));

  /* Dornbusch am Wegrand. Nicht reinfahren. */
  P.def('dornbusch', `
    ......x..x......
    ....kkkkkkkk....
    ..x.kgGgggGk.x..
    ..kkggglgggGkk..
    .kgGglgggGglgk..
    xkggggGgglgggkx.
    .kgglgggGgggGgk.
    .kGgggglgggglggk
    xkggGgggGglggGkx
    .kgglgggggggGgk.
    kgggGgglgGgggggk
    kgGgggggggglgGgk
    .kkgggGgggGgggk.
    ..kkkkkkkkkkkk..
    ....nn....nn....
    ....nn....nn....
  `, { k: '#12200c', g: '#2f6a22', G: '#1e4a16', l: '#6aa83c',
       x: '#e8dcb0', n: '#5a3a1e' });

  /* ---------------------------------------------------------------
     LEVEL 13 — Shawarma bei Hamza (libanesisch)
     --------------------------------------------------------------- */

  /* Falafel. Rollt los, sobald sie dich sieht. */
  var FALAFEL_PAL = { k: '#2a160a', n: '#b07a3a', N: '#8a5a24', c: '#d8a05a',
                      w: '#ffffff', e: '#1b1220', m: '#5a2a14' };
  P.def('falafel', `
    ....kkkk....
    ..kkcnnckk..
    .kcnnNnncnk.
    .knkknnkknk.
    knnwennwenNk
    kncnnnnnncnk
    knnnNnnnNnnk
    kNnnkmmmknnk
    .knnnnnnnck.
    .kNnnNnnnnk.
    ..kkcnnnkk..
    ....kkkk....
  `, FALAFEL_PAL);
  P.def('falafel2', `
    ....kkkk....
    ..kkcnnckk..
    .knncNnnnck.
    .knkknnkknk.
    knnwennwenNk
    knnnncnnnnck
    knnnNnnnNnnk
    kNnnkmmmknnk
    .knnnnnnnck.
    .kncnnnNnnk.
    ..kknnnckk..
    ....kkkk....
  `, FALAFEL_PAL);

  /* Peperoni. Scharf und schlecht gelaunt. Huepft. */
  var PEPERONI_PAL = { k: '#12200a', G: '#3a5a1a', l: '#5ec23a', g: '#3a9a28',
                       e: '#1b1220', m: '#6a1a14' };
  P.def('peperoni', `
    ....kk..
    ...kGk..
    ..kkGkk.
    .kllllk.
    .klelek.
    .kllllk.
    .klmmlk.
    .kglllk.
    .kgllgk.
    ..kgllk.
    ..kgglk.
    ...kglk.
    ...kgk..
    ....k...
  `, PEPERONI_PAL);
  P.def('peperoni2', `
    ....kk..
    ...kGk..
    ..kkGkk.
    .kllllk.
    .klelek.
    .kllllk.
    .kmmmmk.
    .kglllk.
    .kgllgk.
    ..kgllk.
    ..kgglk.
    ...kglk.
    ...kgk..
    ....k...
  `, PEPERONI_PAL);

  /* Fliegendes Fladenbrot. */
  var PITA_PAL = { k: '#5a3a1a', p: '#f0d8a0', P: '#d8b070', w: '#ffffff',
                   e: '#1b1220', m: '#8a3a1e' };
  P.def('pita', `
    ...kkkkkkkk...
    .kkppPppPppkk.
    kppppppppppppk
    kpPpweppwepPpk
    kppppppppppppk
    kpPppkmmkppPpk
    kppppppppppppk
    .kkppPppPppkk.
    ...kkkkkkkk...
  `, PITA_PAL);
  P.def('pita2', `
    ..............
    ...kkkkkkkk...
    .kkppPppPppkk.
    kpPpweppwepPpk
    kppppppppppppk
    kpPppkmmkppPpk
    .kkppPppPppkk.
    ...kkkkkkkk...
    ..............
  `, PITA_PAL);

  /* Shawarma im Papier. Heilt. */
  P.def('shawarma', `
    ......kkkk....
    ....kkmMmmk...
    ...kmmgmtmk...
    ..kpppppppmk..
    .kpppppppppk..
    kwwwwwwwwwwwk.
    kwWwwwWwwwwwk.
    kwwwwwwwwWwwk.
    .kwwwwwwwwwk..
    ..kkkkkkkkk...
  `, { k: '#3a2410', m: '#b8643a', M: '#8a4424', g: '#6ac23a', t: '#e0483c',
       p: '#f0d8a0', w: '#f4f2ec', W: '#cfcac0' });

  /* Ein Klecks Hummus — Hamzas Wurfgeschoss. */
  P.def('humus', `
    ..kkkk..
    .khhHhk.
    khhhhhhk
    khHhohhk
    .khhhhk.
    ..kkkk..
  `, { k: '#6a5030', h: '#e8d4a0', H: '#f8ecc8', o: '#c8a020' });

  /* Hamzas Fussball. */
  P.def('ball', `
    ..kkkkkk..
    .kwwwwwwk.
    kwwwbbwwwk
    kwwbbbbwwk
    kbwwbbwwbk
    kbbwwwwbbk
    kwwwwwwwwk
    kwbwwwwbwk
    .kwbbbbwk.
    ..kkkkkk..
  `, { k: '#1b1220', w: '#f4f4f0', b: '#2a2a34' });

  /* ---------------------------------------------------------------
     LEVEL 14 — Stilbruch. Die Typen vom Nebentisch.
     --------------------------------------------------------------- */

  var TYP_ART = `
    ...kkkkk...
    ..khhhhhk..
    .khhHhhhhk.
    .ksssssssk.
    .ksweswesk.
    .ksssdsssk.
    .kjjkmkjjk.
    ..kjjjjjk..
    .krrryrrrk.
    krrrryrrrrk
    kyrrryrrryk
    kyrrryrrryk
    ksrrryrrrsk
    .kbbbbbbbk.
    .kbbk.kbbk.
    .kbbk.kbbk.
    .knnk.knnk.
  `;
  var TYP_ART2 = TYP_ART.replace(
    '.kbbk.kbbk.\n    .kbbk.kbbk.\n    .knnk.knnk.',
    'kbbk...kbbk\n    kbbk...kbbk\n    knnk...knnk');
  // Mit Kappe statt Haaren, ohne Bart
  var TYP_CAP = TYP_ART.replace('..khhhhhk..\n    .khhHhhhhk.', '..kcccccck.\n    .kccccccccc')
                       .replace('.kjjkmkjjk.\n    ..kjjjjjk..', '.ksskmkssk.\n    ..kssssdk..');
  var TYP_CAP2 = TYP_ART2.replace('..khhhhhk..\n    .khhHhhhhk.', '..kcccccck.\n    .kccccccccc')
                         .replace('.kjjkmkjjk.\n    ..kjjjjjk..', '.ksskmkssk.\n    ..kssssdk..');
  var TYP_BASE = { k: '#0c0a10', w: '#ffffff', e: '#1b1220', m: '#6a2a24', n: '#f0f0f4' };
  function typPal(o) {
    var p = {}, key;
    for (key in TYP_BASE) p[key] = TYP_BASE[key];
    for (key in o) p[key] = o[key];
    return p;
  }
  // Schwarzer Trainingsanzug mit weissen Streifen
  var TYP1 = typPal({ h: '#1a1412', H: '#3a2e24', s: '#d8a67c', d: '#b8845c', j: '#2a1e16',
                      r: '#1c1c24', y: '#f4f4f0', b: '#1c1c24' });
  // Weisser Anzug, blaue Kappe
  var TYP2 = typPal({ c: '#2a4a8a', s: '#c8946a', d: '#a8744c',
                      r: '#e8e8ee', y: '#2a4a8a', b: '#d8d8e0', n: '#1c1c24' });
  // Roter Anzug, Locken
  var TYP3 = typPal({ h: '#2a1a12', H: '#5a3a24', s: '#e8b890', d: '#c8946c', j: '#3a2418',
                      r: '#b8282e', y: '#f4f4f0', b: '#1c1c24' });
  P.def('typ1', TYP_ART, TYP1); P.def('typ1b', TYP_ART2, TYP1);
  P.def('typ2', TYP_CAP, TYP2); P.def('typ2b', TYP_CAP2, TYP2);
  P.def('typ3', TYP_ART, TYP3); P.def('typ3b', TYP_ART2, TYP3);

  /* Shisha-Zange. Fliegt sich drehend durch den Raum. */
  P.def('zange', `
    kkkkkkkkkk..
    kmmmmmmmmmkk
    .kkkkkkkkkmk
    kmmmmmmmmmkk
    kkkkkkkkkk..
  `, { k: '#3a3a44', m: '#c8ccd6' });

  /* Heisses Stueck Shisha-Kohle. */
  P.def('kohle', `
    .kkkk.
    kroork
    koyyok
    koyyok
    kroork
    .kkkk.
  `, { k: '#2a1008', r: '#8a2a10', o: '#ff6a1a', y: '#ffd257' });

  /* ---------------------------------------------------------------
     LEVEL 15 — Bei Georgios (griechisch). Die Meeresfruechte sind frisch.
     --------------------------------------------------------------- */

  var KRABBE_PAL = { k: '#3a0a08', r: '#e0483c', R: '#a02a20', w: '#ffffff' };
  P.def('krabbe', `
    .kk..........kk.
    krrk........krrk
    krRk..k..k..kRrk
    .krk..w..w..krk.
    ..krkkrrrrkkrk..
    ...krrrrrrrrk...
    ..krrRrrrrRrrk..
    ..kkrrrrrrrrkk..
    .k.k.k....k.k.k.
    k.k.k......k.k.k
  `, KRABBE_PAL);
  P.def('krabbe2', `
    kk............kk
    .krk........krk.
    krRk..k..k..kRrk
    .krk..w..w..krk.
    ..krkkrrrrkkrk..
    ...krrrrrrrrk...
    ..krrRrrrrRrrk..
    ..kkrrrrrrrrkk..
    k.k.k......k.k.k
    .k.k.k....k.k.k.
  `, KRABBE_PAL);

  var KRAKE_PAL = { k: '#2a0a30', p: '#9a4ac8', P: '#c88ae8', w: '#ffffff',
                    e: '#1b1220', m: '#5a1a3a' };
  P.def('krake', `
    ....kkkkkk....
    ..kkppppppkk..
    .kppPppppPppk.
    kppppppppppppk
    kpppwepppweppk
    kppppppppppppk
    .kppppmmppppk.
    ..kppppppppk..
    .kpkpkppkpkpk.
    kpkpkpkkpkpkpk
    kpkpkp..pkpkpk
    kk.kpk..kpk.kk
    ...kk....kk...
  `, KRAKE_PAL);
  P.def('krake2', `
    ....kkkkkk....
    ..kkppppppkk..
    .kppPppppPppk.
    kppppppppppppk
    kpppwepppweppk
    kppppppppppppk
    .kpppmmmmpppk.
    ..kppppppppk..
    .kpkpkppkpkpk.
    .kpkpkkkkpkpk.
    .kpkpk..kpkpk.
    ..kk.k..k.kk..
    ..............
  `, KRAKE_PAL);

  var FISCH_PAL = { k: '#0a1a3a', b: '#4a8ad8', B: '#8ac0f0', w: '#ffffff',
                    e: '#1b1220', m: '#1a2a5a' };
  P.def('fisch', `
    ....kkkkk.....
    ..kkbbbbbkk.kk
    .kbbbBbbbbbkbk
    kbwebbbbbbbbbk
    kbmbbbbbbbbkbk
    .kbbBbbbbbk.kk
    ..kkbbbbbkk...
    ....kkkkk.....
  `, FISCH_PAL);
  P.def('fisch2', `
    ....kkkkk.....
    ..kkbbbbbkk...
    .kbbbBbbbbbkkk
    kbwebbbbbbbbbk
    kbmbbbbbbbbkkk
    .kbbBbbbbbbk..
    ..kkbbbbbkk...
    ....kkkkk.....
  `, FISCH_PAL);

  /* Tinte. Die Krake spuckt. */
  P.def('tinte', `
    .kkkk.
    kiiIik
    kiIiik
    kiiiik
    .kkkk.
  `, { k: '#0a0a14', i: '#2a1a4a', I: '#5a4a8a' });

  /* Teller. Georgios wirft sie. Opa. */
  P.def('teller', `
    .kkkkkkkkkk.
    kwwbwwwwbwwk
    kwwwwwwwwwwk
    .kkkkkkkkkk.
  `, { k: '#3a4a6a', w: '#f4f6fa', b: '#2a5ab8' });

  P.def('olive', `
    .kkk.
    koOok
    koook
    .kkk.
  `, { k: '#141a08', o: '#3a4a18', O: '#8a9a3a' });

  /* Souvlaki am Spiess. Heilt — und ist Yusufs Belohnung. */
  P.def('souvlaki', `
    .kkk.kkk.kkk....
    kmMmkmMmkgtgkkkk
    kmmmkmmmkgggyyyy
    kMmmkMmmktggkkkk
    .kkk.kkk.kkk....
  `, { k: '#3a2410', m: '#b8643a', M: '#8a4424', g: '#4aa832', t: '#e0483c', y: '#d8b070' });

  /* Tzatziki. Von Georgios' Oma. */
  P.def('tzatziki', `
    ..kkkkkkkk..
    .kwwgwwwgwk.
    kwwwwwgwwwwk
    kbbbbbbbbbbk
    .kbBbbbbBbk.
    ..kbbbbbbk..
    ...kkkkkk...
  `, { k: '#1a2a5a', w: '#f4f6ee', g: '#8ac860', b: '#2a5ab8', B: '#8ab0f0' });

  /* ---------------------------------------------------------------
     TILES — zwei Masken, eine Palette pro Welt
     --------------------------------------------------------------- */

  var MASK_TOP = P.art(`
    1111111111111111
    1111111111111111
    2222222222222222
    2222222222222222
    2222222222222222
    3333333333333333
    3333333333333333
    4444444444444444
    3333333333333333
    3333333333333333
    3333333333333333
    3333333343333333
    3333333343333333
    3333333343333333
    3333333343333333
    4444444444444444
  `);

  var MASK_FILL = P.art(`
    3333333343333333
    3333333343333333
    3333333343333333
    3333333343333333
    3333333343333333
    3323333343333233
    3333333343333333
    4444444444444444
    4333333333333333
    4333333333333333
    4333333333333333
    4333333332333333
    4333333333333333
    4333333333333333
    4333333333333333
    4444444444444444
  `);

  /**
   * Welten-Paletten.
   * top/fill = [hell, mittel, dunkel, Fuge]
   * sky = Verlauf oben->unten, far/near = Parallax-Farben
   */
  var THEMES = {
    zimmer: {
      top:  ['#d8a06a', '#b07a45', '#8a5a33', '#4a2c17'],
      fill: ['#a8763f', '#8a5a33', '#6b4526', '#3a2414'],
      sky:  ['#2a1f4a', '#5c3a6e', '#c9628a', '#f0a05c'],
      far:  '#3b2a55', near: '#27193c',
      accent: '#ffd257'
    },
    garten: {
      top:  ['#96e85c', '#66c23c', '#4a9128', '#2a5a18'],
      fill: ['#a8763f', '#8a5a33', '#6b4526', '#3a2414'],
      sky:  ['#5cc8f0', '#8ad8ed', '#bdeeff', '#e8f8c0'],
      far:  '#3f8a4a', near: '#2a6234',
      accent: '#ffc23c'
    },
    gym: {
      top:  ['#7a8aa6', '#5b6b82', '#43506a', '#1b2130'],
      fill: ['#4c586f', '#3b4558', '#2c3444', '#161b26'],
      sky:  ['#2a2140', '#3e2d55', '#5a3a66', '#7a4a6a'],
      far:  '#332a4a', near: '#221a33',
      accent: '#ff6fa8'
    },
    kueche: {
      top:  ['#f4f0e8', '#d4cec2', '#a8a298', '#5e5a54'],
      fill: ['#c8c2b6', '#a8a298', '#86817a', '#4a4741'],
      sky:  ['#3a2f44', '#584060', '#7a5a70', '#a8786a'],
      far:  '#4a3d52', near: '#33293c',
      accent: '#ff8a3c'
    },
    festung: {
      top:  ['#b4e888', '#7fb04a', '#4f7a33', '#243d1a'],
      fill: ['#5a6a52', '#46543f', '#333f2e', '#1a2116'],
      sky:  ['#140f22', '#2a1a3a', '#4a2250', '#6a2a48'],
      far:  '#2a2038', near: '#1a1426',
      accent: '#9dff6a'
    },
    // Supermarkt: heller Boden, Neonlicht, volle Regale
    markt: {
      top:  ['#eceef4', '#c8ccd6', '#9aa0ac', '#5c6068'],
      fill: ['#b8bcc6', '#989ca6', '#787c86', '#3c4048'],
      sky:  ['#f4f7fb', '#e2e8f0', '#ccd4e0', '#b0bccc'],
      far:  '#c2cad8', near: '#a6b0c2',
      accent: '#ff6a3c'
    },
    // Nachtstrasse Richtung Stilbruch
    strasse: {
      top:  ['#5a5f6e', '#43485a', '#2e3242', '#1a1c26'],
      fill: ['#3a3e4c', '#2c303c', '#1f222c', '#12141c'],
      sky:  ['#0c0a18', '#1d1636', '#43215a', '#a8425a'],
      far:  '#241d3a', near: '#171228',
      accent: '#ff8ad8'
    },
    // Vor Yusufs Haus: Gehweg, Nachmittagssonne, Reihenhaeuser
    siedlung: {
      top:  ['#dedad2', '#b8b4ac', '#8e8a84', '#5a5652'],
      fill: ['#8e8a84', '#76726c', '#5e5a56', '#3a3834'],
      sky:  ['#4a86d4', '#7ab0e6', '#c4dcf0', '#f2d8a4'],
      far:  '#8ea2c2', near: '#6a7c9a',
      accent: '#ffd257'
    },
    // Der Hausberg: Gras oben, Erde darunter, Morgenhimmel
    berg: {
      top:  ['#9ada64', '#62a83c', '#7a5634', '#3e2a18'],
      fill: ['#8a6440', '#6e4e30', '#553a22', '#2e2012'],
      sky:  ['#58b0ee', '#8accf0', '#c2e6f4', '#eaf6e0'],
      far:  '#7e9cc0', near: '#2e6a3a',
      accent: '#ffc23c'
    },
    // Hamzas Restaurant: Terrakotta-Boden, warme Waende, der Spiess
    imbiss: {
      top:  ['#e8b888', '#c88a5a', '#a0683e', '#5a3a22'],
      fill: ['#a0683e', '#86542e', '#6a4022', '#3a2414'],
      sky:  ['#3a2014', '#5a3220', '#7a4a2e', '#946038'],
      far:  '#4e2c1c', near: '#2e1a10',
      accent: '#ffd257'
    },
    // Stilbruch von innen: dunkler Teppich, Neon, Rauch
    bar: {
      top:  ['#7a4a7a', '#5a3060', '#3e2046', '#1e1024'],
      fill: ['#3e2046', '#30183a', '#24102c', '#12081a'],
      sky:  ['#0e0816', '#1c1030', '#2e1840', '#44204e'],
      far:  '#241634', near: '#160c22',
      accent: '#ff8ad8'
    },
    // Taverne Georgios: weiss und blau, Holzboden
    taverne: {
      top:  ['#d8b888', '#b08a5a', '#8a6640', '#4a3420'],
      fill: ['#8a6640', '#70502e', '#58401e', '#302210'],
      sky:  ['#e8f0f8', '#d0e0f0', '#b8d0ea', '#a0c0e4'],
      far:  '#f4f6fa', near: '#2a5ab8',
      accent: '#2a5ab8'
    }
  };

  function makeTiles() {
    Object.keys(THEMES).forEach(function (name) {
      var t = THEMES[name];
      var palTop = { '1': t.top[0], '2': t.top[1], '3': t.top[2], '4': t.top[3] };
      var palFill = { '1': t.fill[0], '2': t.fill[1], '3': t.fill[2], '4': t.fill[3] };
      P.def('tile_' + name + '_top', MASK_TOP, palTop);
      P.def('tile_' + name + '_fill', MASK_FILL, palFill);
      // "innen" = dunklere Füllung für tief liegende Blöcke
      var palDeep = {
        '1': t.fill[2], '2': t.fill[2], '3': t.fill[3], '4': t.fill[3]
      };
      P.def('tile_' + name + '_deep', MASK_FILL, palDeep);
    });
  }

  makeTiles();

  global.Sprites = {
    THEMES: THEMES,
    tileTop: function (theme) { return 'tile_' + theme + '_top'; },
    tileFill: function (theme) { return 'tile_' + theme + '_fill'; },
    tileDeep: function (theme) { return 'tile_' + theme + '_deep'; }
  };

})(window);
