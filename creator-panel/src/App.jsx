import { Routes, Route } from 'react-router-dom';
import CreatorLayout from './layout/CreatorLayout';
import CreatorSectionPage from './pages/CreatorSectionPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <CreatorLayout>
      <Routes>
        <Route path="/" element={<CreatorSectionPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </CreatorLayout>
  );
}
