---
target: Feedback / marked page (src/components/feedback/FeedbackView.tsx)
total_score: 29
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 3
target_identity: "file:/home/lolita/Projects/writing-practice/src/components/feedback/FeedbackView.tsx"
target_fingerprint: "sha256:fb763dd21b478664eb5e404392d060cb26bd5c6fc6eae3ce5d453783a502a412"
target_path: /home/lolita/Projects/writing-practice/src/components/feedback/FeedbackView.tsx
timestamp: 2026-10-26T00-16-58Z
slug: src-components-feedback-feedbackview-tsx
---
## Design Health Score

| # | Heuristic | Feedback | Studio | Today | Key Issue |
|---|-----------|----------|--------|-------|-----------|
| 1 | Visibility of System Status | 3 | 3 | 3 | All three report state well (save, check, counts, "Correction 2 of 3"). Feedback's applied marks turn green; Studio's meter tracks the word range. |
| 2 | Match System / Real World | 3 | 3 | 3 | "Verb tense", `go → went`, "Your week", "Past tense needs another look" — plain and learner-shaped. |
| 3 | User Control and Freedom | 3 | 3 | 3 | Apply/Undo, dismiss/restore, Esc closes the sheet and returns focus. No way to jump to the next unapplied correction from the page. |
| 4 | Consistency and Standards | 3 | 2 | 2 | Studio ships two implementations with different limits and labels; Today's heading levels are inverted against its type sizes. |
| 5 | Error Prevention | 3 | 3 | 3 | Disabled checks with remaining-words copy, unsaved-leave guard, request-key reuse, retry paths. |
| 6 | Recognition Rather Than Recall | 3 | 2 | 2 | Studio's brief fills the whole first phone screen, so the prompt is off-screen while typing. Today's 7 sections require scanning. |
| 7 | Flexibility and Efficiency | 2 | 1 | 2 | No Cmd/Ctrl+Enter to check, no arrow-key movement between corrections, no distraction-free mode. |
| 8 | Aesthetic and Minimalist Design | 3 | 2 | 2 | Studio's canvas runs ~95 characters per line; Today is 2428px (2.9 screens) on a 390px phone with a promo section. |
| 9 | Error Recovery | 3 | 3 | 3 | Named failures, retry, writing preserved, session-expired copy. |
| 10 | Help and Documentation | 3 | 3 | 2 | Studio's anchored development callout is the best help in the app; Today has no contextual help. |
| **Total** | | **29/40** | **25/40** | **25/40** | Feedback Good (72.5%); Studio and Today Acceptable (62.5%) |

## Design Specificity Verdict

**LLM assessment.** Feedback is authored for this product and could not be lifted into another app: a serif marked page at a 70ch measure, five underline dialects tied to a grammar taxonomy, a `∿` swatch in each card header, connector lines from mark to margin card, and a bottom sheet that keeps the page visible. The vocabulary ("Your marked page", "One level higher", "Try it yourself") belongs to a writing coach, not a dashboard.

Studio is half-authored. The brief, word bank, and paragraph-anchored development callout are specific; the frame is not — a full-bleed card above a full-bleed canvas at 1116px, with the canvas text running ~95 characters per line. The page metaphor the rest of the app builds (a sheet you write on) collapses into a form.

Today is the most category-interchangeable of the three. Hero headline, task card, stat strip, goal ring, table, promo block — a shape any learning product could ship. Its specificity lives in copy and the handwritten note, not in composition.

**Deterministic scan.** `impeccable detect` on `src/components/feedback` and `src/components/today`: no findings. On `src/components/studio`: one advisory, `bounce-easing` at `DevelopmentSuggestion.tsx:202` (`cubic-bezier(0.34, 1.56, 0.64, 1)`), imported by `LiveStudio.tsx` and `Studio.tsx`. The in-page detector (injected and run on six preview routes) added: `skipped-heading` h1→h6 on both Feedback variants, `skipped-heading` h2→h6 on Today, and one `straggler` ("goal." alone on the last of 2 lines, 13% of the measure) on Today.

