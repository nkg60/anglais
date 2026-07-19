# PERRIO

Application web d'apprentissage par flashcards et répétition espacée, structurée autour du système
PERRIO — un cadre de méta-apprentissage en 6 phases.

> Information → **Amorçage** → **Encodage** → Mémoire, avec une boucle de **récupération** qui
> renforce la trace à chaque passage. Ce qui n'est ni encodé ni récupéré finit oublié.

## Les 6 phases

| Phase | Rôle dans l'application |
|---|---|
| **P**riming — Amorçage | Checklist de 3 questions à remplir en 2 minutes avant chaque session |
| **E**ncoding — Encodage | Éditeur de notes en 5 sections : regroupements, simplification, analogies, connexions, intuition |
| **R**eference — Référence | Flashcards recto/verso, organisées par sujet et par tags |
| **R**etrieval — Récupération | Mode quiz avec auto-évaluation et répétition espacée (SM-2 simplifié) |
| **I**nterleaving — Entrelacement | Session mixte qui alterne les sujets à chaque carte |
| **O**verlearning — Sur-apprentissage | Indicateur de maîtrise 0–100 % et badge « Maîtrisé » |

## Stack

- **Angular 22** — composants standalone, signals, routes lazy, aucun framework CSS
- **PWA** — installable sur Android et iOS via `@angular/service-worker`
- **Netlify Functions** — une fonction unique exposée sur `/api/data`
- **Netlify Blobs** — les données, dans un document JSON côté serveur

Les données sont **stockées côté serveur** et suivent donc tous vos appareils : vider le cache du
navigateur ne détruit rien. En contrepartie, l'application **exige une connexion** — hors ligne, les
modifications ne partent pas et un bandeau le signale.

> ### ⚠️ Espace partagé, sans authentification
>
> Il n'y a ni compte ni cloisonnement : un seul jeu de données pour tout le site. **Toute personne
> connaissant l'URL peut lire, modifier et effacer les cartes.** Gardez l'adresse privée. Pour lever
> cette limite, il faudrait ajouter une clé de synchronisation secrète ou une vraie authentification.

## Documentation

- 📘 **[docs/GUIDE.md](docs/GUIDE.md)** — visite guidée de tous les écrans avec captures, et
  explication des chiffres affichés. Se lit sans rien connaître du projet.
- 🗄️ **[docs/DONNEES.md](docs/DONNEES.md)** — architecture de stockage, contrat de l'API, écritures
  concurrentes, export/import et format des données champ par champ.

## Démarrer

L'application a besoin de son API : `netlify dev` sert la fonction devant le serveur Angular.

```bash
npm install
npm run dev        # http://localhost:8888 — Angular + /api/data
```

`npm start` lance Angular seul (port 4200) : l'interface se charge mais toute écriture échoue,
faute d'API. À réserver au travail purement visuel.

Au premier lancement, l'espace serveur est vide : le client y dépose deux sujets d'exemple —
**Phrasal verbs** (8 cartes, une note d'encodage complète) et **Temps verbaux** (7 cartes).

## Déployer sur Netlify

```bash
npm run build      # sortie : dist/perrio/browser
```

`netlify.toml` est déjà configuré : commande de build, dossier publié, dossier des fonctions,
routage de `/api/*` avant la redirection SPA. En reliant le dépôt à Netlify, aucun réglage
supplémentaire n'est nécessaire — Netlify Blobs s'active sans provisionnement.

## Installer sur téléphone

L'application est une PWA : elle s'installe depuis le navigateur, sans passer par un store.

**Android (Chrome)** — ouvrez l'URL du site, puis menu ⋮ → *Ajouter à l'écran d'accueil* (ou
*Installer l'application*). Chrome propose parfois l'installation spontanément après quelques
secondes. L'icône rejoint le tiroir d'applications et l'app s'ouvre en plein écran, sans barre
d'adresse.

**iOS (Safari)** — bouton Partager → *Sur l'écran d'accueil*. Safari ignore le manifeste, d'où les
balises `apple-touch-icon` dans `index.html`.

Deux prérequis, tous deux déjà remplis en production : le site doit être servi en **HTTPS** (Netlify
le fait par défaut) et le **service worker** n'est actif que dans un build de production — en
`ng serve`, l'installation n'est pas proposée.

Un appui long sur l'icône donne accès à deux raccourcis : *Réviser* et *Sujets*.

### Ce que la PWA apporte — et ce qu'elle n'apporte pas

Elle apporte l'installation, le plein écran, le démarrage instantané et la mise en cache de
l'interface.

Elle **ne rend pas l'application utilisable hors ligne** : les cartes vivent sur le serveur, donc
sans réseau la coquille se charge mais aucune donnée ne s'affiche — un écran explicite le dit,
plutôt que de montrer des compteurs à zéro trompeurs. Rendre les révisions possibles hors ligne
supposerait de remettre un cache local et une file de synchronisation.

Quand une nouvelle version est déployée, le service worker la télécharge en arrière-plan et un
bandeau propose de recharger : sans cela, une PWA installée reste figée sur sa version.

## Algorithme de répétition espacée

SM-2 simplifié à trois notes (`src/app/core/algorithms/sm2.ts`) :

| Note | Effet |
|---|---|
| Raté | Répétitions remises à zéro, facilité −0,20, la carte revient en fin de session |
| Difficile | Intervalle × 1,2, facilité −0,15 |
| Facile | 1 jour, puis 3 jours, puis intervalle × facilité ; facilité +0,10 |

La facilité est bornée à [1,3 – 2,8].

## Calcul de la maîtrise

`src/app/core/algorithms/mastery.ts` — pondération :

- **55 %** taux de réussite sur les 20 dernières révisions du sujet
- **30 %** couverture : part des cartes ayant atteint 21 jours d'intervalle
- **15 %** régularité : jours étudiés sur les 14 derniers

Le badge « Maîtrisé » apparaît à partir de 85 %, avec au moins 10 cartes et 3 sessions.

## Structure

```
netlify/functions/
└── data.mts          API /api/data adossée à Netlify Blobs
docs/
├── GUIDE.md          visite guidée des écrans, avec captures
└── DONNEES.md        stockage, API, export/import et schéma détaillé
src/app/
├── core/
│   ├── algorithms/   sm2, maîtrise, série, dates
│   ├── data/         client HTTP, document, règles de fusion, jeu de démonstration
│   ├── models/       types partagés
│   └── services/     store, sujets, cartes, notes, amorçages, révision, stats, sauvegarde
└── features/
    ├── dashboard/    révisions dues, série, maîtrise globale
    ├── subjects/     liste et pipeline PERRIO en 6 étapes
    ├── priming/      checklist d'amorçage
    ├── encoding/     notes structurées en 5 méthodes
    ├── flashcards/   gestion des cartes
    ├── quick-add/    ajout rapide depuis n’importe quel écran
    ├── quick-add/    ajout rapide de cartes depuis n’importe quel écran
    ├── review/       session de récupération et session mixte
    ├── stats/        rétention, activité hebdomadaire, ancrage
    └── backup/       export / import / réinitialisation
```

## Raccourcis clavier

| Contexte | Touche | Effet |
|---|---|---|
| Partout | `N` | Ouvrir l'ajout rapide d'une carte |
| Ajout rapide | `Ctrl + Entrée` | Valider la carte et enchaîner |
| Ajout rapide | `Échap` | Fermer le formulaire |
| En session | `Espace` | Révéler la réponse |
| En session | `1` `2` `3` | Raté · difficile · facile |
