import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/layout/Navbar';
import LoadingSpinner from './components/common/LoadingSpinner';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TripPageV2 from './pages/TripPageV2';
import DayPage from './pages/DayPage';
import AdminPage from './pages/AdminPage';
import SharedTripPage from './pages/SharedTripPage';
import CalendarPage from './pages/CalendarPage';
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

  return (
    <>
      <Navbar />
      <main id="app-container">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/trip-v2/:tripId" element={<TripPageV2 />} />
          <Route path="/day/:date" element={<DayPage />} />
          {isAdmin(state.user) && <Route path="/admin" element={<AdminPage />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
