import { useEffect, useMemo, type ComponentProps } from 'react'
import { useFrame } from '@react-three/fiber'
import { ShaderMaterial, Vector3, type Texture } from 'three'
import vertexShader from './textPlane.vert?raw'
import fragmentShader from './textPlane.frag?raw'

interface TextPlaneProps extends Omit<ComponentProps<'mesh'>, 'material'> {
  map: Texture
  width: number
  height: number
  /** Read every frame: 0 hides the text, 1 shows it all. */
  reveal?: () => number
  glow?: () => number
  /** Read every frame: [u, v] of a progress head; the texture is lit left of u and dimmed right of it. */
  fill?: () => [number, number]
  /** false draws over everything, for panels held up in front of the camera. */
  depthTest?: boolean
}

/** A flat panel showing a canvas texture, revealed by a scan line. Faces +z. */
export function TextPlane({ map, width, height, reveal, glow, fill, depthTest = true, ...mesh }: TextPlaneProps) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest,
        uniforms: { uMap: { value: map }, uReveal: { value: 1 }, uGlow: { value: 0 }, uFill: { value: new Vector3() } },
      }),
    [map, depthTest],
  )
  useEffect(() => () => material.dispose(), [material])

  useFrame(() => {
    if (reveal) material.uniforms.uReveal.value = reveal()
    if (glow) material.uniforms.uGlow.value = glow()
    if (fill) material.uniforms.uFill.value.set(...fill(), 1)
  })

  return (
    <mesh {...mesh} material={material}>
      <planeGeometry args={[width, height]} />
    </mesh>
  )
}
