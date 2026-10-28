---
target: Today (src/components/today/Today.tsx)
total_score: 25
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: "file:/home/lolita/Projects/writing-practice/src/components/today/Today.tsx"
target_fingerprint: "sha256:4e3ca5fa09b8a2848d470f2d7fc853617b20135791bd4b079c2586e273f781f0"
target_path: /home/lolita/Projects/writing-practice/src/components/today/Today.tsx
timestamp: 2026-10-26T00-17-42Z
slug: src-components-today-today-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Date, streak, "4 of 5", day strip, goal ring, next task, saved-feedback rows — status is never missing. |
| 2 | Match System / Real World | 3 | "Your week", "Past tense needs another look", "12 questions ready to review" — plain and specific. |
| 3 | User Control and Freedom | 3 | Every section links onward; nothing traps; no dismissal of sections that carry no action. |
| 4 | Consistency and Standards | 2 | Two progress statements that count different things; h2 at 13px next to h6 at 16px; the "revisions count" rule stated twice. |
| 5 | Error Prevention | 3 | Empty states exist, network notice, page error dialog with retry; nothing destructive here. |
| 6 | Recognition Rather Than Recall | 2 | Everything is visible, which is the problem: 7 h2 sections and 11 font sizes to scan on a phone. |
| 7 | Flexibility and Efficiency | 2 | One primary path (next task) plus links; no shortcuts, no "continue where I left off" beyond the next task. |
| 8 | Aesthetic and Minimalist Design | 2 | 2,428px (2.9 screens) at 390×844, with an IELTS cross-sell as a peer section and a block that disclaims its own effect. |
| 9 | Error Recovery | 3 | Named failures with retry, offline notice that does not steal focus or replay saves. |
| 10 | Help and Documentation | 2 | No contextual help on the home screen; the review prompt explains itself, the rest does not. |
| **Total** | | **25/40** | Acceptable (62.5%) |

## Design Specificity Verdict

**LLM assessment.** The most category-interchangeable of the three surfaces. Hero headline and date, task card, stat strip with a goal ring, review prompt, table of saved work, path preview, promo block — the same skeleton any learning product ships. Its specificity lives in the copy ("Make room for a little writing", "Past tense needs another look") and the handwritten note, not in composition. Nothing here is wrong; nothing here is unmistakably Writing Coach.

**Deterministic scan.** `impeccable detect` on `src/components/today`: no findings. The in-page detector on `/dev/preview/today` and `/dev/preview/today-account` returned two: `skipped-heading` (h2 "Tell someone about yourself" → h6 "First messages") and `straggler` ("goal." alone on the last of 2 lines, 13% of the measure).

**Visual overlays.** Detector ran in a headless Playwright context; no user-visible overlay exists. Injection verified before scanning.

## Overall Impression

It answers "what do I do next" in the first 500px, which is the right job. Then it keeps talking for two more screens about things that are not today's decision. The home screen should end where the work resumes.

## What's Working

- **The next task is first and unambiguous**: level chip, word range, task title, one-line description, "Start lesson" at 44px, all above the fold on a 390px phone.
- **The day strip and streak are honest**: `aria-current="date"` on today, per-day labels ("{day}: written" / "not yet written"), and reduced-motion handling.
- **Empty and preview states are explicit** rather than silent — the preview notice says exactly what is and is not saved.

## Priority Issues

- **[P1] Two progress promises read as a contradiction.**
  **Why it matters:** "4 of 5" (weekly sessions) sits directly above "Write 6 more checked pieces to see your progress." One counts sessions, the other checked pieces. On the home screen this reads as the app not knowing where the learner stands.
  **Fix:** make the goal block count one thing (checked pieces, which the surrounding copy already defines) or move the "keep writing" line to Progress.
  **Suggested command:** `$impeccable clarify`

- **[P1] Heading levels are inverted against type size.**
  **Why it matters:** h2 "Target recommendations" renders at 13px while h6 "First messages" renders at 16px; the detector flags h2→h6. Heading navigation gives a different outline than the page shows.
  **Fix:** the 13px eyebrow becomes `caption`/`subtitle2` (or h3 if it is a real section); the unit name becomes a label, not a heading.
  **Suggested command:** `$impeccable audit`

- **[P2] A section that announces it changes nothing.**
  **Why it matters:** "Target recommendations" carries "Recommendations only. Your lesson progress is unchanged." A block that disclaims its own consequence spends attention without supporting a decision.
  **Fix:** fold the recommendations into the task card as two chips, or hold the section until the growth gate opens.
  **Suggested command:** `$impeccable distill`

- **[P2] The IELTS workspace is a peer section on a Core learner's home.**
  **Why it matters:** h2 "IELTS Writing Workspace" at y 2044 of 2428 on mobile — a full cross-sell section below the work, on a page whose job is today.
  **Fix:** move it to the shell or to Path as a quiet link.
  **Suggested command:** `$impeccable distill`

- **[P2] Table links miss the 44px floor.**
  **Why it matters:** "Open feedback" is 139×36 and "View portfolio" 125×43 on mobile; DESIGN.md §12 and the theme promise 44px touch targets.
  **Fix:** 44px minimum block size on row links.
  **Suggested command:** `$impeccable adapt`

- **[P3] Widow in the goal note.**
  **Why it matters:** "Revisions count toward your weekly goal." is set in a 225px column (160px on mobile) and leaves "goal." alone on line 2 — the detector's `straggler` finding.
  **Fix:** use the existing "Revisions count as sessions." string, or widen the block to ~18rem.
  **Suggested command:** `$impeccable typeset`

## Persona Red Flags

**Casey (distracted mobile user).** 2,428px of scroll; the task card is correctly first, but three secondary sections sit between the work and the end, and the "Open feedback" rows are 36px tall for a thumb.

**Sam (screen reader).** The outline runs h1 → h2 (32px) → h6 (16px) → h2 (13px) → h2 → h2 → h2, so heading navigation misrepresents the page. Table row links are named "Open feedback" three times with no distinguishing label.

**Linh (project persona: phone-first learner).** 32 elements at 12px and 20 at 13px on mobile, plus a full IELTS cross-sell on a Core path — small type and off-path noise on the one screen she opens daily.

## Minor Observations

- 11 distinct font sizes on one screen (12, 13, 14, 15, 16, 18, 20, 26, 32, 36, 48).
- Three identical "Open feedback" accessible names in the saved-feedback table; adding the writing title to the name would fix both a11y and scan.
- "Writing days use UTC. Revisions count as sessions." and "Revisions count toward your weekly goal." state the same rule twice in one section.
- The goal ring renders "4" at 32px with "4 of 5" beneath at 12px — the number is loud, the unit is quiet.
- `Container` has no `maxWidth` here (1116px at 1440) although DESIGN.md §8.3 specifies `maxWidth="sm"`.

## Questions to Consider

- If Today ended after "Past tense needs another look", what would actually be lost?
- Should the home screen show one number — pieces checked this week — instead of a session goal and a piece goal?
- Does a Core-path learner need to see the IELTS workspace on Today at all?
