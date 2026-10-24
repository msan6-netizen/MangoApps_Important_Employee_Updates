// Data model from SPEC.md section 4, plus the derived types the app needs.

export type Role = 'associate' | 'shift_lead' | 'store_manager' | 'ops_manager';
// Michael is the only ops_manager. storeIds = [] so he is never in a post's audience; he only posts and tracks.
export type Category = 'Safety' | 'Policy' | 'General';

export interface Store { id: string; name: string }
export interface Employee { id: string; name: string; role: Role; storeIds: string[]; onLeave: boolean }

export interface Audience { storeIds: string[]; roles: Role[]; employeeIds: string[] }
// resolves to: employees in any of storeIds whose role is in roles (empty roles = all roles)
//              UNION explicitly listed employeeIds. Deduplicated.

export interface Post {
  id: string; title: string; summary: string; body: string; category: Category; authorId: string;
  createdAt: string; updatedAt: string;
  actAudience: Audience | null;     // "Needs to act"
  fyiAudience: Audience | null;     // "Just FYI"
  ackBy: string | null;             // set iff actAudience resolves to >= 1 person (Action Required); default createdAt + 24h
  version: number;                  // starts at 1; increments on "Content changed"
  editedNote?: string;
}

export interface Response {
  postId: string; employeeId: string; version: number;
  openedAt?: string; acknowledgedAt?: string;
}

export type PersonStatus = 'on_leave' | 'overdue' | 'acknowledged' | 'opened' | 'not_opened';

// Compose/edit form values. category is nullable so "Category required" can fail.
export interface PostDraft {
  title: string; summary: string; body: string; category: Category | null;
  actAudience: Audience | null; fyiAudience: Audience | null;
  ackBy: string | null;
}
export type EditableFields = Pick<Post, 'title' | 'summary' | 'body' | 'category' | 'ackBy'>;
export type EditMode = 'typo' | 'content';
export type FieldErrors = Partial<Record<keyof PostDraft | 'audience', string>>;

export interface ActionItem { post: Post; status: PersonStatus; reason: string; updated: boolean; dueSoon: boolean }
export interface FeedSections { action: ActionItem[]; fyi: Post[]; completed: Post[] }

export interface PostMetrics {
  actCount: number; fyiCount: number; denominator: number;
  acknowledged: number; overdue: number; onLeave: number; opened: number; ackPct: number;
}
export interface StoreRollupRow {
  storeId: string; storeName: string; total: number;
  acknowledged: number; overdue: number; ackPct: number;
}
export type TrackerFilter = 'needs_follow_up' | 'acknowledged' | 'everyone';

export interface GuardrailWarning { storeId: string; storeName: string; count: number; message: string }
export interface Reminder { postId: string; employeeId: string; at: string } // acknowledgment reminder (simulated SMS)

export interface AppState {
  stores: Store[]; employees: Employee[]; posts: Post[]; responses: Response[];
  now: string; viewerId: string;
}
