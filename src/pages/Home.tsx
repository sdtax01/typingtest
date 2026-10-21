import { ArrowRight, BookOpen, CircleCheck, CircleHelp, ClipboardCheck, Keyboard, Timer } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Empty, ErrorBox, Metric, Spinner } from '../components/Metric';
import { difficultyLabel } from '../data/catalog';
import { useAuth } from '../lib/auth';
import { configFromLesson } from '../lib/config';
import { fmtDate, fmtNum } from '../lib/format';
import { repo } from '../lib/repo';
import { activeConfigStore, ismStore } from '../lib/storage';
import { useAsync } from '../lib/useAsync';

export default function Home() {
  const nav = useNavigate();
  const auth = useAuth();
  const lessons = useAsync(() => Promise.all([repo.listLessons(), repo.listPassages()]), []);
  const attempts = useAsync(() => repo.listAttempts(auth.userId), [auth.userId]);
  const ism = ismStore.get();
  const recent = attempts.data?.slice(0, 5) ?? [];
  const all = attempts.data ?? [];
  const best = all.reduce((m, a) => Math.max(m, a.netSpeed), 0);
  const avgAcc = all.length ? all.reduce((s, a) => s + a.accuracy, 0) / all.length : 0;
  const passedLessons = new Set(all.filter((a) => a.passed && a.lessonId).map((a) => a.lessonId));

  const startLesson = (lessonId: string) => {
    const [ls, ps] = lessons.data!;
    const l = ls.find((x) => x.id === lessonId)!;
    const p = ps.find((x) => x.id === l.passageId);
    if (!p) return;
    activeConfigStore.set(configFromLesson(l, p));
    nav('/test');
  };

  return (
    <div className="space-y-8">
      <section className="card overflow-hidden">
        <div className="grid md:grid-cols-[1.4fr_1fr]">
          <div className="p-6 md:p-10">
            <h1 className="font-deva text-3xl md:text-4xl font-bold leading-tight">मराठी टायपिंग टेस्ट</h1>
            <p className="font-deva mt-3 text-ink-700 text-lg">मराठी टायपिंगचा सराव करा, वेग वाढवा आणि अचूकता तपासा.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/configure?mode=practice" className="btn-primary text-base px-5 py-3"><Keyboard size={18} aria-hidden /> सराव सुरू करा</Link>
              <Link to="/configure?mode=exam" className="btn-accent text-base px-5 py-3"><ClipboardCheck size={18} aria-hidden /> परीक्षा सुरू करा</Link>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm bg-ink-50" data-testid="compat-indicator">
              {ism ? <CircleCheck size={16} className="text-ok-600" aria-hidden /> : <CircleHelp size={16} className="text-saffron-600" aria-hidden />}
              <span>
                {ism ? `ISM इनपुट तपासणी यशस्वी (या ब्राउझरमध्ये, ${fmtDate(ism.verifiedAt)})` : 'ISM V6 इनपुट अजून तपासलेले नाही'} ·{' '}
                <Link to="/ism-setup" className="underline font-semibold">{ism ? 'पुन्हा तपासा' : 'आता तपासा'}</Link>
              </span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-brand-50 to-saffron-50 p-6 md:p-10 grid content-center gap-3">
            <div className="grid grid-cols-3 gap-3">
              <Metric label="सर्वोत्तम निव्वळ" value={fmtNum(best, 0)} unit="/मि" tone="ok" />
              <Metric label="सरासरी अचूकता" value={`${fmtNum(avgAcc, 0)}%`} tone="brand" />
              <Metric label="टेस्ट्स" value={all.length} />
            </div>
            <p className="text-xs text-ink-500">वेग = घटक (grapheme) प्रति मिनिट. {auth.userId ? 'तुमचे निकाल तुमच्या खात्यात साठवले जातात.' : repo.mode === 'supabase' ? 'लॉगिन केल्यास निकाल खात्यात साठवले जातील.' : 'निकाल या ब्राउझरमध्ये साठवले जातात.'}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="lessons-h">
        <div className="flex items-end justify-between mb-3">
          <h2 id="lessons-h" className="text-xl font-bold flex items-center gap-2"><BookOpen size={20} aria-hidden /> धडे · Lessons</h2>
          <Link to="/configure" className="text-sm font-semibold text-brand-600 inline-flex items-center gap-1">सानुकूल टेस्ट <ArrowRight size={14} aria-hidden /></Link>
        </div>
        {lessons.loading ? <Spinner /> : lessons.error ? <ErrorBox message={lessons.error} onRetry={lessons.reload} /> : !lessons.data?.[0].length ? <Empty>अजून कोणतेही धडे प्रकाशित नाहीत.</Empty> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lessons.data[0].map((l) => (
              <button key={l.id} onClick={() => startLesson(l.id)} className="card p-4 text-left hover:border-brand-500 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-semibold text-ink-500">{difficultyLabel[l.difficulty]}</span>
                  {passedLessons.has(l.id) && <span className="text-ok-600 text-xs font-semibold inline-flex items-center gap-1"><CircleCheck size={14} aria-hidden /> पूर्ण</span>}
                </div>
                <div className="font-deva font-semibold mt-1">{l.title}</div>
                <div className="text-xs text-ink-500 mt-2 inline-flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><Timer size={12} aria-hidden /> {l.durationSec / 60} मि</span>
                  <span>अचूकता ≥ {l.minAccuracy}%</span>
                  <span>{l.mode === 'exam' ? 'परीक्षा' : 'सराव'}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="recent-h">
        <div className="flex items-end justify-between mb-3">
          <h2 id="recent-h" className="text-xl font-bold">अलीकडील निकाल · Recent results</h2>
          <Link to="/history" className="text-sm font-semibold text-brand-600">सर्व पहा</Link>
        </div>
        {attempts.loading ? <Spinner /> : attempts.error ? <ErrorBox message={attempts.error} onRetry={attempts.reload} /> : recent.length === 0 ? <Empty>अजून एकही टेस्ट दिलेली नाही. वरील "सराव सुरू करा" दाबा.</Empty> : (
          <div className="card divide-y divide-ink-100">
            {recent.map((a) => (
              <Link key={a.id} to={`/results/${a.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 hover:bg-ink-50">
                <span className="font-deva font-medium flex-1 min-w-[10rem]">{a.passageTitle}</span>
                <span className="text-sm tabular-nums">{fmtNum(a.netSpeed, 0)}/मि</span>
                <span className="text-sm tabular-nums">{fmtNum(a.accuracy, 1)}%</span>
                <span className={`text-xs font-semibold ${a.passed ? 'text-ok-600' : 'text-bad-600'}`}>{a.passed ? 'उत्तीर्ण' : 'अनुत्तीर्ण'}</span>
                <span className="text-xs text-ink-500">{fmtDate(a.completedAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5 text-sm">
        <h2 className="font-semibold mb-1">ISM V6 सह वापर</h2>
        <p className="text-ink-700">ही वेबसाइट ISM V6 ला नियंत्रित करत नाही; ISM ने तयार केलेला Unicode मराठी मजकूर ब्राउझरच्या मजकूर-क्षेत्रात स्वीकारते. सेटअप आणि तपासणीसाठी <Link className="underline font-semibold" to="/ism-setup">ISM V6 सेटअप</Link> पान पहा.</p>
      </section>
    </div>
  );
}
