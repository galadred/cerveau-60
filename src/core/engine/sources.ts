import { generateObservationPuzzle } from '../observation';
import { generateLogicPuzzle } from '../puzzles/logic';
import type { ModeId } from '../types';
import type { PuzzleSource } from './session';

/** Générateur d'énigmes de chaque mode jouable (même contrat déterministe). */
export const PUZZLE_SOURCES: Partial<Record<ModeId, PuzzleSource>> = {
  logic: generateLogicPuzzle,
  observation: generateObservationPuzzle,
};

export function sourceFor(mode: ModeId): PuzzleSource {
  const s = PUZZLE_SOURCES[mode];
  if (!s) throw new Error(`Mode non jouable : ${mode}`);
  return s;
}
