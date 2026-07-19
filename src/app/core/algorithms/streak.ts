import { StudySession } from '../models';
import { addDays, todayKey } from './dates';

export interface StreakInfo {
  current: number;
  longest: number;
  studiedToday: boolean;
}

/**
 * Série de jours consécutifs étudiés. La série reste vivante si l'utilisateur
 * a étudié hier mais pas encore aujourd'hui.
 */
export function computeStreak(sessions: StudySession[]): StreakInfo {
  const days = new Set(sessions.map((s) => todayKey(new Date(s.startedAt))));
  const today = todayKey();
  const studiedToday = days.has(today);

  let current = 0;
  let cursor = studiedToday ? new Date() : addDays(new Date(), -1);
  while (days.has(todayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    const expected = previous ? todayKey(addDays(new Date(`${previous}T12:00:00`), 1)) : null;
    run = expected === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }

  return { current, longest, studiedToday };
}
