import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Note } from '../../core/models';
import { NoteService } from '../../core/services/note.service';
import { SubjectService } from '../../core/services/subject.service';

@Component({
  selector: 'app-note-list',
  imports: [RouterLink, DatePipe],
  template: `
    <div class="stack">
      <a [routerLink]="['/sujets', id()]" class="small muted">← {{ subject()?.name }}</a>

      <div class="row">
        <div>
          <h1>🧩 Notes d’encodage</h1>
          <p class="muted">
            Encoder, c’est organiser avant de mémoriser : regrouper, simplifier, comparer, relier,
            comprendre.
          </p>
        </div>
        <span class="spacer"></span>
        <button class="btn btn-primary" (click)="create()">+ Nouvelle note</button>
      </div>

      @if (notes().length) {
        <div class="stack">
          @for (n of notes(); track n.id) {
            <a [routerLink]="['/sujets', id(), 'notes', n.id]" class="card note">
              <div class="row">
                <strong>{{ n.title }}</strong>
                <span class="spacer"></span>
                <span class="muted small">{{ n.updatedAt | date: 'dd/MM/yyyy' }}</span>
              </div>
              <div class="row">
                @for (m of methods(n); track m.label) {
                  <span class="badge" [class.badge-primary]="m.filled">{{ m.label }}</span>
                }
              </div>
            </a>
          }
        </div>
      } @else {
        <div class="card empty">
          <div class="empty-icon">🧩</div>
          <p>Aucune note. Créez-en une pour traiter le contenu avant de le mémoriser.</p>
        </div>
      }
    </div>
  `,
  styles: `
    .note {
      display: flex;
      flex-direction: column;
      gap: 10px;
      color: var(--text);
    }

    .note:hover {
      border-color: var(--primary);
    }
  `,
})
export class NoteList {
  readonly id = input.required<string>();

  private readonly noteService = inject(NoteService);
  private readonly subjects = inject(SubjectService);
  private readonly router = inject(Router);

  protected readonly subject = computed(() => this.subjects.byId(this.id()));
  protected readonly notes = computed(() => this.noteService.bySubject(this.id()));

  /** Aperçu des 5 méthodes d'encodage effectivement renseignées. */
  protected methods(note: Note) {
    return [
      { label: 'Regroupements', filled: note.groupings.length > 0 },
      { label: 'Simplification', filled: !!note.simplification.trim() },
      { label: 'Analogies', filled: note.analogies.length > 0 },
      { label: 'Connexions', filled: note.connections.length > 0 },
      { label: 'Intuition', filled: !!note.intuition.trim() },
    ];
  }

  protected async create(): Promise<void> {
    const noteId = await this.noteService.create(this.id());
    void this.router.navigate(['/sujets', this.id(), 'notes', noteId]);
  }
}
