import { Injectable, computed, inject, signal } from '@angular/core';
import { nowIso, uid } from '../data/dataset';
import { Matiere } from '../models';
import { StoreService } from './store.service';

export const MATIERE_COLORS = ['#4f7cff', '#16a37f', '#e0673d', '#8b5cf6', '#d94f7a', '#0ea5b7'];

export const MATIERE_ICONS = ['📖', '🇬🇧', '📐', '⚖️', '🧬', '🎼', '💻', '🌍'];

/** Clé de mémorisation du choix, propre à ce navigateur. */
const CLE_ACTIVE = 'perrio.matiere-active';

/**
 * Gestion des matières et de celle actuellement consultée.
 *
 * La matière active est une préférence d'affichage propre à l'appareil, pas un
 * contenu : elle vit dans le localStorage et non dans les données partagées.
 * Deux personnes peuvent ainsi réviser deux matières différentes en parallèle.
 */
@Injectable({ providedIn: 'root' })
export class MatiereService {
  private readonly store = inject(StoreService);

  private readonly activeIdBrut = signal<string | null>(lireChoix());

  readonly list = computed(() =>
    this.store
      .matieres()
      .filter((m) => !m.archived)
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  /** Matière active, ou `null` tant qu'aucune n'a été choisie ou si elle a disparu. */
  readonly active = computed<Matiere | null>(() => {
    const id = this.activeIdBrut();
    if (!id) return null;
    return this.list().find((m) => m.id === id) ?? null;
  });

  readonly activeId = computed(() => this.active()?.id ?? null);

  /** Sujets de la matière active — le périmètre de tous les écrans. */
  readonly subjects = computed(() => {
    const id = this.activeId();
    if (!id) return [];
    return this.store.subjects().filter((s) => s.matiereId === id && !s.archived);
  });

  readonly subjectIds = computed(() => this.subjects().map((s) => s.id));

  byId(id: string): Matiere | undefined {
    return this.store.matieres().find((m) => m.id === id);
  }

  /** Nombre de sujets rattachés, matière par matière. */
  subjectCount(matiereId: string): number {
    return this.store.subjects().filter((s) => s.matiereId === matiereId && !s.archived).length;
  }

  cardCount(matiereId: string): number {
    const ids = new Set(
      this.store.subjects().filter((s) => s.matiereId === matiereId).map((s) => s.id),
    );
    return this.store.flashcards().filter((c) => ids.has(c.subjectId)).length;
  }

  select(id: string | null): void {
    this.activeIdBrut.set(id);
    if (id) localStorage.setItem(CLE_ACTIVE, id);
    else localStorage.removeItem(CLE_ACTIVE);
  }

  create(data: Pick<Matiere, 'name' | 'description' | 'color' | 'icon'>): string {
    const matiere: Matiere = {
      id: uid(),
      ...data,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      archived: false,
    };
    this.store.mutate((d) => ({ ...d, matieres: [...d.matieres, matiere] }));
    return matiere.id;
  }

  update(id: string, changes: Partial<Matiere>): void {
    this.store.mutate((d) => ({
      ...d,
      matieres: d.matieres.map((m) =>
        m.id === id ? { ...m, ...changes, updatedAt: nowIso() } : m,
      ),
    }));
  }

  /** Supprime la matière et toute sa descendance : sujets, notes, cartes, historique. */
  remove(id: string): void {
    this.store.mutate((d) => {
      const sujets = new Set(d.subjects.filter((s) => s.matiereId === id).map((s) => s.id));
      const cartes = new Set(
        d.flashcards.filter((c) => sujets.has(c.subjectId)).map((c) => c.id),
      );
      return {
        matieres: d.matieres.filter((m) => m.id !== id),
        subjects: d.subjects.filter((s) => s.matiereId !== id),
        notes: d.notes.filter((n) => !sujets.has(n.subjectId)),
        primings: d.primings.filter((p) => !sujets.has(p.subjectId)),
        flashcards: d.flashcards.filter((c) => !sujets.has(c.subjectId)),
        reviews: d.reviews.filter((r) => !cartes.has(r.cardId)),
        sessions: d.sessions,
      };
    });
    if (this.activeId() === id) this.select(null);
  }
}

function lireChoix(): string | null {
  try {
    return localStorage.getItem(CLE_ACTIVE);
  } catch {
    // Navigation privée verrouillée : on repartira par l'écran de choix.
    return null;
  }
}
