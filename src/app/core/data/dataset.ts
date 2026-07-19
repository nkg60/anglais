import { Flashcard, Matiere, Note, Priming, Review, StudySession, Subject } from '../models';

/** L'intégralité des données de l'application, en un seul document. */
export interface Dataset {
  matieres: Matiere[];
  subjects: Subject[];
  primings: Priming[];
  notes: Note[];
  flashcards: Flashcard[];
  reviews: Review[];
  sessions: StudySession[];
}

/**
 * Identifiant fixe de la matière créée lors de la migration des données
 * antérieures à la notion de matière.
 *
 * Il est volontairement constant et non aléatoire : deux appareils qui migrent
 * chacun de leur côté, ou une sauvegarde ancienne réimportée dans un espace déjà
 * migré, convergent alors vers la même matière au lieu d'en créer deux.
 */
export const MATIERE_PAR_DEFAUT = 'matiere-anglais';

export function emptyDataset(): Dataset {
  return {
    matieres: [],
    subjects: [],
    primings: [],
    notes: [],
    flashcards: [],
    reviews: [],
    sessions: [],
  };
}

/**
 * Complète un document partiel : une collection absente vaut collection vide,
 * et les sujets antérieurs à la notion de matière sont rattachés à « Anglais ».
 */
export function normalizeDataset(raw: Partial<Dataset> | null | undefined): Dataset {
  const subjects = raw?.subjects ?? [];
  const matieres = raw?.matieres ?? [];

  const orphelins = subjects.filter((s) => !s.matiereId);
  const besoinMigration = orphelins.length > 0;

  const matieresCompletes =
    besoinMigration && !matieres.some((m) => m.id === MATIERE_PAR_DEFAUT)
      ? [...matieres, matiereParDefaut()]
      : matieres;

  return {
    matieres: matieresCompletes,
    subjects: besoinMigration
      ? subjects.map((s) => (s.matiereId ? s : { ...s, matiereId: MATIERE_PAR_DEFAUT }))
      : subjects,
    primings: raw?.primings ?? [],
    notes: raw?.notes ?? [],
    flashcards: raw?.flashcards ?? [],
    reviews: raw?.reviews ?? [],
    sessions: raw?.sessions ?? [],
  };
}

function matiereParDefaut(): Matiere {
  return {
    id: MATIERE_PAR_DEFAUT,
    name: 'Anglais',
    description: 'Vocabulaire, grammaire et expressions de l’anglais.',
    color: '#4f7cff',
    icon: '🇬🇧',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    archived: false,
  };
}

export function uid(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
