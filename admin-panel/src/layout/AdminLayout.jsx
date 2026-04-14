import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar.jsx';
import InfoBar from '../components/layout/InfoBar.jsx';
import Footer from '../components/layout/Footer.jsx';

export function AdminLayout() {
  return (
    <div className="admin-shell">
      <Navbar />
      <InfoBar />
      <main className="page-wrapper">
        <div className="container admin-main">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
