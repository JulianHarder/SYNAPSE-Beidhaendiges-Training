# SYNAPSE – Beidhändiges Gehirn-Training im Browser

## 1. Idee und Ziel

Eine Web-App, mit der ich die Koordination meiner beiden Hände trainiere, vor allem die der nicht-dominanten (linken) Hand. Ich bin Rechtshänder, schreibe aber auch mit links in Spiegelschrift und nutze die Maus links.

Kernprinzip: Neuroplastizität. Das Gehirn stärkt Bahnen, die oft und aufmerksam genutzt werden. Dafür gelten diese Regeln, die die App umsetzen soll:

- Aufgaben liegen knapp über meinem aktuellen Können (adaptive Schwierigkeit)
- Kurze tägliche Einheiten (10 bis 15 Minuten) statt seltener langer
- Fortschritt ist sichtbar und motivierend
- Abwechslung zwischen den Übungen

Hinweis (ehrlich im Text der App): Die App "verbindet keine Gehirnhälften". Die sind über den Balken (Corpus callosum) ohnehin verbunden. Trainiert werden Feinmotorik, Koordination, Aufmerksamkeit und Automatisierung.

## 2. Technik

- Reine Web-App: HTML, CSS, Vanilla JavaScript, Canvas für Zeichnen und Spuren
- Kein Build-Schritt nötig, läuft per Doppelklick auf `index.html`
- Speicherung im Browser mit `localStorage` (Export und Import der Daten als JSON-Datei, damit nichts verloren geht und ich zwischen Geräten wechseln kann)
- Optional später: Einbindung in meinen Projekt-Hub
- Eingabegeräte: Maus, Tastatur mit Ziffernblock (`event.code` = `Numpad0` bis `Numpad9`), optional Gamepad (Gamepad API)

### Dateistruktur

```
synapse/
  index.html          Menü und Startseite
  css/style.css       Design
  js/
    app.js            Navigation, Start, Tagesplan
    storage.js        Speichern, Laden, Export/Import
    difficulty.js     Adaptive Schwierigkeit
    stats.js          Auswertung und Berechnungen
    network.js        Fortschrittsnetz (Canvas)
    modules/
      dualtask.js
      mirrorwrite.js
      mirrortrace.js
      sequence.js
      stroop.js
      rhythm.js
      gamepad.js      (optional, Phase 3)
  README.md
```

## 3. Design

- Dunkles Tech-Design, passend zu meinen anderen Projekten
- Hintergrund fast schwarz, Akzentfarben: Blau/Cyan für die linke Hand, Orange/Magenta für die rechte Hand (so erkenne ich in jeder Übung sofort, welche Hand gemeint ist)
- Leichte Animationen: sanft pulsierende Neuronen im Hintergrund des Menüs
- Große, klare Schrift, wenig Ablenkung während der Übung
- Menü: Kacheln für jedes Modul mit Kurzbeschreibung und letztem Ergebnis
- Jede Übung hat: Erklärung, Probedurchgang, Start-Countdown (3-2-1), Ergebnisseite

## 4. Übungen (Module)

### 4.1 Dual Task: Zahlencode + Spur (Hauptübung)

Meine Idee: Eine Hand tippt Zahlencodes, die andere folgt gleichzeitig einer Spur.

- Rechte Hand: Ziffernblock. Auf dem Bildschirm erscheint ein Code (z. B. 4-7-2-9), ich tippe ihn ein. Dann kommt der nächste.
- Linke Hand: Maus. Ein Punkt/Cursor soll einer Spur folgen (Spirale, Welle, Labyrinthgang), die sich langsam bewegt oder aufgebaut ist.
- Bildschirm geteilt: links Spur, rechts Code (oder Code oben, Spur unten)
- Dauer pro Durchgang: 60 bis 90 Sekunden

Stufen:

1. Einzeln: nur Code, dann nur Spur (Basiswert messen)
2. Beides gleichzeitig, langsam und kurze Codes (3 Ziffern)
3. Längere Codes (bis 8 Ziffern), schnellere und engere Spur
4. Handtausch: links tippt, rechts führt die Maus
5. Spiegelmodus: Spur wird gespiegelt dargestellt

Messwerte: Tippfehler, Tippzeit pro Ziffer, Abweichung von der Spur (Pixel), Zeit auf der Spur (%), Dual-Task-Kosten (siehe Auswertung).

