import { useState, useEffect } from 'react';
import { listActivityTypesApi, createActivityTypeApi, deleteActivityTypeApi } from '../services/api';

export default function Settings() {
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('theme') === 'dark'
  );
  const [defaultType, setDefaultType] = useState(
    localStorage.getItem('defaultActivityType') || 'Work'
  );
  
  const [allTypes, setAllTypes] = useState([]);
  const [customTypes, setCustomTypes] = useState([]);
  const [newTypeName, setNewTypeName] = useState('');
  
  const [successMessage, setSuccessMessage] = useState('');
  const [typeSuccess, setTypeSuccess] = useState('');
  const [typeError, setTypeError] = useState('');

  // Fetch activity types on mount
  const fetchTypes = async () => {
    try {
      const result = await listActivityTypesApi();
      setAllTypes(result.types);
      setCustomTypes(result.custom_types || []);
    } catch (err) {
      console.error('Failed to load activity types:', err);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

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

  // Save General settings (Default Activity Type)
  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('defaultActivityType', defaultType);
    setSuccessMessage('Settings saved successfully.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Add a Custom Activity Type
  const handleCreateType = async (e) => {
    e.preventDefault();
    setTypeError('');
    setTypeSuccess('');

    const trimmed = newTypeName.trim();
    if (!trimmed) {
      setTypeError('Activity type name cannot be blank.');
      return;
    }

    try {
      const result = await createActivityTypeApi(trimmed);
      setTypeSuccess(result.message || 'Activity type created successfully!');
      setNewTypeName('');
      fetchTypes(); // Reload types list
      setTimeout(() => setTypeSuccess(''), 3000);
    } catch (err) {
      setTypeError(err.message || 'Failed to create activity type.');
    }
  };

  // Delete a Custom Activity Type
  const handleDeleteType = async (name) => {
    setTypeError('');
    setTypeSuccess('');
    
    if (!window.confirm(`Are you sure you want to delete the activity type "${name}"?`)) {
      return;
    }

    try {
      const result = await deleteActivityTypeApi(name);
      setTypeSuccess(result.message || 'Activity type deleted successfully.');
      
      // If the deleted type was our current selected default preference, reset default type to standard default 'Work'
      if (defaultType === name) {
        setDefaultType('Work');
        localStorage.setItem('defaultActivityType', 'Work');
      }

      fetchTypes(); // Reload types list
      setTimeout(() => setTypeSuccess(''), 3000);
    } catch (err) {
      setTypeError(err.message || 'Failed to delete activity type.');
    }
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
                {allTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                This activity type will be pre-selected when you open the "Add Entry" form.
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', minHeight: '44px', fontWeight: '600', marginBottom: '10px' }}
          >
            Save Preferences
          </button>
        </form>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '25px 0' }} />

        {/* Custom Activity Types Section */}
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>Manage Activity Types</h3>
          
          {typeSuccess && (
            <div className="status-badge success" style={{ width: '100%', marginBottom: '12px', display: 'flex', boxSizing: 'border-box' }}>
              <span className="status-dot"></span>
              {typeSuccess}
            </div>
          )}

          {typeError && (
            <div className="status-badge danger" style={{ width: '100%', marginBottom: '12px', display: 'flex', boxSizing: 'border-box' }}>
              <span className="status-dot"></span>
              {typeError}
            </div>
          )}

          <form onSubmit={handleCreateType} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="e.g., Coding, Exercise"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                fontSize: '14px'
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '14px', whiteSpace: 'nowrap' }}
            >
              Add Type
            </button>
          </form>

          {/* List of Custom Types */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-muted)' }}>
              Your Custom Types:
            </h4>
            {customTypes.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No custom types created yet.
              </p>
            ) : (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {customTypes.map(t => (
                  <span 
                    key={t} 
                    className="entry-type" 
                    style={{ 
                      margin: 0, 
                      padding: '4px 8px 4px 10px', 
                      fontSize: '12px', 
                      border: '1px solid var(--border-color)', 
                      backgroundColor: 'var(--background-color)', 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => handleDeleteType(t)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--danger-color)',
                        fontSize: '14px',
                        cursor: 'pointer',
                        padding: '0 2px',
                        lineHeight: 1,
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title={`Delete ${t}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
