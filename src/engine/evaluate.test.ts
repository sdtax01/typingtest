import { describe, expect, it } from 'vitest';
import { evaluate, AlignmentTooLargeError, ENGINE_VERSION } from './index';
import type { EvaluationPolicy } from './types';

const cp: Partial<EvaluationPolicy> = { segmentation: 'codepoint' };
const ak: Partial<EvaluationPolicy> = { segmentation: 'akshara' };
const MIN = 60000;

describe('alignment & error classification', () => {
  it('identical text is 100% correct', () => {
    const r = evaluate({ reference: 'abcdef', entered: 'abcdef', elapsedMs: MIN, policy: cp });
    expect(r.counts).toMatchObject({ correct: 6, substituted: 0, missing: 0, extra: 0, errors: 0 });
    expect(r.accuracy).toBe(100);
  });
  it('insertion in the middle does not shift every later element into errors', () => {
    const r = evaluate({ reference: 'abcdef', entered: 'abcXdef', elapsedMs: MIN, policy: cp });
    expect(r.counts).toMatchObject({ correct: 6, extra: 1, substituted: 0, missing: 0 });
    expect(r.accuracy).toBe(100);
  });
  it('omission in the middle is one missing element', () => {
    const r = evaluate({ reference: 'abcdef', entered: 'abdef', elapsedMs: MIN, policy: cp });
    expect(r.counts).toMatchObject({ correct: 5, missing: 1, extra: 0, substituted: 0 });
    expect(r.accuracy).toBeCloseTo(83.33, 2);
  });
  it('substitution near the beginning and end', () => {
    const r = evaluate({ reference: 'abcdef', entered: 'xbcdeY', elapsedMs: MIN, policy: cp });
    expect(r.counts).toMatchObject({ correct: 4, substituted: 2, missing: 0, extra: 0 });
  });
  it('tie-break is deterministic: substitution wins over missing+extra', () => {
    const r = evaluate({ reference: 'ab', entered: 'ba', elapsedMs: MIN, policy: cp });
    expect(r.counts).toMatchObject({ substituted: 2, correct: 0, missing: 0, extra: 0 });
    const again = evaluate({ reference: 'ab', entered: 'ba', elapsedMs: MIN, policy: cp });
    expect(again.ops).toEqual(r.ops);
  });
  it('repeated characters', () => {
    const r = evaluate({ reference: 'aaaa', entered: 'aaaaaa', elapsedMs: MIN, policy: cp });
    expect(r.counts).toMatchObject({ correct: 4, extra: 2 });
  });
  it('ops reconstruct both strings', () => {
    const r = evaluate({ reference: 'महाराष्ट्र भूमी', entered: 'महारष्ट्र भुमी x', elapsedMs: MIN, policy: ak });
    const ref = r.ops.filter((o) => o.ref !== undefined).map((o) => o.ref).join('');
    const typed = r.ops.filter((o) => o.typed !== undefined).map((o) => o.typed).join('');
    expect(ref).toBe(r.normalized.reference);
    expect(typed).toBe(r.normalized.entered);
  });
});

describe('Marathi units', () => {
  it('a wrong matra is ONE akshara error, not several', () => {
    const r = evaluate({ reference: 'मराठी', entered: 'मराठि', elapsedMs: MIN, policy: ak });
    expect(r.counts).toMatchObject({ referenceTotal: 3, correct: 2, substituted: 1 });
    expect(r.accuracy).toBeCloseTo(66.67, 2);
  });
  it('conjunct typed as plain consonants is a different element', () => {
    const r = evaluate({ reference: 'क्ष', entered: 'कष', elapsedMs: MIN, policy: ak });
    expect(r.counts.correct).toBe(0);
  });
  it('same text under code point policy counts more elements', () => {
    const a = evaluate({ reference: 'क्ष', entered: 'क्ष', elapsedMs: MIN, policy: ak });
    const c = evaluate({ reference: 'क्ष', entered: 'क्ष', elapsedMs: MIN, policy: cp });
    expect(a.counts.entered).toBe(1);
    expect(c.counts.entered).toBe(3);
  });
  it('mixed Marathi, Latin, digits and punctuation', () => {
    const t = 'टेस्ट 123 abc! आहे।';
    const r = evaluate({ reference: t, entered: t, elapsedMs: MIN, policy: ak });
    expect(r.accuracy).toBe(100);
  });
  it('diagnostic sentence matches itself with the default grapheme policy', () => {
    const t = 'माझे नाव मराठी टायपिंग चाचणी आहे.';
    const r = evaluate({ reference: t, entered: t, elapsedMs: MIN });
    expect(r.accuracy).toBe(100);
    expect(r.counts.errors).toBe(0);
  });
});

