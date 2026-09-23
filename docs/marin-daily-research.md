# Marin daily research for Atlas

Maintain this repository, `JesseQin123/open_foundation_model_training`, for the Atlas research timeline at <https://atlas.solounicorn.club/?variant=A&page=timeline>.

Run daily at **09:00 America/New_York**. The existing Codex automation `marin-535b` belongs to the Atlas task. Do not maintain the old `solo_unicorn_website_2.0` worktree or its PR #31.

## Files and language

- `prototype/marin-research.js` is the canonical research data: `snapshot`, `coverageStart`, `sources`, `claimGroups`, `updates`.
- `prototype/marin-data.js` holds the fixed textbook snapshot and non-M references. Its `snapshot` is independent of the research date. Do not advance it for daily updates.
- `prototype/marin-original.md` is the existing Chinese textbook. Change long-lived teaching material only when evidence changes a technical explanation or historical account; keep the corresponding chapter content in `marin-data.js` consistent. Preserve all 38 chapters.
- `prototype/integration.js` renders the complete daily log at `page=timeline`. `prototype/reading.js` handles navigation. Daily research should not require UI changes.
- `prototype/verify-research.mjs` and `prototype/verify.mjs` validate research data, textbook coverage and routing.

**Write new research in English.** Require `title.en`, `detail.en`, `concept.en` and `exercise.en`. Chinese fields are optional: preserve existing translations, but do not fabricate translations, copy English into `.zh`, or spend each daily run translating. Full bilingual publishing is deferred until the site supports it. This static public site has no old member Dashboard or public Lab split; its Timeline intentionally contains the complete research log.

## Writing for readers

Write for a curious reader who follows AI but does not work on distributed training. The first glance should answer what happened and why it matters.

- Use a plain-English headline about the change or finding. Do not lead with PR numbers, run IDs, steps, acronyms or evidence-taxonomy language. Keep the existing status field for classification.
- Start each detail with the finding, then its practical significance and the key limitation. Put supporting measurements and source identifiers afterward. Aim for roughly 100–170 words when that is enough; use additional detail only when needed to preserve meaning.
- Explain an unfamiliar term briefly at first use: for example, “experts” are specialized parts of the model, and a checkpoint is a saved training state. Avoid assuming the reader knows kernels, EP, MFU or query bias.
- State whether a result concerns the main training run, merged code, a plan or a small experiment in ordinary language. Simplifying prose must never strengthen the evidence or promise an unmeasured benefit.
- Keep the complete technical measurements, configurations and reproduction details in the dated audit notes. Include only the numbers needed to understand the Timeline finding, while retaining required daily monitoring values after the opening explanation.
- Concepts and exercises should help the reader reason about the finding without requiring implementation knowledge.
- Before publishing, read only the headlines and first two sentences: can a new reader explain what changed and why they should care? Revise if not.

For example, prefer “Code for faster training and longer inputs has been merged” to a headline beginning with kernel names or PR numbers. Follow immediately with whether the main run is known to use that code.

## Start with continuity

1. Read this guide, the research data, relevant textbook sections and both validation files. Run `agent-reach doctor --json` and select tools by `active_backend`.
2. Determine the latest completed research snapshot, newest entry, all recorded dates, maximum M source ID and all five claim-group states. At migration, the snapshot was 2026-09-22, with 83 entries, complete daily coverage since 2026-08-29 and source IDs through M115. Recompute rather than assuming these counts remain fixed.
3. Compare with today's date in America/New_York. List every missing calendar day starting 2026-08-29. Do not assume yesterday's run succeeded.
4. Backfill missing days in chronological order before today's research. Use sources demonstrably public on the historical date. Record when a retrospective check happened with `checkedAt`; never present a later publication or today's live metric as historical evidence.
5. Each day needs at least one record. If no material evidence is found, write “No material public update,” specify the sources actually checked and their limits. This means no public change met the evidence threshold, not that Marin did no internal work.
6. If today already has an entry, do not duplicate a conclusion. Update it or add a different topic only for important new evidence. An access failure is `unknown`, not proof of no change. Leave the snapshot at the last completed review if required checks could not be completed; report pending dates for recovery on the next run.

## Sources and retrieval

Use the Agent Reach skill. GitHub: prefer `gh` CLI. Ordinary pages and fixed artifacts: Jina Reader or a working page reader. X: follow the active backend (currently commonly OpenCLI) for supplemental discovery only. Search snippets and social reposts are not primary evidence.

Check every day:

1. Hero design and launch: <https://github.com/marin-community/marin/issues/8435>.
2. Hero ongoing status: <https://github.com/marin-community/marin/issues/8506>.
3. Hero incidents, especially multi-rack/ragged hangs: <https://github.com/marin-community/marin/issues/8870>.
4. Hero issues/PRs created or updated since the last completed snapshot: launcher; checkpoint/restore; data mixture; all-to-all/expert parallel; QuACK/NCCL/PDL; GC/memory; long context; evaluation; production handoff.
5. The latest Marin weekly standup issue.
6. Marin/Open Athena fixed public reports. Prefer dated artifacts with checkpoint, revision, configuration and metrics.
7. Stably readable public W&B: current run ID, step, train loss, MFU, seconds per step, latest evaluation step, Paloma and UncheatableEval. Preserve observation time and run lineage. Mark unavailable fields unknown; never repeat an old value as a fresh measurement.
8. Percy Liang and Marin official X accounts as supplemental discovery; verify important findings in GitHub, W&B or a fixed report.

