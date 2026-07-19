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
- **Dexie / IndexedDB** — toutes les données restent dans le navigateur
- **Netlify** — hébergement statique

Il n'y a **ni serveur ni compte utilisateur**. La contrepartie : les données sont liées à ce
navigateur, sur cet appareil. L'écran « Données » permet d'exporter et de réimporter une sauvegarde
JSON complète pour changer d'appareil ou se prémunir d'une perte.

📄 **[docs/DONNEES.md](docs/DONNEES.md)** — format du fichier de sauvegarde, description champ par
champ des six tables, et règles à respecter pour éditer une sauvegarde à la main.

## Démarrer

```bash
npm install
npm start          # http://localhost:4200
```

Au premier lancement, deux sujets d'exemple sont créés : **Phrasal verbs** (8 cartes, une note
d'encodage complète) et **Temps verbaux** (7 cartes).

## Déployer sur Netlify

```bash
npm run build      # sortie : dist/perrio/browser
```

`netlify.toml` est déjà configuré (commande de build, dossier publié, redirection SPA). En reliant
le dépôt à Netlify, aucun réglage supplémentaire n'est nécessaire.

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
docs/
└── DONNEES.md        format d'export/import et schéma détaillé
src/app/
├── core/
│   ├── algorithms/   sm2, maîtrise, série, dates
│   ├── db/           schéma Dexie et jeu de démonstration
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
