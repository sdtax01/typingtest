import { Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ErrorBox, Spinner } from '../components/Metric';
import { difficultyLabel } from '../data/catalog';
import { defaultConfig, DURATIONS_MIN } from '../lib/config';
import { repo } from '../lib/repo';
import { activeConfigStore } from '../lib/storage';
import type { FontScale, TestConfig, TestMode } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import type { SegmentationUnit } from '../engine';

export default function Configure() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const { data: passages, loading, error, reload } = useAsync(() => repo.listPassages(), []);
  const [mode, setMode] = useState<TestMode>(sp.get('mode') === 'exam' ? 'exam' : 'practice');
  const [passageId, setPassageId] = useState('');
  const [cfg, setCfg] = useState<Partial<TestConfig>>({});

  useEffect(() => {
    if (passages?.length && !passageId) setPassageId(passages[0].id);
  }, [passages, passageId]);

  // Mode switch re-applies sensible defaults but keeps passage choice.
  const passage = passages?.find((p) => p.id === passageId);
  const base = passage ? defaultConfig(passage, mode) : null;
  const val = { ...(base ?? {}), ...cfg } as TestConfig;
  const set = <K extends keyof TestConfig>(k: K, v: TestConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const changeMode = (m: TestMode) => {
    setMode(m);
    setCfg({});
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!passages?.length || !passage || !base) return <ErrorBox message="कोणतेही उतारे उपलब्ध नाहीत. · No passages available." />;

  const start = () => {
    const final: TestConfig = { ...val, mode, passage: { id: passage.id, title: passage.title, text: passage.text, version: passage.version } };
    activeConfigStore.set(final);
    nav('/test');
  };

  return (
    <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">
      <section className="card p-5 space-y-5" aria-labelledby="cfg-h">
        <h1 id="cfg-h" className="text-xl font-bold">टेस्ट सेटिंग्ज · Test configuration</h1>

        <fieldset>
          <legend className="label">प्रकार · Mode</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {(['practice', 'exam'] as const).map((m) => (
              <label key={m} className={`cursor-pointer rounded-xl border-2 p-3 text-sm ${mode === m ? 'border-brand-500 bg-brand-50' : 'border-ink-100'}`}>
                <input type="radio" name="mode" className="sr-only" checked={mode === m} onChange={() => changeMode(m)} />
                <div className="font-semibold">{m === 'practice' ? 'सराव · Practice' : 'परीक्षा · Examination'}</div>
                <div className="text-xs text-ink-500">{m === 'practice' ? 'थेट रंगीत मार्गदर्शन, थांबवता येते' : 'हायलाइट बंद, पेस्ट बंद, थांबवता येत नाही'}</div>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="passage">उतारा · Passage</label>
          <select id="passage" className="input font-deva" value={passageId} onChange={(e) => { setPassageId(e.target.value); setCfg({}); }}>
            {passages.map((p) => <option key={p.id} value={p.id}>{p.title} — {difficultyLabel[p.difficulty]}</option>)}
          </select>
        </div>

        <fieldset>
          <legend className="label">कालावधी · Duration</legend>
          <div className="flex flex-wrap gap-2">
            {DURATIONS_MIN.map((m) => (
              <button key={m} type="button" aria-pressed={val.durationSec === m * 60} onClick={() => set('durationSec', m * 60)} className={`btn ${val.durationSec === m * 60 ? 'bg-brand-600 text-white' : 'bg-white border border-ink-100 text-ink-700'}`}>{m} मि</button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="acc">किमान अचूकता % · Required accuracy</label>
            <input id="acc" type="number" min={0} max={100} className="input" value={val.minAccuracy} onChange={(e) => set('minAccuracy', Math.min(100, Math.max(0, Number(e.target.value) || 0)))} />
          </div>
          <div>
            <label className="label" htmlFor="spd">किमान निव्वळ वेग · Min net speed</label>
            <input id="spd" type="number" min={0} className="input" value={val.minNetSpeed} onChange={(e) => set('minNetSpeed', Math.max(0, Number(e.target.value) || 0))} />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="label">पर्याय · Options</legend>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={val.completionMode} onChange={(e) => set('completionMode', e.target.checked)} /> उतारा पूर्ण होईपर्यंत (पूर्ण केल्यावर आपोआप संपते; न टाइप केलेला भाग "गाळलेला" मोजला जातो)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={val.liveHighlight} onChange={(e) => set('liveHighlight', e.target.checked)} /> संदर्भ मजकुरावर थेट रंग दाखवा</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={val.allowPause} onChange={(e) => set('allowPause', e.target.checked)} /> थांबवण्याची परवानगी</label>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="fs">अक्षर आकार · Text size</label>
            <select id="fs" className="input" value={val.fontScale} onChange={(e) => set('fontScale', e.target.value as FontScale)}>
              <option value="md">मध्यम</option><option value="lg">मोठा</option><option value="xl">खूप मोठा</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="seg">गणना एकक · Counting unit</label>
            <select id="seg" className="input" value={val.segmentation} onChange={(e) => set('segmentation', e.target.value as SegmentationUnit)}>
              <option value="grapheme">Grapheme (default)</option>
              <option value="akshara">Akshara-like</option>
              <option value="codepoint">Unicode code point</option>
            </select>
          </div>
        </div>
        <button className="btn-primary w-full text-base py-3" onClick={start}><Play size={18} aria-hidden /> टेस्ट सुरू करा</button>
      </section>

      <section className="card p-5" aria-label="उतारा पूर्वावलोकन">
        <h2 className="font-semibold mb-2">पूर्वावलोकन · Preview</h2>
        <p lang="mr" className="ref-text font-deva text-xl text-ink-700">{passage.text}</p>
      </section>
    </div>
  );
}
