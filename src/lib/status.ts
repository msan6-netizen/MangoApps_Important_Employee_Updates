import type { Employee, PersonStatus, Post, Response } from '../types';
import { hoursBetween } from './time';

/** Action Required = there's an acknowledge-by time (set whenever anyone needs to act). */
export const isActionRequired = (post: Post) => post.ackBy !== null;

/** Due soon = acknowledge-by is within 24h and hasn't passed: it lands before the person's next start-of-shift check (assumption 1). */
export const DUE_SOON_HOURS = 24;
export const isDueSoon = (post: Pick<Post, 'ackBy'>, now: string) =>
  post.ackBy !== null && now <= post.ackBy && hoursBetween(now, post.ackBy) <= DUE_SOON_HOURS;

/** An acknowledgment only counts if it belongs to the post's current version. */
export const isAcknowledged = (post: Post, r?: Response) => !!r && r.version === post.version && !!r.acknowledgedAt;

/** SPEC §5 precedence: on_leave > overdue > acknowledged > opened > not_opened. */
export function personStatus(post: Post, response: Response | undefined, employee: Employee, now: string): PersonStatus {
  if (employee.onLeave) return 'on_leave';
  const acked = isAcknowledged(post, response);
  if (isActionRequired(post) && !acked && now > post.ackBy!) return 'overdue';
  if (acked) return 'acknowledged';
  if (response?.openedAt) return 'opened';
  return 'not_opened';
}

const find = (responses: Response[], postId: string, employeeId: string) =>
  responses.find((r) => r.postId === postId && r.employeeId === employeeId);

function upsert(responses: Response[], next: Response): Response[] {
  const i = responses.findIndex((r) => r.postId === next.postId && r.employeeId === next.employeeId);
  return i === -1 ? [...responses, next] : responses.map((r, j) => (j === i ? next : r));
}

/** Idempotent: a second tap returns the same array. */
export function acknowledge(responses: Response[], post: Post, employeeId: string, now: string): Response[] {
  const r = find(responses, post.id, employeeId);
  if (isAcknowledged(post, r)) return responses;
  return upsert(responses, { postId: post.id, employeeId, version: post.version, openedAt: r?.openedAt ?? now, acknowledgedAt: now });
}

/** Sets openedAt on every given post that lacks one. Returns the same array if nothing changed. */
export function markOpened(responses: Response[], posts: Post[], employeeId: string, now: string): Response[] {
  let out = responses;
  for (const post of posts) {
    const r = find(out, post.id, employeeId);
    if (r?.openedAt) continue;
    out = upsert(out, r ? { ...r, openedAt: now } : { postId: post.id, employeeId, version: post.version, openedAt: now });
  }
  return out;
}
