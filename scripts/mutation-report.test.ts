import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { afterEach, beforeEach, describe, expect, test } from 'vite-plus/test'

const SCRIPT = path.resolve(import.meta.dirname, 'mutation-report.ts')

let dir: string

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'mutation-report-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

type Status = 'Killed' | 'Timeout' | 'Survived' | 'NoCoverage' | 'CompileError'

function mutant(status: Status, line: number, replacement = '""') {
  return {
    mutatorName: 'StringLiteral',
    replacement,
    status,
    location: { start: { line, column: 1 }, end: { line, column: 9 } },
  }
}

function writeReport(
  pkg: string,
  files: Record<string, ReturnType<typeof mutant>[]>,
  breakAt: number | null = 60,
) {
  const reportDir = path.join(dir, 'packages', pkg, 'reports', 'mutation')
  mkdirSync(reportDir, { recursive: true })
  writeFileSync(
    path.join(reportDir, 'mutation.json'),
    JSON.stringify({
      files: Object.fromEntries(
        Object.entries(files).map(([file, mutants]) => [file, { mutants }]),
      ),
      thresholds: { high: 85, low: 70, break: breakAt },
    }),
  )
}

function run() {
  const summaryFile = path.join(dir, 'summary.md')
  writeFileSync(summaryFile, '')
  const result = spawnSync(process.execPath, [SCRIPT, dir], {
    env: { ...process.env, GITHUB_STEP_SUMMARY: summaryFile },
    encoding: 'utf8',
  })
  if (result.error) throw result.error
  return {
    status: result.status,
    annotations: result.stdout.split('\n').filter((l) => l.startsWith('::')),
    stdout: result.stdout,
    summary: readFileSync(summaryFile, 'utf8'),
  }
}

describe('scripts/mutation-report.ts', () => {
  test('with no report, says so and exits 0', () => {
    const result = run()

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('nothing to summarize')
    expect(result.summary).toBe('')
  })

  test('scores each package on its own', () => {
    writeReport('store', {
      'src/a.ts': [
        mutant('Killed', 1),
        mutant('Timeout', 2),
        mutant('Survived', 3),
      ],
      'src/b.ts': [mutant('NoCoverage', 4), mutant('CompileError', 5)],
    })
    writeReport('agent', { 'src/c.ts': [mutant('Killed', 1)] })

    const { summary, status } = run()

    // store: 2 detected out of 4, the compile error counts on neither side.
    expect(summary).toContain('## Mutation testing ❌')
    expect(summary).toContain('fails below 60%')
    expect(summary).toContain('| `packages/agent` | 100.00% | 1 | ✅ |')
    expect(summary).toContain('| `packages/store` | 50.00% | 5 | ❌ |')
    expect(summary).toContain('| `packages/store/src/a.ts` | 66.67% | 3 |')
    expect(summary).toContain('| `packages/store/src/b.ts` | 0.00% | 2 |')
    expect(summary.indexOf('packages/agent`')).toBeLessThan(
      summary.indexOf('packages/store`'),
    )
    expect(status).toBe(0)
  })

  test('passes when every package is at or above its break threshold', () => {
    writeReport('store', {
      'src/a.ts': [
        mutant('Killed', 1),
        mutant('Killed', 2),
        mutant('Survived', 3),
      ],
    })

    expect(run().summary).toContain('## Mutation testing ✅')
  })

  test('says so when packages have different break thresholds', () => {
    writeReport('store', { 'src/a.ts': [mutant('Killed', 1)] }, 60)
    writeReport('agent', { 'src/a.ts': [mutant('Killed', 1)] }, 80)

    expect(run().summary).toContain('against its own break threshold')
  })

  test('annotates each surviving and uncovered mutant at its repo-relative line', () => {
    writeReport('store', {
      'src/a.ts': [mutant('Killed', 1), mutant('Survived', 3, "default('')")],
    })
    writeReport('client', {
      'src/features/chat/utils/parts.ts': [mutant('NoCoverage', 7, 'false')],
    })

    expect(run().annotations).toEqual([
      '::warning file=packages/client/src/features/chat/utils/parts.ts,line=7,endLine=7,title=Mutant not covered by any test::StringLiteral: false',
      "::warning file=packages/store/src/a.ts,line=3,endLine=3,title=Mutant survived::StringLiteral: default('')",
    ])
  })

  test('escapes workflow-command characters in an annotation', () => {
    writeReport('store', {
      'src/a,b.ts': [mutant('Survived', 1, '100%\nnext')],
    })

    expect(run().annotations).toEqual([
      '::warning file=packages/store/src/a%2Cb.ts,line=1,endLine=1,title=Mutant survived::StringLiteral: 100%25%0Anext',
    ])
  })

  test('lists the mutants the tests let through in the summary', () => {
    writeReport('store', { 'src/a.ts': [mutant('Survived', 3, 'a | b')] })

    expect(run().summary).toContain(
      '| `packages/store/src/a.ts:3` | Survived | StringLiteral | `a \\| b` |',
    )
  })

  test('a package with no valid mutants scores n/a and passes', () => {
    writeReport('store', { 'src/a.ts': [mutant('CompileError', 1)] })

    expect(run().summary).toContain('| `packages/store` | n/a | 1 | ✅ |')
  })
})
