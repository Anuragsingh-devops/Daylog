<?php
/**
 * DailyTrack Session and Authorization Helper
 */

if (!defined('DAILYTRACK_SECURE')) {
    http_response_code(403);
    exit(json_encode(['status' => 'error', 'message' => 'Forbidden']));
}

/**
 * Initialize the PHP session with secure cookie parameters.
 */
function initSession() {
    if (session_status() === PHP_SESSION_NONE) {
        $configPath = dirname(__DIR__) . '/config/config.php';
        if (!file_exists($configPath)) {
            $configPath = dirname(__DIR__) . '/config/config.example.php';
        }
        $config = require $configPath;
        $isProd = ($config['app']['env'] ?? 'development') === 'production';
        
        // Setup secure cookie parameters
        session_set_cookie_params([
            'lifetime' => 86400 * 30, // 30 days
            'path' => '/',
            'domain' => '',
            'secure' => $isProd, // Needs HTTPS in production, false for local dev HTTP
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        
        session_start();
    }
}

/**
 * Get the currently logged-in user ID.
 * @return int|null User ID or null if guest
 */
function getCurrentUserId() {
    initSession();
    return $_SESSION['user_id'] ?? null;
}

/**
 * Check if the user is logged in. If not, aborts request with 401.
 * @return int Authenticated user ID
 */
function requireAuth() {
    $userId = getCurrentUserId();
    if ($userId === null) {
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Unauthorized. Please login.'
        ]);
        exit();
    }
    return $userId;
}

/**
 * Check if the user is an administrator. If not, aborts request with 403.
 * @return int Authenticated user ID
 */
function requireAdmin() {
    $userId = requireAuth();
    if (($_SESSION['role'] ?? 'user') !== 'admin') {
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'message' => 'Forbidden. Administrator privileges required.'
        ]);
        exit();
    }
    return $userId;
}
