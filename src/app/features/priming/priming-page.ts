import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PrimingService } from '../../core/services/priming.service';
import { SubjectService } from '../../core/services/subject.service';

@Component({
  selector: 'app-priming-page',
  imports: [RouterLink, FormsModule, DatePipe],
  template: `
    <div class="stack">
      <a [routerLink]="['/sujets', id()]" class="small muted">← {{ subject()?.name }}</a>

      <div>
        <h1>🎯 Amorçage</h1>
        <p class="muted">
          Deux minutes avant d’attaquer. Répondre à ces trois questions active vos connaissances
          existantes et donne au cerveau des crochets où accrocher la suite.
        </p>
      </div>

      @if (saved()) {
        <div class="card done-banner">
          <strong>✓ Amorçage enregistré</strong>
          <p class="muted small">Vous êtes prêt à encoder. Bonne session !</p>
          <div class="row">
            <a [routerLink]="['/sujets', id(), 'notes']" class="btn btn-primary">
              Passer à l’encodage
            </a>
            <button class="btn" (click)="again()">Nouvel amorçage</button>
          </div>
        </div>
      } @else {
        <form class="card" (ngSubmit)="save()">
          <div class="field">
            <label for="known">1. Que sais-je déjà sur ce sujet ?</label>
            <textarea
              id="known"
              name="known"
              rows="3"
              [(ngModel)]="whatIKnow"
              placeholder="Notez tout ce qui vous vient, même approximatif."
            ></textarea>
            <div class="hint">Activer l’existant vaut mieux que partir d’une page blanche.</div>
          </div>

          <div class="field">
            <label for="goal">2. Qu’est-ce que je veux apprendre ?</label>
            <textarea
              id="goal"
              name="goal"
              rows="3"
              [(ngModel)]="whatIWantToLearn"
              placeholder="Un objectif précis vaut mieux que « tout comprendre »."
            ></textarea>
          </div>

          <div class="field">
            <label for="why">3. Pourquoi c’est important ?</label>
            <textarea
              id="why"
              name="why"
              rows="3"
              [(ngModel)]="whyItMatters"
              placeholder="À quoi cela va-t-il vous servir concrètement ?"
            ></textarea>
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="!valid()">
            Enregistrer l’amorçage
          </button>
          @if (!valid()) {
            <div class="hint">Remplissez au moins une réponse.</div>
          }
        </form>
      }

      @if (history().length) {
        <section>
          <div class="section-title">Amorçages précédents</div>
          <div class="stack">
            @for (p of history(); track p.id) {
              <article class="card">
                <div class="row small muted">
                  <span>{{ p.createdAt | date: 'dd/MM/yyyy à HH:mm' }}</span>
                  <span class="spacer"></span>
                  <button class="btn btn-ghost small-btn" (click)="remove(p.id)">Supprimer</button>
                </div>
                @if (p.whatIKnow) {
                  <p class="qa"><span class="q">Je sais déjà</span>{{ p.whatIKnow }}</p>
                }
                @if (p.whatIWantToLearn) {
                  <p class="qa"><span class="q">Je veux apprendre</span>{{ p.whatIWantToLearn }}</p>
                }
                @if (p.whyItMatters) {
                  <p class="qa"><span class="q">Pourquoi</span>{{ p.whyItMatters }}</p>
                }
              </article>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .done-banner {
      border-left: 3px solid var(--success);
    }

    .done-banner p {
      margin: 4px 0 12px;
    }

    .qa {
      margin: 8px 0 0;
      white-space: pre-wrap;
    }

    .q {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .small-btn {
      padding: 4px 10px;
      font-size: 0.8rem;
    }
  `,
})
export class PrimingPage {
  readonly id = input.required<string>();

  private readonly primings = inject(PrimingService);
  private readonly subjects = inject(SubjectService);

  protected readonly subject = computed(() => this.subjects.byId(this.id()));
  protected readonly history = computed(() => this.primings.bySubject(this.id()));

  protected readonly whatIKnow = signal('');
  protected readonly whatIWantToLearn = signal('');
  protected readonly whyItMatters = signal('');
  protected readonly saved = signal(false);

  protected readonly valid = computed(
    () =>
      !!(
        this.whatIKnow().trim() ||
        this.whatIWantToLearn().trim() ||
        this.whyItMatters().trim()
      ),
  );

  protected async save(): Promise<void> {
    if (!this.valid()) return;
    await this.primings.create(this.id(), {
      whatIKnow: this.whatIKnow().trim(),
      whatIWantToLearn: this.whatIWantToLearn().trim(),
      whyItMatters: this.whyItMatters().trim(),
    });
    this.saved.set(true);
  }

  protected again(): void {
    this.whatIKnow.set('');
    this.whatIWantToLearn.set('');
    this.whyItMatters.set('');
    this.saved.set(false);
  }

  protected async remove(primingId: string): Promise<void> {
    await this.primings.remove(primingId);
  }
}
