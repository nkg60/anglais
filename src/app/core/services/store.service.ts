import { Injectable, computed, inject, signal } from '@angular/core';
import { ConflictError, DataApiService } from '../data/data-api.service';
import { Dataset, emptyDataset } from '../data/dataset';
import { mergeDatasets } from '../data/merge';
import { buildSeed } from '../data/seed';
import { Flashcard, Note, Priming, Review, StudySession, Subject } from '../models';

export type SyncState = 'chargement' | 'synchronisé' | 'enregistrement' | 'erreur';

/** Délai de regroupement des écritures : une session de révision en génère beaucoup. */
const SAVE_DEBOUNCE_MS = 500;

/** Nombre de fusions successives tentées avant d'abandonner sur conflit. */
const MAX_CONFLICT_RETRIES = 5;

/**
 * Source de vérité de l'application.
 *
 * Les données vivent côté serveur (Netlify Blobs) dans un document unique. Le
 * store en garde une copie en mémoire pour que les écrans restent synchrones,
 * et renvoie chaque modification au serveur en tâche de fond.
 */
@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly api = inject(DataApiService);

  readonly subjects = signal<Subject[]>([]);
  readonly flashcards = signal<Flashcard[]>([]);
  readonly notes = signal<Note[]>([]);
  readonly primings = signal<Priming[]>([]);
  readonly reviews = signal<Review[]>([]);
  readonly sessions = signal<StudySession[]>([]);

  readonly ready = signal(false);
  readonly syncState = signal<SyncState>('chargement');
  readonly lastError = signal<string | null>(null);
  readonly lastSyncedAt = signal<string | null>(null);
  readonly pending = computed(() => this.syncState() === 'enregistrement');

  /** Version du document sur laquelle se fondent nos écritures. */
  private token: string | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;
  private dirty = false;

  async init(): Promise<void> {
    try {
      const doc = await this.api.load();
      this.token = doc.token;

      if (doc.data) {
        this.apply(doc.data);
        this.syncState.set('synchronisé');
        this.lastSyncedAt.set(doc.updatedAt);
      } else {
        // Espace serveur encore vide : on y dépose le jeu de démonstration.
        this.apply(buildSeed());
        await this.persistNow();
      }
    } catch (error) {
      this.apply(emptyDataset());
      this.fail(error);
    } finally {
      this.ready.set(true);
    }
  }

  /** Recharge depuis le serveur en écartant les modifications locales non enregistrées. */
  async reload(): Promise<void> {
    this.syncState.set('chargement');
    try {
      const doc = await this.api.load();
      this.token = doc.token;
      this.apply(doc.data ?? emptyDataset());
      this.lastSyncedAt.set(doc.updatedAt);
      this.syncState.set('synchronisé');
      this.lastError.set(null);
    } catch (error) {
      this.fail(error);
    }
  }

  /** Instantané complet des données en mémoire. */
  snapshot(): Dataset {
    return {
      subjects: this.subjects(),
      primings: this.primings(),
      notes: this.notes(),
      flashcards: this.flashcards(),
      reviews: this.reviews(),
      sessions: this.sessions(),
    };
  }

  /**
   * Applique une modification puis planifie l'enregistrement.
   * Le mutateur reçoit un instantané et renvoie le document résultant.
   */
  mutate(mutator: (data: Dataset) => Dataset): void {
    this.apply(mutator(this.snapshot()));
    this.scheduleSave();
  }

  /** Remplace tout le contenu et enregistre immédiatement (import, restauration). */
  async replaceAll(data: Dataset): Promise<void> {
    this.apply(data);
    await this.persistNow();
  }

  /** Force l'envoi des modifications en attente. */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.persistNow();
  }

  private apply(data: Dataset): void {
    this.subjects.set([...data.subjects].sort((a, b) => a.name.localeCompare(b.name)));
    this.primings.set(data.primings);
    this.notes.set(data.notes);
    this.flashcards.set(data.flashcards);
    this.reviews.set(data.reviews);
    this.sessions.set(data.sessions);
  }

  private scheduleSave(): void {
    this.syncState.set('enregistrement');
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.persistNow();
    }, SAVE_DEBOUNCE_MS);
  }

  /**
   * Enregistre l'instantané courant. Les appels concurrents sont sérialisés :
   * si une écriture est déjà en vol, on marque le besoin d'un second passage.
   */
  private async persistNow(): Promise<void> {
    if (this.inFlight) {
      this.dirty = true;
      return this.inFlight;
    }

    this.inFlight = this.doPersist();
    try {
      await this.inFlight;
    } finally {
      this.inFlight = null;
    }

    if (this.dirty) {
      this.dirty = false;
      await this.persistNow();
    }
  }

  /**
   * Enregistre en résolvant les conflits par fusion.
   *
   * Quand un autre onglet a écrit entre-temps, on ne choisit pas un gagnant : on
   * fusionne son état avec le nôtre et on réessaie sur sa version. La boucle est
   * bornée car chaque tentative peut à son tour perdre la course.
   */
  private async doPersist(attempt = 0): Promise<void> {
    this.syncState.set('enregistrement');
    try {
      const { token, updatedAt } = await this.api.save(this.token, this.snapshot());
      this.token = token;
      this.lastSyncedAt.set(updatedAt);
      this.syncState.set('synchronisé');
      this.lastError.set(null);
    } catch (error) {
      if (error instanceof ConflictError && attempt < MAX_CONFLICT_RETRIES) {
        const { result } = mergeDatasets(this.snapshot(), error.remote.data ?? emptyDataset());
        this.apply(result);
        this.token = error.remote.token;
        await this.doPersist(attempt + 1);
        return;
      }
      this.fail(error);
    }
  }

  private fail(error: unknown): void {
    this.syncState.set('erreur');
    this.lastError.set(
      error instanceof Error ? error.message : 'Impossible de joindre le serveur.',
    );
  }
}
