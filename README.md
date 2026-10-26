<div align="center">

<img src="docs/assets/bitspresso-banner.svg" alt="Bitspresso, the Espressionism mascot, in its five flavors: house, latte, mocha, matcha and cherry" width="100%" />

# Espressionism

**The fine art of knowing when your espresso machine pays for itself.**

Find out when an espresso machine pays for itself. Compare your café habit with brewing at home: break-even, yearly spend and the real cost per cup.

</div>

---

## Motivation

A €3.50 flat white doesn't feel like much. Five days a week, fifty-two weeks a year, it's over €900. Meanwhile, a decent espresso machine costs about as much as a few months of café runs, and then each cup costs cents.

"Should I just buy a machine?" comes up all the time, and it's usually answered by gut feeling. Espressionism paints the full picture instead:

- **Break-even:** the month the machine has paid for itself
- **Yearly spend:** café vs. home, side by side, over as many years as you pick
- **Real cost per home cup:** beans, milk and upkeep, plus the machine's price spread across every cup you'll brew

Results update as you type, and every input lives in the URL, so you can send a friend the exact numbers that convinced you.

It's also a small, real-world playground for the TanStack ecosystem (Start, Router, Form and Charts) with a strict split between pure money math and UI.

> **Why the name?** _Espressionism_ has been my nickname for years: espresso meets the art movement. This is its first proper home.

### Meet Bitspresso

The mascot is **Bitspresso**, an 8-bit coffee character drawn as a 20×20 text sprite and rendered as crisp SVG pixels. It comes in two forms (a diner mug _for here_ and a cup _to go_), five moods (idle, happy, sleepy, surprised, wink) and five flavors (house, latte, mocha, matcha, cherry).

## Stack

| Area            | Tools                                                                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | [TanStack Start](https://tanstack.com/start) (SPA mode) on [React 19](https://react.dev)                                                                   |
| Routing         | [TanStack Router](https://tanstack.com/router) with type-safe, URL-validated search params                                                                 |
| Forms           | [TanStack Form](https://tanstack.com/form) + [Zod](https://zod.dev) validation                                                                             |
| Charts          | [react-charts](https://react-charts.tanstack.com) (TanStack Charts)                                                                                        |
| UI              | [shadcn/ui](https://ui.shadcn.com) on [Radix UI](https://www.radix-ui.com), [Tailwind CSS v4](https://tailwindcss.com), [Lucide](https://lucide.dev) icons |
| Fonts           | [Silkscreen](https://fonts.google.com/specimen/Silkscreen) for pixel headings, [Karla](https://fonts.google.com/specimen/Karla) for body text              |
| Toolchain       | [Vite+](https://viteplus.dev) (`vp`): dev server, build, [Oxlint](https://oxc.rs/docs/guide/usage/linter), [Oxfmt](https://oxc.rs) and tests               |
| Testing         | [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) on [jsdom](https://github.com/jsdom/jsdom)                                   |
| Language        | [TypeScript](https://www.typescriptlang.org)                                                                                                               |
| Package manager | [pnpm](https://pnpm.io) workspaces, with supply-chain hardening (release-age delay, trust policy)                                                          |
| Dev tooling     | [TanStack Devtools](https://tanstack.com/devtools), [commitlint](https://commitlint.js.org) (Conventional Commits)                                         |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) 24 (the version is pinned in `.nvmrc`)
- [pnpm](https://pnpm.io) 10, via Corepack

### Run it

```bash
git clone <repo-url> espressionism
cd espressionism

nvm use          # switch to Node 24
corepack enable  # provides the pinned pnpm version
pnpm install
pnpm dev         # http://localhost:3000
```

The TanStack Devtools panel sits in the bottom-right corner while the dev server is running.

### Scripts

Run from the repo root:

| Command            | What it does                             |
| ------------------ | ---------------------------------------- |
| `pnpm dev`         | Start the client dev server on port 3000 |
| `pnpm build`       | Production build (cached)                |
| `pnpm check`       | Format check + lint + type check         |
| `pnpm check --fix` | Same, with autofixes                     |
| `pnpm test:unit`   | Unit tests                               |

## The cost model

All figures assume 52 weeks a year and flat prices.

- **Café per year** = price per drink × cups a day × days a week × 52
- **Home per year** = cost per home cup × cups per year + upkeep per year
- **Break-even** = machine price ÷ ((café per year − home per year) ÷ 12) months. If a home cup costs as much as a café cup, the machine never pays for itself.
- **Real cost per home cup** = (machine price + home per year × years) ÷ cups over those years

The math lives in pure functions in `packages/client/src/features/calculator/utils/cost-model.ts`, and each one is unit-tested.

## Project layout

```
packages/
  client/          TanStack Start frontend
    src/
      features/
        calculator/   form, verdict, stats and charts
        mascot/       Bitspresso sprites and SVG renderer
        common/       shared form fields, ChartCard, hooks
      routes/         thin route entry points
    test/unit/        tests mirroring src/features
docs/assets/       README images
```

See [CLAUDE.md](./CLAUDE.md) for the full conventions.

## License

[MIT](./LICENSE) © 2026 Georgios Georgiou. Forks and copies must keep the copyright and license notice.

<div align="center">
<br />
<sub>Brewed with ☕ and far too many pixels.</sub>
</div>
