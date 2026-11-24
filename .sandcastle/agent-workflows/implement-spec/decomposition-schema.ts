import { z } from 'zod/v4'

// The first loop's answer: one spec turned into an ordered queue of tickets.
// agent-implement-spec.yml creates one GitHub issue per entry, in `position`
// order, and the chain then works through them one at a time.
export const specDecompositionSchema = z
  .strictObject({
    tickets: z
      .array(
        z.strictObject({
          position: z
            .number()
            .int()
            .min(1)
            .describe(
              'Build order, starting at 1. The chain always takes the lowest open position whose dependencies are closed.',
            ),
          title: z
            .string()
            .max(100)
            .describe(
              'The issue title. Say what the ticket delivers, not which layer it edits.',
            ),
          body: z
            .string()
            .describe(
              'The ticket. Markdown, with a `## What` and a `## Done when` — the second is what the review workflow checks the pull request against, so it has to be checkable from a diff.',
            ),
          shape: z
            .enum(['package', 'feature', 'ui-only', 'tooling', 'cross-cutting'])
            .describe(
              "Where the ticket's change mostly lands. `package`: shared logic in packages/calculator, store, tool or agent, with its unit tests. `feature`: app behaviour under packages/client/src/features/ behind a hook or util, with its tests. `ui-only`: components and what they render, no behaviour change. `tooling`: build, lint, test or CI config — check docs/adr/ first. `cross-cutting`: more than one of these at once — usually a ticket worth splitting.",
            ),
          depends_on: z
            .array(z.number().int().min(1))
            .describe(
              'Positions that must be finished first. Empty means it can be built the moment the queue opens — those are the ones that could run in parallel.',
            ),
        }),
      )
      .min(1)
      .max(12)
      .describe(
        'The queue, in build order. Keep it short. A queue longer than about eight is a spec that wanted decomposing into two specs.',
      ),
  })
  .describe('The spec, cut into an ordered queue of tickets.')
