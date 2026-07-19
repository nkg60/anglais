import { Flashcard, Review, StudySession } from '../models';
import { daysBetween, todayKey } from './dates';

export const MASTERY_THRESHOLD = 85;
export const MIN_CARDS_FOR_BADGE = 10;
export const MIN_SESSIONS_FOR_BADGE = 3;
/** Intervalle à partir duquel une carte est considérée comme ancrée en mémoire. */
export const COVERAGE_INTERVAL_DAYS = 21;

export interface MasteryBreakdown {
  successRate: number;
  coverage: number;
  regularity: number;
  mastery: number;
  mastered: boolean;
}

/**
 * Indicateur de maîtrise 0–100 %, pondéré :
 *   55 % réussite sur les 20 dernières révisions
 *   30 % couverture (cartes ayant atteint 21 jours d'intervalle)
 *   15 % régularité (jours étudiés sur les 14 derniers)
 */
export function computeMastery(
  cards: Flashcard[],
  reviews: Review[],
  sessions: StudySession[],
): MasteryBreakdown {
  const recent = [...reviews]
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))
    .slice(0, 20);

  const successRate = recent.length
    ? recent.filter((r) => r.rating !== 'again').length / recent.length
    : 0;

  const coverage = cards.length
    ? cards.filter((c) => c.interval >= COVERAGE_INTERVAL_DAYS).length / cards.length
    : 0;

  const studiedDays = new Set(
    sessions
      .filter((s) => daysBetween(new Date(), new Date(s.startedAt)) < 14)
      .map((s) => todayKey(new Date(s.startedAt))),
  );
  const regularity = Math.min(1, studiedDays.size / 7);

  const mastery = Math.round((successRate * 0.55 + coverage * 0.3 + regularity * 0.15) * 100);

  return {
    successRate: Math.round(successRate * 100),
    coverage: Math.round(coverage * 100),
    regularity: Math.round(regularity * 100),
    mastery,
    mastered:
      mastery >= MASTERY_THRESHOLD &&
      cards.length >= MIN_CARDS_FOR_BADGE &&
      sessions.length >= MIN_SESSIONS_FOR_BADGE,
  };
}
