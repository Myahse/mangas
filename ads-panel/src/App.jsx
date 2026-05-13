import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './layout/AdminLayout.jsx';
import { OverviewPage } from './features/overview/pages/OverviewPage.jsx';
import { HeroAdsPage } from './features/ads/pages/HeroAdsPage.jsx';
import { NotificationsPage } from './features/notifications/pages/NotificationsPage.jsx';
import { SystemNoticesPage } from './features/notices/pages/SystemNoticesPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="hero-ads" element={<HeroAdsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="system-notices" element={<SystemNoticesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

