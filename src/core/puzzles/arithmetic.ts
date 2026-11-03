import type { Rng } from '../random';
import { buildChoices } from './choices';
import { evalTokens } from './expr';
import { fmt, type Intensity, type Puzzle } from './types';

type Op = '+' | '−' | '×' | '÷';
type E = { n: number } | { op: Op; a: E; b: E };

const PREC: Record<Op, number> = { '+': 1, '−': 1, '×': 2, '÷': 2 };
const num = (n: number): E => ({ n });
const bin = (op: Op, a: E, b: E): E => ({ op, a, b });

function value(e: E): number | null {
  if ('n' in e) return e.n;
  const a = value(e.a);
  const b = value(e.b);
  if (a === null || b === null) return null;
  switch (e.op) {
    case '+': return a + b;
    case '−': return a - b;
    case '×': return a * b;
    case '÷': return b !== 0 && a % b === 0 ? a / b : null;
  }
}

/** Rendu en jetons avec le minimum de parenthèses. */
function tokens(e: E, parentPrec = 0, rightSide = false): string[] {
  if ('n' in e) return [fmt(e.n)];
  const p = PREC[e.op];
  const inner = [...tokens(e.a, p, false), e.op, ...tokens(e.b, p, true)];
  const needParens = p < parentPrec || (rightSide && p === parentPrec);
  return needParens ? ['(', ...inner, ')'] : inner;
}

/** Évaluation naïve de gauche à droite (erreur de priorité classique). */
function leftToRight(tok: string[]): number | null {
  if (tok.includes('(')) return null;
  let acc = Number(tok[0].replace('−', '-'));
  for (let i = 1; i + 1 < tok.length; i += 2) {
    const b = Number(tok[i + 1].replace('−', '-'));
    switch (tok[i]) {
      case '+': acc += b; break;
      case '−': acc -= b; break;
      case '×': acc *= b; break;
      case '÷': if (b === 0 || acc % b !== 0) return null; acc /= b; break;
    }
  }
  return acc;
}

interface Draft {
  tokens: string[];
  answer: number;
  traps: number[];
  explanation: string;
  prompt?: string;
}

type Template = (rng: Rng) => Draft | null;

function direct(e: E, why: (v: number) => string): Draft | null {
  const v = value(e);
  if (v === null) return null;
  const tok = tokens(e);
  const naive = leftToRight(tok);
  return {
    tokens: [...tok, '=', '?'],
    answer: v,
    traps: [v + 1, v - 1, v + 10, v - 10, ...(naive !== null && naive !== v ? [naive, naive] : []), v + 2],
    explanation: why(v),
  };
}