### 4.2 Spiegelschrift-Trainer

- Canvas, auf dem ich mit der linken Hand (Maus/Touch/Tablet) schreibe
- Daneben wird live die gespiegelte Version angezeigt, also so, wie es im Spiegel aussähe
- Schreibrichtung: von rechts nach links
- Vorlagen: Buchstaben, Wörter, dann Sätze (Schwierigkeit steigt)
- Vorlage als blasse Hilfslinie zum Nachfahren, die in höheren Stufen verschwindet
- Messwerte: Abweichung von der Vorlage, Zeit, Lesbarkeit (Selbstbewertung 1 bis 5)

### 4.3 Mirror Tracing (klassische Neuropsychologie-Aufgabe)

- Eine Form (Stern, Spirale, Zickzack) soll nachgefahren werden, während die Bewegung gespiegelt oder vertikal umgekehrt dargestellt wird
- Verlasse ich die Linie, gibt es einen Fehlerpunkt (rote Markierung)
- Messwerte: Fehler, Zeit, Strecke außerhalb der Linie
- Beide Hände abwechselnd, um sie zu vergleichen

### 4.4 Sequenz-Training (Serial Reaction Time)

- Vier Felder (oder Ziffernblock-Tasten), eins leuchtet auf, ich drücke die passende Taste
- Linke Hand: Tasten A S D F, rechte Hand: J K L Ö (oder Ziffernblock)
- Versteckt wiederholt sich ein Muster. Wenn die Reaktionszeit bei dem Muster sinkt, hat das Gehirn die Bahn automatisiert
- Zwischendurch Zufallsblöcke als Vergleich
- Messwerte: Reaktionszeit, Fehler, Lernkurve (Muster vs. Zufall)

### 4.5 Stroop-Test (Aufmerksamkeit und Hemmung)

- Das Wort "ROT" erscheint in blauer Schrift, ich klicke die Farbe (nicht das Wort)
- Linke Hand: Maus-Buttons, rechte Hand: Zifferntasten für Farben (oder umgekehrt)
- Messwerte: Reaktionszeit, Fehler, Unterschied zwischen "passend" und "unpassend"

### 4.6 Rhythmus-Unabhängigkeit

- Links und rechts sollen unterschiedliche Takte klopfen (z. B. 3 gegen 2, später 4 gegen 3)
- Links: Taste `Y` oder Leertaste, rechts: Ziffernblock-Taste, dazu ein Metronom und eine Anzeige der Soll-Zeiten
- Messwerte: Abweichung in Millisekunden vom Soll-Rhythmus je Hand

### 4.7 Optional (Phase 3): Zwei-Stick-Labyrinth mit Gamepad

- Jeder Daumenstick steuert einen Punkt durch ein eigenes Labyrinth
- Nur wenn ich ein Gamepad anschließe

## 5. Schwierigkeit (adaptiv)

Pro Modul gibt es Stufen 1 bis 10. Nach jedem Durchgang:

- Erfolgsquote über 85 Prozent: Stufe hoch
- Erfolgsquote unter 60 Prozent: Stufe runter
- Dazwischen: Stufe bleibt

Das hält die Aufgabe im "knapp über dem Können"-Bereich. Parameter pro Stufe (Codelänge, Spurgeschwindigkeit, Spurbreite, Zeitlimit) stehen in einer Konfigurationstabelle in `difficulty.js`, damit ich sie später leicht anpassen kann.

## 6. Auswertung

### Daten pro Durchgang (gespeichert)

```json
{
  "id": "2026-10-14T18:30:12",
  "modul": "dualtask",
  "stufe": 3,
  "hand": { "tippen": "rechts", "maus": "links" },
  "spiegel": false,
  "dauerSek": 75,
  "werte": {
    "tippFehler": 2,
    "tippZeitProZiffer": 640,
    "spurAbweichungPx": 18.4,
    "zeitAufSpurProzent": 82
  },
  "score": 76
}
```

### Kennzahlen

- **Score (0 bis 100)** pro Durchgang, modulabhängig aus Genauigkeit und Tempo berechnet, einfache und nachvollziehbare Formel
- **Dual-Task-Kosten:** Wie viel schlechter bin ich, wenn ich beides gleichzeitig mache, im Vergleich zu den Einzelwerten? (in Prozent) Sinkt dieser Wert über die Wochen, wird die Koordination besser. Das ist die wichtigste Zahl der App.
- **Hand-Vergleich:** Linke gegen rechte Hand (Genauigkeit und Tempo). Ziel: Der Abstand schrumpft.
- **Lernkurve:** Gleitender Durchschnitt über die letzten 5 Durchgänge
- **Streak:** Wie viele Tage in Folge geübt
- **Persönliche Bestwerte** pro Modul

