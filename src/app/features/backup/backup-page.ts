import { Component, inject, signal } from '@angular/core';
import { BackupService, ImportMode, ImportReport } from '../../core/services/backup.service';
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

        <div class="modes">
          <label class="mode" [class.selected]="mode() === 'merge'">
            <input type="radio" name="mode" value="merge" [checked]="mode() === 'merge'" (change)="mode.set('merge')" />
            <span>
              <strong>Fusionner</strong>
              <span class="muted small">
                Conserve tout ce qui est déjà là. Ajoute les nouveautés et ne met à jour une fiche
                existante que si la version importée est plus récente.
              </span>
            </span>
          </label>
          <label class="mode" [class.selected]="mode() === 'replace'">
            <input type="radio" name="mode" value="replace" [checked]="mode() === 'replace'" (change)="mode.set('replace')" />
            <span>
              <strong>Remplacer</strong>
              <span class="muted small">
                Efface le contenu actuel et restaure exactement l’état du fichier.
              </span>
            </span>
          </label>
        </div>

        <input type="file" accept="application/json" (change)="importData($event)" />

        @if (report(); as r) {
          <div class="report">
            <span class="badge badge-success">{{ r.ajoutes }} ajoutés</span>
            @if (r.mode === 'merge') {
              <span class="badge badge-primary">{{ r.misAJour }} mis à jour</span>
              <span class="badge">{{ r.ignores }} déjà à jour</span>
              @if (r.orphelins > 0) {
                <span class="badge badge-warn">{{ r.orphelins }} orphelins ignorés</span>
              }
            }
          </div>
        }

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

    .modes {
      display: grid;
      gap: 8px;
      margin-bottom: 14px;
    }

    .mode {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      margin: 0;
      font-weight: 400;
    }

    .mode.selected {
      border-color: var(--primary);
      background: var(--primary-soft);
    }

    .mode input {
      width: auto;
      margin-top: 3px;
      accent-color: var(--primary);
    }

    .mode span span {
      display: block;
    }

    .report {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
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
  protected readonly mode = signal<ImportMode>('merge');
  protected readonly report = signal<ImportReport | null>(null);

  protected async exportData(): Promise<void> {
    await this.backup.export();
  }

  protected async importData(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const result = await this.backup.import(file, this.mode());
      this.isError.set(false);
      this.report.set(result);
      this.message.set(
        result.mode === 'merge'
          ? 'Fusion terminée : votre contenu existant a été conservé.'
          : 'Import terminé : vos données ont été remplacées.',
      );
    } catch (error) {
      this.isError.set(true);
      this.report.set(null);
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
