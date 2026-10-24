import { useSyncExternalStore } from 'react'

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

const webgl = typeof document !== 'undefined' && supportsWebGL()
const motionQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null

function subscribe(cb: () => void) {
  motionQuery?.addEventListener('change', cb)
  return () => motionQuery?.removeEventListener('change', cb)
}

/** Whether the immersive mode can run, and whether it should animate. */
export function useCapabilities() {
  const reducedMotion = useSyncExternalStore(subscribe, () => motionQuery?.matches ?? false, () => false)
  // Safari on iOS masks hardwareConcurrency to 4 for anti-fingerprinting.
  // Modern iOS devices have high-performance GPUs and should not be classified as low-end.
  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
  const lowEnd = !isIOS && (navigator.hardwareConcurrency ?? 8) <= 4 && /Mobi|Android/i.test(navigator.userAgent)
  return { webgl, reducedMotion, lowEnd }
}
