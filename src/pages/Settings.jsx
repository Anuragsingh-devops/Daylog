import { useState, useEffect } from 'react';

export default function Settings() {
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('theme') === 'dark'
  );
  const [defaultType, setDefaultType] = useState(
    localStorage.getItem('defaultActivityType') || 'Work'
  );
  const [successMessage, setSuccessMessage] = useState('');

  // Handle Dark Mode toggle
  const handleThemeChange = (checked) => {
    setDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('defaultActivityType', defaultType);
    setSuccessMessage('Settings saved successfully.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '0 20px' }}>
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '700' }}>
          Application Settings
        </h2>

        {successMessage && (
          <div className="status-badge success" style={{ width: '100%', marginBottom: '16px', display: 'flex', boxSizing: 'border-box' }}>
            <span className="status-dot"></span>
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Appearance Section */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>Appearance</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '15px' }}>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => handleThemeChange(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              Enable Dark Mode (Theme)
            </label>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '20px 0' }} />

          {/* Preferences Section */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>Preferences</h3>
            <div>
              <label htmlFor="default_type" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                Default Activity Type
              </label>
              <select
                id="default_type"
                value={defaultType}
                onChange={(e) => setDefaultType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  fontSize: '15px',
                  backgroundColor: 'white'
                }}
              >
                <option value="Work">Work</option>
                <option value="Study">Study</option>
                <option value="Skill">Skill</option>
                <option value="Expense">Expense</option>
                <option value="Personal">Personal</option>
              </select>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                This activity type will be pre-selected when you open the "Add Entry" form.
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', minHeight: '44px', fontWeight: '600' }}
          >
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
}
