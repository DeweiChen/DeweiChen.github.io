import { useMemo, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Plane, Vector3 } from 'three'
import { scanHeight } from './roomLayout'
import type { ScrollProgress } from './useScrollProgress'

/** A clipping plane that follows the room's scan line, so props appear with the room around them. */
export function useScanClip(progress: RefObject<ScrollProgress>) {
  const clip = useMemo(() => new Plane(new Vector3(0, -1, 0), -10), [])
  useFrame(() => {
    clip.constant = scanHeight(progress.current.screens)
  })
  return clip
}
