/**
 * Chronomètre à rebours fiable.
 * Il ne compte pas les « ticks » : il calcule le temps restant à partir d'une
 * échéance absolue (horloge monotone). Un onglet en arrière-plan, un rendu lent
 * ou un setInterval retardé ne faussent donc jamais le temps.
 */
export type Clock = () => number;

export const monotonicClock: Clock = () =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export class Countdown {
  private deadline: number | null = null;
  private pausedRemaining: number;

  constructor(private readonly durationMs: number, private readonly clock: Clock = monotonicClock) {
    this.pausedRemaining = durationMs;
  }

  get running(): boolean {
    return this.deadline !== null;
  }

  start(): void {
    if (this.deadline !== null) return;
    this.deadline = this.clock() + this.pausedRemaining;
  }

  pause(): void {
    if (this.deadline === null) return;
    this.pausedRemaining = this.remaining();
    this.deadline = null;
  }

  reset(): void {
    this.deadline = null;
    this.pausedRemaining = this.durationMs;
  }

  /** Retire (pénalité) ou ajoute (bonus, valeur négative) du temps. */
  penalize(ms: number): void {
    if (this.deadline !== null) this.deadline -= ms;
    else this.pausedRemaining = Math.max(0, this.pausedRemaining - ms);
  }

  remaining(): number {
    if (this.deadline === null) return Math.max(0, this.pausedRemaining);
    return Math.max(0, this.deadline - this.clock());
  }

  elapsed(): number {
    return this.durationMs - this.remaining();
  }

  get expired(): boolean {
    return this.remaining() <= 0;
  }
}
