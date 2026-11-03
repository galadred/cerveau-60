import { Countdown, monotonicClock, type Clock } from '../countdown';
import { ROUND_DURATION_MS, getDifficulty } from '../modes';
import { generateLogicPuzzle } from '../puzzles/logic';
import type { Intensity, Puzzle } from '../puzzles/types';
import { pointsForCorrect } from '../scoring';
import type { DifficultyId } from '../types';
import { intensityFor } from './intensity';

export type PuzzleSource = (seed: string, index: number, intensity: Intensity, salt: number) => Puzzle;

/** Une réponse dans le journal : seules `choice` et `answerTimeMs` viennent du joueur. */
export interface AnswerRecord {
  index: number;
  puzzleId: string;
  /** Proposition choisie ; null = énigme passée. */
  choice: number | null;
  correct: boolean;
  answerTimeMs: number;
  points: number;
  penaltyMs: number;
  streak: number;
}

export interface AnswerOutcome extends AnswerRecord {
  answerIndex: number;
  scoreAfter: number;
  expired: boolean;
}

export interface RoundSummary {
  seed: string;
  difficulty: DifficultyId;
  score: number;
  solved: number;
  attempted: number;
  bestStreak: number;
  durationMs: number;
  log: AnswerRecord[];
  puzzles: Puzzle[];
}

export type Phase = 'ready' | 'playing' | 'feedback' | 'over';

/** La pénalité pour passer est la moitié de celle d'une erreur. */
export const SKIP_PENALTY_RATIO = 0.5;

/**
 * Moteur d'une manche. Il possède seul l'horloge, le score et les énigmes :
 * l'interface ne fait que lui transmettre des choix.
 *  - horloge monotone à échéance absolue (pas de pause possible) ;
 *  - toute réponse après l'échéance est refusée ;
 *  - une seule réponse par énigme (verrou pendant le retour visuel) ;
 *  - temps de réponse et points calculés ici, jamais par l'interface.
 */
export class RoundSession {
  readonly seed: string;
  readonly difficulty: DifficultyId;
  private readonly countdown: Countdown;
  private readonly durationMs: number;
  private readonly clock: Clock;
  private readonly source: PuzzleSource;
  private readonly rank: number;
  private readonly penaltyMs: number;
  private _phase: Phase = 'ready';
  private _current: Puzzle | null = null;
  private presentedAt = 0;
  private seen = new Set<string>();
  private log: AnswerRecord[] = [];
  private puzzles: Puzzle[] = [];
  private streak = 0;
  private bestStreak = 0;
  private _score = 0;
  private endedAt: number | null = null;
  private startedAt = 0;

  constructor(opts: { seed: string; difficulty: DifficultyId; clock?: Clock; durationMs?: number; source?: PuzzleSource }) {
    this.seed = opts.seed;
    this.difficulty = opts.difficulty;
    this.clock = opts.clock ?? monotonicClock;
    this.durationMs = opts.durationMs ?? ROUND_DURATION_MS;
    this.countdown = new Countdown(this.durationMs, this.clock);
    this.source = opts.source ?? generateLogicPuzzle;
    const d = getDifficulty(opts.difficulty);
    this.rank = d.rank;
    this.penaltyMs = d.penaltyMs;
  }

  get phase(): Phase {
    this.checkExpiry();
    return this._phase;
  }
  get current(): Puzzle | null {
    return this._current;
  }
  get score(): number {
    return this._score;
  }
  get currentStreak(): number {
    return this.streak;
  }
  get answeredCount(): number {
    return this.log.length;
  }
  get solved(): number {
    return this.log.filter((r) => r.correct).length;
  }
  get intensity(): Intensity {
    return intensityFor(this.rank, this.solved);
  }
  remaining(): number {
    return this.countdown.remaining();
  }

  start(): void {
    if (this._phase !== 'ready') return;
    this._phase = 'playing';
    this.countdown.start();
    this.startedAt = this.clock();
    this.present();
  }

  /** Soumet une proposition. Renvoie null si la réponse est refusée. */
  answer(choice: number): AnswerOutcome | null {
    if (!Number.isInteger(choice) || choice < 0 || choice >= (this._current?.choices.length ?? 0)) return null;
    return this.resolve(choice);
  }

  /** Passe l'énigme : série remise à zéro, demi-pénalité, pas de tentative comptée. */
  skip(): AnswerOutcome | null {
    return this.resolve(null);
  }

  /** Affiche l'énigme suivante après le retour visuel. */
  next(): void {
    if (this.phase !== 'feedback') return;
    this._phase = 'playing';
    this.present();
  }

  /** Fin anticipée (abandon). */
  end(): void {
    if (this._phase === 'over') return;
    this.countdown.pause();
    this.endedAt = this.clock();
    this._phase = 'over';
  }

  summary(): RoundSummary {
    const attempted = this.log.filter((r) => r.choice !== null).length;
    const end = this.endedAt ?? this.clock();
    return {
      seed: this.seed,
      difficulty: this.difficulty,
      score: this._score,
      solved: this.solved,
      attempted,
      bestStreak: this.bestStreak,
      durationMs: Math.max(0, Math.min(Math.round(end - this.startedAt), this.durationMs)),
      log: this.log.map((r) => ({ ...r })),
      puzzles: [...this.puzzles],
    };
  }

  // ------------------------------------------------------------------

  private checkExpiry(): void {
    if (this._phase !== 'over' && this._phase !== 'ready' && this.countdown.expired) {
      this.endedAt = this.clock();
      this._phase = 'over';
    }
  }

  private present(): void {
    const index = this.log.length;
    const intensity = this.intensity;
    let salt = 0;
    let p = this.source(this.seed, index, intensity, salt);
    while (this.seen.has(p.id) && salt < 20) p = this.source(this.seed, index, intensity, ++salt);
    this.seen.add(p.id);
    this._current = p;
    this.puzzles.push(p);
    this.presentedAt = this.clock();
  }

  private resolve(choice: number | null): AnswerOutcome | null {
    this.checkExpiry();
    if (this._phase !== 'playing' || !this._current) return null;
    const now = this.clock();
    const answerTimeMs = Math.max(0, Math.round(now - this.presentedAt));
    const puzzle = this._current;
    const correct = choice !== null && choice === puzzle.answerIndex;
    let points = 0;
    let penaltyMs = 0;
    if (correct) {
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      points = pointsForCorrect(this.difficulty, answerTimeMs, this.streak);
      this._score += points;
    } else {
      this.streak = 0;
      penaltyMs = choice === null ? Math.round(this.penaltyMs * SKIP_PENALTY_RATIO) : this.penaltyMs;
      this.countdown.penalize(penaltyMs);
    }
    const record: AnswerRecord = { index: this.log.length, puzzleId: puzzle.id, choice, correct, answerTimeMs, points, penaltyMs, streak: this.streak };
    this.log.push(record);
    this._phase = 'feedback';
    this.checkExpiry();
    return { ...record, answerIndex: puzzle.answerIndex, scoreAfter: this._score, expired: (this._phase as Phase) === 'over' };
  }
}
