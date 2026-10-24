# NOTES

Decisions made where `SPEC.md` is unclear or contradicts itself. Each one is the simplest option consistent with the spec, and was approved in plan review.

## V1 scope cut: acknowledge only
- The request asks for read confirmation only, so **task completion was removed from V1**: no requirement picker, no `requirement` / `dueAt` / `completedAt`, no Mark done, no `done` status or Done counts, no completion reminder. Every Action Required post means "acknowledge by [time]". A post is Action Required exactly when it has an `ackBy` (`isActionRequired`), which is set whenever anyone needs to act.
- Status precedence is now on_leave > overdue > acknowledged > opened > not_opened. The tracker's "Done" tab is now "Acknowledged".
- **AC11 (Mark done) and AC17 (completion reminder) are retired**, not renumbered, so references to other ACs stay valid.
- Task completion tracking is listed in SPEC §11 and the README as the natural V2.

## Seed data
- **Seed count.** The spec says "40 per store", "3 people work at two stores", and "exactly 200 employees" (AC23), which can't all be true. The seed has **200 unique people with 40 per home store**, and 3 of them also work at a second store (one at Northgate + Bellevue). Store headcounts are therefore 40–41, and the ladder post counts out of 195 (200 minus 5 on leave).
- **Recall post** is Action · Safety, acknowledge by **Thu Oct 29 10:00 AM Pacific** (set explicitly; the default would have been Wed 10:00, which turns almost every recall row red after one `+4h` press). Alex has not acknowledged it. At demo start his order is ladder → return policy (due soon, 23h) → recall (25h); after `+4h` both are due soon (orange) and the order stays by deadline.
- **Seeded acknowledgments have timestamps.** The reminder log uses them: anyone who acknowledged before a reminder's time never gets that reminder.
- **Rachel is in the ladder post's act audience** (Michael wrote it; all roles) but only has the manager view, so her ladder response is seeded as acknowledged.
- **Authors are left out of their own posts** (user request): `resolvePostAudience` drops `authorId` from act and FYI, so Rachel isn't in her return policy ("Northgate · 39 to act", 5/38 acknowledged at demo start) and the Renton store manager isn't in his own team-lunch post. Compose counts, the deadline prompt, and validation use the current manager as the author; the "add people" list leaves them out; an audience of only themselves is rejected.

