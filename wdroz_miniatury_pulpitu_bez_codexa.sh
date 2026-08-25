#!/usr/bin/env bash
set -Eeuo pipefail

# Ultimate Pomagier — miniatury zadań z kadrowaniem — BEZ CODEXA
# Uruchom w root repo:
#   bash ./wdroz_miniatury_pulpitu_bez_codexa.sh

die() { printf '\n[BŁĄD] %s\n' "$*" >&2; exit 1; }
note() { printf '\n==> %s\n' "$*"; }

command -v git >/dev/null 2>&1 || die "Nie znaleziono git."
command -v node >/dev/null 2>&1 || die "Nie znaleziono node."
command -v npm >/dev/null 2>&1 || die "Nie znaleziono npm."

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "Uruchom skrypt wewnątrz repozytorium Git."
cd "$ROOT"
[[ -f package.json ]] || die "Brak package.json w root repo."

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/.git/backup-miniatury-pulpitu-$STAMP"
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

note "Wprowadzam zmiany wyłącznie w plikach Pulpitu i jego teście."

python - <<'PY'
from pathlib import Path
import sys

def read(path):
    return Path(path).read_text(encoding="utf-8")

def write(path, text):
    Path(path).write_text(text, encoding="utf-8", newline="\n")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: oczekiwano dokładnie 1 dopasowania, znaleziono {count}. Patch przerwany bez dalszego zgadywania.")
    return text.replace(old, new, 1)

# ---------------------------------------------------------------------------
# 1. MODEL
# ---------------------------------------------------------------------------
path = "src/moduly/zamkniete/pulpit/modele/pulpit.ts"
text = read(path)

old = """export type MiniaturaZadaniaPulpitu = {
  daneUrl: string
  nazwaPliku: string
  szerokosc: number
  wysokosc: number
}
"""

new = """export type ProporcjaMiniaturyZadania = '16:9' | '4:3' | '1:1'

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
}
"""
text = replace_once(text, old, new, "model miniatury")
write(path, text)

