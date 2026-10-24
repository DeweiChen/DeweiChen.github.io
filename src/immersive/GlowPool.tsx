import { useEffect, useMemo, type ComponentProps, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture, Color, DoubleSide, MeshBasicMaterial } from 'three'
import { useCanvasTexture } from './textCanvas'

type Rgb = [number, number, number]
/** Gradient stops from the hot spot outwards: [offset 0..1, css colour]. */
export type GlowStops = [number, string][]

/** A soft falloff in one colour, peaking at `peak` alpha. */
export function glowStops([r, g, b]: Rgb, peak: number): GlowStops {
  return [0, 0.57, 0.25, 0.07, 0].map((k, i) => [i / 4, `rgba(${r}, ${g}, ${b}, ${peak * k})`])
}

interface GlowPoolProps extends Omit<ComponentProps<'mesh'>, 'material'> {
  size: [number, number]
  stops: GlowStops
  /** Read every frame: 0 is off, 1 fully lit. */
  strength: () => number
  /** Hot spot on the plane, in canvas space (0, 0 top left). */
  center?: [number, number]
  /** Horizontal stretch of the falloff, as a multiple of its height. */
  stretch?: number
  /** Falloff radius, as a fraction of the plane's height. */
  radius?: number
}

/**
 * Light spilling onto a surface, faked with an additive gradient on a plane laid just
 * in front of it. The room's own shader ignores three.js lights, so every lamp is one of these.
 */
export function GlowPool({ size, stops, strength, center = [0.5, 0.5], stretch = 1, radius = 0.46, ...mesh }: GlowPoolProps) {
  const S = 512
  const map = useCanvasTexture(
    S,
    S,
    (ctx) => {
      ctx.save()
      ctx.translate(S * center[0], S * center[1])
      ctx.scale(stretch, 1)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, S * radius)
      for (const [o, c] of stops) g.addColorStop(o, c)
      ctx.fillStyle = g
      ctx.fillRect(-S * 2, -S * 2, S * 4, S * 4)
      ctx.restore()
    },
    [JSON.stringify(stops), center[0], center[1], stretch, radius],
  )

  const material = useMemo(
    () => new MeshBasicMaterial({ map, transparent: true, blending: AdditiveBlending, depthWrite: false, opacity: 0, toneMapped: false }),
    [map],
  )
  useEffect(() => () => material.dispose(), [material])
  useFrame(() => {
    material.opacity = strength()
  })

  return (
    <mesh raycast={() => null} {...mesh} material={material}>
      <planeGeometry args={size} />
    </mesh>
  )
}

/** The lamp itself: a shape that glows past the bloom threshold while it is on. */
export function Fixture({
  color,
  strength,
  children,
  ...mesh
}: Omit<ComponentProps<'mesh'>, 'material'> & { color: Color | string; strength: () => number; children: ReactNode }) {
  const material = useMemo(() => new MeshBasicMaterial({ color, transparent: true, opacity: 0, toneMapped: false }), [color])
  useEffect(() => () => material.dispose(), [material])
  useFrame(() => {
    material.opacity = strength()
  })

  return (
    <mesh raycast={() => null} {...mesh} material={material}>
      {children}
    </mesh>
  )
}

let beamAlpha: CanvasTexture | undefined
function getBeamAlpha() {
  if (beamAlpha) return beamAlpha
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  // Bright at the lamp (top of the cylinder's uv), fading towards the floor.
  const g = ctx.createLinearGradient(0, 0, 0, 128)
  g.addColorStop(0, '#fff')
  g.addColorStop(0.4, '#666')
  g.addColorStop(1, '#000')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, 128)
  beamAlpha = new CanvasTexture(canvas)
  return beamAlpha
}

/** A cone of light hanging from `top` down to `bottom` (y), widening to `spread` at the bottom. */
export function Beam({
  color,
  strength,
  top,
  bottom,
  spread,
  ...group
}: Omit<ComponentProps<'group'>, 'children'> & { color: Color | string; strength: () => number; top: number; bottom: number; spread: number }) {
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color,
        alphaMap: getBeamAlpha(),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        opacity: 0,
        toneMapped: false,
      }),
    [color],
  )
  useEffect(() => () => material.dispose(), [material])
  useFrame(() => {
    material.opacity = strength()
  })

  return (
    <group {...group}>
      <mesh raycast={() => null} material={material} position={[0, (top + bottom) / 2, 0]}>
        <cylinderGeometry args={[0.04, spread, top - bottom, 32, 1, true]} />
      </mesh>
    </group>
  )
}
