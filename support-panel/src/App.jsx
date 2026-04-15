import { Navigate, Route, Routes } from 'react-router-dom';
import { SupportLayout } from './layout/SupportLayout.jsx';
import { InboxPage } from './features/inbox/pages/InboxPage.jsx';
import { ChatPage } from './features/chat/pages/ChatPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<SupportLayout />}>
        <Route index element={<Navigate to="/inbox" replace />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

