import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Register({ onNavigate }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');

    // Client side validation
    const localErrors = {};
    if (name.trim().length < 2) {
      localErrors.name = 'Name must be at least 2 characters.';
    }
    if (password.length < 8) {
      localErrors.password = 'Password must be at least 8 characters.';
    }
    if (password !== confirmPassword) {
      localErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name,
        email,
        password,
        confirmPassword
      });
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors);
      } else {
        setGeneralError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '0 20px' }}>
      <div className="card">
        <h1 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '28px', fontWeight: '800', color: 'var(--primary-color)' }}>
          ⏱️ DailyTrack
        </h1>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', textAlign: 'center' }}>
          Create Account
        </h2>

        {generalError && (
          <div className="status-badge danger" style={{ width: '100%', marginBottom: '16px', display: 'flex', boxSizing: 'border-box' }}>
            <span className="status-dot"></span>
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Name Field */}
          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="name" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              autocomplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                fontSize: '15px'
              }}
            />
            {errors.name && <span style={{ color: 'var(--danger-color)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.name}</span>}
          </div>

          {/* Email Field */}
          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              autocomplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                fontSize: '15px'
              }}
            />
            {errors.email && <span style={{ color: 'var(--danger-color)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.email}</span>}
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="new-password" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="new-password"
                name="password"
                autocomplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
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
            {errors.password && <span style={{ color: 'var(--danger-color)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.password}</span>}
          </div>

          {/* Confirm Password Field */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="confirm-password" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirm-password"
              name="confirmPassword"
              autocomplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                fontSize: '15px'
              }}
            />
            {errors.confirmPassword && (
              <span style={{ color: 'var(--danger-color)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', minHeight: '44px', fontWeight: '600' }}
          >
            {submitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('login');
            }}
            style={{ color: 'var(--primary-color)', fontWeight: '600', textDecoration: 'none' }}
          >
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
