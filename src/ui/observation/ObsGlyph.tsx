import type { ObsCell, ObsColor } from '@/core/observation/cells';
import { CIRCLE_R, HALF_R, POLYGONS, polygonPath } from '@/core/observation/geometry';

const FILL: Record<ObsColor, string> = { ivory: 'var(--c-ivory)', red: 'var(--c-red)', grey: 'var(--c-obs-grey)' };
const PATHS = Object.fromEntries(Object.entries(POLYGONS).map(([k, pts]) => [k, polygonPath(pts!)]));

/**
 * Forme d'observation, dessinée à partir de `core/observation/geometry.ts`
 * (mêmes coordonnées que celles utilisées par les tests de symétrie).
 */
export function ObsGlyph({ c, title }: { c: ObsCell; title?: string }) {
  const color = FILL[c.color];
  const scale = c.size === 's' ? 0.62 : 1;
  return (
    <svg viewBox="0 0 40 40" className="obs-glyph" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <g transform={`rotate(${c.rot} 20 20) translate(20 20) scale(${scale}) translate(-20 -20)`}>
        {c.shape === 'circle' && <circle cx="20" cy="20" r={CIRCLE_R} fill={color} />}
        {c.shape === 'half' && (
          <>
            <circle cx="20" cy="20" r={HALF_R} fill="none" stroke={color} strokeWidth="2.5" />
            <path d={`M20 ${20 - HALF_R}a${HALF_R} ${HALF_R} 0 0 0 0 ${2 * HALF_R}Z`} fill={color} />
          </>
        )}
        {PATHS[c.shape] && <path d={PATHS[c.shape]} fill={color} />}
      </g>
      {c.mark && <circle cx="34" cy="6" r="3" fill={c.color === 'red' ? 'var(--c-ivory)' : 'var(--c-red)'} />}
    </svg>
  );
}
