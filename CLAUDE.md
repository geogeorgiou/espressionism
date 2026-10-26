# CLAUDE.md

## Monorepo structure

```
packages/
  client/   — TanStack Start frontend (SPA mode)
```

The layout mirrors `fullstack-app-starter`; a `backend/` package can be added beside `client/` later.

## Toolchain

pnpm workspace + **Vite+** (`vite-plus`, project-local `vp` CLI).

- One root `vite.config.ts` owns `fmt` (oxfmt), `lint` (oxlint + type checks) and `staged` for **all** packages. Never add `lint`/`fmt` blocks or `.oxlintrc`/`.oxfmtrc` files inside a package. Use `lint.overrides` with `packages/<pkg>/**` globs instead.
- Import Vitest APIs from `vite-plus/test`, never `vitest`. Import `defineConfig` in config files from `vite-plus`.
- A package script must not share a name with a Vite+ task in that package's `vite.config.ts` (`build` is a task, not a script).
- Relative imports stay extensionless (no `.ts` / `.tsx`).
- Shared dependency versions live in the `catalog` in `pnpm-workspace.yaml`; reference them with `"catalog:"`.
- Git hooks live in `.vite-hooks/` (pre-commit: `vp staged`; commit-msg: commitlint, Conventional Commits).

## Commands

Run from the repo root:

