import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="finance-surface">
      <div className="finance-surface__inner">
        <div className="section-header">
          <h2 className="section-title">Page not found</h2>
        </div>
        <p className="finance-muted">This page does not exist.</p>
        <div style={{ marginTop: 16 }}>
          <Link className="finance-btn finance-btn--primary" to="/overview">
            Go to overview
          </Link>
        </div>
      </div>
    </div>
  );
}

