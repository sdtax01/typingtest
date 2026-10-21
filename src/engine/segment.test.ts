import { describe, expect, it } from 'vitest';
import { segmentAkshara, segmentCodePoints, segmentGraphemes, isGraphemeSegmenterAvailable, segmentText } from './segment';
import { segmentationFixtures } from './fixtures';
import { normalizeText } from './normalize';

describe('segmentation fixtures', () => {
  for (const f of segmentationFixtures) {
    it(`akshara: ${f.name}`, () => {
      const text = normalizeText(f.text);
      const expected = f.akshara.map((a) => a.normalize('NFC'));
      expect(segmentAkshara(text)).toEqual(expected);
    });
    it(`code points: ${f.name}`, () => {
      expect(segmentCodePoints(f.text).length).toBe(f.codePoints);
    });
  }
});

describe('grapheme segmentation', () => {
  it('reports Intl.Segmenter availability', () => {
    expect(typeof isGraphemeSegmenterAvailable()).toBe('boolean');
  });
  it('returns pieces that rejoin to the input', () => {
    const t = 'महाराष्ट्र ही संतांची भूमी';
    expect(segmentGraphemes(t).join('')).toBe(t);
  });
  it('matches akshara on conjuncts when the engine implements Unicode 15.1+ rules (informational)', () => {
    const t = 'क्षत्रज्ञ';
    const g = segmentGraphemes(t);
    // Older ICU splits conjuncts; newer keeps them whole. Either way it must not lose characters.
    expect(g.join('')).toBe(t);
    expect(g.length).toBeGreaterThanOrEqual(3);
  });
});

describe('segmentText dispatch', () => {
  it('uses the requested unit', () => {
    expect(segmentText('क्ष', 'codepoint')).toHaveLength(3);
    expect(segmentText('क्ष', 'akshara')).toHaveLength(1);
  });
  it('handles empty string', () => {
    expect(segmentText('', 'akshara')).toEqual([]);
    expect(segmentText('', 'codepoint')).toEqual([]);
  });
  it('keeps a ZWJ/ZWNJ inside a conjunct cluster', () => {
    expect(segmentAkshara('क्‍ष')).toHaveLength(1);
    expect(segmentAkshara('क्‌ष')).toHaveLength(1);
  });
  it('does not glue a space onto a trailing virama', () => {
    expect(segmentAkshara('क् ख')).toEqual(['क्', ' ', 'ख']);
  });
});
