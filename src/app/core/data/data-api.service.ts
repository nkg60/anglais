import { Injectable } from '@angular/core';
import { Dataset, normalizeDataset } from './dataset';

const ENDPOINT = '/api/data';

export interface RemoteDocument {
  revision: number;
  /** Jeton de concurrence : ETag du blob, ou numéro de révision en repli. */
  token: string | null;
  updatedAt: string | null;
  data: Dataset | null;
  /** Vrai si le document stocké a dû être migré à la lecture (schéma antérieur). */
  migrated?: boolean;
}

/** Levée quand le serveur a une version plus récente que celle qu'on croyait avoir. */
export class ConflictError extends Error {
  constructor(readonly remote: RemoteDocument) {
    super('Les données ont changé côté serveur.');
    this.name = 'ConflictError';
  }
}

function toDocument(body: Partial<RemoteDocument>): RemoteDocument {
  const brut = body.data as Partial<Dataset> | null | undefined;
  return {
    revision: body.revision ?? 0,
    token: body.token ?? null,
    updatedAt: body.updatedAt ?? null,
    data: brut ? normalizeDataset(brut) : null,
    // Signalé au store, qui réenregistre pour que la migration atteigne le serveur.
    migrated: !!brut?.subjects?.some((s) => !s.matiereId),
  };
}

/** Accès au document unique stocké dans Netlify Blobs. */
@Injectable({ providedIn: 'root' })
export class DataApiService {
  async load(): Promise<RemoteDocument> {
    const response = await fetch(ENDPOINT, { headers: { accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`Chargement impossible (HTTP ${response.status}).`);
    }
    return toDocument(await response.json());
  }

  /**
   * Enregistre le document. Le `token` identifie la version sur laquelle se fonde
   * cette écriture ; si le serveur a bougé entre-temps, une ConflictError est
   * levée avec l'état distant à jour.
   */
  async save(
    token: string | null,
    data: Dataset,
  ): Promise<{ revision: number; token: string | null; updatedAt: string }> {
    const response = await fetch(ENDPOINT, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, data }),
    });

    if (response.status === 409) {
      throw new ConflictError(toDocument(await response.json()));
    }

    if (!response.ok) {
      throw new Error(`Enregistrement impossible (HTTP ${response.status}).`);
    }

    return response.json();
  }

  async clear(): Promise<void> {
    const response = await fetch(ENDPOINT, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`Effacement impossible (HTTP ${response.status}).`);
    }
  }
}
