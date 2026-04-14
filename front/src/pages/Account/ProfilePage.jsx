import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AccountSectionPage.css';

const READER_FREQ = {
  daily: 'Tous les jours',
  weekly: 'Chaque semaine',
  sometimes: 'De temps en temps',
};

const CREATOR_GOAL = {
  web: 'Web',
  print: 'Impression',
  both: 'Les deux',
};

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="account-section container">
        <nav className="account-section__crumb" aria-label="Fil d’Ariane">
          <Link to="/">Accueil</Link>
          <span aria-hidden="true"> / </span>
          <span>Mon profil</span>
        </nav>
        <h1 className="account-section__title">Mon profil</h1>
        <p className="account-section__lead">Connectez-vous pour voir vos informations.</p>
      </div>
    );
  }

  const rows = [
    { label: 'Nom', value: user.displayName },
    { label: 'Email', value: user.email },
    { label: 'Rôle', value: user.role === 'creator' ? 'Créateur' : 'Lecteur' },
  ];

  if (user.role === 'reader' && user.profile) {
    rows.push(
      { label: 'Genres préférés', value: user.profile.favoriteGenres || '—' },
      { label: 'Fréquence de lecture', value: READER_FREQ[user.profile.readingFrequency] ?? '—' },
    );
  }

  if (user.role === 'creator' && user.profile) {
    rows.push(
      { label: 'Nom de plume', value: user.profile.penName || '—' },
      { label: 'Genres que vous créez', value: user.profile.genres || '—' },
      { label: 'Objectif de publication', value: CREATOR_GOAL[user.profile.publishingGoal] ?? '—' },
    );
  }

  return (
    <div className="account-section container">
      <nav className="account-section__crumb" aria-label="Fil d’Ariane">
        <Link to="/">Accueil</Link>
        <span aria-hidden="true"> / </span>
        <span>Mon profil</span>
      </nav>
      <h1 className="account-section__title">Mon profil</h1>
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
    </div>
  );
}

