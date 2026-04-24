import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadPublishedEpisodes } from '../services/publications';

export default function EpisodesPage() {
  const episodes = useMemo(() => {
    const list = loadPublishedEpisodes();
    return [...list].sort((a, b) => {
      const av = a?.stats?.views ?? 0;
      const bv = b?.stats?.views ?? 0;
      return bv - av;
    });
  }, []);

  return (
    <div className="container" style={{ padding: '28px 0 40px' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontWeight: 950, letterSpacing: '-0.02em' }}>Episodes</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontWeight: 650 }}>
            Dernières publications (démo) sauvegardées dans votre navigateur.
          </p>
        </div>
        <Link
          to="/"
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            border: '1px solid var(--panel-border)',
            background: 'var(--panel-bg)',
            color: 'var(--text-dark)',
            fontWeight: 850,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Retour accueil
        </Link>
      </header>

      <section style={{ marginTop: 18 }}>
        {episodes.length === 0 ? (
          <div
            style={{
              marginTop: 18,
              padding: 16,
              borderRadius: 14,
              border: '1px solid var(--panel-border)',
              background: 'var(--panel-bg)',
              color: 'var(--text-muted)',
              fontWeight: 700,
            }}
          >
            Aucune publication pour l’instant. La homepage en ajoute dans “Dernières publications”.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
            {episodes.map((e) => (
              <div
                key={e?.id ?? `${e?.seriesTitle}-${e?.episodeTitle}`}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: '1px solid var(--panel-border)',
                  background: 'var(--panel-bg)',
                }}
              >
                <div style={{ fontWeight: 950, color: 'var(--text-dark)' }}>{e?.seriesTitle ?? '—'}</div>
                <div style={{ fontWeight: 950, color: 'var(--primary)', marginTop: 2 }}>
                  {e?.episodeTitle ?? '—'}
                </div>
                <div style={{ marginTop: 8, color: 'var(--text-muted)', fontWeight: 700 }}>
                  Vues: {e?.stats?.views ?? 0} · Likes: {e?.stats?.likes ?? 0} · Commentaires:{' '}
                  {e?.stats?.comments ?? (e?.comments?.length ?? 0)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

