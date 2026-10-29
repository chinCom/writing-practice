# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Adult and teen learners of English as a second or foreign language, worldwide. They are often on phones, often on limited bandwidth, and their first language is frequently not English (the UI ships in English and Vietnamese). Their level ranges from absolute beginner (Pre-A1) to advanced (C2).

They are doing one of two jobs, weighted equally by the product:

1. **Everyday and academic writing improvement** — becoming a better writer in general, from first sentences to advanced essays.
2. **Exam preparation** — building the writing skills an IELTS candidate needs.

Both audiences revise their own writing on a device, usually in short sessions, and both expect to see measurable progress over time rather than one-off corrections.

## Product Purpose

Writing Coach is a writing-practice app. A learner writes, an AI coach marks and explains the mistakes on the page, and the learner revises. The loop is the product:

1. Short mini-lesson with a model text, plus a noticing task on the lesson's one or two targets.
2. Auto-graded warm-up drills (no AI).
3. A writing task, graded by the coach.
4. Structured feedback → the learner revises → the coach checks the revision.
5. Targets and mistakes return in spaced practice and in later writing. Growth is measured on new writing, not on revisions.

Success means a learner's writing on *new* tasks improves over weeks, and the learner can see that improvement.

## Positioning

The revision loop is the differentiator, and it is backed by two claims a neighbouring product could not truthfully copy:

- **Growth is measured on new writing, not on revisions.** Corrections are tracked as targets, returned in spaced drills, and re-measured on fresh tasks — so the progress a learner sees is not the same essay getting cleaner.
- **The coach stays silent when unsure.** A wrong correction is treated as worse than a missed one, and optional style suggestions are kept out of target and error counts.

It is writing-focused by construction: model-text noticing and source passages exist to support writing. There are no separate speaking, listening, or reading modules.

## Operating Context

- Learners work in short sessions on phone or laptop; the app is used between lessons, commutes, and exam preparation blocks.
- A learner's path is either the **Core** track (general writing, seven CEFR levels from Pre-A1 to C2) or the **IELTS** track, chosen per workspace.
- Writing happens in a dedicated field that deliberately does **not** autocorrect or spellcheck; the learner's own errors are the material.
- Practice is scheduled on a 1/3/7/14/30-day review rhythm and driven by saved corrections plus authored transfer drills.
- AI checking and explanations are server-side (DeepSeek) with a per-UTC-day quota; drills and most curriculum content are pre-generated so the AI is not needed for routine practice.
- Accounts, drafts, feedback, and progress live in Supabase behind owner-only access rules; the app has no separate backend service.
- Curriculum content is authored and reviewed as versioned JSON in `curriculum/` (Core, IELTS, growth units, readings) and seeded into the database.
- Development and verification run through `pnpm run check`, targeted Playwright specs, and a synthetic learner journey.

## Capabilities and Constraints

**Confirmed capabilities**

- A1–B1 practice placement estimate with learner override; seven-level Core path (21 units / 63 lessons drafted); IELTS workspace (8 units / 24 lessons).
- Writing Studio task contracts per level, optional frames and word banks, account drafts, task limits.
- AI checking with strict JSON validation, correction location (exact/normalized/fuzzy), safety state, and 20 checks per UTC day.
- Check recovery: saved writing before grading, request-key reuse, single active claim, lost-response and reload recovery.
- Feedback and revision: marked text, immediate Apply/Undo with ordered saves, revision and parent-revision comparison, 20-attempt boundary.
- On-demand short English explanations with owner-only saved reuse and 60 new attempts per UTC day.
- Today: Core-path next task, saved feedback, UTC streak, weekly goal, strongest improvement, due practice.
- Practice: saved correction exercises, review-gated transfer drills, local answer checks, retries.
- Progress: descriptive first-attempt trends, matched same-version unit benchmarks, "How much you fixed", Core/IELTS completion.
- Portfolio: owner-only paginated entries with revision comparison.
- Signed-out landing page with a local live demo; draft privacy and terms pages; English/Vietnamese UI.

**Constraints**

- IELTS results are a practice 1–5 scale and are explicitly **not** official CEFR or IELTS bands. The product is not affiliated with IELTS or its owners.
- Growth-target features (target reports, hidden target answers, target drills, advisory mastery) are gated behind `GROWTH_TARGETS`, off by default and in production, until a human-annotated, licensed target-error precision gate (≥ 0.85) passes. No valid measurement exists yet.
- Grader accuracy is not validated. Explanations are English-only for now; native-language explanations are undecided.
- Non-goals for now: speaking and voice, live human tutors, social feed, native mobile apps, user-uploaded content sharing.
- Payments, public abuse controls, SMTP/email delivery, and a production deployment are undecided or unimplemented. There is no public app deployment.

## Brand Commitments

- **Name:** Writing Coach, shown as "Writing coach" in the UI, the landing page, tab titles, and the app icon. "WriteRight" was only the name of a visual reference board and is not a brand.
- **Languages:** English and Vietnamese UI, both left-to-right. AI feedback and explanations are English.
- **Voice:** plain, short, specific, and honest about uncertainty. No hype, no inflated claims about results, no false confidence in a correction.
- No logo, visual identity, or legal entity is settled; the operator name, country, and contact email are unresolved placeholders in the legal copy.

## Evidence on Hand

- Authored curriculum and review material: `curriculum/` (Core, IELTS, growth units, readings, review files).
- Real reference designs and screenshots: `design/` (board and landing references), `docs/design/`, and captured verification screenshots under `docs/verification/`.
- Verification records for behavior, accessibility, and visual fidelity: `docs/verification/`, `evals/`, and the Playwright specs in `tests/`.
- Product and visual specification: `PROJECT.md` (product and status) and `DESIGN.md` (UI spec).

**Absences future work must not fill by invention:** no testimonials, named customers, usage numbers, case studies, press, teacher endorsements, pricing, or benchmarks exist. Vietnamese copy has not had native-speaker review. No signed-in end-to-end progression has been verified against a hosted account.

## Product Principles

1. **Revision beats correction.** Every feedback screen ends in a revise action; reading corrections is not the goal.
2. **Few, clear priorities.** At most three priorities per submission, never a wall of red.
3. **Never lie with confidence.** Silence is better than a wrong correction, and optional suggestions stay out of the numbers.
4. **Cheap by default.** Auto-graded drills and pre-generated content wherever AI is not required; the AI is spent where it changes the learner's next move.
5. **Level-appropriate and language-aware.** Explanations and suggested vocabulary stay within one CEFR step of the learner, and the learner's own language is a support, not a barrier.

## Accessibility & Inclusion

WCAG AA contrast in both light and dark schemes; meaning never carried by color alone; keyboard-reachable corrections with reading-order focus and Esc returning focus; touch targets ≥ 44px; `prefers-reduced-motion` respected; rem-based type that survives user font scaling; logical CSS properties for left-to-right locales; text alternatives for charts; polite status announcements for results and saves. The product targets low-bandwidth, phone-first learners worldwide.
