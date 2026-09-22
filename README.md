# Open Foundation Model Training

An educational website by **Solo Unicorn** that explains how foundation models are trained, evaluated, and refined. It connects introductory lessons with technical reading and public project records, helping readers understand both the training process and the evidence behind reported progress.

**[Visit the website → atlas.solounicorn.club](https://atlas.solounicorn.club)**

The learning content is currently written in Simplified Chinese. This README documents the project in English for contributors and other repository visitors.

## Overview

The project is intended for students, product professionals, and technical readers seeking an end-to-end introduction to model training. The introductory lessons require no prior training experience or GPU access; the optional technical material covers more advanced mathematics, code, and distributed systems.

The website provides:

- **18 lessons across six units**, organized into a single, sequential learning path.
- **Six illustrated, interactive lessons in Units 1–2**, covering parameter updates, the development lifecycle, tokenization, data preparation, data mixtures, and controlled small-scale experiments.
- **12 introductory reading lessons**, each with explanations, an example, and a comprehension question with an answer.
- **38 chapters of Marin-focused technical material**, available as optional, expandable reading within the relevant lessons.
- **83 historical training records**, with source links and distinctions between reported results, experiments, plans, and unresolved questions.

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

## Project structure

| Path | Purpose |
| --- | --- |
| `prototype/` | Website source, styles, lesson content, and the local server |
| `prototype/lessons.js` | Baseline introductory reading content |
| `prototype/unit-two.js` | Detailed Unit 2 lessons and deterministic data-preparation, mixture, and experiment teaching models |
| `prototype/unit-one.js` | Detailed Unit 1 lessons, interactive diagrams, and teaching models |
| `prototype/marin-data.js` | Imported technical chapters, historical records, and source references |
| `prototype/reading.js` | Learning pages, navigation, and the shared reading experience |
| `prototype/verify.mjs` | Automated content and navigation checks |
| `prototype/build.mjs` | Production static-site build |
| `audit/` | Source-retrieval records supporting the editorial review |
| `vercel.json` | Deployment configuration |

The `prototype/` directory name reflects the project's current stage: a published educational prototype built with HTML, CSS, and JavaScript.

## Content status and evidence

The imported training records are a **historical snapshot dated September 22, 2026**, not a live monitoring feed. Their original editorial status and the scope of subsequent checks are documented separately.

Teaching examples and simulations are labeled to distinguish them from project measurements. Source accessibility, reported observations, and independently reproduced results are different levels of evidence. The editorial review has corrected selected factual and interpretive issues, but has not verified every claim or reproduced the underlying training runs.

Current limitations include:

- Unit 1 includes dedicated interactive explanations. Lessons 4–18 remain introductory reading editions awaiting deeper treatment; the course does not provide complete training labs.
- Lesson completion is not persisted across page reloads.
- Some original textbook illustrations were unavailable in the imported material and are marked accordingly.
- Automated collection of new training records is not implemented.

For review scope, corrections, and unresolved evidence, see [Content Audit](CONTENT_AUDIT.md).

## Further documentation

- [Curriculum Integration](CURRICULUM_INTEGRATION.md): lesson-to-chapter mappings and historical data provenance.
- [Prototype Notes](prototype/NOTES.md): implementation scope and local design experiments.
- [QA Notes](prototype/QA.md): browser checks and known verification limits.
- [Project Plan](PROJECT_PLAN.md): design rationale and proposed future work; planned features are not necessarily implemented.

Some supporting documents are written in Chinese. When reporting a content issue, include the page, the specific statement, and a supporting source where available.
