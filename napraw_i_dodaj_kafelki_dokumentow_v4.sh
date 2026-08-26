#!/usr/bin/env bash
set -euo pipefail

echo "==> Naprawa + ponowne wdrożenie kafelków dokumentów"

VIEW="src/moduly/dokumenty/WidokWszystkichDokumentow.tsx"
CSS="src/moduly/dokumenty/listaDokumentow.css"

if [[ ! -f package.json || ! -f "$VIEW" || ! -f "$CSS" ]]; then
  echo "[BŁĄD] Uruchom skrypt w katalogu głównym repozytorium Ultimate_Pomagier_3_5."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[BŁĄD] Brak Node.js w PATH."
  exit 1
fi

# Kopia bezpieczeństwa stanu po nieudanym patchu.
STAMP="$(date +%Y%m%d_%H%M%S)"
cp "$VIEW" "${VIEW}.bak_${STAMP}"
cp "$CSS" "${CSS}.bak_${STAMP}"
echo "[OK] Kopie bezpieczeństwa:"
echo "     ${VIEW}.bak_${STAMP}"
echo "     ${CSS}.bak_${STAMP}"

node <<'NODE'
const fs = require("fs");

const viewPath = "src/moduly/dokumenty/WidokWszystkichDokumentow.tsx";
const cssPath = "src/moduly/dokumenty/listaDokumentow.css";

