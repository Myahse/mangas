import { Navigate, Route, Routes } from 'react-router-dom';
import { FinanceLayout } from './layout/FinanceLayout.jsx';
import { OverviewPage } from './features/overview/pages/OverviewPage.jsx';
import { TransactionsPage } from './features/transactions/pages/TransactionsPage.jsx';
import { ReportsPage } from './features/reports/pages/ReportsPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<FinanceLayout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

