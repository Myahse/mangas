import { Megaphone } from 'lucide-react';
import './InfoBar.css';

export default function InfoBar() {
  return (
    <div className="infobar">
      <div className="infobar__inner container">
        <span className="infobar__icon" aria-hidden="true">
          <Megaphone size={13} />
        </span>
        <p className="infobar__text">
          Ads & Notifications Admin — manage hero ads, push notifications, and system notices.
        </p>
      </div>
    </div>
  );
}

