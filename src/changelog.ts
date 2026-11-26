/**
 * App changelog. Newest entry first.
 *
 * To ship a release with a "What's new" pop-up:
 *   1. Add a new entry at the **top** of `entries` below.
 *   2. Use a strictly-increasing `version` string (semver-comparable: each
 *      segment is parsed as an int; see `compareVersions` in
 *      `useChangelog.ts`).
 *   3. Write the bullets from the user's perspective ("you can now…"), in
 *      German, since the rest of the UI is in German.
 *
 * The current version is whatever sits at index 0 — bumping `version` here is
 * what triggers the pop-up on existing installs.
 */

export interface ChangelogEntry {
  version: string;
  /** ISO date (YYYY-MM-DD), for display only. */
  date: string;
  /** Short headline shown next to the version chip, optional. */
  title?: string;
  /** Bullet list of user-facing changes. */
  items: string[];
  /**
   * Optional feature tour shown page by page before the bullet list (used for
   * major releases like 2.0).
   */
  highlights?: { icon: string; title: string; text: string }[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: '2.4.0',
    date: '2026-11-26',
    title: 'Team, Quests & Abzeichen',
    items: [
      'Team-Energie: Erledigte Aufgaben laden sie auf, lange Überfälliges zieht jede Nacht etwas ab. Bei hoher Energie gibt es mehr Münzen, unter 30 nur noch die Hälfte. Ist sie leer, ist das Wochenziel verfehlt.',
      'Wochenziel: Oben siehst du, wie viele XP ihr diese Woche gemeinsam gesammelt habt und wer wie viel beigetragen hat. Geschafft gibt es am Montag +20 Münzen.',
      'Neu unter „Quests“: jede Woche drei wechselnde Team-Aufträge mit Münz-Belohnung, deine Serie und 14 Abzeichen zum Sammeln.',
      'Deine Serie hat jetzt einen Joker: Ein verpasster Tag pro Woche reißt sie nicht ab.',
      'Neu unter „Räume“: Jeder Raum zeigt, wie sauber er gerade ist. Ein Tipp zeigt seine Aufgaben.',
      'Urlaub & Pause: Melde dich ab, dann übernehmen die anderen deine Aufgaben. Oder pausiert den ganzen Haushalt, ohne dass Energie oder Serien leiden.',
      'Montags gibt es einen Wochenrückblick, und auf der Übersicht ein neues Widget „Team“.',
    ],
  },
  {
    version: '2.3.0',
    date: '2026-11-26',
    title: 'Aufgaben als Spiel',
    items: [
      'Aufgaben haben jetzt einen eigenen Tab unten in der Leiste. Die Vorräte findest du unter „Mehr“.',
      'Wiederkehrende Aufgaben haben einen Frische-Balken statt fester Termine: grün heißt frisch, rot heißt höchste Zeit. Wer erledigt, setzt den Balken zurück.',
      'Für jede Aufgabe gibt es XP je nach Aufwand (Mini 5 bis Groß 40) und Münzen. Pünktlich erledigt gibt es +25 %, für unbeliebte Aufgaben +50 %, und wer eine überfällige Aufgabe einer anderen Person rettet, bekommt +50 %.',
      'Mit XP steigst du im Level auf. Oben siehst du dein Level, deine Tage in Folge und wie viel ihr diese Woche gemeinsam geschafft habt.',
      'Wiederkehrende Aufgaben können abwechselnd, fair (dran ist, wer diese Woche am wenigsten gemacht hat), fest oder offen verteilt werden.',
      'Aufgaben lassen sich Räumen zuordnen. Ein Startpaket mit typischen Haushaltsaufgaben hilft beim Einrichten.',
      'Versehentlich abgehakt? Im Verlauf kannst du deine Erledigungen 24 Stunden lang rückgängig machen.',
    ],
    highlights: [
      { icon: '✅', title: 'Aufgaben im Tab', text: 'Die Aufgaben sind jetzt direkt unten in der Leiste. Die Vorräte findest du unter „Mehr“.' },
      { icon: '🫧', title: 'Frische statt Termine', text: 'Jede wiederkehrende Aufgabe hat einen Balken von grün bis rot. Wer sie erledigt, setzt ihn zurück.' },
      { icon: '⭐', title: 'XP & Level', text: 'Jede Aufgabe bringt XP und Münzen. Pünktlich, unbeliebt oder gerettet gibt es einen Bonus.' },
      { icon: '🤝', title: 'Fair verteilt', text: 'Aufgaben gehen reihum oder an die Person, die diese Woche am wenigsten gemacht hat.' },
    ],
  },
  {
    version: '2.2.0',
    date: '2026-11-24',
    title: 'Benachrichtigungen',
    items: [
      'Neu in Einstellungen → Benachrichtigungen: Schalte Push-Nachrichten ein und du erfährst sofort, wenn jemand anderes im Haushalt eine Ausgabe oder Zahlung einträgt. Ein Tipp auf die Nachricht öffnet Finanzen.',
      'Der Schalter gilt pro Gerät. Auf iPhone und iPad klappt es, sobald du Magaziner zum Home-Bildschirm hinzugefügt hast (ab iOS 16.4).',
    ],
  },
  {
    version: '2.1.0',
    date: '2026-11-19',
    title: 'Schulden-Verlauf',
    items: [
      'Neu in Finanzen → Übersicht: Unter „Verlauf“ siehst du als Kurve, wie sich der Kontostand jeder Person entwickelt hat – für 3 Monate, 1 Jahr oder seit Beginn.',
      'Tippe auf die Kurve, um die Stände an einem bestimmten Tag zu sehen, und auf einen Namen, um seine Kurve aus- oder einzublenden.',
    ],
  },
  {
    version: '2.0.1',
    date: '2026-11-18',
    items: [
      'Behoben: Die Rückfrage beim Löschen einer Einkaufsliste erschien hinter dem Fenster „Listen verwalten“ und war nicht erreichbar.',
    ],
  },
  {
    version: '2.0.0',
    date: '2026-11-18',
    title: 'Magaziner 2.0',
    highlights: [
      {
        icon: '✨',
        title: 'Willkommen bei Magaziner 2.0',
        text: 'Neues Design, neue Navigation und viele Ärgernisse weniger. Hier ist das Wichtigste auf drei Seiten.',
      },
      {
        icon: '🧭',
        title: 'Alles mit dem Daumen',
        text: 'Unten findest du jetzt Übersicht, Vorräte, Einkauf und Finanzen. Aufgaben, Rezepte und Einstellungen stecken unter „Mehr“.',
      },
      {
        icon: '⚡',
        title: 'Live im ganzen Haushalt',
        text: 'Hakt jemand etwas auf der Einkaufsliste ab, siehst du es sofort. Unter „Was zuletzt passiert ist“ steht, wer was gemacht hat.',
      },
      {
        icon: '↩️',
        title: 'Rückgängig statt Rückfrage',
        text: 'Wische Einträge zum Löschen zur Seite. Vertippt? Ein Tipp auf „Rückgängig“ holt alles zurück.',
      },
    ],
    items: [
      'Neues Design mit eigener Farbwelt, neuer Schrift und Dunkelmodus, der auf Wunsch dem System folgt.',
      'Neue Navigationsleiste unten, Zurück-Pfeil auf allen Unterseiten und ein „Mehr“-Menü mit schnellem Haushaltswechsel.',
      'Einkaufsliste: Änderungen anderer erscheinen live. Einträge lassen sich bearbeiten, mit Notiz versehen, in eine andere Liste verschieben und per Wischen löschen.',
      'Einkaufsliste: Beim Tippen schlägt dir die App frühere Einträge vor. Abgehakte Einkäufe buchst du mit „In den Vorrat“ direkt ein.',
      'Aufgaben bekommen ein Fälligkeitsdatum, eine Wiederholung (täglich, wöchentlich, monatlich) und auf Wunsch eine zuständige Person. Mit „Für mich“ siehst du nur deine.',
      'Vorräte: Ein Tipp auf ein Produkt öffnet alle Details. Jede Packung hat ihr eigenes Ablauf- und Öffnungsdatum, und du kannst Produkte in einen anderen Ort verschieben.',
      'Vorräte: Filter für abgelaufen, bald fällig, geöffnet und knapp. Die Suche findet auch ohne Umlaute.',
      'Scanner: Einmal gescannte Barcodes erkennt Magaziner wieder und bietet direkt „+1 Packung“ an.',
      'Unterschreitet ein Produkt den Mindestbestand, landet es zuverlässig wieder auf der Einkaufsliste, auch wenn es dort schon einmal abgehakt war.',
      'Finanzen: Ausgaben und Zahlungen bearbeitest du im selben Schritt-Dialog wie beim Anlegen. Unter „Ausgleichen“ siehst du, wer wem wie viel überweisen sollte.',
      'Rezepte: eigene Fotos hochladen, Portionen umrechnen und sehen, welche Zutaten du schon im Vorrat hast. „Fehlende“ setzt nur den Rest auf die Liste.',
      'Dein Dashboard-Layout wird jetzt in deinem Konto gespeichert und ist auf allen Geräten gleich.',
      'Behoben: Kurz nach Mitternacht wurde manchmal das Datum vom Vortag vorausgefüllt.',
      'Behoben: Beim Haushaltswechsel konnten kurz Daten des vorherigen Haushalts aufblitzen.',
      'Mehr Sicherheit: Rezepttexte werden vor der Anzeige bereinigt.',
    ],
  },
  {
    version: '0.8.0',
    date: '2026-08-19',
    title: 'Angebote im Blick',
    items: [
      'Stellst du einem Eintrag ein Datum voran („21.08. Räucherlachs“ oder „Fr. 21.08. Kesselchips“), erkennt die Einkaufsliste das jetzt automatisch.',
      'Angebote, die erst noch kommen, stehen ausgegraut ganz unten unter „Bald im Angebot“.',
      'Ab dem Angebotstag rutscht der Eintrag nach ganz oben unter „Jetzt im Angebot“ und das Datum wird rot.',
      'Ein Datum ohne Jahr wird als das nächste Vorkommen gelesen — „05.01.“ im Dezember meint also den Januar danach.',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-08-07',
    title: 'Ausgaben durchsuchen',
    items: [
      'Der Reiter „Ausgaben“ hat jetzt eine Suchleiste: Tippe los und du findest Einträge über Titel, Notiz, Personen und Kategorie. Umlaute sind dabei egal – „Muesli“ findet auch „Müsli“.',
      'Mehrere Wörter grenzen die Suche weiter ein: „rewe mai“ zeigt nur Einträge, in denen beides vorkommt.',
      'Über das Filter-Symbol öffnest du die erweiterten Filter: Typ (Alle, Ausgaben oder Zahlungen), Kategorien inklusive „Ohne Kategorie“, Personen – wahlweise als Zahler, als Beteiligte oder egal – sowie ein Zeitraum mit Schnellauswahl („Dieser Monat“, „Letzter Monat“, „Dieses Jahr“) oder freien Von-Bis-Daten.',
      'Zusätzlich kannst du nach Betrag von–bis eingrenzen und die Liste nach Datum, Betrag oder Titel sortieren – auf- oder absteigend.',
      'Über der Liste siehst du sofort, wie viele Treffer es gibt und wie viel Geld dahintersteckt. Aktive Filter erscheinen als Chips: einzeln antippen zum Entfernen oder mit „Zurücksetzen“ alle auf einmal löschen.',
    ],
  },
  {
    version: '0.6.1',
    date: '2026-07-29',
    title: 'Aufgeräumte Einkaufsliste',
    items: [
      'Einträge der Einkaufsliste haben keinen eigenen Löschen-Button mehr – ein versehentlicher Tipper kann dir also nichts mehr wegräumen.',
      'Stattdessen entfernst du mit „Abgehakte löschen“ am Ende der Liste alle erledigten Einträge auf einmal – natürlich erst nach einer Rückfrage.',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-06-27',
    title: 'Neue Einkaufsliste',
    items: [
      'Du kannst jetzt mehrere Einkaufslisten pro Haushalt führen (z. B. „Wocheneinkauf“, „Drogerie“, „Baumarkt“) und oben per Tab zwischen ihnen wechseln.',
      'Deine Listen lassen sich per Drag & Drop in deine Wunschreihenfolge ziehen.',
      'Neue Einträge werden automatisch nach Kategorie einsortiert – so steht z. B. alles Gemüse beieinander. Über „Regale sortieren“ legst du die Reihenfolge passend zu deinem Supermarkt fest.',
      'Die Kategorie eines Eintrags kannst du jederzeit mit einem Tipp ändern.',
      'Eingabefelder werden auf dem Handy nicht mehr von der Tastatur verdeckt – das betroffene Feld rückt jetzt automatisch nach oben.',
    ],
  },
  {
    version: '0.5.1',
    date: '2026-05-30',
    title: 'Titel-Vorschläge',
    items: [
      'Beim Erfassen einer Ausgabe schlägt dir der Dialog jetzt Titel aus deinen letzten Einkäufen vor — einmal tippen genügt.',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-05-19',
    title: 'Schnellere Ausgaben',
    items: [
      'Neue Ausgaben und Zahlungen erfasst du jetzt in einem Schritt-für-Schritt-Dialog mit großen Tippzielen — perfekt für unterwegs.',
      'Neues Dashboard-Widget „Neue Ausgabe": Ein Tippen, und der Dialog ist offen.',
      'Das Dashboard zeigt jetzt auch am Desktop zwei Spalten, damit Widgets in der vorgesehenen Größe erscheinen.',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-05-18',
    title: 'Google-Login & Konto löschen',
    items: [
      'Du kannst dich jetzt mit deinem Google-Konto anmelden.',
      'In den Einstellungen kannst du dein Konto löschen — Haushalte, die dir gehören, werden mit allen Daten entfernt.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-05-18',
    title: 'Haushalte teilen',
    items: [
      'Du kannst jetzt einen Einladungslink für deinen Haushalt erstellen und an Mitbewohner:innen weitergeben.',
      'In den Einstellungen siehst du, wer Teil eines Haushalts ist — als Inhaber:in kannst du Mitglieder entfernen.',
      'Die Inhaberschaft eines Haushalts kann an ein anderes Mitglied übertragen werden.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-05-10',
    title: 'Mehrere Haushalte',
    items: [
      'Profile, Avatare und mehrere Haushalte pro Konto.',
      'Eigene Einstellungs-Seite für Anzeigename, Profilbild, Passwort und Design.',
      'Haushalte können umbenannt und gelöscht werden.',
    ],
  },
];

export const CURRENT_VERSION = changelog[0]?.version ?? '0.0.0';
