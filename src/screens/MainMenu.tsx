import { motion } from 'motion/react';
import { useNavigation } from '@/app/navigation';
import { dailyStatus } from '@/core/daily-status';
import { msUntilNextDay } from '@/core/daily';
import { useGameStore } from '@/state/GameStore';
import { formatHms, useNow } from '@/hooks/useNow';
import { Button } from '@/ui/Button';
import { IconArrowRight, IconChart, IconCheck, IconFlame, IconPlay, IconSettings, IconTrophy } from '@/ui/Icons';
import { Logo } from '@/ui/Logo';
import { ProgressBar } from '@/ui/ProgressBar';
import { TimerRing } from '@/ui/TimerRing';
import { Screen, stagger } from './Screen';

export function MainMenu({ direction }: { direction: 1 | -1 }) {
  const { navigate } = useNavigation();
  const { profile, level, stats, results } = useGameStore();
  const now = useNow();
  const daily = dailyStatus(results, now);

  return (
    <Screen direction={direction} className="menu">
      <header className="topbar">
        <Logo />
        <button className="player-chip" onClick={() => navigate({ name: 'stats' })} aria-label="Voir mon profil et mes statistiques">
          <span className="player-chip__avatar">{profile!.name.charAt(0).toUpperCase()}</span>
          <span className="player-chip__text">
            <span className="player-chip__name">{profile!.name}</span>
            <span className="player-chip__level">Niv. {level.level} · {level.title}</span>
          </span>
        </button>
      </header>

      <motion.div className="menu__grid" variants={stagger.container} initial="hidden" animate="show">
        <section className="hero">
          <div className="hero__copy">
            <motion.div variants={stagger.item} className="hero__head">
              <TimerRing progress={1} size={112} stroke={4} ambient>
                <span className="display hero__ring-num">60</span>
              </TimerRing>
              <div>
                <p className="eyebrow">Brain training · Saison 01</p>
                <p className="hero__ring-unit">Une manche. Soixante secondes.</p>
              </div>
            </motion.div>
            <motion.h1 variants={stagger.item} className="display hero__title">
              Ton cerveau<br />a <em className="accent">60 secondes.</em>
            </motion.h1>
            <motion.p variants={stagger.item} className="hero__lead">
              Résous un maximum d’énigmes avant la fin du compte à rebours. Enchaîne les bonnes réponses pour multiplier tes points.
            </motion.p>
            <motion.div variants={stagger.item} className="hero__cta">
              <Button size="lg" icon={<IconPlay />} onClick={() => navigate({ name: 'modes' })}>
                Jouer
              </Button>
              <div className="hero__best">
                <span className="eyebrow">Record</span>
                <span className="num hero__best-value">{stats.bestScore.toLocaleString('fr-FR')}</span>
              </div>
            </motion.div>
          </div>
        </section>

        <aside className="menu__side">
          <motion.button
            variants={stagger.item}
            className={`daily-card card ${daily.played ? 'daily-card--done' : ''}`}
            onClick={() => navigate({ name: 'briefing', mode: 'daily' })}
          >
            <div className="daily-card__head">
              <span className="tag">{daily.played ? <><IconCheck width={12} height={12} /> Relevé</> : 'Nouveau'}</span>
              {stats.dailyStreak > 0 && (
                <span className="daily-card__streak"><IconFlame width={16} height={16} /> {stats.dailyStreak} j</span>
              )}
            </div>
            <p className="eyebrow">Défi du jour</p>
            <h2 className="display daily-card__title">
              {daily.played ? `Score : ${daily.result!.score.toLocaleString('fr-FR')}` : 'Une énigme. Une tentative.'}
            </h2>
            <div className="daily-card__foot">
              <span className="daily-card__next">
                Prochain défi dans <span className="num accent">{formatHms(msUntilNextDay(now))}</span>
              </span>
              <IconArrowRight />
            </div>
          </motion.button>

          <motion.div variants={stagger.item} className="level-card card">
            <div className="level-card__row">
              <div>
                <p className="eyebrow">Niveau {level.level}</p>
                <p className="display level-card__title">{level.title}</p>
              </div>
              <span className="num level-card__xp">
                {level.xpIntoLevel.toLocaleString('fr-FR')}<span> / {level.xpForNext.toLocaleString('fr-FR')} XP</span>
              </span>
            </div>
            <ProgressBar value={level.progress} label="Progression vers le niveau suivant" />
          </motion.div>

          <motion.nav variants={stagger.item} className="menu-nav" aria-label="Navigation principale">
            <button className="menu-nav__item" onClick={() => navigate({ name: 'stats' })}>
              <IconChart /><span>Statistiques</span>
            </button>
            <button className="menu-nav__item" onClick={() => navigate({ name: 'leaderboard' })}>
              <IconTrophy /><span>Classement</span>
            </button>
            <button className="menu-nav__item" onClick={() => navigate({ name: 'settings' })}>
              <IconSettings /><span>Réglages</span>
            </button>
          </motion.nav>
        </aside>
      </motion.div>
    </Screen>
  );
}
