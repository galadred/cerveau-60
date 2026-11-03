import { ROUND_DURATION_MS, getDifficulty } from '../modes';
import { generateLogicPuzzle } from '../puzzles/logic';
import { pointsForCorrect } from '../scoring';
import type { DifficultyId } from '../types';
import { intensityFor } from './intensity';
import { SKIP_PENALTY_RATIO, type PuzzleSource } from './session';

/** Preuve compacte d'une manche : la graine et les choix horodatés suffisent à tout recalculer. */
export interface RoundProof {
  v: number;
  seed: string;
  /** [choix (−1 = passé), temps de réponse ms] */
  a: [number, number][];
}

export interface ClaimedResult {
  difficulty: DifficultyId;
  score: number;
  solved: number;
  attempted: number;
  bestStreak: number;
  durationMs: number;
}

/** Marge pour les arrondis et le dernier rafraîchissement d'écran. */
const TOLERANCE_MS = 250;

/**
 * Rejoue intégralement une manche à partir de sa preuve : régénère chaque
 * énigme, recalcule correction, série, points et pénalités, puis compare au
 * résultat annoncé. Utilisé avant chaque sauvegarde, et réutilisable tel quel
 * côté serveur lors du passage à Supabase.
 */
export function verifyRound(
  claimed: ClaimedResult,
  proof: RoundProof,
  source: PuzzleSource = generateLogicPuzzle,
  durationMs = ROUND_DURATION_MS,
): { ok: true } | { ok: false; reason: string } {
  const { rank, penaltyMs } = getDifficulty(claimed.difficulty);
  let score = 0, solved = 0, attempted = 0, streak = 0, best = 0, used = 0;
  const seen = new Set<string>();

  for (let i = 0; i < proof.a.length; i++) {
    const [c, t] = proof.a[i];
    const intensity = intensityFor(rank, solved);
    let salt = 0;
    let p = source(proof.seed, i, intensity, salt);
    while (seen.has(p.id) && salt < 20) p = source(proof.seed, i, intensity, ++salt);
    seen.add(p.id);
    if (!Number.isInteger(c) || c < -1 || c >= p.choices.length || !Number.isFinite(t) || t < 0) {
      return { ok: false, reason: `réponse ${i} invalide` };
    }

    used += t;
    if (c === -1) {
      streak = 0;
      used += Math.round(penaltyMs * SKIP_PENALTY_RATIO);
      continue;
    }
    attempted++;
    if (c === p.answerIndex) {
      solved++;
      streak++;
      best = Math.max(best, streak);
      score += pointsForCorrect(claimed.difficulty, t, streak);
    } else {
      streak = 0;
      used += penaltyMs;
    }
  }

  // Le temps de réflexion cumulé + les pénalités ne peuvent dépasser la manche
  // (sauf la dernière pénalité, qui peut justement la terminer).
  const lastPenalty = proof.a.length ? (proof.a[proof.a.length - 1][0] === -1 ? penaltyMs * SKIP_PENALTY_RATIO : penaltyMs) : 0;
  if (used - lastPenalty > durationMs + TOLERANCE_MS) return { ok: false, reason: 'temps total incohérent' };
  if (claimed.durationMs > durationMs + TOLERANCE_MS) return { ok: false, reason: 'durée trop longue' };
  if (score !== claimed.score) return { ok: false, reason: 'score incohérent' };
  if (solved !== claimed.solved || attempted !== claimed.attempted) return { ok: false, reason: 'compteurs incohérents' };
  if (best !== claimed.bestStreak) return { ok: false, reason: 'série incohérente' };
  return { ok: true };
}

export function proofFromLog(seed: string, log: readonly { choice: number | null; answerTimeMs: number }[], v: number): RoundProof {
  return { v, seed, a: log.map((r) => [r.choice ?? -1, r.answerTimeMs]) };
}