# ---------------------------------------------------------------------------
# 2. LOGIKA OBRAZU — źródło robocze + deterministyczny kadr
# ---------------------------------------------------------------------------
path = "src/moduly/zamkniete/pulpit/logika/miniaturyZadan.ts"
text = r"""import type { KadrMiniaturyZadania, MiniaturaZadaniaPulpitu, ProporcjaMiniaturyZadania } from '../modele/pulpit'

const maksymalnyWymiarZrodla = 1600
const maksymalnyRozmiarPliku = 12 * 1024 * 1024
const szerokoscPodgladu = 320

const wymiaryProporcji: Record<ProporcjaMiniaturyZadania, { szerokosc: number; wysokosc: number }> = {
  '16:9': { szerokosc: 16, wysokosc: 9 },
  '4:3': { szerokosc: 4, wysokosc: 3 },
  '1:1': { szerokosc: 1, wysokosc: 1 },
}

function ogranicz(wartosc: number, minimum: number, maksimum: number) {
  return Math.min(maksimum, Math.max(minimum, wartosc))
}

export function normalizujKadrMiniatury(kadr: Partial<KadrMiniaturyZadania> | null | undefined): KadrMiniaturyZadania {
  const proporcja = kadr?.proporcja === '4:3' || kadr?.proporcja === '1:1' ? kadr.proporcja : '16:9'
  return {
    x: ogranicz(Number.isFinite(kadr?.x) ? Number(kadr?.x) : 0, -1, 1),
    y: ogranicz(Number.isFinite(kadr?.y) ? Number(kadr?.y) : 0, -1, 1),
    zoom: ogranicz(Number.isFinite(kadr?.zoom) ? Number(kadr?.zoom) : 1, 1, 3),
    proporcja,
  }
}

function wczytajObraz(adres: string) {
  return new Promise<HTMLImageElement>((rozwiaz, odrzuc) => {
    const obraz = new Image()
    obraz.onload = () => rozwiaz(obraz)
    obraz.onerror = () => odrzuc(new Error('Nie udało się odczytać obrazu.'))
    obraz.src = adres
  })
}

function pobierzWymiaryPodgladu(proporcja: ProporcjaMiniaturyZadania) {
  const wymiary = wymiaryProporcji[proporcja]
  return {
    szerokosc: szerokoscPodgladu,
    wysokosc: Math.max(1, Math.round(szerokoscPodgladu * wymiary.wysokosc / wymiary.szerokosc)),
  }
}

async function renderujKadr(zrodloDaneUrl: string, kadrWejsciowy: KadrMiniaturyZadania) {
  const kadr = normalizujKadrMiniatury(kadrWejsciowy)
  const obraz = await wczytajObraz(zrodloDaneUrl)
  const wymiary = pobierzWymiaryPodgladu(kadr.proporcja)
  const plotno = document.createElement('canvas')
  plotno.width = wymiary.szerokosc
  plotno.height = wymiary.wysokosc

  const kontekst = plotno.getContext('2d')
  if (!kontekst) throw new Error('Przeglądarka nie może przygotować miniatury.')

  const skalaBazowa = Math.max(
    wymiary.szerokosc / obraz.naturalWidth,
    wymiary.wysokosc / obraz.naturalHeight,
  )
  const skala = skalaBazowa * kadr.zoom
  const szerokoscRysunku = obraz.naturalWidth * skala
  const wysokoscRysunku = obraz.naturalHeight * skala
  const nadmiarX = Math.max(0, szerokoscRysunku - wymiary.szerokosc)
  const nadmiarY = Math.max(0, wysokoscRysunku - wymiary.wysokosc)
  const x = (wymiary.szerokosc - szerokoscRysunku) / 2 - kadr.x * nadmiarX / 2
  const y = (wymiary.wysokosc - wysokoscRysunku) / 2 - kadr.y * nadmiarY / 2

  kontekst.drawImage(obraz, x, y, szerokoscRysunku, wysokoscRysunku)

  return {
    daneUrl: plotno.toDataURL('image/webp', 0.82),
    szerokosc: wymiary.szerokosc,
    wysokosc: wymiary.wysokosc,
  }
}

async function przygotujZrodloRobocze(plik: File) {
  const adres = URL.createObjectURL(plik)

  try {
    const obraz = await wczytajObraz(adres)
    const skala = Math.min(1, maksymalnyWymiarZrodla / Math.max(obraz.naturalWidth, obraz.naturalHeight))
    const szerokosc = Math.max(1, Math.round(obraz.naturalWidth * skala))
    const wysokosc = Math.max(1, Math.round(obraz.naturalHeight * skala))
    const plotno = document.createElement('canvas')
    plotno.width = szerokosc
    plotno.height = wysokosc

    const kontekst = plotno.getContext('2d')
    if (!kontekst) throw new Error('Przeglądarka nie może przygotować obrazu roboczego.')

    kontekst.drawImage(obraz, 0, 0, szerokosc, wysokosc)

    return {
      zrodloDaneUrl: plotno.toDataURL('image/webp', 0.86),
      szerokoscZrodla: szerokosc,
      wysokoscZrodla: wysokosc,
    }
  } finally {
    URL.revokeObjectURL(adres)
  }
}

export async function przygotujMiniatureZadania(plik: File): Promise<MiniaturaZadaniaPulpitu> {
  if (!plik.type.startsWith('image/')) {
    throw new Error('Wybierz plik graficzny.')
  }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(plik.type.toLowerCase())) {
    throw new Error('Obsługiwane formaty miniatur to PNG, JPEG i WEBP.')
  }

  if (plik.size > maksymalnyRozmiarPliku) {
    throw new Error('Obraz może mieć maksymalnie 12 MB.')
  }

  const zrodlo = await przygotujZrodloRobocze(plik)
  const kadr = normalizujKadrMiniatury(undefined)
  const podglad = await renderujKadr(zrodlo.zrodloDaneUrl, kadr)

  return {
    ...zrodlo,
    ...podglad,
    kadr,
    nazwaPliku: plik.name || 'obraz-ze-schowka',
  }
}

export async function aktualizujKadrMiniatury(
  miniatura: MiniaturaZadaniaPulpitu,
  zmiana: Partial<KadrMiniaturyZadania>,
): Promise<MiniaturaZadaniaPulpitu> {
  const kadr = normalizujKadrMiniatury({ ...miniatura.kadr, ...zmiana })
  const podglad = await renderujKadr(miniatura.zrodloDaneUrl, kadr)
  return { ...miniatura, ...podglad, kadr }
}
"""
write(path, text)

