#!/usr/bin/env bash
set -Eeuo pipefail

# Ultimate Pomagier — miniatury zadań z kadrowaniem — V3
# BEZ CODEXA / BEZ PYTHONA
# Wznawialny po częściowo wykonanym V2.
#
# Uruchom:
#   bash ./wdroz_miniatury_pulpitu_bez_codexa_v3.sh

die() { printf '\n[BŁĄD] %s\n' "$*" >&2; exit 1; }
note() { printf '\n==> %s\n' "$*"; }

command -v git >/dev/null 2>&1 || die "Nie znaleziono git."
command -v node >/dev/null 2>&1 || die "Nie znaleziono node."
command -v npm >/dev/null 2>&1 || die "Nie znaleziono npm."

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "Uruchom skrypt wewnątrz repozytorium Git."
cd "$ROOT"
[[ -f package.json ]] || die "Brak package.json w root repo."

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/.git/backup-miniatury-pulpitu-v3-$STAMP"
mkdir -p "$BACKUP"

FILES=(
  "src/moduly/zamkniete/pulpit/WidokPulpitu.tsx"
  "src/moduly/zamkniete/pulpit/logika/miniaturyZadan.ts"
  "src/moduly/zamkniete/pulpit/modele/pulpit.ts"
  "src/moduly/zamkniete/pulpit/uslugi/magazynPulpitu.ts"
  "src/moduly/zamkniete/pulpit/pulpit.css"
  "testy/pulpit.regresja.test.ts"
)

note "Repo: $ROOT"
note "Tworzę kopię bezpieczeństwa w $BACKUP"
git status -sb > "$BACKUP/status-przed.txt"
git diff > "$BACKUP/diff-przed.patch"

for f in "${FILES[@]}"; do
  [[ -f "$f" ]] || die "Brak wymaganego pliku: $f"
  mkdir -p "$BACKUP/$(dirname "$f")"
  cp "$f" "$BACKUP/$f"
done

note "Wznawiam wdrożenie. Już nałożone fragmenty zostaną pominięte."

node <<'NODE'
const fs = require('fs');

const paths = {
  model: 'src/moduly/zamkniete/pulpit/modele/pulpit.ts',
  logic: 'src/moduly/zamkniete/pulpit/logika/miniaturyZadan.ts',
  store: 'src/moduly/zamkniete/pulpit/uslugi/magazynPulpitu.ts',
  view: 'src/moduly/zamkniete/pulpit/WidokPulpitu.tsx',
  css: 'src/moduly/zamkniete/pulpit/pulpit.css',
  test: 'testy/pulpit.regresja.test.ts',
};

