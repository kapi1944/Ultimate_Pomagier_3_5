#!/usr/bin/env bash
set -Eeuo pipefail

VIEW="src/moduly/dokumenty/WidokWszystkichDokumentow.tsx"
CSS="src/moduly/dokumenty/listaDokumentow.css"

echo "==> Ultimate Pomagier: kafelki Dokumentów v6"
echo "    AST odnajduje komponent i jego nagłówek; brak zgadywania po tekście filtrów."

if [[ ! -f package.json || ! -f "$VIEW" || ! -f "$CSS" ]]; then
  echo "[BŁĄD] Uruchom skrypt w katalogu głównym Ultimate_Pomagier_3_5."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[BŁĄD] Brak Node.js w PATH."
  exit 1
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR=".pomagier_patch_kafelki_v6_${STAMP}"
mkdir -p "$BACKUP_DIR"

cp "$VIEW" "$BACKUP_DIR/WidokWszystkichDokumentow.tsx"
cp "$CSS" "$BACKUP_DIR/listaDokumentow.css"

rollback() {
  local code=$?
  echo
  echo "[ROLLBACK] Nowa próba nie przeszła walidacji."
  cp "$BACKUP_DIR/WidokWszystkichDokumentow.tsx" "$VIEW"
  cp "$BACKUP_DIR/listaDokumentow.css" "$CSS"
  echo "[ROLLBACK] Przywrócono stan sprzed v6."
  echo "[INFO] Backup: $BACKUP_DIR"
  exit "$code"
}
trap rollback ERR

node <<'NODE'
const fs = require("fs");
const ts = require("typescript");

const viewPath = "src/moduly/dokumenty/WidokWszystkichDokumentow.tsx";
const cssPath = "src/moduly/dokumenty/listaDokumentow.css";

let text = fs.readFileSync(viewPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");

if (text.includes('className="dokumenty-szybkie-akcje"')) {
  console.log("[INFO] Kafelki już istnieją. Nie dodaję ich drugi raz.");
  process.exit(0);
}

const source = ts.createSourceFile(
  viewPath,
  text,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

if (source.parseDiagnostics.length) {
  console.error("[BŁĄD] Plik wejściowy TSX ma błędy składniowe:");
  for (const d of source.parseDiagnostics.slice(0, 12)) {
    const pos = d.start ?? 0;
    const lc = source.getLineAndCharacterOfPosition(pos);
    console.error(
      `  ${lc.line + 1}:${lc.character + 1} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`
    );
  }
  process.exit(20);
}

/* ----------------------------------------------------------
   1. Znajdź dokładnie deklarację komponentu.
   Obsługa:
   - function WidokWszystkichDokumentow(...)
   - const WidokWszystkichDokumentow = (...) => ...
   ---------------------------------------------------------- */

let component = null;

function findComponent(node) {
  if (
    ts.isFunctionDeclaration(node) &&
    node.name &&
    node.name.text === "WidokWszystkichDokumentow"
  ) {
    component = node;
    return;
  }

  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.name.text === "WidokWszystkichDokumentow" &&
    node.initializer &&
    (ts.isArrowFunction(node.initializer) ||
      ts.isFunctionExpression(node.initializer))
  ) {
    component = node.initializer;
    return;
  }

  if (!component) ts.forEachChild(node, findComponent);
}

findComponent(source);

if (!component) {
  console.error("[BŁĄD] AST nie znalazł deklaracji WidokWszystkichDokumentow.");
  process.exit(21);
}

/* ----------------------------------------------------------
   2. Znajdź WYŁĄCZNIE return należący do tego komponentu.
   Nie wchodzimy do zagnieżdżonych callbacków/funkcji.
   ---------------------------------------------------------- */

let returnedExpression = null;

function unwrap(expr) {
  let current = expr;
  while (
    current &&
    (ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isNonNullExpression(current))
  ) {
    current = current.expression;
  }
  return current;
}

if (ts.isArrowFunction(component) && !ts.isBlock(component.body)) {
  returnedExpression = unwrap(component.body);
} else {
  const body = component.body;

  function searchReturn(node) {
    if (returnedExpression) return;

    if (node !== body && ts.isFunctionLike(node)) {
      return;
    }

    if (ts.isReturnStatement(node) && node.expression) {
      returnedExpression = unwrap(node.expression);
      return;
    }

    ts.forEachChild(node, searchReturn);
  }

  searchReturn(body);
}

if (!returnedExpression) {
  console.error("[BŁĄD] Nie znaleziono wyrażenia zwracanego przez komponent.");
  process.exit(22);
}

/* ----------------------------------------------------------
   3. Ustal główny kontener JSX.
   ---------------------------------------------------------- */

let rootJsx = returnedExpression;

if (!ts.isJsxElement(rootJsx) && !ts.isJsxFragment(rootJsx)) {
  // Fallback: znajdź pierwszy JSX w samym zwracanym wyrażeniu,
  // np. przy prostym operatorze warunkowym.
  let firstJsx = null;
  function findJsx(node) {
    if (firstJsx) return;
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      firstJsx = node;
      return;
    }
    ts.forEachChild(node, findJsx);
  }
  findJsx(returnedExpression);
  rootJsx = firstJsx;
}

if (!rootJsx || (!ts.isJsxElement(rootJsx) && !ts.isJsxFragment(rootJsx))) {
  console.error("[BŁĄD] Return komponentu nie zawiera rozpoznawalnego JSX.");
  process.exit(23);
}

const topChildren = rootJsx.children.filter(
  (child) =>
    ts.isJsxElement(child) ||
    ts.isJsxSelfClosingElement(child)
);

if (!topChildren.length) {
  console.error("[BŁĄD] Główny JSX nie ma elementów potomnych.");
  process.exit(24);
}

