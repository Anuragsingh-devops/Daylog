<?php
/**
 * DailyTrack Update Entry API
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

$entryId = isset($input['id']) ? intval($input['id']) : 0;
$type = isset($input['type']) ? trim($input['type']) : '';
$entryDate = isset($input['entry_date']) ? trim($input['entry_date']) : '';
$entryTime = isset($input['entry_time']) ? trim($input['entry_time']) : '';
$content = isset($input['content']) ? trim($input['content']) : '';
$amount = isset($input['amount']) ? $input['amount'] : null;

if ($entryId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid entry ID.']);
    exit();
}

// Validation
$allowedTypes = ['Study', 'Skill', 'Expense', 'Personal', 'Work'];
$errors = [];

if (empty($type) || !in_array($type, $allowedTypes)) {
    $errors['type'] = 'Invalid activity type. Choose from: ' . implode(', ', $allowedTypes);
}

if (empty($entryDate) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $entryDate)) {
    $errors['entry_date'] = 'Invalid date format (expected YYYY-MM-DD).';
}

if (empty($entryTime) || !preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $entryTime)) {
    $errors['entry_time'] = 'Invalid time format (expected HH:MM).';
}

if (empty($content)) {
    $errors['content'] = 'Description content is required.';
}

if ($type === 'Expense') {
    if ($amount === null || $amount === '') {
        $errors['amount'] = 'Amount is required for expenses.';
    } elseif (!is_numeric($amount) || floatval($amount) <= 0) {
        $errors['amount'] = 'Amount must be a positive number.';
    } else {
        $amount = floatval($amount);
    }
} else {
    $amount = null; // Enforce null for non-expenses
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Validation failed.',
        'errors' => $errors
    ]);
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

    // Perform update
    $updateStmt = $db->prepare("
        UPDATE entries 
        SET type = ?, entry_date = ?, entry_time = ?, content = ?, amount = ? 
        WHERE id = ? AND user_id = ?
    ");
    $updateStmt->execute([$type, $entryDate, $entryTime, $content, $amount, $entryId, $userId]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Entry updated successfully.',
        'entry' => [
            'id' => $entryId,
            'user_id' => $userId,
            'type' => $type,
            'entry_date' => $entryDate,
            'entry_time' => $entryTime,
            'content' => $content,
            'amount' => $amount !== null ? (float)$amount : null
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
