<?php
/**
 * DailyTrack Health Check and Configuration Status API
 */

define('DAILYTRACK_SECURE', true);
require_once __DIR__ . '/config/database.php';

// Load config
$config = require __DIR__ . '/config/config.php';
$origin = $config['app']['cors_allowed_origin'] ?? '*';

// Handle CORS
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$response = [
    'status' => 'success',
    'timestamp' => time(),
    'local_time' => date('Y-m-d H:i:s'),
    'php_version' => PHP_VERSION,
    'timezone' => date_default_timezone_get(),
    'environment' => $config['app']['env'] ?? 'unknown',
    'database' => [
        'connected' => false,
        'message' => 'Not tested'
    ]
];

try {
    $db = getDatabaseConnection();
    $response['database']['connected'] = true;
    $response['database']['message'] = 'Connected successfully';
} catch (Exception $e) {
    $response['status'] = 'warning';
    $response['database']['connected'] = false;
    $response['database']['message'] = $e->getMessage();
}

echo json_encode($response, JSON_PRETTY_PRINT);
