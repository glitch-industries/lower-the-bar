# Lower the Bar — Design Review
*June 2026 · For a future session*

## The honest diagnosis

The app works and it's full of genuinely good ideas. But it's doing too much in one screen. At any given moment a user might see: a dense dark header, a phase progress bar, an intention quote, a PT check-in banner, a day selector strip, an energy check-in card with pain flags, an ankle mob card with sub-list, a functional mode toggle, a bike stats block, an iFIT series widget, a cycle modifier banner, a template note, a warmup section, a main session list with progress bar, a cool-down section, and a bonus activity card.

That's too many layers. The app was built feature-by-feature and each piece made sense in isolation — but they never got edited as a whole.

---

## The core problem: too many color systems

Right now the app has at least **5 separate color logics fighting each other**:

| System | Colors | Where |
|---|---|---|
| Base palette | Dark green `#2d3a2e`, cream `#e8dfd0` | Header, completion cards |
| Tag colors | 6 colors (glute/cardio/strength/yoga/rest/vacation) | Day selector, card borders, tab underline |
| Phase colors | Defined per-phase in data | Phase label, progress bar |
| Flare protocol | Purple `#6a3a58` | Entire alternate mode |
| Vacation | Terracotta `#c4956a` | Entire alternate mode |
| iFIT | Teal `#5a9e8a`, blue `#33536a` | iFIT widget |

Each color was added for a reason. But they don't talk to each other. The day selector changes color by workout type. The tab underline changes color by phase. The exercise cards change color by tag. The header is always dark green. The result is a screen that feels like 6 different apps wearing the same font.

**The fix:** Commit to 2 accent colors — brand green and one warm accent — and use tag/phase info as *labels*, not as full color swaps. The structure should look consistent; only the content changes day to day.

---

## What's over-engineered

### 1. The header (most urgent)
The header currently contains 8–10 stacked elements:
- Plan name label (tiny, uppercase)
- Week + phase label
- Streak counter
- Phase description text
- Intention quote box (tappable)
- PT check-in banner (appears at weeks 4 + 7)
- Phase progress bar
- "Phase N of 4" counter
- "Progression" link

That's a dashboard, not a header. By the time a user gets to their workout, they've scrolled past a wall of metadata.

**Suggested header:** Week number + phase name in one line. Streak if >1 day. That's it. Everything else lives elsewhere.

---

### 2. The check-in card
The energy check-in is a good idea but it's too complex. Right now it has:
- 4 energy options with emojis + labels
- A dynamic contextual message (low energy warning / high energy note)
- 5 pain flag toggles
- A triple-flare alert that conditionally appears
- An "Edit" button after logging

For someone with ADHD sitting down to work out, a 4-option energy picker + 5 pain toggles is a lot of decisions before they've done anything. The pain flags in particular require the user to actively remember which areas are bothering them, select them, and hope the right combination triggers the flare mode.

**Suggested simplification:** Energy: just 3 options (low / okay / strong). Pain: one single "Something's bothering me today" toggle that opens a pain detail picker — not always visible.

---

### 3. The iFIT widget
This is a full mini-app inside the session. It has:
- Series picker with 3 choices + description cards
- Episode dot progress tracker (up to 12 dots)
- "Open in iFIT" link
- "Episode done ✓" button
- "Finish series — pick next" button
- "Switch" button

Most days the user just needs to tap "Episode done." The series picker and progress dots are planning features, not daily-use features.

**Suggested simplification:** Collapsed to one line: `📺 Series Name — Episode 12` with a tap to log it done. Series management moves to a settings area or the history tab.

---

### 4. The functional mode toggle
A toggle that cuts the session in half lives in the main flow, styled as a card with a custom switch. This is a good concept but it's always visible and adds visual noise even on days where you feel fine.

**Suggested simplification:** Long-press on the session header to enter functional mode, or move it into the check-in card ("Low energy? Go functional").

---

### 5. The bonus activity system
Bonus activities have: reveal mechanic, 2 refresh tokens, tag-based selection logic, completion messages, seen-bonus tracking. All this for an optional extra that most users skip.

**Suggested simplification:** One bonus suggestion per day, no reveal mechanic, no refreshes. Just show it or don't.

---

### 6. The intention system
A full-screen picker with 5 options, write-your-own flow, refresh button, and week-stable persistence. It's genuinely nice but the entry point (tapping the quote in the header) is easy to miss, and it opens an entirely separate screen.

**Suggested simplification:** Keep the week intention, but set it in the history/week tab rather than a full-screen overlay. On the session page, just show the quote. No picker in the main flow.

---

## What's working well — keep these

- **The ankle mob as a persistent daily non-negotiable** — great concept, right call to keep it separate
- **The rolling 7-day selector** — shows context, lets you log past days, day dots work well
- **Phase progression gating exercises** — clever, should stay
- **The "Done" completion card** — satisfying, well-written copy
- **The intention copy throughout** — the writing is the best part of the app. "Done > perfect. No exceptions." The words are doing a lot of emotional work and they're good at it.
- **Collapsed check-in banner after logging** — showing a summary instead of a form is the right call

---

## Proposed simplified structure

### Header (always visible, always the same height)
```
Week 8 · Strengthen          🔥 5 days
```
That's it. Phase color on "Strengthen" only.

### Day selector (unchanged — it works)

### Session body (scrollable)
1. **Day header** — day name + workout type label (e.g. "Tuesday · Glute & Hip")
2. **Check-in** — energy (3 options) + single pain toggle (collapsed once logged)
3. **Ankle mob** — unchanged, it's right
4. **Workout** — warmup, main list, cool-down (unchanged structure, just fewer visual styles)
5. **Bike + iFIT** — one card, collapsed
6. **Done button → completion card**
7. **Bonus** — one quiet suggestion below the completion card, no reveal mechanic

### Tabs
- **Session** (today's workout — default)
- **This Week** (history + intention setting + progression)
- **Reference** (exercises, TENS, pain guide)

---

## Color proposal — 2-accent system

| Role | Color | Usage |
|---|---|---|
| Background | `#f5f0ea` | Base |
| Surface | `#ffffff` | Cards |
| Brand | `#2d3a2e` | Header, completion card, primary buttons |
| Accent | `#5a9e8a` | Done states, progress fill, "Today" pill |
| Warm | `#c49a8a` | Bike/cardio accent only, vacation banner |
| Text primary | `#2d3028` | Body text |
| Text muted | `#9a8a7a` | Labels, sub-text |
| Border | `#d0c8bc` | Card outlines |

Tag colors → retired. Replaced by a small colored text label (e.g. `GLUTE & HIP` in the accent color). The day selector pills lose their tag-specific colors — completed = filled accent, today = brand border, future = muted.

---

## Suggested session order for a future build session

1. Simplify the header first — highest visual impact, least logic change
2. Unify the color system (remove tag color swaps, standardize to 2 accents)
3. Simplify the check-in card (3 energy options, pain behind a toggle)
4. Collapse the iFIT widget to one line
5. Move intention-setting to the week tab
6. Remove functional mode toggle from main flow
7. Simplify bonus (no reveal, no refreshes)

Do these in order. Each step makes the app visibly calmer. Stop when it feels right — you don't have to do all of them.

---

*Written by Claude Sonnet 4.6 after reading the full app.js. June 2026.*
