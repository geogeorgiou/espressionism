#!/usr/bin/env node
/**
 * Summarizes each package's Stryker report as a job summary and annotations.
 * See docs/adr/0001-adopt-stryker-mutation-testing.md.
 *
 * Usage: scripts/mutation-report.ts [root]
 */
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

type Position = { line: number; column: number }
type Mutant = {
  mutatorName: string
  replacement?: string
  status: string
  location: { start: Position; end: Position }
}
type Report = {
  files: Record<string, { mutants: Mutant[] }>
  thresholds: { high: number; low: number; break: number | null }
}
type PackageReport = {
  pkg: string
  files: [file: string, mutants: Mutant[]][]
  breakAt: number | null
}

const UNDETECTED = new Set(['Survived', 'NoCoverage'])
const DETECTED = new Set(['Killed', 'Timeout'])

function score(mutants: Mutant[]): number | null {
  const detected = mutants.filter((m) => DETECTED.has(m.status)).length
  const undetected = mutants.filter((m) => UNDETECTED.has(m.status)).length
  const valid = detected + undetected
  return valid === 0 ? null : (detected / valid) * 100
}

const formatScore = (value: number | null) =>
  value === null ? 'n/a' : `${value.toFixed(2)}%`

const escapeData = (text: string) =>
  text.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')

const escapeProperty = (text: string) =>
  escapeData(text).replaceAll(':', '%3A').replaceAll(',', '%2C')

const cell = (text: string) => text.replaceAll('|', '\\|').replace(/\s+/g, ' ')

function annotation(file: string, mutant: Mutant): string {
  const { start, end } = mutant.location
  const title =
    mutant.status === 'NoCoverage'
      ? 'Mutant not covered by any test'
      : 'Mutant survived'
  const props = [
    `file=${escapeProperty(file)}`,
    `line=${start.line}`,
    `endLine=${end.line}`,
    `title=${escapeProperty(title)}`,
  ].join(',')
  return `::warning ${props}::${escapeData(`${mutant.mutatorName}: ${mutant.replacement ?? ''}`)}`
}

function readReports(root: string): PackageReport[] {
  const packages = path.join(root, 'packages')
  if (!existsSync(packages)) return []
  return readdirSync(packages)
    .toSorted((a, b) => a.localeCompare(b))
    .flatMap((name) => {
      const pkg = `packages/${name}`
      const file = path.join(root, pkg, 'reports', 'mutation', 'mutation.json')
      if (!existsSync(file)) return []
      const report = JSON.parse(readFileSync(file, 'utf8')) as Report
      const files = Object.entries(report.files)
        .map(([f, { mutants }]): [string, Mutant[]] => [`${pkg}/${f}`, mutants])
        .toSorted(([a], [b]) => a.localeCompare(b))
      return [{ pkg, files, breakAt: report.thresholds.break }]
    })
}

function failed({ files, breakAt }: PackageReport): boolean {
  const total = score(files.flatMap(([, mutants]) => mutants))
  return total !== null && breakAt !== null && total < breakAt
}

function summary(reports: PackageReport[]): string {
  const all = reports.flatMap(({ files }) => files.flatMap(([, m]) => m))
  const count = (status: string) =>
    all.filter((m) => m.status === status).length
  const anyFailed = reports.some(failed)
  const breaks = [...new Set(reports.map((r) => r.breakAt))]

  const lines = [
    `## Mutation testing ${anyFailed ? '❌' : '✅'}`,
    '',
    breaks.length === 1 && breaks[0] !== null
      ? `Each package is scored on its own and fails below ${breaks[0]}%. Only the lines this PR changed are mutated.`
      : 'Each package is scored on its own, against its own break threshold. Only the lines this PR changed are mutated.',
    '',
    `Killed ${count('Killed')} · Timeout ${count('Timeout')} · Survived ${count('Survived')} · No coverage ${count('NoCoverage')}`,
    '',
    '| Package | Score | Mutants | |',
    '| --- | --- | --- | --- |',
    ...reports.map((report) => {
      const mutants = report.files.flatMap(([, m]) => m)
      return `| \`${cell(report.pkg)}\` | ${formatScore(score(mutants))} | ${mutants.length} | ${failed(report) ? '❌' : '✅'} |`
    }),
    '',
    '| File | Score | Mutants |',
    '| --- | --- | --- |',
    ...reports.flatMap(({ files }) =>
      files.map(
        ([file, mutants]) =>
          `| \`${cell(file)}\` | ${formatScore(score(mutants))} | ${mutants.length} |`,
      ),
    ),
  ]

  const undetected = reports.flatMap(({ files }) =>
    files.flatMap(([file, mutants]) =>
      mutants.filter((m) => UNDETECTED.has(m.status)).map((m) => ({ file, m })),
    ),
  )
  if (undetected.length > 0) {
    lines.push(
      '',
      '### Mutants the tests let through',
      '',
      '| Where | Status | Mutator | Replacement |',
      '| --- | --- | --- | --- |',
      ...undetected.map(
        ({ file, m }) =>
          `| \`${cell(file)}:${m.location.start.line}\` | ${m.status} | ${m.mutatorName} | \`${cell(m.replacement ?? '')}\` |`,
      ),
    )
  }
  return `${lines.join('\n')}\n`
}

const reports = readReports(process.argv[2] ?? process.cwd())

if (reports.length === 0) {
  console.log('No mutation reports, so there is nothing to summarize.')
  process.exit(0)
}

for (const { files } of reports) {
  for (const [file, mutants] of files) {
    for (const mutant of mutants) {
      if (UNDETECTED.has(mutant.status)) console.log(annotation(file, mutant))
    }
  }
}

const markdown = summary(reports)
const summaryFile = process.env.GITHUB_STEP_SUMMARY
if (summaryFile) appendFileSync(summaryFile, markdown)
else console.log(markdown)
