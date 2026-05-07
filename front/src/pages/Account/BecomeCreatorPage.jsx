import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMyCreatorRequest, submitCreatorRequest } from '../../services/api';
import './AccountSectionPage.css';

export default function BecomeCreatorPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitOk, setSubmitOk] = useState(false);
  const [existingRequest, setExistingRequest] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const [form, setForm] = useState({
    email: user?.email || '',
    displayName: user?.displayName || '',
    creatorEmail: '',
    penName: '',
    genres: '',
    message: '',
  });

  const title = useMemo(() => {
    if (submitOk) return 'Demande envoyée';
    if (existingRequest) {
      const s = String(existingRequest.status || '').toLowerCase();
      if (s === 'rejected') return 'Soumettre une nouvelle demande';
      return 'Votre demande';
    }
    if (step === 1) return 'Devenir créateur';
    return 'Votre demande';
  }, [step, submitOk, existingRequest]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let cancelled = false;
    setLoadingExisting(true);
    setExistingRequest(null);
    getMyCreatorRequest()
      .then((r) => {
        if (cancelled) return;
        setExistingRequest(r || null);
      })
      .catch((e) => {
        // 401/404 => not logged in yet or no request yet, ignore
        const msg = String(e?.message || '');
        if (msg.includes('401') || msg.includes('403') || msg.includes('404')) return;
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingExisting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

  if (!isAuthenticated || !user) {
    return (
      <div className="account-section container">
        <nav className="account-section__crumb" aria-label="Fil d’Ariane">
          <Link to="/">Accueil</Link>
          <span aria-hidden="true"> / </span>
          <Link to="/compte">Mon espace</Link>
          <span aria-hidden="true"> / </span>
          <span>Devenir créateur</span>
        </nav>
        <h1 className="account-section__title">Devenir créateur</h1>
        <p className="account-section__lead">Connectez-vous pour envoyer une demande.</p>
      </div>
    );
  }

  const canContinue =
    form.creatorEmail.trim().length > 0 &&
    form.penName.trim().length > 0 &&
    form.genres.trim().length > 0 &&
    form.message.trim().length > 0;

  const existingStatus = useMemo(() => String(existingRequest?.status || '').toLowerCase(), [existingRequest]);
  const canRetry = existingStatus === 'rejected';

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canContinue || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitCreatorRequest({
        email: form.email.trim(),
        creatorEmail: form.creatorEmail.trim(),
        displayName: form.displayName.trim(),
        penName: form.penName.trim(),
        genres: form.genres.trim(),
        message: form.message.trim(),
      });
      setSubmitOk(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      const low = String(msg).toLowerCase();
      if (low.includes('already submitted')) {
        setSubmitError('Vous avez déjà une demande en cours. Vous pouvez consulter son statut ici.');
        getMyCreatorRequest().then(setExistingRequest).catch(() => {});
      } else if (low.includes('already approved')) {
        setSubmitError('Votre demande a déjà été approuvée. Vous ne pouvez plus en soumettre une nouvelle.');
        getMyCreatorRequest().then(setExistingRequest).catch(() => {});
      } else {
        setSubmitError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register container" style={{ paddingTop: 18, paddingBottom: 30 }}>
      <div className="register__shell">
        <div className="register__header">
          <div className="register__topbar">
            <button
              type="button"
              className="register__btn register__btn--ghost register__nav-back register__nav-back--top"
              onClick={() => (submitOk ? navigate('/compte/profil') : step === 1 ? navigate(-1) : setStep(1))}
              aria-label="Retour"
            >
              <ChevronLeft size={18} />
              <span className="register__nav-back-text">Retour</span>
            </button>

            <div className="register__brand" aria-label="MangAfric">
              <span>Mang</span>
              <span className="register__brand-accent">Afrik</span>
            </div>

            <div className="register__topbar-spacer" aria-hidden="true" />
          </div>

          <div className="register__brand register__brand--header" aria-label="MangAfric">
            <span>Mang</span>
            <span className="register__brand-accent">Afrik</span>
          </div>
          <h1 className="register__title">{title}</h1>
          <p className="register__subtitle">
            {submitOk
              ? 'Votre demande a été transmise. Vous recevrez vos identifiants par email après validation.'
              : step === 1
                ? 'Remplissez ce formulaire pour demander un accès créateur.'
                : 'Vérifiez et envoyez votre demande.'}
          </p>
        </div>

        {!submitOk && loadingExisting && (
          <div className="register__fields-bare">
            <div className="register__hint">Chargement…</div>
          </div>
        )}

        {!submitOk && !loadingExisting && existingRequest && (
          <div className="register__fields-bare">
            <div className="register__hint">
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Statut: {existingRequest.status}</div>
              <div className="admin-muted" style={{ fontSize: 12 }}>
                Envoyée le {existingRequest.createdAt ? new Date(existingRequest.createdAt).toLocaleString() : '—'}
              </div>
              {existingRequest.reason ? (
                <div style={{ marginTop: 8 }}>Raison: {existingRequest.reason}</div>
              ) : null}
            </div>
            <div className="register__hint">
              <strong>Nom</strong>: {existingRequest.displayName}
              <br />
              <strong>Email créateur</strong>: {existingRequest.creatorEmail || '—'}
              <br />
              <strong>Nom de plume</strong>: {existingRequest.penName || '—'}
              <br />
              <strong>Genres</strong>: {existingRequest.genres || '—'}
            </div>
          </div>
        )}

        {!submitOk && !loadingExisting && (!existingRequest || canRetry) && (
          <form id="become-creator-form" className="register__fields-bare" onSubmit={onSubmit}>
            {submitError && (
              <div className="register__hint" role="alert">
                {submitError}
              </div>
            )}

            {canRetry && step === 1 ? (
              <div className="register__hint" style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Votre précédente demande a été rejetée.</div>
                <div className="admin-muted" style={{ fontSize: 12 }}>
                  Vous pouvez corriger les informations et soumettre une nouvelle demande.
                </div>
                {existingRequest?.reason ? <div style={{ marginTop: 8 }}>Raison: {existingRequest.reason}</div> : null}
              </div>
            ) : null}

            {step === 1 && (
              <>
                <label className="register__field">
                  <span>Email créateur (pour le panneau créateur)</span>
                  <input
                    value={form.creatorEmail}
                    onChange={(e) => setForm((p) => ({ ...p, creatorEmail: e.target.value }))}
                    placeholder="ex: creator@email.com"
                  />
                </label>
                <label className="register__field">
                  <span>Nom de plume</span>
                  <input value={form.penName} onChange={(e) => setForm((p) => ({ ...p, penName: e.target.value }))} />
                </label>
                <label className="register__field">
                  <span>Genres que vous créez</span>
                  <input value={form.genres} onChange={(e) => setForm((p) => ({ ...p, genres: e.target.value }))} />
                </label>
                <label className="register__field">
                  <span>Message</span>
                  <textarea
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                    placeholder="Expliquez votre demande (portfolio, expérience, liens, etc.)"
                  />
                </label>
                <div className="register__hint">
                  Votre demande sera visible par l’équipe Admin et Support. Après validation, vous recevrez vos identifiants par email.
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="register__hint">
                  <strong>Email</strong>: {form.email}
                  <br />
                  <strong>Nom</strong>: {form.displayName}
                  <br />
                  <strong>Email créateur</strong>: {form.creatorEmail}
                </div>
                <div className="register__hint">
                  <strong>Nom de plume</strong>: {form.penName}
                  <br />
                  <strong>Genres</strong>: {form.genres}
                </div>
                <div className="register__hint">
                  <strong>Message</strong>: {form.message}
                </div>
              </>
            )}
          </form>
        )}

        <div className="register__footerbar">
          {!submitOk && (
            <button
              type="button"
              className="register__btn register__btn--ghost register__nav-back register__nav-back--footer"
              onClick={() => (step === 1 ? navigate(-1) : setStep(1))}
              aria-label="Retour"
            >
              <ChevronLeft size={18} />
              <span className="register__nav-back-text">Retour</span>
            </button>
          )}

          {submitOk ? (
            <button type="button" className="register__btn register__btn--primary register__nav-next" onClick={() => navigate('/compte/profil')}>
              Retour au profil
            </button>
          ) : loadingExisting || (existingRequest && !canRetry) ? (
            <button type="button" className="register__btn register__btn--primary register__nav-next" onClick={() => navigate('/compte/profil')}>
              Retour au profil
            </button>
          ) : step === 1 ? (
            <button
              type="button"
              className="register__btn register__btn--primary register__nav-next"
              disabled={!canContinue}
              onClick={() => setStep(2)}
            >
              Continuer
            </button>
          ) : (
            <button
              type="submit"
              form="become-creator-form"
              className="register__btn register__btn--primary register__nav-next"
              disabled={!canContinue || isSubmitting}
            >
              {isSubmitting ? 'Envoi…' : 'Envoyer la demande'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

