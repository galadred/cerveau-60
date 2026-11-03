import type { SymbolId } from '@/core/puzzles/types';

const LABEL: Record<SymbolId, string> = { tri: 'triangle', circle: 'rond', square: 'carré', diamond: 'losange' };

/** Symboles des déductions : formes nettes, lisibles même en petit. */
export function Shape({ s, size = 34 }: { s: SymbolId; size?: number }) {
  return (
    <svg className={`shape shape--${s}`} width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={LABEL[s]}>
      {s === 'tri' && <path d="M20 5 36 34H4Z" fill="var(--c-red)" />}
      {s === 'circle' && <circle cx="20" cy="20" r="15" fill="var(--c-ivory)" />}
      {s === 'square' && <rect x="6.5" y="6.5" width="27" height="27" rx="3" fill="none" stroke="var(--c-ivory)" strokeWidth="4" />}
      {s === 'diamond' && <path d="M20 3 37 20 20 37 3 20Z" fill="none" stroke="var(--c-red)" strokeWidth="4" strokeLinejoin="round" />}
    </svg>
  );
}

export function shapeLabel(s: SymbolId): string {
  return LABEL[s];
}
