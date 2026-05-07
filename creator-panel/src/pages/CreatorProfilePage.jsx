import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './CreatorSectionPage.css';

export default function CreatorProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const isCreator = isAuthenticated && String(user?.role || '').toLowerCase() === 'creator';

  const rows = isCreator
    ? [
        { label: 'Nom', value: user?.displayName ?? '—' },
        { label: 'Email', value: user?.email ?? '—' },
        { label: 'Rôle', value: 'Créateur' },
        { label: 'Email créateur', value: user?.profile?.creatorEmail ?? '—' },
        { label: 'Nom de plume', value: user?.profile?.penName ?? '—' },
        { label: 'Genres que vous créez', value: user?.profile?.genres ?? '—' },
        { label: 'Message / objectif', value: user?.profile?.message ?? '—' },
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
          Vous n’êtes pas connecté en tant que créateur. Utilisez le modal de connexion du panneau créateur (en haut) puis revenez sur cette page.
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

