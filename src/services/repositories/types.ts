import type { DifficultyId, GameResult, ModeId, PlayerProfile } from '@/core/types';

/**
 * Contrats d'accès aux données.
 * Toutes les méthodes sont asynchrones afin qu'une implémentation Supabase
 * puisse remplacer l'implémentation locale sans toucher à l'interface.
 */
export interface ProfileRepository {
  load(): Promise<PlayerProfile | null>;
  save(profile: PlayerProfile): Promise<void>;
}

export interface ResultRepository {
  list(playerId: string): Promise<GameResult[]>;
  add(result: GameResult): Promise<void>;
  clear(playerId: string): Promise<void>;
}

export interface LeaderboardFilter {
  mode: ModeId;
  difficulty?: DifficultyId;
  limit?: number;
}

export interface LeaderboardEntry {
  rank: number;
  resultId: string;
  playerId: string;
  playerName: string;
  score: number;
  difficulty: DifficultyId;
  solved: number;
  playedAt: string;
}

export interface LeaderboardRepository {
  top(filter: LeaderboardFilter): Promise<LeaderboardEntry[]>;
}

export interface Repositories {
  profiles: ProfileRepository;
  results: ResultRepository;
  leaderboard: LeaderboardRepository;
}
