import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@/app/navigation';
import { RoundSession, type AnswerOutcome } from '@/core/engine/session';
import { proofFromLog, verifyRound } from '@/core/engine/verify';
import { sourceFor } from '@/core/engine/sources';
import { ROUND_DURATION_MS, getDifficulty, getMode } from '@/core/modes';
import { GENERATOR_VERSION } from '@/core/puzzles/logic';
import { fmt } from '@/core/puzzles/types';
import { randomSeed } from '@/core/random';
import { comboMultiplier } from '@/core/scoring';
import type { DifficultyId, ModeId } from '@/core/types';
import { useGameStore } from '@/state/GameStore';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { IconClose } from '@/ui/Icons';
import { KIND_LABEL, PuzzleView } from '@/ui/puzzle/PuzzleView';
import { TimerRing } from '@/ui/TimerRing';

const FEEDBACK_OK_MS = 420;
const FEEDBACK_KO_MS = 760;
const INTRO_STEPS = ['3', '2', '1'];
const ALERT_MS = 10_000;

type Stage = 'intro' | 'playing' | 'ending' | 'error';

export function GameScreen({ mode, difficulty }: { mode: ModeId; difficulty: DifficultyId }) {
  const { replace, back } = useNavigation();
  const store = useGameStore();
  const storeRef = useRef(store);
  storeRef.current = store;
  const sessionRef = useRef<RoundSession>();
  if (!sessionRef.current) sessionRef.current = new RoundSession({ seed: randomSeed(), difficulty, source: sourceFor(mode) });
  const session = sessionRef.current;

  const [stage, setStage] = useState<Stage>('intro');
  const [introStep, setIntroStep] = useState(0);
  const [remaining, setRemaining] = useState(ROUND_DURATION_MS);
  const [puzzle, setPuzzle] = useState(session.current);
  /** Rang de l'énigme affichée (stable pendant le retour visuel). */
  const [puzzleNo, setPuzzleNo] = useState(1);
  const [feedback, setFeedback] = useState<AnswerOutcome | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [floater, setFloater] = useState<{ id: number; text: string; bad: boolean } | null>(null);
  const [quitOpen, setQuitOpen] = useState(false);
  const finished = useRef(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>();

  // ---------- Compte à rebours d'introduction ----------
  useEffect(() => {
    if (stage !== 'intro') return;
    if (introStep >= INTRO_STEPS.length) {
      session.start();
      setPuzzle(session.current);
      setStage('playing');
      return;
    }
    const t = setTimeout(() => setIntroStep((s) => s + 1), 650);
    return () => clearTimeout(t);
  }, [stage, introStep, session]);

  // ---------- Fin de manche : vérification puis sauvegarde ----------
  const finalize = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    clearTimeout(feedbackTimer.current);
    session.end();
    setStage('ending');
    const sum = session.summary();
    const proof = proofFromLog(sum.seed, sum.log, GENERATOR_VERSION);
    const check = verifyRound(sum, proof, sourceFor(mode));
    await new Promise((r) => setTimeout(r, 1100)); // « Temps écoulé »
    if (!check.ok) {
      setStage('error');
      return;
    }
    const st = storeRef.current;
    const previousBest = st.stats.byMode[mode].bestScore;
    const xpBefore = st.profile?.xp ?? 0;
    const result = await st.recordResult({
      mode, difficulty,
      score: sum.score, solved: sum.solved, attempted: sum.attempted,
      bestStreak: sum.bestStreak, durationMs: sum.durationMs, proof,
    });
    replace({
      name: 'results',
      report: { result, puzzles: sum.puzzles, log: sum.log, previousBest, xpBefore, xpAfter: xpBefore + Math.max(0, result.score) },
    });
  }, [session, mode, difficulty, replace]);

  // ---------- Horloge d'affichage (lit le moteur, ne le pilote pas) ----------
  useEffect(() => {
    if (stage !== 'playing') return;
    let raf = 0;
    const tick = () => {
      setRemaining(session.remaining());
      if (session.phase === 'over') {
        finalize();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Filet de sécurité si l'onglet est en arrière-plan (rAF suspendu).
    const fallback = setInterval(() => session.phase === 'over' && finalize(), 500);
    const onVis = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(fallback);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [stage, session, finalize]);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  // ---------- Réponses ----------
  const handle = useCallback(
    (outcome: AnswerOutcome | null) => {
      if (!outcome) return;
      setFeedback(outcome);
      setScore(outcome.scoreAfter);
      setStreak(outcome.streak);
      setRemaining(session.remaining());
      setFloater({
        id: outcome.index,
        text: outcome.correct ? `+${outcome.points}` : `−${(outcome.penaltyMs / 1000).toLocaleString('fr-FR')}\u202fs`,
        bad: !outcome.correct,
      });
      if (outcome.expired) {
        finalize();
        return;
      }
      feedbackTimer.current = setTimeout(() => {
        session.next();
        setFeedback(null);
        setPuzzle(session.current);
        setPuzzleNo(session.answeredCount + 1);
        if (session.phase === 'over') finalize();
      }, outcome.correct ? FEEDBACK_OK_MS : FEEDBACK_KO_MS);
    },
    [session, finalize],
  );

  const choose = useCallback((i: number) => handle(session.answer(i)), [handle, session]);
  const skip = useCallback(() => handle(session.skip()), [handle, session]);

  useEffect(() => {
    if (stage !== 'playing' || quitOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = ['1', '2', '3', '4'].indexOf(e.key);
      const l = ['a', 'b', 'c', 'd'].indexOf(e.key.toLowerCase());
      const byKeys = session.current?.input === 'choice';
      if (byKeys && (n >= 0 || l >= 0)) choose(n >= 0 ? n : l);
      else if (e.key.toLowerCase() === 'p') skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage, quitOpen, choose, skip, session]);

  const diff = getDifficulty(difficulty);
  const alert = stage === 'playing' && remaining <= ALERT_MS;
  const seconds = remaining <= ALERT_MS
    ? (Math.ceil(remaining / 100) / 10).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : String(Math.ceil(remaining / 1000));

  return (
    <motion.main
      className={`game container${alert ? ' game--alert' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(8px)' }}
      transition={{ duration: 0.4 }}
    >
      <header className="hud">
        <button className="icon-btn" onClick={() => setQuitOpen(true)} aria-label="Abandonner la manche">
          <IconClose />
        </button>
        <div className="hud__score">
          <span className="eyebrow">Score</span>
          <span className="num hud__score-value">{score.toLocaleString('fr-FR')}</span>
          <AnimatePresence>
            {floater && (
              <motion.span
                key={floater.id}
                className={`hud__floater num${floater.bad ? ' hud__floater--bad' : ''}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.5 }}
                onAnimationComplete={() => setFloater((f) => (f?.id === floater.id ? null : f))}
              >
                {floater.text}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <TimerRing progress={remaining / ROUND_DURATION_MS} size={78} stroke={4} alert={alert} label={`${Math.ceil(remaining / 1000)} secondes restantes`}>
          <span className="num hud__time">{seconds}</span>
        </TimerRing>
      </header>

      <div className="game__meta">
        <span className="eyebrow">
          {getMode(mode).name} · {diff.name} · Énigme {puzzleNo}
        </span>
        <span className={`streak${streak >= 2 ? ' streak--on' : ''}`} aria-live="polite">
          Série ×{comboMultiplier(streak + 1).toLocaleString('fr-FR')}
        </span>
      </div>

      <div className="game__stage">
        <AnimatePresence mode="wait">
          {stage === 'intro' && (
            <motion.div key="intro" className="intro" exit={{ opacity: 0, scale: 1.2 }}>
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={introStep}
                  className="display intro__num"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.4 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  {INTRO_STEPS[introStep] ?? ''}
                </motion.span>
              </AnimatePresence>
              <p className="intro__hint">60 secondes. Réponds vite, réponds juste.</p>
            </motion.div>
          )}

          {stage === 'playing' && puzzle && (
            <motion.section
              key={`${puzzleNo}-${puzzle.id}`}
              className={`puzzle-card card${feedback ? (feedback.correct ? ' puzzle-card--ok' : ' puzzle-card--ko') : ''}`}
              initial={{ opacity: 0, y: 24, rotateX: -8 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              aria-live="polite"
            >
              <div className="puzzle-card__head">
                <span className="tag tag--neutral">{KIND_LABEL[puzzle.kind]}</span>
                <span className="intensity" aria-label={`Intensité ${puzzle.intensity} sur 5`}>
                  {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= puzzle.intensity ? 'on' : ''} />)}
                </span>
              </div>
              <h2 className="puzzle-card__prompt">{puzzle.prompt}</h2>
              <div className="puzzle-card__body">
                <PuzzleView
                  puzzle={puzzle}
                  onPick={puzzle.input === 'grid' ? choose : undefined}
                  marks={feedback && puzzle.input === 'grid' ? { answerIndex: feedback.answerIndex, choice: feedback.choice } : null}
                />
              </div>
            </motion.section>
          )}

          {(stage === 'ending' || stage === 'error') && (
            <motion.div key="end" className="ending" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <p className="display ending__title">{stage === 'error' ? 'Manche invalide' : 'Temps écoulé'}</p>
              {stage === 'error' && (
                <>
                  <p className="ending__text">Une incohérence a été détectée : le résultat n’a pas été enregistré.</p>
                  <button className="link-btn" onClick={back}>Retour au briefing →</button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {stage === 'playing' && puzzle && puzzle.input === 'choice' && (
        <div className={`choices${puzzle.display.type === 'count' ? ' choices--row' : ''}`} role="group" aria-label="Propositions">
          {puzzle.choices.map((c, i) => {
            const state = feedback
              ? i === feedback.answerIndex ? 'right' : i === feedback.choice ? 'wrong' : 'idle'
              : 'idle';
            return (
              <button
                key={`${puzzle.id}-${i}`}
                className={`choice choice--${state}`}
                onClick={() => choose(i)}
                disabled={!!feedback}
                aria-label={`Réponse ${i + 1} : ${fmt(c)}`}
              >
                <span className="choice__key">{i + 1}</span>
                <span className="choice__value num">{fmt(c)}</span>
              </button>
            );
          })}
        </div>
      )}

      {stage === 'playing' && (
        <div className="game__foot">
          <button className="link-btn" onClick={skip} disabled={!!feedback}>
            Passer · −{(diff.penaltyMs / 2000).toLocaleString('fr-FR')} s
          </button>
          <span className="game__keys">
            {puzzle?.input === 'grid' ? 'Touche ou clique une case · P pour passer' : 'Clavier : 1–4 pour répondre · P pour passer'}
          </span>
        </div>
      )}

      <ConfirmDialog
        open={quitOpen}
        title="Abandonner ?"
        confirmLabel="Abandonner"
        danger
        onCancel={() => setQuitOpen(false)}
        onConfirm={() => {
          finished.current = true;
          session.end();
          setQuitOpen(false);
          back();
        }}
      >
        Le chronomètre continue de tourner pendant cette question. Une manche abandonnée n’est pas enregistrée.
      </ConfirmDialog>
    </motion.main>
  );
}
