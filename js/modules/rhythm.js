/* ==========================================================================
   rhythm.js – Rhythmus-Unabhängigkeit

   Beide Hände klopfen gleichzeitig verschiedene Takte: drei gegen zwei,
   später vier gegen drei. Das ist die härteste Trennung der beiden Seiten –
   jede Hand braucht ihren eigenen Takt, und keine darf sich der anderen
   anpassen.

   Links: Leertaste (oder Y). Rechts: Ziffernblock-0 (oder M).

   Das Metronom gibt je nach Stufe immer weniger vor:
     "beide"  jeden Schlag beider Hände
     "grund"  nur die langsamere Hand und den Taktanfang
     "takt"   nur den Taktanfang

   Die Klicks entstehen in der Web Audio API – keine Audiodateien nötig, und
   sie sind genauer als alles, was sich mit setTimeout abspielen ließe.
   ========================================================================== */

(function () {

  const SCHLUESSEL = "rhythm";

  const TASTEN_LINKS = ["Space", "KeyY"];
  const TASTEN_RECHTS = ["Numpad0", "KeyM"];

  /* Zwei Zyklen Vorlauf zum Einhören, die nicht gewertet werden. */
  const VORLAUF_ZYKLEN = 2;

  let lauf = null;

  /* Ton an oder aus – die Einstellung bleibt erhalten. Ohne Ton übernimmt
     das Bild die Vorgabe: Die Felder blitzen im Takt auf. */
  function tonAn() {
    return Speicher.einstellung("rhythmusTon", true) !== false;
  }

  /* ====================================================================
     1. Erklärung
     ==================================================================== */

  function modusText(modus) {
    if (modus === "beide") return "Das Metronom klickt jeden Schlag beider Hände mit.";
    if (modus === "grund") return "Das Metronom klickt nur die langsamere Hand und den Taktanfang.";
    return "Das Metronom gibt nur den Taktanfang vor – alles andere kommt aus dem Kopf.";
  }

  /* "1 Schlag" statt "1 Schläge" – auf Stufe 1 hat die rechte Hand nur einen. */
  function schlagText(anzahl) {
    return anzahl + (anzahl === 1 ? " Schlag" : " Schläge");
  }

  function starten(flaeche, kontext) {
    erklaerungZeigen(flaeche, kontext);
  }

  function erklaerungZeigen(flaeche, kontext) {
    const w = kontext.werte;

    flaeche.innerHTML =
      '<h1 class="titel">Rhythmus</h1>' +
      '<p class="untertitel">Stufe ' + w.stufe + " von 10 · " + w.links + " gegen " + w.rechts + "</p>" +

      '<div class="flaeche">' +
        App.stufenleiste(SCHLUESSEL, w.stufe, [
          { modus: "beide", text: "Metronom klickt alles" },
          { modus: "grund", text: "nur Grundschlag" },
          { modus: "takt",  text: "nur Taktanfang" }
        ]) +

        '<p class="flaeche-text">' +
          "In derselben Zeit klopft die <b>linke Hand " + w.links + " Mal</b> und die " +
          "<b>rechte Hand " + w.rechts + (w.rechts === 1 ? " Mal" : " Mal") + "</b>. Nur der erste Schlag fällt zusammen, " +
          "danach laufen die Hände auseinander und treffen sich erst am Ende " +
          "des Taktes wieder. " + modusText(w.modus) +
        "</p>" +

        '<div class="takt-bild">' +
          ["links", "rechts"].map((hand) =>
            '<div class="takt-zeile">' +
              '<span class="takt-name takt-name-' + hand + '">' + hand + "</span>" +
              '<div class="takt-spur takt-' + hand + '">' +
                Array.from({ length: w[hand] }, (_, i) =>
                  '<span class="takt-punkt" style="left:' + (i / w[hand] * 100) + '%"></span>').join("") +
              "</div>" +
            "</div>"
          ).join("") +
        "</div>" +

        '<div class="fakten">' +
          '<span><b>' + w.links + " : " + w.rechts + "</b>Verhältnis</span>" +
          '<span><b>' + (w.zyklusMs / 1000).toFixed(1).replace(".", ",") + " s</b>je Takt</span>" +
          '<span><b>' + w.zyklen + "</b>Takte</span>" +
          '<span><b>±' + w.toleranzMs + " ms</b>Toleranz</span>" +
        "</div>" +

        '<p class="flaeche-text ablauf"><b>Ablauf:</b> ' + VORLAUF_ZYKLEN +
          " Takte zum Einhören (zählen nicht) → " + w.zyklen +
          " Takte werden gemessen → Ergebnis mit Vergleich beider Hände. " +
          (tonAn()
            ? "Das Metronom gibt den Takt hörbar vor; die Felder blitzen zusätzlich auf."
            : "Ohne Ton: Die Felder unten blitzen genau dann auf, wenn der Schlag fällig ist.") +
          "</p>" +

        '<div class="rollen">' +
          '<div class="rolle rolle-links"><span>Linke Hand · Leertaste (oder Y)</span><b>' +
            schlagText(w.links) + " je Takt</b></div>" +
          '<div class="rolle rolle-rechts"><span>Rechte Hand · Ziffernblock 0 (oder M)</span><b>' +
            schlagText(w.rechts) + " je Takt</b></div>" +
        "</div>" +

        '<div class="ton-wahl">' +
          "<span>Vorgabe:</span>" +
          '<button class="knopf klein-knopf' + (tonAn() ? " modul-aktiv" : "") +
            '" data-ton="an">Ton und Bild</button>' +
          '<button class="knopf klein-knopf' + (tonAn() ? "" : " modul-aktiv") +
            '" data-ton="aus">nur Bild</button>' +
        "</div>" +

        '<div class="knopfreihe">' +
          '<button class="knopf knopf-haupt" id="ry-start">Durchgang starten</button>' +
          '<button class="knopf" id="ry-zurueck">Zurück</button>' +
        "</div>" +
      "</div>";

    for (const knopf of flaeche.querySelectorAll(".ton-wahl .knopf")) {
      knopf.addEventListener("click", () => {
        Speicher.einstellungSetzen("rhythmusTon", knopf.dataset.ton === "an");
        erklaerungZeigen(flaeche, kontext);     /* Auswahl neu zeichnen */
      });
    }

    flaeche.querySelector("#ry-start").addEventListener("click", () => laufStarten(flaeche, kontext));
    flaeche.querySelector("#ry-zurueck").addEventListener("click", kontext.abbrechen);
  }

  /* ====================================================================
     2. Töne
     ==================================================================== */

  /* Kurzer Klick. Die Hüllkurve verhindert das Knacken, das ein hart
     gestarteter Ton sonst macht. */
  function klick(zeit, frequenz, lautstaerke) {
    const ctx = lauf.audio;
    if (!ctx || !lauf.ton) return;

    const ton = ctx.createOscillator();
    const huelle = ctx.createGain();
    ton.type = "sine";
    ton.frequency.value = frequenz;

    huelle.gain.setValueAtTime(0, zeit);
    huelle.gain.linearRampToValueAtTime(lautstaerke, zeit + 0.004);
    huelle.gain.exponentialRampToValueAtTime(0.0001, zeit + 0.07);

    ton.connect(huelle);
    huelle.connect(ctx.destination);
    ton.start(zeit);
    ton.stop(zeit + 0.09);
  }

  /* Welche Schläge das Metronom hörbar macht, hängt von der Stufe ab. */
  function wirdGeklickt(hand, schlagIndex) {
    const w = lauf.werte;
    if (schlagIndex === 0) return true;                 /* Taktanfang immer */
    if (w.modus === "beide") return true;
    if (w.modus === "grund") {
      /* die langsamere Hand gibt den Grundschlag */
      const langsamer = w.links <= w.rechts ? "links" : "rechts";
      return hand === langsamer;
    }
    return false;                                       /* "takt" */
  }

  /* Plant alle Klicks eines Taktes im Voraus – das ist genauer, als sie
     einzeln per Timer auszulösen. */
  function taktPlanen(zyklusIndex) {
    const w = lauf.werte;
    const start = lauf.audioStart + (zyklusIndex * w.zyklusMs) / 1000;

    for (const hand of ["links", "rechts"]) {
      const anzahl = w[hand];
      for (let i = 0; i < anzahl; i++) {
        if (!wirdGeklickt(hand, i)) continue;
        const zeit = start + (i / anzahl) * (w.zyklusMs / 1000);
        /* Taktanfang tiefer und lauter, linke Hand tiefer als die rechte */
        const frequenz = i === 0 ? 523 : (hand === "links" ? 740 : 988);
        klick(zeit, frequenz, i === 0 ? 0.28 : 0.16);
      }
    }
  }

  /* ====================================================================
     3. Durchgang
     ==================================================================== */

  function laufStarten(flaeche, kontext) {
    const w = kontext.werte;

    flaeche.innerHTML =
      '<div class="uebung">' +
        '<div class="uebung-kopf">' +
          '<span class="uebung-titel">Rhythmus · Stufe ' + w.stufe + " · " +
            w.links + " gegen " + w.rechts + "</span>" +
          '<span class="marker" id="ry-phase">Einhören</span>' +
          '<span class="marker" id="ry-takt">–</span>' +
          '<div class="zeitbalken"><div class="zeitbalken-fuellung" id="ry-fortschritt"></div></div>' +
          '<button class="knopf" id="ry-abbruch">Abbrechen (Esc)</button>' +
        "</div>" +

        '<section class="feld">' +
          '<header class="feld-kopf">' +
            "<span>Schlag, wenn der Balken die Linie erreicht</span>" +
            '<span id="ry-abweichung">–</span>' +
          "</header>" +
          '<canvas id="ry-canvas"></canvas>' +
          /* Unter jeder Bahn steht groß, welche Taste diese Hand bedient.
             Das Feld blitzt zur Vorgabe und füllt sich beim eigenen Schlag. */
          '<div class="puls-reihe">' +
            '<div class="puls puls-links" id="ry-puls-links">' +
              '<span class="puls-hand">linke Hand</span>' +
              '<span class="puls-taste">Leertaste</span>' +
              '<span class="puls-zahl">' + schlagText(w.links) + " je Takt</span>" +
            "</div>" +
            '<div class="puls puls-rechts" id="ry-puls-rechts">' +
              '<span class="puls-hand">rechte Hand</span>' +
              '<span class="puls-taste">Ziffernblock 0</span>' +
              '<span class="puls-zahl">' + schlagText(w.rechts) + " je Takt</span>" +
            "</div>" +
          "</div>" +
        "</section>" +

        '<div class="countdown" id="ry-countdown"><span>3</span></div>' +
      "</div>";

    const canvas = flaeche.querySelector("#ry-canvas");
    const kasten = canvas.getBoundingClientRect();
    const dichte = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(kasten.width * dichte);
    canvas.height = Math.round(kasten.height * dichte);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dichte, 0, 0, dichte, 0, 0);

    const stil = getComputedStyle(document.documentElement);

    /* Der AudioContext darf erst nach einem Klick entstehen – darum hier
       und nicht beim Laden der Seite. */
    const ton = tonAn();
    let audio = null;
    try {
      if (!ton) throw new Error("ohne Ton");
      audio = new (window.AudioContext || window.webkitAudioContext)();
      /* Manche Browser starten ihn angehalten; der Klick auf "Starten"
         berechtigt uns, ihn zu wecken. */
      if (audio.state === "suspended") audio.resume();
    } catch (fehler) {
      audio = null;
      if (ton) console.warn("SYNAPSE: Kein Ton möglich, die Übung läuft stumm weiter.", fehler);
    }

    lauf = {
      flaeche: flaeche,
      kontext: kontext,
      werte: w,
      canvas: canvas,
      ctx: ctx,
      breite: kasten.width,
      hoehe: kasten.height,
      audio: audio,
      ton: ton,
      /* Zeitpunkt des letzten Bildes – daran wird erkannt, welche Soll-
         Schläge seitdem fällig waren. */
      letzteBildZeit: 0,
      farben: {
        links: stil.getPropertyValue("--links").trim(),
        rechts: stil.getPropertyValue("--rechts").trim(),
        gut: stil.getPropertyValue("--gut").trim(),
        warnung: stil.getPropertyValue("--warnung").trim(),
        leise: stil.getPropertyValue("--text-still").trim(),
        rand: stil.getPropertyValue("--rand").trim()
      },

      /* Zeitrechnung: performance.now() ist der Maßstab für Eingaben, der
         AudioContext für die Töne. Beide werden erst nach dem Countdown
         gesetzt – vorher liefe die Uhr, während noch gezählt wird. */
      start: 0,
      audioStart: 0,
      geplanteTakte: 0,

      schlaege: { links: [], rechts: [] },   /* eigene Treffer */
      sollListe: sollListeBauen(w),
      zusatz: 0,
      beendet: false
    };

    lauf.aufTaste = (e) => tastendruck(e);
    document.addEventListener("keydown", lauf.aufTaste);
    flaeche.querySelector("#ry-abbruch").addEventListener("click", abbrechen);

    /* Die Bahnen schon zeigen, solange gezählt wird. */
    zeichnen(0);

    countdown(3, () => {
      lauf.start = performance.now() + 300;
      lauf.audioStart = lauf.audio ? lauf.audio.currentTime + 0.3 : 0;

      /* Vorlauf und erste gewertete Takte vorplanen */
      for (let z = 0; z < VORLAUF_ZYKLEN; z++) taktPlanen(z);
      lauf.geplanteTakte = VORLAUF_ZYKLEN;

      lauf.bildId = requestAnimationFrame(bild);
    });
  }

  /* Dreierzählung wie in den anderen Übungen – dann weiß die Hand, wann es
     losgeht, statt vom ersten Takt überrascht zu werden. */
  function countdown(zahl, fertig) {
    const anzeige = lauf.flaeche.querySelector("#ry-countdown");
    anzeige.innerHTML = "<span>" + zahl + "</span>" +
      "<small>Linke Hand auf die Leertaste, rechte auf Ziffernblock 0</small>";
    anzeige.hidden = false;

    lauf.countdownId = setTimeout(() => {
      if (!lauf || lauf.beendet) return;
      if (zahl > 1) countdown(zahl - 1, fertig);
      else { anzeige.hidden = true; fertig(); }
    }, 800);
  }

  /* Alle Soll-Schläge der gewerteten Takte, in Millisekunden ab Start. */
  function sollListeBauen(w) {
    const liste = { links: [], rechts: [] };
    for (const hand of ["links", "rechts"]) {
      const anzahl = w[hand];
      for (let z = 0; z < w.zyklen; z++) {
        for (let i = 0; i < anzahl; i++) {
          liste[hand].push({
            zeit: (VORLAUF_ZYKLEN + z) * w.zyklusMs + (i / anzahl) * w.zyklusMs,
            getroffen: false,
            abweichung: 0
          });
        }
      }
    }
    return liste;
  }

  /* ------------------------------ Eingabe ------------------------------ */

  function tastendruck(ereignis) {
    if (!lauf) return;
    if (ereignis.key === "Escape") { ereignis.preventDefault(); abbrechen(); return; }

    let hand = null;
    if (TASTEN_LINKS.indexOf(ereignis.code) >= 0) hand = "links";
    else if (TASTEN_RECHTS.indexOf(ereignis.code) >= 0) hand = "rechts";
    if (!hand) return;

    ereignis.preventDefault();
    if (ereignis.repeat) return;        /* gehaltene Taste ist kein Schlag */
    if (!lauf.start) return;            /* es wird noch gezählt */

    const jetzt = performance.now() - lauf.start;
    pulsen(hand);

    /* Während des Einhörens wird nicht gewertet. */
    if (jetzt < VORLAUF_ZYKLEN * lauf.werte.zyklusMs) return;

    /* Den nächstgelegenen, noch offenen Soll-Schlag dieser Hand suchen. */
    const liste = lauf.sollListe[hand];
    let bester = null;
    let besterAbstand = Infinity;
    for (const soll of liste) {
      if (soll.getroffen) continue;
      const abstand = Math.abs(soll.zeit - jetzt);
      if (abstand < besterAbstand) { besterAbstand = abstand; bester = soll; }
    }

    if (bester && besterAbstand <= lauf.werte.toleranzMs) {
      bester.getroffen = true;
      /* Vorzeichen behalten: zu früh ist etwas anderes als zu spät. */
      bester.abweichung = jetzt - bester.zeit;
      lauf.schlaege[hand].push({ zeit: jetzt, abweichung: bester.abweichung, treffer: true });
      anzeigeAktualisieren();
    } else {
      lauf.zusatz++;
      lauf.schlaege[hand].push({ zeit: jetzt, abweichung: besterAbstand, treffer: false });
    }
  }

  /* Die Vorgabe als Lichtimpuls: Das Feld bekommt kurz einen hellen Rand.
     Gefüllt wird es weiterhin nur vom eigenen Schlag – sonst ließe sich
     Vorgabe und eigene Hand nicht auseinanderhalten. */
  function vorgabeZeigen(hand, istTaktanfang) {
    const element = lauf.flaeche.querySelector("#ry-puls-" + hand);
    if (!element) return;
    const klasse = istTaktanfang ? "vorgabe-takt" : "vorgabe";
    element.classList.add(klasse);
    setTimeout(() => element.classList.remove(klasse), 150);
  }

  /* Prüft, welche Soll-Schläge seit dem letzten Bild fällig waren, und löst
     dafür die Lichtimpulse aus. Das läuft unabhängig vom Ton – auch mit Ton
     blitzt es mit, das hilft beim Einhören. */
  function vorgabeBlitze(jetzt) {
    const w = lauf.werte;
    const von = lauf.letzteBildZeit;
    if (von <= 0) return;

    for (const hand of ["links", "rechts"]) {
      const anzahl = w[hand];
      const abstand = w.zyklusMs / anzahl;
      /* alle Soll-Zeitpunkte im Fenster (von, jetzt] */
      const ersterIndex = Math.floor(von / abstand) + 1;
      const letzterIndex = Math.floor(jetzt / abstand);
      for (let k = ersterIndex; k <= letzterIndex; k++) {
        const imTakt = k % anzahl;
        if (!wirdGeklickt(hand, imTakt)) continue;
        vorgabeZeigen(hand, imTakt === 0);
      }
    }
  }

  function pulsen(hand) {
    const element = lauf.flaeche.querySelector("#ry-puls-" + hand);
    if (!element) return;
    element.classList.add("puls-an");
    setTimeout(() => element.classList.remove("puls-an"), 110);
  }

  function anzeigeAktualisieren() {
    const alle = lauf.schlaege.links.concat(lauf.schlaege.rechts).filter((s) => s.treffer);
    if (!alle.length) return;
    const mittel = Auswertung.mittelwert(alle.map((s) => Math.abs(s.abweichung)));
    lauf.flaeche.querySelector("#ry-abweichung").textContent =
      "± " + Math.round(mittel) + " ms im Schnitt";
  }

  /* ------------------------------ Bildschleife ------------------------------ */

  function bild() {
    if (!lauf || lauf.beendet) return;

    const w = lauf.werte;
    const jetzt = performance.now() - lauf.start;
    const gesamt = (VORLAUF_ZYKLEN + w.zyklen) * w.zyklusMs;

    vorgabeBlitze(jetzt);
    lauf.letzteBildZeit = jetzt;

    /* Takte rechtzeitig nachplanen, immer einen im Voraus. */
    const aktuellerTakt = Math.floor(jetzt / w.zyklusMs);
    while (lauf.geplanteTakte < VORLAUF_ZYKLEN + w.zyklen &&
           lauf.geplanteTakte <= aktuellerTakt + 1) {
      taktPlanen(lauf.geplanteTakte);
      lauf.geplanteTakte++;
    }

    const imVorlauf = jetzt < VORLAUF_ZYKLEN * w.zyklusMs;
    lauf.flaeche.querySelector("#ry-phase").textContent = imVorlauf ? "Einhören" : "Es zählt";
    lauf.flaeche.querySelector("#ry-takt").textContent = imVorlauf
      ? "noch " + Math.ceil((VORLAUF_ZYKLEN * w.zyklusMs - jetzt) / w.zyklusMs) + " Takte"
      : "Takt " + Math.min(w.zyklen, Math.floor(jetzt / w.zyklusMs) - VORLAUF_ZYKLEN + 1) + " von " + w.zyklen;
    lauf.flaeche.querySelector("#ry-fortschritt").style.width =
      Math.max(0, Math.min(100, ((jetzt - VORLAUF_ZYKLEN * w.zyklusMs) / (w.zyklen * w.zyklusMs)) * 100)) + "%";

    zeichnen(jetzt);

    if (jetzt >= gesamt) { beenden(); return; }
    lauf.bildId = requestAnimationFrame(bild);
  }

  /* ------------------------------- Zeichnen -------------------------------
     Zwei senkrechte Bahnen nebeneinander: links die linke Hand, rechts die
     rechte – so ist die Zuordnung räumlich und muss nicht gelesen werden.
     Die Schläge kommen von oben herunter und sind fällig, wenn sie die
     Trefferlinie erreichen. Dadurch sieht man den nächsten Schlag kommen,
     statt ihn nur zu hören.
  --------------------------------------------------------------------- */

  const SICHT_MS = 1900;        /* so weit im Voraus sind Schläge zu sehen */

  function bahnMasse() {
    const trefferY = lauf.hoehe * 0.76;
    return {
      trefferY: trefferY,
      oben: 16,
      bahnen: {
        links:  { mitte: lauf.breite * 0.28, breite: Math.min(lauf.breite * 0.38, 200) },
        rechts: { mitte: lauf.breite * 0.72, breite: Math.min(lauf.breite * 0.38, 200) }
      }
    };
  }

  function zeichnen(jetzt) {
    const ctx = lauf.ctx;
    const w = lauf.werte;
    const m = bahnMasse();

    ctx.clearRect(0, 0, lauf.breite, lauf.hoehe);

    for (const hand of ["links", "rechts"]) {
      const bahn = m.bahnen[hand];
      const farbe = lauf.farben[hand];
      const x = bahn.mitte - bahn.breite / 2;

      /* Bahn als dunkles Band mit farbigem Rand */
      ctx.fillStyle = "#0b1119";
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x, m.oben, bahn.breite, m.trefferY - m.oben + 26);
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = farbe;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, m.oben, bahn.breite, m.trefferY - m.oben + 26);
      ctx.globalAlpha = 1;

      /* die fälligen Schläge als fallende Balken */
      const abstand = w.zyklusMs / w[hand];
      const ersterIndex = Math.floor((jetzt - 220) / abstand);
      const letzterIndex = Math.ceil((jetzt + SICHT_MS) / abstand);

      for (let k = ersterIndex; k <= letzterIndex; k++) {
        if (k < 0) continue;
        const zeit = k * abstand;
        const abstandZurLinie = zeit - jetzt;
        const y = m.trefferY - (abstandZurLinie / SICHT_MS) * (m.trefferY - m.oben);
        if (y < m.oben - 10 || y > m.trefferY + 26) continue;

        const istTaktanfang = k % w[hand] === 0;
        /* weiter oben blasser – das gibt Tiefe und lenkt den Blick nach unten */
        const naehe = Math.max(0, Math.min(1, 1 - abstandZurLinie / SICHT_MS));

        /* Der Taktanfang bekommt einen goldenen Rahmen, bleibt innen aber in
           der Handfarbe. Vorher war er ganz golden – auf den unteren Stufen
           hat die rechte Hand nur einen Schlag je Takt, und der ist immer der
           Taktanfang: Die rechte Bahn sah dadurch nie orange aus. */
        const hoeheBalken = istTaktanfang ? 14 : 10;
        ctx.globalAlpha = 0.25 + naehe * 0.75;
        ctx.fillStyle = farbe;
        ctx.beginPath();
        ctx.roundRect(x + 8, y - hoeheBalken / 2, bahn.breite - 16, hoeheBalken, 5);
        ctx.fill();

        if (istTaktanfang) {
          ctx.strokeStyle = lauf.farben.gold;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(x + 5, y - hoeheBalken / 2 - 3, bahn.breite - 10, hoeheBalken + 6, 7);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      /* eigene Schläge: Markierung auf der Trefferlinie, die kurz nachleuchtet */
      for (const schlag of lauf.schlaege[hand]) {
        const alter = jetzt - schlag.zeit;
        if (alter < 0 || alter > 600) continue;
        ctx.globalAlpha = Math.max(0, 1 - alter / 600) * 0.9;
        ctx.strokeStyle = schlag.treffer ? lauf.farben.gut : lauf.farben.warnung;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(x + 4, m.trefferY - 13, bahn.breite - 8, 26, 7);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      /* Beschriftung oben an der Bahn */
      ctx.fillStyle = farbe;
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(hand === "links" ? "LINKE HAND" : "RECHTE HAND", bahn.mitte, m.oben - 4);
    }

    /* die Trefferlinie quer über beide Bahnen */
    const linksBahn = m.bahnen.links;
    const rechtsBahn = m.bahnen.rechts;
    ctx.strokeStyle = "#ffffff";
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(linksBahn.mitte - linksBahn.breite / 2 - 10, m.trefferY);
    ctx.lineTo(rechtsBahn.mitte + rechtsBahn.breite / 2 + 10, m.trefferY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = lauf.farben.leise;
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("jetzt", lauf.breite / 2, m.trefferY + 16);
  }

  /* ====================================================================
     4. Ende
     ==================================================================== */

  function aufraeumen() {
    if (!lauf) return;
    lauf.beendet = true;
    cancelAnimationFrame(lauf.bildId);
    clearTimeout(lauf.countdownId);
    document.removeEventListener("keydown", lauf.aufTaste);
    if (lauf.audio) {
      try { lauf.audio.close(); } catch (fehler) { /* schon geschlossen */ }
    }
  }

  function abbrechen() {
    if (!lauf) return;
    const kontext = lauf.kontext;
    aufraeumen();
    lauf = null;
    kontext.abbrechen();
  }

  function handWerte(hand) {
    const liste = lauf.sollListe[hand];
    const getroffen = liste.filter((s) => s.getroffen);
    return {
      trefferProzent: liste.length ? Math.round((getroffen.length / liste.length) * 100) : 0,
      abweichungMs: getroffen.length
        ? Math.round(Auswertung.mittelwert(getroffen.map((s) => Math.abs(s.abweichung)))) : 0,
      /* Vorzeichen gemittelt: schlage ich grundsätzlich zu früh oder zu spät? */
      versatzMs: getroffen.length
        ? Math.round(Auswertung.mittelwert(getroffen.map((s) => s.abweichung))) : 0
    };
  }

  function beenden() {
    const w = lauf.werte;
    const links = handWerte("links");
    const rechts = handWerte("rechts");

    const werte = {
      trefferProzent: Math.round((links.trefferProzent + rechts.trefferProzent) / 2),
      abweichungMs: Math.round((links.abweichungMs + rechts.abweichungMs) / 2),
      toleranzMs: w.toleranzMs,
      trefferLinksProzent: links.trefferProzent,
      trefferRechtsProzent: rechts.trefferProzent,
      abweichungLinksMs: links.abweichungMs,
      abweichungRechtsMs: rechts.abweichungMs,
      versatzLinksMs: links.versatzMs,
      versatzRechtsMs: rechts.versatzMs,
      /* Wie unterschiedlich gut halten die Hände ihren Takt? */
      handUnterschiedMs: Math.abs(links.abweichungMs - rechts.abweichungMs),
      zusatzschlaege: lauf.zusatz,
      verhaeltnis: w.links + ":" + w.rechts
    };

    const durchgang = {
      id: new Date().toISOString(),
      stufe: w.stufe,
      modus: w.modus,
      hand: { klopfen: "beide" },
      spiegel: false,
      dauerSek: Math.round(((VORLAUF_ZYKLEN + w.zyklen) * w.zyklusMs) / 1000),
      werte: werte,
      score: Auswertung.scoreRhythmus(werte)
    };

    const bild = vergleichsBild(links, rechts, w);
    const kontext = lauf.kontext;
    aufraeumen();
    lauf = null;

    kontext.fertig(durchgang, {
      galerie: [{ text: "Treffer und mittlere Abweichung je Hand", gemalt: bild }],
      galerieTitel: "Die beiden Hände im Vergleich",
      galerieText: "Links cyan, rechts orange. Ziel ist nicht nur ein kleiner Abstand " +
                   "zum Schlag, sondern dass beide Hände gleich gut liegen.",
      kacheln: [
        { titel: "Abweichung",      feld: "abweichungMs",      einheit: " ms", kleinerIstBesser: true },
        { titel: "Schläge sitzen",  feld: "trefferProzent",    einheit: " %" },
        { titel: "Hand-Unterschied", feld: "handUnterschiedMs", einheit: " ms", kleinerIstBesser: true },
        { titel: "Daneben",         feld: "zusatzschlaege",    einheit: "",    kleinerIstBesser: true }
      ]
    });
  }

  /* Balkenbild: Treffer und Abweichung je Hand nebeneinander. */
  function vergleichsBild(links, rechts, w) {
    const breite = 640;
    const hoehe = 250;
    const canvas = document.createElement("canvas");
    canvas.width = breite * 2;
    canvas.height = hoehe * 2;
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);

    const stil = getComputedStyle(document.documentElement);
    const farbeLinks = stil.getPropertyValue("--links").trim();
    const farbeRechts = stil.getPropertyValue("--rechts").trim();
    const farbeText = stil.getPropertyValue("--text-leise").trim();

    ctx.fillStyle = "#080b11";
    ctx.fillRect(0, 0, breite, hoehe);

    const gruppen = [
      { titel: "Schläge getroffen", einheit: " %", max: 100,
        werte: [links.trefferProzent, rechts.trefferProzent] },
      { titel: "Abweichung", einheit: " ms", max: Math.max(w.toleranzMs, links.abweichungMs, rechts.abweichungMs),
        werte: [links.abweichungMs, rechts.abweichungMs] }
    ];

    const unten = hoehe - 30;
    const oben = 46;
    const gruppenBreite = breite / 2;

    gruppen.forEach((gruppe, g) => {
      const mitte = g * gruppenBreite;

      ctx.fillStyle = farbeText;
      ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(gruppe.titel, mitte + gruppenBreite / 2, 24);

      gruppe.werte.forEach((wert, i) => {
        const x = mitte + 60 + i * 110;
        const h = Math.max(2, ((unten - oben) * wert) / (gruppe.max || 1));
        ctx.fillStyle = i === 0 ? farbeLinks : farbeRechts;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x, unten - h, 70, h);
        ctx.globalAlpha = 1;

        ctx.fillStyle = "#e7edf6";
        ctx.font = "600 13px system-ui, sans-serif";
        ctx.fillText(wert + gruppe.einheit, x + 35, unten - h - 8);

        ctx.fillStyle = farbeText;
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillText(i === 0 ? "links" : "rechts", x + 35, unten + 16);
      });
    });

    return canvas.toDataURL("image/png");
  }

  App.modulAnmelden(SCHLUESSEL, { starten: starten });

})();
