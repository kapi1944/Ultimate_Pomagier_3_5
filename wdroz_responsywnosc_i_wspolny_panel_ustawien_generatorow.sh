#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-.}"
cd "$REPO"

COMMON_TSX="src/moduly/dokumenty/wspolne/PanelUstawienGeneratora.tsx"
COMMON_CSS="src/moduly/dokumenty/wspolne/panelUstawienGeneratora.css"
LAYOUT_CSS="src/moduly/dokumenty/wspolne/ukladGeneratoraDokumentu.css"
DYPLOMY_TSX="src/moduly/dokumenty/generatory/dyplomy/WidokDyplomow.tsx"
DYPLOMY_CSS="src/moduly/dokumenty/generatory/dyplomy/widokDyplomow.css"

echo "==> Repo: $(pwd)"

if [[ ! -d .git ]]; then
  echo "BŁĄD: uruchom skrypt w katalogu głównym repozytorium Git."
  exit 1
fi

for plik in "$LAYOUT_CSS" "$DYPLOMY_TSX" "$DYPLOMY_CSS"; do
  if [[ ! -f "$plik" ]]; then
    echo "BŁĄD: nie znaleziono wymaganego pliku: $plik"
    exit 1
  fi
done

echo
echo "==> Stan Git przed zmianą"
git status -sb

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP=".git/backup-wspolny-panel-generatorow-$STAMP"
mkdir -p "$BACKUP"

for plik in "$LAYOUT_CSS" "$DYPLOMY_TSX" "$DYPLOMY_CSS"; do
  mkdir -p "$BACKUP/$(dirname "$plik")"
  cp "$plik" "$BACKUP/$plik"
done

for plik in "$COMMON_TSX" "$COMMON_CSS"; do
  if [[ -f "$plik" ]]; then
    mkdir -p "$BACKUP/$(dirname "$plik")"
    cp "$plik" "$BACKUP/$plik"
  fi
done

echo "==> Kopia bezpieczeństwa: $BACKUP"

mkdir -p "$(dirname "$COMMON_TSX")"

cat > "$COMMON_TSX" <<'EOF'
import { useEffect, useState, type KeyboardEvent, type PropsWithChildren, type ReactNode } from 'react'
import './panelUstawienGeneratora.css'

type OpcjePaneluUstawienGeneratora = {
  identyfikator: string
  kluczPrzypiecia?: string
  kluczWysuwania?: string
  domyslniePrzypiety?: boolean
  domyslnieWysuwanie?: boolean
}

export type StanPaneluUstawienGeneratora = {
  czyOtwarty: boolean
  czyPrzypiety: boolean
  czyWysuwanieWlaczone: boolean
  klasaHosta: string
  otworz: () => void
  zamknij: () => void
  przelaczOtwarcie: () => void
  otworzZKrawedzi: () => void
  schowajJesliOdpiety: () => void
  przelaczPrzypiecie: () => void
  przelaczWysuwanie: () => void
}

function pobierzUstawienieLogiczne(klucz: string, wartoscDomyslna: boolean) {
  try {
    const wartosc = window.localStorage.getItem(klucz)
    return wartosc === null ? wartoscDomyslna : wartosc === 'true'
  } catch {
    return wartoscDomyslna
  }
}

