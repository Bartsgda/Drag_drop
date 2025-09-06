<?php
/*
 * upload.php
 *
 * Skrypt obsługujący przesyłanie plików po stronie serwera. Tworzy
 * katalog z bieżącym znacznikiem czasu, kopiuje do niego wszystkie
 * przesłane pliki i zapisuje plik tekstowy z listą przesłanych
 * elementów (ścieżka względna i rozmiar w kilobajtach). Dodatkowe
 * parametry „paths[]” umożliwiają odtworzenie struktury folderów
 * przeciąganych elementów. Zwraca wynik w formacie JSON.
 */

header('Content-Type: application/json; charset=utf-8');

// Katalog, do którego będą zapisywane przesyłane pliki
$uploadDir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Utwórz unikalny katalog na podstawie bieżącego czasu (YYYYMMDD_HHMMSS)
$timestamp = date('Ymd_His');
$targetDir = $uploadDir . DIRECTORY_SEPARATOR . $timestamp;
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0755, true);
}

// Ścieżka do pliku z listą przesłanych elementów
$listPath = $targetDir . DIRECTORY_SEPARATOR . 'file_list.txt';
$listHandle = fopen($listPath, 'w');

// Sprawdź, czy przesłano jakiekolwiek pliki
if (!isset($_FILES['files'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'No files uploaded']);
    exit;
}

$fileCount = count($_FILES['files']['name']);

for ($i = 0; $i < $fileCount; $i++) {
    $name = basename($_FILES['files']['name'][$i]);
    $tmpName = $_FILES['files']['tmp_name'][$i];
    $size = $_FILES['files']['size'][$i];
    // Ścieżka względna przekazana z frontendu (może być pusta)
    $relativePath = isset($_POST['paths'][$i]) ? $_POST['paths'][$i] : $name;

    // Określ docelową ścieżkę na podstawie przekazanej względnej ścieżki
    $targetPath = $targetDir;
    if ($relativePath && $relativePath !== $name) {
        $dirPart = dirname($relativePath);
        if ($dirPart && $dirPart !== '.') {
            $targetPath .= DIRECTORY_SEPARATOR . $dirPart;
            if (!is_dir($targetPath)) {
                mkdir($targetPath, 0755, true);
            }
        }
        $targetPath .= DIRECTORY_SEPARATOR . $name;
    } else {
        $targetPath .= DIRECTORY_SEPARATOR . $name;
    }

    // Przenieś plik z katalogu tymczasowego do katalogu docelowego
    if (is_uploaded_file($tmpName)) {
        if (move_uploaded_file($tmpName, $targetPath)) {
            // Zapisz informację w liście: ścieżka i rozmiar w kB
            $line = $relativePath . ' | ' . round($size / 1024, 2) . " kB\n";
            fwrite($listHandle, $line);
        }
    }
}

fclose($listHandle);

// Zwróć pozytywny komunikat
echo json_encode(['status' => 'success', 'path' => $timestamp]);