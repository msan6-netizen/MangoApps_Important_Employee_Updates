import { describe, it, expect } from 'vitest';
import { managerStoreIds, postsForManager, postsByStore, scopedEmployees, audienceInScope, canEditPost } from './scope';
import { buildSeed, RACHEL_ID, MICHAEL_ID, MALVIKA_ID, ALEX_ID } from '../data/seed';

const seed = buildSeed();
const rachel = seed.employees.find((e) => e.id === RACHEL_ID)!;
const michael = seed.employees.find((e) => e.id === MICHAEL_ID)!;
const post = (id: string) => seed.posts.find((p) => p.id === id)!;

describe('scope', () => {
  it('Rachel is limited to Northgate; Michael gets all stores', () => {
    expect(managerStoreIds(rachel, seed.stores)).toEqual(['s2']);
    expect(managerStoreIds(michael, seed.stores)).toEqual(['s1', 's2', 's3', 's4', 's5']);
  });

  it('AC21: Rachel\'s posts list excludes the Renton team lunch', () => {
    const ids = postsForManager(rachel, seed.posts, seed.employees).map((p) => p.id);
    expect(ids).not.toContain('p-lunch');
    expect(ids).toEqual(expect.arrayContaining(['p-ladder', 'p-recall', 'p-returns', 'p-holiday', 'p-parking', 'p-sales']));
  });

  it('AC22: Michael sees all posts, newest first', () => {
    const list = postsForManager(michael, seed.posts, seed.employees);
    expect(list).toHaveLength(7);
    expect(list[0].id).toBe('p-returns');
  });

  it('AC8: Rachel\'s pickers offer only Northgate people; Michael\'s offer everyone but himself', () => {
    const r = scopedEmployees(rachel, seed.employees);
    expect(r).toHaveLength(40);
    expect(r.every((e) => e.storeIds.includes('s2'))).toBe(true);
    expect(scopedEmployees(michael, seed.employees)).toHaveLength(200);
  });

  it('AC8: audience outside Northgate is out of scope for Rachel, fine for Michael', () => {
    const renton = { storeIds: ['s4'], roles: [], employeeIds: [] };
    expect(audienceInScope(renton, rachel, seed.employees)).toBe(false);
    expect(audienceInScope({ storeIds: [], roles: [], employeeIds: [MALVIKA_ID] }, rachel, seed.employees)).toBe(false);
    expect(audienceInScope({ storeIds: ['s2'], roles: [], employeeIds: [ALEX_ID] }, rachel, seed.employees)).toBe(true);
    expect(audienceInScope(renton, michael, seed.employees)).toBe(true);
  });

  it('Rachel can edit Northgate-only posts, not multi-store ones', () => {
    expect(canEditPost(rachel, post('p-returns'), seed.employees)).toBe(true);
    expect(canEditPost(rachel, post('p-ladder'), seed.employees)).toBe(false);
    expect(canEditPost(rachel, post('p-recall'), seed.employees)).toBe(false);
    expect(canEditPost(michael, post('p-ladder'), seed.employees)).toBe(true);
  });
});

describe('postsForManager ordering', () => {
  it('posts created at the same demo-clock time: the later one is newer', () => {
    const a = { ...post('p-returns'), id: 'post-8' };
    const b2 = { ...post('p-returns'), id: 'post-9' };
    const ids = postsForManager(michael, [...seed.posts, a, b2], seed.employees).map((p) => p.id);
    expect(ids.slice(0, 3)).toEqual(['post-9', 'post-8', 'p-returns']);
  });
});

describe('postsByStore (Michael\'s "All posts" tab)', () => {
  const s = buildSeed();
  const groups = postsByStore(s.posts, s.employees, s.stores);
  const ids = (name: string) => groups.find((g) => g.name === name)?.posts.map((p) => p.id);

  it('company-wide posts first, then each store, skipping stores with no posts of their own', () => {
    expect(groups.map((g) => g.name)).toEqual(['All stores', 'Northgate', 'Bellevue', 'Renton']);
    expect(ids('All stores')).toEqual(['p-holiday', 'p-ladder']);
  });

  it('a post for two stores shows under both; newest first', () => {
    expect(ids('Northgate')).toEqual(['p-returns', 'p-parking', 'p-recall', 'p-sales']);
    expect(ids('Bellevue')).toEqual(['p-recall']);
    expect(ids('Renton')).toEqual(['p-lunch']);
  });
});
