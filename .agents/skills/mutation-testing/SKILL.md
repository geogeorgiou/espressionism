---
name: mutation-testing
description: Reading this repo's Stryker mutation reports from JSON — list the surviving mutants and locate each one in the source. Use after `pnpm test:mutation`, or when asked which mutants survived.
---

# Reading the mutation reports

`pnpm test:mutation [base]` mutates only the in-scope lines changed since the merge-base with `base` (default `origin/main`), and runs Stryker once per package. See `docs/adr/0001-adopt-stryker-mutation-testing.md`. When it prints `nothing to mutate`, there are no reports to read.

Each package it mutated gets three files below `packages/<package>/reports/`, all gitignored. Read the report, not the cache:

- `reports/mutation/mutation.json`: **the report**, the result of the last run, and the file to query.
- `reports/mutation/mutation.html`: the same data, for a human to open in a browser.
- `reports/stryker-incremental.json`: the incremental **cache**. Same shape, but it carries results merged from earlier runs, so a mutant in it may be stale.

The keys under `.files` are relative to the package (`src/analyze.ts`), not to the repo root.

## The survivors

Every run, start here. `node scripts/mutation-report.ts` reads every package's report and prints a score per package and file, then a table of the mutants the tests let through, with repo-relative paths. For the detail, query one package's report:

```bash
pkg=packages/calculator
jq -r --arg pkg "$pkg" '.files | to_entries[] | .key as $file | .value.mutants[]
       | select(.status == "Survived" or .status == "NoCoverage")
       | "\($pkg)/\($file):\(.location.start.line):\(.location.start.column)  \(.mutatorName)  ->  \(.replacement)"' \
  "$pkg/reports/mutation/mutation.json"
```

Each line is one change to the source that the suite stayed green through. `replacement` is the mutated code; `location.start` is where it goes. To see the original, read those lines of the file, or slice the copy the report keeps in `.files[<path>].source`.

## The statuses

`status` decides whether a mutant is your problem:

| Status                                    | Meaning                                                             |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `Survived`                                | A test ran the mutated code and passed. **Act on it.**              |
| `NoCoverage`                              | No test ran the mutated code at all. **Act on it.**                 |
| `Killed`, `Timeout`                       | A test caught the change. `statusReason` holds the failure message. |
| `CompileError`, `RuntimeError`, `Ignored` | Stryker could not test the mutant. Not a signal about your tests.   |

Other fields on a mutant: `id`, `killedBy` (test ids), `coveredBy`, `testsCompleted`. Test ids resolve against `.testFiles`.

## Acting on a survivor

A survivor is a review comment on the **test**, not on the implementation: the behaviour changed and the suite did not notice. For each one, either tighten the test under `packages/<package>/test/unit/` until it fails against `replacement`, or state why that behaviour is unspecified and the mutant is accepted.

Never add a `// Stryker disable` comment, or edit `stryker.config.mjs`, a package's `stryker.config.mjs` or `scripts/mutation.ts`, to get past the gate. Only a person adds a suppression; propose the exact comment instead: `// Stryker disable next-line <mutator>: <reason>`.

Done when every `Survived` and `NoCoverage` mutant in the reports is accounted for.
