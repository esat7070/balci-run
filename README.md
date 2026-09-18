# 🍯 Balci Run — Yusufs Honig-Jagd

Ein handgepixeltes 2D-Jump'n'Run über **Yusuf Balci**: schläft gerne, isst noch lieber,
lacht sehr komisch und wurde von seinem dünnen Bruder **Huseyin** um seinen Honig gebracht.

**▶️ Jetzt spielen: https://esat7070.github.io/balci-run/**

Läuft direkt im Browser. Keine Installation, kein Download, kein Account.
Handy und Tablet funktionieren auch (Touch-Steuerung blendet sich automatisch ein).

---

## Steuerung

| Taste | Was passiert |
|---|---|
| `←` `→` oder `A` `D` | Laufen |
| `Leertaste` / `W` / `↑` | Springen |
| Nochmal in der Luft | **Bauch-Boost** (Doppelsprung) |
| `↓` in der Luft | **Bauch-Stampfer** — zerbricht Kisten, plättet alles in der Nähe |
| `Shift` / `E` | Rennen + **Kippe werfen** |
| `Esc` / `P` | Pause |
| `M` | Ton an / aus |

Gamepad wird ebenfalls erkannt.
**Am Handy: quer halten.** A = Sprung, B = Kippe werfen.

## Worum es geht

- **Honig sammeln.** 100 Gläser = ein Extraleben.
- **Auf Gegner springen.** Mehrere ohne Bodenkontakt geben Combo-Bonus.
- **Kippen-Päckchen** wirkt wie die Feuerblume: du wirfst Kippen, und ein
  Treffer kostet dich nur das Päckchen statt eines Herzens.
- **Nicht in die Gabeln treten.** Küchen sind gefährlicher als sie aussehen.
- **Erfan befreien.** Huseyin hat den Koch eingesperrt, damit es kein Kubide mehr gibt.
- **Huseyin besiegen.** Drei Phasen. Er macht mittendrin Liegestütze.

Steh mal zu lange still. Yusuf schläft dann einfach ein. Und knurren tut er sowieso.

## Die sieben Level

| # | Level | Wo |
|---|---|---|
| 1 | Aufstehen ist schwer | Yusufs Zimmer, 6:45 Uhr |
| 2 | Bienen vergessen nichts | Der Garten hinterm Haus |
| 3 | Muckibude des Grauens | Huseyins zweites Zuhause |
| 4 | Die Küche der Versuchung | Iranisch. Mit Geiselnahme. |
| 5 | Huseyins Salat-Festung | Gebaut aus Disziplin. Und Salat. |
| 6 | Mustang nach Stilbruch | Siegerfahrt, 2 Uhr nachts |
| 7 | Der letzte Kampf | Esat hat es zu weit getrieben |

### Jedes Level hat seinen eigenen Boss

| Level | Boss | Wie er nervt |
|---|---|---|
| 1 | — | Zum Aufwärmen gibt es keinen |
| 2 | **Mirkan** | Versperrt den Weg mit dem Mercedes, wirft Fragen und hupt dich weg |
| 3 | **Lennart** | Wirft Hanteln, stürmt los, macht mittendrin Liegestütze |
| 4 | **Erfan** | Kocht seit vierzehn Tagen nur Salat und ist entsprechend gelaunt |
| 5 | **Huseyin** | Drei Phasen, Salatblätter, Protein-Shaker, Liegestütze |
| 6 | — | Nur Fahren |
| 7 | **Esat** | Der Endgegner |

Die Level ziehen von Stufe zu Stufe an — Gegner werden schneller und
angriffslustiger. **Level 7 ist bewusst brutal.** Esat hat 15 Leben, drei
Phasen, wirft Shisha-Wolken, lässt KI-Agenten spawnen, ruft Jets mit Bomben —
und drückt bei der Hälfte Snooze, um stärker zurückzukommen.

**Besetzung:** Wecker, Bienen, wütender Brokkoli, hüpfende Salatköpfe,
Diät-Drohnen und **Lennart**, der dich jedes Mal fragt, ob du auch ins Gym gehst.
**Erfan** macht das Kubide. **Mirkan** fährt Mercedes und hat Fragen — sehr viele.
**Esat** wartet im Stilbruch und hat schon bestellt.

### Bosskämpfe lesen

Alle Bosse folgen derselben Regel: **nur der angekündigte Sturmlauf tut
bei Berührung weh.** Die Gefahr sind ihre Angriffe, nicht ihr Körper — sonst
würde das Spiel genau die Bewegung bestrafen, die es verlangt. Am Lebensbalken
steht **OFFEN**, wenn du gefahrlos ranspringen kannst.

Während aller Gespräche steht die Welt still: Gegner, Würfe und Bosse
bewegen sich nicht, der Hintergrund wird abgedunkelt und rechts oben im
Textfeld steht **PAUSE**. Man kann also nicht sterben, während jemand redet.

## Fortschritt

Nach **jedem** geschafften Level wird gespeichert. Im Hauptmenü kommst du
über **WEITER AB LEVEL X** direkt dorthin zurück, oder über **LEVEL WÄHLEN**
zu jedem Level, das du schon einmal geschafft hast. Du fängst also nie
wieder von vorne an.

Gespeichert wird im **localStorage** des Browsers, nicht in Cookies. Das
heißt: pro Gerät und pro Browser getrennt, wird beim Löschen der
Browserdaten mit entfernt, und im privaten Modus meist gar nicht behalten.

## Bestenliste

