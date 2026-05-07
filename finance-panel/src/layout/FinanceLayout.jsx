import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar.jsx';
import InfoBar from '../components/layout/InfoBar.jsx';
import Footer from '../components/layout/Footer.jsx';

export function FinanceLayout() {
  return (
    <div className="finance-shell">
      <Navbar />
      <InfoBar />
      <main className="page-wrapper">
        <div className="container finance-main">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}

