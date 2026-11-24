/**
 * One definition per agent tool. A tool is defined once, in the package that
 * owns its data (the store, the calculator, the agent's display tools), and
 * every host adapts the same definition: Robospresso's model through the AI
 * SDK (`aiTool` in `packages/agent`), a visitor's in-browser agent through
 * WebMCP (`useWebMcpTool` in the client). Parsing untrusted input, the
 * failure shape and the JSON Schema live here, so the hosts only translate.
 */
import { z } from 'zod'

/** One problem with a call: the field at fault, or "input". */
export const toolErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
})

export type ToolError = z.infer<typeof toolErrorSchema>

/** What every tool answers when it can't run: the model can fix and retry. */
export const toolFailureSchema = z.object({
  ok: z.literal(false),
  errors: z.array(toolErrorSchema),
})

export type ToolFailure = z.infer<typeof toolFailureSchema>

interface Issue {
  readonly path: readonly PropertyKey[]
  readonly message: string
}

/**
 * Zod issues (or hand-made ones, `{ path: ['slugs'], message }`) as a tool
 * failure. An issue with no path is reported against "input".
 */
export function toolFailure(issues: readonly Issue[]): ToolFailure {
  return {
    ok: false,
    errors: issues.map((issue) => ({
      field: issue.path.length > 0 ? issue.path.map(String).join('.') : 'input',
      message: issue.message,
    })),
  }
}

/** A tool's answer: its output with `ok: true`, or the failure. */
export type ToolResult<Out extends z.ZodObject> =
  | ({ ok: true } & z.output<Out>)
  | ToolFailure

/** `ctx` is optional when the tool can run without one. */
type ContextArgs<Ctx> = undefined extends Ctx ? [ctx?: Ctx] : [ctx: Ctx]

export interface ToolSpec<
  Name extends string,
  In extends z.ZodObject,
  Out extends z.ZodObject,
  Ctx,
> {
  /** snake_case, the same for every host. */
  name: Name
  title: string
  description: string
  /**
   * What agents may send. Keep it flat and `.strict()`, with plain checks
   * that map to JSON Schema and `.meta({ description })` last in each chain:
   * agents only ever see the JSON Schema.
   */
  input: In
  /** A successful answer, without `ok` (the definition adds it). */
  output: Out
  /**
   * Runs on input that already passed `input`. Returns the output, or a
   * failure (`toolFailure`) for rules the input schema can't carry. Must
   * not throw.
   */
  run: (input: z.output<In>, ctx: Ctx) => z.output<Out> | ToolFailure
}

export interface ToolDef<
  Name extends string,
  In extends z.ZodObject,
  Out extends z.ZodObject,
  Ctx,
> {
  readonly name: Name
  readonly title: string
  readonly description: string
  readonly input: In
  readonly output: Out
  /** `ok: true` and the output, or the failure: what hosts parse. */
  readonly outputSchema: z.ZodType<ToolResult<Out>>
  /** The input's JSON Schema, built once: the same object on every read. */
  readonly jsonSchema: z.core.JSONSchema.BaseSchema
  /**
   * Parses untrusted input (missing input is an empty object), then runs
   * the tool. Never throws: bad input comes back as a failure.
   */
  run: (raw: unknown, ...ctx: ContextArgs<Ctx>) => ToolResult<Out>
}

/** Any tool, whatever its context. */
export type AnyToolDef = ToolDef<string, z.ZodObject, z.ZodObject, never>

/** What a tool's `run` returns. */
export type ToolOutput<D extends AnyToolDef> = ReturnType<D['run']>

/** What a tool's `run` needs besides the input. */
export type ToolContext<D extends AnyToolDef> =
  D extends ToolDef<string, z.ZodObject, z.ZodObject, infer Ctx> ? Ctx : never

/** A tool's input and output types, as the AI SDK's UI messages want them. */
export type ToolTypes<D extends AnyToolDef> = {
  input: z.output<D['input']>
  output: ToolOutput<D>
}

function isFailure(result: object): result is ToolFailure {
  return 'ok' in result && result.ok === false
}

export function defineTool<
  Name extends string,
  In extends z.ZodObject,
  Out extends z.ZodObject,
  Ctx = undefined,
>(spec: ToolSpec<Name, In, Out, Ctx>): ToolDef<Name, In, Out, Ctx> {
  const outputSchema = z.discriminatedUnion('ok', [
    spec.output.extend({ ok: z.literal(true) }),
    toolFailureSchema,
  ]) as unknown as z.ZodType<ToolResult<Out>>
  let jsonSchema: z.core.JSONSchema.BaseSchema | undefined

  return {
    name: spec.name,
    title: spec.title,
    description: spec.description,
    input: spec.input,
    output: spec.output,
    outputSchema,
    get jsonSchema() {
      jsonSchema ??= z.toJSONSchema(spec.input)
      return jsonSchema
    },
    run: (raw, ...[ctx]) => {
      const parsed = spec.input.safeParse(raw ?? {})
      if (!parsed.success) return toolFailure(parsed.error.issues)
      const result = spec.run(parsed.data, ctx as Ctx)
      if (isFailure(result)) return result
      return { ok: true, ...result }
    },
  }
}
