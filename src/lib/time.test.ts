import { describe, it, expect } from 'vitest';
import { DEMO_START, addHours, fmtTime, fmtDayTime, fmtClock, fmtStamp, atLeast4hAfter, fromPacificLocal, toPacificLocal } from './time';

describe('time (Pacific, demo clock)', () => {
  it('demo clock starts Wed Oct 28 2026, 9:00 AM Pacific', () => {
    expect(DEMO_START).toBe(new Date('2026-10-28T09:00:00-07:00').toISOString());
    expect(fmtClock(DEMO_START)).toBe('Wed Oct 28, 9:00 AM');
  });

  it('formats in Pacific regardless of the machine time zone', () => {
    const fri5pm = '2026-10-31T00:00:00.000Z'; // Fri Oct 30, 5:00 PM PDT
    expect(fmtDayTime(fri5pm)).toBe('Fri 5:00 PM');
    expect(fmtTime('2026-10-28T21:14:00.000Z')).toBe('2:14 PM');
  });

  it('converts Pacific wall time to an instant across DST', () => {
    expect(fromPacificLocal('2026-10-30T17:00')).toBe('2026-10-31T00:00:00.000Z'); // PDT, -7
    expect(fromPacificLocal('2026-11-20T17:00')).toBe('2026-11-21T01:00:00.000Z'); // PST, -8
    expect(toPacificLocal('2026-11-21T01:00:00.000Z')).toBe('2026-11-20T17:00');
  });

  it('addHours works on instants', () => {
    expect(addHours(DEMO_START, 4)).toBe(new Date('2026-10-28T13:00:00-07:00').toISOString());
  });

  it('4-hour rule: exactly 4h passes, 3h59m fails', () => {
    expect(atLeast4hAfter(addHours(DEMO_START, 4), DEMO_START)).toBe(true);
    expect(atLeast4hAfter(addHours(DEMO_START, 3.99), DEMO_START)).toBe(false);
  });

  it('fmtStamp: time only on the current demo day, day + time otherwise', () => {
    expect(fmtStamp(addHours(DEMO_START, -1), DEMO_START)).toBe('8:00 AM');
    expect(fmtStamp(fromPacificLocal('2026-10-28T00:05'), DEMO_START)).toBe('12:05 AM');
    expect(fmtStamp(fromPacificLocal('2026-10-27T11:00'), DEMO_START)).toBe('Tue 11:00 AM');
    // 11 PM Pacific is already the next day in UTC: still "today" in Pacific
    expect(fmtStamp(fromPacificLocal('2026-10-28T23:00'), fromPacificLocal('2026-10-28T23:30'))).toBe('11:00 PM');
  });
});
