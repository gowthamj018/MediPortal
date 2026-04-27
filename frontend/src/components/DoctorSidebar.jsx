import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Calendar, FileEdit, Upload,
  LogOut, Stethoscope, User
} from 'lucide-react';

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, path: '/doctor/dashboard' },
  { label: 'Appointments', icon: Calendar, path: '/doctor/appointments' },
  { label: 'Profile', icon: User, path: '/doctor/profile' },
];

export default function DoctorSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : 'D';

  return (
    <aside className="sidebar doctor-sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon doctor-logo-icon">
            <Stethoscope size={18} color="#fff" />
          </div>
          <div>
            <h1>MediVault</h1>
            <div className="tagline">Physician Portal</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Menu</div>
        {navItems.map(({ label, icon: Icon, path }) => (
          <div
            key={path}
            className={`nav-item ${pathname === path ? 'active' : ''}`}
            onClick={() => navigate(path)}
          >
            <Icon size={18} className="nav-icon" />
            {label}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar doctor-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.firstName} {user?.lastName}</div>
            <div className="user-role">Physician</div>
          </div>
          <button className="logout-btn" onClick={() => { logout(); navigate('/login'); }} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
