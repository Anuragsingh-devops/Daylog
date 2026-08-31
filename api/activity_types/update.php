<?php
/**
 * DailyTrack Update Activity Type API (Rename)
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
$oldName = isset($input['old_name']) ? trim($input['old_name']) : '';
$newName = isset($input['new_name']) ? trim($input['new_name']) : '';

// Validation
if (empty($oldName) || empty($newName)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Both old_name and new_name are required.']);
    exit();
}

if (strlen($newName) < 2 || strlen($newName) > 30) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'New name must be between 2 and 30 characters.']);
    exit();
}

if (!preg_match('/^[a-zA-Z0-9\s]+$/', $newName)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'New name must contain only letters, numbers, and spaces.']);
    exit();
}

// Format name: uppercase first letter of each word
$newName = ucwords(strtolower($newName));

if ($oldName === $newName) {
    echo json_encode([
        'status' => 'success',
        'message' => 'No changes made.'
    ]);
    exit();
}

try {
    $db = getDatabaseConnection();

    // Verify if old name actually belongs to the user
    $checkStmt = $db->prepare("SELECT id FROM activity_types WHERE user_id = ? AND name = ?");
    $checkStmt->execute([$userId, $oldName]);
    if (!$checkStmt->fetch()) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => "Category '$oldName' not found."]);
        exit();
    }

    // Verify new name does not clash with another custom category
    $clashStmt = $db->prepare("SELECT id FROM activity_types WHERE user_id = ? AND name = ?");
    $clashStmt->execute([$userId, $newName]);
    if ($clashStmt->fetch()) {
        http_response_code(409); // Conflict
        echo json_encode(['status' => 'error', 'message' => "Category '$newName' already exists."]);
        exit();
    }

    // Start Transaction to update both tables atomically
    $db->beginTransaction();

    // 1. Update activity_types
    $updateTypeStmt = $db->prepare("
        UPDATE activity_types 
        SET name = ? 
        WHERE user_id = ? AND name = ?
    ");
    $updateTypeStmt->execute([$newName, $userId, $oldName]);

    // 2. Update entries
    $updateEntriesStmt = $db->prepare("
        UPDATE entries 
        SET type = ? 
        WHERE user_id = ? AND type = ?
    ");
    $updateEntriesStmt->execute([$newName, $userId, $oldName]);

    // Commit Transaction
    $db->commit();

    echo json_encode([
        'status' => 'success',
        'message' => "Activity type renamed from '$oldName' to '$newName' successfully."
    ]);
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
