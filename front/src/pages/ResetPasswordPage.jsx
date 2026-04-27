import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/api';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const canSubmit = useMemo(() => {
    return token.trim() && newPassword.trim().length >= 6 && newPassword === confirm;
  }, [token, newPassword, confirm]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!token.trim()) {
      setError('Lien invalide (token manquant).');
      return;
    }
    if (newPassword.trim().length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    try {
      setIsBusy(true);
      await resetPassword({ token, newPassword });
      setDone(true);
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Réinitialisation impossible';
      setError(msg);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: 'min(520px, 100%)',
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        borderRadius: '18px',
        padding: '22px',
        boxShadow: 'var(--panel-shadow)',
      }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Réinitialiser le mot de passe</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
          Choisissez un nouveau mot de passe pour votre compte.
        </p>

        {error && (
          <div style={{
            marginTop: 12,
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.18)',
            color: '#991b1b',
            borderRadius: 10,
            padding: '10px 12px',
            fontWeight: 700,
          }}>
            {error}
          </div>
        )}

        {done && (
          <div style={{
            marginTop: 12,
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.18)',
            color: 'color-mix(in srgb, var(--text) 78%, transparent)',
            borderRadius: 10,
            padding: '10px 12px',
            fontWeight: 700,
          }}>
            Mot de passe mis à jour. Redirection…
          </div>
        )}

        <form onSubmit={onSubmit} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'color-mix(in srgb, var(--text) 75%, transparent)' }}>
              Nouveau mot de passe
            </span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
              style={{
                padding: '11px 12px',
                border: '1px solid var(--panel-border)',
                borderRadius: 10,
                background: 'var(--surface-bg)',
                color: 'var(--text)',
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'color-mix(in srgb, var(--text) 75%, transparent)' }}>
              Confirmer
            </span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Répétez le mot de passe"
              style={{
                padding: '11px 12px',
                border: '1px solid var(--panel-border)',
                borderRadius: 10,
                background: 'var(--surface-bg)',
                color: 'var(--text)',
              }}
            />
          </label>

          <button
            type="submit"
            disabled={!canSubmit || isBusy}
            style={{
              marginTop: 6,
              height: 46,
              borderRadius: 12,
              background: 'var(--primary)',
              color: '#fff',
              fontWeight: 900,
              opacity: (!canSubmit || isBusy) ? 0.7 : 1,
              cursor: (!canSubmit || isBusy) ? 'not-allowed' : 'pointer',
            }}
          >
            {isBusy ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}

