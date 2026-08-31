<?php
/**
 * DailyTrack Admin Users Management API
 */

define('DAILYTRACK_SECURE', true);
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/config/session.php';

// Load config for CORS
$config = require dirname(__DIR__) . '/config/config.php';
$origin = $config['app']['cors_allowed_origin'] ?? '*';

header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$adminId = requireAdmin();

try {
    $db = getDatabaseConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    // 1. GET: List all users
    if ($method === 'GET') {
        $stmt = $db->query("
            SELECT 
                u.id, 
                u.name, 
                u.email, 
                u.role, 
                u.status, 
                u.created_at,
                (SELECT COUNT(*) FROM entries e WHERE e.user_id = u.id) as entry_count
            FROM users u
            ORDER BY u.created_at DESC
        ");
        $users = $stmt->fetchAll();

        echo json_encode([
            'status' => 'success',
            'users' => $users
        ]);
        exit();
    }

    // 2. POST: Actions (toggle status, update role, delete)
    if ($method === 'POST') {
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);

        if (!$input || empty($input['action']) || empty($input['user_id'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid action or missing user_id.']);
            exit();
        }

        $targetUserId = (int)$input['user_id'];
        $action = $input['action'];

        // Safety: Check if user exists
        $stmt = $db->prepare("SELECT id, name, email, role, status FROM users WHERE id = ?");
        $stmt->execute([$targetUserId]);
        $targetUser = $stmt->fetch();

        if (!$targetUser) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'User not found.']);
            exit();
        }

        // Action: toggle_status
        if ($action === 'toggle_status') {
            $newStatus = ($input['status'] === 'disabled') ? 'disabled' : 'active';

            if ($targetUserId === $adminId && $newStatus === 'disabled') {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'You cannot deactivate your own admin account.']);
                exit();
            }

            $updateStmt = $db->prepare("UPDATE users SET status = ? WHERE id = ?");
            $updateStmt->execute([$newStatus, $targetUserId]);

            echo json_encode([
                'status' => 'success',
                'message' => "User status updated to {$newStatus}.",
                'user_id' => $targetUserId,
                'new_status' => $newStatus
            ]);
            exit();
        }

        // Action: update_role
        if ($action === 'update_role') {
            $newRole = ($input['role'] === 'admin') ? 'admin' : 'user';

            if ($targetUserId === $adminId && $newRole === 'user') {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'You cannot demote your own admin account.']);
                exit();
            }

            $updateStmt = $db->prepare("UPDATE users SET role = ? WHERE id = ?");
            $updateStmt->execute([$newRole, $targetUserId]);

            echo json_encode([
                'status' => 'success',
                'message' => "User role updated to {$newRole}.",
                'user_id' => $targetUserId,
                'new_role' => $newRole
            ]);
            exit();
        }

        // Action: delete
        if ($action === 'delete') {
            if ($targetUserId === $adminId) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'You cannot delete your own admin account.']);
                exit();
            }

            $deleteStmt = $db->prepare("DELETE FROM users WHERE id = ?");
            $deleteStmt->execute([$targetUserId]);

            echo json_encode([
                'status' => 'success',
                'message' => 'User and associated data successfully deleted.'
            ]);
            exit();
        }

        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Unknown action.']);
        exit();
    }

    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed.']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
