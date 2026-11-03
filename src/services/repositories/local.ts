import type { GameResult, PlayerProfile } from '@/core/types';
import type { KeyValueStore } from '../storage/KeyValueStore';
import type {
  LeaderboardEntry, LeaderboardFilter, LeaderboardRepository,
  ProfileRepository, Repositories, ResultRepository,
} from './types';

export const SCHEMA_VERSION = 1;
const KEYS = { schema: 'schema', profile: 'profile', results: 'results' } as const;
/** Historique conservé localement (les plus récents). */
export const MAX_RESULTS = 500;

function isProfile(v: unknown): v is PlayerProfile {
  const p = v as PlayerProfile;
  return !!p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.xp === 'number';
}

function isResult(v: unknown): v is GameResult {
  const r = v as GameResult;
  return !!r && typeof r.id === 'string' && typeof r.score === 'number' && typeof r.mode === 'string';
}

/** Point d'entrée des migrations de schéma futures. */
function migrate(store: KeyValueStore): void {
  const version = store.get<number>(KEYS.schema);
  if (version === SCHEMA_VERSION) return;
  // v0 -> v1 : aucune donnée antérieure à migrer.
  store.set(KEYS.schema, SCHEMA_VERSION);
}

class LocalProfileRepository implements ProfileRepository {
  constructor(private store: KeyValueStore) {}
  async load() {
    const p = this.store.get<unknown>(KEYS.profile);
    if (!isProfile(p)) return null;
    return {
      ...p,
      settings: { reducedMotion: false, ...(p.settings as Partial<PlayerProfile['settings']> | undefined) },
    };
  }
  async save(profile: PlayerProfile) {
    this.store.set(KEYS.profile, profile);
  }
}

class LocalResultRepository implements ResultRepository {
  constructor(private store: KeyValueStore) {}
  all(): GameResult[] {
    const raw = this.store.get<unknown[]>(KEYS.results);
    return Array.isArray(raw) ? raw.filter(isResult) : [];
  }
  async list(playerId: string) {
    return this.all().filter((r) => r.playerId === playerId);
  }
  async add(result: GameResult) {
    const next = [...this.all(), result].slice(-MAX_RESULTS);
    this.store.set(KEYS.results, next);
  }
  async clear(playerId: string) {
    this.store.set(KEYS.results, this.all().filter((r) => r.playerId !== playerId));
  }
}

class LocalLeaderboardRepository implements LeaderboardRepository {
  constructor(private results: LocalResultRepository) {}
  async top({ mode, difficulty, limit = 10 }: LeaderboardFilter): Promise<LeaderboardEntry[]> {
    return this.results
      .all()
      .filter((r) => r.mode === mode && (!difficulty || r.difficulty === difficulty) && r.score > 0)
      .sort((a, b) => b.score - a.score || a.playedAt.localeCompare(b.playedAt))
      .slice(0, limit)
      .map((r, i) => ({
        rank: i + 1,
        resultId: r.id,
        playerId: r.playerId,
        playerName: r.playerName,
        score: r.score,
        difficulty: r.difficulty,
        solved: r.solved,
        playedAt: r.playedAt,
      }));
  }
}

export function createLocalRepositories(store: KeyValueStore): Repositories {
  migrate(store);
  const results = new LocalResultRepository(store);
  return {
    profiles: new LocalProfileRepository(store),
    results,
    leaderboard: new LocalLeaderboardRepository(results),
  };
}
