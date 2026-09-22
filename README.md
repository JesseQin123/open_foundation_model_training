# Open Foundation Model Training

An educational website by **Solo Unicorn** that explains how foundation models are trained, evaluated, and refined. It connects introductory lessons with technical reading and public project records, helping readers understand both the training process and the evidence behind reported progress.

**[Visit the website → atlas.solounicorn.club](https://atlas.solounicorn.club)**

The lessons and textbook are currently written in Simplified Chinese. The daily Marin research timeline is maintained in English; existing Chinese research translations are retained for future bilingual support. This README documents the project in English for contributors and other repository visitors.

## Overview

The project is intended for students, product professionals, and technical readers seeking an end-to-end introduction to model training. The introductory lessons require no prior training experience or GPU access; the optional technical material covers more advanced mathematics, code, and distributed systems.

The website provides:

- **18 lessons across six units**, organized into a single, sequential learning path.
- **An interactive first lesson** demonstrating prediction, loss, and parameter updates with a toy model.
- **17 introductory reading lessons**, each with explanations, an example, and a comprehension question with an answer.
- **38 chapters of Marin-focused technical material**, available as optional, expandable reading within the relevant lessons.
- **A daily Marin research timeline**, seeded with 83 historical records, with source links and distinctions between reported results, experiments, plans, and unresolved questions.

Marin provides the main case study for pretraining and training infrastructure. Xiaomi MiMo provides an additional public reference for post-training and reinforcement learning.

## Learning path

| Unit | Lessons | Focus |
| --- | --- | --- |
| 1. Foundations | 1–3 | Prediction, loss, the model development lifecycle, and tokenization |
| 2. Training preparation | 4–6 | Data preparation, data mixtures, and small-scale experiments |
| 3. Model architecture | 7–9 | Transformers, mixture-of-experts models, and optimization steps |
| 4. Training systems | 10–12 | Parallelism, throughput, checkpoints, and recovery |
| 5. Evaluation | 13–15 | Interpreting loss, comparing benchmarks, and extending context length |
| 6. Post-training and practice | 16–18 | Supervised fine-tuning, reinforcement learning, and reading training evidence |

Each lesson leads directly to the next. Technical material and external references are optional supplements, so readers can follow the course without navigating a separate textbook.

## Run locally

**Requirements:** Node.js 22.x and npm. The current implementation uses browser APIs and Node.js built-in modules, with no third-party package dependencies to install.

```bash
git clone https://github.com/JesseQin123/open_foundation_model_training.git
cd open_foundation_model_training
npm run prototype
```

Open [http://localhost:4317](http://localhost:4317).

## Validation and build

```bash
# Check content mappings, citations, routing, and selected editorial assertions
npm run verify

# Run validation and generate the production site
npm run build
```

The build writes the public HTML, CSS, JavaScript, and downloadable textbook to `dist/`. Local development tools and editorial documentation are excluded from the published site. Build output is generated and is not committed to the repository.

Automated checks verify structural consistency and selected behaviors; they do not independently establish the accuracy of every source claim. Browser checks and their coverage are documented in [QA notes](prototype/QA.md).

## Deployment

The website is deployed on Vercel at [atlas.solounicorn.club](https://atlas.solounicorn.club). Pushes to this repository's `main` branch trigger a production build.

[vercel.json](vercel.json) specifies the build command and `dist/` output directory. The production build disables the local layout experiments.

Daily research commits are pushed to `codex/marin-535b-session` for a PR and Vercel **Preview**. The task does not merge the PR or publish production; the public domain changes only after a separately authorized production release. See [Daily Research](docs/marin-daily-research.md).

## Project structure

| Path | Purpose |
| --- | --- |
| `prototype/` | Website source, styles, lesson content, and the local server |
| `prototype/lessons.js` | Introductory reading content for lessons 2–18 |
| `prototype/marin-data.js` | Fixed technical chapters and non-M source references |
| `prototype/marin-research.js` | Canonical English research log, snapshot, M sources and claim groups |
| `docs/marin-daily-research.md` | Daily research, continuity, evidence and publishing procedure |
| `prototype/reading.js` | Learning pages, navigation, and the shared reading experience |
| `prototype/verify.mjs` | Automated content and navigation checks |
| `prototype/build.mjs` | Production static-site build |
| `audit/` | Source-retrieval records supporting the editorial review |
| `vercel.json` | Deployment configuration |

The `prototype/` directory name reflects the project's current stage: a published educational prototype built with HTML, CSS, and JavaScript.

## Content status and evidence

The timeline starts with 83 imported records through **September 22, 2026**. Their original editorial classifications remain labeled as imported history, not newly verified facts. The daily Codex task checks public sources at **09:00 America/New_York**, fills missing calendar dates and writes English updates to `prototype/marin-research.js`. The page displays the latest completed research date; it is not a live W&B feed. The textbook keeps its own fixed snapshot date.

Teaching examples and simulations are labeled to distinguish them from project measurements. Source accessibility, reported observations, and independently reproduced results are different levels of evidence. The editorial review has corrected selected factual and interpretive issues, but has not verified every claim or reproduced the underlying training runs.

Current limitations include:

- Only the first lesson has a dedicated interactive simulation; later lessons provide introductory reading rather than complete training labs.
- Lesson completion is not persisted across page reloads.
- Some original textbook illustrations were unavailable in the imported material and are marked accordingly.
- The daily research task runs through local Codex scheduling. Source access, machine availability and usage limits can interrupt a run; the next run checks continuity and backfills gaps.

For review scope, corrections, and unresolved evidence, see [Content Audit](CONTENT_AUDIT.md).

## Further documentation

- [Curriculum Integration](CURRICULUM_INTEGRATION.md): lesson-to-chapter mappings and historical data provenance.
- [Prototype Notes](prototype/NOTES.md): implementation scope and local design experiments.
- [QA Notes](prototype/QA.md): browser checks and known verification limits.
- [Project Plan](PROJECT_PLAN.md): design rationale and proposed future work; planned features are not necessarily implemented.

Some supporting documents are written in Chinese. When reporting a content issue, include the page, the specific statement, and a supporting source where available.
