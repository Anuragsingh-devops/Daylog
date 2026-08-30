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
