import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Heart, Eye, EyeOff, Stethoscope } from 'lucide-react';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('patient');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', form);
      login(data);
      toast.success(`Welcome back, ${data.firstName}!`);
      navigate(data.role === 'DOCTOR' ? '/doctor/dashboard' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-centered">
      <div className="auth-centered-card">
        <div className="auth-brand">
          <div className="brand-icon">
            <Heart size={20} color="#fff" fill="#fff" />
          </div>
          <span className="brand-name">MediVault</span>
        </div>

        <h3>Sign in to your account</h3>
        <p className="auth-sub">Access your health portal securely.</p>

        <div className="role-toggle">
          <button
            className={`role-toggle-btn ${role === 'patient' ? 'active' : ''}`}
            onClick={() => { setRole('patient'); setForm({ email: '', password: '' }); }}
            type="button"
          >
            <Heart size={14} /> Patient
          </button>
          <button
            className={`role-toggle-btn ${role === 'doctor' ? 'active' : ''}`}
            onClick={() => { setRole('doctor'); setForm({ email: '', password: '' }); }}
            type="button"
          >
            <Stethoscope size={14} /> Physician
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-control" type="email" name="email"
              placeholder="you@example.com" value={form.email}
              onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input className="form-control" type={showPass ? 'text' : 'password'}
                name="password" placeholder="••••••••" value={form.password}
                onChange={handleChange} required style={{ paddingRight: '44px' }} />
              <button type="button" onClick={() => setShowPass(s => !s)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-light)' }}>
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-toggle">
          {role === 'patient' ? (
            <>Don't have an account? <Link to="/register">Create one</Link></>
          ) : (
            <>New physician? <Link to="/register/doctor">Register here</Link></>
          )}
        </div>
      </div>
    </div>
  );
}
