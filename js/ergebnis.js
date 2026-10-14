/* ==========================================================================
   ergebnis.js – Ergebnisseite nach einem Durchgang

   Zeigt (Plan, Abschnitt 6):
     Score groß, Vergleich zum letzten Mal, die wichtigsten Werte,
     Stufen-Hinweis und das Spur-Replay.

   Das Replay liegt NICHT im Speicher, sondern kommt direkt vom Modul
   (siehe app.js). Es ist also nur unmittelbar nach dem Durchgang zu sehen –
   dafür kostet es keinen Platz im localStorage.
   ========================================================================== */

const Ergebnis = (function () {

  let replayDaten = null;
  let replayCanvas = null;
  let abspielId = 0;

  /* --------------------------- kleine Bausteine --------------------------- */

  /* Zahlen ohne unnötige Nachkommastellen, fehlende Werte als Strich. */
  function formatiere(wert) {
    if (typeof wert !== "number") return "–";
    return Math.round(wert * 10) / 10;
  }

  /* Jedes Modul benennt seine Rollen anders (Dual Task: maus/tippen,
     Spiegelschrift: schreiben). Darum wird hier übersetzt, was da ist. */
  const ROLLENNAMEN = {
    maus: "Maus", tippen: "Tippen", schreiben: "Schreiben",
    nacheinander: "Hände", antwort: "Antwort mit", klopfen: "Klopfen mit"
  };

  function handText(hand) {
    if (!hand) return "";
    return Object.keys(hand)
      .map((rolle) => (ROLLENNAMEN[rolle] || rolle) + " " + hand[rolle])
      .join(", ");
  }

  function farbeZumScore(score) {
    if (score >= 80) return "var(--gut)";
    if (score >= 60) return "var(--gold)";
    return "var(--rechts)";
  }

  /* Eine Wertkachel mit Vergleich zum letzten Durchgang. Bei Abweichung und
     Tippzeit ist weniger besser – darum kleinerIstBesser. */
  function wertKachel(titel, wert, einheit, jetzt, vorher, kleinerIstBesser) {
    let zusatz = "";
    if (typeof vorher === "number" && typeof jetzt === "number") {
      const differenz = Math.round((jetzt - vorher) * 10) / 10;
      if (differenz !== 0) {
        const besser = kleinerIstBesser ? differenz < 0 : differenz > 0;
        const pfeil = differenz > 0 ? "▲" : "▼";
        const klasse = besser ? "delta delta-gut" : "delta delta-schlecht";
        zusatz = '<span class="' + klasse + '">' + pfeil + " " +
                 Math.abs(differenz) + "</span>";
      } else {
        zusatz = '<span class="delta">= gleich</span>';
      }
    }
    return '<div class="wert">' +
             '<span class="wert-titel">' + titel + "</span>" +
             '<span class="wert-zahl">' + wert + '<small>' + einheit + "</small></span>" +
             zusatz +
           "</div>";
  }

  /* ------------------------------- Aufbau ------------------------------- */

  /* daten: { modulName, schluessel, durchgang, vorheriger, alteStufe,
              neueStufe, bestwert, schnitt, replay, aufZurueck, aufNochmal } */
  function zeigen(flaeche, daten) {
    const d = daten.durchgang;
    const w = d.werte || {};
    const gleicheStufe = daten.vorheriger && daten.vorheriger.stufe === d.stufe;
    const vorherW = gleicheStufe ? (daten.vorheriger.werte || {}) : {};
    const vergleich = Auswertung.vergleich(d.score, daten.vorheriger ? daten.vorheriger.score : undefined);

    /* Jeder Vergleich hier bezieht sich nur auf dieselbe Stufe. Das wird im
       Text auch gesagt, damit die Zahlen nicht falsch gelesen werden. */
    const aufStufe = " auf Stufe " + d.stufe;
    const vergleichText = daten.vorheriger
      ? vergleich.text.replace("zum letzten Mal", "zum letzten Mal" + aufStufe)
      : "erster Durchgang" + aufStufe;

    /* Bestwert: der aktuelle Durchgang ist schon gespeichert, also zählt er
       nur als neuer Rekord, wenn es überhaupt einen Vorgänger gab. */
    const istBestwert = daten.vorheriger && d.score >= daten.bestwert && d.score > daten.vorheriger.score;

    /* Welche Werte gezeigt werden, bestimmt das Modul (extras.kacheln).
       So braucht die Ergebnisseite nichts über einzelne Übungen zu wissen. */
    const kachelHtml = (daten.kacheln || []).map((k) =>
      wertKachel(k.titel, formatiere(w[k.feld]), k.einheit,
                 w[k.feld], vorherW[k.feld], !!k.kleinerIstBesser)
    ).join("");

    flaeche.innerHTML =
      '<h1 class="titel">' + daten.modulName + "</h1>" +
      '<p class="untertitel">Stufe ' + d.stufe + " · " + d.dauerSek + " Sekunden · " +
        handText(d.hand) + "<br>" +
        '<span class="klein">Alle Vergleiche unten beziehen sich nur auf Stufe ' +
        d.stufe + " – andere Stufen sind zu verschieden.</span></p>" +

      /* ---------------- Score ---------------- */
      '<div class="flaeche ergebnis-kopf">' +
        '<div class="score-block">' +
          '<span class="score" style="color:' + farbeZumScore(d.score) + '">' + d.score + "</span>" +
          '<span class="score-text">von 100</span>' +
        "</div>" +
        '<div class="score-neben">' +
          '<p class="score-vergleich ' + vergleich.richtung + '">' + vergleich.pfeil + " " + vergleichText + "</p>" +
          (istBestwert ? '<p class="bestwert">Bester Wert auf Stufe ' + d.stufe + "</p>" : "") +
          '<p class="flaeche-text klein">Schnitt der letzten 5 Durchgänge auf dieser Stufe: <b>' +
            daten.schnitt + "</b> (" + daten.anzahlAufStufe +
            (daten.anzahlAufStufe === 1 ? " Durchgang" : " Durchgänge") + " bisher)</p>" +
          '<p class="flaeche-text klein stufen-hinweis">' +
            (d.basiswert
              ? "Stufe " + d.stufe + " bleibt – ein Basiswert zählt nicht für die Stufe."
              : Schwierigkeit.stufenHinweis(daten.alteStufe, daten.neueStufe)) + "</p>" +
          (daten.notiz ? '<p class="basis-hinweis">' + daten.notiz + "</p>" : "") +
        "</div>" +
      "</div>" +

      /* ---------------- Werte ---------------- */
      (kachelHtml ? '<div class="werte-raster">' + kachelHtml + "</div>" : "") +

      /* Bildergalerie (Spiegelschrift): das Geschriebene noch einmal sehen */
      (daten.galerie && daten.galerie.length
        ? '<div class="flaeche">' +
            '<h2 class="flaeche-titel">' + (daten.galerieTitel || "Was du geschrieben hast") + "</h2>" +
            '<p class="flaeche-text klein">' + (daten.galerieText ||
              "Dein Strich und daneben das Spiegelbild – so liest es sich.") + "</p>" +
            '<div class="galerie">' +
              daten.galerie.map((eintrag) =>
                /* Mit Spiegelbild (Spiegelschrift) oder nur ein Bild
                   (Mirror Tracing) – beides kommt hier an. */
                '<figure class="galerie-paar' + (eintrag.spiegel ? "" : " galerie-einzeln") + '">' +
                  '<div class="galerie-bild"><img src="' + eintrag.gemalt + '" alt="Zeichnung">' +
                    (eintrag.spiegel ? "<span>geschrieben</span>" : "") + "</div>" +
                  (eintrag.spiegel
                    ? '<div class="galerie-bild"><img src="' + eintrag.spiegel + '" alt="im Spiegel">' +
                      "<span>im Spiegel</span></div>"
                    : "") +
                  "<figcaption>" + eintrag.text + "</figcaption>" +
                "</figure>"
              ).join("") +
            "</div>" +
          "</div>"
        : "") +

      /* ---------------- Replay ---------------- */
      (daten.replay && daten.replay.punkte && daten.replay.punkte.length
        ? '<div class="flaeche">' +
            '<h2 class="flaeche-titel">Deine Spur</h2>' +
            '<p class="flaeche-text klein">' +
              "Die blasse Linie ist die Soll-Spur, darüber liegt dein Weg. " +
              "Rot heißt: zu weit vom wandernden Punkt entfernt." +
            "</p>" +
            '<canvas id="replay-canvas"></canvas>' +
            '<div class="legende">' +
              '<span class="legende-punkt legende-gut"></span> im Schlauch' +
              '<span class="legende-punkt legende-schlecht"></span> daneben' +
              '<button class="knopf klein-knopf" id="replay-abspielen">Abspielen</button>' +
            "</div>" +
          "</div>"
        : "") +

      '<div class="knopfreihe">' +
        '<button class="knopf knopf-haupt" id="erg-nochmal">Noch ein Durchgang</button>' +
        '<button class="knopf" id="erg-zurueck">Zurück zu den Übungen</button>' +
      "</div>";

    flaeche.querySelector("#erg-nochmal").addEventListener("click", daten.aufNochmal);
    flaeche.querySelector("#erg-zurueck").addEventListener("click", daten.aufZurueck);

    replayDaten = daten.replay || null;
    replayCanvas = flaeche.querySelector("#replay-canvas");
    if (replayCanvas && replayDaten) {
      zeichneWennBreiteSteht();
      flaeche.querySelector("#replay-abspielen").addEventListener("click", abspielen);
    }
  }

  /* ------------------------------- Replay ------------------------------- */

  /* Steht das Layout noch nicht (Breite 0), im nächsten Bild erneut
     versuchen – sonst würde mit Maßstab 0 gezeichnet, also nichts. */
  function zeichneWennBreiteSteht(versuche) {
    const zaehler = versuche || 0;
    if (replayCanvas.clientWidth > 0) {
      replayVorbereiten();
      replayZeichnen(replayDaten.punkte.length);
    } else if (zaehler < 30) {
      requestAnimationFrame(() => zeichneWennBreiteSteht(zaehler + 1));
    }
  }


  /* Der Übungs-Canvas war meist größer als der hier. Alles wird deshalb mit
     einem festen Faktor verkleinert, damit Form und Abstände stimmen. */
  function replayVorbereiten() {
    const breite = replayCanvas.clientWidth;
    const faktor = breite / replayDaten.breite;
    const hoehe = Math.round(replayDaten.hoehe * faktor);

    const dichte = Math.min(window.devicePixelRatio || 1, 2);
    replayCanvas.style.height = hoehe + "px";
    replayCanvas.width = Math.round(breite * dichte);
    replayCanvas.height = Math.round(hoehe * dichte);

    const ctx = replayCanvas.getContext("2d");
    ctx.setTransform(dichte * faktor, 0, 0, dichte * faktor, 0, 0);
    replayDaten.faktor = faktor;
  }

  function replayZeichnen(bisIndex) {
    const ctx = replayCanvas.getContext("2d");
    const stil = getComputedStyle(document.documentElement);
    const farbeSoll = stil.getPropertyValue("--links").trim();
    const farbeGut = stil.getPropertyValue("--gut").trim();
    const farbeSchlecht = stil.getPropertyValue("--warnung").trim();

    ctx.clearRect(0, 0, replayDaten.breite, replayDaten.hoehe);

    /* Soll-Spur, blass im Hintergrund */
    ctx.strokeStyle = farbeSoll;
    ctx.lineWidth = replayDaten.spurBreitePx * 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.08;
    linie(ctx, replayDaten.bahn);
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1.5;
    linie(ctx, replayDaten.bahn);
    ctx.globalAlpha = 1;

    /* Gefahrener Weg: Stück für Stück, Farbe je nach drin oder daneben.
       Lücken entstehen, wo die Maus die Fläche verlassen hat. */
    const punkte = replayDaten.punkte;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    for (let i = 1; i < Math.min(bisIndex, punkte.length); i++) {
      const a = punkte[i - 1];
      const b = punkte[i];
      if (a.x === null || b.x === null) continue;
      ctx.strokeStyle = b.drin ? farbeGut : farbeSchlecht;
      ctx.globalAlpha = b.drin ? 0.75 : 0.9;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    /* Beim Abspielen: aktuelle Stelle zeigen – Zielpunkt und eigener Cursor */
    if (bisIndex < punkte.length) {
      const jetzt = punkte[bisIndex - 1];
      if (jetzt) {
        ctx.fillStyle = farbeSoll;
        ctx.beginPath();
        ctx.arc(jetzt.zx, jetzt.zy, 7, 0, Math.PI * 2);
        ctx.fill();

        if (jetzt.x !== null) {
          ctx.strokeStyle = jetzt.drin ? farbeGut : farbeSchlecht;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(jetzt.x, jetzt.y, 9, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }

  function linie(ctx, punkte) {
    if (!punkte || !punkte.length) return;
    ctx.beginPath();
    ctx.moveTo(punkte[0].x, punkte[0].y);
    for (let i = 1; i < punkte.length; i++) ctx.lineTo(punkte[i].x, punkte[i].y);
    ctx.stroke();
  }

  /* Spielt den Weg in Echtzeit nach (aufgezeichnet wurde alle 50 ms). */
  function abspielen() {
    clearInterval(abspielId);
    let index = 1;
    const knopf = document.getElementById("replay-abspielen");
    knopf.textContent = "Läuft …";

    abspielId = setInterval(() => {
      index += 1;
      replayZeichnen(index);
      if (index >= replayDaten.punkte.length) {
        clearInterval(abspielId);
        knopf.textContent = "Nochmal abspielen";
      }
    }, 50);
  }

  /* Beim Verlassen der Seite das Abspielen stoppen. */
  function stoppen() {
    clearInterval(abspielId);
  }

  return { zeigen: zeigen, stoppen: stoppen };

})();
