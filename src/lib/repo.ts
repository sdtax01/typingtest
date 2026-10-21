import { bundledLessons, bundledPassages } from '../data/catalog';
import { attemptsStore } from './storage';
import { supabase } from './supabase';
import type { AttemptRecord, Lesson, Passage } from './types';

export interface UsageStats {
  totalAttempts: number;
  uniqueUsers: number;
  avgAccuracy: number;
  avgNetSpeed: number;
  passRate: number;
}

export interface Repo {
  mode: 'local' | 'supabase';
  listPassages(): Promise<Passage[]>;
  listLessons(): Promise<Lesson[]>;
  saveAttempt(a: AttemptRecord, userId: string | null): Promise<{ stored: 'local' | 'cloud' }>;
  listAttempts(userId: string | null): Promise<AttemptRecord[]>;
  getAttempt(id: string, userId: string | null): Promise<AttemptRecord | undefined>;
}

export interface AdminRepo {
  listAllPassages(): Promise<Passage[]>;
  listAllLessons(): Promise<Lesson[]>;
  savePassage(p: Partial<Passage> & { title: string; text: string }): Promise<void>;
  saveLesson(l: Partial<Lesson> & { title: string; passageId: string }): Promise<void>;
  setPassagePublished(id: string, published: boolean): Promise<void>;
  setLessonPublished(id: string, published: boolean): Promise<void>;
  stats(): Promise<UsageStats>;
}

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/* ---------------- mapping ---------------- */
const toPassage = (r: any): Passage => ({ id: r.id, title: r.title, text: r.body, difficulty: r.difficulty, version: r.version, published: r.published });
const toLesson = (r: any): Lesson => ({
  id: r.id, title: r.title, passageId: r.passage_id, difficulty: r.difficulty, mode: r.mode, durationSec: r.duration_sec,
  minAccuracy: Number(r.min_accuracy), minNetSpeed: Number(r.min_net_speed), requireCompletion: r.require_completion,
  segmentation: r.segmentation, published: r.published, sortOrder: r.sort_order,
});
const toResultRow = (a: AttemptRecord, userId: string) => ({
  client_submission_id: a.id,
  user_id: userId,
  passage_id: isUuid(a.passageId) ? a.passageId : null,
  lesson_id: a.lessonId && isUuid(a.lessonId) ? a.lessonId : null,
  passage_title: a.passageTitle,
  passage_version: a.passageVersion,
  reference_snapshot: a.reference,
  entered_text: a.entered,
  mode: a.mode,
  started_at: a.startedAt,
  completed_at: a.completedAt,
  configured_duration_sec: a.configuredDurationSec,
  elapsed_ms: Math.round(a.elapsedMs),
  finish_reason: a.finishReason,
  normalization_policy: a.policy.normalization,
  segmentation_policy: a.policy.segmentation,
  evaluation_policy: a.policy,
  engine_version: a.engineVersion,
  accuracy: a.accuracy,
  gross_speed: a.grossSpeed,
  net_speed: a.netSpeed,
  correct_count: a.counts.correct,
  substitution_count: a.counts.substituted,
  missing_count: a.counts.missing,
  extra_count: a.counts.extra,
  reference_total: a.counts.referenceTotal,
  entered_total: a.counts.entered,
  criteria: a.criteria,
  passed: a.passed,
  failures: a.failures,
});
const fromResultRow = (r: any): AttemptRecord => ({
  id: r.client_submission_id,
  mode: r.mode,
  passageId: r.passage_id ?? '',
  passageTitle: r.passage_title,
  passageVersion: r.passage_version,
  lessonId: r.lesson_id ?? undefined,
  startedAt: r.started_at,
  completedAt: r.completed_at,
  configuredDurationSec: r.configured_duration_sec,
  elapsedMs: r.elapsed_ms,
  finishReason: r.finish_reason,
  reference: r.reference_snapshot,
  entered: r.entered_text ?? '',
  policy: r.evaluation_policy,
  engineVersion: r.engine_version,
  accuracy: Number(r.accuracy),
  grossSpeed: Number(r.gross_speed),
  netSpeed: Number(r.net_speed),
  counts: {
    referenceTotal: r.reference_total, referenceFull: r.reference_total, entered: r.entered_total,
    correct: r.correct_count, substituted: r.substitution_count, missing: r.missing_count, extra: r.extra_count,
    errors: r.substitution_count + r.missing_count + r.extra_count, enteredErrors: r.substitution_count + r.extra_count, editDistance: 0,
  },
  criteria: r.criteria ?? {},
  passed: r.passed,
  failures: r.failures ?? [],
});

