/** Utilitaires de dates : tout est manipulé en jours locaux. */

export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function startOfDay(date: Date = new Date()): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Nombre de jours entiers séparant deux dates (a - b). */
export function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / 86_400_000);
}

/** Fin de journée courante en ISO : borne haute des cartes « dues aujourd'hui ». */
export function endOfTodayIso(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function formatRelative(iso: string): string {
  const diff = daysBetween(new Date(iso), new Date());
  if (diff < 0) return 'en retard';
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return 'demain';
  if (diff < 30) return `dans ${diff} jours`;
  const months = Math.round(diff / 30);
  return months === 1 ? 'dans 1 mois' : `dans ${months} mois`;
}
