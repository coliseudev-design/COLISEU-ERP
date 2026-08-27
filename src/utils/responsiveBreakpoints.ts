/** Breakpoints padrão Tailwind (em pixels) — NÃO alterar */
export const BREAKPOINTS = {
  sm:  640,
  md:  768,
  lg:  1024,
  xl:  1280,
  '2xl': 1536,
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

export const isMobile  = (w: number) => w < BREAKPOINTS.sm
export const isTablet  = (w: number) => w >= BREAKPOINTS.sm && w < BREAKPOINTS.lg
export const isDesktop = (w: number) => w >= BREAKPOINTS.lg

/** Hook para width atual da janela */
import { useState, useEffect } from 'react'
export function useWindowWidth() {
  const [width, setWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : BREAKPOINTS.lg)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler, { passive: true })
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}
