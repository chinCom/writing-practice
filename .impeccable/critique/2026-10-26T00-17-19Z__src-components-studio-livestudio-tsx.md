---
target: Writing Studio (src/components/studio/LiveStudio.tsx)
total_score: 25
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: "file:/home/lolita/Projects/writing-practice/src/components/studio/LiveStudio.tsx"
target_fingerprint: "sha256:deedbb8f1d0655c7e18fe5b4a52a206494ec53601c5caed87c7078bcb70a5bc5"
target_path: /home/lolita/Projects/writing-practice/src/components/studio/LiveStudio.tsx
timestamp: 2026-10-26T00-17-19Z
slug: src-components-studio-livestudio-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Saved/Unsaved, word count, range meter, remaining-words copy, checking sweep, disabled check all report state. |
| 2 | Match System / Real World | 3 | Brief, include-points, word bank and "Your draft" speak the task's language. |
| 3 | User Control and Freedom | 3 | Autosave, draft recovery, revision handoff, leave guard; no in-field undo beyond the browser's. |
| 4 | Consistency and Standards | 2 | Two Studio implementations (limits 1,200 vs 20,000; different save labels); canvas measure disagrees with Feedback's 70ch. |
| 5 | Error Prevention | 3 | Character cap, disabled check with remaining-words helper, storage-blocked handling, unsaved-leave guard. |
| 6 | Recognition Rather Than Recall | 2 | On a 390×844 phone the brief fills the first screen; the prompt is off-screen while writing. |
| 7 | Flexibility and Efficiency | 1 | No Cmd/Ctrl+Enter to check, no distraction-free mode, no keyboard path to the field. |
| 8 | Aesthetic and Minimalist Design | 2 | Canvas runs ~95 characters per line at 1440; full-bleed card above full-bleed paper leaves the page metaphor behind. |
| 9 | Error Recovery | 3 | Named failures with retry; writing is preserved; session-expired copy is explicit. |
| 10 | Help and Documentation | 3 | Paragraph-anchored development callout with a privacy/AI notice tooltip — the best help surface in the app. |
| **Total** | | **25/40** | Acceptable (62.5%) |

## Design Specificity Verdict

**LLM assessment.** Half-authored. The brief, the word bank as insertable chips, the word-range meter, and a development callout anchored to the paragraph it is about are specific to a writing coach. The frame is not: a 1116px card above a 1116px paper, with the textarea 1058px wide at 22px serif — roughly 95 characters per line, against Feedback's 70ch cap. At the size the app ships at (1440), the screen reads as a form with a task description rather than a sheet you write on. The writing surface is the one element a learner looks at for minutes; it is the worst measure in the app.

**Deterministic scan.** `impeccable detect` on `src/components/studio`: one advisory — `bounce-easing`, `DevelopmentSuggestion.tsx:202`, `cubic-bezier(0.34, 1.56, 0.64, 1)`, imported by `LiveStudio.tsx` and `Studio.tsx`. The in-page detector on `/dev/preview/live-write` returned no findings.

**Visual overlays.** Detector ran in a headless Playwright context; no user-visible overlay exists. Injection verified by mutating `document.title` and appending a script before scanning.

## Overall Impression

The parts that are about writing are excellent; the frame they sit in is generic and fights them. Fix the measure and the phone order of brief versus field, and this becomes the second-strongest screen in the loop.

## What's Working

- **The development callout is anchored to the paragraph it concerns**, positioned from measured text rects with a rise-in that respects reduced motion — product-specific craft.
- **The task brief is genuinely instructional**: title, prompt, word range, three include-points, and a word bank that inserts at the caret and restores focus and selection.
- **Check gating is honest**: the button is disabled below the minimum, and the helper says exactly how many words remain.

## Priority Issues

- **[P1] The canvas runs ~95 characters per line at 1440.**
  **Why it matters:** measured textarea 1058×480 at 22px Literata. Feedback caps the same serif canvas at 70ch (648px). Two screens in one loop disagree about what a page is, and the learner's own writing is set at the least readable measure in the app.
  **Fix:** cap the canvas measure (`maxInlineSize: '70ch'`, centred or left-aligned inside the paper) or restore DESIGN.md §8.1's `[SideNav 244] [Task rail 290] [Canvas ≤ 70ch]` at `lg+`; the `taskRail: 290` token exists and is used nowhere.
  **Suggested command:** `$impeccable layout`

- **[P1] On a phone, the writing field starts below the fold.**
  **Why it matters:** at 390×844 the textarea begins at y 841; the entire first screen is brief. The learner scrolls to type, then scrolls back to re-read the prompt — a memory bridge on the app's core action.
  **Fix:** on `< md`, collapse the brief to a one-line summary with an expander (DESIGN.md §8.1 already specifies an Accordion) and put the field first.
  **Suggested command:** `$impeccable adapt`

- **[P2] Two Studio implementations teach different rules.**
  **Why it matters:** `Studio.tsx` allows 20,000 characters, shows "Preview draft saved only in this browser", and a static "Saved just now"; `LiveStudio.tsx` caps at 1,200 and owns the real check flow with Saved/Unsaved. Divergence is already visible in the labels.
  **Fix:** render `LiveStudio` with mock transport in preview, or delete `Studio.tsx`.
  **Suggested command:** `$impeccable distill`

- **[P2] "0 words" and "0 / 1200 characters" compete.**
  **Why it matters:** the task asks for 40–100 words; the character cap only matters far beyond the task range, yet it holds equal weight in the footer.
  **Fix:** show the character counter only within 10% of the cap.
  **Suggested command:** `$impeccable distill`

- **[P2] Two controls for one feature, one named like an action.**
  **Why it matters:** "Help me develop this" (204×44) and an info icon (44×44) whose accessible name is "Develop your ideas". Screen readers hear two actions; one only opens a tooltip.
  **Fix:** name the icon "About development help".
  **Suggested command:** `$impeccable clarify`

- **[P3] Overshoot easing on the callout.**
  **Why it matters:** `cubic-bezier(0.34, 1.56, 0.64, 1)` is the detector's only source finding here and the one dated motion in an otherwise restrained system.
  **Fix:** `cubic-bezier(0.16, 1, 0.3, 1)` at the same 420ms; keep the child `rise`.
  **Suggested command:** `$impeccable animate`

## Persona Red Flags

**Casey (distracted mobile user).** Lands on a full screen of instructions with the cursor 841px down; an interruption after typing means scrolling back to re-read the prompt. Save state is text-only in the header, above the fold, so after scrolling to type she cannot see whether the draft is safe.

**Sam (screen reader, keyboard-only).** The info icon is announced as "Develop your ideas" beside a button that actually does that — two same-sounding actions. The word meter's range is conveyed by a visual meter; the word count text is present, so the meaning survives, but the minimum/maximum are only in a separate caption.

**Linh (project persona: phone-first learner).** The field she came to use is below the fold; the footer's two counters and the disabled check need a second screen of scrolling to reach.

## Minor Observations

- Studio sets 9 distinct font sizes; the footer alone uses three.
- The draft paper and the brief card are the same width at every breakpoint, so the brief's three-item list stretches to 1116px.
- `maxLength` differs between implementations (1,200 vs 20,000) while the task contract asks 40–100 words.
- The "Saved just now" string in `Studio.tsx` never ages; `LiveStudio`'s Saved/Unsaved is the honest version.

## Questions to Consider

- Should the canvas be a page (fixed measure, margins) rather than a panel that fills the column?
- Would Cmd/Ctrl+Enter to check change how often learners check at all?
- If the brief collapsed to one line after the first read, would anyone reopen it?
