import { Flag, Pause, Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Metric } from '../components/Metric';
import { evaluate, evaluateLesson, normalizeText, segmentText, type EvaluationPolicy } from '../engine';
import { useAuth } from '../lib/auth';
import { activeConfigStore, attemptsStore } from '../lib/storage';
import { repo } from '../lib/repo';
import { fmtClock, fmtNum } from '../lib/format';
import { TestTimer, type FinishReason } from '../lib/timer';
import type { AttemptRecord, TestConfig } from '../lib/types';

const SIZE = { md: 'text-lg', lg: 'text-2xl', xl: 'text-3xl' } as const;

function policyFor(c: TestConfig): Partial<EvaluationPolicy> {
  return { segmentation: c.segmentation, referenceScope: c.completionMode ? 'full' : 'typed-prefix' };
}

export default function TestPage() {
  const config = useMemo(() => activeConfigStore.get(), []);
  if (!config) {
    return (
      <div className="card p-8 text-center">
        <p className="mb-4">आधी टेस्ट निवडा. · Choose a test first.</p>
        <Link className="btn-primary" to="/configure">टेस्ट निवडा</Link>
      </div>
    );
  }
  return <Workspace config={config} />;
}

type Phase = 'ready' | 'running' | 'paused' | 'submitting';

function Workspace({ config }: { config: TestConfig }) {
  const nav = useNavigate();
  const auth = useAuth();
  const timer = useMemo(() => new TestTimer(config.durationSec * 1000), [config]);
  const [phase, setPhase] = useState<Phase>('ready');
  const [text, setText] = useState('');
  const [tick, setTick] = useState(0);
  const [announce, setAnnounce] = useState('');
  const startedAt = useRef<string>('');
  const submitted = useRef(false);
  const textRef = useRef('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  const attemptId = useMemo(() => crypto.randomUUID(), [config]);
  const policy = useMemo(() => policyFor(config), [config]);

  const refNorm = useMemo(() => normalizeText(config.passage.text), [config]);
  const refSegs = useMemo(() => segmentText(refNorm, config.segmentation), [refNorm, config]);

  // Live metrics are throttled with the timer tick (~4 Hz), not run on every keystroke.
  const live = useMemo(() => {
    const snap = timer.snapshot();
    return evaluate({ reference: config.passage.text, entered: textRef.current, elapsedMs: snap.elapsedMs, policy: { ...policy, referenceScope: 'typed-prefix' } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, config, policy, timer]);

  const finish = useCallback(
    async (reason: FinishReason) => {
      if (submitted.current) return; // duplicate-submission guard (double click, expiry racing manual finish)
      submitted.current = true;
      const final = timer.finish(reason);
      setPhase('submitting');
      const entered = textRef.current;
      const result = evaluate({ reference: config.passage.text, entered, elapsedMs: final.elapsedMs, policy });
      const criteria = {
        minAccuracy: config.minAccuracy,
        minNetSpeed: config.minNetSpeed || undefined,
        requirePassageCompletion: config.completionMode,
        timeLimitMs: config.durationSec * 1000,
      };
      const outcome = evaluateLesson(result, criteria);
      const record: AttemptRecord = {
        id: attemptId, mode: config.mode, passageId: config.passage.id, passageTitle: config.passage.title,
        passageVersion: config.passage.version, lessonId: config.lessonId, startedAt: startedAt.current,
        completedAt: new Date().toISOString(), configuredDurationSec: config.durationSec, elapsedMs: final.elapsedMs,
        finishReason: final.reason, reference: config.passage.text, entered, policy: result.policy,
        engineVersion: result.engineVersion, accuracy: result.accuracy, grossSpeed: result.grossSpeed,
        netSpeed: result.netSpeed, counts: result.counts, criteria, passed: outcome.passed, failures: outcome.failures,
      };
      try {
        await repo.saveAttempt(record, auth.userId);
      } catch {
        // Never lose a finished attempt: fall back to this browser and tell the user on the results page.
        attemptsStore.add(record);
        sessionStorage.setItem('mtt.saveWarning', '1');
      }
      nav(`/results/${record.id}`, { replace: true });
    },
    [attemptId, auth.userId, config, nav, policy, timer],
  );

  // Clock-derived ticking. A hidden tab may throttle this interval; elapsed time is still exact.
  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
      if (timer.isExpired()) {
        setAnnounce('वेळ संपली · Time is up');
        void finish('expired');
      }
    }, 250);
    const onVis = () => {
      setTick((t) => t + 1);
      if (timer.isExpired()) void finish('expired');
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [phase, timer, finish]);

  // Exam mode: warn before accidental navigation while the test is active.
  useEffect(() => {
    if (config.mode !== 'exam' || (phase !== 'running' && phase !== 'paused')) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [config.mode, phase]);

  // Minute announcements for screen readers (not every second).
  const remaining = timer.snapshot().remainingMs;
  useEffect(() => {
    if (phase !== 'running') return;
    const s = Math.ceil(remaining / 1000);
    if (s > 0 && (s % 60 === 0 || s === 30 || s === 10)) setAnnounce(s >= 60 ? `${s / 60} मिनिटे शिल्लक` : `${s} सेकंद शिल्लक`);
  }, [remaining, phase]);

  const start = () => {
    startedAt.current = new Date().toISOString();
    timer.start();
    setPhase('running');
    setAnnounce('टेस्ट सुरू झाली');
    requestAnimationFrame(() => taRef.current?.focus());
  };
  const startOnFirstKey = (v: string) => {
    if (phase === 'ready' && v.length > 0) start();
  };
  const togglePause = () => {
    if (phase === 'running') {
      timer.pause();
      setPhase('paused');
    } else if (phase === 'paused') {
      timer.resume();
      setPhase('running');
      requestAnimationFrame(() => taRef.current?.focus());
    }
  };
  const restart = () => {
    if (!window.confirm('टेस्ट पुन्हा सुरू करायची? सध्याचा मजकूर जाईल. · Restart? Current text will be lost.')) return;
    window.location.reload();
  };

  const onChange = (v: string) => {
    textRef.current = v;
    setText(v);
    startOnFirstKey(v);
    if (config.completionMode && phase !== 'submitting') {
      const n = segmentText(normalizeText(v), config.segmentation).length;
      if (n >= refSegs.length && refSegs.length > 0) {
        setTick((t) => t + 1);
        void finish('completed');
      }
    }
  };

  // Per-element status for the reference panel (live, optional).
  const statusByIndex = useMemo(() => {
    const m = new Map<number, 'correct' | 'wrong' | 'missing'>();
    if (!config.liveHighlight) return m;
    for (const op of live.ops) {
      if (op.refIndex === undefined) continue;
      m.set(op.refIndex, op.type === 'correct' ? 'correct' : op.type === 'substitute' ? 'wrong' : 'missing');
    }
    return m;
  }, [live, config.liveHighlight]);
  const reached = live.counts.referenceTotal;

  const snap = timer.snapshot();
  // Live speed is meaningless in the first seconds (tiny denominator); final results are unaffected.
  const settled = snap.elapsedMs >= 5000;
  const progress = Math.min(100, Math.round((reached / Math.max(1, refSegs.length)) * 100));
  const lowTime = snap.remainingMs <= 30000 && phase === 'running';
  const locked = phase === 'paused' || phase === 'submitting';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold font-deva">{config.passage.title}</h1>
          <p className="text-xs text-ink-500">
            {config.mode === 'exam' ? 'परीक्षा · Examination' : 'सराव · Practice'} · किमान अचूकता {config.minAccuracy}%
            {config.completionMode ? ' · उतारा पूर्ण करणे आवश्यक' : ''}
          </p>
        </div>
        <div className={`px-5 py-2 rounded-2xl text-3xl font-bold tabular-nums ${lowTime ? 'bg-bad-50 text-bad-600' : 'bg-white text-ink-900 border border-ink-100'}`} role="timer" aria-label="उरलेला वेळ · Time remaining">
          {fmtClock(snap.remainingMs)}
        </div>
      </div>
      <div className="sr-only" aria-live="polite" role="status">{announce}</div>

      <div className="flex flex-wrap gap-3" aria-label="थेट आकडेवारी · Live statistics">
        <Metric label="एकूण वेग" value={settled ? fmtNum(live.grossSpeed, 0) : '—'} unit="घटक/मि" tone="brand" hint="Gross" />
        <Metric label="निव्वळ वेग" value={settled ? fmtNum(live.netSpeed, 0) : '—'} unit="घटक/मि" tone="ok" hint="Net" />
        <Metric label="अचूकता" value={`${fmtNum(live.accuracy, 1)}%`} tone={live.accuracy >= config.minAccuracy || live.counts.entered === 0 ? 'ok' : 'bad'} />
        <Metric label="चुका" value={live.counts.errors} tone={live.counts.errors ? 'bad' : 'default'} hint="Errors" />
        <div className="flex-1 min-w-[10rem] rounded-xl bg-white border border-ink-100 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">प्रगती · Progress</div>
          <div className="mt-2 h-2 rounded-full bg-ink-100 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="h-full bg-brand-500 transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs text-ink-500 mt-1 tabular-nums">{progress}%</div>
        </div>
      </div>

      <section className="card p-5" aria-label="संदर्भ मजकूर · Reference text">
        <p lang="mr" className={`ref-text font-deva ${SIZE[config.fontScale]}`} data-testid="reference">
          {refSegs.map((s, i) => {
            const st = statusByIndex.get(i);
            const cls = i === reached && phase !== 'ready' && config.liveHighlight ? 'el-current' : st === 'correct' ? 'el-correct' : st === 'wrong' ? 'el-wrong' : st === 'missing' ? 'el-missing' : 'el-pending';
            return <span key={i} className={cls}>{s}</span>;
          })}
        </p>
      </section>

      <section className="card p-3 relative" aria-label="टाइपिंग क्षेत्र · Typing area">
        <label htmlFor="typing" className="sr-only">येथे टाइप करा</label>
        <textarea
          id="typing"
          ref={taRef}
          lang="mr"
          dir="ltr"
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          data-testid="typing-area"
          value={text}
          readOnly={locked}
          rows={6}
          placeholder={phase === 'ready' ? 'ISM V6 चालू करून येथे टाइप करायला सुरुवात करा — टाइमर पहिल्या अक्षरापासून सुरू होईल.' : ''}
          onChange={(e) => onChange(e.target.value)}
          onPaste={(e) => !config.allowPaste && e.preventDefault()}
          onDrop={(e) => !config.allowPaste && e.preventDefault()}
          className={`w-full resize-y rounded-xl border-2 border-ink-100 focus:border-brand-500 p-4 font-deva ${SIZE[config.fontScale]} leading-[2]`}
        />
        {phase === 'paused' && (
          <div className="absolute inset-3 grid place-items-center rounded-xl bg-white/90 backdrop-blur-sm">
            <div className="text-center"><p className="mb-3 font-semibold">थांबवले · Paused</p><button className="btn-primary" onClick={togglePause}><Play size={16} aria-hidden /> सुरू ठेवा</button></div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2">
          {phase === 'ready' && <button className="btn-primary" onClick={start}><Play size={16} aria-hidden /> सुरू करा</button>}
          {config.allowPause && (phase === 'running' || phase === 'paused') && (
            <button className="btn-ghost" onClick={togglePause}>{phase === 'running' ? <><Pause size={16} aria-hidden /> थांबवा</> : <><Play size={16} aria-hidden /> सुरू ठेवा</>}</button>
          )}
          {config.mode === 'practice' && <button className="btn-ghost" onClick={restart}><RotateCcw size={16} aria-hidden /> पुन्हा सुरू</button>}
        </div>
        <button className="btn-accent" disabled={phase === 'ready' || phase === 'submitting'} onClick={() => finish('manual')} data-testid="finish">
          <Flag size={16} aria-hidden /> टेस्ट पूर्ण करा
        </button>
      </div>
      {!config.allowPaste && <p className="text-xs text-ink-500">पेस्ट बंद आहे. ISM V6 मधून थेट टाइप केलेला मजकूर स्वीकारला जातो; अ‍ॅप कोणतीही अक्षरे बदलत नाही.</p>}
    </div>
  );
}
