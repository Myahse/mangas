import CreatorTopBar from './CreatorTopBar';
import Footer from '../components/layout/Footer';

export default function CreatorLayout({ children }) {
  return (
    <>
      <CreatorTopBar />
      <main className="creator-page-wrapper">
        <div className="container creator-main">{children}</div>
      </main>
      <Footer />
    </>
  );
}
