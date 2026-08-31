import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AddEntry from './pages/AddEntry'
import History from './pages/History'
import Todos from './pages/Todos'
import Profile from './pages/Profile'
import Settings from './pages/Settings'

const SECRET_ADMIN_HASH = '#/portal-ctrl-928';

function AppContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'add-entry', 'history', 'login', 'register', 'admin'
  const [editingEntry, setEditingEntry] = useState(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Helper to check if current URL points to secret admin portal
  const isSecretAdminRoute = () => window.location.hash === SECRET_ADMIN_HASH || window.location.hash.includes('portal-ctrl-928');

  // Close dropdown when clicking anywhere outside
  useEffect(() => {
    if (!userDropdownOpen) return;
    const closeDropdown = () => setUserDropdownOpen(false);
    document.addEventListener('click', closeDropdown);
    return () => document.removeEventListener('click', closeDropdown);
  }, [userDropdownOpen]);

  // Sync view based on URL hash and auth state
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        if (isSecretAdminRoute()) {
          if (user.role === 'admin') {
            setCurrentView('admin');
          } else {
            setCurrentView('dashboard');
            window.history.replaceState(null, '', window.location.pathname);
          }
        } else {
          setCurrentView('dashboard');
        }
      } else {
        setCurrentView('login');
      }
    }
  }, [user, authLoading]);

  // Listen for browser navigation / direct hash changes
  useEffect(() => {
    const handleHashChange = () => {
      if (isSecretAdminRoute()) {
        if (user && user.role === 'admin') {
          setCurrentView('admin');
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
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
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);

    // Sync secret hash URL
    if (view === 'admin') {
      window.location.hash = '/portal-ctrl-928';
    } else if (isSecretAdminRoute()) {
      window.history.replaceState(null, '', window.location.pathname);
    }
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

          {/* Desktop Nav Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
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
                  onClick={(e) => { e.preventDefault(); navigateTo('todos'); }} 
                  className={currentView === 'todos' ? 'active' : ''}
                >
                  To-Do
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
            </ul>

            {/* User Dropdown */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setUserDropdownOpen(!userDropdownOpen);
                }}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-color)',
                  padding: '6px 12px',
                  borderRadius: 'var(--border-radius)',
                  transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--border-color)'}
                onMouseLeave={(e) => { if (!userDropdownOpen) e.target.style.backgroundColor = 'transparent'; }}
              >
                👤 {user.name} <span style={{ fontSize: '10px' }}>▼</span>
              </button>

              {userDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '8px',
                  backgroundColor: 'var(--card-background)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  minWidth: '160px',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '6px 0'
                }}>
                  <a 
                    href="#" 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      navigateTo('profile'); 
                    }}
                    style={{
                      padding: '10px 16px',
                      textDecoration: 'none',
                      color: 'var(--text-color)',
                      fontSize: '14px',
                      fontWeight: '500',
                      textAlign: 'left'
                    }}
                  >
                    ⚙️ Profile
                  </a>
                  <a 
                    href="#" 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      navigateTo('settings'); 
                    }}
                    style={{
                      padding: '10px 16px',
                      textDecoration: 'none',
                      color: 'var(--text-color)',
                      fontSize: '14px',
                      fontWeight: '500',
                      textAlign: 'left'
                    }}
                  >
                    🎨 Preferences
                  </a>
                  <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                  <button 
                    onClick={() => logout()}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '10px 16px',
                      color: 'var(--danger-color)',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button 
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              title="Toggle mobile menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </nav>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-nav-drawer open">
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); navigateTo('dashboard'); }} 
              className={currentView === 'dashboard' ? 'active' : ''}
            >
              ⏱️ Dashboard
            </a>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); navigateTo('todos'); }} 
              className={currentView === 'todos' ? 'active' : ''}
            >
              📝 To-Do & Tasks
            </a>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); navigateTo('history'); }} 
              className={currentView === 'history' ? 'active' : ''}
            >
              📊 Reports & History
            </a>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); navigateTo('profile'); }} 
              className={currentView === 'profile' ? 'active' : ''}
            >
              👤 My Profile
            </a>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); navigateTo('settings'); }} 
              className={currentView === 'settings' ? 'active' : ''}
            >
              ⚙️ Settings & Categories
            </a>
            <button 
              onClick={() => logout()}
              style={{
                background: 'none',
                border: '1px solid #fecaca',
                backgroundColor: '#fef2f2',
                color: 'var(--danger-color)',
                padding: '10px 14px',
                borderRadius: 'var(--border-radius)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'left',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🚪 Sign Out
            </button>
          </div>
        )}
      </header>

      <main className="container">
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

        {currentView === 'todos' && (
          <Todos />
        )}

        {currentView === 'profile' && (
          <Profile />
        )}

        {currentView === 'settings' && (
          <Settings />
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
