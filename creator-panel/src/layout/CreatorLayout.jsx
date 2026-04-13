import CreatorTopBar from './CreatorTopBar';

export default function CreatorLayout({ children }) {
  return (
    <>
      <CreatorTopBar />
      <main>{children}</main>
    </>
  );
}
