import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ModeId } from '@/core/types';

/** Écrans de l'application et leurs paramètres. */
export type Route =
  | { name: 'menu' }
  | { name: 'modes' }
  | { name: 'briefing'; mode: ModeId }
  | { name: 'stats' }
  | { name: 'leaderboard'; mode?: ModeId }
  | { name: 'settings' };

interface NavValue {
  route: Route;
  /** +1 en avançant, -1 en revenant : oriente les transitions. */
  direction: 1 | -1;
  canGoBack: boolean;
  navigate(route: Route): void;
  back(): void;
  home(): void;
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
  const home = useCallback(() => {
    setDirection(-1);
    setStack((s) => [s[0]]);
  }, []);

  const value = useMemo<NavValue>(
    () => ({ route: stack[stack.length - 1], direction, canGoBack: stack.length > 1, navigate, back, home }),
    [stack, direction, navigate, back, home],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNavigation(): NavValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNavigation doit être utilisé dans <NavigationProvider>');
  return v;
}

export function routeKey(r: Route): string {
  return Object.values(r).join(':');
}