describe('normalization', () => {
  it('NFC and NFD-equivalent input compare equal (nukta consonant)', () => {
    const r = evaluate({ reference: 'क़', entered: 'क़', elapsedMs: MIN, policy: ak });
    expect(r.accuracy).toBe(100);
  });
  it('keeps original strings untouched for audit', () => {
    const entered = 'क़';
    const r = evaluate({ reference: 'क़', entered, elapsedMs: MIN, policy: ak });
    expect(r.original.entered).toBe(entered);
    expect(r.original.reference).toBe('क़');
  });
  it('CRLF is normalized by default but can be preserved explicitly', () => {
    const d = evaluate({ reference: 'a\nb', entered: 'a\r\nb', elapsedMs: MIN, policy: cp });
    expect(d.accuracy).toBe(100);
    const p = evaluate({
      reference: 'a\nb',
      entered: 'a\r\nb',
      elapsedMs: MIN,
      policy: { ...cp, normalization: { form: 'NFC', lineEndings: 'preserve', collapseWhitespace: false, trim: false } },
    });
    expect(p.counts.extra).toBe(1);
  });
  it('spaces are meaningful by default and collapsible only by explicit rule', () => {
    const d = evaluate({ reference: 'a b', entered: 'a   b', elapsedMs: MIN, policy: cp });
    expect(d.counts.extra).toBe(2);
    const c = evaluate({
      reference: 'a b',
      entered: 'a   b',
      elapsedMs: MIN,
      policy: { ...cp, normalization: { form: 'NFC', lineEndings: 'lf', collapseWhitespace: true, trim: false } },
    });
    expect(c.accuracy).toBe(100);
  });
});

describe('edge cases', () => {
  it('empty reference: safe result, no NaN', () => {
    const r = evaluate({ reference: '', entered: 'abc', elapsedMs: MIN, policy: cp });
    expect(r.accuracy).toBe(0);
    expect(r.counts.extra).toBe(3);
    expect(r.warnings).toContain('EMPTY_REFERENCE');
    expect(Number.isFinite(r.netSpeed)).toBe(true);
  });
  it('empty entry: everything missing', () => {
    const r = evaluate({ reference: 'abc', entered: '', elapsedMs: MIN, policy: cp });
    expect(r.counts).toMatchObject({ missing: 3, correct: 0, entered: 0 });
    expect(r.accuracy).toBe(0);
    expect(r.warnings).toContain('EMPTY_ENTRY');
  });
  it('both empty', () => {
    const r = evaluate({ reference: '', entered: '', elapsedMs: MIN, policy: cp });
    expect(r.accuracy).toBe(0);
    expect(r.passageCompleted).toBe(false);
  });
  it('throws when the alignment table is too large', () => {
    expect(() => evaluate({ reference: 'abcdef', entered: 'abcdef', elapsedMs: 1, policy: { ...cp, maxAlignmentCells: 10 } })).toThrow(AlignmentTooLargeError);
  });
  it('long passages finish quickly', () => {
    const base = 'महाराष्ट्र ही संतांची भूमी आहे। ';
    const ref = base.repeat(90);
    let typed = ref.replace(/भूमी/g, 'भुमी');
    const at = typed.indexOf(' ', 1000); // insert at a word boundary, never inside an akshara
    typed = typed.slice(0, at) + 'X' + typed.slice(at);
    const t0 = Date.now();
    const r = evaluate({ reference: ref, entered: typed, elapsedMs: 5 * MIN, policy: ak });
    expect(Date.now() - t0).toBeLessThan(5000);
    expect(r.counts.extra).toBe(1);
    expect(r.counts.substituted).toBe(90);
  });
  it('records engine version and the resolved policy', () => {
    const r = evaluate({ reference: 'a', entered: 'a', elapsedMs: MIN, policy: cp });
    expect(r.engineVersion).toBe(ENGINE_VERSION);
    expect(r.policy.segmentation).toBe('codepoint');
  });
});

