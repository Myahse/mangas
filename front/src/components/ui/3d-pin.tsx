import type { ReactNode, MouseEvent } from 'react'
import { useCallback, useRef, useState } from 'react'

type PinContainerProps = {
  title?: string
  href?: string
  children: ReactNode
}

export function PinContainer({ title, href, children }: PinContainerProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [transform, setTransform] = useState<string>('rotateX(0deg) rotateY(0deg) scale3d(1,1,1)')
  const [glowPosition, setGlowPosition] = useState<{ x: number; y: number }>({ x: 50, y: 0 })

  const handleMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const midX = rect.width / 2
    const midY = rect.height / 2

    const rotateX = ((y - midY) / midY) * -8 // tilt up/down
    const rotateY = ((x - midX) / midX) * 8 // tilt left/right

    setTransform(`rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03,1.03,1.03)`)

    const glowX = (x / rect.width) * 100
    const glowY = (y / rect.height) * 100
    setGlowPosition({ x: glowX, y: glowY })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setTransform('rotateX(0deg) rotateY(0deg) scale3d(1,1,1)')
    setGlowPosition({ x: 50, y: 0 })
  }, [])

  const Wrapper = href ? 'a' : 'div'

  return (
    <Wrapper
      href={href}
      className="
        group relative flex items-center justify-center
        rounded-3xl border border-slate-200/60 dark:border-slate-800/80
        bg-slate-950/80 dark:bg-black/70
        shadow-[0_20px_45px_rgba(15,23,42,0.45)]
        overflow-hidden
        transition-transform transition-shadow
        duration-300
      "
      style={{ perspective: 1200 }}
    >
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="
          relative w-full h-full
          transition-transform transition-shadow
          duration-200
          will-change-transform
        "
        style={{
          transform,
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className="
            pointer-events-none
            absolute -inset-1
            rounded-[1.75rem]
            opacity-0
            group-hover:opacity-100
            transition-opacity
            duration-200
          "
          style={{
            background: `radial-gradient(circle at ${glowPosition.x}% ${glowPosition.y}%, rgba(56,189,248,0.25), transparent 60%)`,
          }}
        />

        <div
          className="
            relative z-10 w-full h-full px-3 py-3 sm:px-4 sm:py-4
            rounded-[1.5rem]
          "
          style={{ transform: 'translateZ(40px)' }}
        >
          {title && (
            <div className="mb-2 text-xs font-medium text-slate-400/80 line-clamp-1">
              {title}
            </div>
          )}
          {children}
        </div>
      </div>
    </Wrapper>
  )
}

