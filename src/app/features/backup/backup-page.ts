import { Component, inject, signal } from '@angular/core';
import { BackupService } from '../../core/services/backup.service';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-backup-page',
  template: `
    <div class="stack">
      <div>
        <h1>💾 Mes données</h1>
        <p class="muted">
          Tout est stocké dans ce navigateur, sur cet appareil. Rien n’est envoyé sur un serveur —
          exportez régulièrement pour ne rien perdre.
        </p>
      </div>

      <div class="card">
        <div class="section-title">Contenu local</div>
        <div class="counts">
          <span class="badge">{{ store.subjects().length }} sujets</span>
          <span class="badge">{{ store.flashcards().length }} cartes</span>
          <span class="badge">{{ store.notes().length }} notes</span>
          <span class="badge">{{ store.primings().length }} amorçages</span>
          <span class="badge">{{ store.reviews().length }} révisions</span>
          <span class="badge">{{ store.sessions().length }} sessions</span>
        </div>
      </div>

      <div class="card">
        <div class="section-title">Exporter</div>
        <p class="muted small">
          Télécharge un fichier JSON contenant l’intégralité de vos données.
        </p>
        <button class="btn btn-primary" (click)="exportData()">Télécharger la sauvegarde</button>
      </div>

      <div class="card">
        <div class="section-title">Importer</div>
        <p class="muted small">
          <strong>Attention :</strong> l’import remplace intégralement le contenu actuel de ce
          navigateur.
        </p>
        <input type="file" accept="application/json" (change)="importData($event)" />
        @if (message(); as m) {
          <p class="small" [class.error]="isError()">{{ m }}</p>
        }
      </div>

      <div class="card">
        <div class="section-title">Réinitialiser</div>
        <p class="muted small">
          Efface toute la base locale et recharge les deux sujets d’exemple.
        </p>
        <button class="btn btn-danger" (click)="reset()">Tout effacer</button>
      </div>
    </div>
  `,
  styles: `
    .counts {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .error {
      color: var(--danger);
    }
  `,
})
export class BackupPage {
  protected readonly store = inject(StoreService);
  private readonly backup = inject(BackupService);

  protected readonly message = signal<string | null>(null);
  protected readonly isError = signal(false);

  protected async exportData(): Promise<void> {
    await this.backup.export();
  }

  protected async importData(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      await this.backup.import(file);
      this.isError.set(false);
      this.message.set('Import réussi : vos données ont été remplacées.');
    } catch (error) {
      this.isError.set(true);
      this.message.set(error instanceof Error ? error.message : 'Import impossible.');
    } finally {
      input.value = '';
    }
  }

  protected async reset(): Promise<void> {
    if (!confirm('Effacer définitivement toutes vos données locales ?')) return;
    await this.backup.reset();
  }
}
