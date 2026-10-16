# Remaining growth-loop implementation

Continue the approved [design](../specs/2026-10-15-growth-loop-design.md) locally. No subagents, new dependencies, hosted writes, or fabricated approvals.

## M6 — Read and notice

Extend the optional lesson contract with a 2–6-span noticing exercise. Expose selectable model-text segments without answer keys. Grade exact selections on the server. Add all 21 Core unit drafts in a separate enriched course file, with development previews. Keep the existing reviewed source and approval unchanged. Test malformed spans, answer stripping, wrong/right selections, legacy lessons, and browser keyboard/mobile use.

## M7 — Transfer

Add 4–6 authored items per countable focus target, scoped by level/unit. Use local grading and the existing spacing intervals. Integrate a separate transfer section into Practice. Store owner-only scheduling state with version conflicts and idempotent responses. Never count drills as new-writing growth. Content stays behind exact-hash human review.

## M8 — Benchmarks

Add parallel checkpoint prompts matched to the unit's initial task. Mark benchmark evidence only for trusted reviewed parallel prompts. Compare safe first attempts from the same unit and pinned grader version. Without verified human noise calibration, show descriptive values, not claims of change. Add deterministic word range, mean sentence length and MTLD context. Preserve historical descriptive trends but stop presenting unmatched then-vs-now as benchmark growth.

## M9 — Read to write

Add summary and continuation instructions with original source passages to later Core units. Display the reading alongside the writing task and send it only as trusted task configuration. Preserve word ranges and existing safety checks. No separate reading track.

## Local acceptance results

- [x] M6 optional schema, private server grading, keyboard/mobile UI, and 21-unit draft.
- [x] M7 local grading, owner-only versioned spacing, replay protection, and Practice integration.
- [x] M8 frozen reviewed provenance, same-version first-attempt pairs, calibration boundaries, and deterministic context.
- [x] M9 trusted reading passages, summary/continuation UI, grading prompt, and new prompt version.
- [x] Separate unapproved growth draft, exact-hash seed gate, and unchanged existing approvals.
- [x] Full check: 173 tests passed / 7 skipped. Browser: 302 passed / 10 skipped. Build passed.
- [x] Desktop/mobile screenshots inspected and author self-review completed without subagents.

See [verification, remaining gates, and next action](../../verification/growth-loop.md#m6m9--local-content-and-behavior). These checks establish local behavior, not human-approved content or validated learning outcomes.

## Verification and gates

Write behavior tests before each implementation. Run focused checks per slice, then full `npm run check`, all browser tests and build. Capture desktop/mobile screens. Update the existing verification document at completion. M3 human precision/noise studies, M4 enforcement, content approval, and pilot recruitment remain explicit external gates. Local drafts are not production-ready content.
