import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  pobierzLokalizacjeZMagazynu,
  zapiszLokalizacjeWMagazynie,
} from './lokalizacje/magazynLokalizacji'
import type { Lokalizacja } from './lokalizacje/typyLokalizacji'
import PrzelacznikTakNie from '../moduly/zamkniete/szczegoly_organizacyjne/komponenty/PrzelacznikTakNie'
import { trenerzyKartotekiStartowi } from '../moduly/zamkniete/szczegoly_organizacyjne/stale'
import { pobierzSzablonyDokumentow, type SzablonDokumentu } from '../wspolne/dokumenty/szablonyDokumentow'
import './widokKartotek.css'

export type ZakladkaKartotek = 'trenerzy' | 'klienci' | 'lokalizacje' | 'szablony_dokumentow'
type StatusTrenera = 'Aktywny' | 'Nieaktywny'
type FiltrStatusuTrenera = 'aktywni' | 'nieaktywni' | 'wszyscy'
type FiltrStatusuOdmiany = 'wszystkie' | 'potwierdzone' | 'niepotwierdzone'

type WlasciwosciWidokuKartotek = {
  aktywnaZakladkaPoczatkowa?: ZakladkaKartotek
  poZmianieZakladki?: (zakladka: ZakladkaKartotek) => void
}

type TrenerKartoteki = {
  id: string
  imie: string
  nazwisko: string
  telefon: string
  email: string
  status: StatusTrenera
}

type KlientKartoteki = {
  id: string
  nazwa: string
  nip: string
  ulica: string
  nrBudynku: string
  nrLokalu: string
  kodPocztowy: string
  miasto: string
  kraj: string
  koordynator: string
  telefonKoordynatora: string
  emailKoordynatora: string
}

type FormularzTrenera = Omit<TrenerKartoteki, 'id'>
type FormularzKlienta = Omit<KlientKartoteki, 'id'>
type FormularzLokalizacji = Omit<Lokalizacja, 'klucz_lokalizacji'>
type TypIkonyAkcji = 'podglad' | 'edycja' | 'duplikuj' | 'usun'
type TypElementuKartoteki =
  | 'wszystkie'
  | 'pola_tekstowe'
  | 'selecty'
  | 'checkbox_radio_switch'
  | 'buttony'
  | 'linki'
  | 'textarea'
  | 'contenteditable'
  | 'role'
  | 'tabindex'
  | 'ukryte'

type DaneElementuKartoteki = {
  id: string
  typy: Exclude<TypElementuKartoteki, 'wszystkie'>[]
  etykieta: string
  identyfikator: string
  nazwa: string
  klasa: string
  placeholder: string
  ariaLabel: string
  selektorCss: string
  html: string
}

const zakladkiKartotek: { id: ZakladkaKartotek; etykieta: string }[] = [
  { id: 'trenerzy', etykieta: 'Trenerzy' },
  { id: 'klienci', etykieta: 'Klienci' },
  { id: 'lokalizacje', etykieta: 'Lokalizacje' },
  { id: 'szablony_dokumentow', etykieta: 'Szablony dokumentów' },
]

const opcjeLiczbyPozycji = [10, 20, 50, 100]

const etykietyTypowElementow: Record<TypElementuKartoteki, string> = {
  wszystkie: 'Wszystkie',
  pola_tekstowe: 'Pola tekstowe',
  selecty: 'Select/listy wyboru',
  checkbox_radio_switch: 'Checkbox/radio/switch',
  buttony: 'Buttony',
  linki: 'Linki',
  textarea: 'Textarea',
  contenteditable: 'Contenteditable',
  role: 'Elementy z role',
  tabindex: 'Elementy z tabindex',
  ukryte: 'Niewidoczne/ukryte',
}

const typyElementowKartoteki = Object.keys(etykietyTypowElementow) as TypElementuKartoteki[]

const pustyFormularzTrenera: FormularzTrenera = {
  imie: '',
  nazwisko: '',
  telefon: '',
  email: '',
  status: 'Aktywny',
}

function PrzelacznikStatusuTrenera({
  etykieta,
  status,
  ustawStatus,
}: {
  etykieta: string
  status: StatusTrenera
  ustawStatus: (status: StatusTrenera) => void
}) {
  const czyAktywny = status === 'Aktywny'

  return <PrzelacznikTakNie etykieta={etykieta} wariant="aktywny-nieaktywny" wlaczony={czyAktywny} ustawWlaczony={(wlaczony) => ustawStatus(wlaczony ? 'Aktywny' : 'Nieaktywny')} />
}

function IkonaAkcji({ typ }: { typ: TypIkonyAkcji }) {
  const sciezkiIkon: Record<TypIkonyAkcji, string[]> = {
    podglad: [
      'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z',
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    ],
    edycja: [
      'M12 20h9',
      'M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z',
    ],
    duplikuj: [
      'M8 8h12v12H8z',
      'M4 16V4h12',
    ],
    usun: [
      'M3 6h18',
      'M8 6V4h8v2',
      'M6 6l1 14h10l1-14',
      'M10 11v5',
      'M14 11v5',
    ],
  }

  return (
    <svg aria-hidden="true" className="kartoteki__ikona-przycisku" fill="none" viewBox="0 0 24 24">
      {sciezkiIkon[typ].map((sciezka) => (
        <path d={sciezka} key={sciezka} />
      ))}
    </svg>
  )
}

function przytnijTekst(wartosc: string, limit = 140) {
  const tekst = wartosc.replace(/\s+/g, ' ').trim()

  return tekst.length > limit ? `${tekst.slice(0, limit)}...` : tekst
}

function pobierzSelektorCss(element: Element) {
  const tag = element.tagName.toLowerCase()
  const identyfikator = element.getAttribute('id')
  const klasy = (element.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((klasa) => `.${CSS.escape(klasa)}`)
    .join('')

  if (identyfikator) {
    return `${tag}#${CSS.escape(identyfikator)}`
  }

  return `${tag}${klasy}`
}

function czyElementUkryty(element: Element) {
  if (!(element instanceof HTMLElement)) {
    return false
  }

  const styl = window.getComputedStyle(element)
  const prostokat = element.getBoundingClientRect()

  return element.hidden || styl.display === 'none' || styl.visibility === 'hidden' || Number(styl.opacity) === 0 || prostokat.width === 0 || prostokat.height === 0
}

function pobierzTypyElementu(element: Element): Exclude<TypElementuKartoteki, 'wszystkie'>[] {
  const tag = element.tagName.toLowerCase()
  const typInputa = element.getAttribute('type')?.toLowerCase() ?? ''
  const typy: Exclude<TypElementuKartoteki, 'wszystkie'>[] = []

  if (tag === 'input' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'hidden'].includes(typInputa)) {
    typy.push('pola_tekstowe')
  }

  if (tag === 'select') {
    typy.push('selecty')
  }

  if ((tag === 'input' && ['checkbox', 'radio'].includes(typInputa)) || element.getAttribute('role') === 'switch') {
    typy.push('checkbox_radio_switch')
  }

  if (tag === 'button' || typInputa === 'button' || typInputa === 'submit' || typInputa === 'reset') {
    typy.push('buttony')
  }

  if (tag === 'a') {
    typy.push('linki')
  }

  if (tag === 'textarea') {
    typy.push('textarea')
  }

  if (element.getAttribute('contenteditable') === 'true') {
    typy.push('contenteditable')
  }

  if (element.hasAttribute('role')) {
    typy.push('role')
  }

  if (element.hasAttribute('tabindex')) {
    typy.push('tabindex')
  }

  if (czyElementUkryty(element)) {
    typy.push('ukryte')
  }

  return typy
}

function pobierzEtykieteElementu(element: Element) {
  const identyfikator = element.getAttribute('id')
  const etykietaPoId = identyfikator ? document.querySelector(`label[for="${CSS.escape(identyfikator)}"]`)?.textContent ?? '' : ''
  const etykietaRodzica = element.closest('label')?.textContent ?? ''
  const tekst = element.textContent ?? ''

  return przytnijTekst(etykietaPoId || etykietaRodzica || element.getAttribute('aria-label') || element.getAttribute('placeholder') || tekst)
}

