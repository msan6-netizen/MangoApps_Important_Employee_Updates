export function ProgressBar({ pct, tone = 'bg-blue-600' }: { pct: number; tone?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
