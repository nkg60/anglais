import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MatiereService } from '../services/matiere.service';
import { StoreService } from '../services/store.service';

/**
 * Interdit l'accès aux écrans tant qu'aucune matière n'est choisie.
 *
 * Couvre aussi le cas d'une matière mémorisée qui n'existe plus — supprimée
 * depuis un autre appareil, l'espace étant partagé.
 */
export const matiereGuard: CanActivateFn = async () => {
  const matieres = inject(MatiereService);
  const store = inject(StoreService);
  const router = inject(Router);

  // Sans cette attente, le garde s'exécuterait avant l'arrivée des données :
  // la matière mémorisée serait introuvable et l'écran de choix reviendrait à
  // chaque rechargement.
  await store.whenReady();

  return matieres.active() ? true : router.createUrlTree(['/matieres']);
};
