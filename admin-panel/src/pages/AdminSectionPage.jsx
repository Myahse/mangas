export function AdminSectionPage({ title, description, right, children }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="section-header">
        <div>
          <div className="section-title">{title}</div>
          {description ? (
            <div className="admin-muted" style={{ marginTop: 6 }}>
              {description}
            </div>
          ) : null}
        </div>
        {right ? <div className="admin-actions">{right}</div> : null}
      </div>
      {children}
    </div>
  );
}
