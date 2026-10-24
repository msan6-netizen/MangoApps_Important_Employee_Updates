import type { Category, PersonStatus, Role } from '../types';

export const ROLE_LABEL: Record<Role, string> = {
  associate: 'Associate', shift_lead: 'Shift lead', store_manager: 'Store manager', ops_manager: 'Operations manager',
};

/** Shown in the compose form. Category is a label for scanning; it never changes the order (the deadline does). */
export const CATEGORY_HINT: Record<Category, string> = {
  Safety: 'Could hurt someone: hazards, recalls, equipment, emergency procedures.',
  Policy: 'Rules people must follow: procedures, pay, scheduling, conduct, returns.',
  General: 'Everything else: events, store news, recognition.',
};

export const STATUS_LABEL: Record<PersonStatus, string> = {
  overdue: 'Overdue', not_opened: 'Not opened', opened: 'Opened', acknowledged: 'Acknowledged', on_leave: 'On leave',
};

export const STATUS_STYLE: Record<PersonStatus, string> = {
  overdue: 'bg-red-600 text-white ring-red-600',
  not_opened: 'bg-slate-100 text-slate-600 ring-slate-300',
  opened: 'bg-amber-50 text-amber-800 ring-amber-300',
  acknowledged: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  on_leave: 'bg-white text-slate-400 ring-slate-200',
};
