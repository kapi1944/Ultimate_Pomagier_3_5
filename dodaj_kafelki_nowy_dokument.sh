#!/usr/bin/env bash
set -euo pipefail

echo "==> Ultimate Pomagier: szybkie kafelki tworzenia dokumentów"

if [[ ! -f package.json || ! -d src ]]; then
  echo "[BŁĄD] Uruchom skrypt w katalogu głównym repozytorium Ultimate_Pomagier_3_5."
  exit 1
fi

if ! command -v python >/dev/null 2>&1; then
  echo "[BŁĄD] Brak polecenia 'python' w PATH."
  exit 1
fi

python - <<'PY'
from pathlib import Path
import re
import sys

ROOT = Path("src")

candidates = []
for ext in ("*.tsx", "*.jsx"):
    for p in ROOT.rglob(ext):
        try:
            txt = p.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if "Wszystkie dokumenty" in txt and "Wspólny rejestr dokumentów" in txt:
            candidates.append((p, txt))

if len(candidates) != 1:
    print("[BŁĄD] Nie udało się jednoznacznie znaleźć widoku „Wszystkie dokumenty”.")
    print("Znalezione pliki:", [str(p) for p, _ in candidates])
    sys.exit(2)

view_path, text = candidates[0]
print(f"[OK] Widok: {view_path}")

if "dokumenty-szybkie-akcje" in text:
    print("[INFO] Kafelki są już obecne — pomijam ponowne dodanie.")
else:
    helper = r'''
  const otworzGeneratorDokumentu = (nazwy: string[]) => {
    const normalizuj = (wartosc: string) =>
      wartosc
        .replace(/\s+/g, " ")
        .trim()
        .toLocaleLowerCase("pl");

    const oczekiwane = nazwy.map(normalizuj);
    const elementy = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a, button, [role="button"], [data-nav], [data-view], [data-route]'
      ),
    );

    const trafienie = elementy.find((element) => {
      const tekst = normalizuj(element.textContent ?? "");
      return oczekiwane.some(
        (nazwa) => tekst === nazwa || tekst.includes(nazwa),
      );
    });

    if (trafienie) {
      trafienie.click();
      return;
    }

    console.error(
      "Nie znaleziono istniejącej pozycji nawigacji generatora:",
      nazwy,
    );
  };

  const szybkieDokumenty = [
    {
      etykieta: "Nowy program",
      nazwyNawigacji: ["Programy szkoleń", "Program szkolenia", "Programy"],
    },
    {
      etykieta: "Nowa lista obecności",
      nazwyNawigacji: ["Listy obecności", "Lista obecności"],
    },
    {
      etykieta: "Nowa ankieta",
      nazwyNawigacji: ["Ankiety", "Ankieta"],
    },
    {
      etykieta: "Nowy dyplom",
      nazwyNawigacji: ["Dyplomy", "Dyplom"],
    },
    {
      etykieta: "Karta na drzwi",
      nazwyNawigacji: ["Karty na drzwi", "Karta na drzwi", "Karta informacyjna"],
    },
    {
      etykieta: "Nowa checklista wysyłki paczek",
      nazwyNawigacji: [
        "Checklisty wysyłki paczek",
        "Checklista wysyłki paczek",
        "Checklista wysyłki",
      ],
    },
  ] as const;
'''

    m = re.search(r'(?m)^(\s*)return\s*\(\s*\n', text)
    if not m:
        print("[BŁĄD] Nie znaleziono głównego 'return (' komponentu.")
        sys.exit(3)

    indent = m.group(1)
    helper_indented = "\n".join(
        (indent + line if line.strip() else line)
        for line in helper.strip("\n").splitlines()
    ) + "\n\n"
    text = text[:m.start()] + helper_indented + text[m.start():]

    tiles = r'''
      <div
        className="dokumenty-szybkie-akcje"
        aria-label="Utwórz nowy dokument"
      >
        {szybkieDokumenty.map((dokument) => (
          <button
            key={dokument.etykieta}
            type="button"
            className="dokumenty-szybka-akcja"
            onClick={() =>
              otworzGeneratorDokumentu([...dokument.nazwyNawigacji])
            }
          >
            <span className="dokumenty-szybka-akcja-plus" aria-hidden="true">
              +
            </span>
            <span>{dokument.etykieta}</span>
          </button>
        ))}
      </div>
'''

    desc_pattern = re.compile(
        r'(<p\b[^>]*>\s*Wspólny rejestr dokumentów zapisanych przez generatory\.\s*</p>)',
        re.S,
    )
    dm = desc_pattern.search(text)

    if dm:
        insert_at = dm.end()
        text = text[:insert_at] + "\n" + tiles + text[insert_at:]
    else:
        idx = text.find("Wspólny rejestr dokumentów zapisanych przez generatory.")
        if idx < 0:
            print("[BŁĄD] Nie znaleziono opisu rejestru dokumentów.")
            sys.exit(4)
        close = text.find("</", idx)
        close_end = text.find(">", close)
        if close < 0 or close_end < 0:
            print("[BŁĄD] Nie udało się wyznaczyć miejsca wstawienia kafelków.")
            sys.exit(5)
        insert_at = close_end + 1
        text = text[:insert_at] + "\n" + tiles + text[insert_at:]

    view_path.write_text(text, encoding="utf-8")
    print("[DODANO] 6 kafelków szybkiego tworzenia dokumentów.")

