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

const C = {
  out: '#231d1a',
  bg: '#2a2220',
  ink: '#2a1810',
  ink2: '#5b3420',
  cream: '#f4ead8',
  muted: '#cdb592',
  faint: '#4a3a33',
  shadow: '#140d0a',
  teal: '#0f6f68',
  latte: '#d6a46a',
  mocha: '#6b3b22',
  matcha: '#7fae5a',
  cherry: '#d8473a',
}
const W = 976,
  H = 724
const PIX = 'Silkscreen',
  SANS = 'Karla'
const used = { [PIX]: new Set(), [SANS]: new Set() }
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
function text(
  x,
  y,
  s,
  {
    font = SANS,
    size = 14,
    fill = C.ink,
    weight = 400,
    anchor = 'start',
    rotate,
  } = {},
) {
  for (const ch of s) used[font].add(ch)
  const t = rotate ? ` transform="rotate(${rotate} ${x} ${y})"` : ''
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${t}>${esc(s)}</text>`
}
function sprite(px, x, y, k) {
  return (
    `<g transform="translate(${x} ${y}) scale(${k})">` +
    px
      .map(
        (p) =>
          `<rect x="${p.x}" y="${p.y}" width="1" height="1" fill="${p.fill}"${p.opacity < 1 ? ` opacity="${p.opacity}"` : ''}/>`,
      )
      .join('') +
    '</g>'
  )
}
function badge(x, y, label, bg, fg) {
  const w = label.length * 8 + 14
  return (
    `<rect x="${x - w}" y="${y}" width="${w}" height="18" fill="${bg}"/>` +
    text(x - w / 2, y + 13, label, {
      font: PIX,
      size: 10,
      fill: fg,
      anchor: 'middle',
    })
  )
}
const BADGES = {
  live: ['LIVE', C.teal, C.cream],
  partial: ['PARTIAL', C.latte, C.ink],
  planned: ['PLANNED', C.cherry, C.cream],
}
function card({
  x,
  y,
  w,
  h,
  band,
  title,
  sub,
  lines = [],
  status,
  icon,
  textX,
}) {
  const planned = status === 'planned'
  const tx = textX ?? x + 18
  let s = ''
  if (planned) {
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.bg}" stroke="${C.latte}" stroke-width="3" stroke-dasharray="8 6"/>`
  } else {
    s += `<rect x="${x + 6}" y="${y + 6}" width="${w}" height="${h}" fill="${C.shadow}"/>`
    s += `<rect x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" fill="${C.ink}"/>`
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.cream}"/>`
    s += `<rect x="${x}" y="${y + h - 10}" width="${w}" height="10" fill="${band}"/>`
  }
  const ink = planned ? C.cream : C.ink,
    ink2 = planned ? C.muted : C.ink2
  s += text(tx, y + 30, title, { font: PIX, size: 15, fill: ink })
  let ly = y + 50
  if (sub) {
    s += text(tx, ly, sub, { size: 13, fill: ink2, weight: 700 })
    ly += 19
  }
  for (const l of lines) {
    s += text(tx, ly, l, { size: 14, fill: ink2 })
    ly += 19
  }
  const [bl, bb, bf] = BADGES[status]
  s += badge(x + w - 12, y + 12, bl, bb, bf)
  if (icon) s += icon
  return s
}
function group(x, y, w, h, label) {
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${C.faint}" stroke-width="2" stroke-dasharray="2 4"/>` +
    `<rect x="${x + 14}" y="${y - 9}" width="${label.length * 9.4 + 16}" height="18" fill="${C.bg}"/>` +
    text(x + 22, y + 5, label, { font: PIX, size: 12, fill: C.muted })
  )
}
// Orthogonal arrow through points; a head at the last point, and at the
// first one too when it goes both ways.
function arrow(points, { planned = false, both = false } = {}) {
  const color = planned ? C.latte : C.cream
  const s = 9
  // The head at `to`, pointing away from `from`, and where the line stops.
  const tip = ([x1, y1], [x2, y2]) => {
    const dx = Math.sign(x2 - x1),
      dy = Math.sign(y2 - y1)
    const head = dx
      ? `${x2},${y2} ${x2 - dx * s},${y2 - s} ${x2 - dx * s},${y2 + s}`
      : `${x2},${y2} ${x2 - s},${y2 - dy * s} ${x2 + s},${y2 - dy * s}`
    return { head, stop: [x2 - dx * s, y2 - dy * s] }
  }
  const end = tip(...points.slice(-2))
  const start = both ? tip(points[1], points[0]) : undefined
  // Stop the line short of each tip so the heads stay sharp.
  const trimmed = points.map((p, i) =>
    i === points.length - 1 ? end.stop : i === 0 && start ? start.stop : p,
  )
  const dt = trimmed.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')
  return (
    `<path d="${dt}" fill="none" stroke="${color}" stroke-width="4" stroke-linejoin="miter"${planned ? ' stroke-dasharray="8 6"' : ''}/>` +
    `<polygon points="${end.head}" fill="${color}"/>` +
    (start ? `<polygon points="${start.head}" fill="${color}"/>` : '')
  )
}
const label = (x, y, s, o = {}) =>
  text(x, y, s, { font: PIX, size: 10, fill: C.muted, ...o })
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

// Fonts, subset to the characters used and embedded so the SVG renders the same inside <img>.
// Google's `text=` subsetting is deliberate here: this is a docs tool, separate from the
// app, whose fonts are self-hosted (see packages/client/src/styles.css).
const UA =
  'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
async function faces(family, query) {
  const chars = encodeURIComponent([...used[family]].join(''))
  const css = await (
    await fetch(
      `https://fonts.googleapis.com/css2?family=${query}&text=${chars}`,
      { headers: { 'User-Agent': UA } },
    )
  ).text()
  let outCss = ''
  for (const block of css.match(/@font-face\s*{[^}]+}/g)) {
    const url = block.match(/url\(([^)]+)\)/)[1]
    const data = Buffer.from(await (await fetch(url)).arrayBuffer()).toString(
      'base64',
    )
    outCss += block.replace(
      /src:[^;]+;/,
      `src: url(data:font/woff2;base64,${data}) format('woff2');`,
    )
  }
  return outCss
}
const fontCss =
  (await faces(PIX, 'Silkscreen')) + (await faces(SANS, 'Karla:wght@400;700'))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" role="img" aria-label="Espressionism architecture: the chat sends each question, its session id and the calculator's values to POST /api/chat, which keeps the conversation in memory, prompts Gemini directly and streams back text plus product cards and calculator fills built by its tools (store search, show_machines, show_store_link, fill_calculator) from the shared store and calculator packages. Cards open the store pages in a new tab; fills update the calculator on the page. In-browser agents use the same store search and calculator tool through WebMCP.">
<defs><style>${fontCss.replace(/\s+/g, ' ')} text { text-rendering: geometricPrecision; }</style>
<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#ffffff" opacity="0.03"/></pattern></defs>
<rect width="${W}" height="${H}" fill="${C.out}"/>
<rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="${C.bg}"/>
<rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="url(#scan)"/>
${body}
</svg>
`
writeFileSync(outPath, svg)
console.log(`Wrote ${outPath} (${(svg.length / 1024).toFixed(0)} KB)`)