## Counting and scope
- **Multi-store employees** see posts for every store they work at and are counted once per post. In per-store views (Michael's store summary, the tracker's store groups) they appear under each store they work at, marked "also at …".
- **Which store rows appear:** only stores the post targets (its store checkboxes, plus the stores of anyone added by name). A Bellevue + Renton associate on the Northgate/Bellevue recall counts under Bellevue only, so Michael doesn't see a one-person Renton row.
- **Rachel's numbers are Northgate-only.** On posts that cover several stores, her metrics and list progress count only Northgate people.
- **Who can edit a post:** a manager can edit a post only if its whole audience is within their stores. Rachel can edit Northgate-only posts; Michael can edit anything.
- **Change to FYI** moves the act audience into FYI exactly. If there was already an FYI audience, its resolved people are added as explicit people, so nobody is added or dropped. The acknowledge-by time is cleared.
- **Guardrail window** is the 7 days before the demo clock. It runs when creating a post, not when editing (the audience can't change on edit).
- **Guardrail stores** use the same "stores the post targets" rule as the store summary. Counting "anyone at that store" literally would make the Northgate-only return-policy post count for Bellevue too (because of the Northgate + Bellevue associate), so a Renton or Northgate draft would wrongly warn about Bellevue. A test caught this.

## Compose
- **Change to FYI** moves the act audience into FYI and returns to the form, so the manager reviews it and presses Post again. Nothing posts on its own. *(Accepted in review.)*
- **Acknowledge-by** appears as soon as anyone needs to act, prefilled with now + 24h, until the manager sets it.
- **Needs to act and Just FYI are mutually exclusive** for roles and people (user request). A role or person chosen in one picker is disabled in the other ("(in Needs to act)"), and validation rejects overlap as a backstop. Stores can be shared (e.g. Northgate associates act, Northgate managers FYI). Consequence: Michael can't send Renton shift leads "act" and Tacoma shift leads "FYI" in one post; he posts twice. If store-wide choices still reach the same person through both, act wins.
- **"Pick a store for these roles"** shows under a picker when roles are ticked but no store is (`rolesWithoutStore`), since those roles reach nobody until a store is picked (user request). It's a hint, not a blocking error; the live count shows the effect.
- **Required fields** (title, summary, full text, category, audience, acknowledge-by) have a red asterisk (user request), with "(required)" for screen readers and a "* Required" key at the top of the form.
- **Posts made at the same demo-clock time** (the clock doesn't move between them) are ordered by creation, latest first. Without this, two new posts appeared oldest first (caught in the browser check).

## Deadlines and editing
- **Edits only re-check a deadline if you change it.** The 4-hour rule applies to new posts and to deadlines changed in an edit, so fixing a typo on an older post (e.g. the ladder post, whose deadline has passed) still works. The audience can't be changed on edit.
- **"Content changed" needs a deadline at least 4 hours away** (user request), even if the manager didn't change it. Everyone has to re-confirm, so a deadline that has passed or is closer than 4 hours would give them less than the 4 hours every post promises. `validatePost(..., mode)` returns "Everyone has to re-confirm, so they need at least 4 hours. Set a new deadline." A Typo fix keeps the existing deadline.

## Reminders
- The log is computed, never stored. It shows every reminder whose time is at or before the demo clock **and** whose condition was true at that time (e.g. not yet acknowledged then). People currently on leave are excluded.
- Reminder times are based on `createdAt`, including after a "Content changed" edit.

## Time
- All times are shown in Pacific using `Intl.DateTimeFormat` with `timeZone: 'America/Los_Angeles'`, whatever the browser's time zone. No date-zone library.
- DST ends Sun Nov 1, 2026, inside the demo window. `+1 day` adds 24 hours, so the wall-clock time shifts by an hour across that date.
- Reset demo data also resets the clock; the "Viewing as" choice is kept.

## Employee feed
- **Two tabs** (user request): **Action required** (default) and **Just FYI**, each with a count. "Just FYI" replaces "Updates" so employees and managers use the same term. Completed (acknowledged) action posts are listed below the cards on the Action required tab, with "Acknowledged · time".
- **Opening the feed opens every visible post**, on both tabs, matching SPEC's "hasn't opened the app since the post went up". Otherwise FYI posts on the unselected tab would show as "Not opened" to managers even though the person opened the app.
- An action card is always unacknowledged (acknowledging moves it to Completed), so it shows only **Acknowledge**.

## Wording
- **"Post" is the one word for an announcement or update** across the UI (user request): header "Summit Posts", the "Posts" list, "New post" / "Edit post", "← All posts", and "New posts from your store" in the empty state. The re-confirm note and tag say "Edited" ("Edited Thu 5:00 AM. Please re-confirm"; "Edited, please re-confirm"), not "Updated": next to "Acknowledge by Thu 8:00 AM", "Updated Thu 5:00 AM" read like a new deadline (user request).
- **Acknowledge** replaces "Got it" on the employee button (user request: more professional, and it matches "Acknowledge by" and "Acknowledged · time").
- **View responses →** on each manager post card shows that the card opens the tracker. It's part of the card's single button, not a nested one.

## Due soon (orange)
- **Threshold 24 hours** (user request; chosen to match the start-of-shift habit in assumption 1). The boundary is inclusive: exactly 24h out is due soon; the deadline minute itself is still due soon, one minute later it's overdue.
- **Order is by deadline only** (user request): overdue → earliest acknowledge-by → newest. Category no longer ranks posts, so due-soon cards are automatically right after overdue ones. AC12's order is ladder → return policy → recall, at demo start and after `+4h`.
- **Category is a label only**, with a one-line definition of each under the compose form's Category buttons (`CATEGORY_HINT`). It's dropped from the card's reason label ("Overdue since Tue 9:00 AM", "Due soon · Acknowledge by Thu 8:00 AM") since the chip already shows it and it no longer explains the position.
- The Acknowledge-by hint tells managers that sooner deadlines show higher and turn orange within 24 hours, since the deadline is now their only priority setting.
- Due soon is a flag on the feed item, not a `PersonStatus`, so the manager's statuses, counts and reminders are unchanged. The orange only appears on the employee's cards.
- Plain (not due soon) cards now have a neutral border instead of amber, so orange stands out.

## Ordering
- **No separate "overdue first" rule.** With deadline-only ordering an overdue post's deadline has passed, so it is always the earliest and sorts first anyway. Removing the rule on purpose made no test fail, which is how this was found (AI_REVIEW_LOG #4); the redundant line was deleted.

## Michael's tabs and the simulated text (user request)
- **Store overview** is Michael's default tab; **All posts** groups by location. Acknowledged and overdue are people summed over each store's Action Required posts, so a person on three Northgate posts counts three times (it's a workload view, not a headcount). No Message button for Michael: reaching a store manager is outside this loop.
- Company-wide posts (targeting all 5 stores) go under **All stores** instead of repeating under every store; a two-store post (the recall) is listed under both.
- **The text carries no post details** (user request): only that a post is waiting, the acknowledge-by time, and to open the app. Texts can be seen on a lock screen, and the app is the one place to read posts.
- **The text banner** only shows reminders that fall between the previous and the new demo clock time while viewing that employee, so switching viewers or reloading never replays old texts. It disappears after 9 seconds or on ×.

## Tracker
- **On leave checkbox** (user request): on every Needs follow-up row; on the Everyone tab only for people already on leave, so a manager can switch them back (people on leave drop out of Needs follow-up). Never on the Acknowledged tab. On FYI trackers it only appears to undo.

## FYI posts
- FYI posts have no deadline and are never overdue. They get a lighter tracker: "Opened x/y" and opened / not opened per person, with no filter tabs.

## V1 scope cut: no AI
- **"Draft from notice" was removed from V1** (user request); every AI feature is now a next step (SPEC section 11). Removed: `api/draft.ts`, `api/_prompt.ts`, `parseDraft`, the Draft panel and "AI" tags, `draftedWithAI`, `npm run eval:draft`, the golden-notice data file, `.env.example`, and the `@anthropic-ai/sdk` dependency. The app is now fully static.
- **AC25–AC28 are retired**, not renumbered.
- The 10 golden notices stay in `AI_REVIEW_LOG.md` as the eval for V2. The removed implementation is in git history (commit `458d548`) as a starting point.

## Signature changes from the spec
- `guardrailWarnings(draft, posts, employees, stores, now)` takes `stores` for store names in the message.
- `applyEdit(post, changes, mode, now)` takes `now` for the "Edited <time>" note.
- `validatePost(draft, manager, employees, now, original?)` takes the original post when editing.

## Repo
- `CLAUDE_CODE_KICKOFF.md` was removed (it was setup notes, not part of the project).
