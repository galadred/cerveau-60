import { motion } from 'motion/react';
import { useNavigation } from '@/app/navigation';
import { DIFFICULTIES, getDifficulty, getMode } from '@/core/modes';
import { levelFromXp } from '@/core/progression';
import { fmt } from '@/core/puzzles/types';
import { createId } from '@/core/id';
import { useCountUp } from '@/hooks/useCountUp';
import { useGameStore } from '@/state/GameStore';
import { Button } from '@/ui/Button';
import { IconCheck, IconClose, IconPlay } from '@/ui/Icons';
import { ProgressBar } from '@/ui/ProgressBar';
import { KIND_LABEL, PuzzleView } from '@/ui/puzzle/PuzzleView';
import { Screen, stagger } from '../Screen';
import type { RoundReport } from './report';

export function ResultsScreen({ direction, report }: { direction: 1 | -1; report: RoundReport }) {
  const { replace, home, back } = useNavigation();
  const { profile } = useGameStore();
  const { result, previousBest, xpBefore, xpAfter, log, puzzles } = report;
  const reduced = profile?.settings.reducedMotion ?? false;
  const shown = useCountUp(result.score, 1400, !reduced);

  const before = levelFromXp(xpBefore);
  const after = levelFromXp(xpAfter);
  const levelUp = after.level > before.level;
  const unlocked = DIFFICULTIES.filter((d) => d.requiredLevel > before.level && d.requiredLevel <= after.level);
  const record = result.score > previousBest && result.score > 0;
  const accuracy = result.attempted ? Math.round((result.solved / result.attempted) * 100) : 0;

  const kpis = [
    { label: 'Résolues', value: `${result.solved}/${result.attempted}` },
    { label: 'Précision', value: result.attempted ? `${accuracy}\u202f%` : '—' },
    { label: 'Meilleure série', value: String(result.bestStreak) },
    { label: 'XP gagnée', value: `+${result.score.toLocaleString('fr-FR')}`, hot: true },
  ];

  return (
    <Screen direction={direction}>
      <motion.div className="results" variants={stagger.container} initial="hidden" animate="show">
        <motion.section variants={stagger.item} className="results__hero">
          <p className="eyebrow">Manche terminée · {getMode(result.mode).name} · {getDifficulty(result.difficulty).name}</p>
          <p className="num results__score" aria-label={`Score : ${result.score}`}>{shown.toLocaleString('fr-FR')}</p>
          <div className="results__tags">
            {record && <span className="tag">Nouveau record</span>}
            {!record && previousBest > 0 && (
              <span className="tag tag--neutral">Record : {previousBest.toLocaleString('fr-FR')}</span>
            )}
            {levelUp && <span className="tag">Niveau {after.level} atteint</span>}
          </div>
        </motion.section>

        <motion.ul variants={stagger.item} className="kpis kpis--4">
          {kpis.map((k) => (
            <li key={k.label} className="kpi card">
              <span className="kpi__label">{k.label}</span>
              <span className={`kpi__value num${k.hot ? ' accent' : ''}`}>{k.value}</span>
            </li>
          ))}
        </motion.ul>

        <motion.section variants={stagger.item} className="card level-card">
          <div className="level-card__row">
            <div>
              <p className="eyebrow">Niveau {after.level}</p>
              <p className="display level-card__title">{after.title}</p>
            </div>
            <span className="num level-card__xp">
              {after.xpIntoLevel.toLocaleString('fr-FR')}<span> / {after.xpForNext.toLocaleString('fr-FR')} XP</span>
            </span>
          </div>
          <ProgressBar value={after.progress} label="Progression du niveau" />
          {unlocked.map((d) => (
            <p key={d.id} className="unlock">Difficulté <strong>{d.name}</strong> débloquée.</p>
          ))}
        </motion.section>

        <motion.div variants={stagger.item} className="results__actions">
          <Button size="lg" icon={<IconPlay />} onClick={() => replace({ name: 'play', mode: result.mode, difficulty: result.difficulty, run: createId() })}>
            Rejouer
          </Button>
          <Button variant="ghost" size="lg" onClick={back}>Changer de difficulté</Button>
          <Button variant="quiet" onClick={home}>Menu principal</Button>
        </motion.div>

        <motion.section variants={stagger.item} aria-labelledby="review-title">
          <h2 id="review-title" className="section-title">Revue des énigmes</h2>
          {log.length === 0 ? (
            <p className="empty__text">Aucune réponse donnée pendant cette manche.</p>
          ) : (
            <ol className="review">
              {log.map((r) => {
                const p = puzzles[r.index];
                const status = r.choice === null ? 'skip' : r.correct ? 'ok' : 'ko';
                return (
                  <li key={r.index} className={`review__item card review__item--${status}`}>
                    <div className="review__head">
                      <span className="review__badge" aria-hidden="true">
                        {status === 'ok' ? <IconCheck width={14} height={14} /> : status === 'ko' ? <IconClose width={14} height={14} /> : '»'}
                      </span>
                      <span className="review__kind">{r.index + 1}. {KIND_LABEL[p.kind]}</span>
                      <span className="num review__pts">
                        {status === 'ok' ? `+${r.points}` : `−${(r.penaltyMs / 1000).toLocaleString('fr-FR')}\u202fs`}
                      </span>
                    </div>
                    <PuzzleView puzzle={p} compact />
                    <p className="review__answer">
                      {status === 'skip' ? 'Passée.' : <>Ta réponse : <strong className="num">{fmt(p.choices[r.choice!])}</strong>. </>}
                      {status !== 'ok' && <>Bonne réponse : <strong className="num accent">{fmt(p.choices[p.answerIndex])}</strong>.</>}
                      <span className="review__time num"> {(r.answerTimeMs / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}\u202fs</span>
                    </p>
                    <p className="review__why">{p.explanation}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </motion.section>
      </motion.div>
    </Screen>
  );
}
