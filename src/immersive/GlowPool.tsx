import { useEffect, useMemo, useRef, type ComponentProps, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, DoubleSide, FrontSide, MeshBasicMaterial, ShaderMaterial, SRGBColorSpace, Vector2, type Mesh } from 'three'
import vertexShader from './textPlane.vert?raw'
import fragmentShader from './glow.frag?raw'

/** An sRGB colour as 0..255 channels. */
export type Rgb = [number, number, number]

/** Below this a light is off and not drawn at all, so only the lamps at the current stop cost anything. */
const OFF = 0.002

const linear = ([r, g, b]: Rgb) => new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace)

function glowMaterial(color: Rgb, edge: Rgb, beam: boolean) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    defines: beam ? { BEAM: '' } : {},
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: beam ? DoubleSide : FrontSide,
    uniforms: {
      uColor: { value: linear(color) },
      uEdge: { value: linear(edge) },
      uPeak: { value: 0 },
      uCenter: { value: new Vector2(0.5, 0.5) },
      uStretch: { value: 1 },
      uRadius: { value: 0.46 },
    },
  })
}

/** Keeps a light's brightness in step with `strength`, and hides it while it is off. */
function useLit(material: ShaderMaterial, peak: number, strength: () => number) {
  const mesh = useRef<Mesh>(null)
  useEffect(() => () => material.dispose(), [material])
  useFrame(() => {
    const s = strength()
    material.uniforms.uPeak.value = peak * s
    mesh.current!.visible = s > OFF
  })
  return mesh
}

interface GlowPoolProps extends Omit<ComponentProps<'mesh'>, 'material'> {
  size: [number, number]
  color: Rgb
  /** Colour towards the rim; defaults to `color`. */
  edgeColor?: Rgb
  /** Brightness at the hot spot when fully lit. */
  peak: number
  /** Read every frame: 0 is off, 1 fully lit. */
  strength: () => number
  /** Hot spot on the plane, (0, 0) top left. */
  center?: [number, number]
  /** Horizontal stretch of the falloff, as a multiple of its height. */
  stretch?: number
  /** Falloff radius, as a fraction of the plane's height. */
  radius?: number
}

/**
 * Light spilling onto a surface, faked with an additive falloff on a plane laid just
 * in front of it. The room's own shader ignores three.js lights, so every lamp is one of these.
 */
export function GlowPool({ size, color, edgeColor = color, peak, strength, center = [0.5, 0.5], stretch = 1, radius = 0.46, ...mesh }: GlowPoolProps) {
  // Colours usually come in as inline literals, so key on their values.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const material = useMemo(() => glowMaterial(color, edgeColor, false), [color.join(), edgeColor.join()])
  material.uniforms.uCenter.value.set(...center)
  material.uniforms.uStretch.value = stretch
  material.uniforms.uRadius.value = radius
  const ref = useLit(material, peak, strength)

  return (
    <mesh ref={ref} raycast={() => null} visible={false} {...mesh} material={material}>
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
  const ref = useRef<Mesh>(null)
  const material = useMemo(() => new MeshBasicMaterial({ color, transparent: true, opacity: 0, toneMapped: false }), [color])
  useEffect(() => () => material.dispose(), [material])
  useFrame(() => {
    const s = strength()
    material.opacity = s
    ref.current!.visible = s > OFF
  })

  return (
    <mesh ref={ref} raycast={() => null} visible={false} {...mesh} material={material}>
      {children}
    </mesh>
  )
}

/** A cone of light hanging from `top` down to `bottom` (y), widening to `spread` at the bottom. */
export function Beam({
  color,
  peak,
  strength,
  top,
  bottom,
  spread,
  ...group
}: Omit<ComponentProps<'group'>, 'children'> & { color: Rgb; peak: number; strength: () => number; top: number; bottom: number; spread: number }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const material = useMemo(() => glowMaterial(color, color, true), [color.join()])
  const ref = useLit(material, peak, strength)

  return (
    <group {...group}>
      <mesh ref={ref} raycast={() => null} visible={false} material={material} position={[0, (top + bottom) / 2, 0]}>
        <cylinderGeometry args={[0.04, spread, top - bottom, 32, 1, true]} />
      </mesh>
    </group>
  )
}
