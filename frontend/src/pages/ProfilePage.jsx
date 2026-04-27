import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { User, Mail, Phone, MapPin, Calendar, Droplets, Edit2, Save, X, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

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

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/patient/profile');
      setProfile(data);
      setForm(data);
    } catch { toast.error('Failed to load profile.'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/api/patient/profile', {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        address: form.address,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        weight: form.weight,
        height: form.height,
        age: form.age,
      });
      setProfile(data);
      setForm(data);
      setEditing(false);
      toast.success('Profile updated successfully!');
    } catch { toast.error('Failed to update profile.'); }
    finally { setSaving(false); }
  };

  const computeBmi = () => {
    if (profile?.weight && profile?.height && profile.height > 0) {
      const hm = profile.height / 100;
      return Math.round((profile.weight / (hm * hm)) * 10) / 10;
    }
    return null;
  };

  const bmi = computeBmi();
  const bmiCategory = bmi ? (bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese') : null;
  const initials = profile ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}` : '??';

  if (loading) return (
    <div className="page">
      <div className="loading-placeholder">{[1,2].map(i => <div key={i} className="skeleton-card tall" />)}</div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">My Profile</h2>
          <p className="page-subtitle">Manage your personal and medical information</p>
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
          <div className="profile-avatar-circle">{initials}</div>
          <h3 className="profile-fullname">{profile?.firstName} {profile?.lastName}</h3>
          <div className="profile-email">{profile?.email}</div>
          <div className="profile-badge">Patient</div>
          {profile?.createdAt && (
            <div className="profile-since">
              Member since {new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Personal Info */}
          <div className="card">
            <div className="card-section-title">Personal Information</div>
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
                <div className="form-group">
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
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-control" value={form.gender || ''} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">Select</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Address</label>
                  <textarea className="form-control" rows={2} value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div>
                <InfoRow icon={User} label="Full Name" value={`${profile?.firstName} ${profile?.lastName}`} />
                <InfoRow icon={Mail} label="Email Address" value={profile?.email} />
                <InfoRow icon={Phone} label="Phone Number" value={profile?.phone} />
                <InfoRow icon={User} label="Gender" value={profile?.gender} />
                <InfoRow icon={MapPin} label="Address" value={profile?.address} />
              </div>
            )}
          </div>

          {/* Medical Info */}
          <div className="card">
            <div className="card-section-title">Medical Information</div>
            {editing ? (
              <div className="edit-form-grid">
                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select className="form-control" value={form.bloodGroup || ''} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))}>
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input className="form-control" type="number" value={form.age || ''} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} min={1} max={120} />
                </div>
                <div className="form-group">
                  <label className="form-label">Weight (kg)</label>
                  <input className="form-control" type="number" value={form.weight || ''} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} min={1} step="0.1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Height (cm)</label>
                  <input className="form-control" type="number" value={form.height || ''} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} min={1} step="0.1" />
                </div>
              </div>
            ) : (
              <div>
                <InfoRow icon={Calendar} label="Date of Birth"
                  value={profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
                <InfoRow icon={Droplets} label="Blood Group" value={profile?.bloodGroup} />
                <InfoRow icon={User} label="Age" value={profile?.age ? `${profile.age} years` : null} />
                <InfoRow icon={Activity} label="Weight" value={profile?.weight ? `${profile.weight} kg` : null} />
                <InfoRow icon={Activity} label="Height" value={profile?.height ? `${profile.height} cm` : null} />
                <InfoRow icon={Activity} label="BMI"
                  value={bmi ? `${bmi} (${bmiCategory})` : null} />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
