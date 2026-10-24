# SPEC — Summit Retail Posts (V1 prototype)

## 1. Problem and users
**Customer:** Summit Retail Group. 5 stores in the Seattle area, ~200 employees, mostly on the sales floor. They don't check email. Updates go out by group text, printed notices, and meetings, so important ones get missed and managers can't tell who has seen what.

**The one problem V1 solves:** critical policy and safety updates get lost among everyday chatter, and managers have no record of who has read or acted on them.

**Users**
- **Alex Rivera**, sales associate (Northgate). Glances at his phone for seconds between the register and stocking. Wants to know what actually needs him, nothing else. *Wins on interruptions.*
- **Rachel Kim**, store manager (Northgate). Accountable when a safety update is missed. Needs proof of who has acknowledged and who hasn't. Today she retypes printed notices into group texts. *Wins on critical updates.*
- **Malvika Sanghvi**, sales associate (Renton). Exists in the demo to prove targeting: she must not see Northgate's posts.
- **Michael Torres**, operations manager (all 5 stores). The customer who made the request. Needs to see, across stores, whether critical updates landed, and which store is behind.

**How the Rachel vs. Alex disagreement is resolved:** nothing interrupts Alex by default. *FYI* posts are there when he opens the app and never ask anything. *Action Required* posts get their own tab, first when he opens the app, but also never interrupt his work. Escalation (a reminder text) happens only if he hasn't responded, so the job actually gets done. Managers are warned when they overuse Action Required.

## 2. V1 scope
**In:**
- "Viewing as" switcher: Michael (Operations, all stores) / Rachel (Manager, Northgate) / Alex (Associate, Northgate) / Malvika (Associate, Renton)
- Michael's view: two tabs, **Store overview** (default: one row per store, furthest behind on top) and **All posts** (grouped by location), plus the same compose form and tracker as Rachel, covering all 5 stores, with a per-store summary at the top of each tracker
- Simulated reminder text that slides in on the employee's screen when the demo clock passes their reminder time
- Compose: choose who needs to act vs. who is just FYI (a role or person can be in only one of the two); target stores, roles, or people (store managers limited to their own store)
- Employee feed in two tabs: **Action required** (sorted by urgency, assumption 3; each card shows a one-line summary with the full text folded; Completed below) and **Just FYI**
- One-tap acknowledgment (**Acknowledge**). V1 asks for read confirmation only; there is no task completion (section 11)
- Manager tracker: counts and percentages, per-person status, overdue in red, "Needs follow-up" filter, on-leave toggle, mocked Message button, simulated reminder log
- Edit with "Typo fix" vs "Content changed"
- Overuse guardrail warning
- Demo clock (+4 hours, +1 day, reset) and Reset demo data
- Empty states and form validation

**Out:** see section 11.

## 3. Assumptions (say these in the demo and README)
Each assumption has a "because", since the demo must say why we guessed that way.

1. **Checking the app is a start-of-shift habit.** Managers can post whenever they need to; every associate checks the app once when their shift begins: one place, once a day, instead of messages arriving all day. *Because* the whole no-interruptions design depends on it: nothing pings Alex when a post goes up, so he isn't hit with 40 messages a day or pulled away from customers. **If this is wrong, the design breaks**, so it's the first thing to check in a pilot (share of employees who open the app within 24 hours of a post). The demo clock starts at 9:00 AM, a shift start; from there `+1 day` lands on the next morning's shift start. (`+1 day` always adds 24 hours, so after `+4h` it lands on Thu 1:00 PM.)

2. **Employees use their own phones, and V1 is a mobile web app, not a downloadable app.** The layout adapts to any screen size.
   - *Because:* nothing to install (matters for 200 people with high turnover); a reminder text can link straight to the post; nothing is stored on personal phones (better for privacy); every fix reaches everyone instantly, with no app-store releases.
   - *Speed and data accuracy:* no meaningful difference from a native app for short text posts; acknowledgment records are just as accurate.
   - *What would justify a native app later:* push notifications without SMS cost, offline reading in stockrooms with weak signal, and faster sign-in (Face ID) instead of expiring sessions.
   - *In production* this wouldn't be a separate app: it would live inside MangoApps' existing employee app. Web vs. native is a prototype question.

