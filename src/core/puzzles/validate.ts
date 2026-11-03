import { checkArithmetic } from './arithmetic';
import { solveSymbols } from './deduction';
import { isUniqueSequence } from './solvers';
import { CHOICE_COUNT } from './choices';
import type { Puzzle } from './types';
import { validateObservation } from '../observation/validate';

/**
 * Contrôle indépendant d'une énigme, à partir de ce qui est affiché :
 * 4 propositions distinctes, et exactement UNE proposition correcte,
 * qui est bien celle marquée comme réponse.
 */
export function validatePuzzle(p: Puzzle): { ok: true } | { ok: false; reason: string } {
  if (p.display.type === 'grid' || p.display.type === 'compare' || p.display.type === 'count') return validateObservation(p);
  if (p.choices.length !== CHOICE_COUNT) return { ok: false, reason: 'nombre de propositions' };
  if (new Set(p.choices).size !== CHOICE_COUNT) return { ok: false, reason: 'propositions en double' };
  if (!p.choices.every(Number.isInteger)) return { ok: false, reason: 'proposition non entière' };
  if (p.answerIndex < 0 || p.answerIndex >= CHOICE_COUNT) return { ok: false, reason: 'index de réponse' };
  const answer = p.choices[p.answerIndex];
  const d = p.display;
  switch (d.type) {
    case 'sequence':
      if (d.terms.length < 5) return { ok: false, reason: 'suite trop courte' };
      return isUniqueSequence(d.terms, answer) ? { ok: true } : { ok: false, reason: 'suite ambiguë ou fausse' };
    case 'expression':
      return checkArithmetic(d.tokens, p.choices, p.answerIndex) ? { ok: true } : { ok: false, reason: 'calcul faux ou ambigu' };
    case 'symbols': {
      const s = solveSymbols(d.lines, d.ask, d.domain);
      return s.size === 1 && s.has(answer) ? { ok: true } : { ok: false, reason: 'déduction ambiguë ou fausse' };
    }
  }
}
