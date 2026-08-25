#!/usr/bin/env bash
set -Eeuo pipefail

# Ultimate Pomagier — poprawka typowania formularza edycji miniatur
# BEZ CODEXA / BEZ PYTHONA
#
# Uruchom:
#   bash ./napraw_typ_formularza_miniatury.sh

die() { printf '\n[BŁĄD] %s\n' "$*" >&2; exit 1; }
note() { printf '\n==> %s\n' "$*"; }

command -v git >/dev/null 2>&1 || die "Nie znaleziono git."
command -v node >/dev/null 2>&1 || die "Nie znaleziono node."
command -v npm >/dev/null 2>&1 || die "Nie znaleziono npm."

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "Uruchom skrypt wewnątrz repozytorium Git."
cd "$ROOT"

FILE="src/moduly/zamkniete/pulpit/WidokPulpitu.tsx"
[[ -f "$FILE" ]] || die "Brak pliku $FILE"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/.git/backup-fix-typ-miniatury-$STAMP"
mkdir -p "$BACKUP"
cp "$FILE" "$BACKUP/WidokPulpitu.tsx"

note "Naprawiam pojedynczy błąd typowania settera formularza edycji."

node <<'NODE'
const fs = require('fs');

const path = 'src/moduly/zamkniete/pulpit/WidokPulpitu.tsx';
let text = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

const oldText = `          ustawFormularz={ustawFormularzEdycji}
`;

const newText = `          ustawFormularz={(zmiana) => ustawFormularzEdycji((obecny) => {
            if (!obecny) return obecny
            return typeof zmiana === 'function' ? zmiana(obecny) : zmiana
          })}
`;

if (text.includes(newText.trim())) {
  console.log('[JUŻ BYŁO] Poprawka typowania jest już obecna.');
  process.exit(0);
}

const count = text.split(oldText).length - 1;
if (count !== 1) {
  throw new Error(`Oczekiwano dokładnie jednego ustawFormularz={ustawFormularzEdycji}, znaleziono: ${count}`);
}

text = text.replace(oldText, newText);
fs.writeFileSync(path, text, 'utf8');

console.log('[DODANO] Bezpieczny adapter SetStateAction dla nullable formularza edycji.');
NODE

VALIDATION_FAILED=0

run_gate() {
  local label="$1"
  shift
  note "$label"
  if "$@"; then
    printf '[OK] %s\n' "$label"
  else
    printf '[NIEPOWODZENIE] %s\n' "$label" >&2
    VALIDATION_FAILED=1
  fi
}

run_gate "npm test" npm test
run_gate "npm run lint" npm run lint
run_gate "npm run build" npm run build
run_gate "git diff --check" git diff --check

printf '\n===== STATUS =====\n'
git status -sb

printf '\n===== DIFF STAT PULPITU =====\n'
git diff --stat -- \
  src/moduly/zamkniete/pulpit/WidokPulpitu.tsx \
  src/moduly/zamkniete/pulpit/logika/miniaturyZadan.ts \
  src/moduly/zamkniete/pulpit/modele/pulpit.ts \
  src/moduly/zamkniete/pulpit/pulpit.css \
  src/moduly/zamkniete/pulpit/uslugi/magazynPulpitu.ts \
  testy/pulpit.regresja.test.ts

printf '\nBackup tej poprawki: %s\n' "$BACKUP"
printf 'Skrypt NIE wykonuje git add, commita ani push.\n'

if [[ "$VALIDATION_FAILED" -ne 0 ]]; then
  printf '\n[UWAGA] Co najmniej jedna kontrola nie przeszła. Nie commituj przed analizą.\n' >&2
  exit 2
fi

printf '\n[OK] Poprawka typowania i wszystkie bramki walidacyjne przeszły.\n'
