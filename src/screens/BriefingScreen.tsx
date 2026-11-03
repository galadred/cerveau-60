import { motion } from 'motion/react';
import { useState } from 'react';
import { useNavigation } from '@/app/navigation';
import { dailyStatus } from '@/core/daily-status';
import { DIFFICULTIES, ROUND_DURATION_MS, getDifficulty, getMode } from '@/core/modes';
import { BASE_POINTS, MAX_COMBO, MAX_SPEED_BONUS, comboMultiplier } from '@/core/scoring';
import type { DifficultyId, ModeId } from '@/core/types';
import { useGameStore } from '@/state/GameStore';
import { createId } from '@/core/id';
import { Button } from '@/ui/Button';
import { IconPlay } from '@/ui/Icons';
import { IconCheck, IconClock, IconFlame, IconLock } from '@/ui/Icons';

/** Modes dont le moteur d'énigmes est disponible. */
const PLAYABLE: Partial<Record<ModeId, true>> = { logic: true, observation: true };
const NEXT_STEP: Partial<Record<ModeId, string>> = { riddles: 'Étape 4', daily: 'Étape 5' };
import { ModeGlyph } from '@/ui/ModeGlyph';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Screen, stagger } from './Screen';

export const DAILY_DIFFICULTY: DifficultyId = 'confirme';

/** Préparation d'une manche : règles du mode et choix de la difficulté. */
export function BriefingScreen({ direction, mode }: { direction: 1 | -1; mode: ModeId }) {
  const { navigate } = useNavigation();
  const { level, stats, results } = useGameStore();
  const def = getMode(mode);
  const isDaily = mode === 'daily';
  const daily = dailyStatus(results);
  const [difficulty, setDifficulty] = useState<DifficultyId>(isDaily ? DAILY_DIFFICULTY : 'novice');
  const diff = getDifficulty(difficulty);
  const ms = stats.byMode[mode];
  const launch = () => navigate({ name: 'play', mode, difficulty, run: createId() });

  return (
    <Screen direction={direction}>
      <ScreenHeader
        eyebrow={`Mode ${def.index} · ${def.tagline}`}
        title={def.name}
        subtitle={def.description}
      />

      <motion.div className="briefing" variants={stagger.container} initial="hidden" animate="show">
        <div className="briefing__main">
          {!isDaily ? (
            <motion.section variants={stagger.item} aria-labelledby="diff-title">
              <h2 id="diff-title" className="section-title">Difficulté</h2>
              <div className="diff-list" role="radiogroup" aria-label="Difficulté">
                {DIFFICULTIES.map((d) => {
                  const locked = level.level < d.requiredLevel;
                  const selected = d.id === difficulty;
                  return (
                    <button
                      key={d.id}
                      role="radio"
                      aria-checked={selected}
                      disabled={locked}
                      className={`diff card${selected ? ' diff--selected' : ''}${locked ? ' diff--locked' : ''}`}
                      onClick={() => setDifficulty(d.id)}
                    >
                      <span className="diff__bars" aria-hidden="true">
                        {[1, 2, 3, 4].map((i) => <span key={i} className={i <= d.rank ? 'on' : ''} />)}
                      </span>
                      <span className="diff__text">
                        <span className="diff__name">{d.name}</span>
                        <span className="diff__desc">
                          {locked ? `Débloqué au niveau ${d.requiredLevel}` : d.description}
                        </span>
                      </span>
                      <span className="diff__mult num">{locked ? <IconLock width={18} height={18} /> : `×${d.multiplier}`}</span>
                    </button>
                  );
                })}
              </div>
            </motion.section>
          ) : (
            <motion.section variants={stagger.item} className="card daily-brief">
              <div className="daily-brief__art"><ModeGlyph glyph="calendar" /></div>
              <div>
                <p className="eyebrow">Défi n° <span className="num">{daily.key}</span></p>
                <p className="daily-brief__text">
                  Difficulté imposée : <strong>{diff.name}</strong>. Le même défi pour tous les joueurs aujourd’hui.
                </p>
                {daily.played && (
                  <p className="daily-brief__done">
                    <IconCheck width={16} height={16} /> Défi relevé : <span className="num accent">{daily.result!.score.toLocaleString('fr-FR')}</span> pts. Reviens demain.
                  </p>
                )}
              </div>
            </motion.section>
          )}

          <motion.section variants={stagger.item} aria-labelledby="rules-title">
            <h2 id="rules-title" className="section-title">Règles de la manche</h2>
            <ul className="rules">
              <li className="rule card">
                <span className="rule__icon"><IconClock /></span>
                <span className="rule__value num accent">{ROUND_DURATION_MS / 1000}s</span>
                <span className="rule__label">{isDaily ? 'pour résoudre le défi' : 'pour enchaîner un maximum d’énigmes'}</span>
              </li>
              <li className="rule card">
                <span className="rule__icon">+</span>
                <span className="rule__value num">{Math.round(BASE_POINTS * diff.multiplier)}–{Math.round((BASE_POINTS + MAX_SPEED_BONUS) * diff.multiplier * comboMultiplier(MAX_COMBO))}</span>
                <span className="rule__label">points par bonne réponse, plus si tu es rapide</span>
              </li>
              <li className="rule card">
                <span className="rule__icon"><IconFlame /></span>
                <span className="rule__value num">×{comboMultiplier(MAX_COMBO)}</span>
                <span className="rule__label">multiplicateur maximal de série</span>
              </li>
              <li className="rule card">
                <span className="rule__icon">−</span>
                <span className="rule__value num accent">{diff.penaltyMs / 1000}s</span>
                <span className="rule__label">de pénalité par erreur</span>
              </li>
            </ul>
          </motion.section>
        </div>

        <motion.aside variants={stagger.item} className="briefing__side card">
          <p className="eyebrow">Ton record · {def.name}</p>
          <p className="num briefing__record">{ms.bestScore.toLocaleString('fr-FR')}</p>
          <dl className="briefing__kv">
            <div><dt>Parties</dt><dd className="num">{ms.games}</dd></div>
            <div><dt>Précision</dt><dd className="num">{ms.games ? `${Math.round(ms.accuracy * 100)}\u202f%` : '—'}</dd></div>
          </dl>
          {PLAYABLE[mode] ? (
            <Button className="launch--desktop" size="lg" block icon={<IconPlay />} onClick={launch}>
              Lancer la manche
            </Button>
          ) : (
            <div className="build-notice" role="note">
              <span className="tag tag--neutral">{NEXT_STEP[mode]}</span>
              <p>Les énigmes {isDaily ? 'du défi quotidien' : `du mode ${def.name}`} arrivent à la prochaine étape de développement. Les modes Logique et Observation sont jouables dès maintenant.</p>
            </div>
          )}
          <button className="link-btn" onClick={() => navigate({ name: 'leaderboard', mode })}>
            Voir le classement {def.name} →
          </button>
        </motion.aside>
      </motion.div>

      {PLAYABLE[mode] && (
        <div className="launch-bar">
          <Button size="lg" block icon={<IconPlay />} onClick={launch}>
            Lancer · {diff.name}
          </Button>
        </div>
      )}
    </Screen>
  );
}
