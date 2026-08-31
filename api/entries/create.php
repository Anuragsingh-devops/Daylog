<?php
/**
 * DailyTrack Create Entry API
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

$type = isset($input['type']) ? trim($input['type']) : '';
$entryDate = isset($input['entry_date']) ? trim($input['entry_date']) : '';
$entryTime = isset($input['entry_time']) ? trim($input['entry_time']) : '';
$content = isset($input['content']) ? trim($input['content']) : '';
$amount = isset($input['amount']) ? $input['amount'] : null;

try {
    $db = getDatabaseConnection();
    
    // Fetch custom types to validate against
    $typeStmt = $db->prepare("SELECT name FROM activity_types WHERE user_id = ?");
    $typeStmt->execute([$userId]);
    $allowedTypes = $typeStmt->fetchAll(PDO::FETCH_COLUMN);

    // Self-healing check
    if (empty($allowedTypes)) {
        $defaultTypes = ['Work', 'Study', 'Skill', 'Expense', 'Personal'];
        $seedStmt = $db->prepare("INSERT INTO activity_types (user_id, name) VALUES (?, ?)");
        foreach ($defaultTypes as $typeItem) {
            $seedStmt->execute([$userId, $typeItem]);
        }
        $allowedTypes = $defaultTypes;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    exit();
}

// Validation
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
    
    // Insert entry
    $stmt = $db->prepare("
        INSERT INTO entries (user_id, type, entry_date, entry_time, content, amount)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([$userId, $type, $entryDate, $entryTime, $content, $amount]);
    $entryId = $db->lastInsertId();

    http_response_code(201); // Created
    echo json_encode([
        'status' => 'success',
        'message' => 'Entry created successfully.',
        'entry' => [
            'id' => (int)$entryId,
            'user_id' => (int)$userId,
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
