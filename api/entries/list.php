<?php
/**
 * DailyTrack List Entries API
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

$dateFilter = isset($_GET['date']) ? trim($_GET['date']) : '';
$rangeFilter = isset($_GET['range']) ? trim($_GET['range']) : '';
$typeFilter = isset($_GET['type']) ? trim($_GET['type']) : '';

try {
    $db = getDatabaseConnection();

    // Base query restricting by user ownership
    $query = "SELECT id, user_id, type, entry_date, entry_time, content, amount, created_at FROM entries WHERE user_id = :user_id";
    $params = [':user_id' => $userId];

    // Filter by type if provided and valid
    if (!empty($typeFilter) && $typeFilter !== 'All') {
        $query .= " AND type = :type";
        $params[':type'] = $typeFilter;
    }

    // Filter by date or range
    if ($rangeFilter === 'all') {
        // No date filters, return everything
    } elseif (!empty($dateFilter) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFilter)) {
        $query .= " AND entry_date = :entry_date";
        $params[':entry_date'] = $dateFilter;
    } else {
        // Default: return today's entries
        $todayStr = date('Y-m-d');
        $query .= " AND entry_date = :entry_date";
        $params[':entry_date'] = $todayStr;
    }

    // Sort order: most recent first
    $query .= " ORDER BY entry_date DESC, entry_time DESC, id DESC";

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $entries = $stmt->fetchAll();

    // Format fields (amount as float or null, id/user_id as int)
    foreach ($entries as &$entry) {
        $entry['id'] = (int)$entry['id'];
        $entry['user_id'] = (int)$entry['user_id'];
        if ($entry['amount'] !== null) {
            $entry['amount'] = (float)$entry['amount'];
        }
    }

    echo json_encode([
        'status' => 'success',
        'entries' => $entries
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
