<?php
/**
 * DailyTrack Database Connection Provider
 */

if (!defined('DAILYTRACK_SECURE')) {
    define('DAILYTRACK_SECURE', true);
}

function getDatabaseConnection() {
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $configPath = __DIR__ . '/config.php';
    if (!file_exists($configPath)) {
        // Fallback to example configuration if config.php doesn't exist
        $configPath = __DIR__ . '/config.example.php';
    }

    $config = require $configPath;
    $dbConfig = $config['db'];

    // Set timezone in PHP
    if (isset($config['app']['timezone'])) {
        date_default_timezone_set($config['app']['timezone']);
    }

    $dsn = sprintf(
        "mysql:host=%s;dbname=%s;charset=%s",
        $dbConfig['host'],
        $dbConfig['dbname'],
        $dbConfig['charset']
    );

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], $options);
        
        // Also set the session time_zone in MySQL to match PHP timezone if possible
        $now = new DateTime();
        $mins = $now->getOffset() / 60;
        $sgn = ($mins < 0) ? '-' : '+';
        $mins = abs($mins);
        $hrs = floor($mins / 60);
        $mins -= $hrs * 60;
        $offset = sprintf('%s%02d:%02d', $sgn, $hrs, $mins);
        $pdo->exec("SET time_zone='$offset';");
        
        return $pdo;
    } catch (PDOException $e) {
        // Throw exception to be handled by caller
        throw new Exception("Database connection failed: " . $e->getMessage());
    }
}
