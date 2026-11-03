import type { Intensity } from '../puzzles/types';

/** Bonnes réponses nécessaires pour monter d'un cran pendant une manche. */
export const SOLVED_PER_STEP = 4;
/** Une manche ne monte que de 2 crans au maximum au-dessus de sa difficulté. */
export const MAX_RISE = 2;

/**
 * Difficulté progressive : la manche démarre au rang de la difficulté choisie
 * (Novice 1 … Génie 4) et monte d'un cran toutes les 4 bonnes réponses.
 */
export function intensityFor(rank: number, solved: number): Intensity {
  const rise = Math.min(MAX_RISE, Math.floor(solved / SOLVED_PER_STEP));
  return Math.max(1, Math.min(5, rank + rise)) as Intensity;
}
