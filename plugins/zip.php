<?php
/*
 * zip.php
 *
 * Wtyczka kompresująca pliki do archiwum ZIP przy użyciu wbudowanej
 * klasy ZipArchive. Wywołaj createZip() po pomyślnym zapisaniu plików
 * w upload.php, aby udostępnić użytkownikom gotowe archiwum całej sesji.
 */

class ZipPlugin
{
    /**
     * Tworzy archiwum ZIP z podanej listy plików.
     *
     * @param array  $filePaths   Tablica absolutnych ścieżek do plików
     * @param string $archivePath Absolutna ścieżka do wynikowego pliku ZIP
     * @return bool True w przypadku sukcesu, false w razie błędu
     */
    public function createZip(array $filePaths, $archivePath)
    {
        if (!class_exists('ZipArchive')) {
            error_log('ZipPlugin: rozszerzenie ZipArchive nie jest dostępne.');
            return false;
        }

        $zip = new ZipArchive();
        $result = $zip->open($archivePath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        if ($result !== true) {
            error_log('ZipPlugin: nie można utworzyć archiwum: ' . $archivePath . ' (kod: ' . $result . ')');
            return false;
        }

        foreach ($filePaths as $path) {
            if (!is_file($path) || !is_readable($path)) {
                continue;
            }
            // Użyj tylko nazwy pliku, bez pełnej ścieżki serwera
            $zip->addFile($path, basename($path));
        }

        return $zip->close();
    }
}
