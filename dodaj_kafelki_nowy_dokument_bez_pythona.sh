#!/usr/bin/env bash
set -euo pipefail

echo "==> Ultimate Pomagier: kafelki szybkiego tworzenia dokumentów (wersja bez Pythona)"

if [[ ! -f package.json || ! -d src ]]; then
  echo "[BŁĄD] Uruchom skrypt w katalogu głównym repozytorium Ultimate_Pomagier_3_5."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[BŁĄD] Nie znaleziono Node.js. Repozytorium używa npm, więc Node powinien być dostępny."
  exit 1
fi

node <<'NODE'
const fs = require("fs");
const path = require("path");

const root = path.resolve("src");

function walk(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, result);
    else result.push(full);
  }
  return result;
}

const sourceFiles = walk(root).filter((file) => /\.(tsx|jsx)$/.test(file));
const candidates = sourceFiles
  .map((file) => [file, fs.readFileSync(file, "utf8")])
  .filter(([, text]) =>
    text.includes("Wszystkie dokumenty") &&
    text.includes("Wspólny rejestr dokumentów")
  );

if (candidates.length !== 1) {
  console.error("[BŁĄD] Nie udało się jednoznacznie znaleźć widoku „Wszystkie dokumenty”.");
  console.error("Znalezione pliki:", candidates.map(([file]) => path.relative(process.cwd(), file)));
  process.exit(2);
}

const [viewPath] = candidates[0];
let text = fs.readFileSync(viewPath, "utf8");
console.log("[OK] Widok:", path.relative(process.cwd(), viewPath));

const helperMarker = "const szybkieDokumenty = [";

if (!text.includes("dokumenty-szybkie-akcje")) {
  const helper = `
const otworzGeneratorDokumentu = (nazwy: readonly string[]) => {
  const normalizuj = (wartosc: string) =>
    wartosc
      .replace(/\\s+/g, " ")
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
`;

  if (!text.includes(helperMarker)) {
    const importRegex = /^(?:import[\s\S]*?from\s+["'][^"']+["'];?|import\s+["'][^"']+["'];?)\s*$/gm;
    let lastImportEnd = 0;
    let match;
    while ((match = importRegex.exec(text)) !== null) {
      lastImportEnd = match.index + match[0].length;
    }

    if (lastImportEnd === 0) {
      console.error("[BŁĄD] Nie znaleziono sekcji importów w widoku.");
      process.exit(3);
    }

    text =
      text.slice(0, lastImportEnd) +
      "\n" +
      helper +
      "\n" +
      text.slice(lastImportEnd);
  }

  const tiles = `
      <div
        className="dokumenty-szybkie-akcje"
        aria-label="Utwórz nowy dokument"
      >
        {szybkieDokumenty.map((dokument) => (
          <button
            key={dokument.etykieta}
            type="button"
            className="dokumenty-szybka-akcja"
            onClick={() => otworzGeneratorDokumentu(dokument.nazwyNawigacji)}
          >
            <span className="dokumenty-szybka-akcja-plus" aria-hidden="true">
              +
            </span>
            <span className="dokumenty-szybka-akcja-etykieta">
              {dokument.etykieta}
            </span>
          </button>
        ))}
      </div>
`;

  const descRegex =
    /(<p\b[^>]*>\s*Wspólny rejestr dokumentów zapisanych przez generatory\.\s*<\/p>)/s;

  if (!descRegex.test(text)) {
    console.error("[BŁĄD] Nie znaleziono akapitu opisu rejestru dokumentów.");
    process.exit(4);
  }

  text = text.replace(descRegex, `$1\n${tiles}`);
  fs.writeFileSync(viewPath, text, "utf8");
  console.log("[DODANO] 6 kafelków szybkiego tworzenia dokumentów.");
} else {
  console.log("[INFO] Kafelki są już obecne — pomijam ponowne dodanie JSX.");
}

text = fs.readFileSync(viewPath, "utf8");

const cssImports = [...text.matchAll(/import\s+["']([^"']+\.css)["']/g)]
  .map((match) => path.resolve(path.dirname(viewPath), match[1]))
  .filter((file) => fs.existsSync(file));

let cssPath = cssImports[0];

if (!cssPath) {
  const localCss = fs.readdirSync(path.dirname(viewPath))
    .filter((name) => name.endsWith(".css"))
    .map((name) => path.join(path.dirname(viewPath), name));
  cssPath = localCss[0];
}

if (!cssPath) {
  console.error("[BŁĄD] Nie znaleziono pliku CSS powiązanego z widokiem.");
  process.exit(5);
}

console.log("[OK] CSS:", path.relative(process.cwd(), cssPath));
let css = fs.readFileSync(cssPath, "utf8");

if (!css.includes(".dokumenty-szybkie-akcje")) {
  css += `

/* Szybkie tworzenie dokumentów na ekranie „Wszystkie dokumenty”. */
.dokumenty-szybkie-akcje {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin: 12px 0 16px;
}

.dokumenty-szybka-akcja {
  min-width: 0;
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid currentColor;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition:
    transform 120ms ease,
    background-color 120ms ease;
}

.dokumenty-szybka-akcja:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.04);
}

.dokumenty-szybka-akcja:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.dokumenty-szybka-akcja-plus {
  flex: 0 0 auto;
  font-size: 2.15rem;
  line-height: 1;
  font-weight: 500;
}

.dokumenty-szybka-akcja-etykieta {
  min-width: 0;
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
`;

  fs.writeFileSync(cssPath, css, "utf8");
  console.log("[DODANO] Responsywne style kafelków.");
} else {
  console.log("[INFO] Style kafelków są już obecne — pomijam.");
}

console.log("\nZmodyfikowane pliki:");
console.log(" -", path.relative(process.cwd(), viewPath));
console.log(" -", path.relative(process.cwd(), cssPath));
NODE

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
echo "Sprawdź widok Dokumenty -> Wszystkie dokumenty."
echo
git status -sb
