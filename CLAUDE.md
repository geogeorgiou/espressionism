# CLAUDE.md

## Monorepo structure

```
api/
  chat.ts   — Vercel Function: POST /api/chat, a thin adapter over the agent
packages/
  agent/       — @espressionism/agent: Robospresso's brain (framework-free)
  calculator/  — @espressionism/calculator: the calculator's schema, pure cost model + fill tool
  client/      — TanStack Start frontend (SPA mode)
  store/       — @espressionism/store: the demo store's catalog + pure search
```

The layout mirrors `fullstack-app-starter`. Vercel serves the client's static build and runs `api/*.ts` as functions; see [Agent](#agent-packagesagent).

## Toolchain

pnpm workspace + **Vite+** (`vite-plus`, project-local `vp` CLI).

- One root `vite.config.ts` owns `fmt` (oxfmt), `lint` (oxlint + type checks) and `staged` for **all** packages. Never add `lint`/`fmt` blocks or `.oxlintrc`/`.oxfmtrc` files inside a package. Use `lint.overrides` with `packages/<pkg>/**` globs instead.
- Import Vitest APIs from `vite-plus/test`, never `vitest`. Import `defineConfig` in config files from `vite-plus`.
- A package script must not share a name with a Vite+ task in that package's `vite.config.ts` (`build` is a task, not a script).
- Relative imports stay extensionless (no `.ts` / `.tsx`).
- Shared dependency versions live in the `catalog` in `pnpm-workspace.yaml`; reference them with `"catalog:"`.
- Git hooks live in `.vite-hooks/` (pre-commit: `vp staged`; commit-msg: commitlint, Conventional Commits). Staged workflow files also go through `scripts/lint-actions.sh` (zizmor).

## GitHub Actions

