<?php
/**
 * DailyTrack User Registration API
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

// Parse request body
$input = json_decode(file_get_contents('php://input'), true);

$name = isset($input['name']) ? trim($input['name']) : '';
$email = isset($input['email']) ? trim($input['email']) : '';
$password = isset($input['password']) ? $input['password'] : '';
$confirmPassword = isset($input['confirmPassword']) ? $input['confirmPassword'] : '';

// Validation
$errors = [];

if (empty($name)) {
    $errors['name'] = 'Name is required.';
} elseif (mb_strlen($name) < 2) {
    $errors['name'] = 'Name must be at least 2 characters.';
} elseif (!preg_match('/^[\p{L}\s\-\'\.]+$/u', $name)) {
    // Unicode letters, spaces, hyphens, single quotes, dots
    $errors['name'] = 'Name contains invalid characters.';
}

if (empty($email)) {
    $errors['email'] = 'Email is required.';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Invalid email format.';
}

if (empty($password)) {
    $errors['password'] = 'Password is required.';
} elseif (strlen($password) < 8) {
    $errors['password'] = 'Password must be at least 8 characters.';
}

if ($password !== $confirmPassword) {
    $errors['confirmPassword'] = 'Passwords do not match.';
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

    // Check if email already exists
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        http_response_code(409); // Conflict
        echo json_encode([
            'status' => 'error',
            'message' => 'Validation failed.',
            'errors' => ['email' => 'Email is already registered.']
        ]);
        exit();
    }

    // Determine role (first user becomes Admin, subsequent users become User)
    $countStmt = $db->query("SELECT COUNT(*) FROM users");
    $userCount = $countStmt->fetchColumn();
    $role = ($userCount == 0) ? 'admin' : 'user';

    // Hash password
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // Insert user
    $insertStmt = $db->prepare("
        INSERT INTO users (name, email, password, role, status)
        VALUES (?, ?, ?, ?, 'active')
    ");
    $insertStmt->execute([$name, $email, $passwordHash, $role]);
    $userId = $db->lastInsertId();

    // Seed default activity types for the new user in database
    $defaultTypes = ['Work', 'Study', 'Skill', 'Expense', 'Personal'];
    $seedStmt = $db->prepare("INSERT INTO activity_types (user_id, name) VALUES (?, ?)");
    foreach ($defaultTypes as $typeItem) {
        $seedStmt->execute([$userId, $typeItem]);
    }

    // Start session and login
    initSession();
    $_SESSION['user_id'] = $userId;
    $_SESSION['role'] = $role;
    $_SESSION['name'] = $name;

    // Return user info
    http_response_code(201); // Created
    echo json_encode([
        'status' => 'success',
        'message' => 'User registered successfully.',
        'user' => [
            'id' => (int)$userId,
            'name' => $name,
            'email' => $email,
            'role' => $role,
            'status' => 'active'
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
