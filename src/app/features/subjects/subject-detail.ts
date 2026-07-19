import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PERRIO_PHASES, PerrioPhase } from '../../core/models';
import { StatsService } from '../../core/services/stats.service';
import { SubjectService } from '../../core/services/subject.service';

@Component({
  selector: 'app-subject-detail',
  imports: [RouterLink],
  template: `
    @if (subject(); as s) {
      <div class="stack">
        <a routerLink="/sujets" class="small muted">← Tous les sujets</a>

        <header class="card head" [style.border-left-color]="s.color">
          <div class="row">
            <span class="subject-icon" [style.background]="s.color + '22'">{{ s.icon }}</span>
            <div>
              <h1>{{ s.name }}</h1>
              <p class="muted small">{{ s.description || 'Sans description' }}</p>
            </div>
          </div>

          <div class="row">
            <div class="mastery">
              <div class="row small">
                <strong>Maîtrise : {{ mastery().mastery }} %</strong>
                <span class="spacer"></span>
                @if (mastery().mastered) {
                  <span class="badge badge-success">🏆 Maîtrisé</span>
                } @else {
                  <span class="muted">seuil 85 %</span>
                }
              </div>
              <div class="progress">
                <span [style.width.%]="mastery().mastery" [style.background]="s.color"></span>
              </div>
              <div class="row small muted breakdown">
                <span>Réussite {{ mastery().successRate }} %</span>
                <span>Ancrage {{ mastery().coverage }} %</span>
                <span>Régularité {{ mastery().regularity }} %</span>
              </div>
            </div>
          </div>
        </header>

        <div class="section-title">Pipeline PERRIO</div>

        <ol class="pipeline">
          @for (phase of phases; track phase.key; let i = $index) {
            <li class="card step" [class.done]="status()[i].done">
              <div class="step-mark" [style.background]="status()[i].done ? s.color : ''">
                {{ status()[i].done ? '✓' : i + 1 }}
              </div>
              <div class="step-body">
                <div class="row">
                  <strong>{{ phase.icon }} {{ phase.label }}</strong>
                  <span class="spacer"></span>
                  <span class="badge" [class.badge-success]="status()[i].done">
                    {{ status()[i].detail }}
                  </span>
                </div>
                <p class="muted small">{{ phase.description }}</p>
                <button class="btn small-btn" (click)="go(phase.key)">
                  {{ actionLabel(phase.key) }}
                </button>
              </div>
            </li>
          }
        </ol>

        <div class="card danger-zone">
          <div class="row">
            <div>
              <strong>Supprimer ce sujet</strong>
              <p class="muted small">
                Ses notes, amorçages, cartes et historique de révision seront effacés.
              </p>
            </div>
            <span class="spacer"></span>
            <button class="btn btn-danger" (click)="remove(s.id, s.name)">Supprimer</button>
          </div>
        </div>
      </div>
    } @else {
      <div class="card empty">Ce sujet est introuvable.</div>
    }
  `,
  styles: `
    .head {
      display: flex;
      flex-direction: column;
      gap: 14px;
      border-left: 3px solid var(--primary);
    }

    .head h1 {
      margin: 0;
      font-size: 1.35rem;
    }

    .head p {
      margin: 0;
    }

    .subject-icon {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border-radius: 12px;
      font-size: 1.3rem;
    }

    .mastery {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .breakdown {
      gap: 14px;
    }

    .pipeline {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .step {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      position: relative;
    }

    .step:not(:last-child)::after {
      content: '';
      position: absolute;
      left: 31px;
      bottom: -11px;
      width: 2px;
      height: 11px;
      background: var(--border);
    }

    .step-mark {
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--surface-alt);
      color: var(--text-muted);
      font-weight: 700;
      font-size: 0.9rem;
    }

    .step.done .step-mark {
      color: #fff;
    }

    .step-body {
      flex: 1;
      min-width: 0;
    }

    .step-body p {
      margin: 4px 0 10px;
    }

    .small-btn {
      padding: 6px 12px;
      font-size: 0.85rem;
    }

    .danger-zone p {
      margin: 2px 0 0;
    }
  `,
})
export class SubjectDetail {
  /** Identifiant du sujet, lié au paramètre de route. */
  readonly id = input.required<string>();

  private readonly subjects = inject(SubjectService);
  private readonly stats = inject(StatsService);
  private readonly router = inject(Router);

  protected readonly phases = PERRIO_PHASES;
  protected readonly subject = computed(() => this.subjects.byId(this.id()));
  protected readonly status = computed(() => this.stats.phases(this.id()));
  protected readonly mastery = computed(() => this.stats.mastery(this.id()));

  protected actionLabel(phase: PerrioPhase): string {
    switch (phase) {
      case 'priming':
        return 'Faire un amorçage';
      case 'encoding':
        return 'Ouvrir mes notes';
      case 'reference':
        return 'Gérer les flashcards';
      case 'retrieval':
        return 'Réviser ce sujet';
      case 'interleaving':
        return 'Lancer une session mixte';
      case 'overlearning':
        return 'Voir mes statistiques';
    }
  }

  protected go(phase: PerrioPhase): void {
    const id = this.id();
    switch (phase) {
      case 'priming':
        void this.router.navigate(['/sujets', id, 'amorcage']);
        break;
      case 'encoding':
        void this.router.navigate(['/sujets', id, 'notes']);
        break;
      case 'reference':
        void this.router.navigate(['/sujets', id, 'cartes']);
        break;
      case 'retrieval':
        void this.router.navigate(['/reviser'], { queryParams: { sujet: id } });
        break;
      case 'interleaving':
        void this.router.navigate(['/reviser'], { queryParams: { mode: 'interleaving' } });
        break;
      case 'overlearning':
        void this.router.navigate(['/statistiques'], { queryParams: { sujet: id } });
        break;
    }
  }

  protected async remove(id: string, name: string): Promise<void> {
    if (!confirm(`Supprimer définitivement « ${name} » et tout son contenu ?`)) return;
    await this.subjects.remove(id);
    void this.router.navigate(['/sujets']);
  }
}
