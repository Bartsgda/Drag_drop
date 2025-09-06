<?php
/*
 * zip.php
 *
 * Szkielet wtyczki kompresującej pliki do archiwów ZIP. W przyszłości
 * można go wykorzystać do spakowania jednego lub wielu plików przed
 * zapisaniem na serwerze albo przed udostępnieniem ich użytkownikom.
 */

class ZipPlugin
{
    /**
     * Tworzy archiwum ZIP z podanych plików. W domyślnej implementacji
     * funkcja ta powinna przyjmować tablicę ścieżek plików i nazwę
     * docelowego archiwum, a następnie spakować je przy użyciu klasy
     * ZipArchive.
     *
     * @param array $filePaths Tablica absolutnych ścieżek do plików
     * @param string $archivePath Ścieżka do wynikowego pliku ZIP
     * @return bool True w przypadku sukcesu, false w razie błędu
     */
    public function createZip(array $filePaths, $archivePath)
    {
        // TODO: implement zip creation logic using ZipArchive
        return false;
    }
}