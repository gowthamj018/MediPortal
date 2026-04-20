import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Stethoscope } from 'lucide-react';

export default function DoctorRegisterPage() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    phone: '', specialization: '', department: '', qualification: '',
    experienceYears: '', bio: '', consultationFee: '',
    availableDays: '', availableFrom: '09:00', availableTo: '17:00'
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const specializations = ['Cardiology','Neurology','Dermatology','Orthopedics','Pediatrics','Psychiatry','Gynecology','Endocrinology','General Medicine','Ophthalmology'];
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat'];

  const toggleDay = (day) => {
    const current = form.availableDays ? form.availableDays.split(',') : [];
    const updated = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    setForm(f => ({ ...f, availableDays: updated.join(',') }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        experienceYears: form.experienceYears ? parseInt(form.experienceYears) : null,
        consultationFee: form.consultationFee ? parseFloat(form.consultationFee) : null
      };
      await api.post('/api/auth/register/doctor', payload);
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-centered">
      <div className="auth-centered-card wide">
        <div className="auth-brand">
          <div className="brand-icon" style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
            <Stethoscope size={20} color="#fff" />
          </div>
          <span className="brand-name">MediVault</span>
        </div>

        <h3>Physician Registration</h3>
        <p className="auth-sub">Fill in your professional details to get started.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input className="form-control" name="firstName" placeholder="Aanya" value={form.firstName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input className="form-control" name="lastName" placeholder="Sharma" value={form.lastName} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input className="form-control" type="email" name="email" placeholder="you@hospital.com" value={form.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input className="form-control" type="password" name="password" placeholder="Min. 6 characters" value={form.password} onChange={handleChange} required minLength={6} />
          </div>

          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label">Specialization *</label>
              <select className="form-control" name="specialization" value={form.specialization} onChange={handleChange} required>
                <option value="">Select</option>
                {specializations.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input className="form-control" name="department" placeholder="e.g. Heart & Vascular" value={form.department} onChange={handleChange} />
            </div>
          </div>

          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label">Qualification</label>
              <input className="form-control" name="qualification" placeholder="MBBS, MD..." value={form.qualification} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Experience (years)</label>
              <input className="form-control" type="number" name="experienceYears" placeholder="10" value={form.experienceYears} onChange={handleChange} min={0} />
            </div>
          </div>

          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" name="phone" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Consultation Fee (₹)</label>
              <input className="form-control" type="number" name="consultationFee" placeholder="500" value={form.consultationFee} onChange={handleChange} min={0} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Available Days</label>
            <div className="day-chips">
              {days.map(day => (
                <button type="button" key={day}
                  className={`day-chip ${form.availableDays?.split(',').includes(day) ? 'active' : ''}`}
                  onClick={() => toggleDay(day)}>
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label">Available From</label>
              <input className="form-control" type="time" name="availableFrom" value={form.availableFrom} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Available To</label>
              <input className="form-control" type="time" name="availableTo" value={form.availableTo} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea className="form-control" name="bio" rows={3} placeholder="Brief professional summary..." value={form.bio} onChange={handleChange} />
          </div>

          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            {loading ? 'Creating Account…' : 'Create Physician Account'}
          </button>
        </form>

        <div className="auth-toggle">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