# ---------------------------------------------------------------------------
# 3. MAGAZYN — zgodność starego i nowego modelu
# ---------------------------------------------------------------------------
path = "src/moduly/zamkniete/pulpit/uslugi/magazynPulpitu.ts"
text = read(path)

text = replace_once(
    text,
    "import type { JednostkaPrzypomnienia, MiniaturaZadaniaPulpitu, PrzypomnienieZadania, StanPulpitu, StatusZapotrzebowaniaZakupowego, ZadaniePulpitu, ZapotrzebowanieZakupowe } from '../modele/pulpit'\n",
    "import type { JednostkaPrzypomnienia, MiniaturaZadaniaPulpitu, PrzypomnienieZadania, StanPulpitu, StatusZapotrzebowaniaZakupowego, ZadaniePulpitu, ZapotrzebowanieZakupowe } from '../modele/pulpit'\nimport { normalizujKadrMiniatury } from '../logika/miniaturyZadan'\n",
    "import normalizacji kadru",
)

old = """function normalizujMiniatureZadania(wartosc: unknown): MiniaturaZadaniaPulpitu | null {
  if (!wartosc || typeof wartosc !== 'object') return null
  const dane = wartosc as Record<string, unknown>
  const daneUrl = tekst(dane.daneUrl)
  const szerokosc = Number(dane.szerokosc)
  const wysokosc = Number(dane.wysokosc)

  if (
    !/^data:image\\/(?:jpeg|png|webp);base64,/i.test(daneUrl)
    || daneUrl.length > 750_000
    || !Number.isFinite(szerokosc)
    || !Number.isFinite(wysokosc)
    || szerokosc <= 0
    || wysokosc <= 0
    || szerokosc > 480
    || wysokosc > 480
  ) return null

  return {
    daneUrl,
    nazwaPliku: tekst(dane.nazwaPliku).slice(0, 120) || 'miniatura',
    szerokosc,
    wysokosc,
  }
}
"""

new = """function normalizujMiniatureZadania(wartosc: unknown): MiniaturaZadaniaPulpitu | null {
  if (!wartosc || typeof wartosc !== 'object') return null
  const dane = wartosc as Record<string, unknown>
  const daneUrl = tekst(dane.daneUrl)
  const zrodloDaneUrl = tekst(dane.zrodloDaneUrl) || daneUrl
  const szerokosc = Number(dane.szerokosc)
  const wysokosc = Number(dane.wysokosc)
  const szerokoscZrodla = Number(dane.szerokoscZrodla ?? dane.szerokosc)
  const wysokoscZrodla = Number(dane.wysokoscZrodla ?? dane.wysokosc)

  if (
    !/^data:image\\/(?:jpeg|png|webp);base64,/i.test(daneUrl)
    || !/^data:image\\/(?:jpeg|png|webp);base64,/i.test(zrodloDaneUrl)
    || daneUrl.length > 750_000
    || zrodloDaneUrl.length > 3_500_000
    || !Number.isFinite(szerokosc)
    || !Number.isFinite(wysokosc)
    || !Number.isFinite(szerokoscZrodla)
    || !Number.isFinite(wysokoscZrodla)
    || szerokosc <= 0
    || wysokosc <= 0
    || szerokosc > 480
    || wysokosc > 480
    || szerokoscZrodla <= 0
    || wysokoscZrodla <= 0
    || szerokoscZrodla > 1600
    || wysokoscZrodla > 1600
  ) return null

  const kadrWejsciowy = dane.kadr && typeof dane.kadr === 'object'
    ? dane.kadr as Record<string, unknown>
    : undefined

  return {
    daneUrl,
    zrodloDaneUrl,
    nazwaPliku: tekst(dane.nazwaPliku).slice(0, 120) || 'miniatura',
    szerokosc,
    wysokosc,
    szerokoscZrodla,
    wysokoscZrodla,
    kadr: normalizujKadrMiniatury(kadrWejsciowy as never),
  }
}
"""
text = replace_once(text, old, new, "normalizator miniatury")
write(path, text)

