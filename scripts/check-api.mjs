// Loads every Vercel Function in api/ with Node's own module loader (types
// stripped natively, as on Vercel) and checks that it exports a POST handler.
// Catches what neither Vite nor the bundle sees: a function file Node can't
// load, e.g. the root package.json losing "type": "module". Run after
// `pnpm build`: the functions import the agent's built package.
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const API_DIR = join(import.meta.dirname, '..', 'api')
const files = (await readdir(API_DIR)).filter((file) => file.endsWith('.ts'))

let failed = false
for (const file of files) {
  try {
    const mod = await import(pathToFileURL(join(API_DIR, file)).href)
    if (typeof mod.POST !== 'function') throw new Error('no POST export')
    console.log(`ok   api/${file}`)
  } catch (error) {
    failed = true
    console.error(
      `FAIL api/${file}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

if (files.length === 0) {
  console.error('FAIL no functions found in api/')
  failed = true
}
process.exitCode = failed ? 1 : 0
