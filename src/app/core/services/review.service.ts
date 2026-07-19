import { Injectable, computed, inject, signal } from '@angular/core';
import { applySm2 } from '../algorithms/sm2';
import { nowIso, uid } from '../data/dataset';
import { Flashcard, Rating, Review, SessionMode, StudySession } from '../models';
import { FlashcardService } from './flashcard.service';
import { StoreService } from './store.service';

export interface SessionSummary {
  total: number;
  correct: number;
  again: number;
  mode: SessionMode;
  subjectIds: string[];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Entrelacement : on tire à tour de rôle dans chaque sujet pour qu'aucun bloc
 * de cartes du même sujet ne se suive.
 */
function interleave(cards: Flashcard[]): Flashcard[] {
  const buckets = new Map<string, Flashcard[]>();
  for (const card of shuffle(cards)) {
    const bucket = buckets.get(card.subjectId) ?? [];
    bucket.push(card);
    buckets.set(card.subjectId, bucket);
  }
  const result: Flashcard[] = [];
  const lists = [...buckets.values()];
  while (lists.some((l) => l.length)) {
    for (const list of lists) {
      const card = list.shift();
      if (card) result.push(card);
    }
  }
  return result;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly store = inject(StoreService);
  private readonly flashcards = inject(FlashcardService);

  private readonly queue = signal<string[]>([]);
  private readonly sessionId = signal<string | null>(null);
  private readonly mode = signal<SessionMode>('retrieval');
  private readonly subjectIds = signal<string[]>([]);

  readonly revealed = signal(false);
  readonly reviewedCount = signal(0);
  readonly correctCount = signal(0);
  readonly againCount = signal(0);
  readonly initialTotal = signal(0);

  readonly active = computed(() => this.sessionId() !== null);
  readonly remaining = computed(() => this.queue().length);

  readonly currentCard = computed<Flashcard | null>(() => {
    const id = this.queue()[0];
    if (!id) return null;
    return this.store.flashcards().find((c) => c.id === id) ?? null;
  });

  /**
   * Cartes définitivement terminées : celles qui ont quitté la file.
   *
   * Distinct de `reviewedCount`, qui compte les notations — une carte ratée en
   * reçoit plusieurs et ferait dépasser le total affiché.
   */
  readonly completedCount = computed(() =>
    Math.max(0, this.initialTotal() - this.queue().length),
  );

  readonly progress = computed(() => {
    const total = this.initialTotal();
    return total === 0 ? 0 : Math.round((this.completedCount() / total) * 100);
  });

  /** Démarre une session. Renvoie false si aucune carte n'est due. */
  start(mode: SessionMode, subjectIds: string[]): boolean {
    const due = this.flashcards.due(subjectIds.length ? subjectIds : undefined);
    if (!due.length) return false;

    const ordered = mode === 'interleaving' ? interleave(due) : shuffle(due);
    const session: StudySession = {
      id: uid(),
      mode,
      subjectIds,
      startedAt: nowIso(),
      endedAt: null,
      cardsReviewed: 0,
      correctCount: 0,
    };
    this.store.mutate((d) => ({ ...d, sessions: [...d.sessions, session] }));

    this.sessionId.set(session.id);
    this.mode.set(mode);
    this.subjectIds.set(subjectIds);
    this.queue.set(ordered.map((c) => c.id));
    this.initialTotal.set(ordered.length);
    this.reviewedCount.set(0);
    this.correctCount.set(0);
    this.againCount.set(0);
    this.revealed.set(false);
    return true;
  }

  reveal(): void {
    this.revealed.set(true);
  }

  rate(rating: Rating): void {
    const card = this.currentCard();
    const sessionId = this.sessionId();
    if (!card || !sessionId) return;

    const result = applySm2(card, rating);
    const review: Review = {
      id: uid(),
      cardId: card.id,
      subjectId: card.subjectId,
      sessionId,
      rating,
      reviewedAt: nowIso(),
      intervalBefore: card.interval,
      intervalAfter: result.interval,
      easeAfter: result.ease,
    };

    const reviewed = this.reviewedCount() + 1;
    const correct = this.correctCount() + (rating === 'again' ? 0 : 1);

    this.store.mutate((d) => ({
      ...d,
      flashcards: d.flashcards.map((c) =>
        c.id === card.id
          ? {
              ...c,
              ease: result.ease,
              interval: result.interval,
              repetitions: result.repetitions,
              dueDate: result.dueDate,
              lapses: result.lapses,
              lastReviewedAt: nowIso(),
              totalReviews: c.totalReviews + 1,
              correctReviews: c.correctReviews + (rating === 'again' ? 0 : 1),
              updatedAt: nowIso(),
            }
          : c,
      ),
      reviews: [...d.reviews, review],
      sessions: d.sessions.map((s) =>
        s.id === sessionId ? { ...s, cardsReviewed: reviewed, correctCount: correct } : s,
      ),
    }));

    this.reviewedCount.set(reviewed);
    if (rating === 'again') {
      this.againCount.update((n) => n + 1);
      // La carte ratée repasse en fin de file : elle doit être revue aujourd'hui.
      this.queue.update((q) => [...q.slice(1), card.id]);
    } else {
      this.correctCount.set(correct);
      this.queue.update((q) => q.slice(1));
    }
    this.revealed.set(false);

    if (!this.queue().length) this.finish();
  }

  /** Repousse la carte courante sans la noter. */
  skip(): void {
    this.queue.update((q) => (q.length > 1 ? [...q.slice(1), q[0]] : q));
    this.revealed.set(false);
  }

  finish(): void {
    const sessionId = this.sessionId();
    if (sessionId) {
      this.store.mutate((d) => ({
        ...d,
        sessions: d.sessions.map((s) => (s.id === sessionId ? { ...s, endedAt: nowIso() } : s)),
      }));
      // Fin de session : on n'attend pas le regroupement des écritures.
      void this.store.flush();
    }
    this.queue.set([]);
    this.sessionId.set(null);
  }

  summary(): SessionSummary {
    return {
      total: this.reviewedCount(),
      correct: this.correctCount(),
      again: this.againCount(),
      mode: this.mode(),
      subjectIds: this.subjectIds(),
    };
  }
}
