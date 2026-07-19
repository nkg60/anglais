import { Dataset } from './dataset';

export interface MergeReport {
  ajoutes: number;
  misAJour: number;
  ignores: number;
  orphelins: number;
}

interface Identified {
  id: string;
}

interface Versioned extends Identified {
  updatedAt: string;
}

/**
 * Fusionne des entités modifiables : à identifiant égal, la version dont
 * l'`updatedAt` est le plus récent l'emporte.
 */
function mergeVersioned<T extends Versioned>(
  base: T[],
  incoming: T[],
  report: MergeReport,
): T[] {
  const result = new Map(base.map((row) => [row.id, row]));
  for (const row of incoming) {
    const current = result.get(row.id);
    if (!current) {
      result.set(row.id, row);
      report.ajoutes += 1;
    } else if (row.updatedAt > current.updatedAt) {
      result.set(row.id, row);
      report.misAJour += 1;
    } else {
      report.ignores += 1;
    }
  }
  return [...result.values()];
}

/** Fusionne un journal immuable : union par identifiant, sans jamais écraser. */
function mergeAppendOnly<T extends Identified>(
  base: T[],
  incoming: T[],
  report: MergeReport,
): T[] {
  const result = new Map(base.map((row) => [row.id, row]));
  for (const row of incoming) {
    if (result.has(row.id)) {
      report.ignores += 1;
    } else {
      result.set(row.id, row);
      report.ajoutes += 1;
    }
  }
  return [...result.values()];
}

/**
 * Fusionne `incoming` dans `base` sans rien perdre de `base`.
 *
 * Sert à deux usages : l'import d'une sauvegarde, et la résolution d'un conflit
 * lorsque le serveur a été modifié entre-temps par un autre onglet.
 *
 * Les lignes rattachées à un sujet (ou, pour les révisions, à une carte) absent
 * des deux côtés sont écartées : mieux vaut les compter comme orphelines que de
 * les insérer là où elles resteraient invisibles.
 */
export function mergeDatasets(
  base: Dataset,
  incoming: Dataset,
): { result: Dataset; report: MergeReport } {
  const report: MergeReport = { ajoutes: 0, misAJour: 0, ignores: 0, orphelins: 0 };

  const matieres = mergeVersioned(base.matieres, incoming.matieres, report);
  const subjects = mergeVersioned(base.subjects, incoming.subjects, report);
  const knownSubjects = new Set(subjects.map((s) => s.id));

  const attached = <T extends { subjectId: string }>(rows: T[]): T[] => {
    const kept = rows.filter((r) => knownSubjects.has(r.subjectId));
    report.orphelins += rows.length - kept.length;
    return kept;
  };

  const notes = mergeVersioned(base.notes, attached(incoming.notes), report);
  const flashcards = mergeVersioned(base.flashcards, attached(incoming.flashcards), report);
  const primings = mergeAppendOnly(base.primings, attached(incoming.primings), report);
  const sessions = mergeAppendOnly(base.sessions, incoming.sessions, report);

  const knownCards = new Set(flashcards.map((c) => c.id));
  const incomingReviews = incoming.reviews.filter((r) => {
    const ok = knownCards.has(r.cardId);
    if (!ok) report.orphelins += 1;
    return ok;
  });
  const reviews = mergeAppendOnly(base.reviews, incomingReviews, report);

  return {
    result: { matieres, subjects, primings, notes, flashcards, reviews, sessions },
    report,
  };
}
