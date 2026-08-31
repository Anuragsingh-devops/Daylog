import { useState, useEffect } from 'react';
import { listEntriesApi, deleteEntryApi, listActivityTypesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';

export default function Dashboard({ onNavigate, onEditEntry }) {
  const { user } = useAuth();

  // If the logged-in user is an Admin, render the Admin Control Panel directly
  if (user?.role === 'admin') {
    return <AdminDashboard onNavigate={onNavigate} />;
  }

  const [entries, setEntries] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Get local date YYYY-MM-DD
  const getLocalDateString = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getLocalDateString();

  const fetchTodayEntries = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const todayEntries = await listEntriesApi({ date: todayStr });
      setEntries(todayEntries);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load today\'s entries.');
    } finally {
      setLoading(false);
    }
  };

  // Load activity types
  useEffect(() => {
    async function loadTypes() {
      try {
        const res = await listActivityTypesApi();
        if (res && res.types) {
          setTypes(res.types);
        }
      } catch (err) {
        console.error('Failed to load activity types:', err);
      }
    }
    loadTypes();
    fetchTodayEntries();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this log entry?')) {
      return;
    }
    try {
      await deleteEntryApi(id);
      // Refresh list
      fetchTodayEntries();
    } catch (err) {
      alert(err.message || 'Failed to delete entry.');
    }
  };

  const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const formattedDate = new Date().toLocaleDateString('en-US', dateOptions);

  // Filter entries by selected activity type
  const filteredEntries = selectedTypeFilter === 'All'
    ? entries
    : entries.filter(e => e.type.toLowerCase() === selectedTypeFilter.toLowerCase());

  return (
    <div className="dashboard-grid">
      {/* Main Area: Daily Log */}
      <div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Dashboard</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '4px' }}>{formattedDate}</p>
            </div>
            <button onClick={() => onNavigate('add-entry')} className="btn btn-primary">
              + Add Entry
            </button>
          </div>

          <h2 className="card-title">Today's Log</h2>

          {/* Activity Type Filter Buttons */}
          {entries.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Filter by Type:</span>
              <button
                onClick={() => setSelectedTypeFilter('All')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  backgroundColor: selectedTypeFilter === 'All' ? 'var(--primary-color)' : 'var(--card-background)',
                  color: selectedTypeFilter === 'All' ? '#ffffff' : 'var(--text-color)',
                  transition: 'var(--transition)'
                }}
              >
                All ({entries.length})
              </button>
              {types.map(t => {
                const count = entries.filter(e => e.type.toLowerCase() === t.toLowerCase()).length;
                const isSelected = selectedTypeFilter.toLowerCase() === t.toLowerCase();
                return (
                  <button
                    key={t}
                    onClick={() => setSelectedTypeFilter(t)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'var(--primary-color)' : 'var(--card-background)',
                      color: isSelected ? '#ffffff' : 'var(--text-color)',
                      transition: 'var(--transition)'
                    }}
                  >
                    {t} {count > 0 ? `(${count})` : ''}
                  </button>
                );
              })}
            </div>
          )}

          {errorMessage && (
            <div className="status-badge danger" style={{ width: '100%', marginBottom: '16px' }}>
              <span className="status-dot"></span>
              {errorMessage}
            </div>
          )}

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading entries...
            </div>
          ) : entries.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '16px', marginBottom: '10px' }}>No entries logged for today yet.</p>
              <button onClick={() => onNavigate('add-entry')} className="btn btn-secondary" style={{ fontSize: '14px', minHeight: '38px' }}>
                Log Your First Activity
              </button>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius)', margin: '10px 0' }}>
              <p style={{ fontSize: '14px', marginBottom: '8px' }}>No "{selectedTypeFilter}" entries found for today.</p>
              <button 
                onClick={() => setSelectedTypeFilter('All')} 
                style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}
              >
                View all entries ({entries.length})
              </button>
            </div>
          ) : (
            <div>
              {filteredEntries.map(entry => {
                // Format time to AM/PM for user readability
                let formattedTime = entry.entry_time;
                try {
                  const [hours, minutes] = entry.entry_time.split(':');
                  const hrs = parseInt(hours, 10);
                  const suffix = hrs >= 12 ? 'PM' : 'AM';
                  const displayHrs = hrs % 12 || 12;
                  formattedTime = `${displayHrs}:${minutes} ${suffix}`;
                } catch (e) {
                  // Fallback to original
                }

                return (
                  <div key={entry.id} className="entry-item">
                    <span className="entry-time">{formattedTime}</span>
                    <div className="entry-body">
                      <div className="entry-meta">
                        <span className={`entry-type ${entry.type.toLowerCase()}`}>
                          {entry.type}
                        </span>
                        {entry.type === 'Expense' && (
                          <span className="entry-amount">₹{entry.amount?.toFixed(2)}</span>
                        )}
                      </div>
                      <p className="entry-content" style={{ whiteSpace: 'pre-line', marginTop: '4px' }}>
                        {entry.content}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
                      <button 
                        onClick={() => onEditEntry(entry)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(entry.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger-color)', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar: Dynamic Stats */}
      <div>
        <div className="card">
          <h2 className="card-title">Daily Summary</h2>
          <div className="stats-list">
            <div className="stat-row">
              <span>Today's Entries</span>
              <span className="stat-val">{entries.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