export function usePanelUstawienGeneratora({
  identyfikator,
  kluczPrzypiecia,
  kluczWysuwania,
  domyslniePrzypiety = false,
  domyslnieWysuwanie = true,
}: OpcjePaneluUstawienGeneratora): StanPaneluUstawienGeneratora {
  const bazowyKlucz = `ultimate-pomagier.generatory.${identyfikator}.panel-ustawien`
  const skutecznyKluczPrzypiecia = kluczPrzypiecia ?? `${bazowyKlucz}.przypiety`
  const skutecznyKluczWysuwania = kluczWysuwania ?? `${bazowyKlucz}.wysuwanie`

  const [czyPrzypiety, ustawCzyPrzypiety] = useState(() =>
    pobierzUstawienieLogiczne(skutecznyKluczPrzypiecia, domyslniePrzypiety),
  )
  const [czyOtwarty, ustawCzyOtwarty] = useState(czyPrzypiety)
  const [czyWysuwanieWlaczone, ustawCzyWysuwanieWlaczone] = useState(() =>
    pobierzUstawienieLogiczne(skutecznyKluczWysuwania, domyslnieWysuwanie),
  )

  useEffect(() => {
    try {
      window.localStorage.setItem(skutecznyKluczPrzypiecia, String(czyPrzypiety))
    } catch {
      return
    }
  }, [czyPrzypiety, skutecznyKluczPrzypiecia])

  useEffect(() => {
    try {
      window.localStorage.setItem(skutecznyKluczWysuwania, String(czyWysuwanieWlaczone))
    } catch {
      return
    }
  }, [czyWysuwanieWlaczone, skutecznyKluczWysuwania])

  function otworz() {
    ustawCzyOtwarty(true)
  }

  function zamknij() {
    ustawCzyOtwarty(false)
  }

  function przelaczOtwarcie() {
    ustawCzyOtwarty((wartosc) => !wartosc)
  }

  function otworzZKrawedzi() {
    if (czyWysuwanieWlaczone) otworz()
  }

  function schowajJesliOdpiety() {
    if (!czyPrzypiety) zamknij()
  }

  function przelaczPrzypiecie() {
    const czyPrzypiac = !czyPrzypiety
    ustawCzyPrzypiety(czyPrzypiac)
    ustawCzyOtwarty(czyPrzypiac)
  }

  function przelaczWysuwanie() {
    ustawCzyWysuwanieWlaczone((wartosc) => !wartosc)
  }

  return {
    czyOtwarty,
    czyPrzypiety,
    czyWysuwanieWlaczone,
    klasaHosta: czyOtwarty ? 'generator-dokumentu--panel-ustawien-otwarty' : '',
    otworz,
    zamknij,
    przelaczOtwarcie,
    otworzZKrawedzi,
    schowajJesliOdpiety,
    przelaczPrzypiecie,
    przelaczWysuwanie,
  }
}

type WlasciwosciPrzyciskuPaneluUstawien = PropsWithChildren<{
  idPanelu: string
  stan: StanPaneluUstawienGeneratora
  className?: string
}>

export function PrzyciskPaneluUstawienGeneratora({
  children = 'Dodatkowe ustawienia',
  className,
  idPanelu,
  stan,
}: WlasciwosciPrzyciskuPaneluUstawien) {
  return (
    <button
      aria-controls={idPanelu}
      aria-expanded={stan.czyOtwarty}
      className={className}
      onClick={stan.przelaczOtwarcie}
      type="button"
    >
      {children}
    </button>
  )
}

type WlasciwosciPaneluUstawien = PropsWithChildren<{
  id: string
  tytul?: ReactNode
  etykietaAria?: string
  className?: string
  stan: StanPaneluUstawienGeneratora
}>

export function PanelUstawienGeneratora({
  children,
  className,
  etykietaAria,
  id,
  stan,
  tytul = 'Dodatkowe ustawienia',
}: WlasciwosciPaneluUstawien) {
  function obsluzKlawisz(zdarzenie: KeyboardEvent<HTMLElement>) {
    if (zdarzenie.key === 'Escape' && !stan.czyPrzypiety) {
      zdarzenie.stopPropagation()
      stan.zamknij()
    }
  }

  const klasyPanelu = [
    'generator-dokumentu__panel-ustawien',
    stan.czyOtwarty ? 'generator-dokumentu__panel-ustawien--otwarty' : '',
    stan.czyPrzypiety ? 'generator-dokumentu__panel-ustawien--przypiety' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <div
        aria-hidden="true"
        className="generator-dokumentu__strefa-panelu-ustawien"
        onMouseEnter={stan.otworzZKrawedzi}
      />
      <aside
        aria-label={etykietaAria ?? (typeof tytul === 'string' ? tytul : 'Dodatkowe ustawienia generatora')}
        className={klasyPanelu}
        id={id}
        onKeyDown={obsluzKlawisz}
        onMouseEnter={stan.otworz}
        onMouseLeave={stan.schowajJesliOdpiety}
      >
        <header className="generator-dokumentu__panel-ustawien-naglowek">
          <h2>{tytul}</h2>
          <div className="generator-dokumentu__panel-ustawien-akcje">
            <button
              aria-pressed={stan.czyWysuwanieWlaczone}
              onClick={stan.przelaczWysuwanie}
              title={
                stan.czyWysuwanieWlaczone
                  ? 'Wyłącz wysuwanie z prawej krawędzi'
                  : 'Włącz wysuwanie z prawej krawędzi'
              }
              type="button"
            >
              ↪ {stan.czyWysuwanieWlaczone ? 'Wyłącz wysuwanie' : 'Włącz wysuwanie'}
            </button>
            <button
              aria-pressed={stan.czyPrzypiety}
              onClick={stan.przelaczPrzypiecie}
              title={stan.czyPrzypiety ? 'Odepnij panel ustawień' : 'Przypnij panel ustawień'}
              type="button"
            >
              📌 {stan.czyPrzypiety ? 'Odepnij panel' : 'Przypnij panel'}
            </button>
          </div>
        </header>
        <div className="generator-dokumentu__panel-ustawien-tresc">{children}</div>
      </aside>
    </>
  )
}
EOF

