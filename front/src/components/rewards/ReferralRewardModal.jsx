import { useEffect, useRef, useState } from 'react';
import Modal from '../auth/Modal';
import { claimPendingReferralReward, fetchPendingReferralRewards, fetchWallet } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { looksUsableBearerToken } from '../../utils/authToken';
import './ReferralRewardModal.css';

export default function ReferralRewardModal() {
  const { isAuthenticated, user } = useAuth(); // user.token read inside tick for logout races
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null); // { id, amount, referredDisplayName, createdAt }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const pollTimerRef = useRef(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setOpen(false);
      setPending(null);
      setBusy(false);
      setMsg('');
      return;
    }

    const tick = () => {
      if (inFlightRef.current) return;
      if (open) return;
      // If we're already showing a pending reward, don't fetch again.
      if (pending?.id) return;
      if (!looksUsableBearerToken(user?.token)) return;
      inFlightRef.current = true;
      fetchPendingReferralRewards()
        .then((list) => {
          const first = Array.isArray(list) && list.length > 0 ? list[0] : null;
          if (first) {
            setPending(first);
            setOpen(true);
          }
        })
        .catch(() => {})
        .finally(() => {
          inFlightRef.current = false;
        });
    };

    // Immediate check after login.
    tick();
    // Poll to catch rewards while user stays logged in.
    pollTimerRef.current = window.setInterval(tick, 8000);
    return () => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
      inFlightRef.current = false;
    };
  }, [isAuthenticated, user?.token]);

  const onClaim = async () => {
    if (!pending?.id) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await claimPendingReferralReward(pending.id);
      const ok = Boolean(res?.claimed);
      if (ok) {
        setMsg(`Récompense réclamée: +${res?.amount ?? pending.amount} coins.`);
        // Touch wallet so navbar coin pill updates soon in this session.
        fetchWallet().catch(() => {});
      } else {
        setMsg('Déjà réclamée.');
      }
      // Remove this pending and close.
      setTimeout(() => {
        setOpen(false);
        setPending(null);
      }, 900);
    } catch (e) {
      setMsg(e?.message || 'Impossible de réclamer.');
    } finally {
      setBusy(false);
    }
  };

  if (!pending) return null;

  return (
    <Modal
      isOpen={open}
      onClose={() => setOpen(false)}
      overlayClassName="ref-reward__overlay"
      panelClassName="ref-reward__panel"
    >
      <div className="ref-reward__header">
        <div className="ref-reward__title">Récompense de parrainage</div>
        <button className="ref-reward__close" type="button" onClick={() => setOpen(false)} aria-label="Fermer">
          ×
        </button>
      </div>

      <div className="ref-reward__body">
        <div className="ref-reward__headline">
          Vous avez été crédité de <strong>{pending.amount}</strong> coins
        </div>
        <div className="ref-reward__sub">
          grâce à l’inscription de <strong>{pending.referredDisplayName || 'un utilisateur'}</strong>.
        </div>

        {msg ? <div className="ref-reward__msg">{msg}</div> : null}
      </div>

      <div className="ref-reward__footer">
        <button className="ref-reward__btn" type="button" onClick={onClaim} disabled={busy}>
          {busy ? 'Réclamation…' : 'Claim'}
        </button>
      </div>
    </Modal>
  );
}

