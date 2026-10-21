import type { LessonFailure } from '../engine';

export function fmtClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)} मि ${s % 60} से`;
}

export function fmtNum(n: number, digits = 1): string {
  return Number.isFinite(n) ? n.toFixed(digits) : '0';
}

export function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Marathi explanation for every reason a test was not passed. */
export function failureMr(f: LessonFailure): string {
  switch (f.code) {
    case 'ACCURACY_TOO_LOW':
      return `अचूकता ${f.actual}% आहे; किमान ${f.required}% आवश्यक.`;
    case 'NET_SPEED_TOO_LOW':
      return `निव्वळ वेग ${f.actual} आहे; किमान ${f.required} आवश्यक.`;
    case 'PASSAGE_NOT_COMPLETED':
      return 'उतारा पूर्ण टाइप केला नाही.';
    case 'TIME_LIMIT_EXCEEDED':
      return 'दिलेली वेळमर्यादा ओलांडली.';
    case 'NO_INPUT':
      return 'काहीही टाइप केले गेले नाही.';
  }
}
