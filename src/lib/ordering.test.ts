import { describe, it, expect } from 'vitest';
import { sortActionItems, reasonLabel, employeeFeed } from './ordering';
import { acknowledge } from './status';
import { DEMO_START, addHours } from './time';
import { buildSeed, ALEX_ID, MALVIKA_ID } from '../data/seed';
import type { Post, PersonStatus } from '../types';

const NOW = DEMO_START;
const base = (p: Partial<Post>): Post => ({
  id: 'x', title: 'T', summary: 'S', body: 'B', category: 'General', authorId: 'm',
  createdAt: addHours(NOW, -10), updatedAt: addHours(NOW, -10),
  actAudience: null, fyiAudience: null,
  ackBy: addHours(NOW, 20), version: 1, ...p,
});

describe('sortActionItems', () => {
  it('overdue first, then earliest deadline, then newest; category never affects order', () => {
    const items: { post: Post; status: PersonStatus }[] = [
      { post: base({ id: 'general-soon', category: 'General', ackBy: addHours(NOW, 5) }), status: 'opened' },
      { post: base({ id: 'safety-late', category: 'Safety', ackBy: addHours(NOW, 50) }), status: 'opened' },
      { post: base({ id: 'policy-overdue', category: 'Policy', ackBy: addHours(NOW, -1) }), status: 'overdue' },
      { post: base({ id: 'safety-soon', category: 'Safety', ackBy: addHours(NOW, 6) }), status: 'not_opened' },
      { post: base({ id: 'safety-soon-newer', category: 'Safety', ackBy: addHours(NOW, 6), createdAt: addHours(NOW, -1) }), status: 'not_opened' },
      { post: base({ id: 'safety-7h', category: 'Safety', ackBy: addHours(NOW, 7) }), status: 'opened' },
      { post: base({ id: 'safety-30h', category: 'Safety', ackBy: addHours(NOW, 30) }), status: 'opened' },
      { post: base({ id: 'policy-25h', category: 'Policy', ackBy: addHours(NOW, 25) }), status: 'opened' },
    ];
    expect(sortActionItems(items, NOW).map((i) => i.post.id)).toEqual([
      'policy-overdue', 'general-soon', 'safety-soon-newer', 'safety-soon', 'safety-7h', 'policy-25h', 'safety-30h', 'safety-late',
    ]);
  });

  it('flags due-soon items (never overdue ones)', () => {
    const items: { post: Post; status: PersonStatus }[] = [
      { post: base({ id: 'soon', ackBy: addHours(NOW, 5) }), status: 'opened' },
      { post: base({ id: 'later', ackBy: addHours(NOW, 30) }), status: 'opened' },
      { post: base({ id: 'late', ackBy: addHours(NOW, -1) }), status: 'overdue' },
    ];
    expect(Object.fromEntries(sortActionItems(items, NOW).map((i) => [i.post.id, i.dueSoon]))).toEqual({ late: false, soon: true, later: false });
  });
});

describe('reasonLabel', () => {
  it('formats overdue, due-soon and acknowledge-by labels (no category: it is shown as a chip and does not set the order)', () => {
    expect(reasonLabel(base({ category: 'Safety', ackBy: '2026-10-27T16:00:00.000Z' }), 'overdue', false)).toBe('Overdue since Tue 9:00 AM');
    expect(reasonLabel(base({ category: 'Policy', ackBy: '2026-10-29T15:00:00.000Z' }), 'opened', true)).toBe('Due soon · Acknowledge by Thu 8:00 AM');
    expect(reasonLabel(base({ category: 'Policy', ackBy: '2026-10-29T15:00:00.000Z' }), 'opened', false)).toBe('Acknowledge by Thu 8:00 AM');
  });
});