3. **"Sorted by urgency" means the deadline decides, not a category or a priority field.** Action Required cards are ordered: (1) overdue first; (2) then the soonest acknowledge-by; (3) then newest. A manager signals "this matters more" with a shorter deadline. Each card says why it's where it is ("Overdue since Tue 9:00 AM", "Due soon · Acknowledge by Thu 8:00 AM", "Acknowledge by Thu 10:00 AM"). Overdue cards are red, **due soon** (acknowledge-by within 24 hours) orange, the rest plain.
   - *Because:* the deadline is one objective setting the manager already has to fill in. Ranking by category would depend on every manager picking categories the same way, and a priority field drifts toward "everything is urgent," which is exactly Alex's complaint.
   - *Category is a label only*, so a post is easy to scan; it never changes the order. The compose form defines each one: **Safety**: could hurt someone (hazards, recalls, equipment, emergency procedures). **Policy**: rules people must follow (procedures, pay, scheduling, conduct, returns). **General**: everything else (events, store news, recognition).
   - *Why 24 hours:* associates check the app once per shift (assumption 1), so a deadline inside 24 hours lands before their next check: if they don't do it now, it will be overdue. The top card is always the next thing to do.
   - *Because:* a missed safety step can hurt someone, a missed policy costs money or customers, and General is everything else. A priority field would drift toward "everything is urgent," which is exactly Alex's complaint.

4. **Every update allows at least 4 hours to respond. V1 does not handle emergencies.** *Because* most updates (policies, recalls, procedures) are planned. Emergencies (evacuation, weather closure) need instant alerts or a call tree, a different and more complex rollout, which MangoApps' existing Critical Alerts would handle.

5. **No text when a post goes up. Texts are escalation only**, to people who haven't responded, and are **simulated** in V1. *Because* Alex doesn't want interruptions, and Rachel only needs to chase the people who missed it.

6. **After the last reminder, follow-up is a person:** the manager reaches out directly. *Because* a third automated nudge is the "constantly asking me" Alex described.

7. **Store managers post updates for their own store; operations (Michael) posts company-wide updates, like safety procedures that apply to every store, and sees progress across all stores.** *Because* one safety update should go out once, not five times. Enforced in the prototype: Rachel can only target and see Northgate. Managers don't acknowledge their own posts: the author is left out of the audience and the counts. (Rachel still acknowledges posts Michael sends to every store.) Real logins and an admin screen to assign managers are next.

8. **No AI in V1; AI features are next steps.** The V1 problem (the right people see it, and managers can prove who did) is solved by fixed rules. *Because* acknowledgment records are Rachel's proof, so they must come from fixed rules; V1 should prove that loop before adding AI. When AI arrives (section 11), it drafts and a manager decides: it never sets status, overdue, or counts.

9. **All 5 stores are in one time zone (Pacific).** *Because* every deadline and reminder time assumes one clock.

10. **English only, and not yet accessibility-tested.** Mock data. No logins; the "Viewing as" switcher stands in. *Because* the assignment allows it and none of these test the core problem. Urgency is shown by color (red, orange) **and** a text label ("Overdue since…", "Due soon ·"), so it doesn't rely on color alone, but V1 has had no check for color blindness, screen readers, contrast, or large text. Summit's floor staff likely include non-English speakers, so translations come before a wider rollout.

11. **Each store has a store manager, a few shift leads, and associates.** *Because* shift leads usually run the floor when the manager isn't there, and some updates (like closing procedures or cash handling) are only for them, managers need to target by role, not just by store.

