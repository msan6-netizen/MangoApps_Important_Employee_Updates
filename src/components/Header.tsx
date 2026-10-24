import { useApp } from '../state/AppContext';
import { ALEX_ID, MALVIKA_ID, MICHAEL_ID, RACHEL_ID } from '../data/seed';
import { fmtClock } from '../lib/time';

const VIEWERS = [
  { id: MICHAEL_ID, label: 'Michael (Operations, all stores)' },
  { id: RACHEL_ID, label: 'Rachel (Manager, Northgate)' },
  { id: ALEX_ID, label: 'Alex (Associate, Northgate)' },
  { id: MALVIKA_ID, label: 'Malvika (Associate, Renton)' },
];

const btn = 'rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium hover:bg-slate-100';

export function Header() {
  const { state, dispatch } = useApp();
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <h1 className="text-base font-bold text-slate-900">Summit Posts</h1>
        <label className="flex items-center gap-1 text-sm">
          <span className="text-slate-500">Viewing as:</span>
          <select
            className="rounded border border-slate-300 bg-white px-1 py-0.5 text-sm"
            value={state.viewerId}
            onChange={(e) => dispatch({ type: 'SET_VIEWER', employeeId: e.target.value })}
          >
            {VIEWERS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <span className="font-medium tabular-nums" aria-label="Demo clock">🕘 {fmtClock(state.now)}</span>
          <button className={btn} onClick={() => dispatch({ type: 'ADVANCE_CLOCK', hours: 4 })}>+4h</button>
          <button className={btn} onClick={() => dispatch({ type: 'ADVANCE_CLOCK', hours: 24 })}>+1 day</button>
          <button className={btn} onClick={() => dispatch({ type: 'RESET_CLOCK' })}>Reset clock</button>
        </div>
        <button className={`${btn} ml-auto`} onClick={() => dispatch({ type: 'RESET_DEMO' })}>Reset demo data</button>
      </div>
    </header>
  );
}
