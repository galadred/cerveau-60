import { describe, expect, it } from 'vitest';
import { RoundSession } from '../engine/session';
import { proofFromLog, verifyRound } from '../engine/verify';
import { generateLogicPuzzle } from '../puzzles/logic';
import type { Intensity, ObservationKind, Puzzle } from '../puzzles/types';
import { validatePuzzle } from '../puzzles/validate';
import { Rng } from '../random';
import { canonicalRot, cell, sameLook, signature } from './cells';
import { generateCount, generateDifference, generateOdd, generatePattern } from './generators';
import { generateObservationPuzzle, observationKindFor } from './index';
import { countMatches, differingCells, oddCells, patternErrorCandidates, validateObservation } from './validate';

const INTENSITIES: Intensity[] = [1, 2, 3, 4, 5];
const KINDS: ObservationKind[] = ['odd', 'difference', 'pattern', 'count'];

describe('Apparence des formes (symétries)', () => {
  it('une rotation invisible ne crée pas de différence', () => {
    expect(sameLook(cell('square', 'red', 0), cell('square', 'red', 90))).toBe(true);
    expect(sameLook(cell('cross', 'red', 0), cell('cross', 'red', 270))).toBe(true);
    expect(sameLook(cell('tri', 'ivory', 0), cell('tri', 'ivory', 120))).toBe(true);
    expect(sameLook(cell('circle', 'grey', 0), cell('circle', 'grey', 45))).toBe(true);
  });
  it('une rotation visible crée une différence', () => {
    expect(sameLook(cell('arrow', 'red', 0), cell('arrow', 'red', 15))).toBe(false);
    expect(sameLook(cell('half', 'red', 0), cell('half', 'red', 180))).toBe(false);
    expect(sameLook(cell('square', 'red', 0), cell('square', 'red', 45))).toBe(false);
    expect(sameLook(cell('tri', 'red', 0), cell('tri', 'red', 60))).toBe(false);
  });
  it('rotation canonique', () => {
    expect(canonicalRot('arrow', -90)).toBe(270);
    expect(canonicalRot('square', 450)).toBe(0);
    expect(canonicalRot('circle', 33)).toBe(0);
  });
  it('taille et point comptent', () => {
    expect(signature(cell('arrow', 'red', 0, 's'))).not.toBe(signature(cell('arrow', 'red', 0, 'm')));
    expect(signature(cell('arrow', 'red', 0, 'm', true))).not.toBe(signature(cell('arrow', 'red')));
  });
});

const A = cell('square', 'ivory');
const B = cell('circle', 'red');
const C = cell('arrow', 'grey', 90);

describe('Contrôleurs d’unicité', () => {
  it('intrus : exactement une case différente', () => {
    expect(oddCells([A, A, A, B])).toEqual([3]);
    expect(oddCells([A, A, B, B])).toEqual([]); // pas d'intrus
    expect(oddCells([A, A, B, C])).toEqual([]); // deux intrus
    expect(oddCells([A, A, A, cell('square', 'ivory', 90)])).toEqual([]); // rotation invisible
  });
  it('différences : comparaison visuelle case par case', () => {
    expect(differingCells([A, B, C], [A, B, C])).toEqual([]);
    expect(differingCells([A, B, C], [A, A, C])).toEqual([1]);
    expect(differingCells([A, B], [cell('square', 'ivory', 180), B])).toEqual([]);
  });
  it('motif : une seule case peut être l’erreur', () => {
    // 4 × 2, colonnes alternées A B ; erreur en (ligne 2, colonne 4)
    const g = [A, B, A, B, A, B, A, A];
    expect([...patternErrorCandidates(g, 4, 2)]).toEqual([7]);
    // motif parfait : aucune erreur
    expect(patternErrorCandidates([A, B, A, B, A, B, A, B], 4, 2).size).toBe(0);
    // deux erreurs : aucune case unique n'explique la grille
    expect(patternErrorCandidates([A, B, A, A, A, B, A, A], 4, 2).size).toBe(0);
  });
  it('motif ambigu détecté (preuve insuffisante)', () => {
    // 2 × 2 : chaque classe n'aurait qu'un seul témoin → aucune conclusion possible
    expect(patternErrorCandidates([A, B, A, A], 2, 2).size).toBe(0);
  });
  it('comptage avec et sans orientation', () => {
    const up = cell('arrow', 'red', 0);
    const cells = [up, cell('arrow', 'red', 90), up, cell('arrow', 'ivory', 0), cell('circle', 'red')];
    expect(countMatches(cells, up, false)).toBe(3);
    expect(countMatches(cells, up, true)).toBe(2);
  });
});

function sweep(gen: (rng: Rng, i: Intensity) => Omit<Puzzle, 'id' | 'intensity'> | null, n: number) {
  for (const i of INTENSITIES) {
    let made = 0;
    for (let s = 0; s < n; s++) {
      const d = gen(new Rng(`obs-${i}-${s}`), i);
      if (!d) continue;
      made++;
      const v = validateObservation({ ...d, id: 'x', intensity: i });
      if (!v.ok) throw new Error(`I${i} #${s} ${v.reason}`);
    }
    expect(made).toBeGreaterThan(n * 0.4);
  }
}

