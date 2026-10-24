import type { Audience, Employee, Post, Store } from '../types';
import { resolvePostAudience, targetedStoreIds } from './audience';
import { byNewest } from './ordering';

const isOps = (m: Employee) => m.role === 'ops_manager';

export function managerStoreIds(manager: Employee, stores: Store[]): string[] {
  return isOps(manager) ? stores.map((s) => s.id) : manager.storeIds;
}

/** Store managers see posts that reach anyone at their store(s); the ops manager sees all. Newest first. */
export function postsForManager(manager: Employee, posts: Post[], employees: Employee[]): Post[] {
  const byId = new Map(employees.map((e) => [e.id, e]));
  return byNewest(posts.filter((p) => {
    if (isOps(manager)) return true;
    const { actIds, fyiIds } = resolvePostAudience(p, employees);
    return [...actIds, ...fyiIds].some((id) => byId.get(id)!.storeIds.some((s) => manager.storeIds.includes(s)));
  }));
}

/** Michael's "All posts" tab: posts for every store first, then each store's own posts (a post for two stores is under both). Newest first. */
export function postsByStore(posts: Post[], employees: Employee[], stores: Store[]): { name: string; posts: Post[] }[] {
  const storesOf = (p: Post) => new Set([p.actAudience, p.fyiAudience].flatMap((a) => targetedStoreIds(a, employees)));
  const everywhere = (p: Post) => stores.every((s) => storesOf(p).has(s.id));
  const groups = [
    { name: 'All stores', posts: posts.filter(everywhere) },
    ...stores.map((s) => ({ name: s.name, posts: posts.filter((p) => !everywhere(p) && storesOf(p).has(s.id)) })),
  ];
  return groups.filter((g) => g.posts.length).map((g) => ({ ...g, posts: byNewest(g.posts) }));
}

/** People a manager may add by name. */
export function scopedEmployees(manager: Employee, employees: Employee[]): Employee[] {
  return employees.filter((e) => !isOps(e) && (isOps(manager) || e.storeIds.some((s) => manager.storeIds.includes(s))));
}

export function audienceInScope(a: Audience | null, manager: Employee, employees: Employee[]): boolean {
  if (!a || isOps(manager)) return true;
  const allowed = new Set(scopedEmployees(manager, employees).map((e) => e.id));
  return a.storeIds.every((s) => manager.storeIds.includes(s)) && a.employeeIds.every((id) => allowed.has(id));
}

export function canEditPost(manager: Employee, post: Post, employees: Employee[]): boolean {
  return audienceInScope(post.actAudience, manager, employees) && audienceInScope(post.fyiAudience, manager, employees);
}
