import { CheckCircle2, Printer, RotateCcw, XCircle } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DiffView, { DiffLegend } from '../components/DiffView';
import { Empty, ErrorBox, Metric, Spinner } from '../components/Metric';
import { evaluate } from '../engine';
import { useAuth } from '../lib/auth';
import { failureMr, fmtDate, fmtDuration, fmtNum } from '../lib/format';
import { repo } from '../lib/repo';
import { activeConfigStore } from '../lib/storage';
import { useAsync } from '../lib/useAsync';

export default function Results() {
  const { id = '' } = useParams();
  const auth = useAuth();
  const nav = useNavigate();
  const { data: a, loading, error, reload } = useAsync(() => repo.getAttempt(id, auth.userId), [id, auth.userId]);

  // Re-run the engine with the stored policy to rebuild the alignment for display and cross-check stored numbers.
  const re = useMemo(() => (a ? evaluate({ reference: a.reference, entered: a.entered, elapsedMs: a.elapsedMs, policy: a.policy }) : null), [a]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!a || !re) return <Empty>निकाल सापडला नाही. <Link className="underline" to="/history">सर्व निकाल पहा</Link></Empty>;

  const warn = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('mtt.saveWarning');
  const retry = () => {
    const prev = activeConfigStore.get();
    if (prev) nav('/test');
    else nav('/configure');
  };
  const reasonMr = { expired: 'वेळ संपली', manual: 'स्वतः पूर्ण केली', completed: 'उतारा पूर्ण' }[a.finishReason];

  return (
    <div className="space-y-5">
      {warn && <div role="alert" className="rounded-xl bg-saffron-50 border border-saffron-500/30 p-3 text-sm">क्लाउडवर साठवता आले नाही; निकाल फक्त या ब्राउझरमध्ये साठवला आहे.</div>}
      <div className={`card p-6 flex flex-wrap items-center gap-4 ${a.passed ? 'border-ok-600/40' : 'border-bad-600/40'}`}>
        {a.passed ? <CheckCircle2 className="text-ok-600" size={44} aria-hidden /> : <XCircle className="text-bad-600" size={44} aria-hidden />}
        <div className="flex-1 min-w-[14rem]">
          <h1 className="text-2xl font-bold font-deva">{a.passed ? 'उत्तीर्ण · Passed' : 'अनुत्तीर्ण · Not passed'}</h1>
          <p className="text-sm text-ink-500 font-deva">{a.passageTitle} · {a.mode === 'exam' ? 'परीक्षा' : 'सराव'} · {fmtDate(a.completedAt)} · {reasonMr}</p>
          {!a.passed && (
            <ul className="mt-2 text-sm text-bad-600 list-disc pl-5 font-deva">
              {a.failures.map((f, i) => <li key={i}>{failureMr(f)}</li>)}
            </ul>
          )}
        </div>
        <div className="no-print flex gap-2">
          <button className="btn-ghost" onClick={() => window.print()}><Printer size={16} aria-hidden /> प्रिंट</button>
          <button className="btn-primary" onClick={retry}><RotateCcw size={16} aria-hidden /> पुन्हा प्रयत्न</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="एकूण वेग · Gross" value={fmtNum(a.grossSpeed)} unit="घटक/मि" tone="brand" />
        <Metric label="निव्वळ वेग · Net" value={fmtNum(a.netSpeed)} unit="घटक/मि" tone="ok" />
        <Metric label="अचूकता · Accuracy" value={`${fmtNum(a.accuracy, 2)}%`} tone={a.accuracy >= a.criteria.minAccuracy! ? 'ok' : 'bad'} />
        <Metric label="कालावधी · Duration" value={fmtDuration(a.elapsedMs)} />
        <Metric label="बरोबर · Correct" value={a.counts.correct} tone="ok" />
        <Metric label="चुकीचे · Substituted" value={a.counts.substituted} tone={a.counts.substituted ? 'bad' : 'default'} />
        <Metric label="गाळलेले · Missing" value={a.counts.missing} tone={a.counts.missing ? 'bad' : 'default'} />
        <Metric label="जास्तीचे · Extra" value={a.counts.extra} tone={a.counts.extra ? 'bad' : 'default'} />
      </div>
      <p className="text-sm text-ink-700">एकूण चुका (Error count): <b>{a.counts.errors}</b> · टाइप केलेले घटक: {a.counts.entered} · संदर्भ घटक (गणनेत): {a.counts.referenceTotal}</p>

      <section className="card p-5">
        <h2 className="font-semibold mb-2">संदर्भ आणि टाइप केलेला मजकूर · Comparison</h2>
        <DiffLegend />
        <div className="mt-3"><DiffView ops={re.ops} /></div>
      </section>

      <section className="card p-5 text-sm">
        <h2 className="font-semibold mb-2">मूल्यमापन नियम · Evaluation policy</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          <div className="flex justify-between"><dt className="text-ink-500">गणना एकक · Unit</dt><dd>{a.policy.segmentation}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-500">Scope</dt><dd>{a.policy.referenceScope}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-500">Accuracy formula</dt><dd>{a.policy.accuracyFormula}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-500">Net speed formula</dt><dd>{a.policy.netSpeedFormula}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-500">Normalization</dt><dd>{a.policy.normalization.form}{a.policy.normalization.collapseWhitespace ? ' + collapse spaces' : ''}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-500">Engine</dt><dd>v{a.engineVersion}</dd></div>
        </dl>
        <p className="mt-2 text-xs text-ink-500">वेग "घटक प्रति मिनिट" मध्ये आहे. अधिकृत परीक्षेचे शब्द-रूपांतर नियम माहीत असल्यास प्रशासक ते सेट करू शकतो; तोपर्यंत हे अधिकृत WPM नाही.</p>
      </section>
    </div>
  );
}
