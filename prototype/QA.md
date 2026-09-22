# Prototype verification

Checked with a local Chromium browser at 1440px desktop and 390px mobile:

- Lifecycle selection → complete lesson.
- Four-scene controls and associated explanations.
- Learning-rate slider: at 1.20, the toy model after 24 updates predicts the target at approximately 98%, with cross-entropy loss approximately 0.02.
- Incorrect and correct quiz feedback.
- Layouts A, B, C.
- Share modal and downloaded 1200×630 PNG.
- No uncaught page script errors.
- No horizontal overflow on the checked home and lesson pages.

External YouTube playback is network/provider dependent and has not been verified. The original-video link is provided as a fallback. The localhost prototype cannot be crawled by social platforms; social card design/export is implemented, live LinkedIn metadata validation is not.

The first lesson is interactive. Lessons 2–18 are introductory reading lessons with explanations, examples and answer reveals. Progress lasts only in the current page session.

## Content and reading-structure pass · 2026-09-22

- `npm run verify` passes: all 38 chapters, 18 topics, 83 events, 93 timeline sources and 131 reference mappings; unique event IDs; navigation/history, scroll and filter restoration; invalid-route fallback; targeted editorial numeric checks.
- Actual browser: home → course 12 → chapter 25 preserves `from=12`; browser Back returns to course 12. Course-to-timeline link selects course 12. Search `checkpoint` with status `planned` survives navigation away, Back and page reload.
- First-lesson regression: learning rate 1.20 yields 98% probability / 0.02 loss, and quiz answer B shows the correct explanation.
- Desktop homepage visually inspected. At 390×844, home, course 12, chapter 25, library, audit, timeline, projects, MiMo and resources have no horizontal page overflow. Mobile reader directories start collapsed.
- No browser console errors observed during these checks. External video playback and production social previews were not retested.
- New route directories include visible completion labels and audit limits. Historical record labels do not claim an independent re-verification of every event.

See `../CONTENT_AUDIT.md` for factual review scope and unresolved source gaps. This is local prototype validation, not a production deployment.

## Single learning path follow-up · 2026-09-22

- `npm run verify` now also checks lessons 2–18 for explanation, example, question/answer, inline assigned chapters, resolved teaching sources, and absence of chapter-page navigation in their bodies. The learning directory has no chapter links; primary navigation has no textbook entry.
- Actual browser: course 12 answer and technical chapter expand in place; its next control opens course 13. The original chapter prose remains readable in the expanded panel.
- First lesson: learning rate 1.20 still produces 98% / 0.02; answer B shows correct feedback. The next-lesson control now sits directly after the quiz and opens the authored course 2.
- At 390×844, course 4 (including expanded technical reading), the 18-card learning directory and home have no horizontal page overflow. Mobile directory is collapsed on entry. Course 4's typography was visually inspected.
- Primary navigation has four entries; browser reported no console errors in the tested flow. This is introductory reading completion, not a claim of 17 additional interactive lessons or full training labs.

## Unit 1 illustrated lessons · 2026-09-22

- Lessons 2 and 3 now use dedicated teaching pages in `unit-one.js`, with a shared three-lesson route and an explicit bridge from lesson 1.
- Lesson 2 browser checks: stage selection changes the input/signal/output explanation; final-stage Next is disabled; training/inference changes the return path; wrong and correct answers show different explanations.
- Lesson 3 browser checks: the default sentence has 4 tokens with the piece rule and 6 with the character rule; repeating it three times produces 12 piece tokens and 36 retrieved vector components while the fixed 15-by-3 embedding table remains 45 parameters. Repeated token positions return the same ID and vector. A longer example renders 24 selectable tokens on mobile.
- Lesson 1 regression: learning rate 1.20 still gives 98% target probability and 0.02 loss; answer B, the unit route, the new recap, and next-lesson navigation work.
- Visual checks at 1440×1000 and 390×844 cover the lifecycle and tokenizer diagrams. All three lesson routes have no horizontal overflow at the checked mobile size; the mobile directory starts collapsed.
- Automated checks cover text reconstruction, valid token IDs, fixed-table size under repeated input, and arithmetic across every offered sentence/rule combination. Existing research and routing checks remain in the production build.
- The tokenizer is an explicit teaching model, not a real BPE implementation. Its vectors are deterministic illustrative values, not trained semantic embeddings. No external model API is called.
