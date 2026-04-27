import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    // eslint-disable-next-line react/no-unused-state
    this.setState({ error });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 24,
            fontFamily: 'Lufga, system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Une erreur s&apos;est produite</h1>
          {this.state.error?.message ? (
            <p style={{ color: '#b00020', maxWidth: 560, lineHeight: 1.5, fontWeight: 700 }}>
              {String(this.state.error.message)}
            </p>
          ) : null}
          <p style={{ color: '#666', fontSize: 12, maxWidth: 560, wordBreak: 'break-word' }}>
            {window.location.href}
          </p>
          <p style={{ color: '#666', maxWidth: 420, lineHeight: 1.5 }}>
            Rechargez la page. En développement, un rechargement complet corrige souvent les erreurs après
            un changement de fichier (contexte React / HMR).
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              fontWeight: 800,
              borderRadius: 10,
              border: 'none',
              background: 'var(--primary, #ff6a00)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
