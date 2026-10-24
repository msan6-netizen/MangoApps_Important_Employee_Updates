import { describe, it, expect } from 'vitest';
import { personStatus, acknowledge, markOpened, isActionRequired, isDueSoon } from './status';
import { DEMO_START, addHours } from './time';
import type { Employee, Post, Response } from '../types';

const NOW = DEMO_START;
const emp: Employee = { id: 'e1', name: 'Test Person', role: 'associate', storeIds: ['s2'], onLeave: false };
const post = (p: Partial<Post> = {}): Post => ({
  id: 'p1', title: 'T', summary: 'S', body: 'B', category: 'Safety', authorId: 'm',
  createdAt: addHours(NOW, -24), updatedAt: addHours(NOW, -24),
  actAudience: { storeIds: ['s2'], roles: [], employeeIds: [] }, fyiAudience: null,
  ackBy: addHours(NOW, 10), version: 1, ...p,
});
const resp = (r: Partial<Response> = {}): Response => ({ postId: 'p1', employeeId: 'e1', version: 1, ...r });

describe('personStatus precedence (AC9): on_leave > overdue > acknowledged > opened > not_opened', () => {
  it('on_leave beats everything, even overdue', () => {
    const p = post({ ackBy: addHours(NOW, -1) });
    expect(personStatus(p, undefined, { ...emp, onLeave: true }, NOW)).toBe('on_leave');
  });

  it('overdue when not acknowledged and ackBy has passed', () => {
    const p = post({ ackBy: addHours(NOW, -1) });
    expect(personStatus(p, resp({ openedAt: NOW }), emp, NOW)).toBe('overdue');
  });

  it('acknowledged is final: never overdue once acknowledged, even late', () => {
    const p = post({ ackBy: addHours(NOW, -1) });
    expect(personStatus(p, resp({ acknowledgedAt: NOW }), emp, NOW)).toBe('acknowledged');
  });

  it('not overdue exactly at the deadline (now > ackBy is required)', () => {
    expect(personStatus(post({ ackBy: NOW }), undefined, emp, NOW)).toBe('not_opened');
  });

  it('acknowledged > opened > not_opened', () => {
    const p = post();
    expect(personStatus(p, resp({ openedAt: NOW, acknowledgedAt: NOW }), emp, NOW)).toBe('acknowledged');
    expect(personStatus(p, resp({ openedAt: NOW }), emp, NOW)).toBe('opened');
    expect(personStatus(p, undefined, emp, NOW)).toBe('not_opened');
  });

  it('a response from an older version is not acknowledged, but keeps openedAt', () => {
    const p = post({ version: 2 });
    expect(personStatus(p, resp({ version: 1, openedAt: NOW, acknowledgedAt: NOW }), emp, NOW)).toBe('opened');
  });

  it('FYI posts: opened or not opened, never overdue', () => {
    const p = post({ actAudience: null, fyiAudience: { storeIds: ['s2'], roles: [], employeeIds: [] }, ackBy: null });
    expect(isActionRequired(p)).toBe(false);
    expect(personStatus(p, undefined, emp, NOW)).toBe('not_opened');
    expect(isActionRequired(post())).toBe(true);
  });
});

describe('isDueSoon: acknowledge-by within 24 hours and not yet passed', () => {
  const post = (ackBy: string | null) => ({ ackBy } as Post);
  it('is due soon from 24h before the deadline up to the deadline', () => {
    expect(isDueSoon(post(addHours(DEMO_START, 24)), DEMO_START)).toBe(true);
    expect(isDueSoon(post(addHours(DEMO_START, 23)), DEMO_START)).toBe(true);
    expect(isDueSoon(post(DEMO_START), DEMO_START)).toBe(true);
  });
  it('is not due soon more than 24h out, once past (overdue instead), or on FYI posts', () => {
    expect(isDueSoon(post(addHours(DEMO_START, 25)), DEMO_START)).toBe(false);
    expect(isDueSoon(post(addHours(DEMO_START, -1)), DEMO_START)).toBe(false);
    expect(isDueSoon(post(null), DEMO_START)).toBe(false);
  });
});

describe('acknowledge', () => {
  const p = post();

  it('AC10: acknowledging twice records one acknowledgment, unchanged on the second tap', () => {
    const once = acknowledge([], p, 'e1', NOW);
    const twice = acknowledge(once, p, 'e1', addHours(NOW, 1));
    expect(twice).toHaveLength(1);
    expect(twice[0].acknowledgedAt).toBe(NOW);
    expect(twice).toBe(once);
  });

  it('acknowledge writes the current version and sets openedAt if missing', () => {
    const r = acknowledge([], post({ version: 3 }), 'e1', NOW)[0];
    expect(r.version).toBe(3);
    expect(r.openedAt).toBe(NOW);
  });

  it('re-confirming after a content change replaces the old-version record, keeping openedAt', () => {
    const v1 = acknowledge([], p, 'e1', NOW);
    const r = acknowledge(v1, { ...p, version: 2 }, 'e1', addHours(NOW, 1));
    expect(r).toEqual([{ postId: 'p1', employeeId: 'e1', version: 2, openedAt: NOW, acknowledgedAt: addHours(NOW, 1) }]);
  });

  it('does not touch other people\'s responses', () => {
    const other = resp({ employeeId: 'e2', acknowledgedAt: NOW });
    const r = acknowledge([other], p, 'e1', NOW);
    expect(r).toHaveLength(2);
    expect(r[0]).toBe(other);
  });
});

describe('markOpened (AC13)', () => {
  it('sets openedAt for visible posts that lack it, and keeps existing ones', () => {
    const p2 = { ...post(), id: 'p2' };
    const existing = resp({ openedAt: addHours(NOW, -5) });
    const r = markOpened([existing], [post(), p2], 'e1', NOW);
    expect(r).toHaveLength(2);
    expect(r.find((x) => x.postId === 'p1')!.openedAt).toBe(addHours(NOW, -5));
    expect(r.find((x) => x.postId === 'p2')!.openedAt).toBe(NOW);
  });

  it('returns the same array when nothing changes', () => {
    const r = markOpened([resp({ openedAt: NOW })], [post()], 'e1', NOW);
    expect(markOpened(r, [post()], 'e1', NOW)).toBe(r);
  });

  it('changes Not opened to Opened for that person', () => {
    const p = post();
    expect(personStatus(p, undefined, emp, NOW)).toBe('not_opened');
    const r = markOpened([], [p], 'e1', NOW);
    expect(personStatus(p, r[0], emp, NOW)).toBe('opened');
  });
});
