import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { formatRelative } from '../../core/algorithms/dates';
import { Flashcard } from '../../core/models';
import { FlashcardService } from '../../core/services/flashcard.service';
import { SubjectService } from '../../core/services/subject.service';

@Component({
  selector: 'app-flashcard-list',
  imports: [RouterLink, FormsModule],
  template: `
    <div class="stack">
      <a [routerLink]="['/sujets', id()]" class="small muted">← {{ subject()?.name }}</a>

      <div class="row">
        <div>
          <h1>🗂️ Flashcards</h1>
          <p class="muted">
            La phase de référence : sortir l’information de votre tête pour pouvoir la revisiter.
          </p>
        </div>
        <span class="spacer"></span>
        <button class="btn btn-primary" (click)="openForm()">+ Nouvelle carte</button>
      </div>

      @if (formOpen()) {
        <form class="card" (ngSubmit)="save()">
          <div class="field">
            <label for="front">Recto — la question</label>
            <textarea
              id="front"
              name="front"
              rows="2"
              [(ngModel)]="front"
              placeholder="Ex. : to give up"
            ></textarea>
          </div>
          <div class="field">
            <label for="back">Verso — la réponse</label>
            <textarea
              id="back"
              name="back"
              rows="3"
              [(ngModel)]="back"
              placeholder="Ex. : abandonner, renoncer — « She gave up smoking. »"
            ></textarea>
          </div>
          <div class="field">
            <label for="tags">Tags</label>
            <input
              id="tags"
              name="tags"
              [(ngModel)]="tagsText"
              placeholder="séparés par des virgules"
            />
          </div>
          <div class="row">
            <button type="submit" class="btn btn-primary" [disabled]="!valid()">
              {{ editingId() ? 'Mettre à jour' : 'Ajouter la carte' }}
            </button>
            <button type="button" class="btn btn-ghost" (click)="closeForm()">Annuler</button>
          </div>
        </form>
      }

      @if (allTags().length) {
        <div class="row">
          <button class="badge tag" [class.badge-primary]="!activeTag()" (click)="activeTag.set('')">
            Tous ({{ cards().length }})
          </button>
          @for (t of allTags(); track t) {
            <button
              class="badge tag"
              [class.badge-primary]="activeTag() === t"
              (click)="activeTag.set(t)"
            >
              {{ t }}
            </button>
          }
        </div>
      }

      @if (visibleCards().length) {
        <div class="stack">
          @for (c of visibleCards(); track c.id) {
            <article class="card flash" [class.suspended]="c.suspended">
              <div class="face">
                <span class="face-label">Recto</span>
                <p>{{ c.front }}</p>
              </div>
              <div class="face">
                <span class="face-label">Verso</span>
                <p class="muted">{{ c.back }}</p>
              </div>
              <div class="row small muted">
                @for (t of c.tags; track t) {
                  <span class="badge">{{ t }}</span>
                }
                <span class="spacer"></span>
                <span>{{ describe(c) }}</span>
              </div>
              <div class="row">
                <button class="btn btn-ghost small-btn" (click)="edit(c)">Modifier</button>
                <button class="btn btn-ghost small-btn" (click)="reset(c)">Réinitialiser</button>
                <button class="btn btn-ghost small-btn" (click)="toggleSuspend(c)">
                  {{ c.suspended ? 'Réactiver' : 'Suspendre' }}
                </button>
                <span class="spacer"></span>
                <button class="btn btn-ghost small-btn danger" (click)="remove(c)">Supprimer</button>
              </div>
            </article>
          }
        </div>
      } @else {
        <div class="card empty">
          <div class="empty-icon">🗂️</div>
          <p>
            {{
              cards().length
                ? 'Aucune carte pour ce tag.'
                : 'Aucune carte. Transformez vos notes en questions.'
            }}
          </p>
        </div>
      }
    </div>
  `,
  styles: `
    .flash {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .flash.suspended {
      opacity: 0.55;
    }

    .face-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }

    .face p {
      margin: 2px 0 0;
      white-space: pre-wrap;
    }

    .tag {
      border: none;
      cursor: pointer;
      font-family: inherit;
    }

    .small-btn {
      padding: 5px 10px;
      font-size: 0.83rem;
    }

    .danger {
      color: var(--danger);
    }
  `,
})
export class FlashcardList {
  readonly id = input.required<string>();

  private readonly flashcards = inject(FlashcardService);
  private readonly subjects = inject(SubjectService);

  protected readonly subject = computed(() => this.subjects.byId(this.id()));
  protected readonly cards = computed(() => this.flashcards.bySubject(this.id()));
  protected readonly allTags = computed(() => this.flashcards.tagsFor(this.id()));

  protected readonly activeTag = signal('');
  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly front = signal('');
  protected readonly back = signal('');
  protected readonly tagsText = signal('');

  protected readonly visibleCards = computed(() => {
    const tag = this.activeTag();
    return tag ? this.cards().filter((c) => c.tags.includes(tag)) : this.cards();
  });

  protected readonly valid = computed(() => !!(this.front().trim() && this.back().trim()));

  protected describe(card: Flashcard): string {
    if (card.suspended) return 'suspendue';
    if (card.totalReviews === 0) return 'nouvelle';
    const rate = Math.round((card.correctReviews / card.totalReviews) * 100);
    return `${rate} % de réussite · revue ${formatRelative(card.dueDate)}`;
  }

  protected openForm(): void {
    this.editingId.set(null);
    this.front.set('');
    this.back.set('');
    this.tagsText.set('');
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
  }

  protected edit(card: Flashcard): void {
    this.editingId.set(card.id);
    this.front.set(card.front);
    this.back.set(card.back);
    this.tagsText.set(card.tags.join(', '));
    this.formOpen.set(true);
  }

  protected async save(): Promise<void> {
    if (!this.valid()) return;
    const tags = this.tagsText()
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const editing = this.editingId();

    if (editing) {
      await this.flashcards.update(editing, {
        front: this.front().trim(),
        back: this.back().trim(),
        tags,
      });
    } else {
      await this.flashcards.create({
        subjectId: this.id(),
        front: this.front().trim(),
        back: this.back().trim(),
        tags,
      });
    }

    this.front.set('');
    this.back.set('');
    if (editing) this.closeForm();
  }

  protected async reset(card: Flashcard): Promise<void> {
    await this.flashcards.reset(card.id);
  }

  protected async toggleSuspend(card: Flashcard): Promise<void> {
    await this.flashcards.update(card.id, { suspended: !card.suspended });
  }

  protected async remove(card: Flashcard): Promise<void> {
    if (!confirm('Supprimer cette carte et son historique ?')) return;
    await this.flashcards.remove(card.id);
  }
}
