/**
 * DailyTrack API Client Service
 */

/**
 * Fetch the backend API health status.
 * @returns {Promise<Object>} Status response object
 */
export async function getApiStatus() {
  try {
    const response = await fetch('/api/status.php');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API Connection Error:', error);
    return {
      status: 'error',
      message: error.message || 'Failed to connect to backend'
    };
  }
}

/**
 * User login api call.
 * @param {string} email 
 * @param {string} password 
 */
export async function loginApi(email, password) {
  const response = await fetch('/api/auth/login.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Login failed.');
  }
  return data;
}

/**
 * User registration api call.
 * @param {object} userData 
 */
export async function registerApi(userData) {
  const response = await fetch('/api/auth/register.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || 'Registration failed.');
    err.errors = data.errors || {};
    throw err;
  }
  return data;
}

/**
 * User logout api call.
 */
export async function logoutApi() {
  const response = await fetch('/api/auth/logout.php', {
    method: 'POST', // logout is POST
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Logout failed.');
  }
  return data;
}

/**
 * Get current authenticated user profile session.
 */
export async function getMeApi() {
  const response = await fetch('/api/auth/me.php');
  if (response.status === 401) {
    return null; // Silent null on unauthorized session
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to verify session.');
  }
  return data.user;
}

/* ==========================================
   ENTRY CRUD APIS
   ========================================== */

/**
 * Create a new log entry.
 * @param {Object} entryData {type, entry_date, entry_time, content, amount}
 */
export async function createEntryApi(entryData) {
  const response = await fetch('/api/entries/create.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entryData)
  });
  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || 'Failed to create entry.');
    err.errors = data.errors || {};
    throw err;
  }
  return data;
}

/**
 * Fetch entries filtered by date or range.
 * @param {Object} filters {date, range, type}
 */
export async function listEntriesApi(filters = {}) {
  const queryParams = new URLSearchParams();
  if (filters.date) queryParams.append('date', filters.date);
  if (filters.range) queryParams.append('range', filters.range);
  if (filters.type) queryParams.append('type', filters.type);

  const response = await fetch(`/api/entries/list.php?${queryParams.toString()}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch entries.');
  }
  return data.entries;
}

/**
 * Fetch a single entry details.
 * @param {number} id 
 */
export async function getEntryApi(id) {
  const response = await fetch(`/api/entries/get.php?id=${id}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch entry details.');
  }
  return data.entry;
}

/**
 * Update an existing log entry.
 * @param {Object} entryData {id, type, entry_date, entry_time, content, amount}
 */
export async function updateEntryApi(entryData) {
  const response = await fetch('/api/entries/update.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entryData)
  });
  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || 'Failed to update entry.');
    err.errors = data.errors || {};
    throw err;
  }
  return data;
}

/**
 * Delete a log entry.
 * @param {number} id 
 */
export async function deleteEntryApi(id) {
  const response = await fetch('/api/entries/delete.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete entry.');
  }
  return data;
}

/**
 * Update the user profile.
 * @param {Object} profileData {name, password, confirmPassword}
 */
export async function updateProfileApi(profileData) {
  const response = await fetch('/api/users/update-profile.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileData)
  });
  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || 'Failed to update profile.');
    err.errors = data.errors || {};
    throw err;
  }
  return data;
}

/**
 * List all activity types (default + custom).
 */
export async function listActivityTypesApi() {
  const response = await fetch('/api/activity_types/list.php');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to list activity types.');
  }
  return data;
}

/**
 * Create a new custom activity type.
 * @param {string} name 
 */
export async function createActivityTypeApi(name) {
  const response = await fetch('/api/activity_types/create.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to create activity type.');
  }
  return data;
}

/**
 * Delete a custom activity type.
 * @param {string} name 
 */
export async function deleteActivityTypeApi(name) {
  const response = await fetch('/api/activity_types/delete.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete activity type.');
  }
  return data;
}

/**
 * Rename a custom activity type.
 * @param {string} oldName 
 * @param {string} newName 
 */
export async function updateActivityTypeApi(oldName, newName) {
  const response = await fetch('/api/activity_types/update.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_name: oldName, new_name: newName })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to rename activity type.');
  }
  return data;
}

/* ==========================================
   ADMIN MANAGEMENT APIS (SECRET DIRECTORY)
   ========================================== */

/**
 * Fetch platform overview statistics for admins.
 */
export async function getAdminStatsApi() {
  const response = await fetch('/api/sys_vault_928/stats.php');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch admin stats.');
  }
  return data;
}

/**
 * List all registered users for admin management.
 */
export async function getAdminUsersApi() {
  const response = await fetch('/api/sys_vault_928/users.php');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch user list.');
  }
  return data.users;
}

/**
 * Toggle user account status (active vs disabled).
 * @param {number} userId 
 * @param {'active'|'disabled'} status 
 */
export async function updateAdminUserStatusApi(userId, status) {
  const response = await fetch('/api/sys_vault_928/users.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'toggle_status', user_id: userId, status })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update user status.');
  }
  return data;
}

/**
 * Update user account role (user vs admin).
 * @param {number} userId 
 * @param {'user'|'admin'} role 
 */
export async function updateAdminUserRoleApi(userId, role) {
  const response = await fetch('/api/sys_vault_928/users.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update_role', user_id: userId, role })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update user role.');
  }
  return data;
}

/**
 * Delete a user account and their associated records.
 * @param {number} userId 
 */
export async function deleteAdminUserApi(userId) {
  const response = await fetch('/api/sys_vault_928/users.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', user_id: userId })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete user.');
  }
  return data;
}

/**
 * Fetch detailed profile, summary stats, and all activity entries for a specific user.
 * @param {number} userId 
 */
export async function getAdminUserDetailsApi(userId) {
  const response = await fetch(`/api/sys_vault_928/users.php?user_id=${userId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch user details.');
  }
  return data;
}

// -------------------------------------------------------------
// TO-DO / TASK MANAGEMENT APIs
// -------------------------------------------------------------

/**
 * List todos with optional filters: { status, priority, filter, search }
 */
export async function listTodosApi(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.priority) query.append('priority', params.priority);
  if (params.filter) query.append('filter', params.filter);
  if (params.month) query.append('month', params.month);
  if (params.search) query.append('search', params.search);

  const url = `/api/todos/index.php${query.toString() ? '?' + query.toString() : ''}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to load tasks.');
  }
  return data;
}

/**
 * Create a new task: { title, description, priority, due_date }
 */
export async function createTodoApi(todoData) {
  const response = await fetch('/api/todos/index.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', ...todoData })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to create task.');
  }
  return data;
}

/**
 * Toggle task completion status
 */
export async function toggleTodoApi(id) {
  const response = await fetch('/api/todos/index.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'toggle', id })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update task.');
  }
  return data;
}

/**
 * Update an existing task: id, { title, description, priority, due_date }
 */
export async function updateTodoApi(id, todoData) {
  const response = await fetch('/api/todos/index.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', id, ...todoData })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update task.');
  }
  return data;
}

/**
 * Delete a task
 */
export async function deleteTodoApi(id) {
  const response = await fetch('/api/todos/index.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete task.');
  }
  return data;
}