## 4. Data model (TypeScript)
```ts
type Role = 'associate' | 'shift_lead' | 'store_manager' | 'ops_manager';
// Michael is the only ops_manager. storeIds = [] so he is never in a post's audience; he only posts and tracks.
type Category = 'Safety' | 'Policy' | 'General';

interface Store { id: string; name: string }
interface Employee { id: string; name: string; role: Role; storeIds: string[]; onLeave: boolean }

interface Audience { storeIds: string[]; roles: Role[]; employeeIds: string[] }
// resolves to: employees in any of storeIds whose role is in roles (empty roles = all roles)
//              UNION explicitly listed employeeIds. Deduplicated.

interface Post {
  id: string; title: string; summary: string; body: string; category: Category; authorId: string;
  createdAt: string; updatedAt: string;
  actAudience: Audience | null;     // "Needs to act"
  fyiAudience: Audience | null;     // "Just FYI"
  ackBy: string | null;             // Action Required = actAudience resolves to >= 1 person; then required. Default createdAt + 24h
  version: number;                  // starts at 1; increments on "Content changed"
  editedNote?: string;
}

interface Response {
  postId: string; employeeId: string; version: number;
  openedAt?: string; acknowledgedAt?: string;
}
```

## 5. Business rules (all pure functions in `src/lib/`)
**Audience resolution** `resolveAudience(audience, employees)`: union of store+role matches and explicit people, deduplicated. Per post: `actIds = resolve(actAudience)`, `fyiIds = resolve(fyiAudience) minus actIds` (**act wins**). A multi-store employee counts once. **The author is never in their own post** (not in actIds, fyiIds, counts, or reminders), so a store manager never acknowledges their own post; an audience of only the author fails validation.

**Visibility:** an employee sees a post if they are in `actIds` or `fyiIds`.

**Opened:** when an employee's feed renders, set `openedAt` for every visible post that doesn't have one.

**Person status on an Action Required post** `personStatus(post, response, employee, now)`, in this precedence:
1. `on_leave` if `employee.onLeave`
2. `overdue` if not acknowledged for the current version and now > ackBy
3. `acknowledged` if acknowledged for the current version (final: never overdue after that)
4. `opened` if openedAt is set
5. `not_opened`

A response from an older `version` counts as **not acknowledged** (but keeps `openedAt`).

**Acknowledge** is idempotent and writes the current `version`. There is no task completion in V1 (section 11).

**Due soon** `isDueSoon(post, now)`: `ackBy` is at most 24 hours after `now` and not yet passed (`now ≤ ackBy`). A display and ordering flag, not a person status; overdue takes precedence.

**Sorted by urgency** `sortActionItems(items, now)`: overdue first → earliest `ackBy` → newest. Category never affects order (due-soon items are simply the earliest non-overdue ones). Acknowledged items move to *Completed*. Each card shows a reason label: `Overdue since Tue 9:00 AM`, `Due soon · Acknowledge by Thu 8:00 AM`, or `Acknowledge by Thu 10:00 AM`.

**Validation** `validatePost(draft, manager, employees, now)` returns field errors:
- Title required, max 80 characters. Summary required, max 120. Body required. Category required.
- At least one of actAudience / fyiAudience must resolve to **≥ 1 person**.
- If actAudience resolves to ≥ 1 person (Action Required): ackBy required.
- ackBy must be **at least 4 hours after `now`**. Error: "Give people at least 4 hours. For emergencies, contact stores directly."
- **Needs to act and Just FYI are mutually exclusive:** a role or a person chosen in one can't be chosen in the other (stores can be shared). The pickers disable them; validation rejects any overlap as a backstop.
- **Scope:** a store manager's act and FYI audiences may only include their own store(s) and people at those stores. The compose pickers only offer those options; validation rejects anything else as a backstop. Ops manager has no limit.
- **Edit restriction (V1):** when editing, the audience cannot be changed (avoids recount ambiguity). Title, summary, body, category, and the acknowledge-by time can be. The 4-hour rule only checks a deadline the manager changes. "Content changed" makes everyone re-confirm, so it needs a deadline at least 4 hours away, even if the manager didn't change it. If the deadline has passed or is less than 4 hours away: "Everyone has to re-confirm, so they need at least 4 hours. Set a new deadline." A Typo fix keeps the existing deadline.

**Overuse guardrail** `guardrailWarnings(draft, posts, employees, now)`: for each store in the draft's act audience, count posts created in the last 7 days whose act audience includes anyone at that store. If **≥ 3**, warn: *"Northgate already has 3 Action Required posts this week. Too many can make them easy to ignore."* Options: **Post anyway** / **Change to FYI** (moves act audience into FYI). Never blocks.