**Visual overlays.** The in-page detector ran in a headless Playwright context, so no overlay exists in a browser you can look at. Injection was verified by mutating `document.title` and appending a script before scanning; console output and `window.impeccableScan()` returned the findings above.

## Overall Impression

The loop's most important screen is the strongest one. Feedback is a real design: it explains a sentence in place, keeps the learner's own words at reading size, and makes the revision the last thing on the page. Studio and Today are built from the same tokens but not the same conviction — Studio forgets it is a page, and Today forgets it is a daily home rather than a report.

## What's Working

- **The marked page holds its ground.** 22px serif at a 648px measure (55ch), marks as keyboard-reachable buttons with `aria-pressed` and `aria-controls`, connectors to margin cards. Nothing else in the app teaches as clearly.
- **The mobile correction sheet is properly built.** 390×844: 464px tall, every control 44px, focus moves to the dialog on open, Esc closes it and returns focus to the exact mark (`go: went`). Most apps get this wrong.
- **Studio's development callout is anchored to the paragraph it is about**, positioned from measured text rects, with a rise-in that respects reduced motion. That is product-specific craft, not a generic panel.

## Priority Issues

### Feedback — `src/components/feedback/FeedbackView.tsx`

- **[P1] Correction marks are 28px tall on phones.**
  **Why it matters:** measured at 390×844, the marks are 22×28 (`go`), 27×28 (`eat`), 89×28 (`swimmed`) at 19px canvas type. They are the primary interaction of the screen for a phone-first audience; PRODUCT.md puts learners on phones with limited bandwidth.
  **Fix:** give each mark an invisible 44px-tall hit area (an absolute `::before` inset, or an inline-block wrapper with block padding) while keeping the underline geometry and text size unchanged.
  **Suggested command:** `$impeccable adapt`

- **[P1] The primary CTA paints under the fixed bottom navigation on first view.**
  **Why it matters:** "Revise your writing" sits at y 786–830 while the bottom nav occupies 772–844 at z-index 1100; a hit test at the CTA's centre returns a nav link. It only becomes tappable after scrolling 285px. The product's whole promise is that every feedback screen ends in a revise action.
  **Fix:** reserve `bottomNavHeight` inside the scroll flow for the action block (or add `scroll-padding-block-end`), so the CTA can never enter the nav band; a sticky action bar above the nav is the stronger version.
  **Suggested command:** `$impeccable adapt`

- **[P1] Heading outline skips levels.**
  **Why it matters:** h1 "Your marked page" is followed by h6 "Verb tense" in every correction card; the targets variant goes h2 "Your targets" → h6. Screen-reader users navigating by heading get a broken outline on the screen that carries the most content.
  **Fix:** card titles become h3 under an h2 corrections region; the 13px `subtitle2` look stays — semantics and type scale are independent.
  **Suggested command:** `$impeccable audit`

- **[P2] Dark-mode accent text fails AA on tonal chips.**
  **Why it matters:** `#4D88FF` on `tonalPrimary` `#16264C` measures 4.44:1 at 12–13px ("Estimated A2", unit chips, word-bank phrases). AA needs 4.5:1. DESIGN.md §12 promises AA in both schemes.
  **Fix:** `dark.violet` → `#558DFF` (4.69:1) or lighten `tonalPrimary`; verify in tokens, not by eye.
  **Suggested command:** `$impeccable colorize`

- **[P2] The score grid leads with a red 2/5 bar in the first viewport.**
  **Why it matters:** it contradicts the product's "never a wall of red" and DESIGN.md's "attention, not judgment". A learner's first impression of their own writing is a red Grammar bar.
  **Fix:** keep `n/5` and use a neutral bar with a single amber "needs work" state, or move the grid below the marked page on mobile.
  **Suggested command:** `$impeccable quieter`

- **[P3] The hint omits the more discoverable path.**
  **Why it matters:** "Select an underlined word to see its correction." sits next to a "Review corrections" button that does the same thing more obviously.
  **Fix:** "Select an underlined word, or use Review corrections."
  **Suggested command:** `$impeccable clarify`

### Studio — `src/components/studio/LiveStudio.tsx`

