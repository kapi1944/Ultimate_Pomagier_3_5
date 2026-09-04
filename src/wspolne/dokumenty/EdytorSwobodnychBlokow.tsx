import { useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent as ZdarzenieWskaznika } from 'react'
import {
  RODZINY_CZCIONEK_BLOKU,
  SZEROKOSC_STRONY_A4_MM,
  WYSOKOSC_STRONY_A4_MM,
  czyBlokWidocznyNaStronie,
  duplikujBlokSwobodny,
  ograniczBlokDoStrony,
  przesunBlokSwobodny,
  przywrocBlokSzablonu,
  zmienRozmiarBlokuSwobodnego,
  type BlokSwobodnyDokumentu,
  type ProwadniceBloku,
} from './modelSwobodnychBlokow'
import './edytorSwobodnychBlokow.css'

type WlasciwosciWarstwy = {
  bloki: BlokSwobodnyDokumentu[]
  numerStrony: number
  zaznaczonyBlokId: string | null
  trybEdycjiSzablonu: boolean
  onZaznacz: (id: string | null) => void
  onZmienBlok: (blok: BlokSwobodnyDokumentu) => void
}

type GestBloku = {
  rodzaj: 'przesuwanie' | 'rozmiar'
  blok: BlokSwobodnyDokumentu
  xPoczatkowe: number
  yPoczatkowe: number
  szerokoscStronyPx: number
  wysokoscStronyPx: number
}

function czyMoznaPrzesuwac(blok: BlokSwobodnyDokumentu, trybEdycjiSzablonu: boolean) {
  return !blok.zablokowany && (blok.pochodzenie !== 'szablon' || trybEdycjiSzablonu)
}