**Reminders (simulated)** `remindersDue(post, responses, employees, now)`, for people in actIds who are not on leave:
- **Acknowledgment reminder:** once, at `createdAt + min(4h, (ackBy − createdAt) / 2)`, if not yet acknowledged. (Halfway to the deadline, capped at 4 hours, so it still fires before a short deadline.)
- No texts after the deadline. The person shows as overdue for the manager to follow up.

The log shows each due reminder as a simulated SMS with time and person. Deterministic for a given `now`.

**Texts on the employee's screen** `textsBetween(employeeId, posts, responses, employees, from, to)`: the viewer's reminders with a time in `(from, to]`. When the demo clock moves while viewing an employee, each one slides in as a phone-style banner labelled "Text message · simulated": *Summit: You have a post to acknowledge by <time>. Open the Summit app to read it.* The text never includes the post's title or content: it only says something is waiting, by when, and where to read it. Texts from before the viewer opened the app aren't replayed.

**Edit** `applyEdit(post, changes, mode)`: `typo` → update fields, version unchanged. `content` → update fields, `version + 1`, `editedNote = "Edited <time>. Please re-confirm"`. Employees see an "Edited, please re-confirm" tag.

**Manager scope** `postsForManager(manager, posts, employees)`: store manager sees posts whose resolved audience includes anyone at their store(s), and their tracker shows only their store's people. Ops manager sees all posts and all stores.

**Store overview** `storeOverview(posts, responses, employees, stores, now)`: per store, Action Required and FYI posts that target it (same "stores the post targets" rule as the store summary), and people acknowledged / required and overdue now, summed over its Action Required posts. Lowest acknowledgment % first; stores with no Action Required posts last.

**Posts by store** `postsByStore(posts, employees, stores)`: posts that target every store under "All stores", then each store's own posts (a post for two stores is listed under both), newest first; empty groups are skipped.

