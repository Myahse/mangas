import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import './styles/global.css';
import App from './App';
import { AuthProvider } from './context/AuthContext.jsx';
import AuthGate from './components/auth/AuthGate.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AuthGate>
          <App />
        </AuthGate>
      </AuthProvider>
    </BrowserRouter>
    <Toaster richColors closeButton position="top-right" />
  </StrictMode>,
);
