import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Calendar, Users, FileText, Clock, Stethoscope,
  ArrowRight, FileEdit, Upload
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="stat-card card">
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

export default function DoctorDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [todayAppts, setTodayAppts] = useState([]);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [dashRes, todayRes] = await Promise.all([
          api.get('/api/doctor/dashboard'),
          api.get('/api/doctor/appointments/today'),
        ]);
        setStats(dashRes.data);
        setTodayAppts(todayRes.data);
      } catch { }
      finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <div className="page">
      <div className="dashboard-hero card doctor-hero">
        <div className="dashboard-hero-text">
          <div className="greeting-tag" style={{ color: '#a78bfa' }}>
            <Stethoscope size={12} /> Physician Portal
          </div>
          <h2 className="dashboard-greeting">{greeting}, Dr. {user?.lastName}!</h2>
          <p className="dashboard-sub">Here's your schedule overview for today.</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="btn btn-primary" onClick={() => navigate('/doctor/prescriptions')}>
              <FileEdit size={15} /> Write Prescription
            </button>
            <button className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}
              onClick={() => navigate('/doctor/upload')}>
              <Upload size={15} /> Upload Report
            </button>
          </div>
        </div>
        <div className="dashboard-hero-art">
          <div className="hero-rings">
            <div className="ring ring-1" />
            <div className="ring ring-2" />
            <div className="ring ring-3" />
            <Stethoscope size={36} color="#a78bfa" style={{ position: 'relative', zIndex: 2 }} />
          </div>
        </div>
      </div>

      <div className="stats-row">
        <StatCard icon={Calendar} label="Today's Appointments"
          value={loading ? '—' : stats.todayAppointments || 0}
          color="var(--teal)" bg="var(--teal-pale)" />
        <StatCard icon={Clock} label="Upcoming"
          value={loading ? '—' : stats.upcomingAppointments || 0}
          color="#7c3aed" bg="#ede9fe" />
        <StatCard icon={Users} label="Total Patients"
          value={loading ? '—' : stats.totalPatients || 0}
          color="#0891b2" bg="#e0f2fe" />
        <StatCard icon={FileText} label="Reports Uploaded"
          value={loading ? '—' : stats.totalReports || 0}
          color="#16a34a" bg="#dcfce7" />
      </div>

      <div className="section-header">
        <h3 className="section-title">Today's Schedule</h3>
        <button className="text-link" onClick={() => navigate('/doctor/appointments')}>
          View all <ArrowRight size={14} />
        </button>
      </div>

      {loading ? (
        <div className="loading-placeholder">{[1,2,3].map(i => <div key={i} className="skeleton-row" />)}</div>
      ) : todayAppts.length === 0 ? (
        <div className="empty-state compact">
          <Calendar size={28} color="var(--slate-light)" />
          <p>No appointments scheduled for today</p>
        </div>
      ) : (
        <div className="card upcoming-list">
          {todayAppts.map((a, i) => (
            <React.Fragment key={a.id}>
              <div className="upcoming-card">
                <div className="upcoming-date-block" style={{ background: '#ede9fe' }}>
                  <div className="upcoming-month" style={{ color: '#7c3aed' }}>
                    {a.appointmentTime?.slice(0, 5)}
                  </div>
                </div>
                <div className="upcoming-details">
                  <div className="upcoming-doctor">{a.patientName}</div>
                  <div className="upcoming-spec">{a.reason || a.appointmentType || 'Consultation'}</div>
                </div>
                <div className={`upcoming-status status-${a.status?.toLowerCase()}`}>
                  {a.status}
                </div>
              </div>
              {i < todayAppts.length - 1 && <div className="list-divider" />}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
