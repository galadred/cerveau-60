import { motion } from 'motion/react';
import { useNavigation } from '@/app/navigation';
import { MODES, getDifficulty, getMode } from '@/core/modes';
import { useGameStore } from '@/state/GameStore';
import { formatDuration } from '@/hooks/useNow';
import { Button } from '@/ui/Button';
import { IconPlay } from '@/ui/Icons';
import { ProgressBar } from '@/ui/ProgressBar';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Screen, stagger } from './Screen';

export function StatsScreen({ direction }: { direction: 1 | -1 }) {
  const { navigate } = useNavigation();
  const { profile, stats, level, results } = useGameStore();
  const recent = [...results].reverse().slice(0, 8);
  const maxBest = Math.max(1, ...MODES.map((m) => stats.byMode[m.id].bestScore));

  const kpis = [
    { label: 'Parties jouées', value: stats.games.toLocaleString('fr-FR') },
    { label: 'Meilleur score', value: stats.bestScore.toLocaleString('fr-FR'), hot: true },
    { label: 'Précision', value: stats.totalAttempted ? `${Math.round(stats.accuracy * 100)}\u202f%` : '—' },
    { label: 'Énigmes résolues', value: stats.totalSolved.toLocaleString('fr-FR') },
    { label: 'Meilleure série', value: stats.bestStreak.toString() },
    { label: 'Temps de jeu', value: formatDuration(stats.totalTimeMs) },
  ];

  return (
    <Screen direction={direction}>
      <ScreenHeader eyebrow={profile!.name} title={<>Statis<em className="accent">tiques</em></>} />

      <motion.div className="stats" variants={stagger.container} initial="hidden" animate="show">
        <motion.section variants={stagger.item} className="card stats-level">
          <div className="stats-level__badge num">{level.level}</div>
          <div className="stats-level__body">
            <p className="eyebrow">Niveau actuel</p>
            <p className="display stats-level__title">{level.title}</p>
            <ProgressBar value={level.progress} label="Progression du niveau" />
            <p className="stats-level__xp num">
              {level.xpIntoLevel.toLocaleString('fr-FR')} / {level.xpForNext.toLocaleString('fr-FR')} XP
              <span> · {(profile!.xp).toLocaleString('fr-FR')} XP au total</span>
            </p>
          </div>
          <div className="stats-level__daily">
            <p className="eyebrow">Série quotidienne</p>
            <p className="num stats-level__streak">{stats.dailyStreak}<span> j</span></p>
          </div>
        </motion.section>

        <motion.ul variants={stagger.item} className="kpis">
          {kpis.map((k) => (
            <li key={k.label} className="kpi card">
              <span className="kpi__label">{k.label}</span>
              <span className={`kpi__value num${k.hot ? ' accent' : ''}`}>{k.value}</span>
            </li>
          ))}
        </motion.ul>

        <div className="stats__cols">
          <motion.section variants={stagger.item} className="card stats-panel">
            <h2 className="section-title">Par mode</h2>
            <ul className="mode-bars">
              {MODES.map((m) => {
                const s = stats.byMode[m.id];
                return (
                  <li key={m.id} className="mode-bar">
                    <div className="mode-bar__head">
                      <span className="mode-bar__name">{m.name}</span>
                      <span className="num mode-bar__best">{s.bestScore.toLocaleString('fr-FR')}</span>
                    </div>
                    <ProgressBar thin value={s.bestScore / maxBest} label={`Record ${m.name}`} />
                    <span className="mode-bar__meta">
                      {s.games} partie{s.games > 1 ? 's' : ''} · précision {s.totalAttempted ? `${Math.round(s.accuracy * 100)}\u202f%` : '—'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </motion.section>

          <motion.section variants={stagger.item} className="card stats-panel">
            <h2 className="section-title">Dernières parties</h2>
            {recent.length === 0 ? (
              <div className="empty">
                <p className="display empty__title">Aucune partie pour l’instant.</p>
                <p className="empty__text">Tes résultats apparaîtront ici dès ta première manche.</p>
                <Button icon={<IconPlay />} onClick={() => navigate({ name: 'modes' })}>Choisir un mode</Button>
              </div>
            ) : (
              <ul className="history">
                {recent.map((r) => (
                  <li key={r.id} className="history__row">
                    <span>
                      <span className="history__mode">{getMode(r.mode).name}</span>
                      <span className="history__meta">
                        {getDifficulty(r.difficulty).name} · {new Date(r.playedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </span>
                    </span>
                    <span className="num history__score">{r.score.toLocaleString('fr-FR')}</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>
        </div>
      </motion.div>
    </Screen>
  );
}
