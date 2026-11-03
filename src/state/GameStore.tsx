import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createId } from '@/core/id';
import { levelFromXp, type LevelInfo } from '@/core/progression';
import { computeStats } from '@/core/stats';
import type { GameResult, PlayerProfile, PlayerSettings, PlayerStats } from '@/core/types';
import { createRepositories } from '@/services';
import { compactHistory } from '@/services/repositories/local';
import type { Repositories } from '@/services';

export const NAME_MAX = 18;

export function sanitizeName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

interface GameStoreValue {
  ready: boolean;
  profile: PlayerProfile | null;
  results: GameResult[];
  stats: PlayerStats;
  level: LevelInfo;
  repos: Repositories;
  createProfile(name: string): Promise<void>;
  renamePlayer(name: string): Promise<void>;
  updateSettings(patch: Partial<PlayerSettings>): Promise<void>;
  recordResult(result: Omit<GameResult, 'id' | 'playerId' | 'playerName' | 'playedAt'>): Promise<GameResult>;
  resetProgress(): Promise<void>;
}

const Ctx = createContext<GameStoreValue | null>(null);

export function GameStoreProvider({ children, repos: injected }: { children: ReactNode; repos?: Repositories }) {
  const repos = useMemo(() => injected ?? createRepositories(), [injected]);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [results, setResults] = useState<GameResult[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await repos.profiles.load();
      const r = p ? await repos.results.list(p.id) : [];
      if (!alive) return;
      setProfile(p);
      setResults(r);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [repos]);

  const persist = useCallback(
    async (next: PlayerProfile) => {
      setProfile(next);
      await repos.profiles.save(next);
    },
    [repos],
  );

  const createProfile = useCallback(
    async (name: string) => {
      const clean = sanitizeName(name);
      if (!clean) throw new Error('Nom requis');
      await persist({
        id: createId(),
        name: clean,
        createdAt: new Date().toISOString(),
        xp: 0,
        settings: { reducedMotion: false },
      });
    },
    [persist],
  );

  const renamePlayer = useCallback(
    async (name: string) => {
      const clean = sanitizeName(name);
      if (!profile || !clean) return;
      await persist({ ...profile, name: clean });
    },
    [profile, persist],
  );

  const updateSettings = useCallback(
    async (patch: Partial<PlayerSettings>) => {
      if (!profile) return;
      await persist({ ...profile, settings: { ...profile.settings, ...patch } });
    },
    [profile, persist],
  );

  const recordResult = useCallback<GameStoreValue['recordResult']>(
    async (partial) => {
      if (!profile) throw new Error('Aucun profil');
      const result: GameResult = {
        ...partial,
        id: createId(),
        playerId: profile.id,
        playerName: profile.name,
        playedAt: new Date().toISOString(),
      };
      await repos.results.add(result);
      setResults((prev) => compactHistory([...prev, result]));
      await persist({ ...profile, xp: profile.xp + Math.max(0, result.score) });
      return result;
    },
    [profile, repos, persist],
  );

  const resetProgress = useCallback(async () => {
    if (!profile) return;
    await repos.results.clear(profile.id);
    setResults([]);
    await persist({ ...profile, xp: 0 });
  }, [profile, repos, persist]);

  const stats = useMemo(() => computeStats(results), [results]);
  const level = useMemo(() => levelFromXp(profile?.xp ?? 0), [profile?.xp]);

  const value: GameStoreValue = {
    ready, profile, results, stats, level, repos,
    createProfile, renamePlayer, updateSettings, recordResult, resetProgress,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGameStore(): GameStoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGameStore doit être utilisé dans <GameStoreProvider>');
  return v;
}
