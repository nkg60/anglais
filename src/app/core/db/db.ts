import Dexie, { Table } from 'dexie';
import { Flashcard, Note, Priming, Review, StudySession, Subject } from '../models';

/** Base locale du navigateur. Le schéma est volontairement relationnel. */
export class PerrioDb extends Dexie {
  subjects!: Table<Subject, string>;
  primings!: Table<Priming, string>;
  notes!: Table<Note, string>;
  flashcards!: Table<Flashcard, string>;
  reviews!: Table<Review, string>;
  sessions!: Table<StudySession, string>;

  constructor() {
    super('perrio');
    this.version(1).stores({
      subjects: 'id, name, archived, createdAt',
      primings: 'id, subjectId, createdAt',
      notes: 'id, subjectId, updatedAt',
      flashcards: 'id, subjectId, dueDate, [subjectId+dueDate], suspended, *tags',
      reviews: 'id, cardId, subjectId, sessionId, reviewedAt',
      sessions: 'id, mode, startedAt',
    });
  }
}

export const db = new PerrioDb();

export function uid(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