/* ---------------- local ---------------- */
export const localRepo: Repo = {
  mode: 'local',
  listPassages: async () => bundledPassages.filter((p) => p.published),
  listLessons: async () => bundledLessons.filter((l) => l.published).sort((a, b) => a.sortOrder - b.sortOrder),
  async saveAttempt(a) {
    attemptsStore.add(a);
    return { stored: 'local' };
  },
  listAttempts: async () => attemptsStore.list(),
  getAttempt: async (id) => attemptsStore.get(id),
};

/* ---------------- supabase ---------------- */
function mustClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export const cloudRepo: Repo = {
  mode: 'supabase',
  async listPassages() {
    const { data, error } = await mustClient().from('typing_passages').select('*').eq('published', true).order('title');
    if (error) throw error;
    return (data ?? []).map(toPassage);
  },
  async listLessons() {
    const { data, error } = await mustClient().from('typing_lessons').select('*').eq('published', true).order('sort_order');
    if (error) throw error;
    return (data ?? []).map(toLesson);
  },
  async saveAttempt(a, userId) {
    if (!userId) {
      attemptsStore.add(a);
      return { stored: 'local' };
    }
    // client_submission_id is UNIQUE: a retry or double click upserts nothing new.
    const { error } = await mustClient()
      .from('test_results')
      .upsert(toResultRow(a, userId), { onConflict: 'user_id,client_submission_id', ignoreDuplicates: true });
    if (error) throw error;
    return { stored: 'cloud' };
  },
  async listAttempts(userId) {
    if (!userId) return attemptsStore.list();
    const { data, error } = await mustClient().from('test_results').select('*').eq('user_id', userId).order('completed_at', { ascending: false }).limit(200);
    if (error) throw error;
    return (data ?? []).map(fromResultRow);
  },
  async getAttempt(id, userId) {
    const local = attemptsStore.get(id);
    if (local || !userId) return local;
    const { data, error } = await mustClient().from('test_results').select('*').eq('user_id', userId).eq('client_submission_id', id).maybeSingle();
    if (error) throw error;
    return data ? fromResultRow(data) : undefined;
  },
};

export const repo: Repo = supabase ? cloudRepo : localRepo;

/* ---------------- admin (RLS enforces authorization; this is only the client) ---------------- */
export const adminRepo: AdminRepo = {
  async listAllPassages() {
    const { data, error } = await mustClient().from('typing_passages').select('*').order('title');
    if (error) throw error;
    return (data ?? []).map(toPassage);
  },
  async listAllLessons() {
    const { data, error } = await mustClient().from('typing_lessons').select('*').order('sort_order');
    if (error) throw error;
    return (data ?? []).map(toLesson);
  },
  async savePassage(p) {
    const row: any = { title: p.title, body: p.text, difficulty: p.difficulty ?? 'beginner', published: p.published ?? false };
    const c = mustClient();
    const res = p.id ? await c.from('typing_passages').update(row).eq('id', p.id) : await c.from('typing_passages').insert(row);
    if (res.error) throw res.error; // version is bumped by a DB trigger when the body changes
  },
  async saveLesson(l) {
    const row: any = {
      title: l.title, passage_id: l.passageId, difficulty: l.difficulty ?? 'beginner', mode: l.mode ?? 'practice',
      duration_sec: l.durationSec ?? 300, min_accuracy: l.minAccuracy ?? 90, min_net_speed: l.minNetSpeed ?? 0,
      require_completion: l.requireCompletion ?? false, segmentation: l.segmentation ?? 'grapheme',
      published: l.published ?? false, sort_order: l.sortOrder ?? 100,
    };
    const c = mustClient();
    const res = l.id ? await c.from('typing_lessons').update(row).eq('id', l.id) : await c.from('typing_lessons').insert(row);
    if (res.error) throw res.error;
  },
  async setPassagePublished(id, published) {
    const { error } = await mustClient().from('typing_passages').update({ published }).eq('id', id);
    if (error) throw error;
  },
  async setLessonPublished(id, published) {
    const { error } = await mustClient().from('typing_lessons').update({ published }).eq('id', id);
    if (error) throw error;
  },
  async stats() {
    const { data, error } = await mustClient().rpc('admin_usage_stats');
    if (error) throw error;
    const r = Array.isArray(data) ? data[0] : data;
    return {
      totalAttempts: Number(r?.total_attempts ?? 0), uniqueUsers: Number(r?.unique_users ?? 0),
      avgAccuracy: Number(r?.avg_accuracy ?? 0), avgNetSpeed: Number(r?.avg_net_speed ?? 0), passRate: Number(r?.pass_rate ?? 0),
    };
  },
};