- **[P1] The canvas runs ~95 characters per line at 1440.**
  **Why it matters:** the textarea is 1058px wide at 22px Literata. Feedback caps the same serif canvas at 70ch (648px). Two screens in one loop disagree about what a page is, and the writing surface — the one place a learner looks for minutes — is the worst measure in the app.
  **Fix:** cap the canvas measure (`maxInlineSize: '70ch'`, centred or left-aligned in the paper), or restore DESIGN.md §8.1's task rail at `lg+` — the `taskRail: 290` token exists and is used nowhere.
  **Suggested command:** `$impeccable layout`

- **[P1] On a phone, the writing field starts below the fold.**
  **Why it matters:** at 390×844 the textarea begins at y 841. The first screen is entirely brief; a learner scrolls to type, then scrolls back to re-read the prompt, holding it in working memory.
  **Fix:** on `< md`, collapse the brief to a one-line summary with an expander (DESIGN.md §8.1 already specifies an Accordion) and put the field first.
  **Suggested command:** `$impeccable adapt`

- **[P2] Two Studio implementations teach different rules.**
  **Why it matters:** `Studio.tsx` allows 20,000 characters, shows "Preview draft saved only in this browser", and a static "Saved just now"; `LiveStudio.tsx` caps at 1,200, shows Saved/Unsaved, and owns the real check flow. One of them will drift first.
  **Fix:** make the preview path render `LiveStudio` with mock transport, or delete `Studio.tsx`.
  **Suggested command:** `$impeccable distill`

- **[P2] "0 words" and "0 / 1200 characters" compete.**
  **Why it matters:** the task asks for 40–100 words; the character cap is irrelevant until far beyond the task range, and two counters at equal weight slow the scan.
  **Fix:** show the character counter only within 10% of the cap.
  **Suggested command:** `$impeccable distill`

- **[P2] Two controls for one feature, one named like an action.**
  **Why it matters:** "Help me develop this" (204×44) and an icon button whose accessible name is "Develop your ideas" (44×44, an info tooltip). A screen reader hears two actions; one only opens a tooltip.
  **Fix:** name the icon "About development help".
  **Suggested command:** `$impeccable clarify`

- **[P3] Overshoot easing on the development callout.**
  **Why it matters:** `cubic-bezier(0.34, 1.56, 0.64, 1)` at `DevelopmentSuggestion.tsx:202` — the detector's only source finding, and the one place the app's motion looks dated.
  **Fix:** `cubic-bezier(0.16, 1, 0.3, 1)` at the same 420ms; keep the child `rise` animation.
  **Suggested command:** `$impeccable animate`

### Today — `src/components/today/Today.tsx`

- **[P1] Two progress promises read as a contradiction.**
  **Why it matters:** "4 of 5" (weekly sessions) sits directly above "Write 6 more checked pieces to see your progress." One counts sessions, the other checked pieces. On the home screen, that reads as the app not knowing where the learner stands.
  **Fix:** make the goal block count one thing (checked pieces, which the surrounding copy already defines) or move the "keep writing" line to Progress where the trend lives.
  **Suggested command:** `$impeccable clarify`

- **[P1] Heading levels are inverted against type size.**
  **Why it matters:** h2 "Target recommendations" renders at 13px while h6 "First messages" renders at 16px; the in-page detector flags h2→h6. The outline says one thing, the page says another.
  **Fix:** the 13px eyebrow becomes `caption`/`subtitle2` (or h3 if it is a real section) and the unit name becomes a label, not a heading.
  **Suggested command:** `$impeccable audit`

- **[P2] A section that announces it changes nothing.**
  **Why it matters:** "Target recommendations" carries "Recommendations only. Your lesson progress is unchanged." on the daily home. A block that disclaims its own consequence spends attention for no decision.
  **Fix:** fold the recommendations into the task card as two chips, or hold the section until the growth gate opens.
  **Suggested command:** `$impeccable distill`

- **[P2] The IELTS workspace is a peer section on a Core learner's home.**
  **Why it matters:** h2 "IELTS Writing Workspace" at y 2044 of 2428 on mobile — a full section of cross-sell below the work.
  **Fix:** move it to the shell or to Path as a quiet link.
  **Suggested command:** `$impeccable distill`

