import { Injectable, inject } from '@angular/core';
import { nowIso, uid } from '../data/dataset';
import { Note } from '../models';
import { StoreService } from './store.service';

@Injectable({ providedIn: 'root' })
export class NoteService {
  private readonly store = inject(StoreService);

  bySubject(subjectId: string): Note[] {
    return this.store
      .notes()
      .filter((n) => n.subjectId === subjectId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  byId(id: string): Note | undefined {
    return this.store.notes().find((n) => n.id === id);
  }

  create(subjectId: string, title = 'Nouvelle note'): string {
    const note: Note = {
      id: uid(),
      subjectId,
      title,
      groupings: [],
      simplification: '',
      analogies: [],
      connections: [],
      intuition: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.store.mutate((d) => ({ ...d, notes: [...d.notes, note] }));
    return note.id;
  }

  update(id: string, changes: Partial<Note>): void {
    this.store.mutate((d) => ({
      ...d,
      notes: d.notes.map((n) => (n.id === id ? { ...n, ...changes, updatedAt: nowIso() } : n)),
    }));
  }

  remove(id: string): void {
    this.store.mutate((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }));
  }
}
