import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/layout/Navbar';
import LoadingSpinner from './components/common/LoadingSpinner';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TripPage from './pages/TripPage';

export default function App() {
  const { state } = useApp();

  // Initialize auth listener (subscribes on mount)
  useAuth();

  if (state.isLoading) {
    return <LoadingSpinner message="Smart Trip 加载中..." />;
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
          <Route path="/trip/:id" element={<TripPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
