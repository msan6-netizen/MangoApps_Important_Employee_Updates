import type { Employee, GuardrailWarning, Post, PostDraft, Store } from '../types';
import { resolveAudience, targetedStoreIds } from './audience';
import { isActionRequired } from './status';
import { daysBefore } from './time';

const LIMIT = 3;

/** Warn (never block) for each store the draft's act audience targets that already has 3+ Action Required posts in the last 7 days. */
export function guardrailWarnings(draft: PostDraft, posts: Post[], employees: Employee[], stores: Store[], now: string): GuardrailWarning[] {
  if (resolveAudience(draft.actAudience, employees).length === 0) return [];
  const draftStores = new Set(targetedStoreIds(draft.actAudience, employees));

  const weekAgo = daysBefore(now, 7);
  const recent = posts
    .filter((p) => isActionRequired(p) && p.createdAt > weekAgo && p.createdAt <= now)
    .map((p) => new Set(targetedStoreIds(p.actAudience, employees)));

  return stores
    .filter((s) => draftStores.has(s.id))
    .map((s) => ({ s, count: recent.filter((set) => set.has(s.id)).length }))
    .filter(({ count }) => count >= LIMIT)
    .map(({ s, count }) => ({
      storeId: s.id, storeName: s.name, count,
      message: `${s.name} already has ${count} Action Required posts this week. Too many can make them easy to ignore.`,
    }));
}

/** "Change to FYI": everyone who would have acted now gets it as FYI; nobody is added or dropped. */
export function changeToFyi(draft: PostDraft, employees: Employee[]): PostDraft {
  const act = draft.actAudience;
  if (!act) return draft;
  const fyiAudience = draft.fyiAudience
    ? { ...act, employeeIds: [...new Set([...act.employeeIds, ...resolveAudience(draft.fyiAudience, employees)])] }
    : act;
  return { ...draft, actAudience: null, fyiAudience, ackBy: null };
}
