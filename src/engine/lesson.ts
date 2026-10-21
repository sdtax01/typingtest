import type { EvaluationResult, LessonCriteria, LessonFailure, LessonOutcome } from './types';

/** Evaluates pass/fail and returns every reason a lesson was not passed. */
export function evaluateLesson(result: EvaluationResult, criteria: LessonCriteria): LessonOutcome {
  const failures: LessonFailure[] = [];
  if (result.counts.entered === 0) {
    failures.push({ code: 'NO_INPUT', message: 'Nothing was typed.' });
  }
  if (criteria.minAccuracy !== undefined && result.accuracy < criteria.minAccuracy) {
    failures.push({
      code: 'ACCURACY_TOO_LOW',
      message: `Accuracy ${result.accuracy}% is below the required ${criteria.minAccuracy}%.`,
      actual: result.accuracy,
      required: criteria.minAccuracy,
    });
  }
  if (criteria.minNetSpeed !== undefined && result.netSpeed < criteria.minNetSpeed) {
    failures.push({
      code: 'NET_SPEED_TOO_LOW',
      message: `Net speed ${result.netSpeed} is below the required ${criteria.minNetSpeed}.`,
      actual: result.netSpeed,
      required: criteria.minNetSpeed,
    });
  }
  if (criteria.requirePassageCompletion && !result.passageCompleted) {
    failures.push({ code: 'PASSAGE_NOT_COMPLETED', message: 'The passage was not completed.' });
  }
  if (criteria.timeLimitMs !== undefined && result.elapsedMs > criteria.timeLimitMs) {
    failures.push({
      code: 'TIME_LIMIT_EXCEEDED',
      message: `Time ${Math.round(result.elapsedMs / 1000)}s exceeded the limit of ${Math.round(criteria.timeLimitMs / 1000)}s.`,
      actual: result.elapsedMs,
      required: criteria.timeLimitMs,
    });
  }
  return { passed: failures.length === 0, failures };
}
