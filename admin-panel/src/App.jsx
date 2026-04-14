import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './layout/AdminLayout.jsx';
import { OverviewPage } from './features/overview/pages/OverviewPage.jsx';
import { UsersPage } from './features/users/pages/UsersPage.jsx';
import { ContentPage } from './features/content/pages/ContentPage.jsx';
import { MangaRequestsPage } from './features/requests/pages/MangaRequestsPage.jsx';
import { CreatorRequestsPage } from './features/creators/pages/CreatorRequestsPage.jsx';
import { MangaSubmissionsPage } from './features/moderation/pages/MangaSubmissionsPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/requests" element={<MangaRequestsPage />} />
        <Route path="/creators" element={<CreatorRequestsPage />} />
        <Route path="/submissions" element={<MangaSubmissionsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/content" element={<ContentPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}