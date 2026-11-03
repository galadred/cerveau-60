import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DifficultyId, ModeId } from '@/core/types';
import type { RoundReport } from '@/screens/results/report';

/** Écrans de l'application et leurs paramètres. */
export type Route =
  | { name: 'menu' }
  | { name: 'modes' }
  | { name: 'briefing'; mode: ModeId }
  | { name: 'stats' }
  | { name: 'leaderboard'; mode?: ModeId }
  | { name: 'settings' }
  | { name: 'play'; mode: ModeId; difficulty: DifficultyId; run: string }
  | { name: 'results'; report: RoundReport };

interface NavValue {
  route: Route;
  /** +1 en avançant, -1 en revenant : oriente les transitions. */
  direction: 1 | -1;
  canGoBack: boolean;
  navigate(route: Route): void;
  back(): void;
  home(): void;
  /** Remplace l'écran courant (ex. manche → résultats). */
  replace(route: Route): void;
}

const Ctx = createContext<NavValue | null>(null);

export function NavigationProvider({ children, initial = { name: 'menu' } }: { children: ReactNode; initial?: Route }) {
  const [stack, setStack] = useState<Route[]>([initial]);
  const [direction, setDirection] = useState<1 | -1>(1);

  const navigate = useCallback((r: Route) => {
    setDirection(1);
    setStack((s) => [...s, r]);
  }, []);
  const back = useCallback(() => {
    setDirection(-1);
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);
  const replace = useCallback((r: Route) => {
    setDirection(1);
    setStack((s) => [...s.slice(0, -1), r]);
  }, []);
  const home = useCallback(() => {
    setDirection(-1);
    setStack((s) => [s[0]]);
  }, []);

  const value = useMemo<NavValue>(
    () => ({ route: stack[stack.length - 1], direction, canGoBack: stack.length > 1, navigate, back, home, replace }),
    [stack, direction, navigate, back, home, replace],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNavigation(): NavValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNavigation doit être utilisé dans <NavigationProvider>');
  return v;
}

export function routeKey(r: Route): string {
  if (r.name === 'results') return `results:${r.report.result.id}`;
  return Object.values(r).join(':');
}
