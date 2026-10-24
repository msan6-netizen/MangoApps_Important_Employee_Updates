import { useCallback, useState } from 'react';
import type { Employee } from '../../types';
import { PostsList } from './PostsList';
import { Tracker } from './Tracker';
import { ComposeForm } from './ComposeForm';
import { StoreOverview } from './StoreOverview';
import { useApp } from '../../state/AppContext';
import { Toast } from '../Toast';

type OpsTab = 'overview' | 'posts';
type Screen = { kind: 'list' } | { kind: 'tracker'; postId: string } | { kind: 'compose' } | { kind: 'edit'; postId: string };

/** Rachel: Northgate only. Michael: all stores (no scope). Screens are local state; no router. */
export function ManagerView({ manager }: { manager: Employee }) {
  const { state } = useApp();
  const [screen, setScreenState] = useState<Screen>({ kind: 'list' });
  const setScreen = (s: Screen) => { setScreenState(s); window.scrollTo(0, 0); };
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const isOps = manager.role === 'ops_manager';
  const scope = isOps ? undefined : manager.storeIds;
  const [opsTab, setOpsTab] = useState<OpsTab>('overview'); // Michael opens on the store overview

  return (
    <div className="mx-auto max-w-3xl">
      {screen.kind === 'list' && isOps && (
        <div role="tablist" aria-label="Operations views" className="mb-4 flex max-w-md gap-1 rounded-xl bg-slate-200 p-1">
          {([['overview', 'Store overview'], ['posts', 'All posts']] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={opsTab === id} onClick={() => setOpsTab(id)} data-testid={`ops-tab-${id}`}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-lg text-sm font-semibold ${opsTab === id ? 'bg-white shadow-sm' : 'text-slate-600'}`}>
              {label}
            </button>
          ))}
        </div>
      )}
      {screen.kind === 'list' && isOps && opsTab === 'overview' && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Store overview</h2>
            <button onClick={() => setScreen({ kind: 'compose' })} className="min-h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">New post</button>
          </div>
          <StoreOverview />
        </section>
      )}
      {screen.kind === 'list' && (!isOps || opsTab === 'posts') && (
        <PostsList manager={manager} scope={scope} byStore={isOps} onOpen={(postId) => setScreen({ kind: 'tracker', postId })} onNew={() => setScreen({ kind: 'compose' })} />
      )}
      {screen.kind === 'tracker' && (
        <Tracker manager={manager} scope={scope} postId={screen.postId}
          onBack={() => setScreen({ kind: 'list' })}
          onEdit={() => setScreen({ kind: 'edit', postId: screen.postId })}
          onMessage={(name) => setToast(`Message to ${name} drafted`)} />
      )}
      {screen.kind === 'compose' && (
        <ComposeForm manager={manager} onCancel={() => setScreen({ kind: 'list' })}
          onDone={(postId) => { setScreen({ kind: 'tracker', postId }); setToast('Posted'); }} />
      )}
      {screen.kind === 'edit' && (
        <ComposeForm key={screen.postId} manager={manager} editing={state.posts.find((p) => p.id === screen.postId)}
          onCancel={() => setScreen({ kind: 'tracker', postId: screen.postId })}
          onDone={(postId) => { setScreen({ kind: 'tracker', postId }); setToast('Changes saved'); }} />
      )}
      <Toast message={toast} onClose={clearToast} />
    </div>
  );
}
