import { useState, useEffect } from 'react';
import { listEntriesApi, deleteEntryApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';

export default function Dashboard({ onNavigate, onEditEntry }) {
  const { user } = useAuth();

  // If the logged-in user is an Admin, render the Admin Control Panel directly
  if (user?.role === 'admin') {
    return <AdminDashboard onNavigate={onNavigate} />;
  }

  const [entries, setEntries] = useState([]);
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

  useEffect(() => {
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
          ) : (
            <div>
              {entries.map(entry => {
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
