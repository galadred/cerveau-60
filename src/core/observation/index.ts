import { hashString } from '../daily';
import { GENERATOR_VERSION } from '../puzzles/logic';
import type { Intensity, ObservationKind, Puzzle } from '../puzzles/types';
import { validatePuzzle } from '../puzzles/validate';
import { Rng, deriveSeed } from '../random';
import { generateCount, generateDifference, generateOdd, generatePattern, type Draft } from './generators';

const KINDS: ObservationKind[] = ['odd', 'difference', 'pattern', 'count'];
const GENERATORS: Record<ObservationKind, (rng: Rng, i: Intensity) => Draft | null> = {
  odd: generateOdd,
  difference: generateDifference,
  pattern: generatePattern,
  count: generateCount,
};
const MAX_ATTEMPTS = 80;

/** Chaque bloc de 4 énigmes contient un exemplaire de chaque type, dans un ordre variable. */
export function observationKindFor(seed: string, index: number): ObservationKind {
  const block = Math.floor(index / 4);
  return new Rng(deriveSeed('obs-kinds', GENERATOR_VERSION, seed, block)).shuffle(KINDS)[index % 4];
}

/** Énigme d'observation déterministe et validée (même contrat que le mode Logique). */
export function generateObservationPuzzle(seed: string, index: number, intensity: Intensity, salt = 0, kind?: ObservationKind): Puzzle {
  const k = kind ?? observationKindFor(seed, index);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = new Rng(deriveSeed('observation', GENERATOR_VERSION, seed, index, intensity, k, salt, attempt));
    const draft = GENERATORS[k](rng, intensity);
    if (!draft) continue;
    const puzzle: Puzzle = { ...draft, intensity, id: `${k}:${hashString(JSON.stringify(draft.display)).toString(36)}` };
    if (validatePuzzle(puzzle).ok) return puzzle;
  }
  if (intensity > 1) return generateObservationPuzzle(seed, index, (intensity - 1) as Intensity, salt, k);
  // Repli : un intrus simple (couleur ou forme sur 3 × 3), qui réussit en pratique au premier essai.
  if (k !== 'odd') return generateObservationPuzzle(seed, index, 1, salt, 'odd');
  throw new Error('Génération impossible');
}
