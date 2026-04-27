import { Link } from 'react-router-dom';
import './CreatorSectionPage.css';

const PREFIX =
  import.meta.env.VITE_CREATOR_STORAGE_PREFIX;

const CREATOR_GOAL = {
  web: 'Web',
  print: 'Impression',
  both: 'Les deux',
};

export default function CreatorProfilePage() {
  let session = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    session = raw ? JSON.parse(raw) : null;
  } catch {
    session = null;
  }

  const isCreator = session?.role === 'creator';

  const rows = isCreator
    ? [
        { label: 'Nom', value: session.displayName ?? '—' },
        { label: 'Email', value: session.email ?? '—' },
        { label: 'Rôle', value: 'Créateur' },
        { label: 'Nom de plume', value: session.profile?.penName ?? '—' },
        { label: 'Genres que vous créez', value: session.profile?.genres ?? '—' },
        { label: 'Objectif de publication', value: CREATOR_GOAL[session.profile?.publishingGoal] ?? '—' },
      ]
    : [];

  return (
    <div className="account-section container">
      <nav className="account-section__crumb" aria-label="Fil d’Ariane">
        <Link to="/">Accueil</Link>
        <span aria-hidden="true"> / </span>
        <span>Mon profil</span>
      </nav>
      <h1 className="account-section__title">Mon profil</h1>
      {!isCreator ? (
        <p className="account-section__lead">
          Aucune session créateur trouvée. Connectez-vous en tant que créateur sur le site lecteur puis revenez ici.
        </p>
      ) : (
        <>
          <p className="account-section__lead">Les informations enregistrées lors de l’inscription.</p>
          <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
            {rows.map((r) => (
              <div
                key={r.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--panel-border, var(--surface-border, rgba(0,0,0,0.12)))',
                  background: 'var(--panel-bg, var(--surface-bg, rgba(255,255,255,0.6)))',
                }}
              >
                <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>{r.label}</span>
                <span style={{ fontWeight: 800, color: 'var(--nav-text, var(--text, #111))' }}>{r.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

