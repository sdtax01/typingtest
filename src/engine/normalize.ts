import type { NormalizationPolicy } from './types';
import { DEFAULT_NORMALIZATION } from './policy';

/**
 * Normalizes text for comparison only. Callers must keep the original string for display/audit.
 * Matras, virama, punctuation and spaces are never stripped.
 */
export function normalizeText(text: string, policy: NormalizationPolicy = DEFAULT_NORMALIZATION): string {
  let t = text.normalize(policy.form);
  if (policy.lineEndings === 'lf') t = t.replace(/\r\n?/g, '\n');
  if (policy.collapseWhitespace) t = t.replace(/[ \t]+/g, ' ');
  if (policy.trim) t = t.trim();
  return t;
}