/* ----------------------------------------------------------
   4. Znajdź nagłówek ekranu.
   W tym repo opis/tytuł mogą być domyślnymi propsami, dlatego
   NIE szukamy literalnego tekstu "Wspólny rejestr..." w renderze.
   Szukamy struktury używającej propsów tytul/opis lub komponentu nagłówka.
   ---------------------------------------------------------- */

function tagName(node) {
  if (ts.isJsxElement(node)) {
    return node.openingElement.tagName.getText(source);
  }
  if (ts.isJsxSelfClosingElement(node)) {
    return node.tagName.getText(source);
  }
  return "";
}

function scoreHeader(node) {
  const body = node.getText(source);
  const tag = tagName(node).toLocaleLowerCase("pl");
  let score = 0;

  if (tag.includes("naglow")) score += 12;
  if (tag.includes("header")) score += 9;
  if (tag.includes("tytul")) score += 5;

  if (/\btytul\s*=\s*\{\s*tytul\s*\}/.test(body)) score += 12;
  if (/\bopis\s*=\s*\{\s*opis\s*\}/.test(body)) score += 12;

  if (/\{\s*tytul\s*\}/.test(body)) score += 7;
  if (/\{\s*opis\s*\}/.test(body)) score += 7;

  if (body.includes("Wszystkie dokumenty")) score += 5;
  if (body.includes("Wspólny rejestr dokumentów")) score += 5;

  return score;
}

const ranked = topChildren
  .map((node, index) => ({
    node,
    index,
    tag: tagName(node),
    score: scoreHeader(node),
    preview: node.getText(source).replace(/\s+/g, " ").slice(0, 180),
  }))
  .sort((a, b) => b.score - a.score || a.index - b.index);

const header = ranked[0];

if (!header || header.score < 7) {
  console.error("[BŁĄD] Nie udało się jednoznacznie rozpoznać nagłówka widoku.");
  console.error("[DIAGNOSTYKA] Bez modyfikacji pliku. Top-level JSX:");
  for (const item of ranked.slice(0, 12)) {
    console.error(
      `  #${item.index} score=${item.score} <${item.tag}> ${item.preview}`
    );
  }
  process.exit(25);
}

console.log(
  `[OK] Nagłówek rozpoznany: #${header.index} <${header.tag}> score=${header.score}`
);

/* ----------------------------------------------------------
   5. Punkt wstawienia: bezpośrednio PO nagłówku.
   To odpowiada miejscu zaznaczonemu wcześniej różową linią:
   nagłówek/opis -> NOWE KAFELKI -> dalsza zawartość/filtry.
   ---------------------------------------------------------- */

const anchorEnd = header.node.end;

// Pobierz wcięcie linii nagłówka.
const anchorStart = header.node.getStart(source);
const lineStart = text.lastIndexOf("\n", anchorStart - 1) + 1;
const prefix = text.slice(lineStart, anchorStart);
const indent = (prefix.match(/^\s*/) || ["      "])[0];

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
];

const tiles =
  "\n" +
  tileLines.map((line) => indent + line).join("\n") +
  "\n";

/* ----------------------------------------------------------
   6. Dane i helper po ostatnim imporcie.
   ---------------------------------------------------------- */

const imports = source.statements.filter(ts.isImportDeclaration);

if (!imports.length) {
  console.error("[BŁĄD] Nie znaleziono importów modułu.");
  process.exit(26);
}

const importsEnd = imports[imports.length - 1].end;

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

// Inserty wykonujemy od większego offsetu do mniejszego.
const inserts = [
  { at: anchorEnd, value: tiles },
  { at: importsEnd, value: helper },
].sort((a, b) => b.at - a.at);

for (const insertion of inserts) {
  text =
    text.slice(0, insertion.at) +
    insertion.value +
    text.slice(insertion.at);
}

/* ----------------------------------------------------------
   7. CSS.
   ---------------------------------------------------------- */

const cssMarker =
  '/* Szybkie tworzenie dokumentów na ekranie „Wszystkie dokumenty”. */';

if (!css.includes(cssMarker)) {
  css = css.replace(/\s+$/, "") + `

${cssMarker}
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
` + "\n";
}

/* ----------------------------------------------------------
   8. WALIDACJA PARSEREM PRZED ZAPISEM.
   ---------------------------------------------------------- */

const after = ts.createSourceFile(
  viewPath,
  text,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

if (after.parseDiagnostics.length) {
  console.error("[BŁĄD] Wygenerowany TSX nie przechodzi parsera.");
  for (const d of after.parseDiagnostics.slice(0, 12)) {
    const pos = d.start ?? 0;
    const lc = after.getLineAndCharacterOfPosition(pos);
    console.error(
      `  ${lc.line + 1}:${lc.character + 1} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`
    );
  }
  process.exit(27);
}

const tileCount =
  text.split('className="dokumenty-szybkie-akcje"').length - 1;

if (tileCount !== 1) {
  console.error(
    `[BŁĄD] Oczekiwano 1 kontenera kafelków, znaleziono ${tileCount}.`
  );
  process.exit(28);
}

fs.writeFileSync(viewPath, text, "utf8");
fs.writeFileSync(cssPath, css, "utf8");

console.log("[OK] Dodano kafelki bezpośrednio po nagłówku ekranu.");
console.log("[OK] Kolejność: Program -> Lista -> Ankieta -> Dyplom -> Karta -> Checklista.");
console.log("[OK] Każdy kafelek zaczyna się dużym znakiem +.");
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

trap - ERR

echo
echo "==> SUKCES"
echo "[OK] Patch przeszedł parser TypeScript, build, testy i git diff --check."
echo "[OK] Nie wykonano commita."
echo
git status -sb
echo
echo "Backup v6: $BACKUP_DIR"
