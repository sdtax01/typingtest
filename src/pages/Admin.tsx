import { Eye, EyeOff, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Empty, ErrorBox, Metric, Spinner } from '../components/Metric';
import { useAuth } from '../lib/auth';
import { adminRepo } from '../lib/repo';
import type { Difficulty, Lesson, Passage } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { normalizeText, segmentText } from '../engine';

type Tab = 'passages' | 'lessons' | 'stats';
const DIFFS: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

export default function Admin() {
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>('passages');
  if (auth.loading) return <Spinner />;
  // UI gate only. The database refuses these reads/writes for non-admins regardless (RLS).
  if (!auth.isAdmin) return <Navigate to="/" replace />;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">प्रशासन · Administration</h1>
      <div role="tablist" className="flex gap-2">
        {(['passages', 'lessons', 'stats'] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`btn ${tab === t ? 'bg-brand-600 text-white' : 'bg-white border border-ink-100'}`}>
            {t === 'passages' ? 'उतारे' : t === 'lessons' ? 'धडे / परीक्षा' : 'आकडेवारी'}
          </button>
        ))}
      </div>
      {tab === 'passages' && <Passages />}
      {tab === 'lessons' && <Lessons />}
      {tab === 'stats' && <Stats />}
    </div>
  );
}

function Passages() {
  const { data, loading, error, reload } = useAsync(() => adminRepo.listAllPassages(), []);
  const [edit, setEdit] = useState<Partial<Passage> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const save = async () => {
    if (!edit) return;
    const text = normalizeText(edit.text ?? '').trim();
    if (!edit.title?.trim() || text.length < 10) return setMsg('शीर्षक आणि किमान १० अक्षरांचा मजकूर आवश्यक आहे.');
    if (text.length > 20000) return setMsg('मजकूर खूप मोठा आहे (कमाल २०,००० अक्षरे).');
    try {
      await adminRepo.savePassage({ ...edit, title: edit.title.trim(), text });
      setEdit(null); setMsg(null); reload();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'सेव्ह अयशस्वी (अधिकार नसू शकतात).'); }
  };
  return (
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-5">
      <div className="card divide-y divide-ink-100">
        <div className="p-3 flex justify-between items-center"><b>उतारे ({data?.length ?? 0})</b><button className="btn-primary" onClick={() => setEdit({ title: '', text: '', difficulty: 'beginner', published: false })}><Plus size={16} aria-hidden /> नवीन</button></div>
        {!data?.length && <Empty>उतारे नाहीत.</Empty>}
        {data?.map((p) => (
          <div key={p.id} className="p-3 flex items-center gap-3">
            <button className="flex-1 text-left" onClick={() => setEdit(p)}><div className="font-deva font-medium">{p.title}</div><div className="text-xs text-ink-500">{p.difficulty} · v{p.version} · {segmentText(normalizeText(p.text), 'grapheme').length} घटक</div></button>
            <button className="btn-ghost" aria-label={p.published ? 'अप्रकाशित करा' : 'प्रकाशित करा'} onClick={async () => { try { await adminRepo.setPassagePublished(p.id, !p.published); reload(); } catch (e) { setMsg(String(e)); } }}>{p.published ? <Eye size={16} /> : <EyeOff size={16} />}</button>
          </div>
        ))}
      </div>
      {edit && (
        <div className="card p-4 space-y-3">
          <div><label className="label" htmlFor="pt">शीर्षक</label><input id="pt" className="input font-deva" value={edit.title ?? ''} maxLength={120} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
          <div><label className="label" htmlFor="pd">पातळी</label><select id="pd" className="input" value={edit.difficulty} onChange={(e) => setEdit({ ...edit, difficulty: e.target.value as Difficulty })}>{DIFFS.map((d) => <option key={d}>{d}</option>)}</select></div>
          <div><label className="label" htmlFor="pb">मजकूर (Unicode)</label><textarea id="pb" rows={8} lang="mr" className="input font-deva text-lg leading-loose" value={edit.text ?? ''} onChange={(e) => setEdit({ ...edit, text: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} /> प्रकाशित</label>
          {msg && <p role="alert" className="text-sm text-bad-600">{msg}</p>}
          <div className="flex gap-2"><button className="btn-primary" onClick={save}><Save size={16} aria-hidden /> सेव्ह</button><button className="btn-ghost" onClick={() => { setEdit(null); setMsg(null); }}>रद्द</button></div>
          <p className="text-xs text-ink-500">मजकूर बदलल्यास आवृत्ती (version) आपोआप वाढते; जुने निकाल त्यांच्या मूळ उताऱ्याचा snapshot जपतात.</p>
        </div>
      )}
    </div>
  );
}

function Lessons() {
  const ls = useAsync(() => Promise.all([adminRepo.listAllLessons(), adminRepo.listAllPassages()]), []);
  const [edit, setEdit] = useState<Partial<Lesson> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (ls.loading) return <Spinner />;
  if (ls.error) return <ErrorBox message={ls.error} onRetry={ls.reload} />;
  const [lessons, passages] = ls.data!;
  const save = async () => {
    if (!edit?.title?.trim() || !edit.passageId) return setMsg('शीर्षक आणि उतारा आवश्यक आहे.');
    if ((edit.minAccuracy ?? 0) < 0 || (edit.minAccuracy ?? 0) > 100) return setMsg('अचूकता 0–100 असावी.');
    try { await adminRepo.saveLesson(edit as any); setEdit(null); setMsg(null); ls.reload(); } catch (e) { setMsg(e instanceof Error ? e.message : 'सेव्ह अयशस्वी'); }
  };
  const n = (v: string) => Math.max(0, Number(v) || 0);
  return (
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-5">
      <div className="card divide-y divide-ink-100">
        <div className="p-3 flex justify-between items-center"><b>धडे ({lessons.length})</b><button className="btn-primary" disabled={!passages.length} onClick={() => setEdit({ title: '', passageId: passages[0]?.id, difficulty: 'beginner', mode: 'practice', durationSec: 300, minAccuracy: 90, minNetSpeed: 0, requireCompletion: false, segmentation: 'grapheme', published: false, sortOrder: 100 })}><Plus size={16} aria-hidden /> नवीन</button></div>
        {!lessons.length && <Empty>धडे नाहीत.</Empty>}
        {lessons.map((l) => (
          <div key={l.id} className="p-3 flex items-center gap-3">
            <button className="flex-1 text-left" onClick={() => setEdit(l)}><div className="font-deva font-medium">{l.title}</div><div className="text-xs text-ink-500">{l.mode} · {l.durationSec / 60} मि · ≥{l.minAccuracy}% · {l.segmentation}</div></button>
            <button className="btn-ghost" aria-label={l.published ? 'अप्रकाशित करा' : 'प्रकाशित करा'} onClick={async () => { try { await adminRepo.setLessonPublished(l.id, !l.published); ls.reload(); } catch (e) { setMsg(String(e)); } }}>{l.published ? <Eye size={16} /> : <EyeOff size={16} />}</button>
          </div>
        ))}
      </div>
      {edit && (
        <div className="card p-4 grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="label" htmlFor="lt">शीर्षक</label><input id="lt" className="input font-deva" value={edit.title ?? ''} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
          <div className="col-span-2"><label className="label" htmlFor="lp">उतारा</label><select id="lp" className="input font-deva" value={edit.passageId} onChange={(e) => setEdit({ ...edit, passageId: e.target.value })}>{passages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
          <div><label className="label" htmlFor="lm">प्रकार</label><select id="lm" className="input" value={edit.mode} onChange={(e) => setEdit({ ...edit, mode: e.target.value as any })}><option value="practice">practice</option><option value="exam">exam</option></select></div>
          <div><label className="label" htmlFor="ld">पातळी</label><select id="ld" className="input" value={edit.difficulty} onChange={(e) => setEdit({ ...edit, difficulty: e.target.value as Difficulty })}>{DIFFS.map((d) => <option key={d}>{d}</option>)}</select></div>
          <div><label className="label" htmlFor="ls">कालावधी (सेकंद)</label><input id="ls" type="number" min={30} className="input" value={edit.durationSec} onChange={(e) => setEdit({ ...edit, durationSec: Math.max(30, n(e.target.value)) })} /></div>
          <div><label className="label" htmlFor="la">किमान अचूकता %</label><input id="la" type="number" min={0} max={100} className="input" value={edit.minAccuracy} onChange={(e) => setEdit({ ...edit, minAccuracy: Math.min(100, n(e.target.value)) })} /></div>
          <div><label className="label" htmlFor="ln">किमान निव्वळ वेग</label><input id="ln" type="number" min={0} className="input" value={edit.minNetSpeed} onChange={(e) => setEdit({ ...edit, minNetSpeed: n(e.target.value) })} /></div>
          <div><label className="label" htmlFor="lu">गणना एकक</label><select id="lu" className="input" value={edit.segmentation} onChange={(e) => setEdit({ ...edit, segmentation: e.target.value as any })}><option>grapheme</option><option>akshara</option><option>codepoint</option></select></div>
          <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!edit.requireCompletion} onChange={(e) => setEdit({ ...edit, requireCompletion: e.target.checked })} /> उतारा पूर्ण करणे आवश्यक</label>
          <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} /> प्रकाशित</label>
          {msg && <p role="alert" className="col-span-2 text-sm text-bad-600">{msg}</p>}
          <div className="col-span-2 flex gap-2"><button className="btn-primary" onClick={save}><Save size={16} aria-hidden /> सेव्ह</button><button className="btn-ghost" onClick={() => { setEdit(null); setMsg(null); }}>रद्द</button></div>
        </div>
      )}
    </div>
  );
}

function Stats() {
  const { data, loading, error, reload } = useAsync(() => adminRepo.stats(), []);
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Metric label="एकूण टेस्ट" value={data!.totalAttempts} />
      <Metric label="वापरकर्ते" value={data!.uniqueUsers} />
      <Metric label="सरासरी अचूकता" value={`${data!.avgAccuracy.toFixed(1)}%`} tone="brand" />
      <Metric label="सरासरी निव्वळ" value={data!.avgNetSpeed.toFixed(1)} tone="ok" />
      <Metric label="उत्तीर्ण दर" value={`${data!.passRate.toFixed(0)}%`} />
    </div>
  );
}
