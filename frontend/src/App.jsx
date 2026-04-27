import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import DoctorSidebar from './components/DoctorSidebar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AppointmentsPage from './pages/AppointmentsPage';
import BookAppointmentPage from './pages/BookAppointmentPage';
import DoctorsPage from './pages/DoctorsPage';
import DocumentsPage from './pages/DocumentsPage';
import ProfilePage from './pages/ProfilePage';
import DoctorDashboardPage from './pages/DoctorDashboardPage';
import DoctorAppointmentsPage from './pages/DoctorAppointmentsPage';
import DoctorPrescriptionPage from './pages/DoctorPrescriptionPage';
import DoctorUploadPage from './pages/DoctorUploadPage';
import DoctorProfilePage from './pages/DoctorProfilePage';
import './styles/global.css';

function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'DOCTOR' && user.role !== 'DOCTOR') return <Navigate to="/dashboard" replace />;
  if (role === 'PATIENT' && user.role === 'DOCTOR') return <Navigate to="/doctor/dashboard" replace />;
  return children;
}

function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function DoctorShell({ children }) {
  return (
    <div className="app-shell">
      <DoctorSidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  const defaultPath = user?.role === 'DOCTOR' ? '/doctor/dashboard' : '/dashboard';

  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={user ? <Navigate to={defaultPath} replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to={defaultPath} replace /> : <RegisterPage />} />

      {/* Patient Routes */}
      <Route path="/dashboard" element={<PrivateRoute role="PATIENT"><AppShell><DashboardPage /></AppShell></PrivateRoute>} />
      <Route path="/appointments" element={<PrivateRoute role="PATIENT"><AppShell><AppointmentsPage /></AppShell></PrivateRoute>} />
      <Route path="/appointments/book" element={<PrivateRoute role="PATIENT"><AppShell><BookAppointmentPage /></AppShell></PrivateRoute>} />
      <Route path="/doctors" element={<PrivateRoute role="PATIENT"><AppShell><DoctorsPage /></AppShell></PrivateRoute>} />
      <Route path="/documents" element={<PrivateRoute role="PATIENT"><AppShell><DocumentsPage /></AppShell></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute role="PATIENT"><AppShell><ProfilePage /></AppShell></PrivateRoute>} />

      {/* Doctor Routes */}
      <Route path="/doctor/dashboard" element={<PrivateRoute role="DOCTOR"><DoctorShell><DoctorDashboardPage /></DoctorShell></PrivateRoute>} />
      <Route path="/doctor/appointments" element={<PrivateRoute role="DOCTOR"><DoctorShell><DoctorAppointmentsPage /></DoctorShell></PrivateRoute>} />
      <Route path="/doctor/prescriptions" element={<PrivateRoute role="DOCTOR"><DoctorShell><DoctorPrescriptionPage /></DoctorShell></PrivateRoute>} />
      <Route path="/doctor/upload" element={<PrivateRoute role="DOCTOR"><DoctorShell><DoctorUploadPage /></DoctorShell></PrivateRoute>} />
      <Route path="/doctor/profile" element={<PrivateRoute role="DOCTOR"><DoctorShell><DoctorProfilePage /></DoctorShell></PrivateRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={user ? defaultPath : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px', borderRadius: '10px' },
            success: { iconTheme: { primary: '#0d9488', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
