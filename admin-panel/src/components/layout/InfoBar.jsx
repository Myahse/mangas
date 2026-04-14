import { Shield } from 'lucide-react';
import './InfoBar.css';

export default function InfoBar() {
  return (
    <div className="infobar">
      <div className="infobar__inner container">
        <span className="infobar__icon" aria-hidden="true">
          <Shield size={13} />
        </span>
        <p className="infobar__text">
          Admin Panel — manage manga requests, users, and content.
        </p>
      </div>
    </div>
  );
}

