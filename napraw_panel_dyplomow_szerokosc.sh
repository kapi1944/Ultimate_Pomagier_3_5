#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-.}"
cd "$REPO"

TARGET="src/moduly/dokumenty/generatory/dyplomy/widokDyplomow.css"

echo "==> Repo: $(pwd)"

if [[ ! -d .git ]]; then
  echo "BŁĄD: To nie jest katalog główny repozytorium Git."
  exit 1
fi

if [[ ! -f "$TARGET" ]]; then
  echo "BŁĄD: Nie znaleziono pliku: $TARGET"
  exit 1
fi

echo
echo "==> Stan Git przed zmianą"
git status -sb

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP=".git/backup-dyplomy-responsywny-panel-$STAMP"
mkdir -p "$BACKUP"
cp "$TARGET" "$BACKUP/widokDyplomow.css"

echo
echo "==> Kopia bezpieczeństwa: $BACKUP/widokDyplomow.css"

node <<'NODE'
const fs = require('fs');

const path = 'src/moduly/dokumenty/generatory/dyplomy/widokDyplomow.css';
let css = fs.readFileSync(path, 'utf8');

const oldBlock = `.uklad-aplikacji__kolumna-glowna:has(.dyplomy--panel-ustawien-otwarty) {
  margin-right: min(420px, calc(100vw - 22px));
  transition: margin-right 220ms ease;
}`;

const newBlock = `.dyplomy {
  transition: width 220ms ease;
}

.dyplomy--panel-ustawien-otwarty {
  width: calc(100% - var(--szerokosc-panelu-ustawien));
}`;

if (css.includes(oldBlock)) {
  css = css.replace(oldBlock, newBlock);
} else if (!css.includes('.dyplomy--panel-ustawien-otwarty {\n  width: calc(100% - var(--szerokosc-panelu-ustawien));')) {
  const anchor = `.dyplomy *,`;
  if (!css.includes(anchor)) {
    throw new Error('Nie znaleziono bezpiecznego miejsca do wstawienia poprawki.');
  }
  css = css.replace(
    anchor,
    `${newBlock}\n\n${anchor}`
  );
}

/*
 * Na bardzo wąskich ekranach nie odejmujemy szerokości panelu od treści,
 * bo pozostawiłoby to zbyt mały obszar roboczy. Panel może wtedy działać
 * jako nakładka.
 */
const responsiveBlock = `@media (max-width: 900px) {
  .dyplomy--panel-ustawien-otwarty {
    width: 100%;
  }
}`;

if (!css.includes(responsiveBlock)) {
  css += `\n\n${responsiveBlock}\n`;
}

fs.writeFileSync(path, css, 'utf8');
NODE

echo
echo "==> Zastosowano poprawkę."
echo "    Otwarty prawy panel dyplomu zmniejsza teraz szerokość samego widoku Dyplomów,"
echo "    zamiast polegać na selektorze rodzica :has(...), który po zmianach layoutu"
echo "    może już nie trafiać w faktyczny kontener strony."

echo
echo "==> Kontrola diff"
git diff -- "$TARGET"
git diff --check

echo
echo "==> Build"
npm run build

echo
echo "==> Gotowe."
echo "Sprawdź ręcznie Generator Dyplomów:"
echo "  1. panel zamknięty -> content zajmuje pełną dostępną szerokość,"
echo "  2. panel wysunięty -> formularz i podgląd zwężają się i nie wchodzą pod panel,"
echo "  3. panel zamknięty ponownie -> content wraca do pełnej szerokości."
echo
echo "Zmiana NIE została zacommitowana."
