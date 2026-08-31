<?php
/**
 * DailyTrack To-Do / Task Management REST API
 */

define('DAILYTRACK_SECURE', true);
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/config/session.php';

// Load config for CORS
$config = require dirname(__DIR__) . '/config/config.php';
$origin = $config['app']['cors_allowed_origin'] ?? '*';

header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$userId = requireAuth();

try {
    $db = getDatabaseConnection();

    // Auto-create table if not exists (self-healing)
    $db->exec("
        CREATE TABLE IF NOT EXISTS `todos` (
          `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          `user_id` INT UNSIGNED NOT NULL,
          `title` VARCHAR(255) NOT NULL,
          `description` TEXT NULL,
          `priority` ENUM('low', 'medium', 'high') DEFAULT 'medium' NOT NULL,
          `status` ENUM('pending', 'completed') DEFAULT 'pending' NOT NULL,
          `due_date` DATE NULL,
          `completed_at` TIMESTAMP NULL,
          `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
          INDEX `idx_todos_user_status` (`user_id`, `status`),
          INDEX `idx_todos_user_due` (`user_id`, `due_date`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $method = $_SERVER['REQUEST_METHOD'];

    // 1. GET: List todos with filters and stats
    if ($method === 'GET') {
        $status = isset($_GET['status']) ? trim($_GET['status']) : 'all';
        $priority = isset($_GET['priority']) ? trim($_GET['priority']) : 'all';
        $dateFilter = isset($_GET['filter']) ? trim($_GET['filter']) : 'all';
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';

        $query = "SELECT * FROM todos WHERE user_id = :user_id";
        $params = [':user_id' => $userId];

        if ($status === 'pending' || $status === 'completed') {
            $query .= " AND status = :status";
            $params[':status'] = $status;
        }

        if (in_array($priority, ['low', 'medium', 'high'])) {
            $query .= " AND priority = :priority";
            $params[':priority'] = $priority;
        }

        $today = date('Y-m-d');
        if ($dateFilter === 'today') {
            $query .= " AND due_date = :today";
            $params[':today'] = $today;
        } elseif ($dateFilter === 'upcoming') {
            $query .= " AND due_date > :today";
            $params[':today'] = $today;
        } elseif ($dateFilter === 'overdue') {
            $query .= " AND due_date < :today AND status = 'pending'";
            $params[':today'] = $today;
        }

        if (!empty($search)) {
            $query .= " AND (title LIKE :search OR description LIKE :search)";
            $params[':search'] = '%' . $search . '%';
        }

        // Sorting: Pending tasks first, then by priority (high > med > low), then due date, then created_at DESC
        $query .= " ORDER BY status ASC, FIELD(priority, 'high', 'medium', 'low'), due_date ASC, created_at DESC";

        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $todos = $stmt->fetchAll();

        // Calculate user-wide stats
        $statsStmt = $db->prepare("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN due_date = :today AND status = 'pending' THEN 1 ELSE 0 END) as today_pending,
                SUM(CASE WHEN due_date < :today AND status = 'pending' THEN 1 ELSE 0 END) as overdue
            FROM todos
            WHERE user_id = :user_id
        ");
        $statsStmt->execute([':user_id' => $userId, ':today' => $today]);
        $stats = $statsStmt->fetch();

        echo json_encode([
            'status' => 'success',
            'todos' => $todos,
            'stats' => [
                'total' => (int)($stats['total'] ?? 0),
                'pending' => (int)($stats['pending'] ?? 0),
                'completed' => (int)($stats['completed'] ?? 0),
                'today_pending' => (int)($stats['today_pending'] ?? 0),
                'overdue' => (int)($stats['overdue'] ?? 0),
            ]
        ]);
        exit();
    }

    // 2. DELETE method directly
    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if (!$id) {
            $input = json_decode(file_get_contents('php://input'), true);
            $id = (int)($input['id'] ?? 0);
        }

        if (!$id) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Task ID is required.']);
            exit();
        }

        $stmt = $db->prepare("DELETE FROM todos WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);

        echo json_encode(['status' => 'success', 'message' => 'Task deleted successfully.']);
        exit();
    }

    // 3. POST method (handles create, toggle, update, delete)
    if ($method === 'POST' || $method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $action = $input['action'] ?? 'create';

        // A. TOGGLE TASK COMPLETION
        if ($action === 'toggle') {
            $id = (int)($input['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Task ID is required.']);
                exit();
            }

            // Get current status
            $checkStmt = $db->prepare("SELECT status FROM todos WHERE id = ? AND user_id = ?");
            $checkStmt->execute([$id, $userId]);
            $current = $checkStmt->fetch();

            if (!$current) {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'message' => 'Task not found.']);
                exit();
            }

            $newStatus = $current['status'] === 'pending' ? 'completed' : 'pending';
            $completedAt = $newStatus === 'completed' ? date('Y-m-d H:i:s') : null;

            $updateStmt = $db->prepare("
                UPDATE todos 
                SET status = ?, completed_at = ? 
                WHERE id = ? AND user_id = ?
            ");
            $updateStmt->execute([$newStatus, $completedAt, $id, $userId]);

            echo json_encode([
                'status' => 'success',
                'message' => 'Task status updated.',
                'new_status' => $newStatus,
                'completed_at' => $completedAt
            ]);
            exit();
        }

        // B. DELETE TASK VIA POST
        if ($action === 'delete') {
            $id = (int)($input['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Task ID is required.']);
                exit();
            }

            $stmt = $db->prepare("DELETE FROM todos WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $userId]);

            echo json_encode(['status' => 'success', 'message' => 'Task deleted.']);
            exit();
        }

        // C. UPDATE EXISTING TASK
        if ($action === 'update') {
            $id = (int)($input['id'] ?? 0);
            $title = trim($input['title'] ?? '');
            $description = trim($input['description'] ?? '');
            $priority = in_array($input['priority'] ?? '', ['low', 'medium', 'high']) ? $input['priority'] : 'medium';
            $dueDate = !empty($input['due_date']) ? $input['due_date'] : null;

            if (!$id || empty($title)) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Task ID and Title are required.']);
                exit();
            }

            $stmt = $db->prepare("
                UPDATE todos 
                SET title = ?, description = ?, priority = ?, due_date = ? 
                WHERE id = ? AND user_id = ?
            ");
            $stmt->execute([$title, $description ?: null, $priority, $dueDate, $id, $userId]);

            echo json_encode(['status' => 'success', 'message' => 'Task updated.']);
            exit();
        }

        // D. CREATE NEW TASK (Default)
        $title = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
        $priority = in_array($input['priority'] ?? '', ['low', 'medium', 'high']) ? $input['priority'] : 'medium';
        $dueDate = !empty($input['due_date']) ? $input['due_date'] : null;

        if (empty($title)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Task title is required.']);
            exit();
        }

        $stmt = $db->prepare("
            INSERT INTO todos (user_id, title, description, priority, status, due_date)
            VALUES (?, ?, ?, ?, 'pending', ?)
        ");
        $stmt->execute([$userId, $title, $description ?: null, $priority, $dueDate]);
        $newId = (int)$db->lastInsertId();

        $getStmt = $db->prepare("SELECT * FROM todos WHERE id = ?");
        $getStmt->execute([$newId]);
        $newTodo = $getStmt->fetch();

        echo json_encode([
            'status' => 'success',
            'message' => 'Task created successfully.',
            'todo' => $newTodo
        ]);
        exit();
    }

    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed.']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
}
