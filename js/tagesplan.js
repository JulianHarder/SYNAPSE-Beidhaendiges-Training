/* ==========================================================================
   tagesplan.js – was heute dran ist

   Drei bis vier Übungen, zusammen etwa 10 bis 15 Minuten (Plan, Abschnitt 8).
   Der Plan wird aus dem Datum berechnet, nicht gewürfelt: Beim Neuladen steht
   dasselbe da, und morgen etwas anderes. Sonst könnte man sich den Plan so
   lange neu laden, bis die liebste Übung kommt.

   Erledigt ist ein Punkt, sobald es heute einen Durchgang dieses Moduls gibt.

   Dazu die Hinweise aus dem Plan: Pausen und Schlaf festigen das Gelernte,
   und bei Überlastung lieber aufhören.
   ========================================================================== */

const Tagesplan = (function () {

  const MODULNAMEN = {
    dualtask: "Dual Task", mirrorwrite: "Spiegelschrift", mirrortrace: "Mirror Tracing",
    sequence: "Sequenz-Training", stroop: "Stroop-Test", rhythm: "Rhythmus"
  };

  /* Die Bausteine eines Tages. Je Rolle gibt es mehrere Module, zwischen
     denen von Tag zu Tag gewechselt wird – das hält die Abwechslung drin,
     ohne dass der Aufbau jeden Tag anders ist. */
  const ROLLEN = [
    { titel: "Aufwärmen",   module: ["sequence", "stroop"],          minuten: 2 },
    { titel: "Hauptübung",  module: ["dualtask"],                    minuten: 5 },
    { titel: "Feinmotorik", module: ["mirrorwrite", "mirrortrace"],  minuten: 3 },
    { titel: "Abschluss",   module: ["stroop", "rhythm", "sequence"], minuten: 2 }
  ];

  /* Tage seit einem festen Anfang – daraus entsteht die Rotation. */
  function tagesNummer(datum) {
    const tag = new Date(datum.getFullYear(), datum.getMonth(), datum.getDate());
    return Math.floor(tag.getTime() / 86400000);
  }

  function erzeugen(datum) {
    const nummer = tagesNummer(datum || new Date());
    const plan = [];

    /* Jeder vierte Tag ist kürzer – auch das Üben braucht Abstufung.
       Bewusst nicht jeder dritte: Der Abschluss rotiert über drei Module,
       und bei gleichem Takt fiele immer dasselbe davon aus. */
    const kurzerTag = nummer % 4 === 3;

    ROLLEN.forEach((rolle, i) => {
      if (kurzerTag && rolle.titel === "Abschluss") return;

      let modul = rolle.module[(nummer + i) % rolle.module.length];
      /* Dieselbe Übung nicht zweimal am Tag – dann die nächste nehmen. */
      if (plan.some((p) => p.modul === modul)) {
        const frei = rolle.module.filter((m) => !plan.some((p) => p.modul === m));
        if (frei.length) modul = frei[(nummer + i) % frei.length];
        else return;
      }
      plan.push({ rolle: rolle.titel, modul: modul, minuten: rolle.minuten });
    });

    return plan;
  }

  /* ---------------------------- Überlastung ----------------------------
     Der Plan nennt zwei Zeichen: zu viel an einem Tag und absackende Werte.
     Beides wird hier geprüft – der dritte Punkt (Schmerzen) steht als fester
     Hinweis da, den kann nur er selbst bemerken. */
  function warnung() {
    const alle = Speicher.durchgaenge();
    const heute = Auswertung.tagesText(new Date());
    const heutige = alle.filter((d) => {
      const datum = new Date(d.id);
      return !isNaN(datum) && Auswertung.tagesText(datum) === heute;
    });

    if (heutige.length >= 7) {
      return "Das war heute schon viel. Kurze tägliche Einheiten bringen mehr " +
             "als lange seltene – für heute reicht es.";
    }

    /* Werte, die über mehrere Durchgänge abfallen, sind ein Müdigkeitszeichen. */
    if (heutige.length >= 3) {
      const letzte = heutige.slice(0, 2).map((d) => d.score || 0);
      const davor = heutige.slice(2).map((d) => d.score || 0);
      const abfall = Auswertung.mittelwert(davor) - Auswertung.mittelwert(letzte);
      if (abfall >= 12) {
        return "Deine Werte fallen gerade ab. Das ist Müdigkeit, nicht " +
               "fehlendes Können – mach eine Pause.";
      }
    }
    return null;
  }

  /* ------------------------------ Anzeige ------------------------------ */

  function heuteGemacht(modul) {
    const letzter = Speicher.letzterDurchgang(modul);
    if (!letzter) return false;
    const datum = new Date(letzter.id);
    return !isNaN(datum) && Auswertung.tagesText(datum) === Auswertung.tagesText(new Date());
  }

  function zeichnen() {
    const behaelter = document.getElementById("tagesplan");
    if (!behaelter) return;

    const plan = erzeugen(new Date());
    const erledigt = plan.filter((p) => heuteGemacht(p.modul));
    const offen = plan.filter((p) => !heuteGemacht(p.modul));
    const minuten = plan.reduce((summe, p) => summe + p.minuten, 0);
    const fertig = offen.length === 0;
    const hinweis = warnung();

    behaelter.innerHTML =
      '<div class="plan-kopf">' +
        "<div>" +
          '<h2 class="plan-titel">Heute</h2>' +
          '<p class="plan-unter">' +
            (fertig
              ? "Alles geschafft. Alles Weitere ist freiwillig."
              : plan.length + " Übungen · etwa " + minuten + " Minuten · " +
                erledigt.length + " von " + plan.length + " erledigt") +
          "</p>" +
        "</div>" +
        (fertig ? '<span class="marker marker-beide">fertig für heute</span>' : "") +
      "</div>" +

      '<ol class="plan-liste">' +
        plan.map((punkt) => {
          const schon = heuteGemacht(punkt.modul);
          return '<li class="plan-punkt' + (schon ? " plan-fertig" : "") + '">' +
            '<span class="plan-haken">' + (schon ? "✓" : "") + "</span>" +
            '<span class="plan-rolle">' + punkt.rolle + "</span>" +
            '<span class="plan-modul">' + MODULNAMEN[punkt.modul] + "</span>" +
            '<span class="plan-minuten">' + punkt.minuten + " Min</span>" +
            (schon
              ? '<span class="plan-status">erledigt</span>'
              : '<button class="knopf klein-knopf plan-start" data-modul="' +
                punkt.modul + '">starten</button>') +
          "</li>";
        }).join("") +
      "</ol>" +

      (hinweis ? '<p class="plan-warnung">' + hinweis + "</p>" : "") +

      '<p class="plan-fuss">' +
        (fertig
          ? "Pausen und Schlaf festigen das Gelernte – das Üben wirkt noch, wenn du längst aufgehört hast."
          : "Pausen und Schlaf festigen das Gelernte. Bei Schmerzen in Hand oder " +
            "Handgelenk aufhören, nicht durchziehen.") +
      "</p>";

    for (const knopf of behaelter.querySelectorAll(".plan-start")) {
      knopf.addEventListener("click", () => App.uebungStarten(knopf.dataset.modul));
    }
  }

  return { zeichnen: zeichnen, erzeugen: erzeugen, warnung: warnung };

})();
