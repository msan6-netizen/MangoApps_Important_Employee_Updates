# CLAUDE.md

## What this is
A 3-hour prototype for a job take-home (MangoApps, APM AI Builder). Customer: Summit Retail Group, 5 Seattle-area stores, ~200 floor staff who don't check email. Managers create posts; associates see only what applies to them on their phones; "Action Required" posts need a one-tap acknowledgment by a set time (no task completion in V1); managers see who has and hasn't responded. **No AI features in V1.** "Draft from notice" and every other AI idea are next steps (SPEC section 11).

**The full spec is in `SPEC.md`. Read it before writing any code. Build exactly what it says, nothing more.**

## Stack and commands
- Vite + React + TypeScript + Tailwind CSS. date-fns for dates. Vitest for tests.
- No database, no auth. State lives in React (context + reducer), persisted to localStorage, with a "Reset demo data" button.
- No serverless functions, API keys, or external calls. The app is static.
- `npm install` · `npm run dev` · `npm test` · `npm run build`

## Architecture rules
- All business logic lives as **pure functions in `src/lib/`** (audience, status, overdue, ordering, validation, scope, guardrail, reminders, edit/versioning). UI components only call these functions.
- Time is never read from `Date.now()` directly. Everything takes a `now` argument from the **demo clock** in app state (starts Wed Oct 28 2026, 9:00 AM Pacific), so the demo is deterministic.
- **No AI in V1.** Status, overdue, counts, and ordering come from fixed rules. Don't add AI calls, SDKs, or AI UI.
- Mobile-first. The employee view must look right at 390px wide. Manager views can be wider but must still work on mobile.

## How to work
1. **Plan first.** Use plan mode to propose the file structure, data types, and reducer actions. Wait for approval before coding.
2. **Tests before logic.** For each function in `src/lib/`, write the Vitest tests from `SPEC.md` section 8 first, then implement until they pass. Make sure each test can actually fail.
3. **Build in the order in `SPEC.md` section 10.** Run `npm test` after every step. Do not start the next step with failing tests.
4. **Do not over-engineer.** No extra abstractions, state libraries, routing libraries, schema libraries, or features not in the spec. If something is unclear, pick the simplest option consistent with `SPEC.md` and note it in `NOTES.md`.
5. **After each step**, list which acceptance criteria pass and which don't. Never claim something works without running it.
6. Keep everything in `SPEC.md` section 11 out of the code.

## Things you would get wrong without this file
- "Needs to act" and "Just FYI" are **mutually exclusive** for roles and people: the compose pickers disable what the other one has, and validation rejects overlap. A person can still be reached by both through store-wide selections; then **act wins** and they appear once.
- A person who works at two stores appears **once** per post and is counted once.
- "Not opened" means the employee hasn't opened the app since the post went up (set `openedAt` for every visible post when they open their feed, on either tab), not "didn't tap the card."
- V1 is **acknowledge only**: no task completion, no `dueAt`, no Mark done, no completion reminder. Acknowledging is idempotent.
- People **on leave** are never overdue, never get reminders, and are not in the denominator.
- Reminders are **simulated**: compute which are due at the current demo clock and show them in a log. Never send anything.
- Deadlines must be **at least 4 hours** from now; there is no emergency mode.
- **The author is never in their own post** (audience, counts, reminders): managers don't acknowledge their own posts.
- Rachel (store manager) can only target and see **Northgate**. Michael (ops manager) has no store, is never in an audience, and sees everything.
- Editing an Action Required post asks "Typo fix" (keep confirmations) vs "Content changed" (version++, everyone re-confirms).
- Seed data is 200 employees generated **deterministically** (no `Math.random()`); two resets must produce identical data.
