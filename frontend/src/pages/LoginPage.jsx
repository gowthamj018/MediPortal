import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Heart, Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const location = useLocation();
  const { login } = useAuth();
  const navigate = useNavigate();

  // ── Input mode: phone (default) or email
  const [inputMode, setInputMode] = useState('phone');
  const [phoneValue, setPhoneValue] = useState(location.state?.prefilledPhone || '');
  const [isValidPhone, setIsValidPhone] = useState(false);
  const [emailValue, setEmailValue] = useState('');

  // Computed identifier sent to all API calls
  const identifier = inputMode === 'phone' ? phoneValue : emailValue;
  const valid = inputMode === 'phone' ? isValidPhone : EMAIL_RE.test(emailValue);

  // ── Auth mode
  const [mode, setMode] = useState('password'); // 'password' | 'otp' | 'forgot'

  // Password mode
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP mode
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Forgot password
  const [forgotStep, setForgotStep] = useState(1); // 1=enter id, 2=otp+new-pw
  const [newPassword, setNewPassword] = useState('');
  const [showNew, setShowNew] = useState(false);

  const [loading, setLoading] = useState(false);

  // Switch between phone and email — clear values on switch
  const switchToEmail = () => { setInputMode('email'); setPhoneValue(''); setIsValidPhone(false); };
  const switchToPhone = () => { setInputMode('phone'); setEmailValue(''); };

  const resetToPassword = () => {
    setMode('password');
    setOtpSent(false); setOtp('');
    setForgotStep(1); setNewPassword('');
  };

  /* ──────── Password login ──────── */
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!valid) return toast.error(inputMode === 'phone' ? 'Enter a valid phone number.' : 'Enter a valid email address.');
    if (!password) return toast.error('Please enter your password.');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login/password', { identifier, password });
      login(data);
      toast.success(`Welcome back, ${data.firstName}!`);
      navigate(data.role === 'DOCTOR' ? '/doctor/dashboard' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials.');
    } finally { setLoading(false); }
  };

  /* ──────── OTP: send ──────── */
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!valid) return toast.error(inputMode === 'phone' ? 'Enter a valid phone number.' : 'Enter a valid email address.');
    setLoading(true);
    const type = mode === 'forgot' ? 'FORGOT_PASSWORD' : 'LOGIN';
    try {
      const res = await api.post('/api/auth/generate-otp', { identifier, type });
      toast.success(res?.data?.message || 'OTP sent! Check your inbox.');
      if (mode === 'otp') setOtpSent(true);
      if (mode === 'forgot') setForgotStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP.');
    } finally { setLoading(false); }
  };

  /* ──────── OTP: verify & login ──────── */
  const handleOtpLogin = async (e) => {
    e.preventDefault();
    if (!otp) return toast.error('Please enter the OTP.');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { identifier, otp });
      login(data);
      toast.success(`Welcome back, ${data.firstName}!`);
      navigate(data.role === 'DOCTOR' ? '/doctor/dashboard' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP.');
    } finally { setLoading(false); }
  };

  /* ──────── Forgot: reset password ──────── */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp) return toast.error('Please enter the OTP.');
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters.');
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { identifier, otp, newPassword });
      toast.success('Password updated! Please sign in.');
      resetToPassword();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password.');
    } finally { setLoading(false); }
  };

  /* ──────── Identifier field (plain render function — NOT a component) ──────── */
  const renderIdentifierField = (disabled = false, onEnterPress = null) => (
    <div className="form-group">
      <label className="form-label">
        {inputMode === 'phone' ? 'Phone Number' : 'Email Address'}
      </label>

      {inputMode === 'phone' ? (
        <PhoneInput
          country={'in'}
          value={phoneValue}
          onChange={(val, countryData) => {
            setPhoneValue('+' + val);
            const req = countryData?.format ? countryData.format.split('.').length - 1 : 10;
            setIsValidPhone(val.length >= req);
          }}
          onEnterKeyPress={onEnterPress ?? undefined}
          inputProps={onEnterPress ? {
            onKeyDown: (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onEnterPress(e);
              }
            }
          } : undefined}
          disabled={disabled}
          inputClass="form-control"
          containerStyle={{ width: '100%' }}
          inputStyle={{ width: '100%', height: '44px', paddingLeft: '48px', fontFamily: 'var(--font-body)', fontSize: '0.9rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)' }}
          buttonStyle={{ borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)', border: '1.5px solid var(--border)', borderRight: 'none', background: 'var(--bg)' }}
        />
      ) : (
        <input
          className="form-control"
          type="email"
          placeholder="you@example.com"
          value={emailValue}
          onChange={(e) => setEmailValue(e.target.value)}
          onKeyDown={onEnterPress ? (e) => { if (e.key === 'Enter') { e.preventDefault(); onEnterPress(e); } } : undefined}
          disabled={disabled}
          autoComplete="username"
        />
      )}

      {/* Toggle link — only shown when not disabled */}
      {!disabled && (
        <div style={{ marginTop: 6, textAlign: 'right' }}>
          {inputMode === 'phone' ? (
            <button type="button" onClick={switchToEmail}
              style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Use email instead →
            </button>
          ) : (
            <button type="button" onClick={switchToPhone}
              style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Use phone number instead →
            </button>
          )}
        </div>
      )}
    </div>
  );

  /* ──────── UI ──────── */
  return (
    <div className="auth-centered">
      <div className="auth-centered-card">

        {/* Brand */}
        <div className="brand" style={{ justifyContent: 'center', marginBottom: '24px' }}>
          <div className="brand-icon"><Heart size={20} color="#fff" fill="#fff" /></div>
          <span className="brand-name" style={{ color: 'var(--teal)' }}>MediVault</span>
        </div>

        {/* ═══════ PASSWORD MODE (default) ═══════ */}
        {mode === 'password' && (
          <>
            <h3 style={{ textAlign: 'center' }}>Sign In</h3>
            <p className="auth-sub" style={{ textAlign: 'center', marginBottom: '28px' }}>
              Use your phone number or email with password.
            </p>
            <form onSubmit={handlePasswordLogin}>
              {renderIdentifierField()}
              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={17} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-light)', zIndex: 1 }} />
                  <input
                    className="form-control"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '40px', paddingRight: '40px' }}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-light)', padding: 0 }}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <div style={{ textAlign: 'right', marginTop: 6 }}>
                  <button type="button" onClick={() => setMode('forgot')}
                    style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    Forgot Password?
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading || !valid || !password}>
                {loading ? 'Signing in…' : 'Login'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '18px' }}>
              <button type="button" onClick={() => { setMode('otp'); setOtpSent(false); setOtp(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--teal)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Login with OTP
              </button>
            </div>
          </>
        )}

        {/* ═══════ OTP MODE ═══════ */}
        {mode === 'otp' && (
          <>
            <h3 style={{ textAlign: 'center' }}>OTP Sign In</h3>
            <p className="auth-sub" style={{ textAlign: 'center', marginBottom: '28px' }}>
              We'll send a one-time code to your phone.
            </p>
            {!otpSent ? (
              <form onSubmit={handleSendOtp}>
                {renderIdentifierField(false, handleSendOtp)}
                <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading || !valid}>
                  {loading ? 'Sending OTP…' : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOtpLogin}>
                {renderIdentifierField(true)}
                <div className="form-group">
                  <label className="form-label">Enter OTP</label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={17} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-light)' }} />
                    <input className="form-control" type="text" inputMode="numeric" placeholder="6-digit OTP"
                      value={otp} onChange={(e) => setOtp(e.target.value)}
                      style={{ paddingLeft: '40px', letterSpacing: '4px' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginBottom: 12 }}>
                  <button type="button" onClick={() => setOtpSent(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    Change number / Resend OTP
                  </button>
                </div>
                <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading || !otp}>
                  {loading ? 'Verifying…' : 'Sign In'}
                </button>
              </form>
            )}
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button type="button" onClick={resetToPassword}
                style={{ background: 'none', border: 'none', color: 'var(--slate)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                ← Back to Password Login
              </button>
            </div>
          </>
        )}

        {/* ═══════ FORGOT PASSWORD MODE ═══════ */}
        {mode === 'forgot' && (
          <>
            <h3 style={{ textAlign: 'center' }}>Reset Password</h3>
            <p className="auth-sub" style={{ textAlign: 'center', marginBottom: '28px' }}>
              {forgotStep === 1 ? 'Enter your phone or email to receive an OTP.' : 'Enter the OTP and your new password.'}
            </p>

            {forgotStep === 1 ? (
              <form onSubmit={handleSendOtp}>
                {renderIdentifierField(false, handleSendOtp)}
                <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading || !valid}>
                  {loading ? 'Sending OTP…' : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword}>
                {renderIdentifierField(true)}
                <div className="form-group">
                  <label className="form-label">OTP</label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={17} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-light)' }} />
                    <input className="form-control" type="text" inputMode="numeric" placeholder="6-digit OTP"
                      value={otp} onChange={(e) => setOtp(e.target.value)}
                      style={{ paddingLeft: '40px', letterSpacing: '4px' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={17} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-light)', zIndex: 1 }} />
                    <input className="form-control" type={showNew ? 'text' : 'password'} placeholder="Min 6 characters"
                      value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      style={{ paddingLeft: '40px', paddingRight: '40px' }} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowNew(v => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-light)', padding: 0 }}>
                      {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
                <div style={{ marginBottom: 12, textAlign: 'right' }}>
                  <button type="button" onClick={() => setForgotStep(1)}
                    style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    Resend OTP
                  </button>
                </div>
                <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading || !otp || newPassword.length < 6}>
                  {loading ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            )}
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button type="button" onClick={resetToPassword}
                style={{ background: 'none', border: 'none', color: 'var(--slate)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                ← Back to Login
              </button>
            </div>
          </>
        )}

        {/* Register link */}
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--slate)' }}>
          New to MediVault?{' '}
          <Link to="/register" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>Register here</Link>
        </div>
      </div>
    </div>
  );
}
