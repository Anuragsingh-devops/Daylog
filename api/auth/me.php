<?php
/**
 * DailyTrack Current User Heartbeat API
 */

define('DAILYTRACK_SECURE', true);
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/config/session.php';

// Load config for CORS
$config = require dirname(__DIR__) . '/config/config.php';
$origin = $config['app']['cors_allowed_origin'] ?? '*';

header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

initSession();
$userId = getCurrentUserId();

if ($userId === null) {
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'message' => 'Unauthorized. No active session.'
    ]);
    exit();
}

try {
    $db = getDatabaseConnection();
    
    // Fetch latest user details to ensure status is still active
    $stmt = $db->prepare("SELECT id, name, email, role, status, created_at FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user || $user['status'] !== 'active') {
        // User was deleted or deactivated since logging in
        // Clear session and return error
        $_SESSION = array();
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
        }
        session_destroy();
        
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Account is no longer active or exists.'
        ]);
        exit();
    }
    
    echo json_encode([
        'status' => 'success',
        'user' => [
            'id' => (int)$user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'status' => $user['status'],
            'created_at' => $user['created_at']
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