const original = Object.fromEntries(
  Object.entries(paths).map(([key, path]) => [key, fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n')])
);
const next = { ...original };
const report = [];

function ok(label, state) {
  report.push(`${state === 'skip' ? '[JUŻ BYŁO]' : '[DODANO]'} ${label}`);
}

function must(condition, message) {
  if (!condition) throw new Error(message);
}

function replaceExact(key, oldText, newText, label, alreadyPattern) {
  let text = next[key];
  if (alreadyPattern && alreadyPattern.test(text)) {
    ok(label, 'skip');
    return;
  }
  const count = text.split(oldText).length - 1;
  must(count === 1, `${label}: oczekiwano 1 dokładnego fragmentu, znaleziono ${count}.`);
  next[key] = text.replace(oldText, newText);
  ok(label, 'add');
}

function replaceRegex(key, regex, replacement, label, alreadyPattern) {
  let text = next[key];
  if (alreadyPattern && alreadyPattern.test(text)) {
    ok(label, 'skip');
    return;
  }
  const matches = [...text.matchAll(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g'))];
  must(matches.length === 1, `${label}: oczekiwano 1 dopasowania regex, znaleziono ${matches.length}.`);
  next[key] = text.replace(regex, replacement);
  ok(label, 'add');
}

function appendOnce(key, marker, block, label) {
  if (next[key].includes(marker)) {
    ok(label, 'skip');
    return;
  }
  next[key] = next[key].trimEnd() + '\n\n' + block.trim() + '\n';
  ok(label, 'add');
}

// ---------------------------------------------------------------------------
// MODEL — V2 mógł go już zmienić.
// ---------------------------------------------------------------------------
if (/export type KadrMiniaturyZadania/.test(next.model) && /zrodloDaneUrl:\s*string/.test(next.model)) {
  ok('rozszerzony model miniatury', 'skip');
} else {
  replaceRegex(
    'model',
    /export type MiniaturaZadaniaPulpitu = \{\n\s*daneUrl: string\n\s*nazwaPliku: string\n\s*szerokosc: number\n\s*wysokosc: number\n\}/,
    `export type ProporcjaMiniaturyZadania = '16:9' | '4:3' | '1:1'

export type KadrMiniaturyZadania = {
  x: number
  y: number
  zoom: number
  proporcja: ProporcjaMiniaturyZadania
}

export type MiniaturaZadaniaPulpitu = {
  daneUrl: string
  zrodloDaneUrl: string
  nazwaPliku: string
  szerokosc: number
  wysokosc: number
  szerokoscZrodla: number
  wysokoscZrodla: number
  kadr: KadrMiniaturyZadania
}`,
    'rozszerzony model miniatury',
  );
}

// ---------------------------------------------------------------------------
// LOGIKA — jeśli V2 ją nadpisał, tylko weryfikujemy.
// ---------------------------------------------------------------------------
if (
  /export async function aktualizujKadrMiniatury/.test(next.logic)
  && /const maksymalnyWymiarZrodla = 1600/.test(next.logic)
  && /normalizujKadrMiniatury/.test(next.logic)
) {
  ok('logika źródła roboczego i kadrowania', 'skip');
} else {
  throw new Error('logika miniatur nie jest ani stanem bazowym, ani kompletnym stanem V2. Użyj backupu i prześlij stan pliku miniaturyZadan.ts.');
}

// ---------------------------------------------------------------------------
// MAGAZYN — V2 najpewniej już zmienił.
// ---------------------------------------------------------------------------
if (
  /import \{ normalizujKadrMiniatury \} from '\.\.\/logika\/miniaturyZadan'/.test(next.store)
  && /zrodloDaneUrl/.test(next.store)
  && /szerokoscZrodla/.test(next.store)
) {
  ok('normalizacja nowego i starego formatu miniatury', 'skip');
} else {
  throw new Error('magazyn Pulpitu nie zawiera oczekiwanej części V2. Patch zatrzymany dla bezpieczeństwa.');
}

// ---------------------------------------------------------------------------
// WIDOK — elastyczne importy, niezależne od łamania długiej linii.
// ---------------------------------------------------------------------------
replaceRegex(
  'view',
  /import\s*\{\s*przygotujMiniatureZadania\s*\}\s*from\s*'\.\/logika\/miniaturyZadan'/,
  "import { aktualizujKadrMiniatury, przygotujMiniatureZadania } from './logika/miniaturyZadan'",
  'import funkcji kadrowania',
  /aktualizujKadrMiniatury,\s*przygotujMiniatureZadania/,
);

if (!/\bKadrMiniaturyZadania\b/.test(next.view.match(/import type[\s\S]*?from '\.\/modele\/pulpit'/)?.[0] || '')) {
  const importTypeRegex = /import type\s*\{([\s\S]*?)\}\s*from\s*'\.\/modele\/pulpit'/;
  const match = next.view.match(importTypeRegex);
  must(match, 'Nie znaleziono importu typów z ./modele/pulpit.');
  const names = match[1].split(',').map(s => s.trim()).filter(Boolean);
  must(names.includes('JednostkaPrzypomnienia') && names.includes('ZadaniePulpitu'), 'Import typów Pulpitu ma nieoczekiwany kształt.');
  const index = Math.max(0, names.indexOf('PaczkaPulpitu'));
  names.splice(index, 0, 'KadrMiniaturyZadania');
  const unique = [...new Set(names)];
  next.view = next.view.replace(importTypeRegex, `import type { ${unique.join(', ')} } from './modele/pulpit'`);
  ok('import typu KadrMiniaturyZadania', 'add');
} else {
  ok('import typu KadrMiniaturyZadania', 'skip');
}

replaceRegex(
  'view',
  /function MiniaturaZadaniaNaOsi\(\{ zadanie, zakresDniaPracy \}: \{ zadanie: ZadaniePulpitu; zakresDniaPracy: ZakresDniaPracy \}\) \{[\s\S]*?\n\}/,
  `function MiniaturaZadaniaNaOsi({ zadanie, zakresDniaPracy, otworz }: { zadanie: ZadaniePulpitu; zakresDniaPracy: ZakresDniaPracy; otworz: () => void }) {
  const godzinaMarkera = pobierzGodzineMarkeraZadania(zadanie, zakresDniaPracy)
  if (!zadanie.miniatura || !godzinaMarkera) return null

  const pozycja = pozycjaGodzinyNaOsi(godzinaMarkera, zakresDniaPracy)
  const klasaKrawedzi = pozycja <= 5
    ? ' pulpit-os-czasu__miniatura--lewo'
    : pozycja >= 95
      ? ' pulpit-os-czasu__miniatura--prawo'
      : ''

  return <button
    aria-label={'Otwórz zadanie z miniaturą: ' + zadanie.tytul}
    className={'pulpit-os-czasu__miniatura' + klasaKrawedzi}
    onClick={otworz}
    style={{ left: pozycja + '%' }}
    type="button"
  >
    <img alt="" aria-hidden="true" src={zadanie.miniatura.daneUrl} />
  </button>
}`,
  'klikalna miniatura na osi',
  /function MiniaturaZadaniaNaOsi\(\{ zadanie, zakresDniaPracy, otworz \}/,
);

replaceExact(
  'view',
  `  const [bladMiniatury, ustawBladMiniatury] = useState('')
  const [czyPrzetwarzanieMiniatury, ustawCzyPrzetwarzanieMiniatury] = useState(false)
  const [czyPrzeciaganieMiniatury, ustawCzyPrzeciaganieMiniatury] = useState(false)

  async function dodajMiniature(plik: File | null | undefined) {
`,
  `  const [bladMiniatury, ustawBladMiniatury] = useState('')
  const [czyPrzetwarzanieMiniatury, ustawCzyPrzetwarzanieMiniatury] = useState(false)
  const [czyPrzeciaganieMiniatury, ustawCzyPrzeciaganieMiniatury] = useState(false)
  const [czyEdycjaKadru, ustawCzyEdycjaKadru] = useState(false)
  const [miniaturaPrzedEdycja, ustawMiniaturePrzedEdycja] = useState<FormularzZadania['miniatura']>()

  async function dodajMiniature(plik: File | null | undefined) {
`,
  'stan edytora kadru',
  /const \[czyEdycjaKadru, ustawCzyEdycjaKadru\]/,
);

replaceExact(
  'view',
  `      const miniatura = await przygotujMiniatureZadania(plik)
      ustawFormularz((obecny) => ({ ...obecny, miniatura }))
`,
  `      const miniatura = await przygotujMiniatureZadania(plik)
      ustawFormularz((obecny) => ({ ...obecny, miniatura }))
      ustawMiniaturePrzedEdycja(miniatura)
      ustawCzyEdycjaKadru(true)
`,
  'automatyczne otwarcie kadrowania po dodaniu grafiki',
  /ustawMiniaturePrzedEdycja\(miniatura\)[\s\S]*?ustawCzyEdycjaKadru\(true\)/,
);

if (!/async function zmienKadrMiniatury/.test(next.view)) {
  const anchor = `  function obsluzWklejenie(zdarzenie: ClipboardEvent<HTMLFormElement>) {`;
  must(next.view.includes(anchor), 'Nie znaleziono funkcji obsluzWklejenie.');
  const functions = `  async function zmienKadrMiniatury(zmiana: Partial<KadrMiniaturyZadania>) {
    if (!formularz.miniatura) return
    ustawCzyPrzetwarzanieMiniatury(true)
    ustawBladMiniatury('')

    try {
      const miniatura = await aktualizujKadrMiniatury(formularz.miniatura, zmiana)
      ustawFormularz((obecny) => ({ ...obecny, miniatura }))
    } catch (bladObrazu) {
      ustawBladMiniatury(bladObrazu instanceof Error ? bladObrazu.message : 'Nie udało się zaktualizować kadru.')
    } finally {
      ustawCzyPrzetwarzanieMiniatury(false)
    }
  }

  function rozpocznijEdycjeKadru() {
    if (!formularz.miniatura) return
    ustawMiniaturePrzedEdycja(formularz.miniatura)
    ustawCzyEdycjaKadru(true)
  }

  function anulujEdycjeKadru() {
    if (miniaturaPrzedEdycja) {
      ustawFormularz((obecny) => ({ ...obecny, miniatura: miniaturaPrzedEdycja }))
    }
    ustawCzyEdycjaKadru(false)
    ustawMiniaturePrzedEdycja(undefined)
  }

  function zatwierdzEdycjeKadru() {
    ustawCzyEdycjaKadru(false)
    ustawMiniaturePrzedEdycja(undefined)
  }

`;
  next.view = next.view.replace(anchor, functions + anchor);
  ok('funkcje edycji/resetu/anulowania kadru', 'add');
} else {
  ok('funkcje edycji/resetu/anulowania kadru', 'skip');
}

if (!/pulpit-miniatura-edytor/.test(next.view)) {
  const oldUi = `      {formularz.miniatura && <img alt={'Miniatura: ' + formularz.miniatura.nazwaPliku} src={formularz.miniatura.daneUrl} />}
      <div className="pulpit-formularz-zadania__miniatura-opis">
        <strong>Miniatura zadania <span>(opcjonalna)</span></strong>
        <small>Wybierz obraz z dysku, przeciągnij go tutaj lub wklej ze schowka skrótem Ctrl+V.</small>
      </div>
      <div className="pulpit-formularz-zadania__miniatura-akcje">
        <label className="pulpit-formularz-zadania__wybor-pliku" htmlFor={identyfikatorPliku}>
          {czyPrzetwarzanieMiniatury ? 'Przygotowywanie…' : formularz.miniatura ? 'Zmień obraz' : 'Wybierz z dysku'}
          <input accept="image/*" disabled={czyPrzetwarzanieMiniatury} id={identyfikatorPliku} onChange={(zdarzenie) => { void dodajMiniature(zdarzenie.target.files?.[0]); zdarzenie.target.value = '' }} type="file" />
        </label>
        {formularz.miniatura && <button disabled={czyPrzetwarzanieMiniatury} onClick={() => ustawFormularz((obecny) => ({ ...obecny, miniatura: undefined }))} type="button">Usuń miniaturę</button>}
      </div>
    </div>`;

  const newUi = `      {formularz.miniatura && <img alt={'Miniatura: ' + formularz.miniatura.nazwaPliku} className="pulpit-formularz-zadania__miniatura-podglad" src={formularz.miniatura.daneUrl} />}
      <div className="pulpit-formularz-zadania__miniatura-opis">
        <strong>Miniatura zadania <span>(opcjonalna)</span></strong>
        <small>Wybierz obraz z dysku, przeciągnij go tutaj lub wklej ze schowka skrótem Ctrl+V.</small>
      </div>
      <div className="pulpit-formularz-zadania__miniatura-akcje">
        <label className="pulpit-formularz-zadania__wybor-pliku" htmlFor={identyfikatorPliku}>
          {czyPrzetwarzanieMiniatury ? 'Przygotowywanie…' : formularz.miniatura ? 'Zmień obraz' : 'Wybierz z dysku'}
          <input accept="image/png,image/jpeg,image/webp" disabled={czyPrzetwarzanieMiniatury} id={identyfikatorPliku} onChange={(zdarzenie) => { void dodajMiniature(zdarzenie.target.files?.[0]); zdarzenie.target.value = '' }} type="file" />
        </label>
        {formularz.miniatura && <button disabled={czyPrzetwarzanieMiniatury} onClick={rozpocznijEdycjeKadru} type="button">Edytuj miniaturę</button>}
        {formularz.miniatura && <button disabled={czyPrzetwarzanieMiniatury} onClick={() => { ustawCzyEdycjaKadru(false); ustawMiniaturePrzedEdycja(undefined); ustawFormularz((obecny) => ({ ...obecny, miniatura: undefined })) }} type="button">Usuń miniaturę</button>}
      </div>
      {formularz.miniatura && czyEdycjaKadru && <div className="pulpit-miniatura-edytor">
        <div>
          <strong>Kadr miniatury</strong>
          <small>Przesuń kadr, ustaw zoom i wybierz proporcje. Obraz źródłowy pozostaje zapisany do późniejszej edycji.</small>
        </div>
        <label>Format
          <select disabled={czyPrzetwarzanieMiniatury} onChange={(zdarzenie) => { void zmienKadrMiniatury({ proporcja: zdarzenie.target.value as KadrMiniaturyZadania['proporcja'] }) }} value={formularz.miniatura.kadr.proporcja}>
            <option value="16:9">16:9 — szeroka</option>
            <option value="4:3">4:3 — klasyczna</option>
            <option value="1:1">1:1 — kwadrat</option>
          </select>
        </label>
        <label>Zoom <span>{formularz.miniatura.kadr.zoom.toFixed(2)}×</span>
          <input disabled={czyPrzetwarzanieMiniatury} max="3" min="1" onChange={(zdarzenie) => { void zmienKadrMiniatury({ zoom: Number(zdarzenie.target.value) }) }} step="0.05" type="range" value={formularz.miniatura.kadr.zoom} />
        </label>
        <label>Poziom
          <input disabled={czyPrzetwarzanieMiniatury} max="1" min="-1" onChange={(zdarzenie) => { void zmienKadrMiniatury({ x: Number(zdarzenie.target.value) }) }} step="0.02" type="range" value={formularz.miniatura.kadr.x} />
        </label>
        <label>Pion
          <input disabled={czyPrzetwarzanieMiniatury} max="1" min="-1" onChange={(zdarzenie) => { void zmienKadrMiniatury({ y: Number(zdarzenie.target.value) }) }} step="0.02" type="range" value={formularz.miniatura.kadr.y} />
        </label>
        <div className="pulpit-miniatura-edytor__akcje">
          <button disabled={czyPrzetwarzanieMiniatury} onClick={() => { void zmienKadrMiniatury({ x: 0, y: 0, zoom: 1, proporcja: '16:9' }) }} type="button">Resetuj</button>
          <button disabled={czyPrzetwarzanieMiniatury} onClick={anulujEdycjeKadru} type="button">Anuluj</button>
          <button className="pulpit-przycisk-glowny" disabled={czyPrzetwarzanieMiniatury} onClick={zatwierdzEdycjeKadru} type="button">Zastosuj kadr</button>
        </div>
      </div>}
    </div>`;

  must(next.view.includes(oldUi), 'Nie znaleziono oczekiwanego bloku UI miniatury.');
  next.view = next.view.replace(oldUi, newUi);
  ok('edytor kadru w formularzu', 'add');
} else {
  ok('edytor kadru w formularzu', 'skip');
}

if (!/miniatura:\s*formularzEdycji\.miniatura/.test(next.view)) {
  replaceRegex(
    'view',
    /(\s*przypomnienia:\s*formularzEdycji\.przypomnienia\.map\(\(przypomnienie\) => \(\{ \.\.\.przypomnienie \}\)\),\n)(\s*powiazaneSzkolenieId:)/,
    `$1        miniatura: formularzEdycji.miniatura,\n$2`,
    'zapis miniatury przy edycji',
  );
} else {
  ok('zapis miniatury przy edycji', 'skip');
}

if (!/miniatura:\s*noweZadanie\.miniatura/.test(next.view)) {
  replaceRegex(
    'view',
    /(\s*przypomnienia:\s*noweZadanie\.przypomnienia,\n)(\s*powiazaneSzkolenieId:)/,
    `$1      miniatura: noweZadanie.miniatura,\n$2`,
    'zapis miniatury przy tworzeniu',
  );
} else {
  ok('zapis miniatury przy tworzeniu', 'skip');
}

if (!/className="pulpit-os-czasu__miniatury"/.test(next.view)) {
  replaceRegex(
    'view',
    /(<div className="pulpit-os-czasu" aria-label=\{'Dobowa oś czasu od 00:00 do 23:59; dzień pracy od ' \+ zakresDniaPracy\.poczatek \+ ' do ' \+ zakresDniaPracy\.koniec\}>\n)(\s*<div className="pulpit-os-czasu__linia">)/,
    `$1        <div className="pulpit-os-czasu__miniatury">
          {zadaniaGodzinowe.map((zadanie) => <MiniaturaZadaniaNaOsi key={'miniatura-' + zadanie.id} otworz={() => ustawWybraneZadanie(zadanie)} zakresDniaPracy={zakresDniaPracy} zadanie={zadanie} />)}
        </div>
$2`,
    'warstwa miniatur nad osią czasu',
  );
} else {
  ok('warstwa miniatur nad osią czasu', 'skip');
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------
appendOnce(
  'css',
  '/* MINIATURY ZADAŃ NA OSI CZASU */',
  `/* MINIATURY ZADAŃ NA OSI CZASU */
.pulpit-os-czasu__miniatury {
  position: relative;
  z-index: 22;
  height: 78px;
  margin-bottom: 8px;
  overflow: visible;
}

.pulpit .pulpit-os-czasu__miniatura {
  position: absolute;
  z-index: 22;
  bottom: 0;
  width: 82px;
  height: 54px;
  min-height: 0;
  overflow: hidden;
  border: 2px solid color-mix(in srgb, var(--ui-akcent) 75%, #fff);
  border-radius: 8px;
  background: var(--ui-powierzchnia);
  padding: 0;
  transform: translateX(-50%);
  box-shadow: 0 7px 18px rgba(0, 0, 0, .38);
}

.pulpit .pulpit-os-czasu__miniatura:hover,
.pulpit .pulpit-os-czasu__miniatura:focus-visible {
  z-index: 35;
  border-color: #fef08a;
  transform: translateX(-50%) scale(1.35);
}

.pulpit .pulpit-os-czasu__miniatura--lewo {
  transform-origin: left bottom;
  transform: translateX(0);
}

.pulpit .pulpit-os-czasu__miniatura--lewo:hover,
.pulpit .pulpit-os-czasu__miniatura--lewo:focus-visible {
  transform: translateX(0) scale(1.35);
}

.pulpit .pulpit-os-czasu__miniatura--prawo {
  transform-origin: right bottom;
  transform: translateX(-100%);
}

.pulpit .pulpit-os-czasu__miniatura--prawo:hover,
.pulpit .pulpit-os-czasu__miniatura--prawo:focus-visible {
  transform: translateX(-100%) scale(1.35);
}

.pulpit-os-czasu__miniatura img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pulpit-formularz-zadania__miniatura {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: auto minmax(180px, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-width: 0;
  border: 1px dashed color-mix(in srgb, var(--ui-akcent) 55%, transparent);
  border-radius: 9px;
  background: color-mix(in srgb, var(--ui-powierzchnia) 82%, transparent);
  padding: 12px;
}

.pulpit-formularz-zadania__miniatura--przeciaganie {
  border-style: solid;
  border-color: #fef08a;
  background: color-mix(in srgb, var(--ui-akcent-mocny) 75%, var(--ui-powierzchnia));
}

.pulpit-formularz-zadania__miniatura-podglad {
  display: block;
  width: 116px;
  max-height: 88px;
  border-radius: 7px;
  object-fit: contain;
  background: #0b0b0b;
}

.pulpit-formularz-zadania__miniatura-opis {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.pulpit-formularz-zadania__miniatura-opis strong span,
.pulpit-formularz-zadania__miniatura-opis small {
  color: var(--ui-tekst-drugi);
}

.pulpit-formularz-zadania__miniatura-akcje {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  justify-content: flex-end;
}

.pulpit-formularz-zadania__wybor-pliku {
  display: inline-flex !important;
  width: auto;
  min-height: 35px;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--ui-akcent) 40%, transparent);
  border-radius: var(--ui-promien-pola);
  background: var(--ui-powierzchnia);
  color: var(--ui-tekst) !important;
  cursor: pointer;
  padding: 7px 10px;
}

.pulpit-formularz-zadania__wybor-pliku input {
  position: absolute;
  width: 1px !important;
  height: 1px;
  min-height: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.pulpit-miniatura-edytor {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 10px;
  align-items: end;
  border-top: 1px solid color-mix(in srgb, var(--ui-akcent) 28%, transparent);
  padding-top: 12px;
}

.pulpit-miniatura-edytor > div:first-child {
  grid-column: 1 / -1;
  display: grid;
  gap: 3px;
}

.pulpit-miniatura-edytor > div:first-child small {
  color: var(--ui-tekst-drugi);
}

.pulpit-miniatura-edytor label {
  display: grid;
  gap: 5px;
}

.pulpit-miniatura-edytor input[type="range"] {
  width: 100%;
  min-height: 28px;
  padding: 0;
}

.pulpit-miniatura-edytor__akcje {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.pulpit button:disabled,
.pulpit input:disabled,
.pulpit select:disabled {
  cursor: not-allowed;
  opacity: .58;
}

@media (max-width: 760px) {
  .pulpit-formularz-zadania__miniatura {
    grid-template-columns: 1fr;
  }

  .pulpit-formularz-zadania__miniatura-podglad {
    width: min(180px, 100%);
  }

  .pulpit-formularz-zadania__miniatura-akcje {
    justify-content: flex-start;
  }

  .pulpit-miniatura-edytor {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
  .pulpit-miniatura-edytor {
    grid-template-columns: 1fr;
  }
}`,
  'style miniatur i edytora kadru',
);

// ---------------------------------------------------------------------------
// TESTY
// ---------------------------------------------------------------------------
if (!/normalizujKadrMiniatury/.test(next.test.split('\n').slice(0, 25).join('\n'))) {
  const importAnchor = "import { generujZadaniaAutomatyczne } from '../src/moduly/zamkniete/pulpit/logika/zadaniaAutomatyczne.ts'\n";
  must(next.test.includes(importAnchor), 'Nie znaleziono importu generujZadaniaAutomatyczne w teście.');
  next.test = next.test.replace(
    importAnchor,
    importAnchor + "import { normalizujKadrMiniatury } from '../src/moduly/zamkniete/pulpit/logika/miniaturyZadan.ts'\n"
  );
  ok('import normalizujKadrMiniatury w teście', 'add');
} else {
  ok('import normalizujKadrMiniatury w teście', 'skip');
}

appendOnce(
  'test',
  "test('kadr miniatury ma bezpieczne wartości domyślne",
  `test('kadr miniatury ma bezpieczne wartości domyślne i ogranicza przesunięcie oraz zoom', () => {
  assert.deepEqual(normalizujKadrMiniatury(undefined), {
    x: 0,
    y: 0,
    zoom: 1,
    proporcja: '16:9',
  })
  assert.deepEqual(normalizujKadrMiniatury({ x: 8, y: -5, zoom: 99, proporcja: '1:1' }), {
    x: 1,
    y: -1,
    zoom: 3,
    proporcja: '1:1',
  })
})

test('stara miniatura bez źródła i kadru jest migrowana bez utraty zadania', () => {
  const staraMiniatura = 'data:image/webp;base64,AAAA'
  const znormalizowane = normalizujZadaniePulpitu({
    ...zadanie({ id: 'stara-miniatura' }),
    miniatura: {
      daneUrl: staraMiniatura,
      nazwaPliku: 'stara.webp',
      szerokosc: 320,
      wysokosc: 180,
    },
  })

  assert.ok(znormalizowane)
  assert.equal(znormalizowane.miniatura?.daneUrl, staraMiniatura)
  assert.equal(znormalizowane.miniatura?.zrodloDaneUrl, staraMiniatura)
  assert.equal(znormalizowane.miniatura?.szerokoscZrodla, 320)
  assert.equal(znormalizowane.miniatura?.wysokoscZrodla, 180)
  assert.deepEqual(znormalizowane.miniatura?.kadr, { x: 0, y: 0, zoom: 1, proporcja: '16:9' })
})

test('uszkodzona miniatura jest odrzucana bez odrzucania zadania', () => {
  const znormalizowane = normalizujZadaniePulpitu({
    ...zadanie({ id: 'uszkodzona-miniatura' }),
    miniatura: {
      daneUrl: 'javascript:alert(1)',
      zrodloDaneUrl: 'javascript:alert(1)',
      szerokosc: 320,
      wysokosc: 180,
      szerokoscZrodla: 1000,
      wysokoscZrodla: 600,
      kadr: { x: 0, y: 0, zoom: 1, proporcja: '16:9' },
    },
  })

  assert.ok(znormalizowane)
  assert.equal(znormalizowane.miniatura, undefined)
})

test('widok zapisuje miniaturę przy tworzeniu i edycji oraz renderuje ją nad markerem z tą samą pozycją czasu', () => {
  const widok = readFileSync('src/moduly/zamkniete/pulpit/WidokPulpitu.tsx', 'utf8')
  const css = readFileSync('src/moduly/zamkniete/pulpit/pulpit.css', 'utf8')

  assert.match(widok, /miniatura:\\s*noweZadanie\\.miniatura/)
  assert.match(widok, /miniatura:\\s*formularzEdycji\\.miniatura/)
  assert.match(widok, /pulpit-os-czasu__miniatury/)
  assert.match(widok, /MiniaturaZadaniaNaOsi/)
  assert.match(widok, /pozycjaGodzinyNaOsi\\(godzinaMarkera, zakresDniaPracy\\)/)
  assert.match(widok, /Edytuj miniaturę/)
  assert.match(widok, /Zmień obraz/)
  assert.match(widok, /Usuń miniaturę/)
  assert.match(widok, /Zastosuj kadr/)
  assert.match(css, /\\.pulpit-os-czasu__miniatura/)
})

test('model miniatury zachowuje źródło robocze i parametry ponownej edycji kadru', () => {
  const model = readFileSync('src/moduly/zamkniete/pulpit/modele/pulpit.ts', 'utf8')
  const logika = readFileSync('src/moduly/zamkniete/pulpit/logika/miniaturyZadan.ts', 'utf8')

  assert.match(model, /zrodloDaneUrl:\\s*string/)
  assert.match(model, /szerokoscZrodla:\\s*number/)
  assert.match(model, /wysokoscZrodla:\\s*number/)
  assert.match(model, /kadr:\\s*KadrMiniaturyZadania/)
  assert.match(logika, /maksymalnyWymiarZrodla\\s*=\\s*1600/)
  assert.match(logika, /aktualizujKadrMiniatury/)
  assert.match(logika, /proporcja/)
})`,
  'testy regresyjne miniatur',
);

// ---------------------------------------------------------------------------
// BRAMKI STRUKTURALNE — zanim cokolwiek zapiszemy.
// ---------------------------------------------------------------------------
const required = [
  ['view', /aktualizujKadrMiniatury/],
  ['view', /\bKadrMiniaturyZadania\b/],
  ['view', /miniatura:\s*noweZadanie\.miniatura/],
  ['view', /miniatura:\s*formularzEdycji\.miniatura/],
  ['view', /className="pulpit-os-czasu__miniatury"/],
  ['view', /Edytuj miniaturę/],
  ['css', /\/\* MINIATURY ZADAŃ NA OSI CZASU \*\//],
  ['test', /kadr miniatury ma bezpieczne wartości domyślne/],
  ['model', /zrodloDaneUrl:\s*string/],
  ['store', /normalizujKadrMiniatury/],
  ['logic', /aktualizujKadrMiniatury/],
];

for (const [key, pattern] of required) {
  must(pattern.test(next[key]), `Końcowa walidacja strukturalna nie przeszła dla ${key}: ${pattern}`);
}

// Dopiero teraz zapisujemy wszystkie pliki, dzięki czemu nie powstanie nowy
// stan częściowy przy błędzie dopasowania.
for (const [key, path] of Object.entries(paths)) {
  if (next[key] !== original[key]) {
    fs.writeFileSync(path, next[key], 'utf8');
  }
}

console.log('\n===== RAPORT PATCHA =====');
for (const line of report) console.log(line);
console.log('===== KONIEC RAPORTU PATCHA =====\n');
NODE

note "Zmiany kodu gotowe. Uruchamiam automatyczne kontrole."

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

has_npm_script() {
  node -e '
    const p = require("./package.json");
    process.exit(p.scripts && Object.prototype.hasOwnProperty.call(p.scripts, process.argv[1]) ? 0 : 1);
  ' "$1"
}

if has_npm_script test; then
  run_gate "npm test" npm test
fi

if has_npm_script lint; then
  run_gate "npm run lint" npm run lint
fi

if has_npm_script build; then
  run_gate "npm run build" npm run build
fi

run_gate "git diff --check" git diff --check

printf '\n===== STATUS =====\n'
git status -sb

printf '\n===== ZMIENIONE PLIKI PULPITU =====\n'
git diff --name-only -- \
  src/moduly/zamkniete/pulpit/WidokPulpitu.tsx \
  src/moduly/zamkniete/pulpit/logika/miniaturyZadan.ts \
  src/moduly/zamkniete/pulpit/modele/pulpit.ts \
  src/moduly/zamkniete/pulpit/uslugi/magazynPulpitu.ts \
  src/moduly/zamkniete/pulpit/pulpit.css \
  testy/pulpit.regresja.test.ts

printf '\n===== DIFF STAT PULPITU =====\n'
git diff --stat -- \
  src/moduly/zamkniete/pulpit/WidokPulpitu.tsx \
  src/moduly/zamkniete/pulpit/logika/miniaturyZadan.ts \
  src/moduly/zamkniete/pulpit/modele/pulpit.ts \
  src/moduly/zamkniete/pulpit/uslugi/magazynPulpitu.ts \
  src/moduly/zamkniete/pulpit/pulpit.css \
  testy/pulpit.regresja.test.ts

printf '\nKopia bezpieczeństwa V3: %s\n' "$BACKUP"
printf 'Patch NIE wykonał git add, commita ani push.\n'

if [[ "$VALIDATION_FAILED" -ne 0 ]]; then
  printf '\n[UWAGA] Kod został wdrożony, ale co najmniej jedna kontrola nie przeszła. Nie commituj przed analizą wyniku.\n' >&2
  exit 2
fi

printf '\n[OK] Wdrożenie i dostępne kontrole zakończyły się powodzeniem.\n'
