import type { Employee, Post } from '../../types';
import { useApp } from '../../state/AppContext';
import { postsByStore, postsForManager } from '../../lib/scope';
import { audienceSummary } from '../../lib/audience';
import { postMetrics } from '../../lib/metrics';
import { isActionRequired } from '../../lib/status';
import { CategoryChip, Chip } from '../Chip';

/** Rachel: one list of her store's posts. Michael (byStore): grouped by location, company-wide posts first. */
export function PostsList({ manager, scope, byStore, onOpen, onNew }: {
  manager: Employee; scope?: string[]; byStore?: boolean; onOpen: (postId: string) => void; onNew: () => void;
}) {
  const { state } = useApp();
  const posts = postsForManager(manager, state.posts, state.employees);
  const groups = byStore ? postsByStore(posts, state.employees, state.stores) : [{ name: '', posts }];

  const card = (p: Post) => {
    const m = postMetrics(p, state.responses, state.employees, state.now, scope);
    const progress = isActionRequired(p)
      ? `Acknowledged ${m.acknowledged}/${m.denominator} · Overdue ${m.overdue}`
      : `Opened ${m.opened}/${m.denominator}`;
    return (
      <li key={p.id}>
        <button data-testid="post-row" data-post-id={p.id} onClick={() => onOpen(p.id)}
          className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip category={p.category} />
            {isActionRequired(p)
              ? <Chip className="bg-amber-100 text-amber-800 ring-amber-300">Action Required</Chip>
              : <Chip className="bg-white text-slate-500 ring-slate-200">FYI</Chip>}
          </div>
          <h3 className="mt-2 font-semibold text-slate-900">{p.title}</h3>
          <p className="mt-1 text-sm text-slate-500" data-testid="audience">{audienceSummary(p, state.employees, state.stores, scope)}</p>
          <p className={`mt-1 text-sm font-medium ${m.overdue ? 'text-red-600' : 'text-slate-700'}`} data-testid="progress">{progress}</p>
          <span className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-800">View responses →</span>
        </button>
      </li>
    );
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Posts</h2>
        <button onClick={onNew} className="min-h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">New post</button>
      </div>
      {posts.length === 0
        ? <p data-testid="empty" className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">No posts yet. Create your first.</p>
        : groups.map((g) => (
            <div key={g.name} className="mb-5">
              {g.name && <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500" data-testid="store-group">{g.name}</h3>}
              <ul className="space-y-2">{g.posts.map(card)}</ul>
            </div>
          ))}
    </section>
  );
}
