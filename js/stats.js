/* ==========================================================================
   stats.js – Auswertung und Berechnungen

   Hier stehen die Formeln, nicht in den Modulen. Wenn ich einen Score später
   anders gewichten will, ändere ich ihn an genau einer Stelle.
   ========================================================================== */

const Auswertung = (function () {

  /* --------------------------- kleine Helfer --------------------------- */

  function begrenzen(wert, min, max) {
    return Math.max(min, Math.min(max, wert));
  }

  function mittelwert(zahlen) {
    if (!zahlen.length) return 0;
    return zahlen.reduce((summe, z) => summe + z, 0) / zahlen.length;
  }

  /* Gleitender Durchschnitt über die letzten n Durchgänge (Plan: n = 5). */
  function gleitenderDurchschnitt(durchgaenge, n) {
    const fenster = durchgaenge.slice(0, n || 5).map((d) => d.score || 0);
    return Math.round(mittelwert(fenster));
  }

  /* --------------------------------- Score ---------------------------------
     0 bis 100, je Modul aus Genauigkeit und Tempo. Absichtlich einfach, damit
     ich die Zahl im Kopf nachrechnen kann.

     Dual Task: halb Tippen, halb Spur.
       Tippteil = Trefferquote der Ziffern, leicht gebremst, wenn ich sehr
                  langsam tippe (Zielwert 500 ms pro Ziffer).
       Spurteil = Anteil der Zeit, in dem der Cursor im Schlauch lag.
  ------------------------------------------------------------------------- */
  function scoreDualtask(werte) {
    const ziffern = werte.zifferGesamt || 0;
    const trefferquote = ziffern > 0 ? (ziffern - (werte.tippFehler || 0)) / ziffern : 0;

    /* Tempoanteil: 500 ms pro Ziffer oder schneller gilt als voll. */
    const zeitProZiffer = werte.tippZeitProZiffer || 0;
    const tempo = zeitProZiffer > 0 ? begrenzen(500 / zeitProZiffer, 0, 1) : 0;

    /* Tippen zu 75 % Genauigkeit, zu 25 % Tempo – Genauigkeit zählt mehr. */
    const tippteil = begrenzen(trefferquote, 0, 1) * 0.75 + tempo * 0.25;
    const spurteil = begrenzen((werte.zeitAufSpurProzent || 0) / 100, 0, 1);

    return Math.round((tippteil * 0.5 + spurteil * 0.5) * 100);
  }

  /* Spiegelschrift: Treffer (liegt der Strich auf der Vorlage?), Deckung
     (wurde die ganze Vorlage nachgefahren?) und die eigene Einschätzung der
     Lesbarkeit. Die Selbstbewertung zählt bewusst mit, weil kein Rechner
     beurteilen kann, ob die Schrift am Ende lesbar aussieht. */
  function scoreSpiegelschrift(werte) {
    const treffer = begrenzen((werte.trefferProzent || 0) / 100, 0, 1);
    const deckung = begrenzen((werte.deckungProzent || 0) / 100, 0, 1);
    /* Lesbarkeit 1 bis 5 -> 0 bis 1 */
    const lesbar = begrenzen(((werte.lesbarkeit || 1) - 1) / 4, 0, 1);

    return Math.round((treffer * 0.4 + deckung * 0.35 + lesbar * 0.25) * 100);
  }

  /* Mirror Tracing: im Korridor bleiben zählt am meisten, dann die Zahl der
     Ausrutscher, zuletzt das Tempo. Ein Lauf, der langsam aber sauber ist,
     soll besser dastehen als ein schnelles Gekritzel.
     Ab zwölf Ausrutschern gibt es für diesen Teil keine Punkte mehr. */
  function scoreMirrortrace(werte) {
    const korridor = begrenzen((werte.korridorProzent || 0) / 100, 0, 1);
    const sauber = 1 - begrenzen((werte.fehler || 0) / 12, 0, 1);
    const tempo = werte.zeitSek > 0 ? begrenzen((werte.sollZeitSek || 0) / werte.zeitSek, 0, 1) : 0;

    return Math.round((korridor * 0.5 + sauber * 0.3 + tempo * 0.2) * 100);
  }

  /* Sequenz-Training: Genauigkeit zählt am meisten, dann das Tempo
     (Richtwert 600 ms je Tastendruck). Dazu kommt ein Bonus für den
     Lerneffekt – also dafür, dass die versteckte Folge schon schneller geht
     als der Zufall. Ab 120 ms Vorsprung gibt es den vollen Bonus. */
  function scoreSequenz(werte) {
    const genau = begrenzen((werte.trefferProzent || 0) / 100, 0, 1);
    const tempo = werte.reaktionMs > 0 ? begrenzen(600 / werte.reaktionMs, 0, 1) : 0;
    const lernbonus = begrenzen((werte.lerneffektMs || 0) / 120, 0, 1);

    return Math.round((genau * 0.45 + tempo * 0.35 + lernbonus * 0.2) * 100);
  }

  /* Stroop: Genauigkeit zählt am meisten, dann das Tempo (Richtwert 800 ms).
     Der Stroop-Effekt ist die Zusatzzeit, die unpassende Wörter kosten –
     je kleiner, desto besser hemmt man das Lesen. Ab 250 ms gibt es für
     diesen Teil keine Punkte mehr, bei 0 ms oder darunter die vollen. */
  function scoreStroop(werte) {
    const genau = begrenzen((werte.trefferProzent || 0) / 100, 0, 1);
    const tempo = werte.reaktionMs > 0 ? begrenzen(800 / werte.reaktionMs, 0, 1) : 0;
    const hemmung = 1 - begrenzen((werte.stroopEffektMs || 0) / 250, 0, 1);

    /* Fehlgriffe müssen zählen: Wer jedes Wort erst nach mehreren Versuchen
       trifft, hat am Ende zwar alle geschafft, aber nicht sauber gearbeitet.
       Ohne diesen Teil wäre der Score davon unberührt geblieben. Als Maßstab
       dient ein Fehlgriff je zwei Wörter. */
    const reize = werte.reize || 0;
    const sauber = reize > 0
      ? 1 - begrenzen((werte.fehler || 0) / (reize * 0.5), 0, 1)
      : 1;

    return Math.round((genau * 0.4 + sauber * 0.15 + tempo * 0.25 + hemmung * 0.2) * 100);
  }

  /* Rhythmus: Die Hälfte zählt, ob überhaupt im richtigen Moment geschlagen
     wurde (Treffer), die andere Hälfte, wie genau. Eine mittlere Abweichung
     von der halben Toleranz gilt noch als ordentlich, erst darüber fällt der
     Wert deutlich. */
  function scoreRhythmus(werte) {
    const treffer = begrenzen((werte.trefferProzent || 0) / 100, 0, 1);
    const toleranz = werte.toleranzMs || 180;
    const genauigkeit = 1 - begrenzen((werte.abweichungMs || toleranz) / toleranz, 0, 1);

    return Math.round((treffer * 0.5 + genauigkeit * 0.5) * 100);
  }

  /* Erfolgsquote für die Stufenanpassung (0 bis 1). Der Score ist hier die
     naheliegende Grundlage, bleibt aber eine eigene Funktion, falls ein
     Modul die Stufe anders bemessen soll. */
  function erfolgsquote(durchgang) {
    return begrenzen((durchgang.score || 0) / 100, 0, 1);
  }

  /* ---------------------------- Dual-Task-Kosten ----------------------------
     Die wichtigste Zahl der App: Wie viel schlechter bin ich, wenn ich beides
     gleichzeitig mache?

     Verglichen wird ausschließlich <b>innerhalb derselben Stufe</b>. Sonst
     stünde ein Einzelwert von Stufe 1 (kurze Codes, breite Spur) gegen einen
     Dual-Durchgang auf Stufe 8 – die Kurve würde steigen, je besser man wird,
     weil die Dual-Aufgabe mitwächst. Darum misst das Modul den Basiswert
     regelmäßig neu auf der Stufe, die gerade dran ist.

     Ergebnis in Prozent, kleiner ist besser.
  ------------------------------------------------------------------------- */

  function istEinzelwert(durchgang) {
    return durchgang.modus === "einzeln" || (durchgang.werte && durchgang.werte.einzeln);
  }

  /* Verlauf: erwartet die Durchgänge in zeitlicher Reihenfolge (ältester
     zuerst). Je Stufe wird der beste bisherige Einzelwert mitgeführt. */
  function dualTaskKostenVerlauf(durchgaenge) {
    const basis = {};
    const verlauf = [];

    for (const d of durchgaenge) {
      const stufe = d.stufe || 1;
      if (istEinzelwert(d)) {
        basis[stufe] = Math.max(basis[stufe] || 0, d.score || 0);
        continue;
      }
      /* Ohne Basiswert auf genau dieser Stufe lässt sich nichts vergleichen. */
      if (!basis[stufe]) continue;
      verlauf.push({
        id: d.id, stufe: stufe,
        kosten: Math.round(((basis[stufe] - (d.score || 0)) / basis[stufe]) * 100)
      });
    }
    return verlauf;
  }

  /* Aktueller Stand: Mittel der letzten drei Vergleiche. null, solange auf
     keiner Stufe ein Basiswert vorliegt. */
  function dualTaskKosten(durchgaenge) {
    const verlauf = dualTaskKostenVerlauf(durchgaenge);
    if (!verlauf.length) return null;
    const letzte = verlauf.slice(-3).map((p) => p.kosten);
    return Math.round(mittelwert(letzte));
  }

  /* ----------------------------- Hände -----------------------------
     Jedes Modul beschreibt seine Rollen anders ({tippen, maus}, {schreiben},
     {klopfen}, …). Hier wird daraus einheitlich gelesen, welche Hände ein
     Durchgang gefordert hat – das brauchen das Fortschrittsnetz und die
     Statistik gleichermaßen. */
  function haendeVon(durchgang) {
    const text = Object.keys(durchgang.hand || {})
      .map((rolle) => String(durchgang.hand[rolle])).join(" ").toLowerCase();
    const beide = text.indexOf("beide") >= 0;
    return {
      links: beide || text.indexOf("links") >= 0,
      rechts: beide || text.indexOf("rechts") >= 0
    };
  }

  /* ------------------------------- Niveau -------------------------------
     Der Score allein taugt nicht für eine Gesamtkurve: 75 Punkte auf Stufe 2
     und 75 auf Stufe 8 sind nicht dasselbe. Darum wird beides zu einer Zahl
     verbunden – Stufe plus Score als Nachkommastelle.

         Stufe 7, Score 80  ->  7,80

     Die Zahl steigt, wenn man besser wird oder sich auf höheren Stufen hält,
     und sie fällt nicht, bloß weil die Aufgabe schwerer geworden ist.
  --------------------------------------------------------------------- */
  function niveau(durchgang) {
    return (durchgang.stufe || 1) + (durchgang.score || 0) / 100;
  }

  /* Montag der Woche, in der das Datum liegt – als JJJJ-MM-TT. */
  function wochenStart(datum) {
    const tag = new Date(datum.getFullYear(), datum.getMonth(), datum.getDate());
    const wochentag = (tag.getDay() + 6) % 7;     /* Montag = 0 */
    tag.setDate(tag.getDate() - wochentag);
    return tag;
  }

  /* Durchgänge nach Wochen bündeln, älteste Woche zuerst. Leere Wochen
     dazwischen bleiben erhalten – eine Pause soll man in der Kurve sehen. */
  function nachWochen(durchgaenge) {
    const eimer = {};
    for (const d of durchgaenge) {
      const datum = new Date(d.id);
      if (isNaN(datum)) continue;
      const schluessel = tagesText(wochenStart(datum));
      if (!eimer[schluessel]) eimer[schluessel] = [];
      eimer[schluessel].push(d);
    }

    const schluessel = Object.keys(eimer).sort();
    if (!schluessel.length) return [];

    const wochen = [];
    const lauf = new Date(schluessel[0]);
    const ende = new Date(schluessel[schluessel.length - 1]);
    while (lauf <= ende) {
      const text = tagesText(lauf);
      wochen.push({ start: new Date(lauf), durchgaenge: eimer[text] || [] });
      lauf.setDate(lauf.getDate() + 7);
    }
    return wochen;
  }

  /* -------------------------------- Streak --------------------------------
     Tage in Folge mit mindestens einem Durchgang, von heute (oder gestern)
     aus zurückgezählt. Gestern zählt noch mit, damit der Streak nicht
     mitten am Tag auf 0 springt.
  ------------------------------------------------------------------------- */
  function tagesText(datum) {
    /* Lokales Datum als JJJJ-MM-TT, nicht UTC – sonst kippt der Tag abends. */
    const jahr = datum.getFullYear();
    const monat = String(datum.getMonth() + 1).padStart(2, "0");
    const tag = String(datum.getDate()).padStart(2, "0");
    return jahr + "-" + monat + "-" + tag;
  }

  function uebungstage(durchgaenge) {
    const tage = new Set();
    for (const d of durchgaenge) {
      const datum = new Date(d.id);
      if (!isNaN(datum)) tage.add(tagesText(datum));
    }
    return tage;
  }

  function streak(durchgaenge) {
    const tage = uebungstage(durchgaenge);
    if (!tage.size) return 0;

    const heute = new Date();
    const start = new Date(heute);
    if (!tage.has(tagesText(heute))) {
      /* Heute noch nicht geübt: ab gestern zählen. */
      start.setDate(start.getDate() - 1);
      if (!tage.has(tagesText(start))) return 0;
    }

    let zaehler = 0;
    const lauf = new Date(start);
    while (tage.has(tagesText(lauf))) {
      zaehler++;
      lauf.setDate(lauf.getDate() - 1);
    }
    return zaehler;
  }

  function heuteGeuebt(durchgaenge) {
    return uebungstage(durchgaenge).has(tagesText(new Date()));
  }

  function minutenGesamt(durchgaenge) {
    const sekunden = durchgaenge.reduce((summe, d) => summe + (d.dauerSek || 0), 0);
    return Math.round(sekunden / 60);
  }

  /* ----------------------------- Darstellung ----------------------------- */

  /* "14.10.2026, 18:30" */
  function datumText(id) {
    const datum = new Date(id);
    if (isNaN(datum)) return String(id);
    return datum.toLocaleString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  /* Pfeil und Differenz zum vorherigen Durchgang. */
  function vergleich(score, vorher) {
    if (typeof vorher !== "number") return { pfeil: "·", text: "erster Durchgang", richtung: "neu" };
    const differenz = score - vorher;
    if (differenz > 0) return { pfeil: "▲", text: "+" + differenz + " zum letzten Mal", richtung: "hoch" };
    if (differenz < 0) return { pfeil: "▼", text: differenz + " zum letzten Mal", richtung: "runter" };
    return { pfeil: "=", text: "gleich wie letztes Mal", richtung: "gleich" };
  }

  return {
    begrenzen: begrenzen,
    mittelwert: mittelwert,
    gleitenderDurchschnitt: gleitenderDurchschnitt,
    scoreDualtask: scoreDualtask,
    scoreSpiegelschrift: scoreSpiegelschrift,
    scoreMirrortrace: scoreMirrortrace,
    scoreSequenz: scoreSequenz,
    scoreStroop: scoreStroop,
    scoreRhythmus: scoreRhythmus,
    erfolgsquote: erfolgsquote,
    dualTaskKosten: dualTaskKosten,
    dualTaskKostenVerlauf: dualTaskKostenVerlauf,
    istEinzelwert: istEinzelwert,
    haendeVon: haendeVon,
    niveau: niveau,
    wochenStart: wochenStart,
    nachWochen: nachWochen,
    streak: streak,
    uebungstage: uebungstage,
    heuteGeuebt: heuteGeuebt,
    minutenGesamt: minutenGesamt,
    tagesText: tagesText,
    datumText: datumText,
    vergleich: vergleich
  };

})();
