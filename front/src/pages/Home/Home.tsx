import './Home.css'
import { useEffect, useRef, useState, FormEvent } from 'react'
import { useHomeScroll } from '../../context/HomeScrollContext'
import { ContainerScroll } from '../../components/ui/container-scroll-animation'
import { PinContainer } from '../../components/ui/3d-pin'

const TUTORIAL_STORAGE_KEY = 'mangafrik_home_tutorial_seen'

type Step = {
  id: number
  titleFr: string
  titleEn: string
  descriptionFr: string
  descriptionEn: string
}

const steps: Step[] = [
  {
    id: 1,
    titleFr: 'Comprendre ce qu’est MangAfrik',
    titleEn: 'Understand what MangAfrik is',
    descriptionFr:
      'MangAfrik evotre nouvelle platforme de scan de mangas et webtoons africains.',
    descriptionEn:
      'MangAfrik is a new platform to scan and read African mangas and webtoons.',
  },
  {
    id: 2,
    titleFr: 'Attirer les bonnes personnes',
    titleEn: 'Capture the right people',
    descriptionFr:
      'Tout les mangas de vos auteurs connus ou préférés',
    descriptionEn:
      'All your favorite authors and their mangas.',
  },
  {
    id: 3,
    titleFr: 'Raconter une histoire simple',
    titleEn: 'Tell a simple story',
    descriptionFr:
      'La maison des Otaku Africains « t\'ouvre ses portes.»',
    descriptionEn:
      'The home of African Otaku « opens its doors.»',
  },
  {
    id: 4,
    titleFr: 'Montrer le parcours',
    titleEn: 'Show the flow',
    descriptionFr:
      'L\'expérience manga, le plus riche du continent.',
    descriptionEn:
      'The manga experience, the richest on the continent.',
  },
  {
    id: 5,
    titleFr: 'Proposer un prochain pas clair',
    titleEn: 'Offer a clear next step',
    descriptionFr:
      'Trouvez votre manga préféré, partagez-le avec vos amis, et restez informé des nouveautés.',
    descriptionEn:
      'Find your favorite manga, share it with your friends, and stay updated on new releases.',
  },
  {
    id: 6,
    titleFr: 'Apprendre vite et ajuster',
    titleEn: 'Learn fast and adjust',
    descriptionFr:
      'Trouvez votre manga préféré, partagez-le avec vos amis, et restez informé des nouveautés.',
    descriptionEn:
      'Find your favorite manga, share it with your friends, and stay updated on new releases.',
  },
]

