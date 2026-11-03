import { getDifficulty } from './modes';
import type { DifficultyId } from './types';

export const BASE_POINTS = 100;
/** Bonus maximal accordé pour une réponse instantanée. */
export const MAX_SPEED_BONUS = 50;
/** Au-delà de ce temps de réponse, plus aucun bonus de vitesse. */
export const SPEED_WINDOW_MS = 15_000;
export const MAX_COMBO = 5;

/** Multiplicateur de série : x1, x1.25, x1.5 ... plafonné à x2. */
export function comboMultiplier(streak: number): number {
  const s = Math.max(0, Math.min(streak, MAX_COMBO) - 1);
  return 1 + s * 0.25;
}

/**
 * Points d'une bonne réponse.
 * @param difficulty difficulté de la partie
 * @param answerTimeMs temps passé sur cette énigme
 * @param streak série en cours, bonne réponse incluse (>= 1)
 */
export function pointsForCorrect(difficulty: DifficultyId, answerTimeMs: number, streak: number): number {
  const { multiplier } = getDifficulty(difficulty);
  const t = Math.max(0, Math.min(answerTimeMs, SPEED_WINDOW_MS));
  const speedBonus = MAX_SPEED_BONUS * (1 - t / SPEED_WINDOW_MS);
  return Math.round((BASE_POINTS + speedBonus) * multiplier * comboMultiplier(streak));
}
