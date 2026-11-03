import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { levelFromXp } from '@/core/progression';
import { RoundSession } from '@/core/engine/session';
import { generateObservationPuzzle } from '@/core/observation';
import { proofFromLog, verifyRound } from '@/core/engine/verify';
import { comboMultiplier, pointsForCorrect } from '@/core/scoring';
import { GameStoreProvider, useGameStore } from './GameStore';

const wrapper = ({ children }: { children: ReactNode }) => <GameStoreProvider>{children}</GameStoreProvider>;

async function mountStore() {
  const hook = renderHook(() => useGameStore(), { wrapper });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

function playObservationRound(answers: ('ok' | 'ko' | 'skip')[]) {
  let t = 0;
  const s = new RoundSession({ seed: `xp-${answers.join('')}`, difficulty: 'confirme', clock: () => t, source: generateObservationPuzzle });
  s.start();
  for (const a of answers) {
    t += 3000;
    const p = s.current!;
    if (a === 'ok') s.answer(p.answerIndex);
    else if (a === 'ko') s.answer((p.answerIndex + 1) % p.choices.length);
    else s.skip();
    t += 400;
    s.next();
  }
  s.end();
  return s.summary();
}

describe('Score, séries et XP', () => {
  it('le score d’une manche est la somme exacte des points, série comprise', () => {
    const sum = playObservationRound(['ok', 'ok', 'ok', 'ko', 'ok', 'skip', 'ok', 'ok']);
    const expectedStreaks = [1, 2, 3, 0, 1, 0, 1, 2];
    expect(sum.log.map((r) => r.streak)).toEqual(expectedStreaks);
    const expected = expectedStreaks.reduce((acc, k, i) => acc + (sum.log[i].correct ? pointsForCorrect('confirme', 3000, k) : 0), 0);
    expect(sum.score).toBe(expected);
    expect(sum.bestStreak).toBe(3);
    expect(sum.solved).toBe(6);
    expect(sum.attempted).toBe(7); // la case passée ne compte pas comme tentative
    expect(verifyRound(sum, proofFromLog(sum.seed, sum.log, 1), generateObservationPuzzle)).toEqual({ ok: true });
  });

  it('le multiplicateur affiché (« Série ×… ») correspond aux points de la réponse suivante', () => {
    // HUD : comboMultiplier(série + 1) ; la k-ième bonne réponse consécutive vaut base × comboMultiplier(k)
    for (let streak = 0; streak < 7; streak++) {
      const shown = comboMultiplier(streak + 1);
      expect(pointsForCorrect('novice', 15_000, streak + 1)).toBe(Math.round(100 * shown));
    }
  });
});

describe('Sauvegarde de la progression', () => {
  it('XP, record, statistiques et historique survivent à un rechargement', async () => {
    const a = await mountStore();
    await act(() => a.result.current.createProfile('Ada'));
    const r1 = playObservationRound(['ok', 'ok', 'ko', 'ok']);
    const r2 = playObservationRound(['ok', 'ok', 'ok', 'ok', 'ok']);
    for (const r of [r1, r2]) {
      await act(async () => {
        await a.result.current.recordResult({
          mode: 'observation', difficulty: 'confirme', score: r.score, solved: r.solved, attempted: r.attempted,
          bestStreak: r.bestStreak, durationMs: r.durationMs, proof: proofFromLog(r.seed, r.log, 1),
        });
      });
    }
    const xp = r1.score + r2.score;
    expect(a.result.current.profile!.xp).toBe(xp);
    expect(a.result.current.stats.byMode.observation.bestScore).toBe(Math.max(r1.score, r2.score));
    expect(a.result.current.stats.byMode.observation.games).toBe(2);
    expect(a.result.current.stats.byMode.logic.games).toBe(0);
    a.unmount();

    // « rechargement » : nouveau fournisseur, lecture depuis localStorage
    const b = await mountStore();
    expect(b.result.current.profile!.xp).toBe(xp);
    expect(b.result.current.level).toEqual(levelFromXp(xp));
    expect(b.result.current.stats.byMode.observation.bestScore).toBe(Math.max(r1.score, r2.score));
    expect(b.result.current.stats.bestStreak).toBe(5);
    expect(b.result.current.results[1].proof!.a).toHaveLength(5);
    const top = await b.result.current.repos.leaderboard.top({ mode: 'observation' });
    expect(top.map((e) => e.score)).toEqual([r1.score, r2.score].sort((x, y) => y - x));
  });

  it('cas du test manuel : 1 292 XP ⇒ niveau 2, 792 / 1 275 XP', () => {
    const l = levelFromXp(1292);
    expect(l.level).toBe(2);
    expect(l.xpIntoLevel).toBe(792);
    expect(l.xpForNext).toBe(1275);
  });

  it('l’XP gagnée est exactement le score, une seule fois par manche', async () => {
    const a = await mountStore();
    await act(() => a.result.current.createProfile('Ada'));
    await act(async () => {
      await a.result.current.recordResult({ mode: 'observation', difficulty: 'novice', score: 665, solved: 5, attempted: 6, bestStreak: 3, durationMs: 60000 });
    });
    expect(a.result.current.profile!.xp).toBe(665);
    expect(a.result.current.results).toHaveLength(1);
  });
});
