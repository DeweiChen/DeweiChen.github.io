import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { READER_EVENT } from './panel'

export interface ScrollProgress {
  /** scrollY in viewport heights (0 = top, 1 = one screen down). */
  screens: number
}

/** A scroll this far in one go is a jump: the scene skips to it and the camera flies over. */
export const JUMP_SCREENS = 1.5

/** Smoothed scroll position, read once per frame and shared by everything in the scene. */
export function useScrollProgress() {
  const progress = useRef<ScrollProgress>({ screens: 0 })
  const invalidate = useThree((s) => s.invalidate)
  const reading = useRef(false)

  useEffect(() => {
    const onReader = (e: Event) => {
      reading.current = (e as CustomEvent<boolean>).detail
    }
    window.addEventListener(READER_EVENT, onReader)
    return () => window.removeEventListener(READER_EVENT, onReader)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (!reading.current) invalidate()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [invalidate])

  // Priority -2 runs before CameraRig (-1) and scene objects (0) so everything sees the updated scroll in the same frame.
  useFrame((_, dt) => {
    if (reading.current) return
    const to = scrollY / innerHeight
    const cur = progress.current.screens
    if (cur === to) return
    const diff = to - cur
    // Easing through every stop in between would replay the whole tour; skip straight there.
    if (Math.abs(diff) > JUMP_SCREENS || Math.abs(diff) <= 1e-4) {
      progress.current.screens = to
    } else {
      progress.current.screens = cur + diff * (1 - Math.exp(-Math.min(dt, 0.05) * 6))
    }
    invalidate()
  }, -2)

  return progress
}
