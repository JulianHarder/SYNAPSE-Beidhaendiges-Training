/* ==========================================================================
   network.js – das Fortschrittsnetz

   Jeder Durchgang setzt ein Neuron: auf der linken Seite (cyan), auf der
   rechten (orange) oder auf beiden – dann spannt sich eine goldene Brücke
   über die Mitte. Je besser der Score, desto heller und dicker. Was lange
   zurückliegt, verblasst; Impulse laufen über die Verbindungen.

   Wichtig und steht auch in der App: Das ist Motivation und Visualisierung,
   keine medizinische Messung. Niemand sieht hier Nervenzellen wachsen.

   Die Lage der Neuronen wird aus der Durchgangs-ID berechnet, nicht
   gewürfelt. So sieht das Netz bei jedem Öffnen gleich aus – sonst wäre es
   ein hübsches Bild statt eines gewachsenen.
   ========================================================================== */

const Netz = (function () {

  /* Ankerpunkte je Modul (Anteile der Fläche). Links und rechts gespiegelt,
     damit die Mitte frei bleibt für die Brücken. */
  const ANKER = {
    dualtask:    { y: 0.17, links: 0.30, rechts: 0.70 },
    sequence:    { y: 0.35, links: 0.28, rechts: 0.72 },
    mirrorwrite: { y: 0.50, links: 0.13, rechts: 0.87 },
    stroop:      { y: 0.60, links: 0.30, rechts: 0.70 },
    rhythm:      { y: 0.76, links: 0.27, rechts: 0.73 },
    mirrortrace: { y: 0.90, links: 0.33, rechts: 0.67 }
  };

  const MODULNAMEN = {
    dualtask: "Dual Task", mirrorwrite: "Spiegelschrift", mirrortrace: "Mirror Tracing",
    sequence: "Sequenz-Training", stroop: "Stroop-Test", rhythm: "Rhythmus"
  };

  /* Nach so vielen Tagen ist eine Verbindung am blassesten. */
  const VERBLASSEN_TAGE = 60;

  let canvas = null;
  let ctx = null;
  let breite = 0;
  let hoehe = 0;
  let neuronen = [];
  let kanten = [];
  let impulse = [];
  let bildId = 0;
  let laeuft = false;
  let farben = {};

  /* ====================== gleichbleibender Zufall ======================
     Aus der Durchgangs-ID wird eine Zahlenfolge berechnet. Gleiche ID,
     gleiche Lage – auch morgen noch. */

  function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function streuer(seed) {
    let zustand = seed || 1;
    return function () {
      zustand ^= zustand << 13; zustand >>>= 0;
      zustand ^= zustand >> 17;
      zustand ^= zustand << 5;  zustand >>>= 0;
      return zustand / 4294967296;
    };
  }

  /* ========================= Netz aus den Daten ========================= */

  /* Welche Seiten hat ein Durchgang gefordert? Gelesen wird das zentral in
     stats.js, damit Netz und Statistik dasselbe sagen. */
  function seiten(durchgang) {
    const haende = Auswertung.haendeVon(durchgang);
    if (!haende.links && !haende.rechts) return ["links"];
    const liste = [];
    if (haende.links) liste.push("links");
    if (haende.rechts) liste.push("rechts");
    return liste;
  }

  function tageHer(id) {
    const datum = new Date(id);
    if (isNaN(datum)) return 0;
    return Math.max(0, (Date.now() - datum.getTime()) / 86400000);
  }

  /* Eine Verbindung mit Wölbung. Der Kontrollpunkt liegt senkrecht zur
     Verbindungslinie – daraus entsteht der Bogen. Gerade Linien ergäben bei
     vielen Brücken ein Streifenmuster wie ein Zaun. */
  function kanteBauen(a, b, staerke, frische, gold, woelbung) {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const laenge = Math.hypot(dx, dy) || 1;

    return {
      a: a, b: b, staerke: staerke, frische: frische, gold: gold,
      cx: mx + (-dy / laenge) * laenge * woelbung,
      cy: my + (dx / laenge) * laenge * woelbung
    };
  }

  /* Punkt auf der gebogenen Kante (quadratische Bézierkurve). */
  function punktAufKante(kante, t) {
    const g = 1 - t;
    return {
      x: g * g * kante.a.x + 2 * g * t * kante.cx + t * t * kante.b.x,
      y: g * g * kante.a.y + 2 * g * t * kante.cy + t * t * kante.b.y
    };
  }

  function netzBauen() {
    neuronen = [];
    kanten = [];

    /* Älteste zuerst, damit neue Neuronen an bestehende andocken. */
    const durchgaenge = Speicher.durchgaenge().slice().reverse();

    for (const d of durchgaenge) {
      const anker = ANKER[d.modul];
      if (!anker) continue;

      const zufall = streuer(hash(String(d.id)));
      const alter = tageHer(d.id);
      const frische = Math.max(0.18, 1 - alter / VERBLASSEN_TAGE);
      const guete = Math.max(0, Math.min(1, (d.score || 0) / 100));
      const neueHier = [];

      for (const seite of seiten(d)) {
        const x = anker[seite] * breite + (zufall() - 0.5) * breite * 0.17;
        const y = anker.y * hoehe + (zufall() - 0.5) * hoehe * 0.13;

        const neuron = {
          x: Math.max(14, Math.min(breite - 14, x)),
          y: Math.max(14, Math.min(hoehe - 14, y)),
          r: 2 + guete * 3.2,
          seite: seite,
          modul: d.modul,
          score: d.score || 0,
          id: d.id,
          stufe: d.stufe,
          frische: frische,
          takt: zufall() * Math.PI * 2
        };
        neuronen.push(neuron);
        neueHier.push(neuron);

        /* Anschluss an die nächsten Nachbarn desselben Moduls und derselben
           Seite – so wächst ein Bereich, statt dass alles mit allem verbindet. */
        const nachbarn = neuronen
          .filter((n) => n !== neuron && n.modul === d.modul && n.seite === seite)
          .map((n) => ({ n: n, abstand: Math.hypot(n.x - neuron.x, n.y - neuron.y) }))
          .sort((a, b) => a.abstand - b.abstand)
          .slice(0, 2);

        for (const nachbar of nachbarn) {
          kanten.push(kanteBauen(neuron, nachbar.n, 0.6 + guete * 1.9, frische, false,
                                 (zufall() - 0.5) * 0.18));
        }
      }

      /* Hat der Durchgang beide Hände gefordert, entsteht die Brücke über
         die Mitte. Das ist das Bild, auf dem die ganze App aufbaut. */
      if (neueHier.length === 2) {
        kanten.push(kanteBauen(neueHier[0], neueHier[1], 0.9 + guete * 1.8, frische, true,
                               (zufall() - 0.5) * 0.5));
      }
    }

    impulse = [];
  }

  /* ============================== Zeichnen ============================== */

  function farbeVon(neuron) {
    return neuron.seite === "links" ? farben.links : farben.rechts;
  }

  function zeichnen(jetzt) {
    ctx.clearRect(0, 0, breite, hoehe);

    /* Mittellinie: die Trennung zwischen den Seiten */
    ctx.strokeStyle = farben.rand;
    ctx.globalAlpha = 0.5;
    ctx.setLineDash([4, 8]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(breite / 2, 10);
    ctx.lineTo(breite / 2, hoehe - 10);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    for (const kante of kanten) {
      ctx.strokeStyle = kante.gold ? farben.gold : farbeVon(kante.a);
      ctx.globalAlpha = (kante.gold ? 0.3 : 0.28) * kante.frische;
      ctx.lineWidth = kante.staerke;
      ctx.beginPath();
      ctx.moveTo(kante.a.x, kante.a.y);
      ctx.quadraticCurveTo(kante.cx, kante.cy, kante.b.x, kante.b.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    /* Impulse laufen als Lichtpunkte über die Verbindungen. */
    for (const impuls of impulse) {
      const kante = impuls.kante;
      const punkt = punktAufKante(kante, impuls.t);
      const farbe = kante.gold ? farben.gold : farbeVon(kante.a);

      const schein = ctx.createRadialGradient(punkt.x, punkt.y, 0, punkt.x, punkt.y, 9);
      schein.addColorStop(0, farbe);
      schein.addColorStop(1, "transparent");
      ctx.fillStyle = schein;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(punkt.x, punkt.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const neuron of neuronen) {
      const puls = 0.75 + 0.25 * Math.sin(jetzt / 900 + neuron.takt);
      const farbe = farbeVon(neuron);

      ctx.fillStyle = farbe;
      ctx.globalAlpha = 0.12 * neuron.frische;
      ctx.beginPath();
      ctx.arc(neuron.x, neuron.y, neuron.r * 3.4 * puls, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = (0.45 + 0.5 * neuron.frische) * puls;
      ctx.beginPath();
      ctx.arc(neuron.x, neuron.y, neuron.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function schritt() {
    /* neue Impulse nachlegen, aber nie zu viele gleichzeitig */
    if (kanten.length && impulse.length < 7 && Math.random() < 0.05) {
      const kante = kanten[Math.floor(Math.random() * kanten.length)];
      impulse.push({ kante: kante, t: 0, tempo: 0.006 + Math.random() * 0.01 });
    }
    for (let i = impulse.length - 1; i >= 0; i--) {
      impulse[i].t += impulse[i].tempo;
      if (impulse[i].t >= 1) impulse.splice(i, 1);
    }
  }

  function bild(jetzt) {
    if (!laeuft) return;
    schritt();
    zeichnen(jetzt);
    bildId = requestAnimationFrame(bild);
  }

  /* ================================ Hover ================================ */

  function neuronBei(x, y) {
    let bestes = null;
    let besterAbstand = 16;
    for (const neuron of neuronen) {
      const abstand = Math.hypot(neuron.x - x, neuron.y - y);
      if (abstand < besterAbstand) { besterAbstand = abstand; bestes = neuron; }
    }
    return bestes;
  }

  function hoverEinrichten(hinweis) {
    canvas.addEventListener("mousemove", (ereignis) => {
      const kasten = canvas.getBoundingClientRect();
      const neuron = neuronBei(ereignis.clientX - kasten.left, ereignis.clientY - kasten.top);

      if (!neuron) { hinweis.hidden = true; return; }

      hinweis.innerHTML =
        "<b>" + (MODULNAMEN[neuron.modul] || neuron.modul) + "</b>" +
        "<span>Stufe " + neuron.stufe + " · Score " + neuron.score + "</span>" +
        "<span>" + Auswertung.datumText(neuron.id) + "</span>";
      hinweis.hidden = false;
      /* Nicht unter dem Zeiger kleben lassen, sonst flackert es. */
      hinweis.style.left = Math.min(neuron.x + 16, canvas.clientWidth - 190) + "px";
      hinweis.style.top = Math.max(8, neuron.y - 50) + "px";
    });

    canvas.addEventListener("mouseleave", () => { hinweis.hidden = true; });
  }

  /* ================================ Aufbau ================================ */

  function zeichnenAnsicht() {
    const flaeche = document.getElementById("ansicht-netz");
    const alle = Speicher.durchgaenge();

    if (!alle.length) {
      flaeche.innerHTML =
        '<h1 class="titel">Fortschrittsnetz</h1>' +
        '<p class="untertitel">Noch leer. Jeder Durchgang setzt hier ein Neuron – ' +
        "nach der ersten Übung wächst das Netz los.</p>";
      stoppen();
      return;
    }

    flaeche.innerHTML =
      '<h1 class="titel">Fortschrittsnetz</h1>' +
      '<p class="untertitel">Jeder Durchgang setzt ein Neuron. Übungen mit beiden ' +
        "Händen spannen goldene Brücken über die Mitte.</p>" +

      '<div class="netz-rahmen">' +
        '<canvas id="netz-canvas"></canvas>' +
        '<div class="netz-hinweis" id="netz-hinweis" hidden></div>' +
        '<span class="netz-seite netz-seite-links">linke Hand</span>' +
        '<span class="netz-seite netz-seite-rechts">rechte Hand</span>' +
      "</div>" +

      '<div class="streifen netz-zahlen">' +
        '<div class="kennzahl"><span class="kennzahl-wert" id="netz-neuronen">0</span>' +
          '<span class="kennzahl-text">Neuronen</span></div>' +
        '<div class="kennzahl"><span class="kennzahl-wert" id="netz-kanten">0</span>' +
          '<span class="kennzahl-text">Verbindungen</span></div>' +
        '<div class="kennzahl"><span class="kennzahl-wert" id="netz-bruecken">0</span>' +
          '<span class="kennzahl-text">Brücken über die Mitte</span></div>' +
        '<div class="kennzahl"><span class="kennzahl-wert" id="netz-frisch">0</span>' +
          '<span class="kennzahl-text">davon aus dieser Woche</span></div>' +
      "</div>" +

      '<details class="hinweis">' +
        "<summary>Was das Bild bedeutet – und was nicht</summary>" +
        "<p>Cyan ist die linke Hand, orange die rechte, gold sind Übungen, die " +
        "beide Hände zugleich fordern. Je besser ein Durchgang war, desto " +
        "größer das Neuron und desto kräftiger seine Verbindungen. Was lange " +
        "zurückliegt, verblasst – dranbleiben lohnt sich also sichtbar.</p>" +
        "<p>Das ist <b>Motivation und Visualisierung, keine medizinische " +
        "Messung</b>. Hier wachsen keine Nervenzellen, hier wächst ein Bild " +
        "deiner Übungstage.</p>" +
      "</details>";

    canvas = flaeche.querySelector("#netz-canvas");
    const kasten = canvas.getBoundingClientRect();
    const dichte = Math.min(window.devicePixelRatio || 1, 2);
    breite = kasten.width;
    hoehe = kasten.height;
    canvas.width = Math.round(breite * dichte);
    canvas.height = Math.round(hoehe * dichte);
    ctx = canvas.getContext("2d");
    ctx.setTransform(dichte, 0, 0, dichte, 0, 0);

    const stil = getComputedStyle(document.documentElement);
    farben = {
      links: stil.getPropertyValue("--links").trim(),
      rechts: stil.getPropertyValue("--rechts").trim(),
      gold: stil.getPropertyValue("--gold").trim(),
      rand: stil.getPropertyValue("--rand-hell").trim()
    };

    netzBauen();

    const bruecken = kanten.filter((k) => k.gold).length;
    const frisch = neuronen.filter((n) => tageHer(n.id) <= 7).length;
    setzen("netz-neuronen", neuronen.length);
    setzen("netz-kanten", kanten.length);
    setzen("netz-bruecken", bruecken);
    setzen("netz-frisch", frisch);

    hoverEinrichten(flaeche.querySelector("#netz-hinweis"));
    starten();
  }

  function setzen(id, wert) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(wert);
  }

  function starten() {
    if (laeuft) return;
    laeuft = true;
    /* Wer Bewegung abgeschaltet hat, bekommt ein stehendes Bild. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      zeichnen(performance.now());
      laeuft = false;
      return;
    }
    bildId = requestAnimationFrame(bild);
  }

  function stoppen() {
    laeuft = false;
    cancelAnimationFrame(bildId);
  }

  /* Bei Größenänderung neu aufbauen – die Lage hängt an der Fläche. */
  let warteId = 0;
  window.addEventListener("resize", () => {
    const ansicht = document.getElementById("ansicht-netz");
    if (!ansicht || ansicht.hidden) return;
    clearTimeout(warteId);
    warteId = setTimeout(zeichnenAnsicht, 200);
  });

  return { zeichnen: zeichnenAnsicht, stoppen: stoppen };

})();
