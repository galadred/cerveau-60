import { describe, expect, it } from 'vitest';
import type { GameResult, PlayerProfile } from '@/core/types';
import { LocalStorageStore } from './storage/KeyValueStore';
import { MAX_RESULTS, createLocalRepositories } from './repositories/local';

const profile: PlayerProfile = { id: 'p1', name: 'Ada', createdAt: '2026-01-01', xp: 0, settings: { reducedMotion: false } };
const res = (p: Partial<GameResult>): GameResult => ({
  id: Math.random().toString(36), playerId: 'p1', playerName: 'Ada', mode: 'logic', difficulty: 'novice',
  score: 100, solved: 1, attempted: 1, bestStreak: 1, durationMs: 60_000, playedAt: '2026-01-01T10:00:00Z', ...p,
});

describe('LocalStorageStore', () => {
  it('lit/écrit en JSON avec préfixe', () => {
    const s = new LocalStorageStore();
    s.set('x', { a: 1 });
    expect(localStorage.getItem('cerveau60:x')).toBe('{"a":1}');
    expect(s.get('x')).toEqual({ a: 1 });
    s.remove('x');
    expect(s.get('x')).toBeNull();
  });
  it('tolère un JSON corrompu', () => {
    localStorage.setItem('cerveau60:bad', '{oops');
    expect(new LocalStorageStore().get('bad')).toBeNull();
  });
});

describe('Dépôts locaux', () => {
  it('sauvegarde et recharge le profil (persistance réelle)', async () => {
    await createLocalRepositories(new LocalStorageStore()).profiles.save(profile);
    const reloaded = await createLocalRepositories(new LocalStorageStore()).profiles.load();
    expect(reloaded).toEqual(profile);
  });

  it('complète les réglages manquants d’un ancien profil', async () => {
    localStorage.setItem('cerveau60:profile', JSON.stringify({ ...profile, settings: undefined }));
    const p = await createLocalRepositories(new LocalStorageStore()).profiles.load();
    expect(p?.settings.reducedMotion).toBe(false);
  });

  it('ignore un profil invalide', async () => {
    localStorage.setItem('cerveau60:profile', JSON.stringify({ foo: 1 }));
    expect(await createLocalRepositories(new LocalStorageStore()).profiles.load()).toBeNull();
  });

  it('historique filtré par joueur, effaçable, borné', async () => {
    const repos = createLocalRepositories(new LocalStorageStore());
    await repos.results.add(res({}));
    await repos.results.add(res({ playerId: 'other' }));
    expect(await repos.results.list('p1')).toHaveLength(1);
    await repos.results.clear('p1');
    expect(await repos.results.list('p1')).toHaveLength(0);
    expect(await repos.results.list('other')).toHaveLength(1);
    for (let i = 0; i < MAX_RESULTS + 10; i++) await repos.results.add(res({ score: i }));
    const all = JSON.parse(localStorage.getItem('cerveau60:results')!);
    expect(all).toHaveLength(MAX_RESULTS);
  });

  it('classement trié, filtré, classé', async () => {
    const repos = createLocalRepositories(new LocalStorageStore());
    await repos.results.add(res({ score: 300, difficulty: 'expert' }));
    await repos.results.add(res({ score: 900 }));
    await repos.results.add(res({ score: 500 }));
    await repos.results.add(res({ score: 0 }));
    await repos.results.add(res({ score: 9999, mode: 'riddles' }));
    const all = await repos.leaderboard.top({ mode: 'logic' });
    expect(all.map((e) => e.score)).toEqual([900, 500, 300]);
    expect(all.map((e) => e.rank)).toEqual([1, 2, 3]);
    const expert = await repos.leaderboard.top({ mode: 'logic', difficulty: 'expert' });
    expect(expert.map((e) => e.score)).toEqual([300]);
    expect(await repos.leaderboard.top({ mode: 'logic', limit: 1 })).toHaveLength(1);
  });

  it('enregistre la version de schéma', () => {
    createLocalRepositories(new LocalStorageStore());
    expect(localStorage.getItem('cerveau60:schema')).toBe('1');
  });
});