function zbudujDaneElementowKartoteki(korzen: HTMLElement | null): DaneElementuKartoteki[] {
  if (!korzen) {
    return []
  }

  return Array.from(korzen.querySelectorAll('*'))
    .filter((element) => !element.closest('[data-inspektor-kartoteki]'))
    .map((element, indeks) => ({
      id: `element-${indeks}`,
      typy: pobierzTypyElementu(element),
      etykieta: pobierzEtykieteElementu(element),
      identyfikator: element.getAttribute('id') ?? '',
      nazwa: element.getAttribute('name') ?? '',
      klasa: element.getAttribute('class') ?? '',
      placeholder: element.getAttribute('placeholder') ?? '',
      ariaLabel: element.getAttribute('aria-label') ?? '',
      selektorCss: pobierzSelektorCss(element),
      html: przytnijTekst(element.outerHTML, 260),
    }))
    .filter((element) => element.typy.length > 0)
}

function czyElementPasujeDoSzukania(element: DaneElementuKartoteki, szukanaFraza: string) {
  const fraza = szukanaFraza.trim().toLocaleLowerCase('pl')

  if (!fraza) {
    return true
  }

  return [
    element.etykieta,
    element.identyfikator,
    element.nazwa,
    element.klasa,
    element.placeholder,
    element.ariaLabel,
    element.selektorCss,
    element.html,
  ].some((wartosc) => wartosc.toLocaleLowerCase('pl').includes(fraza))
}

function policzElementyWedlugTypow(elementy: DaneElementuKartoteki[]) {
  return typyElementowKartoteki.reduce<Record<TypElementuKartoteki, number>>((liczniki, typ) => {
    liczniki[typ] = typ === 'wszystkie' ? elementy.length : elementy.filter((element) => element.typy.includes(typ)).length
    return liczniki
  }, {} as Record<TypElementuKartoteki, number>)
}

function PanelElementowKartoteki({
  elementy,
  filtrTypu,
  szukanaFraza,
  ustawFiltrTypu,
  ustawSzukanaFraza,
}: {
  elementy: DaneElementuKartoteki[]
  filtrTypu: TypElementuKartoteki
  szukanaFraza: string
  ustawFiltrTypu: (typ: TypElementuKartoteki) => void
  ustawSzukanaFraza: (fraza: string) => void
}) {
  const elementyPoFiltrach = elementy.filter((element) => (filtrTypu === 'wszystkie' || element.typy.includes(filtrTypu)) && czyElementPasujeDoSzukania(element, szukanaFraza))
  const liczniki = policzElementyWedlugTypow(elementy)

  return (
    <section className="kartoteki__panel kartoteki__inspektor" data-inspektor-kartoteki>
      <div className="kartoteki__formularz kartoteki__formularz--dwa">
        <select value={filtrTypu} onChange={(zdarzenie) => ustawFiltrTypu(zdarzenie.target.value as TypElementuKartoteki)}>
          {typyElementowKartoteki.map((typ) => (
            <option key={typ} value={typ}>
              {etykietyTypowElementow[typ]}
            </option>
          ))}
        </select>
        <input placeholder="Szukaj po tekście, id, name, class, placeholder, aria-label, selektorze lub HTML" value={szukanaFraza} onChange={(zdarzenie) => ustawSzukanaFraza(zdarzenie.target.value)} />
      </div>
      <div className="kartoteki__liczniki-elementow">
        <strong>Elementy: {elementy.length}</strong>
        <strong>Widoczne po filtrach: {elementyPoFiltrach.length}</strong>
        {typyElementowKartoteki.filter((typ) => typ !== 'wszystkie').map((typ) => (
          <span key={typ}>
            {etykietyTypowElementow[typ]}: {liczniki[typ]}
          </span>
        ))}
      </div>
    </section>
  )
}

const pustyFormularzKlienta: FormularzKlienta = {
  nazwa: '',
  nip: '',
  ulica: '',
  nrBudynku: '',
  nrLokalu: '',
  kodPocztowy: '',
  miasto: '',
  kraj: 'Polska',
  koordynator: '',
  telefonKoordynatora: '',
  emailKoordynatora: '',
}

const pustyFormularzLokalizacji: FormularzLokalizacji = {
  nazwa: '',
  wojewodztwo: '',
  rodzaj: '',
  gmina: '',
  powiat: '',
  miejscownik_pelny_auto: '',
  status_odmiany: false,
}

const klienciStartowi: KlientKartoteki[] = [
  {
    id: 'klient-adamex',
    nazwa: 'Adamex',
    nip: '123456789',
    ulica: 'Adamska',
    nrBudynku: '12',
    nrLokalu: '70-798',
    kodPocztowy: '70-798',
    miasto: 'Szczecin',
    kraj: 'Polska',
    koordynator: 'Adam Skała',
    telefonKoordynatora: '',
    emailKoordynatora: '',
  },
]

const kluczTrenerow = 'ultimate-pomagier.kartoteki.trenerzy'
const kluczKlientow = 'ultimate-pomagier.kartoteki.klienci'

function utworzId(prefiks: string) {
  return `${prefiks}-${Date.now()}`
}

function pobierzZMagazynu<T>(klucz: string, wartoscDomyslna: T[]): T[] {
  try {
    const zapis = localStorage.getItem(klucz)
    const dane = zapis ? JSON.parse(zapis) : null

    return Array.isArray(dane) ? dane : wartoscDomyslna
  } catch {
    return wartoscDomyslna
  }
}

function pobierzKluczTrenera(trener: Pick<TrenerKartoteki, 'imie' | 'nazwisko'>) {
  return normalizujTekst(`${trener.imie} ${trener.nazwisko}`)
}

function zapiszWMagazynie<T>(klucz: string, wartosc: T[]) {
  try {
    localStorage.setItem(klucz, JSON.stringify(wartosc))
  } catch {
    return
  }
}

function rozdzielImieNazwisko(imieNazwisko: string) {
  const czesci = imieNazwisko.trim().split(/\s+/)
  const nazwisko = czesci.length > 1 ? czesci.pop() ?? '' : ''

  return {
    imie: czesci.join(' ') || imieNazwisko,
    nazwisko,
  }
}

function przygotujTrenerowStartowych(): TrenerKartoteki[] {
  return trenerzyKartotekiStartowi.map((trener) => ({
    id: trener.id,
    ...rozdzielImieNazwisko(trener.imieNazwisko),
    telefon: trener.telefon,
    email: trener.email,
    status: 'Aktywny',
  }))
}

function czyStaraBazaTrenerow(trenerzy: TrenerKartoteki[]) {
  const stareId = new Set(['trener-anna-kowalska', 'trener-piotr-nowak', 'trener-marta-zielinska'])

  return trenerzy.length > 0 && trenerzy.every((trener) => stareId.has(trener.id) || trener.email.endsWith('@pomagier.local'))
}

function uzupelnijBazeTrenerow(trenerzyZMagazynu: TrenerKartoteki[]) {
  const trenerzyStartowi = przygotujTrenerowStartowych()

  if (!trenerzyZMagazynu.length || czyStaraBazaTrenerow(trenerzyZMagazynu)) {
    return trenerzyStartowi
  }

  const trenerzyWedlugNazwy = new Map(trenerzyZMagazynu.map((trener) => [pobierzKluczTrenera(trener), trener]))
  const trenerzyScaleni = trenerzyZMagazynu.map((trener) => {
    const trenerStartowy = trenerzyStartowi.find((pozycja) => pobierzKluczTrenera(pozycja) === pobierzKluczTrenera(trener))

    if (!trenerStartowy) {
      return trener
    }

    return {
      ...trener,
      id: trener.id || trenerStartowy.id,
      telefon: trener.telefon || trenerStartowy.telefon,
      email: trener.email || trenerStartowy.email,
      status: trener.status || trenerStartowy.status,
    }
  })

  trenerzyStartowi.forEach((trener) => {
    if (!trenerzyWedlugNazwy.has(pobierzKluczTrenera(trener))) {
      trenerzyScaleni.push(trener)
    }
  })

  return trenerzyScaleni
}

