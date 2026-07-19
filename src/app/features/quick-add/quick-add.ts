import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlashcardService } from '../../core/services/flashcard.service';
import { ReviewService } from '../../core/services/review.service';
import { StoreService } from '../../core/services/store.service';
import { SUBJECT_COLORS, SubjectService } from '../../core/services/subject.service';

/** Valeur de la liste déroulante déclenchant la saisie d'un nouveau sujet. */
const NOUVEAU = '::nouveau::';

/**
 * Ajout rapide d'une carte, accessible depuis n'importe quel écran.
 *
 * Pensé pour la saisie en série : après validation, seuls le recto et le verso
 * sont vidés. Le sujet et les tags restent en place, et le champ recto reprend
 * le focus — on enchaîne dix mots sans retoucher au reste.
 */
@Component({
  selector: 'app-quick-add',
  imports: [FormsModule],
  template: `
    @if (!open()) {
      <!-- Pendant une session, le bouton chevaucherait les boutons de notation. -->
      @if (!review.active()) {
        <button
          class="fab"
          (click)="show()"
          title="Ajouter une carte (touche N)"
          aria-label="Ajouter une carte"
        >
          +
        </button>
      }
    } @else {
      <div class="backdrop" (click)="hide()"></div>

      <div class="sheet card" role="dialog" aria-label="Ajout rapide d’une carte">
        <div class="row">
          <h3>Ajout rapide</h3>
          <span class="spacer"></span>
          @if (added() > 0) {
            <span class="badge badge-success">{{ added() }} ajoutée(s)</span>
          }
          <button class="btn btn-ghost icon-btn" (click)="hide()" aria-label="Fermer">✕</button>
        </div>

        @if (subjects().length || creatingSubject()) {
          <form (ngSubmit)="submit()">
            <div class="field">
              <label for="qa-subject">Sujet</label>
              <select
                id="qa-subject"
                name="subject"
                [ngModel]="subjectId()"
                (ngModelChange)="onSubjectChange($event)"
              >
                @for (s of subjects(); track s.id) {
                  <option [value]="s.id">{{ s.icon }} {{ s.name }}</option>
                }
                <option [value]="NOUVEAU">＋ Nouveau sujet…</option>
              </select>
            </div>

            @if (creatingSubject()) {
              <div class="field">
                <label for="qa-new-subject">Nom du nouveau sujet</label>
                <input
                  id="qa-new-subject"
                  name="newSubject"
                  [(ngModel)]="newSubjectName"
                  placeholder="Ex. : Prépositions"
                />
                <div class="hint">Créé à la volée, avec une couleur prise dans la palette.</div>
              </div>
            }

            <div class="field">
              <label for="qa-front">Recto — la question</label>
              <textarea
                #front
                id="qa-front"
                name="front"
                rows="2"
                [(ngModel)]="frontText"
                placeholder="Ex. : to give up"
              ></textarea>
            </div>

            <div class="field">
              <label for="qa-back">Verso — la réponse</label>
              <textarea
                id="qa-back"
                name="back"
                rows="3"
                [(ngModel)]="backText"
                placeholder="Ex. : abandonner, renoncer"
              ></textarea>
            </div>

            <div class="field">
              <label for="qa-tags">Tags (facultatif)</label>
              <input
                id="qa-tags"
                name="tags"
                [(ngModel)]="tagsText"
                placeholder="séparés par des virgules"
              />
              <div class="hint">Conservés d’une carte à l’autre, remis à zéro si vous changez de sujet.</div>
            </div>

            <div class="row">
              <button type="submit" class="btn btn-primary" [disabled]="!valid()">
                Ajouter
              </button>
              <span class="muted small">Ctrl + Entrée</span>
              <span class="spacer"></span>
              <button type="button" class="btn btn-ghost" (click)="hide()">Terminer</button>
            </div>
          </form>
        } @else {
          <p class="muted">
            Créez d’abord un sujet — ou utilisez « Nouveau sujet » ci-dessous.
          </p>
          <button class="btn btn-primary" (click)="startNewSubject()">Créer un sujet</button>
        }
      </div>
    }
  `,
  styles: `
    .fab {
      position: fixed;
      right: 18px;
      bottom: 88px;
      z-index: 20;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: none;
      background: var(--primary);
      color: #fff;
      font-size: 1.7rem;
      line-height: 1;
      cursor: pointer;
      box-shadow: 0 4px 16px rgb(79 124 255 / 45%);
      transition: transform 0.15s;
    }

    .fab:hover {
      transform: scale(1.06);
    }

    .fab:active {
      transform: scale(0.96);
    }

    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 25;
      background: rgb(8 12 20 / 45%);
    }

    .sheet {
      position: fixed;
      z-index: 26;
      left: 0;
      right: 0;
      bottom: 0;
      max-height: 88vh;
      overflow-y: auto;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      animation: rise 0.18s ease-out;
    }

    .sheet h3 {
      margin: 0;
    }

    .icon-btn {
      padding: 4px 10px;
      font-size: 1rem;
    }

    @keyframes rise {
      from {
        transform: translateY(12px);
        opacity: 0.6;
      }
    }

    @media (min-width: 720px) {
      .fab {
        bottom: 24px;
        right: 24px;
      }

      .sheet {
        left: auto;
        right: 24px;
        bottom: 24px;
        width: 420px;
        border-radius: var(--radius-lg);
      }
    }
  `,
})
export class QuickAdd {
  private readonly store = inject(StoreService);
  private readonly flashcards = inject(FlashcardService);
  private readonly subjectService = inject(SubjectService);
  protected readonly review = inject(ReviewService);

