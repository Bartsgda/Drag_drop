# Wtyczki (Plugins)

System drag‑and‑drop został zaprojektowany w sposób modularny, aby w przyszłości
rozszerzać jego możliwości poprzez wtyczki. Każda wtyczka powinna znajdować
się w katalogu `plugins` i zawierać własny plik (lub pliki) z logiką.

### Konwencja

- Pliki wtyczek napisane w PHP służą do manipulacji plikami po stronie
  serwera (np. szyfrowanie, kompresja, generowanie linków). W przyszłości
  można zaimplementować analogiczne wersje w JavaScript, jeżeli operacje
  mają być wykonywane po stronie klienta.
- Każda wtyczka powinna eksportować klasę lub funkcję o nazwie zgodnej z
  nazwą wtyczki (np. `EncryptionPlugin`) i udostępniać prosty interfejs,
  który może zostać wywołany w skrypcie `upload.php` przed zapisem plików.
- Wtyczki mogą być włączane/wyłączane poprzez konfigurację (np. w pliku
  `config.php` albo w przyszłych opcjach panelu administratora).

### Dostępne szkielety

#### encryption.php

Szkielet wtyczki szyfrującej pliki przed zapisaniem ich na serwerze. Obecnie
zawiera wyłącznie definicję klasy oraz przykładową metodę `encrypt`, która
przyjmuje zawartość pliku i powinna zwrócić zaszyfrowane dane. W przyszłości
można wypełnić tę funkcję implementacją szyfrowania (np. AES, RSA).

#### zip.php

Szkielet wtyczki kompresującej pliki do archiwum ZIP. Przewiduje się,
że wtyczka będzie w stanie utworzyć pojedyncze archiwum ZIP z zestawu
przesyłanych plików lub spakować każdy plik osobno. Można wykorzystać
wbudowane funkcje PHP (`ZipArchive`) lub zewnętrzne biblioteki w JavaScript.

#### links.php

Szkielet wtyczki generującej unikalne linki do pobierania przesłanych
plików. Taka wtyczka może wykorzystywać tokeny jednorazowe, ważne przez
określony czas, i zapisywać je w bazie danych. Następnie pliki mogą być
pobierane przez użytkowników bez potrzeby logowania.

### Jak rozpocząć pracę nad wtyczką

1. Skopiuj odpowiedni szablon z katalogu `plugins` i zmień jego nazwę,
   jeśli tworzysz nową wtyczkę.
2. Uzupełnij klasę lub funkcje o właściwą implementację.
3. Zarejestruj wtyczkę w pliku `upload.php` (lub w przyszłym pliku
   konfiguracyjnym), aby była wywoływana dla każdego przesyłanego pliku.
4. Dodaj odpowiednie testy oraz aktualizuj dokumentację.