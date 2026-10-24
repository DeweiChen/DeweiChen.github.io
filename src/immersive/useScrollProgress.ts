import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export interface ScrollProgress {
  /** scrollY in viewport heights (0 = top, 1 = one screen down). */
  screens: number
}

/** Smoothed scroll position, read once per frame and shared by everything in the scene. */
export function useScrollProgress() {
  const progress = useRef<ScrollProgress>({ screens: 0 })

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 6)
    progress.current.screens += (scrollY / innerHeight - progress.current.screens) * k
  })

  return progress
}
