import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  MATIERE_COLORS,
  MATIERE_ICONS,
  MatiereService,
} from '../../core/services/matiere.service';
import { StoreService } from '../../core/services/store.service';

/**
 * Porte d'entrée de l'application : on choisit d'abord la matière à réviser.
 *
 * Tout le reste — tableau de bord, sessions, statistiques — se lit ensuite dans
 * ce périmètre. C'est ce qui permet d'ajouter du droit ou de l'anatomie sans que
 * les cartes d'anglais viennent s'y mêler.
 */
@Component({
  selector: 'app-matiere-select',
  imports: [FormsModule],
  template: `
    <div class="stack accueil">
      <div class="entete">
        <span class="logo">P</span>
        <h1>Que voulez-vous réviser ?</h1>
        <p class="muted">
          Chaque matière a ses propres sujets, ses cartes et ses statistiques. Vous pourrez en
          changer à tout moment.
        </p>
      </div>

      @if (matieres().length) {
        <div class="grid">
          @for (m of matieres(); track m.id) {
            <button class="card tuile" (click)="choisir(m.id)" [style.border-left-color]="m.color">
              <span class="icone" [style.background]="m.color + '22'">{{ m.icon }}</span>
              <strong>{{ m.name }}</strong>
              <span class="muted small clamp">{{ m.description || 'Sans description' }}</span>
              <span class="row small muted">
                <span class="badge">{{ service.subjectCount(m.id) }} sujet(s)</span>
                <span class="badge">{{ service.cardCount(m.id) }} carte(s)</span>
              </span>
            </button>
          }
        </div>
      }

      @if (creation()) {
        <form class="card" (ngSubmit)="creer()">
          <div class="section-title">Nouvelle matière</div>
          <div class="field">
            <label for="m-nom">Nom</label>
            <input id="m-nom" name="nom" [(ngModel)]="nom" placeholder="Ex. : Espagnol, Droit, Anatomie" />
          </div>
          <div class="field">
            <label for="m-desc">Description (facultatif)</label>
            <input id="m-desc" name="desc" [(ngModel)]="description" placeholder="Ce que couvre cette matière" />
          </div>
          <div class="field">
            <label>Icône</label>
            <div class="row">
              @for (i of icones; track i) {
                <button type="button" class="chip" [class.selected]="icone() === i" (click)="icone.set(i)">
                  {{ i }}
                </button>
              }
            </div>
          </div>
          <div class="field">
            <label>Couleur</label>
            <div class="row">
              @for (c of couleurs; track c) {
                <button
                  type="button"
                  class="pastille"
                  [class.selected]="couleur() === c"
                  [style.background]="c"
                  (click)="couleur.set(c)"
                  [attr.aria-label]="c"
                ></button>
              }
            </div>
          </div>
          <div class="row">
            <button type="submit" class="btn btn-primary" [disabled]="!nom().trim()">
              Créer et ouvrir
            </button>
            @if (matieres().length) {
              <button type="button" class="btn btn-ghost" (click)="creation.set(false)">Annuler</button>
            }
          </div>
        </form>
      } @else {
        <button class="btn ajout" (click)="creation.set(true)">＋ Ajouter une matière</button>
      }
    </div>
  `,
  styles: `
    .accueil {
      max-width: 620px;
      margin: 24px auto;
    }

    .entete {
      text-align: center;
    }

    .entete p {
      margin: 0;
    }

    .logo {
      display: inline-grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 13px;
      background: var(--primary);
      color: #fff;
      font-weight: 700;
      font-size: 1.3rem;
      margin-bottom: 12px;
    }

    .tuile {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      text-align: left;
      font: inherit;
      color: var(--text);
      cursor: pointer;
      border-left: 3px solid var(--primary);
      transition: transform 0.15s, box-shadow 0.15s;
    }

    .tuile:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgb(16 24 40 / 12%);
    }

    .icone {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      font-size: 1.2rem;
    }

    .clamp {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .ajout {
      align-self: center;
    }

    .chip {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--surface);
      font-size: 1.15rem;
      cursor: pointer;
    }

    .chip.selected {
      border-color: var(--primary);
      background: var(--primary-soft);
    }

    .pastille {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid transparent;
      padding: 0;
      cursor: pointer;
    }

    .pastille.selected {
      border-color: var(--text);
      outline: 2px solid var(--surface);
      outline-offset: -4px;
    }
  `,
})
export class MatiereSelect {
  protected readonly service = inject(MatiereService);
  private readonly store = inject(StoreService);
  private readonly router = inject(Router);

  protected readonly icones = MATIERE_ICONS;
  protected readonly couleurs = MATIERE_COLORS;

  protected readonly matieres = computed(() => this.service.list());
  protected readonly creation = signal(false);

  protected readonly nom = signal('');
  protected readonly description = signal('');
  protected readonly icone = signal(MATIERE_ICONS[0]);
  protected readonly couleur = signal(MATIERE_COLORS[0]);

  constructor() {
    // N'ouvrir le formulaire qu'une fois les données arrivées : avant cela la
    // liste est vide par construction, et l'écran proposerait de créer une
    // matière alors qu'« Anglais » existe déjà et n'attend qu'un clic.
    effect(() => {
      if (this.store.loaded() && this.matieres().length === 0) this.creation.set(true);
    });
  }

  protected choisir(id: string): void {
    this.service.select(id);
    void this.router.navigate(['/']);
  }

  protected creer(): void {
    const nom = this.nom().trim();
    if (!nom) return;
    const id = this.service.create({
      name: nom,
      description: this.description().trim(),
      icon: this.icone(),
      color: this.couleur(),
    });
    this.nom.set('');
    this.description.set('');
    this.creation.set(false);
    this.choisir(id);
  }
}
