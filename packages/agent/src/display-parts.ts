/**
 * What a display tool part means, read in one place for the handler (the
 * memory note), the reply (did the visitor get anything to look at) and the
 * chat (what to draw, what to put on the form). Pure, no server code: the
 * contract re-exports it to the browser.
 */
import { fillTool } from '@espressionism/calculator'
import type { Machine, SearchResult } from '@espressionism/store'
import type { AnyToolDef, ToolOutput } from '@espressionism/tool'
import { getToolName, isToolUIPart } from 'ai'
import type { UIMessage } from 'ai'

import {
  MAX_SHOWN_MACHINES,
  showMachinesTool,
  showStoreLinkTool,
} from './display-tools'

/** Skeleton cards while `show_machines` streams, before its slugs arrive. */
const LOADING_CARDS = 2

const DISPLAY_TOOL_NAMES = [
  showMachinesTool.name,
  showStoreLinkTool.name,
  fillTool.name,
] as const

/** A tool whose parts the chat draws. */
export type DisplayToolName = (typeof DISPLAY_TOOL_NAMES)[number]

/** True for the tools whose parts the chat draws (not the store search). */
export function isDisplayTool(name: string): name is DisplayToolName {
  return (DISPLAY_TOOL_NAMES as readonly string[]).includes(name)
}

/** A successful `fill_calculator` answer: the changes, values and analysis. */
export type CalculatorFill = Success<typeof fillTool>

/** One display tool part, read: what it shows once it's worth showing. */
export type DisplayPart =
  | { tool: 'show_machines'; state: 'loading'; count: number }
  | { tool: 'show_machines'; state: 'done'; machines: Machine[] }
  | ({ tool: 'show_store_link' } & Pick<
      SearchResult,
      'filters' | 'sort' | 'total'
    >)
  | { tool: 'fill_calculator'; fill: CalculatorFill }

type Success<D extends AnyToolDef> = Extract<ToolOutput<D>, { ok: true }>

/** Any message's part: typed Robospresso parts and plain UI ones alike. */
type AnyPart = UIMessage['parts'][number]

/**
 * A message part as a display part, or null when there's nothing to show:
 * any other part, a call still streaming (except `show_machines`, which
 * shows skeleton cards), a failed call, or output that breaks the contract.
 * Never throws.
 */
export function readDisplayPart(part: AnyPart): DisplayPart | null {
  if (!isToolUIPart(part)) return null
  const name = getToolName(part)
  if (
    name === showMachinesTool.name &&
    (part.state === 'input-streaming' || part.state === 'input-available')
  ) {
    return { tool: name, state: 'loading', count: loadingCount(part.input) }
  }
  if (part.state !== 'output-available') return null
  switch (name) {
    case showMachinesTool.name: {
      const output = success(showMachinesTool, part.output)
      return output && { tool: name, state: 'done', machines: output.items }
    }
    case showStoreLinkTool.name: {
      const output = success(showStoreLinkTool, part.output)
      return (
        output && {
          tool: name,
          filters: output.filters,
          sort: output.sort,
          total: output.total,
        }
      )
    }
    case fillTool.name: {
      const output = success(fillTool, part.output)
      return output && { tool: name, fill: output }
    }
    default:
      return null
  }
}

/** One skeleton per slug asked for so far, within what a call may show. */
function loadingCount(input: unknown): number {
  const slugs =
    typeof input === 'object' && input !== null && 'slugs' in input
      ? input.slugs
      : undefined
  const asked = Array.isArray(slugs) ? slugs.length : LOADING_CARDS
  return Math.min(Math.max(asked, 1), MAX_SHOWN_MACHINES)
}

/** The tool's successful output, or null for a failure or a bad shape. */
function success<D extends AnyToolDef>(
  def: D,
  output: unknown,
): Success<D> | null {
  const parsed = def.outputSchema.safeParse(output)
  return parsed.success && parsed.data.ok ? (parsed.data as Success<D>) : null
}
