import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Calendar, Users, FileText,
  User, LogOut, Heart
} from 'lucide-react';

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Appointments', icon: Calendar, path: '/appointments' },
  { label: 'Find Doctors', icon: Users, path: '/doctors' },
  { label: 'My Records', icon: FileText, path: '/documents' },
  { label: 'My Profile', icon: User, path: '/profile' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : 'P';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">
            <Heart size={18} color="#fff" fill="#fff" />
          </div>
          <div>
            <h1>MediVault</h1>
            <div className="tagline">Patient Portal</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Menu</div>
        {navItems.map(({ label, icon: Icon, path }) => (
          <div
            key={path}
            className={`nav-item ${pathname === path || (path !== '/dashboard' && pathname.startsWith(path)) ? 'active' : ''}`}
            onClick={() => navigate(path)}
          >
            <Icon size={18} className="nav-icon" />
            {label}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.firstName} {user?.lastName}</div>
            <div className="user-role">Patient</div>
          </div>
          <button className="logout-btn" onClick={() => { logout(); navigate('/login'); }} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
