/* ==========================================================================
   mirrortrace.js – Mirror Tracing

   Die klassische Aufgabe aus der Neuropsychologie: eine Form nachfahren,
   während die eigene Bewegung verdreht dargestellt wird. Die Hand will nach
   rechts, der Punkt geht nach links – das Gehirn muss seine gewohnte
   Zuordnung von Bewegung und Bild neu schreiben.

   Ablauf:
     Erklärung -> Runde 1 mit der linken Hand -> Runde 2 mit der rechten
               -> Ergebnis mit Hand-Vergleich

   Beide Hände fahren dieselbe Form, damit der Vergleich ehrlich ist.
   ========================================================================== */

(function () {

  const SCHLUESSEL = "mirrortrace";

  /* Wie weit der Cursor beim Vorankommen springen darf (in Bahnpunkten von
     insgesamt 500). Das verhindert Abkürzen quer über die Fläche.

     Nicht zu eng wählen: Wer im Spiegelmodus weit abrutscht und ein Stück
     weiter wieder einsteigt, käme sonst nie ans Ziel – der Fortschritt bliebe
     an der Abrutschstelle hängen und der Durchgang ließe sich nur noch
     abbrechen. 60 Punkte sind gut ein Zehntel der Bahn. */
  const SPRUNG_GRENZE = 60;

  let lauf = null;

  /* ====================================================================
     1. Erklärung
     ==================================================================== */

  function modusText(modus) {
    if (modus === "senkrecht") return "Oben und unten sind vertauscht: Maus nach oben heißt Punkt nach unten.";
    if (modus === "beides")    return "Alles ist um 180 Grad gedreht – beide Richtungen verkehrt herum.";
    return "Links und rechts sind vertauscht: Maus nach rechts heißt Punkt nach links.";
  }

  function formText(form) {
    if (form === "stern")   return "Stern";
    if (form === "spirale") return "Spirale";
    return "Zickzack";
  }

  function starten(flaeche, kontext) {
    erklaerungZeigen(flaeche, kontext);
  }

  function erklaerungZeigen(flaeche, kontext) {
    const w = kontext.werte;

    flaeche.innerHTML =
      '<h1 class="titel">Mirror Tracing</h1>' +
      '<p class="untertitel">Stufe ' + w.stufe + " von 10 · zwei Runden, erst links, dann rechts</p>" +

      '<div class="flaeche">' +
        App.stufenleiste(SCHLUESSEL, w.stufe, [
          { modus: "waagerecht", text: "links/rechts verdreht" },
          { modus: "senkrecht",  text: "oben/unten verdreht" },
          { modus: "beides",     text: "um 180° gedreht" }
        ]) +

        '<p class="flaeche-text">' + modusText(w.modus) +
          " Fahre die Form vom grünen Startpunkt bis zum goldenen Ziel ab und " +
          "bleibe dabei im Korridor. Jedes Mal, wenn du herausrutschst, zählt " +
          "ein Fehler." +
        "</p>" +

        '<div class="fakten">' +
          '<span><b>' + formText(w.form) + "</b>Form</span>" +
          '<span><b>±' + w.korridorPx + " px</b>Korridor</span>" +
          '<span><b>2</b>Runden je Hand</span>' +
        "</div>" +

        '<p class="flaeche-text ablauf"><b>Ablauf:</b> 3-2-1 → linke Hand fährt die ' +
          "Form → 3-2-1 → rechte Hand fährt dieselbe Form → Ergebnis mit Vergleich. " +
          "Ohne Zeitdruck, aber die Zeit wird gemessen.</p>" +

        '<div class="rollen">' +
          '<div class="rolle rolle-links"><span>Runde 1 · linke Hand</span><b>nachfahren</b></div>' +
          '<div class="rolle rolle-rechts"><span>Runde 2 · rechte Hand</span><b>dieselbe Form</b></div>' +
        "</div>" +

        '<div class="knopfreihe">' +
          '<button class="knopf knopf-haupt" id="mt-start">Durchgang starten</button>' +
          '<button class="knopf" id="mt-zurueck">Zurück</button>' +
        "</div>" +
      "</div>";

    flaeche.querySelector("#mt-start").addEventListener("click", () => laufStarten(flaeche, kontext));
    flaeche.querySelector("#mt-zurueck").addEventListener("click", kontext.abbrechen);
  }

  /* ====================================================================
     2. Durchgang
     ==================================================================== */

  function laufStarten(flaeche, kontext) {
    const w = kontext.werte;

    flaeche.innerHTML =
      '<div class="uebung">' +
        '<div class="uebung-kopf">' +
          '<span class="uebung-titel">Mirror Tracing · Stufe ' + w.stufe + "</span>" +
          '<span class="marker" id="mt-hand">Linke Hand</span>' +
          '<span class="marker" id="mt-fehler">0 Fehler</span>' +
          '<div class="zeitbalken"><div class="zeitbalken-fuellung" id="mt-fortschritt"></div></div>' +
          '<button class="knopf" id="mt-abbruch">Abbrechen (Esc)</button>' +
        "</div>" +

        '<section class="feld feld-links" id="mt-feld">' +
          '<header class="feld-kopf">' +
            '<span id="mt-feld-titel">Linke Hand · Maus</span>' +
            '<span id="mt-zeit">0,0 s</span>' +
          "</header>" +
          '<canvas id="mt-canvas"></canvas>' +
        "</section>" +

        '<div class="countdown" id="mt-countdown"><span>3</span></div>' +
      "</div>";

    const canvas = flaeche.querySelector("#mt-canvas");
    const kasten = canvas.getBoundingClientRect();
    const dichte = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(kasten.width * dichte);
    canvas.height = Math.round(kasten.height * dichte);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dichte, 0, 0, dichte, 0, 0);

    const stil = getComputedStyle(document.documentElement);

    lauf = {
      flaeche: flaeche,
      kontext: kontext,
      werte: w,
      canvas: canvas,
      ctx: ctx,
      breite: kasten.width,
      hoehe: kasten.height,
      farben: {
        links: stil.getPropertyValue("--links").trim(),
        rechts: stil.getPropertyValue("--rechts").trim(),
        gut: stil.getPropertyValue("--gut").trim(),
        warnung: stil.getPropertyValue("--warnung").trim(),
        gold: stil.getPropertyValue("--gold").trim(),
        leise: stil.getPropertyValue("--text-still").trim()
      },

      bahn: Bahnen.bauen(w.form, kasten.width, kasten.height),
      runden: ["links", "rechts"],
      runde: 0,
      ergebnisse: [],
      galerie: [],

      maus: null,
      beendet: false
    };

    lauf.aufMausBewegung = (e) => {
      const k = canvas.getBoundingClientRect();
      mausBewegt({ x: e.clientX - k.left, y: e.clientY - k.top });
    };
    lauf.aufMausRaus = () => { lauf.maus = null; };
    lauf.aufTaste = (e) => { if (e.key === "Escape") { e.preventDefault(); abbrechen(); } };

    canvas.addEventListener("mousemove", lauf.aufMausBewegung);
    canvas.addEventListener("mouseleave", lauf.aufMausRaus);
    document.addEventListener("keydown", lauf.aufTaste);
    flaeche.querySelector("#mt-abbruch").addEventListener("click", abbrechen);

    rundeVorbereiten();
  }

  /* ------------------------------ eine Runde ------------------------------ */

  function rundeVorbereiten() {
    const hand = lauf.runden[lauf.runde];

    lauf.aktuell = {
      hand: hand,
      gestartet: false,       /* erst wenn der Startpunkt berührt wurde */
      beginn: 0,
      fertig: false,
      fortschritt: 0,
      fehler: 0,
      drin: true,
      streckeGesamt: 0,
      streckeAussen: 0,
      spur: [],
      letzterPunkt: null
    };

    const feld = lauf.flaeche.querySelector("#mt-feld");
    feld.className = "feld feld-" + hand;
    lauf.flaeche.querySelector("#mt-feld-titel").textContent =
      (hand === "links" ? "Linke" : "Rechte") + " Hand · Maus";
    lauf.flaeche.querySelector("#mt-hand").textContent =
      (hand === "links" ? "Linke" : "Rechte") + " Hand";
    lauf.flaeche.querySelector("#mt-hand").className = "marker marker-" + hand;
    lauf.flaeche.querySelector("#mt-fehler").textContent = "0 Fehler";
    lauf.flaeche.querySelector("#mt-zeit").textContent = "0,0 s";
    lauf.flaeche.querySelector("#mt-fortschritt").style.width = "0%";

    zeichnen();
    vorschauStarten();
    countdown(3, () => {
      cancelAnimationFrame(lauf.vorschauId);
      uhrStarten();
    });
  }

  /* Während des Countdowns schon zeichnen, damit man die Form sieht und die
     Maus hinsetzen kann. */
  function vorschauStarten() {
    function vorschau() {
      if (!lauf || lauf.beendet || (lauf.aktuell && lauf.aktuell.uhrLaeuft)) return;
      zeichnen();
      lauf.vorschauId = requestAnimationFrame(vorschau);
    }
    cancelAnimationFrame(lauf.vorschauId);
    lauf.vorschauId = requestAnimationFrame(vorschau);
  }

  function countdown(zahl, fertig) {
    const anzeige = lauf.flaeche.querySelector("#mt-countdown");
    const hand = lauf.runden[lauf.runde] === "links" ? "linke" : "rechte";
    anzeige.innerHTML = "<span>" + zahl + "</span><small>Die " + hand +
      " Hand an die Maus, dann auf den grünen Punkt</small>";
    anzeige.hidden = false;

    lauf.countdownId = setTimeout(() => {
      if (!lauf || lauf.beendet) return;
      if (zahl > 1) countdown(zahl - 1, fertig);
      else { anzeige.hidden = true; fertig(); }
    }, 800);
  }

  /* Die Uhr läuft erst, wenn der Startpunkt berührt wurde – deshalb hier nur
     die Anzeige-Schleife. */
  function uhrStarten() {
    lauf.aktuell.uhrLaeuft = true;
    function bild() {
      if (!lauf || lauf.beendet || !lauf.aktuell.uhrLaeuft) return;
      if (lauf.aktuell.gestartet && !lauf.aktuell.fertig) {
        const sek = (performance.now() - lauf.aktuell.beginn) / 1000;
        lauf.flaeche.querySelector("#mt-zeit").textContent = sek.toFixed(1).replace(".", ",") + " s";
      }
      zeichnen();
      lauf.bildId = requestAnimationFrame(bild);
    }
    lauf.bildId = requestAnimationFrame(bild);
  }

  /* --------------------------- verdrehte Anzeige --------------------------- */

  /* Das ist der Kern der Übung: Was die Hand tut und was man sieht, passt
     nicht zusammen. Gemessen wird am gesehenen Punkt. */
  function cursorPunkt() {
    if (!lauf.maus) return null;
    const modus = lauf.werte.modus;
    return {
      x: (modus === "waagerecht" || modus === "beides") ? lauf.breite - lauf.maus.x : lauf.maus.x,
      y: (modus === "senkrecht" || modus === "beides") ? lauf.hoehe - lauf.maus.y : lauf.maus.y
    };
  }

  /* Nächstgelegener Bahnpunkt – gesucht wird nur in der Nähe des bisherigen
     Fortschritts, sonst würde ein Sprung auf die andere Seite der Form als
     Fortschritt zählen. */
  function naechsterIndex(punkt, ab) {
    const punkte = lauf.bahn.punkte;
    let besterIndex = ab;
    let besterAbstand = Infinity;
    const bis = Math.min(punkte.length - 1, ab + SPRUNG_GRENZE);

    for (let i = Math.max(0, ab - 5); i <= bis; i++) {
      const abstand = Math.hypot(punkte[i].x - punkt.x, punkte[i].y - punkt.y);
      if (abstand < besterAbstand) { besterAbstand = abstand; besterIndex = i; }
    }
    return { index: besterIndex, abstand: besterAbstand };
  }

  function mausBewegt(rohPunkt) {
    if (!lauf || lauf.beendet) return;
    lauf.maus = rohPunkt;

    const a = lauf.aktuell;
    if (!a || !a.uhrLaeuft || a.fertig) return;

    const punkt = cursorPunkt();
    const start = lauf.bahn.punkte[0];

    /* Noch nicht gestartet: Erst den grünen Punkt berühren. */
    if (!a.gestartet) {
      if (Math.hypot(punkt.x - start.x, punkt.y - start.y) <= lauf.werte.korridorPx) {
        a.gestartet = true;
        a.beginn = performance.now();
        a.letzterPunkt = punkt;
        a.spur.push({ x: punkt.x, y: punkt.y, drin: true });
      }
      return;
    }

    const naechster = naechsterIndex(punkt, a.fortschritt);
    const drin = naechster.abstand <= lauf.werte.korridorPx;

    /* Strecke und Ausrutscher zählen */
    if (a.letzterPunkt) {
      const strecke = Math.hypot(punkt.x - a.letzterPunkt.x, punkt.y - a.letzterPunkt.y);
      a.streckeGesamt += strecke;
      if (!drin) a.streckeAussen += strecke;
    }
    /* Ein Fehler ist das Verlassen des Korridors, nicht jeder Moment
       außerhalb – sonst hinge die Zahl an der Bildrate. */
    if (a.drin && !drin) a.fehler++;
    a.drin = drin;

    if (drin && naechster.index > a.fortschritt) a.fortschritt = naechster.index;

    a.letzterPunkt = punkt;
    a.spur.push({ x: punkt.x, y: punkt.y, drin: drin });

    lauf.flaeche.querySelector("#mt-fehler").textContent =
      a.fehler + (a.fehler === 1 ? " Fehler" : " Fehler");
    lauf.flaeche.querySelector("#mt-fortschritt").style.width =
      Math.round((a.fortschritt / (lauf.bahn.punkte.length - 1)) * 100) + "%";

    /* Ziel erreicht? */
    if (a.fortschritt >= lauf.bahn.punkte.length - 4) rundeAbschliessen();
  }

  /* ------------------------------- Zeichnen ------------------------------- */

  function zeichnen() {
    const ctx = lauf.ctx;
    const a = lauf.aktuell;
    const farbeHand = lauf.farben[a.hand];
    const punkte = lauf.bahn.punkte;

    ctx.clearRect(0, 0, lauf.breite, lauf.hoehe);

    /* Korridor: breite Bahn, dann innen wieder dunkel – das ergibt die
       beiden Ränder wie bei der Vorlage auf Papier. */
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = farbeHand;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = lauf.werte.korridorPx * 2;
    Bahnen.zeichnen(ctx, punkte);

    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#080b11";
    ctx.lineWidth = lauf.werte.korridorPx * 2 - 3;
    Bahnen.zeichnen(ctx, punkte);

    /* Mittellinie zur Orientierung */
    ctx.strokeStyle = farbeHand;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1;
    Bahnen.zeichnen(ctx, punkte);
    ctx.globalAlpha = 1;

    /* schon gefahrener Teil der Bahn hervorheben */
    if (a.fortschritt > 1) {
      ctx.strokeStyle = farbeHand;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      Bahnen.zeichnen(ctx, punkte.slice(0, a.fortschritt + 1));
      ctx.globalAlpha = 1;
    }

    /* Start und Ziel */
    kreis(ctx, punkte[0], 9, lauf.farben.gut, !a.gestartet);
    kreis(ctx, punkte[punkte.length - 1], 9, lauf.farben.gold, false);

    /* eigene Spur */
    ctx.lineWidth = 2;
    for (let i = 1; i < a.spur.length; i++) {
      const p1 = a.spur[i - 1];
      const p2 = a.spur[i];
      ctx.strokeStyle = p2.drin ? lauf.farben.gut : lauf.farben.warnung;
      ctx.globalAlpha = p2.drin ? 0.7 : 0.95;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    /* der eigene, verdrehte Cursor */
    const cursor = cursorPunkt();
    if (cursor) {
      ctx.strokeStyle = a.drin ? lauf.farben.gut : lauf.farben.warnung;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, 8, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = lauf.farben.leise;
      ctx.font = "14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Maus in die Fläche bewegen", lauf.breite / 2, lauf.hoehe - 16);
    }

    if (!a.gestartet && cursor) {
      ctx.fillStyle = lauf.farben.gut;
      ctx.font = "14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Auf dem grünen Punkt beginnen", lauf.breite / 2, lauf.hoehe - 16);
    }
  }

  function kreis(ctx, punkt, radius, farbe, pulsiert) {
    const groesse = pulsiert ? radius + Math.sin(performance.now() / 260) * 2.5 : radius;
    ctx.fillStyle = farbe;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(punkt.x, punkt.y, groesse + 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(punkt.x, punkt.y, groesse, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ====================================================================
     3. Runde auswerten
     ==================================================================== */

  function rundeAbschliessen() {
    const a = lauf.aktuell;
    a.fertig = true;
    a.uhrLaeuft = false;
    cancelAnimationFrame(lauf.bildId);

    const zeitSek = Math.round(((performance.now() - a.beginn) / 1000) * 10) / 10;
    const korridorProzent = a.streckeGesamt > 0
      ? Math.round(((a.streckeGesamt - a.streckeAussen) / a.streckeGesamt) * 100) : 0;
    const sollZeitSek = Math.round(lauf.bahn.laenge / lauf.werte.tempoPxProSek);

    const ergebnis = {
      hand: a.hand,
      fehler: a.fehler,
      zeitSek: zeitSek,
      sollZeitSek: sollZeitSek,
      korridorProzent: korridorProzent,
      streckeAussenPx: Math.round(a.streckeAussen),
      score: Auswertung.scoreMirrortrace({
        korridorProzent: korridorProzent, fehler: a.fehler,
        zeitSek: zeitSek, sollZeitSek: sollZeitSek
      })
    };
    lauf.ergebnisse.push(ergebnis);

    zeichnen();
    lauf.galerie.push({
      text: (a.hand === "links" ? "Linke" : "Rechte") + " Hand · " + a.fehler +
            " Fehler · " + zeitSek.toFixed(1).replace(".", ",") + " s",
      gemalt: lauf.canvas.toDataURL("image/png")
    });

    lauf.runde++;
    if (lauf.runde < lauf.runden.length) {
      /* kurze Pause, damit der Handwechsel nicht überrumpelt */
      setTimeout(() => { if (lauf && !lauf.beendet) rundeVorbereiten(); }, 700);
    } else {
      beenden();
    }
  }

  /* ====================================================================
     4. Ende
     ==================================================================== */

  function aufraeumen() {
    if (!lauf) return;
    lauf.beendet = true;
    cancelAnimationFrame(lauf.bildId);
    cancelAnimationFrame(lauf.vorschauId);
    clearTimeout(lauf.countdownId);
    lauf.canvas.removeEventListener("mousemove", lauf.aufMausBewegung);
    lauf.canvas.removeEventListener("mouseleave", lauf.aufMausRaus);
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
    const links = lauf.ergebnisse.find((e) => e.hand === "links");
    const rechts = lauf.ergebnisse.find((e) => e.hand === "rechts");

    const werte = {
      fehler: links.fehler + rechts.fehler,
      korridorProzent: Math.round((links.korridorProzent + rechts.korridorProzent) / 2),
      zeitSek: Math.round((links.zeitSek + rechts.zeitSek) * 10) / 10,
      /* Die wichtigste Zahl dieses Moduls: Wie weit liegen die Hände
         auseinander? Ziel ist, dass der Abstand mit der Zeit schrumpft. */
      handUnterschied: Math.abs(links.score - rechts.score),
      fehlerLinks: links.fehler,
      fehlerRechts: rechts.fehler,
      zeitLinksSek: links.zeitSek,
      zeitRechtsSek: rechts.zeitSek,
      korridorLinksProzent: links.korridorProzent,
      korridorRechtsProzent: rechts.korridorProzent,
      scoreLinks: links.score,
      scoreRechts: rechts.score
    };

    const durchgang = {
      id: new Date().toISOString(),
      stufe: w.stufe,
      modus: w.modus,
      form: w.form,
      hand: { nacheinander: "links, dann rechts" },
      spiegel: true,
      dauerSek: Math.round(links.zeitSek + rechts.zeitSek),
      werte: werte,
      score: Math.round((links.score + rechts.score) / 2)
    };

    const kontext = lauf.kontext;
    const galerie = lauf.galerie;
    aufraeumen();
    lauf = null;

    kontext.fertig(durchgang, {
      galerie: galerie,
      galerieTitel: "Deine beiden Runden",
      galerieText: "Grün ist im Korridor, rot daneben – so siehst du, wo es jede Hand aus der Bahn getragen hat.",
      kacheln: [
        { titel: "Im Korridor",     feld: "korridorProzent", einheit: " %" },
        { titel: "Fehler zusammen", feld: "fehler",          einheit: "",   kleinerIstBesser: true },
        { titel: "Zeit zusammen",   feld: "zeitSek",         einheit: " s", kleinerIstBesser: true },
        { titel: "Hand-Unterschied", feld: "handUnterschied", einheit: " Punkte", kleinerIstBesser: true }
      ]
    });
  }

  App.modulAnmelden(SCHLUESSEL, { starten: starten });

})();
