/* ==========================================================================
   app.js – Navigation, Startseite, Modulverzeichnis

   Eine Seite, mehrere Ansichten (Menü, Übung, Ergebnis, Statistik, Daten).
   Es wird immer nur eine gezeigt, umgeschaltet über das hidden-Attribut.

   Module melden sich selbst an:
       App.modulAnmelden("dualtask", { starten: function (flaeche, kontext) {...} });
   Dadurch kann ich in Phase 2 eine Datei in js/modules/ dazulegen, ohne hier
   etwas zu ändern – nur die Liste MODULE unten bekommt einen Eintrag.
   ========================================================================== */

const App = (function () {

  /* ----------------------------- Modulliste -----------------------------
     hand: welche Hand das Modul vor allem fordert – steuert die Farbkante.
     bereit: false = Kachel ist noch nicht anklickbar (kommt in der Phase).
  ---------------------------------------------------------------------- */
  const MODULE = [
    {
      schluessel: "dualtask",
      name: "Dual Task",
      text: "Rechts tippt Zahlencodes auf dem Ziffernblock, links führt gleichzeitig die Maus auf einer Spur. Die Hauptübung.",
      haende: ["beide"],
      bereit: false,
      phase: "Phase 1 – nächster Schritt"
    },
    {
      schluessel: "mirrorwrite",
      name: "Spiegelschrift",
      text: "Mit links schreiben, daneben läuft live die gespiegelte Version mit. Vorlagen von Buchstaben bis Satz.",
      haende: ["links"],
      bereit: false,
      phase: "Phase 2"
    },
    {
      schluessel: "mirrortrace",
      name: "Mirror Tracing",
      text: "Eine Form nachfahren, während die Bewegung gespiegelt dargestellt wird. Beide Hände im Vergleich.",
      haende: ["links", "rechts"],
      bereit: false,
      phase: "Phase 2"
    },
    {
      schluessel: "sequence",
      name: "Sequenz-Training",
      text: "Felder leuchten auf, passende Taste drücken. Versteckt wiederholt sich ein Muster – wird es schneller, sitzt die Bahn.",
      haende: ["links", "rechts"],
      bereit: false,
      phase: "Phase 2"
    },
    {
      schluessel: "stroop",
      name: "Stroop-Test",
      text: "„ROT“ in blauer Schrift: die Farbe zählt, nicht das Wort. Aufmerksamkeit und Hemmung.",
      haende: ["beide"],
      bereit: false,
      phase: "Phase 3"
    },
    {
      schluessel: "rhythm",
      name: "Rhythmus",
      text: "Beide Hände klopfen verschiedene Takte, 3 gegen 2 und später 4 gegen 3.",
      haende: ["beide"],
      bereit: false,
      phase: "Phase 3"
    }
  ];

  /* Von den Moduldateien gefüllt. */
  const angemeldet = {};

  function modulAnmelden(schluessel, objekt) {
    angemeldet[schluessel] = objekt;
    const eintrag = MODULE.find((m) => m.schluessel === schluessel);
    if (eintrag) eintrag.bereit = true;
  }

  function modulName(schluessel) {
    const eintrag = MODULE.find((m) => m.schluessel === schluessel);
    return eintrag ? eintrag.name : schluessel;
  }

  /* --------------------------- Bausteine für Module ---------------------------
     Die Stufenleiste nutzen alle Übungen, darum steht sie hier und nicht in
     einem einzelnen Modul. legende: [{ modus, text }] erklärt die Farben,
     weil jedes Modul andere Modi hat.
  --------------------------------------------------------------------------- */
  function stufenleiste(schluessel, aktuell, legende) {
    const reihen = Schwierigkeit.tabelle[schluessel] || [];

    const felder = reihen.map((reihe) => {
      const hier = reihe.stufe === aktuell ? " stufe-aktuell" : "";
      const hinter = reihe.stufe < aktuell ? " stufe-hinter" : "";
      return '<span class="stufe-feld stufe-' + reihe.modus + hier + hinter + '" ' +
             'title="Stufe ' + reihe.stufe + ": " + reihe.modus + '">' + reihe.stufe + "</span>";
    }).join("");

    const erklaerung = (legende || []).map((eintrag) =>
      '<span class="punkt stufe-' + eintrag.modus + '"></span> ' + eintrag.text
    ).join(" ");

    return '<div class="stufenleiste">' + felder + "</div>" +
           '<p class="flaeche-text klein stufen-legende">' + erklaerung + "</p>";
  }

  /* ------------------------------ Ansichten ------------------------------ */

  const ANSICHTEN = ["menue", "uebung", "ergebnis", "statistik", "netz", "daten"];
  let aktuelleAnsicht = "menue";

  function ansichtZeigen(name) {
    aktuelleAnsicht = name;

    for (const a of ANSICHTEN) {
      const abschnitt = document.getElementById("ansicht-" + a);
      if (abschnitt) abschnitt.hidden = a !== name;
    }

    /* Navigationsknopf markieren (Übung und Ergebnis gehören zu „Übungen“). */
    const gehoertZu = (name === "uebung" || name === "ergebnis") ? "menue" : name;
    for (const knopf of document.querySelectorAll(".nav-knopf")) {
      knopf.setAttribute("aria-current", String(knopf.dataset.ansicht === gehoertZu));
    }

    /* Während der Übung ruht der Hintergrund, sonst läuft er. */
    if (name === "uebung") Hintergrund.ruhe();
    else Hintergrund.start();

    /* Ein laufendes Spur-Replay nicht im Hintergrund weiterlaufen lassen.
       Kein window.Ergebnis abfragen: ein const auf oberster Ebene hängt
       nicht am window-Objekt, die Prüfung wäre immer falsch. */
    if (name !== "ergebnis" && typeof Ergebnis !== "undefined") Ergebnis.stoppen();

    if (name === "menue") { Tagesplan.zeichnen(); kachelnZeichnen(); }
    if (name === "daten") speicherZustandZeigen();
    if (name === "statistik") Statistik.zeichnen();
    if (name === "netz") Netz.zeichnen();
    else Netz.stoppen();   /* die Netz-Animation läuft nur, wenn man sie sieht */
    if (name === "menue" || name === "statistik") streifenZeichnen();

    window.scrollTo({ top: 0, behavior: "instant" });
  }

  /* ---------------------------- Startseite ---------------------------- */

  function streifenZeichnen() {
    const alle = Speicher.durchgaenge();
    setzen("kz-streak", Auswertung.streak(alle));
    setzen("kz-durchgaenge", alle.length);
    setzen("kz-minuten", Auswertung.minutenGesamt(alle));
    setzen("kz-heute", Auswertung.heuteGeuebt(alle) ? "geübt ✓" : "offen");
  }

  function setzen(id, wert) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(wert);
  }

  function handMarke(hand) {
    if (hand === "links") return '<span class="marker marker-links">linke Hand</span>';
    if (hand === "rechts") return '<span class="marker marker-rechts">rechte Hand</span>';
    return '<span class="marker marker-beide">beide Hände</span>';
  }

  function kantenfarbe(haende) {
    if (haende.length === 1 && haende[0] === "links") return "var(--links)";
    if (haende.length === 1 && haende[0] === "rechts") return "var(--rechts)";
    return "var(--gold)";
  }

  function kachelnZeichnen() {
    const behaelter = document.getElementById("kacheln");
    if (!behaelter) return;
    behaelter.innerHTML = "";

    for (const modul of MODULE) {
      const letzter = Speicher.letzterDurchgang(modul.schluessel);
      const stufe = Speicher.stufe(modul.schluessel);

      const kachel = document.createElement("button");
      kachel.className = "kachel";
      kachel.style.setProperty("--kante", kantenfarbe(modul.haende));
      kachel.disabled = !modul.bereit;

      /* Der letzte Score kann von einer anderen Stufe stammen – dann wird
         sie dazugeschrieben, sonst wirkt die Zahl vergleichbar, ist es aber
         nicht. */
      const ergebnis = letzter
        ? "Stufe <b>" + stufe + "</b> · zuletzt " + letzter.score +
          (letzter.stufe !== stufe ? " (auf Stufe " + letzter.stufe + ")" : "")
        : (modul.bereit ? "Stufe <b>" + stufe + "</b> · noch kein Durchgang" : modul.phase);

      kachel.innerHTML =
        '<div class="kachel-kopf">' +
          '<span class="kachel-name">' + modul.name + "</span>" +
          '<span class="hand-marken">' + modul.haende.map(handMarke).join("") + "</span>" +
        "</div>" +
        '<p class="kachel-text">' + modul.text + "</p>" +
        '<div class="kachel-fuss">' +
          '<span class="kachel-ergebnis">' + ergebnis + "</span>" +
          "<span>" + (modul.bereit ? "starten →" : "") + "</span>" +
        "</div>";

      if (modul.bereit) {
        kachel.addEventListener("click", () => uebungStarten(modul.schluessel));
      }

      behaelter.appendChild(kachel);
    }
  }

  /* ------------------------------- Übung -------------------------------
     Ab Schritt 2 übernimmt hier das Modul. Es bekommt die leere Fläche und
     einen Kontext mit allem, was es braucht, und ruft am Ende
     kontext.fertig(durchgang) auf.
  --------------------------------------------------------------------- */

  function uebungStarten(schluessel) {
    const modul = angemeldet[schluessel];
    if (!modul) return;

    const flaeche = document.getElementById("ansicht-uebung");
    flaeche.innerHTML = "";
    ansichtZeigen("uebung");

    modul.starten(flaeche, {
      stufe: Speicher.stufe(schluessel),
      werte: Schwierigkeit.stufenwerte(schluessel, Speicher.stufe(schluessel)),
      abbrechen: () => ansichtZeigen("menue"),
      fertig: (durchgang, extras) => durchgangAbschliessen(schluessel, durchgang, extras)
    });
  }

  /* Speichert den Durchgang, passt die Stufe an und zeigt das Ergebnis.
     extras (z. B. die Spur-Aufzeichnung) werden absichtlich NICHT mit
     gespeichert: sie sind nur für die Ergebnisseite direkt danach gedacht
     und würden den localStorage sonst mit jedem Durchgang vollschreiben. */
  function durchgangAbschliessen(schluessel, durchgang, extras) {
    /* Verglichen wird nur mit Durchgängen derselben Stufe. */
    const vorheriger = Speicher.letzterDurchgang(schluessel, durchgang.stufe);

    durchgang.modul = schluessel;
    Speicher.durchgangHinzufuegen(durchgang);

    const alteStufe = Speicher.stufe(schluessel);
    /* Ein Basiswert wird getrennt gemessen und fällt dadurch leichter aus –
       er darf die Stufe nicht nach oben schieben. */
    const neueStufe = durchgang.basiswert
      ? alteStufe
      : Schwierigkeit.naechsteStufe(alteStufe, Auswertung.erfolgsquote(durchgang));
    Speicher.stufeSetzen(schluessel, neueStufe);

    ergebnisZeigen(schluessel, durchgang, vorheriger, alteStufe, neueStufe, extras);
  }

  /* Die Seite selbst baut js/ergebnis.js – hier werden nur die Daten
     zusammengestellt, die sie braucht. */
  function ergebnisZeigen(schluessel, durchgang, vorheriger, alteStufe, neueStufe, extras) {
    const flaeche = document.getElementById("ansicht-ergebnis");

    /* Erst sichtbar schalten, dann füllen: das Replay misst die Breite
       seines Canvas, und die ist in einer versteckten Ansicht 0. */
    ansichtZeigen("ergebnis");

    Ergebnis.zeigen(flaeche, {
      modulName: modulName(schluessel),
      schluessel: schluessel,
      durchgang: durchgang,
      vorheriger: vorheriger,
      alteStufe: alteStufe,
      neueStufe: neueStufe,
      bestwert: Speicher.bestwert(schluessel, durchgang.stufe),
      schnitt: Auswertung.gleitenderDurchschnitt(Speicher.durchgaenge(schluessel, durchgang.stufe), 5),
      anzahlAufStufe: Speicher.durchgaenge(schluessel, durchgang.stufe).length,
      replay: extras ? extras.replay : null,
      kacheln: extras ? extras.kacheln : null,
      notiz: extras ? extras.notiz : null,
      galerie: extras ? extras.galerie : null,
      galerieTitel: extras ? extras.galerieTitel : null,
      galerieText: extras ? extras.galerieText : null,
      aufNochmal: () => uebungStarten(schluessel),
      aufZurueck: () => ansichtZeigen("menue")
    });
  }

  /* -------------------------------- Daten -------------------------------- */

  function meldung(text, istFehler) {
    const element = document.getElementById("import-meldung");
    element.textContent = text;
    element.classList.toggle("meldung-fehler", !!istFehler);
    element.hidden = false;
  }

  /* Zustand des Speichers in der Daten-Ansicht anzeigen. */
  function speicherZustandZeigen() {
    const element = document.getElementById("speicher-zustand");
    if (!element) return;

    Speicher.speicherInfo().then((info) => {
      /* Aussagekräftiger als eine nackte Zahl: wie viel für wie viele
         Durchgänge. Daran sieht man auch, dass der Platz nie knapp wird. */
      const platz = info.belegtKB == null ? ""
        : " " + info.durchgaenge + (info.durchgaenge === 1 ? " Durchgang" : " Durchgänge") +
          " belegen " + String(info.belegtKB).replace(".", ",") + " KB.";

      if (info.dauerhaft === true) {
        element.innerHTML = "Dieser Browser hat den Speicher als <b>dauerhaft</b> " +
          "angemeldet – er wird nicht weggeräumt, wenn der Datenträger eng wird." + platz +
          " Gegen „Browserdaten löschen“ hilft trotzdem nur der Export.";
      } else if (info.dauerhaft === false) {
        element.innerHTML = "Der Speicher ist <b>nicht als dauerhaft angemeldet</b>. " +
          "Die Daten bleiben erhalten, könnten aber bei Speichermangel weggeräumt " +
          "werden." + platz + " Ein Lesezeichen auf diese Seite erhöht die Chance, " +
          "dass der Browser sie behält – sicher ist nur der Export.";
      } else {
        element.textContent = "Dieser Browser gibt keine Auskunft über den Speicher. " +
          "Die Daten liegen lokal; sichere sie regelmäßig über den Export.";
      }
    });
  }

  function datenAnsichtVerdrahten() {
    document.getElementById("knopf-export").addEventListener("click", () => {
      Speicher.exportieren();
    });

    document.getElementById("datei-import").addEventListener("change", (ereignis) => {
      const datei = ereignis.target.files && ereignis.target.files[0];
      if (!datei) return;

      const leser = new FileReader();
      leser.onload = () => {
        try {
          const bericht = Speicher.importieren(String(leser.result));
          meldung(
            bericht.neu + " neue Durchgänge übernommen, " + bericht.doppelt +
            " doppelte übersprungen. Jetzt " + bericht.gesamt + " insgesamt.",
            false
          );
          streifenZeichnen();
        } catch (fehler) {
          meldung("Die Datei konnte nicht gelesen werden. Ist es ein SYNAPSE-Export?", true);
          console.warn("SYNAPSE: Import fehlgeschlagen.", fehler);
        }
      };
      leser.readAsText(datei);
      /* Zurücksetzen, damit dieselbe Datei erneut gewählt werden kann. */
      ereignis.target.value = "";
    });

    document.getElementById("knopf-loeschen").addEventListener("click", () => {
      const sicher = window.confirm(
        "Wirklich alle Durchgänge und Stufen löschen? Das lässt sich nicht zurückholen."
      );
      if (!sicher) return;
      Speicher.allesLoeschen();
      streifenZeichnen();
      meldung("Alle Daten gelöscht.", false);
    });
  }

  /* --------------------------------- Start --------------------------------- */

  /* Die Kopfzeile liegt fest über dem Inhalt. Damit darunter genau so viel
     Platz frei bleibt, wie sie hoch ist, wird ihre Höhe gemessen – sie
     ändert sich, wenn die Navigation auf schmalen Fenstern umbricht. */
  function kopfhoeheSetzen() {
    const kopf = document.querySelector(".kopf");
    if (!kopf) return;
    document.documentElement.style.setProperty("--kopf-hoehe", kopf.offsetHeight + "px");
  }

  function init() {
    Hintergrund.init();
    /* Beim Start einmal um dauerhaften Speicher bitten – ohne darauf zu warten. */
    Speicher.dauerhaftAnfordern();
    kopfhoeheSetzen();
    window.addEventListener("resize", kopfhoeheSetzen);

    for (const knopf of document.querySelectorAll(".nav-knopf")) {
      knopf.addEventListener("click", () => ansichtZeigen(knopf.dataset.ansicht));
    }

    datenAnsichtVerdrahten();
    ansichtZeigen("menue");
  }

  document.addEventListener("DOMContentLoaded", init);

  return {
    modulAnmelden: modulAnmelden,
    stufenleiste: stufenleiste,
    ansichtZeigen: ansichtZeigen,
    uebungStarten: uebungStarten
  };

})();
