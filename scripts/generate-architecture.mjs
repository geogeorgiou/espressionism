#!/usr/bin/env node
/**
 * Draws docs/assets/architecture.svg, the README's overview diagram, in the
 * banner's palette. Sprites come from the app's own sprite code (loaded
 * through Vite), and the Silkscreen and Karla fonts are fetched from Google
 * Fonts, subset to the characters used, and embedded, so the SVG renders the
 * same inside an <img> on GitHub.
 *
 * Run from the repo root (needs network for the fonts):
 *   pnpm docs:architecture
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { createServer } from 'vite-plus'

import {
  C,
  PIX,
  arrow,
  card,
  group,
  label,
  render,
  sprite,
  text,
} from './lib/pixel-svg.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const outPath = `${root}docs/assets/architecture.svg`

// Load the sprite builders the app uses, so the diagram always matches them.
const server = await createServer({
  configFile: false,
  root: `${root}packages/client`,
  resolve: { tsconfigPaths: true },
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})
const mascot = await server.ssrLoadModule(
  '/src/features/mascot/utils/sprite.ts',
)
const robot = await server.ssrLoadModule(
  '/src/features/mascot/utils/robot-sprite.ts',
)
const machine = await server.ssrLoadModule(
  '/src/features/store/utils/machine-sprite.ts',
)
await server.close()

// Theme-driven fills are `var(--mug-…, #hex)`: keep the Diner fallback.
const resolveFills = (pixels) =>
  pixels.map(({ x, y, fill, opacity }) => ({
    x,
    y,
    opacity,
    fill: fill.replace(/^var\([^,]+,\s*(#[0-9a-fA-F]+)\)$/, '$1'),
  }))
const sprites = {
  mug: resolveFills(mascot.buildMascot('mug', 'happy', 'latte')),
  robot: resolveFills(robot.buildRobospresso('cool', 'house')),
  machines: ['gaggia-touch-lux', 'rancilio-barista-plus', 'breville-dual'].map(
    (slug) => resolveFills(machine.buildMachineSprite(slug)),
  ),
}

const W = 976,
  H = 724

// Little pixel sparkle for Gemini.
const SPARK = [
  '...L...',
  '...L...',
  '..LLL..',
  'LLLCLLL',
  '..LLL..',
  '...L...',
  '...L...',
]
const spark = (x, y, k) =>
  sprite(
    SPARK.flatMap((r, yy) =>
      r.split('').flatMap((ch, xx) =>
        ch === '.'
          ? []
          : [
              {
                x: xx,
                y: yy,
                fill: ch === 'C' ? C.cream : C.latte,
                opacity: 1,
              },
            ],
      ),
    ),
    x,
    y,
    k,
  )

let body = ''
body += text(40, 52, 'ESPRESSIONISM · HOW IT FITS', {
  font: PIX,
  size: 22,
  fill: C.cream,
})
body += text(
  40,
  78,
  'A UI and an agent, one source of truth: both share the store and the calculator.',
  { size: 15, fill: C.muted },
)

body += group(32, 108, 352, 452, 'UI · PACKAGES/CLIENT')
body += group(440, 108, 264, 292, 'AGENT · PACKAGES/AGENT')

body += card({
  x: 48,
  y: 136,
  w: 312,
  h: 112,
  band: C.latte,
  title: 'CALCULATOR',
  sub: 'route /',
  lines: ['Break-even, cost per cup;', 'core in packages/calculator'],
  status: 'live',
  textX: 140,
  icon: sprite(sprites.mug, 60, 148, 4),
})
body += card({
  x: 48,
  y: 280,
  w: 312,
  h: 112,
  band: C.teal,
  title: 'CHAT',
  sub: 'Ask Robospresso, on /',
  lines: ['Streams text + cards;', 'fills the calculator'],
  status: 'live',
  textX: 140,
  icon: sprite(sprites.robot, 60, 292, 4),
})
body += card({
  x: 48,
  y: 424,
  w: 312,
  h: 112,
  band: C.mocha,
  title: 'STORE',
  sub: 'routes /store, /store/$slug',
  lines: ['Filters in the URL, plus', 'a WebMCP search tool'],
  status: 'live',
  textX: 140,
  icon: sprite(sprites.machines[0], 60, 436, 4),
})

body += card({
  x: 460,
  y: 136,
  w: 224,
  h: 112,
  band: C.teal,
  title: 'CHAT API',
  sub: 'POST /api/chat',
  lines: ['Vercel Function · UI stream', 'Sessions held in memory'],
  status: 'live',
})
body += card({
  x: 460,
  y: 272,
  w: 224,
  h: 112,
  band: C.matcha,
  title: 'TOOLS',
  sub: 'search · show_machines',
  lines: ['show_store_link', 'fill_calculator'],
  status: 'live',
})

body += card({
  x: 752,
  y: 160,
  w: 192,
  h: 128,
  band: C.cherry,
  title: 'GEMINI',
  sub: 'Google AI Studio',
  lines: ['Direct, no gateway;', 'key on the server'],
  status: 'live',
  icon: spark(892, 238, 5),
})

body += card({
  x: 440,
  y: 424,
  w: 240,
  h: 112,
  band: C.matcha,
  title: 'STORE DATA',
  sub: 'packages/store',
  lines: ['10 machines, fake prices', 'search tool, 2 adapters'],
  status: 'live',
})

body += card({
  x: 704,
  y: 424,
  w: 240,
  h: 112,
  band: C.latte,
  title: 'CALC CORE',
  sub: 'packages/calculator',
  lines: ['Schema, pure cost model', 'fill tool, 2 adapters'],
  status: 'live',
})

body += card({
  x: 48,
  y: 600,
  w: 312,
  h: 92,
  band: C.cherry,
  title: 'BROWSER AGENT',
  sub: 'any WebMCP client',
  lines: ['fill_calculator + store search'],
  status: 'live',
})

// Flows
body += arrow(
  [
    [364, 336],
    [410, 336],
    [410, 188],
    [456, 188],
  ],
  { both: true },
)
body += label(402, 262, 'ASK · STREAM', { anchor: 'middle', rotate: -90 })
body += arrow([
  [364, 480],
  [436, 480],
])
body += label(400, 470, 'READS', { anchor: 'middle' })
body += arrow(
  [
    [688, 204],
    [748, 204],
  ],
  { both: true },
)
body += label(718, 194, 'PROMPT', { anchor: 'middle' })
body += arrow([
  [848, 292],
  [848, 322],
  [688, 322],
])
body += label(768, 312, 'TOOL CALL', { anchor: 'middle' })
body += arrow([
  [560, 390],
  [560, 420],
])
body += arrow([
  [640, 390],
  [640, 404],
  [824, 404],
  [824, 420],
])
body += label(570, 412, 'READS')
body += arrow([
  [204, 276],
  [204, 252],
])
body += label(216, 268, 'FILLS')
body += arrow([
  [204, 396],
  [204, 420],
])
body += label(216, 412, 'CARDS LINK HERE')
body += arrow([
  [204, 596],
  [204, 540],
])
body += label(216, 578, 'WEBMCP')

const svg = await render({
  W,
  H,
  ariaLabel:
    "Espressionism architecture: the chat sends each question, its session id and the calculator's values to POST /api/chat, which keeps the conversation in memory, prompts Gemini directly and streams back text plus machine cards and calculator fills built by its tools (store search, show_machines, show_store_link, fill_calculator) from the shared store and calculator packages. Cards open the store pages in a new tab; fills update the calculator on the page. In-browser agents use the same store search and calculator tool through WebMCP.",
  body,
})
writeFileSync(outPath, svg)
console.log(`Wrote ${outPath} (${(svg.length / 1024).toFixed(0)} KB)`)
