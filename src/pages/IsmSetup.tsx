import { AlertTriangle, Check, Copy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DIAGNOSTIC_SENTENCE } from '../engine/fixtures';
import { diagnoseInput, TROUBLESHOOTING_CHECKLIST } from '../lib/diagnostics';
import { fmtDate } from '../lib/format';
import { ismStore } from '../lib/storage';

const STEPS = [
  'Windows वर ISM V6 इन्स्टॉल करा आणि उघडा.',
  'ISM मध्ये मजकूर/फॉन्ट मोड "Unicode Devanagari" निवडा.',
  'कीबोर्ड लेआउट "Typewriter" निवडा.',
  'तुमच्या ISM कॉन्फिगरेशनला आवश्यक असल्यास Scroll Lock चालू करा. (ISM आवृत्तीनुसार भिन्न; वेबसाइट Scroll Lock ची स्थिती पाहू शकत नाही.)',
  'समर्थित डेस्कटॉप ब्राउझरमध्ये (Chrome / Edge) ही वेबसाइट उघडा.',
  'खालील तपासणी-क्षेत्रात क्लिक करा.',
  'दिलेले नमुना वाक्य टाइप करा.',
  'क्षेत्रात वाचनीय Unicode मराठी दिसते आहे का ते तपासा.',
];

export default function IsmSetup() {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [saved, setSaved] = useState(ismStore.get());
  const d = useMemo(() => diagnoseInput(text, DIAGNOSTIC_SENTENCE), [text]);
  const last = d.codePoints.slice(-60);

  const copy = async (what: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied('error');
    }
  };
  const checklistText = TROUBLESHOOTING_CHECKLIST.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const report = `Marathi Typing Test — input report\nBrowser: ${navigator.userAgent}\nReceived characters: ${d.length}\nDevanagari characters: ${d.devanagariCount}\nMatch vs sample: ${d.matchPercent ?? 'n/a'}%\nCode points (last 60): ${last.map((c) => c.hex).join(' ')}`;
  const canMark = d.matchPercent !== null && d.matchPercent >= 95 && d.devanagariCount > 0 && d.warnings.length === 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">ISM V6 Marathi Typing Setup</h1>
        <p className="text-ink-700 font-deva mt-1">ISM V6 सेटअप आणि इनपुट तपासणी</p>
      </header>

      <div className="rounded-xl bg-saffron-50 border border-saffron-500/30 p-4 text-sm flex gap-3">
        <AlertTriangle className="text-saffron-600 shrink-0" size={20} aria-hidden />
        <p>ही वेबसाइट ISM V6 चालू आहे का, किंवा Scroll Lock चालू आहे का, हे ओळखू शकत नाही आणि ISM च्या सेटिंग्ज बदलत नाही. ती फक्त ब्राउझरला प्रत्यक्ष मिळालेला Unicode मजकूर तपासते. यशस्वी तपासणी म्हणजे <b>या संगणकावर, या ब्राउझरमध्ये, आत्ता</b> इनपुट चालते — सर्वत्र हमी नाही.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card p-5" aria-labelledby="steps-h">
          <h2 id="steps-h" className="font-semibold mb-3">सेटअप पायऱ्या</h2>
          <ol className="space-y-2 text-sm list-decimal pl-5 font-deva">
            {STEPS.map((s) => <li key={s}>{s}</li>)}
          </ol>
          <div className="mt-4 rounded-xl bg-ink-50 p-3">
            <div className="label">नमुना वाक्य · Sample sentence</div>
            <p lang="mr" className="font-deva text-xl leading-loose" data-testid="sample">{DIAGNOSTIC_SENTENCE}</p>
            <button className="btn-ghost mt-2" onClick={() => copy('sample', DIAGNOSTIC_SENTENCE)}>{copied === 'sample' ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} वाक्य कॉपी करा</button>
          </div>
        </section>

        <section className="card p-5 space-y-3" aria-labelledby="diag-h">
          <h2 id="diag-h" className="font-semibold">इनपुट तपासणी · Diagnostic</h2>
          <label htmlFor="diag" className="label">येथे नमुना वाक्य टाइप करा</label>
          <textarea id="diag" lang="mr" rows={4} spellCheck={false} autoComplete="off" data-testid="diag-input" value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-xl border-2 border-ink-100 focus:border-brand-500 p-3 font-deva text-xl leading-loose" />

          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-ink-50 p-2"><div className="text-xs text-ink-500">मिळालेली अक्षरे</div><b data-testid="diag-count">{d.length}</b></div>
            <div className="rounded-lg bg-ink-50 p-2"><div className="text-xs text-ink-500">देवनागरी</div><b data-testid="diag-deva">{d.devanagariCount}</b></div>
            <div className="rounded-lg bg-ink-50 p-2"><div className="text-xs text-ink-500">नमुन्याशी जुळणी</div><b data-testid="diag-match">{d.matchPercent === null ? '—' : `${d.matchPercent}%`}</b></div>
          </div>

          <div>
            <div className="label">पूर्वावलोकन · Received preview</div>
            <p lang="mr" className="font-deva text-xl min-h-[2.5rem] rounded-lg border border-ink-100 p-2 break-words" data-testid="diag-preview">{text || <span className="text-ink-300">—</span>}</p>
          </div>

          <div role="status" aria-live="polite" className="space-y-1">
            {d.warnings.map((w) => <p key={w} className="text-sm text-bad-600 flex gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden />{w}</p>)}
          </div>

          <details>
            <summary className="cursor-pointer text-sm font-semibold">Unicode कोड पॉइंट्स (शेवटचे {last.length})</summary>
            <ul className="mt-2 flex flex-wrap gap-1.5 text-xs" data-testid="diag-codepoints">
              {last.map((c, i) => <li key={i} className="rounded border border-ink-100 px-1.5 py-1 text-center"><div className="font-deva text-base">{c.ch === ' ' ? '␣' : c.ch === '\n' ? '↵' : c.ch}</div><div className="text-ink-500">{c.hex}</div></li>)}
            </ul>
          </details>

          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => copy('report', report)}>{copied === 'report' ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} अहवाल कॉपी करा</button>
            <button className="btn-primary" disabled={!canMark} onClick={() => { const c = { verifiedAt: new Date().toISOString(), codePoints: d.length, userAgent: navigator.userAgent, matchPercent: d.matchPercent! }; ismStore.set(c); setSaved(c); }} title={canMark ? '' : '≥95% जुळणी आणि कोणतीही चेतावणी नसताना उपलब्ध'}>या ब्राउझरमध्ये चालते म्हणून नोंदवा</button>
          </div>
          {saved && <p className="text-sm text-ok-600">नोंद: {fmtDate(saved.verifiedAt)} रोजी {saved.matchPercent}% जुळणी. <button className="underline" onClick={() => { ismStore.clear(); setSaved(null); }}>काढून टाका</button></p>}
          {copied === 'error' && <p role="alert" className="text-sm text-bad-600">कॉपी करता आली नाही; मजकूर निवडून Ctrl+C वापरा.</p>}
        </section>
      </div>

      <section className="card p-5" aria-labelledby="ts-h">
        <div className="flex items-center justify-between mb-2">
          <h2 id="ts-h" className="font-semibold">समस्यानिवारण · Troubleshooting checklist</h2>
          <button className="btn-ghost" onClick={() => copy('list', checklistText)}>{copied === 'list' ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} कॉपी करा</button>
        </div>
        <ol className="list-decimal pl-5 space-y-1.5 text-sm font-deva">{TROUBLESHOOTING_CHECKLIST.map((t) => <li key={t}>{t}</li>)}</ol>
      </section>
    </div>
  );
}
