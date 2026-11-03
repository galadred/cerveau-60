import { AnimatePresence, MotionConfig } from 'motion/react';
import { useEffect } from 'react';
import { GameStoreProvider, useGameStore } from '@/state/GameStore';
import type { Repositories } from '@/services';
import { BriefingScreen } from '@/screens/BriefingScreen';
import { LeaderboardScreen } from '@/screens/LeaderboardScreen';
import { MainMenu } from '@/screens/MainMenu';
import { ModesScreen } from '@/screens/ModesScreen';
import { Onboarding } from '@/screens/Onboarding';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { StatsScreen } from '@/screens/StatsScreen';
import { GameScreen } from '@/screens/game/GameScreen';
import { ResultsScreen } from '@/screens/results/ResultsScreen';
import { Logo } from '@/ui/Logo';
import { NavigationProvider, routeKey, useNavigation, type Route } from './navigation';

function CurrentScreen() {
  const { route, direction } = useNavigation();
  const key = routeKey(route);
  const screen = (r: Route) => {
    switch (r.name) {
      case 'menu': return <MainMenu key={key} direction={direction} />;
      case 'modes': return <ModesScreen key={key} direction={direction} />;
      case 'briefing': return <BriefingScreen key={key} direction={direction} mode={r.mode} />;
      case 'stats': return <StatsScreen key={key} direction={direction} />;
      case 'leaderboard': return <LeaderboardScreen key={key} direction={direction} initialMode={r.mode} />;
      case 'settings': return <SettingsScreen key={key} direction={direction} />;
      case 'play': return <GameScreen key={key} mode={r.mode} difficulty={r.difficulty} />;
      case 'results': return <ResultsScreen key={key} direction={direction} report={r.report} />;
    }
  };
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [key]);
  return <AnimatePresence mode="wait" custom={direction} initial={false}>{screen(route)}</AnimatePresence>;
}

function Shell() {
  const { ready, profile } = useGameStore();
  const reduced = profile?.settings.reducedMotion ?? false;

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reduced);
  }, [reduced]);

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <div className="stage">
        <div className="stage__backdrop" />
        {!ready ? (
          <div className="boot"><Logo size={56} withWordmark={false} /></div>
        ) : (
          <AnimatePresence mode="wait">
            {profile ? (
              <NavigationProvider key="app"><CurrentScreen /></NavigationProvider>
            ) : (
              <Onboarding key="onboarding" />
            )}
          </AnimatePresence>
        )}
        <div className="stage__vignette" />
        <div className="stage__grain" />
      </div>
    </MotionConfig>
  );
}

export function App({ repos }: { repos?: Repositories }) {
  return (
    <GameStoreProvider repos={repos}>
      <Shell />
    </GameStoreProvider>
  );
}