# ---------------------------------------------------------------------------
# 4. WIDOK
# ---------------------------------------------------------------------------
path = "src/moduly/zamkniete/pulpit/WidokPulpitu.tsx"
text = read(path)

text = replace_once(
    text,
    "import { przygotujMiniatureZadania } from './logika/miniaturyZadan'\n",
    "import { aktualizujKadrMiniatury, przygotujMiniatureZadania } from './logika/miniaturyZadan'\n",
    "import logiki miniatur",
)

text = replace_once(
    text,
    "import type { JednostkaPrzypomnienia, PaczkaPulpitu, PrzypomnienieZadania, RodzajTerminuZadania, ZadaniePulpitu, ZapotrzebowanieZakupowe } from './modele/pulpit'\n",
    "import type { JednostkaPrzypomnienia, KadrMiniaturyZadania, PaczkaPulpitu, PrzypomnienieZadania, RodzajTerminuZadania, ZadaniePulpitu, ZapotrzebowanieZakupowe } from './modele/pulpit'\n",
    "import typu kadru",
)

old = """function MiniaturaZadaniaNaOsi({ zadanie, zakresDniaPracy }: { zadanie: ZadaniePulpitu; zakresDniaPracy: ZakresDniaPracy }) {
  const godzinaMarkera = pobierzGodzineMarkeraZadania(zadanie, zakresDniaPracy)
  if (!zadanie.miniatura || !godzinaMarkera) return null

  const pozycja = pozycjaGodzinyNaOsi(godzinaMarkera, zakresDniaPracy)
  const klasaKrawedzi = pozycja <= 5
    ? ' pulpit-os-czasu__miniatura--lewo'
    : pozycja >= 95
      ? ' pulpit-os-czasu__miniatura--prawo'
      : ''

  return <img
    alt=""
    aria-hidden="true"
    className={'pulpit-os-czasu__miniatura' + klasaKrawedzi}
    src={zadanie.miniatura.daneUrl}
    style={{ left: pozycja + '%' }}
  />
}
"""

new = """function MiniaturaZadaniaNaOsi({ zadanie, zakresDniaPracy, otworz }: { zadanie: ZadaniePulpitu; zakresDniaPracy: ZakresDniaPracy; otworz: () => void }) {
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
}
"""
text = replace_once(text, old, new, "render miniatury osi")

# States and crop functions inside form.
old = """  const [bladMiniatury, ustawBladMiniatury] = useState('')
  const [czyPrzetwarzanieMiniatury, ustawCzyPrzetwarzanieMiniatury] = useState(false)
  const [czyPrzeciaganieMiniatury, ustawCzyPrzeciaganieMiniatury] = useState(false)

  async function dodajMiniature(plik: File | null | undefined) {
"""

new = """  const [bladMiniatury, ustawBladMiniatury] = useState('')
  const [czyPrzetwarzanieMiniatury, ustawCzyPrzetwarzanieMiniatury] = useState(false)
  const [czyPrzeciaganieMiniatury, ustawCzyPrzeciaganieMiniatury] = useState(false)
  const [czyEdycjaKadru, ustawCzyEdycjaKadru] = useState(false)
  const [miniaturaPrzedEdycja, ustawMiniaturePrzedEdycja] = useState<FormularzZadania['miniatura']>()

  async function dodajMiniature(plik: File | null | undefined) {
"""
text = replace_once(text, old, new, "stany edytora miniatur")

old = """      const miniatura = await przygotujMiniatureZadania(plik)
      ustawFormularz((obecny) => ({ ...obecny, miniatura }))
"""
new = """      const miniatura = await przygotujMiniatureZadania(plik)
      ustawFormularz((obecny) => ({ ...obecny, miniatura }))
      ustawMiniaturePrzedEdycja(miniatura)
      ustawCzyEdycjaKadru(true)
"""
text = replace_once(text, old, new, "otwarcie edytora po imporcie")

