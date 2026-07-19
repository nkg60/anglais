import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
    title: 'PERRIO — Tableau de bord',
  },
  {
    path: 'sujets',
    loadComponent: () => import('./features/subjects/subject-list').then((m) => m.SubjectList),
    title: 'PERRIO — Sujets',
  },
  {
    path: 'sujets/:id',
    loadComponent: () => import('./features/subjects/subject-detail').then((m) => m.SubjectDetail),
    title: 'PERRIO — Sujet',
  },
  {
    path: 'sujets/:id/amorcage',
    loadComponent: () => import('./features/priming/priming-page').then((m) => m.PrimingPage),
    title: 'PERRIO — Amorçage',
  },
  {
    path: 'sujets/:id/notes',
    loadComponent: () => import('./features/encoding/note-list').then((m) => m.NoteList),
    title: 'PERRIO — Notes d’encodage',
  },
  {
    path: 'sujets/:id/notes/:noteId',
    loadComponent: () => import('./features/encoding/note-editor').then((m) => m.NoteEditor),
    title: 'PERRIO — Éditeur de notes',
  },
  {
    path: 'sujets/:id/cartes',
    loadComponent: () => import('./features/flashcards/flashcard-list').then((m) => m.FlashcardList),
    title: 'PERRIO — Flashcards',
  },
  {
    path: 'reviser',
    loadComponent: () => import('./features/review/review-page').then((m) => m.ReviewPage),
    title: 'PERRIO — Révision',
  },
  {
    path: 'statistiques',
    loadComponent: () => import('./features/stats/stats-page').then((m) => m.StatsPage),
    title: 'PERRIO — Statistiques',
  },
  {
    path: 'donnees',
    loadComponent: () => import('./features/backup/backup-page').then((m) => m.BackupPage),
    title: 'PERRIO — Mes données',
  },
  { path: '**', redirectTo: '' },
];
