import { Flashcard, Rating } from '../models';
import { addDays } from './dates';

export const MIN_EASE = 1.3;
export const MAX_EASE = 2.8;
export const DEFAULT_EASE = 2.5;

export interface Sm2Result {
  ease: number;
  interval: number;
  repetitions: number;
  dueDate: string;
  lapses: number;
}

/**
 * SM-2 simplifié à trois notes.
 *
 *   raté      → repetitions remises à zéro, carte replanifiée dans la session même
 *   difficile → intervalle allongé de 20 % seulement
 *   facile    → 1 jour, puis 3 jours, puis intervalle × facilité
 */
export function applySm2(card: Flashcard, rating: Rating, now: Date = new Date()): Sm2Result {
  let ease = card.ease;
  let interval = card.interval;
  let repetitions = card.repetitions;
  let lapses = card.lapses;

  switch (rating) {
    case 'again':
      ease -= 0.2;
      repetitions = 0;
      interval = 0;
      lapses += 1;
      break;
    case 'hard':
      ease -= 0.15;
      repetitions += 1;
      interval = Math.max(1, Math.round(interval * 1.2));
      break;
    case 'easy':
      ease += 0.1;
      repetitions += 1;
      if (repetitions === 1) interval = 1;
      else if (repetitions === 2) interval = 3;
      else interval = Math.max(1, Math.round(interval * ease));
      break;
  }

  ease = Math.min(MAX_EASE, Math.max(MIN_EASE, Number(ease.toFixed(2))));

  // Une carte ratée revient en fin de session : elle reste due aujourd'hui.
  const dueDate = interval === 0 ? now.toISOString() : addDays(now, interval).toISOString();

  return { ease, interval, repetitions, dueDate, lapses };
}

/** Aperçu du prochain intervalle, affiché sur les boutons de notation. */
export function previewInterval(card: Flashcard, rating: Rating): string {
  const { interval } = applySm2(card, rating);
  if (interval === 0) return '< 1 min';
  if (interval === 1) return '1 j';
  if (interval < 30) return `${interval} j`;
  const months = Math.round(interval / 30);
  return `${months} mois`;
}
