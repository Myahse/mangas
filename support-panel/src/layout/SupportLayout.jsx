import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar.jsx';
import InfoBar from '../components/layout/InfoBar.jsx';
import Footer from '../components/layout/Footer.jsx';

export function SupportLayout() {
  return (
    <div className="support-shell">
      <Navbar />
      <InfoBar />
      <main className="page-wrapper">
        <div className="container support-main">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}