anchor = """  function obsluzWklejenie(zdarzenie: ClipboardEvent<HTMLFormElement>) {
"""
insert = """  async function zmienKadrMiniatury(zmiana: Partial<KadrMiniaturyZadania>) {
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

"""
if anchor not in text:
    raise RuntimeError("Nie znaleziono miejsca wstawienia funkcji kadru.")
text = text.replace(anchor, insert + anchor, 1)

old = """      {formularz.miniatura && <img alt={'Miniatura: ' + formularz.miniatura.nazwaPliku} src={formularz.miniatura.daneUrl} />}
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
    </div>
"""

new = """      {formularz.miniatura && <img alt={'Miniatura: ' + formularz.miniatura.nazwaPliku} className="pulpit-formularz-zadania__miniatura-podglad" src={formularz.miniatura.daneUrl} />}
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
    </div>
"""
text = replace_once(text, old, new, "UI miniatury")

# Save miniatura on edit.
old = """        przypomnienia: formularzEdycji.przypomnienia.map((przypomnienie) => ({ ...przypomnienie })),
        powiazaneSzkolenieId: formularzEdycji.szkolenieId || undefined,
"""
new = """        przypomnienia: formularzEdycji.przypomnienia.map((przypomnienie) => ({ ...przypomnienie })),
        miniatura: formularzEdycji.miniatura,
        powiazaneSzkolenieId: formularzEdycji.szkolenieId || undefined,
"""
text = replace_once(text, old, new, "zapis miniatury przy edycji")

# Save miniatura on create.
old = """      przypomnienia: noweZadanie.przypomnienia,
      powiazaneSzkolenieId: noweZadanie.szkolenieId || undefined,
"""
new = """      przypomnienia: noweZadanie.przypomnienia,
      miniatura: noweZadanie.miniatura,
      powiazaneSzkolenieId: noweZadanie.szkolenieId || undefined,
"""
text = replace_once(text, old, new, "zapis miniatury przy tworzeniu")

# Render thumbnail layer before line.
old = """      <div className="pulpit-os-czasu" aria-label={'Dobowa oś czasu od 00:00 do 23:59; dzień pracy od ' + zakresDniaPracy.poczatek + ' do ' + zakresDniaPracy.koniec}>
        <div className="pulpit-os-czasu__linia">
"""
new = """      <div className="pulpit-os-czasu" aria-label={'Dobowa oś czasu od 00:00 do 23:59; dzień pracy od ' + zakresDniaPracy.poczatek + ' do ' + zakresDniaPracy.koniec}>
        <div className="pulpit-os-czasu__miniatury">
          {zadaniaGodzinowe.map((zadanie) => <MiniaturaZadaniaNaOsi key={'miniatura-' + zadanie.id} otworz={() => ustawWybraneZadanie(zadanie)} zakresDniaPracy={zakresDniaPracy} zadanie={zadanie} />)}
        </div>
        <div className="pulpit-os-czasu__linia">
"""
text = replace_once(text, old, new, "warstwa miniatur nad osią")

write(path, text)

# ---------------------------------------------------------------------------
# 5. CSS
# ---------------------------------------------------------------------------
path = "src/moduly/zamkniete/pulpit/pulpit.css"
text = read(path)

append = r"""

/* MINIATURY ZADAŃ NA OSI CZASU */
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

.pulpit .pulpit-os-czasu__miniatura--lewo,
.pulpit .pulpit-os-czasu__miniatura--lewo:hover,
.pulpit .pulpit-os-czasu__miniatura--lewo:focus-visible {
  transform-origin: left bottom;
  transform: translateX(0);
}

.pulpit .pulpit-os-czasu__miniatura--lewo:hover,
.pulpit .pulpit-os-czasu__miniatura--lewo:focus-visible {
  transform: translateX(0) scale(1.35);
}

.pulpit .pulpit-os-czasu__miniatura--prawo,
.pulpit .pulpit-os-czasu__miniatura--prawo:hover,
.pulpit .pulpit-os-czasu__miniatura--prawo:focus-visible {
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
}
"""

