import { addHours as addH, subDays } from 'date-fns';

// All stores are in Pacific time (SPEC assumption 9). Every instant is stored as a UTC ISO string;
// these helpers convert to and from Pacific wall time without a time-zone library.
const TZ = 'America/Los_Angeles';
const HOUR = 3_600_000;

export const DEMO_START = '2026-10-28T16:00:00.000Z'; // Wed Oct 28 2026, 9:00 AM Pacific

export function addHours(iso: string, h: number): string {
  return addH(new Date(iso), h).toISOString();
}

export function daysBefore(iso: string, days: number): string {
  return subDays(new Date(iso), days).toISOString();
}

export function hoursBetween(from: string, to: string): number {
  return (Date.parse(to) - Date.parse(from)) / HOUR;
}

export function atLeast4hAfter(iso: string, now: string): boolean {
  return hoursBetween(now, iso) >= 4;
}

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...opts }).format(new Date(iso)).replace(/\u202f/g, ' ');

/** "2:14 PM" */
export const fmtTime = (iso: string) => fmt(iso, { hour: 'numeric', minute: '2-digit' });
/** "Fri 5:00 PM" */
export const fmtDayTime = (iso: string) => fmt(iso, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
/** "Wed Oct 28, 9:00 AM" */
export const fmtClock = (iso: string) =>
  `${fmt(iso, { weekday: 'short' })} ${fmt(iso, { month: 'short', day: 'numeric' })}, ${fmtTime(iso)}`;

function offsetMinutes(ms: number): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'shortOffset' })
    .formatToParts(new Date(ms)).find((p) => p.type === 'timeZoneName')!.value; // "GMT-7"
  const m = /GMT([+-]\d+)(?::(\d+))?/.exec(name);
  return m ? Number(m[1]) * 60 + Math.sign(Number(m[1])) * Number(m[2] ?? 0) : 0;
}

/** "2026-10-30T17:00" (Pacific wall time, as in <input type="datetime-local">) → UTC ISO */
export function fromPacificLocal(local: string): string {
  const asUtc = Date.parse(`${local.slice(0, 16)}:00Z`);
  let ms = asUtc - offsetMinutes(asUtc) * 60_000;
  ms = asUtc - offsetMinutes(ms) * 60_000; // second pass settles DST edges
  return new Date(ms).toISOString();
}

/** UTC ISO → "2026-10-30T17:00" Pacific wall time */
export function toPacificLocal(iso: string): string {
  const ms = Date.parse(iso) + offsetMinutes(Date.parse(iso)) * 60_000;
  return new Date(ms).toISOString().slice(0, 16);
}

const pacificDay = (iso: string) => toPacificLocal(iso).slice(0, 10);

/** "2:14 PM" if on the demo clock's Pacific day, otherwise "Tue 11:00 AM". */
export function fmtStamp(iso: string, now: string): string {
  return pacificDay(iso) === pacificDay(now) ? fmtTime(iso) : fmtDayTime(iso);
}
