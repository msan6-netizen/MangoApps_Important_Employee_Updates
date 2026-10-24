import { describe, it, expect } from 'vitest';
import { validatePost, defaultAckBy, EMERGENCY_MSG, RECONFIRM_MSG } from './validation';
import { DEMO_START, addHours } from './time';
import { buildSeed, RACHEL_ID, MICHAEL_ID } from '../data/seed';
import type { PostDraft } from '../types';

const NOW = DEMO_START;
const seed = buildSeed();
const rachel = seed.employees.find((e) => e.id === RACHEL_ID)!;
const michael = seed.employees.find((e) => e.id === MICHAEL_ID)!;
const northgate = { storeIds: ['s2'], roles: [], employeeIds: [] };
const valid = (d: Partial<PostDraft> = {}): PostDraft => ({
  title: 'Title', summary: 'Summary', body: 'Body', category: 'Safety',
  actAudience: northgate, fyiAudience: null,
  ackBy: addHours(NOW, 24), ...d,
});
const v = (d: Partial<PostDraft>, who = rachel) => validatePost(valid(d), who, seed.employees, NOW);

describe('validatePost', () => {
  it('a complete, in-scope draft has no errors', () => {
    expect(v({})).toEqual({});
  });

  it('AC5: title, summary, body, category and audience are required', () => {
    const e = v({ title: '', summary: ' ', body: '', category: null, actAudience: null, fyiAudience: null, ackBy: null });
    expect(Object.keys(e).sort()).toEqual(['audience', 'body', 'category', 'summary', 'title']);
  });

  it('AC5: an audience that resolves to nobody is blocked', () => {
    const e = v({ actAudience: { storeIds: ['s2'], roles: ['ops_manager'], employeeIds: [] }, ackBy: null });
    expect(e.audience).toBeDefined();
  });

  it('an audience of only the author is blocked (a manager is never in their own post)', () => {
    const onlyMe = { storeIds: [], roles: [], employeeIds: [RACHEL_ID] };
    expect(v({ actAudience: onlyMe }).audience).toBeTruthy();
    expect(v({ actAudience: onlyMe }).ackBy).toBeUndefined(); // nobody to act, so no deadline is asked for
  });

  it('title max 80, summary max 120', () => {
    expect(v({ title: 'x'.repeat(80) }).title).toBeUndefined();
    expect(v({ title: 'x'.repeat(81) }).title).toBeDefined();
    expect(v({ summary: 'x'.repeat(121) }).summary).toBeDefined();
  });

  it('AC6: Action Required without an acknowledge-by time is blocked', () => {
    expect(v({ ackBy: null }).ackBy).toBe('Set an acknowledge-by time.');
  });

  it('FYI-only post needs no deadline', () => {
    expect(v({ actAudience: null, fyiAudience: northgate, ackBy: null })).toEqual({});
  });

  it('AC7: deadlines under 4 hours get the emergency message', () => {
    expect(v({ ackBy: addHours(NOW, 3) })).toEqual({ ackBy: EMERGENCY_MSG });
    expect(EMERGENCY_MSG).toBe('Give people at least 4 hours. For emergencies, contact stores directly.');
    expect(v({ ackBy: addHours(NOW, 4) })).toEqual({});
  });

  it('a role or person in both Needs to act and Just FYI is blocked', () => {
    const e = v({ actAudience: { storeIds: ['s2'], roles: ['shift_lead'], employeeIds: [] }, fyiAudience: { storeIds: ['s2'], roles: ['shift_lead', 'store_manager'], employeeIds: [] } });
    expect(e.audience).toBe('Shift leads can be in Needs to act or Just FYI, not both.');
    const p = v({ actAudience: { storeIds: [], roles: [], employeeIds: ['e045'] }, fyiAudience: { storeIds: [], roles: [], employeeIds: ['e045'] } });
    expect(p.audience).toBe('Alex Rivera can be in Needs to act or Just FYI, not both.');
    expect(v({ fyiAudience: { storeIds: ['s2'], roles: ['store_manager'], employeeIds: [] } })).toEqual({});
  });

  it('AC8: Rachel cannot target Renton or Renton people; Michael can', () => {
    expect(v({ actAudience: { storeIds: ['s4'], roles: [], employeeIds: [] } }).audience).toBeDefined();
    expect(v({ fyiAudience: { storeIds: [], roles: [], employeeIds: ['e125'] } }).audience).toBeDefined();
    expect(v({ actAudience: { storeIds: ['s4'], roles: [], employeeIds: [] } }, michael)).toEqual({});
  });

  describe('editing', () => {
    const ladder = seed.posts.find((p) => p.id === 'p-ladder')!;
    const draftOf = (changes: Partial<PostDraft> = {}): PostDraft => ({
      title: ladder.title, summary: ladder.summary, body: ladder.body, category: ladder.category,
      actAudience: ladder.actAudience, fyiAudience: ladder.fyiAudience, ackBy: ladder.ackBy, ...changes,
    });

    it('a typo fix on a post whose deadline has passed is allowed (unchanged deadline is not re-checked)', () => {
      expect(validatePost(draftOf({ title: 'New ladder safety procedures' }), michael, seed.employees, NOW, ladder)).toEqual({});
    });

    it('a changed deadline is re-checked', () => {
      expect(validatePost(draftOf({ ackBy: addHours(NOW, 1) }), michael, seed.employees, NOW, ladder).ackBy).toBe(EMERGENCY_MSG);
    });

    it('"Content changed" on a post whose deadline has passed needs a new deadline', () => {
      const e = validatePost(draftOf({ body: 'New ladder rules' }), michael, seed.employees, NOW, ladder, 'content');
      expect(e.ackBy).toBe(RECONFIRM_MSG);
      expect(RECONFIRM_MSG).toBe('Everyone has to re-confirm, so they need at least 4 hours. Set a new deadline.');
    });

    it('"Content changed" with a new deadline (at least 4 hours away) is allowed', () => {
      expect(validatePost(draftOf({ body: 'New ladder rules', ackBy: addHours(NOW, 24) }), michael, seed.employees, NOW, ladder, 'content')).toEqual({});
      expect(validatePost(draftOf({ body: 'New ladder rules', ackBy: addHours(NOW, 2) }), michael, seed.employees, NOW, ladder, 'content').ackBy).toBe(EMERGENCY_MSG);
    });

    it('"Typo fix" on the same past-due post still needs no new deadline', () => {
      expect(validatePost(draftOf({ title: 'New ladder safety procedures' }), michael, seed.employees, NOW, ladder, 'typo')).toEqual({});
    });

    it('"Content changed" when the deadline is less than 4 hours away needs a new deadline', () => {
      const returns = seed.posts.find((p) => p.id === 'p-returns')!; // acknowledge by Thu 8:00 AM
      const threeHoursBefore = addHours(returns.ackBy!, -3);      // Thu 5:00 AM
      const d = { title: returns.title, summary: returns.summary, body: 'Receipts now required for all returns', category: returns.category, actAudience: returns.actAudience, fyiAudience: returns.fyiAudience, ackBy: returns.ackBy };
      expect(validatePost(d, michael, seed.employees, threeHoursBefore, returns, 'content').ackBy).toBe(RECONFIRM_MSG);
      expect(validatePost(d, michael, seed.employees, threeHoursBefore, returns, 'typo')).toEqual({});
      expect(validatePost({ ...d, ackBy: addHours(threeHoursBefore, 24) }, michael, seed.employees, threeHoursBefore, returns, 'content')).toEqual({});
    });

    it('"Content changed" on a post whose deadline is still ahead keeps that deadline', () => {
      const returns = seed.posts.find((p) => p.id === 'p-returns')!; // acknowledge by Thu 8:00 AM
      const d = { title: returns.title, summary: returns.summary, body: 'New text', category: returns.category, actAudience: returns.actAudience, fyiAudience: returns.fyiAudience, ackBy: returns.ackBy };
      expect(validatePost(d, michael, seed.employees, NOW, returns, 'content')).toEqual({});
    });

    it('the audience cannot change', () => {
      const e = validatePost(draftOf({ actAudience: { storeIds: ['s2'], roles: [], employeeIds: [] } }), michael, seed.employees, NOW, ladder);
      expect(e.audience).toBeDefined();
    });
  });
});

describe('defaultAckBy', () => {
  it('is createdAt + 24h', () => {
    expect(defaultAckBy(NOW)).toBe(addHours(NOW, 24));
  });
});
