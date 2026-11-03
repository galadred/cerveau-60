import { describe, expect, it } from 'vitest';
import { Rng } from '../random';
import { checkArithmetic, generateArithmetic } from './arithmetic';
import { DEDUCTION_DOMAIN, generateDeduction, solveSymbols } from './deduction';
import { evalTokens } from './expr';
import { GENERATOR_VERSION, generateLogicPuzzle, kindFor } from './logic';
import { generateSequence } from './sequence';
import { isUniqueSequence, sequencePredictions } from './solvers';
import type { Intensity, Puzzle, SymToken } from './types';
import { validatePuzzle } from './validate';

const INTENSITIES: Intensity[] = [1, 2, 3, 4, 5];

describe('Évaluateur d’expressions', () => {
  it('respecte les priorités et les parenthèses', () => {
    expect(evalTokens(['3', '+', '4', '×', '2'])).toBe(11);
    expect(evalTokens(['(', '3', '+', '4', ')', '×', '2'])).toBe(14);
    expect(evalTokens(['20', '−', '5', '−', '3'])).toBe(12);
    expect(evalTokens(['48', '÷', '6', '÷', '2'])).toBe(4);
    expect(evalTokens(['7', '÷', '2'])).toBeNull();
    expect(evalTokens(['−3', '+', '5'])).toBe(2);
    expect(() => evalTokens(['3', '+'])).toThrow();
  });
});

describe('Solveurs de suites', () => {
  it('reconnaissent les familles usuelles', () => {
    expect([...sequencePredictions([2, 5, 8, 11, 14])]).toEqual([17]);
    expect([...sequencePredictions([3, 6, 12, 24, 48])]).toEqual([96]);
    expect([...sequencePredictions([1, 4, 9, 16, 25])]).toEqual([36]);
    expect([...sequencePredictions([1, 1, 2, 3, 5, 8])]).toEqual([13]);
    expect([...sequencePredictions([4, 8, 6, 12, 10, 20])]).toEqual([18]);
    expect([...sequencePredictions([1, 50, 4, 46, 7, 42, 10])]).toEqual([38]);
    expect([...sequencePredictions([1, 3, 7, 15, 31])]).toEqual([63]);
  });
  it('rejettent une suite sans règle reconnue', () => {
    expect(isUniqueSequence([3, 1, 4, 1, 5], 9)).toBe(false);
  });
  it('rejettent une suite ambiguë (deux règles, deux réponses)', () => {
    // 1, 3, 6, 11, 19 : 31 (écarts d'ordre 3) ou 32 (Fibonacci + 2) → refusée.
    const ambiguous = [1, 3, 6, 11, 19];
    expect([...sequencePredictions(ambiguous)].sort()).toEqual([31, 32]);
    expect(isUniqueSequence(ambiguous, 31)).toBe(false);
    expect(isUniqueSequence(ambiguous, 32)).toBe(false);
    expect([...sequencePredictions([1, 2, 4, 5, 10])]).toEqual([11]); // ×2 / +1 alternés
  });
  it('rejettent une mauvaise réponse', () => {
    expect(isUniqueSequence([2, 5, 8, 11, 14], 18)).toBe(false);
  });
});

describe('Déductions', () => {
  const tri: SymToken = { t: 'sym', s: 'tri' };
  const circle: SymToken = { t: 'sym', s: 'circle' };
  const plus: SymToken = { t: 'op', v: '+' };
  const times: SymToken = { t: 'op', v: '×' };
  it('preuve exhaustive d’unicité', () => {
    const lines = [{ lhs: [tri, plus, tri], rhs: 10 }, { lhs: [tri, plus, circle], rhs: 12 }];
    expect([...solveSymbols(lines, [circle])]).toEqual([7]);
  });
  it('détecte un système ambigu', () => {
    const lines = [{ lhs: [tri, times, circle], rhs: 12 }];
    expect(solveSymbols(lines, [circle]).size).toBeGreaterThan(1);
  });
});

