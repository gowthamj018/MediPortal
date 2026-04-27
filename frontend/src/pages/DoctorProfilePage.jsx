import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Edit2, Save, X, Stethoscope, Briefcase, Clock, Calendar as CalendarIcon, DollarSign, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const DEPARTMENTS = [
  'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
  'General Medicine', 'Dermatology', 'Gynecology'
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ALL_TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
];

function InfoRow({ icon: Icon, label, value, children }) {
  return (
    <div className="profile-info-row">
      <div className="profile-info-icon"><Icon size={15} color="var(--teal)" /></div>
      <div className="profile-info-content">
        <div className="profile-info-label">{label}</div>
        <div className="profile-info-value">{children || value || <span style={{ color: 'var(--slate-light)' }}>Not provided</span>}</div>
      </div>
    </div>
  );
}

export default function DoctorProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeDayTab, setActiveDayTab] = useState(null);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/doctor/profile');
      let parsedSchedule = {};
      try {
        parsedSchedule = JSON.parse(data.availableTimeSlots || '{}');
        if (typeof parsedSchedule !== 'object' || Array.isArray(parsedSchedule)) throw new Error();
      } catch {
        const days = data.availableDays ? data.availableDays.split(', ') : [];
        const slots = data.availableTimeSlots ? data.availableTimeSlots.split(', ') : [];
        days.forEach(d => { parsedSchedule[d] = [...slots]; });
      }
      const updatedData = { ...data, schedule: parsedSchedule };
      setProfile(updatedData);
      setForm(updatedData);
    } catch { toast.error('Failed to load profile.'); }
    finally { setLoading(false); }
  };

  const handleDayToggle = (day) => {
    const currentDays = form.availableDays ? form.availableDays.split(', ') : [];
    let updatedDays = [...currentDays];
    let updatedSchedule = { ...(form.schedule || {}) };

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
    setForm({ ...form, availableDays: updatedDays.join(', '), schedule: updatedSchedule });
  };

  const handleSlotToggle = (slot) => {
    if (!activeDayTab) return;
    const currentSlots = form.schedule?.[activeDayTab] || [];
    let updatedSlots = [...currentSlots];
    if (currentSlots.includes(slot)) {
      updatedSlots = updatedSlots.filter(s => s !== slot);
    } else {
      updatedSlots.push(slot);
    }
    
    updatedSlots.sort((a, b) => ALL_TIME_SLOTS.indexOf(a) - ALL_TIME_SLOTS.indexOf(b));
    setForm({ ...form, schedule: { ...form.schedule, [activeDayTab]: updatedSlots } });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/api/doctor/profile', {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        department: form.department,
        specialization: form.specialization,
        qualification: form.qualification,
        experienceYears: form.experienceYears,
        consultationFee: form.consultationFee,
        availableDays: form.availableDays,
        availableTimeSlots: JSON.stringify(form.schedule || {}),
        bio: form.bio,
      });
      const parsedSchedule = JSON.parse(data.availableTimeSlots || '{}');
      const updatedData = { ...data, schedule: parsedSchedule };
      setProfile(updatedData);
      setForm(updatedData);
      setEditing(false);
      toast.success('Profile updated successfully!');
    } catch { toast.error('Failed to update profile.'); }
    finally { setSaving(false); }
  };

  const initials = profile ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}` : 'Dr';

  if (loading) return (
    <div className="page">
      <div className="loading-placeholder">{[1,2].map(i => <div key={i} className="skeleton-card tall" />)}</div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Physician Profile</h2>
          <p className="page-subtitle">Manage your professional information and availability</p>
        </div>
        {!editing ? (
          <button className="btn btn-secondary" onClick={() => setEditing(true)}>
            <Edit2 size={15} /> Edit Profile
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-ghost" onClick={() => { setEditing(false); setForm(profile); }}>
              <X size={15} /> Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={15} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="profile-layout">
        {/* Left: Avatar Card */}
        <div className="profile-avatar-card card">
          <div className="profile-avatar-circle" style={{ background: '#7c3aed' }}>{initials}</div>
          <h3 className="profile-fullname">Dr. {profile?.firstName} {profile?.lastName}</h3>
          <div className="profile-email">{profile?.email}</div>
          <div className="profile-badge" style={{ background: '#ede9fe', color: '#7c3aed' }}>Physician</div>
          {profile?.department && (
            <div className="profile-since" style={{ marginTop: '8px', color: 'var(--slate)' }}>
              {profile.department} Department
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Personal Info */}
          <div className="card">
            <div className="card-section-title">Personal & Contact Info</div>
            {editing ? (
              <div className="edit-form-grid">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input className="form-control" value={form.firstName || ''} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input className="form-control" value={form.lastName || ''} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Phone</label>
                  <PhoneInput
                    country={'in'}
                    value={form.phone || ''}
                    onChange={phone => setForm(f => ({ ...f, phone: '+' + phone }))}
                    inputClass="form-control"
                    containerStyle={{ width: '100%' }}
                    inputStyle={{ width: '100%', height: '40px', paddingLeft: '48px', fontFamily: 'var(--font-body)', fontSize: '0.875rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)' }}
                    buttonStyle={{ borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)', border: '1.5px solid var(--border)', borderRight: 'none', background: 'var(--bg)' }}
                  />
                </div>
              </div>
            ) : (
              <div>
                <InfoRow icon={User} label="Full Name" value={`Dr. ${profile?.firstName} ${profile?.lastName}`} />
                <InfoRow icon={Mail} label="Email Address" value={profile?.email} />
                <InfoRow icon={Phone} label="Phone Number" value={profile?.phone} />
              </div>
            )}
          </div>

          {/* Professional Details */}
          <div className="card">
            <div className="card-section-title">Professional Details</div>
            {editing ? (
              <div className="edit-form-grid">
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-control" value={form.department || ''} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Specialization</label>
                  <input className="form-control" value={form.specialization || ''} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} placeholder="e.g. Interventional Cardiology" />
                </div>
                <div className="form-group">
                  <label className="form-label">Qualification</label>
                  <input className="form-control" value={form.qualification || ''} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} placeholder="e.g. MBBS, MD" />
                </div>
                <div className="form-group">
                  <label className="form-label">Experience (Years)</label>
                  <input className="form-control" type="number" value={form.experienceYears || ''} onChange={e => setForm(f => ({ ...f, experienceYears: e.target.value }))} min={0} />
                </div>
                <div className="form-group">
                  <label className="form-label">Consultation Fee (₹)</label>
                  <input className="form-control" type="number" value={form.consultationFee || ''} onChange={e => setForm(f => ({ ...f, consultationFee: e.target.value }))} min={0} />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Bio (Optional)</label>
                  <textarea className="form-control" rows={3} value={form.bio || ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="A short description about yourself..." />
                </div>
              </div>
            ) : (
              <div>
                <InfoRow icon={Stethoscope} label="Department" value={profile?.department} />
                <InfoRow icon={User} label="Specialization" value={profile?.specialization} />
                <InfoRow icon={BookOpen} label="Qualification" value={profile?.qualification} />
                <InfoRow icon={Briefcase} label="Experience" value={profile?.experienceYears ? `${profile.experienceYears} Years` : null} />
                <InfoRow icon={DollarSign} label="Consultation Fee" value={profile?.consultationFee ? `₹${profile.consultationFee}` : null} />
                <InfoRow icon={User} label="Bio" value={profile?.bio} />
              </div>
            )}
          </div>

          {/* Availability */}
          <div className="card">
            <div className="card-section-title">Availability</div>
            {editing ? (
              <div className="edit-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="form-group">
                  <label className="form-label">Available Days</label>
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
                  <div className="form-group">
                    <label className="form-label">Time Slots for <span style={{ color: 'var(--teal)' }}>{activeDayTab}</span></label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {ALL_TIME_SLOTS.map(t => {
                        const isSelected = (form.schedule?.[activeDayTab] || []).includes(t);
                        return (
                          <button key={t} type="button" onClick={() => handleSlotToggle(t)}
                            style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', border: isSelected ? '1.5px solid var(--teal)' : '1.5px solid var(--border)', background: isSelected ? 'var(--teal)' : 'var(--bg-card)', color: isSelected ? '#fff' : 'var(--text-secondary)', transition: 'all 0.2s' }}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <InfoRow icon={CalendarIcon} label="Available Days">
                  {profile?.availableDays ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {profile.availableDays.split(', ').map(day => (
                        <span key={day} className="pill" style={{ background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', fontSize: '0.75rem', borderRadius: '12px' }}>{day}</span>
                      ))}
                    </div>
                  ) : null}
                </InfoRow>
                <InfoRow icon={Clock} label="Available Slots">
                  {profile?.schedule && Object.keys(profile.schedule).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                      {DAYS.map(day => {
                        const slots = profile.schedule[day];
                        if (!slots || slots.length === 0) return null;
                        return (
                          <div key={day} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate)', width: '35px', marginTop: '2px' }}>{day}</span>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {slots.map(s => (
                                <span key={s} style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', fontSize: '0.75rem', borderRadius: '12px' }}>{s}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <span style={{ color: 'var(--slate-light)' }}>Not configured</span>}
                </InfoRow>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
