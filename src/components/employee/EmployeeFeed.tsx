import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../state/AppContext';
import { employeeFeed } from '../../lib/ordering';
import { fmtStamp } from '../../lib/time';
import { ActionCard } from './ActionCard';
import { FyiCard } from './FyiCard';
import { Chip } from '../Chip';

const Heading = ({ children }: { children: string }) => (
  <h2 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-slate-500">{children}</h2>
);

type Tab = 'action' | 'fyi';

/** Two tabs: Action required (with Completed below) and Just FYI. Opening the feed opens every visible post. */
export function EmployeeFeed() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<Tab>('action');
  const me = state.viewerId;
  const feed = useMemo(
    () => employeeFeed(me, state.posts, state.responses, state.employees, state.now),
    [me, state.posts, state.responses, state.employees, state.now],
  );
  const responseFor = (postId: string) => state.responses.find((r) => r.postId === postId && r.employeeId === me);

  // "Opened" = the person opened the app since the post went up (SPEC §5), on either tab. The reducer ignores posts already opened.
  const visibleIds = [...feed.action.map((i) => i.post.id), ...feed.fyi.map((p) => p.id), ...feed.completed.map((p) => p.id)];
  const visibleKey = visibleIds.join(',');
  useEffect(() => {
    if (visibleIds.length) dispatch({ type: 'MARK_OPENED', employeeId: me, postIds: visibleIds });
  }, [me, visibleKey]);

  if (visibleIds.length === 0) {
    return <Empty>You're all caught up. New posts from your store will show here.</Empty>;
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'action', label: 'Action required', count: feed.action.length },
    { id: 'fyi', label: 'Just FYI', count: feed.fyi.length },
  ];

  return (
    <div className="mx-auto max-w-md">
      <div role="tablist" aria-label="Your posts" className="mb-4 flex gap-1 rounded-xl bg-slate-200 p-1">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold ${tab === t.id ? 'bg-white shadow-sm' : 'text-slate-600'}`}>
            {t.label}
            <span className={`rounded-full px-2 py-0.5 text-xs ${t.id === 'action' && t.count ? 'bg-amber-400 text-slate-900' : 'bg-slate-300/70 text-slate-700'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'action' ? <>
        {feed.action.length === 0
          ? <Empty>Nothing needs your action right now.</Empty>
          : <div className="space-y-3">
              {feed.action.map((item) => (
                <ActionCard
                  key={item.post.id}
                  item={item}
                  onAcknowledge={() => dispatch({ type: 'ACKNOWLEDGE', employeeId: me, postId: item.post.id })}
                />
              ))}
            </div>}

        {feed.completed.length > 0 && <>
          <Heading>Completed</Heading>
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white" data-testid="completed">
            {feed.completed.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 text-sm" data-post-id={p.id}>
                <span className="flex-1 text-slate-700">{p.title}</span>
                <Chip className="bg-emerald-50 text-emerald-700 ring-emerald-200">Acknowledged · {fmtStamp(responseFor(p.id)!.acknowledgedAt!, state.now)}</Chip>
              </li>
            ))}
          </ul>
        </>}
      </> : (
        feed.fyi.length === 0
          ? <Empty>No FYI posts right now.</Empty>
          : <div className="space-y-2">{feed.fyi.map((p) => <FyiCard key={p.id} post={p} />)}</div>
      )}
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <p data-testid="empty" className="mx-auto max-w-md rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">{children}</p>;
}
