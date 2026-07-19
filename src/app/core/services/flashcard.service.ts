import { Injectable, inject } from '@angular/core';
import { DEFAULT_EASE } from '../algorithms/sm2';
import { nowIso, uid } from '../data/dataset';
import { Flashcard } from '../models';
import { MatiereService } from './matiere.service';
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
  private readonly matieres = inject(MatiereService);

  bySubject(subjectId: string): Flashcard[] {
    return this.store
      .flashcards()
      .filter((c) => c.subjectId === subjectId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /**
   * Cartes dues maintenant ou plus tôt, hors cartes suspendues.
   *
   * Sans liste explicite, le périmètre est celui de la matière active : le
   * tableau de bord ne doit jamais annoncer des cartes d'une autre matière.
   */
  due(subjectIds?: string[]): Flashcard[] {
    const limit = new Date();
    limit.setHours(23, 59, 59, 999);
    const iso = limit.toISOString();
    const perimetre = subjectIds ?? this.matieres.subjectIds();
    return this.store
      .flashcards()
      .filter((c) => !c.suspended && c.dueDate <= iso)
      .filter((c) => perimetre.includes(c.subjectId));
  }

  tagsFor(subjectId: string): string[] {
    const tags = new Set<string>();
    for (const card of this.bySubject(subjectId)) card.tags.forEach((t) => tags.add(t));
    return [...tags].sort();
  }

  create(input: FlashcardInput): void {
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
    this.store.mutate((d) => ({ ...d, flashcards: [...d.flashcards, card] }));
  }

  update(id: string, changes: Partial<Flashcard>): void {
    this.store.mutate((d) => ({
      ...d,
      flashcards: d.flashcards.map((c) =>
        c.id === id ? { ...c, ...changes, updatedAt: nowIso() } : c,
      ),
    }));
  }

  remove(id: string): void {
    this.store.mutate((d) => ({
      ...d,
      flashcards: d.flashcards.filter((c) => c.id !== id),
      reviews: d.reviews.filter((r) => r.cardId !== id),
    }));
  }

  /** Remet une carte à zéro : elle repart du début du cycle de répétition. */
  reset(id: string): void {
    this.update(id, {
      ease: DEFAULT_EASE,
      interval: 0,
      repetitions: 0,
      dueDate: nowIso(),
      lapses: 0,
    });
  }
}