describe('accuracy formulas', () => {
  it('reference formula (default)', () => {
    const r = evaluate({ reference: 'abcd', entered: 'abxd', elapsedMs: MIN, policy: cp });
    expect(r.accuracy).toBe(75);
  });
  it('entered formula penalizes extras', () => {
    const r = evaluate({ reference: 'abcd', entered: 'abcdXXXX', elapsedMs: MIN, policy: { ...cp, accuracyFormula: 'entered' } });
    expect(r.accuracy).toBe(50);
    expect(evaluate({ reference: 'abcd', entered: 'abcdXXXX', elapsedMs: MIN, policy: cp }).accuracy).toBe(100);
  });
  it('edit-distance formula', () => {
    const r = evaluate({ reference: 'abcd', entered: 'abxd', elapsedMs: MIN, policy: { ...cp, accuracyFormula: 'edit-distance' } });
    expect(r.accuracy).toBe(75);
  });
});

describe('speed', () => {
  it('gross = entered/min, net = correct/min', () => {
    const r = evaluate({ reference: 'abcd', entered: 'abxd', elapsedMs: MIN, policy: cp });
    expect(r.grossSpeed).toBe(4);
    expect(r.netSpeed).toBe(3);
  });
  it('scales with elapsed time', () => {
    const r = evaluate({ reference: 'abcd', entered: 'abcd', elapsedMs: 30000, policy: cp });
    expect(r.grossSpeed).toBe(8);
  });
  it('wpm needs an explicit elements-per-word rule', () => {
    expect(() => evaluate({ reference: 'a', entered: 'a', elapsedMs: MIN, policy: { ...cp, speedUnit: { kind: 'wpm', elementsPerWord: 0 } } })).toThrow(RangeError);
    const t = 'abcdefghij';
    const r = evaluate({ reference: t, entered: t, elapsedMs: MIN, policy: { ...cp, speedUnit: { kind: 'wpm', elementsPerWord: 5 } } });
    expect(r.grossSpeed).toBe(2);
    expect(r.netSpeed).toBe(2);
  });
  it('deduction policy uses its own penalty', () => {
    const r = evaluate({ reference: 'abcdefghij', entered: 'abXdefghij', elapsedMs: MIN, policy: { ...cp, netSpeedFormula: 'deduction', deductionPenalty: 2 } });
    expect(r.counts.errors).toBe(1);
    expect(r.netSpeed).toBe(8);
  });
  it('zero elapsed gives zero speed, a warning, and no Infinity', () => {
    const r = evaluate({ reference: 'abc', entered: 'abc', elapsedMs: 0, policy: cp });
    expect(r.grossSpeed).toBe(0);
    expect(r.netSpeed).toBe(0);
    expect(r.warnings).toContain('ZERO_ELAPSED');
  });
});

describe('reference scope', () => {
  it('full scope counts the untyped tail as missing', () => {
    const r = evaluate({ reference: 'abcdefgh', entered: 'abcd', elapsedMs: MIN, policy: cp });
    expect(r.counts).toMatchObject({ missing: 4, correct: 4 });
    expect(r.accuracy).toBe(50);
    expect(r.passageCompleted).toBe(false);
  });
  it('typed-prefix scope grades only what was reached', () => {
    const r = evaluate({ reference: 'abcdefgh', entered: 'abcd', elapsedMs: MIN, policy: { ...cp, referenceScope: 'typed-prefix' } });
    expect(r.counts).toMatchObject({ missing: 0, correct: 4, referenceTotal: 4, referenceFull: 8 });
    expect(r.accuracy).toBe(100);
    expect(r.passageCompleted).toBe(false);
  });
  it('typed-prefix handles a skipped element inside the typed region', () => {
    const r = evaluate({ reference: 'abcdefgh', entered: 'abdef', elapsedMs: MIN, policy: { ...cp, referenceScope: 'typed-prefix' } });
    expect(r.counts).toMatchObject({ correct: 5, missing: 1, extra: 0, referenceTotal: 6 });
  });
  it('typed-prefix tie prefers the longer prefix (substitution, not extra)', () => {
    const r = evaluate({ reference: 'ab', entered: 'x', elapsedMs: MIN, policy: { ...cp, referenceScope: 'typed-prefix' } });
    expect(r.counts).toMatchObject({ substituted: 1, extra: 0, missing: 0 });
  });
  it('typed-prefix completes when the whole passage is typed', () => {
    const r = evaluate({ reference: 'abc', entered: 'abc', elapsedMs: MIN, policy: { ...cp, referenceScope: 'typed-prefix' } });
    expect(r.passageCompleted).toBe(true);
  });
});
