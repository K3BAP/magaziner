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
}

export const changelog: ChangelogEntry[] = [
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
