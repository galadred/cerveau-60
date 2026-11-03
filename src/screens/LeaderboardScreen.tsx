import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useNavigation } from '@/app/navigation';
import { DIFFICULTIES, MODES, getDifficulty } from '@/core/modes';
import type { DifficultyId, ModeId } from '@/core/types';
import type { LeaderboardEntry } from '@/services';
import { useGameStore } from '@/state/GameStore';
import { Button } from '@/ui/Button';
import { IconPlay } from '@/ui/Icons';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Screen } from './Screen';

export function LeaderboardScreen({ direction, initialMode = 'logic' }: { direction: 1 | -1; initialMode?: ModeId }) {
  const { navigate } = useNavigation();
  const { repos, profile, results } = useGameStore();
  const [mode, setMode] = useState<ModeId>(initialMode);
  const [difficulty, setDifficulty] = useState<DifficultyId | 'all'>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    let alive = true;
    repos.leaderboard
      .top({ mode, difficulty: difficulty === 'all' ? undefined : difficulty, limit: 20 })
      .then((e) => alive && setEntries(e));
    return () => {
      alive = false;
    };
  }, [repos, mode, difficulty, results]);

  return (
    <Screen direction={direction}>
      <ScreenHeader
        eyebrow="Sur cet appareil"
        title={<>Classe<em className="accent">ment</em></>}
        subtitle="Les meilleurs scores enregistrés localement. Le classement en ligne arrivera avec les comptes joueurs."
      />

      <div className="lb-filters">
        <div className="segmented" role="tablist" aria-label="Mode">
          {MODES.map((m) => (
            <button key={m.id} role="tab" aria-selected={mode === m.id} className="segmented__item" onClick={() => setMode(m.id)}>
              {mode === m.id && <motion.span layoutId="seg-pill" className="segmented__pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
              <span>{m.name}</span>
            </button>
          ))}
        </div>
        {mode !== 'daily' && (
          <div className="chips" role="group" aria-label="Difficulté">
            <button className="chip" aria-pressed={difficulty === 'all'} onClick={() => setDifficulty('all')}>Toutes</button>
            {DIFFICULTIES.map((d) => (
              <button key={d.id} className="chip" aria-pressed={difficulty === d.id} onClick={() => setDifficulty(d.id)}>{d.name}</button>
            ))}
          </div>
        )}
      </div>

      <section className="card lb" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${mode}-${difficulty}-${entries?.length ?? 'x'}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {entries && entries.length === 0 && (
              <div className="empty">
                <p className="display empty__title">Le podium est vide.</p>
                <p className="empty__text">Joue une manche pour inscrire le premier score.</p>
                <Button icon={<IconPlay />} onClick={() => navigate({ name: 'briefing', mode })}>Jouer ce mode</Button>
              </div>
            )}
            {entries && entries.length > 0 && (
              <ol className="lb__list">
                {entries.map((e) => (
                  <li key={e.resultId} className={`lb__row${e.rank <= 3 ? ` lb__row--top${e.rank}` : ''}${e.playerId === profile?.id ? ' lb__row--me' : ''}`}>
                    <span className="lb__rank num">{String(e.rank).padStart(2, '0')}</span>
                    <span className="lb__who">
                      <span className="lb__name">{e.playerName}</span>
                      <span className="lb__meta">
                        {getDifficulty(e.difficulty).name} · {e.solved} résolue{e.solved > 1 ? 's' : ''} · {new Date(e.playedAt).toLocaleDateString('fr-FR')}
                      </span>
                    </span>
                    <span className="lb__score num">{e.score.toLocaleString('fr-FR')}</span>
                  </li>
                ))}
              </ol>
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </Screen>
  );
}
