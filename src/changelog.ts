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
