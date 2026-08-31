import { useState, useEffect } from 'react';
import { 
  getAdminStatsApi, 
  getAdminUsersApi, 
  getAdminUserDetailsApi,
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

  // Inspection Modal State
  const [inspectingUser, setInspectingUser] = useState(null);
  const [inspectingDetails, setInspectingDetails] = useState(null);
  const [inspectingLoading, setInspectingLoading] = useState(false);

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

  const handleInspectUser = async (user) => {
    setInspectingUser(user);
    setInspectingLoading(true);
    setInspectingDetails(null);
    try {
      const details = await getAdminUserDetailsApi(user.id);
      setInspectingDetails(details);
    } catch (err) {
      showNotification(err.message || 'Failed to load user details.', 'danger');
    } finally {
      setInspectingLoading(false);
    }
  };

  const handleCloseModal = () => {
    setInspectingUser(null);
    setInspectingDetails(null);
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
        <div className="stats-grid-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          <div className="card" style={{ marginBottom: 0, padding: '16px', borderLeft: '4px solid var(--primary-color)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL USERS</div>
            <div style={{ fontSize: '26px', fontWeight: '700', marginTop: '4px', color: 'var(--text-color)' }}>{stats.total_users}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {stats.active_users} active • {stats.disabled_users} disabled
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0, padding: '16px', borderLeft: '4px solid var(--success-color)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL ACTIVITY LOGS</div>
            <div style={{ fontSize: '26px', fontWeight: '700', marginTop: '4px', color: 'var(--text-color)' }}>{stats.total_entries}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Across all user accounts
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0, padding: '16px', borderLeft: '4px solid var(--warning-color)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>LOGGED TODAY</div>
            <div style={{ fontSize: '26px', fontWeight: '700', marginTop: '4px', color: 'var(--text-color)' }}>{stats.today_entries}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {stats.week_entries} in past 7 days
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0, padding: '16px', borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>ADMINISTRATORS</div>
            <div style={{ fontSize: '26px', fontWeight: '700', marginTop: '4px', color: 'var(--text-color)' }}>{stats.admin_users}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Admin role privileges
            </div>
          </div>
        </div>
      )}

      {/* User Management Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 className="card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
            User Directory ({filteredUsers.length})
          </h2>
          
          {/* Filters and Search */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: '100%', maxWidth: '500px' }}>
            <input 
              type="text" 
              className="form-control"
              placeholder="Search user or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: '1 1 160px', padding: '6px 12px', fontSize: '13px' }}
            />
            <select 
              value={roleFilter} 
              className="form-control"
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ flex: '1 1 110px', padding: '6px 12px', fontSize: '13px' }}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins only</option>
              <option value="user">Regular Users</option>
            </select>
            <select 
              value={statusFilter} 
              className="form-control"
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ flex: '1 1 110px', padding: '6px 12px', fontSize: '13px' }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="table-responsive">
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
                        <div 
                          onClick={() => handleInspectUser(u)} 
                          style={{ fontWeight: '600', color: 'var(--primary-color)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Click to view full user activity history"
                        >
                          {u.name} {isSelf && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '2px' }}>(You)</span>}
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
                            onClick={() => handleInspectUser(u)}
                            title="Inspect user entries and history"
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              borderRadius: '4px',
                              border: '1px solid var(--primary-color)',
                              backgroundColor: '#eff6ff',
                              color: 'var(--primary-color)',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            👁️ Logs
                          </button>

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
                              fontWeight: '500'
                            }}
                          >
                            Role
                          </button>

                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isSelf || isOperating}
                            title={isSelf ? 'Cannot modify own status' : u.status === 'active' ? 'Deactivate user' : 'Activate user'}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--card-background)',
                              cursor: isSelf || isOperating ? 'not-allowed' : 'pointer',
                              fontWeight: '500',
                              color: u.status === 'active' ? 'var(--warning-color)' : 'var(--success-color)'
                            }}
                          >
                            {u.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isSelf || isOperating}
                            title={isSelf ? 'Cannot delete own account' : 'Delete user and all logs'}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: '#fee2e2',
                              color: 'var(--danger-color)',
                              cursor: isSelf || isOperating ? 'not-allowed' : 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            Del
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

      {/* Global Activity Stream Card */}
      <div className="card">
        <h2 className="card-title">Recent System Activity</h2>
        
        {recentActivity.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No recent activity recorded yet.
          </div>
        ) : (
          <div className="table-responsive">
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

      {/* User Activity Inspection Modal */}
      {inspectingUser && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="modal-box" style={{
            backgroundColor: 'var(--card-background)',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            maxWidth: '850px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fafafa'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: 'var(--text-color)' }}>
                    👤 {inspectingUser.name}
                  </h2>
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: '600',
                    backgroundColor: inspectingUser.role === 'admin' ? '#e0e7ff' : '#f3f4f6',
                    color: inspectingUser.role === 'admin' ? '#4338ca' : '#4b5563'
                  }}>
                    {inspectingUser.role === 'admin' ? '🛡️ Admin' : 'User'}
                  </span>
                  <span className={`status-badge ${inspectingUser.status === 'active' ? 'success' : 'danger'}`} style={{ padding: '2px 8px', fontSize: '11px' }}>
                    {inspectingUser.status === 'active' ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {inspectingUser.email} • Joined: {new Date(inspectingUser.created_at).toLocaleDateString()}
                </div>
              </div>
              <button 
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {inspectingLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading user history and entries...
                </div>
              ) : inspectingDetails ? (
                <div>
                  {/* Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ padding: '12px 16px', borderRadius: 'var(--border-radius)', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL LOGS</div>
                      <div style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px' }}>{inspectingDetails.summary.total_entries}</div>
                    </div>
                    <div style={{ padding: '12px 16px', borderRadius: 'var(--border-radius)', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL SPENDING</div>
                      <div style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px', color: 'var(--danger-color)' }}>
                        ₹{inspectingDetails.summary.total_spend.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ padding: '12px 16px', borderRadius: 'var(--border-radius)', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>TOP CATEGORIES</div>
                      <div style={{ fontSize: '13px', marginTop: '4px', color: 'var(--text-color)' }}>
                        {Object.entries(inspectingDetails.summary.type_counts || {}).map(([type, count]) => (
                          <span key={type} style={{ display: 'inline-block', marginRight: '8px', fontSize: '12px' }}>
                            {type}: <b>{count}</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Entries List */}
                  <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '10px' }}>
                    Journal Entries ({inspectingDetails.entries.length})
                  </h3>

                  {inspectingDetails.entries.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius)' }}>
                      This user has not created any log entries yet.
                    </div>
                  ) : (
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '10px 12px' }}>Date / Time</th>
                            <th style={{ padding: '10px 12px' }}>Category</th>
                            <th style={{ padding: '10px 12px' }}>Activity Content</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inspectingDetails.entries.map((entry) => (
                            <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                                <div>{entry.entry_date}</div>
                                <div style={{ fontSize: '11px' }}>{entry.entry_time ? entry.entry_time.substring(0, 5) : ''}</div>
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  backgroundColor: '#f3f4f6'
                                }}>
                                  {entry.type}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', whiteSpace: 'pre-line' }}>
                                {entry.content}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>
                                {entry.amount ? `₹${Number(entry.amount).toLocaleString()}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: '#fafafa'
            }}>
              <button 
                onClick={handleCloseModal}
                className="btn btn-secondary"
                style={{ padding: '6px 16px', fontSize: '13px', minHeight: '36px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
