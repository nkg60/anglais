# PERRIO — fonctionnement de l'application et données

Ce document se lit à deux niveaux. La **partie I** explique ce que fait le logiciel et à quoi
ressemble chaque écran : elle ne suppose aucune connaissance préalable. La **partie II** décrit le
stockage et le format des données, pour qui doit intervenir sur le code.

---

# Partie I — Comprendre l'application

## 1. À quoi sert PERRIO

PERRIO est une application de **révision par cartes mémoire**. On y fabrique des cartes
question / réponse, puis l'application décide chaque jour lesquelles il faut revoir.

Le principe est celui de la **répétition espacée** : une notion qu'on vient d'apprendre s'oublie en
quelques jours, mais chaque fois qu'on parvient à se la remémorer, elle tient plus longtemps.
Plutôt que de tout relire indéfiniment, on ne revoit chaque carte qu'au moment où l'on est sur le
point de l'oublier. Une carte réussie revient dans 1 jour, puis 3, puis 8, puis 20… Une carte ratée
repart du début.

Cela ressemble à Anki ou Quizlet. La différence tient au cadre qui entoure les cartes : PERRIO
n'attaque pas directement la mémorisation, il fait passer chaque sujet par **six étapes** qui
préparent le terrain avant les cartes, puis creusent après.

Le contenu de démonstration porte sur l'anglais — verbes à particule et temps verbaux — mais
l'application est indifférente au domaine : elle marche aussi bien pour du droit, de l'anatomie ou
des commandes Docker.

---

## 2. Le système PERRIO en deux minutes

PERRIO est l'acronyme de six processus d'apprentissage. Le raisonnement de départ tient en une
phrase :

> Une information vue passe par un **amorçage** puis un **encodage** avant d'atteindre la mémoire ;
> chaque **récupération** réussie renforce sa trace. Ce qui n'est ni encodé ni récupéré est oublié.

| | Étape | Ce que ça veut dire | Ce que fait l'application |
|---|---|---|---|
| **P** | Priming — Amorçage | Préparer le cerveau *avant* d'étudier, pour qu'il ait des crochets où accrocher la suite | Trois questions à remplir en deux minutes |
| **E** | Encoding — Encodage | Organiser l'information au lieu de l'avaler brute | Un éditeur de notes en cinq sections |
| **R** | Reference — Référence | Déposer l'information quelque part pour pouvoir y revenir | La création des flashcards |
| **R** | Retrieval — Récupération | Se tester activement : c'est l'effort de rappel qui ancre, pas la relecture | Le mode révision |
| **I** | Interleaving — Entrelacement | Alterner les sujets au lieu de bloquer sur un seul | La session mixte |
| **O** | Overlearning — Sur-apprentissage | Continuer au-delà du « je crois que je sais » | L'indicateur de maîtrise |

L'ordre est une progression logique, pas une contrainte : rien n'oblige à faire l'amorçage avant de
créer des cartes. L'application affiche simplement où en est chaque sujet.

---

## 3. Visite guidée des écrans

Les captures ci-dessous proviennent de l'application réelle, remplie avec le contenu de
démonstration.

### 3.1 Tableau de bord — la page d'accueil

![Tableau de bord](captures/01-tableau-de-bord.png)

Elle répond à une seule question : *qu'est-ce que je fais maintenant ?*

- **À réviser** — le nombre de cartes dont la date de révision est arrivée. C'est le seul chiffre
  qui compte au quotidien.
- **Jours d'affilée** — la série. Un jour compte dès qu'au moins une session a eu lieu ; elle
  survit à la journée en cours tant qu'on a étudié la veille.
- **Cartes au total** et **maîtrise globale** — l'état d'ensemble.

En dessous, chaque sujet affiche sa barre de maîtrise et le nombre de cartes qui l'attendent. Le
bouton **Démarrer une session** n'apparaît que s'il y a effectivement quelque chose à réviser.

### 3.2 Page d'un sujet — le pipeline PERRIO

![Pipeline PERRIO](captures/02-pipeline-perrio.png)

C'est l'écran caractéristique de l'application. Les six étapes sont présentées comme un chemin :
celles qui sont entamées portent une coche colorée, les autres un numéro gris. À droite de chaque
étape, un compteur dit où l'on en est — *1 amorçage*, *8 cartes*, *4 révisions*.

