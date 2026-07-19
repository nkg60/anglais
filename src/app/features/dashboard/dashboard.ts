import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatiereService } from '../../core/services/matiere.service';
import { StatsService } from '../../core/services/stats.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  template: `
    <div class="stack">
      <div>
        <h1>{{ matiere()?.icon }} {{ matiere()?.name }}</h1>
        <p class="muted">
          {{
            stats.dueToday()
              ? 'Voici ce qui vous attend aujourd’hui.'
              : 'Rien à réviser pour le moment — profitez-en pour encoder du nouveau contenu.'
          }}
        </p>
      </div>

      <div class="kpis">
        <div class="card kpi">
          <span class="kpi-value">{{ stats.dueToday() }}</span>
          <span class="kpi-label">à réviser</span>
        </div>
        <div class="card kpi">
          <span class="kpi-value">{{ streak().current }} 🔥</span>
          <span class="kpi-label">jours d’affilée</span>
        </div>
        <div class="card kpi">
          <span class="kpi-value">{{ stats.totalCards() }}</span>
          <span class="kpi-label">cartes au total</span>
        </div>
        <div class="card kpi">
          <span class="kpi-value">{{ stats.globalMastery().mastery }} %</span>
          <span class="kpi-label">maîtrise globale</span>
        </div>
      </div>

      @if (stats.dueToday() > 0) {
        <div class="card cta">
          <div>
            <h3>{{ stats.dueToday() }} carte(s) dues</h3>
            <p class="muted small">
              La récupération active est le cœur de la boucle PERRIO : c’est elle qui renforce la
              mémoire.
            </p>
          </div>
          <a routerLink="/reviser" class="btn btn-primary">Démarrer une session</a>
        </div>
      }

      <section>
        <div class="row section-title">
          <span>Mes sujets</span>
          <span class="spacer"></span>
          <a routerLink="/sujets" class="small">Tout voir</a>
        </div>

        @if (subjects().length) {
          <div class="grid">
            @for (s of subjects(); track s.id) {
              <a [routerLink]="['/sujets', s.id]" class="card subject-card">
                <div class="row">
                  <span class="subject-icon" [style.background]="s.color + '22'">{{ s.icon }}</span>
                  <strong>{{ s.name }}</strong>
                  <span class="spacer"></span>
                  @if (mastery(s.id).mastered) {
                    <span class="badge badge-success">🏆 Maîtrisé</span>
                  }
                </div>
                <p class="muted small clamp">{{ s.description }}</p>
                <div class="progress">
                  <span [style.width.%]="mastery(s.id).mastery" [style.background]="s.color"></span>
                </div>
                <div class="row small muted">
                  <span>{{ mastery(s.id).mastery }} % de maîtrise</span>
                  <span class="spacer"></span>
                  @if (due(s.id) > 0) {
                    <span class="badge badge-warn">{{ due(s.id) }} due(s)</span>
                  } @else {
                    <span>à jour</span>
                  }
                </div>
              </a>
            }
          </div>
        } @else {
          <div class="card empty">
            <div class="empty-icon">📚</div>
            <p>Aucun sujet pour l’instant.</p>
            <a routerLink="/sujets" class="btn btn-primary">Créer mon premier sujet</a>
          </div>
        }
      </section>

      <section class="card">
        <div class="section-title">Le cycle PERRIO</div>
        <p class="muted small">
          Information → <strong>Amorçage</strong> → <strong>Encodage</strong> → Mémoire, avec une
          boucle de <strong>récupération</strong> qui renforce à chaque passage. Ce qui n’est ni
          encodé ni récupéré finit oublié.
        </p>
        <a routerLink="/sujets" class="btn">Ouvrir un sujet</a>
      </section>
    </div>
  `,
  styles: `
    .kpis {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .kpi {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 14px;
    }

    .kpi-value {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .kpi-label {
      color: var(--text-muted);
      font-size: 0.82rem;
    }

    .cta {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      border-left: 3px solid var(--primary);
    }

    .cta > div {
      flex: 1;
      min-width: 200px;
    }

    .cta h3 {
      margin-bottom: 2px;
    }

    .cta p {
      margin: 0;
    }

    .subject-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      color: var(--text);
      transition: transform 0.15s, box-shadow 0.15s;
    }

    .subject-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgb(16 24 40 / 10%);
    }

    .subject-icon {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 9px;
      font-size: 1rem;
    }

    .clamp {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin: 0;
    }

    @media (min-width: 720px) {
      .kpis {
        grid-template-columns: repeat(4, 1fr);
      }
    }
  `,
})
export class Dashboard {
  protected readonly stats = inject(StatsService);
  private readonly matieres = inject(MatiereService);

  protected readonly subjects = computed(() => this.matieres.subjects());
  protected readonly streak = computed(() => this.stats.streak());
  protected readonly matiere = computed(() => this.matieres.active());

  protected mastery(id: string) {
    return this.stats.mastery(id);
  }

  protected due(id: string): number {
    return this.stats.dueCount(id);
  }
}
