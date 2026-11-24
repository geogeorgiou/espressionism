import * as path from 'node:path'

import * as sandcastle from '@ai-hero/sandcastle'
import { noSandbox } from '@ai-hero/sandcastle/sandboxes/no-sandbox'

import { claudeAgent, writeJson } from '../shared/common.ts'
import { extractionPrompt } from '../shared/extraction-prompt.ts'
import { runWithExtraction } from '../shared/run-with-extraction.ts'
import { specDecompositionSchema } from './decomposition-schema.ts'

// This loop writes tickets, not code, and the workflow step after this one is
// what actually creates them.
const result = await runWithExtraction({
  name: 'decompose',
  agent: claudeAgent(),
  sandbox: noSandbox(),
  logging: { type: 'stdout' },
  promptFile: path.join(import.meta.dirname, 'decompose-prompt.md'),
  output: sandcastle.Output.object({
    tag: 'queue',
    schema: specDecompositionSchema,
  }),
  extractionPrompt: extractionPrompt('queue', specDecompositionSchema),
})

writeJson('queue.json', result.output)
