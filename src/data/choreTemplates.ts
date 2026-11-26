import type { Effort } from '../utils/game';

/** Starter set offered on first open of Aufgaben (and via „Aus Vorlagen“). */

export interface ChoreTemplate {
  title: string;
  interval: number;
  effort: Effort;
  unpopular?: boolean;
}

export interface AreaTemplate {
  name: string;
  emoji: string;
  chores: ChoreTemplate[];
}

export const AREA_TEMPLATES: AreaTemplate[] = [
  {
    name: 'Küche',
    emoji: '🍳',
    chores: [
      { title: 'Spülmaschine ausräumen', interval: 1, effort: 'mini' },
      { title: 'Arbeitsflächen abwischen', interval: 2, effort: 'mini' },
      { title: 'Herd putzen', interval: 7, effort: 'small' },
      { title: 'Kühlschrank aufräumen', interval: 14, effort: 'medium' },
      { title: 'Backofen reinigen', interval: 60, effort: 'large', unpopular: true },
    ],
  },
  {
    name: 'Bad',
    emoji: '🛁',
    chores: [
      { title: 'Waschbecken & Spiegel', interval: 4, effort: 'small' },
      { title: 'Toilette putzen', interval: 7, effort: 'small', unpopular: true },
      { title: 'Dusche/Badewanne putzen', interval: 7, effort: 'medium', unpopular: true },
      { title: 'Handtücher wechseln', interval: 7, effort: 'mini' },
      { title: 'Bad wischen', interval: 14, effort: 'medium' },
    ],
  },
  {
    name: 'Wohnzimmer',
    emoji: '🛋️',
    chores: [
      { title: 'Aufräumen', interval: 2, effort: 'small' },
      { title: 'Staubsaugen', interval: 7, effort: 'medium' },
      { title: 'Staub wischen', interval: 14, effort: 'small' },
      { title: 'Pflanzen gießen', interval: 5, effort: 'mini' },
    ],
  },
  {
    name: 'Schlafzimmer',
    emoji: '🛏️',
    chores: [
      { title: 'Bettwäsche wechseln', interval: 14, effort: 'medium' },
      { title: 'Staubsaugen', interval: 7, effort: 'small' },
      { title: 'Kleiderschrank ausmisten', interval: 90, effort: 'large' },
    ],
  },
  {
    name: 'Flur',
    emoji: '🚪',
    chores: [
      { title: 'Schuhe wegräumen', interval: 3, effort: 'mini' },
      { title: 'Boden wischen', interval: 14, effort: 'small' },
    ],
  },
  {
    name: 'Allgemein',
    emoji: '🏠',
    chores: [
      { title: 'Müll rausbringen', interval: 3, effort: 'mini', unpopular: true },
      { title: 'Altpapier wegbringen', interval: 14, effort: 'small' },
      { title: 'Wäsche waschen', interval: 3, effort: 'small' },
      { title: 'Wäsche zusammenlegen', interval: 3, effort: 'small', unpopular: true },
      { title: 'Fenster putzen', interval: 90, effort: 'large', unpopular: true },
      { title: 'Böden wischen', interval: 14, effort: 'medium' },
    ],
  },
];

export const AREA_EMOJIS = ['🍳', '🛁', '🛋️', '🛏️', '🚪', '🏠', '🧺', '🌿', '🚗', '🐾', '🧸', '💻', '🧹', '🗑️'];
