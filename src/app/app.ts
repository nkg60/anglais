import { Component, HostListener, inject, signal, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { StoreService } from './core/services/store.service';
import { QuickAdd } from './features/quick-add/quick-add';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, QuickAdd],
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
      @if (updateAvailable()) {
        <div class="card update-banner">
          <strong>✨ Nouvelle version disponible</strong>
          <p class="muted small">
            Une mise à jour de l’application a été téléchargée. Rechargez pour l’appliquer.
          </p>
          <button class="btn btn-primary" (click)="applyUpdate()">Recharger</button>
        </div>
      }

      @if (!store.ready()) {
        <p class="muted">Chargement…</p>
      } @else if (!store.loaded()) {
        <!-- Rien n'a pu être chargé : afficher des compteurs à zéro laisserait
             croire à un espace vide alors qu'il est seulement inaccessible. -->
        <div class="card offline">
          <strong>⚠️ Impossible de charger vos données</strong>
          <p class="muted small">
            {{ store.lastError() }} PERRIO conserve vos cartes sur un serveur : sans connexion,
            elles ne peuvent pas être affichées.
          </p>
          <button class="btn btn-primary" (click)="store.reload()">Réessayer</button>
        </div>
      } @else {
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
        <router-outlet />
      }
    </main>

    @if (store.loaded()) {
      <app-quick-add />
    }

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
  private readonly swUpdate = inject(SwUpdate);
  protected readonly updateAvailable = signal(false);
  private readonly quickAdd = viewChild(QuickAdd);

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

    // Installée en PWA, l'application resterait sur sa version figée sans cela.
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe((event) => {
        if (event.type === 'VERSION_READY') this.updateAvailable.set(true);
      });
    }
  }

  /** Les raccourcis de l'ajout rapide sont écoutés ici, faute de FAB monté en permanence. */
  @HostListener('window:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    this.quickAdd()?.handleKey(event);
  }

  protected async applyUpdate(): Promise<void> {
    await this.store.flush();
    await this.swUpdate.activateUpdate();
    location.reload();
  }

  protected syncTitle(): string {
    const at = this.store.lastSyncedAt();
    if (this.store.syncState() === 'erreur') return this.store.lastError() ?? 'Erreur';
    return at ? `Dernier enregistrement : ${new Date(at).toLocaleString('fr-FR')}` : '';
  }
}
