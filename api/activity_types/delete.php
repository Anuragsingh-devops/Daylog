<?php
/**
 * DailyTrack Delete Activity Type API
 */

define('DAILYTRACK_SECURE', true);
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/config/session.php';

// Load config for CORS
$config = require dirname(__DIR__) . '/config/config.php';
$origin = $config['app']['cors_allowed_origin'] ?? '*';

header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed. Use POST.']);
    exit();
}

// Authenticate user
$userId = requireAuth();

// Parse request body
$input = json_decode(file_get_contents('php://input'), true);
$name = isset($input['name']) ? trim($input['name']) : '';

if (empty($name)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Activity type name is required.']);
    exit();
}

try {
    $db = getDatabaseConnection();

    // Check if the type belongs to the user's custom types list
    $stmt = $db->prepare("SELECT id FROM activity_types WHERE user_id = ? AND name = ?");
    $stmt->execute([$userId, $name]);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => "Custom activity type '$name' not found."]);
        exit();
    }

    // Safety constraint: Verify if any entry currently utilizes this category
    $entryStmt = $db->prepare("SELECT COUNT(*) FROM entries WHERE user_id = ? AND type = ?");
    $entryStmt->execute([$userId, $name]);
    $usageCount = intval($entryStmt->fetchColumn());

    if ($usageCount > 0) {
        http_response_code(409); // Conflict
        echo json_encode([
            'status' => 'error',
            'message' => "Cannot delete activity type '$name' because it is currently used by $usageCount entry(ies). Please update or delete those entries first."
        ]);
        exit();
    }

    // Perform deletion
    $deleteStmt = $db->prepare("DELETE FROM activity_types WHERE user_id = ? AND name = ?");
    $deleteStmt->execute([$userId, $name]);

    // If deleted type was set as default in localStorage, the client UI will fall back automatically.
    
    echo json_encode([
        'status' => 'success',
        'message' => "Activity type '$name' deleted successfully."
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