- **Install:** `pnpm install`
- **Dev:** `pnpm dev` (client on http://localhost:3000)
- **Build (cached):** `pnpm build`
- **Format + lint + type check:** `pnpm check` (`pnpm check --fix` to autofix)
- **Unit tests:** `pnpm test:unit`
- **E2E tests:** `pnpm test:e2e` (Playwright; builds the app and serves it with `vp preview` on :4173). First run: `pnpm --filter @espressionism/client exec playwright install chromium`

Single test file (from `packages/client/`):

```bash
pnpm exec vp test run test/unit/features/calculator/utils/cost-model.test.ts
```

## Client architecture (`packages/client/`)

**TanStack Start** (React 19 + TanStack Router, SPA mode), **shadcn/ui** on Tailwind CSS v4, **TanStack Form** for forms, **react-charts** (TanStack Charts) for charts. No React Compiler: memoize by hand where it matters.

```
src/
├── components/
│   ├── ui/              — shadcn/ui primitives
│   ├── SiteHeader.tsx   — app shell, not owned by a domain: compact header below `lg`
│   ├── HeroHeader.tsx   — landing hero (nav, headline, mascot) from `lg` up
│   └── SiteFooter.tsx
├── features/
│   ├── calculator/
│   │   ├── components/  — CalculatorForm, VerdictPanel, StatsGrid, *Chart
│   │   ├── constants/   — defaults, Zod schemas (form + URL search)
│   │   ├── pages/       — CalculatorPage
│   │   └── utils/       — cost-model (pure), format, form-options
│   ├── mascot/
│   │   ├── components/  — Bitspresso (SVG pixel renderer)
│   │   └── utils/       — sprite (text sprites, faces, flavors)
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

Route files (`src/routes/*.tsx`) contain **only** `createFileRoute` with `validateSearch`, `beforeLoad` (redirects), `loaderDeps`, `loader`, `pendingComponent`, `errorComponent` and `component`. No component definitions, no business logic. Unknown paths hit the catch-all `routes/$.tsx`, which redirects to `/` instead of showing a Not Found page. Pages import `Route` from their route file for `useSearch` / `useNavigate`.

### Business logic stays pure

All money math lives in `features/calculator/utils/cost-model.ts` as pure functions over `CoffeeInputs`. Components never compute costs themselves. Every change there needs a matching test in `test/unit/features/calculator/utils/cost-model.test.ts`.

### Styling

- Tailwind utility classes only. No inline `style={{}}` except genuinely dynamic computed values.
- Use `clsx` for conditional class names in app code; shadcn primitives in `components/ui/` use `cn()` (clsx + tailwind-merge).
- Design tokens live in `src/styles.css` under shadcn's names (`--background`, `--primary`, …) plus brand extras: `--brew`, `--crema`, `--screen`, `--chart-cafe`, `--chart-home`. Themes are `[data-theme='…']` blocks over the same tokens, one per sticker on the Bitspresso sticker sheet: `diner` (default light), `tomato`, `night` (default dark) and `mint`. With no `data-theme` ("System") the page follows `prefers-color-scheme` between diner and night. Each block also sets the `--mug-*` properties that recolor Bitspresso's body (see `MUG_COLOR_VARS` in `sprite.ts`); the flavor band stays the drink's color. `data-scheme` (`light`/`dark`) on <html> drives the `dark:` variant, and `data-theme` on any element scopes a palette to it. To add a theme: add its CSS block (UI tokens + `--mug-*`), then an entry in `THEMES` (`features/theme/utils/themes.ts`).
- Fonts: `font-pixel` (Silkscreen) for headings and big numbers, `font-sans` (Karla) for body.
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

### Charts: react-charts (TanStack Charts)

- Wrap every chart in `ChartCard` (`features/common/components/ChartCard.tsx`). It gives the chart a fixed-height box (react-charts measures its parent), renders it only in the browser (`ClientOnly`), and adds a legend plus a screen-reader summary.
- Memoize `data`, `primaryAxis` and `secondaryAxes` with `useMemo`; react-charts expects stable options.
- Colors come from CSS tokens via `defaultColors` (see `chart-theme.ts`); pass `dark` from `useTheme().isDark`.
- react-charts 3 is a beta; keep its usage inside the `*Chart.tsx` components so it can be swapped.

### Mascot: Bitspresso

`features/mascot/utils/sprite.ts` holds the two forms as 20×20 text sprites (one letter per pixel). Both forms share the same face kit, stamped at the same spot, and a flavor band right under the face. `<Bitspresso form mood flavor className="size-28" />` renders it as crisp SVG rects. To add a mood, add a case in `stampFace`; to add a flavor, add an entry to `MASCOT_FLAVORS` and `FLAVOR_COLORS`.

Every pixel carries a `part` (`body`, `steam`, `z`, `sweat`; steam also has a `wisp` index), so the renderer can animate pieces of the drawing. `animated` makes the steam drift up wisp by wisp (`animate-steam`), the sleepy Z bob (`animate-snooze`) and the scared sweat drop drip (`animate-sweat`); a scared mug's steam freezes. The hero mug uses it. `animate-hop` is a one-shot bounce used on hover for the verdict mascots. Hovering the hero card turns the mug `scared`, swaps the bubble to "Don't drink me plz!" and shakes the card once (`animate-shiver`). All motion lives in the `@theme` block in `styles.css`, moves in `steps()` to stay pixel-crisp, and must be paired with `motion-reduce:animate-none`.

Favicons (`public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192/512.png`) are the header logo: the house-flavor mug winking on the dark screen tile. Regenerate them from `buildMascot('mug', 'wink', 'house')` if the sprite changes, resolving each `var(--mug-…, #hex)` fill to its Diner fallback.

### Exports

Named exports only (`export function Foo`), enforced by `import/no-default-export`. Default exports are allowed only where a tool requires them: `*.config.*` files and TanStack Start entry points (`src/client.tsx`, `src/server.ts`, `src/start.ts`). Routes already use the named `Route` export.

### Path aliases

`@/*` → `src/*` (in `packages/client/tsconfig.json`, resolved by Vite/Vitest via `resolve.tsconfigPaths`).

### Testing

Tests mirror `src/features/` exactly:

```
test/unit/features/calculator/utils/cost-model.test.ts
test/unit/features/calculator/components/CalculatorForm.test.tsx
test/unit/features/mascot/utils/sprite.test.ts
```

- Use `@testing-library/user-event` (`userEvent.setup()`) for every interaction; never `fireEvent`.
- Use `waitFor` for state that updates after an interaction (TanStack Form validates after change/blur).
- `test/setup.ts` stubs `window.matchMedia` (light); theme tests override it with `stubMatchMedia` from `test/unit/features/theme/match-media.ts`.
- jest-dom matchers are not installed; assert on DOM properties directly (`input.valueAsNumber`, `el.textContent`, `el.getAttribute(...)`).

#### E2E (Playwright)

- Specs live in `packages/client/test/e2e/*.spec.ts` (`.spec`, so Vitest's `*.test.*` glob skips them); config in `packages/client/playwright.config.ts`. Import from `@playwright/test`.
- They run against the production build (`vp build && vp preview`), Chromium only, at 1280×800: the landing hero exists only from `lg` up. `colorScheme` defaults to light, so System shows the Diner palette; use `page.emulateMedia` for dark.
- Query by role and visible text, scoped with the helpers in `test/e2e/hero.ts` (`heroNav`, `heroBody`, `heroCard`); no `data-testid`. Write expected copy as literals, don't import it from `src/`.
- Section links: assert both the URL hash and `toBeInViewport()` on the target.
- CI runs them in the separate `e2e` job and uploads `playwright-report` on failure.
