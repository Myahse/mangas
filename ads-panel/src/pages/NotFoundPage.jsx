import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="admin-surface">
      <div className="admin-surface__inner">
        <div className="section-header">
          <h1 className="section-title">Not found</h1>
        </div>
        <p className="admin-muted" style={{ marginBottom: 14 }}>
          This page doesn&apos;t exist.
        </p>
        <Link className="admin-btn admin-btn--primary" to="/overview">
          Go to overview
        </Link>
      </div>
    </div>
  );
}

