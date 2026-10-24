import { describe, it, expect } from 'vitest';
import { resolveAudience, resolvePostAudience, visiblePosts, audienceSummary, audienceOverlap, rolesWithoutStore } from './audience';
import { buildSeed, ALEX_ID, MALVIKA_ID, MICHAEL_ID, RACHEL_ID, MULTI_NORTHGATE_BELLEVUE_ID } from '../data/seed';
import type { Audience, Employee, Post } from '../types';

const { employees, posts, stores } = buildSeed();
const byId = (id: string) => posts.find((p) => p.id === id)!;
const aud = (a: Partial<Audience>): Audience => ({ storeIds: [], roles: [], employeeIds: [], ...a });

describe('resolveAudience', () => {
  it('AC4: "Northgate, shift leads only" resolves to Northgate shift leads only', () => {
    const ids = resolveAudience(aud({ storeIds: ['s2'], roles: ['shift_lead'] }), employees);
    expect(ids).toHaveLength(3);
    for (const id of ids) {
      const e = employees.find((x) => x.id === id)!;
      expect(e.role).toBe('shift_lead');
      expect(e.storeIds).toContain('s2');
    }
  });

  it('empty roles means all roles; unions explicit people; never includes the ops manager', () => {
    const ids = resolveAudience(aud({ storeIds: ['s2'], employeeIds: [MALVIKA_ID, MICHAEL_ID] }), employees);
    expect(ids).toHaveLength(41); // 40 Northgate + Malvika
    expect(ids).toContain(MALVIKA_ID);
    expect(ids).not.toContain(MICHAEL_ID);
  });

  it('AC3: a multi-store employee appears once', () => {
    const ids = resolveAudience(aud({ storeIds: ['s2', 's3'], employeeIds: [MULTI_NORTHGATE_BELLEVUE_ID] }), employees);
    expect(ids.filter((id) => id === MULTI_NORTHGATE_BELLEVUE_ID)).toHaveLength(1);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('null audience resolves to nobody', () => {
    expect(resolveAudience(null, employees)).toEqual([]);
  });
});

describe('resolvePostAudience', () => {
  it('AC2: a person in both act and FYI appears once, as act', () => {
    const post = { actAudience: aud({ storeIds: ['s2'], roles: ['associate'] }), fyiAudience: aud({ storeIds: ['s2'] }) };
    const { actIds, fyiIds } = resolvePostAudience(post, employees);
    expect(actIds).toContain(ALEX_ID);
    expect(fyiIds).not.toContain(ALEX_ID);
    expect(fyiIds).toContain(RACHEL_ID);
    expect(fyiIds).toHaveLength(4); // manager + 3 shift leads
  });
});

describe('the author is never in their own post', () => {
  it('Rachel is not in her own return-policy post, as act or FYI', () => {
    const returns = byId('p-returns');
    expect(returns.authorId).toBe(RACHEL_ID);
    const { actIds, fyiIds } = resolvePostAudience(returns, employees);
    expect(actIds).not.toContain(RACHEL_ID);
    expect(fyiIds).not.toContain(RACHEL_ID);
    expect(actIds).toContain(ALEX_ID);
  });

  it('she is still in posts other people write (Michael\'s ladder post)', () => {
    expect(resolvePostAudience(byId('p-ladder'), employees).actIds).toContain(RACHEL_ID);
  });

  it('a draft excludes the author passed in', () => {
    const draft = { actAudience: aud({ storeIds: ['s2'] }), fyiAudience: null, authorId: RACHEL_ID };
    expect(resolvePostAudience(draft, employees).actIds).not.toContain(RACHEL_ID);
  });
});

describe('visiblePosts', () => {
  it('AC1: Malvika (Renton) does not see Northgate posts', () => {
    const ids = visiblePosts(MALVIKA_ID, posts, employees).map((p) => p.id).sort();
    expect(ids).toEqual(['p-holiday', 'p-ladder', 'p-lunch']);
  });

  it('Alex sees the Northgate posts and not the Renton lunch', () => {
    const ids = visiblePosts(ALEX_ID, posts, employees).map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['p-ladder', 'p-recall', 'p-returns', 'p-holiday', 'p-parking', 'p-sales']));
    expect(ids).not.toContain('p-lunch');
  });

  it('a multi-store employee sees posts for both stores', () => {
    const ids = visiblePosts(MULTI_NORTHGATE_BELLEVUE_ID, posts, employees).map((p) => p.id);
    expect(ids).toContain('p-parking'); // Northgate only
  });
});

describe('audienceSummary', () => {
  it('names the stores and counts act / FYI', () => {
    expect(audienceSummary(byId('p-returns'), employees, stores)).toBe('Northgate · 39 to act'); // Rachel wrote it, so she isn't in it
    expect(audienceSummary(byId('p-recall'), employees, stores)).toBe('Northgate, Bellevue · 78 to act, 1 FYI');
    expect(audienceSummary(byId('p-ladder'), employees, stores)).toBe('All stores · 200 to act');
    expect(audienceSummary(byId('p-lunch'), employees, stores)).toBe('Renton · 40 FYI'); // minus the Renton store manager, who wrote it
  });

  it('scoped to Northgate for a store manager', () => {
    expect(audienceSummary(byId('p-recall'), employees, stores, ['s2'])).toBe('Northgate · 39 to act, 1 FYI');
  });

  it('explicit people only', () => {
    const small: Employee[] = [{ id: 'a', name: 'A', role: 'associate', storeIds: ['s2'], onLeave: false }];
    const p = { actAudience: aud({ employeeIds: ['a'] }), fyiAudience: null } as Post;
    expect(audienceSummary(p, small, stores)).toBe('Selected people · 1 to act');
  });
});

describe('audienceOverlap (Needs to act and Just FYI are mutually exclusive)', () => {
  it('finds roles and people chosen in both', () => {
    const act = aud({ storeIds: ['s2'], roles: ['associate', 'shift_lead'], employeeIds: [ALEX_ID] });
    const fyi = aud({ storeIds: ['s2'], roles: ['shift_lead', 'store_manager'], employeeIds: [ALEX_ID, RACHEL_ID] });
    expect(audienceOverlap(act, fyi)).toEqual({ roles: ['shift_lead'], employeeIds: [ALEX_ID] });
  });

  it('sharing a store is fine; nothing overlaps when one side is empty', () => {
    expect(audienceOverlap(aud({ storeIds: ['s2'], roles: ['associate'] }), aud({ storeIds: ['s2'], roles: ['store_manager'] })))
      .toEqual({ roles: [], employeeIds: [] });
    expect(audienceOverlap(null, aud({ roles: ['associate'] }))).toEqual({ roles: [], employeeIds: [] });
  });
});

describe('rolesWithoutStore ("Pick a store for these roles")', () => {
  it('true when roles are ticked but no store is selected', () => {
    expect(rolesWithoutStore(aud({ roles: ['shift_lead'] }))).toBe(true);
    expect(rolesWithoutStore(aud({ roles: ['store_manager'], employeeIds: [ALEX_ID] }))).toBe(true); // people don't count as a store
  });

  it('false once a store is picked, with no roles, or with no audience', () => {
    expect(rolesWithoutStore(aud({ storeIds: ['s2'], roles: ['shift_lead'] }))).toBe(false);
    expect(rolesWithoutStore(aud({ employeeIds: [ALEX_ID] }))).toBe(false);
    expect(rolesWithoutStore(null)).toBe(false);
  });

  it('those roles reach nobody until a store is picked', () => {
    expect(resolveAudience(aud({ roles: ['shift_lead'] }), employees)).toEqual([]);
  });
});
