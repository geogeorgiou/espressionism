/**
 * The pixel-art drawing kit behind the README diagrams (docs/assets/*.svg):
 * the banner's palette, Silkscreen and Karla text, cards, groups and
 * orthogonal arrows. `render` frames a body and embeds only the glyphs it
 * used, fetched from Google Fonts, so the SVG renders the same in an <img>.
 */
export const C = {
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
export const PIX = 'Silkscreen',
  SANS = 'Karla'
const used = { [PIX]: new Set(), [SANS]: new Set() }
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
export function text(
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
export function sprite(px, x, y, k) {
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
export function badge(x, y, label, bg, fg) {
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
export const BADGES = {
  live: ['LIVE', C.teal, C.cream],
  partial: ['PARTIAL', C.latte, C.ink],
  planned: ['PLANNED', C.cherry, C.cream],
}
export function card({
  x,
  y,
  w,
  h,
  band,
  title,
  sub,
  lines = [],
  status,
  badge: tag = BADGES[status],
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
  if (tag) s += badge(x + w - 12, y + 12, ...tag)
  if (icon) s += icon
  return s
}
export function group(x, y, w, h, label) {
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${C.faint}" stroke-width="2" stroke-dasharray="2 4"/>` +
    `<rect x="${x + 14}" y="${y - 9}" width="${label.length * 9.4 + 16}" height="18" fill="${C.bg}"/>` +
    text(x + 22, y + 5, label, { font: PIX, size: 12, fill: C.muted })
  )
}
// Orthogonal arrow through points; a head at the last point, and at the
// first one too when it goes both ways.
export function arrow(points, { planned = false, both = false } = {}) {
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
export const label = (x, y, s, o = {}) =>
  text(x, y, s, { font: PIX, size: 10, fill: C.muted, ...o })

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

/** The finished SVG: frame, scanlines, the body, and the fonts it used. */
export async function render({ W, H, ariaLabel, body }) {
  const fontCss =
    (await faces(PIX, 'Silkscreen')) + (await faces(SANS, 'Karla:wght@400;700'))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" role="img" aria-label="${esc(ariaLabel)}">
<defs><style>${fontCss.replace(/\s+/g, ' ')} text { text-rendering: geometricPrecision; }</style>
<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#ffffff" opacity="0.03"/></pattern></defs>
<rect width="${W}" height="${H}" fill="${C.out}"/>
<rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="${C.bg}"/>
<rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="url(#scan)"/>
${body}
</svg>
`
}
