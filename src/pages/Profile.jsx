import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfileApi } from '../services/api';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [generalError, setGeneralError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');
    setGeneralError('');

    // Client side validation
    const localErrors = {};
    if (name.trim().length < 2) {
      localErrors.name = 'Name must be at least 2 characters.';
    }

    const hasPassword = password.length > 0 || confirmPassword.length > 0;
    if (hasPassword) {
      if (password.length < 8) {
        localErrors.password = 'Password must be at least 8 characters.';
      }
      if (password !== confirmPassword) {
        localErrors.confirmPassword = 'Passwords do not match.';
      }
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = { name };
      if (hasPassword) {
        payload.password = password;
        payload.confirmPassword = confirmPassword;
      }

      const result = await updateProfileApi(payload);
      
      // Update local context state
      updateUser(result.user);
      
      // Clear password fields
      setPassword('');
      setConfirmPassword('');
      
      setSuccessMessage('Profile updated successfully.');
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors);
      } else {
        setGeneralError(err.message || 'Failed to update profile. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Format account created date
  let createdDate = 'Unknown';
  if (user?.created_at) {
    try {
      const d = new Date(user.created_at.replace(/-/g, '/')); // browser compatibility helper
      createdDate = d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      createdDate = user.created_at;
    }
  }

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '0 20px' }}>
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '700' }}>
          User Profile
        </h2>

        {successMessage && (
          <div className="status-badge success" style={{ width: '100%', marginBottom: '16px', display: 'flex', boxSizing: 'border-box' }}>
            <span className="status-dot"></span>
            {successMessage}
          </div>
        )}

        {generalError && (
          <div className="status-badge danger" style={{ width: '100%', marginBottom: '16px', display: 'flex', boxSizing: 'border-box' }}>
            <span className="status-dot"></span>
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email (Read-Only) */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
              Email Address (Read-only)
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                fontSize: '15px',
                backgroundColor: 'var(--background-color)',
                color: 'var(--text-muted)',
                cursor: 'not-allowed'
              }}
            />
          </div>

          {/* Name Field */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="name" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
              Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                fontSize: '15px'
              }}
            />
            {errors.name && (
              <span style={{ color: 'var(--danger-color)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.name}</span>
            )}
          </div>

          {/* Change Password Block */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '20px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>Change Password</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Leave these fields blank if you do not want to change your password.
            </p>

            {/* Password */}
            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="new-password" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="new-password"
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
              {errors.password && (
                <span style={{ color: 'var(--danger-color)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.password}</span>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
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
          </div>

          {/* Account Details */}
          <div style={{ marginBottom: '24px', fontSize: '13px', color: 'var(--text-muted)', background: 'var(--background-color)', padding: '12px', borderRadius: 'var(--border-radius)' }}>
            <p><strong>Account Role:</strong> {user?.role}</p>
            <p style={{ marginTop: '4px' }}><strong>Account Created:</strong> {createdDate}</p>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', minHeight: '44px', fontWeight: '600' }}
          >
            {submitting ? 'Updating Profile...' : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
