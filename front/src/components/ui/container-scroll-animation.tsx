import type { ReactNode } from 'react'
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

type ContainerScrollProps = {
  titleComponent: ReactNode
  children: ReactNode
}

export function ContainerScroll({ titleComponent, children }: ContainerScrollProps) {
  const ref = useRef<HTMLDivElement | null>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 80%', 'end 20%'],
  })

  const titleY = useTransform(scrollYProgress, [0, 1], [0, -60])
  const titleOpacity = useTransform(scrollYProgress, [0, 0.3, 1], [1, 1, 0.4])

  const mediaScale = useTransform(scrollYProgress, [0, 1], [1.05, 0.9])
  const mediaY = useTransform(scrollYProgress, [0, 1], [0, -80])
  const mediaRadius = useTransform(scrollYProgress, [0, 1], [32, 20])

  return (
    <div
      ref={ref}
      className="relative w-full max-w-5xl mx-auto py-20 md:py-28"
    >
      <motion.div
        style={{ y: titleY, opacity: titleOpacity }}
        className="mb-10 text-center"
      >
        {titleComponent}
      </motion.div>

      <motion.div
        style={{ scale: mediaScale, y: mediaY, borderRadius: mediaRadius }}
        className="
          relative
          overflow-hidden
          border
          bg-card
          shadow-[0_18px_45px_rgba(15,23,42,0.35)]
        "
      >
        {children}
      </motion.div>
    </div>
  )
}

