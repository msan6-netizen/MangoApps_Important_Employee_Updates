import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './reducer';
import { DEMO_START, addHours } from '../lib/time';
import { ALEX_ID, RACHEL_ID } from '../data/seed';
import type { PostDraft } from '../types';

describe('reducer', () => {
  const s0 = initialState();

  it('starts at the demo clock, viewing as Alex', () => {
    expect(s0.now).toBe(DEMO_START);
    expect(s0.viewerId).toBe(ALEX_ID);
  });

  it('demo clock: +4h, +1 day, reset', () => {
    const s1 = reducer(reducer(s0, { type: 'ADVANCE_CLOCK', hours: 4 }), { type: 'ADVANCE_CLOCK', hours: 24 });
    expect(s1.now).toBe(addHours(DEMO_START, 28));
    expect(reducer(s1, { type: 'RESET_CLOCK' }).now).toBe(DEMO_START);
  });

  it('acknowledge uses the demo clock and is idempotent (AC10)', () => {
    const later = reducer(s0, { type: 'ADVANCE_CLOCK', hours: 2 });
    const a = reducer(later, { type: 'ACKNOWLEDGE', employeeId: ALEX_ID, postId: 'p-returns' });
    const r = a.responses.find((x) => x.postId === 'p-returns' && x.employeeId === ALEX_ID)!;
    expect(r.acknowledgedAt).toBe(addHours(DEMO_START, 2));
    const b = reducer(a, { type: 'ACKNOWLEDGE', employeeId: ALEX_ID, postId: 'p-returns' });
    expect(b.responses).toBe(a.responses);
  });

  it('create post: next id, author is the viewer, created at the demo clock', () => {
    const draft: PostDraft = {
      title: 'T', summary: 'S', body: 'B', category: 'General',
      actAudience: null, fyiAudience: { storeIds: ['s2'], roles: [], employeeIds: [] },
      ackBy: null,
    };
    const s = reducer(reducer(s0, { type: 'SET_VIEWER', employeeId: RACHEL_ID }), { type: 'CREATE_POST', draft });
    const p = s.posts[s.posts.length - 1];
    expect(p).toMatchObject({ id: 'post-8', authorId: RACHEL_ID, createdAt: DEMO_START, version: 1 });
  });

  it('edit post (content) bumps the version', () => {
    const p = s0.posts.find((x) => x.id === 'p-returns')!;
    const s = reducer(s0, { type: 'EDIT_POST', postId: 'p-returns', mode: 'content',
      changes: { title: p.title, summary: p.summary, body: 'new', category: p.category, ackBy: p.ackBy } });
    expect(s.posts.find((x) => x.id === 'p-returns')!.version).toBe(2);
  });

  it('on leave toggle and mark opened', () => {
    const s = reducer(s0, { type: 'SET_ON_LEAVE', employeeId: ALEX_ID, onLeave: true });
    expect(s.employees.find((e) => e.id === ALEX_ID)!.onLeave).toBe(true);
    const o = reducer(s0, { type: 'MARK_OPENED', employeeId: ALEX_ID, postIds: ['p-returns'] });
    expect(o.responses.find((x) => x.postId === 'p-returns' && x.employeeId === ALEX_ID)!.openedAt).toBe(DEMO_START);
  });

  it('AC30: reset demo data restores the seed and clock, keeps the viewer', () => {
    let s = reducer(s0, { type: 'SET_VIEWER', employeeId: RACHEL_ID });
    s = reducer(s, { type: 'ADVANCE_CLOCK', hours: 24 });
    s = reducer(s, { type: 'ACKNOWLEDGE', employeeId: ALEX_ID, postId: 'p-ladder' });
    const reset = reducer(s, { type: 'RESET_DEMO' });
    expect(reset).toEqual({ ...initialState(), viewerId: RACHEL_ID });
  });
});
