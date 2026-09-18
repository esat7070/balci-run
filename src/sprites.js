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

  /* ---------------------------------------------------------------
     TILES — zwei Masken, sechs Welten
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
    // Nachtstrasse Richtung Stilbruch
    strasse: {
      top:  ['#5a5f6e', '#43485a', '#2e3242', '#1a1c26'],
      fill: ['#3a3e4c', '#2c303c', '#1f222c', '#12141c'],
      sky:  ['#0c0a18', '#1d1636', '#43215a', '#a8425a'],
      far:  '#241d3a', near: '#171228',
      accent: '#ff8ad8'
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
