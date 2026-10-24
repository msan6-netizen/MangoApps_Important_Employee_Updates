import type { Employee, Post, Reminder, Response } from '../types';
import { resolvePostAudience } from './audience';
import { isActionRequired } from './status';
import { addHours, hoursBetween } from './time';

/**
 * Simulated SMS acknowledgment reminders due by `now` (nothing is sent). One per person, at
 * createdAt + min(4h, (ackBy − createdAt) / 2), so it always fires before the deadline and never after it.
 * A reminder appears if, at that time, the person had not yet acknowledged the current version.
 * People on leave never get reminders.
 */
export function remindersDue(post: Post, responses: Response[], employees: Employee[], now: string): Reminder[] {
  if (!isActionRequired(post)) return [];
  const at = addHours(post.createdAt, Math.min(4, hoursBetween(post.createdAt, post.ackBy!) / 2));
  if (at > now) return [];
  const byId = new Map(employees.map((e) => [e.id, e]));
  return resolvePostAudience(post, employees).actIds
    .filter((id) => !byId.get(id)!.onLeave)
    .filter((id) => {
      const r = responses.find((x) => x.postId === post.id && x.employeeId === id);
      const ackedAt = r && r.version === post.version ? r.acknowledgedAt : undefined;
      return !ackedAt || ackedAt > at;
    })
    .map((employeeId) => ({ postId: post.id, employeeId, at }));
}

/** The viewer's own simulated texts with a time in (from, to]: what "arrives" on their phone when the demo clock moves. */
export function textsBetween(employeeId: string, posts: Post[], responses: Response[], employees: Employee[], from: string, to: string): Reminder[] {
  return reminderLog(posts, responses, employees, to).filter((r) => r.employeeId === employeeId && r.at > from);
}

export function reminderLog(posts: Post[], responses: Response[], employees: Employee[], now: string): Reminder[] {
  return posts.flatMap((p) => remindersDue(p, responses, employees, now)).sort((a, b) => a.at.localeCompare(b.at));
}
