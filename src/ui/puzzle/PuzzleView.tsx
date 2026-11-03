import { fmt, type Puzzle, type SymToken } from '@/core/puzzles/types';
import { Shape, shapeLabel } from './Shape';

function Tokens({ tokens, size }: { tokens: SymToken[]; size: number }) {
  return (
    <>
      {tokens.map((k, i) =>
        k.t === 'sym' ? <Shape key={i} s={k.s} size={size} /> : <span key={i} className="sym-op">{k.t === 'num' ? fmt(k.v) : k.v}</span>,
      )}
    </>
  );
}

function spoken(tokens: SymToken[]): string {
  return tokens.map((k) => (k.t === 'sym' ? shapeLabel(k.s) : k.t === 'num' ? fmt(k.v) : k.v)).join(' ');
}

/** Rendu d'une énigme du mode Logique. `compact` sert à la revue des résultats. */
export function PuzzleView({ puzzle, compact = false }: { puzzle: Puzzle; compact?: boolean }) {
  const d = puzzle.display;
  switch (d.type) {
    case 'sequence': {
      const longest = Math.max(...d.terms.map((t) => fmt(t).length));
      const dense = d.terms.length + 1 >= 7 || longest >= 4;
      return (
        <ol className={`seq${compact ? ' seq--compact' : ''}${dense ? ' seq--dense' : ''}`} aria-label={`Suite : ${d.terms.map(fmt).join(', ')}, puis ?`}>
          {d.terms.map((t, i) => (
            <li key={i} className="seq__tile num">{fmt(t)}</li>
          ))}
          <li className="seq__tile seq__tile--ask num">?</li>
        </ol>
      );
    }
    case 'expression':
      return (
        <p className={`expr${compact ? ' expr--compact' : ''}`} aria-label={d.tokens.join(' ').replace('?', 'quoi')}>
          {d.tokens.map((t, i) =>
            t === '?' ? <span key={i} className="expr__ask num">?</span>
              : /^[−-]?\d+$/.test(t) ? <span key={i} className="expr__num num">{t}</span>
                : <span key={i} className="expr__op">{t}</span>,
          )}
        </p>
      );
    case 'symbols': {
      const size = compact ? 20 : 30;
      return (
        <div className={`syms${compact ? ' syms--compact' : ''}`}>
          {d.lines.map((l, i) => (
            <p key={i} className="syms__line" aria-label={`${spoken(l.lhs)} égale ${l.rhs}`}>
              <Tokens tokens={l.lhs} size={size} />
              <span className="sym-op">=</span>
              <span className="syms__rhs num">{l.rhs}</span>
            </p>
          ))}
          <p className="syms__line syms__line--ask" aria-label={`${spoken(d.ask)} égale ?`}>
            <Tokens tokens={d.ask} size={size} />
            <span className="sym-op">=</span>
            <span className="expr__ask num">?</span>
          </p>
        </div>
      );
    }
  }
}

export const KIND_LABEL: Record<Puzzle['kind'], string> = {
  sequence: 'Suite logique',
  arithmetic: 'Calcul',
  deduction: 'Déduction',
};
