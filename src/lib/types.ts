import type { EvaluationCounts, EvaluationPolicy, LessonCriteria, LessonFailure, SegmentationUnit } from '../engine';
import type { FinishReason } from './timer';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type TestMode = 'practice' | 'exam';

export interface Passage {
  id: string;
  title: string;
  text: string;
  difficulty: Difficulty;
  version: number;
  published: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  passageId: string;
  difficulty: Difficulty;
  mode: TestMode;
  durationSec: number;
  minAccuracy: number;
  minNetSpeed: number;
  requireCompletion: boolean;
  segmentation: SegmentationUnit;
  published: boolean;
  sortOrder: number;
}

export type FontScale = 'md' | 'lg' | 'xl';

export interface TestConfig {
  mode: TestMode;
  /** Immutable snapshot of the passage used for this attempt. */
  passage: { id: string; title: string; text: string; version: number };
  lessonId?: string;
  durationSec: number;
  completionMode: boolean;
  minAccuracy: number;
  minNetSpeed: number;
  segmentation: SegmentationUnit;
  liveHighlight: boolean;
  fontScale: FontScale;
  allowPaste: boolean;
  allowPause: boolean;
}

export interface AttemptRecord {
  /** Also used as the client submission id (duplicate protection on the server). */
  id: string;
  mode: TestMode;
  passageId: string;
  passageTitle: string;
  passageVersion: number;
  lessonId?: string;
  startedAt: string;
  completedAt: string;
  configuredDurationSec: number;
  elapsedMs: number;
  finishReason: FinishReason;
  reference: string;
  entered: string;
  policy: EvaluationPolicy;
  engineVersion: string;
  accuracy: number;
  grossSpeed: number;
  netSpeed: number;
  counts: EvaluationCounts;
  criteria: LessonCriteria;
  passed: boolean;
  failures: LessonFailure[];
}
