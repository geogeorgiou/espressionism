#!/usr/bin/env node
/**
 * Draws docs/assets/boundaries.svg, the README's import-boundaries diagram,
 * in the architecture diagram's style. It pictures the layer rules in
 * .dependency-cruiser.mjs; that file is the source of truth, so update both
 * together.
 *
 * Run from the repo root (needs network for the fonts):
 *   pnpm docs:boundaries
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  C,
  PIX,
  arrow,
  card,
  group,
  label,
  render,
  text,
} from './lib/pixel-svg.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const outPath = `${root}docs/assets/boundaries.svg`

const W = 976,
  H = 724
const ENTRY = ['ENTRY', C.teal, C.cream]
const LEAF = ['LEAF', C.matcha, C.ink]

// A straight arrow down a gap between two rows of cards.
const down = (x, from, to) =>
  arrow([
    [x, from + 4],
    [x, to - 4],
  ])

let body = ''
body += text(40, 52, 'ESPRESSIONISM · IMPORT BOUNDARIES', {
  font: PIX,
  size: 22,
  fill: C.cream,
})
body += text(
  40,
  78,
  'Arrows point the only way imports may go. pnpm lint:boundaries checks it in CI.',
  { size: 15, fill: C.muted },
)

// Packages: client, api -> agent -> calculator, store -> tool
body += group(32, 108, 440, 592, 'PACKAGES')

const pkg = { w: 176, h: 88 }
const row = { top: 136, agent: 300, domain: 444, tool: 588 }
const col = { left: 48, mid: 164, right: 280 }

body += card({
  x: col.left,
  y: row.top,
  ...pkg,
  h: 108,
  band: C.latte,
  title: 'CLIENT',
  sub: 'packages/client',
  lines: ['The UI; may use any', 'package below'],
  badge: ENTRY,
})
body += card({
  x: col.right,
  y: row.top,
  ...pkg,
  h: 108,
  band: C.teal,
  title: 'API',
  sub: 'api/',
  lines: ['Vercel Functions;', 'the agent only'],
  badge: ENTRY,
})
body += card({
  x: col.mid,
  y: row.agent,
  ...pkg,
  band: C.teal,
  title: 'AGENT',
  sub: 'packages/agent',
  lines: ['Robospresso'],
})
body += card({
  x: col.left,
  y: row.domain,
  ...pkg,
  band: C.latte,
  title: 'CALCULATOR',
  sub: 'packages/calculator',
  lines: ['Cost model, fill tool'],
})
body += card({
  x: col.right,
  y: row.domain,
  ...pkg,
  band: C.mocha,
  title: 'STORE',
  sub: 'packages/store',
  lines: ['Demo store catalog'],
})
body += card({
  x: col.mid,
  y: row.tool,
  ...pkg,
  band: C.matcha,
  title: 'TOOL',
  sub: 'packages/tool',
  lines: ['defineTool'],
  badge: LEAF,
})

// Arrows run where two cards overlap horizontally, so they stay straight.
const xLeft = 194,
  xRight = 310
body += down(xLeft, row.top + 108, row.agent)
body += label(xLeft - 8, row.agent - 24, 'CONTRACT ONLY', { anchor: 'end' })
body += down(xRight, row.top + 108, row.agent)
body += down(xLeft, row.agent + pkg.h, row.domain)
body += down(xRight, row.agent + pkg.h, row.domain)
body += down(xLeft, row.domain + pkg.h, row.tool)
body += down(xRight, row.domain + pkg.h, row.tool)

// Calculator and store never import each other.
const cx = (col.left + pkg.w + col.right) / 2,
  cy = row.domain + 54
body += label(cx, cy - 16, 'NEVER', { anchor: 'middle', fill: C.cherry })
body += `<path d="M${cx - 9} ${cy - 9} L${cx + 9} ${cy + 9} M${cx + 9} ${cy - 9} L${cx - 9} ${cy + 9}" stroke="${C.cherry}" stroke-width="4" shape-rendering="geometricPrecision"/>`

// Client: routes -> shell components -> features -> ui, lib
body += group(496, 108, 448, 592, 'CLIENT · PACKAGES/CLIENT/SRC')

const layer = { x: 512, w: 416, h: 88, gap: 24 }
const layers = [
  {
    band: C.cherry,
    title: 'ROUTES',
    sub: 'routes/',
    lines: ['Nothing imports a route; features use getRouteApi'],
    badge: ENTRY,
  },
  {
    band: C.latte,
    title: 'SHELL',
    sub: 'components/',
    lines: ['Site and hero headers: compose features'],
  },
  {
    band: C.mocha,
    title: 'DOMAIN FEATURES',
    sub: 'features/ calculator · store · chat',
    lines: ["A feature's pages/ are mounted by routes only"],
  },
  {
    band: C.matcha,
    title: 'BASE FEATURES',
    sub: 'features/ mascot · theme · common · webmcp',
    lines: ['Never use a domain feature; stores/ stay private'],
  },
  {
    band: C.teal,
    title: 'UI + LIB',
    sub: 'components/ui/ · lib/',
    lines: ['shadcn primitives and helpers; no app code'],
    badge: LEAF,
  },
]
layers.forEach((l, i) => {
  const y = 136 + i * (layer.h + layer.gap)
  body += card({ x: layer.x, y, w: layer.w, h: layer.h, ...l })
  if (i < layers.length - 1)
    body += down(560, y + layer.h, y + layer.h + layer.gap)
})

const svg = await render({
  W,
  H,
  ariaLabel:
    'Espressionism import boundaries. Packages: the client and the api are entry points; the client may use any package but reaches the agent only through its contract, and the api uses only the agent. The agent uses the calculator and the store, which never import each other, and both use tool, a leaf. Inside the client: routes, then shell components, then domain features (calculator, store, chat), then base features (mascot, theme, common, webmcp), then ui primitives and lib, each importing only the layers below. Nothing imports a route, only routes mount pages, and a feature keeps its stores private.',
  body,
})
writeFileSync(outPath, svg)
console.log(`Wrote ${outPath} (${(svg.length / 1024).toFixed(0)} KB)`)