describe('Toutes les énigmes générées ont une solution unique et correcte', () => {
  it('intrus (5 × 300)', () => sweep(generateOdd, 300));
  it('différences (5 × 300)', () => sweep(generateDifference, 300));
  it('erreurs de motif (5 × 300)', () => sweep(generatePattern, 300), 30_000);
  it('détails cachés (5 × 300)', () => sweep(generateCount, 300));

  it('énigmes finales : validées, cases indexées, propositions cohérentes', () => {
    for (const i of INTENSITIES) {
      for (let k = 0; k < 80; k++) {
        const p = generateObservationPuzzle(`fin-${i}-${Math.floor(k / 8)}`, k % 8, i);
        expect(validatePuzzle(p)).toEqual({ ok: true });
        if (p.input === 'grid') expect(p.choices).toEqual(p.choices.map((_, j) => j));
        else expect(new Set(p.choices).size).toBe(4);
      }
    }
  }, 30_000);

  it('une énigme falsifiée est rejetée', () => {
    for (const kind of KINDS) {
      const p = generateObservationPuzzle('tamper', 0, 3, 0, kind);
      const wrong = { ...p, answerIndex: (p.answerIndex + 1) % p.choices.length };
      expect(validatePuzzle(wrong).ok).toBe(false);
    }
  });
});

describe('Déterminisme', () => {
  it('même graine, même rang, même intensité ⇒ même énigme', () => {
    for (let i = 0; i < 12; i++) {
      expect(generateObservationPuzzle('jour-2026-11-03', i, 3)).toEqual(generateObservationPuzzle('jour-2026-11-03', i, 3));
    }
  });
  it('chaque bloc de 4 contient les 4 types', () => {
    for (let b = 0; b < 10; b++) {
      expect(new Set([0, 1, 2, 3].map((k) => observationKindFor('mix', b * 4 + k))).size).toBe(4);
    }
  });
});

describe('Équilibre et ergonomie', () => {
  const size = (p: Puzzle) => {
    const d = p.display;
    return d.type === 'grid' || d.type === 'count' || d.type === 'compare' ? d.cols * d.rows : 0;
  };
  it('les grilles grandissent avec l’intensité', () => {
    for (const kind of KINDS) {
      const s1 = size(generateObservationPuzzle('bal', 0, 1, 0, kind));
      const s5 = size(generateObservationPuzzle('bal', 0, 5, 0, kind));
      expect(s5).toBeGreaterThan(s1);
    }
  });
  it('les différences deviennent plus subtiles', () => {
    const changeOf = (p: Puzzle): string => {
      const d = p.display;
      if (d.type !== 'grid' || p.kind !== 'odd') return '';
      const other = d.cells[(p.answerIndex + 1) % d.cells.length];
      const odd = d.cells[p.answerIndex];
      return odd.shape !== other.shape ? 'shape' : odd.color !== other.color ? 'color' : 'subtle';
    };
    for (let s = 0; s < 60; s++) {
      expect(['shape', 'color']).toContain(changeOf(generateObservationPuzzle(`s${s}`, 0, 1, 0, 'odd')));
      expect(changeOf(generateObservationPuzzle(`s${s}`, 0, 5, 0, 'odd'))).toBe('subtle');
    }
  });
  it('dimensions compatibles avec un écran de téléphone', () => {
    for (const i of INTENSITIES) {
      for (const kind of KINDS) {
        const d = generateObservationPuzzle('mobile', 0, i, 0, kind).display;
        if (d.type === 'compare') expect(d.cols).toBeLessThanOrEqual(4);
        if (d.type === 'grid' || d.type === 'count') expect(d.cols).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe('Moteur de manche en mode Observation', () => {
  const clock = () => {
    let t = 1000;
    return { now: () => t, advance: (ms: number) => (t += ms) };
  };

  it('une manche complète se joue et se vérifie par rejeu', () => {
    const c = clock();
    const s = new RoundSession({ seed: 'obs-round', difficulty: 'expert', clock: c.now, source: generateObservationPuzzle });
    s.start();
    for (let k = 0; k < 9; k++) {
      c.advance(2500);
      const p = s.current!;
      if (k === 3) s.answer((p.answerIndex + 1) % p.choices.length);
      else if (k === 5) s.skip();
      else s.answer(p.answerIndex);
      c.advance(400);
      s.next();
    }
    s.end();
    const sum = s.summary();
    expect(sum.puzzles.some((p) => p.input === 'grid')).toBe(true);
    const proof = proofFromLog(sum.seed, sum.log, 1);
    expect(verifyRound(sum, proof, generateObservationPuzzle)).toEqual({ ok: true });
    // la même preuve n'est pas valable pour un autre mode
    expect(verifyRound(sum, proof, generateLogicPuzzle).ok).toBe(false);
    // une case hors grille est refusée
    const bad = { ...proof, a: proof.a.map(([ch, t], i) => (i === 0 ? [999, t] : [ch, t]) as [number, number]) };
    expect(verifyRound(sum, bad, generateObservationPuzzle).ok).toBe(false);
  });

  it('une case hors grille est refusée par le moteur', () => {
    const s = new RoundSession({ seed: 'x', difficulty: 'novice', source: generateObservationPuzzle });
    s.start();
    expect(s.answer(s.current!.choices.length)).toBeNull();
  });
});

