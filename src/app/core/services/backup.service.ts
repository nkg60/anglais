import { Injectable, inject } from '@angular/core';
import { DataApiService } from '../data/data-api.service';
import { Dataset, normalizeDataset } from '../data/dataset';
import { MergeReport, mergeDatasets } from '../data/merge';
import { StoreService } from './store.service';

interface BackupFile extends Dataset {
  format: 'perrio-backup';
  version: 1;
  exportedAt: string;
}

export type ImportMode = 'merge' | 'replace';

export interface ImportReport extends MergeReport {
  mode: ImportMode;
}

/**
 * Export et import du contenu de l'espace partagé, au format JSON.
 *
 * Les données vivant côté serveur, la sauvegarde n'est plus l'unique filet de
 * sécurité — elle sert à archiver un état, repartir d'un jeu de cartes existant
 * ou récupérer après une fausse manœuvre.
 */
@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly store = inject(StoreService);
  private readonly api = inject(DataApiService);

  export(): void {
    const payload: BackupFile = {
      format: 'perrio-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      ...this.store.snapshot(),
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
   * En mode `merge` (défaut), le contenu existant est conservé : les nouveautés
   * sont ajoutées, une fiche déjà connue n'est écrasée que si la version importée
   * est plus récente. En mode `replace`, tout est remplacé.
   */
  async import(file: File, mode: ImportMode = 'merge'): Promise<ImportReport> {
    const raw = JSON.parse(await file.text()) as BackupFile;
    if (raw.format !== 'perrio-backup') {
      throw new Error('Ce fichier n’est pas une sauvegarde PERRIO.');
    }

    const incoming = normalizeDataset(raw);

    if (mode === 'replace') {
      await this.store.commitImport(incoming, true);
      return {
        mode,
        ajoutes:
          incoming.subjects.length +
          incoming.primings.length +
          incoming.notes.length +
          incoming.flashcards.length +
          incoming.reviews.length +
          incoming.sessions.length,
        misAJour: 0,
        ignores: 0,
        orphelins: 0,
      };
    }

    const { result, report } = mergeDatasets(this.store.snapshot(), incoming);
    await this.store.commitImport(result, false);
    return { mode, ...report };
  }

  /** Efface l'espace serveur ; le jeu de démonstration est recréé au rechargement. */
  async reset(): Promise<void> {
    await this.api.clear();
    location.reload();
  }
}
