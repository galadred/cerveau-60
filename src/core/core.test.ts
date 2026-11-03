import { describe, expect, it } from 'vitest';
import { Countdown } from './countdown';
import { dayKey, dailyRandom, hashString, msUntilNextDay, seededRandom } from './daily';
import { levelFromXp, xpForLevel } from './progression';
import { BASE_POINTS, MAX_SPEED_BONUS, SPEED_WINDOW_MS, comboMultiplier, pointsForCorrect } from './scoring';
import { computeStats, dailyStreak } from './stats';
import type { GameResult } from './types';

function fakeClock(start = 1000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe('Countdown', () => {
  it('décompte à partir d’une échéance absolue', () => {
    const c = fakeClock();
    const cd = new Countdown(60_000, c.now);
    expect(cd.remaining()).toBe(60_000);
    cd.start();
    c.advance(12_345);
    expect(cd.remaining()).toBe(47_655);
    expect(cd.elapsed()).toBe(12_345);
  });

  it('reste exact même sans aucun tick intermédiaire (onglet en veille)', () => {
    const c = fakeClock();
    const cd = new Countdown(60_000, c.now);
    cd.start();
    c.advance(90_000);
    expect(cd.remaining()).toBe(0);
    expect(cd.expired).toBe(true);
  });

  it('met en pause et reprend sans perdre de temps', () => {
    const c = fakeClock();
    const cd = new Countdown(60_000, c.now);
    cd.start();
    c.advance(10_000);
    cd.pause();
    c.advance(30_000);
    expect(cd.remaining()).toBe(50_000);
    cd.start();
    c.advance(5_000);
    expect(cd.remaining()).toBe(45_000);
  });

  it('applique les pénalités, en cours et en pause', () => {
    const c = fakeClock();
    const cd = new Countdown(60_000, c.now);
    cd.penalize(3_000);
    expect(cd.remaining()).toBe(57_000);
    cd.start();
    cd.penalize(5_000);
    expect(cd.remaining()).toBe(52_000);
    cd.penalize(100_000);
    expect(cd.remaining()).toBe(0);
  });

  it('start() est idempotent et reset() restaure la durée', () => {
    const c = fakeClock();
    const cd = new Countdown(60_000, c.now);
    cd.start();
    c.advance(1_000);
    cd.start();
    expect(cd.remaining()).toBe(59_000);
    cd.reset();
    expect(cd.remaining()).toBe(60_000);
    expect(cd.running).toBe(false);
  });
});

describe('Score', () => {
  it('multiplicateur de série plafonné', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(1)).toBe(1);
    expect(comboMultiplier(2)).toBe(1.25);
    expect(comboMultiplier(5)).toBe(2);
    expect(comboMultiplier(50)).toBe(2);
  });

  it('points = (base + bonus vitesse) × difficulté × série', () => {
    expect(pointsForCorrect('novice', 0, 1)).toBe(BASE_POINTS + MAX_SPEED_BONUS);
    expect(pointsForCorrect('novice', SPEED_WINDOW_MS, 1)).toBe(BASE_POINTS);
    expect(pointsForCorrect('novice', 999_999, 1)).toBe(BASE_POINTS);
    expect(pointsForCorrect('genie', SPEED_WINDOW_MS, 1)).toBe(300);
    expect(pointsForCorrect('confirme', SPEED_WINDOW_MS / 2, 3)).toBe(Math.round(125 * 1.5 * 1.5));
  });
});

describe('Progression', () => {
  it('niveau 1 à 0 XP', () => {
    const l = levelFromXp(0);
    expect(l.level).toBe(1);
    expect(l.title).toBe('Neurone');
    expect(l.progress).toBe(0);
  });
  it('passe de niveau au seuil exact', () => {
    expect(levelFromXp(xpForLevel(1) - 1).level).toBe(1);
    expect(levelFromXp(xpForLevel(1)).level).toBe(2);
    expect(levelFromXp(xpForLevel(1)).xpIntoLevel).toBe(0);
  });
  it('les seuils sont croissants', () => {
    for (let i = 1; i < 20; i++) expect(xpForLevel(i + 1)).toBeGreaterThan(xpForLevel(i));
  });
});

describe('Défi quotidien', () => {
  it('clé du jour au format local', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
  it('aléatoire déterministe par jour', () => {
    const a = dailyRandom(new Date(2026, 10, 3, 8));
    const b = dailyRandom(new Date(2026, 10, 3, 22));
    const c = dailyRandom(new Date(2026, 10, 4, 8));
    const sa = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(sa);
    expect([c(), c(), c()]).not.toEqual(sa);
    sa.forEach((v) => expect(v >= 0 && v < 1).toBe(true));
  });
  it('hash et générateur stables', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(seededRandom(42)()).toBe(seededRandom(42)());
  });
  it('temps avant minuit', () => {
    expect(msUntilNextDay(new Date(2026, 0, 1, 23, 59, 0))).toBe(60_000);
  });
});

function result(p: Partial<GameResult>): GameResult {
  return {
    id: Math.random().toString(), playerId: 'p', playerName: 'P', mode: 'logic', difficulty: 'novice',
    score: 0, solved: 0, attempted: 0, bestStreak: 0, durationMs: 60_000, playedAt: new Date().toISOString(), ...p,
  };
}

describe('Statistiques', () => {
  it('agrège globalement et par mode', () => {
    const s = computeStats([
      result({ mode: 'logic', score: 500, solved: 4, attempted: 5, bestStreak: 3 }),
      result({ mode: 'logic', score: 900, solved: 6, attempted: 6, bestStreak: 6 }),
      result({ mode: 'riddles', score: 200, solved: 1, attempted: 3 }),
    ]);
    expect(s.games).toBe(3);
    expect(s.bestScore).toBe(900);
    expect(s.totalScore).toBe(1600);
    expect(s.accuracy).toBeCloseTo(11 / 14);
    expect(s.bestStreak).toBe(6);
    expect(s.totalTimeMs).toBe(180_000);
    expect(s.byMode.logic.games).toBe(2);
    expect(s.byMode.logic.accuracy).toBeCloseTo(10 / 11);
    expect(s.byMode.observation.games).toBe(0);
    expect(s.byMode.observation.accuracy).toBe(0);
  });

  it('série quotidienne consécutive', () => {
    const today = new Date(2026, 10, 3, 12);
    const d = (n: number) => dayKey(new Date(2026, 10, 3 - n));
    const won = (n: number) => result({ mode: 'daily', dailyKey: d(n), solved: 1 });
    expect(dailyStreak([won(0), won(1), won(2), won(4)], today)).toBe(3);
    // pas encore joué aujourd'hui : la série d'hier compte toujours
    expect(dailyStreak([won(1), won(2)], today)).toBe(2);
    // un défi raté ne compte pas
    expect(dailyStreak([result({ mode: 'daily', dailyKey: d(0), solved: 0 }), won(1)], today)).toBe(1);
    expect(dailyStreak([won(2)], today)).toBe(0);
  });
});