if "/* MINIATURY ZADAŃ NA OSI CZASU */" in text:
    raise RuntimeError("CSS miniatur z tego patcha już istnieje — patch nie będzie nakładany drugi raz.")
text = text.rstrip() + append + "\n"
write(path, text)

# ---------------------------------------------------------------------------
# 6. TESTY
# ---------------------------------------------------------------------------
path = "testy/pulpit.regresja.test.ts"
text = read(path)

text = replace_once(
    text,
    "import { generujZadaniaAutomatyczne } from '../src/moduly/zamkniete/pulpit/logika/zadaniaAutomatyczne.ts'\n",
    "import { generujZadaniaAutomatyczne } from '../src/moduly/zamkniete/pulpit/logika/zadaniaAutomatyczne.ts'\nimport { normalizujKadrMiniatury } from '../src/moduly/zamkniete/pulpit/logika/miniaturyZadan.ts'\n",
    "import testu kadru",
)

tests = r"""

test('kadr miniatury ma bezpieczne wartości domyślne i ogranicza przesunięcie oraz zoom', () => {
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

  assert.match(widok, /miniatura:\s*noweZadanie\.miniatura/)
  assert.match(widok, /miniatura:\s*formularzEdycji\.miniatura/)
  assert.match(widok, /pulpit-os-czasu__miniatury/)
  assert.match(widok, /MiniaturaZadaniaNaOsi/)
  assert.match(widok, /pozycjaGodzinyNaOsi\(godzinaMarkera, zakresDniaPracy\)/)
  assert.match(widok, /Edytuj miniaturę/)
  assert.match(widok, /Zmień obraz/)
  assert.match(widok, /Usuń miniaturę/)
  assert.match(widok, /Zastosuj kadr/)
  assert.match(css, /\.pulpit-os-czasu__miniatura/)
})

test('model miniatury zachowuje źródło robocze i parametry ponownej edycji kadru', () => {
  const model = readFileSync('src/moduly/zamkniete/pulpit/modele/pulpit.ts', 'utf8')
  const logika = readFileSync('src/moduly/zamkniete/pulpit/logika/miniaturyZadan.ts', 'utf8')

  assert.match(model, /zrodloDaneUrl:\s*string/)
  assert.match(model, /szerokoscZrodla:\s*number/)
  assert.match(model, /wysokoscZrodla:\s*number/)
  assert.match(model, /kadr:\s*KadrMiniaturyZadania/)
  assert.match(logika, /maksymalnyWymiarZrodla\s*=\s*1600/)
  assert.match(logika, /aktualizujKadrMiniatury/)
  assert.match(logika, /proporcja/)
})
"""

if "kadr miniatury ma bezpieczne wartości domyślne" in text:
    raise RuntimeError("Testy miniatur z tego patcha już istnieją.")
text = text.rstrip() + tests + "\n"
write(path, text)

print("Patch kodu został nałożony.")
PY

note "Sprawdzam TypeScript/lint/build i testy."

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

# Najpierw dedykowany test Pulpitu. Repo wcześniej używało node:test dla plików .ts.
# Jeżeli package.json ma własny runner, pełny npm test uruchomi się niżej.
if command -v npx >/dev/null 2>&1; then
  if npx --yes tsx --test testy/pulpit.regresja.test.ts >/dev/null 2>&1; then
    run_gate "testy Pulpitu" npx --yes tsx --test testy/pulpit.regresja.test.ts
  else
    printf '\n[INFO] Dedykowane uruchomienie przez tsx nie jest dostępne lub nie pasuje do repo; pełny npm test nadal zostanie wykonany.\n'
  fi
fi

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

note "Końcowy zakres zmian"
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

printf '\nKopia bezpieczeństwa: %s\n' "$BACKUP"
printf 'Patch NIE wykonał git add, commita ani push.\n'

if [[ "$VALIDATION_FAILED" -ne 0 ]]; then
  printf '\n[UWAGA] Co najmniej jedna kontrola nie przeszła. Kod pozostawiono do analizy; backup jest w .git.\n' >&2
  exit 2
fi

printf '\n[OK] Patch został wdrożony, a dostępne automatyczne kontrole przeszły.\n'
