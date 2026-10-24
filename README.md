# Summit Retail Posts (prototype)

**What this is:** one workflow, end to end. A manager posts an update, each employee sees only what applies to them, and critical updates get a one-tap confirmation the manager can track. AI features are next steps, not part of V1. Built for Summit Retail Group (5 Seattle-area stores, 200 floor staff) in about 3 hours with Claude Code.

**Live demo:** https://mangoappsimportantemployeeupdatesv1-git-cl-14d723-skin-score-ai.vercel.app/ · **Video:** https://youtu.be/-ZJt0eKZ6qc

## Run it
Requires Node 18+.
```bash
npm install
npm run dev          # use "Viewing as" at the top to switch people
npm test             # business-rule tests
```
No database or login. Sample data (200 employees, 5 stores) is generated the same way every time and saved in your browser; **Reset demo data** restores it. The **demo clock** (+4h / +1 day) shows overdue items and reminders without waiting.

## Try this (2 minutes)
1. **Alex (Northgate):** 3 Action Required items sorted by urgency, the ladder one overdue in red, the return policy due within 24 hours in orange. Tap **Acknowledge**. Press **+4h**: a simulated reminder text slides in for the return policy, the only kind of ping he ever gets. Press **Reset clock**.
2. **Malvika (Renton):** doesn't see Northgate's posts. Acknowledge the ladder post to see the empty state.
3. **Rachel (Northgate manager):** open the return policy tracker. Press **+4h** (Wed 1:00 PM): the reminder log shows 33 simulated texts to people who haven't acknowledged. Press **+1 day** (Thu 1:00 PM; it adds 24 hours): the deadline has passed and they're overdue in red; Alex's return policy and recall cards turn red too. Mark someone on leave and they drop out of overdue, reminders and the count.
4. **Michael (operations):** opens on the **Store overview**: Northgate is furthest behind. **All posts** lists every post by location.
5. **New post** as Rachel: fill in the form and post. The overuse warning appears for Northgate.
6. **Edit** the return policy post as "Content changed", then check Alex's feed.

## The problem
Critical safety and policy updates get lost among everyday messages, and managers can't prove who saw them. Rachel (store manager) needs that proof; Alex (associate) doesn't want another app interrupting him.

## How I handled Rachel vs. Alex
Nothing interrupts Alex by default. FYI posts sit on their own Just FYI tab and never ask anything. Action Required posts get the first tab but also never interrupt. A reminder text goes out only if he hasn't responded, and managers are warned before overusing Action Required.

## Decisions
- **FYI vs. Action Required.** Action Required means "acknowledge by [time]": one tap on **Acknowledge**. Employees see the two on separate tabs.
- **One post, two audiences:** some people need to act, others just need to know. A role or person can be in only one of the two; if store-wide choices overlap, act wins.
- **Texts are escalation only** (simulated): one acknowledgment reminder (4 hours after posting, or halfway to a shorter deadline). After that, the manager follows up in person.
- **Overuse guardrail:** warns when a store already has 3+ Action Required posts this week. A nudge, not a block.
- **Edits:** "Typo fix" keeps confirmations; "Content changed" asks everyone to re-confirm.
- **On leave:** never overdue, no reminders, not counted against the store.
- **No AI in V1:** every rule is fixed and tested; AI features are next steps (see Roadmap).
- **Side effect accepted:** some people get one reminder text. That's the cost of proof, kept small by the guardrail.
- **Edits only re-check a deadline if you change it**, so fixing a typo on an older post still works. But "Content changed" makes everyone re-confirm, so if the deadline is less than 4 hours away (or already passed), the manager has to set a new one first.

