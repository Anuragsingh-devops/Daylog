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
          `recurrence` ENUM('none', 'daily', 'weekly', 'monthly') DEFAULT 'none' NOT NULL,
          `due_date` DATE NULL,
          `completed_at` TIMESTAMP NULL,
          `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
          INDEX `idx_todos_user_status` (`user_id`, `status`),
          INDEX `idx_todos_user_due` (`user_id`, `due_date`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // Add recurrence column if existing table doesn't have it
    try {
        $db->exec("ALTER TABLE `todos` ADD COLUMN `recurrence` ENUM('none', 'daily', 'weekly', 'monthly') DEFAULT 'none' NOT NULL AFTER `status`");
    } catch (Exception $e) {
        // Column already exists, safe to ignore
    }

    $method = $_SERVER['REQUEST_METHOD'];

    // 1. GET: List todos with filters and stats
    if ($method === 'GET') {
        $status = isset($_GET['status']) ? trim($_GET['status']) : 'all';
        $priority = isset($_GET['priority']) ? trim($_GET['priority']) : 'all';
        $dateFilter = isset($_GET['filter']) ? trim($_GET['filter']) : 'all';
        $recurrence = isset($_GET['recurrence']) ? trim($_GET['recurrence']) : 'all';
        $month = isset($_GET['month']) ? trim($_GET['month']) : '';
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';

        $query = "SELECT * FROM todos WHERE user_id = :user_id";
        $params = [':user_id' => $userId];

        if (!empty($month) && $month !== 'all') {
            $query .= " AND (due_date LIKE :month_pattern OR (due_date IS NULL AND created_at LIKE :month_created_pattern))";
            $params[':month_pattern'] = $month . '-%';
            $params[':month_created_pattern'] = $month . '-%';
        }

        if ($status === 'pending' || $status === 'completed') {
            $query .= " AND status = :status";
            $params[':status'] = $status;
        }

        if (in_array($priority, ['low', 'medium', 'high'])) {
            $query .= " AND priority = :priority";
            $params[':priority'] = $priority;
        }

        if ($dateFilter === 'today') {
            $query .= " AND due_date = CURDATE()";
        } elseif ($dateFilter === 'upcoming') {
            $query .= " AND due_date > CURDATE()";
        } elseif ($dateFilter === 'overdue') {
            $query .= " AND due_date < CURDATE() AND status = 'pending'";
        } elseif ($dateFilter === 'recurring' || $recurrence === 'recurring') {
            $query .= " AND recurrence != 'none'";
        }

        if ($recurrence === 'monthly') {
            $query .= " AND recurrence = 'monthly'";
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

        // Calculate stats for the active view
        $statsQuery = "
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN due_date = CURDATE() AND status = 'pending' THEN 1 ELSE 0 END) as today_pending,
                SUM(CASE WHEN due_date < CURDATE() AND status = 'pending' THEN 1 ELSE 0 END) as overdue,
                SUM(CASE WHEN recurrence != 'none' AND status = 'pending' THEN 1 ELSE 0 END) as recurring
            FROM todos
            WHERE user_id = :user_id
        ";
        $statsParams = [':user_id' => $userId];
        if (!empty($month) && $month !== 'all') {
            $statsQuery .= " AND (due_date LIKE :month_pattern OR (due_date IS NULL AND created_at LIKE :month_created_pattern))";
            $statsParams[':month_pattern'] = $month . '-%';
            $statsParams[':month_created_pattern'] = $month . '-%';
        }

        $statsStmt = $db->prepare($statsQuery);
        $statsStmt->execute($statsParams);
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
                'recurring' => (int)($stats['recurring'] ?? 0),
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

        // A. TOGGLE TASK COMPLETION (with smart recurrence auto-rollover)
        if ($action === 'toggle') {
            $id = (int)($input['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Task ID is required.']);
                exit();
            }

            // Get current status & details
            $checkStmt = $db->prepare("SELECT * FROM todos WHERE id = ? AND user_id = ?");
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

            $nextTodo = null;
            // If completing a recurring task, automatically generate next cycle
            if ($newStatus === 'completed' && !empty($current['recurrence']) && $current['recurrence'] !== 'none') {
                $rec = $current['recurrence'];
                $baseDate = !empty($current['due_date']) ? $current['due_date'] : date('Y-m-d');
                $nextDueDate = null;

                if ($rec === 'monthly') {
                    $nextDueDate = date('Y-m-d', strtotime('+1 month', strtotime($baseDate)));
                } elseif ($rec === 'weekly') {
                    $nextDueDate = date('Y-m-d', strtotime('+1 week', strtotime($baseDate)));
                } elseif ($rec === 'daily') {
                    $nextDueDate = date('Y-m-d', strtotime('+1 day', strtotime($baseDate)));
                }

                if ($nextDueDate) {
                    $nextStmt = $db->prepare("
                        INSERT INTO todos (user_id, title, description, priority, status, recurrence, due_date)
                        VALUES (?, ?, ?, ?, 'pending', ?, ?)
                    ");
                    $nextStmt->execute([
                        $userId,
                        $current['title'],
                        $current['description'],
                        $current['priority'],
                        $rec,
                        $nextDueDate
                    ]);
                    $nextId = (int)$db->lastInsertId();

                    $getStmt = $db->prepare("SELECT * FROM todos WHERE id = ?");
                    $getStmt->execute([$nextId]);
                    $nextTodo = $getStmt->fetch();
                }
            }

            echo json_encode([
                'status' => 'success',
                'message' => $nextTodo ? "Task completed! Next {$current['recurrence']} cycle scheduled for {$nextTodo['due_date']}." : 'Task status updated.',
                'new_status' => $newStatus,
                'completed_at' => $completedAt,
                'next_todo' => $nextTodo
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
            $recurrence = in_array($input['recurrence'] ?? '', ['none', 'daily', 'weekly', 'monthly']) ? $input['recurrence'] : 'none';
            $dueDate = !empty($input['due_date']) ? $input['due_date'] : null;

            if (!$id || empty($title)) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Task ID and Title are required.']);
                exit();
            }

            $stmt = $db->prepare("
                UPDATE todos 
                SET title = ?, description = ?, priority = ?, recurrence = ?, due_date = ? 
                WHERE id = ? AND user_id = ?
            ");
            $stmt->execute([$title, $description ?: null, $priority, $recurrence, $dueDate, $id, $userId]);

            echo json_encode(['status' => 'success', 'message' => 'Task updated.']);
            exit();
        }

        // D. CREATE NEW TASK (Default)
        $title = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
        $priority = in_array($input['priority'] ?? '', ['low', 'medium', 'high']) ? $input['priority'] : 'medium';
        $recurrence = in_array($input['recurrence'] ?? '', ['none', 'daily', 'weekly', 'monthly']) ? $input['recurrence'] : 'none';
        $dueDate = !empty($input['due_date']) ? $input['due_date'] : null;

        if (empty($title)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Task title is required.']);
            exit();
        }

        $stmt = $db->prepare("
            INSERT INTO todos (user_id, title, description, priority, status, recurrence, due_date)
            VALUES (?, ?, ?, ?, 'pending', ?, ?)
        ");
        $stmt->execute([$userId, $title, $description ?: null, $priority, $recurrence, $dueDate]);
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
