/**
 * Évaluateur d'expressions indépendant du générateur.
 * Il relit ce qui est réellement AFFICHÉ au joueur (jetons texte) et le calcule
 * avec les priorités usuelles. Sert à valider chaque énigme générée.
 */

type Node = { n: number } | { op: string; a: Node; b: Node } | { v: string };

const PREC: Record<string, number> = { '+': 1, '−': 1, '-': 1, '×': 2, '÷': 2 };

export class ExprError extends Error {}

/** Analyse une liste de jetons (nombres, variables, opérateurs, parenthèses). */
export function parseTokens(tokens: readonly string[]): Node {
  let i = 0;
  const peek = () => tokens[i];

  function primary(): Node {
    const tok = tokens[i++];
    if (tok === undefined) throw new ExprError('fin inattendue');
    if (tok === '(') {
      const e = expr(0);
      if (tokens[i++] !== ')') throw new ExprError('parenthèse manquante');
      return e;
    }
    const num = Number(tok.replace('−', '-'));
    if (tok !== '' && Number.isFinite(num) && /^[−-]?\d+$/.test(tok)) return { n: num };
    if (/^[a-z?]+$/i.test(tok)) return { v: tok };
    throw new ExprError(`jeton invalide : ${tok}`);
  }

  function expr(minPrec: number): Node {
    let left = primary();
    while (peek() !== undefined && PREC[peek()] !== undefined && PREC[peek()] >= minPrec) {
      const op = tokens[i++];
      const right = expr(PREC[op] + 1);
      left = { op, a: left, b: right };
    }
    return left;
  }

  const root = expr(1);
  if (i !== tokens.length) throw new ExprError('jetons en trop');
  return root;
}

/** Évalue exactement ; renvoie null si division non entière ou par zéro. */
export function evaluate(node: Node, vars: Record<string, number> = {}): number | null {
  if ('n' in node) return node.n;
  if ('v' in node) {
    const v = vars[node.v];
    return v === undefined ? null : v;
  }
  const a = evaluate(node.a, vars);
  const b = evaluate(node.b, vars);
  if (a === null || b === null) return null;
  switch (node.op) {
    case '+': return a + b;
    case '−': case '-': return a - b;
    case '×': return a * b;
    case '÷': return b !== 0 && a % b === 0 ? a / b : null;
  }
  return null;
}

/** Compile une expression en fonction rapide (utilisée pour la recherche exhaustive). */
export function compile(node: Node): (vars: Record<string, number>) => number | null {
  return (vars) => evaluate(node, vars);
}

export function evalTokens(tokens: readonly string[], vars?: Record<string, number>): number | null {
  return evaluate(parseTokens(tokens), vars);
}
