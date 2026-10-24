import { useEffect, useMemo, type ComponentProps } from 'react'
import { useFrame } from '@react-three/fiber'
import { ShaderMaterial, type Texture } from 'three'
import vertexShader from './textPlane.vert?raw'
import fragmentShader from './textPlane.frag?raw'

interface TextPlaneProps extends Omit<ComponentProps<'mesh'>, 'material'> {
  map: Texture
  width: number
  height: number
  /** Read every frame: 0 hides the text, 1 shows it all. */
  reveal?: () => number
  glow?: () => number
}

/** A flat panel showing a canvas texture, revealed by a scan line. Faces +z. */
export function TextPlane({ map, width, height, reveal, glow, ...mesh }: TextPlaneProps) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: { uMap: { value: map }, uReveal: { value: 1 }, uGlow: { value: 0 } },
      }),
    [map],
  )
  useEffect(() => () => material.dispose(), [material])

  useFrame(() => {
    if (reveal) material.uniforms.uReveal.value = reveal()
    if (glow) material.uniforms.uGlow.value = glow()
  })

  return (
    <mesh {...mesh} material={material}>
      <planeGeometry args={[width, height]} />
    </mesh>
  )
}
