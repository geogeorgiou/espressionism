import type { CalculatorFill } from '@espressionism/agent/contract'
import { analyze, fillTool } from '@espressionism/calculator'
import type { Analysis } from '@espressionism/calculator'
import { useSelector } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'

import type { CalculatorHandle } from '@/features/chat/hooks/use-chat'
import { useAppForm } from '@/features/common/form/form'
import {
  useToolInvokedAt,
  useWebMcpTool,
} from '@/features/webmcp/hooks/use-webmcp-tool'
import { useWebMcpStore } from '@/features/webmcp/stores/webmcp-store'
import { Route } from '@/routes/index'

import type { CalculatorValues } from '../constants'
import { DEFAULT_INPUTS, calculatorSchema } from '../constants'
import { calculatorFormOptions } from '../utils/form-options'

/** Where the calculator's last valid values live between visits. */
export interface CalculatorUrl {
  /** The values in the URL now: any subset, already validated. */
  search: Partial<CalculatorValues>
  /** Replaces the URL's values, without a history entry or a scroll. */
  save: (values: CalculatorValues) => void
}

/** Wait after the last keystroke before the URL follows the form. */
const URL_SYNC_MS = 400

const ANNOTATIONS: WebMCP.ToolAnnotations = {
  readOnlyHint: false,
  untrustedContentHint: false,
  consequentialHint: false,
  debugging: false,
}

/** The calculator route's URL, as `useCalculator` reads and writes it. */
export function useCalculatorUrl(): CalculatorUrl {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return {
    search,
    save: (values) =>
      void navigate({ search: values, replace: true, resetScroll: false }),
  }
}

/**
 * The calculator page's state: the form, the values the results show (the
 * form's when valid, otherwise the URL's, which are the last valid ones),
 * their analysis, and both agents' way in. A visitor's agent fills it over
 * WebMCP (`fill_calculator`, registered while mounted) and Robospresso
 * through `chat`; either way the changed fields land on the form as if
 * typed, and `agentFilledAt` moves. The URL follows valid values, debounced,
 * so a result can be bookmarked or shared.
 */
export function useCalculator({ search, save }: CalculatorUrl) {
  const form = useAppForm({
    ...calculatorFormOptions,
    defaultValues: { ...DEFAULT_INPUTS, ...search },
    listeners: {
      onChangeDebounceMs: URL_SYNC_MS,
      onChange: ({ formApi }) => {
        const parsed = calculatorSchema.safeParse(formApi.state.values)
        if (parsed.success) save(parsed.data)
      },
    },
  })

  const readValues = useCallback(() => {
    const parsed = calculatorSchema.safeParse(form.state.values)
    return parsed.success ? parsed.data : undefined
  }, [form])

  const putOnForm = useCallback(
    ({ changes, values }: CalculatorFill) => {
      for (const name of Object.keys(changes) as (keyof CalculatorValues)[]) {
        form.setFieldValue(name, values[name])
      }
    },
    [form],
  )

  // The WebMCP adapter records the call itself after `onResult`.
  useWebMcpTool(fillTool, {
    annotations: ANNOTATIONS,
    context: () => ({ current: form.state.values }),
    onResult: putOnForm,
  })
  const agentFilledAt = useToolInvokedAt(fillTool.name)

  const chat = useMemo<CalculatorHandle>(
    () => ({
      getValues: readValues,
      apply: (fill) => {
        putOnForm(fill)
        useWebMcpStore.getState().recordInvocation(fillTool.name)
      },
    }),
    [readValues, putOnForm],
  )

  const formValues = useSelector(form.store, (state) => state.values)
  const parsed = calculatorSchema.safeParse(formValues)
  const values: CalculatorValues = parsed.success
    ? parsed.data
    : { ...DEFAULT_INPUTS, ...search }
  const analysis: Analysis = analyze(values)

  return { form, values, analysis, agentFilledAt, chat }
}
