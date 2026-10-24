import type { Employee, PersonStatus, Post, PostMetrics, Response, Store, StoreRollupRow, TrackerFilter } from '../types';
import { inScope, resolvePostAudience, targetedStoreIds } from './audience';
import { isAcknowledged, isActionRequired, personStatus } from './status';

export interface TrackerRow { employee: Employee; status: PersonStatus; response?: Response; alsoAt: string[] }
export interface TrackerGroup { storeId: string; storeName: string; rows: TrackerRow[] }

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

/** People a tracker follows: the act audience on Action Required posts, the FYI audience on FYI posts. */
export function trackedIds(post: Post, employees: Employee[]): string[] {
  const { actIds, fyiIds } = resolvePostAudience(post, employees);
  return isActionRequired(post) ? actIds : fyiIds;
}

function tally(post: Post, people: Employee[], responses: Response[], now: string) {
  const resp = new Map(responses.filter((r) => r.postId === post.id).map((r) => [r.employeeId, r]));
  const active = people.filter((e) => !e.onLeave);
  return {
    active,
    onLeave: people.length - active.length,
    acknowledged: active.filter((e) => isAcknowledged(post, resp.get(e.id))).length,
    overdue: active.filter((e) => personStatus(post, resp.get(e.id), e, now) === 'overdue').length,
    opened: active.filter((e) => resp.get(e.id)?.openedAt).length,
  };
}

/** Denominator = tracked people excluding on leave. Counts only people in scope when scopeStoreIds is given. */
export function postMetrics(post: Post, responses: Response[], employees: Employee[], now: string, scopeStoreIds?: string[]): PostMetrics {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const { actIds, fyiIds } = resolvePostAudience(post, employees);
  const scoped = (ids: string[]) => ids.map((id) => byId.get(id)!).filter((e) => inScope(e, scopeStoreIds));
  const people = scoped(trackedIds(post, employees));
  const t = tally(post, people, responses, now);
  const denominator = t.active.length;
  return {
    actCount: scoped(actIds).length, fyiCount: scoped(fyiIds).length, denominator,
    acknowledged: t.acknowledged, overdue: t.overdue, onLeave: t.onLeave, opened: t.opened,
    ackPct: pct(t.acknowledged, denominator),
  };
}

/** One row per targeted store (multi-store people count in each), lowest acknowledgment % first. */
export function storeRollup(post: Post, responses: Response[], employees: Employee[], stores: Store[], now: string, scopeStoreIds?: string[]): StoreRollupRow[] {
  const targeted = new Set([post.actAudience, post.fyiAudience].flatMap((a) => targetedStoreIds(a, employees)));
  const tracked = new Set(trackedIds(post, employees));
  return stores
    .filter((s) => targeted.has(s.id) && (!scopeStoreIds || scopeStoreIds.includes(s.id)))
    .map((s) => {
      const people = employees.filter((e) => tracked.has(e.id) && e.storeIds.includes(s.id));
      const t = tally(post, people, responses, now);
      return { storeId: s.id, storeName: s.name, total: t.active.length, acknowledged: t.acknowledged, overdue: t.overdue, ackPct: pct(t.acknowledged, t.active.length) };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => a.ackPct - b.ackPct || a.storeName.localeCompare(b.storeName));
}

/** "Needs follow-up" = overdue + not opened + opened-but-not-acknowledged. */
export function matchesFilter(status: PersonStatus, filter: TrackerFilter): boolean {
  if (filter === 'everyone') return true;
  if (filter === 'acknowledged') return status === 'acknowledged';
  return status === 'overdue' || status === 'not_opened' || status === 'opened';
}

const STATUS_ORDER: PersonStatus[] = ['overdue', 'not_opened', 'opened', 'acknowledged', 'on_leave'];

/**
 * Tracker rows grouped by targeted store (in scope), filtered by tab. People who need follow-up come first.
 * A multi-store person appears under each targeted store they work at, with the other stores in alsoAt.
 */
export function trackerGroups(post: Post, responses: Response[], employees: Employee[], stores: Store[], now: string, filter: TrackerFilter, scopeStoreIds?: string[]): TrackerGroup[] {
  const targeted = new Set([post.actAudience, post.fyiAudience].flatMap((a) => targetedStoreIds(a, employees)));
  const tracked = new Set(trackedIds(post, employees));
  const resp = new Map(responses.filter((r) => r.postId === post.id).map((r) => [r.employeeId, r]));
  const storeName = new Map(stores.map((s) => [s.id, s.name]));
  return stores
    .filter((s) => targeted.has(s.id) && (!scopeStoreIds || scopeStoreIds.includes(s.id)))
    .map((s) => ({
      storeId: s.id,
      storeName: s.name,
      rows: employees
        .filter((e) => tracked.has(e.id) && e.storeIds.includes(s.id))
        .map((e) => ({
          employee: e, response: resp.get(e.id), status: personStatus(post, resp.get(e.id), e, now),
          alsoAt: e.storeIds.filter((id) => id !== s.id).map((id) => storeName.get(id)!),
        }))
        .filter((r) => matchesFilter(r.status, filter))
        .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.employee.name.localeCompare(b.employee.name)),
    }));
}

export interface StoreOverviewRow {
  storeId: string; storeName: string; actionPosts: number; fyiPosts: number;
  required: number; acknowledged: number; overdue: number; ackPct: number;
}

/** Michael's overview: per store, the posts that target it and acknowledgments summed over its Action Required posts. Furthest behind first. */
export function storeOverview(posts: Post[], responses: Response[], employees: Employee[], stores: Store[], now: string): StoreOverviewRow[] {
  return stores
    .map((s) => {
      const mine = posts.filter((p) => [p.actAudience, p.fyiAudience].some((a) => targetedStoreIds(a, employees).includes(s.id)));
      const action = mine.filter(isActionRequired);
      const rows = action.flatMap((p) => storeRollup(p, responses, employees, stores, now, [s.id]));
      const sum = (k: 'total' | 'acknowledged' | 'overdue') => rows.reduce((n, r) => n + r[k], 0);
      return {
        storeId: s.id, storeName: s.name, actionPosts: action.length, fyiPosts: mine.length - action.length,
        required: sum('total'), acknowledged: sum('acknowledged'), overdue: sum('overdue'), ackPct: pct(sum('acknowledged'), sum('total')),
      };
    })
    .sort((a, b) => Number(!a.required) - Number(!b.required) || a.ackPct - b.ackPct || a.storeName.localeCompare(b.storeName));
}
