import { WalletCards } from 'lucide-react';
import './InfoBar.css';

export default function InfoBar() {
  return (
    <div className="infobar">
      <div className="infobar__inner container">
        <span className="infobar__icon" aria-hidden="true">
          <WalletCards size={13} />
        </span>
        <p className="infobar__text">Finance Panel — track revenue, payouts, and transactions.</p>
      </div>
    </div>
  );
}

