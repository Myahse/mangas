import { useEffect, useState } from 'react';
import { creatorApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { notify } from '../../services/notify';
import '../publications/PublicationsPage.css';
import '../../pages/SeriesPage.css';

const METHODS = [
  { value: 'wave', label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'mtn_money', label: 'MTN MoMo' },
  { value: 'moov_money', label: 'Moov Money' },
];
const STATUS_LABEL = { requested: 'En attente', paid: 'Payé', rejected: 'Refusé' };

function xof(v) {
  const n = Number(v || 0);
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA`;
}

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/**
 * "Revenus": what my series earned (my share of the purchased coins readers spent on them), and payout
 * requests to my mobile-money account.
 */
export default function EarningsPage() {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('wave');
  const [phone, setPhone] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setData(await creatorApi.getEarnings());
    } catch (err) {
      notify.error(`Impossible de charger vos revenus. ${(err && err.message) || ''}`.trim());
    } finally {
      setLoading(false);
    }
  };

  // Reload once the creator signs in (the page can open before the sign-in modal).
  useEffect(() => {
    if (isAuthenticated) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const request = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      setData(await creatorApi.requestPayout({ amountXof: Number(amount), method, phone }));
      setAmount('');
      notify.success('Demande envoyée : l’équipe MangAfric vous paie sous peu.');
    } catch (err) {
      const msg = String((err && err.message) || '');
      notify.error(
        msg.includes('minimum') ? `Retrait minimum : ${xof(data?.minPayoutXof)}.`
          : msg.includes('already waiting') ? 'Une demande est déjà en cours.'
            : msg.includes('more than') ? 'Montant supérieur à vos gains disponibles.'
              : msg.includes('phone') ? 'Numéro de téléphone invalide.'
                : msg || 'Demande impossible.',
      );
    } finally {
      setBusy(false);
    }
  };

  const available = Number(data?.availableXof || 0);
  const canRequest = available >= Number(data?.minPayoutXof || 0) && Number(data?.pendingXof || 0) === 0;

  return (
    <div className="pub container">
      <h1 className="pub__title">Revenus</h1>
      <p className="pub__lead">
        {data
          ? `Vous touchez ${data.sharePercent} % des coins achetés que vos lecteurs dépensent sur vos séries (déblocages et votes), à ${xof(data.coinValueXof)} le coin.`
          : 'Vos gains sur vos séries.'}
      </p>

      {loading && !data ? (
        <div className="pub__empty">Chargement…</div>
      ) : data ? (
        <>
          <div className="pub__grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {[
              ['Disponible', data.availableXof],
              ['En attente de paiement', data.pendingXof],
              ['Déjà payé', data.paidXof],
              ['Gagné au total', data.earnedXof],
            ].map(([label, value]) => (
              <div key={label} className="pub__card">
                <div className="pub__meta">{label}</div>
                <div className="pub__episode">{xof(value)}</div>
              </div>
            ))}
          </div>

          <form className="pub__card" style={{ marginTop: 16 }} onSubmit={request}>
            <div className="pub__series">Demander un retrait</div>
            {!canRequest ? (
              <div className="pub__note">
                {Number(data.pendingXof) > 0
                  ? 'Une demande est déjà en cours de paiement.'
                  : `Retrait possible à partir de ${xof(data.minPayoutXof)} disponibles.`}
              </div>
            ) : null}
            <label className="creator__field">
              <span>Montant (FCFA)</span>
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder={`${Math.floor(available)}`}
                disabled={!canRequest}
              />
            </label>
            <label className="creator__field">
              <span>Moyen de paiement</span>
              <select value={method} onChange={(e) => setMethod(e.target.value)} disabled={!canRequest}>
                {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>
            <label className="creator__field">
              <span>Numéro</span>
              <input
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+225 07 00 00 00 00"
                disabled={!canRequest}
              />
            </label>
            <div className="pub__actions">
              <button type="submit" className="pub__btn pub__btn--primary" disabled={!canRequest || busy || !amount || !phone.trim()}>
                {busy ? 'Envoi…' : 'Demander le retrait'}
              </button>
            </div>
          </form>

          <h2 className="pub__series" style={{ marginTop: 24 }}>Par série</h2>
          {data.bySeries.length === 0 ? (
            <div className="pub__empty">Pas encore de gains : ils apparaissent dès qu’un lecteur débloque un chapitre avec des coins achetés.</div>
          ) : (
            <div className="pub__grid">
              {data.bySeries.map((s) => (
                <div key={s.slug} className="pub__card">
                  <div className="pub__head">
                    <div>
                      <div className="pub__episode">{s.title}</div>
                      <div className="pub__meta">
                        {s.unlocks} déblocage{s.unlocks > 1 ? 's' : ''} · {s.votes} vote{s.votes > 1 ? 's' : ''} payant{s.votes > 1 ? 's' : ''} · {s.paidCoins} coins achetés dépensés
                      </div>
                    </div>
                    <div className="pub__episode">{xof(s.xof)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className="pub__series" style={{ marginTop: 24 }}>Mes retraits</h2>
          {data.payouts.length === 0 ? (
            <div className="pub__empty">Aucun retrait pour le moment.</div>
          ) : (
            <div className="pub__grid">
              {data.payouts.map((p) => (
                <div key={p.id} className="pub__card">
                  <div className="pub__head">
                    <div>
                      <div className="pub__episode">{xof(p.amountXof)}</div>
                      <div className="pub__meta">
                        {formatWhen(p.createdAt)} · {METHODS.find((m) => m.value === p.method)?.label || p.method} {p.phone}
                      </div>
                    </div>
                    <div className="pub__meta"><strong>{STATUS_LABEL[p.status] || p.status}</strong></div>
                  </div>
                  {p.status === 'rejected' && p.note ? <div className="pub__note">Motif : {p.note}</div> : null}
                  {p.status === 'paid' && p.reference ? <div className="pub__meta">Référence : {p.reference}</div> : null}
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
