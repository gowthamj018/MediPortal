import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Stethoscope, Calendar, Clock, CheckCircle, Search } from 'lucide-react';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const ALL_TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
];

const APPOINTMENT_TYPES = ['In-Person', 'Video Call', 'Phone Consultation'];

function StepIndicator({ step }) {
  const steps = ['Select Doctor', 'Pick Date & Time', 'Confirm'];
  return (
    <div className="step-indicator">
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <div className={`step ${i + 1 <= step ? 'active' : ''} ${i + 1 < step ? 'done' : ''}`}>
            <div className="step-circle">
              {i + 1 < step ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span className="step-label">{label}</span>
          </div>
          {i < steps.length - 1 && <div className={`step-line ${i + 1 < step ? 'done' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function BookAppointmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [doctors, setDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [form, setForm] = useState({
    doctorId: searchParams.get('doctorId') || '',
    selectedDoctor: null,
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: 'In-Person',
    reason: '',
    notes: '',
  });

  useEffect(() => { fetchDoctors(); }, []);

  useEffect(() => {
    if (form.doctorId && doctors.length > 0) {
      const doc = doctors.find(d => String(d.id) === String(form.doctorId));
      if (doc) { setForm(f => ({ ...f, selectedDoctor: doc })); setStep(2); }
    }
  }, [doctors]);

  // Fetch booked slots when doctor + date selected
  useEffect(() => {
    if (form.doctorId && form.appointmentDate) {
      fetchBookedSlots();
    }
  }, [form.doctorId, form.appointmentDate]);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/doctors');
      setDoctors(data);
    } catch { toast.error('Failed to load doctors.'); }
    finally { setLoading(false); }
  };

  const fetchBookedSlots = async () => {
    setLoadingSlots(true);
    try {
      const { data } = await api.get(`/api/appointments/booked-slots?doctorId=${form.doctorId}&date=${form.appointmentDate}`);
      setBookedSlots(data);
      // Clear selected time if it became booked
      if (data.includes(form.appointmentTime)) {
        setForm(f => ({ ...f, appointmentTime: '' }));
      }
    } catch { setBookedSlots([]); }
    finally { setLoadingSlots(false); }
  };

  const filteredDoctors = doctors.filter(d =>
    !searchQuery ||
    `${d.firstName} ${d.lastName} ${d.specialization} ${d.department}`
      .toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectDoctor = (doc) => {
    setForm(f => ({ ...f, doctorId: doc.id, selectedDoctor: doc, appointmentDate: '', appointmentTime: '' }));
    setStep(2);
  };

  const handleDateChange = (date) => {
    if (!date) {
      setForm(f => ({ ...f, appointmentDate: '', appointmentTime: '' }));
      return;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const val = `${year}-${month}-${day}`;

    setForm(f => ({ ...f, appointmentDate: val, appointmentTime: '' }));
  };

  const isDateSelectable = (date) => {
    if (!form.selectedDoctor?.availableDays) return true;
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    return form.selectedDoctor.availableDays.includes(dayName);
  };

  let doctorSlots = ALL_TIME_SLOTS;
  if (form.selectedDoctor?.availableTimeSlots) {
    try {
      const schedule = JSON.parse(form.selectedDoctor.availableTimeSlots);
      if (typeof schedule === 'object' && !Array.isArray(schedule)) {
        if (form.appointmentDate) {
          const dayName = new Date(form.appointmentDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
          doctorSlots = schedule[dayName] || [];
        } else {
          doctorSlots = [];
        }
      } else {
        throw new Error('Legacy array format');
      }
    } catch {
      doctorSlots = form.selectedDoctor.availableTimeSlots.split(', ');
    }
  }

  const availableSlots = doctorSlots.filter(t => !bookedSlots.includes(t));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/api/appointments', {
        doctorId: form.doctorId,
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime + ':00',
        appointmentType: form.appointmentType,
        reason: form.reason,
        notes: form.notes,
      });
      toast.success('Appointment booked successfully!');
      navigate('/appointments');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  const minDate = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="back-btn" onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/appointments')}>
            <ChevronLeft size={16} /> Back
          </button>
          <h2 className="page-title">Book Appointment</h2>
          <p className="page-subtitle">Schedule a visit with your preferred doctor</p>
        </div>
      </div>

      <StepIndicator step={step} />

      {/* STEP 1: Select Doctor */}
      {step === 1 && (
        <div className="book-step">
          <div className="search-bar" style={{ marginBottom: '24px' }}>
            <Search size={16} color="var(--slate)" />
            <input
              type="text"
              placeholder="Search by name, specialization..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          {loading ? (
            <div className="loading-placeholder">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton-card" />)}</div>
          ) : (
            <div className="doctor-select-grid">
              {filteredDoctors.map(doc => (
                <div key={doc.id} className="doctor-select-card card" onClick={() => selectDoctor(doc)}>
                  <div className="doctor-avatar-lg">
                    <Stethoscope size={22} color="var(--teal)" />
                  </div>
                  <div className="doctor-select-info">
                    <div className="doctor-select-name">Dr. {doc.firstName} {doc.lastName}</div>
                    <div className="doctor-select-spec">{doc.specialization}</div>
                    <div className="doctor-select-meta">
                      <span>⭐ {doc.rating}</span>
                      <span>·</span>
                      <span>{doc.experienceYears} yrs exp</span>
                      <span>·</span>
                      <span>₹{doc.consultationFee}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--slate-light)" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Date & Time */}
      {step === 2 && form.selectedDoctor && (
        <div className="book-step">
          <div className="card selected-doctor-banner">
            <div className="doctor-avatar-sm"><Stethoscope size={16} color="var(--teal)" /></div>
            <div>
              <div style={{ fontWeight: 600 }}>Dr. {form.selectedDoctor.firstName} {form.selectedDoctor.lastName}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>{form.selectedDoctor.specialization}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>Change</button>
          </div>

          <div className="book-form-grid">
            <div className="card form-section">
              <h4 className="form-section-title"><Calendar size={16} /> Select Date</h4>
              <DatePicker
                selected={form.appointmentDate ? new Date(form.appointmentDate + 'T00:00:00') : null}
                onChange={handleDateChange}
                filterDate={isDateSelectable}
                minDate={new Date()}
                className="form-control date-picker"
                placeholderText="Select a date"
                dateFormat="yyyy-MM-dd"
                wrapperClassName="date-picker-wrapper"
              />
              {form.selectedDoctor?.availableDays && (
                <div style={{ fontSize: '0.8rem', color: 'var(--slate)', marginTop: '8px' }}>
                  Available days: <strong style={{ color: 'var(--teal)' }}>{form.selectedDoctor.availableDays}</strong>
                </div>
              )}
            </div>

            <div className="card form-section">
              <h4 className="form-section-title"><Clock size={16} /> Select Time</h4>
              {!form.appointmentDate ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--slate-light)' }}>Please select a date first</p>
              ) : loadingSlots ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--slate-light)' }}>Loading available slots...</p>
              ) : availableSlots.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--red)' }}>No available slots for this date. Try another date.</p>
              ) : (
                <div className="time-slots">
                  {availableSlots.map(t => (
                    <button key={t}
                      className={`time-slot ${form.appointmentTime === t ? 'active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, appointmentTime: t }))}>
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card form-section">
            <h4 className="form-section-title">Appointment Details</h4>
            <div className="form-group">
              <label className="form-label">Type</label>
              <div className="type-selector">
                {APPOINTMENT_TYPES.map(t => (
                  <button key={t}
                    className={`type-btn ${form.appointmentType === t ? 'active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, appointmentType: t }))}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Reason for Visit</label>
              <input type="text" className="form-control"
                placeholder="e.g. Regular checkup, follow-up, chest pain..."
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Additional Notes <span style={{ color: 'var(--slate-light)' }}>(optional)</span></label>
              <textarea className="form-control" rows={3}
                placeholder="Any symptoms or info for the doctor..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary"
              disabled={!form.appointmentDate || !form.appointmentTime || !form.reason}
              onClick={() => setStep(3)}>
              Review Booking <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Confirm */}
      {step === 3 && (
        <div className="book-step confirm-step">
          <div className="card confirm-card">
            <div className="confirm-header">
              <CheckCircle size={40} color="var(--teal)" />
              <h3>Review Your Appointment</h3>
              <p>Please confirm the details below before booking.</p>
            </div>
            <div className="confirm-details">
              {[
                ['Doctor', `Dr. ${form.selectedDoctor?.firstName} ${form.selectedDoctor?.lastName}`],
                ['Specialization', form.selectedDoctor?.specialization],
                ['Date', form.appointmentDate ? new Date(form.appointmentDate + 'T00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''],
                ['Time', form.appointmentTime],
                ['Type', form.appointmentType],
                ['Reason', form.reason],
                ['Consultation Fee', `₹${form.selectedDoctor?.consultationFee}`],
              ].map(([label, val]) => val && (
                <div key={label} className="confirm-row">
                  <span className="confirm-label">{label}</span>
                  <span className="confirm-value">{val}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-ghost" onClick={() => setStep(2)}>Go Back</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Booking…' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
