/* ==========================================================================
   stroop.js – Stroop-Test (Aufmerksamkeit und Hemmung)

   Das Wort ROT steht in blauer Schrift – gefragt ist die Farbe, nicht das
   Wort. Lesen läuft automatisch ab und muss aktiv unterdrückt werden; genau
   diese Hemmung wird hier trainiert.

   Gemessen wird der Stroop-Effekt: Wie viel länger brauche ich bei
   unpassenden Wörtern als bei passenden? Wird dieser Abstand kleiner,
   gelingt das Unterdrücken besser.

   Antworten je nach Stufe mit der Maus (linke Hand, Farbfelder anklicken),
   mit den Zifferntasten (rechte Hand) oder im Wechsel – dann wird vor jedem
   Wort angesagt, welche Hand dran ist.
   ========================================================================== */

(function () {

  const SCHLUESSEL = "stroop";

  /* Vier klar unterscheidbare Farben mit eindeutigen Namen. Die Zuordnung
     Farbe -> Platz -> Ziffer bleibt im ganzen Durchgang gleich, sonst wäre
     es eine Suchaufgabe statt einer Hemmungsaufgabe. */
  const FARBEN = [
    { name: "ROT",  wert: "#f2626b", taste: "1" },
    { name: "BLAU", wert: "#5b8cff", taste: "2" },
    { name: "GRÜN", wert: "#35d39a", taste: "3" },
    { name: "GELB", wert: "#f5c451", taste: "4" }
  ];

  let lauf = null;

  /* ====================================================================
     1. Erklärung
     ==================================================================== */

  function modusText(modus) {
    if (modus === "maus")   return "Antworten mit der Maus: linke Hand, Farbfeld anklicken.";
    if (modus === "tasten") return "Antworten mit der rechten Hand: Ziffern 1 bis 4 (auch auf dem Ziffernblock).";
    return "Wechsel: Vor jedem Wort steht da, ob die linke Hand klickt oder die rechte tippt.";
  }

  function starten(flaeche, kontext) {
    erklaerungZeigen(flaeche, kontext);
  }

  function erklaerungZeigen(flaeche, kontext) {
    const w = kontext.werte;

    flaeche.innerHTML =
      '<h1 class="titel">Stroop-Test</h1>' +
      '<p class="untertitel">Stufe ' + w.stufe + " von 10 · " + w.reize + " Wörter</p>" +

      '<div class="flaeche">' +
        App.stufenleiste(SCHLUESSEL, w.stufe, [
          { modus: "maus",    text: "Maus, linke Hand" },
          { modus: "tasten",  text: "Tasten, rechte Hand" },
          { modus: "wechsel", text: "im Wechsel" }
        ]) +

        '<p class="flaeche-text">' +
          "Es zählt die <b>Farbe der Schrift</b>, nie das Wort. Steht " +
          '<span style="color:' + FARBEN[0].wert + '">ROT</span> in ' +
          '<span style="color:' + FARBEN[1].wert + '">blauer</span> Schrift, ist Blau richtig. ' +
          modusText(w.modus) +
        "</p>" +

        '<div class="stroop-beispiel">' +
          '<span style="color:' + FARBEN[1].wert + '">ROT</span>' +
          '<span class="stroop-pfeil">→</span>' +
          '<span style="color:' + FARBEN[1].wert + '">Blau ist die Antwort</span>' +
        "</div>" +

        '<div class="fakten">' +
          '<span><b>' + w.reize + "</b>Wörter</span>" +
          '<span><b>' + Math.round(w.inkongruent * 100) + " %</b>davon unpassend</span>" +
          '<span><b>' + (w.zeitfensterMs / 1000).toFixed(1).replace(".", ",") + " s</b>Zeit je Wort</span>" +
        "</div>" +

        '<p class="flaeche-text ablauf"><b>Ablauf:</b> 3-2-1 → ' + w.reize +
          " Wörter nacheinander → Ergebnis mit dem Vergleich passend gegen unpassend. " +
          "Wer zu lange zögert, verpasst das Wort – das zählt wie ein Fehler.</p>" +

        '<div class="farbzuordnung">' +
          FARBEN.map((f) =>
            '<span class="farbfeld-klein" style="background:' + f.wert + '">' + f.taste + "</span>"
          ).join("") +
          '<span class="flaeche-text klein">Diese Reihenfolge bleibt den ganzen Durchgang gleich.</span>' +
        "</div>" +

        '<div class="knopfreihe">' +
          '<button class="knopf knopf-haupt" id="st-start">Durchgang starten</button>' +
          '<button class="knopf" id="st-zurueck">Zurück</button>' +
        "</div>" +
      "</div>";

    flaeche.querySelector("#st-start").addEventListener("click", () => laufStarten(flaeche, kontext));
    flaeche.querySelector("#st-zurueck").addEventListener("click", kontext.abbrechen);
  }

  /* ====================================================================
     2. Die Reize zusammenstellen
     ==================================================================== */

  function reizeBauen(w) {
    const reize = [];
    const unpassend = Math.round(w.reize * w.inkongruent);

    for (let i = 0; i < w.reize; i++) {
      const farbe = Math.floor(Math.random() * FARBEN.length);
      let wort = farbe;

      if (i < unpassend) {
        /* unpassend: irgendein anderes Farbwort */
        do { wort = Math.floor(Math.random() * FARBEN.length); } while (wort === farbe);
      }

      reize.push({
        wort: wort,
        farbe: farbe,
        passend: wort === farbe,
        /* Im Wechselmodus entscheidet der Zufall, welche Hand antwortet. */
        eingabe: w.modus === "wechsel" ? (Math.random() < 0.5 ? "maus" : "tasten") : w.modus
      });
    }

    /* mischen, damit die unpassenden nicht am Anfang klumpen */
    for (let i = reize.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const hilf = reize[i]; reize[i] = reize[j]; reize[j] = hilf;
    }
    return reize;
  }

  /* ====================================================================
     3. Durchgang
     ==================================================================== */

  function laufStarten(flaeche, kontext) {
    const w = kontext.werte;

    flaeche.innerHTML =
      '<div class="uebung">' +
        '<div class="uebung-kopf">' +
          '<span class="uebung-titel">Stroop-Test · Stufe ' + w.stufe + "</span>" +
          '<span class="marker" id="st-zaehler">1 von ' + w.reize + "</span>" +
          '<span class="marker" id="st-tempo">–</span>' +
          '<div class="zeitbalken"><div class="zeitbalken-fuellung" id="st-fortschritt"></div></div>' +
          '<button class="knopf" id="st-abbruch">Abbrechen (Esc)</button>' +
        "</div>" +

        '<section class="feld" id="st-feld">' +
          '<header class="feld-kopf">' +
            '<span id="st-hand">Welche Farbe hat die Schrift?</span>' +
            '<span id="st-fehler">0 Fehler</span>' +
          "</header>" +

          '<div class="stroop-buehne">' +
            /* Im Wechselmodus muss die Ansage dort stehen, wo der Blick
               ohnehin ist – oben in der Kopfzeile käme sie zu spät an. */
            '<span class="stroop-hand" id="st-hand-gross"></span>' +
            '<span class="stroop-wort" id="st-wort"></span>' +
          "</div>" +

          '<div class="farbfelder" id="st-felder">' +
            FARBEN.map((f, i) =>
              '<button class="farbfeld" data-index="' + i + '" style="--farbe:' + f.wert + '">' +
                '<span class="farbfeld-taste">' + f.taste + "</span>" +
              "</button>"
            ).join("") +
          "</div>" +
        "</section>" +

        '<div class="countdown" id="st-countdown"><span>3</span></div>' +
      "</div>";

    lauf = {
      flaeche: flaeche,
      kontext: kontext,
      werte: w,
      reize: reizeBauen(w),
      index: 0,
      aktiv: null,
      reizZeit: 0,
      antwortOffen: false,
      beginn: performance.now(),

      zeitenPassend: [],
      zeitenUnpassend: [],
      zeitenMaus: [],
      zeitenTasten: [],
      fehler: 0,
      verpasst: 0,
      treffer: 0,
      beendet: false
    };

    lauf.aufTaste = (e) => tastendruck(e);
    document.addEventListener("keydown", lauf.aufTaste);

    for (const knopf of flaeche.querySelectorAll(".farbfeld")) {
      knopf.addEventListener("click", () => antwort(Number(knopf.dataset.index), "maus"));
    }
    flaeche.querySelector("#st-abbruch").addEventListener("click", abbrechen);

    countdown(3, () => naechsterReiz(300));
  }

  function countdown(zahl, fertig) {
    const anzeige = lauf.flaeche.querySelector("#st-countdown");
    const modus = lauf.werte.modus;
    const hinweis = modus === "maus" ? "Linke Hand an die Maus"
                  : modus === "tasten" ? "Rechte Hand auf die Ziffern 1 bis 4"
                  : "Beide Hände bereit: Maus und Ziffern";
    anzeige.innerHTML = "<span>" + zahl + "</span><small>" + hinweis + "</small>";
    anzeige.hidden = false;

    lauf.countdownId = setTimeout(() => {
      if (!lauf || lauf.beendet) return;
      if (zahl > 1) countdown(zahl - 1, fertig);
      else { anzeige.hidden = true; fertig(); }
    }, 800);
  }

  /* ------------------------------ ein Wort ------------------------------ */

  function naechsterReiz(verzoegerung) {
    clearTimeout(lauf.reizId);
    const wortFeld = lauf.flaeche.querySelector("#st-wort");
    wortFeld.textContent = "";

    lauf.reizId = setTimeout(() => {
      if (!lauf || lauf.beendet) return;
      if (lauf.index >= lauf.reize.length) { beenden(); return; }

      const reiz = lauf.reize[lauf.index];
      lauf.aktiv = reiz;
      lauf.antwortOffen = true;
      lauf.reizZeit = performance.now();

      wortFeld.textContent = FARBEN[reiz.wort].name;
      wortFeld.style.color = FARBEN[reiz.farbe].wert;

      handHinweisSetzen(reiz);

      lauf.flaeche.querySelector("#st-zaehler").textContent =
        (lauf.index + 1) + " von " + lauf.reize.length;
      lauf.flaeche.querySelector("#st-fortschritt").style.width =
        Math.round((lauf.index / lauf.reize.length) * 100) + "%";

      /* Wer zu lange zögert, verpasst das Wort. */
      lauf.fensterId = setTimeout(() => {
        if (!lauf || !lauf.antwortOffen) return;
        lauf.antwortOffen = false;
        lauf.verpasst++;
        lauf.index++;
        fehlerAnzeigen();
        blinken(null, false);
        naechsterReiz(lauf.werte.pauseMs);
      }, lauf.werte.zeitfensterMs);
    }, verzoegerung);
  }

  /* Im Wechselmodus muss sofort klar sein, welche Hand gefragt ist. */
  function handHinweisSetzen(reiz) {
    const kopf = lauf.flaeche.querySelector("#st-hand");
    const gross = lauf.flaeche.querySelector("#st-hand-gross");
    const felder = lauf.flaeche.querySelector("#st-felder");
    const istMaus = reiz.eingabe === "maus";
    const klasse = istMaus ? "hand-links" : "hand-rechts";

    kopf.textContent = istMaus ? "Linke Hand · Farbfeld anklicken" : "Rechte Hand · Ziffer tippen";
    kopf.className = klasse;
    felder.className = "farbfelder eingabe-" + reiz.eingabe;

    /* Nur im Wechsel nötig: Bei festem Modus wäre die große Ansage bei
       jedem Wort dieselbe und damit nur Unruhe im Bild. */
    if (lauf.werte.modus === "wechsel") {
      gross.textContent = istMaus ? "linke Hand · klicken" : "rechte Hand · tippen";
      gross.className = "stroop-hand " + klasse;
    } else {
      gross.textContent = "";
    }
  }

  function fehlerAnzeigen() {
    lauf.flaeche.querySelector("#st-fehler").textContent =
      (lauf.fehler + lauf.verpasst) + " Fehler";
  }

  function blinken(index, richtig) {
    const feld = index === null ? null
      : lauf.flaeche.querySelector('.farbfeld[data-index="' + index + '"]');
    if (!feld) {
      /* Nichts angeklickt (verpasst): die Bühne kurz rot umranden. */
      const buehne = lauf.flaeche.querySelector(".stroop-buehne");
      buehne.classList.add("buehne-falsch");
      setTimeout(() => buehne.classList.remove("buehne-falsch"), 220);
      return;
    }
    feld.classList.add(richtig ? "feld-richtig" : "feld-falsch");
    setTimeout(() => feld.classList.remove("feld-richtig", "feld-falsch"), 200);
  }

  function tastendruck(ereignis) {
    if (!lauf) return;
    if (ereignis.key === "Escape") { ereignis.preventDefault(); abbrechen(); return; }

    let ziffer = null;
    if (/^Numpad[1-4]$/.test(ereignis.code)) ziffer = Number(ereignis.code.slice(6));
    else if (/^Digit[1-4]$/.test(ereignis.code)) ziffer = Number(ereignis.code.slice(5));
    if (ziffer === null) return;

    ereignis.preventDefault();
    antwort(ziffer - 1, "tasten");
  }

  function antwort(index, eingabe) {
    if (!lauf || !lauf.antwortOffen) return;

    const reiz = lauf.aktiv;
    /* Mit der falschen Hand geantwortet? Zählt nicht – sonst könnte man im
       Wechselmodus immer dieselbe Hand nehmen. */
    if (reiz.eingabe !== eingabe) {
      lauf.fehler++;
      fehlerAnzeigen();
      blinken(index, false);
      return;
    }

    const reaktion = performance.now() - lauf.reizZeit;
    const richtig = index === reiz.farbe;

    if (richtig) {
      lauf.antwortOffen = false;
      clearTimeout(lauf.fensterId);
      lauf.treffer++;

      if (reiz.passend) lauf.zeitenPassend.push(reaktion);
      else lauf.zeitenUnpassend.push(reaktion);
      if (eingabe === "maus") lauf.zeitenMaus.push(reaktion);
      else lauf.zeitenTasten.push(reaktion);

      lauf.flaeche.querySelector("#st-tempo").textContent = Math.round(reaktion) + " ms";
      lauf.index++;
      blinken(index, true);
      naechsterReiz(lauf.werte.pauseMs);
    } else {
      /* Falsche Farbe: Wort bleibt stehen, bis die richtige kommt. */
      lauf.fehler++;
      fehlerAnzeigen();
      blinken(index, false);
    }
  }

  /* ====================================================================
     4. Bild für die Ergebnisseite
     ==================================================================== */

  function vergleichsBild(passend, unpassend) {
    const breite = 640;
    const hoehe = 240;
    const canvas = document.createElement("canvas");
    canvas.width = breite * 2;
    canvas.height = hoehe * 2;
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);

    const stil = getComputedStyle(document.documentElement);
    const farbeText = stil.getPropertyValue("--text-leise").trim();
    const farbeLinie = stil.getPropertyValue("--rand").trim();

    ctx.fillStyle = "#080b11";
    ctx.fillRect(0, 0, breite, hoehe);

    const werte = [
      { name: "passend", wert: passend, farbe: "#35d39a" },
      { name: "unpassend", wert: unpassend, farbe: "#f2626b" }
    ];
    const hoechst = Math.max(passend, unpassend) * 1.25 || 1;
    const unten = hoehe - 34;
    const oben = 26;

    ctx.strokeStyle = farbeLinie;
    ctx.fillStyle = farbeText;
    ctx.font = "11px system-ui, sans-serif";
    for (let i = 0; i <= 3; i++) {
      const y = unten - ((unten - oben) / 3) * i;
      ctx.beginPath();
      ctx.moveTo(56, y);
      ctx.lineTo(breite - 20, y);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText(Math.round((hoechst / 3) * i) + " ms", 50, y + 4);
    }

    const breitePro = (breite - 76) / werte.length;
    werte.forEach((b, i) => {
      const x = 62 + i * breitePro + 30;
      const bb = breitePro - 60;
      const h = ((unten - oben) * b.wert) / hoechst;
      ctx.fillStyle = b.farbe;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, unten - h, bb, h);
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#e7edf6";
      ctx.textAlign = "center";
      ctx.font = "600 13px system-ui, sans-serif";
      ctx.fillText(Math.round(b.wert) + " ms", x + bb / 2, unten - h - 8);
      ctx.fillStyle = farbeText;
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(b.name, x + bb / 2, unten + 18);
    });

    return canvas.toDataURL("image/png");
  }

  /* ====================================================================
     5. Ende
     ==================================================================== */

  function aufraeumen() {
    if (!lauf) return;
    lauf.beendet = true;
    lauf.antwortOffen = false;
    clearTimeout(lauf.reizId);
    clearTimeout(lauf.fensterId);
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
    const passend = Math.round(Auswertung.mittelwert(lauf.zeitenPassend));
    const unpassend = Math.round(Auswertung.mittelwert(lauf.zeitenUnpassend));
    const alle = lauf.zeitenPassend.concat(lauf.zeitenUnpassend);

    const werte = {
      reaktionMs: Math.round(Auswertung.mittelwert(alle)),
      reaktionPassendMs: passend,
      reaktionUnpassendMs: unpassend,
      /* Der Stroop-Effekt: die Zusatzzeit, die das Unterdrücken kostet. */
      stroopEffektMs: unpassend - passend,
      fehler: lauf.fehler,
      verpasst: lauf.verpasst,
      reize: lauf.reize.length,
      trefferProzent: lauf.reize.length > 0
        ? Math.round((lauf.treffer / lauf.reize.length) * 100) : 0,
      reaktionMausMs: Math.round(Auswertung.mittelwert(lauf.zeitenMaus)),
      reaktionTastenMs: Math.round(Auswertung.mittelwert(lauf.zeitenTasten))
    };

    const durchgang = {
      id: new Date().toISOString(),
      stufe: w.stufe,
      modus: w.modus,
      hand: { antwort: w.modus === "wechsel" ? "beide" : (w.modus === "maus" ? "links" : "rechts") },
      spiegel: false,
      dauerSek: Math.round((performance.now() - lauf.beginn) / 1000),
      werte: werte,
      score: Auswertung.scoreStroop(werte)
    };

    const bild = vergleichsBild(passend, unpassend);
    const kontext = lauf.kontext;
    aufraeumen();
    lauf = null;

    kontext.fertig(durchgang, {
      galerie: [{ text: "Mittlere Reaktionszeit", gemalt: bild }],
      galerieTitel: "Passend gegen unpassend",
      galerieText: "Der Abstand zwischen den Balken ist der Stroop-Effekt – die Zeit, " +
                   "die das Unterdrücken des Lesens kostet. Je kleiner, desto besser.",
      kacheln: [
        { titel: "Stroop-Effekt", feld: "stroopEffektMs", einheit: " ms", kleinerIstBesser: true },
        { titel: "Reaktionszeit", feld: "reaktionMs",     einheit: " ms", kleinerIstBesser: true },
        { titel: "Treffer",       feld: "trefferProzent", einheit: " %" },
        { titel: "Fehlgriffe",    feld: "fehler",         einheit: "",    kleinerIstBesser: true }
      ]
    });
  }

  App.modulAnmelden(SCHLUESSEL, { starten: starten });

})();
