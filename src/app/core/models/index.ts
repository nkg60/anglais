/** Modèles de données PERRIO. Les identifiants sont des UUID, les dates en ISO 8601. */

export interface Subject {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

/** Checklist d'amorçage remplie avant une session d'étude. */
export interface Priming {
  id: string;
  subjectId: string;
  whatIKnow: string;
  whatIWantToLearn: string;
  whyItMatters: string;
  createdAt: string;
}

export interface Grouping {
  title: string;
  items: string[];
}

export interface Analogy {
  concept: string;
  analogy: string;
}

export interface Connection {
  text: string;
  relatedSubjectId?: string;
}

/** Note d'encodage : une section par méthode d'encodage PERRIO. */
export interface Note {
  id: string;
  subjectId: string;
  title: string;
  groupings: Grouping[];
  simplification: string;
  analogies: Analogy[];
  connections: Connection[];
  intuition: string;
  createdAt: string;
  updatedAt: string;
}

export interface Flashcard {
  id: string;
  subjectId: string;
  front: string;
  back: string;
  tags: string[];
  /** Facteur de facilité SM-2, borné à [1.3, 2.8]. */
  ease: number;
  /** Intervalle courant en jours. */
  interval: number;
  repetitions: number;
  /** Date ISO de la prochaine révision due. */
  dueDate: string;
  lapses: number;
  lastReviewedAt: string | null;
  totalReviews: number;
  correctReviews: number;
  createdAt: string;
  updatedAt: string;
  suspended: boolean;
}

export type Rating = 'again' | 'hard' | 'easy';

export const RATING_LABELS: Record<Rating, string> = {
  again: 'Raté',
  hard: 'Difficile',
  easy: 'Facile',
};

/** Journal immuable des révisions : source de toutes les statistiques. */
export interface Review {
  id: string;
  cardId: string;
  subjectId: string;
  sessionId: string;
  rating: Rating;
  reviewedAt: string;
  intervalBefore: number;
  intervalAfter: number;
  easeAfter: number;
}

export type SessionMode = 'retrieval' | 'interleaving';

export interface StudySession {
  id: string;
  mode: SessionMode;
  subjectIds: string[];
  startedAt: string;
  endedAt: string | null;
  cardsReviewed: number;
  correctCount: number;
}

/** Les 6 phases du système PERRIO. */
export type PerrioPhase =
  | 'priming'
  | 'encoding'
  | 'reference'
  | 'retrieval'
  | 'interleaving'
  | 'overlearning';

export interface PhaseInfo {
  key: PerrioPhase;
  label: string;
  description: string;
  icon: string;
}

export const PERRIO_PHASES: PhaseInfo[] = [
  {
    key: 'priming',
    label: 'Amorçage',
    description: 'Préparer le cerveau avant la session : ce que je sais, ce que je veux, pourquoi.',
    icon: '🎯',
  },
  {
    key: 'encoding',
    label: 'Encodage',
    description: 'Organiser l’information : regroupements, simplification, analogies, connexions, intuition.',
    icon: '🧩',
  },
  {
    key: 'reference',
    label: 'Référence',
    description: 'Déposer l’information ailleurs pour la revisiter : les flashcards du sujet.',
    icon: '🗂️',
  },
  {
    key: 'retrieval',
    label: 'Récupération',
    description: 'Se tester activement pour faire remonter l’information et renforcer la mémoire.',
    icon: '🔁',
  },
  {
    key: 'interleaving',
    label: 'Entrelacement',
    description: 'Alterner les sujets et les angles au lieu de bloquer sur un seul.',
    icon: '🔀',
  },
  {
    key: 'overlearning',
    label: 'Sur-apprentissage',
    description: 'Approfondir jusqu’à la maîtrise par la répétition et la régularité.',
    icon: '🏆',
  },
];

/** État d'avancement d'un sujet dans les 6 phases. */
export interface PhaseStatus {
  key: PerrioPhase;
  done: boolean;
  detail: string;
}

export interface SubjectStats {
  subjectId: string;
  cardCount: number;
  dueCount: number;
  mastery: number;
  mastered: boolean;
  successRate: number;
  coverage: number;
  regularity: number;
  sessionCount: number;
}