**Store summary** `storeRollup(post, ...)`: per store, acknowledged x/y, overdue n. Shown at the top of the tracker for Michael (one row per store, lowest acknowledgment % first, so the store that's behind is on top).

**Metrics shown per post (manager):** Acknowledged x/y (%), Overdue n, On leave n. Denominator y = people in actIds **excluding on-leave**. Always show counts next to percentages.

## 6. Screens
**Header (always):** app name · "Viewing as: [name] ▾" switcher (Michael, Rachel, Alex, Malvika) · demo clock showing current date and time with `+4h`, `+1 day`, `Reset clock` · `Reset demo data`.

**Employee view (390px first)**: two tabs, **Action required** (default) and **Just FYI**, each with a count.
- **Action required tab:** cards sorted by urgency. Each card: category chip, title, reason label, **one-line summary**, status (red border and label when overdue; orange border, tint and label when due soon; plain otherwise), "Edited, please re-confirm" tag if applicable, **Read full post ▾** to unfold the body. Button: **Acknowledge**. After tapping, the post moves to **Completed** (a plain list below the cards) with "Acknowledged · 2:14 PM".
- **Just FYI tab:** FYI posts, newest first, quiet styling, summary shown, body folded, no buttons.
- Empty states: no posts at all → "You're all caught up. New posts from your store will show here." No action items → "Nothing needs your action right now." No FYI posts → "No FYI posts right now."

**Manager view** (Rachel: Northgate only; Michael: all stores)
- **Michael's tabs:** **Store overview** (default; columns Store · Action Required · FYI · Acknowledged x/y (%) with a bar · Overdue now) and **All posts** (the posts list grouped by location). Back from a tracker returns to the tab he was on.
- **Posts list:** title, category chip, Action Required or FYI, audience summary ("Northgate · 38 to act, 1 FYI"), progress ("Acknowledged 21/38 · Overdue 17"). Each card ends with a **View responses →** cue (the whole card opens the tracker). Header **Posts**, button **New post**. Empty state: "No posts yet. Create your first."
- **Compose / Edit form:** title · summary · body · category (with a one-line definition of each, assumption 3) · **Needs to act** picker (store checkboxes, role checkboxes, add people; Rachel sees only Northgate) · **Just FYI** picker (same; roles and people already in the other picker are disabled) · **Acknowledge by** (shown when anyone needs to act, prefilled now + 24h; hint: sooner deadlines show higher, within 24 hours they turn orange). Required fields are marked with a red asterisk. Live count (author excluded): "39 people will need to act, 1 will get it as FYI." Inline errors. Guardrail warning on submit. On edit of an Action Required post: modal "Typo fix: keep confirmations" / "Content changed: everyone re-confirms".
- **Tracker (per post):** summary metrics with progress bars; for Michael, the store summary table first; then people grouped by store (collapsible) with name, role, status chip, timestamps. **Filter, default "Needs follow-up"** (overdue + not opened + opened-but-not-acknowledged), with tabs "Acknowledged" and "Everyone". **On leave** toggle; **Message** button on overdue rows (toast "Message to Alex drafted", mocked); **Reminder log** panel; **Edit** button.

## 7. Seed data (deterministic; demo clock starts Wed Oct 28 2026, 9:00 AM Pacific)
**Stores:** 1 Downtown Seattle, 2 Northgate, 3 Bellevue, 4 Renton, 5 Tacoma.
**Employees: 200 total, 40 per store**, plus Michael (ops manager, no store). Per store: 1 store manager, 3 shift leads, 36 associates.
- **Generated deterministically** in `src/data/seed.ts`: names from fixed first-name and last-name lists combined by index (varied, realistic, no duplicates). **No `Math.random()`**; if randomness is needed use a small seeded PRNG so every reset produces identical data.
- Fixed people: Rachel Kim = store manager, Northgate. Alex Rivera = associate, Northgate. Malvika Sanghvi = associate, Renton. Michael Torres = ops manager.
- 3 people work at two stores (one of them at Northgate and Bellevue). 5 people are on leave (one at Northgate).
- Seed responses are deterministic (rule by index), with **different completion rates per store** so Michael's summary shows a store that's behind (Northgate, lowest on the ladder post).
- Every seed post has a hand-written summary.

**Posts** (created relative to the demo clock):
1. **Action · Safety** — "New ladder safety procedure". Summary: "From Monday: use a spotter on ladders over 6 ft." Body: a realistic paragraph (three points of contact, spotter over 6 ft, tag damaged ladders and report to the shift lead). All stores act. Created Mon Oct 26 9:00, ackBy Tue Oct 27 9:00 (**already past**: produces real overdue rows). About 75% acknowledged company-wide (Downtown Seattle 90%, Bellevue 85%, Renton 80%, Tacoma 70%, Northgate 55%). **Alex has not acknowledged** (overdue). Malvika has not acknowledged (used to show the empty state after she does).
2. **Action · Safety** — "Recall: SunSplash Kids Sunscreen 6 oz". Summary: "Pull it from shelves by Friday 5 PM. Confirm you've read this." Northgate and Bellevue associates and shift leads act; Northgate store manager FYI. Created Tue Oct 27 10:00, ackBy Thu Oct 29 10:00. Mixed progress; **Alex has not acknowledged.**
3. **Action · Policy** — "Updated return policy". Summary: "From Nov 1, electronics returns need a receipt." Northgate act. Created Wed Oct 28 8:00, ackBy Thu Oct 29 8:00. Few acknowledged yet.
4. **FYI · General** — "Holiday schedule requests due Nov 5". All stores.
5. **FYI · General** — "Parking lot repaving Saturday: please use the rear lot". Northgate.
6. **FYI · General** — "Northgate hit 112% of the October sales goal. Thank you!" Northgate.
7. **FYI · General** — "Renton team lunch Friday at 2 PM". Renton only.

Northgate therefore already has **3 Action Required posts this week**, so composing another for Northgate triggers the guardrail. Alex's Action Required order: ladder (Overdue since Tue 9:00 AM) → return policy (Due soon · Acknowledge by Thu 8:00 AM; 23 hours away) → recall (Acknowledge by Thu 10:00 AM; 25 hours away). After `+4h` the recall is due soon too (both orange); the order stays by deadline. Malvika sees the ladder post, holiday schedule, and team lunch, and **not** the recall, return policy, parking, or sales posts.

## 8. Acceptance criteria (write Vitest tests for every lib item first)
**Audience and targeting**
- [ ] AC1 A post targeted to Northgate is not visible to Malvika (Renton) and Malvika is not in its counts.
- [ ] AC2 A person in both act and FYI audiences appears once, as act.
- [ ] AC3 A multi-store employee appears once and is counted once.
- [ ] AC4 Role filter works: "Northgate, shift leads only" resolves to Northgate shift leads only.

**Validation and scope**
- [ ] AC5 Submitting without a title, summary, body, or an audience that resolves to ≥1 person is blocked with inline errors.
- [ ] AC6 An Action Required audience without an acknowledge-by time is blocked.
- [ ] AC7 ackBy less than 4 hours from now is blocked with the emergency message.
- [ ] AC8 Rachel's compose pickers offer only Northgate and Northgate people; an audience outside Northgate fails validation. Michael can target any store.

**Status, actions, ordering**
- [ ] AC9 Status precedence matches section 5 exactly (on_leave > overdue > acknowledged > opened > not_opened).
- [ ] AC10 Tapping Acknowledge twice records one acknowledgment; counts don't change on the second tap.
- ~~AC11~~ Removed in the V1 scope cut (no task completion).
- [ ] AC12 Alex's Action Required order is ladder (red) → return policy (orange, due soon) → recall (plain), each with the correct reason label and summary; after `+4h` the order is the same and both open cards are orange. Category never changes the order.
- [ ] AC13 Opening the employee feed sets openedAt for visible posts, changing "Not opened" to "Opened" for that person.

**Overdue, leave, reminders**
- [ ] AC14 Overdue rows are red for the employee (card) and the manager (tracker row).
- [ ] AC15 Marking someone on leave removes them from overdue, from reminders, and from the denominator.
- [ ] AC16 Advancing the demo clock past the acknowledgment reminder time makes reminders appear for non-responders only.
- ~~AC17~~ Removed in the V1 scope cut (no completion reminder). No reminders are sent after the deadline (section 5).

**Guardrail and edit**
- [ ] AC18 Composing an Action Required post for Northgate shows the guardrail warning; "Change to FYI" moves the act audience to FYI; "Post anyway" posts it.
- [ ] AC19 Edit → Typo fix keeps all acknowledgments.
- [ ] AC20 Edit → Content changed resets acknowledgments for everyone (openedAt kept) and shows the re-confirm tag.

**Manager scope and scale**
- [ ] AC21 Rachel's posts list excludes Renton's team lunch; her tracker shows only Northgate people.
- [ ] AC22 Michael sees all posts; the ladder tracker shows a 5-row store summary with Northgate on top (lowest %).
- [ ] AC23 Seed has exactly 200 employees + Michael; two resets produce identical data; ladder post shows counts out of 195 (200 minus 5 on leave).
- [ ] AC24 Tracker filter defaults to "Needs follow-up" and Alex appears there until he acknowledges.

**Draft from notice (AI)**: scoped out of V1 (section 11).
- ~~AC25~~ ~~AC26~~ ~~AC27~~ ~~AC28~~ Retired with the AI draft, not renumbered.

**Empty states and persistence**
- [ ] AC29 Empty states show the exact copy in section 6.
- [ ] AC30 State survives a page refresh; Reset demo data restores the seed.

**Michael and texts**
- [ ] AC31 Michael opens on Store overview: 5 rows, Northgate on top (54/115, 47%, 18 overdue at demo start). All posts groups as All stores → Northgate → Bellevue → Renton.
- [ ] AC32 Viewing as Alex at demo start, `+4h` slides in one simulated text for the return policy (Wed 12:00 PM); none if he acknowledged it first.

## 9. Tests to write first (Vitest, `src/lib/*.test.ts`)
`resolveAudience`, `visiblePosts`, `personStatus`, `sortActionItems` (+ reason labels), `validatePost` (incl. 4-hour rule and scope), `guardrailWarnings`, `remindersDue`, `applyEdit`, `acknowledge` (idempotency), `audienceOverlap` (act/FYI mutually exclusive), `postMetrics` (counts, %, denominator excludes on leave), `postsForManager`, `storeRollup`, seed (count = 200, deterministic across two calls). Use the seed data and fixed `now` values. Deliberately break one function to confirm its test fails.

## 10. Build order and time boxes (stop at 3:00)
| Time | Step |
|---|---|
| 0:00–0:20 | Scaffold Vite + React + TS + Tailwind + Vitest. Types, seed data, demo clock in state. Plan-mode review. |
| 0:20–0:50 | `src/lib/` functions with tests (section 9). All green. |
| 0:50–1:25 | Employee view (sections, urgency order, summaries, buttons, empty states) + "Viewing as" switcher. |
| 1:25–1:55 | Manager posts list + tracker (metrics, filter, status, on leave, Message toast, reminder log) + Michael's store summary and scope. |
| 1:55–2:20 | Compose/Edit form: validation, scoped pickers, live counts, guardrail, typo vs. content edit. |
| 2:20–2:55 | Manual pass through every acceptance criterion at 390px and desktop. Fix only failures. |
| 2:55–3:00 | README links, deploy (static site), push. |

If behind schedule, cut in this order: role checkboxes (keep stores and people) → store summary sorting → collapsible store groups.

## 11. Out of scope, and why (the demo must say why)
**Not in V1:**
- **All AI features, including "Draft from notice"**: V1 proves the core loop (targeting, one-tap acknowledgment, tracking) with fixed, testable rules. Leaving AI out means no API key, no external call that can fail in a demo, and nothing that could blur Rachel's proof. Every AI idea is on the roadmap below.
- **Task completion tracking** (e.g., confirming the recall was actually done): the request asks for read confirmation only; it's the natural V2.
- **Q&A and comments** (Michael's "eventually"): the confirmation loop has to work first, and comments need moderation decisions (who answers, what's visible to whom) Michael hasn't made.
- **Real SMS or push**: needs a provider, phone numbers, and opt-in consent; simulating proves the escalation rules without that.
- **Logins and a permissions admin screen**: scope is enforced inside the prototype, but real accounts and assigning who is a manager need logins, which don't test the core problem.
- **Emergency alerts** (under 4 hours): need instant delivery or a call tree; a different rollout. MangoApps' Critical Alerts covers this.
- **Call button** on overdue rows: Rachel is in the same store, so the real follow-up is in person; Message already shows that a person takes over.
- **New hires inheriting open Action Required posts**: real need for safety posts, but depends on how Summit's HR system adds people.
- **Superseding an old policy with a newer one; archive/delete**: secondary to the core loop. V1 has no delete, so proof of acknowledgment is never lost.
- **Translations, scheduled posts, attachments**: valuable, but none is needed to prove "the right people saw it."
- **A full accessibility pass** (color blindness, screen readers, contrast, large text): V1 pairs every color with a text label, but hasn't been tested with people who rely on these.
- **Custom categories and a priority matrix**: companies will want their own categories, and some (e.g. Safety) may deserve a faster default deadline or a higher place on the list. V1 keeps three fixed labels and lets the deadline alone set the order; designing a category × deadline matrix needs real usage data.

**Roadmap (name in the demo):**
- **V2: Draft from notice** (AI): paste a printed notice; AI fills in title, summary, category, FYI vs. Action Required, acknowledge-by deadline, and suggested roles. The manager reviews every field; nothing auto-posts. The notice is treated as content, not instructions, and a deadline is never invented. Ships with a 10-notice golden set (see `AI_REVIEW_LOG.md`) as its eval. Removes Rachel's retyping.
- **V2: Shift-aware reminders** (builds on MangoApps Shifts & Schedules): reminders fire at the start of someone's next shift, and people not on shift aren't marked overdue. Fixes the part-timer gap in the 4-hour rule.
- **V2: One-question check on Safety posts** (builds on MangoApps' AI Quiz Creator): AI writes one multiple-choice question from the post's own text; it replaces "Acknowledge" on Safety posts only. A wrong answer shows the right one and is recorded, never blocks. Rachel sees who may not have understood.
- **V3: Ask about an update** (builds on MangoApps' AI Assistant search): employees ask a question; AI answers only from published posts with a link to the source, and sends anything it can't answer to the manager. A lighter path to Michael's Q&A.
- **V3: Photo proof for tasks** (builds on MangoApps' AI-verified task execution): e.g., a photo of the cleared shelf for a recall, checked by AI.
