import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/layout/Navbar';
import LoadingSpinner from './components/common/LoadingSpinner';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TripPage from './pages/TripPage';
import ArchivePage from './pages/ArchivePage';
import AdminPage from './pages/AdminPage';
import SharedTripPage from './pages/SharedTripPage';
import { isAdmin } from './utils/admin';

export default function App() {
  const { state } = useApp();
  const location = useLocation();

  // Initialize auth listener (subscribes on mount)
  useAuth();

  if (state.isLoading) {
    return <LoadingSpinner message="Smart Trip 加载中..." />;
  }

  // Public route — no auth needed
  if (location.pathname.startsWith('/shared/')) {
    return (
      <Routes>
        <Route path="/shared/:token" element={<SharedTripPage />} />
      </Routes>
    );
  }

  if (!state.user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  const isArchiveRoute = location.pathname.startsWith('/archive');

  return (
    <>
      {!isArchiveRoute && <Navbar />}
      <main id={isArchiveRoute ? "archive-container" : "app-container"} style={isArchiveRoute ? { padding: 0 } : {}}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/trip/:id" element={<TripPage />} />
          <Route path="/archive/*" element={<ArchivePage />} />
          {isAdmin(state.user) && <Route path="/admin" element={<AdminPage />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
