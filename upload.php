<?php
/*
 * upload.php
 *
 * Skrypt obsługujący przesyłanie plików po stronie serwera. Tworzy
 * katalog z bieżącym znacznikiem czasu, kopiuje do niego wszystkie
 * przesłane pliki i zapisuje plik tekstowy z listą przesłanych
 * elementów (ścieżka względna i rozmiar w kilobajtach). Dodatkowe
 * parametry „paths[]" umożliwiają odtworzenie struktury folderów
 * przeciąganych elementów. Zwraca wynik w formacie JSON.
 */

header('Content-Type: application/json; charset=utf-8');

// ---------------------------------------------------------------------------
// Stałe konfiguracyjne
// ---------------------------------------------------------------------------

/** Maksymalny rozmiar pojedynczego pliku (50 MB). */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Dozwolone rozszerzenia plików (whitelist).
 * Dostosuj listę do potrzeb projektu.
 */
const ALLOWED_EXTENSIONS = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
    'pdf', 'txt', 'md', 'csv',
    'zip', 'tar', 'gz',
    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'mp3', 'mp4', 'ogg', 'wav',
    'html', 'css', 'js', 'json', 'xml', 'php',
];

// ---------------------------------------------------------------------------
// Pluginy
// ---------------------------------------------------------------------------

require_once __DIR__ . '/plugins/zip.php';
require_once __DIR__ . '/plugins/links.php';

$zipPlugin   = new ZipPlugin();
$linksPlugin = new LinksPlugin();

// ---------------------------------------------------------------------------
// Przygotowanie katalogów
// ---------------------------------------------------------------------------

$uploadDir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$timestamp = date('Ymd_His');
$targetDir = $uploadDir . DIRECTORY_SEPARATOR . $timestamp;
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0755, true);
}

$listPath   = $targetDir . DIRECTORY_SEPARATOR . 'file_list.txt';
$listHandle = fopen($listPath, 'w');

// ---------------------------------------------------------------------------
// Walidacja żądania
// ---------------------------------------------------------------------------

if (!isset($_FILES['files'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'No files uploaded']);
    exit;
}

// ---------------------------------------------------------------------------
// Przetwarzanie plików
// ---------------------------------------------------------------------------

$fileCount    = count($_FILES['files']['name']);
$savedPaths   = [];
$skipped      = [];

for ($i = 0; $i < $fileCount; $i++) {
    $originalName = $_FILES['files']['name'][$i];
    $tmpName      = $_FILES['files']['tmp_name'][$i];
    $size         = $_FILES['files']['size'][$i];
    $relativePath = isset($_POST['paths'][$i]) ? $_POST['paths'][$i] : $originalName;

    // --- Walidacja rozszerzenia ---
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    if (!in_array($ext, ALLOWED_EXTENSIONS, true)) {
        $skipped[] = ['name' => $originalName, 'reason' => 'forbidden_extension'];
        continue;
    }

    // --- Walidacja rozmiaru ---
    if ($size > MAX_FILE_SIZE) {
        $skipped[] = ['name' => $originalName, 'reason' => 'file_too_large'];
        continue;
    }

    // --- Sanityzacja ścieżki względnej (blokuje path traversal) ---
    $relativePath = str_replace('\\', '/', $relativePath);
    $relativePath = preg_replace('/\.\.\//', '', $relativePath);  // usuń ../
    $relativePath = preg_replace('/[^\w\/\-.]/', '_', $relativePath); // tylko bezpieczne znaki
    $relativePath = ltrim($relativePath, '/');
    if ($relativePath === '' || $relativePath === '.') {
        $relativePath = basename($originalName);
    }

    // --- Bezpieczna nazwa pliku ---
    $safeName = basename($relativePath);

    // --- Ustal katalog docelowy ---
    $targetPath = $targetDir;
    $dirPart    = dirname($relativePath);
    if ($dirPart && $dirPart !== '.') {
        $targetPath .= DIRECTORY_SEPARATOR . $dirPart;
        if (!is_dir($targetPath)) {
            mkdir($targetPath, 0755, true);
        }
    }
    $targetPath .= DIRECTORY_SEPARATOR . $safeName;

    // --- Przenieś plik ---
    if (is_uploaded_file($tmpName) && move_uploaded_file($tmpName, $targetPath)) {
        $sizeKb = round($size / 1024, 2);
        fwrite($listHandle, $relativePath . ' | ' . $sizeKb . " kB\n");
        $savedPaths[] = $targetPath;

        // Generuj token pobierania przez LinksPlugin
        $token = $linksPlugin->generateToken($targetPath);
        fwrite($listHandle, '  token: ' . $token . "\n");
    }
}

fclose($listHandle);

// ---------------------------------------------------------------------------
// Opcjonalne spakowanie wszystkich plików sesji do ZIP
// ---------------------------------------------------------------------------

$zipPath = null;
if (!empty($savedPaths)) {
    $zipPath = $targetDir . DIRECTORY_SEPARATOR . 'archive.zip';
    if (!$zipPlugin->createZip($savedPaths, $zipPath)) {
        $zipPath = null; // nie krytyczne — kontynuujemy
    }
}

// ---------------------------------------------------------------------------
// Odpowiedź JSON
// ---------------------------------------------------------------------------

echo json_encode([
    'status'       => 'success',
    'path'         => $timestamp,
    'saved'        => count($savedPaths),
    'skipped'      => $skipped,
    'archive'      => $zipPath ? $timestamp . '/archive.zip' : null,
]);
