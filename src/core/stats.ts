import { dayKey } from './daily';
import { MODES } from './modes';
import type { GameResult, ModeId, ModeStats, PlayerStats } from './types';

function emptyMode(): ModeStats {
  return { games: 0, bestScore: 0, totalSolved: 0, totalAttempted: 0, accuracy: 0 };
}

/** Statistiques calculées à partir de l'historique (source unique de vérité). */
export function computeStats(results: readonly GameResult[], today: Date = new Date()): PlayerStats {
  const byMode = Object.fromEntries(MODES.map((m) => [m.id, emptyMode()])) as Record<ModeId, ModeStats>;
  const stats: PlayerStats = {
    games: 0, totalScore: 0, bestScore: 0, totalSolved: 0, totalAttempted: 0,
    accuracy: 0, bestStreak: 0, totalTimeMs: 0, dailyStreak: 0, byMode,
  };

  for (const r of results) {
    stats.games += 1;
    stats.totalScore += r.score;
    stats.bestScore = Math.max(stats.bestScore, r.score);
    stats.totalSolved += r.solved;
    stats.totalAttempted += r.attempted;
    stats.bestStreak = Math.max(stats.bestStreak, r.bestStreak);
    stats.totalTimeMs += r.durationMs;
    const m = byMode[r.mode];
    m.games += 1;
    m.bestScore = Math.max(m.bestScore, r.score);
    m.totalSolved += r.solved;
    m.totalAttempted += r.attempted;
  }
  stats.accuracy = stats.totalAttempted ? stats.totalSolved / stats.totalAttempted : 0;
  for (const m of Object.values(byMode)) m.accuracy = m.totalAttempted ? m.totalSolved / m.totalAttempted : 0;
  stats.dailyStreak = dailyStreak(results, today);
  return stats;
}

/** Nombre de jours consécutifs (jusqu'à aujourd'hui ou hier) où le défi a été réussi. */
export function dailyStreak(results: readonly GameResult[], today: Date = new Date()): number {
  const won = new Set(results.filter((r) => r.mode === 'daily' && r.dailyKey && r.solved > 0).map((r) => r.dailyKey!));
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!won.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (won.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