cat > "$COMMON_CSS" <<'EOF'
.widok.generator-dokumentu--panel-ustawien-otwarty {
  --generator-panel-ustawien-width: min(420px, calc(100vw - 22px));

  width: calc(100% - var(--generator-panel-ustawien-width));
  transition: width 220ms ease;
}

.generator-dokumentu__strefa-panelu-ustawien {
  position: fixed;
  inset: 0 0 0 auto;
  z-index: 30;
  width: 14px;
}

.generator-dokumentu--panel-ustawien-otwarty .generator-dokumentu__strefa-panelu-ustawien {
  pointer-events: none;
}

.generator-dokumentu__panel-ustawien {
  --generator-panel-ustawien-width: min(420px, calc(100vw - 22px));

  position: fixed;
  inset: 0 0 0 auto;
  z-index: 32;
  display: grid;
  width: var(--generator-panel-ustawien-width);
  height: 100dvh;
  grid-template-rows: auto minmax(0, 1fr);
  border-left: 1px solid color-mix(in srgb, var(--ui-akcent) 30%, transparent);
  background: var(--ui-powierzchnia);
  box-shadow: -18px 0 36px rgba(0, 0, 0, 0.36);
  opacity: 0;
  pointer-events: none;
  transform: translateX(100%);
  transition:
    opacity 180ms ease,
    transform 220ms ease;
}

.generator-dokumentu__panel-ustawien--otwarty {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}

.generator-dokumentu__panel-ustawien-naglowek {
  display: grid;
  gap: 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--ui-akcent) 22%, transparent);
  padding: 16px;
}

.generator-dokumentu__panel-ustawien-naglowek h2 {
  margin: 0;
  color: var(--ui-tekst);
  font-size: 1rem;
}