describe('Calculs', () => {
  it('vérifie exactement une proposition', () => {
    expect(checkArithmetic(['3', '+', '4', '×', '2', '=', '?'], [14, 11, 10, 9], 1)).toBe(true);
    expect(checkArithmetic(['3', '+', '4', '×', '2', '=', '?'], [14, 11, 10, 9], 0)).toBe(false);
    expect(checkArithmetic(['7', '×', '?', '=', '56'], [6, 7, 8, 9], 2)).toBe(true);
    expect(checkArithmetic(['25', '%', 'de', '160', '=', '?'], [30, 40, 50, 60], 1)).toBe(true);
  });
});

function sweep(gen: (rng: Rng, i: Intensity) => Omit<Puzzle, 'id' | 'intensity' | 'input'> | null, n: number) {
  for (const i of INTENSITIES) {
    for (let s = 0; s < n; s++) {
      const d = gen(new Rng(`sweep-${i}-${s}`), i);
      if (!d) continue;
      const p: Puzzle = { ...d, input: 'choice', id: 'x', intensity: i };
      const v = validatePuzzle(p);
      if (!v.ok) throw new Error(`I${i} #${s} ${v.reason} ${JSON.stringify(p)}`);
    }
  }
}

describe('Toutes les énigmes générées ont une solution unique et correcte', () => {
  it('suites (5 × 400)', () => sweep(generateSequence, 400));
  it('calculs (5 × 400)', () => sweep(generateArithmetic, 400));
  it('déductions (5 × 120)', () => sweep(generateDeduction, 120), 30_000);

  it('énigmes finales du mode Logique (validation + bornes)', () => {
    for (const i of INTENSITIES) {
      for (let k = 0; k < 90; k++) {
        const p = generateLogicPuzzle(`final-${i}-${Math.floor(k / 9)}`, k % 9, i);
        expect(validatePuzzle(p)).toEqual({ ok: true });
        expect(p.choices).toHaveLength(4);
        expect(new Set(p.choices).size).toBe(4);
        expect(p.explanation.length).toBeGreaterThan(5);
      }
    }
  }, 30_000);

  it('une énigme falsifiée est rejetée', () => {
    const p = generateLogicPuzzle('tamper', 0, 3);
    const wrong = { ...p, answerIndex: (p.answerIndex + 1) % 4 };
    expect(validatePuzzle(wrong).ok).toBe(false);
  });
});

describe('Déterminisme (base du défi quotidien)', () => {
  it('même graine, même rang, même intensité ⇒ même énigme', () => {
    for (let i = 0; i < 12; i++) {
      expect(generateLogicPuzzle('jour-2026-11-03', i, 3)).toEqual(generateLogicPuzzle('jour-2026-11-03', i, 3));
    }
    expect(generateLogicPuzzle('a', 0, 2)).not.toEqual(generateLogicPuzzle('b', 0, 2));
  });
  it('version des générateurs incluse', () => {
    expect(GENERATOR_VERSION).toBe(1);
  });
  it('chaque bloc de 3 énigmes contient les 3 types', () => {
    for (let b = 0; b < 10; b++) {
      const kinds = new Set([0, 1, 2].map((k) => kindFor('mix', b * 3 + k)));
      expect(kinds.size).toBe(3);
    }
  });
});

describe('Équilibre de la difficulté', () => {
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  it('les nombres restent adaptés au calcul mental', () => {
    for (const i of INTENSITIES) {
      for (let s = 0; s < 200; s++) {
        const p = generateLogicPuzzle(`bal-${s}`, s % 3, i);
        expect(Math.max(...p.choices.map(Math.abs))).toBeLessThan(i <= 2 ? 1000 : 2500);
      }
    }
  }, 30_000);
  it('les déductions gagnent en complexité avec l’intensité', () => {
    const complexity = (i: Intensity) =>
      avg(Array.from({ length: 60 }, (_, s) => {
        const p = generateLogicPuzzle(`cx-${s}`, 0, i, 0, 'deduction');
        return p.display.type === 'symbols' ? p.display.lines.reduce((n, l) => n + l.lhs.length, 0) : 0;
      }));
    expect(complexity(1)).toBeLessThan(complexity(3));
    expect(complexity(3)).toBeLessThan(complexity(5));
  }, 30_000);
  it('domaine annoncé cohérent', () => {
    expect(DEDUCTION_DOMAIN).toEqual([1, 20]);
  });
});
