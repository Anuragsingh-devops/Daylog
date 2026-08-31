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



