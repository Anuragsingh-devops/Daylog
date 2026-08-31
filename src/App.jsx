import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { getApiStatus } from './services/api'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AddEntry from './pages/AddEntry'
import History from './pages/History'
import Profile from './pages/Profile'

function AppContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'add-entry', 'history', 'login', 'register'
  const [editingEntry, setEditingEntry] = useState(null);
  
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

  // When user logged state changes, reset view to dashboard
  useEffect(() => {
    if (user) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('login');
    }
  }, [user]);

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

  // Guest view router
  if (!user) {
    if (currentView === 'register') {
      return <Register onNavigate={setCurrentView} />;
    }
    return <Login onNavigate={setCurrentView} />;
  }

  const navigateTo = (view) => {
    if (view !== 'add-entry') {
      setEditingEntry(null);
    }
    setCurrentView(view);
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setCurrentView('add-entry');
  };

  return (
    <div>
      <header>
        <div className="container nav-container">
          <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('dashboard'); }} className="logo">
            <span>⏱️</span> DailyTrack
          </a>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <ul className="nav-links">
              <li>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); navigateTo('dashboard'); }} 
                  className={currentView === 'dashboard' ? 'active' : ''}
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); navigateTo('history'); }} 
                  className={currentView === 'history' ? 'active' : ''}
                >
                  Reports
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); navigateTo('profile'); }} 
                  className={currentView === 'profile' ? 'active' : ''}
                >
                  Profile
                </a>
              </li>
              {user.role === 'admin' && (
                <li><a href="#" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px', marginLeft: '10px', color: 'var(--danger-color)' }}>Admin Dash</a></li>
              )}
            </ul>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: '15px', borderLeft: '1px solid var(--border-color)', paddingLeft: '15px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                👤 {user.name}
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

        {/* Dynamic View Content */}
        {currentView === 'dashboard' && (
          <Dashboard 
            onNavigate={navigateTo} 
            onEditEntry={handleEditEntry} 
          />
        )}
        
        {currentView === 'add-entry' && (
          <AddEntry 
            onNavigate={navigateTo} 
            editingEntry={editingEntry}
          />
        )}

        {currentView === 'history' && (
          <History 
            onEditEntry={handleEditEntry}
          />
        )}

        {currentView === 'profile' && (
          <Profile />
        )}
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
