import type { Rng } from '../random';
import { buildChoices } from './choices';
import { parseTokens, evaluate } from './expr';
import { SYMBOL_GLYPH, fmt, type Intensity, type Puzzle, type SymToken, type SymbolId } from './types';

/** Domaine annoncé au joueur : l'unicité est prouvée sur tout ce domaine. */
export const DEDUCTION_DOMAIN: [number, number] = [1, 20];
const SYMBOLS: SymbolId[] = ['tri', 'circle', 'square', 'diamond'];

type Op = '+' | '−' | '×';
const S = (s: SymbolId): SymToken => ({ t: 'sym', s });
const O = (v: Op): SymToken => ({ t: 'op', v });

function toStrings(tokens: readonly SymToken[]): string[] {
  return tokens.map((k) => (k.t === 'sym' ? k.s : k.t === 'num' ? fmt(k.v) : k.v));
}

function evalSym(tokens: readonly SymToken[], vals: Record<string, number>): number | null {
  return evaluate(parseTokens(toStrings(tokens)), vals);
}

/**
 * Recherche exhaustive : toutes les affectations du domaine qui satisfont
 * les lignes, et l'ensemble des valeurs possibles de la question.
 */
export function solveSymbols(
  lines: readonly { lhs: SymToken[]; rhs: number }[],
  ask: readonly SymToken[],
  domain: [number, number] = DEDUCTION_DOMAIN,
): Set<number> {
  const used = [...new Set([...lines.flatMap((l) => l.lhs), ...ask].filter((k) => k.t === 'sym').map((k) => (k as { s: SymbolId }).s))];
  const compiled = lines.map((l) => ({ node: parseTokens(toStrings(l.lhs)), rhs: l.rhs }));
  const askNode = parseTokens(toStrings(ask));
  const answers = new Set<number>();
  const vals: Record<string, number> = {};
  const rec = (i: number) => {
    if (answers.size > 1) return; // déjà ambigu : inutile de continuer
    if (i === used.length) {
      for (const c of compiled) if (evaluate(c.node, vals) !== c.rhs) return;
      const a = evaluate(askNode, vals);
      if (a !== null) answers.add(a);
      return;
    }
    for (let v = domain[0]; v <= domain[1]; v++) {
      vals[used[i]] = v;
      rec(i + 1);
    }
  };
  rec(0);
  return answers;
}

interface Shape {
  /** Lignes : listes de symboles reliés par un opérateur. */
  lines: { syms: number[]; op: Op }[];
  ask: { syms: number[]; op: Op };
  symbols: number;
}

function line(syms: number[], op: Op = '+') {
  return { syms, op };
}

const SHAPES: Record<Intensity, Shape[]> = {
  1: [
    { symbols: 2, lines: [line([0, 0]), line([0, 1])], ask: line([1]) },
    { symbols: 2, lines: [line([0, 0, 0]), line([1, 0])], ask: line([1]) },
  ],
  2: [
    { symbols: 2, lines: [line([0, 0, 0]), line([0, 1, 1])], ask: line([1]) },
    { symbols: 3, lines: [line([0, 0]), line([0, 1]), line([1, 2])], ask: line([2]) },
    { symbols: 2, lines: [line([0, 0]), line([0, 1], '−')], ask: line([1]) },
  ],
  3: [
    { symbols: 3, lines: [line([0, 0], '×'), line([0, 1]), line([1, 2])], ask: line([0, 1, 2]) },
    { symbols: 3, lines: [line([0, 0, 0]), line([0, 1], '×'), line([1, 2], '−')], ask: line([2]) },
    { symbols: 3, lines: [line([0, 1]), line([1, 2]), line([0, 2])], ask: line([0, 1, 2]) },
  ],
  4: [
    { symbols: 3, lines: [line([0, 0], '×'), line([0, 1], '×'), line([1, 2], '+')], ask: line([1, 2], '×') },
    { symbols: 4, lines: [line([0, 0]), line([0, 1]), line([1, 2], '×'), line([2, 3], '−')], ask: line([3]) },
    { symbols: 3, lines: [line([0, 1, 1]), line([1, 2, 2]), line([0, 0, 2])], ask: line([0, 1], '×') },
  ],
  5: [
    { symbols: 4, lines: [line([0, 1], '×'), line([0, 1]), line([1, 2], '×'), line([2, 3, 3])], ask: line([0, 3], '×') },
    { symbols: 4, lines: [line([0, 0, 1]), line([1, 1, 2]), line([2, 2, 3]), line([3, 0])], ask: line([0, 1, 2, 3]) },
    { symbols: 4, lines: [line([0, 0], '×'), line([0, 1], '−'), line([1, 2], '×'), line([2, 3])], ask: line([3, 1], '×') },
  ],
};

function tokensOf(syms: number[], op: Op, order: SymbolId[]): SymToken[] {
  const out: SymToken[] = [];
  syms.forEach((idx, i) => {
    if (i > 0) out.push(O(op));
    out.push(S(order[idx]));
  });
  return out;
}

export function describeTokens(tokens: readonly SymToken[]): string {
  return tokens.map((k) => (k.t === 'sym' ? SYMBOL_GLYPH[k.s] : k.t === 'num' ? fmt(k.v) : k.v)).join(' ');
}

export function generateDeduction(rng: Rng, intensity: Intensity): Omit<Puzzle, 'id' | 'intensity'> | null {
  const shape = rng.pick(SHAPES[intensity]);
  const order = rng.shuffle(SYMBOLS).slice(0, shape.symbols);
  const maxVal = intensity <= 2 ? 12 : 9;
  const secret: Record<string, number> = {};
  order.forEach((s) => (secret[s] = rng.int(2, maxVal)));

  const lines = shape.lines.map((l) => {
    const lhs = tokensOf(l.syms, l.op, order);
    return { lhs, rhs: evalSym(lhs, secret)! };
  });
  // Pas de résultats négatifs, nuls ou triviaux.
  if (lines.some((l) => l.rhs === null || l.rhs <= 0 || l.rhs > 200)) return null;
  const ask = tokensOf(shape.ask.syms, shape.ask.op, order);
  const answer = evalSym(ask, secret);
  if (answer === null || answer <= 0) return null;

  // Preuve d'unicité sur tout le domaine annoncé.
  const possible = solveSymbols(lines, ask);
  if (possible.size !== 1 || !possible.has(answer)) return null;

  const values = order.map((s) => secret[s]);
  const traps = [...values, answer + 1, answer - 1, answer + values[0], answer - values[values.length - 1], answer * 2];
  const { choices, answerIndex } = buildChoices(rng, answer, traps.filter((x) => x > 0));
  const solution = order.map((s) => `${SYMBOL_GLYPH[s]} = ${secret[s]}`).join(' · ');
  return {
    kind: 'deduction',
    prompt: 'Chaque symbole cache un nombre entier de 1 à 20. Que vaut la dernière ligne ?',
    display: { type: 'symbols', lines, ask, domain: DEDUCTION_DOMAIN },
    choices,
    answerIndex,
    explanation: `${solution}, donc ${describeTokens(ask)} = ${answer}.`,
  };
}

