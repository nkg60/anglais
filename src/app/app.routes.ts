import { Routes } from '@angular/router';
import { matiereGuard } from './core/guards/matiere.guard';

export const routes: Routes = [
  {
    path: 'matieres',
    loadComponent: () => import('./features/matieres/matiere-select').then((m) => m.MatiereSelect),
    title: 'PERRIO — Choisir une matière',
  },
  {
    path: '',
    canActivate: [matiereGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
    title: 'PERRIO — Tableau de bord',
  },
  {
    path: 'sujets',
    canActivate: [matiereGuard],
    loadComponent: () => import('./features/subjects/subject-list').then((m) => m.SubjectList),
    title: 'PERRIO — Sujets',
  },
  {
    path: 'sujets/:id',
    canActivate: [matiereGuard],
    loadComponent: () => import('./features/subjects/subject-detail').then((m) => m.SubjectDetail),
    title: 'PERRIO — Sujet',
  },
  {
    path: 'sujets/:id/amorcage',
    canActivate: [matiereGuard],
    loadComponent: () => import('./features/priming/priming-page').then((m) => m.PrimingPage),
    title: 'PERRIO — Amorçage',
  },
  {
    path: 'sujets/:id/notes',
    canActivate: [matiereGuard],
    loadComponent: () => import('./features/encoding/note-list').then((m) => m.NoteList),
    title: 'PERRIO — Notes d’encodage',
  },
  {
    path: 'sujets/:id/notes/:noteId',
    canActivate: [matiereGuard],
    loadComponent: () => import('./features/encoding/note-editor').then((m) => m.NoteEditor),
    title: 'PERRIO — Éditeur de notes',
  },
  {
    path: 'sujets/:id/cartes',
    canActivate: [matiereGuard],
    loadComponent: () => import('./features/flashcards/flashcard-list').then((m) => m.FlashcardList),
    title: 'PERRIO — Flashcards',
  },
  {
    path: 'reviser',
    canActivate: [matiereGuard],
    loadComponent: () => import('./features/review/review-page').then((m) => m.ReviewPage),
    title: 'PERRIO — Révision',
  },
  {
    path: 'statistiques',
    canActivate: [matiereGuard],
    loadComponent: () => import('./features/stats/stats-page').then((m) => m.StatsPage),
    title: 'PERRIO — Statistiques',
  },
  {
    path: 'donnees',
    canActivate: [matiereGuard],
    loadComponent: () => import('./features/backup/backup-page').then((m) => m.BackupPage),
    title: 'PERRIO — Mes données',
  },
  { path: '**', redirectTo: '' },
];
