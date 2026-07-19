import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatsService } from '../../core/services/stats.service';
import { StoreService } from '../../core/services/store.service';

const CHART_W = 300;
const CHART_H = 100;

@Component({
  selector: 'app-stats-page',
  imports: [RouterLink],
  template: `
    <div class="stack">
      <div>
        <h1>📊 Statistiques</h1>
        <p class="muted">
          Le sur-apprentissage se mesure : régularité, taux de réussite et ancrage à long terme.
        </p>
      </div>

      <div class="kpis">
        <div class="card kpi">
          <span class="kpi-value">{{ streak().current }} 🔥</span>
          <span class="kpi-label">série en cours</span>
        </div>
        <div class="card kpi">
          <span class="kpi-value">{{ streak().longest }}</span>
          <span class="kpi-label">meilleure série</span>
        </div>
        <div class="card kpi">
          <span class="kpi-value">{{ totalReviews() }}</span>
          <span class="kpi-label">révisions au total</span>
        </div>
        <div class="card kpi">
          <span class="kpi-value">{{ stats.globalMastery().mastery }} %</span>
          <span class="kpi-label">maîtrise globale</span>
        </div>
      </div>

      <!-- Courbe de rétention -->
      <section class="card">
        <div class="section-title">Taux de réussite — 30 derniers jours</div>
        @if (totalReviews() > 0) {
          <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" class="chart" preserveAspectRatio="none">
            @for (y of [25, 50, 75]; track y) {
              <line
                class="gridline"
                x1="0"
                [attr.y1]="height - (y / 100) * height"
                [attr.x2]="width"
                [attr.y2]="height - (y / 100) * height"
              />
            }
            <polyline class="line" [attr.points]="retentionPoints()" />
          </svg>
          <div class="row small muted">
            <span>{{ curve()[0].label }}</span>
            <span class="spacer"></span>
            <span>{{ curve()[curve().length - 1].label }}</span>
          </div>
          <p class="muted small">
            Réussite moyenne sur la période : <strong>{{ averageRate() }} %</strong> — les jours
            sans révision comptent comme un creux.
          </p>
        } @else {
          <p class="muted">Aucune révision enregistrée pour l’instant.</p>
        }
      </section>

      <!-- Activité hebdomadaire -->
      <section class="card">
        <div class="section-title">Sessions par semaine</div>
        @if (weekly().length) {
          <div class="bars">
            @for (w of weekly(); track w.label) {
              <div class="bar-col">
                <div class="bar-wrap">
                  <div
                    class="bar"
                    [style.height.%]="maxSessions() ? (w.sessions / maxSessions()) * 100 : 0"
                    [attr.title]="w.sessions + ' session(s), ' + w.cards + ' carte(s)'"
                  ></div>
                </div>
                <span class="bar-label">{{ w.label }}</span>
              </div>
            }
          </div>
        }
      </section>

      <!-- Répartition des cartes -->
      <section class="card">
        <div class="section-title">Ancrage des cartes</div>
        @if (stats.totalCards() > 0) {
          <div class="stackbar">
            <span class="seg new" [style.width.%]="pct(distribution().nouvelles)"></span>
            <span class="seg learning" [style.width.%]="pct(distribution().apprentissage)"></span>
            <span class="seg anchored" [style.width.%]="pct(distribution().ancrees)"></span>
          </div>
          <div class="row small muted legend">
            <span><i class="dot new"></i>{{ distribution().nouvelles }} nouvelles</span>
            <span><i class="dot learning"></i>{{ distribution().apprentissage }} en cours</span>
            <span><i class="dot anchored"></i>{{ distribution().ancrees }} ancrées (≥ 21 j)</span>
          </div>
        } @else {
          <p class="muted">Aucune carte pour l’instant.</p>
        }
      </section>

      <!-- Maîtrise par sujet -->
      <section class="card">
        <div class="section-title">Maîtrise par sujet</div>
        <div class="stack">
          @for (s of subjects(); track s.id) {
            <a [routerLink]="['/sujets', s.id]" class="subject-row">
              <span class="row">
                <span>{{ s.icon }}</span>
                <strong>{{ s.name }}</strong>
                <span class="spacer"></span>
                @if (stats.mastery(s.id).mastered) {
                  <span class="badge badge-success">🏆 Maîtrisé</span>
                }
                <span class="muted small">{{ stats.mastery(s.id).mastery }} %</span>
              </span>
              <span class="progress">
                <span [style.width.%]="stats.mastery(s.id).mastery" [style.background]="s.color"></span>
              </span>
            </a>
          } @empty {
            <p class="muted">Aucun sujet.</p>
          }
        </div>
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
      padding: 14px;
    }

    .kpi-value {
      font-size: 1.4rem;
      font-weight: 700;
    }

    .kpi-label {
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    .chart {
      width: 100%;
      height: 140px;
      overflow: visible;
    }

    .gridline {
      stroke: var(--border);
      stroke-width: 1;
      vector-effect: non-scaling-stroke;
    }

    .line {
      fill: none;
      stroke: var(--primary);
      stroke-width: 2;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }

    .bars {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: 130px;
    }

    .bar-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      height: 100%;
    }

    .bar-wrap {
      flex: 1;
      width: 100%;
      display: flex;
      align-items: flex-end;
    }

    .bar {
      width: 100%;
      min-height: 3px;
      background: var(--primary);
      border-radius: 4px 4px 0 0;
    }

    .bar-label {
      font-size: 0.68rem;
      color: var(--text-muted);
    }

    .stackbar {
      display: flex;
      height: 14px;
      border-radius: 999px;
      overflow: hidden;
      background: var(--surface-alt);
    }

    .seg.new,
    .dot.new {
      background: var(--text-muted);
    }

    .seg.learning,
    .dot.learning {
      background: var(--warn);
    }

    .seg.anchored,
    .dot.anchored {
      background: var(--success);
    }

    .legend {
      margin-top: 10px;
      gap: 16px;
    }

    .dot {
      display: inline-block;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      margin-right: 6px;
    }

    .subject-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
      color: var(--text);
    }

    @media (min-width: 720px) {
      .kpis {
        grid-template-columns: repeat(4, 1fr);
      }
    }
  `,
})
export class StatsPage {
  protected readonly stats = inject(StatsService);
  private readonly store = inject(StoreService);

