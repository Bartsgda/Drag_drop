<?php
/*
 * links.php
 *
 * Szkielet wtyczki generującej jednorazowe lub krótkotrwałe linki
 * pobierania dla przesłanych plików. Implementacja powinna
 * przechowywać wygenerowane tokeny w bazie danych lub w pliku
 * konfiguracyjnym, weryfikować ich ważność i umożliwiać pobieranie
 * określonych zasobów na podstawie tokenu.
 */

class LinksPlugin
{
    /**
     * Generuje unikalny token dla pliku i zapisuje go w bazie danych.
     * Wartość tokenu może zawierać informacje o czasie ważności.
     *
     * @param string $filePath Ścieżka do pliku, dla którego generujemy link
     * @return string Wygenerowany token
     */
    public function generateToken($filePath)
    {
        // TODO: implement token generation and storage
        return '';
    }

    /**
     * Sprawdza poprawność i ważność tokenu oraz zwraca ścieżkę do
     * powiązanego pliku. Jeśli token jest niepoprawny lub wygasł,
     * funkcja powinna zwrócić false.
     *
     * @param string $token
     * @return string|false
     */
    public function validateToken($token)
    {
        // TODO: implement token validation logic
        return false;
    }
}