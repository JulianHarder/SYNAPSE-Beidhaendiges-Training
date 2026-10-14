/* ==========================================================================
   diagramme.js – selbstgezeichnete Diagramme auf Canvas

   Keine fremde Bibliothek: Die App soll ohne Build-Schritt und ohne Internet
   laufen. Drei Arten reichen für alles, was der Plan vorsieht:
     linie()    Verlauf über die Zeit
     balken()   Vergleich weniger Werte (etwa linke gegen rechte Hand)
     heatmap()  Kalender – welche Tage wurde geübt

   Alle Farben kommen aus den CSS-Variablen, damit es nur eine Quelle gibt.
   ========================================================================== */

const Diagramme = (function () {

  function farbe(name, standard) {
    const wert = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (wert || standard).trim();
  }

  /* Canvas scharf stellen und Zeichenfläche in CSS-Pixeln zurückgeben. */
  function vorbereiten(canvas, hoehe) {
    const breite = canvas.clientWidth;
    if (!breite) return null;

    const dichte = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.height = hoehe + "px";
    canvas.width = Math.round(breite * dichte);
    canvas.height = Math.round(hoehe * dichte);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dichte, 0, 0, dichte, 0, 0);
    ctx.clearRect(0, 0, breite, hoehe);
    return { ctx: ctx, breite: breite, hoehe: hoehe };
  }

  function leerHinweis(ctx, breite, hoehe, text) {
    ctx.fillStyle = farbe("--text-still", "#5f6b7d");
    ctx.font = "13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, breite / 2, hoehe / 2);
  }

  /* ------------------------------- Linie -------------------------------
     daten: { reihen: [{ name, farbe, punkte: [{ wert, markierung }] }],
              yMin, yMax, einheit, beschriftungen: [Text je x-Stelle] }
  --------------------------------------------------------------------- */
  function linie(canvas, daten) {
    const feld = vorbereiten(canvas, daten.hoehe || 220);
    if (!feld) return;
    const ctx = feld.ctx;

    const reihen = (daten.reihen || []).filter((r) => r.punkte.length);
    if (!reihen.length) { leerHinweis(ctx, feld.breite, feld.hoehe, daten.leerText || "Noch keine Daten"); return; }

    const links = 46;
    const unten = feld.hoehe - 26;
    const oben = 14;
    const rechts = feld.breite - 12;

    /* Wertebereich bestimmen */
    let min = daten.yMin;
    let max = daten.yMax;
    if (min === undefined || max === undefined) {
      const alle = reihen.reduce((liste, r) => liste.concat(r.punkte.map((p) => p.wert)), []);
      const eigenesMin = min === undefined;
      const eigenesMax = max === undefined;
      if (eigenesMin) min = Math.min.apply(null, alle);
      if (eigenesMax) max = Math.max.apply(null, alle);
      /* Luft nur dort, wo die Grenze berechnet wurde – eine vorgegebene
         Null soll null bleiben und nicht ins Minus rutschen. */
      const luft = Math.max((max - min) * 0.15, 1);
      if (eigenesMin) min -= luft;
      if (eigenesMax) max += luft;
    }

    const anzahl = Math.max.apply(null, reihen.map((r) => r.punkte.length));
    const xFuer = (i) => anzahl > 1 ? links + (i / (anzahl - 1)) * (rechts - links) : (links + rechts) / 2;
    const yFuer = (wert) => unten - ((wert - min) / (max - min)) * (unten - oben);

    /* Gitter und Beschriftung der y-Achse */
    ctx.strokeStyle = farbe("--rand", "#222b38");
    ctx.fillStyle = farbe("--text-still", "#5f6b7d");
    ctx.font = "11px system-ui, sans-serif";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const wert = min + ((max - min) / 4) * i;
      const y = yFuer(wert);
      ctx.beginPath();
      ctx.moveTo(links, y);
      ctx.lineTo(rechts, y);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText(Math.round(wert) + (daten.einheit || ""), links - 6, y + 4);
    }

    /* Nulllinie hervorheben, wenn sie im Bild liegt */
    if (min < 0 && max > 0) {
      ctx.strokeStyle = farbe("--rand-hell", "#303b4c");
      ctx.beginPath();
      ctx.moveTo(links, yFuer(0));
      ctx.lineTo(rechts, yFuer(0));
      ctx.stroke();
    }

    for (const reihe of reihen) {
      ctx.strokeStyle = reihe.farbe;
      ctx.fillStyle = reihe.farbe;
      ctx.lineWidth = reihe.duenn ? 1.5 : 2.5;
      ctx.globalAlpha = reihe.duenn ? 0.55 : 1;

      ctx.beginPath();
      reihe.punkte.forEach((p, i) => {
        const x = xFuer(i);
        const y = yFuer(p.wert);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();

      /* Punkte nur zeigen, wenn es nicht zu eng wird */
      if (!reihe.duenn && reihe.punkte.length <= 40) {
        reihe.punkte.forEach((p, i) => {
          ctx.beginPath();
          ctx.arc(xFuer(i), yFuer(p.wert), 3, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.globalAlpha = 1;
    }

    /* Legende oben rechts – bei mehreren Reihen sonst nicht zu erkennen,
       welche Linie wofür steht. */
    if (daten.legende) {
      const eintraege = reihen.filter((r) => r.name);
      ctx.font = "11px system-ui, sans-serif";
      const textBreite = Math.max.apply(null, eintraege.map((r) => ctx.measureText(r.name).width));
      const kastenBreite = textBreite + 30;
      const kastenHoehe = eintraege.length * 15 + 10;
      const kastenX = rechts - kastenBreite;

      /* Kasten dahinter, sonst liest sich die Legende auf den Linien nicht. */
      ctx.fillStyle = farbe("--flaeche", "#10151d");
      ctx.globalAlpha = 0.9;
      ctx.fillRect(kastenX, oben - 2, kastenBreite, kastenHoehe);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = farbe("--rand", "#222b38");
      ctx.lineWidth = 1;
      ctx.strokeRect(kastenX, oben - 2, kastenBreite, kastenHoehe);

      let y = oben + 12;
      ctx.textAlign = "left";
      for (const reihe of eintraege) {
        ctx.fillStyle = reihe.farbe;
        ctx.fillRect(kastenX + 8, y - 7, 10, 3);
        ctx.fillText(reihe.name, kastenX + 24, y);
        y += 15;
      }
    }

    /* x-Beschriftung: erster und letzter Eintrag */
    if (daten.beschriftungen && daten.beschriftungen.length) {
      ctx.fillStyle = farbe("--text-still", "#5f6b7d");
      ctx.textAlign = "left";
      ctx.fillText(daten.beschriftungen[0], links, feld.hoehe - 8);
      ctx.textAlign = "right";
      ctx.fillText(daten.beschriftungen[daten.beschriftungen.length - 1], rechts, feld.hoehe - 8);
    }
  }

  /* Beschriftung auf zwei Zeilen umbrechen, wenn sie zu breit ist – damit
     unter den Balken die vollen Namen stehen können ("Sequenz-Training"
     statt "Sequenz") und sich trotzdem nichts überlappt. */
  function labelZeilen(ctx, text, maxBreite) {
    if (ctx.measureText(text).width <= maxBreite) return [text];

    /* nach Leerzeichen trennen, Bindestriche bleiben am Wortende hängen */
    const woerter = text.replace(/-/g, "-\n").split(/\s|\n/).filter(Boolean);
    const zeilen = [];
    let aktuell = "";

    for (const wort of woerter) {
      const versuch = aktuell ? (aktuell.endsWith("-") ? aktuell + wort : aktuell + " " + wort) : wort;
      if (aktuell && ctx.measureText(versuch).width > maxBreite) {
        zeilen.push(aktuell);
        aktuell = wort;
      } else {
        aktuell = versuch;
      }
    }
    if (aktuell) zeilen.push(aktuell);
    return zeilen.slice(0, 2);
  }

  /* ------------------------------- Balken -------------------------------
     daten: { balken: [{ name, wert, farbe }], einheit, max }
  --------------------------------------------------------------------- */
  function balken(canvas, daten) {
    const feld = vorbereiten(canvas, daten.hoehe || 200);
    if (!feld) return;
    const ctx = feld.ctx;

    const werte = daten.balken || [];
    if (!werte.length) { leerHinweis(ctx, feld.breite, feld.hoehe, daten.leerText || "Noch keine Daten"); return; }

    const oben = 22;
    const links = 46;
    const rechts = feld.breite - 12;
    const hoechst = daten.max || Math.max.apply(null, werte.map((b) => b.wert)) * 1.2 || 1;

    /* Erst die Beschriftungen umbrechen – daraus ergibt sich, wie viel Platz
       unten gebraucht wird. */
    const platzPro = (rechts - links) / werte.length;
    ctx.font = "11px system-ui, sans-serif";
    const beschriftungen = werte.map((b) => labelZeilen(ctx, b.name, platzPro - 8));
    const maxZeilen = Math.max.apply(null, beschriftungen.map((z) => z.length));
    const unten = feld.hoehe - 12 - maxZeilen * 14;

    ctx.strokeStyle = farbe("--rand", "#222b38");
    ctx.fillStyle = farbe("--text-still", "#5f6b7d");
    ctx.font = "11px system-ui, sans-serif";
    for (let i = 0; i <= 3; i++) {
      const wert = (hoechst / 3) * i;
      const y = unten - ((unten - oben) / 3) * i;
      ctx.beginPath();
      ctx.moveTo(links, y);
      ctx.lineTo(rechts, y);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText(Math.round(wert) + (daten.einheit || ""), links - 6, y + 4);
    }

    /* Balken nicht beliebig breit werden lassen – auf einem großen Bildschirm
       sähen sechs Balken sonst aus wie Klötze. Stattdessen gleichmäßig
       verteilen und die Gruppe mittig setzen. */
    const balkenBreite = Math.min(platzPro * 0.55, 90);
    const gesamtBreite = platzPro * werte.length;
    const anfang = links + (rechts - links - gesamtBreite) / 2;

    werte.forEach((b, i) => {
      const x = anfang + i * platzPro + (platzPro - balkenBreite) / 2;
      const breite = balkenBreite;
      const hoehe = ((unten - oben) * b.wert) / hoechst;

      /* Ein Balken kann zwei Farben tragen: links die eine Hand, rechts die
         andere. So ist auf einen Blick zu sehen, dass beide beteiligt sind –
         und welche. Eine Farbe allein füllt den ganzen Balken. */
      const farben = b.farben && b.farben.length ? b.farben : [b.farbe];
      const teilBreite = breite / farben.length;
      ctx.globalAlpha = 0.85;
      farben.forEach((f, t) => {
        ctx.fillStyle = f;
        ctx.fillRect(x + t * teilBreite, unten - hoehe, teilBreite, hoehe);
      });
      ctx.globalAlpha = 1;

      /* feine Trennlinie zwischen den Hälften */
      if (farben.length > 1) {
        ctx.strokeStyle = "#080b11";
        ctx.lineWidth = 1.5;
        for (let t = 1; t < farben.length; t++) {
          ctx.beginPath();
          ctx.moveTo(x + t * teilBreite, unten - hoehe);
          ctx.lineTo(x + t * teilBreite, unten);
          ctx.stroke();
        }
      }

      ctx.fillStyle = farbe("--text", "#e7edf6");
      ctx.textAlign = "center";
      ctx.font = "600 12px system-ui, sans-serif";
      /* Bei kleinen Skalen (etwa dem Niveau 1 bis 11) wäre Runden zu grob. */
      const text = hoechst <= 20 ? b.wert.toFixed(2).replace(".", ",") : String(Math.round(b.wert));
      ctx.fillText(text + (daten.einheit || ""), x + breite / 2, unten - hoehe - 7);

      ctx.fillStyle = farbe("--text-still", "#5f6b7d");
      ctx.font = "11px system-ui, sans-serif";
      beschriftungen[i].forEach((zeile, z) => {
        ctx.fillText(zeile, x + breite / 2, unten + 16 + z * 14);
      });
    });
  }

  /* ------------------------------ Heatmap ------------------------------
     daten: { tage: { "2026-10-14": anzahl, ... }, wochen: 18 }
     Aufbau wie ein Kalender: eine Spalte je Woche, sieben Zeilen (Mo–So).
  --------------------------------------------------------------------- */
  function heatmap(canvas, daten) {
    const wochen = daten.wochen || 18;
    const zelle = 13;
    const abstand = 3;
    const feld = vorbereiten(canvas, 7 * (zelle + abstand) + 22);
    if (!feld) return;
    const ctx = feld.ctx;

    const heute = new Date();
    /* Beim letzten Montag beginnen, damit die Spalten saubere Wochen sind. */
    const start = new Date(heute);
    const wochentag = (heute.getDay() + 6) % 7;      /* Montag = 0 */
    start.setDate(start.getDate() - wochentag - (wochen - 1) * 7);

    const leer = farbe("--flaeche-2", "#161c26");
    const voll = farbe("--links", "#22d3ee");
    let letzterMonat = -1;

    for (let w = 0; w < wochen; w++) {
      for (let t = 0; t < 7; t++) {
        const tag = new Date(start);
        tag.setDate(start.getDate() + w * 7 + t);
        if (tag > heute) continue;

        const schluessel = Auswertung.tagesText(tag);
        const anzahl = daten.tage[schluessel] || 0;
        const x = w * (zelle + abstand) + 1;
        const y = 18 + t * (zelle + abstand);

        if (anzahl === 0) {
          ctx.fillStyle = leer;
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = voll;
          /* drei Stufen: ein Durchgang, zwei, drei und mehr */
          ctx.globalAlpha = anzahl === 1 ? 0.35 : anzahl === 2 ? 0.62 : 0.9;
        }
        ctx.fillRect(x, y, zelle, zelle);
        ctx.globalAlpha = 1;

        /* Monatsnamen über der ersten Spalte des Monats */
        if (t === 0 && tag.getMonth() !== letzterMonat) {
          letzterMonat = tag.getMonth();
          ctx.fillStyle = farbe("--text-still", "#5f6b7d");
          ctx.font = "10px system-ui, sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(tag.toLocaleDateString("de-DE", { month: "short" }), x, 11);
        }
      }
    }
  }

  return { linie: linie, balken: balken, heatmap: heatmap, farbe: farbe };

})();
