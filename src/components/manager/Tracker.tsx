import { useState } from 'react';
import type { Employee, TrackerFilter } from '../../types';
import { useApp } from '../../state/AppContext';
import { postMetrics, storeRollup, trackerGroups, type TrackerRow } from '../../lib/metrics';
import { remindersDue } from '../../lib/reminders';
import { audienceSummary } from '../../lib/audience';
import { canEditPost } from '../../lib/scope';
import { isActionRequired } from '../../lib/status';
import { fmtDayTime, fmtStamp } from '../../lib/time';
import { CategoryChip, Chip } from '../Chip';
import { ProgressBar } from '../ProgressBar';
import { ROLE_LABEL, STATUS_LABEL, STATUS_STYLE } from '../labels';
import { StoreSummary } from './StoreSummary';
import { ReminderLog } from './ReminderLog';

const TABS: { id: TrackerFilter; label: string }[] = [
  { id: 'needs_follow_up', label: 'Needs follow-up' }, { id: 'acknowledged', label: 'Acknowledged' }, { id: 'everyone', label: 'Everyone' },
];

interface Props { manager: Employee; scope?: string[]; postId: string; onBack: () => void; onEdit: () => void; onMessage: (name: string) => void }

export function Tracker({ manager, scope, postId, onBack, onEdit, onMessage }: Props) {
  const { state, dispatch } = useApp();
  const [filter, setFilter] = useState<TrackerFilter>('needs_follow_up');
  const post = state.posts.find((p) => p.id === postId)!;
  const isAction = isActionRequired(post);
  const m = postMetrics(post, state.responses, state.employees, state.now, scope);
  const groups = trackerGroups(post, state.responses, state.employees, state.stores, state.now, isAction ? filter : 'everyone', scope);
  const scopedPeople = new Set(trackerGroups(post, state.responses, state.employees, state.stores, state.now, 'everyone', scope)
    .flatMap((g) => g.rows.map((r) => r.employee.id)));
  const reminders = remindersDue(post, state.responses, state.employees, state.now).filter((r) => scopedPeople.has(r.employeeId));

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm font-medium text-slate-600 hover:underline">← All posts</button>
        {canEditPost(manager, post, state.employees) && (
          <button onClick={onEdit} className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-100">Edit</button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip category={post.category} />
          {isAction ? <Chip className="bg-amber-100 text-amber-800 ring-amber-300">Action Required</Chip> : <Chip className="bg-white text-slate-500 ring-slate-200">FYI</Chip>}
          {post.version > 1 && <Chip className="bg-white text-slate-500 ring-slate-200">Version {post.version}</Chip>}
        </div>
        <h2 className="mt-2 text-lg font-bold">{post.title}</h2>
        <p className="text-sm text-slate-500">{audienceSummary(post, state.employees, state.stores, scope)}</p>
        <p className="mt-1 text-sm text-slate-500">
          Posted {fmtDayTime(post.createdAt)}
          {post.ackBy && ` · Acknowledge by ${fmtDayTime(post.ackBy)}`}
        </p>
        {post.editedNote && <p className="mt-1 text-sm text-amber-700">{post.editedNote}</p>}
      </div>

      {isAction && !scope && <StoreSummary rows={storeRollup(post, state.responses, state.employees, state.stores, state.now)} />}

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2" data-testid="metrics">
        {isAction ? <>
          <Metric label="Acknowledged" value={`${m.acknowledged}/${m.denominator} (${m.ackPct}%)`} pct={m.ackPct} />
          <p className="text-sm"><span className="text-slate-500">Overdue</span> <span className={`font-semibold tabular-nums ${m.overdue ? 'text-red-600' : ''}`} data-testid="overdue-count">{m.overdue}</span></p>
          <p className="text-sm"><span className="text-slate-500">On leave</span> <span className="font-semibold tabular-nums" data-testid="on-leave-count">{m.onLeave}</span> <span className="text-xs text-slate-400">(not counted)</span></p>
        </> : <Metric label="Opened" value={`${m.opened}/${m.denominator}`} pct={m.denominator ? Math.round((m.opened / m.denominator) * 100) : 0} />}
      </div>

      {isAction && (
        <div role="tablist" className="flex gap-1 rounded-lg bg-slate-200 p-1 text-sm">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={filter === t.id} onClick={() => setFilter(t.id)}
              className={`flex-1 whitespace-nowrap rounded-md px-1 py-1.5 text-xs font-medium sm:text-sm ${filter === t.id ? 'bg-white shadow-sm' : 'text-slate-600'}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {groups.map((g) => (
          <details key={g.storeId} open className="rounded-xl border border-slate-200 bg-white" data-testid="store-group" data-store={g.storeName}>
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">{g.storeName} <span className="font-normal text-slate-500">({g.rows.length})</span></summary>
            {g.rows.length === 0
              ? <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">Nobody here.</p>
              : <ul className="divide-y divide-slate-100 border-t border-slate-100">
                  {g.rows.map((r) => (
                    <PersonRow key={r.employee.id} row={r} now={state.now}
                      // Mark on leave from Needs follow-up; undo from Everyone. Not shown on Acknowledged.
                      showLeave={isAction && filter === 'needs_follow_up' ? true : r.employee.onLeave && (!isAction || filter === 'everyone')}
                      onLeave={(v) => dispatch({ type: 'SET_ON_LEAVE', employeeId: r.employee.id, onLeave: v })}
                      onMessage={() => onMessage(r.employee.name.split(' ')[0])} />
                  ))}
                </ul>}
          </details>
        ))}
      </div>

      {isAction && <ReminderLog reminders={reminders} employees={state.employees} now={state.now} />}
    </section>
  );
}

function Metric({ label, value, pct, tone }: { label: string; value: string; pct: number; tone?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm"><span className="text-slate-500">{label}</span> <span className="font-semibold tabular-nums">{value}</span></p>
      <ProgressBar pct={pct} tone={tone} />
    </div>
  );
}

function PersonRow({ row, now, showLeave, onLeave, onMessage }: { row: TrackerRow; now: string; showLeave: boolean; onLeave: (v: boolean) => void; onMessage: () => void }) {
  const { employee: e, status, response: r } = row;
  const overdue = status === 'overdue';
  const times = [
    r?.openedAt ? `Opened ${fmtStamp(r.openedAt, now)}` : null,
    status === 'acknowledged' ? `Acknowledged ${fmtStamp(r!.acknowledgedAt!, now)}` : null,
  ].filter(Boolean).join(' · ');
  return (
    <li data-testid="person-row" data-employee-id={e.id} data-status={status}
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 ${overdue ? 'bg-red-50 shadow-[inset_4px_0_0_0_rgb(239,68,68)]' : ''}`}>
      <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
        <p className={`text-sm font-medium ${overdue ? 'text-red-700' : ''}`}>
          {e.name} <span className="font-normal text-slate-500">· {ROLE_LABEL[e.role]}</span>
          {row.alsoAt.length > 0 && <span className="font-normal text-slate-400"> · also at {row.alsoAt.join(', ')}</span>}
        </p>
        {times && <p className="text-xs text-slate-500">{times}</p>}
      </div>
      <Chip className={STATUS_STYLE[status]}>{STATUS_LABEL[status]}</Chip>
      {overdue && <button onClick={onMessage} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium hover:bg-slate-100">Message</button>}
      {showLeave && (
        <label className="ml-auto flex items-center gap-1 text-xs text-slate-500 sm:ml-0">
          <input type="checkbox" checked={e.onLeave} onChange={(ev) => onLeave(ev.target.checked)} /> On leave
        </label>
      )}
    </li>
  );
}
