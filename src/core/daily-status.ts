import { dayKey } from './daily';
import type { GameResult } from './types';

export interface DailyStatus {
  key: string;
  played: boolean;
  result: GameResult | null;
}

export function dailyStatus(results: readonly GameResult[], now: Date = new Date()): DailyStatus {
  const key = dayKey(now);
  const result = results.find((r) => r.mode === 'daily' && r.dailyKey === key) ?? null;
  return { key, played: !!result, result };
}
