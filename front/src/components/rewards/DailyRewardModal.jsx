import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../auth/Modal';
import { dailyClaimCoins, fetchDailyClaimStatus } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './DailyRewardModal.css';

function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${ss}s`;
  return `${ss}s`;
}

export default function DailyRewardModal() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [openedIdx, setOpenedIdx] = useState(null);
  const [result, setResult] = useState(null);
  const lastShownForSession = useRef(false);

  const canClaim = Boolean(status?.rewardsEnabled && status?.canClaim);
  const amount = Number(status?.amount || 0);
  const nextEligibleAt = status?.nextEligibleAt ? new Date(status.nextEligibleAt).getTime() : null;

  const cooldownLabel = useMemo(() => {
    if (!nextEligibleAt) return '';
    const ms = nextEligibleAt - Date.now();
    if (ms <= 0) return '';
    return fmtTime(ms);
  }, [nextEligibleAt, open, status]);

  useEffect(() => {
    if (!isAuthenticated) {
      setOpen(false);
      setStatus(null);
      setOpenedIdx(null);
      setResult(null);
      lastShownForSession.current = false;
      return;
    }
    if (lastShownForSession.current) return;
    fetchDailyClaimStatus()
      .then((s) => {
        setStatus(s || null);
        if (s?.rewardsEnabled && s?.canClaim) {
          lastShownForSession.current = true;
          setOpen(true);
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // Update countdown while open.
  useEffect(() => {
    if (!open) return;
    if (!nextEligibleAt) return;
    const t = window.setInterval(() => {
      // force recompute
      setStatus((s) => (s ? { ...s } : s));
    }, 1000);
    return () => window.clearInterval(t);
  }, [open, nextEligibleAt]);

  const onOpenBox = async (idx) => {
    if (!open) return;
    if (busy) return;
    if (!canClaim) return;
    setBusy(true);
    setOpenedIdx(idx);
    setResult(null);
    try {
      const res = await dailyClaimCoins();
      const credited = Boolean(res?.credited);
      const creditedAmount = Number(res?.creditedAmount || 0);
      setResult({
        credited,
        creditedAmount,
        nextEligibleAt: res?.nextEligibleAt || null,
      });
      // Refresh status after claim
      fetchDailyClaimStatus().then((s) => setStatus(s || null)).catch(() => {});
    } catch (e) {
      setResult({ credited: false, error: e?.message || 'Erreur' });
    } finally {
      setBusy(false);
    }
  };

  const title = status?.rewardsEnabled ? 'Bonus quotidien' : 'Bonus quotidien désactivé';

  return (
    <Modal
      isOpen={open}
      onClose={() => setOpen(false)}
      overlayClassName="daily-reward__overlay"
      panelClassName="daily-reward__panel"
    >
      <div className="daily-reward__header">
        <div>
          <div className="daily-reward__title">{title}</div>
          <div className="daily-reward__subtitle">
            {canClaim ? `Ouvrez une boîte pour gagner ${amount} coins.` : cooldownLabel ? `Revenez dans ${cooldownLabel}.` : 'Revenez plus tard.'}
          </div>
        </div>
        <button className="daily-reward__close" type="button" onClick={() => setOpen(false)} aria-label="Fermer">
          ×
        </button>
      </div>

      <div className="daily-reward__boxes" role="list">
        {[0, 1, 2].map((idx) => {
          const isOpened = openedIdx === idx;
          const disabled = busy || !canClaim || (openedIdx != null && openedIdx !== idx);
          return (
            <button
              key={idx}
              type="button"
              className={`daily-reward__box${isOpened ? ' is-opened' : ''}`}
              role="listitem"
              disabled={disabled}
              onClick={() => onOpenBox(idx)}
              aria-label={`Boîte ${idx + 1}`}
            >
              <div className="daily-reward__box-inner">
                <div className="daily-reward__box-lid" />
                <div className="daily-reward__box-body" />
                <div className="daily-reward__box-glow" />
                <div className="daily-reward__box-label">{isOpened ? 'Ouverte' : 'Ouvrir'}</div>
              </div>
            </button>
          );
        })}
      </div>

      {result ? (
        <div className={`daily-reward__result${result.credited ? ' is-success' : ' is-fail'}`} role="status">
          {result.credited ? `+${result.creditedAmount} coins ajoutés à votre portefeuille.` : result.error ? result.error : 'Bonus déjà réclamé.'}
        </div>
      ) : null}

      <div className="daily-reward__footer">
        <button
          type="button"
          className="daily-reward__btn"
          onClick={() => setOpen(false)}
        >
          Continuer
        </button>
      </div>
    </Modal>
  );
}

