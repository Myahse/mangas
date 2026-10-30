import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../../services/api';

const REFRESH_MS = 60_000;

function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `il y a ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  return `il y a ${Math.round(s / 86400)} j`;
}

/** Bell with the unread count; the menu lists new chapters of followed series. */
export default function NotificationBell() {
  const [data, setData] = useState({ unread: 0, items: [] });
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();

  const load = () => fetchNotifications(15).then((d) => d && setData(d)).catch(() => {});

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const openItem = (n) => {
    setOpen(false);
    if (!n.read) markNotificationRead(n.id).then(load).catch(() => {});
  };

  return (
    <div className="navbar__user" ref={ref}>
      <button
        type="button"
        className="navbar__icon-btn navbar__bell"
        aria-label={data.unread ? `Notifications (${data.unread} non lues)` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} />
        {data.unread ? <span className="navbar__bell-badge">{data.unread > 9 ? '9+' : data.unread}</span> : null}
      </button>
      {open && (
        <div className="navbar__user-menu navbar__bell-menu" role="menu">
          {data.items.length === 0 ? (
            <p className="navbar__bell-empty">
              Suivez une série (♥ sur sa page) pour être prévenu de ses nouveaux chapitres.
            </p>
          ) : (
            data.items.map((n) => (
              <Link
                key={n.id}
                to={n.link || '/compte/abonnements'}
                className={`navbar__user-menu-item navbar__bell-item${n.read ? '' : ' navbar__bell-item--unread'}`}
                role="menuitem"
                onClick={() => openItem(n)}
              >
                <strong>{n.title}</strong>
                <span>{n.body}</span>
                <small>{timeAgo(n.createdAt)}</small>
              </Link>
            ))
          )}
          {data.unread ? (
            <button
              type="button"
              className="navbar__user-menu-item"
              role="menuitem"
              onClick={() => markAllNotificationsRead().then(load).catch(() => {})}
            >
              Tout marquer comme lu
            </button>
          ) : null}
          <Link to="/compte/abonnements" className="navbar__user-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            Mes abonnements
          </Link>
        </div>
      )}
    </div>
  );
}
