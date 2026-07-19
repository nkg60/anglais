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

📄 **[docs/DONNEES.md](docs/DONNEES.md)** — architecture de stockage, contrat de l'API, gestion des
écritures concurrentes, format du fichier de sauvegarde et description champ par champ.

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
    ├── review/       session de récupération et session mixte
    ├── stats/        rétention, activité hebdomadaire, ancrage
    └── backup/       export / import / réinitialisation
```

## Raccourcis clavier en session

`Espace` révèle la réponse · `1` raté · `2` difficile · `3` facile