export function EdytowalnaWarstwaSwobodnychBlokow({ bloki, numerStrony, zaznaczonyBlokId, trybEdycjiSzablonu, onZaznacz, onZmienBlok }: WlasciwosciWarstwy) {
  const [gest, ustawGest] = useState<GestBloku | null>(null)
  const [prowadnice, ustawProwadnice] = useState<ProwadniceBloku>({})

  function rozpocznijGest(zdarzenie: ZdarzenieWskaznika<HTMLElement>, blok: BlokSwobodnyDokumentu, rodzaj: GestBloku['rodzaj']) {
    zdarzenie.preventDefault()
    zdarzenie.stopPropagation()
    onZaznacz(blok.id)
    if (!czyMoznaPrzesuwac(blok, trybEdycjiSzablonu)) return
    const strona = zdarzenie.currentTarget.closest('[data-strona-dokumentu]')?.getBoundingClientRect()
    if (!strona) return
    zdarzenie.currentTarget.setPointerCapture(zdarzenie.pointerId)
    ustawGest({ rodzaj, blok, xPoczatkowe: zdarzenie.clientX, yPoczatkowe: zdarzenie.clientY, szerokoscStronyPx: strona.width, wysokoscStronyPx: strona.height })
  }

  function aktualizujGest(zdarzenie: ZdarzenieWskaznika<HTMLElement>) {
    if (!gest) return
    zdarzenie.preventDefault()
    const roznicaX = (zdarzenie.clientX - gest.xPoczatkowe) * SZEROKOSC_STRONY_A4_MM / gest.szerokoscStronyPx
    const roznicaY = (zdarzenie.clientY - gest.yPoczatkowe) * WYSOKOSC_STRONY_A4_MM / gest.wysokoscStronyPx
    if (gest.rodzaj === 'przesuwanie') {
      const wynik = przesunBlokSwobodny(gest.blok, roznicaX, roznicaY)
      ustawProwadnice(wynik.prowadnice)
      onZmienBlok(wynik.blok)
      return
    }
    const zachowajProporcje = zdarzenie.shiftKey || (gest.blok.typ === 'obraz' && gest.blok.dane.zachowajProporcje)
    onZmienBlok(zmienRozmiarBlokuSwobodnego(gest.blok, gest.blok.szerokoscMm + roznicaX, gest.blok.wysokoscMm + roznicaY, zachowajProporcje))
  }

  function zakonczGest() {
    ustawGest(null)
    ustawProwadnice({})
  }

  function obsluzKlawiature(zdarzenie: KeyboardEvent<HTMLElement>, blok: BlokSwobodnyDokumentu) {
    if (!czyMoznaPrzesuwac(blok, trybEdycjiSzablonu)) return
    const krok = zdarzenie.shiftKey ? 5 : 1
    const przesuniecia: Partial<Record<string, [number, number]>> = {
      ArrowLeft: [-krok, 0], ArrowRight: [krok, 0], ArrowUp: [0, -krok], ArrowDown: [0, krok],
    }
    const przesuniecie = przesuniecia[zdarzenie.key]
    if (!przesuniecie) return
    zdarzenie.preventDefault()
    onZmienBlok(przesunBlokSwobodny(blok, przesuniecie[0], przesuniecie[1], 0).blok)
  }

  const widoczneBloki = bloki.filter((blok) => czyBlokWidocznyNaStronie(blok, numerStrony))

  return <div className="edytor-blokow__warstwa" data-pomin-w-eksporcie onPointerDown={(zdarzenie) => { if (zdarzenie.target === zdarzenie.currentTarget) onZaznacz(null) }}>
    {widoczneBloki.map((blok) => {
      const zaznaczony = blok.id === zaznaczonyBlokId
      const edytowalny = czyMoznaPrzesuwac(blok, trybEdycjiSzablonu)
      return <div
        aria-label={`${blok.nazwa ?? (blok.typ === 'tekst' ? 'Blok tekstowy' : 'Blok obrazu')}${blok.zablokowany ? ', zablokowany' : ''}`}
        className={`edytor-blokow__ramka ${zaznaczony ? 'edytor-blokow__ramka--zaznaczona' : ''} ${edytowalny ? '' : 'edytor-blokow__ramka--zablokowana'}`}
        data-blok-edytowalny={blok.id}
        key={blok.id}
        onFocus={() => onZaznacz(blok.id)}
        onKeyDown={(zdarzenie) => obsluzKlawiature(zdarzenie, blok)}
        onPointerDown={(zdarzenie) => rozpocznijGest(zdarzenie, blok, 'przesuwanie')}
        onPointerMove={aktualizujGest}
        onPointerUp={zakonczGest}
        role="button"
        style={{ left: `${blok.xMm / 2.1}%`, top: `${blok.yMm / 2.97}%`, width: `${blok.szerokoscMm / 2.1}%`, height: `${blok.wysokoscMm / 2.97}%`, zIndex: blok.indeksWarstwy + 1000 }}
        tabIndex={0}
      >
        {zaznaczony && edytowalny && <span aria-hidden="true" className="edytor-blokow__uchwyt" onPointerDown={(zdarzenie) => rozpocznijGest(zdarzenie, blok, 'rozmiar')} onPointerMove={aktualizujGest} onPointerUp={zakonczGest} />}
      </div>
    })}
    {prowadnice.pionowa !== undefined && <span className="edytor-blokow__prowadnica edytor-blokow__prowadnica--pionowa" style={{ left: `${prowadnice.pionowa / 2.1}%` }} />}
    {prowadnice.pozioma !== undefined && <span className="edytor-blokow__prowadnica edytor-blokow__prowadnica--pozioma" style={{ top: `${prowadnice.pozioma / 2.97}%` }} />}
  </div>
}

type WlasciwosciPanelu = {
  bloki: BlokSwobodnyDokumentu[]
  zaznaczonyBlokId: string | null
  blokiSzablonu: BlokSwobodnyDokumentu[]
  trybEdycjiSzablonu: boolean
  onZmienTrybEdycjiSzablonu: (wartosc: boolean) => void
  onZmienBloki: (bloki: BlokSwobodnyDokumentu[]) => void
  onDodajObraz?: (plik: File) => Promise<string>
  liczbaStron?: number
}