For each important source, explain what it proves and what it cannot prove. Keep enough dated retrieval notes in `audit/` to support retrospective checks, without secrets, internal account data or login-only evidence.

## Evidence classification

- **confirmed:** a directly supported public fact. A merged PR can confirm a repository change. Production deployment requires an explicit production launch, handoff, running lineage, official status comment or corresponding public W&B evidence.
- **planned:** a public plan, open PR, next step or deployment not yet evidenced. Merged code without deployment evidence remains planned or unknown as to deployment.
- **experimental:** side run, one-rack test, ablation, scaling ladder, synthetic run or candidate benchmark. Do not imply the main Hero run adopted it.
- **inference:** an interpretation, trend, possible cause, completion forecast or causal hypothesis. Explicitly distinguish it from measurement or a confirmed conclusion.
- **unknown:** missing, inaccessible or conflicting evidence, or an uncaptured root cause.

Open PR ≠ merged code. Merged code ≠ production deployment. Side experiment ≠ Hero production. Live W&B ≠ fixed evaluation artifact. Forecast ≠ measured final checkpoint. Correlation ≠ root cause.

When planned becomes confirmed production, cite at least one explicit production source and set `productionChange: true` with `productionEvidenceIds` drawn from `sourceIds`. Automated checks validate citation structure, not whether the source actually proves deployment; inspect the source text.

## Updating the data

`window.MARIN_RESEARCH` is a formatted object in a browser script. Preserve the wrapper; edit data only.

- Advance `snapshot` only to the latest completed research day with continuous coverage.
- `sources` is the only M-source registry for both research and textbook citations. Allocate a new unique M number above the current maximum; never reuse an ID or duplicate a URL. Fields: `id`, `kind`, `title`, public `url`. Kinds: issue, pr, report, standup, code, web. Reuse an existing source for the same URL.
- Put newest dates first in `updates`. Preserve stable `id` values even when correcting a title, so existing deep links continue working.
- Each new entry needs `id` (`event-YYYY-MM-DD-topic`), `date`, one `status`, `title.en`, `detail.en`, `sourceIds`, `reviewStatus: "reviewed"`, ISO timestamp `checkedAt`, `concept.en`, `exercise.en`. The detail must be readable research, not a link list.
- Existing `reviewStatus: "imported"` entries retain their original classification and explicit historical-review limits. Do not mark future records imported or relabel history reviewed without actually checking it. `importedThrough` is the migration boundary, not the current date.
- Update the five `claimGroups` when evidence changes current boundaries. Each has `status`, `facts.en` and `sourceIds`. Remove stale or contradictory statements; preserve the distinction between historical handoff evidence and current live measurements.
- Do not add a migration/configuration event as if it were Marin production news.

A no-change entry should identify checked threads, verifiable W&B values or unavailable metrics, whether fixed evaluation artifacts changed, why no production state change is established, a learning concept and a short exercise. Never manufacture news to fill the journal.

## Validation

This repository is dependency-free JavaScript, not the previous Next.js/TypeScript app. Its checks replace the old `pnpm vitest` and `tsc` commands, whose files do not exist here:

```sh
npm run verify
npm run build
git diff --check
```

The checks cover continuous dates from 2026-08-29 through `snapshot`, unique entry/source IDs and URLs, resolvable citations, reverse date order, English-only future updates, all five claim groups, rejection of production changes without cited evidence, 38 textbook chapters, 18 lessons, filters, history and navigation. The build verifies all public assets are included. Review content for incorrect planned/experimental-to-production promotion separately. Browser-check Timeline when rendering or data shape changes; ordinary daily content should only update research data and any necessary retrieval notes.

## Git and Vercel

The user authorizes normal commits and pushes to **this repository's** `codex/marin-535b-session`. Confirm `origin` is `JesseQin123/open_foundation_model_training` before pushing. Preserve unrelated user changes; if another checkout/task has work in progress, use an isolated checkout. Fetch and reconcile without rewriting remote history. Commit only relevant, validated changes:

```sh
git commit -m "docs: update Marin research snapshot for YYYY-MM-DD"
git push origin codex/marin-535b-session
```

Find the open PR by repository and head branch. Update the existing Atlas research PR. If none is open, create one for this branch into `main`; do not assume a PR number, and never update old-site PR #31. No empty commits for unchanged content.

**Never auto-merge, force-push, push to main/develop, or deploy/promote production.** `main` triggers the public Atlas production deployment, so these daily pushes are for Preview and review. Vercel project `atlas` is already linked in `.vercel/project.json`; verify the linkage before any explicit deployment. A safe Preview deployment is authorized if the Git integration does not create one. Never use `--prod` or attach the production domain to a Preview.

After push, verify the deployment/checks for that exact commit and report its Preview URL and status. A successful push does not prove Vercel succeeded. Keep bounded checks and report a pending build honestly. If network, permissions, limits or scheduling interrupt the run, report unfinished steps and recover missing dates next time. Do not make up a successful commit, push or deployment.

## Daily report

Open with a short plain-language account of what happened and why it matters; put engineering and delivery details afterward. Return: date; findings grouped by confirmed/planned/experimental/inference/unknown; key sources with title, URL, what each proves and does not prove; technical significance; connection to previous work; unresolved questions; backfilled dates and remaining gaps; modified files; commit hash; push/PR status; Vercel Preview URL/status; test results. Report failures or required user action explicitly. A routine no-change day still adds its required research record and reports the completed daily maintenance.
