import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Analogy, Connection } from '../../core/models';
import { MatiereService } from '../../core/services/matiere.service';
import { NoteService } from '../../core/services/note.service';
import { SubjectService } from '../../core/services/subject.service';

/** Un regroupement en cours d'édition : les éléments se saisissent ligne par ligne. */
interface GroupingDraft {
  title: string;
  itemsText: string;
}

@Component({
  selector: 'app-note-editor',
  imports: [RouterLink, FormsModule],
  template: `
    <div class="stack">
      <a [routerLink]="['/sujets', id(), 'notes']" class="small muted">← Notes du sujet</a>

      <div class="field">
        <label for="title">Titre de la note</label>
        <input id="title" name="title" [(ngModel)]="title" />
      </div>

      <!-- 1. Regroupement -->
      <section class="card method">
        <div class="method-head">
          <h3>📦 Regroupement</h3>
          <p class="muted small">
            Le cerveau retient mieux par paquets de 3 à 5 éléments qu’en liste plate.
          </p>
        </div>

        @for (g of groupings(); track $index; let i = $index) {
          <div class="sub-card">
            <div class="row">
              <input
                [ngModel]="g.title"
                (ngModelChange)="setGroupingTitle(i, $event)"
                [name]="'g-title-' + i"
                placeholder="Nom du groupe"
              />
              <button class="btn btn-ghost icon-btn" (click)="removeGrouping(i)" title="Supprimer">
                ✕
              </button>
            </div>
            <textarea
              [ngModel]="g.itemsText"
              (ngModelChange)="setGroupingItems(i, $event)"
              [name]="'g-items-' + i"
              rows="3"
              placeholder="Un élément par ligne"
            ></textarea>
          </div>
        }
        <button class="btn" (click)="addGrouping()">+ Ajouter un groupe</button>
      </section>

      <!-- 2. Simplification -->
      <section class="card method">
        <div class="method-head">
          <h3>🧒 Simplification</h3>
          <p class="muted small">
            Explique-le à un enfant de 10 ans. Si vous n’y arrivez pas, vous ne l’avez pas encore
            compris.
          </p>
        </div>
        <textarea
          name="simplification"
          rows="4"
          [(ngModel)]="simplification"
          placeholder="En mots simples, sans jargon…"
        ></textarea>
      </section>

      <!-- 3. Analogies -->
      <section class="card method">
        <div class="method-head">
          <h3>🔗 Analogies</h3>
          <p class="muted small">Rattacher l’inconnu à quelque chose de déjà familier.</p>
        </div>

        @for (a of analogies(); track $index; let i = $index) {
          <div class="sub-card">
            <div class="row">
              <input
                [ngModel]="a.concept"
                (ngModelChange)="setAnalogy(i, 'concept', $event)"
                [name]="'a-concept-' + i"
                placeholder="Le concept"
              />
              <button class="btn btn-ghost icon-btn" (click)="removeAnalogy(i)">✕</button>
            </div>
            <textarea
              [ngModel]="a.analogy"
              (ngModelChange)="setAnalogy(i, 'analogy', $event)"
              [name]="'a-text-' + i"
              rows="2"
              placeholder="C’est comme…"
            ></textarea>
          </div>
        }
        <button class="btn" (click)="addAnalogy()">+ Ajouter une analogie</button>
      </section>

      <!-- 4. Connexions -->
      <section class="card method">
        <div class="method-head">
          <h3>🕸️ Connexions</h3>
          <p class="muted small">
            Relier au reste de ce que vous savez : plus il y a de chemins d’accès, plus la
            récupération est facile.
          </p>
        </div>

        @for (c of connections(); track $index; let i = $index) {
          <div class="sub-card">
            <div class="row">
              <textarea
                [ngModel]="c.text"
                (ngModelChange)="setConnection(i, 'text', $event)"
                [name]="'c-text-' + i"
                rows="2"
                placeholder="Ce point rejoint…"
              ></textarea>
              <button class="btn btn-ghost icon-btn" (click)="removeConnection(i)">✕</button>
            </div>
            <select
              [ngModel]="c.relatedSubjectId ?? ''"
              (ngModelChange)="setConnection(i, 'relatedSubjectId', $event)"
              [name]="'c-subject-' + i"
            >
              <option value="">Aucun sujet lié</option>
              @for (s of otherSubjects(); track s.id) {
                <option [value]="s.id">{{ s.icon }} {{ s.name }}</option>
              }
            </select>
          </div>
        }
        <button class="btn" (click)="addConnection()">+ Ajouter une connexion</button>
      </section>

      <!-- 5. Intuition -->
      <section class="card method">
        <div class="method-head">
          <h3>💡 Compréhension intuitive</h3>
          <p class="muted small">
            Le principe sous-jacent, celui qui permet de retrouver la règle sans l’avoir apprise par
            cœur.
          </p>
        </div>
        <textarea
          name="intuition"
          rows="4"
          [(ngModel)]="intuition"
          placeholder="Au fond, la logique c’est…"
        ></textarea>
      </section>

      <div class="actions card">
        <button class="btn btn-primary" (click)="save()">
          {{ savedAt() ? '✓ Enregistré' : 'Enregistrer' }}
        </button>
        <span class="spacer"></span>
        <button class="btn btn-danger" (click)="remove()">Supprimer la note</button>
      </div>
    </div>
  `,
  styles: `
    .method-head h3 {
      margin-bottom: 2px;
    }

    .method-head p {
      margin-bottom: 12px;
    }

    .method {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .sub-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-alt);
    }

    .sub-card .row {
      flex-wrap: nowrap;
      align-items: flex-start;
    }

    .icon-btn {
      flex: 0 0 auto;
      padding: 8px 10px;
    }

    .actions {
      position: sticky;
      bottom: 76px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    @media (min-width: 720px) {
      .actions {
        bottom: 16px;
      }
    }
  `,
})
export class NoteEditor {
  readonly id = input.required<string>();
  readonly noteId = input.required<string>();