En haut, la **maîtrise** du sujet est décomposée en ses trois composantes (réussite, ancrage,
régularité) pour qu'un pourcentage bas soit interprétable : 43 % avec « ancrage 0 % » ne signifie
pas qu'on répond mal, mais que les cartes sont encore jeunes.

Chaque étape a son bouton d'action, et toutes sont accessibles à tout moment.

### 3.3 Amorçage — trois questions avant de commencer

![Amorçage](captures/03-amorcage.png)

Trois champs libres : *Que sais-je déjà ?*, *Qu'est-ce que je veux apprendre ?*, *Pourquoi c'est
important ?*

L'intérêt n'est pas dans ce qu'on écrit mais dans le fait de l'écrire : formuler ce qu'on sait déjà
réactive les connaissances existantes, et se donner un objectif précis vaut mieux que « tout
comprendre ». Chaque amorçage est horodaté et conservé — relire ceux d'il y a un mois montre le
chemin parcouru.

### 3.4 Encodage — cinq façons de digérer l'information

![Éditeur de notes d'encodage](captures/04-encodage.png)

Un éditeur de notes découpé en cinq sections, une par méthode d'encodage :

1. **Regroupement** — ranger par paquets de 3 à 5 plutôt qu'en liste plate.
2. **Simplification** — l'expliquer à un enfant de 10 ans. Si on n'y arrive pas, on ne l'a pas
   compris.
3. **Analogies** — rattacher l'inconnu à du familier.
4. **Connexions** — relier à d'autres sujets, éventuellement par un lien explicite vers l'un d'eux.
5. **Compréhension intuitive** — le principe sous-jacent, celui qui permet de retrouver la règle
   sans l'avoir apprise par cœur.

Ces sections sont un garde-fou : laissé libre, on recopie le cours ; contraint par cinq cases, on
est obligé de le transformer.

### 3.5 Flashcards — la mémoire externe

![Gestion des flashcards](captures/05-flashcards.png)

Les cartes recto / verso du sujet. Chacune peut porter des **tags** (ici *phrasal verbs*, *piège*),
qui servent à filtrer la liste.

Sous chaque carte figure son état : *nouvelle*, ou bien son taux de réussite et la date de sa
prochaine apparition. Trois actions sont disponibles : **Modifier**, **Réinitialiser** (la carte
repart de zéro dans le cycle de répétition) et **Suspendre** (elle sort des révisions sans être
supprimée).

### 3.6 Réviser — le choix de la session

![Choix de la session](captures/06-reviser-choix.png)

Deux modes :

- **Récupération** — un ou plusieurs sujets, cartes mélangées au hasard.
- **Session mixte** — les cartes alternent d'un sujet à l'autre à chaque question. C'est
  volontairement plus difficile : passer sans arrêt d'un contexte à l'autre oblige à identifier de
  quoi il s'agit avant de répondre, ce qui ancre mieux qu'une série homogène.

La liste des sujets indique combien de cartes chacun a de dues, et le total prêt à être révisé.

### 3.7 En session

![Carte en cours de révision](captures/07-session-carte.png)

Une carte s'affiche, question seule. On essaie de répondre **de tête** — c'est l'effort de rappel
qui fait tout le travail — puis on révèle la réponse et on s'auto-évalue :

| Bouton | Quand l'utiliser | Effet |
|---|---|---|
| **Raté** | Je ne savais pas | La carte revient avant la fin de la session |
| **Difficile** | Retrouvé, mais péniblement | Intervalle à peine allongé |
| **Facile** | Immédiat | Intervalle nettement allongé |

Chaque bouton affiche le délai qu'il déclenche, donc aucune surprise. Au clavier : `Espace` révèle,
puis `1`, `2`, `3`.

À la fin, un bilan récapitule le nombre de révisions et le taux de réussite.

![Bilan de session](captures/08-bilan.png)

### 3.8 Statistiques

![Statistiques](captures/09-statistiques.png)

Quatre indicateurs en tête, puis :

- **Taux de réussite sur 30 jours** — les jours sans révision comptent comme un creux, la courbe
  reflète donc autant la régularité que la performance.
- **Sessions par semaine** — la constance sur deux mois.
- **Ancrage des cartes** — la répartition entre *nouvelles*, *en cours* et *ancrées*. Une carte est
  dite ancrée quand son intervalle a dépassé 21 jours. C'est l'indicateur le plus honnête :
  tant que la barre verte est vide, rien n'est encore acquis à long terme.
- **Maîtrise par sujet** — où concentrer l'effort.

### 3.9 Données

![Écran Données](captures/10-donnees.png)

L'inventaire de ce que contient l'espace, l'export et l'import d'une sauvegarde JSON, et la
réinitialisation complète. Le fonctionnement détaillé de ces opérations fait l'objet de la partie II.

### 3.10 Sur téléphone

![Vue mobile](captures/11-mobile.png)

L'interface est conçue pour le mobile d'abord : la navigation passe en bas de l'écran, à portée de
pouce. L'application s'installe depuis le navigateur (Chrome → *Ajouter à l'écran d'accueil*) et
s'ouvre alors en plein écran, comme une application native.

---

## 4. D'où viennent les chiffres

### La planification des révisions

L'algorithme est une version simplifiée de **SM-2**, celui d'Anki. Chaque carte porte un
*intervalle* (dans combien de jours la revoir) et une *facilité* (à quel point elle est aisée pour
vous, de 1,3 à 2,8 — départ à 2,5).

| Note | Intervalle | Facilité |
|---|---|---|
| Raté | remis à zéro, la carte revient dans la session | −0,20 |
| Difficile | × 1,2 | −0,15 |
| Facile | 1 jour, puis 3 jours, puis × facilité | +0,10 |

Une carte souvent ratée voit sa facilité baisser, donc ses intervalles se resserrer : elle revient
plus souvent, automatiquement. À l'inverse, une carte maîtrisée s'espace vite et cesse d'encombrer.

Détail qui surprend au début : sur une carte neuve, *Difficile* et *Facile* donnent tous deux
1 jour. Les intervalles ne divergent qu'à partir de la deuxième réussite.

### La maîtrise d'un sujet

Un pourcentage de 0 à 100, pondéré ainsi :

| Poids | Composante | Mesure |
|---|---|---|
| 55 % | Réussite | Part de réponses non ratées sur les 20 dernières révisions |
| 30 % | Ancrage | Part des cartes ayant dépassé 21 jours d'intervalle |
| 15 % | Régularité | Jours étudiés sur les 14 derniers |

Le badge **🏆 Maîtrisé** apparaît à partir de 85 %, et seulement avec au moins 10 cartes et
3 sessions — sans quoi un sujet d'une seule carte réussie afficherait la maîtrise maximale.

La composante *ancrage* est ce qui empêche de tricher : elle ne peut monter qu'avec le temps, aucune
session intensive ne la fait bouger en un jour.

### La série

Le nombre de jours consécutifs comportant au moins une session. Elle ne se casse pas parce qu'on n'a
pas encore étudié aujourd'hui : tant qu'on a étudié hier, elle tient.

---

# Partie II — Les données

Cette partie s'adresse à qui doit intervenir sur le code, migrer les données ou reprendre le projet.
Elle décrit où vivent les données, le format exact du fichier de sauvegarde et le rôle de chaque
champ.

- Fonction serveur : [`netlify/functions/data.mts`](../netlify/functions/data.mts)
- Client HTTP : [`src/app/core/data/data-api.service.ts`](../src/app/core/data/data-api.service.ts)
- Store et synchronisation : [`src/app/core/services/store.service.ts`](../src/app/core/services/store.service.ts)
- Règles de fusion : [`src/app/core/data/merge.ts`](../src/app/core/data/merge.ts)
- Export / import : [`src/app/core/services/backup.service.ts`](../src/app/core/services/backup.service.ts)
- Types TypeScript : [`src/app/core/models/index.ts`](../src/app/core/models/index.ts)

---

## 5. Où sont stockées les données

Côté **serveur**, dans **Netlify Blobs** : un unique document JSON, sous la clé `dataset` du store
`perrio`, contenant les six collections. Les données suivent donc tous vos appareils, et vider le
cache du navigateur ne détruit plus rien.

> ### ⚠️ L'espace est partagé et sans authentification
>
> Il n'y a ni compte ni cloisonnement : **un seul jeu de données pour tout le site**. Toute personne
> connaissant l'adresse Netlify peut lire, modifier et effacer vos cartes. Gardez l'URL privée.
>
> Pour lever cette limite, deux directions possibles : une clé de synchronisation secrète tirée au
> premier lancement et servant de préfixe de clé blob, ou une véritable authentification.

### Le cycle de vie d'une modification

1. Au démarrage, `StoreService.init()` fait un `GET /api/data` et place les six collections dans
   des signals Angular. Si l'espace est vide, le client y dépose le jeu de démonstration.
2. Les écrans lisent ces signals de façon **synchrone** — l'interface ne montre jamais de spinner
   entre deux clics.
3. Chaque modification passe par `store.mutate()`, qui applique le changement en mémoire puis
   programme un enregistrement.
4. Les enregistrements sont **regroupés sur 500 ms** : une session de révision génère beaucoup
   d'écritures, on évite d'en faire une requête chacune.
5. Un indicateur dans la barre supérieure affiche l'état : *chargement*, *enregistrement*,
   *synchronisé* ou *erreur*.

Conséquence à connaître : l'application **exige une connexion**. Hors ligne, la consultation reste
possible tant que l'onglet est ouvert, mais les modifications ne partent pas et l'indicateur passe
au rouge. Un bandeau propose alors de réessayer.

Avant la fermeture de l'onglet, un `beforeunload` force l'envoi de ce qui n'est pas encore parti.

### Le service worker ne met jamais les données en cache

L'application est installable (PWA) et son service worker met en cache la coquille — HTML, JS, CSS,
icônes. **Les appels à `/api/data` en sont exclus** : `ngsw-config.json` retire `/api/**` des
`navigationUrls`, et aucun `dataGroup` n'est déclaré. Une réponse périmée servie depuis le cache
serait pire que pas de réponse du tout, puisqu'elle réécrirait ensuite le serveur avec un état
dépassé.

Conséquence hors ligne : la coquille se charge instantanément, mais aucune donnée n'est disponible.
L'application affiche alors un écran d'erreur explicite au lieu de compteurs à zéro qui laisseraient
croire à un espace vide.

---

## 6. L'API

Une seule fonction Netlify, exposée sur `/api/data`.

| Méthode | Effet |
|---|---|
| `GET` | Renvoie `{ revision, token, updatedAt, data }`. `data` vaut `null` si l'espace n'a jamais été écrit. |
| `PUT` | Corps `{ token, data }`. Renvoie `{ revision, token, updatedAt }`, ou **409** si le jeton est périmé. |
| `DELETE` | Vide l'espace. Le jeu de démonstration sera recréé au prochain chargement. |

### Le jeton de version et les écritures concurrentes

Le `token` identifie la version sur laquelle se fonde une écriture. Le serveur refuse un `PUT` dont
le jeton ne correspond plus à l'état stocké : sans ce garde-fou, deux onglets ouverts en parallèle
écraseraient mutuellement leurs modifications.

Le jeton dérive **uniquement du numéro de révision** embarqué dans le document, jamais de l'ETag du
blob. C'est délibéré : l'ETag n'est pas exposé par toutes les implémentations du store — le serveur
de développement local ne le renvoie qu'à l'écriture, jamais à la lecture. Mélanger les deux sources
produit un jeton que la lecture suivante ne reconnaît plus, et donc un conflit à *chaque*
enregistrement. Quand un ETag est disponible, il sert en complément à demander une écriture
conditionnelle (`onlyIfMatch`), ce qui ferme la fenêtre entre la lecture et l'écriture.

Côté client, un 409 n'est pas une erreur affichée à l'utilisateur : `StoreService` **fusionne**
l'état distant avec le sien (mêmes règles qu'à l'import, voir § 8) puis réessaie sur la nouvelle
version, jusqu'à cinq fois. Deux onglets qui créent chacun un sujet au même instant conservent donc
les deux.

---

## 7. Exporter

Écran **Données** → *Télécharger la sauvegarde*.

Le fichier produit s'appelle `perrio-AAAA-MM-JJ.json` et contient l'intégralité des six collections,
sans filtrage ni compression. Il est lisible et modifiable à la main.

Les données vivant désormais côté serveur, l'export n'est plus l'unique filet de sécurité : il sert
à archiver un état avant une manipulation risquée, ou à transporter un jeu de cartes ailleurs.

## 8. Importer

Écran **Données** → choix du mode → sélection du fichier.

### Mode « Fusionner » (par défaut)

Le contenu local est **conservé**. L'import ne fait qu'ajouter et rafraîchir :

| Collection | Règle appliquée |
|---|---|
| `subjects`, `notes`, `flashcards` | Rapprochement par `id`. Inconnu → ajouté. Déjà présent → écrasé **seulement si** l'`updatedAt` importé est strictement postérieur au local, sinon ignoré. |
| `primings`, `reviews`, `sessions` | Journaux immuables : les `id` inconnus sont ajoutés, les autres laissés intacts. Aucun historique n'est jamais écrasé. |

Deux garde-fous supplémentaires :

- Une note, une carte ou un amorçage dont le `subjectId` ne correspond à aucun sujet (ni local, ni
  importé) est **rejeté comme orphelin** plutôt qu'inséré dans le vide. Idem pour une révision dont
  la carte est introuvable.
- Les sujets sont traités en premier, afin qu'un sujet importé dans ce même fichier compte comme
  destination valide pour ses propres cartes.

À la fin, un rapport affiche le détail : *ajoutés · mis à jour · déjà à jour · orphelins ignorés*.

L'opération est **idempotente** : réimporter deux fois le même fichier ne crée aucun doublon — le
second passage se solde par « tout est déjà à jour ».

Comme la comparaison se fait sur `updatedAt`, c'est bien la version la plus récente qui gagne,
quelle que soit sa provenance. Cela permet d'aller-retour entre deux appareils sans perdre le
travail fait de part et d'autre, **à condition que les modifications portent sur des fiches
différentes** : si la même carte a été modifiée des deux côtés, la plus récente écrase l'autre
sans fusion champ par champ ni avertissement.

Ces mêmes règles servent à résoudre les conflits d'écriture entre onglets (§ 6) : c'est la même
fonction `mergeDatasets`, pour qu'il n'existe qu'une seule définition de « fusionner » dans le code.

### Mode « Remplacer »

Les six collections sont vidées puis réécrites à l'identique. À réserver à la restauration d'un état
exact — tout ce qui existait et qui n'est pas dans le fichier est perdu, **pour tous les appareils**
puisque l'espace est commun.

### Dans les deux cas

La fusion est calculée en mémoire, puis le résultat est envoyé au serveur en une seule écriture :
soit elle aboutit, soit l'espace reste dans son état précédent.

Un fichier dont le champ `format` ne vaut pas `"perrio-backup"` est rejeté avec le message
« Ce fichier n'est pas une sauvegarde PERRIO. »

### Réinitialiser

*Tout effacer* envoie un `DELETE /api/data` puis recharge la page. Les deux sujets d'exemple sont
alors recréés, puisque le client redépose le seed quand l'espace serveur est vide. L'effacement
vaut **pour tous les appareils**.

---

## 9. Format du fichier

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

Conventions communes à toutes les collections :

- **Identifiants** : UUID v4 générés par `crypto.randomUUID()`
- **Dates** : chaînes ISO 8601 en UTC (`2026-07-19T01:38:00.000Z`)
- **Relations** : par identifiant (`subjectId`, `cardId`, `sessionId`), sans contrainte d'intégrité
  déclarative — c'est le code applicatif qui garantit la cohérence

---

## 10. Les six collections

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
révisions sont effacés dans la même opération (`SubjectService.remove`), puis l'ensemble part au
serveur en une écriture.

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

Collection **immuable** : une ligne par notation, jamais modifiée ensuite. C'est la source de toutes les
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

Cette collection alimente deux calculs : la **série de jours consécutifs** (un jour compte dès qu'il
contient au moins une session) et la composante **régularité** de la maîtrise. Une session en mode
`interleaving` valide par ailleurs la phase Entrelacement des sujets concernés.

---

## 11. Volumétrie et performance

Il n'y a **ni index ni requêtes** : le document entier est chargé en mémoire au démarrage, et
chaque écran filtre les tableaux avec `.filter()`. C'est assumé — pour quelques milliers de lignes,
un parcours de tableau est instantané et le code reste lisible.

En revanche, chaque enregistrement renvoie **tout le document**. Les ordres de grandeur :

| Contenu | Poids approximatif du document |
|---|---|
| 200 cartes, 1 000 révisions | ~ 300 Ko |
| 1 000 cartes, 10 000 révisions | ~ 2,5 Mo |

La collection `reviews` croît indéfiniment, à raison d'une ligne par carte notée — c'est elle qui
finira par peser. Si les enregistrements deviennent lents, deux pistes : purger les révisions de
plus d'un an (les statistiques n'affichent que 30 jours et la maîtrise ne regarde que les 20
dernières), ou scinder le blob en un document par collection pour n'écrire que ce qui change.