function normalizujTekst(wartosc: string) {
  return wartosc
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function czyPasujeDoWyszukiwania(pola: string[], szukanaFraza: string) {
  const fraza = normalizujTekst(szukanaFraza.trim())

  if (!fraza) {
    return true
  }

  return normalizujTekst(pola.join(' ')).includes(fraza)
}

function policzLiczbeStron(liczbaPozycji: number, liczbaPozycjiNaStronie: number) {
  return Math.max(1, Math.ceil(liczbaPozycji / liczbaPozycjiNaStronie))
}

function pobierzPozycjeStrony<T>(pozycje: T[], strona: number, liczbaPozycjiNaStronie: number) {
  const poczatek = (strona - 1) * liczbaPozycjiNaStronie

  return pozycje.slice(poczatek, poczatek + liczbaPozycjiNaStronie)
}

function pobierzNumeryStron(aktywnaStrona: number, liczbaStron: number) {
  const poczatek = Math.max(1, aktywnaStrona - 2)
  const koniec = Math.min(liczbaStron, aktywnaStrona + 2)

  return Array.from({ length: koniec - poczatek + 1 }, (_, indeks) => poczatek + indeks)
}

function PanelPaginacjiKartoteki({
  liczbaWszystkichPozycji,
  liczbaWidocznychPozycji,
  liczbaPozycjiNaStronie,
  strona,
  ustawLiczbePozycjiNaStronie,
  ustawStrone,
}: {
  liczbaWszystkichPozycji: number
  liczbaWidocznychPozycji: number
  liczbaPozycjiNaStronie: number
  strona: number
  ustawLiczbePozycjiNaStronie: (liczba: number) => void
  ustawStrone: (strona: number) => void
}) {
  const liczbaStron = policzLiczbeStron(liczbaWszystkichPozycji, liczbaPozycjiNaStronie)
  const bezpiecznaStrona = Math.min(strona, liczbaStron)

  return (
    <div className="kartoteki__paginacja kartoteki__paginacja--panel">
      <label className="kartoteki__liczba-pozycji">
        <span>Pozycji na stronie</span>
        <select value={liczbaPozycjiNaStronie} onChange={(zdarzenie) => ustawLiczbePozycjiNaStronie(Number(zdarzenie.target.value))}>
          {opcjeLiczbyPozycji.map((opcja) => (
            <option key={opcja} value={opcja}>
              {opcja}
            </option>
          ))}
        </select>
      </label>
      <span>
        Widoczne {liczbaWidocznychPozycji} z {liczbaWszystkichPozycji}
      </span>
      <div className="kartoteki__numery-stron">
        <button className="kartoteki__przycisk" disabled={bezpiecznaStrona <= 1} type="button" onClick={() => ustawStrone(Math.max(1, bezpiecznaStrona - 1))}>
          &lt;&lt;
        </button>
        {pobierzNumeryStron(bezpiecznaStrona, liczbaStron).map((numerStrony) => (
          <button
            aria-current={numerStrony === bezpiecznaStrona ? 'page' : undefined}
            className={`kartoteki__przycisk${numerStrony === bezpiecznaStrona ? ' kartoteki__przycisk--glowny' : ''}`}
            key={numerStrony}
            type="button"
            onClick={() => ustawStrone(numerStrony)}
          >
            {numerStrony}
          </button>
        ))}
        <button className="kartoteki__przycisk" disabled={bezpiecznaStrona >= liczbaStron} type="button" onClick={() => ustawStrone(Math.min(liczbaStron, bezpiecznaStrona + 1))}>
          &gt;&gt;
        </button>
      </div>
    </div>
  )
}

function potwierdzUsuniecie(nazwaPozycji: string) {
  return window.confirm(`Czy na pewno usunąć pozycję: ${nazwaPozycji}?`)
}

function skopiujFormularzTrenera(trener: TrenerKartoteki): FormularzTrenera {
  return {
    imie: trener.imie,
    nazwisko: trener.nazwisko,
    telefon: trener.telefon,
    email: trener.email,
    status: trener.status,
  }
}

function skopiujFormularzKlienta(klient: KlientKartoteki): FormularzKlienta {
  return {
    nazwa: klient.nazwa,
    nip: klient.nip,
    ulica: klient.ulica,
    nrBudynku: klient.nrBudynku,
    nrLokalu: klient.nrLokalu,
    kodPocztowy: klient.kodPocztowy,
    miasto: klient.miasto,
    kraj: klient.kraj,
    koordynator: klient.koordynator,
    telefonKoordynatora: klient.telefonKoordynatora,
    emailKoordynatora: klient.emailKoordynatora,
  }
}

function skopiujFormularzLokalizacji(lokalizacja: Lokalizacja): FormularzLokalizacji {
  return {
    nazwa: lokalizacja.nazwa,
    wojewodztwo: lokalizacja.wojewodztwo,
    rodzaj: lokalizacja.rodzaj,
    gmina: lokalizacja.gmina,
    powiat: lokalizacja.powiat,
    miejscownik_pelny_auto: lokalizacja.miejscownik_pelny_auto,
    status_odmiany: lokalizacja.status_odmiany,
  }
}

export default function WidokKartotek({ aktywnaZakladkaPoczatkowa = 'trenerzy', poZmianieZakladki }: WlasciwosciWidokuKartotek) {
  const referencjaAktywnejKartoteki = useRef<HTMLElement | null>(null)
  const [aktywnaZakladka, ustawAktywnaZakladke] = useState<ZakladkaKartotek>(aktywnaZakladkaPoczatkowa)
  const [trenerzy, ustawTrenerow] = useState<TrenerKartoteki[]>(() => uzupelnijBazeTrenerow(pobierzZMagazynu(kluczTrenerow, przygotujTrenerowStartowych())))
  const [klienci, ustawKlientow] = useState<KlientKartoteki[]>(() => pobierzZMagazynu(kluczKlientow, klienciStartowi))
  const [lokalizacje, ustawLokalizacje] = useState<Lokalizacja[]>(pobierzLokalizacjeZMagazynu)
  const [szablonyDokumentow, ustawSzablonyDokumentow] = useState<SzablonDokumentu[]>(pobierzSzablonyDokumentow)
  const [filtrTypuElementu, ustawFiltrTypuElementu] = useState<TypElementuKartoteki>('wszystkie')
  const [szukanyElementKartoteki, ustawSzukanyElementKartoteki] = useState('')
  const [elementyKartoteki, ustawElementyKartoteki] = useState<DaneElementuKartoteki[]>([])
  const [liczbaPozycjiNaStronie, ustawLiczbePozycjiNaStronie] = useState(20)

  const [filtrTrenerow, ustawFiltrTrenerow] = useState<FiltrStatusuTrenera>('aktywni')
  const [stronaTrenerow, ustawStroneTrenerow] = useState(1)
  const [czyFormularzTreneraWidoczny, ustawCzyFormularzTreneraWidoczny] = useState(false)
  const [edytowanyTrenerId, ustawEdytowanyTrenerId] = useState<string | null>(null)
  const [formularzTrenera, ustawFormularzTrenera] = useState<FormularzTrenera>(pustyFormularzTrenera)

  const [szukanyKlient, ustawSzukanyKlient] = useState('')
  const [stronaKlientow, ustawStroneKlientow] = useState(1)
  const [czyFormularzKlientaWidoczny, ustawCzyFormularzKlientaWidoczny] = useState(false)
  const [edytowanyKlientId, ustawEdytowanyKlientId] = useState<string | null>(null)
  const [formularzKlienta, ustawFormularzKlienta] = useState<FormularzKlienta>(pustyFormularzKlienta)

  const [szukanaLokalizacja, ustawSzukanaLokalizacja] = useState('')
  const [filtrWojewodztwa, ustawFiltrWojewodztwa] = useState('wszystkie')
  const [filtrStatusuOdmiany, ustawFiltrStatusuOdmiany] = useState<FiltrStatusuOdmiany>('wszystkie')
  const [stronaLokalizacji, ustawStroneLokalizacji] = useState(1)
  const [czyFormularzLokalizacjiWidoczny, ustawCzyFormularzLokalizacjiWidoczny] = useState(false)
  const [edytowanaLokalizacjaId, ustawEdytowanaLokalizacjaId] = useState<string | null>(null)
  const [formularzLokalizacji, ustawFormularzLokalizacji] = useState<FormularzLokalizacji>(pustyFormularzLokalizacji)
  const [stronaSzablonow, ustawStroneSzablonow] = useState(1)
  const [komunikat, ustawKomunikat] = useState('')

  useEffect(() => {
    zapiszWMagazynie(kluczTrenerow, trenerzy)
  }, [trenerzy])

  useEffect(() => {
    zapiszWMagazynie(kluczKlientow, klienci)
  }, [klienci])

  useEffect(() => {
    zapiszLokalizacjeWMagazynie(lokalizacje)
  }, [lokalizacje])

  useEffect(() => {
    const uchwyt = window.setTimeout(() => {
      ustawElementyKartoteki(zbudujDaneElementowKartoteki(referencjaAktywnejKartoteki.current))
    }, 0)

    return () => window.clearTimeout(uchwyt)
  }, [
    aktywnaZakladka,
    czyFormularzTreneraWidoczny,
    czyFormularzKlientaWidoczny,
    czyFormularzLokalizacjiWidoczny,
    edytowanyTrenerId,
    edytowanyKlientId,
    edytowanaLokalizacjaId,
    filtrStatusuOdmiany,
    filtrTrenerow,
    filtrWojewodztwa,
    liczbaPozycjiNaStronie,
    stronaTrenerow,
    stronaKlientow,
    szukanaLokalizacja,
    szukanyKlient,
    stronaLokalizacji,
    stronaSzablonow,
    trenerzy,
    klienci,
    lokalizacje,
    szablonyDokumentow,
  ])

  const trenerzyFiltrowani = useMemo(
    () =>
      trenerzy.filter((trener) => {
        if (filtrTrenerow === 'aktywni') {
          return trener.status === 'Aktywny'
        }

        if (filtrTrenerow === 'nieaktywni') {
          return trener.status === 'Nieaktywny'
        }

        return true
      }),
    [filtrTrenerow, trenerzy],
  )

  const bezpiecznaStronaTrenerow = Math.min(stronaTrenerow, policzLiczbeStron(trenerzyFiltrowani.length, liczbaPozycjiNaStronie))
  const trenerzyNaStronie = useMemo(
    () => pobierzPozycjeStrony(trenerzyFiltrowani, bezpiecznaStronaTrenerow, liczbaPozycjiNaStronie),
    [bezpiecznaStronaTrenerow, liczbaPozycjiNaStronie, trenerzyFiltrowani],
  )

  const klienciFiltrowani = useMemo(
    () =>
      klienci.filter((klient) =>
        czyPasujeDoWyszukiwania([klient.nazwa, klient.nip, klient.miasto, klient.kodPocztowy, klient.koordynator], szukanyKlient),
      ),
    [klienci, szukanyKlient],
  )

  const bezpiecznaStronaKlientow = Math.min(stronaKlientow, policzLiczbeStron(klienciFiltrowani.length, liczbaPozycjiNaStronie))
  const klienciNaStronie = useMemo(
    () => pobierzPozycjeStrony(klienciFiltrowani, bezpiecznaStronaKlientow, liczbaPozycjiNaStronie),
    [bezpiecznaStronaKlientow, klienciFiltrowani, liczbaPozycjiNaStronie],
  )

  const dostepneWojewodztwa = useMemo(
    () => [...new Set(lokalizacje.map((lokalizacja) => lokalizacja.wojewodztwo).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pl')),
    [lokalizacje],
  )

  const lokalizacjeFiltrowane = useMemo(
    () =>
      lokalizacje.filter((lokalizacja) => {
        const czyPasujeFraza = czyPasujeDoWyszukiwania(
          [lokalizacja.nazwa, lokalizacja.wojewodztwo, lokalizacja.rodzaj, lokalizacja.gmina, lokalizacja.powiat, lokalizacja.miejscownik_pelny_auto],
          szukanaLokalizacja,
        )
        const czyPasujeWojewodztwo = filtrWojewodztwa === 'wszystkie' || lokalizacja.wojewodztwo === filtrWojewodztwa
        const czyPasujeStatus =
          filtrStatusuOdmiany === 'wszystkie' ||
          (filtrStatusuOdmiany === 'potwierdzone' && lokalizacja.status_odmiany) ||
          (filtrStatusuOdmiany === 'niepotwierdzone' && !lokalizacja.status_odmiany)

        return czyPasujeFraza && czyPasujeWojewodztwo && czyPasujeStatus
      }),
    [filtrStatusuOdmiany, filtrWojewodztwa, lokalizacje, szukanaLokalizacja],
  )

  const liczbaStronLokalizacji = policzLiczbeStron(lokalizacjeFiltrowane.length, liczbaPozycjiNaStronie)
  const bezpiecznaStronaLokalizacji = Math.min(stronaLokalizacji, liczbaStronLokalizacji)
  const lokalizacjeNaStronie = useMemo(
    () => pobierzPozycjeStrony(lokalizacjeFiltrowane, bezpiecznaStronaLokalizacji, liczbaPozycjiNaStronie),
    [bezpiecznaStronaLokalizacji, liczbaPozycjiNaStronie, lokalizacjeFiltrowane],
  )

  const bezpiecznaStronaSzablonow = Math.min(stronaSzablonow, policzLiczbeStron(szablonyDokumentow.length, liczbaPozycjiNaStronie))
  const szablonyNaStronie = useMemo(
    () => pobierzPozycjeStrony(szablonyDokumentow, bezpiecznaStronaSzablonow, liczbaPozycjiNaStronie),
    [bezpiecznaStronaSzablonow, liczbaPozycjiNaStronie, szablonyDokumentow],
  )

  function pokazKomunikat(tresc: string) {
    ustawKomunikat(tresc)
  }

  function otworzDodawanieTrenera() {
    ustawEdytowanyTrenerId(null)
    ustawFormularzTrenera(pustyFormularzTrenera)
    ustawCzyFormularzTreneraWidoczny(true)
  }

  function edytujTrenera(trener: TrenerKartoteki) {
    ustawEdytowanyTrenerId(trener.id)
    ustawFormularzTrenera(skopiujFormularzTrenera(trener))
    ustawCzyFormularzTreneraWidoczny(false)
  }

  function zapiszTrenera(zdarzenie: FormEvent<HTMLFormElement>) {
    zdarzenie.preventDefault()

    if (!formularzTrenera.imie.trim() || !formularzTrenera.nazwisko.trim()) {
      return
    }

    if (edytowanyTrenerId) {
      ustawTrenerow((obecni) => obecni.map((trener) => (trener.id === edytowanyTrenerId ? { ...trener, ...formularzTrenera } : trener)))
      pokazKomunikat('Zapisano dane trenera.')
      ustawEdytowanyTrenerId(null)
      window.setTimeout(() => ustawFormularzTrenera(pustyFormularzTrenera), 280)
    } else {
      ustawTrenerow((obecni) => [...obecni, { id: utworzId('trener'), ...formularzTrenera }])
      pokazKomunikat('Dodano trenera do kartoteki.')
      ustawFormularzTrenera(pustyFormularzTrenera)
      ustawCzyFormularzTreneraWidoczny(false)
    }
  }

  function duplikujTrenera(trener: TrenerKartoteki) {
    ustawTrenerow((obecni) => [...obecni, { ...trener, id: utworzId('trener'), nazwisko: `${trener.nazwisko} kopia` }])
    pokazKomunikat('Zduplikowano trenera.')
  }

  function usunTrenera(id: string) {
    const trener = trenerzy.find((pozycja) => pozycja.id === id)

    if (!potwierdzUsuniecie(trener ? `${trener.imie} ${trener.nazwisko}`.trim() : 'trener')) {
      return
    }

    ustawTrenerow((obecni) => obecni.filter((trener) => trener.id !== id))
    pokazKomunikat('Usunięto trenera z kartoteki.')
  }

  function otworzDodawanieKlienta() {
    ustawEdytowanyKlientId(null)
    ustawFormularzKlienta(pustyFormularzKlienta)
    ustawCzyFormularzKlientaWidoczny(true)
  }

  function edytujKlienta(klient: KlientKartoteki) {
    ustawEdytowanyKlientId(klient.id)
    ustawFormularzKlienta(skopiujFormularzKlienta(klient))
    ustawCzyFormularzKlientaWidoczny(false)
  }

  function zapiszKlienta(zdarzenie: FormEvent<HTMLFormElement>) {
    zdarzenie.preventDefault()

    if (!formularzKlienta.nazwa.trim()) {
      return
    }

    if (edytowanyKlientId) {
      ustawKlientow((obecni) => obecni.map((klient) => (klient.id === edytowanyKlientId ? { ...klient, ...formularzKlienta } : klient)))
      pokazKomunikat('Zapisano dane klienta.')
    } else {
      ustawKlientow((obecni) => [...obecni, { id: utworzId('klient'), ...formularzKlienta }])
      pokazKomunikat('Dodano klienta do kartoteki.')
    }

    ustawFormularzKlienta(pustyFormularzKlienta)
    ustawEdytowanyKlientId(null)
    ustawCzyFormularzKlientaWidoczny(false)
  }

  function duplikujKlienta(klient: KlientKartoteki) {
    ustawKlientow((obecni) => [...obecni, { ...klient, id: utworzId('klient'), nazwa: `${klient.nazwa} kopia` }])
    pokazKomunikat('Zduplikowano klienta.')
  }

  function usunKlienta(id: string) {
    const klient = klienci.find((pozycja) => pozycja.id === id)

    if (!potwierdzUsuniecie(klient?.nazwa ?? 'klient')) {
      return
    }

    ustawKlientow((obecni) => obecni.filter((klient) => klient.id !== id))
    pokazKomunikat('Usunięto klienta z kartoteki.')
  }

  function otworzDodawanieLokalizacji() {
    ustawEdytowanaLokalizacjaId(null)
    ustawFormularzLokalizacji(pustyFormularzLokalizacji)
    ustawCzyFormularzLokalizacjiWidoczny(true)
  }

  function edytujLokalizacje(lokalizacja: Lokalizacja) {
    ustawEdytowanaLokalizacjaId(lokalizacja.klucz_lokalizacji)
    ustawFormularzLokalizacji(skopiujFormularzLokalizacji(lokalizacja))
    ustawCzyFormularzLokalizacjiWidoczny(false)
  }

  function zapiszLokalizacje(zdarzenie: FormEvent<HTMLFormElement>) {
    zdarzenie.preventDefault()

    if (!formularzLokalizacji.nazwa.trim() || !formularzLokalizacji.miejscownik_pelny_auto.trim()) {
      return
    }

    if (edytowanaLokalizacjaId) {
      ustawLokalizacje((obecne) => obecne.map((lokalizacja) => (lokalizacja.klucz_lokalizacji === edytowanaLokalizacjaId ? { ...lokalizacja, ...formularzLokalizacji } : lokalizacja)))
      pokazKomunikat('Zapisano dane lokalizacji.')
    } else {
      ustawLokalizacje((obecne) => [...obecne, { klucz_lokalizacji: utworzId('lokalizacja'), ...formularzLokalizacji }])
      pokazKomunikat('Dodano lokalizację do kartoteki.')
    }

    ustawFormularzLokalizacji(pustyFormularzLokalizacji)
    ustawEdytowanaLokalizacjaId(null)
    ustawCzyFormularzLokalizacjiWidoczny(false)
  }

  function duplikujLokalizacje(lokalizacja: Lokalizacja) {
    ustawLokalizacje((obecne) => [...obecne, { ...lokalizacja, klucz_lokalizacji: utworzId('lokalizacja'), nazwa: `${lokalizacja.nazwa} kopia` }])
    pokazKomunikat('Zduplikowano lokalizację.')
  }

  function usunLokalizacje(klucz_lokalizacji: string) {
    const lokalizacja = lokalizacje.find((pozycja) => pozycja.klucz_lokalizacji === klucz_lokalizacji)

    if (!potwierdzUsuniecie(lokalizacja?.nazwa ?? 'lokalizacja')) {
      return
    }

    ustawLokalizacje((obecne) => obecne.filter((lokalizacja) => lokalizacja.klucz_lokalizacji !== klucz_lokalizacji))
    pokazKomunikat('Usunięto lokalizację z kartoteki.')
  }

  function zmienLiczbePozycjiNaStronie(wartosc: string) {
    ustawLiczbePozycjiNaStronie(Number(wartosc))
    ustawStroneTrenerow(1)
    ustawStroneKlientow(1)
    ustawStroneLokalizacji(1)
    ustawStroneSzablonow(1)
  }

  function ustawWspolnaLiczbePozycjiNaStronie(liczba: number) {
    zmienLiczbePozycjiNaStronie(String(liczba))
  }

  function zmienFiltrTrenerow(filtr: FiltrStatusuTrenera) {
    ustawFiltrTrenerow(filtr)
    ustawStroneTrenerow(1)
  }

  function zmienSzukanaFrazeKlienta(fraza: string) {
    ustawSzukanyKlient(fraza)
    ustawStroneKlientow(1)
  }

  function zmienFiltrLokalizacji(akcja: () => void) {
    akcja()
    ustawStroneLokalizacji(1)
  }

  function anulujFormularze() {
    ustawCzyFormularzTreneraWidoczny(false)
    ustawCzyFormularzKlientaWidoczny(false)
    ustawCzyFormularzLokalizacjiWidoczny(false)
    ustawEdytowanyTrenerId(null)
    ustawEdytowanyKlientId(null)
    ustawEdytowanaLokalizacjaId(null)
  }

  function anulujEdycjeTrenera() {
    ustawEdytowanyTrenerId(null)
    window.setTimeout(() => ustawFormularzTrenera(pustyFormularzTrenera), 280)
  }

  function odswiezSzablonyDokumentow() {
    ustawSzablonyDokumentow(pobierzSzablonyDokumentow())
    pokazKomunikat('Odświeżono szablony dokumentów.')
  }

  function zmienZakladke(zakladka: ZakladkaKartotek) {
    ustawAktywnaZakladke(zakladka)
    poZmianieZakladki?.(zakladka)
  }

  return (
    <section className="widok kartoteki">
      <nav className="kartoteki__zakladki" aria-label="Kartoteki">
        {zakladkiKartotek.map((zakladka) => (
          <button
            aria-current={aktywnaZakladka === zakladka.id ? 'page' : undefined}
            className={`kartoteki__przycisk${aktywnaZakladka === zakladka.id ? ' kartoteki__przycisk--glowny' : ''}`}
            key={zakladka.id}
            type="button"
            onClick={() => zmienZakladke(zakladka.id)}
          >
            {zakladka.etykieta}
          </button>
        ))}
      </nav>

      {komunikat && <p className="kartoteki__komunikat">{komunikat}</p>}

      {aktywnaZakladka === 'trenerzy' && (
        <section className="kartoteki__widok" ref={referencjaAktywnejKartoteki}>
          <header className="kartoteki__naglowek">
            <div className="kartoteki__tytul">
              <span className="kartoteki__ikona" aria-hidden="true">
                ♙
              </span>
              <div>
                <h1>Kartoteka trenerów</h1>
                <p>Lokalna lista trenerów dostępnych do przypisania do grup szkoleniowych.</p>
              </div>
            </div>
          </header>

          <PanelElementowKartoteki
            elementy={elementyKartoteki}
            filtrTypu={filtrTypuElementu}
            szukanaFraza={szukanyElementKartoteki}
            ustawFiltrTypu={ustawFiltrTypuElementu}
            ustawSzukanaFraza={ustawSzukanyElementKartoteki}
          />

          <section className="kartoteki__panel">
            <div className="kartoteki__pasek">
              <div className="kartoteki__filtry">
                {(['aktywni', 'nieaktywni', 'wszyscy'] as FiltrStatusuTrenera[]).map((filtr) => (
                  <button
                    className={`kartoteki__przycisk${filtrTrenerow === filtr ? ' kartoteki__przycisk--glowny' : ''}`}
                    key={filtr}
                    type="button"
                    onClick={() => zmienFiltrTrenerow(filtr)}
                  >
                    {filtr === 'aktywni' ? 'Aktywni' : filtr === 'nieaktywni' ? 'Nieaktywni' : 'Wszyscy'}
                  </button>
                ))}
              </div>
              <button className="kartoteki__przycisk" type="button" onClick={otworzDodawanieTrenera}>
                + Dodaj nowego trenera do bazy
              </button>
            </div>

            {czyFormularzTreneraWidoczny && (
              <form className="kartoteki__formularz kartoteki__formularz--dwa" onSubmit={zapiszTrenera}>
                <label>
                  Imię trenera
                  <input placeholder="Imię Trenera" value={formularzTrenera.imie} onChange={(zdarzenie) => ustawFormularzTrenera((obecny) => ({ ...obecny, imie: zdarzenie.target.value }))} />
                </label>
                <label>
                  Nazwisko trenera
                  <input placeholder="Nazwisko Trenera" value={formularzTrenera.nazwisko} onChange={(zdarzenie) => ustawFormularzTrenera((obecny) => ({ ...obecny, nazwisko: zdarzenie.target.value }))} />
                </label>
                <label>
                  Telefon trenera
                  <input placeholder="Telefon Trenera" value={formularzTrenera.telefon} onChange={(zdarzenie) => ustawFormularzTrenera((obecny) => ({ ...obecny, telefon: zdarzenie.target.value }))} />
                </label>
                <label>
                  E-mail trenera
                  <input placeholder="E-mail Trenera" value={formularzTrenera.email} onChange={(zdarzenie) => ustawFormularzTrenera((obecny) => ({ ...obecny, email: zdarzenie.target.value }))} />
                </label>
                <div className="kartoteki__akcje-formularza">
                  <button className="kartoteki__przycisk kartoteki__przycisk--jasny" type="submit">
                    Zapisz
                  </button>
                  <button className="kartoteki__przycisk" type="button" onClick={anulujFormularze}>
                    Anuluj
                  </button>
                </div>
              </form>
            )}
          </section>

          <PanelPaginacjiKartoteki
            liczbaPozycjiNaStronie={liczbaPozycjiNaStronie}
            liczbaWidocznychPozycji={trenerzyNaStronie.length}
            liczbaWszystkichPozycji={trenerzyFiltrowani.length}
            strona={bezpiecznaStronaTrenerow}
            ustawLiczbePozycjiNaStronie={ustawWspolnaLiczbePozycjiNaStronie}
            ustawStrone={ustawStroneTrenerow}
          />

          <div className="kartoteki__lista">
            {trenerzyNaStronie.map((trener) => (
              <article className="kartoteki__wiersz" key={trener.id}>
                <div>
                  <strong>{`${trener.imie} ${trener.nazwisko}`.trim()}</strong>
                  <span>
                    {trener.email || '-'} | {trener.telefon || '-'}
                  </span>
                </div>
                <div className="kartoteki__akcje">
                  <button className="kartoteki__przycisk kartoteki__przycisk--z-ikona" type="button" onClick={() => pokazKomunikat(`Podgląd trenera: ${trener.imie} ${trener.nazwisko}`)}>
                    <IkonaAkcji typ="podglad" />
                    Podgląd
                  </button>
                  <button className="kartoteki__przycisk kartoteki__przycisk--z-ikona" type="button" onClick={() => edytujTrenera(trener)}>
                    <IkonaAkcji typ="edycja" />
                    Edytuj
                  </button>
                  <button className="kartoteki__przycisk kartoteki__przycisk--z-ikona" type="button" onClick={() => duplikujTrenera(trener)}>
                    <IkonaAkcji typ="duplikuj" />
                    Duplikuj
                  </button>
                  <button className="kartoteki__przycisk kartoteki__przycisk--z-ikona" type="button" onClick={() => usunTrenera(trener.id)}>
                    <IkonaAkcji typ="usun" />
                    Usuń
                  </button>
                </div>
                <div className={`kartoteki__edycja-wiersza ${edytowanyTrenerId === trener.id ? 'kartoteki__edycja-wiersza--otwarta' : ''}`}>
                  <form className="kartoteki__edycja-trenera" onSubmit={zapiszTrenera}>
                    <div className="kartoteki__kolumna-edycji">
                      <label>
                        Imię:
                        <input value={formularzTrenera.imie} onChange={(zdarzenie) => ustawFormularzTrenera((obecny) => ({ ...obecny, imie: zdarzenie.target.value }))} />
                      </label>
                      <label>
                        Nazwisko:
                        <input value={formularzTrenera.nazwisko} onChange={(zdarzenie) => ustawFormularzTrenera((obecny) => ({ ...obecny, nazwisko: zdarzenie.target.value }))} />
                      </label>
                      <div className="kartoteki__pole-przelacznika">
                        <span>Status:</span>
                        <PrzelacznikStatusuTrenera
                          etykieta={`Status trenera ${trener.imie} ${trener.nazwisko}`}
                          status={formularzTrenera.status}
                          ustawStatus={(status) => ustawFormularzTrenera((obecny) => ({ ...obecny, status }))}
                        />
                      </div>
                    </div>
                    <div className="kartoteki__kolumna-edycji">
                      <label>
                        E-mail:
                        <input value={formularzTrenera.email} onChange={(zdarzenie) => ustawFormularzTrenera((obecny) => ({ ...obecny, email: zdarzenie.target.value }))} />
                      </label>
                      <label>
                        Telefon:
                        <input value={formularzTrenera.telefon} onChange={(zdarzenie) => ustawFormularzTrenera((obecny) => ({ ...obecny, telefon: zdarzenie.target.value }))} />
                      </label>
                      <div className="kartoteki__akcje-formularza">
                        <button className="kartoteki__przycisk kartoteki__przycisk--jasny" type="submit">
                          Zapisz
                        </button>
                        <button className="kartoteki__przycisk" type="button" onClick={anulujEdycjeTrenera}>
                          Anuluj
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {aktywnaZakladka === 'klienci' && (
        <section className="kartoteki__widok" ref={referencjaAktywnejKartoteki}>
          <header className="kartoteki__naglowek">
            <div className="kartoteki__tytul">
              <span className="kartoteki__ikona" aria-hidden="true">
                ♧
              </span>
              <div>
                <h1>Kartoteka klientów</h1>
                <p>Lokalna baza klientów używana roboczo przez generator szczegółów organizacyjnych.</p>
              </div>
            </div>
          </header>

          <PanelElementowKartoteki
            elementy={elementyKartoteki}
            filtrTypu={filtrTypuElementu}
            szukanaFraza={szukanyElementKartoteki}
            ustawFiltrTypu={ustawFiltrTypuElementu}
            ustawSzukanaFraza={ustawSzukanyElementKartoteki}
          />

          <section className="kartoteki__panel">
            <div className="kartoteki__pasek">
              <input className="kartoteki__wyszukiwarka" placeholder="Szukaj po nazwie, NIP, mieście lub kodzie" value={szukanyKlient} onChange={(zdarzenie) => zmienSzukanaFrazeKlienta(zdarzenie.target.value)} />
              <button className="kartoteki__przycisk" type="button" onClick={otworzDodawanieKlienta}>
                + Dodaj klienta
              </button>
            </div>

            {czyFormularzKlientaWidoczny && (
              <form className="kartoteki__formularz kartoteki__formularz--trzy" onSubmit={zapiszKlienta}>
                <label className="kartoteki__pole-szerokie">
                  Nazwa klienta
                  <input placeholder="Nazwa klienta" value={formularzKlienta.nazwa} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, nazwa: zdarzenie.target.value }))} />
                </label>
                <label>
                  NIP
                  <input placeholder="NIP" value={formularzKlienta.nip} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, nip: zdarzenie.target.value }))} />
                </label>
                <label>
                  Ulica
                  <input placeholder="Ulica" value={formularzKlienta.ulica} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, ulica: zdarzenie.target.value }))} />
                </label>
                <label>
                  Nr budynku
                  <input placeholder="Nr budynku" value={formularzKlienta.nrBudynku} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, nrBudynku: zdarzenie.target.value }))} />
                </label>
                <label>
                  Nr lokalu
                  <input placeholder="Nr lokalu" value={formularzKlienta.nrLokalu} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, nrLokalu: zdarzenie.target.value }))} />
                </label>
                <label>
                  Kod pocztowy
                  <input placeholder="Kod pocztowy" value={formularzKlienta.kodPocztowy} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, kodPocztowy: zdarzenie.target.value }))} />
                </label>
                <label>
                  Miasto
                  <input placeholder="Miasto" value={formularzKlienta.miasto} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, miasto: zdarzenie.target.value }))} />
                </label>
                <label>
                  Kraj
                  <input placeholder="Kraj" value={formularzKlienta.kraj} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, kraj: zdarzenie.target.value }))} />
                </label>
                <label>
                  Koordynator klienta
                  <input placeholder="Koordynator klienta" value={formularzKlienta.koordynator} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, koordynator: zdarzenie.target.value }))} />
                </label>
                <label>
                  Telefon koordynatora
                  <input placeholder="Telefon koordynatora" value={formularzKlienta.telefonKoordynatora} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, telefonKoordynatora: zdarzenie.target.value }))} />
                </label>
                <label>
                  E-mail koordynatora
                  <input placeholder="E-mail koordynatora" value={formularzKlienta.emailKoordynatora} onChange={(zdarzenie) => ustawFormularzKlienta((obecny) => ({ ...obecny, emailKoordynatora: zdarzenie.target.value }))} />
                </label>
                <div className="kartoteki__akcje-formularza">
                  <button className="kartoteki__przycisk kartoteki__przycisk--jasny" type="submit">
                    Zapisz klienta
                  </button>
                  <button className="kartoteki__przycisk" type="button" onClick={anulujFormularze}>
                    Anuluj
                  </button>
                </div>
              </form>
            )}
          </section>

          <PanelPaginacjiKartoteki
            liczbaPozycjiNaStronie={liczbaPozycjiNaStronie}
            liczbaWidocznychPozycji={klienciNaStronie.length}
            liczbaWszystkichPozycji={klienciFiltrowani.length}
            strona={bezpiecznaStronaKlientow}
            ustawLiczbePozycjiNaStronie={ustawWspolnaLiczbePozycjiNaStronie}
            ustawStrone={ustawStroneKlientow}
          />

          <div className="kartoteki__lista">
            {klienciNaStronie.map((klient) => (
              <article className="kartoteki__wiersz" key={klient.id}>
                <div>
                  <strong>{klient.nazwa}</strong>
                  <span>
                    {klient.nip || '-'} | {klient.ulica} {klient.nrBudynku}
                    {klient.nrLokalu ? `/${klient.nrLokalu}` : ''}, {klient.kodPocztowy} {klient.miasto}, {klient.kraj}
                  </span>
                  <span>Koordynator: {klient.koordynator || '-'}</span>
                </div>
                <div className="kartoteki__akcje">
                  <button className="kartoteki__przycisk kartoteki__przycisk--z-ikona" type="button" onClick={() => pokazKomunikat(`Podgląd klienta: ${klient.nazwa}`)}>
                    <IkonaAkcji typ="podglad" />
                    Podgląd
                  </button>
                  <button className="kartoteki__przycisk kartoteki__przycisk--z-ikona" type="button" onClick={() => edytujKlienta(klient)}>
                    <IkonaAkcji typ="edycja" />
                    Edytuj
                  </button>
                  <button className="kartoteki__przycisk kartoteki__przycisk--z-ikona" type="button" onClick={() => duplikujKlienta(klient)}>
                    <IkonaAkcji typ="duplikuj" />
                    Duplikuj
                  </button>
                  <button className="kartoteki__przycisk kartoteki__przycisk--z-ikona" type="button" onClick={() => usunKlienta(klient.id)}>
                    <IkonaAkcji typ="usun" />
                    Usuń
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {aktywnaZakladka === 'lokalizacje' && (
        <section className="kartoteki__widok" ref={referencjaAktywnejKartoteki}>
          <header className="kartoteki__naglowek">
            <div className="kartoteki__tytul">
              <span className="kartoteki__ikona kartoteki__ikona--zolty" aria-hidden="true">
                ⌖
              </span>
              <div>
                <h1>Kartoteka lokalizacji</h1>
                <p>Lokalna baza miejscowości i miejscowników importowana z pliku CSV.</p>
              </div>
            </div>
          </header>

          <PanelElementowKartoteki
            elementy={elementyKartoteki}
            filtrTypu={filtrTypuElementu}
            szukanaFraza={szukanyElementKartoteki}
            ustawFiltrTypu={ustawFiltrTypuElementu}
            ustawSzukanaFraza={ustawSzukanyElementKartoteki}
          />

          <section className="kartoteki__panel">
            <div className="kartoteki__formularz kartoteki__formularz--trzy">
              <input
                className="kartoteki__pole-szerokie"
                placeholder="Szukaj po nazwie, gminie, powiecie lub miejscowniku"
                value={szukanaLokalizacja}
                onChange={(zdarzenie) => zmienFiltrLokalizacji(() => ustawSzukanaLokalizacja(zdarzenie.target.value))}
              />
              <select value={filtrWojewodztwa} onChange={(zdarzenie) => zmienFiltrLokalizacji(() => ustawFiltrWojewodztwa(zdarzenie.target.value))}>
                <option value="wszystkie">Wszystkie województwa</option>
                {dostepneWojewodztwa.map((wojewodztwo) => (
                  <option key={wojewodztwo} value={wojewodztwo}>
                    {wojewodztwo}
                  </option>
                ))}
              </select>
              <select value={filtrStatusuOdmiany} onChange={(zdarzenie) => zmienFiltrLokalizacji(() => ustawFiltrStatusuOdmiany(zdarzenie.target.value as FiltrStatusuOdmiany))}>
                <option value="wszystkie">Wszystkie statusy</option>
                <option value="potwierdzone">Potwierdzone</option>
                <option value="niepotwierdzone">Niepotwierdzone</option>
              </select>
            </div>
            <div className="kartoteki__pasek">
              <span>
                Załadowano {lokalizacje.length} lokalizacji. Widocznych pozycji: {lokalizacjeNaStronie.length} z {lokalizacjeFiltrowane.length}.
              </span>
              <div className="kartoteki__akcje">
                <button className="kartoteki__przycisk" type="button" onClick={otworzDodawanieLokalizacji}>
                  + Dodaj lokalizację
                </button>
              </div>
            </div>
          </section>

          {czyFormularzLokalizacjiWidoczny && (
            <form className="kartoteki__panel kartoteki__formularz" onSubmit={zapiszLokalizacje}>
              <strong>{edytowanaLokalizacjaId ? `Edycja lokalizacji: ${formularzLokalizacji.nazwa}` : 'Nowa lokalizacja'}</strong>
              <div className="kartoteki__formularz kartoteki__formularz--trzy">
                <label>
                  Nazwa
                  <input placeholder="Nazwa" value={formularzLokalizacji.nazwa} onChange={(zdarzenie) => ustawFormularzLokalizacji((obecna) => ({ ...obecna, nazwa: zdarzenie.target.value }))} />
                </label>
                <label>
                  Województwo
                  <input placeholder="Województwo" value={formularzLokalizacji.wojewodztwo} onChange={(zdarzenie) => ustawFormularzLokalizacji((obecna) => ({ ...obecna, wojewodztwo: zdarzenie.target.value }))} />
                </label>
                <label>
                  Rodzaj
                  <input placeholder="Rodzaj" value={formularzLokalizacji.rodzaj} onChange={(zdarzenie) => ustawFormularzLokalizacji((obecna) => ({ ...obecna, rodzaj: zdarzenie.target.value }))} />
                </label>
                <label>
                  Gmina
                  <input placeholder="Gmina" value={formularzLokalizacji.gmina} onChange={(zdarzenie) => ustawFormularzLokalizacji((obecna) => ({ ...obecna, gmina: zdarzenie.target.value }))} />
                </label>
                <label>
                  Powiat
                  <input placeholder="Powiat" value={formularzLokalizacji.powiat} onChange={(zdarzenie) => ustawFormularzLokalizacji((obecna) => ({ ...obecna, powiat: zdarzenie.target.value }))} />
                </label>
                <label>
                  Miejscownik
                  <input
                    placeholder="Miejscownik"
                    value={formularzLokalizacji.miejscownik_pelny_auto}
                    onChange={(zdarzenie) =>
                      ustawFormularzLokalizacji((obecna) => ({
                        ...obecna,
                        miejscownik_pelny_auto: zdarzenie.target.value,
                        status_odmiany: true,
                      }))
                    }
                  />
                </label>
                <div className="kartoteki__pole-przelacznika">
                  <span>Status odmiany:</span>
                  <PrzelacznikTakNie
                    etykieta="Status odmiany lokalizacji"
                    wariant="potwierdzony-niepotwierdzony"
                    wlaczony={formularzLokalizacji.status_odmiany}
                    ustawWlaczony={(status_odmiany) => ustawFormularzLokalizacji((obecna) => ({ ...obecna, status_odmiany }))}
                  />
                </div>
              </div>
              <div className="kartoteki__akcje-formularza">
                <button className="kartoteki__przycisk kartoteki__przycisk--jasny" type="submit">
                  Zapisz
                </button>
                <button className="kartoteki__przycisk" type="button" onClick={anulujFormularze}>
                  Anuluj
                </button>
              </div>
            </form>
          )}

          <PanelPaginacjiKartoteki
            liczbaPozycjiNaStronie={liczbaPozycjiNaStronie}
            liczbaWidocznychPozycji={lokalizacjeNaStronie.length}
            liczbaWszystkichPozycji={lokalizacjeFiltrowane.length}
            strona={bezpiecznaStronaLokalizacji}
            ustawLiczbePozycjiNaStronie={ustawWspolnaLiczbePozycjiNaStronie}
            ustawStrone={ustawStroneLokalizacji}
          />

          <div className="kartoteki__tabela-opakowanie">
            <table className="kartoteki__tabela">
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th>Województwo</th>
                  <th>Rodzaj</th>
                  <th>Gmina</th>
                  <th>Powiat</th>
                  <th>Miejscownik</th>
                  <th>Status odmiany</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {lokalizacjeNaStronie.map((lokalizacja) => (
                  <tr key={lokalizacja.klucz_lokalizacji}>
                    <td>{lokalizacja.nazwa}</td>
                    <td>{lokalizacja.wojewodztwo || '-'}</td>
                    <td>{lokalizacja.rodzaj || '-'}</td>
                    <td>{lokalizacja.gmina || '-'}</td>
                    <td>{lokalizacja.powiat || '-'}</td>
                    <td>{lokalizacja.miejscownik_pelny_auto || '-'}</td>
                    <td className={lokalizacja.status_odmiany ? 'kartoteki__status kartoteki__status--ok' : 'kartoteki__status kartoteki__status--uwaga'}>
                      {lokalizacja.status_odmiany ? 'Potwierdzony' : 'Niepotwierdzony'}
                    </td>
                    <td>
                      <div className="kartoteki__akcje">
                        <button className="kartoteki__przycisk kartoteki__przycisk--z-ikona" type="button" onClick={() => pokazKomunikat(`Podgląd lokalizacji: ${lokalizacja.nazwa}`)}>
                          <IkonaAkcji typ="podglad" />
                          Podgląd
                        </button>
                        <button className="kartoteki__przycisk kartoteki__przycisk--z-ikona" type="button" onClick={() => edytujLokalizacje(lokalizacja)}>
                          <IkonaAkcji typ="edycja" />
                          Edytuj
                        </button>
                        <button className="kartoteki__przycisk kartoteki__przycisk--z-ikona" type="button" onClick={() => duplikujLokalizacje(lokalizacja)}>
                          <IkonaAkcji typ="duplikuj" />
                          Duplikuj
                        </button>
                        <button className="kartoteki__przycisk kartoteki__przycisk--z-ikona" type="button" onClick={() => usunLokalizacje(lokalizacja.klucz_lokalizacji)}>
                          <IkonaAkcji typ="usun" />
                          Usuń
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </section>
      )}

      {aktywnaZakladka === 'szablony_dokumentow' && (
        <section className="kartoteki__widok" ref={referencjaAktywnejKartoteki}>
          <header className="kartoteki__naglowek">
            <div className="kartoteki__tytul">
              <span className="kartoteki__ikona" aria-hidden="true">
                §
              </span>
              <div>
                <h1>Szablony dokumentów</h1>
                <p>Wzorce zapisane z Replikatora dokumentów.</p>
              </div>
            </div>
            <button className="kartoteki__przycisk" type="button" onClick={odswiezSzablonyDokumentow}>
              Odśwież
            </button>
          </header>

          <PanelElementowKartoteki
            elementy={elementyKartoteki}
            filtrTypu={filtrTypuElementu}
            szukanaFraza={szukanyElementKartoteki}
            ustawFiltrTypu={ustawFiltrTypuElementu}
            ustawSzukanaFraza={ustawSzukanyElementKartoteki}
          />

          <PanelPaginacjiKartoteki
            liczbaPozycjiNaStronie={liczbaPozycjiNaStronie}
            liczbaWidocznychPozycji={szablonyNaStronie.length}
            liczbaWszystkichPozycji={szablonyDokumentow.length}
            strona={bezpiecznaStronaSzablonow}
            ustawLiczbePozycjiNaStronie={ustawWspolnaLiczbePozycjiNaStronie}
            ustawStrone={ustawStroneSzablonow}
          />

          <div className="kartoteki__lista">
            {szablonyDokumentow.length ? szablonyNaStronie.map((szablon) => (
              <article className="kartoteki__wiersz" key={szablon.id}>
                <div>
                  <strong>{szablon.nazwa}</strong>
                  <span>
                    {szablon.typDokumentu ?? 'typ nieokreślony'} | {szablon.marka} | wersja {szablon.wersja} | {szablon.status}
                  </span>
                  <span>{szablon.miniatura}</span>
                  <span>Tagi: {szablon.tagi.join(', ') || '-'}</span>
                  <span>Oryginał: {szablon.oryginalnyPlik ?? '-'}</span>
                </div>
                <div className="kartoteki__akcje">
                  <button className="kartoteki__przycisk kartoteki__przycisk--z-ikona" type="button" onClick={() => pokazKomunikat(`Szablon klienta: ${szablon.klientNazwa ?? 'standardowy'}`)}>
                    <IkonaAkcji typ="podglad" />
                    Podgląd
                  </button>
                  <button className="kartoteki__przycisk" type="button" onClick={() => pokazKomunikat(`Wersja szablonu: ${szablon.wersja}`)}>
                    Wersje
                  </button>
                </div>
              </article>
            )) : (
              <section className="kartoteki__panel">
                <p>Brak zapisanych szablonów dokumentów.</p>
              </section>
            )}
          </div>
        </section>
      )}
    </section>
  )
}
