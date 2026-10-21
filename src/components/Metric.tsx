import type { ReactNode } from 'react';

export function Metric({ label, value, unit, tone = 'default', hint }: { label: string; value: ReactNode; unit?: string; tone?: 'default' | 'ok' | 'bad' | 'brand'; hint?: string }) {
  const color = { default: 'text-ink-900', ok: 'text-ok-600', bad: 'text-bad-600', brand: 'text-brand-600' }[tone];
  return (
    <div className="rounded-xl bg-white border border-ink-100 px-4 py-3 min-w-[7rem]">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</div>
      <div className={`mt-0.5 text-2xl font-bold tabular-nums ${color}`}>
        {value}
        {unit && <span className="ml-1 text-xs font-medium text-ink-500">{unit}</span>}
      </div>
      {hint && <div className="text-[11px] text-ink-500">{hint}</div>}
    </div>
  );
}

export function Spinner({ label = 'लोड होत आहे…' }: { label?: string }) {
  return <div role="status" className="p-6 text-center text-ink-500 text-sm">{label}</div>;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-bad-600/30 bg-bad-50 p-4 text-sm text-bad-600">
      {message} {onRetry && <button className="underline font-semibold ml-2" onClick={onRetry}>पुन्हा प्रयत्न करा</button>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-ink-300 bg-white p-8 text-center text-sm text-ink-500">{children}</div>;
}
