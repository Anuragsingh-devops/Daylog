import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login({ onNavigate }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', padding: '0 20px' }}>
      <div className="card">
        <h1 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '28px', fontWeight: '800', color: 'var(--primary-color)' }}>
          ⏱️ DailyTrack
        </h1>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', textAlign: 'center' }}>
          Login to Your Account
        </h2>

        {errorMessage && (
          <div className="status-badge danger" style={{ width: '100%', marginBottom: '16px', display: 'flex', boxSizing: 'border-box' }}>
            <span className="status-dot"></span>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              autocomplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                fontSize: '15px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="current-password" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="current-password"
                name="password"
                autocomplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  paddingRight: '80px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  fontSize: '15px'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', minHeight: '44px', fontWeight: '600' }}
          >
            {submitting ? 'Signing In...' : 'Login'}
          </button>
        </form>

        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('register');
            }}
            style={{ color: 'var(--primary-color)', fontWeight: '600', textDecoration: 'none' }}
          >
            Create account
          </a>
        </p>
      </div>
    </div>
  );
}
