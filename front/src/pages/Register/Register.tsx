import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Register.css'

type Role = 'reader' | 'creator'

type CreatorProfile = {
  penName: string
  genres: string
  publishingGoal: 'web' | 'print' | 'both'
}

type ReaderProfile = {
  favoriteGenres: string
  readingFrequency: 'daily' | 'weekly' | 'sometimes'
}

export default function Register() {
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [role, setRole] = useState<Role | null>(null)

  const [account, setAccount] = useState({
    name: '',
    email: '',
    password: '',
  })

  const [reader, setReader] = useState<ReaderProfile>({
    favoriteGenres: '',
    readingFrequency: 'weekly',
  })

  const [creator, setCreator] = useState<CreatorProfile>({
    penName: '',
    genres: '',
    publishingGoal: 'web',
  })

  const title = useMemo(() => {
    if (step === 1) return 'Créer un compte'
    if (step === 2) return role === 'creator' ? 'Votre profil créateur' : 'Vos préférences de lecture'
    return 'Informations du compte'
  }, [step, role])

  const canContinueStep1 = role !== null
  const canContinueStep2 = role === 'reader'
    ? reader.favoriteGenres.trim().length > 0
    : role === 'creator'
      ? creator.penName.trim().length > 0 && creator.genres.trim().length > 0
      : false

  const canFinish =
    account.name.trim() &&
    account.email.trim() &&
    account.password.trim().length >= 6 &&
    role !== null

  const onNext = () => {
    if (step === 1 && !canContinueStep1) return
    if (step === 2 && !canContinueStep2) return
    setStep((s) => (s === 1 ? 2 : 3))
  }

  const onBack = () => setStep((s) => (s === 3 ? 2 : 1))

  const onFinish = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canFinish) return

    // TODO: wire to backend later
    const payload = {
      role,
      account: { ...account, password: '***' },
      profile: role === 'creator' ? creator : reader,
    }
    console.log('register_stepper_submit', payload)
    navigate('/')
  }

  return (
    <div className="register container">
      <div className="register__shell">
        <div className="register__header">
          <div className="register__brand" aria-label="MangAfrik">
            <span>Mang</span>
            <span className="register__brand-accent">Afrik</span>
          </div>
          <h1 className="register__title">{title}</h1>
          <p className="register__subtitle">
            {step === 1
              ? 'Choisissez votre profil pour adapter les questions.'
              : step === 2
                ? 'Quelques questions rapides pour personnaliser votre expérience.'
                : 'Dernière étape : vos identifiants de connexion.'}
          </p>
        </div>

        <div className="register__steps" aria-label="Étapes">
          <div className={`register__step${step === 1 ? ' is-active' : step > 1 ? ' is-done' : ''}`}>1</div>
          <div className="register__line" />
          <div className={`register__step${step === 2 ? ' is-active' : step > 2 ? ' is-done' : ''}`}>2</div>
          <div className="register__line" />
          <div className={`register__step${step === 3 ? ' is-active' : ''}`}>3</div>
        </div>

        <form className="register__card" onSubmit={onFinish}>
          {step === 1 && (
            <div className="register__grid">
              <button
                type="button"
                className={`register__choice${role === 'reader' ? ' is-selected' : ''}`}
                onClick={() => setRole('reader')}
              >
                <div className="register__choice-title">Lecteur</div>
                <div className="register__choice-desc">Je veux découvrir, suivre et lire des mangas.</div>
              </button>
              <button
                type="button"
                className={`register__choice${role === 'creator' ? ' is-selected' : ''}`}
                onClick={() => setRole('creator')}
              >
                <div className="register__choice-title">Créateur</div>
                <div className="register__choice-desc">Je veux publier mes œuvres et construire mon audience.</div>
              </button>
            </div>
          )}

          {step === 2 && role === 'reader' && (
            <div className="register__fields">
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
                  onChange={(e) => setReader((p) => ({ ...p, readingFrequency: e.target.value as ReaderProfile['readingFrequency'] }))}
                >
                  <option value="daily">Tous les jours</option>
                  <option value="weekly">Chaque semaine</option>
                  <option value="sometimes">De temps en temps</option>
                </select>
              </label>
            </div>
          )}

          {step === 2 && role === 'creator' && (
            <div className="register__fields">
              <label className="register__field">
                <span>Nom de plume</span>
                <input
                  value={creator.penName}
                  onChange={(e) => setCreator((p) => ({ ...p, penName: e.target.value }))}
                  placeholder="Ex: Kofi Art"
                />
              </label>
              <label className="register__field">
                <span>Genres que vous créez</span>
                <input
                  value={creator.genres}
                  onChange={(e) => setCreator((p) => ({ ...p, genres: e.target.value }))}
                  placeholder="Ex: Action, Fantaisie, Thriller"
                />
              </label>
              <label className="register__field">
                <span>Objectif de publication</span>
                <select
                  value={creator.publishingGoal}
                  onChange={(e) =>
                    setCreator((p) => ({ ...p, publishingGoal: e.target.value as CreatorProfile['publishingGoal'] }))
                  }
                >
                  <option value="web">Web</option>
                  <option value="print">Impression</option>
                  <option value="both">Les deux</option>
                </select>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="register__fields">
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
                {role === 'creator'
                  ? 'Votre compte créateur pourra publier après validation (à connecter au backend plus tard).'
                  : 'Vous pourrez personnaliser ces choix plus tard.'}
              </div>
            </div>
          )}

          <div className="register__actions">
            <button type="button" className="register__btn register__btn--ghost" onClick={step === 1 ? () => navigate(-1) : onBack}>
              Retour
            </button>

            {step < 3 ? (
              <button
                type="button"
                className="register__btn register__btn--primary"
                onClick={onNext}
                disabled={step === 1 ? !canContinueStep1 : !canContinueStep2}
              >
                Continuer
              </button>
            ) : (
              <button type="submit" className="register__btn register__btn--primary" disabled={!canFinish}>
                Créer mon compte
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

