export const ENGINE_VERSION = '1.0.0';

export type SegmentationUnit = 'codepoint' | 'grapheme' | 'akshara';

export interface NormalizationPolicy {
  /** Unicode normalization form applied to both reference and entered text. */
  form: 'NFC';
  /** 'lf' converts CRLF / CR to LF before comparison. 'preserve' leaves them untouched. */
  lineEndings: 'lf' | 'preserve';
  /** Collapse runs of spaces/tabs to one space (newlines are kept). Off by default: spaces are meaningful. */
  collapseWhitespace: boolean;
  /** Trim leading/trailing whitespace of the whole text. Off by default. */
  trim: boolean;
}

export type AccuracyFormula =
  /** correct / reference elements (aligned scope) * 100 — default */
  | 'reference'
  /** correct / entered elements * 100 */
  | 'entered'
  /** (1 - editDistance / max(reference, entered)) * 100 */
  | 'edit-distance';

export type NetSpeedFormula =
  /** correct aligned elements / minutes — default */
  | 'correct-per-minute'
  /** max(0, entered - penalty * (substituted+missing+extra)) / minutes */
  | 'deduction';

export type SpeedUnit =
  | { kind: 'epm' }
  /** Only use when an examination defines how many elements make one word. */
  | { kind: 'wpm'; elementsPerWord: number };

export type ReferenceScope =
  /** Compare against the whole reference passage (missing tail counts as missing). */
  | 'full'
  /**
   * Compare against the best-matching reference prefix (end-free alignment).
   * Right for timed tests where the typist is not expected to finish the passage.
   */
  | 'typed-prefix';

export interface EvaluationPolicy {
  normalization: NormalizationPolicy;
  segmentation: SegmentationUnit;
  accuracyFormula: AccuracyFormula;
  netSpeedFormula: NetSpeedFormula;
  /** Used only by 'deduction'. */
  deductionPenalty: number;
  speedUnit: SpeedUnit;
  referenceScope: ReferenceScope;
  /** Elapsed time below this is treated as this value when computing speed (avoids huge spikes). */
  minElapsedMsForSpeed: number;
  /** Safety guard on DP table size (reference x entered elements). */
  maxAlignmentCells: number;
}

export type OpType = 'correct' | 'substitute' | 'missing' | 'extra';

export interface AlignmentOp {
  type: OpType;
  /** Reference element (absent for 'extra'). */
  ref?: string;
  /** Typed element (absent for 'missing'). */
  typed?: string;
  refIndex?: number;
  typedIndex?: number;
}

export interface EvaluationCounts {
  referenceTotal: number; // reference elements in scope
  referenceFull: number; // all reference elements
  entered: number;
  correct: number;
  substituted: number;
  missing: number;
  extra: number;
  /** substituted + missing + extra */
  errors: number;
  /** substituted + extra: errors attributable to what was typed */
  enteredErrors: number;
  editDistance: number;
}

export type Warning = 'EMPTY_REFERENCE' | 'EMPTY_ENTRY' | 'ZERO_ELAPSED';

export interface EvaluationResult {
  engineVersion: string;
  policy: EvaluationPolicy;
  counts: EvaluationCounts;
  /** 0-100, rounded to 2 decimals. */
  accuracy: number;
  /** Speed in the policy's unit. */
  grossSpeed: number;
  netSpeed: number;
  speedUnit: SpeedUnit;
  elapsedMs: number;
  /** True when the whole reference passage was matched/covered (typed-prefix scope reached its end). */
  passageCompleted: boolean;
  ops: AlignmentOp[];
  warnings: Warning[];
  /** Original strings, untouched, for audit/display. */
  original: { reference: string; entered: string };
  normalized: { reference: string; entered: string };
}

export interface LessonCriteria {
  minAccuracy?: number;
  minNetSpeed?: number;
  requirePassageCompletion?: boolean;
  /** Maximum allowed elapsed time. */
  timeLimitMs?: number;
}

export type FailureCode =
  | 'ACCURACY_TOO_LOW'
  | 'NET_SPEED_TOO_LOW'
  | 'PASSAGE_NOT_COMPLETED'
  | 'TIME_LIMIT_EXCEEDED'
  | 'NO_INPUT';

export interface LessonFailure {
  code: FailureCode;
  message: string;
  actual?: number;
  required?: number;
}

export interface LessonOutcome {
  passed: boolean;
  failures: LessonFailure[];
}
