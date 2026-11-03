/** Modèle de domaine CERVEAU 60 — indépendant de React et du stockage. */

export type ModeId = 'logic' | 'observation' | 'riddles' | 'daily';
export type DifficultyId = 'novice' | 'confirme' | 'expert' | 'genie';

export interface PlayerSettings {
  reducedMotion: boolean;
}

export interface PlayerProfile {
  /** UUID local — deviendra l'id utilisateur Supabase lors de la migration. */
  id: string;
  name: string;
  createdAt: string;
  xp: number;
  settings: PlayerSettings;
}

/** Résultat d'une partie. Une partie = une manche de 60 secondes. */
export interface GameResult {
  id: string;
  playerId: string;
  playerName: string;
  mode: ModeId;
  difficulty: DifficultyId;
  score: number;
  solved: number;
  attempted: number;
  bestStreak: number;
  /** Durée réellement jouée, en millisecondes. */
  durationMs: number;
  playedAt: string;
  /** Clé AAAA-MM-JJ pour le défi quotidien. */
  dailyKey?: string;
  /** Preuve rejouable (graine + choix horodatés) pour la vérification serveur future. */
  proof?: { v: number; seed: string; a: [number, number][] };
}

export interface ModeStats {
  games: number;
  bestScore: number;
  totalSolved: number;
  totalAttempted: number;
  accuracy: number; // 0..1
}

export interface PlayerStats {
  games: number;
  totalScore: number;
  bestScore: number;
  totalSolved: number;
  totalAttempted: number;
  accuracy: number;
  bestStreak: number;
  totalTimeMs: number;
  dailyStreak: number;
  byMode: Record<ModeId, ModeStats>;
}
