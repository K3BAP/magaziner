/**
 * UI texts for quests and badges. The rules (targets, conditions, rewards) live
 * in SQL (`private.draw_quests`, `private.quest_progress`, `private.award_badges`).
 */

export interface QuestText {
  emoji: string;
  title: string;
  /** `{n}` = target, `{room}` = room name. */
  text: string;
}

export const QUESTS: Record<string, QuestText> = {
  rescue: { emoji: '🦸', title: 'Rettungsdienst', text: 'Rettet {n} überfällige Aufgaben.' },
  early_bird: { emoji: '🌅', title: 'Frühaufsteher', text: 'Erledigt {n} Aufgaben vor 9 Uhr.' },
  big_cleanup: { emoji: '🧽', title: 'Großputz', text: 'Erledigt {n} große Aufgaben.' },
  unloved: { emoji: '😖', title: 'Ungeliebtes zuerst', text: 'Erledigt {n} unbeliebte Aufgaben.' },
  everyone: { emoji: '🤝', title: 'Teamwork', text: 'Jede Person erledigt mindestens {n} Aufgaben.' },
  room_shine: { emoji: '✨', title: 'Auf Hochglanz', text: 'Bringt {room} komplett auf Grün.' },
  no_red: { emoji: '🟢', title: 'Alles im Griff', text: 'Zum Wochenende ist nichts überfällig.' },
  swap: { emoji: '🔁', title: 'Tauschbörse', text: 'Übernehmt {n}× eine Aufgabe, die nicht eure war.' },
  streak_team: { emoji: '📆', title: 'Gemeinsam dran', text: 'An {n} Tagen erledigt jede Person etwas.' },
  kudos: { emoji: '👏', title: 'Danke sagen', text: 'Verteilt {n} Kudos.' },
};

export function questText(key: string, target: number, roomName?: string | null): QuestText {
  const q = QUESTS[key] ?? { emoji: '⭐', title: key, text: '' };
  return { ...q, text: q.text.replace('{n}', String(target)).replace('{room}', roomName ? `„${roomName}“` : 'einen Raum') };
}

export interface BadgeText {
  emoji: string;
  title: string;
  how: string;
}

/** Display order of the badge grid. */
export const BADGES: [string, BadgeText][] = [
  ['first_chore', { emoji: '🌱', title: 'Erste Aufgabe', how: 'Erledige deine erste Aufgabe.' }],
  ['chores_50', { emoji: '🥉', title: '50 Aufgaben', how: 'Erledige 50 Aufgaben.' }],
  ['chores_250', { emoji: '🥈', title: '250 Aufgaben', how: 'Erledige 250 Aufgaben.' }],
  ['chores_1000', { emoji: '🥇', title: '1000 Aufgaben', how: 'Erledige 1000 Aufgaben.' }],
  ['streak_7', { emoji: '🔥', title: 'Eine Woche dran', how: '7 Tage in Folge etwas erledigt (+10 🪙).' }],
  ['streak_30', { emoji: '🌋', title: 'Ein Monat dran', how: '30 Tage in Folge (+50 🪙).' }],
  ['streak_100', { emoji: '☄️', title: '100 Tage dran', how: '100 Tage in Folge (+150 🪙).' }],
  ['rescuer', { emoji: '🦸', title: 'Retter in der Not', how: '10 überfällige Aufgaben gerettet.' }],
  ['early_bird', { emoji: '🌅', title: 'Frühaufsteher', how: '20 Aufgaben vor 9 Uhr.' }],
  ['night_owl', { emoji: '🦉', title: 'Nachteule', how: '20 Aufgaben nach 22 Uhr.' }],
  ['unloved_hero', { emoji: '😤', title: 'Ungeliebtes-Held', how: '25 unbeliebte Aufgaben erledigt.' }],
  ['teamplayer', { emoji: '🤝', title: 'Teamplayer', how: '4 Wochenziele in Folge geschafft.' }],
  ['quest_master', { emoji: '🗺️', title: 'Questmeister', how: 'Der Haushalt hat 25 Quests geschafft.' }],
  ['allrounder', { emoji: '🧭', title: 'Allrounder', how: 'In mindestens 3 Räumen je 10 Aufgaben.' }],
];

export const BADGE_MAP: Record<string, BadgeText> = Object.fromEntries(BADGES);

export interface EnergyMood {
  emoji: string;
  label: string;
  hint: string;
  tone: string;
}

/** Hausgeist mood and coin effect for a team energy value (see `complete_chore`). */
export function energyMood(energy: number): EnergyMood {
  if (energy >= 80) return { emoji: '😄', label: 'Hochform', hint: 'Münzen × 1,2', tone: 'bg-success' };
  if (energy >= 50) return { emoji: '🙂', label: 'Gut drauf', hint: 'Normale Münzen', tone: 'bg-success' };
  if (energy >= 30) return { emoji: '😐', label: 'Geht so', hint: 'Unter 30 gibt es nur halbe Münzen', tone: 'bg-warning' };
  if (energy > 0) return { emoji: '😩', label: 'Erschöpft', hint: 'Münzen × 0,5', tone: 'bg-error' };
  return { emoji: '😵', label: 'Am Ende', hint: 'Wochenziel diese Woche verfehlt', tone: 'bg-error' };
}
