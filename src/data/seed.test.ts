import { describe, it, expect } from 'vitest';
import { buildSeed, ALEX_ID, MALVIKA_ID, MICHAEL_ID, RACHEL_ID } from './seed';

describe('seed', () => {
  const seed = buildSeed();

  it('AC23: exactly 200 employees plus Michael', () => {
    expect(seed.employees.filter((e) => e.role !== 'ops_manager')).toHaveLength(200);
    expect(seed.employees.filter((e) => e.role === 'ops_manager').map((e) => e.id)).toEqual([MICHAEL_ID]);
  });

  it('AC23: two resets produce identical data', () => {
    expect(buildSeed()).toEqual(seed);
  });

  it('5 stores, 40 per home store: 1 manager, 3 shift leads, 36 associates', () => {
    expect(seed.stores.map((s) => s.name)).toEqual(['Downtown Seattle', 'Northgate', 'Bellevue', 'Renton', 'Tacoma']);
    for (const s of seed.stores) {
      const home = seed.employees.filter((e) => e.storeIds[0] === s.id);
      expect(home).toHaveLength(40);
      expect(home.filter((e) => e.role === 'store_manager')).toHaveLength(1);
      expect(home.filter((e) => e.role === 'shift_lead')).toHaveLength(3);
    }
  });

  it('names are unique', () => {
    const names = seed.employees.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('fixed people', () => {
    const get = (id: string) => seed.employees.find((e) => e.id === id)!;
    expect(get(RACHEL_ID)).toMatchObject({ name: 'Rachel Kim', role: 'store_manager', storeIds: ['s2'] });
    expect(get(ALEX_ID)).toMatchObject({ name: 'Alex Rivera', role: 'associate', storeIds: ['s2'] });
    expect(get(MALVIKA_ID)).toMatchObject({ name: 'Malvika Sanghvi', role: 'associate', storeIds: ['s4'] });
    expect(get(MICHAEL_ID)).toMatchObject({ name: 'Michael Torres', role: 'ops_manager', storeIds: [] });
  });

  it('3 people work at two stores (one Northgate + Bellevue); 5 on leave (one at Northgate)', () => {
    const multi = seed.employees.filter((e) => e.storeIds.length === 2);
    expect(multi).toHaveLength(3);
    expect(multi.some((e) => e.storeIds.includes('s2') && e.storeIds.includes('s3'))).toBe(true);
    const leave = seed.employees.filter((e) => e.onLeave);
    expect(leave).toHaveLength(5);
    expect(leave.filter((e) => e.storeIds.includes('s2'))).toHaveLength(1);
  });

  it('7 posts, each with a summary; recall ackBy is Thu Oct 29 10:00 AM Pacific', () => {
    expect(seed.posts).toHaveLength(7);
    expect(seed.posts.every((p) => p.summary.length > 0 && p.summary.length <= 120)).toBe(true);
    expect(seed.posts.find((p) => p.id === 'p-recall')!.ackBy).toBe(new Date('2026-10-29T10:00:00-07:00').toISOString());
  });

  it('all seed timestamps are at or before the demo clock and acknowledgments are timestamped', () => {
    const now = new Date('2026-10-28T09:00:00-07:00').toISOString();
    for (const r of seed.responses) {
      for (const t of [r.openedAt, r.acknowledgedAt]) if (t) expect(t <= now).toBe(true);
    }
  });

  it('Alex: ladder, recall and return policy not acknowledged; Malvika: ladder not acknowledged', () => {
    const r = (p: string, e: string) => seed.responses.find((x) => x.postId === p && x.employeeId === e);
    expect(r('p-ladder', ALEX_ID)?.acknowledgedAt).toBeUndefined();
    expect(r('p-recall', ALEX_ID)?.acknowledgedAt).toBeUndefined();
    expect(r('p-returns', ALEX_ID)?.acknowledgedAt).toBeUndefined();
    expect(r('p-ladder', MALVIKA_ID)?.acknowledgedAt).toBeUndefined();
  });
});
