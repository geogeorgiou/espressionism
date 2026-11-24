import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { afterEach, beforeEach, describe, expect, test } from 'vite-plus/test'

const SCRIPT = path.resolve(import.meta.dirname, 'mutation.ts')

// Keep a hook's GIT_* state out of the throwaway repo.
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
)
delete env.MUTATION_BASE

let repo: string
let edits = 0

function git(...args: string[]) {
  execFileSync('git', args, { cwd: repo, env, stdio: 'pipe' })
}

function write(file: string) {
  const content = `export const x = ${++edits}\n`
  const full = path.join(repo, file)
  mkdirSync(path.dirname(full), { recursive: true })
  writeFileSync(full, content)
}

function writeLines(file: string, lines: string[]) {
  const full = path.join(repo, file)
  mkdirSync(path.dirname(full), { recursive: true })
  writeFileSync(full, lines.map((line) => `${line}\n`).join(''))
}

const FIVE = [
  'const a = 1',
  'const b = 2',
  'const c = 3',
  'const d = 4',
  'const e = 5',
]

function startFromFiveLines(file: string) {
  writeLines(file, FIVE)
  git('add', '--all')
  git('commit', '--quiet', '-m', 'five lines')
  git('switch', '--quiet', '--create', 'edit')
}

function commit(...files: string[]) {
  for (const file of files) write(file)
  git('add', '--all')
  git('commit', '--quiet', '--allow-empty', '-m', 'change')
}

function run(
  args: string[],
  extraEnv: Record<string, string> = {},
  cwd = repo,
) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    env: { ...env, ...extraEnv },
    encoding: 'utf8',
  })
  if (result.error) throw result.error
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    lines: result.stdout.split('\n').filter(Boolean),
  }
}

const list = (base = 'main') => run(['--list', base])

const PACKAGES = ['agent', 'calculator', 'client', 'store', 'tool']

beforeEach(() => {
  repo = mkdtempSync(path.join(tmpdir(), 'mutation-'))
  git('init', '--quiet', '--initial-branch=main')
  git('config', 'user.email', 'test@example.com')
  git('config', 'user.name', 'Test')
  git('config', 'commit.gpgsign', 'false')
  for (const pkg of PACKAGES) {
    writeLines(`packages/${pkg}/package.json`, ['{}'])
    writeLines(`packages/${pkg}/stryker.config.mjs`, ['export default {}'])
  }
  commit(
    'packages/calculator/src/format.ts',
    'packages/calculator/test/unit/format.test.ts',
    'packages/client/src/features/store/hooks/use-store-filters.ts',
    'packages/client/test/unit/features/store/hooks/use-store-filters.test.tsx',
    'packages/client/src/features/theme/components/theme-toggle.tsx',
    'packages/client/test/unit/features/theme/components/theme-toggle.test.tsx',
  )
  git('switch', '--quiet', '--create', 'feature')
})

afterEach(() => {
  rmSync(repo, { recursive: true, force: true })
})

describe('scripts/mutation.ts --list', () => {
  test('lists changed in-scope files across packages', () => {
    commit('packages/store/src/search.ts', 'packages/agent/src/reply.ts')

    expect(list().lines).toEqual([
      'packages/agent/src/reply.ts',
      'packages/store/src/search.ts',
    ])
  })

  test.each([
    'packages/agent/src/memory.ts',
    'packages/calculator/src/analyze.ts',
    'packages/store/src/search.ts',
    'packages/tool/src/define.ts',
    'packages/client/src/features/chat/utils/parts.ts',
    'packages/client/src/features/chat/hooks/use-chat.ts',
    'packages/client/src/features/chat/constants/index.ts',
  ])('lists in-scope %s', (file) => {
    commit(file)

    expect(list().lines).toEqual([file])
  })

  test('a changed test alone lists its source', () => {
    commit('packages/calculator/test/unit/format.test.ts')

    expect(list().lines).toEqual(['packages/calculator/src/format.ts'])
  })

  test('a changed .test.tsx lists the .ts hook it renders', () => {
    commit(
      'packages/client/test/unit/features/store/hooks/use-store-filters.test.tsx',
    )

    expect(list().lines).toEqual([
      'packages/client/src/features/store/hooks/use-store-filters.ts',
    ])
  })

  test('finds the source when run from a subfolder', () => {
    commit('packages/calculator/test/unit/format.test.ts')

    expect(
      run(['--list', 'main'], {}, path.join(repo, 'packages')).lines,
    ).toEqual(['packages/calculator/src/format.ts'])
  })

  test('a test without a source lists nothing', () => {
    commit('packages/calculator/test/unit/orphan.test.ts')

    expect(list().lines).toEqual(['nothing to mutate'])
  })

  test('never lists excluded paths, even when changed', () => {
    commit(
      'packages/calculator/src/index.ts',
      'packages/agent/src/index.ts',
      'packages/client/src/features/theme/components/theme-toggle.tsx',
      'packages/client/test/unit/features/theme/components/theme-toggle.test.tsx',
      'packages/client/src/routes/index.tsx',
      'packages/client/src/components/ui/button.tsx',
      'packages/client/src/lib/utils.ts',
      'packages/client/test/unit/test-utils/render.tsx',
      'packages/store/src/test-utils/fixtures.ts',
      'packages/calculator/vite.config.ts',
      'api/chat.ts',
      'scripts/other.ts',
    )

    const result = list()

    expect(result.lines).toEqual(['nothing to mutate'])
    expect(result.status).toBe(0)
  })

  test('drops deleted files', () => {
    git('rm', '--quiet', 'packages/calculator/src/format.ts')
    commit('packages/store/src/search.ts')

    expect(list().lines).toEqual(['packages/store/src/search.ts'])
  })

  test('with no in-scope changes, prints "nothing to mutate" and exits 0', () => {
    commit('README.md', 'packages/client/src/styles.css')

    const result = list()

    expect(result.stdout).toBe('nothing to mutate\n')
    expect(result.status).toBe(0)
  })

  test('only counts changes since the merge-base', () => {
    commit('packages/store/src/mine.ts')
    git('switch', '--quiet', 'main')
    commit('packages/store/src/theirs.ts')
    git('switch', '--quiet', 'feature')

    expect(list().lines).toEqual(['packages/store/src/mine.ts'])
  })
})