  private readonly notes = inject(NoteService);
  private readonly subjects = inject(SubjectService);
  private readonly matieres = inject(MatiereService);
  private readonly router = inject(Router);

  protected readonly title = signal('');
  protected readonly groupings = signal<GroupingDraft[]>([]);
  protected readonly simplification = signal('');
  protected readonly analogies = signal<Analogy[]>([]);
  protected readonly connections = signal<Connection[]>([]);
  protected readonly intuition = signal('');
  protected readonly savedAt = signal<string | null>(null);
  /** Empêche l'effet de chargement d'écraser les saisies en cours. */
  private readonly loaded = signal(false);

  protected readonly otherSubjects = computed(() =>
    this.matieres.subjects().filter((s) => s.id !== this.id()),
  );

  constructor() {
    // Charge la note dès que la route (donc l'identifiant) est résolue.
    effect(() => {
      const note = this.notes.byId(this.noteId());
      if (!note || this.loaded()) return;
      this.loaded.set(true);
      this.title.set(note.title);
      this.groupings.set(
        note.groupings.map((g) => ({ title: g.title, itemsText: g.items.join('\n') })),
      );
      this.simplification.set(note.simplification);
      this.analogies.set(note.analogies.map((a) => ({ ...a })));
      this.connections.set(note.connections.map((c) => ({ ...c })));
      this.intuition.set(note.intuition);
    });
  }

  protected addGrouping(): void {
    this.groupings.update((g) => [...g, { title: '', itemsText: '' }]);
  }

  protected setGroupingTitle(index: number, value: string): void {
    this.groupings.update((g) => g.map((x, i) => (i === index ? { ...x, title: value } : x)));
  }

  protected setGroupingItems(index: number, value: string): void {
    this.groupings.update((g) => g.map((x, i) => (i === index ? { ...x, itemsText: value } : x)));
  }

  protected removeGrouping(index: number): void {
    this.groupings.update((g) => g.filter((_, i) => i !== index));
  }

  protected addAnalogy(): void {
    this.analogies.update((a) => [...a, { concept: '', analogy: '' }]);
  }

  protected setAnalogy(index: number, key: keyof Analogy, value: string): void {
    this.analogies.update((a) => a.map((x, i) => (i === index ? { ...x, [key]: value } : x)));
  }

  protected removeAnalogy(index: number): void {
    this.analogies.update((a) => a.filter((_, i) => i !== index));
  }

  protected addConnection(): void {
    this.connections.update((c) => [...c, { text: '' }]);
  }

  protected setConnection(index: number, key: keyof Connection, value: string): void {
    this.connections.update((c) =>
      c.map((x, i) => (i === index ? { ...x, [key]: value || undefined } : x)),
    );
  }

  protected removeConnection(index: number): void {
    this.connections.update((c) => c.filter((_, i) => i !== index));
  }

  protected async save(): Promise<void> {
    await this.notes.update(this.noteId(), {
      title: this.title().trim() || 'Sans titre',
      groupings: this.groupings().map((g) => ({
        title: g.title.trim(),
        items: g.itemsText
          .split('\n')
          .map((i) => i.trim())
          .filter(Boolean),
      })),
      simplification: this.simplification(),
      analogies: this.analogies().filter((a) => a.concept.trim() || a.analogy.trim()),
      connections: this.connections().filter((c) => c.text.trim()),
      intuition: this.intuition(),
    });
    this.savedAt.set(new Date().toISOString());
    setTimeout(() => this.savedAt.set(null), 2500);
  }

  protected async remove(): Promise<void> {
    if (!confirm('Supprimer cette note ?')) return;
    await this.notes.remove(this.noteId());
    void this.router.navigate(['/sujets', this.id(), 'notes']);
  }
}
