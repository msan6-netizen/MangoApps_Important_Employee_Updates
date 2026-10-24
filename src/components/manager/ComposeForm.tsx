import { useState, type ReactNode } from 'react';
import type { Category, Employee, FieldErrors, GuardrailWarning, Post, PostDraft } from '../../types';
import { useApp } from '../../state/AppContext';
import { resolvePostAudience } from '../../lib/audience';
import { managerStoreIds, scopedEmployees } from '../../lib/scope';
import { defaultAckBy, validatePost } from '../../lib/validation';
import { changeToFyi, guardrailWarnings } from '../../lib/guardrail';
import { isActionRequired } from '../../lib/status';
import { fromPacificLocal, toPacificLocal } from '../../lib/time';
import { AudiencePicker } from './AudiencePicker';
import { Modal } from '../Modal';
import { CATEGORY_HINT } from '../labels';

const CATEGORIES: Category[] = ['Safety', 'Policy', 'General'];
const EMPTY: PostDraft = {
  title: '', summary: '', body: '', category: null, actAudience: null, fyiAudience: null, ackBy: null,
};

const fromPost = (p: Post): PostDraft => ({
  title: p.title, summary: p.summary, body: p.body, category: p.category, actAudience: p.actAudience,
  fyiAudience: p.fyiAudience, ackBy: p.ackBy,
});

interface Props { manager: Employee; editing?: Post; onDone: (postId: string) => void; onCancel: () => void }