- **[P2] Table links miss the 44px floor.**
  **Why it matters:** "Open feedback" is 139×36 and "View portfolio" 125×43 on mobile.
  **Fix:** 44px minimum block size on row links.
  **Suggested command:** `$impeccable adapt`

- **[P3] Widow in the goal note.**
  **Why it matters:** "Revisions count toward your weekly goal." is set in a 225px column (160px on mobile) and leaves "goal." alone on line 2 — the detector's `straggler` finding.
  **Fix:** use the existing "Revisions count as sessions." string, or widen the block to ~18rem.
  **Suggested command:** `$impeccable typeset`

### Cross-surface

- **[P1] DESIGN.md describes a different app than the one that ships.**
  **Why it matters:** §4.1 documents lavender/indigo (`#EDEBFF`, `#13132B`, violet `#9B85FF`); `src/theme/tokens.ts` ships matte black (`#0D0E11`), cobalt (`#4D88FF`) and electric accents. §8.1's `[SideNav 244] [Task rail 290] [Canvas ≤ 70ch]` is not implemented (the `taskRail` token is unused), and §8.3's `Container maxWidth="sm"` for Today is not what renders (full-width 1116 at 1440). This critique had to trust the code; the next agent will trust the doc.
  **Fix:** re-record DESIGN.md from the implementation (`$impeccable document`) before the next visual change.
  **Suggested command:** `$impeccable document`

- **[P2] No shared page measure.**
  **Why it matters:** Feedback caps at 70ch, Studio is unbounded at ~95ch, Today is full-bleed at 1116px. Three adjacent screens, three rules.
  **Fix:** one `contentMax`/measure rule applied through a shared page frame.
  **Suggested command:** `$impeccable layout`

## Persona Red Flags

**Casey (distracted mobile user, 390×844).** Feedback: marks are 28px tall; the revise CTA sits under the tab bar until she scrolls. Studio: she lands on a full screen of instructions and the cursor is 841px down; after typing she must scroll back to re-read the prompt. Today: 2,428px — 2.9 screens — before she reaches the end, with the task card first (good) and three sections of secondary material behind it.

**Sam (screen reader, keyboard-only).** Feedback: the heading outline jumps h1→h6 inside every correction card, so heading navigation is useless on the densest screen. Today: h2 at 13px and h6 at 16px mean the outline does not match the visual hierarchy at all. Studio: the info icon is announced as "Develop your ideas", indistinguishable from the action button beside it. Dark mode: accent text on tonal chips measures 4.44:1 at 12–13px.

**Linh (project persona: phone-first learner, Vietnamese UI, limited bandwidth).** Every label she meets is 12–13px (Today alone sets 32 elements at 12px and 20 at 13px on mobile) — small for a low-end phone in daylight. She also meets a character counter that only matters at 1,200 characters while the task asks for 40–100 words, and an IELTS cross-sell on a Core-path home.

## Minor Observations

- `radii` in use: 4, 6, 8, 10, 12, 24, 999px against a 10px theme unit — the 6/8/12 values are one-offs worth folding back.
- `feedback-many` has 8 marks but renders a 3-card window around the active index (`visibleCorrectionIndexes`). Deliberate focus, but the counter says 8 and the column shows 3 with no explanation.
- Today sets 11 distinct font sizes; Feedback 7; Studio 9.
- Studio's `maxLength` differs between the two implementations (20,000 vs 1,200) while the task contract asks for 40–100 words.
- The `∿` swatch in card headers is `aria-hidden` and decorative — correct, and the one place the mark taxonomy is taught visually.
- Reduced motion is handled on the card fade, read sweep, and callout; the new findings above are the only motion debt.

## Questions to Consider

- If Feedback is the product's best screen, why does the writing field it feeds not inherit its measure?
- Today answers "what next" in the first 500px. Could everything after "Past tense needs another look" live on Progress instead?
- Would the score grid be more honest as a delta ("Grammar 2 → 3 since your last check") than as an absolute red 2/5?
- Does a learner need to see "Estimated A2" before they see their own sentence marked?
