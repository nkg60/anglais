# Données : stockage, export et import

Ce document décrit où vivent les données de PERRIO, le format exact du fichier de sauvegarde, et
le rôle de chaque champ.

- Code concerné : [`src/app/core/services/backup.service.ts`](../src/app/core/services/backup.service.ts)
- Schéma de la base : [`src/app/core/db/db.ts`](../src/app/core/db/db.ts)
- Types TypeScript : [`src/app/core/models/index.ts`](../src/app/core/models/index.ts)

---

## 1. Où sont stockées les données

Tout est dans **IndexedDB**, la base de données intégrée au navigateur, sous le nom `perrio`.
Dexie sert de couche d'accès. Il n'y a aucun serveur : rien ne quitte l'appareil.

Conséquences concrètes :

| Situation | Effet sur les données |
|---|---|
| Vous changez de navigateur ou d'appareil | Vous repartez de zéro — les données ne suivent pas |
| Vous videz le cache / les données de site | **Tout est effacé définitivement** |
| Navigation privée | Les données disparaissent à la fermeture de la fenêtre |
| Le site est réhébergé sur un autre domaine | IndexedDB est cloisonnée par origine : nouvelle base vide |

L'export JSON est donc le **seul** mécanisme de sauvegarde et de transfert.

### Fonctionnement en mémoire

Au démarrage, `StoreService.init()` charge les six tables en mémoire dans des signals Angular.
Les écrans lisent ces signals de façon synchrone ; les services écrivent d'abord dans IndexedDB,
puis rafraîchissent le signal concerné. Les volumes visés (quelques milliers de lignes) tiennent
sans difficulté en RAM.

---

## 2. Exporter

Écran **Données** → *Télécharger la sauvegarde*.

Le fichier produit s'appelle `perrio-AAAA-MM-JJ.json` et contient l'intégralité des six tables,
sans filtrage ni compression. Il est lisible et modifiable à la main.

## 3. Importer

Écran **Données** → *Importer* → sélection du fichier.

> **L'import est un remplacement, pas une fusion.** Les six tables sont vidées puis réécrites avec
> le contenu du fichier. Tout ce qui existait dans ce navigateur et qui n'est pas dans le fichier
> est perdu. Exportez avant d'importer si vous avez le moindre doute.

Le tout s'exécute dans une transaction Dexie unique : en cas d'erreur en cours de route, IndexedDB
annule l'ensemble et la base reste dans son état précédent.

Un fichier dont le champ `format` ne vaut pas `"perrio-backup"` est rejeté avec le message
« Ce fichier n'est pas une sauvegarde PERRIO. »

### Transférer vers un autre appareil

1. Sur l'appareil source : *Télécharger la sauvegarde*
2. Transmettez le fichier (mail, clé USB, cloud)
3. Sur l'appareil cible : *Importer*, puis sélectionnez le fichier

### Réinitialiser

*Tout effacer* supprime la base IndexedDB et recharge la page. Les deux sujets d'exemple sont
alors recréés, puisque le seed se déclenche quand la table `subjects` est vide.

---

## 4. Format du fichier

```jsonc
{
  "format": "perrio-backup",     // garde-fou : rejeté si différent
  "version": 1,                  // version du format, pour les migrations futures
  "exportedAt": "2026-07-19T01:38:00.000Z",
  "subjects":   [ /* … */ ],
  "primings":   [ /* … */ ],
  "notes":      [ /* … */ ],
  "flashcards": [ /* … */ ],
  "reviews":    [ /* … */ ],
  "sessions":   [ /* … */ ]
}
```

Conventions communes à toutes les tables :

- **Identifiants** : UUID v4 générés par `crypto.randomUUID()`
- **Dates** : chaînes ISO 8601 en UTC (`2026-07-19T01:38:00.000Z`)
- **Relations** : par identifiant (`subjectId`, `cardId`, `sessionId`), sans contrainte d'intégrité
  côté base — c'est le code applicatif qui garantit la cohérence

---

## 5. Les six tables

### `subjects` — les sujets d'étude

```json
{
  "id": "8f2c…",
  "name": "Phrasal verbs",
  "description": "Les verbes à particule les plus courants.",
  "color": "#4f7cff",
  "icon": "🗣️",
  "createdAt": "2026-07-18T20:00:00.000Z",
  "updatedAt": "2026-07-18T20:00:00.000Z",
  "archived": false
}
```

`color` alimente les barres de progression et les accents visuels ; `archived` masque le sujet des
listes sans le supprimer.

Supprimer un sujet déclenche une **cascade applicative** : ses flashcards, notes, amorçages et
révisions sont effacés dans la même transaction (`SubjectService.remove`).

### `primings` — les amorçages

```json
{
  "id": "1a9d…",
  "subjectId": "8f2c…",
  "whatIKnow": "Je connais give up et look for.",
  "whatIWantToLearn": "Maîtriser 20 phrasal verbs courants.",
  "whyItMatters": "Pour comprendre les séries en VO.",
  "createdAt": "2026-07-19T01:20:00.000Z"
}
```

Chaque amorçage est conservé : l'historique montre l'évolution de ce que vous saviez déjà.

### `notes` — les notes d'encodage

Une note porte les cinq méthodes d'encodage dans des champs distincts.

```json
{
  "id": "4b7e…",
  "subjectId": "8f2c…",
  "title": "Comprendre la logique des particules",
  "groupings": [
    { "title": "Particules de séparation", "items": ["give up", "turn down", "put off"] }
  ],
  "simplification": "Un verbe simple + une particule qui change tout le sens.",
  "analogies": [
    { "concept": "Verbe + particule", "analogy": "Comme une pizza : même base, garniture différente." }
  ],
  "connections": [
    { "text": "Même logique que les verbes pronominaux français.", "relatedSubjectId": "c3d1…" }
  ],
  "intuition": "La particule indique une direction physique appliquée au sens figuré.",
  "createdAt": "2026-07-18T20:05:00.000Z",
  "updatedAt": "2026-07-19T01:25:00.000Z"
}
```

