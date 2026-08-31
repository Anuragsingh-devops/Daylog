import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { getApiStatus } from './services/api'
import Login from './pages/Login'
import Register from './pages/Register'

function AppContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const [currentView, setCurrentView] = useState('login'); // 'login' or 'register'
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

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--background-color)' }}>
        <div className="status-badge warning" style={{ padding: '12px 24px', fontSize: '16px' }}>
          <span className="status-dot"></span>
          Verifying session status...
        </div>
      </div>
    );
  }

  // If user is not logged in, show Login or Register pages
  if (!user) {
    if (currentView === 'register') {
      return <Register onNavigate={setCurrentView} />;
    }
    return <Login onNavigate={setCurrentView} />;
  }

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
          <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <ul className="nav-links">
              <li><a href="#" className="active">Dashboard</a></li>
              <li><a href="#">History</a></li>
              <li><a href="#">Reports</a></li>
              <li><a href="#">Profile</a></li>
              {user.role === 'admin' && (
                <li><a href="#" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px', marginLeft: '10px', color: 'var(--danger-color)' }}>Admin Dash</a></li>
              )}
            </ul>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: '15px', borderLeft: '1px solid var(--border-color)', paddingLeft: '15px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                👤 {user.name} ({user.role})
              </span>
              <button 
                onClick={logout} 
                className="btn btn-secondary" 
                style={{ minHeight: '34px', padding: '6px 12px', fontSize: '13px', backgroundColor: '#374151' }}
              >
                Logout
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="container">
        {/* Connection Checker Card */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 className="card-title" style={{ fontSize: '15px', marginBottom: '10px', paddingBottom: '6px' }}>
            System Integrity Check
          </h2>
          {apiStatus.loading ? (
            <div className="status-badge warning">
              <span className="status-dot"></span>
              Checking connection to PHP API...
            </div>
          ) : apiStatus.connected ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div className="status-badge success" style={{ padding: '4px 10px', fontSize: '12px' }}>
                <span className="status-dot"></span>
                Backend & DB Connected
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                PHP {apiStatus.data.php_version} | DB: {apiStatus.data.database?.message} | TZ: {apiStatus.data.timezone}
              </div>
            </div>
          ) : (
            <div className="status-badge danger">
              <span className="status-dot"></span>
              API Offline: {apiStatus.error}
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

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
