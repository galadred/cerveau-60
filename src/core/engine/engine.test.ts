import { describe, expect, it } from 'vitest';
import { pointsForCorrect } from '../scoring';
import { intensityFor } from './intensity';
import { RoundSession } from './session';
import { proofFromLog, verifyRound } from './verify';

function clock(start = 10_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

function newSession(difficulty: 'novice' | 'confirme' | 'expert' | 'genie' = 'confirme', seed = 'test-seed') {
  const c = clock();
  const s = new RoundSession({ seed, difficulty, clock: c.now });
  return { s, c };
}

const wrongOf = (s: RoundSession) => (s.current!.answerIndex + 1) % 4;

function finish(s: RoundSession) {
  const sum = s.summary();
  return { sum, proof: proofFromLog(sum.seed, sum.log, 1) };
}

describe('Difficulté progressive', () => {
  it('monte d’un cran toutes les 4 bonnes réponses, au plus de 2', () => {
    expect(intensityFor(1, 0)).toBe(1);
    expect(intensityFor(1, 3)).toBe(1);
    expect(intensityFor(1, 4)).toBe(2);
    expect(intensityFor(1, 8)).toBe(3);
    expect(intensityFor(1, 40)).toBe(3);
    expect(intensityFor(4, 0)).toBe(4);
    expect(intensityFor(4, 40)).toBe(5);
  });
});

describe('RoundSession', () => {
  it('ne démarre le chrono qu’au start()', () => {
    const { s, c } = newSession();
    c.advance(5_000);
    expect(s.remaining()).toBe(60_000);
    expect(s.answer(0)).toBeNull();
    s.start();
    expect(s.phase).toBe('playing');
    expect(s.current).not.toBeNull();
  });

  it('calcule les points côté moteur (vitesse + série + difficulté)', () => {
    const { s, c } = newSession('confirme');
    s.start();
    c.advance(3_000);
    const r1 = s.answer(s.current!.answerIndex)!;
    expect(r1.correct).toBe(true);
    expect(r1.answerTimeMs).toBe(3_000);
    expect(r1.points).toBe(pointsForCorrect('confirme', 3_000, 1));
    c.advance(400); // retour visuel : ne compte pas dans le temps de réponse
    s.next();
    c.advance(5_000);
    const r2 = s.answer(s.current!.answerIndex)!;
    expect(r2.points).toBe(pointsForCorrect('confirme', 5_000, 2));
    expect(s.score).toBe(r1.points + r2.points);
  });

  it('pénalise une erreur et remet la série à zéro', () => {
    const { s, c } = newSession('expert');
    s.start();
    s.answer(s.current!.answerIndex);
    s.next();
    c.advance(1_000);
    const before = s.remaining();
    const r = s.answer(wrongOf(s))!;
    expect(r.correct).toBe(false);
    expect(r.penaltyMs).toBe(4_000);
    expect(s.remaining()).toBe(before - 4_000);
    expect(s.currentStreak).toBe(0);
  });

  it('passer coûte une demi-pénalité et ne compte pas comme tentative', () => {
    const { s } = newSession('novice');
    s.start();
    const r = s.skip()!;
    expect(r.penaltyMs).toBe(1_000);
    s.next();
    expect(s.summary().attempted).toBe(0);
  });

  it('refuse une double réponse et une réponse hors bornes', () => {
    const { s } = newSession();
    s.start();
    expect(s.answer(7)).toBeNull();
    expect(s.answer(-1)).toBeNull();
    expect(s.answer(s.current!.answerIndex)).not.toBeNull();
    expect(s.answer(s.current!.answerIndex)).toBeNull();
    expect(s.summary().log).toHaveLength(1);
  });

  it('refuse toute réponse après l’échéance, même sans rafraîchissement', () => {
    const { s, c } = newSession();
    s.start();
    c.advance(60_001);
    expect(s.answer(s.current!.answerIndex)).toBeNull();
    expect(s.phase).toBe('over');
    expect(s.summary().log).toHaveLength(0);
  });

  it('une pénalité peut terminer la manche', () => {
    const { s, c } = newSession('genie');
    s.start();
    c.advance(57_000);
    const r = s.answer(wrongOf(s))!;
    expect(r.expired).toBe(true);
    expect(s.phase).toBe('over');
  });

  it('le retour visuel ne fige pas le chrono', () => {
    const { s, c } = newSession();
    s.start();
    s.answer(s.current!.answerIndex);
    c.advance(10_000);
    expect(s.remaining()).toBe(50_000);
  });

  it('jamais deux fois la même énigme dans une manche', () => {
    const { s } = newSession('novice', 'dedupe');
    s.start();
    for (let i = 0; i < 40; i++) {
      s.answer(s.current!.answerIndex);
      s.next();
    }
    const ids = s.summary().puzzles.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('la difficulté monte pendant la manche', () => {
    const { s } = newSession('novice');
    s.start();
    const seen: number[] = [];
    for (let i = 0; i < 10; i++) {
      seen.push(s.current!.intensity);
      s.answer(s.current!.answerIndex);
      s.next();
    }
    expect(seen.slice(0, 4).every((x) => x === 1)).toBe(true);
    expect(seen.slice(4, 8).every((x) => x === 2)).toBe(true);
    expect(seen[8]).toBe(3);
  });
});

describe('Vérification par rejeu', () => {
  function playMixed() {
    const { s, c } = newSession('expert', 'replay');
    s.start();
    const plan = ['ok', 'ok', 'ko', 'skip', 'ok', 'ok', 'ok', 'ok', 'ok', 'ko', 'ok'];
    for (const step of plan) {
      c.advance(2_000 + Math.floor(Math.random() * 1500));
      if (step === 'ok') s.answer(s.current!.answerIndex);
      else if (step === 'ko') s.answer(wrongOf(s));
      else s.skip();
      c.advance(450);
      s.next();
    }
    s.end();
    return finish(s);
  }

  it('accepte une manche réelle', () => {
    const { sum, proof } = playMixed();
    expect(verifyRound(sum, proof)).toEqual({ ok: true });
    expect(sum.score).toBe(sum.log.reduce((a, r) => a + r.points, 0));
  });

  it('rejette un score gonflé', () => {
    const { sum, proof } = playMixed();
    expect(verifyRound({ ...sum, score: sum.score + 100 }, proof).ok).toBe(false);
  });

  it('rejette des temps de réponse falsifiés', () => {
    const { sum, proof } = playMixed();
    const fast = { ...proof, a: proof.a.map(([c]) => [c, 0] as [number, number]) };
    expect(verifyRound(sum, fast).ok).toBe(false); // score différent
    const slow = { ...proof, a: proof.a.map(([c]) => [c, 20_000] as [number, number]) };
    expect(verifyRound({ ...sum }, slow).ok).toBe(false); // temps impossible
  });

  it('rejette un choix modifié et une graine différente', () => {
    const { sum, proof } = playMixed();
    const changed = { ...proof, a: proof.a.map(([c, t], i) => (i === 0 ? [(c + 1) % 4, t] : [c, t]) as [number, number]) };
    expect(verifyRound(sum, changed).ok).toBe(false);
    expect(verifyRound(sum, { ...proof, seed: 'autre' }).ok).toBe(false);
  });
});
