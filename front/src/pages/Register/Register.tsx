import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { registerUser } from '@/services/api'
import './Register.css'

type Role = 'reader'

type ReaderProfile = {
  favoriteGenres: string
  readingFrequency: 'daily' | 'weekly' | 'sometimes'
}

export default function Register() {
  const navigate = useNavigate()
  const { signInAfterRegister } = useAuth()
  const [referralCode, setReferralCode] = useState<string>('')

  const role: Role = 'reader'
  const [step, setStep] = useState<2 | 3>(2)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [account, setAccount] = useState({
    name: '',
    email: '',
    password: '',
  })

  const [reader, setReader] = useState<ReaderProfile>({
    favoriteGenres: '',
    readingFrequency: 'weekly',
  })

  useEffect(() => {
    // Capture referral code from URL (?ref=XXXX) and keep it for the register submission.
    try {
      const qs = new URLSearchParams(window.location.search)
      const ref = String(qs.get('ref') || '').trim()
      if (ref) setReferralCode(ref)
    } catch {}
  }, [])

  const title = useMemo(() => {
    if (step === 2) return 'Vos préférences de lecture'
    return 'Informations du compte'
  }, [step, role])

  const canContinueStep2 = role === 'reader'
    ? reader.favoriteGenres.trim().length > 0
    : false

  const canFinish =
    account.name.trim() &&
    account.email.trim() &&
    account.password.trim().length >= 6 &&
    role === 'reader'

  const onNext = () => {
    if (step === 2 && !canContinueStep2) return
    setStep(3)
  }

  const onBack = () => setStep(2)

  const onFinish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canFinish) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const profile = reader
      const res = await registerUser({
        role,
        name: account.name.trim(),
        email: account.email.trim(),
        password: account.password,
        profile,
        referralCode: referralCode || undefined,
      })

      signInAfterRegister({
        role: res?.role ?? role,
        displayName: res?.displayName ?? account.name.trim(),
        email: res?.email ?? account.email.trim(),
        profile: res?.profile ?? profile,
        token: res?.token,
      })
      navigate('/')
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Inscription impossible'
      const normalized = String(raw).toLowerCase()
      const message = normalized.includes('email already exists')
        ? 'This email is already in use'
        : String(raw)
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="register container">
      <div className="register__shell">
        <div className="register__header">
          <div className="register__topbar">
            <button
              type="button"
              className="register__btn register__btn--ghost register__nav-back register__nav-back--top"
              onClick={step === 2 ? () => navigate(-1) : onBack}
              aria-label="Retour"
            >
              <ChevronLeft size={18} />
              <span className="register__nav-back-text">Retour</span>
            </button>

            <div className="register__brand" aria-label="MangAfriq">
              <span>Mang</span>
              <span className="register__brand-accent">Afrik</span>
            </div>

            <div className="register__topbar-spacer" aria-hidden="true" />
          </div>

          <div className="register__brand register__brand--header" aria-label="MangAfriq">
            <span>Mang</span>
            <span className="register__brand-accent">Afrik</span>
          </div>
          <h1 className="register__title">{title}</h1>
          <p className="register__subtitle">
            {step === 2
              ? 'Quelques questions rapides pour personnaliser votre expérience.'
              : 'Dernière étape : vos identifiants de connexion.'}
          </p>
        </div>

        {(
          <form id="register-form" className="register__fields-bare" onSubmit={onFinish}>
            {submitError && (
              <div className="register__hint" role="alert">
                {submitError}
              </div>
            )}
            {step === 2 && role === 'reader' && (
              <>
                <label className="register__field">
                  <span>Genres préférés</span>
                  <input
                    value={reader.favoriteGenres}
                    onChange={(e) => setReader((p) => ({ ...p, favoriteGenres: e.target.value }))}
                    placeholder="Ex: Shonen, Romance, Aventure"
                  />
                </label>
                <label className="register__field">
                  <span>Fréquence de lecture</span>
                  <select
                    value={reader.readingFrequency}
                    onChange={(e) =>
                      setReader((p) => ({ ...p, readingFrequency: e.target.value as ReaderProfile['readingFrequency'] }))
                    }
                  >
                    <option value="daily">Tous les jours</option>
                    <option value="weekly">Chaque semaine</option>
                    <option value="sometimes">De temps en temps</option>
                  </select>
                </label>
              </>
            )}

            {step === 3 && (
              <>
                <label className="register__field">
                  <span>Nom</span>
                  <input
                    value={account.name}
                    onChange={(e) => setAccount((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Votre nom"
                  />
                </label>
                <label className="register__field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={account.email}
                    onChange={(e) => setAccount((p) => ({ ...p, email: e.target.value }))}
                    placeholder="vous@exemple.com"
                  />
                </label>
                <label className="register__field">
                  <span>Mot de passe</span>
                  <input
                    type="password"
                    value={account.password}
                    onChange={(e) => setAccount((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Minimum 6 caractères"
                  />
                </label>
                <div className="register__hint">
                  Vous pourrez personnaliser ces choix plus tard.
                </div>
              </>
            )}
          </form>
        )}

        <div className="register__footerbar">
          <button
            type="button"
            className="register__btn register__btn--ghost register__nav-back register__nav-back--footer"
            onClick={step === 2 ? () => navigate(-1) : onBack}
            aria-label="Retour"
          >
            <ChevronLeft size={18} />
            <span className="register__nav-back-text">Retour</span>
          </button>

          {step < 3 ? (
            <button
              type="button"
              className="register__btn register__btn--primary register__nav-next"
              onClick={onNext}
              disabled={!canContinueStep2}
            >
              Continuer
            </button>
          ) : (
            <button
              type="submit"
              form="register-form"
              className="register__btn register__btn--primary register__nav-next"
              disabled={!canFinish || isSubmitting}
            >
              {isSubmitting ? 'Création…' : 'Créer mon compte'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

