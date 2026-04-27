import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Heart, Phone, KeyRound } from 'lucide-react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

export default function LoginPage() {
  const location = useLocation();
  const [phone, setPhone] = useState(location.state?.prefilledPhone || '');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isValidPhone, setIsValidPhone] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!phone || !isValidPhone) return toast.error('Please enter a valid phone number with country code.');

    setLoading(true);
    try {
      await api.post('/api/auth/generate-otp', { phone, type: 'LOGIN' });
      toast.success('OTP sent! Check your phone.');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otp) return toast.error('Please enter the OTP.');

    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { phone, otp });
      login(data);
      toast.success(`Welcome back, ${data.firstName}!`);
      navigate(data.role === 'DOCTOR' ? '/doctor/dashboard' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-centered">
      <div className="auth-centered-card">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: '24px' }}>
          <div className="brand-icon">
            <Heart size={20} color="#fff" fill="#fff" />
          </div>
          <span className="brand-name" style={{ color: 'var(--teal)' }}>MediVault</span>
        </div>

        <h3 style={{ textAlign: 'center' }}>Sign In</h3>
        <p className="auth-sub" style={{ textAlign: 'center', marginBottom: '32px' }}>Access your portal securely via OTP.</p>

        {step === 1 ? (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <div style={{ position: 'relative' }}>
                <PhoneInput
                  country={'in'}
                  value={phone}
                  onChange={(val, countryData) => {
                    setPhone('+' + val);
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
            </div>
            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading || !isValidPhone} style={{ marginTop: '10px' }}>
              {loading ? 'Sending OTP…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div className="form-group">
              <label className="form-label">Enter OTP</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-light)' }} />
                <input className="form-control" type="text" placeholder="123456"
                  value={otp} onChange={e => setOtp(e.target.value)} required style={{ paddingLeft: '40px', letterSpacing: '2px' }} />
              </div>
              <div style={{ marginTop: '10px', textAlign: 'right' }}>
                <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  Change Phone Number
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
              {loading ? 'Verifying…' : 'Sign In'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--slate)' }}>
          New to MediVault? <Link to="/register" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>Register here</Link>
        </div>
      </div>
    </div>
  );
}
