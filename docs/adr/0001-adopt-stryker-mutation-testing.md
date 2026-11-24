# 0001: Adopt Stryker mutation testing

- **Status:** Accepted
- **Date:** 2026-11-25

## Context

The unit tests run on Vitest in each package, and CI checks that they pass.
Nothing checks that they would notice a bug: a test can pass while asserting
almost nothing. Agent workflows are about to write many of the tests here, as
they do in react-tricks.

[Stryker](https://stryker-mutator.io/) mutates the source (flips conditions,
empties blocks, swaps operators) and reruns the covering tests. A mutant the
tests don't catch survives. The score is the share of mutants killed, which
measures how strong the tests are. Each surviving mutant is concrete work for
`agent-review`: write a test that kills it.

A full mutation run is slow, grows with the codebase and says nothing about the
change under review. This repo is also a pnpm monorepo of five packages, each
with its own `vite.config.ts`. Stryker has no monorepo mode. Its own monorepo
keeps one shared parent config, gives each package a thin config of its own,
and runs and scores each package separately. We copy that.

## Decision

### What gets mutated

- **In scope:**
  - `packages/{calculator,store,tool,agent}/src/**`
  - `packages/client/src/features/**/{utils,hooks,constants}/**`
- **Never mutated, even when changed:**
  - a package's entry barrel, `packages/*/src/index.ts`. It only
    re-exports. A `constants/index.ts` holds real values, so it stays in
    scope.
  - client components, routes, `components/ui` (shadcn) and `lib`. Component
    mutants under jsdom are slow and mostly noise.
  - `**/test-utils/**`, `api/`, `scripts/` and test files.

### Per-PR scope: diff-scoped and incremental

- Stryker never runs against the whole codebase. It mutates the **lines**
  each in-scope file added or changed since the merge-base with the base
  branch. They are read from the hunk headers of `git diff -U0 <merge-base>`
  and passed to Stryker as `--mutate file:20-21`. A mutant on a line the PR
  didn't write grades code that isn't the PR's.
- The diff is against the work tree, so committed, staged and unstaged
  changes all count, and an untracked file counts whole.
- A file new since the merge-base is mutated whole.
- **Test → source rule:** a changed or deleted
  `packages/X/test/unit/<p>.test.ts(x)` mutates
  `packages/X/src/<p>.ts(x)` **whole**, if that file is in scope. Both
  extensions are tried, because a `.tsx` test often renders a `.ts` hook. A
  test edit writes no source lines, and the edited tests grade the whole file,
  so a test edit that weakens the suite is caught.
- Every run uses `--incremental`, so later pushes to the same PR only re-test
  mutants whose code or covering tests changed.

### One Stryker run per changed package

- A root `stryker.config.mjs` holds the shared settings: the Vitest runner,
  thresholds, incremental mode and reporters.
- Each in-scope package has a thin `packages/X/stryker.config.mjs` that
  spreads the shared settings and names its own `vite.config.ts`. A package
  that needs other thresholds overrides them there.
- `scripts/mutation.ts` groups the `--mutate` entries by package and runs
  `stryker run` once per changed package, one after another, from inside the
  package. Each run gets its own sandbox, score, reports
  (`packages/X/reports/mutation/`) and incremental baseline
  (`packages/X/reports/stryker-incremental.json`). These are gitignored.
- A package below its break threshold doesn't stop the others. The script
  exits non-zero once every package has run.

### One script decides scope

- `scripts/mutation.ts` computes what to mutate (line ranges, scope filter,
  test → source rule) and invokes Stryker. It is exposed as
  `pnpm test:mutation [base]` and run with `node`, which strips the types, so
  it needs no build step. `--list` prints the entries and stops.
- It is the only place scope is defined. `stryker.config.mjs` leaves `mutate`
  empty, so a bare `stryker run` finds no files instead of mutating the whole
  package.
- To leave a package out of mutation, change `inScope` and this ADR in the
  same PR.
- Its base defaults to `$MUTATION_BASE`, then `origin/main`.
- CI, `agent-review` and local runs all call it, so they never disagree about
  scope.
- When nothing is left to mutate, it prints "nothing to mutate" and exits 0.

### Thresholds

- `thresholds: { high: 85, low: 70, break: 60 }`, applied per package to the
  mutants of the PR's files only. A package below 60 fails the run.
- A no-coverage mutant counts against the score.

### CI

- A `mutation` job in `.github/workflows/ci.yml`, alongside `ci`, on
  `pull_request` only, never on a push to `main`.
- It checks out the PR's head, not the test merge commit, so annotation lines
  match the PR's files. It uses `fetch-depth: 0` so the merge-base resolves,
  and `timeout-minutes: 20`.
- The incremental baselines (`packages/*/reports/stryker-incremental.json`)
  live in `actions/cache`, scoped to the PR: key
  `stryker-pr-<number>-<sha>`, restore-key `stryker-pr-<number>-`. Restore
  and save are separate steps, and the save runs on `always()`, so a run below
  the threshold still saves its baseline for the next push.
- `scripts/mutation-report.ts` turns every package's JSON report into one job
  summary, with a row per package, a row per file and a line annotation per
  mutant the tests let through. The HTML reports are uploaded as one artifact.
- The job passes when there is nothing to mutate, so it can be a required
  check.

### Agents

- Mutation testing runs only in CI and in `agent-review`. Implementing agents
  don't run it, because it is too slow for every task. Their prompts only say
  that CI runs it.
- The review agent runs `pnpm test:mutation origin/<base>` itself, writes
  tests that kill the surviving mutants, and re-runs.
- An agent **never** adds a `Stryker disable` comment to get past the gate.

### Suppressions

`// Stryker disable next-line <mutator>: <reason>` is allowed only with a
reason, and only added by a human.

### Out of scope

- Any full-codebase Stryker run, scheduled or otherwise.
- Stryker's hosted dashboard, which needs an account and an API key. The job
  summary is enough.
- Writing tests for existing untested code beyond what a PR's own diff needs.
- Making `mutation` a required check. That is a GitHub setting to turn on
  after merge.

These are tooling terms, not domain terms, so `GLOSSARY.md` doesn't change.

## Consequences

### What we lose

| Item                     | Impact                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| PR feedback time         | Each PR waits on a mutation run, capped at 20 minutes. Diff scoping and the incremental baselines keep it to the PR's own lines. |
| One Stryker per package  | A PR that touches three packages pays three Stryker startups and sandbox copies, run one after another.                         |
| Whole-codebase score     | There is none. Untested code nobody changes is never measured.                                                                  |
| Free hand on suppression | Agents can't silence a mutant. Equivalent mutants (ones no test can tell apart) need a human with a written reason.             |
| Two more devDependencies | `@stryker-mutator/core` and `@stryker-mutator/vitest-runner`.                                                                   |

### What we gain

- A merge gate on test strength, not just on tests passing.
- Concrete work for `agent-review`: each surviving mutant is a missing
  assertion it can turn into a test.
- One script for scope, so CI, `agent-review` and local runs agree on what gets
  mutated.
- A score per package, against each package's own vite config, with no
  workspace-wide Vitest setup to maintain.

### Follow-ups

- If running packages one after another gets too slow, run them in parallel
  or as a CI matrix.
- Make `mutation` a required check after merge.
- Revisit the thresholds once a few PRs have gone through the gate.
