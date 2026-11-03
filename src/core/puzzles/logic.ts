import { hashString } from '../daily';
import { Rng, deriveSeed } from '../random';
import { generateArithmetic } from './arithmetic';
import { generateDeduction } from './deduction';
import { generateSequence } from './sequence';
import type { Intensity, Puzzle, PuzzleKind } from './types';
import { validatePuzzle } from './validate';

/**
 * Version des générateurs. Elle fait partie de la graine : changer un
 * algorithme impose d'incrémenter cette valeur pour que le défi du jour
 * et la re-vérification des parties restent cohérents.
 */
export const GENERATOR_VERSION = 1;
const MAX_ATTEMPTS = 60;

const KINDS: PuzzleKind[] = ['sequence', 'arithmetic', 'deduction'];

/** Type de l'énigme n : chaque bloc de 3 contient un exemplaire de chaque type. */
export function kindFor(seed: string, index: number): PuzzleKind {
  const block = Math.floor(index / 3);
  const order = new Rng(deriveSeed('kinds', GENERATOR_VERSION, seed, block)).shuffle(KINDS);
  return order[index % 3];
}

const GENERATORS = { sequence: generateSequence, arithmetic: generateArithmetic, deduction: generateDeduction };

/**
 * Énigme déterministe : même graine, même rang, même intensité ⇒ même énigme,
 * sur tous les appareils. `salt` permet d'écarter un doublon de façon reproductible.
 */
export function generateLogicPuzzle(seed: string, index: number, intensity: Intensity, salt = 0, kind?: PuzzleKind): Puzzle {
  const k = kind ?? kindFor(seed, index);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = new Rng(deriveSeed('logic', GENERATOR_VERSION, seed, index, intensity, k, salt, attempt));
    const draft = GENERATORS[k](rng, intensity);
    if (!draft) continue;
    const puzzle: Puzzle = { ...draft, intensity, id: `${k}:${hashString(JSON.stringify(draft.display)).toString(36)}` };
    if (validatePuzzle(puzzle).ok) return puzzle;
  }
  // Repli garanti : un calcul simple toujours valide à intensité 1.
  if (intensity > 1) return generateLogicPuzzle(seed, index, (intensity - 1) as Intensity, salt, 'arithmetic');
  throw new Error('Génération impossible');
}
