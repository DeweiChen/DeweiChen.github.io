import { SANS } from './textCanvas'

// Each side project's app screen: a real screenshot where there is one, otherwise a painted
// stand-in (also shown while the screenshot loads).

const STATUS = '#c9cde0'

function statusBar(ctx: CanvasRenderingContext2D, w: number, color = STATUS) {
  ctx.fillStyle = color
  ctx.font = `600 26px ${SANS}`
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  ctx.fillText('9:41', 36, 26)
  ctx.fillRect(w - 86, 32, 50, 18)
}

/** Frigate's camera grid: four feeds, one catching a person, and the event list under it. */
function frigate(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#0d1018'
  ctx.fillRect(0, 0, w, h)
  statusBar(ctx, w)
  ctx.fillStyle = '#e8ebf5'
  ctx.font = `700 40px ${SANS}`
  ctx.fillText('Frigate', 36, 86)
  ctx.fillStyle = '#3ddc84'
  ctx.beginPath()
  ctx.arc(w - 56, 108, 10, 0, Math.PI * 2)
  ctx.fill()

  const names = ['front_door', 'living_room', 'garage', 'backyard']
  const tw = (w - 36 * 2 - 16) / 2
  const th = tw * 0.75
  names.forEach((name, i) => {
    const x = 36 + (i % 2) * (tw + 16)
    const y = 160 + Math.floor(i / 2) * (th + 52)
    const g = ctx.createLinearGradient(x, y, x, y + th)
    g.addColorStop(0, '#2a3042')
    g.addColorStop(1, '#171b26')
    ctx.fillStyle = g
    ctx.fillRect(x, y, tw, th)
    // A wall, a floor line and a doorway, enough to read as a room.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
    ctx.fillRect(x, y + th * 0.62, tw, th * 0.38)
    ctx.fillRect(x + tw * (0.15 + i * 0.15), y + th * 0.2, tw * 0.22, th * 0.42)
    if (i === 0) {
      // Someone at the door.
      ctx.fillStyle = 'rgba(220, 225, 240, 0.55)'
      ctx.beginPath()
      ctx.arc(x + tw * 0.62, y + th * 0.3, th * 0.08, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(x + tw * 0.55, y + th * 0.39, tw * 0.14, th * 0.42)
      ctx.strokeStyle = '#ff4d5e'
      ctx.lineWidth = 4
      ctx.strokeRect(x + tw * 0.48, y + th * 0.16, tw * 0.28, th * 0.7)
      ctx.fillStyle = '#ff4d5e'
      ctx.fillRect(x + tw * 0.48, y + th * 0.16 - 26, 132, 26)
      ctx.fillStyle = '#ffffff'
      ctx.font = `600 19px ${SANS}`
      ctx.fillText('person 92%', x + tw * 0.48 + 6, y + th * 0.16 - 23)
    }
    ctx.fillStyle = '#8d93ab'
    ctx.font = `500 20px ${SANS}`
    ctx.fillText(name, x, y + th + 10)
  })

  let y = 160 + 2 * (th + 52) + 16
  ctx.fillStyle = '#e8ebf5'
  ctx.font = `700 28px ${SANS}`
  ctx.fillText('Events', 36, y)
  y += 52
  const events = [
    ['person', 'front_door', '2 min ago', '#ff4d5e'],
    ['car', 'garage', '18 min ago', '#f5b942'],
    ['person', 'backyard', '1 h ago', '#ff4d5e'],
    ['cat', 'living_room', '3 h ago', '#7fd8f5'],
  ]
  for (const [label, cam, time, color] of events) {
    if (y > h - 60) break
    ctx.fillStyle = '#1a1f2c'
    ctx.beginPath()
    ctx.roundRect(36, y, w - 72, 76, 14)
    ctx.fill()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(70, y + 38, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#e8ebf5'
    ctx.font = `600 24px ${SANS}`
    ctx.fillText(label, 98, y + 14)
    ctx.fillStyle = '#8d93ab'
    ctx.font = `400 20px ${SANS}`
    ctx.fillText(cam, 98, y + 44)
    ctx.textAlign = 'right'
    ctx.fillText(time, w - 56, y + 28)
    ctx.textAlign = 'left'
    y += 90
  }
}

/** A street map with your position, the restrooms around you and a route to the nearest. */
function toiletMap(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#e9edf2'
  ctx.fillRect(0, 0, w, h)
  // Park and river.
  ctx.fillStyle = '#cfe8cf'
  ctx.fillRect(w * 0.55, h * 0.12, w * 0.4, h * 0.18)
  ctx.fillStyle = '#bcd8f0'
  ctx.beginPath()
  ctx.moveTo(0, h * 0.5)
  ctx.bezierCurveTo(w * 0.3, h * 0.44, w * 0.6, h * 0.58, w, h * 0.5)
  ctx.lineTo(w, h * 0.55)
  ctx.bezierCurveTo(w * 0.6, h * 0.63, w * 0.3, h * 0.49, 0, h * 0.55)
  ctx.fill()
  // Streets.
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 18
  for (const x of [0.2, 0.48, 0.8]) {
    ctx.beginPath()
    ctx.moveTo(w * x, 0)
    ctx.lineTo(w * (x + 0.05), h * 0.7)
    ctx.stroke()
  }
  for (const y of [0.22, 0.38, 0.64]) {
    ctx.beginPath()
    ctx.moveTo(0, h * y)
    ctx.lineTo(w, h * (y - 0.02))
    ctx.stroke()
  }
  statusBar(ctx, w, '#3a4054')

  // Route from you to the nearest restroom.
  const me = [w * 0.34, h * 0.45]
  const wc = [w * 0.5, h * 0.22]
  ctx.strokeStyle = '#2e7cf6'
  ctx.lineWidth = 8
  ctx.setLineDash([16, 12])
  ctx.beginPath()
  ctx.moveTo(me[0], me[1])
  ctx.lineTo(w * 0.49, h * 0.37)
  ctx.lineTo(wc[0], wc[1] + 30)
  ctx.stroke()
  ctx.setLineDash([])

  const pin = (x: number, y: number, near: boolean) => {
    ctx.fillStyle = near ? '#2e7cf6' : '#7b8bb0'
    ctx.beginPath()
    ctx.roundRect(x - 34, y - 26, 68, 52, 14)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = `700 24px ${SANS}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('WC', x, y + 1)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
  }
  pin(wc[0], wc[1], true)
  pin(w * 0.82, h * 0.42, false)
  pin(w * 0.16, h * 0.62, false)

  ctx.fillStyle = 'rgba(46, 124, 246, 0.2)'
  ctx.beginPath()
  ctx.arc(me[0], me[1], 44, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(me[0], me[1], 18, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#2e7cf6'
  ctx.beginPath()
  ctx.arc(me[0], me[1], 13, 0, Math.PI * 2)
  ctx.fill()

  // Bottom sheet.
  const top = h * 0.7
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(0, top, w, h - top + 40, 36)
  ctx.fill()
  ctx.fillStyle = '#d5d9e2'
  ctx.fillRect(w / 2 - 36, top + 14, 72, 8)
  ctx.fillStyle = '#1b2233'
  ctx.font = `700 32px ${SANS}`
  ctx.fillText('Nearest restroom', 36, top + 44)
  ctx.fillStyle = '#2e7cf6'
  ctx.font = `600 26px ${SANS}`
  ctx.fillText('120 m · 2 min walk', 36, top + 92)
  ctx.fillStyle = '#7a8296'
  ctx.font = `400 22px ${SANS}`
  ctx.fillText('350 m · Riverside Park', 36, top + 148)
  ctx.fillText('610 m · MRT Station', 36, top + 186)
}

/** A night-sky live wallpaper on a lock screen: moon, hills and falling blossoms. */
function wallpaper(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#141a4a')
  sky.addColorStop(0.55, '#5b3a8c')
  sky.addColorStop(1, '#f19bb8')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  for (let i = 0; i < 40; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1
    const y = (Math.sin(i * 78.233) * 12543.123) % 1
    ctx.fillRect(Math.abs(x) * w, Math.abs(y) * h * 0.45, 3, 3)
  }
  ctx.fillStyle = '#fff6dc'
  ctx.shadowColor = '#fff6dc'
  ctx.shadowBlur = 40
  ctx.beginPath()
  ctx.arc(w * 0.7, h * 0.3, 70, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  ctx.fillStyle = '#2a1f4f'
  ctx.beginPath()
  ctx.moveTo(0, h * 0.78)
  ctx.quadraticCurveTo(w * 0.3, h * 0.66, w * 0.6, h * 0.76)
  ctx.quadraticCurveTo(w * 0.85, h * 0.7, w, h * 0.74)
  ctx.lineTo(w, h)
  ctx.lineTo(0, h)
  ctx.fill()

  // A blossom branch from the top left, and petals drifting down.
  ctx.strokeStyle = '#3a2440'
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.moveTo(0, h * 0.2)
  ctx.quadraticCurveTo(w * 0.25, h * 0.24, w * 0.45, h * 0.18)
  ctx.stroke()
  const blossom = (x: number, y: number, r: number) => {
    ctx.fillStyle = '#ffc3d8'
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.55, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#ff7fa8'
    ctx.beginPath()
    ctx.arc(x, y, r * 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
  for (const [x, y, r] of [[0.08, 0.21, 22], [0.18, 0.23, 18], [0.28, 0.22, 24], [0.38, 0.19, 16], [0.22, 0.27, 14]]) blossom(w * x, h * y, r)
  for (let i = 0; i < 14; i++) {
    const x = Math.abs((Math.sin(i * 3.7) * 9137.1) % 1) * w
    const y = h * 0.3 + Math.abs((Math.sin(i * 7.3) * 5171.7) % 1) * h * 0.6
    ctx.fillStyle = 'rgba(255, 195, 216, 0.85)'
    ctx.beginPath()
    ctx.ellipse(x, y, 9, 5, i, 0, Math.PI * 2)
    ctx.fill()
  }

  statusBar(ctx, w, '#ffffff')
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.font = `200 150px ${SANS}`
  ctx.fillText('9:41', w / 2, h * 0.07)
  ctx.font = `500 28px ${SANS}`
  ctx.fillText('Saturday, April 2', w / 2, h * 0.07 + 165)
  ctx.textAlign = 'left'
}

const SCREENS: Record<string, (ctx: CanvasRenderingContext2D, w: number, h: number) => void> = {
  smartHome: frigate,
  toiletFinder: toiletMap,
  ovoy: wallpaper,
}

/** Generic dark-mode app screen stand-in for side projects without a screenshot or custom canvas painter. */
function defaultScreen(ctx: CanvasRenderingContext2D, w: number, h: number, title = 'App') {
  ctx.fillStyle = '#0d101c'
  ctx.fillRect(0, 0, w, h)
  statusBar(ctx, w)

  ctx.fillStyle = '#e8ebf5'
  ctx.font = `700 38px ${SANS}`
  ctx.fillText(title, 36, 86, w - 72)

  // Hero card with brand gradient.
  const heroY = 156
  const heroH = 260
  const grad = ctx.createLinearGradient(36, heroY, w - 36, heroY + heroH)
  grad.addColorStop(0, 'rgba(46, 184, 242, 0.28)')
  grad.addColorStop(1, 'rgba(148, 76, 250, 0.28)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.roundRect(36, heroY, w - 72, heroH, 24)
  ctx.fill()
  ctx.strokeStyle = 'rgba(127, 216, 245, 0.35)'
  ctx.lineWidth = 3
  ctx.stroke()

  ctx.fillStyle = '#7fd8f5'
  ctx.fillRect(68, heroY + 42, 120, 14)
  ctx.fillStyle = 'rgba(232, 235, 245, 0.85)'
  ctx.fillRect(68, heroY + 78, w - 180, 22)
  ctx.fillStyle = 'rgba(201, 205, 224, 0.45)'
  ctx.fillRect(68, heroY + 118, w - 240, 16)
  ctx.fillRect(68, heroY + 148, w - 290, 16)

  // Feature list cards below.
  let y = heroY + heroH + 36
  for (let i = 0; i < 4; i++) {
    if (y + 116 > h - 48) break
    ctx.fillStyle = '#171c2e'
    ctx.beginPath()
    ctx.roundRect(36, y, w - 72, 108, 18)
    ctx.fill()
    ctx.fillStyle = i % 2 === 0 ? '#2eb8f2' : '#944cfa'
    ctx.beginPath()
    ctx.roundRect(60, y + 26, 56, 56, 14)
    ctx.fill()
    ctx.fillStyle = 'rgba(232, 235, 245, 0.8)'
    ctx.fillRect(140, y + 32, (w - 220) * (0.75 - i * 0.08), 18)
    ctx.fillStyle = 'rgba(141, 147, 171, 0.5)'
    ctx.fillRect(140, y + 62, (w - 220) * (0.55 + (i % 2) * 0.15), 14)
    y += 128
  }
}

/** Paints project `id`'s app screen to fill a w x h canvas, from `img` when it has loaded. */
export function paintAppScreen(
  ctx: CanvasRenderingContext2D,
  id: string,
  w: number,
  h: number,
  img?: HTMLImageElement | null,
  title?: string,
) {
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(0, 0, w, h, 36)
  ctx.clip()
  if (img) {
    // Cover the screen, cropping evenly top and bottom so the status bar and bottom sheet both keep some room.
    const s = Math.max(w / img.width, h / img.height)
    ctx.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s)
  } else {
    const painter = SCREENS[id]
    if (painter) painter(ctx, w, h)
    else defaultScreen(ctx, w, h, title)
  }
  ctx.restore()
}
