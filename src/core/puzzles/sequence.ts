import type { Rng } from '../random';
import { buildChoices } from './choices';
import { isUniqueSequence } from './solvers';
import { fmt, type Intensity, type Puzzle } from './types';

interface Draft {
  terms: number[];
  answer: number;
  rule: string;
  /** Erreurs typiques. */
  traps: number[];
}

type Family = (rng: Rng) => Draft;

function build(len: number, first: number[], step: (prev: number[], i: number) => number): number[] {
  const t = [...first];
  while (t.length < len + 1) t.push(step(t, t.length));
  return t;
}

const sign = (n: number) => (n >= 0 ? `+ ${n}` : `− ${Math.abs(n)}`);

function draft(all: number[], rule: string, extraTraps: number[] = []): Draft {
  const terms = all.slice(0, -1);
  const answer = all[all.length - 1];
  const last = terms[terms.length - 1];
  const d = last - terms[terms.length - 2];
  return { terms, answer, rule, traps: [last + d, answer + 1, answer - 1, answer + d, answer - d, ...extraTraps] };
}

// ---------- Familles de règles, de la plus simple à la plus retorse ----------

const arithmetic = (lo: number, hi: number, len = 5, negative = false): Family => (rng) => {
  const d = rng.int(lo, hi) * (negative && rng.chance(0.4) ? -1 : 1);
  const a = d < 0 ? rng.int(40, 99) : rng.int(1, 30);
  return draft(build(len, [a], (t) => t[t.length - 1] + d), `On ajoute ${fmt(d)} à chaque fois (${sign(d)}).`);
};

const geometric = (ratios: number[], len = 5): Family => (rng) => {
  const r = rng.pick(ratios);
  const a = rng.int(1, r === 2 ? 6 : 2);
  return draft(build(len, [a], (t) => t[t.length - 1] * r), `Chaque terme est multiplié par ${r}.`);
};

const twoSteps: Family = (rng) => {
  const a = rng.int(2, 9);
  let b = rng.int(-6, 9);
  if (b === a || b === 0) b = a + 3;
  const start = rng.int(1, 20);
  return draft(
    build(6, [start], (t, i) => t[t.length - 1] + (i % 2 === 1 ? a : b)),
    `On alterne ${sign(a)} et ${sign(b)}.`,
  );
};

const quadratic = (lenWide = false): Family => (rng) => {
  const d0 = rng.int(1, 6);
  const dd = rng.int(1, lenWide ? 4 : 3);
  const a = rng.int(1, 15);
  return draft(
    build(lenWide ? 6 : 5, [a], (t, i) => t[t.length - 1] + d0 + dd * (i - 1)),
    `L’écart augmente de ${dd} à chaque fois (${d0}, ${d0 + dd}, ${d0 + 2 * dd}…).`,
  );
};

const affineRec = (ks: number[]): Family => (rng) => {
  const k = rng.pick(ks);
  const c = rng.pick([-3, -2, -1, 1, 2, 3, 4, 5]);
  const a = rng.int(1, k === 2 ? 6 : 3);
  return draft(
    build(5, [a], (t) => t[t.length - 1] * k + c),
    `Chaque terme = précédent × ${k} ${sign(c)}.`,
  );
};

const fibLike: Family = (rng) => {
  const a = rng.int(1, 6);
  const b = rng.int(a, a + 6);
  return draft(build(6, [a, b], (t) => t[t.length - 1] + t[t.length - 2]), 'Chaque terme est la somme des deux précédents.');
};

const fibPlus: Family = (rng) => {
  const a = rng.int(1, 5);
  const b = rng.int(1, 6);
  const c = rng.pick([1, 2, -1]);
  return draft(
    build(6, [a, b], (t) => t[t.length - 1] + t[t.length - 2] + c),
    `Chaque terme = somme des deux précédents ${sign(c)}.`,
  );
};

const mulAdd: Family = (rng) => {
  const r = rng.pick([2, 3]);
  const d = rng.int(1, 6) * rng.pick([1, -1]);
  const a = rng.int(1, 5);
  return draft(
    build(6, [a], (t, i) => (i % 2 === 1 ? t[t.length - 1] * r : t[t.length - 1] + d)),
    `On alterne × ${r} et ${sign(d)}.`,
  );
};

const interleavedFam: Family = (rng) => {
  const a = rng.int(1, 20);
  const b = rng.int(30, 60);
  const da = rng.int(2, 7);
  const db = -rng.int(2, 7);
  const all = build(7, [a, b], (t, i) => (i % 2 === 0 ? t[i - 2] + da : t[i - 2] + db));
  return draft(all, `Deux suites entrelacées : ${sign(da)} sur les rangs impairs, ${sign(db)} sur les rangs pairs.`, [all[6] + db, all[6] - da]);
};

const powers = (exp: 2 | 3): Family => (rng) => {
  const start = rng.int(1, exp === 2 ? 6 : 2);
  const off = rng.int(-3, 3);
  const len = exp === 2 ? 5 : 6;
  const all = Array.from({ length: len + 1 }, (_, i) => (start + i) ** exp + off);
  const name = exp === 2 ? 'carrés' : 'cubes';
  return draft(all, `Les ${name} de ${start}, ${start + 1}, ${start + 2}…${off ? ` ${sign(off)}` : ''}.`);
};

const diffGeometric: Family = (rng) => {
  const d0 = rng.int(1, 3);
  const r = 2;
  const a = rng.int(1, 10);
  return draft(
    build(6, [a], (t, i) => t[t.length - 1] + d0 * r ** (i - 1)),
    `L’écart double à chaque fois (${d0}, ${d0 * 2}, ${d0 * 4}…).`,
  );
};

const FAMILIES: Record<Intensity, Family[]> = {
  1: [arithmetic(2, 9), arithmetic(2, 5, 5, true), geometric([2])],
  2: [arithmetic(6, 15, 5, true), geometric([2, 3]), twoSteps, quadratic()],
  3: [quadratic(), affineRec([2]), fibLike, twoSteps, powers(2), geometric([3])],
  4: [affineRec([2, 3]), fibPlus, mulAdd, interleavedFam, powers(2), diffGeometric, quadratic(true)],
  5: [affineRec([3]), fibPlus, mulAdd, interleavedFam, powers(3), diffGeometric],
};

const MAX_ABS = 5000;

/** Génère une suite dont la réponse est unique parmi les règles usuelles ; null si échec. */
export function generateSequence(rng: Rng, intensity: Intensity): Omit<Puzzle, 'id' | 'intensity'> | null {
  const d = rng.pick(FAMILIES[intensity])(rng);
  if ([...d.terms, d.answer].some((x) => Math.abs(x) > MAX_ABS)) return null;
  if (!isUniqueSequence(d.terms, d.answer)) return null;
  const { choices, answerIndex } = buildChoices(rng, d.answer, d.traps);
  return {
    kind: 'sequence',
    prompt: 'Quel nombre complète la suite ?',
    display: { type: 'sequence', terms: d.terms },
    choices,
    answerIndex,
    explanation: `${d.rule} Réponse : ${fmt(d.answer)}.`,
  };
}
