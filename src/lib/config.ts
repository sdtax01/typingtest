import type { Lesson, Passage, TestConfig, TestMode } from './types';

export const DURATIONS_MIN = [1, 3, 5, 10, 15] as const;

export function defaultConfig(passage: Passage, mode: TestMode = 'practice'): TestConfig {
  return {
    mode,
    passage: { id: passage.id, title: passage.title, text: passage.text, version: passage.version },
    durationSec: 300,
    completionMode: false,
    minAccuracy: mode === 'exam' ? 95 : 90,
    minNetSpeed: 0,
    segmentation: 'grapheme',
    liveHighlight: mode === 'practice',
    fontScale: 'lg',
    allowPaste: false,
    allowPause: mode === 'practice',
  };
}

/** Builds an immutable config snapshot from a lesson + its passage. */
export function configFromLesson(l: Lesson, p: Passage): TestConfig {
  return {
    ...defaultConfig(p, l.mode),
    lessonId: l.id,
    durationSec: l.durationSec,
    completionMode: l.requireCompletion,
    minAccuracy: l.minAccuracy,
    minNetSpeed: l.minNetSpeed,
    segmentation: l.segmentation,
  };
}
