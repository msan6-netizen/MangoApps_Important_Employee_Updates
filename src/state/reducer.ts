import type { AppState, EditableFields, EditMode, PostDraft } from '../types';
import { buildSeed, ALEX_ID } from '../data/seed';
import { acknowledge, markOpened } from '../lib/status';
import { applyEdit, buildPost } from '../lib/edit';
import { DEMO_START, addHours } from '../lib/time';

export type Action =
  | { type: 'SET_VIEWER'; employeeId: string }
  | { type: 'ADVANCE_CLOCK'; hours: number }
  | { type: 'RESET_CLOCK' }
  | { type: 'RESET_DEMO' }
  | { type: 'MARK_OPENED'; employeeId: string; postIds: string[] }
  | { type: 'ACKNOWLEDGE'; employeeId: string; postId: string }
  | { type: 'SET_ON_LEAVE'; employeeId: string; onLeave: boolean }
  | { type: 'CREATE_POST'; draft: PostDraft }
  | { type: 'EDIT_POST'; postId: string; changes: EditableFields; mode: EditMode };

export function initialState(): AppState {
  return { ...buildSeed(), now: DEMO_START, viewerId: ALEX_ID };
}

/** Pure. Every timestamp comes from state.now (the demo clock). Validation happens in the form before dispatch. */
export function reducer(state: AppState, action: Action): AppState {
  const post = (id: string) => state.posts.find((p) => p.id === id)!;
  switch (action.type) {
    case 'SET_VIEWER':
      return { ...state, viewerId: action.employeeId };
    case 'ADVANCE_CLOCK':
      return { ...state, now: addHours(state.now, action.hours) };
    case 'RESET_CLOCK':
      return { ...state, now: DEMO_START };
    case 'RESET_DEMO':
      return { ...initialState(), viewerId: state.viewerId };
    case 'MARK_OPENED': {
      const posts = state.posts.filter((p) => action.postIds.includes(p.id));
      const responses = markOpened(state.responses, posts, action.employeeId, state.now);
      return responses === state.responses ? state : { ...state, responses };
    }
    case 'ACKNOWLEDGE': {
      const responses = acknowledge(state.responses, post(action.postId), action.employeeId, state.now);
      return responses === state.responses ? state : { ...state, responses };
    }
    case 'SET_ON_LEAVE':
      return { ...state, employees: state.employees.map((e) => (e.id === action.employeeId ? { ...e, onLeave: action.onLeave } : e)) };
    case 'CREATE_POST': {
      const id = `post-${state.posts.length + 1}`;
      return { ...state, posts: [...state.posts, buildPost(action.draft, id, state.viewerId, state.now, state.employees)] };
    }
    case 'EDIT_POST':
      return { ...state, posts: state.posts.map((p) => (p.id === action.postId ? applyEdit(p, action.changes, action.mode, state.now) : p)) };
  }
}
