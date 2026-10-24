import type { ActionItem, Employee, FeedSections, PersonStatus, Post, Response } from '../types';
import { resolvePostAudience } from './audience';
import { isAcknowledged, isActionRequired, isDueSoon, personStatus } from './status';
import { fmtDayTime } from './time';

/** "Overdue since Tue 9:00 AM", "Due soon · Acknowledge by Thu 8:00 AM" or "Acknowledge by …" (Action Required posts only). */
export function reasonLabel(post: Post, status: PersonStatus, dueSoon: boolean): string {
  if (status === 'overdue') return `Overdue since ${fmtDayTime(post.ackBy!)}`;
  return `${dueSoon ? 'Due soon · ' : ''}Acknowledge by ${fmtDayTime(post.ackBy!)}`;
}

/**
 * SPEC assumption 3: earliest acknowledge-by → newest. Overdue items come first without a rule of their own (their deadline
 * has passed, so it's always the earliest), and due-soon items are the next earliest. Category never affects order.
 */
export function sortActionItems(items: { post: Post; status: PersonStatus; updated?: boolean }[], now: string): ActionItem[] {
  return items
    .map((item, index) => ({ ...item, index, dueSoon: item.status !== 'overdue' && isDueSoon(item.post, now) }))
    .sort((a, b) =>
      a.post.ackBy!.localeCompare(b.post.ackBy!) ||
      b.post.createdAt.localeCompare(a.post.createdAt) ||
      b.index - a.index) // same minute on the demo clock: the later post is newer
    .map(({ post, status, updated, dueSoon }) => ({ post, status, reason: reasonLabel(post, status, dueSoon), updated: !!updated, dueSoon }));
}

/** Newest first by createdAt; posts made at the same demo-clock time keep creation order, latest first. */
export function byNewest(posts: Post[]): Post[] {
  return posts
    .map((post, index) => ({ post, index }))
    .sort((a, b) => b.post.createdAt.localeCompare(a.post.createdAt) || b.index - a.index)
    .map(({ post }) => post);
}

export function employeeFeed(employeeId: string, posts: Post[], responses: Response[], employees: Employee[], now: string): FeedSections {
  const me = employees.find((e) => e.id === employeeId)!;
  const action: { post: Post; status: PersonStatus; updated: boolean }[] = [];
  const fyi: Post[] = [];
  const completed: Post[] = [];
  for (const post of posts) {
    const { actIds, fyiIds } = resolvePostAudience(post, employees);
    const r = responses.find((x) => x.postId === post.id && x.employeeId === employeeId);
    if (actIds.includes(employeeId) && isActionRequired(post)) {
      // Not yet acknowledged on a version after the first = "Edited, please re-confirm".
      if (isAcknowledged(post, r)) completed.push(post);
      else action.push({ post, status: personStatus(post, r, me, now), updated: post.version > 1 });
    } else if (actIds.includes(employeeId) || fyiIds.includes(employeeId)) {
      fyi.push(post);
    }
  }
  return { action: sortActionItems(action, now), fyi: byNewest(fyi), completed: byNewest(completed) };
}