view_text = view_path.read_text(encoding="utf-8")
css_paths = []

for rel in re.findall(r'import\s+["\']([^"\']+\.css)["\']', view_text):
    p = (view_path.parent / rel).resolve()
    if p.exists():
        css_paths.append(p)

if not css_paths:
    css_paths = list(view_path.parent.glob("*.css"))

if not css_paths:
    print("[BŁĄD] Nie znaleziono pliku CSS powiązanego z widokiem.")
    sys.exit(6)

css_path = css_paths[0]
css = css_path.read_text(encoding="utf-8")
print(f"[OK] CSS: {css_path}")

if ".dokumenty-szybkie-akcje" not in css:
    css += r'''

/* Szybkie tworzenie dokumentów w rejestrze „Wszystkie dokumenty”. */
.dokumenty-szybkie-akcje {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin: 12px 0 16px;
}

.dokumenty-szybka-akcja {
  min-width: 0;
  min-height: 74px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--kolor-obramowania, #126b3a);
  border-radius: 10px;
  background: var(--kolor-tla-panelu, rgba(0, 70, 35, 0.24));
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition:
    transform 120ms ease,
    border-color 120ms ease,
    background-color 120ms ease;
}

.dokumenty-szybka-akcja:hover {
  transform: translateY(-1px);
  border-color: currentColor;
}

.dokumenty-szybka-akcja:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.dokumenty-szybka-akcja-plus {
  flex: 0 0 auto;
  font-size: 2rem;
  line-height: 1;
  font-weight: 500;
}

@media (max-width: 1400px) {
  .dokumenty-szybkie-akcje {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .dokumenty-szybkie-akcje {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .dokumenty-szybkie-akcje {
    grid-template-columns: 1fr;
  }
}
'''
    css_path.write_text(css, encoding="utf-8")
    print("[DODANO] Responsywne style kafelków.")
else:
    print("[INFO] Style kafelków są już obecne — pomijam.")

print("\nZmodyfikowane pliki:")
print(" -", view_path)
print(" -", css_path)
PY

echo
echo "==> Kontrola diff"
git diff --check

echo
echo "==> Testy"
npm test

echo
echo "==> Build"
npm run build

echo
echo "==> Gotowe. Zmiany NIE zostały zacommitowane."
echo "Sprawdź widok Dokumenty -> Wszystkie dokumenty, a następnie:"
echo "  git diff"
echo "  git status -sb"
