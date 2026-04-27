import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Heart, Stethoscope } from 'lucide-react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
const DEPARTMENTS = ['Cardiology', 'Dermatology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Psychiatry', 'General Medicine', 'Gynecology'];

export default function RegisterPage() {
  const [role, setRole] = useState('PATIENT');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', otp: '',
    // Patient
    dateOfBirth: '', gender: '', bloodGroup: '', weight: '', height: '', age: '',
    // Doctor
    department: '', qualification: '', experienceYears: '',
    consultationFee: '', availableDays: '', availableTimeSlots: ''
  });
  const [schedule, setSchedule] = useState({});
  const [activeDayTab, setActiveDayTab] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isValidPhone, setIsValidPhone] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const toggleSelection = (field, value) => {
    // Kept for fallback, though not used for days/slots anymore
    setForm(f => {
      const currentArr = f[field] ? f[field].split(', ') : [];
      if (currentArr.includes(value)) {
        return { ...f, [field]: currentArr.filter(item => item !== value).join(', ') };
      } else {
        return { ...f, [field]: [...currentArr, value].join(', ') };
      }
    });
  };

  const handleDayToggle = (day) => {
    const currentDays = form.availableDays ? form.availableDays.split(', ') : [];
    let updatedDays = [...currentDays];
    let updatedSchedule = { ...schedule };

    if (currentDays.includes(day)) {
      updatedDays = updatedDays.filter(d => d !== day);
      delete updatedSchedule[day];
      if (activeDayTab === day) setActiveDayTab(null);
    } else {
      updatedDays.push(day);
      updatedSchedule[day] = [];
      setActiveDayTab(day);
    }

    updatedDays.sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
    setForm({ ...form, availableDays: updatedDays.join(', ') });
    setSchedule(updatedSchedule);
  };

  const handleSlotToggle = (slot) => {
    if (!activeDayTab) return;
    const currentSlots = schedule[activeDayTab] || [];
    let updatedSlots = [...currentSlots];
    if (currentSlots.includes(slot)) {
      updatedSlots = updatedSlots.filter(s => s !== slot);
    } else {
      updatedSlots.push(slot);
    }

    updatedSlots.sort((a, b) => TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b));
    setSchedule({ ...schedule, [activeDayTab]: updatedSlots });
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!form.phone || !isValidPhone) return toast.error('Please enter a valid phone number with country code.');

    if (role === 'DOCTOR') {
      const hasSlots = Object.values(schedule).some(slots => slots.length > 0);
      if (!form.department || !form.qualification || !form.experienceYears || !form.consultationFee || !form.availableDays || !hasSlots) {
        return toast.error('Please fill all mandatory physician fields (including time slots) before proceeding.');
      }
    }

    setLoading(true);
    try {
      await api.post('/api/auth/generate-otp', { phone: form.phone, type: 'REGISTER' });
      toast.success('OTP sent! Check your phone.');
      setStep(2);
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.message?.includes('already registered')) {
        toast.error('You are already registered! Redirecting to sign in...');
        setTimeout(() => navigate('/login', { state: { prefilledPhone: form.phone } }), 2000);
      } else {
        toast.error(err.response?.data?.message || 'Failed to send OTP.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    if (!form.otp) return toast.error('Please enter the OTP.');

    setLoading(true);
    try {
      let payload = { ...form };
      let response;
      if (role === 'PATIENT') {
        payload.weight = payload.weight ? parseFloat(payload.weight) : null;
        payload.height = payload.height ? parseFloat(payload.height) : null;
        payload.age = payload.age ? parseInt(payload.age) : null;
        response = await api.post('/api/auth/register', payload);
      } else {
        payload.experienceYears = parseInt(payload.experienceYears);
        payload.consultationFee = parseFloat(payload.consultationFee);
        payload.availableTimeSlots = JSON.stringify(schedule);
        response = await api.post('/api/auth/register/doctor', payload);
      }

      toast.success('Account created successfully! Welcome to MediVault.');
      login(response.data);
      navigate(response.data.role === 'DOCTOR' ? '/doctor/dashboard' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-centered">
      <div className="auth-centered-card wide">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: '24px' }}>
          <div className="brand-icon">
            <Heart size={20} color="#fff" fill="#fff" />
          </div>
          <span className="brand-name" style={{ color: 'var(--teal)' }}>MediVault</span>
        </div>

        <h3 style={{ textAlign: 'center' }}>Create an Account</h3>
        <p className="auth-sub" style={{ textAlign: 'center', marginBottom: '24px' }}>Join our secure health portal today.</p>

        {step === 1 && (
          <div className="role-toggle" style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '0 0 24px', background: 'var(--bg)', padding: '6px', borderRadius: '12px' }}>
            <button
              className={`btn ${role === 'PATIENT' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setRole('PATIENT')}
              type="button"
              style={{ flex: 1, justifyContent: 'center', border: 'none' }}
            >
              <Heart size={16} /> Patient
            </button>
            <button
              className={`btn ${role === 'DOCTOR' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setRole('DOCTOR')}
              type="button"
              style={{ flex: 1, justifyContent: 'center', border: 'none' }}
            >
              <Stethoscope size={16} /> Physician
            </button>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp}>
            <div className="form-row cols-2">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input className="form-control" name="firstName" placeholder="John" value={form.firstName} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input className="form-control" name="lastName" placeholder="Doe" value={form.lastName} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row cols-2">
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <PhoneInput
                  country={'in'}
                  value={form.phone}
                  onChange={(val, countryData) => {
                    setForm(f => ({ ...f, phone: '+' + val }));
                    if (countryData && countryData.format) {
                      const requiredLength = countryData.format.split('.').length - 1;
                      setIsValidPhone(val.length >= requiredLength);
                    } else {
                      setIsValidPhone(val.length >= 10);
                    }
                  }}
                  onEnterKeyPress={() => { if(isValidPhone) handleSendOtp(); }}
                  inputClass="form-control"
                  containerStyle={{ width: '100%' }}
                  inputStyle={{ width: '100%', height: '44px', paddingLeft: '48px', fontFamily: 'var(--font-body)', fontSize: '0.9rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)' }}
                  buttonStyle={{ borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)', border: '1.5px solid var(--border)', borderRight: 'none', background: 'var(--bg)' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address (Optional)</label>
                <input className="form-control" type="email" name="email" placeholder="john@example.com" value={form.email} onChange={handleChange} />
              </div>
            </div>

            {role === 'DOCTOR' && (
              <>
                <div style={{ height: '1px', background: 'var(--border)', margin: '20px 0' }}></div>
                <div className="form-row cols-2">
                  <div className="form-group">
                    <label className="form-label">Department *</label>
                    <select className="form-control" name="department" value={form.department} onChange={handleChange} required>
                      <option value="">Select Department</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Qualification *</label>
                    <input className="form-control" name="qualification" placeholder="MBBS, MD" value={form.qualification} onChange={handleChange} required />
                  </div>
                </div>
                <div className="form-row cols-2">
                  <div className="form-group">
                    <label className="form-label">Experience (Years) *</label>
                    <input className="form-control" type="number" name="experienceYears" placeholder="10" value={form.experienceYears} onChange={handleChange} required min={0} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Consultation Fee ($) *</label>
                    <input className="form-control" type="number" name="consultationFee" placeholder="100" value={form.consultationFee} onChange={handleChange} required min={0} />
                  </div>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Available Days *</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {DAYS.map(day => {
                      const isSelected = (form.availableDays || '').includes(day);
                      const isActive = activeDayTab === day;
                      return (
                        <button key={day} type="button" onClick={() => {
                          if (!isSelected) {
                            handleDayToggle(day);
                          } else {
                            if (isActive) handleDayToggle(day);
                            else setActiveDayTab(day);
                          }
                        }}
                          style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', border: isSelected ? '1.5px solid var(--teal)' : '1.5px solid var(--border)', background: isSelected ? 'var(--teal)' : 'var(--bg-card)', color: isSelected ? '#fff' : 'var(--text-secondary)', transition: 'all 0.2s', boxShadow: isActive ? '0 0 0 3px rgba(13, 148, 136, 0.3)' : 'none' }}>
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  {form.availableDays && <p style={{ fontSize: '0.75rem', color: 'var(--slate)', marginTop: '6px' }}>Click a selected day to configure its specific time slots. Click an active day again to remove it.</p>}
                </div>
                {activeDayTab && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Time Slots for <span style={{ color: 'var(--teal)' }}>{activeDayTab}</span> *</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {TIME_SLOTS.map(slot => {
                        const isSelected = (schedule[activeDayTab] || []).includes(slot);
                        return (
                          <button key={slot} type="button" onClick={() => handleSlotToggle(slot)}
                            style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', border: isSelected ? '1.5px solid var(--teal)' : '1.5px solid var(--border)', background: isSelected ? 'var(--teal)' : 'var(--bg-card)', color: isSelected ? '#fff' : 'var(--text-secondary)', transition: 'all 0.2s' }}>
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading || !isValidPhone} style={{ marginTop: '10px' }}>
              {loading ? 'Sending OTP…' : 'Continue & Verify Phone'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-group" style={{ textAlign: 'center' }}>
              <label className="form-label">Enter OTP sent to {form.phone}</label>
              <input className="form-control" type="text" name="otp" placeholder="123456"
                value={form.otp} onChange={handleChange} required style={{ maxWidth: '200px', margin: '16px auto', textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem' }} />
              <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Go Back
              </button>
            </div>
            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
              {loading ? 'Creating Account…' : 'Verify & Create Account'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--slate)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>Sign in here</Link>
        </div>
      </div>
    </div>
  );
}
