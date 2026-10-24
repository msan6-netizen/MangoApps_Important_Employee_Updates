import type { EditMode, Employee, FieldErrors, Post, PostDraft, Role } from '../types';
import { audienceOverlap, resolvePostAudience } from './audience';
import { audienceInScope } from './scope';
import { addHours, atLeast4hAfter } from './time';

const ROLE_PLURAL: Record<Role, string> = {
  associate: 'Associates', shift_lead: 'Shift leads', store_manager: 'Store managers', ops_manager: 'Operations managers',
};

export const EMERGENCY_MSG = 'Give people at least 4 hours. For emergencies, contact stores directly.';
export const RECONFIRM_MSG = 'Everyone has to re-confirm, so they need at least 4 hours. Set a new deadline.';

/** createdAt + 24h */
export function defaultAckBy(createdAt: string): string {
  return addHours(createdAt, 24);
}

/**
 * Field errors for the compose/edit form. When editing, pass the original post: the audience
 * can't change, and only deadlines that changed are re-checked against the 4-hour rule.
 * With mode 'content' (everyone re-confirms), the deadline must be at least 4 hours away even if unchanged.
 */
export function validatePost(draft: PostDraft, manager: Employee, employees: Employee[], now: string, original?: Post, mode?: EditMode): FieldErrors {
  const e: FieldErrors = {};
  const title = draft.title.trim(), summary = draft.summary.trim();
  if (!title) e.title = 'Add a title.';
  else if (title.length > 80) e.title = 'Keep the title to 80 characters or fewer.';
  if (!summary) e.summary = 'Add a one-line summary.';
  else if (summary.length > 120) e.summary = 'Keep the summary to 120 characters or fewer.';
  if (!draft.body.trim()) e.body = 'Add the full text.';
  if (!draft.category) e.category = 'Choose a category.';

  if (original) {
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    if (!same(draft.actAudience, original.actAudience) || !same(draft.fyiAudience, original.fyiAudience)) {
      e.audience = "The audience can't be changed when editing.";
    }
  } else {
    const { actIds, fyiIds } = resolvePostAudience({ ...draft, authorId: manager.id }, employees);
    const overlap = audienceOverlap(draft.actAudience, draft.fyiAudience);
    const both = [...overlap.roles.map((r) => ROLE_PLURAL[r]), ...overlap.employeeIds.map((id) => employees.find((x) => x.id === id)?.name ?? id)];
    if (actIds.length + fyiIds.length === 0) e.audience = 'Choose at least one person who needs to act or gets it as FYI.';
    else if (both.length) e.audience = `${both.join(', ')} can be in Needs to act or Just FYI, not both.`;
    else if (!audienceInScope(draft.actAudience, manager, employees) || !audienceInScope(draft.fyiAudience, manager, employees)) {
      e.audience = 'You can only post to people at your own store.';
    }
  }

  const hasActors = resolvePostAudience(original ?? { ...draft, authorId: manager.id }, employees).actIds.length > 0;
  if (!hasActors) return e;
  if (!draft.ackBy) e.ackBy = 'Set an acknowledge-by time.';
  else if ((!original || draft.ackBy !== original.ackBy) && !atLeast4hAfter(draft.ackBy, now)) e.ackBy = EMERGENCY_MSG;
  else if (mode === 'content' && !atLeast4hAfter(draft.ackBy, now)) e.ackBy = RECONFIRM_MSG; // passed or too close
  return e;
}
