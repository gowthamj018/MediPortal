import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Calendar, Clock, User, Plus, CheckCircle, XCircle,
  AlertCircle, Stethoscope, RefreshCw, X, Star
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const STATUS_CONFIG = {
  SCHEDULED: { label: 'Scheduled', color: 'var(--teal)', bg: 'var(--teal-pale)', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: '#22c55e', bg: '#dcfce7', icon: CheckCircle },
  COMPLETED: { label: 'Completed', color: 'var(--slate)', bg: '#f1f5f9', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'var(--red)', bg: 'var(--red-pale)', icon: XCircle },
  NO_SHOW:   { label: 'No Show',   color: 'var(--amber)', bg: 'var(--amber-pale)', icon: AlertCircle },
};

const ALL_TIME_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '14:00','14:30','15:00','15:30','16:00','16:30','17:00'
];

function AppointmentCard({ appt, onCancel, onReschedule, onRate }) {
  const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.SCHEDULED;
  const StatusIcon = cfg.icon;
  const isCancellable = ['SCHEDULED', 'CONFIRMED'].includes(appt.status);
  const canRate = appt.status === 'COMPLETED' && !appt.rated;

  return (
    <div className="card appt-card">
      <div className="appt-card-header">
        <div className="appt-doctor-info">
          <div className="doctor-avatar-sm">
            <Stethoscope size={16} color="var(--teal)" />
          </div>
          <div>
            <div className="appt-doctor-name">{appt.doctorName}</div>
            <div className="appt-specialization">{appt.doctorSpecialization}</div>
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
            <span>{appt.appointmentDate ? format(parseISO(appt.appointmentDate), 'EEE, MMM d, yyyy') : '—'}</span>
          </div>
          <div className="appt-meta-item">
            <Clock size={14} color="var(--slate)" />
            <span>{appt.appointmentTime ? appt.appointmentTime.slice(0, 5) : '—'}</span>
          </div>
          <div className="appt-meta-item">
            <User size={14} color="var(--slate)" />
            <span>{appt.appointmentType || 'In-Person'}</span>
          </div>
        </div>
        {appt.reason && (
          <p className="appt-reason">"{appt.reason}"</p>
        )}
      </div>

      {(isCancellable || canRate) && (
        <div className="appt-card-footer">
          {canRate && (
            <button className="btn btn-ghost btn-sm" style={{ color: '#f59e0b' }}
              onClick={() => onRate(appt)}>
              <Star size={13} /> Rate Doctor
            </button>
          )}
          {isCancellable && (
            <>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--teal)' }}
                onClick={() => onReschedule(appt)}>
                <RefreshCw size={13} /> Reschedule
              </button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}
                onClick={() => onCancel(appt.id)}>
                Cancel
              </button>
            </>
          )}
          {appt.rated && appt.status === 'COMPLETED' && (
            <span style={{ fontSize: '0.78rem', color: 'var(--slate-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Star size={12} fill="#f59e0b" color="#f59e0b" /> Rated
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function RatingModal({ appt, onClose, onDone }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { toast.error('Please select a rating.'); return; }
    setSubmitting(true);
    try {
      await api.post(`/api/appointments/${appt.id}/rate`, { rating, review });
      toast.success('Thank you for your feedback!');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rating failed.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h3 className="modal-title">Rate Your Experience</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{appt.doctorName}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>{appt.doctorSpecialization}</div>
          </div>

          <div className="rating-stars" style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
            {[1,2,3,4,5].map(i => (
              <button key={i} type="button"
                className="star-btn"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, transition: 'transform 0.15s' ,
                  transform: (hovered >= i || rating >= i) ? 'scale(1.15)' : 'scale(1)' }}>
                <Star size={32}
                  color="#f59e0b"
                  fill={(hovered >= i || (!hovered && rating >= i)) ? '#f59e0b' : 'transparent'}
                />
              </button>
            ))}
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--slate)', marginBottom: 16 }}>
            {rating === 0 ? 'Tap a star to rate' : ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </div>

          <div className="form-group">
            <label className="form-label">Review <span style={{ color: 'var(--slate-light)' }}>(optional)</span></label>
            <textarea className="form-control" rows={3}
              placeholder="Share your experience..."
              value={review} onChange={e => setReview(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={submitting || rating === 0} onClick={handleSubmit}>
              {submitting ? 'Submitting…' : 'Submit Rating'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RescheduleModal({ appt, onClose, onDone }) {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [doctorSchedule, setDoctorSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (appt.doctorId) {
      api.get(`/api/doctors/${appt.doctorId}`).then(res => {
         let sched = {};
         try {
           sched = JSON.parse(res.data.availableTimeSlots || '{}');
           if (typeof sched !== 'object' || Array.isArray(sched)) throw new Error();
         } catch {
           const days = res.data.availableDays ? res.data.availableDays.split(', ') : [];
           const slots = res.data.availableTimeSlots ? res.data.availableTimeSlots.split(', ') : [];
           days.forEach(d => { sched[d] = [...slots]; });
         }
         setDoctorSchedule(sched);
      }).catch(() => setDoctorSchedule({}));
    }
  }, [appt.doctorId]);

  useEffect(() => {
    if (newDate && appt.doctorId) {
      fetchSlots();
    }
  }, [newDate]);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/appointments/booked-slots?doctorId=${appt.doctorId}&date=${newDate}`);
      setBookedSlots(data);
    } catch { setBookedSlots([]); }
    finally { setLoading(false); }
  };

  const dayName = newDate ? format(parseISO(newDate), 'EEE') : '';
  const daySlots = (doctorSchedule && newDate) ? (doctorSchedule[dayName] || []) : [];
  const availableSlots = daySlots.filter(t => !bookedSlots.includes(t));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.put(`/api/appointments/${appt.id}/reschedule`, {
        appointmentDate: newDate,
        appointmentTime: newTime + ':00'
      });
      toast.success('Appointment rescheduled!');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reschedule failed.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3 className="modal-title">Reschedule Appointment</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="card" style={{ padding: '14px 16px', marginBottom: 20, background: 'var(--teal-pale)', border: '1px solid var(--teal)' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{appt.doctorName}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>
              Current: {appt.appointmentDate ? format(parseISO(appt.appointmentDate), 'EEE, MMM d') : ''} at {appt.appointmentTime?.slice(0,5)}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">New Date</label>
            <div style={{ position: 'relative' }}>
              <DatePicker
                selected={newDate ? parseISO(newDate) : null}
                onChange={d => { setNewDate(format(d, 'yyyy-MM-dd')); setNewTime(''); }}
                minDate={new Date()}
                filterDate={date => {
                  if (!doctorSchedule) return true;
                  const day = format(date, 'EEE');
                  return doctorSchedule[day] && doctorSchedule[day].length > 0;
                }}
                className="form-control"
                placeholderText="Select an available date"
                dateFormat="yyyy-MM-dd"
              />
              <Calendar size={16} style={{ position: 'absolute', right: 12, top: 14, color: 'var(--slate-light)', pointerEvents: 'none' }} />
            </div>
          </div>

          {newDate && (
            <div className="form-group">
              <label className="form-label">New Time</label>
              {loading ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--slate-light)' }}>Loading slots...</p>
              ) : availableSlots.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--red)' }}>No slots available. Try another date.</p>
              ) : (
                <div className="time-slots">
                  {availableSlots.map(t => (
                    <button key={t}
                      className={`time-slot ${newTime === t ? 'active' : ''}`}
                      onClick={() => setNewTime(t)}>
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={!newDate || !newTime || submitting} onClick={handleSubmit}>
              {submitting ? 'Rescheduling…' : 'Confirm Reschedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [ratingAppt, setRatingAppt] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { fetchAppointments(); }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/appointments');
      setAppointments(data);
    } catch {
      toast.error('Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.put(`/api/appointments/${id}/cancel`);
      toast.success('Appointment cancelled.');
      fetchAppointments();
    } catch {
      toast.error('Failed to cancel appointment.');
    }
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const filtered = appointments.filter(a => {
    if (filter === 'upcoming') return a.appointmentDate >= today && a.status !== 'CANCELLED';
    if (filter === 'past') return a.appointmentDate < today || a.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Appointments</h2>
          <p className="page-subtitle">Track and manage all your scheduled visits</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/appointments/book')}>
          <Plus size={16} /> Book Appointment
        </button>
      </div>

      <div className="filter-tabs">
        {[['all', 'All'], ['upcoming', 'Upcoming'], ['past', 'Past']].map(([val, label]) => (
          <button key={val} className={`filter-tab ${filter === val ? 'active' : ''}`}
            onClick={() => setFilter(val)}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-placeholder">
          {[1,2,3].map(i => <div key={i} className="skeleton-card" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Calendar size={32} color="var(--slate-light)" /></div>
          <h4>No appointments found</h4>
          <p>You have no {filter !== 'all' ? filter : ''} appointments yet.</p>
          <button className="btn btn-primary" onClick={() => navigate('/appointments/book')}>
            <Plus size={15} /> Book Your First Appointment
          </button>
        </div>
      ) : (
        <div className="appt-grid">
          {filtered.map(a => (
            <AppointmentCard key={a.id} appt={a} onCancel={handleCancel}
              onReschedule={(appt) => setRescheduleAppt(appt)}
              onRate={(appt) => setRatingAppt(appt)} />
          ))}
        </div>
      )}

      {rescheduleAppt && (
        <RescheduleModal
          appt={rescheduleAppt}
          onClose={() => setRescheduleAppt(null)}
          onDone={() => { setRescheduleAppt(null); fetchAppointments(); }}
        />
      )}

      {ratingAppt && (
        <RatingModal
          appt={ratingAppt}
          onClose={() => setRatingAppt(null)}
          onDone={() => { setRatingAppt(null); fetchAppointments(); }}
        />
      )}
    </div>
  );
}
