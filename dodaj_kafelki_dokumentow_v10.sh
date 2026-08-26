#!/usr/bin/env bash
set -Eeuo pipefail

VIEW="src/moduly/dokumenty/ListaDokumentow.tsx"
CSS="src/moduly/dokumenty/listaDokumentow.css"

echo "==> Ultimate Pomagier: kafelki Dokumentów v10"
echo "    Wstawianie przez AST między <header> i <form>, niezależnie od CRLF/LF."

if [[ ! -f package.json || ! -f "$VIEW" || ! -f "$CSS" ]]; then
  echo "[BŁĄD] Uruchom skrypt w katalogu głównym Ultimate_Pomagier_3_5."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[BŁĄD] Brak Node.js w PATH."
  exit 1
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR=".pomagier_patch_kafelki_v10_${STAMP}"
mkdir -p "$BACKUP_DIR"
cp "$VIEW" "$BACKUP_DIR/ListaDokumentow.tsx"
cp "$CSS" "$BACKUP_DIR/listaDokumentow.css"

rollback() {
  local code=$?
  echo
  echo "[ROLLBACK] Walidacja nie przeszła — przywracam stan sprzed v10."
  cp "$BACKUP_DIR/ListaDokumentow.tsx" "$VIEW"
  cp "$BACKUP_DIR/listaDokumentow.css" "$CSS"
  echo "[ROLLBACK] Przywrócono oba pliki."
  echo "[INFO] Backup: $BACKUP_DIR"
  exit "$code"
}
trap rollback ERR

node <<'NODE'
const fs = require("fs");
const ts = require("typescript");

const viewPath = "src/moduly/dokumenty/ListaDokumentow.tsx";
const cssPath = "src/moduly/dokumenty/listaDokumentow.css";

