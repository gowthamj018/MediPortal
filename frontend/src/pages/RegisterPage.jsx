import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Heart } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    phone: '', dateOfBirth: '', gender: '', bloodGroup: '',
    weight: '', height: '', age: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        weight: form.weight ? parseFloat(form.weight) : null,
        height: form.height ? parseFloat(form.height) : null,
        age: form.age ? parseInt(form.age) : null,
      };
      await api.post('/api/auth/register', payload);
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-centered">
      <div className="auth-centered-card wide">
        <div className="auth-brand">
          <div className="brand-icon">
            <Heart size={20} color="#fff" fill="#fff" />
          </div>
          <span className="brand-name">MediVault</span>
        </div>

        <h3>Create Patient Account</h3>
        <p className="auth-sub">Fill in your details to get started.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input className="form-control" name="firstName" placeholder="Rahul"
                value={form.firstName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input className="form-control" name="lastName" placeholder="Gupta"
                value={form.lastName} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input className="form-control" type="email" name="email"
              placeholder="you@example.com" value={form.email}
              onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input className="form-control" type="password" name="password"
              placeholder="Min. 6 characters" value={form.password}
              onChange={handleChange} required minLength={6} />
          </div>

          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" name="phone" placeholder="+91 98765 43210"
                value={form.phone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input className="form-control" type="date" name="dateOfBirth"
                value={form.dateOfBirth} onChange={handleChange} />
            </div>
          </div>

          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-control" name="gender" value={form.gender} onChange={handleChange}>
                <option value="">Select gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
                <option>Prefer not to say</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Blood Group</label>
              <select className="form-control" name="bloodGroup" value={form.bloodGroup} onChange={handleChange}>
                <option value="">Select blood group</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => (
                  <option key={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row cols-3">
            <div className="form-group">
              <label className="form-label">Weight (kg)</label>
              <input className="form-control" type="number" name="weight"
                placeholder="72" value={form.weight} onChange={handleChange} min={1} step="0.1" />
            </div>
            <div className="form-group">
              <label className="form-label">Height (cm)</label>
              <input className="form-control" type="number" name="height"
                placeholder="175" value={form.height} onChange={handleChange} min={1} step="0.1" />
            </div>
            <div className="form-group">
              <label className="form-label">Age</label>
              <input className="form-control" type="number" name="age"
                placeholder="30" value={form.age} onChange={handleChange} min={1} max={120} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            {loading ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-toggle">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
