<?php
/**
 * DailyTrack List Activity Types API
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

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed. Use GET.']);
    exit();
}

// Authenticate user
$userId = requireAuth();

try {
    $db = getDatabaseConnection();

    // Default built-in activity types
    $types = ['Work', 'Study', 'Skill', 'Expense', 'Personal'];

    // Query user custom activity types
    $stmt = $db->prepare("SELECT name FROM activity_types WHERE user_id = ? ORDER BY name ASC");
    $stmt->execute([$userId]);
    $customTypes = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // Merge custom types
    $allTypes = array_merge($types, $customTypes);

    echo json_encode([
        'status' => 'success',
        'types' => $allTypes,
        'custom_types' => $customTypes // Return separately too for easy management in settings
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
