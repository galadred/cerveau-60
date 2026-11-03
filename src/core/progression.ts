/** Système de niveaux : l'XP gagnée = score de la partie. */

export interface LevelInfo {
  level: number;
  title: string;
  xpIntoLevel: number;
  xpForNext: number;
  progress: number; // 0..1
}

const TITLES = [
  'Neurone',
  'Synapse',
  'Étincelle',
  'Analyste',
  'Stratège',
  'Visionnaire',
  'Esprit vif',
  'Prodige',
  'Maître',
  'Cerveau 60',
] as const;

/** XP nécessaire pour passer du niveau `level` au suivant. */
export function xpForLevel(level: number): number {
  return Math.round(500 * Math.pow(level, 1.35));
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, Math.floor(xp));
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  const need = xpForLevel(level);
  return {
    level,
    title: TITLES[Math.min(level, TITLES.length) - 1],
    xpIntoLevel: remaining,
    xpForNext: need,
    progress: remaining / need,
  };
}
