import type { ObsCell, ObsColor } from '@/core/observation/cells';

const FILL: Record<ObsColor, string> = { ivory: 'var(--c-ivory)', red: 'var(--c-red)', grey: 'var(--c-obs-grey)' };

/**
 * Forme d'observation, dessinée autour du centre (20, 20) pour que les
 * rotations correspondent exactement aux symétries utilisées par la validation.
 */
export function ObsGlyph({ c, title }: { c: ObsCell; title?: string }) {
  const color = FILL[c.color];
  const scale = c.size === 's' ? 0.62 : 1;
  return (
    <svg viewBox="0 0 40 40" className="obs-glyph" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <g transform={`rotate(${c.rot} 20 20) translate(20 20) scale(${scale}) translate(-20 -20)`}>
        {c.shape === 'circle' && <circle cx="20" cy="20" r="12" fill={color} />}
        {c.shape === 'square' && <rect x="9" y="9" width="22" height="22" rx="2" fill={color} />}
        {c.shape === 'tri' && <path d="M20 6 32.12 27H7.88Z" fill={color} />}
        {c.shape === 'cross' && <path d="M17 7h6v10h10v6H23v10h-6V23H7v-6h10z" fill={color} />}
        {c.shape === 'arrow' && <path d="M20 6 31 18h-6.5v16h-9V18H9Z" fill={color} />}
        {c.shape === 'half' && (
          <>
            <circle cx="20" cy="20" r="11.5" fill="none" stroke={color} strokeWidth="2.5" />
            <path d="M20 8.5a11.5 11.5 0 0 0 0 23Z" fill={color} />
          </>
        )}
      </g>
      {c.mark && <circle cx="34" cy="6" r="3" fill={c.color === 'red' ? 'var(--c-ivory)' : 'var(--c-red)'} />}
    </svg>
  );
}
