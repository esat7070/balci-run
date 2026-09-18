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
| `Shift` | Rennen |
| `Esc` / `P` | Pause |
| `M` | Ton an / aus |

Gamepad wird ebenfalls erkannt.

## Worum es geht

- **Honig sammeln.** 100 Gläser = ein Extraleben.
- **Auf Gegner springen.** Mehrere ohne Bodenkontakt geben Combo-Bonus.
- **Nicht in die Gabeln treten.** Küchen sind gefährlicher als sie aussehen.
- **Huseyin besiegen.** Drei Phasen. Er macht mittendrin Liegestütze.

Steh mal zu lange still. Yusuf schläft dann einfach ein.

## Die fünf Level

| # | Level | Wo |
|---|---|---|
| 1 | Aufstehen ist schwer | Yusufs Zimmer, 6:45 Uhr |
| 2 | Bienen vergessen nichts | Der Garten hinterm Haus |
| 3 | Muckibude des Grauens | Huseyins zweites Zuhause |
| 4 | Die Küche der Versuchung | Gefährlichster Raum im Haus |
| 5 | Huseyins Salat-Festung | Gebaut aus Disziplin. Und Salat. |

Dazu: Wecker, Bienen, wütender Brokkoli, hüpfende Salatköpfe, Fitness-Bros mit
Sonnenbrille in der Halle, Diät-Drohnen. Und ein Gold-Döner, der kurzzeitig
unbesiegbar macht.

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
style.css           Rahmen + Touch-Buttons
smoketest.html      Automatischer Testlauf (siehe unten)
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

---

## Credits

**Yusuf Balci** — Hauptrolle, Locken, grüne Augen, großes Herz
**Huseyin Balci** — Endgegner, derselbe Mensch, nur dünn und laut

Kein Salat wurde bei den Dreharbeiten gegessen.

HÖ HÖ HÖÖÖ.
