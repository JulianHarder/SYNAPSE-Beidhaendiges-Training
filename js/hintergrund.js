/* ==========================================================================
   hintergrund.js – sanft pulsierende Neuronen im Hintergrund

   Rein dekorativ (Plan, Abschnitt 3). Bewusst sparsam: wenige Punkte, kurze
   Linien, langsame Bewegung. Während einer Übung wird die Animation
   angehalten (Hintergrund.ruhe), damit nichts ablenkt.

   Links im Bild Cyan, rechts Orange – dasselbe Farbschema wie die Hände.
   ========================================================================== */

const Hintergrund = (function () {

  let canvas = null;
  let ctx = null;
  let neuronen = [];
  let breite = 0;
  let hoehe = 0;
  let laeuft = false;
  let bildNummer = 0;

  let farbeLinks = "#22d3ee";
  let farbeRechts = "#fb923c";

  const ANZAHL = 34;        /* Punkte insgesamt */
  const NAEHE = 165;        /* ab dieser Entfernung wird eine Linie gezogen */

  function farbenLesen() {
    const stil = getComputedStyle(document.documentElement);
    farbeLinks = (stil.getPropertyValue("--links") || farbeLinks).trim();
    farbeRechts = (stil.getPropertyValue("--rechts") || farbeRechts).trim();
  }

  /* Canvas an Fenstergröße und Bildschirmschärfe anpassen. */
  function groesseSetzen() {
    const dichte = Math.min(window.devicePixelRatio || 1, 2);
    breite = window.innerWidth;
    hoehe = window.innerHeight;
    canvas.width = Math.round(breite * dichte);
    canvas.height = Math.round(hoehe * dichte);
    ctx.setTransform(dichte, 0, 0, dichte, 0, 0);
  }

  function neuronenSetzen() {
    neuronen = [];
    for (let i = 0; i < ANZAHL; i++) {
      neuronen.push({
        x: Math.random() * breite,
        y: Math.random() * hoehe,
        /* sehr langsames Treiben */
        dx: (Math.random() - 0.5) * 0.14,
        dy: (Math.random() - 0.5) * 0.14,
        r: 1.1 + Math.random() * 1.9,
        /* eigener Takt, damit nicht alles gleichzeitig pulst */
        takt: Math.random() * Math.PI * 2,
        tempo: 0.006 + Math.random() * 0.01
      });
    }
  }

  /* Farbe nach Seite: linke Bildhälfte Cyan, rechte Orange. */
  function seitenfarbe(x) {
    return x < breite / 2 ? farbeLinks : farbeRechts;
  }

  function zeichnen() {
    ctx.clearRect(0, 0, breite, hoehe);

    /* Verbindungen zuerst, damit die Punkte darüber liegen. */
    for (let i = 0; i < neuronen.length; i++) {
      for (let j = i + 1; j < neuronen.length; j++) {
        const a = neuronen[i];
        const b = neuronen[j];
        const abstand = Math.hypot(a.x - b.x, a.y - b.y);
        if (abstand > NAEHE) continue;

        const staerke = 1 - abstand / NAEHE;
        /* Linien über die Mitte hinweg sind golden – die beiden Seiten
           berühren sich. Das ist das Bild, auf dem die ganze App aufbaut. */
        const ueberMitte = (a.x < breite / 2) !== (b.x < breite / 2);
        ctx.strokeStyle = ueberMitte ? "#f5c451" : seitenfarbe(a.x);
        ctx.globalAlpha = staerke * (ueberMitte ? 0.1 : 0.07);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    for (const n of neuronen) {
      const puls = 0.55 + 0.45 * Math.sin(n.takt);
      ctx.globalAlpha = 0.16 + puls * 0.22;
      ctx.fillStyle = seitenfarbe(n.x);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * (0.85 + puls * 0.3), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  function schritt() {
    for (const n of neuronen) {
      n.x += n.dx;
      n.y += n.dy;
      n.takt += n.tempo;
      /* am Rand umkehren statt springen */
      if (n.x < 0 || n.x > breite) n.dx *= -1;
      if (n.y < 0 || n.y > hoehe) n.dy *= -1;
    }
  }

  function bild() {
    if (!laeuft) return;
    bildNummer++;
    schritt();
    /* Nur jedes zweite Bild neu zeichnen: ~30 Bilder/s reichen hier völlig
       und das schont den Akku. */
    if (bildNummer % 2 === 0) zeichnen();
    requestAnimationFrame(bild);
  }

  function start() {
    if (laeuft) return;
    laeuft = true;
    requestAnimationFrame(bild);
  }

  function ruhe() {
    laeuft = false;
  }

  function init() {
    canvas = document.getElementById("hintergrund-canvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");

    farbenLesen();
    groesseSetzen();
    neuronenSetzen();
    zeichnen();

    window.addEventListener("resize", () => {
      groesseSetzen();
      neuronenSetzen();
      zeichnen();
    });

    /* Wer Bewegung im System abgeschaltet hat, bekommt ein stehendes Bild. */
    const wenigBewegung = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!wenigBewegung.matches) start();

    /* Im Hintergrundtab nicht weiterrechnen. */
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) ruhe();
      else if (!wenigBewegung.matches) start();
    });
  }

  return { init: init, start: start, ruhe: ruhe };

})();