let text = fs.readFileSync(viewPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");

/* ------------------------------------------------------------
   1. USUNIĘCIE WYŁĄCZNIE ELEMENTÓW DODANYCH PRZEZ POPRZEDNI PATCH
   ------------------------------------------------------------ */

text = text.replace(
  /\n?const otworzGeneratorDokumentu = \(nazwy: readonly string\[\]\) => \{[\s\S]*?\n\};\n\nconst szybkieDokumenty = \[[\s\S]*?\n\] as const;\n?/,
  "\n",
);

text = text.replace(
  /\n?\s*<div\s+className="dokumenty-szybkie-akcje"[\s\S]*?<\/div>\s*/g,
  "\n",
);

const cssMarker =
  '/* Szybkie tworzenie dokumentów na ekranie „Wszystkie dokumenty”. */';
const markerIndex = css.indexOf(cssMarker);
if (markerIndex >= 0) {
  css = css.slice(0, markerIndex).replace(/\s+$/, "") + "\n";
}

/* ------------------------------------------------------------
   2. PRZYGOTOWANIE POPRAWNEJ IMPLEMENTACJI
   ------------------------------------------------------------ */

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
  ).filter(
    (element) => !element.closest(".dokumenty-szybkie-akcje"),
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

const styles = `

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

/* ------------------------------------------------------------
   3. HELPER PO IMPORTACH
   ------------------------------------------------------------ */

const importMatches = [
  ...text.matchAll(
    /^(?:import[\s\S]*?from\s+["'][^"']+["'];?|import\s+["'][^"']+["'];?)\s*$/gm,
  ),
];

if (importMatches.length === 0) {
  console.error("[BŁĄD] Nie znaleziono importów. Niczego nie zapisano.");
  process.exit(10);
}

const lastImport = importMatches[importMatches.length - 1];
const importsEnd = lastImport.index + lastImport[0].length;

text =
  text.slice(0, importsEnd) +
  "\n" +
  helper +
  "\n" +
  text.slice(importsEnd);

/* ------------------------------------------------------------
   4. KAFELKI: WYŁĄCZNIE W RENDEROWANYM JSX,
      BEZ SZUKANIA OPISU W DESTRUKTURYZACJI PROPSÓW
   ------------------------------------------------------------ */

const componentNameIndex = text.indexOf("WidokWszystkichDokumentow");
if (componentNameIndex < 0) {
  console.error("[BŁĄD] Nie znaleziono komponentu. Niczego nie zapisano.");
  process.exit(11);
}

const returnIndex = text.indexOf("return (", componentNameIndex);
if (returnIndex < 0) {
  console.error("[BŁĄD] Nie znaleziono return komponentu. Niczego nie zapisano.");
  process.exit(12);
}

let filterIndex = text.indexOf("Filtry i wyszukiwanie", returnIndex);
if (filterIndex < 0) {
  filterIndex = text.indexOf("Filtry", returnIndex);
}
if (filterIndex < 0) {
  console.error("[BŁĄD] Nie znaleziono renderowanej sekcji filtrów. Niczego nie zapisano.");
  process.exit(13);
}

const currentLineStart = text.lastIndexOf("\n", filterIndex) + 1;
const currentLineEndRaw = text.indexOf("\n", filterIndex);
const currentLineEnd =
  currentLineEndRaw >= 0 ? currentLineEndRaw : text.length;
const currentLine = text.slice(currentLineStart, currentLineEnd);

let insertAt = -1;

// Jeżeli "Filtry..." są propem komponentu JSX, wstaw przed tym komponentem.
if (/^\s*<[A-Z][A-Za-z0-9_.]*/.test(currentLine)) {
  insertAt = currentLineStart;
} else {
  // Najpierw preferuj sekcję/formularz/panel z klasą zawierającą "filtr".
  const beforeFilter = text.slice(returnIndex, filterIndex);
  const blockRegex =
    /^[ \t]*<(section|form|div)\b[^>\n]*(?:className\s*=\s*["'][^"']*filtr[^"']*["'])[^>]*>/gim;

  const blocks = [...beforeFilter.matchAll(blockRegex)];
  if (blocks.length > 0) {
    const chosen = blocks[blocks.length - 1];
    insertAt = returnIndex + chosen.index;
  } else {
    // Fallback: najbliższe otwarcie <section> przed nagłówkiem filtrów.
    const sections = [...beforeFilter.matchAll(/^[ \t]*<section\b[^>]*>/gim)];
    if (sections.length > 0) {
      const chosen = sections[sections.length - 1];
      insertAt = returnIndex + chosen.index;
    }
  }
}

if (insertAt < 0) {
  const excerptStart = Math.max(returnIndex, filterIndex - 700);
  const excerptEnd = Math.min(text.length, filterIndex + 400);
  console.error("[BŁĄD] Nie udało się bezpiecznie ustalić początku panelu filtrów.");
  console.error("Fragment do diagnostyki:");
  console.error("----------------------------------------");
  console.error(text.slice(excerptStart, excerptEnd));
  console.error("----------------------------------------");
  console.error("Nic nie zostało zapisane.");
  process.exit(14);
}

text = text.slice(0, insertAt) + tiles + text.slice(insertAt);
css = css.replace(/\s+$/, "") + styles + "\n";

/* ------------------------------------------------------------
   5. WALIDACJA MINIMALNA PRZED ZAPISEM
   ------------------------------------------------------------ */

const quickActionsCount =
  (text.match(/className="dokumenty-szybkie-akcje"/g) || []).length;

if (quickActionsCount !== 1) {
  console.error(
    `[BŁĄD] Oczekiwano 1 kontenera kafelków, znaleziono ${quickActionsCount}. Niczego nie zapisano.`,
  );
  process.exit(15);
}

if (!text.slice(returnIndex).includes('className="dokumenty-szybkie-akcje"')) {
  console.error("[BŁĄD] Kafelki nie znalazły się w renderowanym JSX. Niczego nie zapisano.");
  process.exit(16);
}

fs.writeFileSync(viewPath, text, "utf8");
fs.writeFileSync(cssPath, css, "utf8");

console.log("[OK] Usunięto błędne wstawienie z parametrów komponentu.");
console.log("[OK] Kafelki wstawiono bezpośrednio przed panelem filtrów.");
console.log("[OK] Kolejność: Program -> Lista -> Ankieta -> Dyplom -> Karta -> Checklista.");
console.log("[OK] Każdy kafelek ma duży znak +.");
NODE

echo
echo "==> git diff --check"
git diff --check

echo
echo "==> Build"
npm run build

echo
echo "==> Testy"
npm test

echo
echo "==> Status"
git status -sb

echo
echo "==> Gotowe. Nie wykonano commita."
echo "Jeżeli UI wygląda prawidłowo, możesz potem zatwierdzić zmiany."
