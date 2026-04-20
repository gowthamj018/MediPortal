import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Calendar, Clock, User, Stethoscope, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const STATUS_CONFIG = {
  SCHEDULED: { label: 'Scheduled', color: 'var(--teal)', bg: 'var(--teal-pale)', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: '#22c55e', bg: '#dcfce7', icon: CheckCircle },
  COMPLETED: { label: 'Completed', color: 'var(--slate)', bg: '#f1f5f9', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'var(--red)', bg: 'var(--red-pale)', icon: XCircle },
  NO_SHOW:   { label: 'No Show',   color: 'var(--amber)', bg: 'var(--amber-pale)', icon: AlertCircle },
};

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchAppointments(); }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/doctor/appointments');
      setAppointments(data);
    } catch { toast.error('Failed to load appointments.'); }
    finally { setLoading(false); }
  };

  const today = new Date().toISOString().split('T')[0];
  const filtered = appointments.filter(a => {
    if (filter === 'today') return a.appointmentDate === today && a.status !== 'CANCELLED';
    if (filter === 'upcoming') return a.appointmentDate >= today && a.status !== 'CANCELLED';
    if (filter === 'past') return a.appointmentDate < today || a.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Appointments</h2>
          <p className="page-subtitle">View and manage your patient appointments</p>
        </div>
      </div>

      <div className="filter-tabs">
        {[['all','All'],['today','Today'],['upcoming','Upcoming'],['past','Past']].map(([v,l]) => (
          <button key={v} className={`filter-tab ${filter === v ? 'active' : ''}`} onClick={() => setFilter(v)}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-placeholder">
          {[1,2,3].map(i => <div key={i} className="skeleton-card" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Calendar size={32} color="var(--slate-light)" />
          <h4>No appointments found</h4>
          <p>No {filter !== 'all' ? filter : ''} appointments.</p>
        </div>
      ) : (
        <div className="appt-grid">
          {filtered.map(a => {
            const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.SCHEDULED;
            const StatusIcon = cfg.icon;
            return (
              <div key={a.id} className="card appt-card">
                <div className="appt-card-header">
                  <div className="appt-doctor-info">
                    <div className="doctor-avatar-sm" style={{ background: '#ede9fe' }}>
                      <User size={16} color="#7c3aed" />
                    </div>
                    <div>
                      <div className="appt-doctor-name">{a.patientName}</div>
                      <div className="appt-specialization">{a.reason || 'Consultation'}</div>
                    </div>
                  </div>
                  <span className="status-badge" style={{ color: cfg.color, background: cfg.bg }}>
                    <StatusIcon size={12} />
                    {cfg.label}
                  </span>
                </div>
                <div className="appt-card-body">
                  <div className="appt-meta-row">
                    <div className="appt-meta-item">
                      <Calendar size={14} color="var(--slate)" />
                      <span>{a.appointmentDate ? format(parseISO(a.appointmentDate), 'EEE, MMM d, yyyy') : '—'}</span>
                    </div>
                    <div className="appt-meta-item">
                      <Clock size={14} color="var(--slate)" />
                      <span>{a.appointmentTime?.slice(0,5) || '—'}</span>
                    </div>
                    <div className="appt-meta-item">
                      <Stethoscope size={14} color="var(--slate)" />
                      <span>{a.appointmentType || 'In-Person'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