### Darstellung

- **Ergebnisseite nach jedem Durchgang:** Score groß, Vergleich zum letzten Mal (Pfeil hoch/runter), die zwei, drei wichtigsten Werte, Stufen-Hinweis ("Nächstes Mal Stufe 4")
- **Statistik-Seite:** Liniendiagramme (Canvas, selbst gezeichnet oder Chart.js) für Score je Modul über die Zeit, Balkendiagramm linke gegen rechte Hand, Kurve der Dual-Task-Kosten, Kalender-Heatmap (welche Tage geübt)
- **Spur-Replay:** Bei Spur-Übungen wird nach dem Durchgang mein gefahrener Weg über die Soll-Linie gelegt, Abweichungen rot markiert

## 7. Fortschrittsnetz (Visualisierung)

Mein Fortschritt wird als wachsendes Neuronennetz dargestellt (Canvas oder Three.js, wie bei meinen anderen Projekten):

- Jedes Modul ist ein Knotenbereich (Cluster). Linke Hand = eine Farbe, rechte Hand = andere Farbe
- Jeder Durchgang erzeugt neue Neuronen und Verbindungen. Je besser der Score, desto heller und dicker die Linien
- Verbindungen zwischen den beiden Seiten (links/rechts) entstehen vor allem durch Dual-Task- und Spiegel-Übungen und leuchten gold. Das ist die symbolische "Verbindung der Hälften"
- Ungenutzte Verbindungen werden mit der Zeit blasser (zeigt: dranbleiben lohnt sich)
- Beim Hover auf ein Neuron: Datum, Modul, Score
- Impulse laufen sichtbar durchs Netz (kleine Lichtpunkte entlang der Linien)

Wichtig: Das ist Motivation und Visualisierung, keine medizinische Messung.

## 8. Tagesplan und Ablauf

- Startseite zeigt einen **Tagesplan** mit 3 bis 4 Übungen (ca. 10 bis 15 Minuten), jeden Tag abwechselnd, z. B.:
  - Aufwärmen: Sequenz-Training (2 Min)
  - Hauptübung: Dual Task (5 Min)
  - Spiegelschrift (3 Min)
  - Abschluss: Stroop oder Rhythmus (2 Min)
- Freies Üben jederzeit über das Menü
- Erinnerung im Text: "Pausen und Schlaf festigen das Gelernte"
- Warnhinweis bei Überlastung (zu viele Fehler, Schmerzen in Hand/Handgelenk): Pause machen

## 9. Umsetzung in Claude Code (Etappen)

**Phase 1 (Grundgerüst und Hauptübung)**
1. Projektstruktur, Menü, Design, `storage.js` mit Export/Import
2. Modul Dual Task (Ziffernblock + Mausspur) mit Stufen 1 bis 5
3. Ergebnisseite, Speicherung der Durchgänge

**Phase 2 (weitere Übungen und Auswertung)**
4. Spiegelschrift-Trainer
5. Mirror Tracing
6. Sequenz-Training
7. Statistik-Seite mit Diagrammen, Dual-Task-Kosten, Hand-Vergleich
8. Adaptive Schwierigkeit und Tagesplan

**Phase 3 (Feinschliff)**
9. Stroop-Test und Rhythmus-Modul
10. Fortschrittsnetz
11. Optional: Gamepad-Modul, Einbindung in den Projekt-Hub

Nach jeder Etappe soll das Programm lauffähig sein und von mir getestet werden, bevor die nächste beginnt.

## 10. Startprompt für Claude Code

> Baue die Web-App SYNAPSE nach dem Plan in `synapse-plan.md`. Beginne mit Phase 1: Projektstruktur, Menü im dunklen Tech-Design (Cyan für links, Orange für rechts), das Modul Dual Task (Zahlencode per Ziffernblock mit rechts, Spur per Maus mit links) und die Ergebnisseite mit Speicherung in localStorage. Reines HTML/CSS/JS ohne Build-Schritt. Erkläre mir nach jedem Schritt kurz, was du gebaut hast, damit ich es nachvollziehen kann.
