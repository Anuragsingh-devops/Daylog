<?php
/**
 * DailyTrack Get Entry API
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

$entryId = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($entryId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid entry ID.']);
    exit();
}

try {
    $db = getDatabaseConnection();

    $stmt = $db->prepare("SELECT * FROM entries WHERE id = ?");
    $stmt->execute([$entryId]);
    $entry = $stmt->fetch();

    if (!$entry) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Entry not found.']);
        exit();
    }

    // Verify ownership
    if ((int)$entry['user_id'] !== $userId) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Forbidden. You do not own this entry.']);
        exit();
    }

    // Format output
    $entry['id'] = (int)$entry['id'];
    $entry['user_id'] = (int)$entry['user_id'];
    if ($entry['amount'] !== null) {
        $entry['amount'] = (float)$entry['amount'];
    }

    echo json_encode([
        'status' => 'success',
        'entry' => $entry
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
