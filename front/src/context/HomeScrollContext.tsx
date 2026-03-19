import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'

const HOME_SECTIONS_COUNT = 8 // hero + 6 steps + newsletter

type HomeScrollContextValue = {
  sectionIndex: number
  setSectionIndex: (index: number) => void
  scrollToSection: (index: number) => void
  registerScrollToSection: (fn: (index: number) => void) => () => void
  sectionsCount: number
}

const HomeScrollContext = createContext<HomeScrollContextValue | null>(null)

export function HomeScrollProvider({ children }: { children: ReactNode }) {
  const [sectionIndex, setSectionIndex] = useState(0)
  const scrollToSectionRef = useRef<((index: number) => void) | null>(null)

  const scrollToSection = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, HOME_SECTIONS_COUNT - 1))
    setSectionIndex(clamped)
    scrollToSectionRef.current?.(clamped)
  }, [])

  const registerScrollToSection = useCallback((fn: (index: number) => void) => {
    scrollToSectionRef.current = fn
    return () => {
      scrollToSectionRef.current = null
    }
  }, [])

  const value: HomeScrollContextValue = {
    sectionIndex,
    setSectionIndex,
    scrollToSection,
    registerScrollToSection,
    sectionsCount: HOME_SECTIONS_COUNT,
  }

  return (
    <HomeScrollContext.Provider value={value}>
      {children}
    </HomeScrollContext.Provider>
  )
}

export function useHomeScroll() {
  const ctx = useContext(HomeScrollContext)
  return ctx
}
