#!/usr/bin/env bash
set -Eeuo pipefail

VIEW="src/moduly/dokumenty/WidokWszystkichDokumentow.tsx"
CSS="src/moduly/dokumenty/listaDokumentow.css"

echo "==> Naprawa atomowa kafelków Dokumentów (AST / bez Codexa / bez Pythona)"

if [[ ! -f package.json || ! -f "$VIEW" || ! -f "$CSS" ]]; then
  echo "[BŁĄD] Uruchom skrypt w katalogu głównym Ultimate_Pomagier_3_5."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[BŁĄD] Brak Node.js w PATH."
  exit 1
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR=".pomagier_patch_kafelki_${STAMP}"
mkdir -p "$BACKUP_DIR"

cp "$VIEW" "$BACKUP_DIR/stan_przed_skryptem.tsx"
cp "$CSS" "$BACKUP_DIR/stan_przed_skryptem.css"

echo "[OK] Zachowano stan wejściowy w: $BACKUP_DIR"

echo
echo "==> 1/4 Usuwam wyłącznie ślady nieudanych wersji v3/v4"

node <<'NODE'
const fs = require("fs");
const ts = require("typescript");

const viewPath = "src/moduly/dokumenty/WidokWszystkichDokumentow.tsx";
const cssPath = "src/moduly/dokumenty/listaDokumentow.css";