let text = fs.readFileSync(viewPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");

const QUICK_CLASS = 'lista-dokumentow__szybkie-akcje';

if (text.includes(QUICK_CLASS)) {
  console.log("[INFO] Kafelki są już obecne — nie dodaję ich drugi raz.");
  process.exit(0);
}

const sf = ts.createSourceFile(
  viewPath,
  text,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

if (sf.parseDiagnostics.length) {
  console.error("[BŁĄD] ListaDokumentow.tsx ma błędy składni przed patchem.");
  process.exit(20);
}

function classNameLiteral(node) {
  let attrs = null;

  if (ts.isJsxElement(node)) attrs = node.openingElement.attributes;
  if (ts.isJsxSelfClosingElement(node)) attrs = node.attributes;
  if (!attrs) return null;

  for (const prop of attrs.properties) {
    if (
      ts.isJsxAttribute(prop) &&
      prop.name.getText(sf) === "className" &&
      prop.initializer &&
      ts.isStringLiteral(prop.initializer)
    ) {
      return prop.initializer.text;
    }
  }

  return null;
}

/* Znajdź komponent ListaDokumentow. */
let component = null;

function findComponent(node) {
  if (component) return;

  if (
    ts.isFunctionDeclaration(node) &&
    node.name?.text === "ListaDokumentow"
  ) {
    component = node;
    return;
  }

  ts.forEachChild(node, findComponent);
}

findComponent(sf);

if (!component || !component.body) {
  console.error("[BŁĄD] AST nie znalazł komponentu ListaDokumentow.");
  process.exit(21);
}

/* Znajdź główny return komponentu, bez wchodzenia do zagnieżdżonych funkcji. */
let mainReturn = null;

function findMainReturn(node) {
  if (mainReturn) return;

  if (node !== component.body && ts.isFunctionLike(node)) {
    return;
  }

  if (ts.isReturnStatement(node) && node.expression) {
    mainReturn = node;
    return;
  }

  ts.forEachChild(node, findMainReturn);
}

findMainReturn(component.body);

if (!mainReturn?.expression) {
  console.error("[BŁĄD] Nie znaleziono głównego return ListaDokumentow.");
  process.exit(22);
}

let root = mainReturn.expression;
while (ts.isParenthesizedExpression(root)) {
  root = root.expression;
}

if (!ts.isJsxElement(root)) {
  console.error(
    `[BŁĄD] Główny return ma typ ${ts.SyntaxKind[root.kind]}, oczekiwano JsxElement.`,
  );
  process.exit(23);
}

/* Z diagnostyki znamy strukturę:
   <section>
     <header className="lista-dokumentow__naglowek">...</header>
     <form className="lista-dokumentow__filtry">...</form>
     ...
   </section>
*/
const header = root.children.find(
  (child) =>
    ts.isJsxElement(child) &&
    classNameLiteral(child) === "lista-dokumentow__naglowek",
);

const form = root.children.find(
  (child) =>
    ts.isJsxElement(child) &&
    classNameLiteral(child) === "lista-dokumentow__filtry",
);

if (!header || !form) {
  console.error("[BŁĄD] AST nie znalazł oczekiwanego nagłówka i formularza filtrów.");
  console.error(
    "Top-level JSX:",
    root.children
      .filter((c) => ts.isJsxElement(c))
      .map((c) => ({
        tag: c.openingElement.tagName.getText(sf),
        className: classNameLiteral(c),
      })),
  );
  process.exit(24);
}

if (header.end >= form.getStart(sf)) {
  console.error("[BŁĄD] Nagłówek nie znajduje się przed formularzem filtrów.");
  process.exit(25);
}

/* Dane i helper wstawimy po formatujDate(), czyli w bezpiecznym top-level. */
let formatujDateDecl = null;

for (const st of sf.statements) {
  if (ts.isFunctionDeclaration(st) && st.name?.text === "formatujDate") {
    formatujDateDecl = st;
    break;
  }
}

if (!formatujDateDecl) {
  console.error("[BŁĄD] Nie znaleziono funkcji formatujDate.");
  process.exit(26);
}

const helperInsertAt = formatujDateDecl.end;

const helperBlock = `

const szybkieDokumenty = [
  {
    etykieta: 'Nowy program',
    nazwyNawigacji: ['Programy szkoleń', 'Program szkolenia', 'Programy'],
  },
  {
    etykieta: 'Nowa lista obecności',
    nazwyNawigacji: ['Listy obecności', 'Lista obecności'],
  },
  {
    etykieta: 'Nowa ankieta',
    nazwyNawigacji: ['Ankiety', 'Ankieta'],
  },
  {
    etykieta: 'Nowy dyplom',
    nazwyNawigacji: ['Dyplomy', 'Dyplom'],
  },
  {
    etykieta: 'Karta na drzwi',
    nazwyNawigacji: ['Karty na drzwi', 'Karta na drzwi', 'Karta informacyjna'],
  },
  {
    etykieta: 'Nowa checklista wysyłki paczek',
    nazwyNawigacji: [
      'Checklisty wysyłki paczek',
      'Checklista wysyłki paczek',
      'Checklista wysyłki',
    ],
  },
] as const

function otworzNowyDokument(nazwyNawigacji: readonly string[]) {
  const normalizuj = (wartosc: string) =>
    wartosc
      .replace(/\\s+/g, ' ')
      .trim()
      .toLocaleLowerCase('pl')

  const oczekiwane = nazwyNawigacji.map(normalizuj)

  const kandydaci = Array.from(
    document.querySelectorAll<HTMLElement>(
      'a, button, [role="button"], [data-nav], [data-view], [data-route]',
    ),
  ).filter(
    (element) => !element.closest('.lista-dokumentow__szybkie-akcje'),
  )

  const trafienie = kandydaci.find((element) => {
    const tekst = normalizuj(element.textContent ?? '')
    return oczekiwane.some(
      (nazwa) => tekst === nazwa || tekst.includes(nazwa),
    )
  })

  if (trafienie) {
    trafienie.click()
    return
  }

  console.error(
    'Nie znaleziono istniejącej nawigacji do generatora:',
    nazwyNawigacji,
  )
}
`;

/* Zachowaj wcięcie headera. */
const headerStart = header.getStart(sf);
const headerLineStart = text.lastIndexOf("\n", headerStart - 1) + 1;
const indent = (text.slice(headerLineStart, headerStart).match(/^\s*/) || ["      "])[0];

const tileLines = [
  `{!czyKosz && !typyStale?.length && (`,
  `  <div`,
  `    className="lista-dokumentow__szybkie-akcje"`,
  `    aria-label="Utwórz nowy dokument"`,
  `  >`,
  `    {szybkieDokumenty.map((dokument) => (`,
  `      <button`,
  `        key={dokument.etykieta}`,
  `        type="button"`,
  `        className="lista-dokumentow__szybka-akcja"`,
  `        onClick={() => otworzNowyDokument(dokument.nazwyNawigacji)}`,
  `      >`,
  `        <span`,
  `          className="lista-dokumentow__szybka-akcja-plus"`,
  `          aria-hidden="true"`,
  `        >`,
  `          +`,
  `        </span>`,
  `        <span className="lista-dokumentow__szybka-akcja-etykieta">`,
  `          {dokument.etykieta}`,
  `        </span>`,
  `      </button>`,
  `    ))}`,
  `  </div>`,
  `)}`,
];

const tiles =
  "\n" +
  tileLines.map((line) => indent + line).join("\n") +
  "\n";

/* Wstaw kafelki DOKŁADNIE na końcu headera.
   Offset jest wyznaczony z AST, więc CRLF/LF nie ma znaczenia.
*/
const jsxInsertAt = header.end;

const insertions = [
  { at: jsxInsertAt, value: tiles },
  { at: helperInsertAt, value: helperBlock },
].sort((a, b) => b.at - a.at);

for (const insertion of insertions) {
  text =
    text.slice(0, insertion.at) +
    insertion.value +
    text.slice(insertion.at);
}

/* CSS */
const cssMarker = "/* Kafelki szybkiego tworzenia dokumentów. */";

if (!css.includes(cssMarker)) {
  css = css.replace(/\s+$/, "") + `

${cssMarker}
.lista-dokumentow__szybkie-akcje {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin: 14px 0 18px;
}

.lista-dokumentow__szybka-akcja {
  min-width: 0;
  min-height: 76px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid currentColor;
  border-radius: 10px;
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

.lista-dokumentow__szybka-akcja:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.04);
}

.lista-dokumentow__szybka-akcja:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.lista-dokumentow__szybka-akcja-plus {
  flex: 0 0 auto;
  font-size: 2.3rem;
  line-height: 1;
  font-weight: 500;
}

.lista-dokumentow__szybka-akcja-etykieta {
  min-width: 0;
}

@media (max-width: 1450px) {
  .lista-dokumentow__szybkie-akcje {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .lista-dokumentow__szybkie-akcje {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 500px) {
  .lista-dokumentow__szybkie-akcje {
    grid-template-columns: 1fr;
  }
}
` + "\n";
}

/* Usuń nadmiarowe puste linie na końcu CSS.
   git diff --check traktuje pustą linię na EOF jako błąd. */
css = css.trimEnd() + "\n";

/* Walidacja parserem przed zapisem. */
const after = ts.createSourceFile(
  viewPath,
  text,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

if (after.parseDiagnostics.length) {
  console.error("[BŁĄD] Wygenerowany TSX nie przechodzi parsera:");
  for (const d of after.parseDiagnostics.slice(0, 12)) {
    const pos = d.start ?? 0;
    const lc = after.getLineAndCharacterOfPosition(pos);
    console.error(
      `  ${lc.line + 1}:${lc.character + 1} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`,
    );
  }
  process.exit(27);
}

const count =
  text.split('className="lista-dokumentow__szybkie-akcje"').length - 1;

if (count !== 1) {
  console.error(`[BŁĄD] Oczekiwano 1 kontenera kafelków, znaleziono ${count}.`);
  process.exit(28);
}

fs.writeFileSync(viewPath, text, "utf8");
fs.writeFileSync(cssPath, css, "utf8");

console.log("[OK] AST znalazł:");
console.log("     header.lista-dokumentow__naglowek");
console.log("     form.lista-dokumentow__filtry");
console.log("[OK] Kafelki wstawiono dokładnie pomiędzy nimi.");
console.log("[OK] Kolejność: Program -> Lista -> Ankieta -> Dyplom -> Karta -> Checklista.");
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
echo "[OK] Patch przeszedł parser, build, testy i git diff --check."
echo "[OK] Nie wykonano commita."
echo "[INFO] Backup: $BACKUP_DIR"
echo
git status -sb
