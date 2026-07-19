import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
    title: 'Tableau de bord — PERRIO',
  },
  {
    path: 'sujets',
    loadComponent: () => import('./features/subjects/subject-list').then((m) => m.SubjectList),
    title: 'Sujets — PERRIO',
  },
  {
    path: 'sujets/:id',
    loadComponent: () => import('./features/subjects/subject-detail').then((m) => m.SubjectDetail),
    title: 'Sujet — PERRIO',
  },
  {
    path: 'sujets/:id/amorcage',
    loadComponent: () => import('./features/priming/priming-page').then((m) => m.PrimingPage),
    title: 'Amorçage — PERRIO',
  },
  {
    path: 'sujets/:id/notes',
    loadComponent: () => import('./features/encoding/note-list').then((m) => m.NoteList),
    title: 'Notes d’encodage — PERRIO',
  },
  {
    path: 'sujets/:id/notes/:noteId',
    loadComponent: () => import('./features/encoding/note-editor').then((m) => m.NoteEditor),
    title: 'Éditeur de notes — PERRIO',
  },
  {
    path: 'sujets/:id/cartes',
    loadComponent: () => import('./features/flashcards/flashcard-list').then((m) => m.FlashcardList),
    title: 'Flashcards — PERRIO',
  },
  {
    path: 'reviser',
    loadComponent: () => import('./features/review/review-page').then((m) => m.ReviewPage),
    title: 'Révision — PERRIO',
  },
  {
    path: 'statistiques',
    loadComponent: () => import('./features/stats/stats-page').then((m) => m.StatsPage),
    title: 'Statistiques — PERRIO',
  },
  {
    path: 'donnees',
    loadComponent: () => import('./features/backup/backup-page').then((m) => m.BackupPage),
    title: 'Mes données — PERRIO',
  },
  { path: '**', redirectTo: '' },
];
