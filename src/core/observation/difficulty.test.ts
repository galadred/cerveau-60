import { describe, expect, it } from 'vitest';
import { RoundSession } from '../engine/session';
import { DIFFICULTIES, getDifficulty } from '../modes';
import type { Intensity, Puzzle } from '../puzzles/types';
import { generateObservationPuzzle } from './index';

/** Nature de l'écart d'une énigme « différence ». */
function change(p: Puzzle): 'shape' | 'color' | 'rotation' | 'size' | 'mark' {
  const d = p.display;
  if (d.type !== 'compare') throw new Error('pas une différence');
  const a = d.left[p.answerIndex];
  const b = d.right[p.answerIndex];
  if (a.shape !== b.shape) return 'shape';
  if (a.color !== b.color) return 'color';
  if (a.size !== b.size) return 'size';
  if (a.mark !== b.mark) return 'mark';
  return 'rotation';
}

function rotationGap(p: Puzzle): number {
  const d = p.display;
  if (d.type !== 'compare') return 0;
  const g = Math.abs(d.left[p.answerIndex].rot - d.right[p.answerIndex].rot) % 360;
  return Math.min(g, 360 - g);
}

describe('Niveaux de difficulté du mode Observation', () => {
  it('intensité 1-2 : écarts francs (forme, couleur, quart de tour)', () => {
    for (let s = 0; s < 80; s++) {
      expect(['shape', 'color']).toContain(change(generateObservationPuzzle(`d1-${s}`, 0, 1, 0, 'difference')));
      const p2 = generateObservationPuzzle(`d2-${s}`, 0, 2, 0, 'difference');
      expect(['shape', 'color', 'rotation']).toContain(change(p2));
      if (change(p2) === 'rotation') expect(rotationGap(p2)).toBe(90);
    }
  });

  it('intensité 5 : uniquement des détails fins (rotations ≤ 30°, point)', () => {
    for (let s = 0; s < 80; s++) {
      const p = generateObservationPuzzle(`d5-${s}`, 0, 5, 0, 'difference');
      expect(['rotation', 'mark']).toContain(change(p));
      if (change(p) === 'rotation') expect(rotationGap(p)).toBeLessThanOrEqual(30);
    }
  });

  it('chaque difficulté démarre à son rang et monte au plus de 2 crans', () => {
    for (const d of DIFFICULTIES) {
      let t = 0;
      const s = new RoundSession({ seed: `start-${d.id}`, difficulty: d.id, clock: () => t, source: generateObservationPuzzle });
      s.start();
      const seen: Intensity[] = [];
      for (let k = 0; k < 14; k++) {
        seen.push(s.current!.intensity);
        t += 1000;
        s.answer(s.current!.answerIndex);
        s.next();
      }
      expect(seen[0]).toBe(d.rank);
      expect(Math.max(...seen)).toBe(Math.min(5, d.rank + 2));
      expect(seen).toEqual([...seen].sort((a, b) => a - b)); // jamais de retour en arrière
    }
  });

  it('pénalités croissantes avec la difficulté', () => {
    const p = ['novice', 'confirme', 'expert', 'genie'].map((id) => getDifficulty(id as 'novice').penaltyMs);
    expect(p).toEqual([...p].sort((a, b) => a - b));
    expect(new Set(p).size).toBe(4);
  });
});
