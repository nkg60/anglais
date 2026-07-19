import { Injectable, inject } from '@angular/core';
import { DEFAULT_EASE } from '../algorithms/sm2';
import { db, nowIso, uid } from '../db/db';
import { Flashcard } from '../models';
import { StoreService } from './store.service';

export interface FlashcardInput {
  subjectId: string;
  front: string;
  back: string;
  tags: string[];
}

@Injectable({ providedIn: 'root' })
export class FlashcardService {
  private readonly store = inject(StoreService);

  bySubject(subjectId: string): Flashcard[] {
    return this.store
      .flashcards()
      .filter((c) => c.subjectId === subjectId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /** Cartes dues maintenant ou plus tôt, hors cartes suspendues. */
  due(subjectIds?: string[]): Flashcard[] {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const limit = now.toISOString();
    return this.store
      .flashcards()
      .filter((c) => !c.suspended && c.dueDate <= limit)
      .filter((c) => !subjectIds || subjectIds.includes(c.subjectId));
  }

  tagsFor(subjectId: string): string[] {
    const tags = new Set<string>();
    for (const card of this.bySubject(subjectId)) card.tags.forEach((t) => tags.add(t));
    return [...tags].sort();
  }

  async create(input: FlashcardInput): Promise<void> {
    const card: Flashcard = {
      id: uid(),
      ...input,
      ease: DEFAULT_EASE,
      interval: 0,
      repetitions: 0,
      dueDate: nowIso(),
      lapses: 0,
      lastReviewedAt: null,
      totalReviews: 0,
      correctReviews: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      suspended: false,
    };
    await db.flashcards.add(card);
    await this.store.refreshFlashcards();
  }

  async update(id: string, changes: Partial<Flashcard>): Promise<void> {
    await db.flashcards.update(id, { ...changes, updatedAt: nowIso() });
    await this.store.refreshFlashcards();
  }

  async remove(id: string): Promise<void> {
    await db.transaction('rw', db.flashcards, db.reviews, async () => {
      await db.reviews.where('cardId').equals(id).delete();
      await db.flashcards.delete(id);
    });
    await this.store.refreshFlashcards();
    await this.store.refreshReviews();
  }

  /** Remet une carte à zéro : elle repart du début du cycle de répétition. */
  async reset(id: string): Promise<void> {
    await this.update(id, {
      ease: DEFAULT_EASE,
      interval: 0,
      repetitions: 0,
      dueDate: nowIso(),
      lapses: 0,
    });
  }
}
