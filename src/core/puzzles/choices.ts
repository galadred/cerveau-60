import type { Rng } from '../random';

export const CHOICE_COUNT = 4;

/**
 * Construit 4 propositions distinctes : la bonne réponse et 3 leurres
 * plausibles (erreurs typiques fournies par le générateur), mélangées.
 */
export function buildChoices(rng: Rng, answer: number, candidates: readonly number[]): { choices: number[]; answerIndex: number } {
  const pool = new Set<number>();
  for (const c of rng.shuffle(candidates)) {
    if (Number.isInteger(c) && c !== answer && Math.abs(c) < 100000) pool.add(c);
    if (pool.size === CHOICE_COUNT - 1) break;
  }
  // Compléments proches si les leurres plausibles ne suffisent pas.
  const spread = Math.max(1, Math.round(Math.abs(answer) * 0.1));
  let k = 1;
  while (pool.size < CHOICE_COUNT - 1) {
    const c = answer + (rng.chance(0.5) ? 1 : -1) * k * spread;
    if (c !== answer && (answer < 0 || c >= 0)) pool.add(c);
    k++;
  }
  const choices = rng.shuffle([answer, ...pool]);
  return { choices, answerIndex: choices.indexOf(answer) };
}