.generator-dokumentu__panel-ustawien-akcje {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.generator-dokumentu__panel-ustawien-akcje button {
  min-height: 32px;
  border: 1px solid color-mix(in srgb, var(--ui-akcent) 35%, transparent);
  border-radius: 6px;
  padding: 6px 9px;
  background: var(--ui-panel);
  color: var(--ui-tekst);
  cursor: pointer;
  font: inherit;
  font-size: .78rem;
}

.generator-dokumentu__panel-ustawien-akcje button:hover {
  border-color: var(--ui-akcent);
  background: var(--ui-akcent-mocny);
}

.generator-dokumentu__panel-ustawien-tresc {
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 16px;
  scrollbar-gutter: stable;
}

@media (max-width: 1120px) {
  .widok.generator-dokumentu--panel-ustawien-otwarty {
    width: 100%;
  }
}

@media (max-width: 760px) {
  .generator-dokumentu__strefa-panelu-ustawien {
    display: none;
  }

  .generator-dokumentu__panel-ustawien {
    width: min(380px, 92vw);
  }

  .generator-dokumentu__panel-ustawien-akcje {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .widok.generator-dokumentu--panel-ustawien-otwarty,
  .generator-dokumentu__panel-ustawien {
    transition: none;
  }
}

@media print {
  .generator-dokumentu__strefa-panelu-ustawien,
  .generator-dokumentu__panel-ustawien {
    display: none !important;
  }

  .widok.generator-dokumentu--panel-ustawien-otwarty {
    width: 100% !important;
  }
}
EOF

node <<'NODE'
const fs = require('fs')

const layoutCssPath = 'src/moduly/dokumenty/wspolne/ukladGeneratoraDokumentu.css'
const dyplomyCssPath = 'src/moduly/dokumenty/generatory/dyplomy/widokDyplomow.css'
const dyplomyTsxPath = 'src/moduly/dokumenty/generatory/dyplomy/WidokDyplomow.tsx'

function read(path) {
  return fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
}

function write(path, content) {
  fs.writeFileSync(path, content.replace(/\s+$/, '') + '\n', 'utf8')
}

let layoutCss = read(layoutCssPath)

if (!layoutCss.includes('container-name: generator-dokumentu;')) {
  const anchor = `.generator-dokumentu {\n  width: 100%;`
  if (!layoutCss.includes(anchor)) {
    throw new Error('Nie znaleziono początku wspólnego layoutu generatora.')
  }
  layoutCss = layoutCss.replace(
    anchor,
    `.generator-dokumentu {\n  container-name: generator-dokumentu;\n  container-type: inline-size;\n  width: 100%;`,
  )
}

if (!layoutCss.includes('@container generator-dokumentu (max-width: 900px)')) {
  const anchor = '@media (max-width: 900px) {'
  if (!layoutCss.includes(anchor)) {
    throw new Error('Nie znaleziono breakpointu wspólnego layoutu generatora.')
  }
  const block = `@container generator-dokumentu (max-width: 900px) {
  .generator-dokumentu__panele {
    grid-template-columns: 1fr;
  }
}

`
  layoutCss = layoutCss.replace(anchor, block + anchor)
}

write(layoutCssPath, layoutCss)

let dyplomyCss = read(dyplomyCssPath)

if (!dyplomyCss.includes('container-name: dyplomy;')) {
  const anchor = '.dyplomy {\n'
  if (!dyplomyCss.includes(anchor)) {
    throw new Error('Nie znaleziono głównego selektora .dyplomy.')
  }
  dyplomyCss = dyplomyCss.replace(
    anchor,
    `.dyplomy {\n  container-name: dyplomy;\n  container-type: inline-size;\n`,
  )
}

if (!dyplomyCss.includes('@container dyplomy (max-width: 1280px)')) {
  const anchor = '@media (max-width: 760px) {'
  if (!dyplomyCss.includes(anchor)) {
    throw new Error('Nie znaleziono mobilnego breakpointu Dyplomów.')
  }
  const block = `@container dyplomy (max-width: 1280px) {
  .dyplomy__uklad {
    grid-template-columns: 1fr;
  }

  .dyplomy__podglad {
    position: static;
  }
}

`
  dyplomyCss = dyplomyCss.replace(anchor, block + anchor)
}

write(dyplomyCssPath, dyplomyCss)

let tsx = read(dyplomyTsxPath)

const importLine = `import {
  PanelUstawienGeneratora,
  PrzyciskPaneluUstawienGeneratora,
  usePanelUstawienGeneratora,
} from '../../wspolne/PanelUstawienGeneratora'
`

if (!tsx.includes(`from '../../wspolne/PanelUstawienGeneratora'`)) {
  const anchor = `import { zapiszDokumentRoboczyGeneratora } from '../../../../wspolne/dokumenty/zapisDokumentuGeneratora'\n`
  if (!tsx.includes(anchor)) {
    throw new Error('Nie znaleziono miejsca na import wspólnego panelu ustawień.')
  }
  tsx = tsx.replace(anchor, anchor + importLine)
}

const stateRegex = /  const \[czyPanelUstawienPrzypiety,[\s\S]*?pobierzUstawienieLogiczne\(kluczWysuwaniaPaneluUstawien, true\),\n  \)\n/
if (stateRegex.test(tsx)) {
  tsx = tsx.replace(
    stateRegex,
    `  const panelUstawien = usePanelUstawienGeneratora({
    identyfikator: 'dyplomy',
    kluczPrzypiecia: kluczPrzypieciaPaneluUstawien,
    kluczWysuwania: kluczWysuwaniaPaneluUstawien,
    domyslniePrzypiety: false,
    domyslnieWysuwanie: true,
  })
`,
  )
} else if (!tsx.includes(`const panelUstawien = usePanelUstawienGeneratora({`)) {
  throw new Error('Nie znaleziono stanu prawego panelu Dyplomów do migracji.')
}

const oldPanelLogicRegex = /  useEffect\(\(\) => \{\n    try \{\n      localStorage\.setItem\(kluczPrzypieciaPaneluUstawien,[\s\S]*?  function przelaczPrzypieciePaneluUstawien\(\) \{\n    const czyPrzypiac = !czyPanelUstawienPrzypiety\n    ustawCzyPanelUstawienPrzypiety\(czyPrzypiac\)\n    ustawCzyPanelUstawienOtwarty\(czyPrzypiac\)\n  \}\n/
if (oldPanelLogicRegex.test(tsx)) {
  tsx = tsx.replace(oldPanelLogicRegex, '')
}

const oldRoot = `<section className={\`widok dyplomy\${czyPanelUstawienOtwarty ? ' dyplomy--panel-ustawien-otwarty' : ''}\`}>`
const newRoot = `<section className={\`widok dyplomy\${panelUstawien.klasaHosta ? \` \${panelUstawien.klasaHosta}\` : ''}\`}>`
if (tsx.includes(oldRoot)) {
  tsx = tsx.replace(oldRoot, newRoot)
} else if (!tsx.includes(newRoot)) {
  throw new Error('Nie znaleziono głównej klasy widoku Dyplomów do migracji.')
}

const oldTrigger = `          <button aria-controls="panel-ustawien-dyplomu" aria-expanded={czyPanelUstawienOtwarty} className="dyplomy__przycisk" onClick={() => ustawCzyPanelUstawienOtwarty((czyOtwarty) => !czyOtwarty)} type="button">
            Ustawienia dyplomu
          </button>`

const newTrigger = `          <PrzyciskPaneluUstawienGeneratora
            className="dyplomy__przycisk"
            idPanelu="panel-ustawien-dyplomu"
            stan={panelUstawien}
          >
            Ustawienia dyplomu
          </PrzyciskPaneluUstawienGeneratora>`

if (tsx.includes(oldTrigger)) {
  tsx = tsx.replace(oldTrigger, newTrigger)
} else if (!tsx.includes('<PrzyciskPaneluUstawienGeneratora')) {
  throw new Error('Nie znaleziono przycisku otwierającego panel Dyplomów.')
}

tsx = tsx.replace(
  `\n      <div aria-hidden="true" className="dyplomy__strefa-aktywacji" onMouseEnter={otworzPanelUstawienZKrawedzi} />\n`,
  '\n',
)

const oldPanelStartRegex = /          <section aria-label="Ustawienia dyplomu" className="dyplomy__sekcja dyplomy__sekcja--ustawienia" id="panel-ustawien-dyplomu" onMouseEnter=\{\(\) => ustawCzyPanelUstawienOtwarty\(true\)\} onMouseLeave=\{schowajPanelUstawienJesliOdpiety\}>\n            <div className="dyplomy__ustawienia-naglowek">[\s\S]*?            <div className="dyplomy__siatka dyplomy__siatka--trzy">/

if (oldPanelStartRegex.test(tsx)) {
  tsx = tsx.replace(
    oldPanelStartRegex,
    `          <PanelUstawienGeneratora
            id="panel-ustawien-dyplomu"
            stan={panelUstawien}
            tytul="Ustawienia dyplomu"
          >
            <div className="dyplomy__siatka dyplomy__siatka--trzy">`,
  )
} else if (!tsx.includes('<PanelUstawienGeneratora')) {
  throw new Error('Nie znaleziono obudowy panelu ustawień Dyplomów do migracji.')
}

const oldPanelEnd = `            </section>
          </section>

          <section className="dyplomy__sekcja">
            <h2>Termin</h2>`

const newPanelEnd = `            </section>
          </PanelUstawienGeneratora>

          <section className="dyplomy__sekcja">
            <h2>Termin</h2>`

if (tsx.includes(oldPanelEnd)) {
  tsx = tsx.replace(oldPanelEnd, newPanelEnd)
} else if (!tsx.includes('</PanelUstawienGeneratora>')) {
  throw new Error('Nie znaleziono końca panelu ustawień Dyplomów do migracji.')
}

const forbidden = [
  'czyPanelUstawienOtwarty',
  'czyPanelUstawienPrzypiety',
  'czyWysuwaniePaneluUstawienWlaczone',
  'ustawCzyPanelUstawienOtwarty',
  'ustawCzyPanelUstawienPrzypiety',
  'ustawCzyWysuwaniePaneluUstawienWlaczone',
  'otworzPanelUstawienZKrawedzi',
  'schowajPanelUstawienJesliOdpiety',
  'przelaczPrzypieciePaneluUstawien',
]

for (const symbol of forbidden) {
  if (tsx.includes(symbol)) {
    throw new Error(`Po migracji pozostał stary symbol panelu Dyplomów: ${symbol}`)
  }
}

write(dyplomyTsxPath, tsx)
NODE

echo
echo "==> Walidacja struktury"

grep -Fq "container-name: generator-dokumentu;" "$LAYOUT_CSS"
grep -Fq "@container generator-dokumentu (max-width: 900px)" "$LAYOUT_CSS"
grep -Fq "container-name: dyplomy;" "$DYPLOMY_CSS"
grep -Fq "@container dyplomy (max-width: 1280px)" "$DYPLOMY_CSS"
grep -Fq "usePanelUstawienGeneratora" "$DYPLOMY_TSX"
grep -Fq "PanelUstawienGeneratora" "$DYPLOMY_TSX"
grep -Fq "generator-dokumentu--panel-ustawien-otwarty" "$COMMON_CSS"

echo "OK: wspólny panel ustawień utworzony."
echo "OK: Dyplomy korzystają ze wspólnego panelu."
echo "OK: wspólny layout generatorów ma container query."
echo "OK: Dyplomy reagują na faktyczną szerokość contentu."

echo
echo "==> ESLint tylko dla zmienionych plików TSX"
npx --no-install eslint "$COMMON_TSX" "$DYPLOMY_TSX"

echo
echo "==> git diff --check tylko dla zakresu patcha"
git diff --check -- \
  "$COMMON_TSX" \
  "$COMMON_CSS" \
  "$LAYOUT_CSS" \
  "$DYPLOMY_TSX" \
  "$DYPLOMY_CSS"

echo
echo "==> Diff zakresu patcha"
git diff -- \
  "$COMMON_TSX" \
  "$COMMON_CSS" \
  "$LAYOUT_CSS" \
  "$DYPLOMY_TSX" \
  "$DYPLOMY_CSS"

echo
echo "==> Gotowe."
echo "Nie uruchamiam pełnego npm run build, ponieważ bieżący working tree ma niezależne"
echo "zmiany Pulpitu, które już wcześniej blokowały TypeScript."
echo
echo "Ręcznie sprawdź:"
echo "  1. Dyplomy: otwieranie/zamykanie prawego panelu."
echo "  2. Dyplomy: przypinanie/odpinanie panelu."
echo "  3. Dyplomy: wysuwanie panelu z prawej krawędzi."
echo "  4. Przy otwartym panelu content ma się zwężać, a układ 2-kolumnowy przechodzić"
echo "     na 1 kolumnę według REALNEJ szerokości contentu."
echo "  5. Przy wąskim oknie panel ma działać jako nakładka, bez ściskania contentu."
echo "  6. Inne generatory używające UkladGeneratoraDokumentu zachowują dotychczasowy"
echo "     wygląd, ale ich wspólne panele 2-kolumnowe reagują teraz także na szerokość kontenera."
echo
echo "Zmiany NIE zostały zacommitowane ani wypchnięte."
