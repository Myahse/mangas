import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dailyClaimCoins, fetchReferralInfo, fetchWallet, useFetch } from '../../services/api';
import { onWalletUpdated } from '../../realtime/walletEvents';
import './AccountSectionPage.css';

const TITLES = {
  '/compte': 'Mon espace',
  '/compte/abonnements': 'Mes abonnements',
  '/compte/favoris': 'Mes favoris',
  '/compte/profil': 'Mon profil',
};

export default function AccountSectionPage() {
  const { pathname } = useLocation();
  const title = TITLES[pathname] || 'Compte';
  const { user, isAuthenticated } = useAuth();
  const [walletKey, setWalletKey] = useState(0);
  const { data: wallet } = useFetch(fetchWallet, walletKey);
  const [claimMsg, setClaimMsg] = useState('');
  const { data: referral } = useFetch(fetchReferralInfo, walletKey);

  const referralLink = useMemo(() => String(referral?.link || '').trim(), [referral]);

  useEffect(() => {
    if (!isAuthenticated) return;
    return onWalletUpdated(() => setWalletKey((k) => k + 1));
  }, [isAuthenticated]);

  return (
    <div className="account-section container">
      <nav className="account-section__crumb" aria-label="Fil d’Ariane">
        <Link to="/">Accueil</Link>
        <span aria-hidden="true"> / </span>
        <span>{title}</span>
      </nav>
      <h1 className="account-section__title">{title}</h1>

      <div style={{ marginTop: 16 }}>
        {isAuthenticated && user ? (
          <div className="account-section__card">
            <div style={{ fontWeight: 900 }}>Connecté en tant que</div>
            <div style={{ marginTop: 6 }}>
              <div><strong>Nom</strong>: {user.displayName}</div>
              <div><strong>Email</strong>: {user.email}</div>
              <div><strong>Rôle</strong>: {user.role}</div>
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{ fontWeight: 900 }}>Coins</div>
              <div style={{ marginTop: 6 }}>
                <div><strong>Solde total</strong>: {wallet?.balance ?? 0}</div>
                <div style={{ opacity: 0.85, marginTop: 4 }}>
                  <strong>Achetés</strong>: {wallet?.balancePaid ?? 0} · <strong>Récompenses</strong>: {wallet?.balanceReward ?? 0}
                </div>
              </div>
              {wallet?.rewardsEnabled ? (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="manga-page__btn manga-page__btn--outline"
                    onClick={() => {
                      setClaimMsg('');
                      dailyClaimCoins()
                        .then((res) => {
                          const credited = Boolean(res?.credited);
                          const amt = Number(res?.creditedAmount || 0);
                          setClaimMsg(credited ? `Bonus reçu: +${amt} coins` : 'Bonus déjà réclamé aujourd’hui.');
                          setWalletKey((k) => k + 1);
                        })
                        .catch((e) => setClaimMsg(e?.message || 'Impossible de réclamer le bonus.'));
                    }}
                  >
                    Réclamer bonus quotidien
                  </button>
                  {claimMsg ? (
                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>{claimMsg}</div>
                  ) : null}
                </div>
              ) : (
                <div style={{ marginTop: 10, opacity: 0.75 }}>
                  Bonus quotidien désactivé.
                </div>
              )}
            </div>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{ fontWeight: 900 }}>Parrainage</div>
              <div style={{ marginTop: 6, opacity: 0.85, fontSize: 13 }}>
                Invitez un ami avec votre lien. Quand il crée un compte, vous gagnez des coins.
              </div>
              {referralLink ? (
                <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                  <input
                    value={referralLink}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.14)',
                      fontSize: 13,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="manga-page__btn manga-page__btn--outline"
                      onClick={() => {
                        navigator.clipboard?.writeText(referralLink).catch(() => {});
                      }}
                    >
                      Copier le lien
                    </button>
                    <a
                      className="manga-page__btn manga-page__btn--outline"
                      href={referralLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ouvrir le lien
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 10, opacity: 0.7 }}>Chargement du lien…</div>
              )}
            </div>
          </div>
        ) : (
          <div className="account-section__card">
            <div style={{ fontWeight: 900 }}>Vous n’êtes pas connecté</div>
            <div style={{ marginTop: 6, opacity: 0.8 }}>
              Connectez-vous depuis le bouton “Connexion” en haut.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
