# ADHD Design Reference — Robyn's Apps

A shared reference for building apps for Robyn, who has ADHD. Apply these principles across all projects.

## About the User

Robyn has ADHD and is a perfectionist. Apps need to:
- Lower the activation energy for starting tasks
- Make progress feel real and immediate
- Not punish missing a day or skipping something
- Reduce visible complexity at the point of action
- Give external structure where internal motivation is unreliable

---

## Executive Dysfunction — What It Means for UI

Executive dysfunction affects: planning, initiating, sustaining attention, working memory, time perception, emotional regulation.

In practice this means:

| Challenge | Design response |
|---|---|
| Can't start tasks (initiation) | Make the first step trivially small. One tap, one choice. |
| Forgets what's available (working memory) | Surface information — don't make the user remember it |
| Time blindness | Use time-aware UI, show the current date/time context, add nudges |
| Decision paralysis | Show fewer options, not more. One suggestion beats a list. |
| All-or-nothing thinking | Streak forgiveness, partial credit, "good enough" framing |
| Motivation requires novelty | Shuffle/randomize where repetition would cause disengagement |
| Delayed rewards don't land | Immediate visual feedback on every action |
| Overwhelm from complexity | Progressive disclosure — hide advanced options behind one tap |

---

## ADHD-Friendly Patterns

### Reduce choices at the moment of action
Pre-load decisions (weekly planning, presets, themes) so that daily use requires almost no thought. "What should I eat?" is a weekly question, not a daily one.

*Lower the Bar example:* The open ritual is the same moves every day — no decision about what to do first. The session is pre-built from a template. The only daily choices are "did I do it?" taps.

### External cues over internal motivation
Relying on willpower or internal drive consistently fails with ADHD. Use:
- Time-aware UI that adapts to time of day
- Nudges when something hasn't happened (skipped meals, missed habits)
- Visual indicators of what's available/possible right now

### Streaks that survive one miss
Never reset a streak on a single missed day. Research and anecdote both support this: ADHD brains will abandon a tracker entirely after one missed day if it resets to zero. Forgive one miss, reset on two consecutive misses.

**Streak display principles:**
- Show the current streak as a win at every length — even day 1 ("Day one. Keep it going.") not as a zero
- Escalate the emoji as streaks grow: ✨ (0) → ⚡ (1–6) → 🔥 (7+) → 🔥🔥 (14+)
- Frame the streak around a small daily habit (open ritual, not "full workout") so missing a hard session doesn't break it
- A 7-day rolling window (open ritual days out of 7) and a consecutive streak are complementary: one shows consistency, one shows momentum
- *Lower the Bar example:* Day streak counts consecutive days with open ritual done. Rolling 7-day count shows habit coverage. Neither resets to shame — both start from "here."

### Immediate feedback
Every tap should produce visible change. Checkboxes fill. Counts update. A task completed should feel noticeably different from a task incomplete. Don't make users wonder if something worked.

*Lower the Bar example:* Open ritual tap turns the card green with ✅ immediately. Exercise checkboxes fill on tap. Completing a session triggers a completion state with a visible summary. Every action has a visible result.

### Surface what's possible, not what's ideal
Show what's achievable given current context (ingredients, energy, time). Never shame or compare to an ideal state.

*Lower the Bar example:* Low energy check-in surfaces "Functional mode" — scaled-down version of the session that still counts. The app never says "you should be doing more."

### One mental frame before the task
Set context with a single sentence before the user has to do anything. This reduces the "what am I even doing right now?" moment that causes ADHD task-switching before starting.

*Lower the Bar example:* "Today's focus" appears at the very top of the session — before check-in, before the ritual — as a one-liner that primes the brain. "Bridges, clamshells, bird-dogs. Slow and controlled — form is the whole assignment." No tips, no instructions, just a frame.

### Self-compassion by default
Framing matters. "You haven't eaten today" not "You missed lunch again." "Good night to cook?" not "You haven't cooked anything this week." Neutral or encouraging tone, never critical.

---

## Habit Design for ADHD

Based on research into habit formation for neurodivergent adults:

- **Start with 1–3 habits max** — more causes cognitive overload and collapse
- **Anchor habits to existing events** — "after taking meds" or "before leaving the house"
- **Immediate reward** — the check, the streak count, the animation — this IS the reward
- **Flexible streaks** — see above; forgive one miss
- **Visual progress** — something that shows the week at a glance beats something that shows total counts
- **Weekday-only flags** — habits like "packed lunch" shouldn't show on weekends; irrelevant prompts erode trust in the tool
- **Anchor the minimum habit** — identify the one thing that must happen every day regardless of session completion (e.g. open ritual, a single stretch). Make it visually distinct and always present. This preserves the streak and the identity even on bad days.
- **Day shape at a glance** — show the week's structure visually so users know what's coming without having to remember or plan. *Lower the Bar example:* Day picker icons (🍑 🚴 💪 🧘 🌿) let you see the whole week's shape — workout type, rest day — without tapping anything.

## Dopamine and ADHD

ADHD brains produce and process less dopamine. Design should compensate:
- Streaks, completion counts, and visual feedback provide micro-dopamine hits
- Novelty (shuffle, varied suggestions) maintains engagement
- Rewards must be immediate — delayed gratification is much harder to sustain
- Gamification elements (🔥 streak flames, counts) aren't frivolous — they're neurologically functional

---

## Nutrition Notes (relevant for food-adjacent apps)

- Protein at breakfast is high-priority for ADHD focus (supports dopamine/norepinephrine precursors)
- Blood sugar crashes worsen ADHD symptoms — meals should combine protein + fat + complex carb
- Skipping meals is very common in ADHD and compounds symptom severity
- Sleep deprivation has an outsized effect on ADHD — often the highest-leverage single habit to improve
- Omega-3s have the best dietary evidence for ADHD symptom support

---

## Tone and Voice

- **Direct and warm**, not clinical
- **Encouraging, not motivational-poster** — "Hey, haven't eaten yet" not "You've got this!"
- **No guilt** — missed a day? The app doesn't mention it beyond a gentle nudge
- **No streaks shown as shame** — show streak as a win, not its absence as a failure
- **Informal language** — contractions, casual phrasing, short sentences

---

## Anti-Patterns (things that don't work for ADHD)

- Long onboarding flows → abandonment
- Requiring users to input lots of data → friction spike, won't return
- Notifications that are too frequent → ignored or app deleted
- "Streak broken" as the primary message → shame spiral, abandonment
- Complex settings menus → paralysis
- Requiring perfect consistency to get value → sets up inevitable failure
- Showing everything at once → overwhelm

---

## Projects Using This Reference

- **Roughly Chopped** (`/meal-planner`) — meal planning PWA. See also `ADHD.md` in that project for app-specific notes.
- **Lower the Bar** (`/lower-the-bar`) — this project.
