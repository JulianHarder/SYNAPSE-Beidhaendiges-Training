/* ==========================================================================
   mirrorwrite.js – Spiegelschrift-Trainer

   Links wird geschrieben, rechts läuft live das Spiegelbild mit. Geschrieben
   wird seitenverkehrt und von rechts nach links; wenn es stimmt, steht im
   Spiegel die normale Schrift.

   Ablauf:
     Erklärung -> Aufgabe 1 ... n (je: Vorlage nachfahren, "Fertig")
               -> Lesbarkeit selbst einschätzen -> Ergebnis

   Gemessen wird mit zwei unsichtbaren Hilfsbildern je Aufgabe:
     maskeWeit  die Vorlage dick gezeichnet  -> liegt mein Strich darauf?
     maskeKern  die Vorlage dünn gezeichnet  -> habe ich alles nachgefahren?
   ========================================================================== */

(function () {

  const SCHLUESSEL = "mirrorwrite";

  /* Vorlagen. Ohne Umlaute, weil die gespiegelt schwer zu lesen sind. */
  const TEXTE = {
    /* Symmetrische Buchstaben (A, H, M, O, T, U, V, W, X) fehlen mit
       Absicht: gespiegelt sehen sie gleich aus und üben nichts. */
    buchstabe: ["B", "C", "D", "E", "F", "G", "J", "K", "L", "N", "P", "R", "S", "Z"],
    wortKurz:  ["HAND", "LICHT", "STERN", "FOKUS", "BAHN", "PUNKT", "KERN"],
    wortLang:  ["SPIEGEL", "GEHIRN", "WASSER", "MUSTER", "ZEICHEN", "RICHTUNG"],
    satzKurz:  ["DIE HAND LERNT", "LINKS WIE RECHTS", "RUHIG UND GENAU"],
    satzLang:  ["JEDER STRICH ZAEHLT MIT", "DIE LINKE HAND SCHREIBT"]
  };

  const STRICHBREITE = 4;
  const VERBLASSEN_MS = 9000;   /* Modus "verblassend": so lange dauert es */
  const KURZ_MS = 3000;         /* Modus "kurz": so lange ist die Vorlage da */

  let lauf = null;

  /* ====================================================================
     1. Erklärung
     ==================================================================== */

  function vorlageText(modus) {
    if (modus === "vorlage")     return "Die Vorlage bleibt die ganze Zeit sichtbar.";
    if (modus === "verblassend") return "Die Vorlage verblasst langsam – ab der Hälfte schreibst du aus dem Gedächtnis.";
    if (modus === "kurz")        return "Die Vorlage ist nur drei Sekunden zu sehen, danach schreibst du frei.";
    return "Ohne Vorlage: nur das Wort steht da, die Form kommt aus deinem Kopf.";
  }

  function artText(art) {
    if (art === "buchstabe") return "einzelne Buchstaben";
    if (art === "wortKurz")  return "kurze Wörter";
    if (art === "wortLang")  return "längere Wörter";
    if (art === "satzKurz")  return "kurze Sätze";
    return "längere Sätze";
  }

  function starten(flaeche, kontext) {
    erklaerungZeigen(flaeche, kontext);
  }

  function erklaerungZeigen(flaeche, kontext) {
    const w = kontext.werte;

    flaeche.innerHTML =
      '<h1 class="titel">Spiegelschrift</h1>' +
      '<p class="untertitel">Stufe ' + w.stufe + " von 10 · " + w.aufgaben +
        (w.aufgaben === 1 ? " Aufgabe" : " Aufgaben") + "</p>" +

      '<div class="flaeche">' +
        App.stufenleiste(SCHLUESSEL, w.stufe, [
          { modus: "vorlage",     text: "Vorlage bleibt" },
          { modus: "verblassend", text: "verblasst" },
          { modus: "kurz",        text: "nur kurz" },
          { modus: "ohne",        text: "ohne Vorlage" }
        ]) +

        '<p class="flaeche-text">' +
          "Schreibe mit der <b>linken Hand</b> seitenverkehrt und von rechts nach " +
          "links. Rechts siehst du dabei live, wie es im Spiegel aussieht – " +
          "stimmt deine Spiegelschrift, steht dort normale Schrift." +
        "</p>" +

        '<div class="fakten">' +
          '<span><b>' + artText(w.art) + "</b>Vorlagen</span>" +
          '<span><b>' + w.aufgaben + "</b>Aufgaben</span>" +
          '<span><b>±' + w.toleranzPx + " px</b>erlaubte Abweichung</span>" +
        "</div>" +

        '<p class="flaeche-text ablauf"><b>Ablauf:</b> ' + vorlageText(w.modus) +
          " Ohne Zeitdruck – du schließt jede Aufgabe selbst ab. Am Ende " +
          "schätzt du die Lesbarkeit ein.</p>" +

        '<div class="rollen">' +
          '<div class="rolle rolle-links">' +
            "<span>Linke Hand · Maus oder Stift</span>" +
            "<b>schreiben</b>" +
          "</div>" +
        "</div>" +

        '<div class="knopfreihe">' +
          '<button class="knopf knopf-haupt" id="mw-start">Durchgang starten</button>' +
          '<button class="knopf" id="mw-zurueck">Zurück</button>' +
        "</div>" +
      "</div>";

    flaeche.querySelector("#mw-start").addEventListener("click", () => laufStarten(flaeche, kontext));
    flaeche.querySelector("#mw-zurueck").addEventListener("click", kontext.abbrechen);
  }

  /* ====================================================================
     2. Durchgang aufbauen
     ==================================================================== */

  function vorlagenWaehlen(art, anzahl) {
    const vorrat = TEXTE[art].slice();
    const gewaehlt = [];
    for (let i = 0; i < anzahl && vorrat.length; i++) {
      const index = Math.floor(Math.random() * vorrat.length);
      gewaehlt.push(vorrat.splice(index, 1)[0]);
    }
    return gewaehlt;
  }

  function laufStarten(flaeche, kontext) {
    const w = kontext.werte;

    flaeche.innerHTML =
      '<div class="uebung">' +
        '<div class="uebung-kopf">' +
          '<span class="uebung-titel">Spiegelschrift · Stufe ' + w.stufe + "</span>" +
          '<span class="marker" id="mw-fortschritt">Aufgabe 1 von ' + w.aufgaben + "</span>" +
          '<span class="marker marker-links" id="mw-aufgabe">–</span>' +
          '<div class="zeitbalken"><div class="zeitbalken-fuellung" id="mw-vorlage-balken"></div></div>' +
          '<button class="knopf" id="mw-abbruch">Abbrechen (Esc)</button>' +
        "</div>" +

        '<div class="uebung-flaechen schreib-flaechen">' +
          '<section class="feld feld-links">' +
            '<header class="feld-kopf">' +
              "<span>Linke Hand · hier schreiben</span>" +
              "<span>← Schreibrichtung</span>" +
            "</header>" +
            '<canvas id="mw-canvas"></canvas>' +
          "</section>" +

          '<section class="feld feld-spiegel">' +
            '<header class="feld-kopf">' +
              "<span>Im Spiegel</span>" +
              '<span id="mw-treffer">–</span>' +
            "</header>" +
            '<canvas id="mw-spiegel"></canvas>' +
          "</section>" +
        "</div>" +

        '<div class="knopfreihe schreib-knoepfe">' +
          '<button class="knopf knopf-haupt" id="mw-weiter">Fertig</button>' +
          '<button class="knopf" id="mw-loeschen">Noch einmal</button>' +
          '<span class="flaeche-text klein" id="mw-tipp">Fahre die blasse Vorlage nach.</span>' +
        "</div>" +
      "</div>";

    const canvas = flaeche.querySelector("#mw-canvas");
    const spiegel = flaeche.querySelector("#mw-spiegel");
    const kasten = canvas.getBoundingClientRect();
    const dichte = Math.min(window.devicePixelRatio || 1, 2);

    for (const c of [canvas, spiegel]) {
      c.width = Math.round(kasten.width * dichte);
      c.height = Math.round(kasten.height * dichte);
      c.getContext("2d").setTransform(dichte, 0, 0, dichte, 0, 0);
    }

    const stil = getComputedStyle(document.documentElement);

    lauf = {
      flaeche: flaeche,
      kontext: kontext,
      werte: w,
      canvas: canvas,
      ctx: canvas.getContext("2d"),
      spiegelCtx: spiegel.getContext("2d"),
      breite: kasten.width,
      hoehe: kasten.height,
      dichte: dichte,
      farbeTinte: stil.getPropertyValue("--links").trim(),
      farbeVorlage: stil.getPropertyValue("--text-still").trim(),

      vorlagen: vorlagenWaehlen(w.art, w.aufgaben),
      aufgabe: 0,
      beginn: performance.now(),
      aufgabeBeginn: 0,
      zeichnet: false,
      letzterPunkt: null,

      /* Messung über alle Aufgaben */
      punkteGesamt: 0,
      punkteTreffer: 0,
      deckungSumme: 0,
      galerie: [],
      beendet: false
    };

    /* Hilfsbilder in Gerätepixeln – dieselbe Größe wie der sichtbare Canvas */
    lauf.maskeWeit = hilfsCanvas();
    lauf.maskeKern = hilfsCanvas();
    lauf.beruehrt = hilfsCanvas();

    lauf.aufZeigerAb = (e) => zeigerAb(e);
    lauf.aufZeigerBewegt = (e) => zeigerBewegt(e);
    lauf.aufZeigerAuf = () => { lauf.zeichnet = false; lauf.letzterPunkt = null; };
    lauf.aufTaste = (e) => { if (e.key === "Escape") { e.preventDefault(); abbrechen(); } };

    canvas.addEventListener("pointerdown", lauf.aufZeigerAb);
    canvas.addEventListener("pointermove", lauf.aufZeigerBewegt);
    window.addEventListener("pointerup", lauf.aufZeigerAuf);
    document.addEventListener("keydown", lauf.aufTaste);

    flaeche.querySelector("#mw-abbruch").addEventListener("click", abbrechen);
    flaeche.querySelector("#mw-weiter").addEventListener("click", aufgabeAbschliessen);
    flaeche.querySelector("#mw-loeschen").addEventListener("click", () => aufgabeVorbereiten(true));

    aufgabeVorbereiten(false);
  }

  function hilfsCanvas() {
    const c = document.createElement("canvas");
    c.width = lauf.canvas.width;
    c.height = lauf.canvas.height;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.setTransform(lauf.dichte, 0, 0, lauf.dichte, 0, 0);
    return { canvas: c, ctx: ctx };
  }

  /* ====================================================================
     3. Eine Aufgabe
     ==================================================================== */

  /* Schriftgröße so wählen, dass der Text in die Fläche passt. */
  function schriftGroesse(ctx, text) {
    let groesse = Math.min(lauf.hoehe * 0.42, 150);
    for (let i = 0; i < 40; i++) {
      ctx.font = "600 " + groesse + "px " + "system-ui, sans-serif";
      if (ctx.measureText(text).width <= lauf.breite * 0.84) break;
      groesse -= 4;
    }
    return groesse;
  }

  /* Zeichnet den Text seitenverkehrt – das ist die Form, die ich malen soll. */
  function vorlageZeichnen(ctx, text, alpha, nurUmriss, linienbreite) {
    const groesse = schriftGroesse(ctx, text);
    ctx.save();
    /* Spiegeln an der senkrechten Mittelachse */
    ctx.translate(lauf.breite, 0);
    ctx.scale(-1, 1);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "600 " + groesse + "px system-ui, sans-serif";
    ctx.globalAlpha = alpha;

    if (nurUmriss) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = linienbreite;
      ctx.lineJoin = "round";
      ctx.strokeText(text, lauf.breite / 2, lauf.hoehe / 2);
    } else {
      ctx.fillStyle = lauf.farbeVorlage;
      ctx.fillText(text, lauf.breite / 2, lauf.hoehe / 2);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function aufgabeVorbereiten(nurWiederholen) {
    const w = lauf.werte;
    const text = lauf.vorlagen[lauf.aufgabe];

    if (!nurWiederholen) lauf.aufgabeBeginn = performance.now();
    lauf.striche = [];
    lauf.punkteAufgabe = 0;
    lauf.trefferAufgabe = 0;

    /* Hilfsbilder neu aufbauen: dick für "liegt mein Strich darauf?",
       dünn für "habe ich alles nachgefahren?" */
    for (const hilfe of [lauf.maskeWeit, lauf.maskeKern, lauf.beruehrt]) {
      hilfe.ctx.clearRect(0, 0, lauf.breite, lauf.hoehe);
    }
    vorlageZeichnen(lauf.maskeWeit.ctx, text, 1, true, w.toleranzPx * 2);
    vorlageZeichnen(lauf.maskeKern.ctx, text, 1, true, 3);

    lauf.maskeWeitDaten = lauf.maskeWeit.ctx.getImageData(
      0, 0, lauf.maskeWeit.canvas.width, lauf.maskeWeit.canvas.height).data;

    lauf.flaeche.querySelector("#mw-aufgabe").textContent = text;
    lauf.flaeche.querySelector("#mw-fortschritt").textContent =
      "Aufgabe " + (lauf.aufgabe + 1) + " von " + lauf.vorlagen.length;
    lauf.flaeche.querySelector("#mw-weiter").textContent =
      lauf.aufgabe + 1 < lauf.vorlagen.length ? "Fertig, nächste Aufgabe" : "Fertig";
    lauf.flaeche.querySelector("#mw-treffer").textContent = "–";
    lauf.flaeche.querySelector("#mw-tipp").textContent =
      w.modus === "ohne" ? "Keine Vorlage – schreibe das Wort von oben."
                         : "Fahre die blasse Vorlage nach.";

    neuZeichnen();
    vorlageUhrStarten();
  }

  /* Verblassen und Ausblenden passieren mit der Zeit, nicht beim Zeichnen.
     Ohne eigene Uhr bliebe die Vorlage stehen, solange die Hand ruht.
     Zehnmal je Sekunde reicht dafür völlig. */
  function vorlageUhrStarten() {
    clearInterval(lauf.vorlageUhr);
    const modus = lauf.werte.modus;
    if (modus !== "kurz" && modus !== "verblassend") return;

    lauf.vorlageUhr = setInterval(() => {
      if (!lauf || lauf.beendet) { clearInterval(lauf && lauf.vorlageUhr); return; }
      neuZeichnen();
      if (vorlageAlpha() <= 0) clearInterval(lauf.vorlageUhr);
    }, 100);
  }

  /* Wie sichtbar ist die Vorlage gerade? (0 bis 1) */
  function vorlageAlpha() {
    const modus = lauf.werte.modus;
    if (modus === "ohne") return 0;
    if (modus === "vorlage") return 1;

    const seit = performance.now() - lauf.aufgabeBeginn;
    if (modus === "kurz") return seit < KURZ_MS ? 1 : 0;
    /* verblassend */
    return Math.max(0, 1 - seit / VERBLASSEN_MS);
  }

  function neuZeichnen() {
    const ctx = lauf.ctx;
    const text = lauf.vorlagen[lauf.aufgabe];
    const sichtbar = vorlageAlpha();

    ctx.clearRect(0, 0, lauf.breite, lauf.hoehe);

    /* Mittellinie als Orientierung */
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, lauf.hoehe / 2);
    ctx.lineTo(lauf.breite, lauf.hoehe / 2);
    ctx.stroke();

    if (sichtbar > 0) vorlageZeichnen(ctx, text, 0.3 * sichtbar, false);

    /* eigene Striche */
    ctx.strokeStyle = lauf.farbeTinte;
    ctx.lineWidth = STRICHBREITE;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const strich of lauf.striche) {
      if (strich.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(strich[0].x, strich[0].y);
      for (let i = 1; i < strich.length; i++) ctx.lineTo(strich[i].x, strich[i].y);
      ctx.stroke();
    }

    spiegelZeichnen();

    const balken = lauf.flaeche.querySelector("#mw-vorlage-balken");
    if (balken) balken.style.width = Math.round(sichtbar * 100) + "%";
  }

  /* Das Spiegelbild ist einfach die gespiegelte Kopie der Schreibfläche. */
  function spiegelZeichnen() {
    const ctx = lauf.spiegelCtx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, lauf.canvas.width, lauf.canvas.height);
    ctx.translate(lauf.canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(lauf.canvas, 0, 0);
    ctx.restore();
  }

  /* ------------------------------ Zeichnen ------------------------------ */

  function punktAus(ereignis) {
    const k = lauf.canvas.getBoundingClientRect();
    return { x: ereignis.clientX - k.left, y: ereignis.clientY - k.top };
  }

  function zeigerAb(ereignis) {
    ereignis.preventDefault();
    lauf.zeichnet = true;
    const punkt = punktAus(ereignis);
    lauf.striche.push([punkt]);
    lauf.letzterPunkt = punkt;
    pruefen(punkt);
    neuZeichnen();
  }

  function zeigerBewegt(ereignis) {
    if (!lauf || !lauf.zeichnet) return;
    ereignis.preventDefault();
    const punkt = punktAus(ereignis);
    const strich = lauf.striche[lauf.striche.length - 1];
    strich.push(punkt);

    /* Berührte Fläche mitschreiben – daraus entsteht später die Deckung. */
    const ctx = lauf.beruehrt.ctx;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = lauf.werte.toleranzPx;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lauf.letzterPunkt.x, lauf.letzterPunkt.y);
    ctx.lineTo(punkt.x, punkt.y);
    ctx.stroke();

    lauf.letzterPunkt = punkt;
    pruefen(punkt);
    neuZeichnen();
  }

  /* Liegt der Punkt auf der dick gezeichneten Vorlage? */
  function pruefen(punkt) {
    lauf.punkteAufgabe++;

    const x = Math.round(punkt.x * lauf.dichte);
    const y = Math.round(punkt.y * lauf.dichte);
    const breite = lauf.maskeWeit.canvas.width;
    if (x < 0 || y < 0 || x >= breite || y >= lauf.maskeWeit.canvas.height) return;

    const alpha = lauf.maskeWeitDaten[(y * breite + x) * 4 + 3];
    if (alpha > 40) lauf.trefferAufgabe++;

    const anzeige = lauf.flaeche.querySelector("#mw-treffer");
    if (anzeige) {
      anzeige.textContent = Math.round((lauf.trefferAufgabe / lauf.punkteAufgabe) * 100) + " % auf der Vorlage";
    }
  }

  /* ====================================================================
     4. Aufgabe abschließen und auswerten
     ==================================================================== */

  /* Anteil der Vorlage, der nachgefahren wurde. */
  function deckungBerechnen() {
    const breite = lauf.maskeKern.canvas.width;
    const hoehe = lauf.maskeKern.canvas.height;
    const kern = lauf.maskeKern.ctx.getImageData(0, 0, breite, hoehe).data;
    const beruehrt = lauf.beruehrt.ctx.getImageData(0, 0, breite, hoehe).data;

    let gesamt = 0;
    let getroffen = 0;
    /* Jedes zweite Pixel reicht – das halbiert die Rechenzeit und ändert
       am Ergebnis praktisch nichts. */
    for (let i = 3; i < kern.length; i += 8) {
      if (kern[i] > 40) {
        gesamt++;
        if (beruehrt[i] > 40) getroffen++;
      }
    }
    return gesamt > 0 ? Math.round((getroffen / gesamt) * 100) : 0;
  }

  function aufgabeAbschliessen() {
    if (!lauf || !lauf.striche.length) {
      lauf.flaeche.querySelector("#mw-tipp").textContent = "Erst schreiben, dann fertig.";
      return;
    }

    lauf.punkteGesamt += lauf.punkteAufgabe;
    lauf.punkteTreffer += lauf.trefferAufgabe;
    lauf.deckungSumme += deckungBerechnen();

    /* Bild für die Ergebnisseite festhalten (nur fürs Anschauen, wird nicht
       gespeichert). */
    lauf.galerie.push({
      text: lauf.vorlagen[lauf.aufgabe],
      gemalt: lauf.canvas.toDataURL("image/png"),
      spiegel: lauf.flaeche.querySelector("#mw-spiegel").toDataURL("image/png")
    });

    lauf.aufgabe++;
    if (lauf.aufgabe < lauf.vorlagen.length) {
      aufgabeVorbereiten(false);
    } else {
      lesbarkeitFragen();
    }
  }

  /* ====================================================================
     5. Selbstbewertung und Ende
     ==================================================================== */

  function lesbarkeitFragen() {
    zuhoererAbmelden();

    const bilder = lauf.galerie.map((g) =>
      '<figure class="galerie-paar"><img src="' + g.spiegel + '" alt="im Spiegel">' +
      "<figcaption>" + g.text + "</figcaption></figure>"
    ).join("");

    lauf.flaeche.innerHTML =
      '<h1 class="titel">Wie lesbar ist das?</h1>' +
      '<p class="untertitel">Das kann kein Rechner beurteilen – schau es dir im ' +
        "Spiegelbild an und sei ehrlich.</p>" +
      '<div class="flaeche">' +
        '<div class="galerie">' + bilder + "</div>" +
        '<div class="lesbarkeit">' +
          [1, 2, 3, 4, 5].map((n) =>
            '<button class="knopf lesbar-knopf" data-wert="' + n + '">' + n +
            "<small>" + ["kaum", "mit Mühe", "geht so", "gut", "klar"][n - 1] + "</small></button>"
          ).join("") +
        "</div>" +
      "</div>";

    for (const knopf of lauf.flaeche.querySelectorAll(".lesbar-knopf")) {
      knopf.addEventListener("click", () => beenden(Number(knopf.dataset.wert)));
    }
  }

  function zuhoererAbmelden() {
    if (!lauf) return;
    clearInterval(lauf.vorlageUhr);
    lauf.canvas.removeEventListener("pointerdown", lauf.aufZeigerAb);
    lauf.canvas.removeEventListener("pointermove", lauf.aufZeigerBewegt);
    window.removeEventListener("pointerup", lauf.aufZeigerAuf);
    document.removeEventListener("keydown", lauf.aufTaste);
  }

  function abbrechen() {
    if (!lauf) return;
    const kontext = lauf.kontext;
    zuhoererAbmelden();
    lauf.beendet = true;
    lauf = null;
    kontext.abbrechen();
  }

  function beenden(lesbarkeit) {
    const w = lauf.werte;
    const aufgaben = lauf.vorlagen.length;
    const dauerSek = Math.round((performance.now() - lauf.beginn) / 1000);

    const werte = {
      trefferProzent: lauf.punkteGesamt > 0
        ? Math.round((lauf.punkteTreffer / lauf.punkteGesamt) * 100) : 0,
      deckungProzent: Math.round(lauf.deckungSumme / aufgaben),
      lesbarkeit: lesbarkeit,
      aufgaben: aufgaben,
      zeitProAufgabeSek: Math.round(dauerSek / aufgaben)
    };

    const durchgang = {
      id: new Date().toISOString(),
      stufe: w.stufe,
      modus: w.modus,
      art: w.art,
      hand: { schreiben: "links" },
      spiegel: true,
      dauerSek: dauerSek,
      werte: werte,
      score: Auswertung.scoreSpiegelschrift(werte)
    };

    const kontext = lauf.kontext;
    const galerie = lauf.galerie;
    zuhoererAbmelden();
    lauf = null;

    kontext.fertig(durchgang, {
      galerie: galerie,
      kacheln: [
        { titel: "Auf der Vorlage",  feld: "trefferProzent",    einheit: " %" },
        { titel: "Nachgefahren",     feld: "deckungProzent",    einheit: " %" },
        { titel: "Lesbarkeit",       feld: "lesbarkeit",        einheit: " von 5" },
        { titel: "Zeit je Aufgabe",  feld: "zeitProAufgabeSek", einheit: " s", kleinerIstBesser: true }
      ]
    });
  }

  App.modulAnmelden(SCHLUESSEL, { starten: starten });

})();
