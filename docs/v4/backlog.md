# Backlog V4

## Plan tygodniowy Pulpitu

Audyt V4-04, 17.10.2026: WidokPulpitu obsługuje wskazany dzień, nawigację daty i dobową oś czasu. W src/moduly/zamkniete/pulpit nie istnieje plan aktualnego i trzech kolejnych tygodni ani mechanizm animowanego rozwijania/zamykania dnia. Zgodnie z poleceniem nie dodano w tym liftingu logiki kalendarza. Zakres przyszłego osobnego zadania: model prezentacji czterech tygodni oparty na istniejących regułach dat, kafelki dni i symetryczna animacja otwierania/zamykania z reduced-motion.

## Kontrola obrazowa

Chrome testowy udostępnia DOM i sterowanie, lecz zrzuty Page.captureScreenshot przekraczają limit czasu. Kontrolę obrazową powłoki, logowania i Pulpitu należy uzupełnić po przywróceniu tej funkcji; raporty rozróżniają testy interakcji/geometrii od oceny zrzutów.