describe('employeeFeed (seed)', () => {
  const seed = buildSeed();

  it('AC12: Alex sees ladder → return policy (due soon) → recall with the right labels and summaries', () => {
    const feed = employeeFeed(ALEX_ID, seed.posts, seed.responses, seed.employees, NOW);
    expect(feed.action.map((i) => [i.post.id, i.reason, i.post.summary])).toEqual([
      ['p-ladder', 'Overdue since Tue 9:00 AM', 'From Monday: use a spotter on ladders over 6 ft.'],
      ['p-returns', 'Due soon · Acknowledge by Thu 8:00 AM', 'From Nov 1, electronics returns need a receipt.'],
      ['p-recall', 'Acknowledge by Thu 10:00 AM', "Pull it from shelves by Friday 5 PM. Confirm you've read this."],
    ]);
    expect(feed.action[0].status).toBe('overdue');
    expect(feed.fyi.map((p) => p.id)).toEqual(['p-parking', 'p-sales', 'p-holiday']);
    expect(feed.completed).toEqual([]);
  });

  it('acknowledged acknowledge-only posts move to Completed', () => {
    const ladder = seed.posts.find((p) => p.id === 'p-ladder')!;
    const responses = acknowledge(seed.responses, ladder, ALEX_ID, NOW);
    const feed = employeeFeed(ALEX_ID, seed.posts, responses, seed.employees, NOW);
    expect(feed.action.map((i) => i.post.id)).toEqual(['p-returns', 'p-recall']);
    expect(feed.completed.map((p) => p.id)).toEqual(['p-ladder']);
  });

  it('Malvika: after acknowledging the ladder post she has no action items, only FYI posts', () => {
    const ladder = seed.posts.find((p) => p.id === 'p-ladder')!;
    const before = employeeFeed(MALVIKA_ID, seed.posts, seed.responses, seed.employees, NOW);
    expect(before.action.map((i) => i.post.id)).toEqual(['p-ladder']);
    const responses = acknowledge(seed.responses, ladder, MALVIKA_ID, NOW);
    const after = employeeFeed(MALVIKA_ID, seed.posts, responses, seed.employees, NOW);
    expect(after.action).toEqual([]);
    expect(after.fyi.map((p) => p.id)).toEqual(['p-lunch', 'p-holiday']);
  });

  it('after +4h the recall is due soon too; order stays by deadline', () => {
    const feed = employeeFeed(ALEX_ID, seed.posts, seed.responses, seed.employees, addHours(NOW, 4));
    expect(feed.action.map((i) => [i.post.id, i.dueSoon])).toEqual([['p-ladder', false], ['p-returns', true], ['p-recall', true]]);
  });

  it('flags "Edited, please re-confirm" on a new version not yet re-acknowledged', () => {
    const posts = seed.posts.map((p) => (p.id === 'p-returns' ? { ...p, version: 2 } : p));
    const feed = employeeFeed(ALEX_ID, posts, seed.responses, seed.employees, NOW);
    expect(feed.action.find((i) => i.post.id === 'p-returns')!.updated).toBe(true);
    expect(feed.action.find((i) => i.post.id === 'p-ladder')!.updated).toBe(false);
  });
});

describe('newest-first ties', () => {
  it('FYI posts created at the same time: the later post comes first', () => {
    const seed = buildSeed();
    const lunch = seed.posts.find((p) => p.id === 'p-lunch')!;
    const posts = [...seed.posts, { ...lunch, id: 'post-8' }, { ...lunch, id: 'post-9' }];
    const feed = employeeFeed(MALVIKA_ID, posts, seed.responses, seed.employees, NOW);
    expect(feed.fyi.map((p) => p.id).slice(0, 3)).toEqual(['post-9', 'post-8', 'p-lunch']);
  });

  it('action items with identical rank: the later post comes first', () => {
    const a = base({ id: 'a' }), b = base({ id: 'b' });
    expect(sortActionItems([{ post: a, status: 'opened' }, { post: b, status: 'opened' }], NOW).map((i) => i.post.id)).toEqual(['b', 'a']);
  });
});
