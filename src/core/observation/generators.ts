import type { Rng } from '../random';
import { buildChoices } from '../puzzles/choices';
import type { Intensity, Puzzle } from '../puzzles/types';
import {
  ALL_COLORS, ALL_SHAPES, ORIENTED, cell, describeCell, describeChange, directionName, position, sameLook,
  type ObsCell, type ObsShape,
} from './cells';

export type Draft = Omit<Puzzle, 'id' | 'intensity'>;

// ---------- Réglages par intensité ----------

const SHAPES: Record<Intensity, ObsShape[]> = {
  1: ['square', 'circle', 'tri', 'cross'],
  2: ['square', 'circle', 'tri', 'cross', 'arrow'],
  3: ALL_SHAPES,
  4: ALL_SHAPES,
  5: ALL_SHAPES,
};
/** Pas de rotation des formes dans les grilles variées. */
const ROT_STEP: Record<Intensity, number> = { 1: 90, 2: 90, 3: 90, 4: 45, 5: 45 };

/** Nature de la différence à repérer, de la plus visible à la plus subtile. */
type Change = 'color' | 'shape' | 'rot90' | 'rot45' | 'rot30' | 'rot15' | 'size' | 'mark';
const CHANGES: Record<Intensity, Change[]> = {
  1: ['color', 'shape'],
  2: ['shape', 'color', 'rot90'],
  3: ['rot45', 'size', 'mark', 'rot90'],
  4: ['rot30', 'mark', 'size'],
  5: ['rot15', 'mark', 'rot30'],
};

function randomCell(rng: Rng, i: Intensity, shapes = SHAPES[i]): ObsCell {
  const shape = rng.pick(shapes);
  const step = ROT_STEP[i];
  return cell(shape, rng.pick(ALL_COLORS), rng.int(0, 360 / step - 1) * step);
}

/** Renvoie une variante VISIBLEMENT différente de `c` (ou null si impossible). */
function vary(rng: Rng, c: ObsCell, i: Intensity): ObsCell | null {
  const options = rng.shuffle(CHANGES[i]);
  for (const ch of options) {
    let v: ObsCell;
    switch (ch) {
      case 'color': v = { ...c, color: rng.pick(ALL_COLORS.filter((x) => x !== c.color)) }; break;
      case 'shape': v = { ...c, shape: rng.pick(SHAPES[i].filter((x) => x !== c.shape)), rot: 0 }; break;
      case 'size': v = { ...c, size: c.size === 'm' ? 's' : 'm' }; break;
      case 'mark': v = { ...c, mark: !c.mark }; break;
      default: {
        if (!ORIENTED.includes(c.shape)) continue;
        const deg = { rot90: 90, rot45: 45, rot30: 30, rot15: 15 }[ch];
        v = { ...c, rot: c.rot + (rng.chance(0.5) ? deg : -deg) };
      }
    }
    if (!sameLook(v, c)) return v;
  }
  return null;
}

function grid(n: number): number[] {
  return Array.from({ length: n }, (_, k) => k);
}

// ---------- Intrus ----------

const ODD_DIMS: Record<Intensity, [number, number]> = { 1: [3, 3], 2: [4, 4], 3: [5, 4], 4: [5, 5], 5: [6, 5] };

export function generateOdd(rng: Rng, i: Intensity): Draft | null {
  const [cols, rows] = ODD_DIMS[i];
  // À partir de l'intensité 3, base orientée pour permettre les écarts d'angle.
  const base = randomCell(rng, i, i >= 3 && rng.chance(0.7) ? ORIENTED : SHAPES[i]);
  const odd = vary(rng, base, i);
  if (!odd) return null;
  const target = rng.int(0, cols * rows - 1);
  const cells = grid(cols * rows).map((k) => (k === target ? odd : { ...base }));
  return {
    kind: 'odd',
    input: 'grid',
    prompt: 'Touche l’intrus.',
    display: { type: 'grid', cols, rows, cells },
    choices: grid(cols * rows),
    answerIndex: target,
    explanation: `L’intrus était ${position(target, cols)} : ${describeChange(base, odd)}.`,
  };
}

// ---------- Différence entre deux images ----------

const DIFF_DIMS: Record<Intensity, [number, number]> = { 1: [3, 3], 2: [4, 3], 3: [4, 4], 4: [4, 4], 5: [4, 4] };

export function generateDifference(rng: Rng, i: Intensity): Draft | null {
  const [cols, rows] = DIFF_DIMS[i];
  const left = grid(cols * rows).map(() => randomCell(rng, i));
  const target = rng.int(0, left.length - 1);
  const changed = vary(rng, left[target], i);
  if (!changed) return null;
  const right = left.map((c, k) => (k === target ? changed : { ...c }));
  return {
    kind: 'difference',
    input: 'grid',
    prompt: 'Une seule case diffère entre les deux images. Touche-la.',
    display: { type: 'compare', cols, rows, left, right },
    choices: grid(cols * rows),
    answerIndex: target,
    explanation: `La différence était ${position(target, cols)} : ${describeChange(left[target], changed)}.`,
  };
}

// ---------- Erreur dans un motif ----------

