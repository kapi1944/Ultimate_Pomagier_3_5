# E4 — uruchomienie bramy i zakres synchronizacji

Bramę HTTPS można uruchomić z dotychczasową usługą kont Rust. Web korzysta z tej samej bazy kont i tego samego mechanizmu wydawania oraz unieważniania sesji. Poświadczenia trafiają do usługi kont przez połączenie na adresie pętli zwrotnej. Przeglądarka otrzymuje ciasteczko `HttpOnly`, `Secure`, `SameSite=Strict` z prefiksem `__Host-`. Operacje kont wymagają poprawnego originu i nagłówka `X-Pomagier-Konta`. Pierwszą konfigurację kont wykonuje operator na serwerze.

## Uruchomienie na serwerze testowym

1. Zapewnij Node.js 24, Rust, prywatny katalog danych, nazwę DNS oraz ważny certyfikat TLS dla tej nazwy. Ogranicz dostęp do serwera testowego do osób uczestniczących w odbiorze.
2. Zbuduj frontend poleceniem `npm run build`.
3. Przygotuj istniejącą bazę kont z zachowaniem ID. Do przeniesienia SQLite użyj spójnej kopii bazy, wykonanej mechanizmem backupu SQLite albo po zatrzymaniu usługi i potwierdzeniu stanu dziennika WAL. Gdy dostępna jest wyłącznie kopia kartoteki, istniejące polecenie `importuj` zachowuje ID i wymaga ustawienia haseł. Przechowuj bazę poza katalogiem `dist`.
4. Uruchom proces `pomagier-konta <ścieżka-do-bazy> serwuj <ścieżka-do-dist>` na tym samym hoście co brama. Usługa kont nasłuchuje na `127.0.0.1:47831`.
5. Ustaw `POMAGIER_ORIGIN_HTTPS` na dokładny origin z DNS i portem, bez końcowego ukośnika. Ustaw `POMAGIER_TLS_CERT` na ścieżkę do pliku PEM z łańcuchem certyfikatu, a `POMAGIER_TLS_KEY` na ścieżkę do prywatnego klucza PEM. Ogranicz odczyt klucza do konta procesu.
6. Uruchom `node serwer/uruchomHttps.mjs`. Domyślny adres nasłuchu to `127.0.0.1`. Aby udostępnić usługę urządzeniom testowym, ustaw `POMAGIER_NASLUCH` na adres interfejsu serwera i zezwól na ruch HTTPS do właściwego portu. Port usługi kont pozostaje dostępny tylko lokalnie.
7. Sprawdź logowanie, ponowne otwarcie podstrony, wylogowanie i odrzucenie wygasłej sesji. Użyj danych testowych, osobnych profili przeglądarki dla poszczególnych kont i ważnego certyfikatu. Dane aplikacji są obecnie przypisane do profilu przeglądarki, więc zmiana konta w tym samym profilu nie zapewnia izolacji danych lokalnych.

## Dane i kopia przed migracją

W ustawieniach danych wybierz „Pobierz kopię migracyjną E4”. Plik zawiera lokalny rejestr i pozostałe trwałe dane aplikacji oraz zdjęcia paczek z IndexedDB. Przechowuj go w prywatnym miejscu ze względu na dane dokumentów i zdjęcia. „Przeanalizuj kopię E4” weryfikuje sumy SHA-256, liczy dokumenty i wpisy historii oraz wskazuje brakujące i archiwalne zdjęcia. Powtórz analizę pliku na osobnym profilu testowym. Eksport wykonuj po zakończeniu edycji i przesyłania zdjęć.

Relacyjny adapter `serwer/dane/magazynSqlite.mjs` obsługuje partie zapisów, porównanie wersji bazowych, ponowienia operacji i historię z identyfikatorem aktora. Używa SQLite na jednym hoście. Pozostaje odłączony od żądań sieciowych do czasu wdrożenia autoryzacji rekordów i reguł domenowych po stronie serwera.

Do uruchomienia synchronizacji potrzebne są jeszcze autoryzowane API danych, adaptery klientów Windows, Android i Web, lokalna kolejka zmian, prywatny magazyn zdjęć i serwerowe zatwierdzanie paczki. Analiza kopii dotyczy pliku źródłowego. Porównanie z bazą docelową, import i odtworzenie po migracji wymagają ukończenia tych elementów. Produkcyjne kody QR wymagają odbioru na dwóch niezależnych urządzeniach.
