import type { EditableFields, EditMode, Employee, Post, PostDraft } from '../types';
import { resolvePostAudience } from './audience';
import { fmtDayTime } from './time';

/** typo → same version (confirmations kept); content → version + 1 (everyone re-confirms). */
export function applyEdit(post: Post, changes: EditableFields, mode: EditMode, now: string): Post {
  const edited = { ...post, ...changes, updatedAt: now };
  if (mode === 'typo') return edited;
  return { ...edited, version: post.version + 1, editedNote: `Edited ${fmtDayTime(now)}. Please re-confirm` };
}

/** A new post from a validated draft, created at the demo clock time. */
export function buildPost(draft: PostDraft, id: string, authorId: string, now: string, employees: Employee[]): Post {
  const action = resolvePostAudience({ ...draft, authorId }, employees).actIds.length > 0;
  return {
    id, title: draft.title.trim(), summary: draft.summary.trim(), body: draft.body.trim(), category: draft.category!,
    authorId, createdAt: now, updatedAt: now,
    actAudience: draft.actAudience, fyiAudience: draft.fyiAudience,
    ackBy: action ? draft.ackBy : null, // FYI-only posts have no deadline
    version: 1,
  };
}
