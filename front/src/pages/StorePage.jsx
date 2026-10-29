import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createCoinPurchaseIntent, fetchCoinPacks, fetchCoinPurchaseIntent, fetchWallet, useFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { onWalletUpdated } from '../realtime/walletEvents';
import { useLocale } from '../hooks/useLocale';
import { formatMoney } from '../utils/money';

export default function StorePage() {
  const { isAuthenticated } = useAuth();
  const { locale } = useLocale();
  const [walletKey, setWalletKey] = useState(0);
  const [packsKey, setPacksKey] = useState(0);
  const { data: wallet } = useFetch(fetchWallet, walletKey);
  const { data: packsRes } = useFetch(fetchCoinPacks, packsKey);
  const [busyPack, setBusyPack] = useState('');
  const [message, setMessage] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const returnedIntent = searchParams.get('intent') || '';
  const returnedOutcome = searchParams.get('payment') || '';

  useEffect(() => {
    if (!isAuthenticated) return;
    return onWalletUpdated(() => setWalletKey((k) => k + 1));
  }, [isAuthenticated]);

  // Back from GeniusPay (?payment=success|error&intent=…): poll until the backend confirms the payment.
  useEffect(() => {
    if (!isAuthenticated || !returnedIntent) return;
    let cancelled = false;
    let timer;
    let tries = 0;
    const done = (text) => {
      setMessage(text);
      setWalletKey((k) => k + 1);
      setSearchParams({}, { replace: true });
    };
    const check = () => {
      fetchCoinPurchaseIntent(returnedIntent)
        .then((intent) => {
          if (cancelled) return;
          if (intent.status === 'paid') return done(`Paiement confirmé : ${intent.coins} coins ajoutés.`);
          if (intent.status !== 'pending') return done('Le paiement n’a pas abouti. Aucun montant n’a été crédité.');
          tries += 1;
          if (tries >= 20) return done('Paiement en cours de confirmation. Vos coins apparaîtront dès sa validation.');
          setMessage(returnedOutcome === 'error' ? 'Vérification du paiement…' : 'Confirmation du paiement…');
          timer = setTimeout(check, 3000);
        })
        .catch((e) => !cancelled && done(e?.message || 'Impossible de vérifier le paiement.'));
    };
    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isAuthenticated, returnedIntent, returnedOutcome, setSearchParams]);

  if (!isAuthenticated) {
    return (
      <div className="page-wrapper">
        <div className="container" style={{ padding: '24px 0' }}>
          <h2 className="section-title">Boutique</h2>
          <p style={{ marginTop: 10, color: 'var(--text-muted)' }}>Connectez-vous pour acheter des coins.</p>
          <div style={{ marginTop: 12 }}>
            <Link to="/" className="manga-page__btn manga-page__btn--outline">
              Retour
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const paymentsEnabled = Boolean(packsRes?.paymentsEnabled ?? wallet?.paymentsEnabled);
  const packs = Array.isArray(packsRes?.packs) ? packsRes.packs : [];

  return (
    <div className="page-wrapper">
      <div className="container" style={{ padding: '24px 0' }}>
        <h2 className="section-title">Boutique</h2>
        <p style={{ marginTop: 10, color: 'var(--text-muted)' }}>
          Solde: <strong>{wallet?.balance ?? 0}</strong> coins
        </p>

        {!paymentsEnabled ? (
          <div style={{ marginTop: 14, padding: 14, borderRadius: 12, border: '1px solid var(--surface-border)', background: 'var(--surface-bg)' }}>
            <div style={{ fontWeight: 900 }}>Achat de coins désactivé</div>
            <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>
              L’administrateur peut activer l’option “Coin payments” dans le panneau admin.
            </div>
          </div>
        ) : null}

        {message ? (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: '1px solid var(--surface-border)', background: 'var(--surface-bg)' }}>
            <div style={{ fontWeight: 900 }}>Info</div>
            <div style={{ marginTop: 6, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{message}</div>
          </div>
        ) : null}

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {packs.map((p) => (
            <div key={p.id} style={{ border: '1px solid var(--surface-border)', borderRadius: 14, background: 'var(--surface-bg)', padding: 14 }}>
              <div style={{ fontWeight: 950 }}>{p.title}</div>
              <div style={{ marginTop: 6, fontWeight: 900 }}>{p.coins} coins</div>
              <div style={{ marginTop: 6, color: 'var(--text-muted)', fontWeight: 800 }}>
                {formatMoney(p.amount, { currency: p.currency, locale })}
              </div>
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="manga-page__btn manga-page__btn--primary"
                  disabled={!paymentsEnabled || busyPack === p.id}
                  onClick={() => {
                    setBusyPack(p.id);
                    setMessage('');
                    createCoinPurchaseIntent(p.id)
                      .then((intent) => {
                        if (intent.checkoutUrl) {
                          // GeniusPay hosted checkout (Wave, Orange Money, MTN, Moov, carte…).
                          window.location.assign(intent.checkoutUrl);
                          return;
                        }
                        setMessage(`Demande d’achat enregistrée (${intent.id}).\nVos coins seront ajoutés après validation du paiement.`);
                        setWalletKey((k) => k + 1);
                        setBusyPack('');
                      })
                      .catch((e) => {
                        setMessage(e?.message || 'Impossible de lancer le paiement.');
                        setBusyPack('');
                      });
                  }}
                >
                  {busyPack === p.id ? 'Redirection…' : 'Acheter'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

