import { useState, useEffect } from 'react';
import { 
  getAdminStatsApi, 
  getAdminUsersApi, 
  updateAdminUserStatusApi, 
  updateAdminUserRoleApi, 
  deleteAdminUserApi 
} from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard({ onNavigate }) {
  const { user: currentUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const loadAdminData = async () => {
    setLoading(true);
    setFeedback({ message: '', type: '' });
    try {
      const [statsData, usersData] = await Promise.all([
        getAdminStatsApi(),
        getAdminUsersApi()
      ]);
      setStats(statsData.stats);
      setRecentActivity(statsData.recent_activity || []);
      setUsers(usersData || []);
    } catch (err) {
      setFeedback({ message: err.message || 'Failed to load admin data.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const showNotification = (msg, type = 'success') => {
    setFeedback({ message: msg, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const handleToggleStatus = async (user) => {
    if (user.id === currentUser.id) {
      alert('You cannot deactivate your own admin account.');
      return;
    }
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    if (!window.confirm(`Are you sure you want to change ${user.name}'s status to ${newStatus}?`)) {
      return;
    }
    setActionLoadingId(user.id);
    try {
      await updateAdminUserStatusApi(user.id, newStatus);
      showNotification(`User status updated to ${newStatus}.`);
      setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      if (stats) {
        setStats({
          ...stats,
          active_users: newStatus === 'active' ? stats.active_users + 1 : stats.active_users - 1,
          disabled_users: newStatus === 'disabled' ? stats.disabled_users + 1 : stats.disabled_users - 1
        });
      }
    } catch (err) {
      showNotification(err.message || 'Failed to update status.', 'danger');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRoleChange = async (user) => {
    if (user.id === currentUser.id) {
      alert('You cannot change your own admin role.');
      return;
    }
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Are you sure you want to change ${user.name}'s role to ${newRole.toUpperCase()}?`)) {
      return;
    }
    setActionLoadingId(user.id);
    try {
      await updateAdminUserRoleApi(user.id, newRole);
      showNotification(`User role updated to ${newRole}.`);
      setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    } catch (err) {
      showNotification(err.message || 'Failed to update role.', 'danger');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === currentUser.id) {
      alert('You cannot delete your own admin account.');
      return;
    }
    if (!window.confirm(`WARNING: Are you sure you want to permanently delete ${user.name}'s account and ALL their log entries?`)) {
      return;
    }
    setActionLoadingId(user.id);
    try {
      await deleteAdminUserApi(user.id);
      showNotification(`User ${user.name} was successfully deleted.`);
      setUsers(users.filter(u => u.id !== user.id));
      if (stats) {
        setStats({
          ...stats,
          total_users: stats.total_users - 1,
          active_users: user.status === 'active' ? stats.active_users - 1 : stats.active_users,
          disabled_users: user.status === 'disabled' ? stats.disabled_users - 1 : stats.disabled_users
        });
      }
    } catch (err) {
      showNotification(err.message || 'Failed to delete user.', 'danger');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🛡️</span> Admin Control Panel
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            System overview, user privilege control, and platform monitoring.
          </p>
        </div>
        <button 
          onClick={loadAdminData} 
          disabled={loading}
          className="btn btn-secondary" 
          style={{ minHeight: '38px', padding: '6px 14px', fontSize: '13px' }}
        >
          🔄 {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {feedback.message && (
        <div className={`status-badge ${feedback.type}`} style={{ display: 'block', padding: '10px 16px', marginBottom: '20px', fontSize: '14px' }}>
          {feedback.message}
        </div>
      )}

      {/* KPI Stats Grid */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ marginBottom: 0, padding: '18px', borderLeft: '4px solid var(--primary-color)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>TOTAL USERS</div>
            <div style={{ fontSize: '26px', fontWeight: '700', marginTop: '6px', color: 'var(--text-color)' }}>{stats.total_users}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {stats.active_users} active • {stats.disabled_users} disabled
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0, padding: '18px', borderLeft: '4px solid var(--success-color)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>TOTAL ACTIVITY LOGS</div>
            <div style={{ fontSize: '26px', fontWeight: '700', marginTop: '6px', color: 'var(--text-color)' }}>{stats.total_entries}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Across all user accounts
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0, padding: '18px', borderLeft: '4px solid var(--warning-color)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>LOGGED TODAY</div>
            <div style={{ fontSize: '26px', fontWeight: '700', marginTop: '6px', color: 'var(--text-color)' }}>{stats.today_entries}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {stats.week_entries} logged in the past 7 days
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0, padding: '18px', borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>ADMINISTRATORS</div>
            <div style={{ fontSize: '26px', fontWeight: '700', marginTop: '6px', color: 'var(--text-color)' }}>{stats.admin_users}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Users with admin privileges
            </div>
          </div>
        </div>
      )}

      {/* User Management Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 className="card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
            User Directory & Access Control ({filteredUsers.length})
          </h2>
          
          {/* Filters and Search */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="Search user or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
                minWidth: '180px'
              }}
            />
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
                backgroundColor: 'var(--card-background)',
                color: 'var(--text-color)'
              }}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins only</option>
              <option value="user">Regular Users</option>
            </select>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
                backgroundColor: 'var(--card-background)',
                color: 'var(--text-color)'
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px' }}>User</th>
                <th style={{ padding: '10px 12px' }}>Role</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Logs</th>
                <th style={{ padding: '10px 12px' }}>Joined Date</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser.id;
                  const isOperating = actionLoadingId === u.id;

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-color)' }}>
                          {u.name} {isSelf && <span style={{ fontSize: '11px', color: 'var(--primary-color)', marginLeft: '4px' }}>(You)</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</div>
                      </td>

                      <td style={{ padding: '12px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: u.role === 'admin' ? '#e0e7ff' : '#f3f4f6',
                          color: u.role === 'admin' ? '#4338ca' : '#4b5563'
                        }}>
                          {u.role === 'admin' ? '🛡️ Admin' : '👤 User'}
                        </span>
                      </td>

                      <td style={{ padding: '12px' }}>
                        <span className={`status-badge ${u.status === 'active' ? 'success' : 'danger'}`} style={{ padding: '2px 8px', fontSize: '12px' }}>
                          <span className="status-dot"></span>
                          {u.status === 'active' ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      <td style={{ padding: '12px', fontWeight: '500' }}>
                        {u.entry_count || 0}
                      </td>

                      <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>

                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            onClick={() => handleRoleChange(u)}
                            disabled={isSelf || isOperating}
                            title={isSelf ? 'Cannot modify own role' : `Change to ${u.role === 'admin' ? 'User' : 'Admin'}`}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--card-background)',
                              cursor: isSelf || isOperating ? 'not-allowed' : 'pointer',
                              opacity: isSelf ? 0.4 : 1
                            }}
                          >
                            {u.role === 'admin' ? 'Demote' : 'Promote'}
                          </button>

                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isSelf || isOperating}
                            title={isSelf ? 'Cannot disable own account' : `${u.status === 'active' ? 'Disable' : 'Enable'} user`}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: u.status === 'active' ? '#fff1f2' : '#f0fdf4',
                              color: u.status === 'active' ? '#be123c' : '#15803d',
                              cursor: isSelf || isOperating ? 'not-allowed' : 'pointer',
                              opacity: isSelf ? 0.4 : 1
                            }}
                          >
                            {u.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isSelf || isOperating}
                            title={isSelf ? 'Cannot delete own account' : 'Delete user permanently'}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              borderRadius: '4px',
                              border: '1px solid #fecaca',
                              backgroundColor: '#fef2f2',
                              color: 'var(--danger-color)',
                              cursor: isSelf || isOperating ? 'not-allowed' : 'pointer',
                              opacity: isSelf ? 0.4 : 1
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Platform Activity */}
      <div className="card">
        <h2 className="card-title">Recent Activity Stream (Global)</h2>
        {recentActivity.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '10px 0' }}>No activity records found yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 10px' }}>User</th>
                  <th style={{ padding: '8px 10px' }}>Category</th>
                  <th style={{ padding: '8px 10px' }}>Date/Time</th>
                  <th style={{ padding: '8px 10px' }}>Content</th>
                  <th style={{ padding: '8px 10px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map(act => (
                  <tr key={act.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: '500' }}>
                      {act.user_name}
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{act.user_email}</div>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--border-color)',
                        fontSize: '11px'
                      }}>
                        {act.type}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                      {act.entry_date} {act.entry_time ? act.entry_time.substring(0, 5) : ''}
                    </td>
                    <td style={{ padding: '8px 10px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {act.content}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: '600' }}>
                      {act.amount ? `₹${Number(act.amount).toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