Workflows in `.github/` are linted by [zizmor](https://docs.zizmor.sh): locally with `pnpm lint:actions`, in CI by `.github/workflows/zizmor.yml`. The CI job uploads SARIF to code scanning and never fails on findings itself; code scanning merge protection blocks the PR. Fix findings rather than suppressing them.

- Pin every action to a full commit SHA with a version comment: `uses: owner/repo@<sha> # vX.Y.Z`. Dependabot (`.github/dependabot.yml`, weekly, 7-day cooldown) bumps both together.
- Every `actions/checkout` sets `persist-credentials: false`.
- Workflow-level `permissions` stay minimal; grant anything extra per job.
- Dependabot opens routine update PRs. Use `pnpm actions:up` (actions-up, `scripts/actions-up.sh`) to update sooner or take a major bump by hand; it writes the same `sha # vX.Y.Z` pins with the same 7-day cooldown. Its flags live in that script (actions-up has no config file).
- The zizmor version is pinned in `zizmor.yml` (`version:`). Dependabot doesn't update it: bump it by hand, alongside your local `brew upgrade zizmor`.

## Commands

Run from the repo root:

- **Install:** `pnpm install`
- **Dev:** `pnpm dev` (client on http://localhost:3000)
- **Build (cached):** `pnpm build`
- **Format + lint + type check:** `pnpm check` (`pnpm check --fix` to autofix)
- **Unit tests:** `pnpm test:unit`
- **Secrets in the bundle:** `pnpm check:secrets` builds the client with a canary Gemini key into a temp folder and fails if it shows up in any output file; it also scans `dist/` for Google key patterns (`scripts/check-secrets.mjs`, runs in CI after the build). Run it after touching `vite.config.ts`, `vite/agent-api.ts` or anything that reads env.
- **Vercel Functions load:** `pnpm check:api` imports every `api/*.ts` with Node's own loader (native type stripping, module-type detection off, as on Vercel) and fails unless each one loads and exports `POST` (`scripts/check-api.mjs`, runs in CI after the build). Needs `pnpm build` first.
- **Lint GitHub Actions:** `pnpm lint:actions` (zizmor with online audits; needs `brew install zizmor` and `GH_TOKEN` or `gh auth login`)
- **Update GitHub Actions:** `pnpm actions:up` (interactive actions-up, then zizmor); `pnpm actions:outdated` only reports
- **README diagram:** `pnpm docs:architecture` redraws `docs/assets/architecture.svg` from the app's sprites (`scripts/generate-architecture.mjs`; needs network for the fonts). Rerun it when the architecture or a sprite changes.
- **E2E tests:** `pnpm test:e2e` (Playwright; builds the app and serves it with `vp preview` on :4173). First run: `pnpm --filter @espressionism/client exec playwright install chromium`. The specs expect the placeholder reply, but `vp preview` reads `packages/client/.env`: with a Gemini key there, the chat spec calls Gemini (and fails). Run them as `GOOGLE_GENERATIVE_AI_API_KEY= pnpm test:e2e`, as CI has no key.

Single test file (from `packages/client/`):

```bash
pnpm exec vp test run test/unit/features/calculator/components/CalculatorForm.test.tsx
```

## Agent (`packages/agent/`)

Everything behind the chat lives here, with no framework: `createChatHandler(config)` returns `(request: Request) => Promise<Response>`, so any host can serve it in a few lines. A request is one question (`{ sessionId?, text, calculator? }`); the server holds the conversation. Replies are an AI SDK **UI message stream** (SSE). Whether a model is configured is a **build-time flag**: `vite.config.ts` defines `__CHAT_LIVE__` (`isChatLive` in `vite/agent-api.ts`: is `GOOGLE_GENERATIVE_AI_API_KEY` set?), read as `CHAT_LIVE` in the chat's constants. The header badge shows a green "Live" or red "Offline" from it; only the boolean reaches the bundle, never the key. Change the key, then restart `pnpm dev` or rebuild. With a Gemini key it answers through `streamText` with four tools (the store search and three display tools); without one it streams the placeholder (`persona.ts`).

```
src/
├── contract.ts      — Zod HTTP contract (request, session part, error, display tool outputs, RobospressoMessage type)
├── handler.ts       — createChatHandler: POST only, 4 KB cap, validation, sessions, records answers, no leaked errors
├── memory.ts        — ConversationStore, createInMemoryStore (LRU + idle TTL, snapshot()), selectWindow
├── config.ts        — agentConfigFromEnv: key + model id → AgentConfig (no key → placeholder)
├── reply.ts         — createStoreReply({ model, limits }): streamText + the tools → UI message stream
├── tools.ts         — AI SDK tools: the store's shared search, show_machines, show_store_link, fill_calculator (replyTools)
├── stream.ts        — ReplyStream, textReply, the generic error and its logging
├── instructions.ts  — Robospresso's system instructions, off-topic and empty replies
├── persona.ts       — Robospresso's placeholder reply (streamed)
└── index.ts         — public API (re-exports the contract)
test/unit/       — handler, reply, memory and window tests (Vitest, node environment)
```

- **Model: Gemini, direct.** `@ai-sdk/google` with a Google AI Studio key; no AI Gateway. `createStoreReply` takes a model _object_ (`StoreModel` excludes strings): a bare `'creator/model'` string would route through the AI Gateway, the AI SDK's default global provider.
- **Env is injected.** The agent never reads `process.env`. Hosts pass their env to `agentConfigFromEnv`: `api/chat.ts` passes `process.env`, the Vite plugin passes `loadEnv(mode, envDir, '')`. Variables: `GOOGLE_GENERATIVE_AI_API_KEY` (a Vercel **Secret**; locally `packages/client/.env`, see `.env.example`) and optional `GEMINI_MODEL` (default `DEFAULT_GEMINI_MODEL`). Never give them a `VITE_` prefix.
- **Display tools (generative UI).** The model chooses _what_ to show, the client owns _how_. `show_machines({ slugs })` and `show_store_link(filters)` return catalog data (`{ ok: true, … }`) or `{ ok: false, errors }` for unknown slugs and bad filters, so the model can retry; their output schemas live in `contract.ts` and the client parses them before drawing. `fill_calculator(fields)` runs the shared `runCalculatorFill` on the values the page sent (`ReplyOptions.calculator`, else `DEFAULT_INPUTS`), so it's built per answer (`replyTools`); the browser applies each successful output to the form once per `toolCallId`. Input that breaks a tool's schema never reaches `execute`: the AI SDK hands the model an `error-text` result instead. A new kind of card = a display tool here (flat, `.strict()` input), its output schema in the contract, a view in the client's `toPartView` and a renderer in `MessageParts`. Display tools are for Robospresso only, never WebMCP.
- **Memory (server-held sessions).** The handler owns the conversation; the client sends only the new question plus the session id it read from the last reply.
  - Every reply opens with a **transient** `data-session { id, restarted }` part (reaches `useChat`'s `onData`, never `message.parts`). An unknown or expired id starts a new session with `restarted: true` (logged as `chat: session restarted`, no content); a malformed id is a 400; a second question while the session is answering is a 409.
  - Turns are text only (`chatTurnSchema`). The handler records the user turn up front and the assistant turn in `createUIMessageStream`'s `onEnd`, **only on `outcome.status === 'completed'`**. Replies report failure in-band, so the handler reads the reply's chunks and declares the outcome itself (`writer.setOutcome`): `merge()` doesn't carry an outcome, and error chunks never reach `responseMessage`. The assistant turn gets server-written notes, `[Cards shown: …]` and `[Calculator filled: …]`, so follow-ups can refer back.
  - The model reads `selectWindow(turns)`: the latest question plus older turns within 40 turns / 24,000 chars, always starting on a user turn.
  - `createInMemoryStore` holds sessions in one instance's memory (LRU, 500 sessions, 200 turns, 30 min idle; lazy expiry, no timers). On Vercel, instances don't share it, so sessions get lost now and then: by design, the chat shows a start-fresh note. `ConversationStore` is the seam for a shared backend.
- **Limits.** Every answer runs under `DEFAULT_LIMITS` (4 steps, output tokens, total timeout) with one retry. Errors before the stream starts are a JSON 500; errors during it are a generic `error` chunk. Either way the reason goes to the server log as `name: message` only. An answer with no text and no cards gets `EMPTY_REPLY`.
- **Tests never call Google.** Drive `createStoreReply` with `MockLanguageModelV4` from `ai/test` (`doStream` with `convertArrayToReadableStream`): script the tool calls and text, collect the UI chunks, then assert on them and on `doStreamCalls` (prompt, tools, tool results). `test/unit/sse.ts` reads chunks from a response or stream.

- **Two entry points.** `@espressionism/agent` is the server runtime: `exports.default` points at the bundle `vp pack` writes to `dist/index.mjs` (types come from `src`). `@espressionism/agent/contract` is TypeScript source with no server code, safe to import in the browser; the client validates replies with it.
- **Hosts.** On Vercel, `api/chat.ts` exports `POST` and calls the handler; the root `pnpm build` builds the agent before Vercel bundles the function, and the `vercel.json` rewrite skips `/api/`. Locally, `packages/client/vite/agent-api.ts` serves the same handler at `/api/chat`: `pnpm dev` loads the agent's source through Vite (no build needed), `vp preview` (and so the e2e tests) imports the built package. The client's `build` task depends on the agent's build for that reason.
- **`api/` is plain Node ESM.** Vercel compiles each `api/*.ts` to `.js` without bundling, and Node loads it as ESM only because the root `package.json` has `"type": "module"`: keep it. Each function is a single file that imports only `@espressionism/agent` (plain ESM would need `.js` on relative imports, against the extensionless rule); shared code goes in the agent.
- **One handler per process.** Create the handler once (module scope), not per request: it holds the sessions. In `pnpm dev` the Vite plugin makes one per loaded agent module, so editing the agent resets memory, and it serves the dev-only `GET /api/chat/memory` (`store.snapshot()`: sizes in LRU order, no turn text) for the page's "Memory (dev)" section. Preview and Vercel never serve that route.
- **Shared packages.** The contract builds on `@espressionism/store` (`machineSchema`) and `@espressionism/calculator` (`calculatorSchema`, `fillToolOutputSchema`). Both are **dev** dependencies on purpose: `vp pack` inlines dev dependencies, so the Vercel Function never loads their TypeScript at runtime.
- **Contract changes** go in `contract.ts` with a matching handler or reply test; the client builds the body with `chatRequest` (`utils/messages.ts`) and parses display tool outputs and the session part with the contract's schemas.

## Calculator (`packages/calculator/`)

The break-even calculator's core, shared by the page (form, URL, WebMCP) and Robospresso. Source-only TypeScript (`exports` → `src/index.ts`), no build step, framework-free.

```
src/
├── drinks.ts     — DRINKS, DRINK_LABELS (the mascot's MASCOT_FLAVORS is DRINKS)
├── format.ts     — CURRENCIES, formatMoney, formatDuration
├── schema.ts     — calculatorSchema, CalculatorValues, DEFAULT_INPUTS, agentFillSchema
├── cost-model.ts — summarize, verdictFor, … (pure money math over CoffeeInputs)
├── inputs.ts     — toCoffeeInputs
├── agent-fill.ts — applyAgentFill, agentFillResult
├── tool.ts       — fill_calculator, defined once: CALCULATOR_TOOL, fillToolInputSchema, fillToolOutputSchema, runCalculatorFill
└── index.ts
test/unit/        — cost model, agent fill, tool (Vitest, node environment)
```

- **Money math is pure and tested.** Every change to `cost-model.ts` needs a matching test in `test/unit/cost-model.test.ts`.
- **Rules live here once; boundaries derive their policy.** The form shows `calculatorSchema`'s messages, the URL drops bad params (`calculatorSearchSchema` maps the shared shape with `.optional().catch(undefined)`), agents get `{ ok: false, errors }`, the server returns 400. Never restate a bound elsewhere; the client's URL test checks, field by field, that the URL accepts exactly what the shared rules accept.
- **One tool, two adapters**, as in the store: `runCalculatorFill(current, input)` never throws and returns `{ ok: true, changes, values, summary, verdict, message }` or `{ ok: false, errors }`. The agent's tool (`tools.ts`) and the page's WebMCP tool only adapt it.

## Store (`packages/store/`)

The demo espresso-machine store, shared by the client's store pages and Robospresso's tools. No third party: brands are real, prices and ratings are made up. Source-only TypeScript (`exports` → `src/index.ts`), no build step.

```
src/
├── catalog.json — 10 machines, generated once with faker (throwaway script, not a dependency)
├── catalog.ts   — CATALOG, parsed with machineSchema on load
├── schema.ts    — machineSchema, STORE_SORTS, DEFAULT_SORT, storeFiltersSchema
├── search.ts    — searchMachines, findMachine, priceRange (pure)
├── tool.ts      — the store search tool, defined once: SEARCH_TOOL, searchToolInputSchema, runStoreSearch, searchResultSchema
└── index.ts
test/unit/       — catalog invariants + search (Vitest, node environment)
```

- **One tool, two adapters.** `search_espresso_machines` lives in `tool.ts`: name and description, a flat Zod input (plain checks, `.meta({ description })` last, `.strict()`), and `runStoreSearch(input)`, which validates untrusted input, applies `storeFiltersSchema` (the min ≤ max rule JSON Schema can't carry) and returns `{ ok: true, ...SearchResult }` or `{ ok: false, errors }` without throwing. The agent's AI SDK tool (`packages/agent/src/tools.ts`) and the store page's WebMCP tool (`use-store-search-tool.ts`) only adapt it; keep validation and search logic out of them.
- **Sorting.** `rating_desc` (default; unrated last), `price_asc`, `price_desc`; ties by name. Price bounds are inclusive; `minRating` hides unrated machines.
- **Catalog rules** are pinned by `catalog.test.ts`: ten machines, unique slugs, `url` = `/store/<slug>`, prices €149–1,499, ratings 2.8–4.9 (one decimal), exactly one unrated machine, at least two cheaper machines that out-rate pricier ones. Hand edits to `catalog.json` must keep them, and the client's e2e specs assert exact orders, so update `test/e2e/store.spec.ts` with it.

## Client architecture (`packages/client/`)

**TanStack Start** (React 19 + TanStack Router, SPA mode), **shadcn/ui** on Tailwind CSS v4, **TanStack Form** for forms, **react-charts** (TanStack Charts) for charts. No React Compiler: memoize by hand where it matters.

```
src/
├── components/
│   ├── ui/              — shadcn/ui primitives
│   ├── SiteHeader.tsx   — app shell: on `/` a compact header below `lg`; on other pages a slim bar at every width
│   ├── HeroHeader.tsx   — landing hero (nav, headline, mascot) from `lg` up
│   └── SiteFooter.tsx
├── features/
│   ├── calculator/
│   │   ├── components/  — CalculatorForm, VerdictPanel, StatsGrid, *Chart
│   │   ├── constants/   — re-exports the package's schema; URL search schema derived from it; WebMCP input schema
│   │   ├── hooks/       — useCalculatorTool (WebMCP `fill_calculator`)
│   │   ├── pages/       — CalculatorPage (also hands ChatPanel the calculator handle)
│   │   └── utils/       — format (chart ticks, symbols; re-exports money/duration), form-options
│   ├── chat/
│   │   ├── components/  — ChatPanel ("Ask Robospresso", New chat), ChatLog, MessageParts (renderer registry), ChatComposer, MemoryOverview (dev)
│   │   ├── constants/   — Zod composer schema, greeting, suggestions, restarted note, error reply
│   │   ├── hooks/       — useChat (session id, restartedAt, calculator fills, send, reset), useMemorySnapshot (dev)
│   │   └── utils/       — messages (transport → POST /api/chat, chatRequest), parts (toPartView, isSearching)
│   ├── store/
│   │   ├── components/  — StoreFilters, MachineCard, MachineRating, MachineSprite
│   │   ├── constants/   — Zod schemas (filter form + URL search), sort/rating options, disclaimer, WebMCP input schema
│   │   ├── hooks/       — useStoreSearchTool (WebMCP `search_espresso_machines`)
│   │   ├── pages/       — StorePage (/store), MachinePage + MachineNotFound (/store/$slug)
│   │   └── utils/       — query (form ↔ URL ↔ store query), machine-sprite, format, form-options
│   ├── mascot/
│   │   ├── components/  — Bitspresso, Robospresso (SVG pixel renderers), PixelRect
│   │   └── utils/       — sprite (text sprites, faces, flavors), robot-sprite
│   ├── webmcp/
│   │   ├── components/  — WebMcpBanner (status strip above both headers)
│   │   ├── hooks/       — useWebMcpTool, useWebMcpSummary, useToolInvokedAt
│   │   ├── stores/      — useWebMcpStore (zustand: tool statuses, last calls)
│   │   └── utils/       — getModelContext, summarizeStatuses
│   ├── theme/
│   │   ├── components/  — ThemeSwitcher (dropdown in both headers)
│   │   ├── hooks/       — useTheme (theme, isDark, setTheme)
│   │   └── utils/       — themes list, applyTheme, pre-paint init script
│   └── common/
│       ├── components/  — ChartCard
│       └── form/        — TanStack Form app hook + field components
├── lib/utils.ts         — shadcn `cn()`
└── routes/              — thin TanStack Router entry points only
```

### Thin-routes rule

Route files (`src/routes/*.tsx`) contain **only** `createFileRoute` with `validateSearch`, `beforeLoad` (redirects), `loaderDeps`, `loader`, `pendingComponent`, `errorComponent`, `notFoundComponent` and `component`. No component definitions, no business logic. Unknown paths hit the catch-all `routes/$.tsx`, which redirects to `/` instead of showing a Not Found page; an unknown product slug throws `notFound()` and `/store/$slug` renders `MachineNotFound` at the same URL. Pages import `Route` from their route file for `useSearch` / `useNavigate`.

### Business logic stays pure

All money math lives in `@espressionism/calculator` (see [Calculator](#calculator-packagescalculator)). Components never compute costs themselves.

### Styling

- Tailwind utility classes only. No inline `style={{}}` except genuinely dynamic computed values.
- Use `clsx` for conditional class names in app code; shadcn primitives in `components/ui/` use `cn()` (clsx + tailwind-merge).
- Design tokens live in `src/styles.css` under shadcn's names (`--background`, `--primary`, …) plus brand extras: `--brew`, `--crema`, `--screen`, `--chart-cafe`, `--chart-home`. Themes are `[data-theme='…']` blocks over the same tokens, one per sticker on the Bitspresso sticker sheet: `diner` (default light), `tomato`, `night` (default dark) and `mint`. With no `data-theme` ("System") the page follows `prefers-color-scheme` between diner and night. Each block also sets the `--mug-*` properties that recolor Bitspresso's body (see `MUG_COLOR_VARS` in `sprite.ts`); the flavor band stays the drink's color. `data-scheme` (`light`/`dark`) on <html> drives the `dark:` variant, and `data-theme` on any element scopes a palette to it. To add a theme: add its CSS block (UI tokens + `--mug-*`), then an entry in `THEMES` (`features/theme/utils/themes.ts`).
- Fonts: `font-pixel` (Silkscreen) for headings and big numbers, `font-sans` (Karla) for body.
- Fonts are self-hosted with Fontsource, latin subset only: Silkscreen's `latin-400.css` is imported in `styles.css`, variable Karla's latin face is declared there by hand (its package has no latin-only stylesheet), and `__root.tsx` preloads both woff2 files (`?url` imports). Never load fonts from Google Fonts: that's a render-blocking chain across two origins. `font-mono` is the system mono stack.
- Hard pixel shadows: `shadow-pixel`, `shadow-pixel-lg`.
- Mobile first: design at 390px wide, then add `sm:` / `lg:` layouts. Below `lg` the page is one stacked column with a compact header; from `lg` (laptops) up it opens with the full-height `HeroHeader`, then the two-column calculator. No horizontal scroll at phone width; touch targets at least 44px (`h-11`).

### shadcn/ui

`components.json` is set up, so `pnpm dlx shadcn@latest add <component>` adds new primitives to `src/components/ui/`. Run `pnpm check --fix` afterwards.

### Forms: TanStack Form

Always use **TanStack Form** through the app hook in `features/common/form/form.ts` (`useAppForm`, `withForm`). Never use raw `useState` for field state.

- Field UI is registered once in `createFormHook` (`NumberField`, `SelectField`). Render fields with `<form.AppField name="…">{(field) => <field.NumberField … />}</form.AppField>`.
- Validation is a Zod schema passed as a form-level validator (`validators: { onChange: schema }`); field errors arrive as Standard Schema issues. Show errors once a field is touched.
- Share options between `useAppForm` and `withForm` with `formOptions(...)` (see `calculator/utils/form-options.ts`).
- Read form state with `useSelector(form.store, selector)` from `@tanstack/react-form`. `useStore` is a deprecated alias and is blocked by lint.
- The calculator syncs valid values to the URL search params through a debounced form listener, so results are shareable.

### WebMCP

The page offers tools to in-browser AI agents through [WebMCP](https://webmachinelearning.github.io/webmcp/) (`document.modelContext`; types from `webmcp-types`, listed in `tsconfig.json` `types`).

- Register a tool with `useWebMcpTool(tool)`: it calls `document.modelContext.registerTool` while the component is mounted, unregisters by aborting the tool's `signal` (there is no `unregisterTool`), and returns its status: `checking`, `available`, `unavailable` (no WebMCP) or `error` (the browser refused it).
- A module-level map keeps one live registration per tool name: a newer mount (Strict Mode's second effect run, HMR) aborts the older one first, so the browser never sees a duplicate name. Aborting a pending registration rejects it with the abort reason; that's ignored, only real refusals warn and set `error`.
- Statuses live in a zustand store (`features/webmcp/stores/webmcp-store.ts`) so anything can show them. `useWebMcpSummary()` sums them up for the page (`summarizeStatuses`); `WebMcpBanner` renders it, with the status on `data-status`.
- `execute` is read through a ref, but `inputSchema` and `annotations` are the tool's identity: keep them module constants, or the tool re-registers every render.
- Derive `inputSchema` from Zod with `z.toJSONSchema`. Put agent-facing descriptions on the schema with `.meta({ description })` as the **last** call in each chain, and prefer checks that map to JSON Schema (`.gt`, `.int`, `.max`) over `.refine`, which `toJSONSchema` drops.
- `search_espresso_machines` (`store/hooks/use-store-search-tool.ts`, mounted by `StorePage`) registers the store's shared tool with `SEARCH_TOOL_INPUT_SCHEMA` (`z.toJSONSchema` of `searchToolInputSchema`). A valid search replaces every filter on the form (`agentSearchToForm`; a rating between the select's steps shows the next one down) so the URL sync runs, and returns the result; invalid input changes nothing and returns the errors.
- `fill_calculator` (`calculator/hooks/use-calculator-tool.ts`) adapts the package's `runCalculatorFill` (any subset of fields, merged onto the form values), sets each changed field with `form.setFieldValue` so validation and the URL sync run as if typed, and returns the result (values, summary, verdict, message; `changes` stripped) or `{ ok: false, errors }`. Robospresso's fills go through the same path (`CalculatorPage`'s handle). A successful call makes the verdict mascots hop and shows "Filled by your agent". `useCalculatorTool` returns the tool's status.
- Unit tests stub `document.modelContext` with `stubModelContext` from `test/unit/features/webmcp/model-context.ts` (spec-like: duplicate names reject; restore it in `finally`/`afterEach`, and reset the store with `resetWebMcpStore`). Playwright's Chromium has no WebMCP, so `test/e2e/webmcp.spec.ts` stubs it with `addInitScript` and calls the captured tool's `execute`.

### Charts: react-charts (TanStack Charts)

- Wrap every chart in `ChartCard` (`features/common/components/ChartCard.tsx`). It gives the chart a fixed-height box (react-charts measures its parent), renders it only in the browser (`ClientOnly`), and adds a legend plus a screen-reader summary.
- Memoize `data`, `primaryAxis` and `secondaryAxes` with `useMemo`; react-charts expects stable options.
- Colors come from CSS tokens via `defaultColors` (see `chart-theme.ts`); pass `dark` from `useTheme().isDark`.
- react-charts 3 is a beta; keep its usage inside the `*Chart.tsx` components so it can be swapped.

### Mascot: Bitspresso

`features/mascot/utils/sprite.ts` holds the two forms as 20×20 text sprites (one letter per pixel). Both forms share the same face kit, stamped at the same spot, and a flavor band right under the face. `<Bitspresso form mood flavor className="size-28" />` renders it as crisp SVG rects. To add a mood, add a case in `stampFace`; to add a flavor, add an entry to `MASCOT_FLAVORS` and `FLAVOR_COLORS`.

Every pixel carries a `part` (`body`, `steam`, `z`, `sweat`; steam also has a `wisp` index), so the renderer can animate pieces of the drawing. `animated` makes the steam drift up wisp by wisp (`animate-steam`), the sleepy Z bob (`animate-snooze`) and the scared sweat drop drip (`animate-sweat`); a scared mug's steam freezes. The hero mug uses it. `animate-hop` is a one-shot bounce used on hover for the verdict mascots. Hovering the hero card turns the mug `scared`, swaps the bubble to "Don't drink me plz!" and shakes the card once (`animate-shiver`). All motion lives in the `@theme` block in `styles.css`, moves in `steps()` to stay pixel-crisp, and must be paired with `motion-reduce:animate-none`.

### Chat persona: Robospresso

The chat (`features/chat`) is run by Robospresso, Bitspresso's espresso-machine robot cousin with aviator shades and a handlebar mustache (`features/mascot/utils/robot-sprite.ts`, one 20×20 text sprite). Two moods: `cool` and `searching`. While searching he holds a magnifying glass that sweeps across his shades (`animate-scan`, 9 pixels = `MAGNIFIER_SWEEP`) and his antenna blinks (`animate-blink`). Body colors read `--robot-*` properties that fall back to Bitspresso's `--mug-*` ones (`ROBOT_COLOR_VARS`); Night (and System dark) sets them to a light steel so he doesn't vanish on the dark tile, the panel band follows the flavor, and the glass keeps fixed colors (`MAGNIFIER_COLORS`) so it reads on every theme. Render with `<Robospresso mood animated className="size-16" />`.

Favicons (`public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192/512.png`) are the header logo: the house-flavor mug winking on the dark screen tile. Regenerate them from `buildMascot('mug', 'wink', 'house')` if the sprite changes, resolving each `var(--mug-…, #hex)` fill to its Diner fallback.

### Store pages

`/store` (`routes/store.tsx`) and `/store/$slug` (`routes/store_.$slug.tsx`; the `_` keeps it out of the grid's layout) render `@espressionism/store`. There are no nav links: the store is reached by URL and from Robospresso's cards. Both pages show the "Demo store" disclaimer.

- Filters are a TanStack Form (`storeFormSchema`): min/max price (`NumberField`, empty = no limit, no negatives, max ≥ min with the error on max), rating and sort (`SelectField`). Valid values sync to the URL through a debounced listener; defaults (empty boxes, `rating_desc`) stay out of it. While the form is invalid, results follow the URL.
- Cards, the product page and its not-found screen carry the current search params, so "Back to store" restores the filters.
- `MachineCard` has two variants: `grid` (store page) and `compact` (chat). The chat's cards and store link pass `newTab`: they open in a new tab with an `sr-only` "(opens in new tab)" and a ↗ icon, so the conversation stays.
- Product pictures come from `buildMachineSprite(slug)`: one 20×20 machine whose body palette, accent and speckle noise are picked by a hash of the slug. Same slug, same picture.

### Exports

Named exports only (`export function Foo`), enforced by `import/no-default-export`. Default exports are allowed only where a tool requires them: `*.config.*` files and TanStack Start entry points (`src/client.tsx`, `src/server.ts`, `src/start.ts`). Routes already use the named `Route` export.

### Path aliases

`@/*` → `src/*` (in `packages/client/tsconfig.json`, resolved by Vite/Vitest via `resolve.tsconfigPaths`).

### Testing

Tests mirror `src/features/` exactly:

```
test/unit/features/calculator/constants/index.test.ts
test/unit/features/calculator/components/CalculatorForm.test.tsx
test/unit/features/mascot/utils/sprite.test.ts
```

- Use `@testing-library/user-event` (`userEvent.setup()`) for every interaction; never `fireEvent`.
- Use `waitFor` for state that updates after an interaction (TanStack Form validates after change/blur).
- Unit tests run on `pool: 'vmThreads'`: jsdom is created once per worker and each file gets its own VM context. Don't rely on `instanceof` across contexts, and restore any globals a test changes.
- `test/setup.ts` stubs `window.matchMedia` (light); theme tests override it with `stubMatchMedia` from `test/unit/features/theme/match-media.ts`. It also borrows Node's web streams (`TransformStream`, …), which jsdom's VM context lacks and the AI SDK's chat needs.
- Chat tests pass a fake `ChatTransport` that returns scripted UI message chunks (see `ChatPanel.test.tsx`), inside a memory router since cards render `<Link>`s.
- jest-dom matchers are not installed; assert on DOM properties directly (`input.valueAsNumber`, `el.textContent`, `el.getAttribute(...)`).

#### E2E (Playwright)

- Specs live in `packages/client/test/e2e/*.spec.ts` (`.spec`, so Vitest's `*.test.*` glob skips them); config in `packages/client/playwright.config.ts`. Import from `@playwright/test`.
- They run against the production build (`vp build && vp preview`), Chromium only, at 1280×800: the landing hero exists only from `lg` up. `colorScheme` defaults to light, so System shows the Diner palette; use `page.emulateMedia` for dark.
- Query by role and visible text, scoped with the helpers in `test/e2e/hero.ts` (`heroNav`, `heroBody`, `heroCard`); no `data-testid`. Write expected copy as literals, don't import it from `src/`.
- Section links: assert both the URL hash and `toBeInViewport()` on the target.
- CI runs them in the separate `e2e` job and uploads `playwright-report` on failure.
