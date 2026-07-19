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
      </div>
    </header>

    <main class="page">
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
  }
}
