# Unified curriculum and daily training timeline

## Reader structure and content audit · 2026-09-22

The default entry now presents the project purpose, intended readers, six ordered learning units and explicit completion levels (one interactive lesson plus 17 introductory reading lessons). All lessons have explanation, example and understanding checks. The 38 technical chapters expand inline as optional reading. The legacy `?page=library` remains for old references but is removed from primary navigation. `?page=audit` documents source checks, corrections and unresolved evidence. See [CONTENT_AUDIT.md](CONTENT_AUDIT.md).

Course/chapter readers share directories, breadcrumbs and previous/next controls. Chapter URLs preserve the originating course with `from`; history restores navigation, scroll and timeline filters. Mobile directories collapse by default. A/B/C layout experiments remain behind `layouts=1`.

The preserved Markdown has now been editorially corrected and is labeled as a corrected edition; the historical snapshot date is unchanged. Earlier integration-only verification statements below describe the prior pass, not a claim that all upstream facts have since been independently verified.

The 18 beginner-facing lessons and Marin's 38 chapters now belong to one learning structure. Each lesson contains its own introductory explanation, example and question with an answer, followed by the next-lesson control. Assigned original chapters and evidence are optional and expand on the same page. A chapter may support more than one lesson. Original chapter numbering is retained for provenance and stable references.

| Lesson | Subject | Original Marin chapters |
| --- | --- | --- |
| 01 | Prediction, loss and learning | 5, 10 |
| 02 | Full lifecycle and scope | 1, 3, 37, 38 |
| 03 | Tokens, parameters and compute | 2, 5 |
| 04 | Data preparation | 13 |
| 05 | Data mixtures | 14 |
| 06 | Scaling, experiments and launch decisions | 15, 21, 22, 23 |
| 07 | Transformer structure | 5, 8, 9 |
| 08 | Dense, MoE and routing | 2, 6, 7, 12 |
| 09 | Training steps and optimization | 2, 11, 24 |
| 10 | Hardware, parallelism and communication | 16, 18, 31 |
| 11 | Throughput and goodput | 17, 28 |
| 12 | Checkpoint, failure and recovery | 25, 26, 27, 30 |
| 13 | Loss and evidence interpretation | 4, 29 |
| 14 | Evaluation | 19 |
| 15 | Midtraining and long context | 20 |
| 16 | SFT | 20 (historical background only); introductory teaching references InstructGPT |
| 17 | RL | 20 (historical background only); introductory teaching references InstructGPT |
| 18 | Independent training observation and optional practice | 32, 33, 34, 35, 36 |

All 38 chapters are mapped. Original prose is imported in full by chapter; citation IDs link to the source register. Referenced images were absent from the source directory, so captions identify the missing assets rather than displaying broken images. Supplementary appendices remain available in the preserved original Markdown. The first lesson has a complete interactive experience; other lessons have introductory structure and original reading, not completed custom animations.

## Timeline content and evidence

Imported from the existing Solo Unicorn local data: 83 editorial entries, 29 dates between 2026-08-19 and 2026-09-22, 93 sources, including 5 GitHub-hosted community standup sources. Imported material is a historical snapshot, not a new upstream verification or live feed. The five original claim statuses are retained. The displayed date is the editorial entry date, not an inferred original-post timestamp. No authors, post text or social handles were invented.

Source filters distinguish GitHub, Community (GitHub standups), W&B/reports, and X/Twitter. Existing records can have multiple source types, so filters intentionally overlap. X/Twitter currently has zero imported posts; four X accounts and their editorial focus have now been supplied by the user (see below); other community channel lists are pending user input. Empty filters state the missing data explicitly. Course associations are keyword-based reading recommendations, not new causal claims.

The homepage shows recent existing records and a full-timeline link. The timeline supports source/status/course filters, text search, expandable research details, original-source links and progressively loading older entries. Timeline entries link back into the course; the final lesson leads to the timeline for independent reading practice. Event fragment IDs are derived from date and title and remain stable when new entries are prepended.

## Future collection workflow (not scheduled or implemented)

Connect the confirmed public accounts and community channels → collect URL, author, source timestamp and excerpts → combine coverage of the same event without losing source distinctions → check claims against original evidence → write the reader-facing explanation → connect stages, runs and lessons → publish with collection/verification timestamps.

X posts and community messages may be leads or author statements rather than proof of production deployment. Automated daily collection and public publishing require separate implementation; this prototype only reuses existing local records.

Routes: `?page=learn`, `?page=timeline`, `?page=course-12`, `?page=chapter-25`, and the original `?page=lesson`. Variant A/B/C all display the homepage timeline window.

