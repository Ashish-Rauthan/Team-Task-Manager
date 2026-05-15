import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'member' });
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await signup(form.full_name, form.email, form.password, form.role);
      toast.success('Account created! Please check your email to confirm, then log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', margin: '0 auto 14px',
          }}>⬡</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800 }}>Create Account</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: '0.875rem' }}>
            Join your team on TaskFlow
          </p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input name="full_name" className="form-input"
                placeholder="Jane Smith" value={form.full_name} onChange={handle} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input name="email" type="email" className="form-input"
                placeholder="you@example.com" value={form.email} onChange={handle} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input name="password" type="password" className="form-input"
                placeholder="Min. 6 characters" value={form.password} onChange={handle} required />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select name="role" className="form-input form-select" value={form.role} onChange={handle}>
                <option value="member">Member</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}
              style={{ justifyContent: 'center', marginTop: 4 }}>
              {loading ? <span className="spinner" /> : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-light)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}