interface PatternSpec { cols: number; rows: number; periods: [number, number][]; values: number; subtle: boolean }
const PATTERN: Record<Intensity, PatternSpec> = {
  1: { cols: 4, rows: 3, periods: [[2, 1]], values: 2, subtle: false },
  2: { cols: 4, rows: 4, periods: [[2, 2], [2, 1], [1, 2]], values: 2, subtle: false },
  3: { cols: 6, rows: 4, periods: [[3, 1], [2, 2], [3, 2]], values: 3, subtle: false },
  4: { cols: 6, rows: 4, periods: [[3, 2], [2, 2]], values: 3, subtle: true },
  5: { cols: 6, rows: 5, periods: [[3, 2], [2, 2]], values: 3, subtle: true },
};

export function generatePattern(rng: Rng, i: Intensity): Draft | null {
  const spec = PATTERN[i];
  const [px, py] = rng.pick(spec.periods);
  // Valeurs du motif : formes distinctes, ou (subtil) une même forme orientée différemment.
  let values: ObsCell[];
  if (spec.subtle && rng.chance(0.6)) {
    const shape = rng.pick(ORIENTED);
    const color = rng.pick(ALL_COLORS);
    const angles = rng.shuffle([0, 45, 90, 135, 180, 225, 270, 315]).slice(0, spec.values);
    values = angles.map((a) => cell(shape, color, a));
  } else {
    values = [];
    while (values.length < spec.values) {
      const c = randomCell(rng, i);
      if (!values.some((v) => sameLook(v, c))) values.push(c);
    }
  }
  const motif = grid(px * py).map(() => rng.pick(values));
  if (new Set(motif.map((m) => values.indexOf(m))).size < 2) return null;
  const cells = grid(spec.cols * spec.rows).map((k) => ({ ...motif[((k % spec.cols) % px) + px * (Math.floor(k / spec.cols) % py)] }));
  const target = rng.int(0, cells.length - 1);
  const original = cells[target];
  const wrong = spec.subtle && rng.chance(0.5) ? vary(rng, original, i) : rng.pick(values.filter((v) => !sameLook(v, original)));
  if (!wrong) return null;
  cells[target] = { ...wrong };
  const along = py === 1 ? `toutes les ${px} colonnes` : px === 1 ? `toutes les ${py} lignes` : `en blocs de ${px} × ${py}`;
  return {
    kind: 'pattern',
    input: 'grid',
    prompt: 'Une case casse le motif. Laquelle ?',
    display: { type: 'grid', cols: spec.cols, rows: spec.rows, cells },
    choices: grid(cells.length),
    answerIndex: target,
    explanation: `Le motif se répète ${along} ; la case ${position(target, spec.cols)} aurait dû être un ${describeCell(original)}.`,
  };
}

// ---------- Détail caché : compter ----------

const COUNT_DIMS: Record<Intensity, [number, number]> = { 1: [4, 3], 2: [4, 4], 3: [5, 4], 4: [5, 5], 5: [6, 5] };

export function generateCount(rng: Rng, i: Intensity): Draft | null {
  const [cols, rows] = COUNT_DIMS[i];
  const n = cols * rows;
  const matchRotation = i >= 4;
  const shape = matchRotation ? 'arrow' : rng.pick(SHAPES[i]);
  const target = cell(shape, rng.pick(ALL_COLORS), matchRotation ? rng.pick([0, 90, 180, 270]) : 0);
  const answer = rng.int(2, Math.min(9, Math.floor(n / 3)));

  const isTarget = (c: ObsCell) =>
    c.shape === target.shape && c.color === target.color && (!matchRotation || sameLook({ ...c, mark: false, size: 'm' }, target));
  // Leurres : beaucoup de « presque cibles » quand l'intensité monte.
  const lookalike = (): ObsCell => {
    const r = rng.next();
    if (matchRotation && r < 0.45) return { ...target, rot: target.rot + rng.pick([90, 180, 270, 45, -45]) };
    if (r < 0.3 + i * 0.08) return { ...target, color: rng.pick(ALL_COLORS.filter((c) => c !== target.color)), rot: rng.int(0, 3) * 90 };
    if (r < 0.5 + i * 0.06) return cell(rng.pick(SHAPES[i].filter((s) => s !== target.shape)), target.color, rng.int(0, 3) * 90);
    return randomCell(rng, i);
  };

  const spots = new Set(rng.shuffle(grid(n)).slice(0, answer));
  const cells = grid(n).map((k) => {
    if (spots.has(k)) return { ...target, rot: matchRotation ? target.rot : rng.int(0, 3) * 90 };
    let c = lookalike();
    for (let guard = 0; isTarget(c) && guard < 20; guard++) c = lookalike();
    return c;
  });
  if (cells.filter(isTarget).length !== answer) return null;

  const { choices, answerIndex } = buildChoices(rng, answer, [answer - 1, answer + 1, answer + 2, answer - 2].filter((x) => x >= 0));
  if (choices.some((c) => c < 0)) return null;
  const dir = matchRotation ? directionName(target.rot) : null;
  const what = describeCell(target, true);
  const oriented = ORIENTED.includes(shape) || shape === 'tri';
  return {
    kind: 'count',
    input: 'choice',
    prompt: dir ? `Combien de ${what} pointent ${dir} ?` : `Combien de ${what} ?${oriented ? ' (toutes orientations)' : ''}`,
    display: { type: 'count', cols, rows, cells, target, matchRotation },
    choices,
    answerIndex,
    explanation: `Il y en avait ${answer}.`,
  };
}
