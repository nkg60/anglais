import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatiereService } from '../../core/services/matiere.service';
import { StatsService } from '../../core/services/stats.service';
import { SUBJECT_COLORS, SubjectService } from '../../core/services/subject.service';

const ICONS = ['📘', '🗣️', '⏳', '✍️', '🎧', '🧠', '🌍', '⚙️'];

@Component({
  selector: 'app-subject-list',
  imports: [RouterLink, FormsModule],
  template: `
    <div class="stack">
      <div class="row">
        <h1>Sujets</h1>
        <span class="spacer"></span>
        <button class="btn btn-primary" (click)="toggleForm()">
          {{ showForm() ? 'Annuler' : '+ Nouveau sujet' }}
        </button>
      </div>

      @if (showForm()) {
        <form class="card" (ngSubmit)="save()">
          <div class="field">
            <label for="name">Nom du sujet</label>
            <input id="name" name="name" [(ngModel)]="name" placeholder="Ex. : Prépositions" />
          </div>
          <div class="field">
            <label for="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows="2"
              [(ngModel)]="description"
              placeholder="Ce que ce sujet couvre"
            ></textarea>
          </div>
          <div class="field">
            <label>Icône</label>
            <div class="row">
              @for (i of icons; track i) {
                <button
                  type="button"
                  class="chip"
                  [class.selected]="icon() === i"
                  (click)="icon.set(i)"
                >
                  {{ i }}
                </button>
              }
            </div>
          </div>
          <div class="field">
            <label>Couleur</label>
            <div class="row">
              @for (c of colors; track c) {
                <button
                  type="button"
                  class="swatch"
                  [class.selected]="color() === c"
                  [style.background]="c"
                  (click)="color.set(c)"
                  [attr.aria-label]="c"
                ></button>
              }
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-block" [disabled]="!name().trim()">
            Créer le sujet
          </button>
        </form>
      }

      @if (subjects().length) {
        <div class="grid">
          @for (s of subjects(); track s.id) {
            <a [routerLink]="['/sujets', s.id]" class="card subject-card">
              <div class="row">
                <span class="subject-icon" [style.background]="s.color + '22'">{{ s.icon }}</span>
                <strong>{{ s.name }}</strong>
                <span class="spacer"></span>
                @if (stats.mastery(s.id).mastered) {
                  <span class="badge badge-success">🏆</span>
                }
              </div>
              <p class="muted small clamp">{{ s.description || 'Sans description' }}</p>
              <div class="row small muted">
                <span class="badge">{{ phasesDone(s.id) }}/6 phases</span>
                @if (stats.dueCount(s.id) > 0) {
                  <span class="badge badge-warn">{{ stats.dueCount(s.id) }} due(s)</span>
                }
              </div>
            </a>
          }
        </div>
      } @else {
        <div class="card empty">
          <div class="empty-icon">📚</div>
          <p>Créez un sujet pour démarrer votre premier cycle PERRIO.</p>
        </div>
      }
    </div>
  `,
  styles: `
    .subject-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      color: var(--text);
    }

    .subject-card:hover {
      border-color: var(--primary);
    }

    .subject-icon {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 9px;
    }

    .clamp {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin: 0;
    }

    .chip {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--surface);
      font-size: 1.1rem;
      cursor: pointer;
    }

    .chip.selected {
      border-color: var(--primary);
      background: var(--primary-soft);
    }

    .swatch {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      padding: 0;
    }

    .swatch.selected {
      border-color: var(--text);
      outline: 2px solid var(--surface);
      outline-offset: -4px;
    }
  `,
})
export class SubjectList {
  private readonly matieres = inject(MatiereService);
  private readonly subjectService = inject(SubjectService);
  private readonly router = inject(Router);
  protected readonly stats = inject(StatsService);

  protected readonly icons = ICONS;
  protected readonly colors = SUBJECT_COLORS;

  protected readonly subjects = computed(() => this.matieres.subjects());
  protected readonly showForm = signal(false);
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly icon = signal(ICONS[0]);
  protected readonly color = signal(SUBJECT_COLORS[0]);

  protected toggleForm(): void {
    this.showForm.update((v) => !v);
  }

  protected phasesDone(id: string): number {
    return this.stats.phases(id).filter((p) => p.done).length;
  }

  protected async save(): Promise<void> {
    const name = this.name().trim();
    if (!name) return;
    const matiereId = this.matieres.activeId();
    if (!matiereId) return;
    const id = this.subjectService.create({
      matiereId,
      name,
      description: this.description().trim(),
      icon: this.icon(),
      color: this.color(),
    });
    this.name.set('');
    this.description.set('');
    this.showForm.set(false);
    void this.router.navigate(['/sujets', id]);
  }
}
