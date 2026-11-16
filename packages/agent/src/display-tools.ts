/**
 * Robospresso's own display tools: the model picks what to show, every fact
 * on screen comes from the catalog. Defined with `defineTool` like the
 * store's and the calculator's tools, but only Robospresso gets them (never
 * WebMCP). Pure, no server code: the contract re-exports their output
 * schemas to the browser.
 */
import {
  findMachine,
  machineSchema,
  searchResultSchema,
  searchTool,
} from '@espressionism/store'
import { defineTool, toolFailure } from '@espressionism/tool'
import { z } from 'zod'

/** Most machines one `show_machines` call puts on screen. */
export const MAX_SHOWN_MACHINES = 5

/** Draws machines as product cards under the reply, in the model's order. */
export const showMachinesTool = defineTool({
  name: 'show_machines',
  title: 'Show machines as cards',
  description:
    'Show the machines you recommend as product cards in the chat, with name, price, rating and a link to the product page. Call it once with your picks after searching, instead of listing them in your text.',
  input: z
    .object({
      slugs: z
        .array(z.string().min(1))
        .min(1)
        .max(MAX_SHOWN_MACHINES)
        .meta({
          description: `Slugs of the machines to show, best pick first, 1–${MAX_SHOWN_MACHINES}. Take them from the url of a search result (/store/<slug>).`,
        }),
    })
    .strict(),
  output: z.object({ items: z.array(machineSchema).min(1) }),
  run: ({ slugs }) => {
    const unique = [...new Set(slugs)]
    const unknown = unique.filter((slug) => !findMachine(slug))
    if (unknown.length > 0) {
      return toolFailure(
        unknown.map((slug) => ({
          path: ['slugs'],
          message: `No machine with slug "${slug}". Use slugs from search results only.`,
        })),
      )
    }
    return { items: unique.flatMap((slug) => findMachine(slug) ?? []) }
  },
})

/**
 * A "See all in the store" link carrying the search's filters to `/store`.
 * Runs the shared search so the link's count and rules match the store page.
 */
export const showStoreLinkTool = defineTool({
  name: 'show_store_link',
  title: 'Link to the store',
  description:
    'Show a link that opens the store page with these filters applied. Use it when more machines match than you showed. Send the same filters as your search.',
  input: searchTool.input.omit({ limit: true }),
  output: searchResultSchema.pick({ filters: true, sort: true, total: true }),
  run: (input) => {
    const result = searchTool.run(input)
    if (!result.ok) return result
    const { filters, sort, total } = result
    return { filters, sort, total }
  },
})
