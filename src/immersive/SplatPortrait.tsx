import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial, Vector2, Vector4 } from 'three'
import vertexShader from './splat.vert?raw'
import fragmentShader from './splat.frag?raw'
import { useMouseWorld } from './useMouseWorld'
import { sampleEdges } from './roomLayout'
import type { ScrollProgress } from './useScrollProgress'

export interface PixelRect {
  x: number
  y: number
  width: number
  height: number
}

interface SplatPortraitProps {
  count: number
  /** Screen rect of the 2D card the particles start from / return to. */
  cardRect: PixelRect | null
  /** 1 = show portrait, 0 = collapse back onto the card. */
  morphTarget: 0 | 1
  onMorphDone?: (target: 0 | 1) => void
  progress: RefObject<ScrollProgress>
  lowEnd: boolean
}

const MORPH_SECONDS = 1.6
const FONT = '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", "Heiti TC", sans-serif'

/** Rasterises the name and returns `count` jittered sample points, normalised so the text is 1 unit tall. */
function samplePortrait(count: number) {
  const w = 1200
  const h = 640
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 300px ${FONT}`
  ctx.fillText('陳德維', w / 2, h * 0.4)
  ctx.font = `500 84px ${FONT}`
  ctx.letterSpacing = '24px'
  ctx.fillText('DE-WEI CHEN', w / 2 + 12, h * 0.84)

  const data = ctx.getImageData(0, 0, w, h).data
  const filled: number[] = []
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (data[(y * w + x) * 4 + 3] > 128) filled.push(x, y)
    }
  }

  const out = new Float32Array(count * 3)
  const pairs = filled.length / 2
  for (let i = 0; i < count; i++) {
    const p = Math.floor(Math.random() * pairs) * 2
    const px = filled[p] + (Math.random() - 0.5) * 2
    const py = filled[p + 1] + (Math.random() - 0.5) * 2
    out[i * 3] = (px - w / 2) / h
    out[i * 3 + 1] = -(py - h / 2) / h
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.12
  }
  return { positions: out, aspect: w / h }
}

function buildGeometry(count: number, lowEnd: boolean) {
  const { positions, aspect } = samplePortrait(count)
  const planeUV = new Float32Array(count * 2)
  const colors = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  const cyan = [0.18, 0.72, 0.95]
  const violet = [0.58, 0.3, 0.98]

  for (let i = 0; i < count; i++) {
    planeUV[i * 2] = Math.random()
    planeUV[i * 2 + 1] = Math.random()
    seeds[i] = Math.random()

    const t = Math.min(1, Math.max(0, positions[i * 3] / aspect + 0.5))
    const sparkle = Math.random() < 0.05
    const b = sparkle ? 1.3 : 0.45 + Math.random() * 0.45
    for (let c = 0; c < 3; c++) {
      const base = cyan[c] + (violet[c] - cyan[c]) * t
      colors[i * 3 + c] = (sparkle ? 0.9 : base) * b
    }
  }

  const geo = new BufferGeometry()
  // `position` is unused by the shader but three needs it for draw-range/bounds.
  geo.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
  geo.setAttribute('aTarget', new BufferAttribute(positions, 3))
  geo.setAttribute('aRoom', new BufferAttribute(sampleEdges(count, lowEnd), 3))
  geo.setAttribute('aPlaneUV', new BufferAttribute(planeUV, 2))
  geo.setAttribute('aColor', new BufferAttribute(colors, 3))
  geo.setAttribute('aSeed', new BufferAttribute(seeds, 1))
  return { geo, aspect }
}

export function SplatPortrait({ count, cardRect, morphTarget, onMorphDone, progress, lowEnd }: SplatPortraitProps) {
  const { viewport, size, gl } = useThree()
  const mouse = useMouseWorld()
  const { geo, aspect } = useMemo(() => buildGeometry(count, lowEnd), [count, lowEnd])
  const morph = useRef(cardRect ? 0 : 1)
  const reported = useRef<0 | 1 | null>(cardRect ? null : 1)

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uMorph: { value: cardRect ? 0 : 1 },
          uAssemble: { value: 0 },
          uFade: { value: 1 },
          uSize: { value: 30 },
          uPixelRatio: { value: 1 },
          uRect: { value: new Vector4() },
          uPortrait: { value: [1, 0, 0] },
          uMouse: { value: new Vector2(99, 99) },
          uMouseVel: { value: new Vector2() },
          uMouseStrength: { value: 0 },
          uRadius: { value: 0.9 },
        },
      }),
    // Created once; uniforms are updated every frame.
    [],
  )

  useEffect(() => () => {
    geo.dispose()
    material.dispose()
  }, [geo, material])

  useEffect(() => {
    reported.current = null
  }, [morphTarget])

  useFrame((state, dt) => {
    const u = material.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uPixelRatio.value = gl.getPixelRatio()

    // Card rect: pixels -> world units on the z = 0 plane.
    const sx = viewport.width / size.width
    const sy = viewport.height / size.height
    const r = cardRect ?? { x: size.width * 0.1, y: size.height * 0.2, width: size.width * 0.8, height: size.height * 0.4 }
    u.uRect.value.set(
      (r.x + r.width / 2 - size.width / 2) * sx,
      -(r.y + r.height / 2 - size.height / 2) * sy,
      r.width * sx,
      r.height * sy,
    )

    // Fit the name into the upper-middle of the viewport; on portrait phones lift it
    // into the top third so the hero caption below never overlaps it.
    const scale = Math.min((viewport.width * 0.86) / aspect, viewport.height * 0.42)
    const portraitScreen = viewport.width / viewport.height < 0.8
    u.uPortrait.value = [scale, viewport.height * (portraitScreen ? 0.2 : 0.08), 0]
    u.uRadius.value = Math.max(0.5, scale * 0.3)

    const step = dt / MORPH_SECONDS
    morph.current = morphTarget === 1 ? Math.min(1, morph.current + step) : Math.max(0, morph.current - step)
    u.uMorph.value = morph.current
    if (morph.current === morphTarget && reported.current !== morphTarget) {
      reported.current = morphTarget
      onMorphDone?.(morphTarget)
    }

    // First screen of scrolling: the name flies apart into the room's point cloud,
    // which then gives way to the wireframe.
    const { screens } = progress.current
    const assemble = Math.min(1, screens / 0.6)
    u.uAssemble.value = assemble
    u.uFade.value = 1 - Math.min(1, Math.max(0, (screens - 0.6) / 0.5))

    const m = mouse.current
    u.uMouse.value.copy(m.world)
    u.uMouseVel.value.copy(m.velocity).clampLength(0, 8)
    u.uMouseStrength.value = m.strength * (1 - assemble * 0.6)
  })

  return <points geometry={geo} material={material} frustumCulled={false} />
}
