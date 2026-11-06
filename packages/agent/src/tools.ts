import {
  SEARCH_TOOL,
  findMachine,
  runStoreSearch,
  searchToolInputSchema,
} from '@espressionism/store'
import { tool } from 'ai'
import { z } from 'zod'

import type { ShowMachinesOutput, ShowStoreLinkOutput } from './contract'
import { DISPLAY_TOOLS, MAX_SHOWN_MACHINES } from './contract'

/**
 * The store search, adapted for the AI SDK. The definition, validation and
 * search all come from `@espressionism/store` (the WebMCP tool on the store
 * page uses the same ones); this file only translates.
 */
export const storeSearchTool = tool({
  title: SEARCH_TOOL.title,
  description: SEARCH_TOOL.description,
  inputSchema: searchToolInputSchema,
  // The SDK has already parsed the input; running it through the shared
  // validator again also applies the min ≤ max rule the model never sees.
  execute: (input) => runStoreSearch(input),
})

export const showMachinesInputSchema = z
  .object({
    slugs: z
      .array(z.string().min(1))
      .min(1)
      .max(MAX_SHOWN_MACHINES)
      .meta({
        description: `Slugs of the machines to show, best pick first, 1–${MAX_SHOWN_MACHINES}. Take them from the url of a search result (/store/<slug>).`,
      }),
  })
  .strict()

/**
 * Draws machines as product cards under the reply. The model picks which
 * ones; every fact on a card comes from the catalog, never from the model.
 */
export const showMachinesTool = tool({
  title: 'Show machines as cards',
  description:
    'Show the machines you recommend as product cards in the chat, with name, price, rating and a link to the product page. Call it once with your picks after searching, instead of listing them in your text.',
  inputSchema: showMachinesInputSchema,
  execute: ({ slugs }): ShowMachinesOutput => {
    const unique = [...new Set(slugs)]
    const unknown = unique.filter((slug) => !findMachine(slug))
    if (unknown.length > 0) {
      return {
        ok: false,
        errors: unknown.map((slug) => ({
          field: 'slugs',
          message: `No machine with slug "${slug}". Use slugs from search results only.`,
        })),
      }
    }
    return {
      ok: true,
      items: unique.flatMap((slug) => findMachine(slug) ?? []),
    }
  },
})

export const showStoreLinkInputSchema = searchToolInputSchema.omit({
  limit: true,
})

/**
 * A "See all in the store" link carrying the search's filters to `/store`.
 * Runs the shared search so the link's count and rules match the store page.
 */
export const showStoreLinkTool = tool({
  title: 'Link to the store',
  description:
    'Show a link that opens the store page with these filters applied. Use it when more machines match than you showed. Send the same filters as your search.',
  inputSchema: showStoreLinkInputSchema,
  execute: (input): ShowStoreLinkOutput => {
    const result = runStoreSearch(input)
    if (!result.ok) return result
    const { filters, sort, total } = result
    return { ok: true, filters, sort, total }
  },
})

/** Every tool Robospresso may call. Keys are the names the model sees. */
export const STORE_TOOLS = {
  [SEARCH_TOOL.name]: storeSearchTool,
  [DISPLAY_TOOLS.showMachines]: showMachinesTool,
  [DISPLAY_TOOLS.showStoreLink]: showStoreLinkTool,
}
