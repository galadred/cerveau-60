/** Modèle d'une énigme. Toutes les réponses du mode Logique sont des entiers. */

export type PuzzleKind = 'sequence' | 'arithmetic' | 'deduction';
export type Intensity = 1 | 2 | 3 | 4 | 5;
export type SymbolId = 'tri' | 'circle' | 'square' | 'diamond';

/** Jeton d'une ligne de déduction : symbole, nombre ou opérateur. */
export type SymToken = { t: 'sym'; s: SymbolId } | { t: 'num'; v: number } | { t: 'op'; v: Op } | { t: 'paren'; v: '(' | ')' };
export type Op = '+' | '−' | '×' | '÷';

export type PuzzleDisplay =
  | { type: 'sequence'; terms: number[] }
  /** Jetons d'affichage, ex. ['(', '12', '+', '8', ')', '×', '3', '=', '?']. */
  | { type: 'expression'; tokens: string[] }
  | { type: 'symbols'; lines: { lhs: SymToken[]; rhs: number }[]; ask: SymToken[]; domain: [number, number] };

export interface Puzzle {
  /** Signature stable du contenu (sert à éviter les doublons dans une manche). */
  id: string;
  kind: PuzzleKind;
  intensity: Intensity;
  prompt: string;
  display: PuzzleDisplay;
  choices: number[];
  answerIndex: number;
  explanation: string;
}

export const SYMBOL_GLYPH: Record<SymbolId, string> = { tri: '▲', circle: '●', square: '■', diamond: '◆' };

/** Formatage d'un nombre pour l'affichage (vrai signe moins). */
export function fmt(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : String(n);
}
