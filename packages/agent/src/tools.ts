import { fillTool } from '@espressionism/calculator'
import type { CalculatorValues } from '@espressionism/calculator'
import { searchTool } from '@espressionism/store'
import type { AnyToolDef, ToolOutput } from '@espressionism/tool'
import { tool } from 'ai'
import type { Tool } from 'ai'
import type { z } from 'zod'

import { showMachinesTool, showStoreLinkTool } from './display-tools'

/** `run`'s arguments after the input: the context, if the tool takes one. */
type ContextArgs<D extends AnyToolDef> =
  Parameters<D['run']> extends [unknown, ...infer Rest] ? Rest : never

/**
 * A tool definition as an AI SDK tool: the AI SDK hands the model an
 * `error-text` result for input that breaks the schema; everything else
 * goes through `def.run`, which also applies the rules JSON Schema can't
 * carry (min ≤ max) and answers `{ ok: false, errors }` instead of throwing.
 */
export function aiTool<D extends AnyToolDef>(
  def: D,
  ...ctx: ContextArgs<D>
): Tool<z.output<D['input']>, ToolOutput<D>> {
  const run = def.run as (raw: unknown, ...ctx: unknown[]) => ToolOutput<D>
  return tool<unknown, unknown, Record<string, unknown>>({
    title: def.title,
    description: def.description,
    inputSchema: def.input as z.ZodType,
    execute: (input: unknown) => run(input, ...ctx),
  }) as Tool<z.output<D['input']>, ToolOutput<D>>
}

/**
 * Every tool for one answer. Keys are the names the model sees;
 * `fill_calculator` merges onto the values the page sent with the question.
 */
export function replyTools(current: CalculatorValues) {
  return {
    [searchTool.name]: aiTool(searchTool),
    [showMachinesTool.name]: aiTool(showMachinesTool),
    [showStoreLinkTool.name]: aiTool(showStoreLinkTool),
    [fillTool.name]: aiTool(fillTool, { current }),
  }
}