  protected readonly width = CHART_W;
  protected readonly height = CHART_H;

  protected readonly subjects = computed(() => this.store.subjects().filter((s) => !s.archived));
  protected readonly streak = computed(() => this.stats.streak());
  protected readonly totalReviews = computed(() => this.store.reviews().length);
  protected readonly curve = computed(() => this.stats.retentionCurve(30));
  protected readonly weekly = computed(() => this.stats.weeklyActivity(8));
  protected readonly distribution = computed(() => this.stats.cardDistribution());

  protected readonly maxSessions = computed(() =>
    Math.max(1, ...this.weekly().map((w) => w.sessions)),
  );

  /** Points de la polyline : un jour sans révision retombe à zéro. */
  protected readonly retentionPoints = computed(() => {
    const points = this.curve();
    const step = CHART_W / Math.max(1, points.length - 1);
    return points
      .map((p, i) => `${(i * step).toFixed(1)},${(CHART_H - (p.rate / 100) * CHART_H).toFixed(1)}`)
      .join(' ');
  });

  protected readonly averageRate = computed(() => {
    const days = this.curve().filter((p) => p.total > 0);
    if (!days.length) return 0;
    return Math.round(days.reduce((sum, d) => sum + d.rate, 0) / days.length);
  });

  protected pct(value: number): number {
    const total = this.stats.totalCards();
    return total ? (value / total) * 100 : 0;
  }
}