export function ComposeForm({ manager, editing, onDone, onCancel }: Props) {
  const { state, dispatch } = useApp();
  const [draft, setDraft] = useState<PostDraft>(editing ? fromPost(editing) : EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [ackTouched, setAckTouched] = useState(!!editing);
  const [warnings, setWarnings] = useState<GuardrailWarning[]>([]);
  const [askEditMode, setAskEditMode] = useState(false);

  const scopeIds = managerStoreIds(manager, state.stores);
  const stores = state.stores.filter((s) => scopeIds.includes(s.id));
  const people = scopedEmployees(manager, state.employees).filter((e) => e.id !== manager.id); // never in their own post
  const { actIds, fyiIds } = resolvePostAudience({ ...draft, authorId: editing?.authorId ?? manager.id }, state.employees);
  const hasActors = actIds.length > 0;

  const update = (patch: Partial<PostDraft>) => {
    const keys = Object.keys(patch) as (keyof PostDraft)[];
    // An edited field drops its error; changing either picker drops the audience error.
    const stale = [...keys, ...(keys.some((k) => k === 'actAudience' || k === 'fyiAudience') ? ['audience' as const] : [])];
    if (stale.some((k) => errors[k])) setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !stale.includes(k as keyof FieldErrors))));
    const next = { ...draft, ...patch };
    // Anyone who needs to act → Action Required, with acknowledge-by prefilled (until the manager sets it).
    if (!ackTouched) next.ackBy = resolvePostAudience({ ...next, authorId: manager.id }, state.employees).actIds.length ? defaultAckBy(state.now) : null;
    setDraft(next);
  };

  const create = (d: PostDraft) => {
    const id = `post-${state.posts.length + 1}`;
    dispatch({ type: 'CREATE_POST', draft: d });
    onDone(id);
  };

  const submit = () => {
    const errs = validatePost(draft, manager, state.employees, state.now, editing);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (editing) {
      if (isActionRequired(editing)) setAskEditMode(true);
      else saveEdit('typo');
      return;
    }
    const w = guardrailWarnings(draft, state.posts, state.employees, state.stores, state.now);
    if (w.length) setWarnings(w);
    else create(draft);
  };

  const saveEdit = (mode: 'typo' | 'content') => {
    // "Content changed" asks everyone to re-confirm, so a deadline that has passed must be replaced first.
    const errs = validatePost(draft, manager, state.employees, state.now, editing, mode);
    if (Object.keys(errs).length) { setErrors(errs); setAskEditMode(false); return; }
    const { title, summary, body, category, ackBy } = draft;
    dispatch({ type: 'EDIT_POST', postId: editing!.id, mode, changes: { title, summary, body, category: category!, ackBy } });
    onDone(editing!.id);
  };

  return (
    <section className="space-y-4" data-testid="compose-form">
      <button onClick={onCancel} className="text-sm font-medium text-slate-600 hover:underline">← Cancel</button>
      <h2 className="text-lg font-bold">{editing ? 'Edit post' : 'New post'}</h2>
      <p className="text-xs text-slate-500"><Req /> Required</p>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <Field label="Title" required error={errors.title} counter={`${draft.title.length}/80`}>
          <input data-testid="title" className={input(errors.title)} value={draft.title} onChange={(e) => update({ title: e.target.value })} />
        </Field>
        <Field label="One-line summary" required error={errors.summary} counter={`${draft.summary.length}/120`}>
          <input data-testid="summary" className={input(errors.summary)} value={draft.summary} onChange={(e) => update({ summary: e.target.value })} />
        </Field>
        <Field label="Full text" required error={errors.body}>
          <textarea data-testid="body" rows={5} className={input(errors.body)} value={draft.body} onChange={(e) => update({ body: e.target.value })} />
        </Field>
        <Field label="Category" required error={errors.category} group>
          <div className="flex gap-2" role="radiogroup" aria-label="Category">
            {CATEGORIES.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={draft.category === c} onClick={() => update({ category: c })}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${draft.category === c ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white'}`}>
                {c}
              </button>
            ))}
          </div>
          <ul className="mt-2 space-y-0.5 text-xs text-slate-500" data-testid="category-hints">
            {CATEGORIES.map((c) => <li key={c}><span className="font-semibold text-slate-700">{c}:</span> {CATEGORY_HINT[c]}</li>)}
          </ul>
        </Field>
      </div>

      <p className="text-sm font-medium">Audience <Req /> <span className="font-normal text-slate-500">
        {editing ? "The audience can't be changed when editing." : 'Choose at least one person to act or get it as FYI. A role or person can be in only one of the two.'}
      </span></p>
      <AudiencePicker label="Needs to act" testId="act-picker" value={draft.actAudience} onChange={(a) => update({ actAudience: a })}
        taken={draft.fyiAudience} takenBy="Just FYI"
        stores={stores} allStores={state.stores} people={people} disabled={!!editing} />
      <AudiencePicker label="Just FYI" testId="fyi-picker" value={draft.fyiAudience} onChange={(a) => update({ fyiAudience: a })}
        taken={draft.actAudience} takenBy="Needs to act"
        stores={stores} allStores={state.stores} people={people} disabled={!!editing} />
      <p className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium" data-testid="live-count">
        {actIds.length} {actIds.length === 1 ? 'person' : 'people'} will need to act, {fyiIds.length} will get it as FYI.
      </p>
      {errors.audience && <p className="text-sm text-red-600" data-testid="error-audience">{errors.audience}</p>}

      {hasActors && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <Field label="Acknowledge by" required error={errors.ackBy}>
            <input type="datetime-local" data-testid="ackBy" className={input(errors.ackBy)}
              value={draft.ackBy ? toPacificLocal(draft.ackBy) : ''}
              onChange={(e) => {
                setAckTouched(true);
                if (errors.ackBy) setErrors(({ ackBy: _, ...rest }) => rest);
                setDraft({ ...draft, ackBy: e.target.value ? fromPacificLocal(e.target.value) : null });
              }} />
            <p className="mt-1 text-xs text-slate-500">Pacific time. At least 4 hours from now. People who need to act tap Acknowledge by then. Sooner deadlines show higher on their list; within 24 hours they turn orange.</p>
          </Field>
        </div>
      )}

      {Object.keys(errors).length > 0 && <p className="text-sm font-medium text-red-600">Fix the highlighted fields to continue.</p>}
      <div className="flex gap-2">
        <button onClick={submit} className="min-h-11 rounded-lg bg-slate-900 px-6 text-sm font-semibold text-white">{editing ? 'Save changes' : 'Post'}</button>
        <button onClick={onCancel} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium">Cancel</button>
      </div>

      {warnings.length > 0 && (
        <Modal title="That's a lot of Action Required posts" testId="guardrail">
          {warnings.map((w) => <p key={w.storeId}>{w.message}</p>)}
          <div className="flex flex-wrap gap-2 pt-1">
            <button className="min-h-11 rounded-lg bg-slate-900 px-4 font-semibold text-white" onClick={() => { setWarnings([]); create(draft); }}>Post anyway</button>
            <button className="min-h-11 rounded-lg border border-slate-300 px-4 font-medium" onClick={() => { setWarnings([]); setDraft(changeToFyi(draft, state.employees)); }}>Change to FYI</button>
          </div>
        </Modal>
      )}

      {askEditMode && (
        <Modal title="What kind of edit is this?" testId="edit-mode">
          <button className="block w-full rounded-lg border border-slate-300 p-3 text-left hover:bg-slate-50" onClick={() => saveEdit('typo')}>
            <span className="font-semibold">Typo fix</span>: keep confirmations
          </button>
          <button className="block w-full rounded-lg border border-slate-300 p-3 text-left hover:bg-slate-50" onClick={() => saveEdit('content')}>
            <span className="font-semibold">Content changed</span>: everyone re-confirms
          </button>
          <button className="text-slate-500 hover:underline" onClick={() => setAskEditMode(false)}>Back to editing</button>
        </Modal>
      )}
    </section>
  );
}

const input = (error?: string) =>
  `w-full rounded-lg border px-3 py-2 text-sm ${error ? 'border-red-500 bg-red-50' : 'border-slate-300'}`;

/** A <label> around a single input; a <div> around button groups (a label would click its first button). */
function Field({ label, required, error, counter, group, children }: {
  label: string; required?: boolean; error?: string; counter?: string; group?: boolean; children: ReactNode;
}) {
  const Tag = group ? 'div' : 'label';
  return (
    <Tag className="block">
      <span className="mb-1 flex justify-between text-sm font-medium">
        <span>{label}{required && <> <Req /></>}</span>
        {counter && <span className="font-normal text-slate-400">{counter}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600" role="alert" data-testid={`error-${label}`}>{error}</span>}
    </Tag>
  );
}

/** Red asterisk for required fields. */
function Req() {
  return <span data-testid="required"><span className="text-red-600" aria-hidden="true">*</span><span className="sr-only">(required)</span></span>;
}