describe('scripts/mutation.ts --list, changed lines', () => {
  const file = 'packages/store/src/search.ts'

  test('a changed file lists only its changed line ranges', () => {
    startFromFiveLines(file)
    writeLines(file, [
      'const a = 1',
      'const b = 20',
      'const c = 3',
      'const d = 40',
      'const e = 50',
    ])
    git('commit', '--quiet', '--all', '-m', 'edit')

    expect(list('feature').lines).toEqual([`${file}:2-2`, `${file}:4-5`])
  })

  test('a file new since the merge-base is listed whole', () => {
    commit(file)

    expect(list().lines).toEqual([file])
  })

  test('lists unstaged and staged changes', () => {
    startFromFiveLines(file)
    writeLines(file, ['const a = 10', ...FIVE.slice(1)])
    writeLines('packages/agent/src/reply.ts', ['export const x = 1'])
    git('add', 'packages/agent/src/reply.ts')

    expect(list('feature').lines).toEqual([
      'packages/agent/src/reply.ts',
      `${file}:1-1`,
    ])
  })

  test('lists an untracked file whole', () => {
    writeLines('packages/agent/src/draft.ts', [
      'export const a = 1',
      'export const b = 2',
    ])

    expect(list().lines).toEqual(['packages/agent/src/draft.ts'])
  })

  test('a change that only deletes lines lists nothing', () => {
    startFromFiveLines(file)
    writeLines(file, FIVE.slice(0, 3))
    git('commit', '--quiet', '--all', '-m', 'delete lines')

    expect(list('feature').lines).toEqual(['nothing to mutate'])
  })

  test('a test that only deletes lines lists its source whole', () => {
    const testFile = 'packages/store/test/unit/search.test.ts'
    writeLines(file, FIVE)
    startFromFiveLines(testFile)
    writeLines(testFile, FIVE.slice(0, 4))
    git('commit', '--quiet', '--all', '-m', 'drop an assertion')

    expect(list('feature').lines).toEqual([file])
  })

  test('a deleted test lists its source whole', () => {
    git('rm', '--quiet', 'packages/calculator/test/unit/format.test.ts')
    git('commit', '--quiet', '-m', 'drop the test')

    expect(list().lines).toEqual(['packages/calculator/src/format.ts'])
  })

  test('a changed test lists its source whole, even when the source changed too', () => {
    const testFile = 'packages/store/test/unit/search.test.ts'
    writeLines(testFile, ['test()'])
    startFromFiveLines(file)
    writeLines(file, ['const a = 10', ...FIVE.slice(1)])
    writeLines(testFile, ['test()', 'test()'])
    git('commit', '--quiet', '--all', '-m', 'edit both')

    expect(list('feature').lines).toEqual([file])
  })
})

describe('scripts/mutation.ts base', () => {
  beforeEach(() => {
    commit('packages/store/src/search.ts')
  })

  test('defaults to origin/main', () => {
    const noOrigin = run(['--list'])
    expect(noOrigin.status).not.toBe(0)

    git('update-ref', 'refs/remotes/origin/main', 'main')

    expect(run(['--list']).lines).toEqual(['packages/store/src/search.ts'])
  })

  test('can be overridden with MUTATION_BASE', () => {
    expect(run(['--list'], { MUTATION_BASE: 'main' }).lines).toEqual([
      'packages/store/src/search.ts',
    ])
  })

  test('an argument overrides MUTATION_BASE', () => {
    expect(run(['--list', 'main'], { MUTATION_BASE: 'nope' }).lines).toEqual([
      'packages/store/src/search.ts',
    ])
  })

  test('ignores the `--` that `pnpm test:mutation -- <base>` passes through', () => {
    expect(
      run(['--list', '--', 'main'], { MUTATION_BASE: 'nope' }).lines,
    ).toEqual(['packages/store/src/search.ts'])
  })

  test('rejects an unknown option', () => {
    const result = run(['--nope'])

    expect(result.stderr).toContain('Unknown option: --nope')
    expect(result.status).toBe(2)
  })
})