let text = fs.readFileSync(viewPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

// Usuń helper/dane dodane przez nasze wcześniejsze skrypty.
const helperStart = text.indexOf("const otworzGeneratorDokumentu =");
const dataStart = text.indexOf("const szybkieDokumenty =", helperStart >= 0 ? helperStart : 0);

if (helperStart >= 0 && dataStart >= 0) {
  const dataEndMarker = "] as const;";
  const dataEnd = text.indexOf(dataEndMarker, dataStart);

  if (dataEnd < 0) {
    console.error("[BŁĄD] Znaleziono początek starego patcha, ale nie jego koniec.");
    process.exit(21);
  }

  text =
    text.slice(0, helperStart) +
    text.slice(dataEnd + dataEndMarker.length)
      .replace(/^\s*\r?\n/, "\n");
}

// Usuń kontener JSX dodany przez wcześniejszą wersję.
// Kontener nie zawiera zagnieżdżonych <div>, więc zamknięcie jest jednoznaczne.
const tileRegex =
  /\s*<div\s+className="dokumenty-szybkie-akcje"\s+aria-label="Utwórz nowy dokument"\s*>[\s\S]*?<\/div>\s*/g;

const tileMatches = text.match(tileRegex) || [];
text = text.replace(tileRegex, "\n");

// Usuń wyłącznie blok CSS zaczynający się naszym markerem.
// Wcześniejsze wersje dopisywały go na końcu pliku.
const cssMarkers = [
  '/* Szybkie tworzenie dokumentów na ekranie „Wszystkie dokumenty”. */',
  '/* Szybkie tworzenie dokumentów w rejestrze „Wszystkie dokumenty”. */'
];

for (const marker of cssMarkers) {
  const index = css.indexOf(marker);
  if (index >= 0) {
    css = css.slice(0, index).replace(/\s+$/, "") + "\n";
    break;
  }
}

// Po oczyszczeniu plik MUSI być składniowo poprawnym TSX-em.
// To chroni przed dalszą pracą na uszkodzonym źródle.
const source = ts.createSourceFile(
  viewPath,
  text,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

if (source.parseDiagnostics.length) {
  console.error("[BŁĄD] Po usunięciu starego patcha TSX nadal ma błędy składni.");
  for (const d of source.parseDiagnostics.slice(0, 10)) {
    const pos = d.start ?? 0;
    const lc = source.getLineAndCharacterOfPosition(pos);
    console.error(
      `  ${lc.line + 1}:${lc.character + 1} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`
    );
  }
  console.error("Nie zapisuję oczyszczonego pliku.");
  process.exit(22);
}

if (count(text, 'className="dokumenty-szybkie-akcje"') !== 0) {
  console.error("[BŁĄD] Nie udało się całkowicie usunąć starego JSX kafelków.");
  process.exit(23);
}

fs.writeFileSync(viewPath, text, "utf8");
fs.writeFileSync(cssPath, css, "utf8");

console.log(`[OK] Usunięto ${tileMatches.length} błędny kontener(y) JSX.`);
console.log("[OK] Oczyszczony WidokWszystkichDokumentow.tsx przechodzi parser TypeScript.");
NODE

# To jest punkt bezpiecznego rollbacku: stan po usunięciu wyłącznie naszych
# wcześniejszych, błędnych wstawek.
cp "$VIEW" "$BACKUP_DIR/baza_przed_poprawnym_patchem.tsx"
cp "$CSS" "$BACKUP_DIR/baza_przed_poprawnym_patchem.css"

rollback() {
  local code=$?
  echo
  echo "[ROLLBACK] Walidacja nie przeszła. Przywracam oczyszczony stan sprzed nowego patcha."
  cp "$BACKUP_DIR/baza_przed_poprawnym_patchem.tsx" "$VIEW"
  cp "$BACKUP_DIR/baza_przed_poprawnym_patchem.css" "$CSS"
  echo "[ROLLBACK] Przywrócono $VIEW i $CSS."
  echo "[INFO] Pełny stan wejściowy nadal jest w: $BACKUP_DIR"
  exit "$code"
}
trap rollback ERR

echo
echo "==> 2/4 Lokalizuję panel filtrów przez AST TypeScript i dodaję kafelki"

node <<'NODE'
const fs = require("fs");
const ts = require("typescript");

const viewPath = "src/moduly/dokumenty/WidokWszystkichDokumentow.tsx";
const cssPath = "src/moduly/dokumenty/listaDokumentow.css";

let text = fs.readFileSync(viewPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");

const source = ts.createSourceFile(
  viewPath,
  text,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

if (source.parseDiagnostics.length) {
  throw new Error("Baza TSX nie jest poprawna składniowo.");
}

// ------------------------------------------------------------
// A. Bezpieczny punkt wstawienia stałych: za ostatnim importem.
// ------------------------------------------------------------
const imports = source.statements.filter(ts.isImportDeclaration);
if (!imports.length) {
  throw new Error("Nie znaleziono importów w WidokWszystkichDokumentow.tsx.");
}
const helperInsertAt = imports[imports.length - 1].end;

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

// ------------------------------------------------------------
// B. Znajdź renderowany panel filtrów, nie tekst w propsach.
// ------------------------------------------------------------
const phrases = [
  "Filtry i wyszukiwanie",
  "Wyszukiwanie i filtry",
  "Filtry",
];

function tagNameOf(node) {
  if (!ts.isJsxElement(node)) return "";
  return node.openingElement.tagName.getText(source);
}

function classTextOf(node) {
  if (!ts.isJsxElement(node)) return "";
  for (const prop of node.openingElement.attributes.properties) {
    if (
      ts.isJsxAttribute(prop) &&
      prop.name.getText(source) === "className" &&
      prop.initializer
    ) {
      return prop.initializer.getText(source);
    }
  }
  return "";
}

const jsxElements = [];
function visit(node) {
  if (ts.isJsxElement(node)) jsxElements.push(node);
  ts.forEachChild(node, visit);
}
visit(source);

let filterCandidates = jsxElements.filter((node) => {
  const body = node.getText(source);
  const containsPhrase = phrases.some((p) => body.includes(p));
  const cls = classTextOf(node).toLocaleLowerCase("pl");
  return containsPhrase && cls.includes("filtr");
});

// Preferuj najmniejszy element z klasą "filtr", który obejmuje nagłówek,
// bo zwykle jest to dokładnie panel filtrów, nie cały ekran.
filterCandidates.sort(
  (a, b) => (a.end - a.getStart(source)) - (b.end - b.getStart(source)),
);

let filterNode = filterCandidates[0];

if (!filterNode) {
  // Fallback: najmniejsza <section> obejmująca tekst "Filtry".
  const sections = jsxElements
    .filter((node) =>
      tagNameOf(node).toLowerCase() === "section" &&
      phrases.some((p) => node.getText(source).includes(p))
    )
    .sort(
      (a, b) => (a.end - a.getStart(source)) - (b.end - b.getStart(source)),
    );
  filterNode = sections[0];
}

if (!filterNode) {
  // Ostateczny fallback: najmniejszy <div> obejmujący tekst "Filtry".
  const divs = jsxElements
    .filter((node) =>
      tagNameOf(node).toLowerCase() === "div" &&
      phrases.some((p) => node.getText(source).includes(p))
    )
    .sort(
      (a, b) => (a.end - a.getStart(source)) - (b.end - b.getStart(source)),
    );
  filterNode = divs[0];
}

if (!filterNode) {
  throw new Error(
    'Nie znalazłem renderowanego panelu zawierającego tekst "Filtry".'
  );
}

// Żeby wstawić kafelki jako prawidłowe rodzeństwo, wspinaj się do węzła,
// którego rodzicem jest JSXElement/JSXFragment.
let anchor = filterNode;
while (
  anchor.parent &&
  !ts.isJsxElement(anchor.parent) &&
  !ts.isJsxFragment(anchor.parent)
) {
  anchor = anchor.parent;
}

if (
  !anchor.parent ||
  (!ts.isJsxElement(anchor.parent) && !ts.isJsxFragment(anchor.parent))
) {
  throw new Error("Panel filtrów nie ma bezpiecznego miejsca na rodzeństwo JSX.");
}

const anchorStart = anchor.getStart(source);

// Zachowaj wcięcie wiersza, w którym zaczyna się panel filtrów.
const lineStart = text.lastIndexOf("\n", anchorStart - 1) + 1;
const indentMatch = text.slice(lineStart, anchorStart).match(/^\s*/);
const indent = indentMatch ? indentMatch[0] : "      ";

const tileLines = [
  `<div`,
  `  className="dokumenty-szybkie-akcje"`,
  `  aria-label="Utwórz nowy dokument"`,
  `>`,
  `  {szybkieDokumenty.map((dokument) => (`,
  `    <button`,
  `      key={dokument.etykieta}`,
  `      type="button"`,
  `      className="dokumenty-szybka-akcja"`,
  `      onClick={() => otworzGeneratorDokumentu(dokument.nazwyNawigacji)}`,
  `    >`,
  `      <span className="dokumenty-szybka-akcja-plus" aria-hidden="true">`,
  `        +`,
  `      </span>`,
  `      <span className="dokumenty-szybka-akcja-etykieta">`,
  `        {dokument.etykieta}`,
  `      </span>`,
  `    </button>`,
  `  ))}`,
  `</div>`,
  ``,
];

const tiles =
  tileLines.map((line) => (line ? indent + line : "")).join("\n");

// Ważne: anchorStart pochodzi ze starego tekstu, więc najpierw dodaj kafelki,
// a dopiero potem helper przed nimi; albo skoryguj offset.
// Robimy dwa inserty od większej pozycji do mniejszej.
const inserts = [
  { at: anchorStart, value: tiles },
  { at: helperInsertAt, value: helper },
].sort((a, b) => b.at - a.at);

for (const insert of inserts) {
  text = text.slice(0, insert.at) + insert.value + text.slice(insert.at);
}

// ------------------------------------------------------------
// C. Style.
// ------------------------------------------------------------
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

css = css.replace(/\s+$/, "") + styles + "\n";

// ------------------------------------------------------------
// D. Parser po modyfikacji – zanim cokolwiek zapiszemy.
// ------------------------------------------------------------
const after = ts.createSourceFile(
  viewPath,
  text,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

if (after.parseDiagnostics.length) {
  console.error("[BŁĄD] Wygenerowany TSX nie przechodzi parsera.");
  for (const d of after.parseDiagnostics.slice(0, 10)) {
    const pos = d.start ?? 0;
    const lc = after.getLineAndCharacterOfPosition(pos);
    console.error(
      `  ${lc.line + 1}:${lc.character + 1} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`
    );
  }
  process.exit(31);
}

const occurrences =
  text.split('className="dokumenty-szybkie-akcje"').length - 1;

if (occurrences !== 1) {
  throw new Error(
    `Oczekiwano jednego kontenera szybkich akcji, znaleziono: ${occurrences}.`
  );
}

fs.writeFileSync(viewPath, text, "utf8");
fs.writeFileSync(cssPath, css, "utf8");

console.log("[OK] AST odnalazł renderowany panel filtrów.");
console.log(`[OK] Anchor JSX: <${tagNameOf(filterNode)}> ${classTextOf(filterNode)}`);
console.log("[OK] Dodano 6 kafelków przed panelem filtrów.");
console.log("[OK] Kolejność: Program -> Lista -> Ankieta -> Dyplom -> Karta -> Checklista.");
NODE

echo
echo "==> 3/4 Walidacja"
git diff --check
npm run build
npm test

echo
echo "==> 4/4 Zakończenie"
trap - ERR

echo "[OK] Build i testy przeszły."
echo "[OK] Nie wykonano commita."
echo
git status -sb

echo
echo "Backup techniczny: $BACKUP_DIR"
