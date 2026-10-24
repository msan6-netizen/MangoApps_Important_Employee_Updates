import type { StoreRollupRow } from '../../types';

/** Michael only: one row per store, lowest acknowledgment % first so the store that's behind is on top. */
export function StoreSummary({ rows }: { rows: StoreRollupRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm" data-testid="store-summary">
        <caption className="px-4 pt-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Store summary</caption>
        <thead className="text-left text-xs text-slate-500">
          <tr><th className="px-4 py-2 font-medium">Store</th><th className="px-2 py-2 font-medium">Acknowledged</th><th className="px-2 py-2 font-medium">Overdue</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.storeId}>
              <td className="px-4 py-2 font-medium">{r.storeName}</td>
              <td className="px-2 py-2 tabular-nums">{r.acknowledged}/{r.total} ({r.ackPct}%)</td>
              <td className={`px-2 py-2 tabular-nums ${r.overdue ? 'font-semibold text-red-600' : ''}`}>{r.overdue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