## Assumptions, and why
1. **Checking the app is a start-of-shift habit.** Managers can post whenever they need to; associates check the app once when their shift begins. One place, once a day, instead of 40 messages through the day, and nothing interrupts work on the floor. The no-interruptions design depends on this habit; if it's wrong, the design breaks. First thing to measure in a pilot: share of employees who open the app within 24 hours of a post.
2. **Own phones; mobile web app, not a downloadable app.** No install for 200 people with high turnover; reminder texts link straight to the post; nothing stored on personal phones; fixes reach everyone instantly. A native app would make sense later for push notifications, offline reading in stockrooms, and Face ID sign-in. In production this would live inside MangoApps' existing app.
3. **The deadline sets the order, not a category.** Overdue first (red), then soonest deadline, then newest; anything due within 24 hours is orange, because associates check once per shift and it would be overdue before their next check. Managers mark something as more important by giving it a shorter deadline. Categories (Safety, Policy, General) are labels for scanning, each defined in the compose form; ranking by them would depend on every manager picking them the same way, and a priority field drifts toward "everything is urgent."
4. **At least 4 hours to respond; no emergencies in V1.** Most updates are planned. Emergencies need instant alerts or a call tree (MangoApps' Critical Alerts).
5. **No text when a post goes up.** Texts only chase people who haven't responded.
6. **After the last reminder, a person follows up.** A third automated nudge is the "constantly asking" Alex described.
7. **Store managers post updates for their own store; operations (Michael) posts company-wide updates, like safety procedures that apply to every store, and sees progress across all stores.** Because one safety update should go out once, not five times. Managers don't acknowledge their own posts; they're left out of their own audience and counts.
8. **No AI in V1.** Acknowledgment records are Rachel's proof, so they come from fixed rules. V1 proves that loop first; when AI arrives, it drafts and a manager decides.
9. **One time zone (Pacific)**, since every deadline assumes one clock.
10. **English only and not yet accessibility-tested**; mock data; no logins (the "Viewing as" switcher stands in). Urgency uses color plus a text label, but there's been no check for color blindness, screen readers, contrast or large text.
11. **Some employees work at more than one store.** They see posts for every store they work at and are counted once.
12. **Each store has a store manager, a few shift leads, and associates.** Because shift leads usually run the floor when the manager isn't there, and some updates (like closing procedures or cash handling) are only for them, managers need to target by role, not just by store.

## Left out, and why
- **All AI features, including "Draft from notice":** V1 proves the core loop with fixed, testable rules; no API key, no external call that can fail in a demo. They're on the roadmap.
- **Task completion tracking** (e.g., confirming the recall was actually done): the request asks for read confirmation only; it's the natural V2.
- **Q&A and comments:** the confirmation loop comes first, and comments need moderation rules Michael hasn't set.
- **Real SMS/push:** needs phone numbers and opt-in consent; simulated reminders prove the rules.
- **Logins and a permissions admin screen:** don't test the core problem.
- **Emergency alerts:** a different rollout.
- **Translations and a full accessibility pass:** needed before a wide rollout, not to prove the loop.
- **Custom categories and a priority matrix:** companies will want their own categories, and some may deserve a faster default deadline or a higher place. V1 lets the deadline alone set the order until there's usage data.
- **Call button:** Rachel is in the same store; Message already shows a person takes over.
- **New hires inheriting open items, superseding old posts, archive, translations:** real needs, secondary to the core loop.

## Roadmap
- **V2:** "Draft from notice": paste a printed notice and AI fills in the compose form for the manager to review (removes Rachel's retyping); reminders timed to each person's next shift (MangoApps Shifts & Schedules); a one-question check on Safety posts, written by AI from the post's own text (MangoApps AI Quiz Creator).
- **V3:** employees ask a question and AI answers from published posts, sending anything else to the manager (MangoApps AI Assistant); photo proof for tasks like recalls (MangoApps AI-verified tasks).

## What I'd ask Michael next
Company or personal phones? Who can post to all stores? Do part-timers who aren't on shift need to see short deadlines? Is there an app employees already use every shift (MangoApps, a scheduling app) that this should live inside? A web app needs nothing installed, but an existing app adds push notifications without SMS cost, offline reading in stockrooms, and faster sign-in.

## How I'd measure it
- **Pilot:** Northgate for 2 weeks, then all stores if safety posts reach an on-time acknowledgment target set with Michael.
- **Success:** on-time acknowledgment rate for Action Required posts (counts and %).
- **Guardrails:** Action Required posts per employee per week; reminder texts per employee per week.
- **Off switch:** reminders can be turned off if the guardrails spike.

## How I checked the AI's work
- **The code:** business rules are pure functions in `src/lib/`, with Vitest tests written from the acceptance criteria in `SPEC.md` before the code.
- **For V2's AI draft:** 10 sample notices with known answers (including an emergency and a prompt-injection attempt) are ready as its eval, in `AI_REVIEW_LOG.md`.
- Results and fixes are in `AI_REVIEW_LOG.md`. `CLAUDE.md` and `SPEC.md` are the instructions I gave the coding agent.
