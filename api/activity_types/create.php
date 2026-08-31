<?php
/**
 * DailyTrack Create Activity Type API
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

// Validation
if (empty($name)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Activity type name is required.']);
    exit();
}

if (strlen($name) < 2 || strlen($name) > 30) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Name must be between 2 and 30 characters.']);
    exit();
}

if (!preg_match('/^[a-zA-Z0-9\s]+$/', $name)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Name must contain only letters, numbers, and spaces.']);
    exit();
}

// Format name: uppercase first letter of each word
$name = ucwords(strtolower($name));

$defaultTypes = ['Work', 'Study', 'Skill', 'Expense', 'Personal'];
if (in_array($name, $defaultTypes)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => "Type '$name' is a standard built-in type."]);
    exit();
}

try {
    $db = getDatabaseConnection();

    // Check database duplicates
    $stmt = $db->prepare("SELECT id FROM activity_types WHERE user_id = ? AND name = ?");
    $stmt->execute([$userId, $name]);
    if ($stmt->fetch()) {
        http_response_code(409); // Conflict
        echo json_encode(['status' => 'error', 'message' => "Activity type '$name' already exists."]);
        exit();
    }

    // Insert new type
    $insertStmt = $db->prepare("INSERT INTO activity_types (user_id, name) VALUES (?, ?)");
    $insertStmt->execute([$userId, $name]);
    $typeId = $db->lastInsertId();

    echo json_encode([
        'status' => 'success',
        'message' => 'Activity type created successfully.',
        'activity_type' => [
            'id' => (int)$typeId,
            'name' => $name
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
