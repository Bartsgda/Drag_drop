<?php
/*
 * links.php
 *
 * Wtyczka generująca jednorazowe tokeny pobierania dla przesłanych
 * plików. Tokeny są ważne przez 24 godziny i przechowywane w pliku
 * tokens.json w katalogu nadrzędnym (obok upload.php).
 *
 * Aby udostępnić plik przez token, utwórz skrypt download.php, który
 * weryfikuje token za pomocą validateToken() i odsyła plik.
 */

class LinksPlugin
{
    /** Ścieżka do pliku JSON przechowującego tokeny. */
    private $storePath;

    /** Czas ważności tokenu w sekundach (domyślnie 24 h). */
    private $ttl;

    public function __construct($storePath = null, $ttl = 86400)
    {
        $this->storePath = $storePath ?: __DIR__ . '/../tokens.json';
        $this->ttl       = (int) $ttl;
    }

    /**
     * Generuje unikalny token dla pliku i zapisuje go w tokens.json.
     *
     * @param string $filePath Absolutna ścieżka do pliku
     * @return string Wygenerowany token (32 znaki hex)
     */
    public function generateToken($filePath)
    {
        $token = bin2hex(random_bytes(16)); // 32 znaki hex
        $data  = $this->load();

        $data[$token] = [
            'path'    => $filePath,
            'expires' => time() + $this->ttl,
        ];

        $this->save($data);
        return $token;
    }

    /**
     * Weryfikuje token i zwraca ścieżkę do powiązanego pliku.
     * Usuwa token po pierwszym użyciu (jednorazowy).
     *
     * @param string $token
     * @return string|false Ścieżka do pliku lub false gdy token jest niepoprawny/wygasły
     */
    public function validateToken($token)
    {
        $token = preg_replace('/[^a-f0-9]/', '', $token); // bezpieczna sanityzacja
        if (strlen($token) !== 32) {
            return false;
        }

        $data = $this->load();

        if (!isset($data[$token])) {
            return false;
        }

        $entry = $data[$token];

        // Sprawdź wygaśnięcie
        if (time() > $entry['expires']) {
            unset($data[$token]);
            $this->save($data);
            return false;
        }

        $filePath = $entry['path'];

        // Usuń token (jednorazowy)
        unset($data[$token]);
        $this->save($data);

        return is_file($filePath) ? $filePath : false;
    }

    /**
     * Czyści wygasłe tokeny z pliku JSON.
     * Można wywoływać periodycznie (np. w cronie).
     */
    public function purgeExpired()
    {
        $data = $this->load();
        $now  = time();
        foreach ($data as $token => $entry) {
            if ($now > $entry['expires']) {
                unset($data[$token]);
            }
        }
        $this->save($data);
    }

    // -----------------------------------------------------------------------
    // Prywatne
    // -----------------------------------------------------------------------

    private function load()
    {
        if (!file_exists($this->storePath)) {
            return [];
        }
        $json = file_get_contents($this->storePath);
        return $json ? (json_decode($json, true) ?: []) : [];
    }

    private function save(array $data)
    {
        file_put_contents(
            $this->storePath,
            json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
            LOCK_EX
        );
    }
}
