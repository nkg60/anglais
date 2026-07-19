import { Injectable, inject } from '@angular/core';
import { db, nowIso, uid } from '../db/db';
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

  async create(data: Pick<Subject, 'name' | 'description' | 'color' | 'icon'>): Promise<string> {
    const subject: Subject = {
      id: uid(),
      ...data,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      archived: false,
    };
    await db.subjects.add(subject);
    await this.store.refreshSubjects();
    return subject.id;
  }

  async update(id: string, changes: Partial<Subject>): Promise<void> {
    await db.subjects.update(id, { ...changes, updatedAt: nowIso() });
    await this.store.refreshSubjects();
  }

  /** Supprime le sujet et tout ce qui en dépend. */
  async remove(id: string): Promise<void> {
    await db.transaction(
      'rw',
      db.subjects,
      db.flashcards,
      db.notes,
      db.primings,
      db.reviews,
      async () => {
        await db.flashcards.where('subjectId').equals(id).delete();
        await db.notes.where('subjectId').equals(id).delete();
        await db.primings.where('subjectId').equals(id).delete();
        await db.reviews.where('subjectId').equals(id).delete();
        await db.subjects.delete(id);
      },
    );
    await this.store.refreshAll();
  }
}
