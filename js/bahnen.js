/* ==========================================================================
   bahnen.js – Formen und ihre Berechnung

   Beide Spur-Übungen (Dual Task und Mirror Tracing) brauchen dasselbe:
   eine Form in gleichmäßig verteilten Punkten. Gleichmäßig ist wichtig –
   sonst wäre eine Spirale innen schneller als außen, und die Strecke ließe
   sich nicht ehrlich messen.

   Bahnen.bauen(form, breite, hoehe) liefert:
     punkte   Liste von { x, y } in Bildpunkten
     abstand  Abstand zwischen zwei Punkten (in Bildpunkten)
     laenge   Gesamtlänge der Bahn
   ========================================================================== */

const Bahnen = (function () {

  const RAND = 26;
  const ANZAHL = 500;

  /* ----------------------------- die Formen -----------------------------
     Jede Form gibt zu t (0 bis 1) einen Punkt in Anteilen der Fläche
     (0 bis 1) zurück. */

  function welle(t) {
    return { x: 0.06 + t * 0.88, y: 0.5 + Math.sin(t * Math.PI * 5) * 0.33 };
  }

  function spirale(t) {
    const winkel = t * Math.PI * 6;
    const radius = 0.08 + t * 0.38;
    return { x: 0.5 + Math.cos(winkel) * radius, y: 0.5 + Math.sin(winkel) * radius * 1.35 };
  }

  function labyrinth(t) {
    const ecken = [];
    const spalten = 5;
    for (let i = 0; i < spalten; i++) {
      const x = 0.08 + (i / (spalten - 1)) * 0.84;
      ecken.push({ x: x, y: i % 2 === 0 ? 0.18 : 0.82 });
      ecken.push({ x: x, y: i % 2 === 0 ? 0.82 : 0.18 });
    }
    return aufPolylinie(ecken, t);
  }

  /* Spitze Zacken – die klassische Zickzack-Vorlage. */
  function zickzack(t) {
    const ecken = [];
    const zacken = 7;
    for (let i = 0; i <= zacken; i++) {
      ecken.push({ x: 0.06 + (i / zacken) * 0.88, y: i % 2 === 0 ? 0.82 : 0.18 });
    }
    return aufPolylinie(ecken, t);
  }

  /* Fünfzackiger Stern, einmal herum und zurück zum Anfang. */
  function stern(t) {
    const ecken = [];
    const zacken = 5;
    for (let i = 0; i <= zacken * 2; i++) {
      const winkel = (i / (zacken * 2)) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? 0.42 : 0.17;
      ecken.push({ x: 0.5 + Math.cos(winkel) * radius, y: 0.5 + Math.sin(winkel) * radius * 1.25 });
    }
    return aufPolylinie(ecken, t);
  }

  const formen = {
    welle: welle,
    spirale: spirale,
    labyrinth: labyrinth,
    zickzack: zickzack,
    stern: stern
  };

  /* Punkt bei Anteil t auf einem Linienzug, gleichmäßig über die Länge. */
  function aufPolylinie(ecken, t) {
    let gesamt = 0;
    for (let i = 1; i < ecken.length; i++) {
      gesamt += Math.hypot(ecken[i].x - ecken[i - 1].x, ecken[i].y - ecken[i - 1].y);
    }
    let ziel = t * gesamt;
    for (let i = 1; i < ecken.length; i++) {
      const laenge = Math.hypot(ecken[i].x - ecken[i - 1].x, ecken[i].y - ecken[i - 1].y);
      if (ziel <= laenge || i === ecken.length - 1) {
        const anteil = laenge > 0 ? ziel / laenge : 0;
        return {
          x: ecken[i - 1].x + (ecken[i].x - ecken[i - 1].x) * anteil,
          y: ecken[i - 1].y + (ecken[i].y - ecken[i - 1].y) * anteil
        };
      }
      ziel -= laenge;
    }
    return ecken[ecken.length - 1];
  }

  /* ------------------------------- bauen ------------------------------- */

  function bauen(form, breite, hoehe) {
    const formFunktion = formen[form] || welle;
    const nutzbarB = breite - RAND * 2;
    const nutzbarH = hoehe - RAND * 2;

    /* Erst fein abtasten ... */
    const fein = [];
    for (let i = 0; i <= 1200; i++) {
      const p = formFunktion(i / 1200);
      fein.push({ x: RAND + p.x * nutzbarB, y: RAND + p.y * nutzbarH });
    }

    /* ... dann auf gleiche Abstände umrechnen. */
    let laenge = 0;
    for (let i = 1; i < fein.length; i++) {
      laenge += Math.hypot(fein[i].x - fein[i - 1].x, fein[i].y - fein[i - 1].y);
    }

    const abstand = laenge / (ANZAHL - 1);
    const punkte = [fein[0]];
    let rest = abstand;

    for (let i = 1; i < fein.length; i++) {
      let teil = Math.hypot(fein[i].x - fein[i - 1].x, fein[i].y - fein[i - 1].y);
      let von = fein[i - 1];
      while (teil >= rest && punkte.length < ANZAHL) {
        const anteil = rest / teil;
        const neu = { x: von.x + (fein[i].x - von.x) * anteil, y: von.y + (fein[i].y - von.y) * anteil };
        punkte.push(neu);
        von = neu;
        teil -= rest;
        rest = abstand;
      }
      rest -= teil;
    }
    while (punkte.length < ANZAHL) punkte.push(fein[fein.length - 1]);

    return { punkte: punkte, abstand: abstand, laenge: laenge };
  }

  /* Linienzug zeichnen – brauchen beide Module. */
  function zeichnen(ctx, punkte) {
    if (!punkte || !punkte.length) return;
    ctx.beginPath();
    ctx.moveTo(punkte[0].x, punkte[0].y);
    for (let i = 1; i < punkte.length; i++) ctx.lineTo(punkte[i].x, punkte[i].y);
    ctx.stroke();
  }

  return { bauen: bauen, zeichnen: zeichnen, formen: formen };

})();