## Validation

Local Playwright checks passed at desktop 1440×1000 and mobile 390×844: all 38 chapters mapped, 18 lesson cards, all 83 updates with resolved source IDs, chapter reader, source/status/course/search filters, pagination, X empty state, lesson completion and next-lesson navigation. No browser script errors or horizontal overflow on tested routes. Original chapter images were not present in the imported source; their absence is marked explicitly. External links were preserved, not individually revalidated in this integration pass.

## X watchlist — supplied by the user, 2026-09-22

The following are editorial monitoring targets, not imported evidence or independently verified role descriptions. Profile links omit tracking parameters. The prototype shows the list and its focus areas; it does not yet fetch posts, follow accounts on the user's behalf, or schedule monitoring. The 93 evidence-source count is unchanged.

| Person | Profile | Editorial focus |
| --- | --- | --- |
| Percy Liang | [@percyliang](https://x.com/percyliang) | 项目级状态、训练百分比、重要里程碑、scaling law 与整体设计判断 |
| David Hall | [@dlwh](https://x.com/dlwh) | Marin / Levanter 训练系统、infra、midtraining、技术决策与长篇复盘 |
| Larry Dial | [@classiclarryd](https://x.com/classiclarryd) | 535B Hero Run、MoE、architecture、scaling ladder、tokens-per-parameter 与预训练效率 |
| Will Held | [@WilliamBarrHeld](https://x.com/WilliamBarrHeld) | Data + scaling：Delphi scaling laws、data mixture、25T-token pipeline 与训练曲线解释 |

Future records should preserve author, original post URL and timestamp, distinguish original posts from replies/reposts, link to GitHub/run evidence when available, and label author statements separately from verified deployment. Link relevant lessons after editorial review. Do not infer production status from a social post alone.

## Additional Marin learning resources — 2026-09-22

Three user-provided resources are now available on the shared resources page, the Marin case page, and relevant lesson guides. All A/B/C entry layouts retain the same learning-resource structure. These links are supplementary reading, not additional daily events or evidence-source entries.

- [DeepWiki overview](https://deepwiki.com/marin-community/marin/1-overview): AI-generated architecture/code navigation, mapped to lessons 2, 9 and 10. Check index date and linked code revision. Do not treat as an authoritative live-run record.
- [Marin documentation](https://marin.readthedocs.io/en/latest/): project tutorials, explanations, experiment reports and configuration references, mapped to lessons 2, 4, 9, 14 and 18. Readers need not provision hardware to use the conceptual material.
- [Speedrun scaling](https://marin.community/speedrun/?track=scaling&xAxis=model_flops&yAxis=absolute): interactive compute-quality comparison, mapped to lessons 6, 11 and 14. Preserve query parameters. Read Model FLOPs and Absolute BPB axes; distinguish observations, fitted curves and projected BPB from actual Hero outcomes.

Verification: documentation and DeepWiki overview were read through the web tool. Speedrun's dynamic page was inspected in a browser because the text fetch returned no body; the selected axes, scaling leaderboard and projected-BPB labeling were confirmed. No leaderboard numbers or posts were imported into the timeline.

## Unit 1 depth pass · 2026-09-22

Lessons 1–3 now form the first detailed unit. Lesson 1 retains the prediction and gradient-descent demonstration, with a new recap and route into the next two lessons. Lesson 2 follows a code-explanation assistant through six development stages, compares training with inference, and provides three questions with choice-specific feedback. Lesson 3 provides a fixed-vocabulary teaching tokenizer, token-to-ID-to-vector lookup, an input-length experiment, contextual-meaning illustrations and three comprehension questions.

The new interactive pages are implemented in `prototype/unit-one.js` and `prototype/unit-one.css`. General-method references include InstructGPT, Hugging Face's tokenizer documentation, and Attention Is All You Need. Teaching examples and numbers are explicitly distinguished from project measurements. Lessons 4–18 remain baseline reading editions, labeled for later expansion.

## Unit 2 depth pass

Lessons 4–6 now form a complete preparation sequence: trace eight synthetic records through extraction, filtering and exact deduplication; identify cross-split near-duplicate leakage; allocate a fixed token budget and calculate average exposure; compare controlled versus confounded experiments; and inspect a held-out prediction before reviewing system readiness. Each lesson has three explained comprehension questions, direct previous/next navigation and optional inline technical material. All numerical demonstrations are teaching assumptions, not project measurements. Units 1–2 contain the six expanded lessons; Units 3–6 remain scheduled for later refinement.