`relatedSubjectId` est facultatif. Dans l'éditeur, les éléments d'un regroupement se saisissent une
ligne par élément et sont convertis en tableau à l'enregistrement.

### `flashcards` — les cartes et leur état de répétition

```json
{
  "id": "d5f0…",
  "subjectId": "8f2c…",
  "front": "to give up",
  "back": "abandonner, renoncer — « She gave up smoking. »",
  "tags": ["phrasal verbs", "piège"],

  "ease": 2.5,
  "interval": 3,
  "repetitions": 2,
  "dueDate": "2026-07-22T01:30:00.000Z",
  "lapses": 1,

  "lastReviewedAt": "2026-07-19T01:30:00.000Z",
  "totalReviews": 4,
  "correctReviews": 3,

  "createdAt": "2026-07-18T20:10:00.000Z",
  "updatedAt": "2026-07-19T01:30:00.000Z",
  "suspended": false
}
```

Le bloc central est l'état SM-2 :

| Champ | Rôle |
|---|---|
| `ease` | Facteur de facilité, borné à [1.3 – 2.8], départ à 2.5 |
| `interval` | Intervalle courant en jours ; `0` signifie « à revoir dans la session même » |
| `repetitions` | Nombre de réussites consécutives ; remis à zéro à chaque échec |
| `dueDate` | Date de prochaine révision — c'est elle qui définit « dû aujourd'hui » |
| `lapses` | Nombre total d'échecs sur cette carte |

`totalReviews` et `correctReviews` servent au taux de réussite affiché par carte. `suspended`
retire la carte des sessions sans l'effacer.

### `reviews` — le journal des révisions

Table **immuable** : une ligne par notation, jamais modifiée ensuite. C'est la source de toutes les
statistiques (courbe de rétention, taux de réussite, maîtrise).

```json
{
  "id": "77aa…",
  "cardId": "d5f0…",
  "subjectId": "8f2c…",
  "sessionId": "e91b…",
  "rating": "easy",
  "reviewedAt": "2026-07-19T01:30:00.000Z",
  "intervalBefore": 1,
  "intervalAfter": 3,
  "easeAfter": 2.6
}
```

`rating` vaut `"again"` (raté), `"hard"` (difficile) ou `"easy"` (facile). `intervalBefore` et
`intervalAfter` permettent de rejouer l'historique d'une carte sans recalculer l'algorithme.

Supprimer une carte supprime aussi ses révisions.

### `sessions` — les sessions de révision

```json
{
  "id": "e91b…",
  "mode": "interleaving",
  "subjectIds": ["8f2c…", "c3d1…"],
  "startedAt": "2026-07-19T01:28:00.000Z",
  "endedAt": "2026-07-19T01:35:00.000Z",
  "cardsReviewed": 12,
  "correctCount": 9
}
```

`mode` vaut `"retrieval"` ou `"interleaving"`. `endedAt` reste `null` tant que la session est en
cours (fermeture d'onglet en plein milieu, par exemple).

Cette table alimente deux calculs : la **série de jours consécutifs** (un jour compte dès qu'il
contient au moins une session) et la composante **régularité** de la maîtrise. Une session en mode
`interleaving` valide par ailleurs la phase Entrelacement des sujets concernés.

---

## 6. Index de la base

Déclarés dans `db.ts`, ils conditionnent les requêtes rapides :

```
subjects     id, name, archived, createdAt
primings     id, subjectId, createdAt
notes        id, subjectId, updatedAt
flashcards   id, subjectId, dueDate, [subjectId+dueDate], suspended, *tags
reviews      id, cardId, subjectId, sessionId, reviewedAt
sessions     id, mode, startedAt
```

L'index composé `[subjectId+dueDate]` cible la requête la plus fréquente — « les cartes dues de ce
sujet » — et `*tags` est un index multi-entrées permettant de filtrer par tag.

---

## 7. Modifier une sauvegarde à la main

Le fichier étant du JSON simple, il est possible d'y injecter des cartes générées ailleurs
(tableur, script, export d'un autre outil). Pour qu'un import réussisse :

1. Conservez `"format": "perrio-backup"` et `"version": 1`
2. Chaque `id` doit être unique dans sa table — un doublon fait échouer le `bulkAdd`
3. Chaque `subjectId` d'une carte, note ou amorçage doit correspondre à un `id` présent dans
   `subjects`, sinon l'élément devient orphelin et n'apparaîtra nulle part
4. Une carte neuve se déclare avec `ease: 2.5`, `interval: 0`, `repetitions: 0`, `lapses: 0`,
   `totalReviews: 0`, `correctReviews: 0`, `lastReviewedAt: null`, `suspended: false` et une
   `dueDate` à maintenant ou dans le passé pour qu'elle soit immédiatement proposée
5. Les six tableaux doivent être présents ; un tableau absent est traité comme vide

---

## 8. Faire évoluer le schéma

Deux endroits à toucher de concert :

- **IndexedDB** : ajouter un `this.version(2).stores({ … })` dans `PerrioDb`, avec un `.upgrade()`
  si les lignes existantes doivent être transformées. Dexie applique la migration au prochain
  chargement.
- **Fichier de sauvegarde** : incrémenter `version` dans `BackupService`, et faire accepter à
  `import()` les anciennes versions en convertissant leurs données avant insertion — sans quoi les
  sauvegardes déjà téléchargées par les utilisateurs deviendraient illisibles.