const T = {
  add: (rng: Rng) => {
    const a = rng.int(12, 89), b = rng.int(3, 49);
    return direct(bin('+', num(a), num(b)), (v) => `${a} + ${b} = ${v}.`);
  },
  sub: (rng: Rng) => {
    const a = rng.int(30, 99), b = rng.int(3, a - 5);
    return direct(bin('−', num(a), num(b)), (v) => `${a} − ${b} = ${v}.`);
  },
  table: (max: number) => (rng: Rng) => {
    const a = rng.int(2, max), b = rng.int(2, max);
    return direct(bin('×', num(a), num(b)), (v) => `${a} × ${b} = ${v}.`);
  },
  chain: (rng: Rng) => {
    const a = rng.int(20, 80), b = rng.int(5, 40), c = rng.int(3, 30);
    return direct(bin('−', bin('+', num(a), num(b)), num(c)), (v) => `${a} + ${b} = ${a + b}, puis − ${c} = ${v}.`);
  },
  precedence: (rng: Rng) => {
    const a = rng.int(2, 30), b = rng.int(2, 9), c = rng.int(2, 9);
    const e = rng.chance(0.5) ? bin('+', num(a), bin('×', num(b), num(c))) : bin('−', bin('×', num(b), num(c)), num(Math.min(a, b * c - 1)));
    return direct(e, (v) => `La multiplication d’abord : ${b} × ${c} = ${b * c}. Résultat : ${v}.`);
  },
  division: (rng: Rng) => {
    const b = rng.int(3, 12), q = rng.int(3, 15);
    return direct(bin('÷', num(b * q), num(b)), (v) => `${b * q} ÷ ${b} = ${v}.`);
  },
  parens: (rng: Rng) => {
    const a = rng.int(3, 25), b = rng.int(2, 20), c = rng.int(2, 9), d = rng.int(1, 30);
    return direct(
      bin('−', bin('×', bin('+', num(a), num(b)), num(c)), num(d)),
      (v) => `Parenthèses : ${a} + ${b} = ${a + b} ; × ${c} = ${(a + b) * c} ; − ${d} = ${v}.`,
    );
  },
  mixed: (rng: Rng) => {
    const b = rng.int(3, 9), q = rng.int(4, 12), c = rng.int(2, 9), d = rng.int(2, 9);
    return direct(
      bin('+', bin('÷', num(b * q), num(b)), bin('×', num(c), num(d))),
      (v) => `${b * q} ÷ ${b} = ${q} et ${c} × ${d} = ${c * d}, donc ${v}.`,
    );
  },
  squares: (rng: Rng) => {
    const a = rng.int(6, 15), b = rng.int(2, a - 1);
    return direct(
      bin('−', bin('×', num(a), num(a)), bin('×', num(b), num(b))),
      (v) => `${a}² = ${a * a} et ${b}² = ${b * b}, donc ${v}.`,
    );
  },
  missing: (ops: Op[]) => (rng: Rng): Draft | null => {
    const op = rng.pick(ops);
    let a: number, x: number, c: number;
    switch (op) {
      case '+': a = rng.int(8, 60); x = rng.int(5, 60); c = a + x; break;
      case '−': x = rng.int(5, 40); c = rng.int(5, 50); a = c + x; break;
      case '×': a = rng.int(3, 12); x = rng.int(3, 12); c = a * x; break;
      case '÷': x = rng.int(3, 12); c = rng.int(3, 12); a = x * c; break;
    }
    return {
      tokens: [String(a), op, '?', '=', String(c)],
      answer: x,
      traps: [c, x + 1, x - 1, op === '+' || op === '−' ? a + c : x + 2, x * 2, Math.abs(c - a)],
      explanation: `${a} ${op} ${x} = ${c}.`,
      prompt: 'Quel nombre remplace le « ? » ?',
    };
  },
  percent: (rng: Rng): Draft | null => {
    const p = rng.pick([10, 20, 25, 50, 75, 15, 30]);
    const step = 100 / gcd(p, 100);
    const n = step * rng.int(2, Math.max(2, Math.floor(400 / step)));
    const v = (p * n) / 100;
    if (!Number.isInteger(v) || n > 400) return null;
    return {
      tokens: [String(p), '%', 'de', String(n), '=', '?'],
      answer: v,
      traps: [v + 10, v - 10, v * 2, Math.round(v / 2), v + 5, n - v],
      explanation: `${p} % de ${n} = ${n} × ${p} ÷ 100 = ${v}.`,
    };
  },
};

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

const TEMPLATES: Record<Intensity, Template[]> = {
  1: [T.add, T.sub, T.table(9)],
  2: [T.table(12), T.chain, T.missing(['+', '−']), T.division],
  3: [T.precedence, T.missing(['×', '÷']), T.division, T.chain, T.percent],
  4: [T.parens, T.mixed, T.percent, T.precedence, T.missing(['×', '÷', '−'])],
  5: [T.parens, T.mixed, T.squares, T.percent],
};

/** Vérification indépendante : relit les jetons affichés. */
export function checkArithmetic(tok: readonly string[], choices: readonly number[], answerIndex: number): boolean {
  const eq = tok.indexOf('=');
  if (eq < 0) return false;
  const lhs = tok.slice(0, eq);
  const rhs = tok.slice(eq + 1);
  const holds = (x: number): boolean => {
    const sub = (t: readonly string[]) => t.map((s) => (s === '?' ? fmt(x) : s));
    const evalSide = (t: string[]): number | null => {
      if (t[1] === '%' && t[2] === 'de' && t.length === 4) {
        const v = (Number(t[0]) * Number(t[3])) / 100;
        return Number.isInteger(v) ? v : null;
      }
      return evalTokens(t);
    };
    try {
      const l = evalSide(sub(lhs));
      const r = evalSide(sub(rhs));
      return l !== null && r !== null && l === r;
    } catch {
      return false;
    }
  };
  const satisfying = choices.filter(holds);
  return satisfying.length === 1 && satisfying[0] === choices[answerIndex];
}

export function generateArithmetic(rng: Rng, intensity: Intensity): Omit<Puzzle, 'id' | 'intensity'> | null {
  const d = rng.pick(TEMPLATES[intensity])(rng);
  if (!d || !Number.isInteger(d.answer) || Math.abs(d.answer) > 9999) return null;
  const { choices, answerIndex } = buildChoices(rng, d.answer, d.traps);
  return {
    kind: 'arithmetic',
    prompt: d.prompt ?? 'Combien font…',
    display: { type: 'expression', tokens: d.tokens },
    choices,
    answerIndex,
    explanation: d.explanation,
  };
}
