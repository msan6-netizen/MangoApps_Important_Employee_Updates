import { useApp } from '../../state/AppContext';
import { storeOverview } from '../../lib/metrics';
import { ProgressBar } from '../ProgressBar';

/** Michael's default tab: every store at a glance, the one furthest behind on top. */
export function StoreOverview() {
  const { state } = useApp();
  const rows = storeOverview(state.posts, state.responses, state.employees, state.stores, state.now);
  return (
    <div>
      <p className="mb-2 text-xs text-slate-500">Acknowledged and overdue count people, summed over each store's Action Required posts. The store furthest behind is on top.</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[32rem] text-sm" data-testid="store-overview">
        <thead className="text-left text-xs text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">Store</th>
            <th className="px-2 py-2 font-medium">Action Required</th>
            <th className="px-2 py-2 font-medium">FYI</th>
            <th className="px-2 py-2 font-medium">Acknowledged</th>
            <th className="px-2 py-2 font-medium">Overdue now</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.storeId} data-testid="overview-row">
              <td className="px-4 py-3 font-medium">{r.storeName}</td>
              <td className="px-2 py-3 tabular-nums">{r.actionPosts}</td>
              <td className="px-2 py-3 tabular-nums">{r.fyiPosts}</td>
              <td className="px-2 py-3 tabular-nums">
                {r.required ? <>{r.acknowledged}/{r.required} ({r.ackPct}%)<div className="mt-1 w-24"><ProgressBar pct={r.ackPct} /></div></> : '—'}
              </td>
              <td className={`px-2 py-3 tabular-nums ${r.overdue ? 'font-semibold text-red-600' : ''}`}>{r.overdue}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
