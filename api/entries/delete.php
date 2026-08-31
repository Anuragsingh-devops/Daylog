<?php
/**
 * DailyTrack Delete Entry API
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

$entryId = isset($input['id']) ? intval($input['id']) : (isset($_GET['id']) ? intval($_GET['id']) : 0);

if ($entryId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid entry ID.']);
    exit();
}

try {
    $db = getDatabaseConnection();

    // Verify entry existence and ownership
    $stmt = $db->prepare("SELECT user_id FROM entries WHERE id = ?");
    $stmt->execute([$entryId]);
    $existingEntry = $stmt->fetch();

    if (!$existingEntry) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Entry not found.']);
        exit();
    }

    if ((int)$existingEntry['user_id'] !== $userId) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Forbidden. You do not own this entry.']);
        exit();
    }

    // Perform deletion
    $deleteStmt = $db->prepare("DELETE FROM entries WHERE id = ? AND user_id = ?");
    $deleteStmt->execute([$entryId, $userId]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Entry deleted successfully.',
        'deleted_id' => $entryId
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
