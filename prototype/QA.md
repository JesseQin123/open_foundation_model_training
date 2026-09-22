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

## Atlas daily research migration · 2026-09-22

- Preserved all 83 bilingual historical records, all 38 chapter bodies, all 93 original research source entries and every existing event deep link. The canonical M registry now includes all 115 M references shared by the textbook and journal.
- `npm run verify` checks daily coverage from 2026-08-29 through the research snapshot, unique IDs/URLs, citation resolution, reverse date order, evidence states, and rejection of malformed data. An English-only next-day fixture renders, searches and connects to a lesson without requiring Chinese fields. The fixture is not published content.
- Actual browser on the local site: English full-text search for “Coordinated GC” combined with Planned returns the expected single entry; filters survive reload. Loading earlier entries increases the visible count from 12 to 24. English summaries, source links and historical verification limits were visually inspected. No browser console errors were observed.
- `npm run build` validates and packages the new research asset. Existing lesson, chapter, history and routing checks pass. No fresh verification of historical W&B figures is claimed by this migration.
- The Codex daily automation is retargeted to the Atlas repository task at 09:00 America/New_York. Production publication remains separate from branch pushes and Preview builds.

## Single learning path follow-up · 2026-09-22

- `npm run verify` now also checks lessons 2–18 for explanation, example, question/answer, inline assigned chapters, resolved teaching sources, and absence of chapter-page navigation in their bodies. The learning directory has no chapter links; primary navigation has no textbook entry.
- Actual browser: course 12 answer and technical chapter expand in place; its next control opens course 13. The original chapter prose remains readable in the expanded panel.
- First lesson: learning rate 1.20 still produces 98% / 0.02; answer B shows correct feedback. The next-lesson control now sits directly after the quiz and opens the authored course 2.
- At 390×844, course 4 (including expanded technical reading), the 18-card learning directory and home have no horizontal page overflow. Mobile directory is collapsed on entry. Course 4's typography was visually inspected.
- Primary navigation has four entries; browser reported no console errors in the tested flow. This is introductory reading completion, not a claim of 17 additional interactive lessons or full training labs.
