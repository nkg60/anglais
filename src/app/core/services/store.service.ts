import { Injectable, signal } from '@angular/core';
import { db } from '../db/db';
import { seedIfEmpty } from '../db/seed';
import { Flashcard, Note, Priming, Review, StudySession, Subject } from '../models';

/**
 * Cache mémoire de toute la base. Les volumes en jeu (quelques milliers de
 * lignes au plus) tiennent largement en RAM : les écrans lisent des signals
 * synchrones, les services écrivent dans IndexedDB puis rafraîchissent ici.
 */
@Injectable({ providedIn: 'root' })
export class StoreService {
  readonly subjects = signal<Subject[]>([]);
  readonly flashcards = signal<Flashcard[]>([]);
  readonly notes = signal<Note[]>([]);
  readonly primings = signal<Priming[]>([]);
  readonly reviews = signal<Review[]>([]);
  readonly sessions = signal<StudySession[]>([]);
  readonly ready = signal(false);

  async init(): Promise<void> {
    await seedIfEmpty();
    await this.refreshAll();
    this.ready.set(true);
  }

  async refreshAll(): Promise<void> {
    const [subjects, flashcards, notes, primings, reviews, sessions] = await Promise.all([
      db.subjects.toArray(),
      db.flashcards.toArray(),
      db.notes.toArray(),
      db.primings.toArray(),
      db.reviews.toArray(),
      db.sessions.toArray(),
    ]);
    this.subjects.set(subjects.sort((a, b) => a.name.localeCompare(b.name)));
    this.flashcards.set(flashcards);
    this.notes.set(notes);
    this.primings.set(primings);
    this.reviews.set(reviews);
    this.sessions.set(sessions);
  }

  async refreshSubjects(): Promise<void> {
    const rows = await db.subjects.toArray();
    this.subjects.set(rows.sort((a, b) => a.name.localeCompare(b.name)));
  }

  async refreshFlashcards(): Promise<void> {
    this.flashcards.set(await db.flashcards.toArray());
  }

  async refreshNotes(): Promise<void> {
    this.notes.set(await db.notes.toArray());
  }

  async refreshPrimings(): Promise<void> {
    this.primings.set(await db.primings.toArray());
  }

  async refreshReviews(): Promise<void> {
    this.reviews.set(await db.reviews.toArray());
  }

  async refreshSessions(): Promise<void> {
    this.sessions.set(await db.sessions.toArray());
  }
}
