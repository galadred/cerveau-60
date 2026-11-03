import { describeCell, type ObsCell } from '@/core/observation/cells';
import type { Puzzle } from '@/core/puzzles/types';
import { ObsGlyph } from './ObsGlyph';

export interface CellMarks {
  /** Case correcte à mettre en évidence (retour visuel ou revue). */
  answerIndex: number;
  /** Case choisie par le joueur (null si passée). */
  choice: number | null;
}

interface Props {
  puzzle: Puzzle;
  onPick?: (index: number) => void;
  marks?: CellMarks | null;
  compact?: boolean;
}

function Grid({ cells, cols, onPick, marks, compact, label }: {
  cells: ObsCell[]; cols: number; onPick?: (i: number) => void; marks?: CellMarks | null; compact?: boolean; label: string;
}) {
  const interactive = !!onPick;
  return (
    <div
      className={`obs-grid${compact ? ' obs-grid--compact' : ''}`}
      style={{ ['--cols' as string]: cols, ['--rows' as string]: Math.ceil(cells.length / cols) }}
      role={interactive ? 'group' : 'img'}
      aria-label={label}
    >
      {cells.map((c, i) => {
        const state = marks ? (i === marks.answerIndex ? ' obs-cell--right' : i === marks.choice ? ' obs-cell--wrong' : '') : '';
        const name = `${describeCell(c)}, ligne ${Math.floor(i / cols) + 1}, colonne ${(i % cols) + 1}`;
        return interactive ? (
          <button key={i} className={`obs-cell${state}`} onClick={() => onPick!(i)} disabled={!!marks} aria-label={name}>
            <ObsGlyph c={c} />
          </button>
        ) : (
          <span key={i} className={`obs-cell${state}`}>
            <ObsGlyph c={c} />
          </span>
        );
      })}
    </div>
  );
}

/** Rendu des énigmes d'observation (grille, double image, comptage). */
export function ObservationView({ puzzle, onPick, marks, compact }: Props) {
  const d = puzzle.display;
  switch (d.type) {
    case 'grid':
      return <Grid cells={d.cells} cols={d.cols} onPick={onPick} marks={marks} compact={compact} label="Grille à observer" />;
    case 'compare':
      return (
        <div className={`obs-compare${compact ? ' obs-compare--compact' : ''}`}>
          <figure className="obs-panel">
            <figcaption className="obs-panel__label">Image A</figcaption>
            <Grid cells={d.left} cols={d.cols} onPick={onPick} marks={marks} compact={compact} label="Image A" />
          </figure>
          <figure className="obs-panel">
            <figcaption className="obs-panel__label">Image B</figcaption>
            <Grid cells={d.right} cols={d.cols} onPick={onPick} marks={marks} compact={compact} label="Image B" />
          </figure>
        </div>
      );
    case 'count':
      return (
        <div className="obs-count">
          <p className="obs-target">
            <span className="eyebrow">Cible</span>
            <span className="obs-target__glyph"><ObsGlyph c={{ ...d.target, rot: d.matchRotation ? d.target.rot : 0 }} title={describeCell(d.target)} /></span>
          </p>
          <Grid cells={d.cells} cols={d.cols} compact={compact} label="Grille à observer" />
        </div>
      );
    default:
      return null;
  }
}

export function isObservation(p: Puzzle): boolean {
  return p.display.type === 'grid' || p.display.type === 'compare' || p.display.type === 'count';
}
