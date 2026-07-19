import { Injectable, inject } from '@angular/core';
import { nowIso, uid } from '../data/dataset';
import { Subject } from '../models';
import { StoreService } from './store.service';

export const SUBJECT_COLORS = [
  '#4f7cff',
  '#16a37f',
  '#e0673d',
  '#8b5cf6',
  '#d94f7a',
  '#0ea5b7',
];

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private readonly store = inject(StoreService);

  byId(id: string): Subject | undefined {
    return this.store.subjects().find((s) => s.id === id);
  }

  create(data: Pick<Subject, 'matiereId' | 'name' | 'description' | 'color' | 'icon'>): string {
    const subject: Subject = {
      id: uid(),
      ...data,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      archived: false,
    };
    this.store.mutate((d) => ({ ...d, subjects: [...d.subjects, subject] }));
    return subject.id;
  }

  update(id: string, changes: Partial<Subject>): void {
    this.store.mutate((d) => ({
      ...d,
      subjects: d.subjects.map((s) =>
        s.id === id ? { ...s, ...changes, updatedAt: nowIso() } : s,
      ),
    }));
  }

  /** Supprime le sujet et tout ce qui en dépend. */
  remove(id: string): void {
    this.store.mutate((d) => {
      const cardIds = new Set(d.flashcards.filter((c) => c.subjectId === id).map((c) => c.id));
      return {
        matieres: d.matieres,
        subjects: d.subjects.filter((s) => s.id !== id),
        notes: d.notes.filter((n) => n.subjectId !== id),
        primings: d.primings.filter((p) => p.subjectId !== id),
        flashcards: d.flashcards.filter((c) => c.subjectId !== id),
        reviews: d.reviews.filter((r) => !cardIds.has(r.cardId) && r.subjectId !== id),
        sessions: d.sessions,
      };
    });
  }
}
