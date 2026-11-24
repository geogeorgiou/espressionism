#!/usr/bin/env node
/**
 * Runs Stryker on the lines changed since the merge-base, once per package.
 * See docs/adr/0001-adopt-stryker-mutation-testing.md.
 *
 * Usage: scripts/mutation.ts [--list] [base]
 *   base     defaults to $MUTATION_BASE, then origin/main
 *   --list   print the `--mutate` entries and exit
 */
import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

type Lines = string[] | 'whole'

function git(cwd: string, args: string[]): string[] {
  return execFileSync('git', ['-c', 'core.quotePath=false', ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  })
    .split('\n')
    .filter(Boolean)
}

function isTest(file: string): boolean {
  return /\.test\.tsx?$/.test(file)
}

/** `packages/X/test/unit/<p>.test.ts(x)` → `packages/X/src/<p>.ts` or `.tsx`. */
function sourcesOf(test: string): string[] {
  const match = /^(packages\/[^/]+)\/test\/unit\/(.+)\.test\.tsx?$/.exec(test)
  if (!match) return []
  const [, pkg, rest] = match
  return [`${pkg}/src/${rest}.ts`, `${pkg}/src/${rest}.tsx`]
}

/** The only copy of the mutation scope; keep it in sync with ADR 0001. */
function inScope(file: string): boolean {
  if (!/\.tsx?$/.test(file) || isTest(file)) return false
  if (/^packages\/[^/]+\/src\/index\.ts$/.test(file)) return false
  if (/\/test-utils\//.test(file)) return false
  if (/^packages\/(calculator|store|tool|agent)\/src\//.test(file)) return true
  return /^packages\/client\/src\/features\/(.+\/)?(utils|hooks|constants)\//.test(
    file,
  )
}

function packageOf(file: string): string {
  return file.split('/').slice(0, 2).join('/')
}

/** Changed line ranges per file, from `git diff -U0` against the work tree. */
function changedLines(root: string, mergeBase: string): Map<string, Lines> {
  const lines = new Map<string, Lines>()
  let file: string | null = null
  let isNew = false
  for (const line of git(root, [
    'diff',
    '-U0',
    '--no-color',
    '--no-ext-diff',
    mergeBase,
  ])) {
    if (line.startsWith('--- ')) {
      isNew = line === '--- /dev/null'
      continue
    }
    if (line.startsWith('+++ ')) {
      file = line === '+++ /dev/null' ? null : line.slice('+++ b/'.length)
      if (file && isNew) lines.set(file, 'whole')
      continue
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line)
    if (!hunk || !file || isNew) continue
    const start = Number(hunk[1])
    const count = hunk[2] === undefined ? 1 : Number(hunk[2])
    if (count === 0) continue
    const ranges = lines.get(file)
    const range = `${start}-${start + count - 1}`
    lines.set(file, ranges === 'whole' ? 'whole' : [...(ranges ?? []), range])
  }
  return lines
}

function mutateEntries(root: string, base: string): string[] {
  const [mergeBase] = git(root, ['merge-base', base, 'HEAD'])
  const targets = changedLines(root, mergeBase)

  // Deleted tests still pull in their source.
  const changed = git(root, ['diff', '--name-only', '--no-renames', mergeBase])
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard'])
  for (const file of untracked) targets.set(file, 'whole')
  for (const file of [...changed, ...untracked]) {
    if (!isTest(file)) continue
    for (const source of sourcesOf(file)) targets.set(source, 'whole')
  }

  return [...targets]
    .filter(([file]) => inScope(file) && existsSync(path.join(root, file)))
    .toSorted(([a], [b]) => a.localeCompare(b))
    .flatMap(([file, lines]) =>
      lines === 'whole' ? [file] : lines.map((range) => `${file}:${range}`),
    )
}

function byPackage(entries: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>()
  for (const entry of entries) {
    const pkg = packageOf(entry)
    const local = entry.slice(pkg.length + 1)
    groups.set(pkg, [...(groups.get(pkg) ?? []), local])
  }
  return groups
}

function parseArgs(argv: string[]) {
  let listOnly = false
  let base = process.env.MUTATION_BASE || 'origin/main'
  for (const arg of argv) {
    if (arg === '--list') listOnly = true
    else if (arg === '--') continue
    else if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}`)
      process.exit(2)
    } else base = arg
  }
  return { listOnly, base }
}

const { listOnly, base } = parseArgs(process.argv.slice(2))

const [root] = git(process.cwd(), ['rev-parse', '--show-toplevel'])
const entries = mutateEntries(root, base)

if (entries.length === 0) {
  console.log('nothing to mutate')
  process.exit(0)
}

if (listOnly) {
  console.log(entries.join('\n'))
  process.exit(0)
}

const localBin = path.resolve(import.meta.dirname, '..', 'node_modules', '.bin')
const env = {
  ...process.env,
  PATH: `${process.env.PATH ?? ''}${path.delimiter}${localBin}`,
}

// Stale reports would read as this run's result.
for (const pkg of git(root, ['ls-files', '--', 'packages/*/package.json'])) {
  rmSync(path.join(root, path.dirname(pkg), 'reports', 'mutation'), {
    recursive: true,
    force: true,
  })
}

const failed: string[] = []
for (const [pkg, mutate] of byPackage(entries)) {
  const cwd = path.join(root, pkg)
  if (!existsSync(path.join(cwd, 'stryker.config.mjs'))) {
    console.error(`${pkg} has files in scope but no stryker.config.mjs.`)
    failed.push(pkg)
    continue
  }
  console.log(`\n▶ Mutating ${pkg}`)
  try {
    execFileSync(
      'stryker',
      ['run', '--incremental', '--mutate', mutate.join(',')],
      {
        cwd,
        env,
        stdio: 'inherit',
      },
    )
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') {
      console.error(
        'stryker not found. Install the dependencies with: pnpm install',
      )
      process.exit(1)
    }
    failed.push(pkg)
  }
}

if (failed.length > 0) {
  console.error(`\nMutation testing failed in: ${failed.join(', ')}`)
  process.exit(1)
}
