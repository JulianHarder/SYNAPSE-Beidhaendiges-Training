/* ==========================================================================
   storage.js – Speichern, Laden, Export, Import

   Alles liegt unter einem einzigen localStorage-Schlüssel als JSON. Das hält
   den Export einfach: die exportierte Datei ist genau dieses Objekt.

   Aufbau der Daten:
   {
     version: 1,
     erstellt: "2026-10-14T08:00:00.000Z",
     durchgaenge: [ { id, modul, stufe, hand, spiegel, dauerSek, werte, score } ],
     stufen: { dualtask: 3, mirrorwrite: 1, ... },
     einstellungen: {}
   }

   Die ID eines Durchgangs ist seine Startzeit als ISO-Text (siehe Plan,
   Abschnitt 6). Sie dient beim Import als Erkennung für Doppelte.
   ========================================================================== */

const Speicher = (function () {

  const SCHLUESSEL = "synapse.daten.v1";
  const VERSION = 1;

  /* Frische, leere Daten. */
  function leer() {
    return {
      version: VERSION,
      erstellt: new Date().toISOString(),
      durchgaenge: [],
      stufen: {},
      einstellungen: {}
    };
  }

  /* Fehlende Felder nachtragen, damit älterer oder kaputter Inhalt nicht
     den ganzen Start blockiert. */
  function vervollstaendigen(daten) {
    const sauber = leer();
    if (!daten || typeof daten !== "object") return sauber;
    if (Array.isArray(daten.durchgaenge)) sauber.durchgaenge = daten.durchgaenge;
    if (daten.stufen && typeof daten.stufen === "object") sauber.stufen = daten.stufen;
    if (daten.einstellungen && typeof daten.einstellungen === "object") sauber.einstellungen = daten.einstellungen;
    if (typeof daten.erstellt === "string") sauber.erstellt = daten.erstellt;
    return sauber;
  }

  /* Einmal geladen und dann im Arbeitsspeicher gehalten. */
  let daten = null;

  function laden() {
    if (daten) return daten;
    try {
      const text = localStorage.getItem(SCHLUESSEL);
      daten = text ? vervollstaendigen(JSON.parse(text)) : leer();
    } catch (fehler) {
      /* Privates Fenster, blockierter Speicher oder beschädigter Inhalt:
         Die App läuft weiter, nur ohne Gedächtnis. */
      console.warn("SYNAPSE: Speicher nicht lesbar, arbeite ohne Verlauf.", fehler);
      daten = leer();
    }
    return daten;
  }

  function sichern() {
    try {
      localStorage.setItem(SCHLUESSEL, JSON.stringify(laden()));
      return true;
    } catch (fehler) {
      console.warn("SYNAPSE: Speichern fehlgeschlagen.", fehler);
      return false;
    }
  }

  /* ------------------------------ Durchgänge ------------------------------ */

  function durchgangHinzufuegen(durchgang) {
    const d = laden();
    if (!durchgang.id) durchgang.id = new Date().toISOString();
    d.durchgaenge.push(durchgang);
    sichern();
    return durchgang;
  }

  /* Alle Durchgänge, neueste zuerst. Wahlweise nach Modul und Stufe
     gefiltert. Die Stufe ist wichtig: Ein Score auf Stufe 2 und einer auf
     Stufe 6 sind nicht dasselbe – verglichen wird nur innerhalb einer Stufe. */
  function durchgaenge(modul, stufe) {
    let alle = laden().durchgaenge.slice().sort((a, b) => String(b.id).localeCompare(String(a.id)));
    if (modul) alle = alle.filter((d) => d.modul === modul);
    if (typeof stufe === "number") alle = alle.filter((d) => d.stufe === stufe);
    return alle;
  }

  function letzterDurchgang(modul, stufe) {
    return durchgaenge(modul, stufe)[0] || null;
  }

  function bestwert(modul, stufe) {
    return durchgaenge(modul, stufe).reduce((max, d) => Math.max(max, d.score || 0), 0);
  }

  /* -------------------------------- Stufen -------------------------------- */

  function stufe(modul) {
    const wert = laden().stufen[modul];
    return typeof wert === "number" ? wert : 1;
  }

  function stufeSetzen(modul, neueStufe) {
    laden().stufen[modul] = Math.max(1, Math.min(10, Math.round(neueStufe)));
    sichern();
    return laden().stufen[modul];
  }

  /* ----------------------------- Einstellungen -----------------------------
     Für Dinge, die über Durchgänge hinweg gleich bleiben müssen – etwa die
     versteckte Tastenfolge beim Sequenz-Training. Würde sie jedes Mal neu
     gewürfelt, gäbe es nichts zu lernen. */

  function einstellung(name, standard) {
    const wert = laden().einstellungen[name];
    return wert === undefined ? standard : wert;
  }

  function einstellungSetzen(name, wert) {
    laden().einstellungen[name] = wert;
    sichern();
    return wert;
  }

  /* --------------------------- Dauerhafter Speicher ---------------------------
     Browser räumen Website-Daten weg, wenn der Datenträger eng wird – zuerst
     bei Seiten, die lange nicht besucht wurden. Mit dieser Anfrage wird der
     Speicher als wichtig markiert und von dieser Aufräumaktion ausgenommen.

     Chrome gewährt sie meist still, wenn die Seite als Lesezeichen gespeichert
     oder oft benutzt wird; Firefox fragt nach. Wird sie abgelehnt, ändert sich
     nichts – die Daten bleiben, sie sind nur nicht vor dem Aufräumen geschützt.
     Gegen „Browserdaten löschen“ hilft ohnehin nichts außer dem Export. */

  async function dauerhaftAnfordern() {
    if (!navigator.storage || !navigator.storage.persist) return null;
    try {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    } catch (fehler) {
      console.warn("SYNAPSE: Speicher konnte nicht als dauerhaft angemeldet werden.", fehler);
      return null;
    }
  }

  /* Größe der eigenen Daten in Kilobyte. Bewusst selbst gemessen und nicht
     über navigator.storage.estimate(): Dort zählt localStorage je nach
     Browser gar nicht mit, die Zahl wäre also irreführend. */
  function belegtKB() {
    try {
      const text = localStorage.getItem(SCHLUESSEL) || "";
      return Math.round((new Blob([text]).size / 1024) * 10) / 10;
    } catch (fehler) {
      return null;
    }
  }

  /* Zustand für die Anzeige unter "Daten": dauerhaft ja/nein und Platzbedarf. */
  async function speicherInfo() {
    const info = { dauerhaft: null, belegtKB: belegtKB(), durchgaenge: laden().durchgaenge.length };
    if (!navigator.storage || !navigator.storage.persisted) return info;
    try {
      info.dauerhaft = await navigator.storage.persisted();
    } catch (fehler) {
      /* In manchen Browsern gesperrt – dann bleibt die Angabe offen. */
    }
    return info;
  }

  /* ---------------------------- Export / Import ---------------------------- */

  /* Lädt die Daten als Datei herunter (kein Server beteiligt). */
  function exportieren() {
    const text = JSON.stringify(laden(), null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const heute = new Date().toISOString().slice(0, 10);

    const link = document.createElement("a");
    link.href = url;
    link.download = "synapse-" + heute + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    /* Erst nach dem Klick freigeben, sonst bricht der Download ab. */
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* Führt eine exportierte Datei mit dem aktuellen Stand zusammen.
     Doppelte (gleiche ID) werden übersprungen, bei Stufen gilt die höhere.
     Gibt eine kleine Zusammenfassung für die Meldung in der Oberfläche zurück. */
  function importieren(text) {
    const eingelesen = vervollstaendigen(JSON.parse(text));
    const d = laden();

    const vorhandeneIds = new Set(d.durchgaenge.map((x) => String(x.id)));
    let neu = 0;
    let doppelt = 0;

    for (const durchgang of eingelesen.durchgaenge) {
      if (vorhandeneIds.has(String(durchgang.id))) {
        doppelt++;
      } else {
        d.durchgaenge.push(durchgang);
        vorhandeneIds.add(String(durchgang.id));
        neu++;
      }
    }

    for (const modul of Object.keys(eingelesen.stufen)) {
      const fremd = eingelesen.stufen[modul];
      if (typeof fremd === "number" && fremd > stufe(modul)) d.stufen[modul] = fremd;
    }

    /* Einstellungen nur ergänzen, nie überschreiben. Wichtig für die
       versteckte Tastenfolge: Wer hier schon eine hat, soll sie behalten –
       sonst wäre das Gelernte beim Gerätewechsel entwertet. */
    for (const name of Object.keys(eingelesen.einstellungen)) {
      if (d.einstellungen[name] === undefined) d.einstellungen[name] = eingelesen.einstellungen[name];
    }

    sichern();
    return { neu: neu, doppelt: doppelt, gesamt: d.durchgaenge.length };
  }

  function allesLoeschen() {
    daten = leer();
    try {
      localStorage.removeItem(SCHLUESSEL);
    } catch (fehler) {
      console.warn("SYNAPSE: Löschen fehlgeschlagen.", fehler);
    }
  }

  return {
    laden: laden,
    sichern: sichern,
    durchgangHinzufuegen: durchgangHinzufuegen,
    durchgaenge: durchgaenge,
    letzterDurchgang: letzterDurchgang,
    bestwert: bestwert,
    stufe: stufe,
    stufeSetzen: stufeSetzen,
    einstellung: einstellung,
    einstellungSetzen: einstellungSetzen,
    dauerhaftAnfordern: dauerhaftAnfordern,
    speicherInfo: speicherInfo,
    exportieren: exportieren,
    importieren: importieren,
    allesLoeschen: allesLoeschen
  };

})();
