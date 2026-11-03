import type { DifficultyId, ModeId } from './types';

export interface ModeDefinition {
  id: ModeId;
  index: string;
  name: string;
  tagline: string;
  description: string;
  /** Glyphe utilisé par l'illustration de la carte. */
  glyph: 'sequence' | 'eye' | 'key' | 'calendar';
}

export const MODES: readonly ModeDefinition[] = [
  {
    id: 'logic',
    index: '01',
    name: 'Logique',
    tagline: 'Suites, calculs, déductions',
    description: 'Trouve la règle cachée avant que le temps ne s’écoule. Chaque bonne réponse enchaîne sur la suivante.',
    glyph: 'sequence',
  },
  {
    id: 'observation',
    index: '02',
    name: 'Observation',
    tagline: 'Différences, erreurs, détails',
    description: 'Un œil entraîné repère ce que les autres ignorent. Intrus, anomalies et détails cachés.',
    glyph: 'eye',
  },
  {
    id: 'riddles',
    index: '03',
    name: 'Énigmes',
    tagline: 'Raisonnement et mystères',
    description: 'Des situations étranges, une seule explication. Raisonne vite, raisonne juste.',
    glyph: 'key',
  },
  {
    id: 'daily',
    index: '04',
    name: 'Défi du jour',
    tagline: 'Une énigme, une tentative',
    description: 'Le même défi pour tout le monde, renouvelé à minuit. Une seule tentative par jour.',
    glyph: 'calendar',
  },
] as const;

export interface DifficultyDefinition {
  id: DifficultyId;
  rank: number;
  name: string;
  description: string;
  /** Multiplicateur appliqué aux points de base. */
  multiplier: number;
  /** Pénalité de temps (ms) en cas d'erreur. */
  penaltyMs: number;
  /** Niveau joueur requis pour débloquer la difficulté. */
  requiredLevel: number;
}

export const DIFFICULTIES: readonly DifficultyDefinition[] = [
  { id: 'novice', rank: 1, name: 'Novice', description: 'Pour s’échauffer les neurones.', multiplier: 1, penaltyMs: 2000, requiredLevel: 1 },
  { id: 'confirme', rank: 2, name: 'Confirmé', description: 'Les règles se cachent mieux.', multiplier: 1.5, penaltyMs: 3000, requiredLevel: 1 },
  { id: 'expert', rank: 3, name: 'Expert', description: 'Plus d’étapes, moins d’indices.', multiplier: 2, penaltyMs: 4000, requiredLevel: 3 },
  { id: 'genie', rank: 4, name: 'Génie', description: 'Aucune marge d’erreur.', multiplier: 3, penaltyMs: 5000, requiredLevel: 6 },
] as const;

export const ROUND_DURATION_MS = 60_000;

export function getMode(id: ModeId): ModeDefinition {
  const m = MODES.find((x) => x.id === id);
  if (!m) throw new Error(`Mode inconnu : ${id}`);
  return m;
}

export function getDifficulty(id: DifficultyId): DifficultyDefinition {
  const d = DIFFICULTIES.find((x) => x.id === id);
  if (!d) throw new Error(`Difficulté inconnue : ${id}`);
  return d;
}
