import { describe, it, expect } from 'vitest';
import { applyEdit, buildPost } from './edit';
import { personStatus } from './status';
import { postMetrics } from './metrics';
import { DEMO_START, addHours } from './time';
import { buildSeed, RACHEL_ID } from '../data/seed';
import type { EditableFields, PostDraft } from '../types';

const NOW = DEMO_START;
const seed = buildSeed();
const returns = seed.posts.find((p) => p.id === 'p-returns')!;
const fields = (p = returns): EditableFields => ({ title: p.title, summary: p.summary, body: p.body, category: p.category, ackBy: p.ackBy });
const acker = seed.responses.find((r) => r.postId === 'p-returns' && r.acknowledgedAt)!;
const ackerEmp = seed.employees.find((e) => e.id === acker.employeeId)!;

describe('applyEdit', () => {
  it('AC19: typo fix keeps the version and every acknowledgment', () => {
    const edited = applyEdit(returns, { ...fields(), title: 'Updated return policy (electronics)' }, 'typo', NOW);
    expect(edited.version).toBe(1);
    expect(edited.title).toBe('Updated return policy (electronics)');
    expect(edited.updatedAt).toBe(NOW);
    expect(edited.editedNote).toBeUndefined();
    expect(personStatus(edited, acker, ackerEmp, NOW)).toBe('acknowledged');
    expect(postMetrics(edited, seed.responses, seed.employees, NOW).acknowledged)
      .toBe(postMetrics(returns, seed.responses, seed.employees, NOW).acknowledged);
  });

  it('AC20: content change bumps the version, resets acknowledgments (openedAt kept) and adds the re-confirm note', () => {
    const edited = applyEdit(returns, { ...fields(), body: 'New body' }, 'content', NOW);
    expect(edited.version).toBe(2);
    expect(edited.editedNote).toBe('Edited Wed 9:00 AM. Please re-confirm');
    expect(personStatus(edited, acker, ackerEmp, NOW)).toBe('opened');
    expect(postMetrics(edited, seed.responses, seed.employees, NOW).acknowledged).toBe(0);
  });

  it('does not change the audience', () => {
    const edited = applyEdit(returns, fields(), 'content', NOW);
    expect(edited.actAudience).toEqual(returns.actAudience);
  });
});

describe('buildPost', () => {
  const d = (x: Partial<PostDraft>): PostDraft => ({
    title: 'T', summary: 'S', body: 'B', category: 'General',
    actAudience: { storeIds: ['s2'], roles: [], employeeIds: [] }, fyiAudience: null,
    ackBy: addHours(NOW, 10), ...x,
  });

  it('creates version 1 at the demo clock time', () => {
    const p = buildPost(d({}), 'post-8', RACHEL_ID, NOW, seed.employees);
    expect(p).toMatchObject({ id: 'post-8', authorId: RACHEL_ID, createdAt: NOW, updatedAt: NOW, version: 1, ackBy: addHours(NOW, 10) });
  });

  it('FYI-only posts have no deadline', () => {
    const p = buildPost(d({ actAudience: null, fyiAudience: { storeIds: ['s2'], roles: [], employeeIds: [] } }), 'x', RACHEL_ID, NOW, seed.employees);
    expect(p.ackBy).toBeNull();
  });
});
