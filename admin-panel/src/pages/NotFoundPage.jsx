import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div
      className="admin-surface"
      style={{ padding: 20, display: 'grid', gap: 10, maxWidth: 720 }}
    >
      <div style={{ fontSize: 28, fontWeight: 900 }}>404</div>
      <div className="admin-muted">
        This page does not exist. Use the navigation or go back to the overview.
      </div>
      <div style={{ marginTop: 6 }}>
        <Link className="admin-btn admin-btn--primary" to="/overview">
          Go to Overview
        </Link>
      </div>
    </div>
  );
}
