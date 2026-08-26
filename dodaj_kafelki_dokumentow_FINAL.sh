#!/usr/bin/env bash
set -Eeuo pipefail

VIEW="src/moduly/dokumenty/ListaDokumentow.tsx"
CSS="src/moduly/dokumenty/listaDokumentow.css"

echo "==> Ultimate Pomagier: dodaję kafelki tworzenia dokumentów"
echo "    Cel: ListaDokumentow -> dokładnie między nagłówkiem a filtrami."

if [[ ! -f package.json || ! -f "$VIEW" || ! -f "$CSS" ]]; then
  echo "[BŁĄD] Uruchom skrypt w katalogu głównym Ultimate_Pomagier_3_5."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[BŁĄD] Brak Node.js w PATH."
  exit 1
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR=".pomagier_patch_kafelki_final_${STAMP}"
mkdir -p "$BACKUP_DIR"
cp "$VIEW" "$BACKUP_DIR/ListaDokumentow.tsx"
cp "$CSS" "$BACKUP_DIR/listaDokumentow.css"

rollback() {
  local code=$?
  echo
  echo "[ROLLBACK] Walidacja nie przeszła — przywracam stan sprzed patcha."
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

const classMarker = 'className="lista-dokumentow__szybkie-akcje"';

if (text.includes(classMarker)) {
  console.log("[INFO] Kafelki są już obecne — nie dodaję ich drugi raz.");
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
  console.error("[BŁĄD] Plik wejściowy ListaDokumentow.tsx ma błędy składniowe.");
  process.exit(20);
}

/* 1. Dane kafelków — po stałej etykiet statusów. */
const statusConst = "const etykietyStatusow:";
const statusStart = text.indexOf(statusConst);
if (statusStart < 0) {
  console.error("[BŁĄD] Nie znaleziono stałej etykietyStatusow.");
  process.exit(21);
}

const statusClose = text.indexOf("\n}", statusStart);
if (statusClose < 0) {
  console.error("[BŁĄD] Nie znaleziono końca etykietyStatusow.");
  process.exit(22);
}
const dataInsertAt = statusClose + 2;

const quickData = `

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
`;

/* 2. Funkcja otwierająca istniejący generator.
      Nie duplikuje tras — korzysta z działającej nawigacji aplikacji. */
const componentNeedle = "export default function ListaDokumentow({";
const componentAt = text.indexOf(componentNeedle);
if (componentAt < 0) {
  console.error("[BŁĄD] Nie znaleziono komponentu ListaDokumentow.");
  process.exit(23);
}

const bodyAt = text.indexOf(") {", componentAt);
if (bodyAt < 0) {
  console.error("[BŁĄD] Nie znaleziono początku ciała ListaDokumentow.");
  process.exit(24);
}
const helperInsertAt = bodyAt + 3;

const helper = `

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
        (oczekiwanaNazwa) =>
          tekst === oczekiwanaNazwa || tekst.includes(oczekiwanaNazwa),
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

/* 3. Dokładne miejsce z diagnostyki:
      </header>
      [TUTAJ]
      <form className="lista-dokumentow__filtry"...> */
const anchor = `      </header>

      <form className="lista-dokumentow__filtry"`;

const anchorAt = text.indexOf(anchor);
if (anchorAt < 0) {
  console.error(
    "[BŁĄD] Struktura ListaDokumentow zmieniła się — nie znaleziono nagłówek -> filtry.",
  );
  process.exit(25);
}

const tiles = `      </header>

      {!czyKosz && !typyStale?.length && (
        <div
          className="lista-dokumentow__szybkie-akcje"
          aria-label="Utwórz nowy dokument"
        >
          {szybkieDokumenty.map((dokument) => (
            <button
              key={dokument.etykieta}
              type="button"
              className="lista-dokumentow__szybka-akcja"
              onClick={() => otworzNowyDokument(dokument.nazwyNawigacji)}
            >
              <span
                className="lista-dokumentow__szybka-akcja-plus"
                aria-hidden="true"
              >
                +
              </span>
              <span className="lista-dokumentow__szybka-akcja-etykieta">
                {dokument.etykieta}
              </span>
            </button>
          ))}
        </div>
      )}

      <form className="lista-dokumentow__filtry"`;

/* Inserty od końca, żeby offsety się nie przesunęły. */
const insertions = [
  { at: anchorAt, remove: anchor.length, value: tiles },
  { at: helperInsertAt, remove: 0, value: helper },
  { at: dataInsertAt, remove: 0, value: quickData },
].sort((a, b) => b.at - a.at);

for (const item of insertions) {
  text =
    text.slice(0, item.at) +
    item.value +
    text.slice(item.at + item.remove);
}

/* 4. Style. */
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

/* 5. Walidacja parserem PRZED zapisem. */
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
  process.exit(26);
}

const quickActionsCount =
  text.split('className="lista-dokumentow__szybkie-akcje"').length - 1;

if (quickActionsCount !== 1) {
  console.error(
    `[BŁĄD] Oczekiwano 1 kontenera kafelków, znaleziono ${quickActionsCount}.`,
  );
  process.exit(27);
}

fs.writeFileSync(viewPath, text, "utf8");
fs.writeFileSync(cssPath, css, "utf8");

console.log("[OK] Kafelki dodano dokładnie między nagłówkiem i formularzem filtrów.");
console.log("[OK] Są widoczne tylko w głównym widoku Wszystkich dokumentów.");
console.log("[OK] Nie pojawiają się w Koszu ani w listach ograniczonych do jednego typu.");
console.log("[OK] Kolejność:");
console.log("     Program -> Lista -> Ankieta -> Dyplom -> Karta -> Checklista");
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
echo "[OK] Patch przeszedł git diff --check, build i testy."
echo "[OK] Nie wykonano commita."
echo "[INFO] Backup techniczny: $BACKUP_DIR"
echo
git status -sb
