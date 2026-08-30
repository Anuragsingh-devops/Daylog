import { useState, useEffect } from 'react'
import { getApiStatus } from './services/api'

function App() {
  const [apiStatus, setApiStatus] = useState({
    loading: true,
    connected: false,
    data: null,
    error: null
  });

  useEffect(() => {
    async function checkConnection() {
      const result = await getApiStatus();
      if (result.status === 'success' || result.status === 'warning') {
        setApiStatus({
          loading: false,
          connected: true,
          data: result,
          error: null
        });
      } else {
        setApiStatus({
          loading: false,
          connected: false,
          data: null,
          error: result.message || 'Failed to connect to PHP server'
        });
      }
    }
    checkConnection();
  }, []);

  // Format today's date
  const today = new Date();
  const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const formattedDate = today.toLocaleDateString('en-US', dateOptions);

  return (
    <div>
      <header>
        <div className="container nav-container">
          <a href="#" className="logo">
            <span>⏱️</span> DailyTrack
          </a>
          <nav>
            <ul className="nav-links">
              <li><a href="#" className="active">Dashboard</a></li>
              <li><a href="#">History</a></li>
              <li><a href="#">Reports</a></li>
              <li><a href="#">Profile</a></li>
              <li><a href="#">Login</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="container">
        {/* Phase 1 Backend Connection Checker */}
        <div className="card">
          <h2 className="card-title">Phase 1: Backend Connection Test</h2>
          {apiStatus.loading ? (
            <div className="status-badge warning">
              <span className="status-dot"></span>
              Checking connection to PHP API...
            </div>
          ) : apiStatus.connected ? (
            <div>
              <div className="status-badge success" style={{ marginBottom: '15px' }}>
                <span className="status-dot"></span>
                Backend API Connected
              </div>
              <div style={{ marginTop: '10px', fontSize: '14px', color: 'var(--text-muted)' }}>
                <p><strong>PHP Version:</strong> {apiStatus.data.php_version}</p>
                <p><strong>Server Time:</strong> {apiStatus.data.local_time}</p>
                <p><strong>Server Timezone:</strong> {apiStatus.data.timezone}</p>
                <p><strong>Environment:</strong> {apiStatus.data.environment}</p>
                <p>
                  <strong>Database Connection Status: </strong>
                  <span style={{ color: apiStatus.data.database?.connected ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 'bold' }}>
                    {apiStatus.data.database?.message || 'Error'}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="status-badge danger" style={{ marginBottom: '15px' }}>
                <span className="status-dot"></span>
                Connection Failed
              </div>
              <p style={{ color: 'var(--danger-color)', fontSize: '14px' }}>
                Error details: {apiStatus.error}
              </p>
              <div style={{ marginTop: '15px', padding: '12px', background: '#fffbeb', borderRadius: 'var(--border-radius)', fontSize: '13px', border: '1px solid #fde68a' }}>
                <strong>Tip for local dev:</strong> Make sure you have started your local PHP development server in the project directory using:
                <code style={{ display: 'block', background: '#f3f4f6', padding: '8px', marginTop: '6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                  php -S localhost:8000
                </code>
              </div>
            </div>
          )}
        </div>

        {/* Dashboard Mockup Layout */}
        <div className="dashboard-grid">
          {/* Main Area: Daily Log */}
          <div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Good morning</h1>
                  <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '4px' }}>{formattedDate}</p>
                </div>
                <button className="btn btn-primary">+ Add Entry</button>
              </div>

              <h2 className="card-title">Today's Entries</h2>
              
              <div className="entry-item">
                <span className="entry-time">10:30 AM</span>
                <div className="entry-body">
                  <div className="entry-meta">
                    <span className="entry-type work">Work</span>
                  </div>
                  <p className="entry-content">Worked on customer VPS issue and resolved the deployment problem.</p>
                </div>
              </div>

              <div className="entry-item">
                <span className="entry-time">09:15 AM</span>
                <div className="entry-body">
                  <div className="entry-meta">
                    <span className="entry-type study">Study</span>
                  </div>
                  <p className="entry-content">Studied React hooks for approximately two hours.</p>
                </div>
              </div>

              <div className="entry-item">
                <span className="entry-time">08:30 AM</span>
                <div className="entry-body">
                  <div className="entry-meta">
                    <span className="entry-type expense">Expense</span>
                    <span className="entry-amount">₹450.00</span>
                  </div>
                  <p className="entry-content">Lunch at office cafeteria.</p>
                </div>
              </div>

              <div className="entry-item">
                <span className="entry-time">07:20 AM</span>
                <div className="entry-body">
                  <div className="entry-meta">
                    <span className="entry-type skill">Skill</span>
                  </div>
                  <p className="entry-content">Learned the basics of Docker networking.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar: Stats Mockup */}
          <div>
            <div className="card">
              <h2 className="card-title">Daily Summary</h2>
              <div className="stats-list">
                <div className="stat-row">
                  <span>Today's Entries</span>
                  <span className="stat-val">4</span>
                </div>
                <div className="stat-row">
                  <span>Study time/entries</span>
                  <span className="stat-val">1 entry</span>
                </div>
                <div className="stat-row">
                  <span>Today's spending</span>
                  <span className="stat-val" style={{ color: 'var(--danger-color)' }}>₹450</span>
                </div>
                <div className="stat-row">
                  <span>Work entries</span>
                  <span className="stat-val">1 entry</span>
                </div>
                <div className="stat-row">
                  <span>Skills learned</span>
                  <span className="stat-val">1 entry</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="card-title">Add Entry Mockup</h2>
              <div style={{ opacity: 0.7, pointerEvents: 'none' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>This form will be interactive in Phase 3.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Type</label>
                    <select disabled style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                      <option>Work</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>What did you do?</label>
                    <textarea disabled style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', height: '60px' }}></textarea>
                  </div>
                  <button className="btn btn-primary" disabled style={{ width: '100%', minHeight: 'auto', padding: '8px' }}>Save Entry</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