const strykerLines = (lines: string[]) =>
  lines.filter((line) => line.startsWith('in '))

describe('scripts/mutation.ts without --list', () => {
  let bin: string

  beforeEach(() => {
    // Fake Stryker: prints its package and args, fails in $FAKE_FAIL_IN.
    bin = mkdtempSync(path.join(tmpdir(), 'mutation-bin-'))
    const stryker = path.join(bin, 'stryker')
    writeFileSync(
      stryker,
      [
        '#!/usr/bin/env bash',
        'pkg="$(basename "$PWD")"',
        'printf "in %s: %s\\n" "$pkg" "$*"',
        '[ "$pkg" = "${FAKE_FAIL_IN:-}" ] && exit 1',
        'exit 0',
        '',
      ].join('\n'),
    )
    chmodSync(stryker, 0o755)
  })

  afterEach(() => {
    rmSync(bin, { recursive: true, force: true })
  })

  const withFakeStryker = (failIn = '') => ({
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
    FAKE_FAIL_IN: failIn,
  })

  test('runs Stryker once per package, from inside it, with package-relative entries', () => {
    commit(
      'packages/store/src/search.ts',
      'packages/agent/src/reply.ts',
      'packages/agent/src/memory.ts',
    )

    const result = run(['main'], withFakeStryker())

    expect(strykerLines(result.lines)).toEqual([
      'in agent: run --incremental --mutate src/memory.ts,src/reply.ts',
      'in store: run --incremental --mutate src/search.ts',
    ])
    expect(result.status).toBe(0)
  })

  test('passes line ranges to --mutate', () => {
    const file = 'packages/store/src/search.ts'
    startFromFiveLines(file)
    writeLines(file, ['const a = 10', ...FIVE.slice(1, 4), 'const e = 50'])
    git('commit', '--quiet', '--all', '-m', 'edit')

    expect(strykerLines(run(['feature'], withFakeStryker()).lines)).toEqual([
      'in store: run --incremental --mutate src/search.ts:1-1,src/search.ts:5-5',
    ])
  })

  test('a failing package does not stop the others, and the run exits 1', () => {
    commit('packages/agent/src/reply.ts', 'packages/store/src/search.ts')

    const result = run(['main'], withFakeStryker('agent'))

    expect(strykerLines(result.lines)).toEqual([
      'in agent: run --incremental --mutate src/reply.ts',
      'in store: run --incremental --mutate src/search.ts',
    ])
    expect(result.stderr).toContain(
      'Mutation testing failed in: packages/agent',
    )
    expect(result.status).toBe(1)
  })

  test('fails a package that has files in scope but no stryker.config.mjs', () => {
    git('rm', '--quiet', 'packages/tool/stryker.config.mjs')
    commit('packages/tool/src/define.ts', 'packages/store/src/search.ts')

    const result = run(['main'], withFakeStryker())

    expect(strykerLines(result.lines)).toEqual([
      'in store: run --incremental --mutate src/search.ts',
    ])
    expect(result.stderr).toContain('packages/tool has files in scope')
    expect(result.status).toBe(1)
  })

  test('clears every package’s old reports, and keeps the incremental baseline', () => {
    writeLines('packages/tool/reports/mutation/mutation.json', ['{}'])
    writeLines('packages/tool/reports/stryker-incremental.json', ['{}'])
    commit('packages/store/src/search.ts')

    run(['main'], withFakeStryker())

    expect(existsSync(path.join(repo, 'packages/tool/reports/mutation'))).toBe(
      false,
    )
    expect(
      existsSync(
        path.join(repo, 'packages/tool/reports/stryker-incremental.json'),
      ),
    ).toBe(true)
  })

  test('fails with a hint when Stryker is not installed', () => {
    commit('packages/store/src/search.ts')
    const script = path.join(bin, 'scripts', 'mutation.ts')
    mkdirSync(path.dirname(script))
    copyFileSync(SCRIPT, script)

    const result = spawnSync(process.execPath, [script, 'main'], {
      cwd: repo,
      env: { ...env, PATH: '/usr/bin:/bin' },
      encoding: 'utf8',
    })

    expect(result.stderr).toContain('stryker not found')
    expect(result.status).toBe(1)
  })

  test('does not run Stryker when nothing is in scope', () => {
    commit('README.md')

    const result = run(['main'], withFakeStryker('store'))

    expect(result.stdout).toBe('nothing to mutate\n')
    expect(result.status).toBe(0)
  })
})
