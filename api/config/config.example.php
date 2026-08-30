<?php
/**
 * DailyTrack Configuration Template
 * Rename this file to config.php or config.local.php and fill in your details.
 */

// Prevent direct access
if (!defined('DAILYTRACK_SECURE')) {
    http_response_code(403);
    exit('Forbidden');
}

return [
    'db' => [
        'host' => 'localhost',
        'dbname' => 'dailytrack_db',
        'username' => 'dailytrack_user',
        'password' => 'your_secure_password_here',
        'charset' => 'utf8mb4'
    ],
    'app' => [
        'env' => 'development', // 'development' or 'production'
        'timezone' => 'Asia/Kolkata', // Set to user's timezone, e.g. UTC, Asia/Kolkata, etc.
        'cors_allowed_origin' => 'http://localhost:5173' // Local React dev server origin
    ]
];
