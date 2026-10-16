# M5 — Targets in Progress

Source: [growth-loop design](../specs/2026-10-15-growth-loop-design.md), §§8.2, 8.7, 9 and 10.

## Scope and reversible implementation decisions

- Derive states on read from owner-only, safe, completed first attempts. Revisions never establish transfer.
- Group by tag and curriculum level. Use only the latest grader-version cohort. Count the earliest first attempt per task once.
- Show raw first/latest errors and uses, not calibrated improvement or benchmark claims.
- Provisional rule: two consecutive distinct-task checks with at least five uses and errors ≤max(1, 20% of uses) establish secure. Zero uses are unknown, not perfect.
- Secure reviews use 1/3/7/14/30 UTC-day gaps. Advance only after a successful due review. Above-threshold evidence resets learning; unknown evidence does not advance spacing.
- Due targets fill unused trusted Core target slots, unit focus first, maximum two. No IELTS or lesson-unlocking changes.
- No schema change, dependency, paid model call, hosted mutation, or deployment. Human precision/noise gates stay closed.

## Tasks and acceptance

1. [x] Pure state and spacing tests first: revisions, future dates, duplicate tasks, version/level boundaries, zero uses, failure/reset, due boundaries and interval cap.
2. [x] Integrate owner-scoped evidence reads with Progress and trusted check targets. Verify RLS, safety exclusion, and persistence through real PGlite tests.
3. [x] Add a translated Targets panel with unknown/empty states and provisional wording. Test desktop/mobile, dark mode and Vietnamese. Inspect screenshots before expanding.
4. [x] Run format/check, full browser suite and production build. Self-review (project prohibits subagents). Update verified status and commit only this milestone.

No automatic quality gate activation. M6 content still requires product-owner review; pilot timing remains undecided.
