import { Headset } from 'lucide-react';
import './InfoBar.css';

export default function InfoBar() {
  return (
    <div className="infobar">
      <div className="infobar__inner container">
        <span className="infobar__icon" aria-hidden="true">
          <Headset size={13} />
        </span>
        <p className="infobar__text">
          Support Panel — triage issues + requests, validate/reject, and chat with users.
        </p>
      </div>
    </div>
  );
}

