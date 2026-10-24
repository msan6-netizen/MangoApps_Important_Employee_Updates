import type { Audience, Employee, Post, Role, Store } from '../types';

type Audiences = Pick<Post, 'actAudience' | 'fyiAudience'> & { authorId?: string };

/** Store + role matches UNION explicit people, deduplicated. The ops manager is never in an audience. */
export function resolveAudience(a: Audience | null, employees: Employee[]): string[] {
  if (!a) return [];
  return employees
    .filter((e) => e.role !== 'ops_manager')
    .filter((e) =>
      (e.storeIds.some((s) => a.storeIds.includes(s)) && (a.roles.length === 0 || a.roles.includes(e.role))) ||
      a.employeeIds.includes(e.id))
    .map((e) => e.id);
}

/** Act wins: anyone in both audiences is only in actIds. The author is never in their own post. */
export function resolvePostAudience(post: Audiences, employees: Employee[]): { actIds: string[]; fyiIds: string[] } {
  const actIds = resolveAudience(post.actAudience, employees).filter((id) => id !== post.authorId);
  const act = new Set(actIds);
  const fyiIds = resolveAudience(post.fyiAudience, employees).filter((id) => !act.has(id) && id !== post.authorId);
  return { actIds, fyiIds };
}

export function visiblePosts(employeeId: string, posts: Post[], employees: Employee[]): Post[] {
  return posts.filter((p) => {
    const { actIds, fyiIds } = resolvePostAudience(p, employees);
    return actIds.includes(employeeId) || fyiIds.includes(employeeId);
  });
}

/** Roles ticked with no store selected: they reach nobody, so the picker says "Pick a store for these roles". */
export function rolesWithoutStore(a: Audience | null): boolean {
  return !!a && a.roles.length > 0 && a.storeIds.length === 0;
}

/** Roles and people chosen in both pickers. Needs to act and Just FYI are mutually exclusive; stores may be shared. */
export function audienceOverlap(act: Audience | null, fyi: Audience | null): { roles: Role[]; employeeIds: string[] } {
  if (!act || !fyi) return { roles: [], employeeIds: [] };
  return {
    roles: act.roles.filter((r) => fyi.roles.includes(r)),
    employeeIds: act.employeeIds.filter((id) => fyi.employeeIds.includes(id)),
  };
}

/** Stores an audience targets: its store checkboxes plus the stores of anyone added by name. */
export function targetedStoreIds(a: Audience | null, employees: Employee[]): string[] {
  if (!a) return [];
  const named = employees.filter((e) => a.employeeIds.includes(e.id)).flatMap((e) => e.storeIds);
  return [...new Set([...a.storeIds, ...named])];
}

export const inScope = (e: Employee, scopeStoreIds?: string[]) =>
  !scopeStoreIds || e.storeIds.some((s) => scopeStoreIds.includes(s));

/** "Northgate · 38 to act, 1 FYI". Counts only people in scope when scopeStoreIds is given. */
export function audienceSummary(post: Audiences, employees: Employee[], stores: Store[], scopeStoreIds?: string[]): string {
  const targeted = new Set([...(post.actAudience?.storeIds ?? []), ...(post.fyiAudience?.storeIds ?? [])]);
  const named = stores.filter((s) => targeted.has(s.id) && (!scopeStoreIds || scopeStoreIds.includes(s.id)));
  const where = named.length === 0 ? 'Selected people'
    : !scopeStoreIds && named.length === stores.length ? 'All stores'
    : named.map((s) => s.name).join(', ');

  const byId = new Map(employees.map((e) => [e.id, e]));
  const count = (ids: string[]) => ids.filter((id) => inScope(byId.get(id)!, scopeStoreIds)).length;
  const { actIds, fyiIds } = resolvePostAudience(post, employees);
  const parts = [];
  const act = count(actIds), fyi = count(fyiIds);
  if (act) parts.push(`${act} to act`);
  if (fyi) parts.push(`${fyi} FYI`);
  return `${where} · ${parts.join(', ') || 'nobody'}`;
}