Sie ist von Anfang an im Hauptmenü erreichbar, und der beste Lauf steht
unten rechts auf dem Titelbild. Wer den letzten Kampf schafft, trägt sich
mit Namen ein. Die Liste lässt sich
nach **Punkten, Honig, Zeit oder Toden** sortieren und steht im Hauptmenü unter
**BESTENLISTE**.

Die Liste liegt im Browser des Spielers. Jeder Eintrag wird beim Laden streng
geprüft und bekommt eine Prüfsumme — von Hand veränderte Einträge fliegen raus,
kaputte Daten bringen das Spiel nicht zum Absturz. Ohne Server lässt sich das
nicht vollständig verhindern: Wer unbedingt will, kann seinen eigenen
Browserspeicher manipulieren. Für eine gemeinsame, echte Rangliste bräuchte es
ein Backend.

---

## Technik

Alles selbst gebaut, **kein einziges externes Asset**:

- **Grafik** — jedes Sprite ist von Hand Pixel für Pixel als Text-Matrix geschrieben
  (`src/pixel.js`, `src/sprites.js`) und beim Start in Canvas-Bitmaps gebacken.
  Die Figuren bestehen aus Einzelteilen (Kopf, Rumpf, Arme, Beine), die pro Pose
  versetzt gezeichnet werden — deshalb laufen sie richtig, statt nur zu blinken.
- **Schrift** — eigener 5×7-Bitmap-Font inklusive Ä/Ö/Ü/ß (`src/font.js`).
  Kein Webfont, keine Schriftdatei.
- **Musik & Sound** — komplett in der Web Audio API synthetisiert (`src/audio.js`):
  Pulswellen über Fourier-Koeffizienten für den NES-Klang, Dreieck für den Bass,
  gefiltertes Rauschen für die Drums. Sieben Stücke, ein Step-Sequencer.
  Auch Yusufs Lachen ist synthetisiert.
- **Level** — kleiner Baukasten mit `g()`, `p()`, `q()`, `e()` usw. (`src/levels.js`),
  damit die Layouts lesbar bleiben.
- **Engine** — Vanilla JavaScript, feste 60-Hz-Physik, Kachel-Kollision,
  keine Abhängigkeiten, kein Build-Schritt.

```
index.html          Einstieg
style.css           Rahmen + Touch-Buttons + Querformat-Hinweis
smoketest.html      Automatischer Testlauf (siehe unten)
bosstest.html       Bot spielt den Bosskampf bis zur Bestenliste durch
kippentest.html     Prueft das Kippen-Power-up Schritt fuer Schritt
src/font.js         Pixel-Font
src/pixel.js        Sprite-Engine + Yusuf & Huseyin
src/sprites.js      Gegner, Items, Blöcke, Tiles
src/audio.js        Chiptune-Engine
src/input.js        Tastatur / Gamepad / Touch
src/levels.js       Die fünf Level + alle Dialoge
src/entities.js     Physik, Gegner-KI, Endgegner
src/game.js         Spielschleife, Kamera, Menüs, HUD
```

### Lokal starten

Doppelklick auf `index.html` reicht. Oder mit einem kleinen Server:

```bash
python -m http.server 8000
# http://localhost:8000
```

### Tests

`smoketest.html` im Browser öffnen. Der prüft automatisch:

- ob alle Sprites sauber gebacken wurden,
- ob der Font jedes Zeichen aus allen Spieltexten kennt,
- ob Startpunkte, Ziele, Gegner, Checkpoints und Schilder wirklich auf Boden stehen,
- und lässt zum Schluss einen Bot jedes Level durchlaufen, um zu sehen,
  ob es überhaupt schaffbar ist.

`bosstest.html` lässt einen Bot gegen Huseyin antreten und protokolliert
jeden Treffer, jede Schadensquelle und jeden Zustandswechsel bis zur
Bestenliste. Beides hat echte Fehler gefunden — unter anderem einen
Absturz direkt nach dem Bosssieg.

---

## Credits

**Yusuf Balci** — Hauptrolle, Locken, grüne Augen, großes Herz
**Huseyin Balci** — Bruder und Endgegner, derselbe Mensch, nur dünn und laut
**Lennart** — Gym. Immer Gym.
**Erfan** — Kubide, und zwar richtig
**Mirkan** — Fragen
**Esat** — bester Kollege, letzter Endgegner, hat immer schon bestellt

Kein Salat wurde bei den Dreharbeiten gegessen.

HÖ HÖ HÖÖÖ.

---

## Über dieses Projekt

Ein privates Spaßprojekt unter Freunden. Die Figuren sind Karikaturen von
echten Menschen aus dem Freundes- und Familienkreis, gezeichnet mit ihrem
Einverständnis und in freundschaftlicher Absicht.

**Alles im Spiel ist selbst gemacht.** Jedes Sprite, die Schrift, jeder Ton
und jede Note wurden für dieses Projekt erstellt. Es wurden keine Grafiken,
Klänge, Schriftarten oder Codebestandteile aus anderen Spielen übernommen.

Dieses Projekt steht in keiner Verbindung zu und wird nicht unterstützt von
Nintendo oder irgendeinem anderen Unternehmen. Genannte Marken- oder
Ortsnamen dienen ausschließlich der beschreibenden Erwähnung im Rahmen einer
persönlichen Geschichte; es besteht keine Zusammenarbeit und keine Werbung.

Keine Lizenz zur Weiterverwendung — alle Rechte vorbehalten. Wenn du etwas
davon nutzen willst, frag einfach.
