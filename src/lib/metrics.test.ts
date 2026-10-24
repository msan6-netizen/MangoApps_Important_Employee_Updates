import { describe, it, expect } from 'vitest';
import { postMetrics, storeRollup, storeOverview, matchesFilter, trackerGroups } from './metrics';
import { acknowledge } from './status';
import { DEMO_START } from './time';
import { buildSeed, ALEX_ID, MALVIKA_ID, MULTI_NORTHGATE_BELLEVUE_ID } from '../data/seed';

const NOW = DEMO_START;
const seed = buildSeed();
const post = (id: string) => seed.posts.find((p) => p.id === id)!;

describe('postMetrics', () => {
  it('AC23: ladder counts are out of 195 (200 minus 5 on leave)', () => {
    const m = postMetrics(post('p-ladder'), seed.responses, seed.employees, NOW);
    expect(m.actCount).toBe(200);
    expect(m.onLeave).toBe(5);
    expect(m.denominator).toBe(195);
    expect(m.acknowledged).toBe(150);
    expect(m.ackPct).toBe(77);
    expect(m.overdue).toBe(45);
  });

  it('AC1: Malvika is not counted on a Northgate post', () => {
    const before = postMetrics(post('p-returns'), seed.responses, seed.employees, NOW);
    const responses = acknowledge(seed.responses, post('p-returns'), MALVIKA_ID, NOW);
    const after = postMetrics(post('p-returns'), responses, seed.employees, NOW);
    expect(after).toEqual(before);
  });

  it('AC10: a second acknowledgment does not change counts', () => {
    const once = acknowledge(seed.responses, post('p-returns'), ALEX_ID, NOW);
    const twice = acknowledge(once, post('p-returns'), ALEX_ID, NOW);
    const a = postMetrics(post('p-returns'), once, seed.employees, NOW);
    expect(a.acknowledged).toBe(6); // 5 seeded (Rachel, the author, isn't counted) + Alex
    expect(postMetrics(post('p-returns'), twice, seed.employees, NOW)).toEqual(a);
  });

  it('AC15: on leave leaves the denominator and overdue', () => {
    const employees = seed.employees.map((e) => (e.id === ALEX_ID ? { ...e, onLeave: true } : e));
    const before = postMetrics(post('p-ladder'), seed.responses, seed.employees, NOW);
    const after = postMetrics(post('p-ladder'), seed.responses, employees, NOW);
    expect(after.denominator).toBe(before.denominator - 1);
    expect(after.overdue).toBe(before.overdue - 1);
    expect(after.onLeave).toBe(6);
  });

  it('scoped to Northgate for Rachel', () => {
    const m = postMetrics(post('p-ladder'), seed.responses, seed.employees, NOW, ['s2']);
    expect(m.denominator).toBe(39);
    expect(m.acknowledged).toBe(21);
  });

  it('counts the FYI audience separately on an Action Required post', () => {
    const m = postMetrics(post('p-recall'), seed.responses, seed.employees, NOW);
    expect(m.actCount).toBe(78);
    expect(m.fyiCount).toBe(1);
  });

  it('FYI posts track opened over the FYI audience', () => {
    const m = postMetrics(post('p-lunch'), seed.responses, seed.employees, NOW);
    expect(m.actCount).toBe(0);
    expect(m.fyiCount).toBe(40); // Renton minus its store manager, who wrote it
    expect(m.opened).toBeGreaterThan(0);
  });
});

describe('storeRollup', () => {
  it('AC22: ladder shows 5 rows with Northgate (lowest %) on top', () => {
    const rows = storeRollup(post('p-ladder'), seed.responses, seed.employees, seed.stores, NOW);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({ storeName: 'Northgate', acknowledged: 21, total: 39 });
    for (let i = 1; i < rows.length; i++) expect(rows[i].ackPct).toBeGreaterThanOrEqual(rows[i - 1].ackPct);
    expect(rows[rows.length - 1].storeName).toBe('Downtown Seattle');
  });

  it('only the stores the post targets (a Bellevue + Renton person does not add a Renton row)', () => {
    const rows = storeRollup(post('p-recall'), seed.responses, seed.employees, seed.stores, NOW);
    expect(rows.map((r) => r.storeName).sort()).toEqual(['Bellevue', 'Northgate']);
  });
});

describe('matchesFilter', () => {
  it('Needs follow-up = overdue + not opened + opened', () => {
    expect(matchesFilter('overdue', 'needs_follow_up')).toBe(true);
    expect(matchesFilter('not_opened', 'needs_follow_up')).toBe(true);
    expect(matchesFilter('opened', 'needs_follow_up')).toBe(true);
    expect(matchesFilter('acknowledged', 'needs_follow_up')).toBe(false);
    expect(matchesFilter('on_leave', 'needs_follow_up')).toBe(false);
  });

  it('Acknowledged tab = acknowledged only; Everyone = everyone', () => {
    expect(matchesFilter('acknowledged', 'acknowledged')).toBe(true);
    expect(matchesFilter('opened', 'acknowledged')).toBe(false);
    expect(matchesFilter('on_leave', 'everyone')).toBe(true);
  });
});

