import { describe, expect, it } from 'vitest';
import { evaluate, evaluateLesson } from './index';

const MIN = 60000;
const base = { policy: { segmentation: 'codepoint' as const } };

describe('lesson completion', () => {
  it('passes when every criterion is met', () => {
    const r = evaluate({ reference: 'abcd', entered: 'abcd', elapsedMs: MIN, ...base });
    expect(evaluateLesson(r, { minAccuracy: 95, minNetSpeed: 4, requirePassageCompletion: true, timeLimitMs: MIN })).toEqual({ passed: true, failures: [] });
  });
  it('reports every failing reason', () => {
    const r = evaluate({ reference: 'abcdefgh', entered: 'abxd', elapsedMs: 2 * MIN, ...base });
    const out = evaluateLesson(r, { minAccuracy: 90, minNetSpeed: 10, requirePassageCompletion: true, timeLimitMs: MIN });
    expect(out.passed).toBe(false);
    expect(out.failures.map((f) => f.code).sort()).toEqual(
      ['ACCURACY_TOO_LOW', 'NET_SPEED_TOO_LOW', 'PASSAGE_NOT_COMPLETED', 'TIME_LIMIT_EXCEEDED'].sort(),
    );
  });
  it('fails with NO_INPUT when nothing was typed', () => {
    const r = evaluate({ reference: 'abc', entered: '', elapsedMs: MIN, ...base });
    expect(evaluateLesson(r, {}).failures[0].code).toBe('NO_INPUT');
  });
});
