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
