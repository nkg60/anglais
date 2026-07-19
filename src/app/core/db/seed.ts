import { DEFAULT_EASE } from '../algorithms/sm2';
import { Flashcard, Note, Subject } from '../models';
import { db, nowIso, uid } from './db';

interface SeedCard {
  front: string;
  back: string;
  tags: string[];
}

function makeCard(subjectId: string, card: SeedCard, dueOffsetDays: number): Flashcard {
  const due = new Date();
  due.setDate(due.getDate() + dueOffsetDays);
  return {
    id: uid(),
    subjectId,
    front: card.front,
    back: card.back,
    tags: card.tags,
    ease: DEFAULT_EASE,
    interval: 0,
    repetitions: 0,
    dueDate: due.toISOString(),
    lapses: 0,
    lastReviewedAt: null,
    totalReviews: 0,
    correctReviews: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    suspended: false,
  };
}

const PHRASAL_VERBS: SeedCard[] = [
  { front: 'to give up', back: 'abandonner, renoncer — « She gave up smoking last year. »', tags: ['phrasal verbs'] },
  { front: 'to look forward to', back: 'attendre avec impatience — suivi du gérondif : « I look forward to seeing you. »', tags: ['phrasal verbs', 'piège'] },
  { front: 'to put off', back: 'reporter, remettre à plus tard — « They put off the meeting. »', tags: ['phrasal verbs'] },
  { front: 'to run into', back: 'tomber sur quelqu’un par hasard — « I ran into an old friend. »', tags: ['phrasal verbs'] },
  { front: 'to figure out', back: 'comprendre, résoudre — « I can’t figure out this problem. »', tags: ['phrasal verbs'] },
  { front: 'to get along with', back: 's’entendre avec — « He gets along with his colleagues. »', tags: ['phrasal verbs'] },
  { front: 'to bring up', back: 'aborder un sujet, ou élever un enfant — deux sens selon le contexte.', tags: ['phrasal verbs', 'piège'] },
  { front: 'to turn down', back: 'refuser une offre, ou baisser le volume.', tags: ['phrasal verbs'] },
];

const TENSES: SeedCard[] = [
  { front: 'Present perfect : quand l’utiliser ?', back: 'Action passée dont le résultat compte maintenant, sans date précise. « I have lost my keys. »', tags: ['temps', 'règle'] },
  { front: 'Present perfect vs prétérit', back: 'Prétérit = moment passé fini et daté (yesterday, in 2020). Present perfect = lien avec le présent.', tags: ['temps', 'piège'] },
  { front: 'since vs for', back: 'since = point de départ (since 2019). for = durée (for three years).', tags: ['temps', 'règle'] },
  { front: 'Present continuous : usage', back: 'Action en cours au moment où l’on parle, ou arrangement futur planifié. « I’m meeting John tomorrow. »', tags: ['temps'] },
  { front: 'Past perfect : à quoi ça sert ?', back: 'Marquer une antériorité par rapport à un autre passé. « The train had left when I arrived. »', tags: ['temps', 'règle'] },
  { front: 'Futur : will vs going to', back: 'will = décision spontanée ou prédiction. going to = intention déjà prise ou indice visible.', tags: ['temps', 'piège'] },
  { front: 'Conditionnel type 2', back: 'If + prétérit, would + base verbale. « If I had time, I would travel. »', tags: ['temps', 'règle'] },
];

/** Insère deux sujets d'exemple au tout premier lancement. */
export async function seedIfEmpty(): Promise<void> {
  const count = await db.subjects.count();
  if (count > 0) return;

  const phrasal: Subject = {
    id: uid(),
    name: 'Phrasal verbs',
    description: 'Les verbes à particule les plus courants de l’anglais quotidien.',
    color: '#4f7cff',
    icon: '🗣️',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    archived: false,
  };

  const tenses: Subject = {
    id: uid(),
    name: 'Temps verbaux',
    description: 'Choisir le bon temps : present perfect, prétérit, futur, conditionnel.',
    color: '#16a37f',
    icon: '⏳',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    archived: false,
  };

  const note: Note = {
    id: uid(),
    subjectId: phrasal.id,
    title: 'Comprendre la logique des particules',
    groupings: [
      { title: 'Particules de séparation', items: ['give up', 'turn down', 'put off'] },
      { title: 'Particules de rencontre', items: ['run into', 'get along with', 'look forward to'] },
    ],
    simplification:
      'Un phrasal verb, c’est un verbe simple auquel on colle une petite particule qui change tout le sens. « Look » veut dire regarder, mais « look after » veut dire s’occuper de.',
    analogies: [
      {
        concept: 'Verbe + particule',
        analogy:
          'Comme une pizza : la base est la même, mais la garniture change complètement le plat.',
      },
    ],
    connections: [
      { text: 'Même logique qu’en français avec les verbes pronominaux : rendre / se rendre.' },
    ],
    intuition:
      'La particule indique souvent une direction physique appliquée au sens figuré : « up » = vers un terme, « off » = éloignement, « into » = collision.',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const cards = [
    ...PHRASAL_VERBS.map((c, i) => makeCard(phrasal.id, c, i < 5 ? 0 : 1)),
    ...TENSES.map((c, i) => makeCard(tenses.id, c, i < 4 ? 0 : 2)),
  ];

  await db.transaction('rw', db.subjects, db.notes, db.flashcards, async () => {
    await db.subjects.bulkAdd([phrasal, tenses]);
    await db.notes.add(note);
    await db.flashcards.bulkAdd(cards);
  });
}
