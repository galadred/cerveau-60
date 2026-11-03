import type { AnswerRecord } from '@/core/engine/session';
import type { Puzzle } from '@/core/puzzles/types';
import type { GameResult } from '@/core/types';

/** Données transmises de la manche à l'écran de résultats. */
export interface RoundReport {
  result: GameResult;
  puzzles: Puzzle[];
  log: AnswerRecord[];
  previousBest: number;
  xpBefore: number;
  xpAfter: number;
}
