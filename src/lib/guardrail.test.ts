import { describe, it, expect } from 'vitest';
import { guardrailWarnings, changeToFyi } from './guardrail';
import { resolveAudience, resolvePostAudience } from './audience';
import { DEMO_START, addHours } from './time';
import { buildSeed } from '../data/seed';
import type { PostDraft } from '../types';

const NOW = DEMO_START;
const seed = buildSeed();
const draft = (d: Partial<PostDraft> = {}): PostDraft => ({
  title: 'T', summary: 'S', body: 'B', category: 'Policy',
  actAudience: { storeIds: ['s2'], roles: [], employeeIds: [] }, fyiAudience: null,
  ackBy: addHours(NOW, 24), ...d,
});
const warn = (d: PostDraft, now = NOW) => guardrailWarnings(d, seed.posts, seed.employees, seed.stores, now);

describe('guardrailWarnings', () => {
  it('AC18: a new Action Required post for Northgate warns (3 this week)', () => {
    expect(warn(draft())).toEqual([{
      storeId: 's2', storeName: 'Northgate', count: 3,
      message: 'Northgate already has 3 Action Required posts this week. Too many can make them easy to ignore.',
    }]);
  });

  it('Renton has only the ladder post: no warning', () => {
    expect(warn(draft({ actAudience: { storeIds: ['s4'], roles: [], employeeIds: [] } }))).toEqual([]);
  });

  it('FYI posts never warn', () => {
    expect(warn(draft({ actAudience: null, fyiAudience: { storeIds: ['s2'], roles: [], employeeIds: [] }, ackBy: null }))).toEqual([]);
  });

  it('only counts the last 7 days', () => {
    expect(warn(draft(), addHours(NOW, 24 * 7))).toEqual([]);
  });
});

describe('changeToFyi', () => {
  it('moves the act audience to FYI and clears the deadline', () => {
    const d = changeToFyi(draft(), seed.employees);
    expect(d.actAudience).toBeNull();
    expect(d.fyiAudience).toEqual({ storeIds: ['s2'], roles: [], employeeIds: [] });
    expect(d.ackBy).toBeNull();
  });

  it('merges with an existing FYI audience without adding or dropping anyone', () => {
    const before = draft({
      actAudience: { storeIds: ['s2'], roles: ['associate'], employeeIds: [] },
      fyiAudience: { storeIds: ['s2'], roles: ['store_manager'], employeeIds: [] },
    });
    const { actIds, fyiIds } = resolvePostAudience(before, seed.employees);
    const after = changeToFyi(before, seed.employees);
    expect(resolveAudience(after.fyiAudience, seed.employees).sort()).toEqual([...actIds, ...fyiIds].sort());
  });
});
