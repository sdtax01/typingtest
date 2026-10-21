import { describe, expect, it } from 'vitest';
import { TestTimer, type Clock } from './timer';

class FakeClock implements Clock {
  t = 1000;
  now() {
    return this.t;
  }
  advance(ms: number) {
    this.t += ms;
  }
}

describe('TestTimer', () => {
  it('counts down normally', () => {
    const c = new FakeClock();
    const t = new TestTimer(60000, c);
    t.start();
    c.advance(15000);
    expect(t.snapshot()).toMatchObject({ elapsedMs: 15000, remainingMs: 45000, running: true, finished: false });
  });
  it('immediate completion records ~0 elapsed', () => {
    const c = new FakeClock();
    const t = new TestTimer(60000, c);
    t.start();
    expect(t.finish('manual')).toEqual({ elapsedMs: 0, reason: 'manual' });
  });
  it('expires and clamps to the duration', () => {
    const c = new FakeClock();
    const t = new TestTimer(60000, c);
    t.start();
    c.advance(61000);
    expect(t.isExpired()).toBe(true);
    expect(t.finish('expired')).toEqual({ elapsedMs: 60000, reason: 'expired' });
  });
  it('manual finish after the deadline is recorded as expiry', () => {
    const c = new FakeClock();
    const t = new TestTimer(10000, c);
    t.start();
    c.advance(20000);
    expect(t.finish('manual').reason).toBe('expired');
  });
  it('manual finish before the deadline keeps its reason', () => {
    const c = new FakeClock();
    const t = new TestTimer(60000, c);
    t.start();
    c.advance(20000);
    expect(t.finish('manual')).toEqual({ elapsedMs: 20000, reason: 'manual' });
  });
  it('is immune to missed ticks (tab hidden / throttled): one big jump is exact', () => {
    const c = new FakeClock();
    const t = new TestTimer(300000, c);
    t.start();
    c.advance(137_431); // no ticks observed in between
    expect(t.elapsedMs()).toBe(137_431);
  });
  it('does not drift with many irregular reads', () => {
    const c = new FakeClock();
    const t = new TestTimer(300000, c);
    t.start();
    let total = 0;
    for (let i = 0; i < 1000; i++) {
      const step = 3 + (i % 17);
      c.advance(step);
      total += step;
      t.snapshot();
    }
    expect(t.elapsedMs()).toBe(total);
  });
  it('pause excludes paused time', () => {
    const c = new FakeClock();
    const t = new TestTimer(60000, c);
    t.start();
    c.advance(10000);
    t.pause();
    c.advance(50000);
    t.resume();
    c.advance(5000);
    expect(t.elapsedMs()).toBe(15000);
  });
  it('finish is idempotent (no duplicate submissions change the record)', () => {
    const c = new FakeClock();
    const t = new TestTimer(60000, c);
    t.start();
    c.advance(5000);
    const a = t.finish('manual');
    c.advance(9000);
    const b = t.finish('expired');
    expect(b).toEqual(a);
    expect(t.snapshot().finished).toBe(true);
  });
  it('rejects a non-positive duration', () => {
    expect(() => new TestTimer(0)).toThrow(RangeError);
  });
});
