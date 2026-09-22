# Prototype: visual learning for a first-time reader

Question: how can a reader without pretraining/post-training background understand the training process through visual explanation, interaction and a guided path?

Run from the repository: `npm run prototype`, then open http://localhost:4317.

The default homepage explains the project and a single sequence of 18 lessons in six units. The learning directory opens self-contained lessons, with technical chapters expanded inline as optional reading after the next-lesson control. Main navigation is home, learning directory, projects and timeline. The legacy library/chapter URLs remain available for existing links; the library is no longer a primary entry.

Three earlier entry layouts remain available for design experiments only:
- `/?layouts=1&variant=A`: learning map and guided exploration.
- `/?layouts=1&variant=B`: video-classroom layout, with a playable four-scene explanation and playlist.
- `/?layouts=1&variant=C`: illustrated journal, designed for article discovery and sharing.
- `/?variant=A&page=lesson`: complete sample lesson.

Implemented: interactive lifecycle, four-scene training animation with playback, clickable token explanations, a real toy softmax gradient-descent simulation with learning-rate control, quiz with feedback, project introductions, optional original-author video embed with external fallback, source guide, share preview, downloadable 1200×630 PNG, clipboard actions, mobile layout.

The local prototype does not persist lesson completion across reloads. Navigation history restores scroll position and timeline filters; filters and chapter origin are also encoded in URLs. Displayed learning examples are simulations, not live run measurements. Unit 1 now has three illustrated interactive lessons. Lessons 4–18 remain introductory reading editions, each with explanation, example, question, answer and a next step. SFT/RL now have general introductory teaching with an InstructGPT source; they do not claim Marin deployment or offer complete training labs. The YouTube video was identified via its official YouTube result; playback availability must be checked in the user's network. The external resources are supplementary, not prerequisites. No third-party videos are downloaded or rehosted.

The share card is a design preview; localhost is not crawlable by LinkedIn. Production metadata and actual platform validation remain implementation work. Fonts have system fallbacks when Google Fonts is unavailable. The layout switcher is removed by the server when NODE_ENV=production.

Prototype verdict: pending Jesse's hands-on feedback. Evaluate whether Jesse can explain what changes in training, adjust the simulation, answer the quiz, and find the next step without help. Choose or combine layouts, then replace throwaway code with a production implementation.

Original source links:
- https://www.youtube.com/watch?v=7xTGNNLPyMI
- https://www.3blue1brown.com/lessons/gpt/
- https://www.3blue1brown.com/lessons/neural-networks/
- https://github.com/marin-community/marin
- https://mimo.mi.com/docs/en-US/news/latest/v2-6
- https://github.com/XiaomiMiMo/MiMo

The existing Solo Unicorn editorial textbook is imported in full and has received the corrections documented in `../CONTENT_AUDIT.md`. The Markdown download is the corrected edition. External papers and project records are linked as evidence; retrieval alone is not presented as claim verification. Missing textbook illustrations remain explicitly marked.