function utworzIdBloku() {
  return globalThis.crypto?.randomUUID?.() ?? `blok-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function PanelEdycjiSwobodnychBlokow({ bloki, zaznaczonyBlokId, blokiSzablonu, trybEdycjiSzablonu, onZmienTrybEdycjiSzablonu, onZmienBloki, onDodajObraz, liczbaStron }: WlasciwosciPanelu) {
  const blok = useMemo(() => bloki.find((pozycja) => pozycja.id === zaznaczonyBlokId) ?? null, [bloki, zaznaczonyBlokId])
  const polePlikuRef = useRef<HTMLInputElement>(null)
  const [bladObrazu, ustawBladObrazu] = useState<string | null>(null)
  const zmienBlok = (aktualizacja: (obecny: BlokSwobodnyDokumentu) => BlokSwobodnyDokumentu) => {
    if (!blok) return
    onZmienBloki(bloki.map((pozycja) => pozycja.id === blok.id ? aktualizacja(pozycja) : pozycja))
  }
  const zmienLiczbe = (klucz: 'xMm' | 'yMm' | 'szerokoscMm' | 'wysokoscMm' | 'indeksWarstwy', wartosc: string) => zmienBlok((obecny) => {
    const zmieniony = { ...obecny, [klucz]: Number(wartosc) || 0 }
    return klucz === 'indeksWarstwy' ? zmieniony : ograniczBlokDoStrony(zmieniony)
  })

  async function wczytajObraz(zdarzenie: ChangeEvent<HTMLInputElement>) {
    const plik = zdarzenie.target.files?.[0]
    if (!plik || !onDodajObraz) return
    ustawBladObrazu(null)
    try {
      const klucz = await onDodajObraz(plik)
      const nowyBlok: BlokSwobodnyDokumentu = {
        id: utworzIdBloku(), typ: 'obraz', rola: 'element_opcjonalny_uzytkownika', nazwa: plik.name, pochodzenie: 'uzytkownik', zablokowany: false,
        xMm: 20, yMm: 40, szerokoscMm: 45, wysokoscMm: 25, przypisanieDoStrony: { rodzaj: 'strona', numer: 1 }, widoczny: true, indeksWarstwy: 20,
        dane: { zrodlo: { rodzaj: 'zasob_uzytkownika', klucz }, tekstAlternatywny: plik.name, zachowajProporcje: true, trybDopasowania: 'contain' },
      }
      onZmienBloki([...bloki, nowyBlok])
    } catch (blad) {
      ustawBladObrazu(blad instanceof Error ? blad.message : 'Nie udało się dodać obrazu.')
    }
    zdarzenie.target.value = ''
  }

  return <section className="edytor-blokow__panel" aria-label="Edytor bloków dokumentu">
    <div className="edytor-blokow__pasek-akcji">
      <button type="button" onClick={() => onZmienBloki([...bloki, { id: utworzIdBloku(), typ: 'tekst', rola: 'pole_tekstowe', nazwa: 'Własny tekst', pochodzenie: 'uzytkownik', zablokowany: false, xMm: 20, yMm: 40, szerokoscMm: 80, wysokoscMm: 15, przypisanieDoStrony: { rodzaj: 'strona', numer: 1 }, widoczny: true, indeksWarstwy: 20, dane: { zrodlo: { rodzaj: 'statyczne', tekst: 'Własny napis' }, rozmiarCzcionkiPt: 10, gruboscCzcionki: 400, rodzinaCzcionki: 'Arial', wyrownanie: 'lewo', interlinia: 1.2, kolor: '#111827', marginesWewnetrznyMm: 1 } }])}>Dodaj tekst</button>
      {onDodajObraz && <><button type="button" onClick={() => polePlikuRef.current?.click()}>Dodaj obraz</button><input accept="image/png,image/jpeg,image/webp" className="edytor-blokow__pole-pliku" onChange={(zdarzenie) => void wczytajObraz(zdarzenie)} ref={polePlikuRef} type="file" /></>}
      <button type="button" onClick={() => { if (window.confirm('Przywrócić cały układ szablonu i usunąć własne bloki?')) onZmienBloki(blokiSzablonu.map((pozycja) => ({ ...pozycja }))) }}>Resetuj cały układ</button>
    </div>
    {bladObrazu && <p role="alert">{bladObrazu}</p>}
    <label className="edytor-blokow__przelacznik"><input checked={trybEdycjiSzablonu} onChange={(zdarzenie) => onZmienTrybEdycjiSzablonu(zdarzenie.target.checked)} type="checkbox" /> Edytuj układ szablonu</label>
    {!blok ? <p>Kliknij blok na podglądzie, aby edytować jego właściwości.</p> : blok.pochodzenie === 'szablon' && !trybEdycjiSzablonu ? <p>To element szablonu. Włącz „Edytuj układ szablonu”, aby zmienić jego właściwości lub odblokować pozycję.</p> : <div className="edytor-blokow__wlasciwosci">
      <h3>{blok.nazwa ?? (blok.typ === 'tekst' ? 'Blok tekstowy' : 'Blok obrazu')}</h3>
      <label>Nazwa<input value={blok.nazwa ?? ''} onChange={(zdarzenie) => zmienBlok((obecny) => ({ ...obecny, nazwa: zdarzenie.target.value }))} /></label>
      <div className="edytor-blokow__siatka-liczb">{([['xMm', 'X (mm)'], ['yMm', 'Y (mm)'], ['szerokoscMm', 'Szerokość (mm)'], ['wysokoscMm', 'Wysokość (mm)'], ['indeksWarstwy', 'Warstwa']] as const).map(([klucz, etykieta]) => <label key={klucz}>{etykieta}<input min={klucz === 'szerokoscMm' || klucz === 'wysokoscMm' ? 4 : undefined} step="0.5" type="number" value={blok[klucz]} onChange={(zdarzenie) => zmienLiczbe(klucz, zdarzenie.target.value)} /></label>)}</div>
      <label>Widoczność na stronach<select value={blok.przypisanieDoStrony.rodzaj} onChange={(zdarzenie) => zmienBlok((obecny) => ({ ...obecny, przypisanieDoStrony: zdarzenie.target.value === 'kazda' ? { rodzaj: 'kazda' } : zdarzenie.target.value === 'strona' ? { rodzaj: 'strona', numer: 1 } : { rodzaj: 'pierwsza' } }))}><option value="pierwsza">Pierwsza strona</option><option value="kazda">Każda strona</option><option value="strona">Wybrana strona</option></select></label>
      {blok.przypisanieDoStrony.rodzaj === 'strona' && <label>Numer strony<input max={liczbaStron} min="1" type="number" value={blok.przypisanieDoStrony.numer} onChange={(zdarzenie) => zmienBlok((obecny) => ({ ...obecny, przypisanieDoStrony: { rodzaj: 'strona', numer: Math.min(liczbaStron ?? Number.POSITIVE_INFINITY, Math.max(1, Number(zdarzenie.target.value) || 1)) } }))} /></label>}
      <div className="edytor-blokow__przelaczniki"><label><input checked={blok.widoczny} type="checkbox" onChange={(zdarzenie) => zmienBlok((obecny) => ({ ...obecny, widoczny: zdarzenie.target.checked }))} /> Widoczny</label><label><input checked={blok.zablokowany ?? false} type="checkbox" onChange={(zdarzenie) => zmienBlok((obecny) => ({ ...obecny, zablokowany: zdarzenie.target.checked }))} /> Zablokuj pozycję</label></div>
      {blok.typ === 'tekst' ? <>
        <label>Treść<textarea value={blok.dane.zrodlo.rodzaj === 'statyczne' ? blok.dane.zrodlo.tekst : ''} onChange={(zdarzenie) => zmienBlok((obecny) => obecny.typ === 'tekst' ? { ...obecny, dane: { ...obecny.dane, zrodlo: { rodzaj: 'statyczne', tekst: zdarzenie.target.value } } } : obecny)} /></label>
        <div className="edytor-blokow__siatka-liczb"><label>Font<select value={blok.dane.rodzinaCzcionki ?? 'Arial'} onChange={(zdarzenie) => zmienBlok((obecny) => obecny.typ === 'tekst' ? { ...obecny, dane: { ...obecny.dane, rodzinaCzcionki: zdarzenie.target.value } } : obecny)}>{RODZINY_CZCIONEK_BLOKU.map((rodzina) => <option key={rodzina}>{rodzina}</option>)}</select></label><label>Rozmiar (pt)<input min="1" type="number" value={blok.dane.rozmiarCzcionkiPt} onChange={(zdarzenie) => zmienBlok((obecny) => obecny.typ === 'tekst' ? { ...obecny, dane: { ...obecny.dane, rozmiarCzcionkiPt: Number(zdarzenie.target.value) || 1 } } : obecny)} /></label><label>Interlinia<input min="0.5" step="0.1" type="number" value={blok.dane.interlinia} onChange={(zdarzenie) => zmienBlok((obecny) => obecny.typ === 'tekst' ? { ...obecny, dane: { ...obecny.dane, interlinia: Number(zdarzenie.target.value) || 1 } } : obecny)} /></label><label>Margines (mm)<input min="0" step="0.5" type="number" value={blok.dane.marginesWewnetrznyMm ?? 0} onChange={(zdarzenie) => zmienBlok((obecny) => obecny.typ === 'tekst' ? { ...obecny, dane: { ...obecny.dane, marginesWewnetrznyMm: Number(zdarzenie.target.value) || 0 } } : obecny)} /></label></div>
        <label>Wyrównanie<select value={blok.dane.wyrownanie} onChange={(zdarzenie) => zmienBlok((obecny) => obecny.typ === 'tekst' ? { ...obecny, dane: { ...obecny.dane, wyrownanie: zdarzenie.target.value as 'lewo' | 'srodek' | 'prawo' | 'wyjustuj' } } : obecny)}><option value="lewo">Lewo</option><option value="srodek">Środek</option><option value="prawo">Prawo</option></select></label>
        <label>Kolor<input type="color" value={blok.dane.kolor ?? '#111827'} onChange={(zdarzenie) => zmienBlok((obecny) => obecny.typ === 'tekst' ? { ...obecny, dane: { ...obecny.dane, kolor: zdarzenie.target.value } } : obecny)} /></label>
        <div className="edytor-blokow__przelaczniki"><label><input checked={blok.dane.gruboscCzcionki >= 600} type="checkbox" onChange={(zdarzenie) => zmienBlok((obecny) => obecny.typ === 'tekst' ? { ...obecny, dane: { ...obecny.dane, gruboscCzcionki: zdarzenie.target.checked ? 700 : 400 } } : obecny)} /> Pogrubienie</label><label><input checked={blok.dane.kursywa ?? false} type="checkbox" onChange={(zdarzenie) => zmienBlok((obecny) => obecny.typ === 'tekst' ? { ...obecny, dane: { ...obecny.dane, kursywa: zdarzenie.target.checked } } : obecny)} /> Kursywa</label><label><input checked={blok.dane.podkreslenie ?? false} type="checkbox" onChange={(zdarzenie) => zmienBlok((obecny) => obecny.typ === 'tekst' ? { ...obecny, dane: { ...obecny.dane, podkreslenie: zdarzenie.target.checked } } : obecny)} /> Podkreślenie</label></div>
      </> : <><button type="button" onClick={() => zmienBlok((obecny) => obecny.typ === 'obraz' ? { ...obecny, dane: { ...obecny.dane, zrodlo: { rodzaj: 'zasob_organizatora', klucz: 'logo_organizatora' }, tekstAlternatywny: 'Logo organizatora' } } : obecny)}>Użyj logo organizatora</button><label>Dopasowanie<select value={blok.dane.trybDopasowania} onChange={(zdarzenie) => zmienBlok((obecny) => obecny.typ === 'obraz' ? { ...obecny, dane: { ...obecny.dane, trybDopasowania: zdarzenie.target.value === 'cover' ? 'cover' : 'contain' } } : obecny)}><option value="contain">Contain</option><option value="cover">Cover</option></select></label><label><input checked={blok.dane.zachowajProporcje} type="checkbox" onChange={(zdarzenie) => zmienBlok((obecny) => obecny.typ === 'obraz' ? { ...obecny, dane: { ...obecny.dane, zachowajProporcje: zdarzenie.target.checked } } : obecny)} /> Zachowaj proporcje</label></>}
      <div className="edytor-blokow__pasek-akcji"><button type="button" onClick={() => onZmienBloki([...bloki, duplikujBlokSwobodny(blok, utworzIdBloku())])}>Duplikuj</button><button disabled={blok.pochodzenie !== 'szablon'} type="button" onClick={() => onZmienBloki(bloki.map((pozycja) => pozycja.id === blok.id ? przywrocBlokSzablonu(pozycja, blokiSzablonu) : pozycja))}>Resetuj blok</button><button disabled={blok.pochodzenie === 'szablon'} title={blok.pochodzenie === 'szablon' ? 'Element szablonu można ukryć albo zresetować.' : undefined} type="button" onClick={() => onZmienBloki(bloki.filter((pozycja) => pozycja.id !== blok.id))}>Usuń</button></div>
    </div>}
  </section>
}
