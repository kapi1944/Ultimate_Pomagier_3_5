#!/usr/bin/env bash
set -euo pipefail

echo "==> Ultimate Pomagier: kafelki szybkiego tworzenia dokumentów (wersja odporna na układ JSX)"

if [[ ! -f package.json || ! -d src ]]; then
  echo "[BŁĄD] Uruchom skrypt w katalogu głównym repozytorium Ultimate_Pomagier_3_5."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[BŁĄD] Nie znaleziono Node.js."
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

function rel(file) {
  return path.relative(process.cwd(), file);
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
  console.error("Znalezione pliki:", candidates.map(([file]) => rel(file)));
  process.exit(2);
}

const [viewPath] = candidates[0];
let text = fs.readFileSync(viewPath, "utf8");
console.log("[OK] Widok:", rel(viewPath));

if (text.includes("dokumenty-szybkie-akcje")) {
  console.log("[INFO] Kafelki są już obecne — pomijam ponowne dodanie JSX.");
} else {
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

  // Wstaw stałe po ostatnim imporcie.
  const importMatches = [...text.matchAll(/^(?:import[\s\S]*?from\s+["'][^"']+["'];?|import\s+["'][^"']+["'];?)\s*$/gm)];
  if (importMatches.length === 0) {
    console.error("[BŁĄD] Nie znaleziono sekcji importów.");
    process.exit(3);
  }

  const lastImport = importMatches[importMatches.length - 1];
  const importsEnd = lastImport.index + lastImport[0].length;

  text =
    text.slice(0, importsEnd) +
    "\n" +
    helper +
    "\n" +
    text.slice(importsEnd);

  // Znajdź opis niezależnie od tego, czy jest w <p>, <div>, <header> itd.
  const description = "Wspólny rejestr dokumentów zapisanych przez generatory.";
  const descIndex = text.indexOf(description);

  if (descIndex < 0) {
    console.error("[BŁĄD] Nie znaleziono tekstu opisu rejestru dokumentów.");
    process.exit(4);
  }

  // Szukamy pierwszego zamknięcia sensownego elementu blokowego po opisie.
  // Dzięki temu obsługujemy zarówno:
  // <p>tekst</p>
  // jak i:
  // <p>
  //   tekst
  // </p>
  const afterDescription = text.slice(descIndex + description.length);
  const closingRegex = /<\/(p|div|header|section)>\s*/i;
  const closingMatch = closingRegex.exec(afterDescription);

  let insertAt;

  if (closingMatch) {
    insertAt =
      descIndex +
      description.length +
      closingMatch.index +
      closingMatch[0].length;
  } else {
    // Ostateczny fallback: po linii zawierającej opis.
    const lineEnd = text.indexOf("\n", descIndex);
    insertAt = lineEnd >= 0 ? lineEnd + 1 : text.length;
  }

  text = text.slice(0, insertAt) + "\n" + tiles + text.slice(insertAt);
  fs.writeFileSync(viewPath, text, "utf8");

  console.log("[DODANO] 6 kafelków w kolejności:");
  console.log("        Program -> Lista -> Ankieta -> Dyplom -> Karta -> Checklista");
}

text = fs.readFileSync(viewPath, "utf8");

// Znajdź CSS importowany przez widok.
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
  console.error("[INFO] JSX został dodany, ale style wymagają ręcznej kontroli.");
  process.exit(5);
}

console.log("[OK] CSS:", rel(cssPath));
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
  console.log("[INFO] Style kafelków są już obecne.");
}
NODE

echo
echo "==> Kontrola zmian"
git diff --check

echo
echo "==> TypeScript / build"
npm run build

echo
echo "==> Testy"
npm test

echo
echo "==> Status"
git status -sb

echo
echo "==> Gotowe. Skrypt NIE wykonuje commita."