describe('trackerGroups', () => {
  const ladder = post('p-ladder');

  it('AC24: Needs follow-up (the default) lists Alex until he acknowledges', () => {
    const groups = trackerGroups(ladder, seed.responses, seed.employees, seed.stores, NOW, 'needs_follow_up', ['s2']);
    expect(groups.map((g) => g.storeName)).toEqual(['Northgate']);
    const alex = groups[0].rows.find((r) => r.employee.id === ALEX_ID)!;
    expect(alex.status).toBe('overdue');
    const after = trackerGroups(ladder, acknowledge(seed.responses, ladder, ALEX_ID, NOW), seed.employees, seed.stores, NOW, 'needs_follow_up', ['s2']);
    expect(after[0].rows.map((r) => r.employee.id)).not.toContain(ALEX_ID);
  });

  it('AC21: Rachel\'s tracker shows only Northgate people', () => {
    const groups = trackerGroups(ladder, seed.responses, seed.employees, seed.stores, NOW, 'everyone', ['s2']);
    expect(groups).toHaveLength(1);
    expect(groups[0].rows).toHaveLength(40);
    expect(groups[0].rows.every((r) => r.employee.storeIds.includes('s2'))).toBe(true);
  });

  it('Michael: one group per targeted store; multi-store people appear in each, marked "also at"', () => {
    const groups = trackerGroups(ladder, seed.responses, seed.employees, seed.stores, NOW, 'everyone');
    expect(groups.map((g) => g.storeName)).toEqual(['Downtown Seattle', 'Northgate', 'Bellevue', 'Renton', 'Tacoma']);
    const inNorthgate = groups[1].rows.find((r) => r.employee.id === MULTI_NORTHGATE_BELLEVUE_ID)!;
    const inBellevue = groups[2].rows.find((r) => r.employee.id === MULTI_NORTHGATE_BELLEVUE_ID)!;
    expect(inNorthgate.alsoAt).toEqual(['Bellevue']);
    expect(inBellevue.alsoAt).toEqual(['Northgate']);
  });

  it('Acknowledged tab and on leave', () => {
    const acked = trackerGroups(ladder, seed.responses, seed.employees, seed.stores, NOW, 'acknowledged', ['s2']);
    expect(acked[0].rows).toHaveLength(21);
    const follow = trackerGroups(ladder, seed.responses, seed.employees, seed.stores, NOW, 'needs_follow_up', ['s2']);
    expect(follow[0].rows.some((r) => r.status === 'on_leave')).toBe(false);
  });

  it('managers sort the rows so the people needing follow-up come first, then by name', () => {
    const groups = trackerGroups(ladder, seed.responses, seed.employees, seed.stores, NOW, 'everyone', ['s2']);
    const statuses = groups[0].rows.map((r) => r.status);
    expect(statuses[0]).toBe('overdue');
    expect(statuses.lastIndexOf('overdue')).toBeLessThan(statuses.indexOf('acknowledged'));
  });
});

describe('storeOverview (Michael\'s default tab)', () => {
  const rows = storeOverview(seed.posts, seed.responses, seed.employees, seed.stores, NOW);
  const row = (name: string) => rows.find((r) => r.storeName === name)!;

  it('one row per store, the store furthest behind on top', () => {
    expect(rows).toHaveLength(5);
    expect(rows[0].storeName).toBe('Northgate');
    const pcts = rows.map((r) => r.ackPct);
    expect(pcts).toEqual([...pcts].sort((a, b) => a - b));
  });

  it('counts Action Required and FYI posts each store is targeted by', () => {
    expect([row('Northgate').actionPosts, row('Northgate').fyiPosts]).toEqual([3, 3]); // ladder, recall, returns · holiday, parking, sales
    expect([row('Bellevue').actionPosts, row('Bellevue').fyiPosts]).toEqual([2, 1]);  // ladder, recall · holiday
    expect([row('Renton').actionPosts, row('Renton').fyiPosts]).toEqual([1, 2]);      // ladder · holiday, lunch
  });

  it('acknowledged and overdue add up the per-post store rows', () => {
    const action = seed.posts.filter((p) => p.ackBy);
    const ng = action.flatMap((p) => storeRollup(p, seed.responses, seed.employees, seed.stores, NOW)).filter((r) => r.storeName === 'Northgate');
    const sum = (k: 'total' | 'acknowledged' | 'overdue') => ng.reduce((n, r) => n + r[k], 0);
    expect(row('Northgate')).toMatchObject({ required: sum('total'), acknowledged: sum('acknowledged'), overdue: sum('overdue') });
  });
});
