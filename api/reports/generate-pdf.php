<?php
/**
 * DailyTrack PDF Report Generator API
 */

define('DAILYTRACK_SECURE', true);
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/config/session.php';
require_once dirname(__DIR__) . '/libs/fpdf.php';

// Initialize session
initSession();
$userId = getCurrentUserId();

// If not authenticated, redirect or show error
if ($userId === null) {
    http_response_code(401);
    echo "Unauthorized. Please log in.";
    exit();
}

try {
    $db = getDatabaseConnection();
    
    // Get user details
    $userStmt = $db->prepare("SELECT name, email FROM users WHERE id = ?");
    $userStmt->execute([$userId]);
    $user = $userStmt->fetch();
    
    // Parse filters
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $type = isset($_GET['type']) ? trim($_GET['type']) : '';
    $range = isset($_GET['range']) ? trim($_GET['range']) : '';
    $fromDate = isset($_GET['from_date']) ? trim($_GET['from_date']) : '';
    $toDate = isset($_GET['to_date']) ? trim($_GET['to_date']) : '';

    // Build query
    $query = "SELECT type, entry_date, entry_time, content, amount FROM entries WHERE user_id = :user_id";
    $params = [':user_id' => $userId];

    if (!empty($type) && $type !== 'All') {
        $query .= " AND type = :type";
        $params[':type'] = $type;
    }

    if (!empty($search)) {
        $query .= " AND content LIKE :search";
        $params[':search'] = '%' . $search . '%';
    }

    $periodLabel = 'All Time';

    if ($range === 'today') {
        $todayStr = date('Y-m-d');
        $query .= " AND entry_date = :today";
        $params[':today'] = $todayStr;
        $periodLabel = date('d M Y');
    } elseif ($range === 'yesterday') {
        $yesterdayStr = date('Y-m-d', strtotime('-1 day'));
        $query .= " AND entry_date = :yesterday";
        $params[':yesterday'] = $yesterdayStr;
        $periodLabel = date('d M Y', strtotime('-1 day'));
    } elseif ($range === 'this_week') {
        $startWeek = date('Y-m-d', strtotime('-6 days'));
        $todayStr = date('Y-m-d');
        $query .= " AND entry_date >= :start_week AND entry_date <= :today";
        $params[':start_week'] = $startWeek;
        $params[':today'] = $todayStr;
        $periodLabel = date('d M Y', strtotime('-6 days')) . ' - ' . date('d M Y');
    } elseif ($range === 'this_month') {
        $startMonth = date('Y-m-d', strtotime('-29 days'));
        $todayStr = date('Y-m-d');
        $query .= " AND entry_date >= :start_month AND entry_date <= :today";
        $params[':start_month'] = $startMonth;
        $params[':today'] = $todayStr;
        $periodLabel = date('d M Y', strtotime('-29 days')) . ' - ' . date('d M Y');
    } elseif ($range === 'custom' && !empty($fromDate) && !empty($toDate)) {
        $query .= " AND entry_date >= :from_date AND entry_date <= :to_date";
        $params[':from_date'] = $fromDate;
        $params[':to_date'] = $toDate;
        $periodLabel = date('d M Y', strtotime($fromDate)) . ' - ' . date('d M Y', strtotime($toDate));
    }

    $query .= " ORDER BY entry_date ASC, entry_time ASC";
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $entries = $stmt->fetchAll();

    // Aggregations
    $totalEntries = count($entries);
    $studyEntries = 0;
    $skillEntries = 0;
    $workEntries = 0;
    $personalEntries = 0;
    $expenseEntries = 0;
    $totalExpenses = 0.0;

    $groupedEntries = [];

    foreach ($entries as $entry) {
        $t = $entry['type'];
        if ($t === 'Study') $studyEntries++;
        elseif ($t === 'Skill') $skillEntries++;
        elseif ($t === 'Work') $workEntries++;
        elseif ($t === 'Personal') $personalEntries++;
        elseif ($t === 'Expense') {
            $expenseEntries++;
            $totalExpenses += floatval($entry['amount']);
        }

        $dateKey = date('d F Y', strtotime($entry['entry_date']));
        if (!isset($groupedEntries[$dateKey])) {
            $groupedEntries[$dateKey] = [];
        }
        $groupedEntries[$dateKey][] = $entry;
    }

    // -------------------------------------------------------------
    // FPDF Layout Setup
    // -------------------------------------------------------------
    class PDF extends FPDF {
        function Header() {
            // Title block
            $this->SetFont('Arial', 'B', 16);
            $this->SetTextColor(37, 99, 235); // primary color
            $this->Cell(0, 10, 'DAILYTRACK', 0, 1, 'L');
            
            $this->SetFont('Arial', '', 10);
            $this->SetTextColor(107, 114, 128); // muted gray
            $this->Cell(0, 5, 'Activity Report', 0, 1, 'L');
            
            $this->Line(10, 27, 200, 27);
            $this->Ln(8);
        }

        function Footer() {
            $this->SetY(-15);
            $this->SetFont('Arial', 'I', 8);
            $this->SetTextColor(156, 163, 175);
            $this->Cell(0, 10, 'Page ' . $this->PageNo() . ' | Generated automatically by DailyTrack', 0, 0, 'C');
        }
    }

    $pdf = new PDF('P', 'mm', 'A4');
    $pdf->AliasNbPages();
    $pdf->AddPage();
    $pdf->SetMargins(15, 15, 15);

    // Meta details
    $pdf->SetFont('Arial', 'B', 11);
    $pdf->SetTextColor(31, 41, 55);
    $pdf->Cell(30, 6, 'User:', 0, 0);
    $pdf->SetFont('Arial', '', 11);
    $pdf->Cell(0, 6, $user['name'] . ' (' . $user['email'] . ')', 0, 1);

    $pdf->SetFont('Arial', 'B', 11);
    $pdf->Cell(30, 6, 'Period:', 0, 0);
    $pdf->SetFont('Arial', '', 11);
    $pdf->Cell(0, 6, $periodLabel, 0, 1);

    $pdf->SetFont('Arial', 'B', 11);
    $pdf->Cell(30, 6, 'Generated:', 0, 0);
    $pdf->SetFont('Arial', '', 11);
    $pdf->Cell(0, 6, date('d M Y H:i:s'), 0, 1);
    $pdf->Ln(6);

    // -------------------------------------------------------------
    // Summary block table
    // -------------------------------------------------------------
    $pdf->SetFont('Arial', 'B', 12);
    $pdf->SetFillColor(243, 244, 246);
    $pdf->Cell(0, 8, 'SUMMARY STATISTICS', 0, 1, 'L', true);
    $pdf->Ln(2);

    $pdf->SetFont('Arial', '', 10);
    
    // Grid alignment helper
    $wCol = 55;
    $hCell = 6;
    
    $pdf->Cell($wCol, $hCell, 'Total Entries: ' . $totalEntries, 0, 0);
    $pdf->Cell($wCol, $hCell, 'Work Entries: ' . $workEntries, 0, 0);
    $pdf->Cell($wCol, $hCell, 'Study Entries: ' . $studyEntries, 0, 1);

    $pdf->Cell($wCol, $hCell, 'Skill Entries: ' . $skillEntries, 0, 0);
    $pdf->Cell($wCol, $hCell, 'Personal Entries: ' . $personalEntries, 0, 0);
    $pdf->Cell($wCol, $hCell, 'Expense Entries: ' . $expenseEntries, 0, 1);

    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(0, $hCell, 'Total Expenses: INR ' . number_format($totalExpenses, 2), 0, 1);
    $pdf->Ln(8);

    // -------------------------------------------------------------
    // Grouped logs list
    // -------------------------------------------------------------
    $pdf->SetFont('Arial', 'B', 12);
    $pdf->SetFillColor(243, 244, 246);
    $pdf->Cell(0, 8, 'ACTIVITY HISTORY LOG', 0, 1, 'L', true);
    $pdf->Ln(4);

    if (empty($groupedEntries)) {
        $pdf->SetFont('Arial', 'I', 10);
        $pdf->Cell(0, 6, 'No records found matching the specified timeframe/filters.', 0, 1);
    } else {
        foreach ($groupedEntries as $date => $dayEntries) {
            $pdf->SetFont('Arial', 'B', 10);
            $pdf->SetTextColor(37, 99, 235);
            $pdf->Cell(0, 6, $date, 0, 1);
            $pdf->SetTextColor(31, 41, 55);
            $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
            $pdf->Ln(2);

            foreach ($dayEntries as $entry) {
                // Time
                $timeDisplay = date('h:i A', strtotime($entry['entry_time']));
                
                $pdf->SetFont('Arial', 'B', 9);
                $pdf->Cell(20, 5, $timeDisplay, 0, 0);
                
                // Badge category
                $badge = strtoupper($entry['type']);
                if ($entry['type'] === 'Expense') {
                    $badge .= ' (INR ' . number_format($entry['amount'], 2) . ')';
                }
                
                $pdf->SetFont('Arial', 'I', 8);
                $pdf->SetTextColor(75, 85, 99);
                $pdf->Cell(50, 5, '[' . $badge . ']', 0, 0);
                
                // Text wrap content
                $pdf->SetTextColor(31, 41, 55);
                $pdf->SetFont('Arial', '', 9);
                
                // MultiCell handles text wrapper
                $x = $pdf->GetX();
                $y = $pdf->GetY();
                $pdf->MultiCell(110, 5, $entry['content'], 0, 'L');
                $pdf->SetY($pdf->GetY() + 2);
            }
            $pdf->Ln(4);
        }
    }

    // Clear buffer outputs and generate stream
    ob_end_clean();
    $pdf->Output('I', 'DailyTrack_Activity_Report.pdf');
} catch (Exception $e) {
    http_response_code(500);
    echo "Fatal error generating PDF: " . $e->getMessage();
}
