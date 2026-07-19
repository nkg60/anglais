import { Injectable, inject } from '@angular/core';
import { Table } from 'dexie';
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

export type ImportMode = 'merge' | 'replace';

export interface ImportReport {
  mode: ImportMode;
  ajoutes: number;
  misAJour: number;
  ignores: number;
  orphelins: number;
}

/** Toute ligne importable porte un identifiant. */
interface Identified {
  id: string;
}

/** Les entités révisables portent une date de dernière modification. */
interface Versioned extends Identified {
  updatedAt: string;
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

  /**
   * Importe une sauvegarde.
   *
   * En mode `merge` (défaut), le contenu local est conservé : les nouveautés sont
   * ajoutées, les entités déjà connues ne sont écrasées que si la version importée
   * est plus récente. En mode `replace`, tout est remplacé — utile pour restaurer
   * un état exact.
   */
  async import(file: File, mode: ImportMode = 'merge'): Promise<ImportReport> {
    const raw = JSON.parse(await file.text()) as BackupFile;
    if (raw.format !== 'perrio-backup') {
      throw new Error('Ce fichier n’est pas une sauvegarde PERRIO.');
    }

    const report: ImportReport =
      mode === 'replace'
        ? await this.replaceAll(raw)
        : await this.merge(raw);

    await this.store.refreshAll();
    return report;
  }

  private async replaceAll(raw: BackupFile): Promise<ImportReport> {
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

    const ajoutes =
      (raw.subjects?.length ?? 0) +
      (raw.primings?.length ?? 0) +
      (raw.notes?.length ?? 0) +
      (raw.flashcards?.length ?? 0) +
      (raw.reviews?.length ?? 0) +
      (raw.sessions?.length ?? 0);

    return { mode: 'replace', ajoutes, misAJour: 0, ignores: 0, orphelins: 0 };
  }

  private async merge(raw: BackupFile): Promise<ImportReport> {
    const report: ImportReport = {
      mode: 'merge',
      ajoutes: 0,
      misAJour: 0,
      ignores: 0,
      orphelins: 0,
    };

    await db.transaction(
      'rw',
      [db.subjects, db.primings, db.notes, db.flashcards, db.reviews, db.sessions],
      async () => {
        // Les sujets d'abord : ils conditionnent l'acceptation de tout le reste.
        await this.mergeVersioned(db.subjects, raw.subjects ?? [], report);

        const knownSubjects = new Set((await db.subjects.toArray()).map((s) => s.id));
        const belongsToKnownSubject = <T extends { subjectId: string }>(rows: T[]): T[] => {
          const kept = rows.filter((r) => knownSubjects.has(r.subjectId));
          report.orphelins += rows.length - kept.length;
          return kept;
        };

        await this.mergeVersioned(db.notes, belongsToKnownSubject(raw.notes ?? []), report);
        await this.mergeVersioned(
          db.flashcards,
          belongsToKnownSubject(raw.flashcards ?? []),
          report,
        );

        // Journaux immuables : on n'ajoute que ce qui manque, jamais d'écrasement.
        await this.mergeAppendOnly(db.primings, belongsToKnownSubject(raw.primings ?? []), report);
        await this.mergeAppendOnly(db.sessions, raw.sessions ?? [], report);

        const knownCards = new Set((await db.flashcards.toArray()).map((c) => c.id));
        const reviews = (raw.reviews ?? []).filter((r) => {
          const ok = knownCards.has(r.cardId);
          if (!ok) report.orphelins += 1;
          return ok;
        });
        await this.mergeAppendOnly(db.reviews, reviews, report);
      },
    );

    return report;
  }

  /**
   * Fusionne des entités modifiables : la ligne importée ne l'emporte que si son
   * `updatedAt` est strictement postérieur à celui déjà en base.
   */
  private async mergeVersioned<T extends Versioned>(
    table: Table<T, string>,
    rows: T[],
    report: ImportReport,
  ): Promise<void> {
    if (!rows.length) return;
    const existing = new Map(
      (await table.bulkGet(rows.map((r) => r.id)))
        .filter((r): r is T => !!r)
        .map((r) => [r.id, r]),
    );

    const toWrite: T[] = [];
    for (const row of rows) {
      const current = existing.get(row.id);
      if (!current) {
        toWrite.push(row);
        report.ajoutes += 1;
      } else if (row.updatedAt > current.updatedAt) {
        toWrite.push(row);
        report.misAJour += 1;
      } else {
        report.ignores += 1;
      }
    }
    if (toWrite.length) await table.bulkPut(toWrite);
  }

  /** Fusionne un journal immuable : seules les lignes inconnues sont ajoutées. */
  private async mergeAppendOnly<T extends Identified>(
    table: Table<T, string>,
    rows: T[],
    report: ImportReport,
  ): Promise<void> {
    if (!rows.length) return;
    const existing = new Set(
      (await table.bulkGet(rows.map((r) => r.id))).filter(Boolean).map((r) => (r as T).id),
    );

    const toAdd = rows.filter((r) => !existing.has(r.id));
    report.ajoutes += toAdd.length;
    report.ignores += rows.length - toAdd.length;
    if (toAdd.length) await table.bulkPut(toAdd);
  }

  async reset(): Promise<void> {
    await db.delete();
    location.reload();
  }
}
