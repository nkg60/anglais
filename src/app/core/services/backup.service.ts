import { Injectable, inject } from '@angular/core';
import { db } from '../db/db';
import { Flashcard, Note, Priming, Review, StudySession, Subject } from '../models';
import { StoreService } from './store.service';

interface BackupFile {
  format: 'perrio-backup';
  version: 1;
  exportedAt: string;
  subjects: Subject[];
  primings: Priming[];
  notes: Note[];
  flashcards: Flashcard[];
  reviews: Review[];
  sessions: StudySession[];
}

/**
 * Les données ne vivent que dans ce navigateur : l'export JSON est le seul
 * moyen de les sauvegarder ou de les transférer sur un autre appareil.
 */
@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly store = inject(StoreService);

  async export(): Promise<void> {
    const payload: BackupFile = {
      format: 'perrio-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      subjects: await db.subjects.toArray(),
      primings: await db.primings.toArray(),
      notes: await db.notes.toArray(),
      flashcards: await db.flashcards.toArray(),
      reviews: await db.reviews.toArray(),
      sessions: await db.sessions.toArray(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `perrio-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /** Remplace intégralement le contenu local par celui du fichier. */
  async import(file: File): Promise<void> {
    const raw = JSON.parse(await file.text()) as BackupFile;
    if (raw.format !== 'perrio-backup') {
      throw new Error('Ce fichier n’est pas une sauvegarde PERRIO.');
    }

    await db.transaction(
      'rw',
      [db.subjects, db.primings, db.notes, db.flashcards, db.reviews, db.sessions],
      async () => {
        await Promise.all([
          db.subjects.clear(),
          db.primings.clear(),
          db.notes.clear(),
          db.flashcards.clear(),
          db.reviews.clear(),
          db.sessions.clear(),
        ]);
        await db.subjects.bulkAdd(raw.subjects ?? []);
        await db.primings.bulkAdd(raw.primings ?? []);
        await db.notes.bulkAdd(raw.notes ?? []);
        await db.flashcards.bulkAdd(raw.flashcards ?? []);
        await db.reviews.bulkAdd(raw.reviews ?? []);
        await db.sessions.bulkAdd(raw.sessions ?? []);
      },
    );

    await this.store.refreshAll();
  }

  async reset(): Promise<void> {
    await db.delete();
    location.reload();
  }
}
