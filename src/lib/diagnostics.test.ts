import { describe, expect, it } from 'vitest';
import { diagnoseInput } from './diagnostics';
import { DIAGNOSTIC_SENTENCE } from '../engine/fixtures';

describe('diagnoseInput', () => {
  it('warns on empty input', () => {
    const d = diagnoseInput('', DIAGNOSTIC_SENTENCE);
    expect(d.length).toBe(0);
    expect(d.warnings.length).toBe(1);
    expect(d.matchPercent).toBeNull();
  });
  it('accepts the exact sample with no warnings and 100% match', () => {
    const d = diagnoseInput(DIAGNOSTIC_SENTENCE, DIAGNOSTIC_SENTENCE);
    expect(d.warnings).toEqual([]);
    expect(d.matchPercent).toBe(100);
    expect(d.devanagariCount).toBeGreaterThan(40);
  });
  it('lists code points in U+XXXX form', () => {
    const d = diagnoseInput('म', DIAGNOSTIC_SENTENCE);
    expect(d.codePoints).toEqual([{ ch: 'म', hex: 'U+092E' }]);
  });
  it('flags replacement characters', () => {
    expect(diagnoseInput('म�ठी', DIAGNOSTIC_SENTENCE).warnings.some((w) => w.includes('U+FFFD'))).toBe(true);
  });
  it('flags runs of question marks', () => {
    expect(diagnoseInput('???? ??', DIAGNOSTIC_SENTENCE).warnings.some((w) => w.includes('??'))).toBe(true);
  });
  it('flags Latin-only input (keyboard likely in English mode)', () => {
    const d = diagnoseInput('maze nav', DIAGNOSTIC_SENTENCE);
    expect(d.devanagariCount).toBe(0);
    expect(d.warnings.some((w) => w.includes('देवनागरी'))).toBe(true);
  });
  it('flags legacy-font style Latin-1 output', () => {
    expect(diagnoseInput('ÃÄÅ', DIAGNOSTIC_SENTENCE).warnings.some((w) => w.includes('legacy'))).toBe(true);
  });
  it('partial correct typing is measured against the typed prefix only', () => {
    const d = diagnoseInput(DIAGNOSTIC_SENTENCE.slice(0, DIAGNOSTIC_SENTENCE.indexOf(' ', 20)), DIAGNOSTIC_SENTENCE);
    expect(d.matchPercent).toBe(100);
  });
});
