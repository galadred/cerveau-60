/**
 * Solveurs de suites : chacun reconnaît une famille de règles classiques et,
 * s'il s'ajuste à TOUS les termes affichés (avec au moins un terme de contrôle),
 * prédit le terme suivant. Une suite n'est acceptée que si toutes les familles
 * qui s'ajustent prédisent la même valeur : la réponse est alors unique parmi
 * les règles usuelles (différence, raison, polynômes, récurrences, alternances…).
 */

export interface SequenceSolver {
  name: string;
  /** Prédictions possibles du terme suivant (vide si la règle ne s'ajuste pas). */
  predict(t: readonly number[]): number[];
}

const diffs = (t: readonly number[]) => t.slice(1).map((v, i) => v - t[i]);
const allEqual = (a: readonly number[]) => a.length > 0 && a.every((v) => v === a[0]);
const isInt = (x: number) => Number.isFinite(x) && Number.isInteger(x) && Math.abs(x) < 1e9;
const out = (x: number) => (isInt(x) ? [x] : []);

/** Différences constantes (d'ordre k) : polynôme de degré k. */
function polynomial(order: number): SequenceSolver {
  return {
    name: `poly${order}`,
    predict(t) {
      // ordre k : il faut k+1 points pour ajuster et au moins 1 de contrôle.
      if (t.length < order + 2) return [];
      const levels: number[][] = [t.slice()];
      for (let k = 0; k < order; k++) levels.push(diffs(levels[levels.length - 1]));
      const last = levels[order];
      if (!allEqual(last) || last.length < 2) return [];
      let next = last[0];
      for (let k = order - 1; k >= 0; k--) next = levels[k][levels[k].length - 1] + next;
      return out(next);
    },
  };
}

/** Raison constante (rationnelle exacte). */
const geometric: SequenceSolver = {
  name: 'geometric',
  predict(t) {
    if (t.length < 3 || t[0] === 0) return [];
    const [p, q] = [t[1], t[0]]; // raison p/q
    for (let i = 0; i + 1 < t.length; i++) if (t[i + 1] * q !== t[i] * p) return [];
    return out((t[t.length - 1] * p) / q);
  },
};

/** Différences en progression géométrique ⇔ récurrence affine u(n+1) = k·u(n) + c. */
const affine: SequenceSolver = {
  name: 'affine',
  predict(t) {
    const d = diffs(t);
    if (d.length < 3 || d[0] === 0) return [];
    const [p, q] = [d[1], d[0]];
    for (let i = 0; i + 1 < d.length; i++) if (d[i + 1] * q !== d[i] * p) return [];
    return out(t[t.length - 1] + (d[d.length - 1] * p) / q);
  },
};

/** u(n) = u(n−1) + u(n−2) + c (type Fibonacci). */
const fibonacci: SequenceSolver = {
  name: 'fibonacci',
  predict(t) {
    if (t.length < 4) return [];
    const c = t[2] - t[1] - t[0];
    for (let i = 2; i < t.length; i++) if (t[i] !== t[i - 1] + t[i - 2] + c) return [];
    return out(t[t.length - 1] + t[t.length - 2] + c);
  },
};

/** u(n) = p·u(n−1) + q·u(n−2), coefficients rationnels exacts. */
const linear2: SequenceSolver = {
  name: 'linear2',
  predict(t) {
    if (t.length < 5) return [];
    const det = t[1] * t[1] - t[0] * t[2];
    if (det === 0) return [];
    const pNum = t[2] * t[1] - t[0] * t[3];
    const qNum = t[1] * t[3] - t[2] * t[2];
    for (let i = 2; i < t.length; i++) if (t[i] * det !== pNum * t[i - 1] + qNum * t[i - 2]) return [];
    const n = t.length;
    return out((pNum * t[n - 1] + qNum * t[n - 2]) / det);
  },
};

/** Deux opérations en alternance (chacune « +d » ou « ×r »). */
const alternating: SequenceSolver = {
  name: 'alternating',
  predict(t) {
    if (t.length < 5) return [];
    const nextStep = t.length - 1; // indice du pas à appliquer
    const parity = nextStep % 2;
    const steps: [number, number][] = [];
    for (let i = 0; i + 1 < t.length; i++) steps.push([t[i], t[i + 1]]);
    const fitsParity = (p: number) => {
      const s = steps.filter((_, i) => i % 2 === p);
      const res: ((x: number) => number)[] = [];
      if (s.length < 2) return res;
      const d = s.map(([a, b]) => b - a);
      if (allEqual(d)) res.push((x) => x + d[0]);
      if (s[0][0] !== 0) {
        const [p0, q0] = [s[0][1], s[0][0]];
        if (s.every(([a, b]) => b * q0 === a * p0)) res.push((x) => (x * p0) / q0);
      }
      return res;
    };
    // les deux parités doivent s'ajuster pour que la règle soit reconnue
    if (fitsParity(1 - parity).length === 0) return [];
    const preds = fitsParity(parity).map((f) => f(t[t.length - 1])).filter(isInt);
    return [...new Set(preds)];
  },
};

/** Deux suites arithmétiques entrelacées (termes pairs / impairs). */
const interleaved: SequenceSolver = {
  name: 'interleaved',
  predict(t) {
    if (t.length < 6) return [];
    const even = t.filter((_, i) => i % 2 === 0);
    const odd = t.filter((_, i) => i % 2 === 1);
    if (!allEqual(diffs(even)) || !allEqual(diffs(odd))) return [];
    const seq = t.length % 2 === 0 ? even : odd;
    return out(seq[seq.length - 1] + (seq[1] - seq[0]));
  },
};

export const SEQUENCE_SOLVERS: readonly SequenceSolver[] = [
  polynomial(1), polynomial(2), polynomial(3), geometric, affine, fibonacci, linear2, alternating, interleaved,
];

/** Ensemble de toutes les réponses défendables pour ces termes. */
export function sequencePredictions(terms: readonly number[]): Set<number> {
  const s = new Set<number>();
  for (const solver of SEQUENCE_SOLVERS) for (const p of solver.predict(terms)) s.add(p);
  return s;
}

/** Vrai si exactement une réponse est défendable et qu'elle vaut `answer`. */
export function isUniqueSequence(terms: readonly number[], answer: number): boolean {
  const p = sequencePredictions(terms);
  return p.size === 1 && p.has(answer);
}
