import { Injectable, computed, inject, signal } from '@angular/core';
import { applySm2 } from '../algorithms/sm2';
import { db, nowIso, uid } from '../db/db';
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

  readonly progress = computed(() => {
    const total = this.initialTotal();
    return total === 0 ? 0 : Math.round((this.reviewedCount() / total) * 100);
  });

  /** Démarre une session. Renvoie false si aucune carte n'est due. */
  async start(mode: SessionMode, subjectIds: string[]): Promise<boolean> {
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
    await db.sessions.add(session);
    await this.store.refreshSessions();

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

  async rate(rating: Rating): Promise<void> {
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

    await db.transaction('rw', db.flashcards, db.reviews, db.sessions, async () => {
      await db.flashcards.update(card.id, {
        ease: result.ease,
        interval: result.interval,
        repetitions: result.repetitions,
        dueDate: result.dueDate,
        lapses: result.lapses,
        lastReviewedAt: nowIso(),
        totalReviews: card.totalReviews + 1,
        correctReviews: card.correctReviews + (rating === 'again' ? 0 : 1),
        updatedAt: nowIso(),
      });
      await db.reviews.add(review);
      await db.sessions.update(sessionId, {
        cardsReviewed: this.reviewedCount() + 1,
        correctCount: this.correctCount() + (rating === 'again' ? 0 : 1),
      });
    });

    this.reviewedCount.update((n) => n + 1);
    if (rating === 'again') {
      this.againCount.update((n) => n + 1);
      // La carte ratée repasse en fin de file : elle doit être revue aujourd'hui.
      this.queue.update((q) => [...q.slice(1), card.id]);
    } else {
      this.correctCount.update((n) => n + 1);
      this.queue.update((q) => q.slice(1));
    }
    this.revealed.set(false);

    await this.store.refreshFlashcards();
    await this.store.refreshReviews();
    if (!this.queue().length) await this.finish();
  }

  /** Repousse la carte courante sans la noter. */
  skip(): void {
    this.queue.update((q) => (q.length > 1 ? [...q.slice(1), q[0]] : q));
    this.revealed.set(false);
  }

  async finish(): Promise<void> {
    const sessionId = this.sessionId();
    if (sessionId) {
      await db.sessions.update(sessionId, { endedAt: nowIso() });
      await this.store.refreshSessions();
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
