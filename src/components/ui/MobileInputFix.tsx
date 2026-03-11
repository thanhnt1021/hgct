'use client'

import { useEffect } from 'react'

/**
 * Prevent mobile browser auto-zoom on input focus.
 *
 * Mechanism: iOS Safari & Android Chrome auto-zoom when a focused input
 * has font-size < 16px. The only reliable fix without locking user zoom
 * permanently is to temporarily set maximum-scale=1 in the viewport meta
 * while an input is focused, then restore immediately on blur.
 *
 * Result: no auto-zoom on tap, user can still manually pinch-zoom when
 * no input is focused.
 */
export default function MobileInputFix() {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
    if (!meta) return

    const original = meta.content
    // Build locked version: append maximum-scale=1 if not already present
    const locked = original.includes('maximum-scale')
      ? original.replace(/maximum-scale=[^,]*/, 'maximum-scale=1')
      : original + ', maximum-scale=1'

    const lock = (e: TouchEvent | FocusEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag && ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) {
        meta.content = locked
      }
    }

    const unlock = (e: FocusEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag && ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) {
        meta.content = original
      }
    }

    document.addEventListener('touchstart', lock as EventListener, { passive: true })
    document.addEventListener('focusout', unlock)

    return () => {
      document.removeEventListener('touchstart', lock as EventListener)
      document.removeEventListener('focusout', unlock)
    }
  }, [])

  return null
}
