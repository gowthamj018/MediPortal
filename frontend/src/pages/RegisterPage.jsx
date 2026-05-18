import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Heart, Stethoscope, Eye, EyeOff } from 'lucide-react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];
const DEPARTMENTS = ['Cardiology', 'Dermatology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Psychiatry', 'General Medicine', 'Gynecology'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PW_MIN = 6;

export default function RegisterPage() {
  const [role, setRole] = useState('PATIENT');
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirmPassword: '',
    // Patient fields
    dateOfBirth: '', gender: '', bloodGroup: '', weight: '', height: '', age: '',
    // Doctor fields
    department: '', qualification: '', experienceYears: '', consultationFee: '',
    availableDays: '', availableTimeSlots: '',
  });
  const [schedule, setSchedule] = useState({});
  const [activeDayTab, setActiveDayTab] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isValidPhone, setIsValidPhone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  /* ── Day / slot toggles (doctor only) ── */
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
    setForm(f => ({ ...f, availableDays: updatedDays.join(', ') }));
    setSchedule(updatedSchedule);
  };

  const handleSlotToggle = (slot) => {
    if (!activeDayTab) return;
    const cur = schedule[activeDayTab] || [];
    const updated = cur.includes(slot) ? cur.filter(s => s !== slot) : [...cur, slot];
    updated.sort((a, b) => TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b));
    setSchedule(s => ({ ...s, [activeDayTab]: updated }));
  };

  /* ── Validation ── */
  const validate = () => {
    if (!form.firstName.trim()) return 'First name is required.';
    if (!form.lastName.trim()) return 'Last name is required.';
    if (!EMAIL_RE.test(form.email)) return 'Please enter a valid email address.';
    if (!isValidPhone) return 'Please enter a valid phone number.';
    if (form.password.length < PW_MIN) return `Password must be at least ${PW_MIN} characters.`;
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    if (role === 'DOCTOR') {
      if (!form.department) return 'Please select a department.';
      if (!form.qualification.trim()) return 'Qualification is required.';
      if (!form.experienceYears) return 'Experience years is required.';
      if (!form.consultationFee) return 'Consultation fee is required.';
      if (!form.availableDays) return 'Please select at least one available day.';
      const hasSlots = Object.values(schedule).some(slots => slots.length > 0);
      if (!hasSlots) return 'Please select at least one time slot.';
    }
    return null;
  };

  /* ── Submit ── */
  const handleRegister = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return toast.error(err);

    setLoading(true);
    try {
      let response;
      if (role === 'PATIENT') {
        response = await api.post('/api/auth/register', {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender || null,
          bloodGroup: form.bloodGroup || null,
          weight: form.weight ? parseFloat(form.weight) : null,
          height: form.height ? parseFloat(form.height) : null,
          age: form.age ? parseInt(form.age) : null,
        });
      } else {
        response = await api.post('/api/auth/register/doctor', {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          department: form.department,
          qualification: form.qualification,
          experienceYears: parseInt(form.experienceYears),
          consultationFee: parseFloat(form.consultationFee),
          availableDays: form.availableDays,
          availableTimeSlots: JSON.stringify(schedule),
        });
      }
      toast.success('Account created! Welcome to MediVault.');
      login(response.data);
      navigate(response.data.role === 'DOCTOR' ? '/doctor/dashboard' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Password strength indicator ── */
  const pwStrength = () => {
    const p = form.password;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const levels = ['Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
    return { label: levels[score] || 'Weak', color: colors[score] || '#ef4444', score };
  };
  const strength = pwStrength();

  return (
    <div className="auth-centered">
      <div className="auth-centered-card wide">
        {/* Brand */}
        <div className="brand" style={{ justifyContent: 'center', marginBottom: '24px' }}>
          <div className="brand-icon"><Heart size={20} color="#fff" fill="#fff" /></div>
          <span className="brand-name" style={{ color: 'var(--teal)' }}>MediVault</span>
        </div>

        <h3 style={{ textAlign: 'center' }}>Create an Account</h3>
        <p className="auth-sub" style={{ textAlign: 'center', marginBottom: '24px' }}>Join our secure health portal today.</p>

        {/* Role toggle */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '0 0 24px', background: 'var(--bg)', padding: '6px', borderRadius: '12px' }}>
          <button className={`btn ${role === 'PATIENT' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRole('PATIENT')} type="button" style={{ flex: 1, justifyContent: 'center', border: 'none' }}>
            <Heart size={16} /> Patient
          </button>
          <button className={`btn ${role === 'DOCTOR' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRole('DOCTOR')} type="button" style={{ flex: 1, justifyContent: 'center', border: 'none' }}>
            <Stethoscope size={16} /> Physician
          </button>
        </div>

        <form onSubmit={handleRegister}>

          {/* ── Name ── */}
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

          {/* ── Contact ── */}
          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <PhoneInput
                country={'in'}
                value={form.phone}
                onChange={(val, countryData) => {
                  setForm(f => ({ ...f, phone: '+' + val }));
                  const req = countryData?.format ? countryData.format.split('.').length - 1 : 10;
                  setIsValidPhone(val.length >= req);
                }}
                inputClass="form-control"
                containerStyle={{ width: '100%' }}
                inputStyle={{ width: '100%', height: '44px', paddingLeft: '48px', fontFamily: 'var(--font-body)', fontSize: '0.9rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)' }}
                buttonStyle={{ borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)', border: '1.5px solid var(--border)', borderRight: 'none', background: 'var(--bg)' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input className="form-control" type="email" name="email" placeholder="john@example.com" value={form.email} onChange={handleChange} required />
            </div>
          </div>

          {/* ── Password ── */}
          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label">Password *</label>
              <div style={{ position: 'relative' }}>
                <input className="form-control" type={showPassword ? 'text' : 'password'} name="password"
                  placeholder="Min 6 characters" value={form.password} onChange={handleChange}
                  style={{ paddingRight: '40px' }} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-light)', padding: 0 }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {strength && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border)' }}>
                    <div style={{ width: `${(strength.score + 1) * 25}%`, height: '100%', borderRadius: 2, background: strength.color, transition: 'all 0.3s' }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <div style={{ position: 'relative' }}>
                <input className="form-control" type={showConfirm ? 'text' : 'password'} name="confirmPassword"
                  placeholder="Re-enter password" value={form.confirmPassword} onChange={handleChange}
                  style={{ paddingRight: '40px', borderColor: form.confirmPassword && form.confirmPassword !== form.password ? '#ef4444' : undefined }}
                  autoComplete="new-password" />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-light)', padding: 0 }}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.confirmPassword && form.confirmPassword !== form.password && (
                <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4 }}>Passwords do not match</p>
              )}
            </div>
          </div>

          {/* ── Patient optional fields ── */}
          {role === 'PATIENT' && (
            <div className="form-row cols-2">
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input className="form-control" type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-control" name="gender" value={form.gender} onChange={handleChange}>
                  <option value="">Select</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select className="form-control" name="bloodGroup" value={form.bloodGroup} onChange={handleChange}>
                  <option value="">Select</option>
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Age</label>
                <input className="form-control" type="number" name="age" placeholder="25" value={form.age} onChange={handleChange} min={0} max={150} />
              </div>
            </div>
          )}

          {/* ── Doctor-specific fields ── */}
          {role === 'DOCTOR' && (
            <>
              <div style={{ height: '1px', background: 'var(--border)', margin: '16px 0' }} />
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
                  <label className="form-label">Consultation Fee *</label>
                  <input className="form-control" type="number" name="consultationFee" placeholder="500" value={form.consultationFee} onChange={handleChange} required min={0} />
                </div>
              </div>

              {/* Available Days */}
              <div className="form-group">
                <label className="form-label">Available Days *</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {DAYS.map(day => {
                    const isSelected = (form.availableDays || '').includes(day);
                    const isActive = activeDayTab === day;
                    return (
                      <button key={day} type="button" onClick={() => {
                        if (!isSelected) handleDayToggle(day);
                        else if (isActive) handleDayToggle(day);
                        else setActiveDayTab(day);
                      }}
                        style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', border: isSelected ? '1.5px solid var(--teal)' : '1.5px solid var(--border)', background: isSelected ? 'var(--teal)' : 'var(--bg-card)', color: isSelected ? '#fff' : 'var(--text-secondary)', transition: 'all 0.2s', boxShadow: isActive ? '0 0 0 3px rgba(13,148,136,0.3)' : 'none' }}>
                        {day}
                      </button>
                    );
                  })}
                </div>
                {form.availableDays && <p style={{ fontSize: '0.75rem', color: 'var(--slate)', marginTop: 6 }}>Click a selected day to configure its time slots.</p>}
              </div>

              {/* Time Slots */}
              {activeDayTab && (
                <div className="form-group">
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

          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading} style={{ marginTop: '16px' }}>
            {loading ? 'Creating Account…' : 'Register'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--slate)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>Sign in here</Link>
        </div>
      </div>
    </div>
  );
}
