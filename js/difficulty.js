/* ==========================================================================
   difficulty.js – adaptive Schwierigkeit

   Plan, Abschnitt 5: Stufen 1 bis 10 pro Modul. Nach jedem Durchgang
     Erfolgsquote > 85 %  -> Stufe hoch
     Erfolgsquote < 60 %  -> Stufe runter
     dazwischen           -> Stufe bleibt

   Die Parameter stehen hier als Tabelle, damit ich sie später anpassen kann,
   ohne den Modulcode anzufassen.
   ========================================================================== */

const Schwierigkeit = (function () {

  const HOCH = 0.85;
  const RUNTER = 0.60;

  /* ---------------------------- Dual Task ----------------------------
     codeLaenge        Ziffern pro Code
     spurTempo         Faktor für die Wandergeschwindigkeit der Spur
     spurBreitePx      erlaubter Schlauch um die Soll-Linie (schmaler = schwerer)
     dauerSek          Länge des Durchgangs
     modus             "einzeln" = erst nur Code, dann nur Spur (Basiswert)
                       "dual"    = beides gleichzeitig
                       "tausch"  = links tippt, rechts führt die Maus
                       "spiegel" = Spur wird gespiegelt dargestellt
     spur              Form der Linie
  -------------------------------------------------------------------- */
  const dualtask = [
    { stufe: 1,  codeLaenge: 3, spurTempo: 0.50, spurBreitePx: 34, dauerSek: 60, modus: "einzeln", spur: "welle" },
    { stufe: 2,  codeLaenge: 3, spurTempo: 0.60, spurBreitePx: 30, dauerSek: 60, modus: "dual",    spur: "welle" },
    { stufe: 3,  codeLaenge: 4, spurTempo: 0.75, spurBreitePx: 26, dauerSek: 75, modus: "dual",    spur: "welle" },
    { stufe: 4,  codeLaenge: 5, spurTempo: 0.90, spurBreitePx: 22, dauerSek: 75, modus: "dual",    spur: "spirale" },
    { stufe: 5,  codeLaenge: 6, spurTempo: 1.05, spurBreitePx: 19, dauerSek: 90, modus: "dual",    spur: "spirale" },
    { stufe: 6,  codeLaenge: 7, spurTempo: 1.20, spurBreitePx: 16, dauerSek: 90, modus: "dual",    spur: "labyrinth" },
    { stufe: 7,  codeLaenge: 6, spurTempo: 1.20, spurBreitePx: 16, dauerSek: 90, modus: "tausch",  spur: "welle" },
    { stufe: 8,  codeLaenge: 7, spurTempo: 1.35, spurBreitePx: 14, dauerSek: 90, modus: "tausch",  spur: "spirale" },
    { stufe: 9,  codeLaenge: 6, spurTempo: 1.40, spurBreitePx: 14, dauerSek: 90, modus: "spiegel", spur: "welle" },
    { stufe: 10, codeLaenge: 8, spurTempo: 1.60, spurBreitePx: 12, dauerSek: 90, modus: "spiegel", spur: "spirale" }
  ];

  /* --------------------------- Spiegelschrift ---------------------------
     art           was geschrieben wird (siehe Textlisten in mirrorwrite.js)
     aufgaben      wie viele Vorlagen ein Durchgang enthält
     toleranzPx    wie weit der Strich von der Vorlage abweichen darf
     modus         wie lange die Vorlage zu sehen ist:
                   "vorlage"     dauerhaft sichtbar
                   "verblassend" wird im Lauf der Aufgabe blasser
                   "kurz"        nur die ersten Sekunden
                   "ohne"        gar nicht – nur der Text steht da
  ---------------------------------------------------------------------- */
  const mirrorwrite = [
    { stufe: 1,  art: "buchstabe", aufgaben: 3, toleranzPx: 30, modus: "vorlage"     },
    { stufe: 2,  art: "buchstabe", aufgaben: 4, toleranzPx: 26, modus: "vorlage"     },
    { stufe: 3,  art: "wortKurz",  aufgaben: 2, toleranzPx: 24, modus: "vorlage"     },
    { stufe: 4,  art: "wortKurz",  aufgaben: 3, toleranzPx: 22, modus: "verblassend" },
    { stufe: 5,  art: "wortLang",  aufgaben: 2, toleranzPx: 20, modus: "verblassend" },
    { stufe: 6,  art: "wortLang",  aufgaben: 3, toleranzPx: 18, modus: "kurz"        },
    { stufe: 7,  art: "satzKurz",  aufgaben: 2, toleranzPx: 18, modus: "verblassend" },
    { stufe: 8,  art: "satzKurz",  aufgaben: 2, toleranzPx: 16, modus: "kurz"        },
    { stufe: 9,  art: "satzLang",  aufgaben: 1, toleranzPx: 15, modus: "kurz"        },
    { stufe: 10, art: "satzLang",  aufgaben: 2, toleranzPx: 14, modus: "ohne"        }
  ];

  /* ---------------------------- Mirror Tracing ----------------------------
     form          Stern, Zickzack oder Spirale (siehe bahnen.js)
     korridorPx    Breite des erlaubten Korridors
     tempoPxProSek Richtwert fürs Tempo: daraus wird die Sollzeit berechnet
     modus         wie die Bewegung verdreht wird:
                   "waagerecht" links und rechts vertauscht
                   "senkrecht"  oben und unten vertauscht
                   "beides"     um 180 Grad gedreht
  ------------------------------------------------------------------------ */
  const mirrortrace = [
    { stufe: 1,  form: "zickzack", korridorPx: 34, tempoPxProSek: 70,  modus: "waagerecht" },
    { stufe: 2,  form: "zickzack", korridorPx: 28, tempoPxProSek: 80,  modus: "waagerecht" },
    { stufe: 3,  form: "stern",    korridorPx: 26, tempoPxProSek: 85,  modus: "waagerecht" },
    { stufe: 4,  form: "stern",    korridorPx: 22, tempoPxProSek: 95,  modus: "waagerecht" },
    { stufe: 5,  form: "spirale",  korridorPx: 22, tempoPxProSek: 95,  modus: "waagerecht" },
    { stufe: 6,  form: "spirale",  korridorPx: 20, tempoPxProSek: 100, modus: "senkrecht"  },
    { stufe: 7,  form: "stern",    korridorPx: 18, tempoPxProSek: 110, modus: "senkrecht"  },
    { stufe: 8,  form: "zickzack", korridorPx: 18, tempoPxProSek: 110, modus: "beides"     },
    { stufe: 9,  form: "stern",    korridorPx: 16, tempoPxProSek: 120, modus: "beides"     },
    { stufe: 10, form: "spirale",  korridorPx: 14, tempoPxProSek: 130, modus: "beides"     }
  ];

  /* --------------------------- Sequenz-Training ---------------------------
     Aufbau wie beim klassischen Serial-Reaction-Time-Test: Die meisten
     Blöcke folgen einer versteckten Tastenfolge, einer ist Zufall. Wird man
     im Muster schneller als im Zufall, hat das Gehirn die Folge gelernt.

     musterLaenge  Länge der versteckten Folge
     bloecke       Blöcke je Durchgang (einer davon ist Zufall)
     proBlock      Tastendrücke je Block
     pauseMs       Pause zwischen zwei Reizen
     modus         welche Hand: "links", "rechts" oder "beide" (acht Felder)
  ------------------------------------------------------------------------ */
  const sequence = [
    { stufe: 1,  musterLaenge: 6,  bloecke: 4, proBlock: 18, pauseMs: 320, modus: "links"  },
    { stufe: 2,  musterLaenge: 6,  bloecke: 4, proBlock: 24, pauseMs: 280, modus: "links"  },
    { stufe: 3,  musterLaenge: 8,  bloecke: 4, proBlock: 24, pauseMs: 250, modus: "links"  },
    { stufe: 4,  musterLaenge: 8,  bloecke: 4, proBlock: 24, pauseMs: 250, modus: "rechts" },
    { stufe: 5,  musterLaenge: 8,  bloecke: 4, proBlock: 28, pauseMs: 220, modus: "beide"  },
    { stufe: 6,  musterLaenge: 10, bloecke: 4, proBlock: 28, pauseMs: 200, modus: "beide"  },
    { stufe: 7,  musterLaenge: 10, bloecke: 5, proBlock: 28, pauseMs: 180, modus: "beide"  },
    { stufe: 8,  musterLaenge: 12, bloecke: 5, proBlock: 30, pauseMs: 160, modus: "beide"  },
    { stufe: 9,  musterLaenge: 12, bloecke: 5, proBlock: 32, pauseMs: 140, modus: "beide"  },
    { stufe: 10, musterLaenge: 12, bloecke: 6, proBlock: 32, pauseMs: 120, modus: "beide"  }
  ];

  /* ------------------------------ Stroop-Test ------------------------------
     reize            Anzahl der Wörter je Durchgang
     inkongruent      Anteil der Wörter, bei denen Wort und Farbe nicht passen
     zeitfensterMs    so lange darf eine Antwort dauern, sonst gilt sie als verpasst
     pauseMs          Pause zwischen zwei Wörtern
     modus            womit geantwortet wird:
                      "maus"    linke Hand klickt die Farbfelder
                      "tasten"  rechte Hand, Ziffern 1 bis 4
                      "wechsel" vor jedem Wort wird angesagt, welche Hand dran ist
  ------------------------------------------------------------------------ */
  const stroop = [
    { stufe: 1,  reize: 20, inkongruent: 0.40, zeitfensterMs: 3500, pauseMs: 550, modus: "maus"    },
    { stufe: 2,  reize: 24, inkongruent: 0.50, zeitfensterMs: 3000, pauseMs: 500, modus: "maus"    },
    { stufe: 3,  reize: 24, inkongruent: 0.50, zeitfensterMs: 3000, pauseMs: 500, modus: "tasten"  },
    { stufe: 4,  reize: 28, inkongruent: 0.60, zeitfensterMs: 2600, pauseMs: 450, modus: "tasten"  },
    { stufe: 5,  reize: 28, inkongruent: 0.60, zeitfensterMs: 2600, pauseMs: 450, modus: "wechsel" },
    { stufe: 6,  reize: 32, inkongruent: 0.65, zeitfensterMs: 2300, pauseMs: 400, modus: "wechsel" },
    { stufe: 7,  reize: 32, inkongruent: 0.70, zeitfensterMs: 2000, pauseMs: 380, modus: "wechsel" },
    { stufe: 8,  reize: 36, inkongruent: 0.70, zeitfensterMs: 1800, pauseMs: 340, modus: "wechsel" },
    { stufe: 9,  reize: 36, inkongruent: 0.75, zeitfensterMs: 1600, pauseMs: 300, modus: "wechsel" },
    { stufe: 10, reize: 40, inkongruent: 0.80, zeitfensterMs: 1400, pauseMs: 260, modus: "wechsel" }
  ];

  /* ------------------------------- Rhythmus -------------------------------
     links / rechts  Schläge je Hand und Zyklus (3 gegen 2 heißt: links drei,
                     rechts zwei Schläge in derselben Zeit)
     zyklusMs        Dauer eines Durchlaufs
     zyklen          wie viele Durchläufe gewertet werden
     toleranzMs      bis hierhin gilt ein Schlag als getroffen
     modus           was das Metronom vorgibt:
                     "beide"  jeden Schlag beider Hände
                     "grund"  nur die langsamere Hand und den Taktanfang
                     "takt"   nur den Taktanfang – der Rest kommt aus dem Kopf
  ------------------------------------------------------------------------ */
  const rhythm = [
    { stufe: 1,  links: 2, rechts: 1, zyklusMs: 2400, zyklen: 8,  toleranzMs: 200, modus: "beide" },
    { stufe: 2,  links: 3, rechts: 1, zyklusMs: 2400, zyklen: 8,  toleranzMs: 190, modus: "beide" },
    { stufe: 3,  links: 3, rechts: 2, zyklusMs: 2400, zyklen: 8,  toleranzMs: 180, modus: "beide" },
    { stufe: 4,  links: 3, rechts: 2, zyklusMs: 2100, zyklen: 10, toleranzMs: 170, modus: "grund" },
    { stufe: 5,  links: 2, rechts: 3, zyklusMs: 2100, zyklen: 10, toleranzMs: 170, modus: "grund" },
    { stufe: 6,  links: 4, rechts: 3, zyklusMs: 2400, zyklen: 10, toleranzMs: 160, modus: "grund" },
    { stufe: 7,  links: 3, rechts: 2, zyklusMs: 1800, zyklen: 10, toleranzMs: 150, modus: "takt"  },
    { stufe: 8,  links: 4, rechts: 3, zyklusMs: 2100, zyklen: 12, toleranzMs: 150, modus: "takt"  },
    { stufe: 9,  links: 5, rechts: 4, zyklusMs: 2400, zyklen: 12, toleranzMs: 140, modus: "grund" },
    { stufe: 10, links: 5, rechts: 4, zyklusMs: 2000, zyklen: 12, toleranzMs: 130, modus: "takt"  }
  ];

  const tabelle = {
    dualtask: dualtask,
    mirrorwrite: mirrorwrite,
    mirrortrace: mirrortrace,
    sequence: sequence,
    stroop: stroop,
    rhythm: rhythm
  };

  /* Parameter einer Stufe. Stufen außerhalb 1..10 werden eingefangen. */
  function stufenwerte(modul, stufe) {
    const reihen = tabelle[modul];
    if (!reihen) return null;
    const index = Math.max(1, Math.min(reihen.length, Math.round(stufe))) - 1;
    return reihen[index];
  }

  /* Nächste Stufe aus der Erfolgsquote (0 bis 1) des letzten Durchgangs. */
  function naechsteStufe(stufe, erfolgsquote) {
    const reihen = 10;
    if (erfolgsquote > HOCH) return Math.min(reihen, stufe + 1);
    if (erfolgsquote < RUNTER) return Math.max(1, stufe - 1);
    return stufe;
  }

  /* Kurzer Satz für die Ergebnisseite. */
  function stufenHinweis(stufe, naechste) {
    if (naechste > stufe) return "Nächstes Mal Stufe " + naechste + " – du bist drüber hinausgewachsen.";
    if (naechste < stufe) return "Nächstes Mal wieder Stufe " + naechste + " – das war zu viel auf einmal.";
    return "Stufe " + stufe + " bleibt – genau im richtigen Bereich.";
  }

  return {
    tabelle: tabelle,
    stufenwerte: stufenwerte,
    naechsteStufe: naechsteStufe,
    stufenHinweis: stufenHinweis,
    GRENZE_HOCH: HOCH,
    GRENZE_RUNTER: RUNTER
  };

})();
