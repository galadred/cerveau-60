/** Modèle d'une énigme, commun à tous les modes. */

import type { ObsCell } from '../observation/cells';

export type LogicKind = 'sequence' | 'arithmetic' | 'deduction';
export type ObservationKind = 'odd' | 'difference' | 'pattern' | 'count';
export type PuzzleKind = LogicKind | ObservationKind;
export type Intensity = 1 | 2 | 3 | 4 | 5;
export type SymbolId = 'tri' | 'circle' | 'square' | 'diamond';

/** Jeton d'une ligne de déduction : symbole, nombre ou opérateur. */
export type SymToken = { t: 'sym'; s: SymbolId } | { t: 'num'; v: number } | { t: 'op'; v: Op } | { t: 'paren'; v: '(' | ')' };
export type Op = '+' | '−' | '×' | '÷';

export type PuzzleDisplay =
  | { type: 'sequence'; terms: number[] }
  /** Jetons d'affichage, ex. ['(', '12', '+', '8', ')', '×', '3', '=', '?']. */
  | { type: 'expression'; tokens: string[] }
  | { type: 'symbols'; lines: { lhs: SymToken[]; rhs: number }[]; ask: SymToken[]; domain: [number, number] }
  /** Grille à toucher (intrus, erreur de motif). */
  | { type: 'grid'; cols: number; rows: number; cells: ObsCell[] }
  /** Deux images à comparer ; on touche la case qui diffère (dans l'une ou l'autre). */
  | { type: 'compare'; cols: number; rows: number; left: ObsCell[]; right: ObsCell[] }
  /** Grille à observer + cible à compter ; réponse par propositions. */
  | { type: 'count'; cols: number; rows: number; cells: ObsCell[]; target: ObsCell; matchRotation: boolean };

export interface Puzzle {
  /** Signature stable du contenu (sert à éviter les doublons dans une manche). */
  id: string;
  kind: PuzzleKind;
  intensity: Intensity;
  prompt: string;
  display: PuzzleDisplay;
  /**
   * 'choice' : 4 propositions numériques ; 'grid' : on touche une case,
   * `choices` contient alors les indices des cases (0…n−1).
   */
  input: 'choice' | 'grid';
  choices: number[];
  answerIndex: number;
  explanation: string;
}

export const SYMBOL_GLYPH: Record<SymbolId, string> = { tri: '▲', circle: '●', square: '■', diamond: '◆' };

/** Formatage d'un nombre pour l'affichage (vrai signe moins). */
export function fmt(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : String(n);
}
