import { Injectable, inject } from '@angular/core';
import { db, nowIso, uid } from '../db/db';
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

  async create(subjectId: string, title = 'Nouvelle note'): Promise<string> {
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
    await db.notes.add(note);
    await this.store.refreshNotes();
    return note.id;
  }

  async update(id: string, changes: Partial<Note>): Promise<void> {
    await db.notes.update(id, { ...changes, updatedAt: nowIso() });
    await this.store.refreshNotes();
  }

  async remove(id: string): Promise<void> {
    await db.notes.delete(id);
    await this.store.refreshNotes();
  }
}
