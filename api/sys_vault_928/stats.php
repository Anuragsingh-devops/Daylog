<?php
/**
 * DailyTrack Secret System Management Statistics API
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
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed.']);
    exit();
}

$adminId = requireAdmin();

try {
    $db = getDatabaseConnection();

    // User counts
    $userStats = $db->query("
        SELECT 
            COUNT(*) as total_users,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users,
            SUM(CASE WHEN status = 'disabled' THEN 1 ELSE 0 END) as disabled_users,
            SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users
        FROM users
    ")->fetch();

    // Entry counts
    $entryStats = $db->query("
        SELECT 
            COUNT(*) as total_entries,
            SUM(CASE WHEN entry_date = CURRENT_DATE() THEN 1 ELSE 0 END) as today_entries,
            SUM(CASE WHEN entry_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as week_entries
        FROM entries
    ")->fetch();

    // Recent activity log (latest 10 entries across the system)
    $recentActivityStmt = $db->query("
        SELECT 
            e.id, 
            e.type, 
            e.entry_date, 
            e.entry_time, 
            e.content, 
            e.amount, 
            e.created_at,
            u.id as user_id, 
            u.name as user_name, 
            u.email as user_email
        FROM entries e
        JOIN users u ON e.user_id = u.id
        ORDER BY e.created_at DESC
        LIMIT 10
    ");
    $recentActivity = $recentActivityStmt->fetchAll();

    echo json_encode([
        'status' => 'success',
        'stats' => [
            'total_users' => (int)($userStats['total_users'] ?? 0),
            'active_users' => (int)($userStats['active_users'] ?? 0),
            'disabled_users' => (int)($userStats['disabled_users'] ?? 0),
            'admin_users' => (int)($userStats['admin_users'] ?? 0),
            'total_entries' => (int)($entryStats['total_entries'] ?? 0),
            'today_entries' => (int)($entryStats['today_entries'] ?? 0),
            'week_entries' => (int)($entryStats['week_entries'] ?? 0)
        ],
        'recent_activity' => $recentActivity
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
