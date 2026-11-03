import { describeCell, type ObsCell } from '@/core/observation/cells';
import type { Puzzle } from '@/core/puzzles/types';
import { ObsGlyph } from './ObsGlyph';

export interface CellMarks {
  /** Case correcte à mettre en évidence (retour visuel ou revue). */
  answerIndex: number;
  /** Case choisie par le joueur (null si passée). */
  choice: number | null;
  /** Double image : panneau où le joueur a touché (0 = A, 1 = B). */
  panel?: 0 | 1;
}

interface Props {
  puzzle: Puzzle;
  onPick?: (index: number, panel?: 0 | 1) => void;
  marks?: CellMarks | null;
  compact?: boolean;
}

function Grid({ cells, cols, onPick, marks, compact, label, showWrong = true }: {
  cells: ObsCell[]; cols: number; onPick?: (i: number) => void; marks?: CellMarks | null; compact?: boolean; label: string;
  /** Afficher la case erronée dans cette grille (double image : seulement dans le panneau touché). */
  showWrong?: boolean;
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
        // Dans l'image non touchée, la case choisie garde la même luminosité que dans l'autre
        // image (« écho ») : sinon l'assombrissement créerait une fausse différence entre A et B.
        const state = marks
          ? i === marks.answerIndex ? ' obs-cell--right' : i === marks.choice ? (showWrong ? ' obs-cell--wrong' : ' obs-cell--echo') : ''
          : '';
        const name = `${describeCell(c)}, ligne ${Math.floor(i / cols) + 1}, colonne ${(i % cols) + 1}`;
        return interactive ? (
          <button key={i} className={`obs-cell${state}`} onClick={() => onPick!(i)} disabled={!!marks} aria-label={name}>
            <ObsGlyph c={c} />
            {state && !state.includes('echo') && <span className="obs-cell__badge" aria-hidden="true">{state.includes('right') ? '✓' : '✕'}</span>}
          </button>
        ) : (
          <span key={i} className={`obs-cell${state}`}>
            <ObsGlyph c={c} />
            {state && !state.includes('echo') && <span className="obs-cell__badge" aria-hidden="true">{state.includes('right') ? '✓' : '✕'}</span>}
          </span>
        );
      })}
    </div>
  );
}

/** Rendu des énigmes d'observation (grille, double image, comptage). */
export function ObservationView({ puzzle, onPick, marks, compact }: Props) {
  const pickA = onPick && ((i: number) => onPick(i, 0));
  const pickB = onPick && ((i: number) => onPick(i, 1));
  const wrongIn = (panel: 0 | 1) => marks?.panel === undefined || marks.panel === panel;
  const d = puzzle.display;
  switch (d.type) {
    case 'grid':
      return <Grid cells={d.cells} cols={d.cols} onPick={onPick && ((i) => onPick(i))} marks={marks} compact={compact} label="Grille à observer" />;
    case 'compare':
      return (
        <div className={`obs-compare${compact ? ' obs-compare--compact' : ''}`}>
          <figure className="obs-panel">
            <figcaption className="obs-panel__label">Image A</figcaption>
            <Grid cells={d.left} cols={d.cols} onPick={pickA} marks={marks} compact={compact} label="Image A" showWrong={wrongIn(0)} />
          </figure>
          <figure className="obs-panel">
            <figcaption className="obs-panel__label">Image B</figcaption>
            <Grid cells={d.right} cols={d.cols} onPick={pickB} marks={marks} compact={compact} label="Image B" showWrong={wrongIn(1)} />
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
