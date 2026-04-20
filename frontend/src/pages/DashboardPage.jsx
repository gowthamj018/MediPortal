import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Calendar, FileText, Stethoscope, Clock, Plus,
  ArrowRight, Activity, Heart
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

function StatCard({ icon: Icon, label, value, color, bg, onClick }) {
  return (
    <div className="stat-card card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="stat-icon" style={{ background: bg, color }}>
        <Icon size={20} />
      </div>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function UpcomingCard({ appt }) {
  return (
    <div className="upcoming-card">
      <div className="upcoming-date-block">
        <div className="upcoming-month">
          {appt.appointmentDate ? format(parseISO(appt.appointmentDate), 'MMM') : '—'}
        </div>
        <div className="upcoming-day">
          {appt.appointmentDate ? format(parseISO(appt.appointmentDate), 'd') : '—'}
        </div>
      </div>
      <div className="upcoming-details">
        <div className="upcoming-doctor">{appt.doctorName}</div>
        <div className="upcoming-spec">{appt.doctorSpecialization}</div>
        <div className="upcoming-time">
          <Clock size={12} color="var(--slate-light)" />
          {appt.appointmentTime?.slice(0, 5)} · {appt.appointmentType || 'In-Person'}
        </div>
      </div>
      <div className={`upcoming-status status-${appt.status?.toLowerCase()}`}>
        {appt.status}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, upcoming: 0, documents: 0 });
  const [bmiData, setBmiData] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [apptRes, upcomingRes, docsRes, dashRes] = await Promise.all([
          api.get('/api/appointments'),
          api.get('/api/appointments/upcoming'),
          api.get('/api/documents'),
          api.get('/api/patient/dashboard'),
        ]);
        setStats({
          total: apptRes.data.length,
          upcoming: upcomingRes.data.length,
          documents: docsRes.data.length,
        });
        setUpcoming(upcomingRes.data.slice(0, 5));
        if (dashRes.data.bmi) {
          setBmiData({ bmi: dashRes.data.bmi, category: dashRes.data.bmiCategory });
        }
      } catch { }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const getBmiColor = (category) => {
    if (category === 'Normal') return { color: '#16a34a', bg: '#dcfce7' };
    if (category === 'Underweight') return { color: '#0891b2', bg: '#e0f2fe' };
    if (category === 'Overweight') return { color: '#d97706', bg: '#fef3c7' };
    return { color: '#dc2626', bg: '#fee2e2' };
  };

  const bmiStyle = bmiData ? getBmiColor(bmiData.category) : { color: '#94a3b8', bg: '#f1f5f9' };

  return (
    <div className="page">
      <div className="dashboard-hero card">
        <div className="dashboard-hero-text">
          <div className="greeting-tag">
            <Heart size={12} fill="var(--teal)" color="var(--teal)" /> Patient Portal
          </div>
          <h2 className="dashboard-greeting">{greeting}, {user?.firstName}!</h2>
          <p className="dashboard-sub">Here's your health overview for today.</p>
          <button className="btn btn-primary" onClick={() => navigate('/appointments/book')}>
            <Plus size={15} /> Book Appointment
          </button>
        </div>
        <div className="dashboard-hero-art">
          <div className="hero-rings">
            <div className="ring ring-1" />
            <div className="ring ring-2" />
            <div className="ring ring-3" />
            <Stethoscope size={36} color="var(--teal)" style={{ position: 'relative', zIndex: 2 }} />
          </div>
        </div>
      </div>

      <div className="stats-row">
        <StatCard icon={Calendar} label="Total Appointments" value={loading ? '—' : stats.total}
          color="var(--teal)" bg="var(--teal-pale)" onClick={() => navigate('/appointments')} />
        <StatCard icon={Clock} label="Upcoming" value={loading ? '—' : stats.upcoming}
          color="#7c3aed" bg="#ede9fe" onClick={() => navigate('/appointments')} />
        <StatCard icon={FileText} label="My Documents" value={loading ? '—' : stats.documents}
          color="#0891b2" bg="#e0f2fe" onClick={() => navigate('/documents')} />
        <StatCard icon={Activity} label="BMI Index"
          value={loading ? '—' : (bmiData ? bmiData.bmi : '—')}
          color={bmiStyle.color} bg={bmiStyle.bg} />
      </div>

      {bmiData && (
        <div className="bmi-banner card" style={{ marginBottom: 24 }}>
          <div className="bmi-banner-content">
            <Activity size={18} color={bmiStyle.color} />
            <span>Your BMI is <strong>{bmiData.bmi}</strong> — <span style={{ color: bmiStyle.color }}>{bmiData.category}</span></span>
          </div>
          {!bmiData && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/profile')}>
              Update weight & height
            </button>
          )}
        </div>
      )}

      <div className="section-header">
        <h3 className="section-title">Upcoming Appointments</h3>
        <button className="text-link" onClick={() => navigate('/appointments')}>
          View all <ArrowRight size={14} />
        </button>
      </div>

      {loading ? (
        <div className="loading-placeholder">{[1,2,3].map(i => <div key={i} className="skeleton-row" />)}</div>
      ) : upcoming.length === 0 ? (
        <div className="empty-state compact">
          <Calendar size={28} color="var(--slate-light)" />
          <p>No upcoming appointments</p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/appointments/book')}>
            <Plus size={13} /> Book Now
          </button>
        </div>
      ) : (
        <div className="card upcoming-list">
          {upcoming.map((a, i) => (
            <React.Fragment key={a.id}>
              <UpcomingCard appt={a} />
              {i < upcoming.length - 1 && <div className="list-divider" />}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
