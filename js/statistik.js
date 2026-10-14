/* ==========================================================================
   statistik.js – die Statistik-Seite

   Zeigt (Plan, Abschnitt 6):
     Kalender-Heatmap, Score-Verlauf je Modul, Dual-Task-Kosten,
     Hand-Vergleich und die Liste aller Durchgänge.

   Wichtig beim Lesen der Kurven: Ein Score auf Stufe 2 und einer auf Stufe 7
   sind nicht dasselbe. Darum lässt sich der Verlauf auf eine einzelne Stufe
   einschränken – nur dann ist er ein echter Vergleich.
   ========================================================================== */

const Statistik = (function () {

  /* Welches Modul gerade gezeigt wird. Einen Stufenfilter braucht es nicht
     mehr: Die Kurve zeigt das Niveau (Stufe plus Score) und bleibt dadurch
     über Stufenwechsel hinweg vergleichbar. */
  let modul = null;

  /* "1 Durchgang" statt "1 Durchgänge" – kleine Sache, fällt aber auf. */
  function zahl(wert, einzahl, mehrzahl) {
    return wert + " " + (wert === 1 ? einzahl : mehrzahl);
  }

  function modulName(schluessel) {
    return { dualtask: "Dual Task", mirrorwrite: "Spiegelschrift",
             mirrortrace: "Mirror Tracing", sequence: "Sequenz-Training",
             stroop: "Stroop-Test", rhythm: "Rhythmus" }[schluessel] || schluessel;
  }

  /* Module, zu denen es überhaupt Durchgänge gibt. */
  function moduleMitDaten() {
    const gezaehlt = {};
    for (const d of Speicher.durchgaenge()) gezaehlt[d.modul] = (gezaehlt[d.modul] || 0) + 1;
    return Object.keys(gezaehlt).sort((a, b) => gezaehlt[b] - gezaehlt[a]);
  }

  /* ============================== Aufbau ============================== */

  function zeichnen() {
    const flaeche = document.getElementById("ansicht-statistik");
    const alle = Speicher.durchgaenge();

    if (!alle.length) {
      flaeche.innerHTML =
        '<h1 class="titel">Statistik</h1>' +
        '<p class="untertitel">Hier entsteht dein Verlauf, sobald du den ersten ' +
        "Durchgang gemacht hast.</p>";
      return;
    }

    const module = moduleMitDaten();
    if (!modul || module.indexOf(modul) < 0) modul = module[0];

    flaeche.innerHTML =
      '<h1 class="titel">Statistik</h1>' +
      '<p class="untertitel">' + zahl(alle.length, "Durchgang", "Durchgänge") + " · " +
        zahl(Auswertung.uebungstage(alle).size, "Tag", "Tage") + " geübt · " +
        zahl(Auswertung.minutenGesamt(alle), "Minute", "Minuten") + " insgesamt</p>" +

      /* ---------------------- Kalender ---------------------- */
      '<div class="flaeche">' +
        '<h2 class="flaeche-titel">Geübte Tage</h2>' +
        '<p class="flaeche-text klein">Je kräftiger das Feld, desto mehr Durchgänge an dem Tag. ' +
          "Aktuell <b>" + zahl(Auswertung.streak(alle), "Tag", "Tage") + "</b> in Folge.</p>" +
        '<canvas id="stat-heatmap"></canvas>' +
      "</div>" +

      /* ---------------------- Gesamtbild ---------------------- */
      gesamtAbschnitt(alle) +

      /* ---------------------- Modulauswahl ---------------------- */
      '<h2 class="trenner">Einzelne Übungen</h2>' +
      '<div class="modulwahl">' +
        module.map((m) =>
          '<button class="knopf modul-knopf' + (m === modul ? " modul-aktiv" : "") +
          '" data-modul="' + m + '">' + modulName(m) + "</button>"
        ).join("") +
      "</div>" +

      /* ---------------------- Verlauf ---------------------- */
      '<div class="flaeche">' +
        '<h2 class="flaeche-titel">Verlauf</h2>' +
        '<p class="flaeche-text klein">' +
          "Gezeigt wird das <b>Niveau</b> – Stufe plus Score, also 7,80 für " +
          "Stufe 7 mit Score 80. Dadurch bleibt die Kurve über Stufenwechsel " +
          "hinweg vergleichbar: Ein Aufstieg drückt den Score kurz nach unten, " +
          "das Niveau steigt trotzdem. Die kräftige Linie ist der Schnitt über " +
          "fünf Durchgänge." +
        "</p>" +
        '<canvas id="stat-score"></canvas>' +
      "</div>" +

      /* ---------------------- modulabhängiger Teil ---------------------- */
      zusatzAbschnitt() +

      /* ---------------------- Liste ---------------------- */
      '<details class="hinweis">' +
        "<summary>Alle Durchgänge als Liste</summary>" +
        listeHtml(alle) +
      "</details>";

    verdrahten();
    diagrammeZeichnen();
  }

  /* ----------------------------- Gesamtbild -----------------------------
     Eine Kurve über alles. Grundlage ist nicht der Score, sondern das Niveau
     (Stufe plus Score) – sonst sähe jeder Stufenaufstieg wie ein Rückschritt
     aus, obwohl er das Gegenteil ist.
  --------------------------------------------------------------------- */

  function niveauJeWoche(durchgaenge) {
    return Auswertung.nachWochen(durchgaenge.slice().reverse()).map((woche) => ({
      start: woche.start,
      wert: woche.durchgaenge.length
        ? Auswertung.mittelwert(woche.durchgaenge.map(Auswertung.niveau)) : null,
      minuten: Math.round(woche.durchgaenge.reduce((s, d) => s + (d.dauerSek || 0), 0) / 60),
      anzahl: woche.durchgaenge.length
    }));
  }

  /* Niveau im Zeitraum der letzten n Tage (für den Vergleich Monat zu Monat). */
  function niveauImFenster(durchgaenge, vonTagen, bisTagen) {
    const jetzt = Date.now();
    const passend = durchgaenge.filter((d) => {
      const alter = (jetzt - new Date(d.id).getTime()) / 86400000;
      return alter >= bisTagen && alter < vonTagen;
    });
    return passend.length ? Auswertung.mittelwert(passend.map(Auswertung.niveau)) : null;
  }

  function zahlText(wert, stellen) {
    return wert == null ? "–" : wert.toFixed(stellen === undefined ? 2 : stellen).replace(".", ",");
  }

  /* Welche Hand eine Übung gerade fordert, hängt von der Stufe ab: Stroop
     wird auf Stufe 3 nur mit rechts getippt, ab Stufe 5 im Wechsel. Darum
     werden die Farben aus den letzten 30 Tagen abgeleitet und nicht fest je
     Modul vergeben. Cyan = links, Orange = rechts, beides = ein zweifarbiger
     Balken. */
  function handFarben(modul) {
    const jetzt = Date.now();
    const letzte = Speicher.durchgaenge(modul).filter((d) =>
      (jetzt - new Date(d.id).getTime()) / 86400000 < 30);

    let links = false;
    let rechts = false;
    for (const d of letzte) {
      const haende = Auswertung.haendeVon(d);
      links = links || haende.links;
      rechts = rechts || haende.rechts;
    }

    const cyan = Diagramme.farbe("--links", "#22d3ee");
    const orange = Diagramme.farbe("--rechts", "#fb923c");
    if (links && rechts) return [cyan, orange];
    if (rechts) return [orange];
    return [cyan];
  }

  function gesamtAbschnitt(alle) {
    const jetzt = niveauImFenster(alle, 30, 0);
    const davor = niveauImFenster(alle, 60, 30);
    const veraenderung = (jetzt != null && davor != null) ? jetzt - davor : null;

    /* stärkstes und schwächstes Modul nach aktuellem Niveau */
    const proModul = moduleMitDaten().map((m) => ({
      modul: m, niveau: niveauImFenster(Speicher.durchgaenge(m), 30, 0)
    })).filter((e) => e.niveau != null).sort((a, b) => b.niveau - a.niveau);

    return '<div class="flaeche">' +
      '<h2 class="flaeche-titel">Lernkurve über alles</h2>' +
      '<p class="flaeche-text klein">' +
        "Gezeigt wird dein <b>Niveau</b>: die Stufe plus der Score als " +
        "Nachkommastelle – Stufe 7 mit Score 80 ergibt 7,80. Nur so taugt eine " +
        "Gesamtkurve etwas, denn ein Stufenaufstieg drückt den Score kurz nach " +
        "unten, obwohl er ein Fortschritt ist. Je Woche gemittelt." +
      "</p>" +

      '<div class="streifen gesamt-zahlen">' +
        '<div class="kennzahl"><span class="kennzahl-wert">' + zahlText(jetzt) + "</span>" +
          '<span class="kennzahl-text">Niveau, letzte 30 Tage</span></div>' +
        '<div class="kennzahl"><span class="kennzahl-wert ' +
          (veraenderung == null ? "" : veraenderung >= 0 ? "wert-hoch" : "wert-runter") + '">' +
          (veraenderung == null ? "–" : (veraenderung >= 0 ? "+" : "") + zahlText(veraenderung)) +
          "</span><span class='kennzahl-text'>gegenüber dem Monat davor</span></div>" +
        '<div class="kennzahl"><span class="kennzahl-wert klein-wert">' +
          (proModul.length ? modulName(proModul[0].modul) : "–") + "</span>" +
          '<span class="kennzahl-text">stärkste Übung</span></div>' +
        '<div class="kennzahl"><span class="kennzahl-wert klein-wert">' +
          (proModul.length ? modulName(proModul[proModul.length - 1].modul) : "–") + "</span>" +
          '<span class="kennzahl-text">größter Rückstand</span></div>' +
      "</div>" +

      '<canvas id="stat-gesamt"></canvas>' +

      '<p class="flaeche-text klein" style="margin-top:16px">Dein Stand je Übung ' +
        "(Schnitt der letzten 30 Tage):</p>" +
      '<canvas id="stat-module"></canvas>' +
      '<p class="flaeche-text klein stufen-legende">' +
        '<span class="punkt hand-links"></span> fordert die linke Hand ' +
        '<span class="punkt hand-rechts"></span> die rechte ' +
        '<span class="punkt hand-beide"></span> zweifarbig: beide Hände' +
      "</p>" +

      '<p class="flaeche-text klein" style="margin-top:16px">Und so viel hast du je Woche geübt:</p>' +
      '<canvas id="stat-pensum"></canvas>' +
    "</div>";
  }

  function gesamtZeichnen(alle) {
    const canvas = document.getElementById("stat-gesamt");
    if (!canvas) return;

    const gesamt = niveauJeWoche(alle);
    /* Wochen ohne Übung lassen in der Kurve eine Lücke – dafür wird der
       letzte bekannte Wert gehalten, sonst fiele die Linie auf null. */
    let letzter = null;
    const punkte = gesamt.map((w) => {
      if (w.wert != null) letzter = w.wert;
      return { wert: letzter == null ? 1 : letzter };
    });

    /* Nur die Gesamtkurve: Sechs dünne Modullinien kreuzen sich ständig und
       sind kaum auseinanderzuhalten. Wie die einzelnen Übungen stehen, zeigt
       das Balkenbild darunter – das liest sich auf einen Blick. */
    const reihen = [
      { name: "Niveau", farbe: Diagramme.farbe("--gold", "#f5c451"), punkte: punkte }
    ];

    Diagramme.linie(canvas, {
      hoehe: 240, reihen: reihen,
      beschriftungen: gesamt.map((w) => w.start.toLocaleDateString("de-DE",
        { day: "2-digit", month: "2-digit", year: "numeric" })),
      leerText: "Die Kurve braucht ein paar Wochen Übung"
    });

    /* Stand je Übung als Balken */
    const module = document.getElementById("stat-module");
    if (module) {
      Diagramme.balken(module, {
        hoehe: 240, max: 11,
        balken: moduleMitDaten().map((m) => ({
          name: modulName(m),
          wert: niveauImFenster(Speicher.durchgaenge(m), 30, 0) || 0,
          farben: handFarben(m)
        })),
        leerText: "Noch keine Durchgänge in den letzten 30 Tagen"
      });
    }

    const pensum = document.getElementById("stat-pensum");
    if (pensum) {
      Diagramme.linie(pensum, {
        hoehe: 150, yMin: 0, einheit: " Min",
        reihen: [{ name: "Minuten", farbe: Diagramme.farbe("--links", "#22d3ee"),
                   punkte: gesamt.map((w) => ({ wert: w.minuten })) }],
        beschriftungen: gesamt.map((w) => w.start.toLocaleDateString("de-DE",
          { day: "2-digit", month: "2-digit" }))
      });
    }
  }

  /* Was zusätzlich zum Score interessant ist, hängt vom Modul ab. */
  function zusatzAbschnitt() {
    if (modul === "dualtask") {
      return '<div class="flaeche">' +
        '<h2 class="flaeche-titel">Dual-Task-Kosten</h2>' +
        '<p class="flaeche-text klein">Wie viel schlechter das Gleichzeitige ist als ' +
          "dieselbe Aufgabe getrennt geübt – in Prozent, <b>immer innerhalb " +
          "derselben Stufe</b> verglichen. <b>Sinkt diese Kurve, wird die " +
          "Koordination besser.</b> Das ist die wichtigste Zahl der App. Den " +
          "nötigen Basiswert holt sich das Modul von selbst, etwa alle acht " +
          "Durchgänge.</p>" +
        '<canvas id="stat-zusatz"></canvas>' +
      "</div>";
    }
    if (modul === "mirrortrace") {
      return '<div class="flaeche">' +
        '<h2 class="flaeche-titel">Linke gegen rechte Hand</h2>' +
        '<p class="flaeche-text klein">Schnitt der letzten fünf Durchgänge. Ziel ist nicht, ' +
          "dass beide Balken hoch sind, sondern dass sie <b>gleich hoch</b> werden.</p>" +
        '<canvas id="stat-zusatz"></canvas>' +
        '<p class="flaeche-text klein" style="margin-top:14px">Und so entwickelt sich der Abstand:</p>' +
        '<canvas id="stat-zusatz2"></canvas>' +
      "</div>";
    }
    if (modul === "sequence") {
      return '<div class="flaeche">' +
        '<h2 class="flaeche-titel">Lerneffekt</h2>' +
        '<p class="flaeche-text klein">Um wie viele Millisekunden die versteckte Folge schneller ' +
          "geht als der Zufallsblock. Über null heißt: die Hand hat das Muster.</p>" +
        '<canvas id="stat-zusatz"></canvas>' +
      "</div>";
    }
    if (modul === "rhythm") {
      return '<div class="flaeche">' +
        '<h2 class="flaeche-titel">Wie genau hält jede Hand ihren Takt</h2>' +
        '<p class="flaeche-text klein">Mittlere Abweichung vom Soll-Schlag, links cyan, rechts orange. ' +
          "<b>Beide Linien sollen sinken und sich annähern.</b></p>" +
        '<canvas id="stat-zusatz"></canvas>' +
      "</div>";
    }
    if (modul === "stroop") {
      return '<div class="flaeche">' +
        '<h2 class="flaeche-titel">Stroop-Effekt</h2>' +
        '<p class="flaeche-text klein">Die Zusatzzeit, die unpassende Wörter kosten. ' +
          "<b>Sinkt die Kurve, gelingt das Unterdrücken des Lesens besser.</b></p>" +
        '<canvas id="stat-zusatz"></canvas>' +
      "</div>";
    }
    if (modul === "mirrorwrite") {
      return '<div class="flaeche">' +
        '<h2 class="flaeche-titel">Genauigkeit und Lesbarkeit</h2>' +
        '<p class="flaeche-text klein">Wie viel vom Strich auf der Vorlage lag (blau), wie viel ' +
          "der Vorlage nachgefahren wurde (gold) und deine eigene Einschätzung " +
          "der Lesbarkeit, umgerechnet auf 100.</p>" +
        '<canvas id="stat-zusatz"></canvas>' +
      "</div>";
    }
    return "";
  }

  function listeHtml(alle) {
    const zeilen = alle.slice(0, 60).map((d) =>
      "<tr>" +
        "<td>" + Auswertung.datumText(d.id) + "</td>" +
        "<td>" + modulName(d.modul) + "</td>" +
        "<td>" + (d.stufe || "–") + "</td>" +
        "<td>" + (d.score != null ? d.score : "–") + "</td>" +
      "</tr>"
    ).join("");

    return '<table class="liste">' +
      "<thead><tr><th>Zeitpunkt</th><th>Modul</th><th>Stufe</th><th>Score</th></tr></thead>" +
      "<tbody>" + zeilen + "</tbody></table>" +
      (alle.length > 60 ? '<p class="leer">… ältere Durchgänge sind im Export enthalten.</p>' : "");
  }

  function verdrahten() {
    for (const knopf of document.querySelectorAll(".modul-knopf")) {
      knopf.addEventListener("click", () => {
        modul = knopf.dataset.modul;
        zeichnen();
      });
    }
  }

  /* ============================ Diagramme ============================ */

  /* Durchgänge des gewählten Moduls, älteste zuerst – so läuft die Zeit
     nach rechts. */
  function reiheFuerModul() {
    return Speicher.durchgaenge(modul).slice().reverse();
  }

  function diagrammeZeichnen() {
    const alle = Speicher.durchgaenge();

    /* Kalender */
    const tage = {};
    for (const d of alle) {
      const datum = new Date(d.id);
      if (isNaN(datum)) continue;
      const schluessel = Auswertung.tagesText(datum);
      tage[schluessel] = (tage[schluessel] || 0) + 1;
    }
    const heatmap = document.getElementById("stat-heatmap");
    if (heatmap) Diagramme.heatmap(heatmap, { tage: tage, wochen: 18 });

    gesamtZeichnen(alle);

    /* Niveau-Verlauf: Rohwerte dünn, der Schnitt über fünf kräftig. */
    const reihe = reiheFuerModul();
    const roh = reihe.map((d) => ({ wert: Math.round(Auswertung.niveau(d) * 100) / 100 }));
    const schnitt = roh.map((_, i) => {
      const fenster = roh.slice(Math.max(0, i - 4), i + 1).map((p) => p.wert);
      return { wert: Math.round(Auswertung.mittelwert(fenster) * 100) / 100 };
    });

    const scoreCanvas = document.getElementById("stat-score");
    if (scoreCanvas) {
      Diagramme.linie(scoreCanvas, {
        hoehe: 240, legende: true,
        reihen: [
          { name: "je Durchgang", farbe: Diagramme.farbe("--links", "#22d3ee"),
            punkte: roh, duenn: true },
          { name: "Schnitt über 5", farbe: Diagramme.farbe("--gold", "#f5c451"), punkte: schnitt }
        ],
        beschriftungen: reihe.map((d) => Auswertung.datumText(d.id).split(",")[0]),
        leerText: "Noch keine Durchgänge in dieser Übung"
      });
    }

    zusatzZeichnen(reihe);
  }

  function zusatzZeichnen(reihe) {
    const canvas = document.getElementById("stat-zusatz");
    if (!canvas) return;

    if (modul === "dualtask") {
      /* Für die Kosten immer alle Stufen heranziehen – der Basiswert steckt
         in Stufe 1, der Vergleich in den höheren. */
      const alleDual = Speicher.durchgaenge("dualtask").slice().reverse();
      const verlauf = Auswertung.dualTaskKostenVerlauf(alleDual);
      const roh = verlauf.map((p) => ({ wert: p.kosten }));
      /* Einzelne Vergleiche schwanken stark – beide Werte darin tragen ihr
         eigenes Rauschen. Erst der Trend über fünf zeigt die Richtung. */
      const trend = roh.map((_, i) => ({
        wert: Math.round(Auswertung.mittelwert(
          roh.slice(Math.max(0, i - 4), i + 1).map((x) => x.wert)))
      }));

      Diagramme.linie(canvas, {
        einheit: " %", legende: true, hoehe: 240,
        reihen: [
          { name: "je Durchgang", farbe: Diagramme.farbe("--rechts", "#fb923c"),
            punkte: roh, duenn: true },
          { name: "Trend über 5", farbe: Diagramme.farbe("--gold", "#f5c451"), punkte: trend }
        ],
        beschriftungen: verlauf.map((p) => Auswertung.datumText(p.id).split(",")[0]),
        leerText: "Dafür fehlt noch ein Basiswert auf einer Stufe, die du auch dual geübt hast"
      });
      return;
    }

    if (modul === "mirrortrace") {
      const letzte = reihe.slice(-5);
      const mittelLinks = Auswertung.mittelwert(letzte.map((d) => d.werte.scoreLinks || 0));
      const mittelRechts = Auswertung.mittelwert(letzte.map((d) => d.werte.scoreRechts || 0));
      Diagramme.balken(canvas, {
        max: 100,
        balken: [
          { name: "linke Hand", wert: mittelLinks, farbe: Diagramme.farbe("--links", "#22d3ee") },
          { name: "rechte Hand", wert: mittelRechts, farbe: Diagramme.farbe("--rechts", "#fb923c") }
        ]
      });

      const abstand = document.getElementById("stat-zusatz2");
      if (abstand) {
        Diagramme.linie(abstand, {
          hoehe: 180, einheit: " P",
          reihen: [{ name: "Abstand", farbe: Diagramme.farbe("--gold", "#f5c451"),
                     punkte: reihe.map((d) => ({ wert: d.werte.handUnterschied || 0 })) }],
          beschriftungen: reihe.map((d) => Auswertung.datumText(d.id).split(",")[0])
        });
      }
      return;
    }

    if (modul === "rhythm") {
      Diagramme.linie(canvas, {
        einheit: " ms", legende: true,
        reihen: [
          { name: "links", farbe: Diagramme.farbe("--links", "#22d3ee"),
            punkte: reihe.map((d) => ({ wert: d.werte.abweichungLinksMs || 0 })) },
          { name: "rechts", farbe: Diagramme.farbe("--rechts", "#fb923c"),
            punkte: reihe.map((d) => ({ wert: d.werte.abweichungRechtsMs || 0 })) }
        ],
        beschriftungen: reihe.map((d) => Auswertung.datumText(d.id).split(",")[0])
      });
      return;
    }

    if (modul === "stroop") {
      Diagramme.linie(canvas, {
        einheit: " ms",
        reihen: [{ name: "Stroop-Effekt", farbe: Diagramme.farbe("--rechts", "#fb923c"),
                   punkte: reihe.map((d) => ({ wert: d.werte.stroopEffektMs || 0 })) }],
        beschriftungen: reihe.map((d) => Auswertung.datumText(d.id).split(",")[0])
      });
      return;
    }

    if (modul === "sequence") {
      Diagramme.linie(canvas, {
        einheit: " ms",
        reihen: [{ name: "Lerneffekt", farbe: Diagramme.farbe("--gut", "#35d39a"),
                   punkte: reihe.map((d) => ({ wert: d.werte.lerneffektMs || 0 })) }],
        beschriftungen: reihe.map((d) => Auswertung.datumText(d.id).split(",")[0])
      });
      return;
    }

    if (modul === "mirrorwrite") {
      Diagramme.linie(canvas, {
        yMin: 0, yMax: 100, einheit: " %", legende: true,
        reihen: [
          { name: "auf der Vorlage", farbe: Diagramme.farbe("--links", "#22d3ee"),
            punkte: reihe.map((d) => ({ wert: d.werte.trefferProzent || 0 })) },
          { name: "nachgefahren", farbe: Diagramme.farbe("--gold", "#f5c451"),
            punkte: reihe.map((d) => ({ wert: d.werte.deckungProzent || 0 })) },
          { name: "Lesbarkeit", farbe: Diagramme.farbe("--gut", "#35d39a"), duenn: true,
            punkte: reihe.map((d) => ({ wert: ((d.werte.lesbarkeit || 1) - 1) / 4 * 100 })) }
        ],
        beschriftungen: reihe.map((d) => Auswertung.datumText(d.id).split(",")[0])
      });
    }
  }

  /* Bei Größenänderung des Fensters neu zeichnen – Canvas rechnet in
     festen Bildpunkten und würde sonst verzerren. */
  let warteId = 0;
  window.addEventListener("resize", () => {
    const ansicht = document.getElementById("ansicht-statistik");
    if (!ansicht || ansicht.hidden) return;
    clearTimeout(warteId);
    warteId = setTimeout(diagrammeZeichnen, 150);
  });

  return { zeichnen: zeichnen };

})();
