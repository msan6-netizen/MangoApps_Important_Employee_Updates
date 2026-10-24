import type { ActionItem } from '../../types';
import { CategoryChip, Chip } from '../Chip';
import { FoldedBody } from './FoldedBody';

/** An Action Required post the person hasn't acknowledged yet. Once they tap Acknowledge, it moves to Completed. */
export function ActionCard({ item, onAcknowledge }: { item: ActionItem; onAcknowledge: () => void }) {
  const { post, status, reason, updated, dueSoon } = item;
  const overdue = status === 'overdue';
  // Red = overdue, orange = due within 24h, plain = there's time.
  const tone = overdue ? 'border-red-500 bg-white' : dueSoon ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white';
  const reasonTone = overdue ? 'text-red-600' : dueSoon ? 'text-orange-700' : 'text-slate-500';
  return (
    <article
      data-testid="action-card"
      data-post-id={post.id}
      className={`rounded-xl border-2 p-4 shadow-sm ${tone}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <CategoryChip category={post.category} />
        {updated && <Chip className="bg-amber-100 text-amber-800 ring-amber-300">Edited, please re-confirm</Chip>}
      </div>
      <h3 className="mt-2 text-base font-semibold leading-snug text-slate-900">{post.title}</h3>
      <p className={`mt-0.5 text-sm font-medium ${reasonTone}`} data-testid="reason">{reason}</p>
      <p className="mt-2 text-sm text-slate-800" data-testid="summary">{post.summary}</p>
      <div className="mt-2"><FoldedBody body={post.body} /></div>

      <div className="mt-3">
        <button className="min-h-11 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white active:bg-slate-700" onClick={onAcknowledge}>Acknowledge</button>
      </div>
    </article>
  );
}
