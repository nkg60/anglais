import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { StoreService } from './core/services/store.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topbar">
      <div class="topbar-inner">
        <a routerLink="/" class="brand">
          <span class="brand-mark">P</span>
          <span class="brand-text">PERRIO</span>
        </a>
        <nav class="desktop-nav">
          @for (item of nav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.path === '/' }"
            >
              {{ item.label }}
            </a>
          }
        </nav>
        <span class="spacer"></span>
        <span class="sync" [class]="'sync-' + store.syncState()" [title]="syncTitle()">
          <span class="dot"></span>
          <span class="sync-text">{{ store.syncState() }}</span>
        </span>
      </div>
    </header>

    <main class="page">
      @if (store.syncState() === 'erreur') {
        <div class="card offline">
          <strong>⚠️ Serveur injoignable</strong>
          <p class="muted small">
            {{ store.lastError() }} Vos modifications ne sont pas enregistrées tant que la
            connexion n’est pas rétablie.
          </p>
          <button class="btn" (click)="store.reload()">Réessayer</button>
        </div>
      }

      @if (store.ready()) {
        <router-outlet />
      } @else {
        <p class="muted">Chargement…</p>
      }
    </main>

    <nav class="mobile-nav">
      @for (item of nav; track item.path) {
        <a
          [routerLink]="item.path"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: item.path === '/' }"
        >
          <span class="icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
  styleUrl: './app.scss',
})
export class App {
  protected readonly store = inject(StoreService);

  protected readonly nav: NavItem[] = [
    { path: '/', label: 'Accueil', icon: '🏠' },
    { path: '/sujets', label: 'Sujets', icon: '📚' },
    { path: '/reviser', label: 'Réviser', icon: '🔁' },
    { path: '/statistiques', label: 'Stats', icon: '📊' },
    { path: '/donnees', label: 'Données', icon: '💾' },
  ];

  constructor() {
    void this.store.init();

    // Un rechargement en pleine écriture perdrait les dernières secondes de travail.
    window.addEventListener('beforeunload', () => void this.store.flush());
  }

  protected syncTitle(): string {
    const at = this.store.lastSyncedAt();
    if (this.store.syncState() === 'erreur') return this.store.lastError() ?? 'Erreur';
    return at ? `Dernier enregistrement : ${new Date(at).toLocaleString('fr-FR')}` : '';
  }
}