---

## 12. Modifier une sauvegarde à la main

Le fichier étant du JSON simple, il est possible d'y injecter des cartes générées ailleurs
(tableur, script, export d'un autre outil). Pour qu'un import réussisse :

1. Conservez `"format": "perrio-backup"` et `"version": 1`
2. Chaque `id` doit être unique dans sa collection. En mode fusion, réutiliser un `id` existant met à
   jour la fiche correspondante au lieu d'en créer une seconde — pratique pour corriger en masse,
   piégeur si les identifiants ont été copiés-collés sans y penser
3. Chaque `subjectId` d'une carte, note ou amorçage doit correspondre à un `id` présent dans
   `subjects` (du fichier ou déjà présent dans l'espace), faute de quoi la ligne est rejetée comme orpheline
   et comptée comme telle dans le rapport d'import
4. Une carte neuve se déclare avec `ease: 2.5`, `interval: 0`, `repetitions: 0`, `lapses: 0`,
   `totalReviews: 0`, `correctReviews: 0`, `lastReviewedAt: null`, `suspended: false` et une
   `dueDate` à maintenant ou dans le passé pour qu'elle soit immédiatement proposée
5. Les six collections peuvent être omises : une collection absente est traitée comme vide
   (`normalizeDataset`), ce qui permet d'importer un fichier ne contenant que des sujets et des
   cartes

---

## 13. Faire évoluer le schéma

Il n'y a pas de migration automatique : le document stocké n'est jamais transformé, il est relu tel
quel. Trois points d'attention :

- **Champ ajouté** : les documents déjà en place ne l'auront pas. Prévoyez une valeur par défaut à
  la lecture (`normalizeDataset` dans `dataset.ts` est l'endroit prévu pour ça) plutôt que de
  supposer sa présence.
- **Champ renommé ou supprimé** : écrivez une conversion dans `normalizeDataset`, appliquée à
  chaque chargement. Elle se propagera au serveur au premier enregistrement suivant.
- **Fichier de sauvegarde** : incrémentez `version` dans `BackupService` et faites accepter à
  `import()` les anciennes versions en convertissant leurs données — sans quoi les sauvegardes déjà
  téléchargées deviendraient illisibles.

Le contrat de l'API (`token`, `revision`) est indépendant du schéma des données : le faire évoluer
n'oblige pas à toucher la fonction Netlify.

---

## 14. Travailler sur les données en local

Le serveur de développement doit servir la fonction en même temps qu'Angular :

```bash
npm run dev        # netlify dev → http://localhost:8888
```

`npm start` lance Angular seul sur le port 4200 : l'interface s'affiche, mais toute écriture échoue
faute d'API et l'indicateur passe au rouge. À réserver au travail purement visuel.

Le store local de `netlify dev` est un bac à sable : ses données sont **distinctes** de celles du
site déployé. Le document se trouve dans
`.netlify/blobs-serve/entries/unlinked/site:perrio/dataset` — dossier déjà ignoré par git.

### Inspecter et manipuler l'espace en ligne de commande

```bash
# Lire l'état courant
curl -s localhost:8888/api/data | jq '{revision, token, sujets: (.data.subjects | length)}'

# Vider l'espace — le jeu de démonstration sera recréé au prochain chargement
curl -s -X DELETE localhost:8888/api/data

# Injecter une sauvegarde. Le token doit être celui renvoyé par le GET juste avant ;
# sur un espace vierge, c'est null.
TOKEN=$(curl -s localhost:8888/api/data | jq -c '.token')
curl -s -X PUT localhost:8888/api/data -H 'content-type: application/json' \
  -d "{\"token\": $TOKEN, \"data\": $(jq -c '{subjects, primings, notes, flashcards, reviews, sessions}' perrio-2026-07-19.json)}"
```

Le `data` d'un `PUT` attend les six collections **sans** l'enveloppe `format` / `version` /
`exportedAt` du fichier de sauvegarde : d'où le `jq` qui ne retient que les collections.

Un `PUT` dont le `token` ne correspond plus renvoie **409**, accompagné de l'état distant à jour :
c'est le comportement normal, pas une panne. Le client Angular s'en sert pour fusionner et
réessayer.

### Vérifier une modification du format

Le chemin le plus court pour valider un changement de schéma de bout en bout :

1. `curl -X DELETE localhost:8888/api/data` pour repartir d'un espace vierge
2. Recharger l'application : le seed est réinséré au nouveau format
3. Faire une révision, puis relire `/api/data` et vérifier que les champs attendus sont là
4. Exporter, réimporter en mode **Fusionner**, et vérifier que le rapport annonce « tout est déjà à
   jour » — si des lignes sont ajoutées ou déclarées orphelines, le format d'export et celui du
   store ont divergé
