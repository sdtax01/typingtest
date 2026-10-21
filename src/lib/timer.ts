export type FinishReason = 'expired' | 'manual' | 'completed';

export interface Clock {
  now(): number;
}
export const systemClock: Clock = {
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
};

export interface TimerSnapshot {
  elapsedMs: number;
  remainingMs: number;
  running: boolean;
  finished: boolean;
  reason: FinishReason | null;
}

/**
 * Monotonic test timer. Elapsed time is always derived from clock differences, never from counting ticks,
 * so throttled background tabs, delayed rendering and slow frames cannot make it drift.
 * finish() is idempotent: only the first call decides the elapsed time and reason (prevents double submits).
 */
export class TestTimer {
  private startedAt: number | null = null;
  private accumulated = 0;
  private finishedReason: FinishReason | null = null;
  private finalElapsed = 0;

  constructor(public readonly durationMs: number, private clock: Clock = systemClock) {
    if (!(durationMs > 0)) throw new RangeError('durationMs must be positive');
  }

  start(): void {
    if (this.finishedReason || this.startedAt !== null) return;
    this.startedAt = this.clock.now();
  }
  pause(): void {
    if (this.startedAt === null || this.finishedReason) return;
    this.accumulated += this.clock.now() - this.startedAt;
    this.startedAt = null;
  }
  resume(): void {
    this.start();
  }
  private rawElapsed(): number {
    return this.accumulated + (this.startedAt === null ? 0 : this.clock.now() - this.startedAt);
  }
  elapsedMs(): number {
    if (this.finishedReason) return this.finalElapsed;
    return Math.min(this.rawElapsed(), this.durationMs);
  }
  isExpired(): boolean {
    return !this.finishedReason && this.rawElapsed() >= this.durationMs;
  }
  /** Returns the final record the first time; later calls return the same record without changing it. */
  finish(reason: FinishReason): { elapsedMs: number; reason: FinishReason } {
    if (!this.finishedReason) {
      const expired = this.rawElapsed() >= this.durationMs;
      this.finishedReason = expired && reason === 'manual' ? 'expired' : reason;
      this.finalElapsed = Math.min(this.rawElapsed(), this.durationMs);
      this.startedAt = null;
    }
    return { elapsedMs: this.finalElapsed, reason: this.finishedReason };
  }
  snapshot(): TimerSnapshot {
    const elapsed = this.elapsedMs();
    return {
      elapsedMs: elapsed,
      remainingMs: Math.max(0, this.durationMs - elapsed),
      running: this.startedAt !== null && !this.finishedReason,
      finished: this.finishedReason !== null,
      reason: this.finishedReason,
    };
  }
}
