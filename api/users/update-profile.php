<?php
/**
 * DailyTrack Update Profile API
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
$password = isset($input['password']) ? $input['password'] : '';
$confirmPassword = isset($input['confirmPassword']) ? $input['confirmPassword'] : '';

// Validation
$errors = [];

if (empty($name)) {
    $errors['name'] = 'Name is required.';
} elseif (mb_strlen($name) < 2) {
    $errors['name'] = 'Name must be at least 2 characters.';
} elseif (!preg_match('/^[\p{L}\s\-\'\.]+$/u', $name)) {
    $errors['name'] = 'Name contains invalid characters.';
}

$updatePassword = false;
if (!empty($password) || !empty($confirmPassword)) {
    if (strlen($password) < 8) {
        $errors['password'] = 'Password must be at least 8 characters.';
    }
    if ($password !== $confirmPassword) {
        $errors['confirmPassword'] = 'Passwords do not match.';
    }
    $updatePassword = true;
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

    if ($updatePassword) {
        // Update both name and password
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare("
            UPDATE users 
            SET name = ?, password = ? 
            WHERE id = ?
        ");
        $stmt->execute([$name, $passwordHash, $userId]);
    } else {
        // Update name only
        $stmt = $db->prepare("
            UPDATE users 
            SET name = ? 
            WHERE id = ?
        ");
        $stmt->execute([$name, $userId]);
    }

    // Refresh user session name
    initSession();
    $_SESSION['name'] = $name;

    // Fetch updated details
    $userStmt = $db->prepare("SELECT id, name, email, role, status, created_at FROM users WHERE id = ?");
    $userStmt->execute([$userId]);
    $updatedUser = $userStmt->fetch();

    echo json_encode([
        'status' => 'success',
        'message' => 'Profile updated successfully.',
        'user' => [
            'id' => (int)$updatedUser['id'],
            'name' => $updatedUser['name'],
            'email' => $updatedUser['email'],
            'role' => $updatedUser['role'],
            'status' => $updatedUser['status'],
            'created_at' => $updatedUser['created_at']
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
