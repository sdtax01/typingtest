import type { SegmentationUnit } from './types';

const VIRAMA = 0x094d;
const ZWNJ = 0x200c;
const ZWJ = 0x200d;
const MARK = /\p{M}/u;

const isJoiner = (cp: number) => cp === ZWJ || cp === ZWNJ;
/** Devanagari independent vowels and consonants (incl. 0958–095F, 0960–0961). */
const isDevaLetter = (cp: number) => (cp >= 0x0904 && cp <= 0x0939) || (cp >= 0x0958 && cp <= 0x0961) || cp === 0x093d;

/** Unicode code points (not UTF-16 units). */
export function segmentCodePoints(text: string): string[] {
  return Array.from(text);
}

/**
 * Deterministic akshara-like segmentation (engine independent):
 * consonant [nukta] (virama consonant)* [vowel sign] [anusvara/chandrabindu/visarga].
 * Every space, newline, punctuation mark, digit and Latin letter is its own element.
 */
export function segmentAkshara(text: string): string[] {
  const out: string[] = [];
  let afterVirama = false;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const attach = out.length > 0 && (MARK.test(ch) || isJoiner(cp) || (afterVirama && isDevaLetter(cp)));
    if (attach) out[out.length - 1] += ch;
    else out.push(ch);
    if (cp === VIRAMA) afterVirama = true;
    else if (isJoiner(cp)) {
      /* keep state: virama + ZWJ/ZWNJ + consonant still joins */
    } else afterVirama = false;
  }
  return out;
}

export function isGraphemeSegmenterAvailable(): boolean {
  return typeof Intl !== 'undefined' && typeof (Intl as any).Segmenter === 'function';
}

/**
 * Grapheme clusters via Intl.Segmenter. Conjunct handling (UAX #29 GB9c) depends on the
 * browser's ICU/Unicode version, so this falls back to the akshara segmenter if unavailable.
 */
export function segmentGraphemes(text: string): string[] {
  if (!isGraphemeSegmenterAvailable()) return segmentAkshara(text);
  const seg = new (Intl as any).Segmenter('mr', { granularity: 'grapheme' });
  return Array.from(seg.segment(text) as Iterable<{ segment: string }>, (s) => s.segment);
}

export function segmentText(text: string, unit: SegmentationUnit): string[] {
  switch (unit) {
    case 'codepoint':
      return segmentCodePoints(text);
    case 'akshara':
      return segmentAkshara(text);
    case 'grapheme':
      return segmentGraphemes(text);
  }
}
