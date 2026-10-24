import type { Employee, Reminder } from '../../types';
import { fmtStamp } from '../../lib/time';

/** Simulated SMS reminders that are due at the demo clock. Nothing is sent. */
export function ReminderLog({ reminders, employees, now }: { reminders: Reminder[]; employees: Employee[]; now: string }) {
  const name = new Map(employees.map((e) => [e.id, e.name]));
  const newest = [...reminders].reverse();
  return (
    <details className="rounded-xl border border-slate-200 bg-white" data-testid="reminder-log">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
        Reminder log <span className="font-normal text-slate-500">({reminders.length} simulated texts)</span>
      </summary>
      {newest.length === 0
        ? <p className="px-4 pb-3 text-sm text-slate-500">No reminders due yet.</p>
        : <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto border-t border-slate-100 text-sm">
            {newest.map((r) => (
              <li key={r.employeeId} className="flex flex-wrap gap-x-2 px-4 py-2" data-testid="reminder">
                <span className="tabular-nums text-slate-500">{fmtStamp(r.at, now)}</span>
                <span>📱 SMS to {name.get(r.employeeId)}</span>
                <span className="text-slate-500">· Acknowledgment reminder</span>
              </li>
            ))}
          </ul>}
    </details>
  );
}
