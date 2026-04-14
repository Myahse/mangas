import { Routes, Route, Navigate } from 'react-router-dom';
import CreatorLayout from './layout/CreatorLayout';
import CreatorSectionPage from './pages/CreatorSectionPage';
import SeriesPage from './pages/SeriesPage';
import EpisodesPage from './pages/EpisodesPage';
import CreatorProfilePage from './pages/CreatorProfilePage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <CreatorLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/series" replace />} />
        <Route path="/series" element={<SeriesPage />} />
        <Route path="/episodes" element={<EpisodesPage />} />
        <Route path="/profil" element={<CreatorProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </CreatorLayout>
  );
}
