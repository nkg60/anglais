import { Component, HostListener, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { previewInterval } from '../../core/algorithms/sm2';
import { Rating, SessionMode } from '../../core/models';
import { FlashcardService } from '../../core/services/flashcard.service';
import { ReviewService } from '../../core/services/review.service';
import { StoreService } from '../../core/services/store.service';
import { SubjectService } from '../../core/services/subject.service';

@Component({
  selector: 'app-review-page',
  imports: [RouterLink],
  template: `
    @if (review.active()) {
      <!-- ---------- Session en cours ---------- -->
      <div class="stack session">
        <div class="row small muted">
          <span>{{ modeLabel() }}</span>
          <span class="spacer"></span>
          <span>{{ review.reviewedCount() }} / {{ review.initialTotal() }}</span>
          <button class="btn btn-ghost small-btn" (click)="stop()">Terminer</button>
        </div>

        <div class="progress">
          <span [style.width.%]="review.progress()"></span>
        </div>

        @if (review.currentCard(); as card) {
          <article class="card flashcard" (click)="reveal()">
            <div class="card-subject" [style.color]="subjectColor(card.subjectId)">
              {{ subjectName(card.subjectId) }}
            </div>

            <p class="front">{{ card.front }}</p>

            @if (review.revealed()) {
              <hr />
              <p class="back">{{ card.back }}</p>
            } @else {
              <p class="muted small tap-hint">Touchez la carte (ou Espace) pour révéler</p>
            }
          </article>

          @if (review.revealed()) {
            <div class="ratings">
              <button class="btn rate again" (click)="rate('again')">
                <strong>Raté</strong>
                <span class="small">{{ preview('again') }}</span>
              </button>
              <button class="btn rate hard" (click)="rate('hard')">
                <strong>Difficile</strong>
                <span class="small">{{ preview('hard') }}</span>
              </button>
              <button class="btn rate easy" (click)="rate('easy')">
                <strong>Facile</strong>
                <span class="small">{{ preview('easy') }}</span>
              </button>
            </div>
            <p class="muted small center">Raccourcis : 1 · 2 · 3</p>
          } @else {
            <button class="btn btn-primary btn-block" (click)="reveal()">Révéler la réponse</button>
            <button class="btn btn-ghost btn-block" (click)="review.skip()">Passer</button>
          }
        }
      </div>
    } @else if (justFinished()) {
      <!-- ---------- Bilan ---------- -->
      <div class="stack">
        <div class="card summary">
          <div class="empty-icon">🎉</div>
          <h1>Session terminée</h1>
          <p class="muted">
            {{ summary().total }} révision(s) · {{ successRate() }} % de réussite
          </p>
          <div class="row center-row">
            <span class="badge badge-success">{{ summary().correct }} réussies</span>
            <span class="badge badge-danger">{{ summary().again }} ratées</span>
          </div>
          <p class="muted small">
            Chaque récupération réussie renforce la trace mémorielle. Revenez demain pour entretenir
            la courbe.
          </p>
          <div class="row center-row">
            <button class="btn btn-primary" (click)="reset()">Nouvelle session</button>
            <a routerLink="/statistiques" class="btn">Voir les statistiques</a>
          </div>
        </div>
      </div>
    } @else {
      <!-- ---------- Configuration ---------- -->
      <div class="stack">
        <div>
          <h1>🔁 Réviser</h1>
          <p class="muted">
            La récupération active est ce qui ancre réellement l’information. Alternez les sujets
            pour profiter de l’entrelacement.
          </p>
        </div>

        <div class="modes">
          <button class="card mode" [class.selected]="mode() === 'retrieval'" (click)="setMode('retrieval')">
            <strong>🎯 Récupération</strong>
            <span class="muted small">Un ou plusieurs sujets, cartes mélangées.</span>
          </button>
          <button
            class="card mode"
            [class.selected]="mode() === 'interleaving'"
            (click)="setMode('interleaving')"
          >
            <strong>🔀 Session mixte</strong>
            <span class="muted small">
              Alterne les sujets à chaque carte : plus difficile, plus efficace.
            </span>
          </button>
        </div>

        <section class="card">
          <div class="section-title">Sujets à inclure</div>
          @if (subjects().length) {
            <div class="stack">
              @for (s of subjects(); track s.id) {
                <label class="picker" [class.checked]="selected().has(s.id)">
                  <input
                    type="checkbox"
                    [checked]="selected().has(s.id)"
                    (change)="toggle(s.id)"
                  />
                  <span class="picker-icon" [style.background]="s.color + '22'">{{ s.icon }}</span>
                  <span class="picker-name">{{ s.name }}</span>
                  <span class="spacer"></span>
                  <span class="badge" [class.badge-warn]="dueFor(s.id) > 0">
                    {{ dueFor(s.id) }} due(s)
                  </span>
                </label>
              }
            </div>
          } @else {
            <p class="muted">Créez d’abord un sujet et quelques cartes.</p>
          }
        </section>

        <div class="card start">
          <div>
            <strong>{{ dueSelected() }} carte(s) prêtes</strong>
            <p class="muted small">
              {{
                mode() === 'interleaving'
                  ? 'Les cartes seront entrelacées entre les sujets choisis.'
                  : 'Les cartes seront mélangées aléatoirement.'
              }}
            </p>
          </div>
          <span class="spacer"></span>
          <button class="btn btn-primary" [disabled]="dueSelected() === 0" (click)="start()">
            Commencer
          </button>
        </div>

        @if (dueSelected() === 0) {
          <p class="muted small center">
            Rien n’est dû dans cette sélection. La répétition espacée fait son travail : revenez
            plus tard.
          </p>
        }
      </div>
    }
  `,
  styles: `
    .session {
      max-width: 640px;
      margin: 0 auto;
    }

    .flashcard {
      min-height: 220px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      cursor: pointer;
      padding: 24px;
    }

    .card-subject {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .front {
      font-size: 1.3rem;
      font-weight: 600;
      margin: 0;
      white-space: pre-wrap;
    }

    .back {
      font-size: 1.05rem;
      margin: 0;
      white-space: pre-wrap;
    }

    hr {
      border: none;
      border-top: 1px solid var(--border);
      width: 100%;
      margin: 4px 0;
    }

    .tap-hint {
      margin-top: auto;
    }

    .ratings {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .rate {
      flex-direction: column;
      gap: 2px;
      padding: 12px 6px;
    }

    .rate.again {
      border-color: var(--danger);
      color: var(--danger);
    }

    .rate.hard {
      border-color: var(--warn);
      color: var(--warn);
    }

    .rate.easy {
      border-color: var(--success);
      color: var(--success);
    }

    .center {
      text-align: center;
    }

    .center-row {
      justify-content: center;
    }

    .summary {
      text-align: center;
      max-width: 520px;
      margin: 0 auto;
    }

    .modes {
      display: grid;
      gap: 12px;
      grid-template-columns: 1fr;
    }

    .mode {
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-align: left;
      cursor: pointer;
      font: inherit;
      color: var(--text);
    }

    .mode.selected {
      border-color: var(--primary);
      background: var(--primary-soft);
    }

    .picker {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      margin: 0;
      font-weight: 400;
    }

    .picker.checked {
      border-color: var(--primary);
    }

    .picker input {
      width: auto;
      accent-color: var(--primary);
    }

    .picker-icon {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
    }

    .start {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .start p {
      margin: 2px 0 0;
    }

    .small-btn {
      padding: 4px 10px;
      font-size: 0.82rem;
    }

    @media (min-width: 720px) {
      .modes {
        grid-template-columns: 1fr 1fr;
      }
    }
  `,
})
export class ReviewPage {
  /** Paramètres de requête : ?sujet=<id>&mode=interleaving */
  readonly sujet = input<string>();
  readonly mode_ = input<SessionMode | undefined>(undefined, { alias: 'mode' });

  protected readonly review = inject(ReviewService);
  private readonly store = inject(StoreService);
  private readonly subjectService = inject(SubjectService);
  private readonly flashcards = inject(FlashcardService);

  protected readonly subjects = computed(() => this.store.subjects().filter((s) => !s.archived));
  protected readonly mode = signal<SessionMode>('retrieval');
  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly justFinished = signal(false);

  protected readonly dueSelected = computed(
    () => this.flashcards.due([...this.selected()]).length,
  );

  protected readonly summary = computed(() => this.review.summary());
  protected readonly successRate = computed(() => {
    const s = this.summary();
    return s.total ? Math.round((s.correct / s.total) * 100) : 0;
  });

  constructor() {
    // Applique la présélection issue des liens du pipeline PERRIO.
    effect(() => {
      const all = this.subjects();
      if (!all.length) return;
      const focus = this.sujet();
      this.selected.set(new Set(focus ? [focus] : all.map((s) => s.id)));
    });

    effect(() => {
      const m = this.mode_();
      if (m) this.mode.set(m);
    });
  }

  protected modeLabel(): string {
    return this.mode() === 'interleaving' ? '🔀 Session mixte' : '🎯 Récupération';
  }

  protected setMode(mode: SessionMode): void {
    this.mode.set(mode);
    // Une session mixte n'a de sens qu'avec plusieurs sujets.
    if (mode === 'interleaving') this.selected.set(new Set(this.subjects().map((s) => s.id)));
  }

  protected toggle(id: string): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected dueFor(id: string): number {
    return this.flashcards.due([id]).length;
  }

  protected subjectName(id: string): string {
    return this.subjectService.byId(id)?.name ?? '';
  }

  protected subjectColor(id: string): string {
    return this.subjectService.byId(id)?.color ?? 'var(--text-muted)';
  }

  protected preview(rating: Rating): string {
    const card = this.review.currentCard();
    return card ? previewInterval(card, rating) : '';
  }

  protected async start(): Promise<void> {
    this.justFinished.set(false);
    await this.review.start(this.mode(), [...this.selected()]);
  }

  protected reveal(): void {
    this.review.reveal();
  }

  protected async rate(rating: Rating): Promise<void> {
    await this.review.rate(rating);
    if (!this.review.active()) this.justFinished.set(true);
  }

  protected async stop(): Promise<void> {
    await this.review.finish();
    this.justFinished.set(true);
  }

  protected reset(): void {
    this.justFinished.set(false);
  }

  @HostListener('window:keydown', ['$event'])
  protected onKey(event: KeyboardEvent): void {
    if (!this.review.active()) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!this.review.revealed()) this.reveal();
      return;
    }
    if (!this.review.revealed()) return;
    const map: Record<string, Rating> = { '1': 'again', '2': 'hard', '3': 'easy' };
    const rating = map[event.key];
    if (rating) {
      event.preventDefault();
      void this.rate(rating);
    }
  }
}
