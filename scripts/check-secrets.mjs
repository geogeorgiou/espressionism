#!/usr/bin/env node
/**
 * Proves the Gemini API key never reaches the client bundle.
 *
 * 1. Builds the client with a fake "canary" key into a temp folder (the real
 *    dist/ is left alone) and searches every output file for it. The build
 *    reads the key (vite.config.ts derives __CHAT_LIVE__ from it), so this
 *    is exactly the path a leak would take.
 * 2. Scans the existing build outputs (packages/{client,agent}/dist) for
 *    anything shaped like a Google API key, in case a real one slipped in.
 *
 * No network, no model calls. Run from the repo root:
 *   pnpm check:secrets
 */
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const client = join(root, 'packages/client')

/** Google API keys: "AIza" + 35 URL-safe characters. */
const GOOGLE_KEY = /AIza[0-9A-Za-z_-]{35}/

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* files(path)
    else yield path
  }
}

/** Every file under `dir` whose contents match. */
function find(dir, test) {
  return [...files(dir)].filter((path) => test(readFileSync(path, 'latin1')))
}

let failed = false
const fail = (message) => {
  console.error(`✗ ${message}`)
  failed = true
}

// 1. Canary build
const canary = `AIza${randomBytes(27).toString('base64url').slice(0, 35)}`
const outDir = mkdtempSync(join(tmpdir(), 'espressionism-secrets-'))
try {
  console.log('Building the client with a canary key…')
  execFileSync(
    'pnpm',
    ['exec', 'vp', 'build', '--outDir', outDir, '--emptyOutDir'],
    {
      cwd: client,
      stdio: ['ignore', 'ignore', 'inherit'],
      env: { ...process.env, GOOGLE_GENERATIVE_AI_API_KEY: canary },
    },
  )
  const leaks = find(outDir, (text) => text.includes(canary))
  if (leaks.length > 0) {
    fail(`the API key reached the build output:\n  ${leaks.join('\n  ')}`)
  } else {
    console.log(
      `✓ canary key absent from ${[...files(outDir)].length} built files`,
    )
  }
} finally {
  rmSync(outDir, { recursive: true, force: true })
}

// 2. Existing outputs
for (const dist of ['packages/client/dist', 'packages/agent/dist']) {
  const dir = join(root, dist)
  if (!existsSync(dir)) continue
  const hits = find(dir, (text) => GOOGLE_KEY.test(text))
  if (hits.length > 0) {
    fail(
      `something shaped like a Google API key is in ${dist}:\n  ${hits.join('\n  ')}`,
    )
  } else {
    console.log(`✓ no Google API key pattern in ${dist}`)
  }
}

process.exit(failed ? 1 : 0)
