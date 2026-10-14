/* ==========================================================================
   dualtask.js – Hauptübung: Zahlencode tippen und gleichzeitig einer Spur folgen

   Aufbau eines Durchgangs:
     Erklärung  ->  (optional Probe, 15 s)  ->  Countdown 3-2-1  ->  Lauf  ->  fertig()

   Die Spur ist eine Linie mit einem Zielpunkt, der mit festem Tempo darüber
   wandert. Aufgabe: mit dem Cursor am Zielpunkt bleiben. Dadurch wird nicht
   nur Genauigkeit gemessen, sondern auch, ob die Hand das Tempo hält.

   Modi (aus difficulty.js):
     einzeln  erst nur Code, dann nur Spur – liefert den Basiswert für die
              Dual-Task-Kosten
     dual     beides gleichzeitig
     tausch   Hände getauscht: links tippt, rechts führt die Maus
     spiegel  der Punkt bewegt sich spiegelverkehrt zur Maus
   ========================================================================== */

(function () {

  const SCHLUESSEL = "dualtask";

  /* Tempo des Zielpunkts bei spurTempo = 1 (Pixel pro Sekunde). */
  const GRUNDTEMPO = 150;
  const PROBE_SEK = 15;

  /* Der laufende Durchgang. Alles, was während eines Laufs lebt, steht hier
     an einer Stelle – so lässt sich beim Abbruch sauber aufräumen. */
  let lauf = null;

  /* ====================================================================
     1. Erklärung
     ==================================================================== */

  function starten(flaeche, kontext) {
    erklaerungZeigen(flaeche, kontext);
  }

  function modusText(modus) {
    if (modus === "einzeln") return "Erst nur tippen, dann nur die Spur. Das ist dein Basiswert – damit später sichtbar wird, was das Gleichzeitige kostet.";
    if (modus === "tausch")  return "Hände getauscht: die linke Hand tippt, die rechte führt die Maus.";
    if (modus === "spiegel") return "Spiegelmodus: der Punkt bewegt sich seitenverkehrt zu deiner Maus. Nach rechts ziehen heißt links werden.";
    return "Beides gleichzeitig: tippen und der Spur folgen.";
  }

  /* Wer macht was? Bei „tausch“ sind die Rollen vertauscht. */
  function rollen(modus) {
    if (modus === "tausch") return { tippen: "links", maus: "rechts" };
    return { tippen: "rechts", maus: "links" };
  }

  /* Tempo in Worten – "0,75" sagt niemandem etwas. */
  function tempoText(faktor) {
    if (faktor <= 0.6) return "ruhig";
    if (faktor <= 0.9) return "mittel";
    if (faktor <= 1.2) return "zügig";
    return "schnell";
  }

  function spurName(form) {
    if (form === "spirale") return "Spirale";
    if (form === "labyrinth") return "Labyrinthgang";
    return "Welle";
  }

  /* Was gleich passiert, Schritt für Schritt. */
  function ablaufText(w, dauer, basis) {
    if (w.modus === "einzeln" || basis) {
      const haelfte = Math.round(dauer / 2);
      return "3-2-1 → " + haelfte + " s nur tippen → 3-2-1 → " + haelfte +
             " s nur die Spur → Ergebnis";
    }
    return "3-2-1 → " + dauer + " s tippen und Spur zugleich → Ergebnis";
  }

  /* Ein Basiswert misst dieselbe Aufgabe getrennt: erst nur tippen, dann nur
     die Spur – mit den Parametern der aktuellen Stufe. Nur so lassen sich die
     Dual-Task-Kosten ehrlich rechnen (siehe stats.js). Fällig ist er, wenn es
     für diese Stufe noch keinen gibt oder der letzte acht Durchgänge her ist. */
  const BASIS_ABSTAND = 8;

  function basisFaellig(stufe) {
    /* Stufe 1 wird ohnehin getrennt geübt. */
    const werte = Schwierigkeit.stufenwerte(SCHLUESSEL, stufe);
    if (!werte || werte.modus === "einzeln") return false;

    const aufStufe = Speicher.durchgaenge(SCHLUESSEL, stufe);
    const seitBasis = aufStufe.findIndex((d) => Auswertung.istEinzelwert(d));
    if (seitBasis < 0) return true;                 /* noch gar keiner */
    return seitBasis >= BASIS_ABSTAND;
  }

  function erklaerungZeigen(flaeche, kontext) {
    const w = kontext.werte;
    const rolle = rollen(w.modus);
    const basis = basisFaellig(w.stufe);

    flaeche.innerHTML =
      '<h1 class="titel">Dual Task</h1>' +
      '<p class="untertitel">Stufe ' + w.stufe + " von 10 · " + w.dauerSek + " Sekunden</p>" +

      '<div class="flaeche">' +
        (basis
          ? '<p class="basis-hinweis"><b>Heute als Basiswert.</b> Derselbe ' +
            "Durchgang wie sonst, aber getrennt: erst nur tippen, dann nur die " +
            "Spur. Daraus berechnet die App, was dich das Gleichzeitige auf " +
            "dieser Stufe kostet. Die Stufe ändert sich dadurch nicht.</p>"
          : "") +
        App.stufenleiste(SCHLUESSEL, w.stufe, [
          { modus: "einzeln", text: "einzeln" },
          { modus: "dual",    text: "gleichzeitig" },
          { modus: "tausch",  text: "Hände getauscht" },
          { modus: "spiegel", text: "gespiegelt" }
        ]) +
        '<p class="flaeche-text">' +
          (basis ? "Sonst gilt hier: " : "") + modusText(w.modus) + "</p>" +

        '<div class="fakten">' +
          '<span><b>' + spurName(w.spur) + "</b>Spurform</span>" +
          '<span><b>' + w.codeLaenge + "</b>Ziffern je Code</span>" +
          '<span><b>' + tempoText(w.spurTempo) + "</b>Tempo der Spur</span>" +
          '<span><b>±' + w.spurBreitePx + " px</b>erlaubter Abstand</span>" +
          '<span><b>' + w.dauerSek + " s</b>Dauer</span>" +
        "</div>" +

        '<p class="flaeche-text ablauf"><b>Ablauf:</b> ' +
          ablaufText(w, w.dauerSek, basis) + "</p>" +

        '<div class="rollen">' +
          '<div class="rolle rolle-' + rolle.maus + '">' +
            "<span>" + (rolle.maus === "links" ? "Linke" : "Rechte") + " Hand · Maus</span>" +
            "<b>der Spur folgen</b>" +
          "</div>" +
          '<div class="rolle rolle-' + rolle.tippen + '">' +
            "<span>" + (rolle.tippen === "links" ? "Linke" : "Rechte") + " Hand · Ziffernblock</span>" +
            "<b>Codes aus " + w.codeLaenge + " Ziffern tippen</b>" +
          "</div>" +
        "</div>" +
        '<p class="flaeche-text klein">' +
          "Getippt wird auf dem Ziffernblock. Ohne Ziffernblock gehen auch die " +
          "Zifferntasten der oberen Reihe. Falsche Ziffer: der Code bleibt stehen, " +
          "bis die richtige kommt. Abbrechen mit Esc." +
        "</p>" +
        '<div class="knopfreihe">' +
          '<button class="knopf knopf-haupt" id="dt-start">Durchgang starten</button>' +
          '<button class="knopf" id="dt-probe">Erst üben (' + PROBE_SEK + ' s)</button>' +
          '<button class="knopf" id="dt-zurueck">Zurück</button>' +
        "</div>" +
      "</div>";

    flaeche.querySelector("#dt-start").addEventListener("click", () => laufStarten(flaeche, kontext, false, basis));
    flaeche.querySelector("#dt-probe").addEventListener("click", () => laufStarten(flaeche, kontext, true, basis));
    flaeche.querySelector("#dt-zurueck").addEventListener("click", kontext.abbrechen);
  }

  /* ====================================================================
     2. Die Bahn (Spur) steht in js/bahnen.js – sie wird auch von
        Mirror Tracing gebraucht.
     ==================================================================== */

  /* ====================================================================
     3. Codes
     ==================================================================== */

  function codeBauen(laenge) {
    const ziffern = [];
    for (let i = 0; i < laenge; i++) ziffern.push(Math.floor(Math.random() * 10));
    return ziffern;
  }

  /* ====================================================================
     4. Der Lauf
     ==================================================================== */

  function laufStarten(flaeche, kontext, istProbe, istBasis) {
    const w = kontext.werte;
    const rolle = rollen(w.modus);
    const dauer = istProbe ? PROBE_SEK : w.dauerSek;

    /* Getrennt gemessen wird auf Stufe 1 und immer dann, wenn ein Basiswert
       fällig ist. Hände und Spiegelung bleiben dabei wie auf dieser Stufe –
       es soll ja dieselbe Aufgabe sein, nur eben nacheinander. */
    const getrennt = w.modus === "einzeln" || istBasis;
    const phasen = getrennt
      ? [
          { art: "code", dauer: dauer / 2, text: "Nur tippen" },
          { art: "spur", dauer: dauer / 2, text: "Nur die Spur" }
        ]
      : [ { art: "beides", dauer: dauer, text: "Tippen und Spur" } ];

    flaeche.innerHTML =
      '<div class="uebung">' +
        '<div class="uebung-kopf">' +
          '<span class="uebung-titel">Dual Task · Stufe ' + w.stufe + "</span>" +
          '<span class="marker" id="dt-phase">' + phasen[0].text + "</span>" +
          (istProbe ? '<span class="marker marker-beide">Probe</span>' : "") +
          (istBasis && !istProbe ? '<span class="marker marker-beide">Basiswert</span>' : "") +
          '<div class="zeitbalken"><div class="zeitbalken-fuellung" id="dt-zeit"></div></div>' +
          '<button class="knopf" id="dt-abbruch">Abbrechen (Esc)</button>' +
        "</div>" +

        '<div class="uebung-flaechen">' +
          '<section class="feld feld-' + rolle.maus + '">' +
            '<header class="feld-kopf">' +
              "<span>" + (rolle.maus === "links" ? "Linke" : "Rechte") + " Hand · Maus</span>" +
              '<span id="dt-spur-wert">–</span>' +
            "</header>" +
            '<canvas id="dt-canvas"></canvas>' +
          "</section>" +

          '<section class="feld feld-' + rolle.tippen + '">' +
            '<header class="feld-kopf">' +
              "<span>" + (rolle.tippen === "links" ? "Linke" : "Rechte") + " Hand · Ziffernblock</span>" +
              '<span id="dt-code-wert">0 Codes</span>' +
            "</header>" +
            '<div class="code-feld"><div class="code" id="dt-code"></div></div>' +
          "</section>" +
        "</div>" +

        '<div class="countdown" id="dt-countdown"><span>3</span></div>' +
      "</div>";

    const canvas = flaeche.querySelector("#dt-canvas");
    const ctx = canvas.getContext("2d");

    /* Canvas auf seine tatsächliche Größe bringen (scharf auf HiDPI). */
    const kasten = canvas.getBoundingClientRect();
    const dichte = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(kasten.width * dichte);
    canvas.height = Math.round(kasten.height * dichte);
    ctx.setTransform(dichte, 0, 0, dichte, 0, 0);

    const stil = getComputedStyle(document.documentElement);
    const farben = {
      links: stil.getPropertyValue("--links").trim(),
      rechts: stil.getPropertyValue("--rechts").trim(),
      gut: stil.getPropertyValue("--gut").trim(),
      warnung: stil.getPropertyValue("--warnung").trim(),
      leise: stil.getPropertyValue("--text-still").trim()
    };

    lauf = {
      flaeche: flaeche,
      kontext: kontext,
      werte: w,
      rolle: rolle,
      istProbe: istProbe,
      istBasis: !!istBasis,
      getrennt: getrennt,
      canvas: canvas,
      ctx: ctx,
      breite: kasten.width,
      hoehe: kasten.height,
      farbeHand: farben[rolle.maus],
      farben: farben,

      bahn: Bahnen.bauen(w.spur, kasten.width, kasten.height),
      bahnIndex: 0,
      richtung: 1,

      /* Mausposition in Canvas-Koordinaten; null = Maus ist draußen */
      maus: null,

      phasen: phasen,
      phase: 0,
      phaseEnde: 0,

      code: codeBauen(w.codeLaenge),
      codeStelle: 0,
      codesFertig: 0,
      fehlerBlink: 0,

      /* Messwerte */
      anschlaege: 0,
      tippFehler: 0,
      zifferRichtig: 0,
      tippAktivMs: 0,
      /* Echte Laufzeit. Nicht tippAktivMs + spurAktivMs nehmen: im
         Dual-Modus laufen beide gleichzeitig und würden doppelt zählen. */
      gesamtMs: 0,
      abweichungSumme: 0,
      abweichungZaehler: 0,
      aufSpurZaehler: 0,
      spurAktivMs: 0,

      /* Aufzeichnung für das Spur-Replay auf der Ergebnisseite (Schritt 3).
         Etwa 20 Punkte je Sekunde, gerundet – das bleibt klein. */
      replay: [],
      letzteAufzeichnung: 0,

      letzteZeit: 0,
      laeuft: false,
      beendet: false,
      bildId: 0
    };

    codeZeichnen();
    canvasZeichnen(0);

    vorschauStarten();

    /* Zuhörer anmelden. Alle werden in aufraeumen() wieder entfernt. */
    lauf.aufMausBewegung = (e) => {
      const k = canvas.getBoundingClientRect();
      lauf.maus = { x: e.clientX - k.left, y: e.clientY - k.top };
    };
    lauf.aufMausRaus = () => { lauf.maus = null; };
    lauf.aufTaste = (e) => tastendruck(e);

    canvas.addEventListener("mousemove", lauf.aufMausBewegung);
    canvas.addEventListener("mouseleave", lauf.aufMausRaus);
    document.addEventListener("keydown", lauf.aufTaste);

    flaeche.querySelector("#dt-abbruch").addEventListener("click", abbrechen);

    phaseAnlaufen();
  }

  /* Vorschau: zeichnet Spur, Startpunkt und den eigenen Cursor schon
     während des Countdowns. Sonst müsste man beim "Los" blind losfahren.
     Gemessen wird dabei nichts – das beginnt erst mit lauf.laeuft. */
  function vorschauStarten() {
    function vorschau() {
      if (!lauf || lauf.laeuft || lauf.beendet) return;
      canvasZeichnen(performance.now());
      lauf.vorschauId = requestAnimationFrame(vorschau);
    }
    cancelAnimationFrame(lauf.vorschauId);
    lauf.vorschauId = requestAnimationFrame(vorschau);
  }

  /* Startet die aktuelle Phase nach einem Countdown. Wird zu Beginn des
     Durchgangs aufgerufen und noch einmal bei jedem Handwechsel – sonst
     müsste die zweite Hand aus dem Stand losspringen. */
  function phaseAnlaufen() {
    lauf.laeuft = false;
    cancelAnimationFrame(lauf.bildId);

    lauf.flaeche.querySelector("#dt-phase").textContent = lauf.phasen[lauf.phase].text;
    /* Balken zurück auf null: die neue Phase hat noch nicht begonnen. */
    lauf.flaeche.querySelector("#dt-zeit").style.width = "0%";
    codeZeichnen();
    vorschauStarten();

    countdown(3, () => {
      cancelAnimationFrame(lauf.vorschauId);
      lauf.laeuft = true;
      lauf.letzteZeit = performance.now();
      lauf.phaseEnde = lauf.letzteZeit + lauf.phasen[lauf.phase].dauer * 1000;
      lauf.bildId = requestAnimationFrame(bild);
    });
  }

  function countdown(zahl, fertig) {
    const anzeige = lauf.flaeche.querySelector("#dt-countdown");
    /* Der Hinweis richtet sich danach, womit der Durchgang anfängt. */
    const hinweis = lauf.phasen[lauf.phase].art === "code"
      ? "Finger auf den Ziffernblock"
      : "Maus auf den leuchtenden Punkt";
    anzeige.innerHTML = "<span>" + zahl + "</span><small>" + hinweis + "</small>";
    anzeige.hidden = false;

    lauf.countdownId = setTimeout(() => {
      if (!lauf || lauf.beendet) return;
      if (zahl > 1) {
        countdown(zahl - 1, fertig);
      } else {
        anzeige.hidden = true;
        fertig();
      }
    }, 800);
  }

  /* ------------------------------ Tastatur ------------------------------ */

  function tastendruck(ereignis) {
    if (!lauf) return;

    if (ereignis.key === "Escape") {
      ereignis.preventDefault();
      abbrechen();
      return;
    }
    if (!lauf.laeuft) return;
    if (lauf.phasen[lauf.phase].art === "spur") return;

    /* Ziffernblock bevorzugt (event.code ist die physische Taste und bleibt
       auch ohne NumLock Numpad7). Die obere Zifferreihe geht ersatzweise. */
    let ziffer = null;
    if (/^Numpad[0-9]$/.test(ereignis.code)) ziffer = Number(ereignis.code.slice(6));
    else if (/^Digit[0-9]$/.test(ereignis.code)) ziffer = Number(ereignis.code.slice(5));
    if (ziffer === null) return;

    ereignis.preventDefault();
    lauf.anschlaege++;

    if (ziffer === lauf.code[lauf.codeStelle]) {
      lauf.zifferRichtig++;
      lauf.codeStelle++;
      if (lauf.codeStelle >= lauf.code.length) {
        lauf.codesFertig++;
        lauf.code = codeBauen(lauf.werte.codeLaenge);
        lauf.codeStelle = 0;
      }
    } else {
      /* Falsche Ziffer: Stelle bleibt stehen, kurz rot blinken. */
      lauf.tippFehler++;
      lauf.fehlerBlink = performance.now();
    }

    codeZeichnen();
  }

  function codeZeichnen() {
    const feld = lauf.flaeche.querySelector("#dt-code");
    const fehler = performance.now() - lauf.fehlerBlink < 220;

    /* Reine Spur-Phase (Stufe 1): diese Hand hat gerade Pause – dann auch
       keinen Code zeigen, sonst tippt man unwillkürlich weiter. Das Gegen-
       stück dazu steht in canvasZeichnen(). */
    if (lauf.phasen[lauf.phase].art === "spur") {
      feld.className = "code code-pause";
      feld.textContent = "Pause für diese Hand";
      return;
    }

    feld.className = "code" + (fehler ? " code-fehler" : "");
    feld.innerHTML = lauf.code.map((z, i) => {
      const klasse = i < lauf.codeStelle ? "ziffer ziffer-fertig"
                   : i === lauf.codeStelle ? "ziffer ziffer-dran"
                   : "ziffer";
      return '<span class="' + klasse + '">' + z + "</span>";
    }).join("");

    lauf.flaeche.querySelector("#dt-code-wert").textContent =
      lauf.codesFertig + (lauf.codesFertig === 1 ? " Code" : " Codes");
  }

  /* ------------------------------ Bildschleife ------------------------------ */

  function bild(jetzt) {
    if (!lauf || !lauf.laeuft) return;

    const dt = Math.min(jetzt - lauf.letzteZeit, 100); /* Sprünge abfangen */
    lauf.letzteZeit = jetzt;
    lauf.gesamtMs += dt;

    const phase = lauf.phasen[lauf.phase];
    const spurAktiv = phase.art !== "code";
    const tippAktiv = phase.art !== "spur";

    if (tippAktiv) lauf.tippAktivMs += dt;
    if (spurAktiv) {
      lauf.spurAktivMs += dt;
      zielBewegen(dt);
      messen(jetzt);
    }

    zeitbalken(jetzt);
    canvasZeichnen(jetzt);

    /* Phasenwechsel oder Ende */
    if (jetzt >= lauf.phaseEnde) {
      if (lauf.phase + 1 < lauf.phasen.length) {
        lauf.phase++;
        phaseAnlaufen();
        return;
      } else {
        beenden();
        return;
      }
    }

    lauf.bildId = requestAnimationFrame(bild);
  }

  function zielBewegen(dt) {
    const schritte = (GRUNDTEMPO * lauf.werte.spurTempo * (dt / 1000)) / lauf.bahn.abstand;
    lauf.bahnIndex += schritte * lauf.richtung;

    /* Am Ende umkehren statt springen – so bleibt die Bewegung flüssig. */
    const letzter = lauf.bahn.punkte.length - 1;
    if (lauf.bahnIndex >= letzter) { lauf.bahnIndex = letzter; lauf.richtung = -1; }
    if (lauf.bahnIndex <= 0) { lauf.bahnIndex = 0; lauf.richtung = 1; }
  }

  function zielPunkt() {
    return lauf.bahn.punkte[Math.round(lauf.bahnIndex)];
  }

  /* Die gezeigte Position des Cursors. Im Spiegelmodus seitenverkehrt –
     daran wird auch gemessen, denn das ist, was ich sehe und steuern muss. */
  function cursorPunkt() {
    if (!lauf.maus) return null;
    if (lauf.werte.modus === "spiegel") return { x: lauf.breite - lauf.maus.x, y: lauf.maus.y };
    return lauf.maus;
  }

  function messen(jetzt) {
    const ziel = zielPunkt();
    const cursor = cursorPunkt();

    /* Maus außerhalb der Fläche: zählt als danebengelegen, mit einer
       festen, großzügigen Strafe statt eines unendlichen Werts. */
    const abstand = cursor ? Math.hypot(cursor.x - ziel.x, cursor.y - ziel.y) : lauf.werte.spurBreitePx * 4;

    lauf.abweichungSumme += abstand;
    lauf.abweichungZaehler++;
    if (abstand <= lauf.werte.spurBreitePx) lauf.aufSpurZaehler++;

    if (jetzt - lauf.letzteAufzeichnung >= 50) {
      lauf.letzteAufzeichnung = jetzt;
      lauf.replay.push({
        x: cursor ? Math.round(cursor.x) : null,
        y: cursor ? Math.round(cursor.y) : null,
        zx: Math.round(ziel.x),
        zy: Math.round(ziel.y),
        drin: abstand <= lauf.werte.spurBreitePx
      });
    }

    const anzeige = lauf.flaeche.querySelector("#dt-spur-wert");
    const prozent = Math.round((lauf.aufSpurZaehler / lauf.abweichungZaehler) * 100);
    anzeige.textContent = prozent + " % auf der Spur";
  }

  function zeitbalken(jetzt) {
    const phase = lauf.phasen[lauf.phase];
    const rest = Math.max(0, lauf.phaseEnde - jetzt);
    const anteil = 1 - rest / (phase.dauer * 1000);
    lauf.flaeche.querySelector("#dt-zeit").style.width = (anteil * 100).toFixed(1) + "%";
  }

  /* ------------------------------ Zeichnen ------------------------------ */

  function canvasZeichnen(jetzt) {
    const ctx = lauf.ctx;
    const punkte = lauf.bahn.punkte;
    const spurAktiv = lauf.phasen[lauf.phase].art !== "code";

    ctx.clearRect(0, 0, lauf.breite, lauf.hoehe);

    if (!spurAktiv) {
      /* Reine Tippphase: Fläche ruhig halten, nur ein Hinweis. */
      ctx.fillStyle = lauf.farben.leise;
      ctx.font = "15px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Pause für diese Hand", lauf.breite / 2, lauf.hoehe / 2);
      return;
    }

    /* Der erlaubte Schlauch um die Linie: zeigt die Toleranz der Stufe. */
    ctx.strokeStyle = lauf.farbeHand;
    ctx.globalAlpha = 0.1;
    ctx.lineWidth = lauf.werte.spurBreitePx * 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    Bahnen.zeichnen(ctx, punkte);

    /* Die Soll-Linie selbst */
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.5;
    Bahnen.zeichnen(ctx, punkte);
    ctx.globalAlpha = 1;

    const ziel = zielPunkt();
    const cursor = cursorPunkt();
    const abstand = cursor ? Math.hypot(cursor.x - ziel.x, cursor.y - ziel.y) : Infinity;
    const drin = abstand <= lauf.werte.spurBreitePx;

    /* Zielpunkt mit weichem Schein */
    const schein = ctx.createRadialGradient(ziel.x, ziel.y, 0, ziel.x, ziel.y, 26);
    schein.addColorStop(0, lauf.farbeHand);
    schein.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = schein;
    ctx.beginPath();
    ctx.arc(ziel.x, ziel.y, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = lauf.farbeHand;
    ctx.beginPath();
    ctx.arc(ziel.x, ziel.y, 7, 0, Math.PI * 2);
    ctx.fill();

    if (!cursor) {
      ctx.fillStyle = lauf.farben.warnung;
      ctx.font = "14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Maus in die Fläche bewegen", lauf.breite / 2, lauf.hoehe - 18);
      return;
    }

    /* Verbindung zeigen, solange der Cursor zu weit weg ist */
    if (!drin) {
      ctx.strokeStyle = lauf.farben.warnung;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cursor.x, cursor.y);
      ctx.lineTo(ziel.x, ziel.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* Der eigene Cursor: grün, wenn er mitläuft, sonst rot */
    ctx.strokeStyle = drin ? lauf.farben.gut : lauf.farben.warnung;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cursor.x, cursor.y, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cursor.x, cursor.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = drin ? lauf.farben.gut : lauf.farben.warnung;
    ctx.fill();
  }

  /* ====================================================================
     5. Ende und Aufräumen
     ==================================================================== */

  function aufraeumen() {
    if (!lauf) return;
    lauf.laeuft = false;
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
    const kontext = lauf.kontext;
    const w = lauf.werte;

    const werte = {
      tippFehler: lauf.tippFehler,
      zifferGesamt: lauf.anschlaege,
      zifferRichtig: lauf.zifferRichtig,
      codesFertig: lauf.codesFertig,
      /* Tippzeit je richtig getippter Ziffer, in Millisekunden */
      tippZeitProZiffer: lauf.zifferRichtig > 0 ? Math.round(lauf.tippAktivMs / lauf.zifferRichtig) : 0,
      /* Als eigenes Feld, damit die Ergebnisseite es direkt vergleichen kann */
      tippGenauigkeit: lauf.anschlaege > 0
        ? Math.round((lauf.zifferRichtig / lauf.anschlaege) * 100) : 0,
      spurAbweichungPx: lauf.abweichungZaehler > 0
        ? Math.round((lauf.abweichungSumme / lauf.abweichungZaehler) * 10) / 10 : 0,
      zeitAufSpurProzent: lauf.abweichungZaehler > 0
        ? Math.round((lauf.aufSpurZaehler / lauf.abweichungZaehler) * 100) : 0,
      einzeln: lauf.getrennt
    };

    const durchgang = {
      id: new Date().toISOString(),
      stufe: w.stufe,
      modus: w.modus,
      /* Ein Basiswert ist kein Leistungsnachweis für die Stufe – app.js
         lässt die Stufe deshalb unverändert. */
      basiswert: lauf.istBasis,
      spur: w.spur,
      hand: lauf.rolle,
      spiegel: w.modus === "spiegel",
      dauerSek: Math.round(lauf.gesamtMs / 1000),
      werte: werte,
      score: Auswertung.scoreDualtask(werte)
    };

    const istProbe = lauf.istProbe;
    const istBasis = lauf.istBasis;      /* vor dem Aufräumen sichern */
    const flaeche = lauf.flaeche;
    const replay = {
      breite: Math.round(lauf.breite),
      hoehe: Math.round(lauf.hoehe),
      spurBreitePx: w.spurBreitePx,
      bahn: lauf.bahn.punkte.filter((p, i) => i % 5 === 0).map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })),
      punkte: lauf.replay
    };

    aufraeumen();
    lauf = null;

    /* Die Probe wird nicht gewertet – zurück zur Erklärung. */
    if (istProbe) {
      erklaerungZeigen(flaeche, kontext);
      return;
    }

    kontext.fertig(durchgang, {
      replay: replay,
      notiz: istBasis
        ? "Das war ein Basiswert für Stufe " + w.stufe + ". Er zählt nicht für " +
          "die Stufenanpassung, sondern dient als Vergleich: Ab jetzt zeigt die " +
          "Statistik, was dich das Gleichzeitige auf dieser Stufe kostet."
        : null,
      kacheln: [
        { titel: "Tippen richtig",    feld: "tippGenauigkeit",     einheit: " %"  },
        { titel: "Zeit je Ziffer",    feld: "tippZeitProZiffer",   einheit: " ms", kleinerIstBesser: true },
        { titel: "Auf der Spur",      feld: "zeitAufSpurProzent",  einheit: " %"  },
        { titel: "Abstand im Mittel", feld: "spurAbweichungPx",    einheit: " px", kleinerIstBesser: true }
      ]
    });
  }

  App.modulAnmelden(SCHLUESSEL, { starten: starten });

})();