const ComingSoon = () => {
  const homeScroll = useHomeScroll()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [showTutorial, setShowTutorial] = useState(() => {
    if (typeof window === 'undefined') return false
    return !localStorage.getItem(TUTORIAL_STORAGE_KEY)
  })
  const [tutorialVisible, setTutorialVisible] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)

  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

  const registerSectionRef = (index: number) => (el: HTMLDivElement | null) => {
    sectionRefs.current[index] = el
  }

  const dismissTutorial = () => {
    if (isDismissing) return
    setIsDismissing(true)
    window.setTimeout(() => {
      setShowTutorial(false)
      localStorage.setItem(TUTORIAL_STORAGE_KEY, '1')
      setIsDismissing(false)
      setTutorialVisible(false)
    }, 300)
  }

  // Start fade-in after toast is in the DOM so the animation runs
  useEffect(() => {
    if (!showTutorial) return
    const t = window.setTimeout(() => setTutorialVisible(true), 50)
    return () => window.clearTimeout(t)
  }, [showTutorial])

  useEffect(() => {
    if (!showTutorial || !tutorialVisible) return
    const id = window.setTimeout(dismissTutorial, 3500)
    return () => window.clearTimeout(id)
  }, [showTutorial, tutorialVisible])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!email || !email.includes('@')) {
      setStatus('error')
      return
    }

    setStatus('success')
  }

  // Connect navbar dots to vertical sections
  useEffect(() => {
    if (!homeScroll) return

    const unregister = homeScroll.registerScrollToSection((index: number) => {
      const el = sectionRefs.current[index]
      if (!el) return

      const navOffset = 80
      const top = el.getBoundingClientRect().top + window.scrollY - navOffset

      window.scrollTo({
        top,
        behavior: 'smooth',
      })
    })

    return () => {
      unregister()
    }
  }, [homeScroll])

  // Update active dot while scrolling
  useEffect(() => {
    if (!homeScroll) return

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIndex = homeScroll.sectionIndex
        let bestRatio = 0

        entries.forEach((entry) => {
          const index = sectionRefs.current.findIndex((el) => el === entry.target)
          if (index === -1) return
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio
            bestIndex = index
          }
        })

        if (bestRatio > 0) {
          homeScroll.setSectionIndex(bestIndex)
        }
      },
      {
        threshold: [0.3, 0.6, 0.9],
      },
    )

    sectionRefs.current.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => {
      observer.disconnect()
    }
  }, [homeScroll])

  return (
    <div className="relative w-full bg-white dark:bg-black">
      {/* Grid background across full page */}
      <div
        className="
          pointer-events-none
          absolute inset-0
          [background-size:40px_40px]
          [background-image:linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)]
          dark:[background-image:linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)]
        "
        aria-hidden="true"
      />
      <div
        className="
          pointer-events-none
          absolute inset-0
          flex items-center justify-center
          bg-white dark:bg-black
          [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]
        "
        aria-hidden="true"
      />

      <div className="relative z-10">
        {showTutorial && (
          <>
            <div
              className={`tutorial-backdrop ${tutorialVisible ? 'tutorial-backdrop-enter' : ''} ${isDismissing ? 'tutorial-backdrop-leave' : ''}`}
              onClick={dismissTutorial}
              aria-hidden="true"
            />
            <div
              className={`tutorial-toast ${tutorialVisible ? 'tutorial-toast-enter' : ''} ${isDismissing ? 'tutorial-toast-leave' : ''}`}
              role="status"
              aria-live="polite"
              onClick={dismissTutorial}
            >
              <span className="tutorial-toast-dot" aria-hidden="true" />
              <p className="tutorial-toast-text">
                Utilise les points en haut de la page pour suivre le parcours étape par étape.
              </p>
            </div>
          </>
        )}
        <div className="home-horizontal">
        {/* Section 0: Hero scroll demo */}
        <section ref={registerSectionRef(0)} className="mb-16">
          <div className="flex flex-col overflow-hidden">
            <ContainerScroll
              titleComponent={
                <>
                  <h1 className="text-3xl md:text-4xl font-semibold text-black dark:text-white">
                    Découvre la magie de <br />
                    <span className="text-4xl md:text-[4.5rem] font-bold mt-1 leading-none">
                      MangAfrik
                    </span>
                  </h1>
                </>
              }
            >
              <img
                src="/linear.webp"
                alt="MangAfrik hero"
                height={720}
                width={1400}
                className="mx-auto rounded-2xl object-cover h-full object-left-top"
                draggable={false}
              />
            </ContainerScroll>
          </div>
        </section>

        {/* Sections 1‑6: narrative cards with 3D pin effect */}
        {steps.map((step, idx) => (
          <section key={step.id} ref={registerSectionRef(idx + 1)} className="step-panel">
            <div className="max-w-md w-full">
              <PinContainer title="MangAfrik • Parcours" href={undefined}>
                <div className="flex h-[16rem] w-full flex-col justify-between rounded-2xl bg-card/90 px-4 py-4 text-left text-slate-100/80">
                  <div>
                    <h3 className="text-base font-semibold text-slate-50 mb-2">
                      {step.titleFr}
                    </h3>
                    <p className="text-sm text-slate-300 mb-2">
                      {step.descriptionFr}
                    </p>
                    <p className="text-xs text-slate-400">
                      {step.titleEn} — {step.descriptionEn}
                    </p>
                  </div>
                  <div className="mt-4 h-16 w-full rounded-xl bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 opacity-90" />
                </div>
              </PinContainer>
            </div>
          </section>
        ))}

        <section ref={registerSectionRef(steps.length + 1)} className="step-panel">
          <div className="step-inner">
            <h1 className="step-title">
              <span className="step-gradient">Reste informé</span> – reçois les prochains tests MangAfrik
            </h1>
            <p className="step-description">
              Laisse ton e‑mail pour être prévenu des prochaines expériences, prototypes et mises à jour autour de MangAfrik.
            </p>
            <p className="step-description-en">
              Leave your email to get updates when we launch new MangAfrik experiments and prototypes.
            </p>
            <form className="step-form" onSubmit={handleSubmit}>
              <input
                type="email"
                className="step-input"
                placeholder="ton.email@exemple.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (status !== 'idle') setStatus('idle')
                }}
              />
              <button type="submit" className="step-button">
                S’inscrire
              </button>
            </form>
            {status === 'success' && (
              <p className="step-feedback step-feedback-success">
                Merci, c’est noté. Tu recevras les prochaines nouveautés MangAfrik.
              </p>
            )}
            {status === 'error' && (
              <p className="step-feedback step-feedback-error">
                Ajoute un e‑mail valide avant de t’inscrire.
              </p>
            )}
          </div>
        </section>
        </div>
      </div>
    </div>
  )
}

export default ComingSoon