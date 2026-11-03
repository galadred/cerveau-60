import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { generateObservationPuzzle } from '@/core/observation';
import { ObservationView } from './ObservationView';

const compare = generateObservationPuzzle('fb', 0, 1, 0, 'difference');
const wrong = (compare.answerIndex + 1) % compare.choices.length;

describe('Retour visuel du mode Observation', () => {
  it('double image : la bonne case est marquée dans les deux images, l’erreur seulement là où le joueur a touché', () => {
    const { container } = render(<ObservationView puzzle={compare} marks={{ answerIndex: compare.answerIndex, choice: wrong, panel: 1 }} />);
    const panels = container.querySelectorAll('.obs-panel');
    expect(panels[0].querySelectorAll('.obs-cell--right')).toHaveLength(1);
    expect(panels[1].querySelectorAll('.obs-cell--right')).toHaveLength(1);
    expect(panels[0].querySelectorAll('.obs-cell--wrong')).toHaveLength(0);
    expect(panels[1].querySelectorAll('.obs-cell--wrong')).toHaveLength(1);
  });

  it('pendant le retour, les deux images restent identiques hors bonne case (mêmes cases assombries)', () => {
    const { container } = render(<ObservationView puzzle={compare} marks={{ answerIndex: compare.answerIndex, choice: wrong, panel: 1 }} />);
    const [a, b] = [...container.querySelectorAll('.obs-panel')];
    // une case est « assombrie » si elle n'a aucun état (ni right, ni wrong, ni echo)
    const dimmed = (panel: Element) => [...panel.querySelectorAll('.obs-cell')].map((c) => c.className === 'obs-cell');
    expect(dimmed(a)).toEqual(dimmed(b));
  });

  it('avant de répondre, aucune case n’est mise en évidence', () => {
    const { container } = render(<ObservationView puzzle={compare} onPick={() => {}} />);
    expect(container.querySelectorAll('.obs-cell--right, .obs-cell--wrong, .obs-cell__badge')).toHaveLength(0);
  });

  it('toucher une case transmet son indice et le panneau', () => {
    const pick = vi.fn();
    const { container } = render(<ObservationView puzzle={compare} onPick={pick} />);
    const panels = container.querySelectorAll('.obs-panel');
    fireEvent.click(panels[1].querySelectorAll('button.obs-cell')[2]);
    expect(pick).toHaveBeenCalledWith(2, 1);
    fireEvent.click(panels[0].querySelectorAll('button.obs-cell')[0]);
    expect(pick).toHaveBeenCalledWith(0, 0);
  });

  it('les deux images ne diffèrent que d’une case dans le DOM rendu', () => {
    for (let s = 0; s < 40; s++) {
      const p = generateObservationPuzzle(`dom-${s}`, s, ((s % 5) + 1) as 1, 0, 'difference');
      const { container, unmount } = render(<ObservationView puzzle={p} />);
      const [a, b] = [...container.querySelectorAll('.obs-panel')].map((panel) => [...panel.querySelectorAll('.obs-glyph')].map((g) => g.outerHTML));
      const differing = a.map((html, i) => (html !== b[i] ? i : -1)).filter((i) => i >= 0);
      expect(differing).toEqual([p.answerIndex]);
      unmount();
    }
  });
});
