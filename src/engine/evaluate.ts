import { align } from './align';
import { normalizeText } from './normalize';
import { resolvePolicy } from './policy';
import { segmentText } from './segment';
import {
  ENGINE_VERSION,
  type EvaluationPolicy,
  type EvaluationResult,
  type SpeedUnit,
  type Warning,
} from './types';

const round2 = (x: number) => Math.round(x * 100) / 100;

function unitDivisor(unit: SpeedUnit): number {
  return unit.kind === 'wpm' ? unit.elementsPerWord : 1;
}

export interface EvaluateInput {
  reference: string;
  entered: string;
  elapsedMs: number;
  policy?: Partial<EvaluationPolicy>;
}

/**
 * Pure, deterministic evaluation of a typing attempt.
 * Original strings are returned untouched; comparison runs on normalized copies.
 */
export function evaluate(input: EvaluateInput): EvaluationResult {
  const policy = resolvePolicy(input.policy);
  const refNorm = normalizeText(input.reference, policy.normalization);
  const entNorm = normalizeText(input.entered, policy.normalization);
  const refSegs = segmentText(refNorm, policy.segmentation);
  const entSegs = segmentText(entNorm, policy.segmentation);

  const { ops, referenceInScope, editDistance } = align(refSegs, entSegs, {
    referencePrefix: policy.referenceScope === 'typed-prefix',
    maxCells: policy.maxAlignmentCells,
  });

  let correct = 0;
  let substituted = 0;
  let missing = 0;
  let extra = 0;
  for (const op of ops) {
    if (op.type === 'correct') correct++;
    else if (op.type === 'substitute') substituted++;
    else if (op.type === 'missing') missing++;
    else extra++;
  }
  const entered = entSegs.length;
  const errors = substituted + missing + extra;

  const warnings: Warning[] = [];
  if (refSegs.length === 0) warnings.push('EMPTY_REFERENCE');
  if (entered === 0) warnings.push('EMPTY_ENTRY');

  // Accuracy — never divides by zero; an empty denominator yields 0 and a warning.
  let accuracy = 0;
  switch (policy.accuracyFormula) {
    case 'reference':
      accuracy = referenceInScope > 0 ? (correct / referenceInScope) * 100 : 0;
      break;
    case 'entered':
      accuracy = entered > 0 ? (correct / entered) * 100 : 0;
      break;
    case 'edit-distance': {
      const denom = Math.max(referenceInScope, entered);
      accuracy = denom > 0 ? Math.max(0, 1 - editDistance / denom) * 100 : 0;
      break;
    }
  }

  // Speed
  let elapsedForSpeed = Math.max(0, input.elapsedMs);
  if (elapsedForSpeed <= 0) warnings.push('ZERO_ELAPSED');
  elapsedForSpeed = Math.max(elapsedForSpeed, policy.minElapsedMsForSpeed);
  const minutes = elapsedForSpeed / 60000;
  const div = unitDivisor(policy.speedUnit);
  const hasTime = input.elapsedMs > 0 && minutes > 0;
  const gross = hasTime ? entered / minutes / div : 0;
  const netElements =
    policy.netSpeedFormula === 'deduction'
      ? Math.max(0, entered - policy.deductionPenalty * errors)
      : correct;
  const net = hasTime ? netElements / minutes / div : 0;

  const passageCompleted = refSegs.length > 0 && referenceInScope === refSegs.length && missing === 0;

  return {
    engineVersion: ENGINE_VERSION,
    policy,
    counts: {
      referenceTotal: referenceInScope,
      referenceFull: refSegs.length,
      entered,
      correct,
      substituted,
      missing,
      extra,
      errors,
      enteredErrors: substituted + extra,
      editDistance,
    },
    accuracy: round2(accuracy),
    grossSpeed: round2(gross),
    netSpeed: round2(net),
    speedUnit: policy.speedUnit,
    elapsedMs: Math.max(0, input.elapsedMs),
    passageCompleted,
    ops,
    warnings,
    original: { reference: input.reference, entered: input.entered },
    normalized: { reference: refNorm, entered: entNorm },
  };
}
