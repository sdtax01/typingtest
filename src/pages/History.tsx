import { Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, Metric, Spinner } from '../components/Metric';
import { useAuth } from '../lib/auth';
import { fmtDate, fmtNum } from '../lib/format';
import { repo } from '../lib/repo';
import { attemptsStore } from '../lib/storage';
import { useAsync } from '../lib/useAsync';

export default function History() {
  const auth = useAuth();
  const { data, loading, error, reload } = useAsync(() => repo.listAttempts(auth.userId), [auth.userId]);
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const rows = data ?? [];
  const chrono = [...rows].reverse();
  const best = rows.reduce((m, a) => Math.max(m, a.netSpeed), 0);
  const avg = rows.length ? rows.reduce((s, a) => s + a.accuracy, 0) / rows.length : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">माझे निकाल · My results</h1>
        {!auth.userId && rows.length > 0 && (
          <button className="btn-ghost" onClick={() => { if (confirm('या ब्राउझरमधील सर्व निकाल पुसायचे?')) { attemptsStore.clear(); reload(); } }}><Trash2 size={16} aria-hidden /> निकाल पुसा</button>
        )}
      </div>
      {!auth.userId && <p className="text-sm text-ink-500">{repo.mode === 'supabase' ? 'लॉगिन न करता दिलेले निकाल फक्त या ब्राउझरमध्ये आहेत.' : 'निकाल फक्त या ब्राउझरमध्ये साठवले जातात (Local mode).'}</p>}
      {rows.length === 0 ? <Empty>निकाल नाहीत. <Link className="underline" to="/configure">टेस्ट द्या</Link></Empty> : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Metric label="टेस्ट्स" value={rows.length} />
            <Metric label="सर्वोत्तम निव्वळ" value={fmtNum(best, 0)} unit="/मि" tone="ok" />
            <Metric label="सरासरी अचूकता" value={`${fmtNum(avg, 1)}%`} tone="brand" />
          </div>
          <ProgressChart values={chrono.map((a) => a.netSpeed)} accs={chrono.map((a) => a.accuracy)} />
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">मागील टेस्ट्स</caption>
              <thead className="text-left text-xs uppercase text-ink-500"><tr><th className="p-3">तारीख</th><th>उतारा</th><th>प्रकार</th><th>निव्वळ</th><th>अचूकता</th><th>चुका</th><th>निकाल</th></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((a) => (
                  <tr key={a.id} className="hover:bg-ink-50">
                    <td className="p-3 whitespace-nowrap"><Link className="underline" to={`/results/${a.id}`}>{fmtDate(a.completedAt)}</Link></td>
                    <td className="font-deva">{a.passageTitle}</td>
                    <td>{a.mode === 'exam' ? 'परीक्षा' : 'सराव'}</td>
                    <td className="tabular-nums">{fmtNum(a.netSpeed, 0)}</td>
                    <td className="tabular-nums">{fmtNum(a.accuracy, 1)}%</td>
                    <td className="tabular-nums">{a.counts.errors}</td>
                    <td className={a.passed ? 'text-ok-600 font-semibold' : 'text-bad-600 font-semibold'}>{a.passed ? 'उत्तीर्ण' : 'अनुत्तीर्ण'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/** Small dependency-free trend chart: net speed (bars) with an accuracy line. */
function ProgressChart({ values, accs }: { values: number[]; accs: number[] }) {
  if (values.length < 2) return null;
  const v = values.slice(-20);
  const a = accs.slice(-20);
  const max = Math.max(10, ...v);
  const W = 600, H = 140, bw = W / v.length;
  const pts = a.map((x, i) => `${i * bw + bw / 2},${H - (x / 100) * H}`).join(' ');
  return (
    <figure className="card p-4">
      <figcaption className="text-xs font-semibold text-ink-500 mb-2">प्रगती (शेवटच्या {v.length} टेस्ट) — निळे: निव्वळ वेग · नारिंगी रेषा: अचूकता</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-36" role="img" aria-label="प्रगती आलेख">
        {v.map((x, i) => <rect key={i} x={i * bw + 4} y={H - (x / max) * H} width={bw - 8} height={(x / max) * H} rx="3" fill="#2f6bff" opacity=".85" />)}
        <polyline points={pts} fill="none" stroke="#f08a00" strokeWidth="2.5" />
      </svg>
    </figure>
  );
}
