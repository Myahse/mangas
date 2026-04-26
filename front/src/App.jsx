import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Layout/Navbar';
import InfoBar from './components/Layout/InfoBar';
import Footer from './components/Layout/Footer';
import HomePage from './pages/HomePage';
import MangaPage from './pages/MangaPage';
import ReaderPage from './pages/ReaderPage';
import BrowsePage from './pages/BrowsePage';
import Register from './pages/Register/Register';
import AccountSectionPage from './pages/Account/AccountSectionPage';
import ProfilePage from './pages/Account/ProfilePage';
import BecomeCreatorPage from './pages/Account/BecomeCreatorPage';
import EpisodesPage from './pages/EpisodesPage';

/* The reader page uses its own full-screen layout */
function Layout({ children }) {
  const { pathname } = useLocation();
  const isReader = pathname.includes('/chapter/');
  const isRegister = pathname.startsWith('/register');

  if (isReader || isRegister) return <>{children}</>;

  return (
    <>
      <Navbar />
      <InfoBar />
      <main>{children}</main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/"                              element={<HomePage   />} />
          <Route path="/browse"                        element={<BrowsePage />} />
          <Route path="/episodes"                      element={<EpisodesPage />} />
          <Route path="/manga/:slug"                   element={<MangaPage  />} />
          <Route path="/manga/:slug/chapter/:chapter"  element={<ReaderPage />} />
          <Route path="/register"                      element={<Register   />} />
          <Route path="/compte"                         element={<AccountSectionPage />} />
          <Route path="/compte/abonnements"             element={<AccountSectionPage />} />
          <Route path="/compte/favoris"                 element={<AccountSectionPage />} />
          <Route path="/compte/profil"                  element={<ProfilePage />} />
          <Route path="/compte/devenir-createur"        element={<BecomeCreatorPage />} />
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}

function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      gap: '16px',
      fontFamily: 'Lufga, sans-serif',
    }}>
      <h1 style={{ fontSize: '5rem', fontWeight: 900, color: 'var(--primary)' }}>404</h1>
      <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Page introuvable</p>
      <a href="/" style={{
        padding: '10px 24px',
        background: 'var(--primary)',
        color: '#fff',
        borderRadius: '6px',
        fontWeight: 700,
      }}>Retour à l&apos;accueil</a>
    </div>
  );
}
