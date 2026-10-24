import { useState } from 'react';
import type { Audience, Employee, Role, Store } from '../../types';
import { ROLE_LABEL } from '../labels';
import { rolesWithoutStore } from '../../lib/audience';

const ROLES: Role[] = ['associate', 'shift_lead', 'store_manager'];

interface Props {
  label: string; testId: string; value: Audience | null; onChange: (a: Audience | null) => void;
  stores: Store[]; allStores: Store[]; people: Employee[]; disabled?: boolean;
  /** The other picker's selection: its roles and people can't be chosen here (the two are mutually exclusive). */
  taken: Audience | null; takenBy: string;
}

/** Store checkboxes, role checkboxes (none = all roles), and people added by name. Options are already scoped to the manager. */
export function AudiencePicker({ label, testId, value, onChange, stores, allStores, people, disabled, taken, takenBy }: Props) {
  const [query, setQuery] = useState('');
  const a = value ?? { storeIds: [], roles: [], employeeIds: [] };
  const set = (next: Audience) => onChange(next.storeIds.length || next.employeeIds.length || next.roles.length ? next : null);
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  const byId = new Map(people.map((e) => [e.id, e]));
  const storeName = new Map(allStores.map((s) => [s.id, s.name]));
  const q = query.trim().toLowerCase();
  const takenPeople = taken?.employeeIds ?? [];
  const matches = q ? people.filter((e) => e.name.toLowerCase().includes(q) && !a.employeeIds.includes(e.id) && !takenPeople.includes(e.id)).slice(0, 6) : [];

  return (
    <fieldset disabled={disabled} data-testid={testId} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 disabled:opacity-60">
      <legend className="px-1 text-sm font-semibold">{label}</legend>
      <div>
        <p className="mb-1 text-xs font-medium text-slate-500">Stores</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {stores.map((s) => (
            <label key={s.id} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={a.storeIds.includes(s.id)} onChange={() => set({ ...a, storeIds: toggle(a.storeIds, s.id) })} />
              {s.name}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-slate-500">Roles <span className="font-normal">(none checked = everyone at those stores)</span></p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {ROLES.map((r) => {
            const inOther = !!taken?.roles.includes(r);
            return (
              <label key={r} className={`flex items-center gap-1.5 text-sm ${inOther ? 'text-slate-400' : ''}`} title={inOther ? `Already in ${takenBy}` : undefined}>
                <input type="checkbox" checked={a.roles.includes(r)} disabled={inOther} onChange={() => set({ ...a, roles: toggle(a.roles, r) })} />
                {ROLE_LABEL[r]}s{inOther && <span className="text-xs"> (in {takenBy})</span>}
              </label>
            );
          })}
        </div>
      </div>
      {rolesWithoutStore(value) && (
        <p className="text-sm font-medium text-amber-700" data-testid="pick-store">Pick a store for these roles</p>
      )}
      <div>
        <p className="mb-1 text-xs font-medium text-slate-500">Add people</p>
        {a.employeeIds.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {a.employeeIds.map((id) => (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                {byId.get(id)?.name ?? id}
                <button type="button" aria-label={`Remove ${byId.get(id)?.name}`} onClick={() => set({ ...a, employeeIds: a.employeeIds.filter((x) => x !== id) })}>×</button>
              </span>
            ))}
          </div>
        )}
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" aria-label={`${label}: search people`} />
        {matches.length > 0 && (
          <ul className="mt-1 divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm" data-testid="people-results">
            {matches.map((e) => (
              <li key={e.id}>
                <button type="button" className="w-full px-3 py-2 text-left hover:bg-slate-50"
                  onClick={() => { set({ ...a, employeeIds: [...a.employeeIds, e.id] }); setQuery(''); }}>
                  {e.name} <span className="text-slate-500">· {ROLE_LABEL[e.role]} · {e.storeIds.map((s) => storeName.get(s)).join(', ')}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </fieldset>
  );
}
