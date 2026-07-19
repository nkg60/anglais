import { Injectable, computed, inject } from '@angular/core';
import { addDays, daysBetween, todayKey } from '../algorithms/dates';
import { MasteryBreakdown, computeMastery } from '../algorithms/mastery';
import { computeStreak } from '../algorithms/streak';
import { PERRIO_PHASES, PhaseStatus } from '../models';
import { FlashcardService } from './flashcard.service';
import { MatiereService } from './matiere.service';
import { NoteService } from './note.service';
import { PrimingService } from './priming.service';
import { StoreService } from './store.service';

export interface DailyPoint {
  day: string;
  label: string;
  total: number;
  correct: number;
  rate: number;
}

export interface WeeklyPoint {
  label: string;
  sessions: number;
  cards: number;
}

/** Seuils au-delà desquels une phase PERRIO est considérée comme amorcée. */
const MIN_CARDS_FOR_REFERENCE = 3;

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly store = inject(StoreService);
  private readonly flashcards = inject(FlashcardService);
  private readonly notes = inject(NoteService);
  private readonly primings = inject(PrimingService);
  private readonly matieres = inject(MatiereService);

  /** Périmètre courant : les sujets de la matière active. */
  private readonly perimetre = computed(() => new Set(this.matieres.subjectIds()));

  /** Cartes de la matière active. */
  private readonly cartes = computed(() =>
    this.store.flashcards().filter((c) => this.perimetre().has(c.subjectId)),
  );

  /** Révisions de la matière active. */
  private readonly revisions = computed(() =>
    this.store.reviews().filter((r) => this.perimetre().has(r.subjectId)),
  );

  /** Sessions ayant porté sur au moins un sujet de la matière active. */
  private readonly seances = computed(() =>
    this.store.sessions().filter((s) => s.subjectIds.some((id) => this.perimetre().has(id))),
  );

  readonly streak = computed(() => computeStreak(this.seances()));

  readonly dueToday = computed(() => this.flashcards.due().length);

  readonly totalCards = computed(() => this.cartes().length);

  readonly totalReviews = computed(() => this.revisions().length);

  mastery(subjectId: string): MasteryBreakdown {
    return computeMastery(
      this.flashcards.bySubject(subjectId),
      this.store.reviews().filter((r) => r.subjectId === subjectId),
      this.store.sessions().filter((s) => s.subjectIds.includes(subjectId)),
    );
  }

  globalMastery(): MasteryBreakdown {
    return computeMastery(this.cartes(), this.revisions(), this.seances());
  }

  dueCount(subjectId: string): number {
    return this.flashcards.due([subjectId]).length;
  }

  /** État des 6 phases PERRIO pour un sujet donné. */
  phases(subjectId: string): PhaseStatus[] {
    const cards = this.flashcards.bySubject(subjectId);
    const notes = this.notes.bySubject(subjectId);
    const primings = this.primings.bySubject(subjectId);
    const reviews = this.store.reviews().filter((r) => r.subjectId === subjectId);
    const mixed = this.store
      .sessions()
      .filter((s) => s.mode === 'interleaving' && s.subjectIds.includes(subjectId));
    const { mastered, mastery } = this.mastery(subjectId);

    const details: Record<string, PhaseStatus> = {
      priming: {
        key: 'priming',
        done: primings.length > 0,
        detail: primings.length ? `${primings.length} amorçage(s)` : 'Aucun amorçage',
      },
      encoding: {
        key: 'encoding',
        done: notes.length > 0,
        detail: notes.length ? `${notes.length} note(s)` : 'Aucune note',
      },
      reference: {
        key: 'reference',
        done: cards.length >= MIN_CARDS_FOR_REFERENCE,
        detail: cards.length ? `${cards.length} carte(s)` : 'Aucune carte',
      },
      retrieval: {
        key: 'retrieval',
        done: reviews.length > 0,
        detail: reviews.length ? `${reviews.length} révision(s)` : 'Jamais révisé',
      },
      interleaving: {
        key: 'interleaving',
        done: mixed.length > 0,
        detail: mixed.length ? `${mixed.length} session(s) mixte(s)` : 'Aucune session mixte',
      },
      overlearning: {
        key: 'overlearning',
        done: mastered,
        detail: `Maîtrise ${mastery} %`,
      },
    };

    return PERRIO_PHASES.map((p) => details[p.key]);
  }

  /** Taux de réussite jour par jour sur les N derniers jours. */
  retentionCurve(days = 30): DailyPoint[] {
    const points: DailyPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = addDays(new Date(), -i);
      const key = todayKey(date);
      const dayReviews = this.revisions().filter(
        (r) => todayKey(new Date(r.reviewedAt)) === key,
      );
      const correct = dayReviews.filter((r) => r.rating !== 'again').length;
      points.push({
        day: key,
        label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        total: dayReviews.length,
        correct,
        rate: dayReviews.length ? Math.round((correct / dayReviews.length) * 100) : 0,
      });
    }
    return points;
  }

  /** Sessions et cartes révisées par semaine sur les N dernières semaines. */
  weeklyActivity(weeks = 8): WeeklyPoint[] {
    const points: WeeklyPoint[] = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const end = addDays(new Date(), -i * 7);
      const start = addDays(end, -6);
      const inRange = this.seances().filter((s) => {
        const d = new Date(s.startedAt);
        return daysBetween(d, start) >= 0 && daysBetween(end, d) >= 0;
      });
      points.push({
        label: start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        sessions: inRange.length,
        cards: inRange.reduce((sum, s) => sum + s.cardsReviewed, 0),
      });
    }
    return points;
  }

  /** Répartition des cartes par état d'ancrage mémoriel. */
  cardDistribution() {
    const cards = this.cartes();
    return {
      nouvelles: cards.filter((c) => c.repetitions === 0).length,
      apprentissage: cards.filter((c) => c.repetitions > 0 && c.interval < 21).length,
      ancrees: cards.filter((c) => c.interval >= 21).length,
    };
  }
}