  private readonly frontField = viewChild<ElementRef<HTMLTextAreaElement>>('front');

  protected readonly NOUVEAU = NOUVEAU;

  protected readonly open = signal(false);
  protected readonly subjectId = signal('');
  protected readonly newSubjectName = signal('');
  protected readonly frontText = signal('');
  protected readonly backText = signal('');
  protected readonly tagsText = signal('');
  protected readonly added = signal(0);

  protected readonly subjects = computed(() =>
    this.store.subjects().filter((s) => !s.archived),
  );

  protected readonly creatingSubject = computed(() => this.subjectId() === NOUVEAU);

  protected readonly valid = computed(() => {
    const cible = this.creatingSubject() ? this.newSubjectName().trim() : this.subjectId();
    return !!(cible && this.frontText().trim() && this.backText().trim());
  });

  constructor() {
    // À l'ouverture, présélectionne le premier sujet pour éviter un choix vide.
    effect(() => {
      if (!this.open()) return;
      const liste = this.subjects();
      if (!this.subjectId() && liste.length) this.subjectId.set(liste[0].id);
    });
  }

  protected show(): void {
    this.added.set(0);
    this.open.set(true);
    queueMicrotask(() => this.focusFront());
  }

  protected hide(): void {
    this.open.set(false);
  }

  protected startNewSubject(): void {
    this.subjectId.set(NOUVEAU);
  }

  protected onSubjectChange(value: string): void {
    const precedent = this.subjectId();
    this.subjectId.set(value);
    if (value !== NOUVEAU) this.newSubjectName.set('');
    // Les tags d'un sujet n'ont aucun sens dans un autre : « phrasal verbs »
    // ne doit pas suivre l'utilisateur jusque dans « Expressions idiomatiques ».
    if (precedent && precedent !== value) this.tagsText.set('');
  }

  protected submit(): void {
    if (!this.valid()) return;

    let cible = this.subjectId();
    if (this.creatingSubject()) {
      cible = this.subjectService.create({
        name: this.newSubjectName().trim(),
        description: '',
        icon: '📘',
        color: SUBJECT_COLORS[this.store.subjects().length % SUBJECT_COLORS.length],
      });
      // Les cartes suivantes iront dans ce sujet sans le recréer.
      this.subjectId.set(cible);
      this.newSubjectName.set('');
    }

    this.flashcards.create({
      subjectId: cible,
      front: this.frontText().trim(),
      back: this.backText().trim(),
      tags: this.tagsText()
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    });

    // Saisie en série : on ne vide que la carte, pas le contexte.
    this.frontText.set('');
    this.backText.set('');
    this.added.update((n) => n + 1);
    this.focusFront();
  }

  private focusFront(): void {
    this.frontField()?.nativeElement.focus();
  }

  /** Raccourcis : « N » ouvre le formulaire, Ctrl+Entrée valide, Échap ferme. */
  handleKey(event: KeyboardEvent): void {
    const cible = event.target as HTMLElement | null;
    const saisieEnCours =
      cible instanceof HTMLInputElement ||
      cible instanceof HTMLTextAreaElement ||
      cible instanceof HTMLSelectElement;

    if (!this.open()) {
      if (event.key.toLowerCase() === 'n' && !saisieEnCours && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        this.show();
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.submit();
    }
  }
}
