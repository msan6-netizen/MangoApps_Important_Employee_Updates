import type { Post } from '../../types';
import { fmtDayTime } from '../../lib/time';
import { CategoryChip } from '../Chip';
import { FoldedBody } from './FoldedBody';

/** FYI post: quiet styling, summary shown, body folded, no buttons. */
export function FyiCard({ post }: { post: Post }) {
  return (
    <article data-testid="fyi-card" data-post-id={post.id} className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <CategoryChip category={post.category} />
        <span className="text-xs text-slate-400">{fmtDayTime(post.createdAt)}</span>
      </div>
      <h3 className="mt-2 text-sm font-semibold text-slate-800">{post.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{post.summary}</p>
      <div className="mt-2"><FoldedBody body={post.body} /></div>
    </article>
  );
}
