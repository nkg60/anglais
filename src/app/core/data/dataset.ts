import { Flashcard, Note, Priming, Review, StudySession, Subject } from '../models';

/** L'intégralité des données de l'application, en un seul document. */
export interface Dataset {
  subjects: Subject[];
  primings: Priming[];
  notes: Note[];
  flashcards: Flashcard[];
  reviews: Review[];
  sessions: StudySession[];
}

export function emptyDataset(): Dataset {
  return { subjects: [], primings: [], notes: [], flashcards: [], reviews: [], sessions: [] };
}

/** Complète un document partiel : une collection absente vaut collection vide. */
export function normalizeDataset(raw: Partial<Dataset> | null | undefined): Dataset {
  return {
    subjects: raw?.subjects ?? [],
    primings: raw?.primings ?? [],
    notes: raw?.notes ?? [],
    flashcards: raw?.flashcards ?? [],
    reviews: raw?.reviews ?? [],
    sessions: raw?.sessions ?? [],
  };
}

export function uid(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
