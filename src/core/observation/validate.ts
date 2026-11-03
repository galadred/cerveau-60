import type { Puzzle } from '../puzzles/types';
import { canonicalRot, signature, type ObsCell } from './cells';

type Result = { ok: true } | { ok: false; reason: string };
const fail = (reason: string): Result => ({ ok: false, reason });

/** Cases qui diffèrent (visuellement) de toutes les autres, quand les autres sont toutes identiques. */
export function oddCells(cells: readonly ObsCell[]): number[] {
  const counts = new Map<string, number>();
  for (const c of cells) counts.set(signature(c), (counts.get(signature(c)) ?? 0) + 1);
  if (counts.size !== 2) return [];
  const [[sigA, nA], [sigB, nB]] = [...counts];
  const lonely = nA === 1 && nB > 1 ? sigA : nB === 1 && nA > 1 ? sigB : null;
  if (!lonely) return [];
  return cells.flatMap((c, i) => (signature(c) === lonely ? [i] : []));
}

/** Indices où les deux images diffèrent visuellement. */
export function differingCells(left: readonly ObsCell[], right: readonly ObsCell[]): number[] {
  return left.flatMap((c, i) => (signature(c) !== signature(right[i]) ? [i] : []));
}

/**
 * Toutes les cases qui peuvent être « l'erreur » d'un motif périodique.
 * Pour chaque période (px, py) et chaque case c : si, en ignorant c, toutes les
 * classes (x mod px, y mod py) sont uniformes et observées au moins 2 fois,
 * et que c diffère de sa classe, alors c est une erreur possible.
 * Une énigme n'est valide que si cet ensemble contient exactement une case.
 */
export function patternErrorCandidates(cells: readonly ObsCell[], cols: number, rows: number): Set<number> {
  const sig = cells.map(signature);
  const found = new Set<number>();
  for (let px = 1; px <= Math.floor(cols / 2); px++) {
    for (let py = 1; py <= Math.floor(rows / 2); py++) {
      if (px === 1 && py === 1) continue; // grille uniforme : c'est un intrus, pas un motif
      for (let c = 0; c < cells.length; c++) {
        const groups = new Map<string, Set<string>>();
        const sizes = new Map<string, number>();
        for (let i = 0; i < cells.length; i++) {
          if (i === c) continue;
          const key = `${(i % cols) % px},${Math.floor(i / cols) % py}`;
          if (!groups.has(key)) groups.set(key, new Set());
          groups.get(key)!.add(sig[i]);
          sizes.set(key, (sizes.get(key) ?? 0) + 1);
        }
        let consistent = true;
        for (const [key, set] of groups) if (set.size !== 1 || (sizes.get(key) ?? 0) < 2) consistent = false;
        if (!consistent) continue;
        const own = `${(c % cols) % px},${Math.floor(c / cols) % py}`;
        const expected = groups.get(own);
        if (expected && !expected.has(sig[c])) found.add(c);
      }
    }
  }
  return found;
}

export function countMatches(cells: readonly ObsCell[], target: ObsCell, matchRotation: boolean): number {
  return cells.filter(
    (c) =>
      c.shape === target.shape &&
      c.color === target.color &&
      (!matchRotation || canonicalRot(c.shape, c.rot) === canonicalRot(target.shape, target.rot)),
  ).length;
}

function gridChoices(p: Puzzle, n: number): Result {
  if (p.input !== 'grid') return fail('saisie attendue : grille');
  if (p.choices.length !== n || !p.choices.every((c, i) => c === i)) return fail('cases mal indexées');
  if (p.answerIndex < 0 || p.answerIndex >= n) return fail('index de réponse');
  return { ok: true };
}

/** Contrôle d'une énigme d'observation. */
export function validateObservation(p: Puzzle): Result {
  const d = p.display;
  switch (d.type) {
    case 'grid': {
      if (d.cells.length !== d.cols * d.rows) return fail('dimensions');
      const g = gridChoices(p, d.cells.length);
      if (!g.ok) return g;
      if (p.kind === 'odd') {
        const odd = oddCells(d.cells);
        return odd.length === 1 && odd[0] === p.answerIndex ? { ok: true } : fail('intrus ambigu ou faux');
      }
      if (p.kind === 'pattern') {
        const cand = patternErrorCandidates(d.cells, d.cols, d.rows);
        return cand.size === 1 && cand.has(p.answerIndex) ? { ok: true } : fail(`motif ambigu (${cand.size} candidats)`);
      }
      return fail('type de grille inconnu');
    }
    case 'compare': {
      const n = d.cols * d.rows;
      if (d.left.length !== n || d.right.length !== n) return fail('dimensions');
      const g = gridChoices(p, n);
      if (!g.ok) return g;
      const diff = differingCells(d.left, d.right);
      return diff.length === 1 && diff[0] === p.answerIndex ? { ok: true } : fail(`${diff.length} différences`);
    }
    case 'count': {
      if (d.cells.length !== d.cols * d.rows) return fail('dimensions');
      if (p.input !== 'choice' || p.choices.length !== 4 || new Set(p.choices).size !== 4) return fail('propositions');
      const n = countMatches(d.cells, d.target, d.matchRotation);
      const right = p.choices.filter((c) => c === n);
      return right.length === 1 && p.choices[p.answerIndex] === n ? { ok: true } : fail('comptage faux');
    }
    default:
      return fail("ce n'est pas une énigme d'observation");
  }
}
