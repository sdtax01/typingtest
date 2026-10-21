import type { EvaluationPolicy, NormalizationPolicy } from './types';

export const DEFAULT_NORMALIZATION: NormalizationPolicy = {
  form: 'NFC',
  lineEndings: 'lf',
  collapseWhitespace: false,
  trim: false,
};

export const DEFAULT_POLICY: EvaluationPolicy = {
  normalization: DEFAULT_NORMALIZATION,
  segmentation: 'grapheme',
  accuracyFormula: 'reference',
  netSpeedFormula: 'correct-per-minute',
  deductionPenalty: 1,
  speedUnit: { kind: 'epm' },
  referenceScope: 'full',
  minElapsedMsForSpeed: 1000,
  maxAlignmentCells: 40_000_000,
};

export function resolvePolicy(partial?: Partial<EvaluationPolicy>): EvaluationPolicy {
  const p: EvaluationPolicy = {
    ...DEFAULT_POLICY,
    ...partial,
    normalization: { ...DEFAULT_NORMALIZATION, ...(partial?.normalization ?? {}) },
  };
  if (p.speedUnit.kind === 'wpm' && !(p.speedUnit.elementsPerWord > 0)) {
    throw new RangeError('speedUnit.wpm requires a positive elementsPerWord (official conversion rule).');
  }
  if (!(p.deductionPenalty >= 0)) throw new RangeError('deductionPenalty must be >= 0');
  return p;
}
