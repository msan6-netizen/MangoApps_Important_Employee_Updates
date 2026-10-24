import { describe, it, expect } from 'vitest';
import { remindersDue, reminderLog, textsBetween } from './reminders';
import { acknowledge } from './status';
import { DEMO_START, addHours, fromPacificLocal } from './time';
import { buildSeed, ALEX_ID, RACHEL_ID } from '../data/seed';
import type { Employee, Post } from '../types';

const NOW = DEMO_START;
const seed = buildSeed();
const post = (id: string) => seed.posts.find((p) => p.id === id)!;
const northgateActive = seed.employees.filter((e) => e.storeIds.includes('s2') && !e.onLeave);

describe('remindersDue (seed)', () => {
  it('ladder: Alex got the acknowledgment reminder Mon 1:00 PM; Rachel (acknowledged at 10 AM) did not', () => {
    const r = remindersDue(post('p-ladder'), seed.responses, seed.employees, NOW);
    expect(r).toContainEqual({ postId: 'p-ladder', employeeId: ALEX_ID, at: fromPacificLocal('2026-10-26T13:00') });
    expect(r.find((x) => x.employeeId === RACHEL_ID)).toBeUndefined();
  });

  it('never reminds people on leave', () => {
    const r = remindersDue(post('p-ladder'), seed.responses, seed.employees, NOW);
    const onLeave = new Set(seed.employees.filter((e) => e.onLeave).map((e) => e.id));
    expect(r.some((x) => onLeave.has(x.employeeId))).toBe(false);
  });

  it('AC16: return policy reminders appear only after the clock passes Wed 12:00 PM, for non-responders only', () => {
    expect(remindersDue(post('p-returns'), seed.responses, seed.employees, NOW)).toEqual([]);
    const later = addHours(NOW, 4);
    const r = remindersDue(post('p-returns'), seed.responses, seed.employees, later);
    expect(r).toHaveLength(33); // 39 active at Northgate minus 6 who acknowledged
    expect(r.every((x) => x.at === fromPacificLocal('2026-10-28T12:00'))).toBe(true);
    const acked = new Set(seed.responses.filter((x) => x.postId === 'p-returns' && x.acknowledgedAt).map((x) => x.employeeId));
    expect(r.some((x) => acked.has(x.employeeId))).toBe(false);
    expect(r.map((x) => x.employeeId)).toContain(ALEX_ID);
    expect(northgateActive).toHaveLength(39);
  });

  it('AC16: acknowledging before the reminder time means no reminder', () => {
    const responses = acknowledge(seed.responses, post('p-returns'), ALEX_ID, NOW);
    const r = remindersDue(post('p-returns'), responses, seed.employees, addHours(NOW, 4));
    expect(r.map((x) => x.employeeId)).not.toContain(ALEX_ID);
  });

  it('acknowledging after the reminder time keeps it in the log', () => {
    const responses = acknowledge(seed.responses, post('p-returns'), ALEX_ID, addHours(NOW, 5));
    const r = remindersDue(post('p-returns'), responses, seed.employees, addHours(NOW, 5));
    expect(r.map((x) => x.employeeId)).toContain(ALEX_ID);
  });

  it('AC15: on leave removes a person from reminders', () => {
    const employees = seed.employees.map((e) => (e.id === ALEX_ID ? { ...e, onLeave: true } : e));
    const r = remindersDue(post('p-ladder'), seed.responses, employees, NOW);
    expect(r.map((x) => x.employeeId)).not.toContain(ALEX_ID);
  });

  it('no texts after the deadline: past ackBy, nobody gets a new reminder', () => {
    const recall = post('p-recall'); // ackBy Thu 10:00 AM
    const atDeadline = remindersDue(recall, seed.responses, seed.employees, recall.ackBy!);
    expect(remindersDue(recall, seed.responses, seed.employees, addHours(recall.ackBy!, 72))).toEqual(atDeadline);
  });
});

describe('remindersDue (timing rules)', () => {
  const emp: Employee = { id: 'e1', name: 'P', role: 'associate', storeIds: ['s2'], onLeave: false };
  const mk = (p: Partial<Post>): Post => ({
    id: 'p1', title: 'T', summary: 'S', body: 'B', category: 'Safety', authorId: 'm',
    createdAt: NOW, updatedAt: NOW, actAudience: { storeIds: ['s2'], roles: [], employeeIds: [] }, fyiAudience: null,
    ackBy: addHours(NOW, 6), version: 1, ...p,
  });

  it('acknowledgment reminder is halfway to a short deadline (capped at 4h)', () => {
    const r = remindersDue(mk({}), [], [emp], addHours(NOW, 10));
    expect(r).toEqual([{ postId: 'p1', employeeId: 'e1', at: addHours(NOW, 3) }]);
    expect(remindersDue(mk({ ackBy: addHours(NOW, 48) }), [], [emp], addHours(NOW, 10))[0].at).toBe(addHours(NOW, 4));
  });

  it('one reminder per person, never repeated', () => {
    expect(remindersDue(mk({}), [], [emp], addHours(NOW, 100))).toHaveLength(1);
  });

  it('FYI posts have no reminders', () => {
    expect(remindersDue(mk({ actAudience: null, fyiAudience: { storeIds: ['s2'], roles: [], employeeIds: [] }, ackBy: null }), [], [emp], addHours(NOW, 50))).toEqual([]);
  });
});

describe('reminderLog', () => {
  it('collects all posts, oldest first, and is deterministic', () => {
    const a = reminderLog(seed.posts, seed.responses, seed.employees, NOW);
    expect(a.length).toBeGreaterThan(0);
    for (let i = 1; i < a.length; i++) expect(a[i].at >= a[i - 1].at).toBe(true);
    expect(reminderLog(seed.posts, seed.responses, seed.employees, NOW)).toEqual(a);
  });
});

describe('textsBetween (the simulated text that slides in on the employee\'s phone)', () => {
  it('Alex gets the return-policy reminder (Wed 12:00 PM) when the clock moves 9 AM → 1 PM', () => {
    const texts = textsBetween(ALEX_ID, seed.posts, seed.responses, seed.employees, NOW, addHours(NOW, 4));
    expect(texts.map((t) => [t.postId, t.at])).toEqual([['p-returns', addHours(NOW, 3)]]);
  });

  it('no text if he acknowledged before the reminder time', () => {
    const responses = acknowledge(seed.responses, post('p-returns'), ALEX_ID, NOW);
    expect(textsBetween(ALEX_ID, seed.posts, responses, seed.employees, NOW, addHours(NOW, 4))).toEqual([]);
  });

  it('only reminders inside the window: older ones (ladder Mon, recall Tue) and a still-unmoved clock give nothing', () => {
    expect(textsBetween(ALEX_ID, seed.posts, seed.responses, seed.employees, NOW, NOW)).toEqual([]);
    expect(textsBetween(ALEX_ID, seed.posts, seed.responses, seed.employees, addHours(NOW, 4), addHours(NOW, 28))).toEqual([]);
  });

  it("only the viewer's own texts", () => {
    const texts = textsBetween(RACHEL_ID, seed.posts, seed.responses, seed.employees, NOW, addHours(NOW, 4));
    expect(texts).toEqual([]); // she wrote the return policy, so she isn't in it
  });
});
