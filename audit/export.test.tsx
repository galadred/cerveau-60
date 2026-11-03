import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import { generateObservationPuzzle } from '@/core/observation';
import type { Intensity } from '@/core/puzzles/types';
import { ObsGlyph } from '@/ui/observation/ObsGlyph';
import type { ObsCell } from '@/core/observation/cells';

const COLORS: Record<string, string> = { 'var(--c-ivory)': '#E8E4DA', 'var(--c-red)': '#C83232', 'var(--c-obs-grey)': '#85878f' };
const svg = (c: ObsCell) => {
  let m = renderToStaticMarkup(<ObsGlyph c={c} />);
  for (const [k, v] of Object.entries(COLORS)) m = m.split(k).join(v);
  return m.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"');
};

it.skipIf(!process.env.AUDIT_OUT)('export des cases rendues', () => {
  const out: unknown[] = [];
  for (const i of [1, 2, 3, 4, 5] as Intensity[]) {
    for (let s = 0; s < 150; s++) {
      for (const kind of ['difference', 'odd'] as const) {
        const p = generateObservationPuzzle(`audit-${s}`, s, i, 0, kind);
        const d = p.display;
        if (d.type === 'compare') out.push({ kind, i, answer: p.answerIndex, left: d.left.map(svg), right: d.right.map(svg), cells: [d.left, d.right], expl: p.explanation });
        if (d.type === 'grid') out.push({ kind, i, answer: p.answerIndex, grid: d.cells.map(svg), cells: d.cells, expl: p.explanation });
      }
    }
  }
  writeFileSync(process.env.AUDIT_OUT!, JSON.stringify(out));
}, 60000);
