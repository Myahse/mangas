import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="support-surface">
      <div className="support-surface__inner">
        <div style={{ fontWeight: 900, fontSize: 22 }}>Not found</div>
        <div className="support-muted" style={{ marginTop: 8 }}>
          This page does not exist in the Support panel.
        </div>
        <div style={{ marginTop: 14 }}>
          <Link className="support-btn support-btn--primary" to="/inbox">
            Go to Inbox
          </Link>
        </div>
      </div>
    </div>
  );
}

