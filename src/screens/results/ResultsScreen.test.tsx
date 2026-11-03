import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NavigationProvider } from '@/app/navigation';
import { generateObservationPuzzle } from '@/core/observation';
import { generateLogicPuzzle } from '@/core/puzzles/logic';
import type { AnswerRecord } from '@/core/engine/session';
import type { GameResult, ModeId } from '@/core/types';
import { GameStoreProvider } from '@/state/GameStore';
import { ResultsScreen } from './ResultsScreen';
import type { RoundReport } from './report';

function report(mode: ModeId): RoundReport {
  const gen = mode === 'logic' ? generateLogicPuzzle : generateObservationPuzzle;
  const puzzles = [gen('r', 0, 1, 0), gen('r', 1, 1, 0)];
  const log: AnswerRecord[] = [
    { index: 0, puzzleId: puzzles[0].id, choice: puzzles[0].answerIndex, correct: true, answerTimeMs: 1730, points: 140, penaltyMs: 0, streak: 1 },
    { index: 1, puzzleId: puzzles[1].id, choice: (puzzles[1].answerIndex + 1) % puzzles[1].choices.length, correct: false, answerTimeMs: 2400, points: 0, penaltyMs: 2000, streak: 0 },
  ];
  const result: GameResult = {
    id: 'r1', playerId: 'p', playerName: 'Ada', mode, difficulty: 'novice', score: 140, solved: 1, attempted: 2,
    bestStreak: 1, durationMs: 60000, playedAt: new Date().toISOString(),
  };
  return { result, puzzles, log, previousBest: 0, xpBefore: 0, xpAfter: 140 };
}

function renderResults(mode: ModeId) {
  localStorage.setItem('cerveau60:profile', JSON.stringify({ id: 'p', name: 'Ada', createdAt: '', xp: 140, settings: { reducedMotion: true } }));
  return render(
    <GameStoreProvider>
      <NavigationProvider>
        <ResultsScreen direction={1} report={report(mode)} />
      </NavigationProvider>
    </GameStoreProvider>,
  );
}

describe('Écran de résultats', () => {
  it.each(['logic', 'observation'] as ModeId[])('revue lisible en mode %s (formatage français, aucune séquence brute)', (mode) => {
    const { container } = renderResults(mode);
    expect(container.textContent).not.toMatch(/\\u202f/);
    expect(container.textContent).toContain('1,7 s');
    expect(container.textContent).toContain('−2 s');
    expect(screen.getByRole('button', { name: /rejouer/i })).toBeInTheDocument();
    expect(container.querySelectorAll('.review__item')).toHaveLength(2);
  });

  it('en Observation, les réponses sont des positions de cases', () => {
    const { container } = renderResults('observation');
    const text = container.textContent ?? '';
    const p = report('observation').puzzles[1];
    if (p.input === 'grid') expect(text).toMatch(/Bonne réponse : ligne \d, colonne \d/);
  });
});
