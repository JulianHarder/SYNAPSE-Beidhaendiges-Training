/* ==========================================================================
   sequence.js – Sequenz-Training (Serial Reaction Time)

   Ein Feld leuchtet auf, die zugehörige Taste wird gedrückt. Was man nicht
   sieht: Die meisten Blöcke folgen einer festen, versteckten Tastenfolge,
   einer ist reiner Zufall. Wird man im Muster schneller als im Zufall, hat
   das Gehirn die Folge automatisiert – ohne dass man sie benennen könnte.
   Genau das ist der Punkt der Übung.

   Darum steht nirgends, welcher Block gerade läuft. Wer es weiß, achtet
   darauf, und dann misst man nicht mehr dasselbe.

   Die versteckte Folge bleibt je Stufe über alle Durchgänge gleich
   (gespeichert in den Einstellungen) – sonst gäbe es nichts zu lernen.
   ========================================================================== */

(function () {

  const SCHLUESSEL = "sequence";

  /* Physische Tasten (event.code), damit das Tastaturlayout egal ist.
     Auf deutscher Tastatur liegt Ö auf der Taste mit dem Code "Semicolon". */
  const TASTEN_LINKS = [
    { code: "KeyA", name: "A" },
    { code: "KeyS", name: "S" },
    { code: "KeyD", name: "D" },
    { code: "KeyF", name: "F" }
  ];
  const TASTEN_RECHTS = [
    { code: "KeyJ", name: "J" },
    { code: "KeyK", name: "K" },
    { code: "KeyL", name: "L" },
    { code: "Semicolon", name: "Ö" }
  ];

  let lauf = null;

  /* ====================================================================
     1. Erklärung
     ==================================================================== */

  function felderFuer(modus) {
    if (modus === "links")  return TASTEN_LINKS.map((t) => ({ ...t, hand: "links" }));
    if (modus === "rechts") return TASTEN_RECHTS.map((t) => ({ ...t, hand: "rechts" }));
    return TASTEN_LINKS.map((t) => ({ ...t, hand: "links" }))
      .concat(TASTEN_RECHTS.map((t) => ({ ...t, hand: "rechts" })));
  }

  function modusText(modus) {
    if (modus === "links")  return "Nur die linke Hand auf A S D F.";
    if (modus === "rechts") return "Nur die rechte Hand auf J K L Ö.";
    return "Beide Hände: links A S D F, rechts J K L Ö.";
  }

  function starten(flaeche, kontext) {
    erklaerungZeigen(flaeche, kontext);
  }

  function erklaerungZeigen(flaeche, kontext) {
    const w = kontext.werte;
    const felder = felderFuer(w.modus);

    flaeche.innerHTML =
      '<h1 class="titel">Sequenz-Training</h1>' +
      '<p class="untertitel">Stufe ' + w.stufe + " von 10 · " + w.bloecke +
        " Blöcke à " + w.proBlock + " Tastendrücke</p>" +

      '<div class="flaeche">' +
        App.stufenleiste(SCHLUESSEL, w.stufe, [
          { modus: "links",  text: "linke Hand" },
          { modus: "rechts", text: "rechte Hand" },
          { modus: "beide",  text: "beide Hände" }
        ]) +

        '<p class="flaeche-text">' + modusText(w.modus) +
          " Ein Feld leuchtet auf, du drückst die passende Taste – so schnell " +
          "und so genau du kannst. Bei einem Fehlgriff bleibt das Feld stehen, " +
          "bis die richtige Taste kommt." +
        "</p>" +

        '<p class="flaeche-text klein">' +
          "In den Reizen steckt eine versteckte Folge, die sich wiederholt. Du " +
          "musst sie nicht suchen – im Gegenteil, es geht gerade darum, dass die " +
          "Hand sie von selbst lernt. Ein Block ist zum Vergleich reiner Zufall. " +
          "Welcher, wird nicht verraten." +
        "</p>" +

        '<div class="fakten">' +
          '<span><b>' + felder.length + "</b>Felder</span>" +
          '<span><b>' + w.bloecke + "</b>Blöcke</span>" +
          '<span><b>' + (w.bloecke * w.proBlock) + "</b>Tastendrücke</span>" +
          '<span><b>' + w.pauseMs + " ms</b>Pause je Reiz</span>" +
        "</div>" +

        '<p class="flaeche-text ablauf"><b>Ablauf:</b> 3-2-1 → Block 1 → kurze ' +
          "Pause und 3-2-1 → Block 2 … → Ergebnis mit Vergleich Muster gegen Zufall.</p>" +

        '<div class="tastenbild">' +
          felder.map((f) =>
            '<span class="taste taste-' + f.hand + '">' + f.name + "</span>"
          ).join("") +
        "</div>" +

        '<div class="knopfreihe">' +
          '<button class="knopf knopf-haupt" id="sq-start">Durchgang starten</button>' +
          '<button class="knopf" id="sq-zurueck">Zurück</button>' +
        "</div>" +
      "</div>";

    flaeche.querySelector("#sq-start").addEventListener("click", () => laufStarten(flaeche, kontext));
    flaeche.querySelector("#sq-zurueck").addEventListener("click", kontext.abbrechen);
  }

  /* ====================================================================
     2. Die Folgen
     ==================================================================== */

  /* Zufällige Folge ohne direkte Wiederholung – zweimal dasselbe Feld
     hintereinander wäre keine Bewegung, sondern nur ein Doppelklick. */
  function folgeWuerfeln(laenge, anzahlFelder) {
    const folge = [];
    let letztes = -1;
    for (let i = 0; i < laenge; i++) {
      let naechstes;
      do { naechstes = Math.floor(Math.random() * anzahlFelder); } while (naechstes === letztes);
      folge.push(naechstes);
      letztes = naechstes;
    }
    return folge;
  }

  /* Die versteckte Folge gehört zur Stufe und bleibt erhalten. */
  function musterHolen(stufe, laenge, anzahlFelder) {
    const name = "sequenzMuster.stufe" + stufe;
    const gespeichert = Speicher.einstellung(name, null);
    if (Array.isArray(gespeichert) && gespeichert.length === laenge &&
        gespeichert.every((f) => f < anzahlFelder)) {
      return gespeichert;
    }
    return Speicher.einstellungSetzen(name, folgeWuerfeln(laenge, anzahlFelder));
  }

  /* Blöcke zusammenstellen. Der vorletzte Block ist der Zufallsblock –
     so hat die Hand vorher Zeit, das Muster zu lernen, und danach zeigt
     sich, ob sie wieder schneller wird. */
  function bloeckeBauen(w, anzahlFelder) {
    const muster = musterHolen(w.stufe, w.musterLaenge, anzahlFelder);
    const zufallsBlock = w.bloecke - 2;
    const bloecke = [];

    for (let b = 0; b < w.bloecke; b++) {
      const istZufall = b === zufallsBlock;
      const reize = [];
      if (istZufall) {
        reize.push.apply(reize, folgeWuerfeln(w.proBlock, anzahlFelder));
      } else {
        /* Muster so oft wiederholen, bis der Block voll ist */
        for (let i = 0; i < w.proBlock; i++) reize.push(muster[i % muster.length]);
      }
      bloecke.push({ zufall: istZufall, reize: reize });
    }
    return bloecke;
  }

  /* ====================================================================
     3. Durchgang
     ==================================================================== */

  function laufStarten(flaeche, kontext) {
    const w = kontext.werte;
    const felder = felderFuer(w.modus);

    flaeche.innerHTML =
      '<div class="uebung">' +
        '<div class="uebung-kopf">' +
          '<span class="uebung-titel">Sequenz-Training · Stufe ' + w.stufe + "</span>" +
          '<span class="marker" id="sq-block">Block 1 von ' + w.bloecke + "</span>" +
          '<span class="marker" id="sq-tempo">–</span>' +
          '<div class="zeitbalken"><div class="zeitbalken-fuellung" id="sq-fortschritt"></div></div>' +
          '<button class="knopf" id="sq-abbruch">Abbrechen (Esc)</button>' +
        "</div>" +

        '<section class="feld feld-' + (w.modus === "rechts" ? "rechts" : "links") + '">' +
          '<header class="feld-kopf">' +
            "<span>" + modusText(w.modus) + "</span>" +
            '<span id="sq-fehler">0 Fehler</span>' +
          "</header>" +
          '<div class="felder' + (felder.length > 4 ? " felder-acht" : "") + '" id="sq-felder">' +
            felder.map((f, i) =>
              '<div class="sq-feld sq-' + f.hand + '" data-index="' + i + '">' +
                '<span class="sq-taste">' + f.name + "</span>" +
              "</div>"
            ).join("") +
          "</div>" +
        "</section>" +

        '<div class="countdown" id="sq-countdown"><span>3</span></div>' +
      "</div>";

    lauf = {
      flaeche: flaeche,
      kontext: kontext,
      werte: w,
      felder: felder,
      bloecke: bloeckeBauen(w, felder.length),
      block: 0,
      trial: 0,
      aktiv: -1,
      reizZeit: 0,
      ersterVersuch: true,
      beginn: performance.now(),

      /* Messung */
      fehler: 0,
      treffer: 0,
      trialsGesamt: 0,
      zeitenMuster: [],
      zeitenZufall: [],
      zeitenJeBlock: [],
      laeuft: false,
      beendet: false
    };

    lauf.aufTaste = (e) => tastendruck(e);
    document.addEventListener("keydown", lauf.aufTaste);
    flaeche.querySelector("#sq-abbruch").addEventListener("click", abbrechen);

    blockAnlaufen();
  }

  /* Vor jedem Block ein Countdown – damit die Finger rechtzeitig liegen. */
  function blockAnlaufen() {
    lauf.laeuft = false;
    lauf.trial = 0;
    lauf.blockZeiten = [];

    lauf.flaeche.querySelector("#sq-block").textContent =
      "Block " + (lauf.block + 1) + " von " + lauf.bloecke.length;
    lauf.flaeche.querySelector("#sq-fortschritt").style.width = "0%";
    felderAus();

    const tastenText = lauf.werte.modus === "links" ? "A S D F"
                     : lauf.werte.modus === "rechts" ? "J K L Ö"
                     : "A S D F und J K L Ö";
    countdown(3, "Finger auf " + tastenText, () => {
      lauf.laeuft = true;
      naechsterReiz(200);
    });
  }

  function countdown(zahl, hinweis, fertig) {
    const anzeige = lauf.flaeche.querySelector("#sq-countdown");
    anzeige.innerHTML = "<span>" + zahl + "</span><small>" + hinweis + "</small>";
    anzeige.hidden = false;

    lauf.countdownId = setTimeout(() => {
      if (!lauf || lauf.beendet) return;
      if (zahl > 1) countdown(zahl - 1, hinweis, fertig);
      else { anzeige.hidden = true; fertig(); }
    }, 800);
  }

  /* ------------------------------ ein Reiz ------------------------------ */

  function felderAus() {
    for (const feld of lauf.flaeche.querySelectorAll(".sq-feld")) {
      feld.classList.remove("sq-an", "sq-falsch", "sq-richtig");
    }
  }

  function naechsterReiz(verzoegerung) {
    clearTimeout(lauf.reizId);
    lauf.reizId = setTimeout(() => {
      if (!lauf || lauf.beendet || !lauf.laeuft) return;

      const block = lauf.bloecke[lauf.block];
      lauf.aktiv = block.reize[lauf.trial];
      lauf.ersterVersuch = true;
      lauf.reizZeit = performance.now();

      felderAus();
      const feld = lauf.flaeche.querySelector('.sq-feld[data-index="' + lauf.aktiv + '"]');
      if (feld) feld.classList.add("sq-an");
    }, verzoegerung);
  }

  function tastendruck(ereignis) {
    if (!lauf) return;
    if (ereignis.key === "Escape") { ereignis.preventDefault(); abbrechen(); return; }
    if (!lauf.laeuft || lauf.aktiv < 0) return;

    const index = lauf.felder.findIndex((f) => f.code === ereignis.code);
    if (index < 0) return;
    ereignis.preventDefault();

    const feld = lauf.flaeche.querySelector('.sq-feld[data-index="' + index + '"]');

    if (index !== lauf.aktiv) {
      /* Falsche Taste: Reiz bleibt stehen, bis die richtige kommt. */
      lauf.fehler++;
      lauf.ersterVersuch = false;
      if (feld) {
        feld.classList.add("sq-falsch");
        setTimeout(() => feld.classList.remove("sq-falsch"), 180);
      }
      lauf.flaeche.querySelector("#sq-fehler").textContent =
        lauf.fehler + (lauf.fehler === 1 ? " Fehler" : " Fehler");
      return;
    }

    /* Richtig. Gezählt wird nur, wer auf Anhieb trifft – sonst steckte in
       der Zeit die Korrektur mit drin. */
    const reaktion = performance.now() - lauf.reizZeit;
    if (lauf.ersterVersuch) {
      lauf.treffer++;
      lauf.blockZeiten.push(reaktion);
      if (lauf.bloecke[lauf.block].zufall) lauf.zeitenZufall.push(reaktion);
      else lauf.zeitenMuster.push(reaktion);
    }
    lauf.trialsGesamt++;

    if (feld) {
      feld.classList.remove("sq-an");
      feld.classList.add("sq-richtig");
      setTimeout(() => feld.classList.remove("sq-richtig"), 140);
    }
    lauf.aktiv = -1;

    lauf.flaeche.querySelector("#sq-tempo").textContent = Math.round(reaktion) + " ms";
    lauf.trial++;
    lauf.flaeche.querySelector("#sq-fortschritt").style.width =
      Math.round((lauf.trial / lauf.werte.proBlock) * 100) + "%";

    if (lauf.trial >= lauf.werte.proBlock) blockAbschliessen();
    else naechsterReiz(lauf.werte.pauseMs);
  }

  function blockAbschliessen() {
    lauf.laeuft = false;
    lauf.aktiv = -1;
    felderAus();
    lauf.zeitenJeBlock.push({
      zufall: lauf.bloecke[lauf.block].zufall,
      mittel: Math.round(Auswertung.mittelwert(lauf.blockZeiten))
    });

    lauf.block++;
    if (lauf.block < lauf.bloecke.length) {
      setTimeout(() => { if (lauf && !lauf.beendet) blockAnlaufen(); }, 600);
    } else {
      beenden();
    }
  }

  /* ====================================================================
     4. Lernkurve zeichnen
     ==================================================================== */

  /* Kleines Balkenbild der Blöcke für die Ergebnisseite. Der Zufallsblock
     ist gold – steht er höher als seine Nachbarn, sitzt das Muster. */
  function lernkurveBild() {
    const breite = 640;
    const hoehe = 240;
    const canvas = document.createElement("canvas");
    const dichte = 2;
    canvas.width = breite * dichte;
    canvas.height = hoehe * dichte;
    const ctx = canvas.getContext("2d");
    ctx.scale(dichte, dichte);

    const stil = getComputedStyle(document.documentElement);
    const farbeMuster = stil.getPropertyValue("--links").trim();
    const farbeZufall = stil.getPropertyValue("--gold").trim();
    const farbeText = stil.getPropertyValue("--text-leise").trim();
    const farbeLinie = stil.getPropertyValue("--rand").trim();

    ctx.fillStyle = "#080b11";
    ctx.fillRect(0, 0, breite, hoehe);

    const werte = lauf.zeitenJeBlock;
    const hoechst = Math.max.apply(null, werte.map((b) => b.mittel)) * 1.15;
    const unten = hoehe - 34;
    const oben = 24;
    const breitePro = (breite - 60) / werte.length;

    /* waagerechte Hilfslinien */
    ctx.strokeStyle = farbeLinie;
    ctx.lineWidth = 1;
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = farbeText;
    for (let i = 0; i <= 3; i++) {
      const y = unten - ((unten - oben) / 3) * i;
      ctx.beginPath();
      ctx.moveTo(42, y);
      ctx.lineTo(breite - 12, y);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText(Math.round((hoechst / 3) * i) + " ms", 36, y + 4);
    }

    werte.forEach((block, i) => {
      const x = 48 + i * breitePro;
      const h = ((unten - oben) * block.mittel) / hoechst;
      ctx.fillStyle = block.zufall ? farbeZufall : farbeMuster;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, unten - h, breitePro - 14, h);
      ctx.globalAlpha = 1;

      ctx.fillStyle = farbeText;
      ctx.textAlign = "center";
      ctx.fillText(block.zufall ? "Zufall" : "Block " + (i + 1),
                   x + (breitePro - 14) / 2, unten + 16);
      ctx.fillText(block.mittel + " ms", x + (breitePro - 14) / 2, unten - h - 7);
    });

    return canvas.toDataURL("image/png");
  }

  /* ====================================================================
     5. Ende
     ==================================================================== */

  function aufraeumen() {
    if (!lauf) return;
    lauf.beendet = true;
    lauf.laeuft = false;
    clearTimeout(lauf.reizId);
    clearTimeout(lauf.countdownId);
    document.removeEventListener("keydown", lauf.aufTaste);
  }

  function abbrechen() {
    if (!lauf) return;
    const kontext = lauf.kontext;
    aufraeumen();
    lauf = null;
    kontext.abbrechen();
  }

  function beenden() {
    const w = lauf.werte;
    const muster = Math.round(Auswertung.mittelwert(lauf.zeitenMuster));
    const zufall = Math.round(Auswertung.mittelwert(lauf.zeitenZufall));
    const alle = lauf.zeitenMuster.concat(lauf.zeitenZufall);

    const werte = {
      reaktionMs: Math.round(Auswertung.mittelwert(alle)),
      reaktionMusterMs: muster,
      reaktionZufallMs: zufall,
      /* Positiv heißt: im Muster schneller als im Zufall – gelernt. */
      lerneffektMs: zufall - muster,
      fehler: lauf.fehler,
      trefferProzent: lauf.trialsGesamt > 0
        ? Math.round((lauf.treffer / lauf.trialsGesamt) * 100) : 0,
      bloecke: lauf.bloecke.length
    };

    const durchgang = {
      id: new Date().toISOString(),
      stufe: w.stufe,
      modus: w.modus,
      hand: { tasten: w.modus === "beide" ? "beide" : w.modus },
      spiegel: false,
      dauerSek: Math.round((performance.now() - lauf.beginn) / 1000),
      werte: werte,
      score: Auswertung.scoreSequenz(werte)
    };

    const bild = lernkurveBild();
    const kontext = lauf.kontext;
    aufraeumen();
    lauf = null;

    kontext.fertig(durchgang, {
      galerie: [{ text: "Mittlere Reaktionszeit je Block", gemalt: bild }],
      galerieTitel: "Muster gegen Zufall",
      galerieText: "Der goldene Balken ist der Zufallsblock. Steht er höher als " +
                   "die blauen, hat deine Hand die versteckte Folge schon gelernt.",
      kacheln: [
        { titel: "Reaktionszeit", feld: "reaktionMs",   einheit: " ms", kleinerIstBesser: true },
        { titel: "Lerneffekt",    feld: "lerneffektMs", einheit: " ms" },
        { titel: "Treffer",       feld: "trefferProzent", einheit: " %" },
        { titel: "Fehlgriffe",    feld: "fehler",       einheit: "",    kleinerIstBesser: true }
      ]
    });
  }

  App.modulAnmelden(SCHLUESSEL, { starten: starten });

})();
