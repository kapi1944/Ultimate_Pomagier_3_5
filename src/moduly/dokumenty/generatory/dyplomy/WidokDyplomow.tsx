import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, ChangeEvent } from 'react'
import { pobierzLokalizacjeZMagazynu } from '../../../../kartoteki/lokalizacje/magazynLokalizacji'
import type { TrybTytuluDyplomu } from '../../../../wspolne/dokumenty/typyDokumentu'
import { trenerzyKartotekiStartowi } from '../../../zamkniete/szczegoly_organizacyjne/stale'
import type { TrenerKartoteki } from '../../../zamkniete/szczegoly_organizacyjne/typy'
import './widokDyplomow.css'

type TrybSzkolenia = 'stacjonarne' | 'online'
type MotywKoloruDyplomu = 'semper' | 'iist' | 'dowolny'
type RodzajGodzin =
  | 'dydaktycznych'
  | 'edukacyjnych'
  | 'szkoleniowych'
  | 'lekcyjnych'
  | 'zegarowych'
  | 'niestandardowych'
type TypDodatkuDyplomu = 'grafika' | 'tekst'
type PolozenieDodatku = 'gora' | 'dol'
type TrybPodgladuStron = 'pierwsza' | 'druga' | 'obie'
type UkladPodgladuStron = 'pod_soba' | 'obok'
type TrybZapisuDat =
  | 'zakres_krotki'
  | 'zakres_pelny'
  | 'lista_i'
  | 'lista_oraz'
  | 'lista_przecinek'
  | 'lista_pelna_srednik'

type DataDyplomu = {
  rok: number
  miesiac: number
  dzien: number
}

type OpcjaZapisuDat = {
  wartosc: TrybZapisuDat
  etykieta: string
}

type BlokNumeruRejestru = {
  wartosc: string
  indeks: number
}

type FragmentNumeruRejestru = {
  tekst: string
  zmienny: boolean
}

type DodatekDyplomu = {
  id: string
  typ: TypDodatkuDyplomu
  nazwa: string
  daneUrl?: string
  tekst?: string
}

type UczestnikDyplomu = {
  id: string
  imieNazwisko: string
  numerRejestru: string
  idDodatkuGornego: string
  idDodatkuDolnego: string
  drugaStrona: boolean
}

type DaneNumeracji = {
  poczatkowyNumerRejestru: string
  indeksZmiennegoBloku: number | null
}

type ZapisDyplomow = DaneNumeracji & {
  trybTytulu: TrybTytuluDyplomu
  motywKoloru: MotywKoloruDyplomu
  kolorMotywu: string
  tytulSzkolenia: string
  rozmiarTytulu: number
  trybSzkolenia: TrybSzkolenia
  miejsceSzkolenia: string
  trener: string
  liczbaGodzin: string
  rodzajGodzin: RodzajGodzin
  niestandardowyRodzajGodzin: string
  wybraneDaty: string[]
  trybZapisuDat: TrybZapisuDat
  miesiacKalendarza: string
  uczestnicyTekst: string
  uczestnicy: UczestnikDyplomu[]
  dodatki: DodatekDyplomu[]
  szerokoscDodatkuGornego: number
  szerokoscDodatkuDolnego: number
  czyPokazacDodatekGorny: boolean
  czyPokazacDodatekDolny: boolean
  czyPokazacDrugaStrone: boolean
  marginesDodatkuGornego: number
  marginesDodatkuDolnego: number
  tloSzablonu: string
  drugaStronaAktywna: boolean
  trescDrugiejStrony: string
}

const kluczZapisuDyplomow = 'ultimate-pomagier.dyplomy.generator-pawla'
const kluczTrenerowKartoteki = 'ultimate-pomagier.kartoteki.trenerzy'
const domyslnyNumerRejestru = '88754867/106061/2026'
const domyslnaDataSzkolenia = '2026-05-18'
const domyslniUczestnicy = 'Agnieszka Walo-Zagórska\nKatarzyna Szymaniak-Kalata'
const koloryFirmoweDyplomu: Record<Exclude<MotywKoloruDyplomu, 'dowolny'>, string> = {
  semper: '#c5000b',
  iist: '#2E89BE',
}
const rodzajeGodzin: RodzajGodzin[] = [
  'dydaktycznych',
  'edukacyjnych',
  'szkoleniowych',
  'lekcyjnych',
  'zegarowych',
  'niestandardowych',
]
const trybyTytulu: TrybTytuluDyplomu[] = ['certyfikat', 'zaswiadczenie', 'dyplom']
const dniTygodnia = ['Pon', 'Wt', 'Sr', 'Czw', 'Pt', 'Sob', 'Nd']
const nazwyMiesiecy = [
  '',
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
]

function utworzId(prefiks: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${prefiks}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function pobierzDzisiejszaDateIso() {
  const data = new Date()
  const rok = data.getFullYear()
  const miesiac = String(data.getMonth() + 1).padStart(2, '0')
  const dzien = String(data.getDate()).padStart(2, '0')

  return `${rok}-${miesiac}-${dzien}`
}

function pobierzTekstTytulu(trybTytulu: TrybTytuluDyplomu) {
  if (trybTytulu === 'zaswiadczenie') {
    return 'ZAŚWIADCZENIE'
  }

  if (trybTytulu === 'dyplom') {
    return 'DYPLOM'
  }

  return 'CERTYFIKAT'
}

function pobierzEtykieteTrybu(trybTytulu: TrybTytuluDyplomu) {
  if (trybTytulu === 'zaswiadczenie') {
    return 'Zaświadczenie'
  }

  if (trybTytulu === 'dyplom') {
    return 'Dyplom'
  }

  return 'Certyfikat'
}

function wybierzPodpowiedziMiejscowosci(miejscowosci: string[], wartosc: string) {
  const fraza = wartosc.trim().toLocaleLowerCase('pl')

  return miejscowosci.filter((miejscowosc) => !fraza || miejscowosc.toLocaleLowerCase('pl').includes(fraza)).slice(0, 50)
}

function wybierzPodpowiedziTrenerow(trenerzy: TrenerKartoteki[], wartosc: string) {
  const fraza = wartosc.trim().toLocaleLowerCase('pl')

  return trenerzy.filter((trener) => !fraza || trener.imieNazwisko.toLocaleLowerCase('pl').includes(fraza)).slice(0, 50)
}

function pobierzTekstZnakuWodnego(trybTytulu: TrybTytuluDyplomu) {
  if (trybTytulu === 'zaswiadczenie') {
    return 'Zaświadczenie'
  }

  if (trybTytulu === 'dyplom') {
    return 'Dyplom'
  }

  return 'Certyfikat'
}

function czyKolorHex(wartosc: string) {
  return /^#[0-9a-f]{6}$/i.test(wartosc.trim())
}

function mapujMotywKoloruDyplomu(wartosc: unknown): MotywKoloruDyplomu {
  return wartosc === 'semper' || wartosc === 'iist' || wartosc === 'dowolny' ? wartosc : 'semper'
}

function pobierzKolorMotywuDyplomu(dane: Pick<ZapisDyplomow, 'motywKoloru' | 'kolorMotywu'>) {
  if (dane.motywKoloru === 'dowolny') {
    return czyKolorHex(dane.kolorMotywu) ? dane.kolorMotywu.trim() : koloryFirmoweDyplomu.semper
  }

  return koloryFirmoweDyplomu[dane.motywKoloru]
}

function ograniczProcent(wartosc: unknown, domyslnaWartosc: number) {
  const liczba = Number(wartosc)

  if (!Number.isFinite(liczba)) {
    return domyslnaWartosc
  }

  return Math.min(100, Math.max(10, Math.round(liczba)))
}

function pobierzSzerokoscDodatku(wartosc: number) {
  return `${ograniczProcent(wartosc, 70) * 0.88}%`
}

function ograniczMarginesDodatku(wartosc: unknown, domyslnaWartosc: number) {
  const liczba = Number(wartosc)

  if (!Number.isFinite(liczba)) {
    return domyslnaWartosc
  }

  return Math.min(24, Math.max(0, Math.round(liczba * 10) / 10))
}

function pobierzMarginesDodatku(wartosc: number, domyslnaWartosc: number) {
  return `${ograniczMarginesDodatku(wartosc, domyslnaWartosc)}%`
}

function pobierzPrzesuniecieDodatku(wartosc: number, czyDodatekWybrany: boolean) {
  if (!czyDodatekWybrany) {
    return '0%'
  }

  const procent = ograniczProcent(wartosc, 70)
  return `${Math.min(7.2, Math.max(3.4, procent * 0.072))}%`
}

function pobierzStylMotywuDyplomu(
  dane: Pick<
    ZapisDyplomow,
    | 'motywKoloru'
    | 'kolorMotywu'
    | 'szerokoscDodatkuGornego'
    | 'szerokoscDodatkuDolnego'
    | 'marginesDodatkuGornego'
    | 'marginesDodatkuDolnego'
  >,
  dodatki: { czyDodatekGorny?: boolean; czyDodatekDolny?: boolean } = {},
): CSSProperties {
  return {
    '--semper-czerwony': pobierzKolorMotywuDyplomu(dane),
    '--szerokosc-dodatku-gornego': pobierzSzerokoscDodatku(dane.szerokoscDodatkuGornego),
    '--szerokosc-dodatku-dolnego': pobierzSzerokoscDodatku(dane.szerokoscDodatkuDolnego),
    '--margines-dodatku-gornego': pobierzMarginesDodatku(dane.marginesDodatkuGornego, 9.2),
    '--margines-dodatku-dolnego': pobierzMarginesDodatku(dane.marginesDodatkuDolnego, 7.6),
    '--przesuniecie-dodatku-gornego': pobierzPrzesuniecieDodatku(
      dane.szerokoscDodatkuGornego,
      Boolean(dodatki.czyDodatekGorny),
    ),
    '--przesuniecie-dodatku-dolnego': pobierzPrzesuniecieDodatku(
      dane.szerokoscDodatkuDolnego,
      Boolean(dodatki.czyDodatekDolny),
    ),
  } as CSSProperties
}

function mapujRodzajGodzin(wartosc: unknown): RodzajGodzin {
  if (rodzajeGodzin.includes(wartosc as RodzajGodzin)) {
    return wartosc as RodzajGodzin
  }

  if (wartosc === 'godzin dydaktycznych') {
    return 'dydaktycznych'
  }

  if (wartosc === 'godzin zegarowych') {
    return 'zegarowych'
  }

  if (wartosc === 'godzin szkolnych') {
    return 'lekcyjnych'
  }

  if (typeof wartosc === 'string' && wartosc.startsWith('godzin ')) {
    return mapujRodzajGodzin(wartosc.replace('godzin ', ''))
  }

  return 'edukacyjnych'
}

function pobierzZapisGodzin(dane: Pick<ZapisDyplomow, 'rodzajGodzin' | 'niestandardowyRodzajGodzin'>) {
  const rodzajGodzin =
    dane.rodzajGodzin === 'niestandardowych'
      ? dane.niestandardowyRodzajGodzin.trim() || 'niestandardowych'
      : dane.rodzajGodzin

  return rodzajGodzin.toLocaleLowerCase('pl-PL').startsWith('godzin ')
    ? rodzajGodzin
    : `godzin ${rodzajGodzin}`
}

function pobierzTrenerowZKartoteki(): TrenerKartoteki[] {
  try {
    const zapis = localStorage.getItem(kluczTrenerowKartoteki)
    const dane = zapis ? JSON.parse(zapis) : null

    if (!Array.isArray(dane)) {
      return trenerzyKartotekiStartowi
    }

    return dane
      .filter((trener) => trener?.status !== 'Nieaktywny')
      .map((trener) => ({
        id: String(trener.id),
        imieNazwisko: `${trener.imie ?? ''} ${trener.nazwisko ?? ''}`.trim() || String(trener.imieNazwisko ?? ''),
        telefon: String(trener.telefon ?? ''),
        email: String(trener.email ?? ''),
      }))
      .filter((trener) => trener.imieNazwisko)
  } catch {
    return trenerzyKartotekiStartowi
  }
}

function pobierzZdanieUkonczenia(trybTytulu: TrybTytuluDyplomu) {
  if (trybTytulu === 'dyplom') {
    return 'otrzymuje dyplom za udział w szkoleniu:'
  }

  if (trybTytulu === 'zaswiadczenie') {
    return 'uczestniczył/a w szkoleniu:'
  }

  return 'ukończył/a szkolenie:'
}

function oczyscTytulSzkolenia(tytul: string) {
  return tytul.trim().replace(/^[\s"'„”]+|[\s"'„”]+$/g, '')
}

function formatujTytulSzkolenia(tytul: string) {
  const czystyTytul = oczyscTytulSzkolenia(tytul)

  return czystyTytul ? `"${czystyTytul}"` : '"Tytuł szkolenia"'
}

function parsujListeUczestnikow(wartosc: string) {
  return wartosc
    .split(/\r?\n/)
    .map((wiersz) => wiersz.split(/\t|;/)[0].trim())
    .filter(Boolean)
}

function pobierzBlokiNumeruRejestru(wartosc: string): BlokNumeruRejestru[] {
  return Array.from(String(wartosc || '').matchAll(/\d+/g)).map((dopasowanie) => ({
    wartosc: dopasowanie[0],
    indeks: dopasowanie.index ?? 0,
  }))
}

function pobierzIndeksZmiennegoBloku(bloki: BlokNumeruRejestru[], preferowanyIndeks: number | null) {
  if (!bloki.length) {
    return -1
  }

  if (preferowanyIndeks !== null && preferowanyIndeks >= 0 && preferowanyIndeks < bloki.length) {
    return preferowanyIndeks
  }

  const ostatniIndeks = bloki.length - 1

  if (bloki.length >= 2 && bloki[ostatniIndeks].wartosc.length === 4) {
    return ostatniIndeks - 1
  }

  return ostatniIndeks
}

function zwiekszNumerRejestru(numer: string, krok: number, indeksZmiennegoBloku: number | null) {
  if (!numer.trim() || krok === 0) {
    return numer
  }

  const bloki = pobierzBlokiNumeruRejestru(numer)

  if (!bloki.length) {
    return numer
  }

  const blok = bloki[pobierzIndeksZmiennegoBloku(bloki, indeksZmiennegoBloku)]
  const poczatek = blok.indeks
  const koniec = poczatek + blok.wartosc.length
  const kolejnaWartosc = String(Number.parseInt(blok.wartosc, 10) + krok).padStart(blok.wartosc.length, '0')

  return `${numer.slice(0, poczatek)}${kolejnaWartosc}${numer.slice(koniec)}`
}

function zbudujNumerRejestru(dane: DaneNumeracji, indeks: number) {
  return zwiekszNumerRejestru(dane.poczatkowyNumerRejestru.trim(), indeks, dane.indeksZmiennegoBloku)
}

function zbudujFragmentyNumeru(wartosc: string, indeksZmiennegoBloku: number | null): FragmentNumeruRejestru[] {
  const tekst = wartosc.trim()

  if (!tekst) {
    return [{ tekst: 'Wpisz numer rejestru.', zmienny: false }]
  }

  const bloki = pobierzBlokiNumeruRejestru(tekst)

  if (!bloki.length) {
    return [{ tekst, zmienny: false }]
  }

  const indeksWybrany = pobierzIndeksZmiennegoBloku(bloki, indeksZmiennegoBloku)
  const fragmenty: FragmentNumeruRejestru[] = []
  let kursor = 0

  bloki.forEach((blok, indeks) => {
    if (blok.indeks > kursor) {
      fragmenty.push({ tekst: tekst.slice(kursor, blok.indeks), zmienny: false })
    }

    fragmenty.push({ tekst: blok.wartosc, zmienny: indeks === indeksWybrany })
    kursor = blok.indeks + blok.wartosc.length
  })

  if (kursor < tekst.length) {
    fragmenty.push({ tekst: tekst.slice(kursor), zmienny: false })
  }

  return fragmenty
}

function utworzUczestnika(imieNazwisko: string, indeks: number, dane: DaneNumeracji): UczestnikDyplomu {
  return {
    id: utworzId('uczestnik'),
    imieNazwisko,
    numerRejestru: zbudujNumerRejestru(dane, indeks),
    idDodatkuGornego: '',
    idDodatkuDolnego: '',
    drugaStrona: true,
  }
}

function polaczUczestnikow(nazwy: string[], obecni: UczestnikDyplomu[], dane: DaneNumeracji) {
  return nazwy.map((nazwa, indeks) => {
    const obecny = obecni[indeks]

    if (!obecny) {
      return utworzUczestnika(nazwa, indeks, dane)
    }

    return {
      ...obecny,
      imieNazwisko: nazwa,
      numerRejestru: obecny.numerRejestru || zbudujNumerRejestru(dane, indeks),
    }
  })
}

function utworzDomyslnyZapis(): ZapisDyplomow {
  const daneNumeracji: DaneNumeracji = {
    poczatkowyNumerRejestru: domyslnyNumerRejestru,
    indeksZmiennegoBloku: null,
  }

  return {
    ...daneNumeracji,
    trybTytulu: 'certyfikat',
    motywKoloru: 'semper',
    kolorMotywu: koloryFirmoweDyplomu.semper,
    tytulSzkolenia:
      'Identyfikowanie podrobionych dokumentów jako instrument przeciwdziałania nadużyciom finansowym, w tym w FEnIKS',
    rozmiarTytulu: 20,
    trybSzkolenia: 'stacjonarne',
    miejsceSzkolenia: 'Warszawa',
    trener: 'r. pr. Natalia Soroka-Tezcan',
    liczbaGodzin: '8',
    rodzajGodzin: 'edukacyjnych',
    niestandardowyRodzajGodzin: '',
    wybraneDaty: [domyslnaDataSzkolenia],
    trybZapisuDat: 'lista_przecinek',
    miesiacKalendarza: '2026-05',
    uczestnicyTekst: domyslniUczestnicy,
    uczestnicy: parsujListeUczestnikow(domyslniUczestnicy).map((nazwa, indeks) =>
      utworzUczestnika(nazwa, indeks, daneNumeracji),
    ),
    dodatki: [],
    szerokoscDodatkuGornego: 70,
    szerokoscDodatkuDolnego: 70,
    czyPokazacDodatekGorny: true,
    czyPokazacDodatekDolny: true,
    czyPokazacDrugaStrone: true,
    marginesDodatkuGornego: 9.2,
    marginesDodatkuDolnego: 7.6,
    tloSzablonu: '',
    drugaStronaAktywna: false,
    trescDrugiejStrony: 'Cele, korzyści, program szkolenia albo efekty uczenia się.',
  }
}

function wczytajZapisDyplomow(): ZapisDyplomow {
  const domyslnyZapis = utworzDomyslnyZapis()

  try {
    const zapis = localStorage.getItem(kluczZapisuDyplomow)

    if (!zapis) {
      return domyslnyZapis
    }

    const dane = JSON.parse(zapis) as Partial<ZapisDyplomow>
    const uczestnicyTekst = dane.uczestnicyTekst ?? domyslnyZapis.uczestnicyTekst
    const daneNumeracji: DaneNumeracji = {
      poczatkowyNumerRejestru: dane.poczatkowyNumerRejestru ?? domyslnyZapis.poczatkowyNumerRejestru,
      indeksZmiennegoBloku: dane.indeksZmiennegoBloku ?? null,
    }
    const uczestnicyZListy = polaczUczestnikow(
      parsujListeUczestnikow(uczestnicyTekst),
      Array.isArray(dane.uczestnicy) ? dane.uczestnicy : [],
      daneNumeracji,
    )

    return {
      ...domyslnyZapis,
      ...dane,
      ...daneNumeracji,
      uczestnicyTekst,
      uczestnicy: uczestnicyZListy,
      dodatki: Array.isArray(dane.dodatki) ? dane.dodatki : [],
      motywKoloru: mapujMotywKoloruDyplomu(dane.motywKoloru),
      kolorMotywu: czyKolorHex(dane.kolorMotywu ?? '') ? String(dane.kolorMotywu) : domyslnyZapis.kolorMotywu,
      rodzajGodzin: mapujRodzajGodzin(dane.rodzajGodzin),
      niestandardowyRodzajGodzin: dane.niestandardowyRodzajGodzin ?? '',
      szerokoscDodatkuGornego: ograniczProcent(
        dane.szerokoscDodatkuGornego,
        domyslnyZapis.szerokoscDodatkuGornego,
      ),
      szerokoscDodatkuDolnego: ograniczProcent(
        dane.szerokoscDodatkuDolnego,
        domyslnyZapis.szerokoscDodatkuDolnego,
      ),
      czyPokazacDodatekGorny: dane.czyPokazacDodatekGorny ?? domyslnyZapis.czyPokazacDodatekGorny,
      czyPokazacDodatekDolny: dane.czyPokazacDodatekDolny ?? domyslnyZapis.czyPokazacDodatekDolny,
      czyPokazacDrugaStrone: dane.czyPokazacDrugaStrone ?? domyslnyZapis.czyPokazacDrugaStrone,
      marginesDodatkuGornego: ograniczMarginesDodatku(
        dane.marginesDodatkuGornego,
        domyslnyZapis.marginesDodatkuGornego,
      ),
      marginesDodatkuDolnego: ograniczMarginesDodatku(
        dane.marginesDodatkuDolnego,
        domyslnyZapis.marginesDodatkuDolnego,
      ),
      wybraneDaty: Array.isArray(dane.wybraneDaty) ? dane.wybraneDaty : domyslnyZapis.wybraneDaty,
      trybZapisuDat: dane.trybZapisuDat ?? domyslnyZapis.trybZapisuDat,
      miesiacKalendarza: dane.miesiacKalendarza ?? domyslnyZapis.miesiacKalendarza,
    }
  } catch {
    return domyslnyZapis
  }
}

function formatujKrotkaDate(wartosc: string) {
  if (!wartosc) {
    return '--.--.----'
  }

  const [rok, miesiac, dzien] = wartosc.split('-')

  return `${dzien}-${miesiac}-${rok}`
}

function parsujDate(wartosc: string): DataDyplomu | null {
  const [rok, miesiac, dzien] = wartosc.split('-').map((fragment) => Number(fragment))

  if (!rok || !miesiac || !dzien) {
    return null
  }

  return { rok, miesiac, dzien }
}

function parsujDatyDyplomu(wartosci: string[]) {
  return [...wartosci]
    .sort()
    .map((wartosc) => parsujDate(wartosc))
    .filter((data): data is DataDyplomu => Boolean(data))
}

function czyDatyKolejne(wartosci: string[]) {
  if (wartosci.length <= 1) {
    return true
  }

  const daty = [...wartosci].sort()

  for (let indeks = 1; indeks < daty.length; indeks += 1) {
    const poprzednia = new Date(`${daty[indeks - 1]}T00:00:00`)
    const aktualna = new Date(`${daty[indeks]}T00:00:00`)
    const roznicaDni = Math.round((aktualna.getTime() - poprzednia.getTime()) / 86400000)

    if (roznicaDni !== 1) {
      return false
    }
  }

  return true
}

function formatujDzien(data: DataDyplomu) {
  return String(data.dzien).padStart(2, '0')
}

function formatujDatePelna(data: DataDyplomu) {
  return `${formatujDzien(data)} ${nazwyMiesiecy[data.miesiac]} ${data.rok}`
}

function formatujDateZMiesiacem(data: DataDyplomu) {
  return `${formatujDzien(data)} ${nazwyMiesiecy[data.miesiac]}`
}

function czyTenSamMiesiacIRok(daty: DataDyplomu[]) {
  const pierwszaData = daty[0]

  return Boolean(
    pierwszaData && daty.every((data) => data.rok === pierwszaData.rok && data.miesiac === pierwszaData.miesiac),
  )
}

function polaczListeTekstow(teksty: string[], trybZapisuDat: TrybZapisuDat) {
  if (trybZapisuDat === 'lista_przecinek') {
    return teksty.join(', ')
  }

  const lacznik = trybZapisuDat === 'lista_oraz' ? 'oraz' : 'i'

  if (teksty.length <= 2) {
    return teksty.join(` ${lacznik} `)
  }

  return `${teksty.slice(0, -1).join(', ')} ${lacznik} ${teksty[teksty.length - 1]}`
}

function formatujListeDat(daty: DataDyplomu[], trybZapisuDat: TrybZapisuDat) {
  if (!daty.length) {
    return '--'
  }

  if (trybZapisuDat === 'lista_pelna_srednik') {
    return daty.map((data) => formatujDatePelna(data)).join('; ')
  }

  if (czyTenSamMiesiacIRok(daty)) {
    return `${polaczListeTekstow(
      daty.map((data) => formatujDzien(data)),
      trybZapisuDat,
    )} ${nazwyMiesiecy[daty[0].miesiac]} ${daty[0].rok}`
  }

  return polaczListeTekstow(
    daty.map((data) => formatujDatePelna(data)),
    trybZapisuDat,
  )
}

function zbudujZakresDat(daty: DataDyplomu[], trybZapisuDat: TrybZapisuDat) {
  const pierwszaData = daty[0]
  const ostatniaData = daty[daty.length - 1]

  if (!pierwszaData || !ostatniaData) {
    return '--'
  }

  if (trybZapisuDat === 'zakres_pelny') {
    if (pierwszaData.rok === ostatniaData.rok) {
      return `od ${formatujDateZMiesiacem(pierwszaData)} do ${formatujDatePelna(ostatniaData)}`
    }

    return `od ${formatujDatePelna(pierwszaData)} do ${formatujDatePelna(ostatniaData)}`
  }

  if (czyTenSamMiesiacIRok(daty)) {
    return `od ${formatujDzien(pierwszaData)} do ${formatujDatePelna(ostatniaData)}`
  }

  return `od ${formatujDatePelna(pierwszaData)} do ${formatujDatePelna(ostatniaData)}`
}

function zbudujZdanieDat(wybraneDaty: string[], trybZapisuDat: TrybZapisuDat = 'lista_przecinek') {
  const daty = [...wybraneDaty].sort()
  const datyDyplomu = parsujDatyDyplomu(daty)
  const czyZakres = trybZapisuDat === 'zakres_krotki' || trybZapisuDat === 'zakres_pelny'
  const skutecznyTrybZapisuDat = czyZakres && !czyDatyKolejne(daty) ? 'lista_przecinek' : trybZapisuDat

  if (!daty.length) {
    return 'zrealizowane w terminie: --'
  }

  if (daty.length === 1) {
    return `zrealizowane w terminie: ${formatujKrotkaDate(daty[0])}`
  }

  if (skutecznyTrybZapisuDat === 'zakres_krotki' || skutecznyTrybZapisuDat === 'zakres_pelny') {
    return `zrealizowane w terminie: ${zbudujZakresDat(datyDyplomu, skutecznyTrybZapisuDat)}`
  }

  if (skutecznyTrybZapisuDat === 'lista_pelna_srednik') {
    return `zrealizowane w terminach: ${formatujListeDat(datyDyplomu, skutecznyTrybZapisuDat)}`
  }

  return `zrealizowane w terminie: ${formatujListeDat(datyDyplomu, skutecznyTrybZapisuDat)}`
}

function pobierzOpcjeZapisuDat(wybraneDaty: string[]): OpcjaZapisuDat[] {
  const daty = [...wybraneDaty].sort()

  if (daty.length < 2) {
    return [{ wartosc: 'lista_przecinek', etykieta: 'Domyślny zapis pojedynczej daty' }]
  }

  const trybyDat: TrybZapisuDat[] = czyDatyKolejne(daty)
    ? ['zakres_krotki', 'zakres_pelny', 'lista_i', 'lista_oraz', 'lista_przecinek', 'lista_pelna_srednik']
    : ['lista_i', 'lista_oraz', 'lista_przecinek', 'lista_pelna_srednik']

  return trybyDat.map((trybDat) => ({
    wartosc: trybDat,
    etykieta: zbudujZdanieDat(daty, trybDat),
  }))
}

function pobierzSkutecznyTrybZapisuDat(wybraneDaty: string[], trybZapisuDat: TrybZapisuDat) {
  const opcje = pobierzOpcjeZapisuDat(wybraneDaty)

  return opcje.some((opcja) => opcja.wartosc === trybZapisuDat)
    ? trybZapisuDat
    : (opcje[0]?.wartosc ?? 'lista_przecinek')
}

function pobierzDateKonca(wybraneDaty: string[]) {
  return [...wybraneDaty].sort().at(-1) ?? ''
}

function pobierzMiejsceSzkolenia(dane: ZapisDyplomow) {
  return dane.trybSzkolenia === 'online' ? 'Szkolenie online' : dane.miejsceSzkolenia.trim()
}

function zbudujTekstMiejscaSzkolenia(dane: ZapisDyplomow) {
  const miejsceSzkolenia = pobierzMiejsceSzkolenia(dane)

  if (dane.trybSzkolenia === 'online') {
    return miejsceSzkolenia
  }

  return `Miejsce szkolenia: ${miejsceSzkolenia || '--'}.`
}

function sprawdzDane(dane: ZapisDyplomow) {
  const problemy: string[] = []
  const uczestnicy = dane.uczestnicy.filter((uczestnik) => uczestnik.imieNazwisko.trim())

  if (!uczestnicy.length) {
    problemy.push('dodaj co najmniej jednego uczestnika')
  }

  if (!dane.tytulSzkolenia.trim()) {
    problemy.push('uzupełnij tytuł szkolenia')
  }

  if (!dane.wybraneDaty.length) {
    problemy.push('wybierz termin szkolenia')
  }

  if (!dane.liczbaGodzin || Number(dane.liczbaGodzin) <= 0) {
    problemy.push('uzupełnij liczbę godzin')
  }

  if (!dane.trener.trim()) {
    problemy.push('uzupełnij eksperta / trenera')
  }

  if (dane.trybSzkolenia !== 'online' && !dane.miejsceSzkolenia.trim()) {
    problemy.push('uzupełnij miejsce szkolenia')
  }

  const brakiNumerow = uczestnicy.filter((uczestnik) => !uczestnik.numerRejestru.trim()).length

  if (brakiNumerow) {
    problemy.push(
      brakiNumerow === 1
        ? 'uzupełnij numer rejestru dla 1 uczestnika'
        : `uzupełnij numer rejestru dla ${brakiNumerow} uczestników`,
    )
  }

  return problemy
}

function wczytajPlikJakoDataUrl(plik: File) {
  return new Promise<string>((resolve, reject) => {
    const czytnik = new FileReader()
    czytnik.addEventListener('load', () => resolve(String(czytnik.result || '')))
    czytnik.addEventListener('error', () => reject(czytnik.error))
    czytnik.readAsDataURL(plik)
  })
}

function pobierzDodatek(dodatki: DodatekDyplomu[], idDodatku: string) {
  return dodatki.find((dodatek) => dodatek.id === idDodatku)
}

function RenderujDodatek({ dodatek, polozenie }: { dodatek?: DodatekDyplomu; polozenie: PolozenieDodatku }) {
  if (!dodatek) {
    return null
  }

  return (
    <div className={`dyplom-kartka__dodatek dyplom-kartka__dodatek--${polozenie}`}>
      {dodatek.typ === 'grafika' && dodatek.daneUrl ? (
        <img alt={dodatek.nazwa} src={dodatek.daneUrl} />
      ) : (
        <div className="dyplom-kartka__dodatek-tekst">{dodatek.tekst}</div>
      )}
    </div>
  )
}

function StronaDrugaDyplomu({ dane, uczestnik }: { dane: ZapisDyplomow; uczestnik: UczestnikDyplomu }) {
  return (
    <article className="dyplom-kartka dyplom-kartka--druga" style={pobierzStylMotywuDyplomu(dane)}>
      <div className="dyplom-kartka__warstwa">
        <header className="dyplom-kartka__naglowek-drugiej">
          <span>{pobierzTekstTytulu(dane.trybTytulu)}</span>
          <strong>{uczestnik.imieNazwisko || 'Uczestnik'}</strong>
        </header>

        <main className="dyplom-kartka__tresc-drugiej">
          <h2>Informacje dodatkowe</h2>
          <div>{dane.trescDrugiejStrony || 'Cele, korzyści, program szkolenia albo efekty uczenia się.'}</div>
        </main>
      </div>
    </article>
  )
}

function StronaDyplomu({ dane, uczestnik }: { dane: ZapisDyplomow; uczestnik: UczestnikDyplomu }) {
  const dodatekGorny = dane.czyPokazacDodatekGorny ? pobierzDodatek(dane.dodatki, uczestnik.idDodatkuGornego) : undefined
  const dodatekDolny = dane.czyPokazacDodatekDolny ? pobierzDodatek(dane.dodatki, uczestnik.idDodatkuDolnego) : undefined
  const miejsceSzkolenia = pobierzMiejsceSzkolenia(dane)
  const dataKonca = pobierzDateKonca(dane.wybraneDaty)
  const trybDat = pobierzSkutecznyTrybZapisuDat(dane.wybraneDaty, dane.trybZapisuDat)
  const klasyKartki = [
    `dyplom-kartka dyplom-kartka--${dane.trybTytulu}`,
    dodatekGorny ? 'dyplom-kartka--z-dodatkiem-gornym' : '',
    dodatekDolny ? 'dyplom-kartka--z-dodatkiem-dolnym' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article
      className={klasyKartki}
      style={pobierzStylMotywuDyplomu(dane, {
        czyDodatekGorny: Boolean(dodatekGorny),
        czyDodatekDolny: Boolean(dodatekDolny),
      })}
    >
      {dane.tloSzablonu && <img alt="" className="dyplom-kartka__tlo" src={dane.tloSzablonu} />}
      <div className="dyplom-kartka__warstwa">
        <div className="dyplom-kartka__pasek dyplom-kartka__pasek--lewy">
          Nr z rejestru: {uczestnik.numerRejestru || '----'}
        </div>
        <div className="dyplom-kartka__pasek dyplom-kartka__pasek--prawy">
          {[miejsceSzkolenia || 'Miejsce szkolenia', dataKonca ? formatujKrotkaDate(dataKonca) : 'data'].join(', ')}
        </div>

        <div className={`dyplom-kartka__znak-wodny dyplom-kartka__znak-wodny--${dane.trybTytulu}`}>
          {pobierzTekstZnakuWodnego(dane.trybTytulu)}
        </div>

        <RenderujDodatek dodatek={dodatekGorny} polozenie="gora" />

        <div className="dyplom-kartka__naglowek-ozdobny">
          <div className="dyplom-kartka__typ">{pobierzTekstTytulu(dane.trybTytulu)}</div>
          <div className="dyplom-kartka__linia-tytulu" />
          <div className="dyplom-kartka__podtytul">UKOŃCZENIA SZKOLENIA</div>
        </div>

        <main className="dyplom-kartka__glowna">
          <div className="dyplom-kartka__wstep">Niniejszym zaświadcza się, że</div>
          <div className="dyplom-kartka__osoba">
            <span>Pan/Pani</span>
            <strong>{uczestnik.imieNazwisko || 'Imię i nazwisko'}</strong>
          </div>
          <div className="dyplom-kartka__ukonczenie">{pobierzZdanieUkonczenia(dane.trybTytulu)}</div>
          <div className="dyplom-kartka__tytul" style={{ fontSize: `${dane.rozmiarTytulu}px` }}>
            {formatujTytulSzkolenia(dane.tytulSzkolenia)}
          </div>
          <div className="dyplom-kartka__szczegoly">
            <p>{zbudujZdanieDat(dane.wybraneDaty, trybDat)}</p>
            <p>
              w wymiarze {dane.liczbaGodzin || '--'} {pobierzZapisGodzin(dane)}.
            </p>
            <p>{zbudujTekstMiejscaSzkolenia(dane)}</p>
          </div>
        </main>

        <footer className="dyplom-kartka__stopka">
          <div className="dyplom-kartka__logo-semper">
            <img alt="SEMPER" src="/logo-semper.png" />
          </div>
          <div className="dyplom-kartka__organizator">
            Centrum Organizacji Szkoleń i Konferencji <strong>SEMPER</strong>
          </div>
          <div className="dyplom-kartka__pieczec">
            <span>Pieczęć i podpis Organizatora:</span>
            <span>Magdalena Wolniewicz-Kesaria</span>
            <span>Manager Działu Badań i Koordynacji Szkoleń</span>
            <span>Centrum Organizacji Szkoleń</span>
            <span>Konferencji SEMPER</span>
            <span>ul. Libelta 1a/2, 61-706 Poznań</span>
            <span>NIP 7772616176</span>
          </div>
          <div className="dyplom-kartka__linia-kropkowana">........................................................</div>
          <div className="dyplom-kartka__ekspert">
            Ekspert merytoryczny: {dane.trener || '....................................'}
          </div>
          <div className="dyplom-kartka__gratulacje">
            Serdecznie gratulujemy i życzymy dalszych sukcesów!
          </div>
        </footer>
        <RenderujDodatek dodatek={dodatekDolny} polozenie="dol" />
      </div>
    </article>
  )
}

export default function WidokDyplomow() {
  const [dane, ustawDane] = useState<ZapisDyplomow>(wczytajZapisDyplomow)
  const [komunikat, ustawKomunikat] = useState('Szkic zapisywany lokalnie.')
  const [nazwaNowegoDodatku, ustawNazweNowegoDodatku] = useState('')
  const [tekstNowegoDodatku, ustawTekstNowegoDodatku] = useState('')
  const [idWybranegoDodatkuGornego, ustawIdWybranegoDodatkuGornego] = useState('')
  const [idWybranegoDodatkuDolnego, ustawIdWybranegoDodatkuDolnego] = useState('')
  const [trybPodgladuStron, ustawTrybPodgladuStron] = useState<TrybPodgladuStron>('pierwsza')
  const [ukladPodgladuStron, ustawUkladPodgladuStron] = useState<UkladPodgladuStron>('pod_soba')
  const [indeksUczestnikaPierwszejStrony, ustawIndeksUczestnikaPierwszejStrony] = useState(0)
  const uczestnicyDoDruku = useMemo(
    () => dane.uczestnicy.filter((uczestnik) => uczestnik.imieNazwisko.trim()),
    [dane.uczestnicy],
  )
  const indeksPierwszejStrony = uczestnicyDoDruku.length
    ? Math.min(indeksUczestnikaPierwszejStrony, uczestnicyDoDruku.length - 1)
    : 0
  const uczestnicyDrugiejStrony = uczestnicyDoDruku.filter((uczestnik) => uczestnik.drugaStrona)
  const uczestnikDrugiejStrony = uczestnicyDrugiejStrony[0] ?? uczestnicyDoDruku[0] ?? utworzUczestnika('', 0, dane)
  const uczestnikPierwszejStrony = uczestnicyDoDruku[indeksPierwszejStrony] ?? uczestnikDrugiejStrony
  const problemy = useMemo(() => sprawdzDane(dane), [dane])
  const miejscowosciDoPodpowiedzi = useMemo(
    () =>
      [...new Set(pobierzLokalizacjeZMagazynu().map((lokalizacja) => lokalizacja.nazwa))].sort((pierwsza, druga) =>
        pierwsza.localeCompare(druga, 'pl'),
      ),
    [],
  )
  const podpowiedziMiejscaSzkolenia = useMemo(
    () => wybierzPodpowiedziMiejscowosci(miejscowosciDoPodpowiedzi, dane.miejsceSzkolenia),
    [dane.miejsceSzkolenia, miejscowosciDoPodpowiedzi],
  )
  const trenerzyDoWyboru = useMemo(
    () => pobierzTrenerowZKartoteki().sort((pierwszy, drugi) => pierwszy.imieNazwisko.localeCompare(drugi.imieNazwisko, 'pl')),
    [],
  )
  const podpowiedziTrenerow = useMemo(
    () => wybierzPodpowiedziTrenerow(trenerzyDoWyboru, dane.trener),
    [dane.trener, trenerzyDoWyboru],
  )
  const czyDrugaStronaDostepna = dane.drugaStronaAktywna && dane.czyPokazacDrugaStrone && uczestnicyDrugiejStrony.length > 0
  const czyKontrolaPodgladuDostepna = czyDrugaStronaDostepna || uczestnicyDoDruku.length > 1
  const skutecznyTrybPodgladuStron = czyDrugaStronaDostepna ? trybPodgladuStron : 'pierwsza'
  const czyPokazacPierwszaStrone =
    skutecznyTrybPodgladuStron === 'pierwsza' || skutecznyTrybPodgladuStron === 'obie'
  const czyPokazacDrugaStrone =
    czyDrugaStronaDostepna &&
    (skutecznyTrybPodgladuStron === 'druga' || skutecznyTrybPodgladuStron === 'obie')
  const blokiNumeru = useMemo(
    () => pobierzBlokiNumeruRejestru(dane.poczatkowyNumerRejestru),
    [dane.poczatkowyNumerRejestru],
  )
  const indeksZmiennegoBloku = pobierzIndeksZmiennegoBloku(blokiNumeru, dane.indeksZmiennegoBloku)
  const fragmentyNumeru = useMemo(
    () => zbudujFragmentyNumeru(dane.poczatkowyNumerRejestru, dane.indeksZmiennegoBloku),
    [dane.poczatkowyNumerRejestru, dane.indeksZmiennegoBloku],
  )
  const dniKalendarza = useMemo(() => {
    const miesiacKalendarza = dane.miesiacKalendarza || pobierzDzisiejszaDateIso().slice(0, 7)
    const [rok, miesiac] = miesiacKalendarza.split('-').map((fragment) => Number(fragment))
    const pierwszyDzien = new Date(rok, miesiac - 1, 1)
    const przesuniecieStartu = (pierwszyDzien.getDay() + 6) % 7
    const start = new Date(rok, miesiac - 1, 1 - przesuniecieStartu)

    return Array.from({ length: 42 }, (_wartosc, indeks) => {
      const data = new Date(start)
      data.setDate(start.getDate() + indeks)

      const iso = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(
        data.getDate(),
      ).padStart(2, '0')}`

      return {
        iso,
        dzien: data.getDate(),
        wMiesiacu: data.getMonth() === miesiac - 1,
      }
    })
  }, [dane.miesiacKalendarza])
  const opcjeZapisuDat = useMemo(() => pobierzOpcjeZapisuDat(dane.wybraneDaty), [dane.wybraneDaty])
  const skutecznyTrybZapisuDat = pobierzSkutecznyTrybZapisuDat(dane.wybraneDaty, dane.trybZapisuDat)

  useEffect(() => {
    localStorage.setItem(kluczZapisuDyplomow, JSON.stringify(dane))
  }, [dane])

  function zmienPole<Nazwa extends keyof ZapisDyplomow>(nazwa: Nazwa, wartosc: ZapisDyplomow[Nazwa]) {
    ustawDane((aktualne) => ({
      ...aktualne,
      [nazwa]: wartosc,
    }))
  }

  function przelaczDrugaStrone(czyAktywna: boolean) {
    zmienPole('drugaStronaAktywna', czyAktywna)
    ustawTrybPodgladuStron(czyAktywna ? 'obie' : 'pierwsza')
  }

  function zmienTrescDrugiejStrony(wartosc: string) {
    ustawDane((aktualne) => ({
      ...aktualne,
      drugaStronaAktywna: wartosc.trim() ? true : aktualne.drugaStronaAktywna,
      trescDrugiejStrony: wartosc,
    }))

    if (wartosc.trim()) {
      ustawTrybPodgladuStron('obie')
    }
  }

  function zmienMotywKoloru(motywKoloru: MotywKoloruDyplomu) {
    ustawDane((aktualne) => ({
      ...aktualne,
      motywKoloru,
      kolorMotywu:
        motywKoloru === 'dowolny'
          ? aktualne.kolorMotywu || koloryFirmoweDyplomu.semper
          : koloryFirmoweDyplomu[motywKoloru],
    }))
  }

  function zmienKolorMotywu(kolorMotywu: string) {
    ustawDane((aktualne) => ({
      ...aktualne,
      motywKoloru: 'dowolny',
      kolorMotywu,
    }))
  }

  function zatwierdzTreneraZKartoteki() {
    const fraza = dane.trener.trim().toLocaleLowerCase('pl')

    if (!fraza) {
      return
    }

    const trenerDokladny = trenerzyDoWyboru.find((trener) => trener.imieNazwisko.toLocaleLowerCase('pl') === fraza)
    const trenerJedyny = trenerzyDoWyboru.filter((trener) => trener.imieNazwisko.toLocaleLowerCase('pl').includes(fraza))
    const trener = trenerDokladny ?? (trenerJedyny.length === 1 ? trenerJedyny[0] : undefined)

    if (trener) {
      zmienPole('trener', trener.imieNazwisko)
    }
  }

  function zmienTrybSzkolenia(trybSzkolenia: TrybSzkolenia) {
    ustawDane((aktualne) => ({
      ...aktualne,
      trybSzkolenia,
      miejsceSzkolenia:
        trybSzkolenia === 'online'
          ? 'Szkolenie online'
          : aktualne.miejsceSzkolenia === 'Szkolenie online'
            ? ''
            : aktualne.miejsceSzkolenia,
    }))
  }

  function zmienTekstUczestnikow(wartosc: string) {
    ustawDane((aktualne) => ({
      ...aktualne,
      uczestnicyTekst: wartosc,
      uczestnicy: polaczUczestnikow(parsujListeUczestnikow(wartosc), aktualne.uczestnicy, aktualne),
    }))
  }

  function zmienUczestnika(id: string, zmiany: Partial<UczestnikDyplomu>, czyAktualizowacListe = false) {
    ustawDane((aktualne) => {
      const uczestnicy = aktualne.uczestnicy.map((uczestnik) =>
        uczestnik.id === id ? { ...uczestnik, ...zmiany } : uczestnik,
      )

      return {
        ...aktualne,
        uczestnicy,
        uczestnicyTekst: czyAktualizowacListe
          ? uczestnicy.map((uczestnik) => uczestnik.imieNazwisko).join('\n')
          : aktualne.uczestnicyTekst,
      }
    })
  }

  function usunUczestnika(id: string) {
    ustawDane((aktualne) => {
      const uczestnicy = aktualne.uczestnicy.filter((uczestnik) => uczestnik.id !== id)

      return {
        ...aktualne,
        uczestnicy,
        uczestnicyTekst: uczestnicy.map((uczestnik) => uczestnik.imieNazwisko).join('\n'),
      }
    })
  }

  function zastosujNumeracje() {
    ustawDane((aktualne) => ({
      ...aktualne,
      uczestnicy: aktualne.uczestnicy.map((uczestnik, indeks) => ({
        ...uczestnik,
        numerRejestru: zbudujNumerRejestru(aktualne, indeks),
      })),
    }))
    ustawKomunikat('Zastosowano numerację rejestru dla uczestników.')
  }

  function przelaczDate(iso: string) {
    ustawDane((aktualne) => ({
      ...aktualne,
      wybraneDaty: aktualne.wybraneDaty.includes(iso)
        ? aktualne.wybraneDaty.filter((data) => data !== iso)
        : [...aktualne.wybraneDaty, iso].sort(),
    }))
  }

  async function importujUczestnikowZPliku(zdarzenie: ChangeEvent<HTMLInputElement>) {
    const plik = zdarzenie.target.files?.[0]

    if (!plik) {
      return
    }

    try {
      const tekst = await plik.text()
      ustawDane((aktualne) => {
        const aktualnyTekst = aktualne.uczestnicyTekst.trim()
        const nowyTekst = [aktualnyTekst, tekst.trim()].filter(Boolean).join('\n')

        return {
          ...aktualne,
          uczestnicyTekst: nowyTekst,
          uczestnicy: polaczUczestnikow(parsujListeUczestnikow(nowyTekst), aktualne.uczestnicy, aktualne),
        }
      })
      ustawKomunikat(`Zaimportowano uczestników z pliku: ${plik.name}.`)
    } catch {
      ustawKomunikat('Nie udało się wczytać listy uczestników.')
    } finally {
      zdarzenie.target.value = ''
    }
  }

  async function importujTrescDrugiejStrony(zdarzenie: ChangeEvent<HTMLInputElement>) {
    const plik = zdarzenie.target.files?.[0]

    if (!plik) {
      return
    }

    try {
      const tekst = await plik.text()

      ustawDane((aktualne) => ({
        ...aktualne,
        drugaStronaAktywna: true,
        trescDrugiejStrony: tekst.trim() || aktualne.trescDrugiejStrony,
      }))
      ustawTrybPodgladuStron('obie')
      ustawKomunikat(`Wczytano treść drugiej strony: ${plik.name}.`)
    } catch {
      ustawKomunikat('Nie udało się wczytać treści drugiej strony.')
    } finally {
      zdarzenie.target.value = ''
    }
  }

  async function importujTloSzablonu(zdarzenie: ChangeEvent<HTMLInputElement>) {
    const plik = zdarzenie.target.files?.[0]

    if (!plik) {
      return
    }

    try {
      const daneUrl = await wczytajPlikJakoDataUrl(plik)
      zmienPole('tloSzablonu', daneUrl)
      ustawKomunikat(`Wczytano tło szablonu: ${plik.name}.`)
    } catch {
      ustawKomunikat('Nie udało się wczytać tła szablonu.')
    } finally {
      zdarzenie.target.value = ''
    }
  }

  async function importujDodatkiGraficzne(zdarzenie: ChangeEvent<HTMLInputElement>) {
    const pliki = Array.from(zdarzenie.target.files ?? [])

    if (!pliki.length) {
      return
    }

    try {
      const dodatki = await Promise.all(
        pliki.map(async (plik) => ({
          id: utworzId('dodatek'),
          typ: 'grafika' as const,
          nazwa: plik.name,
          daneUrl: await wczytajPlikJakoDataUrl(plik),
        })),
      )

      ustawDane((aktualne) => ({
        ...aktualne,
        dodatki: [...aktualne.dodatki, ...dodatki],
      }))
      ustawKomunikat(`Dodano grafik: ${dodatki.length}.`)
    } catch {
      ustawKomunikat('Nie udało się wczytać dodatku graficznego.')
    } finally {
      zdarzenie.target.value = ''
    }
  }

  function dodajTekstDodatku() {
    const tekst = tekstNowegoDodatku.trim()

    if (!tekst) {
      ustawKomunikat('Wpisz treść dodatku tekstowego.')
      return
    }

    const nazwa = nazwaNowegoDodatku.trim() || `Tekst ${dane.dodatki.length + 1}`

    ustawDane((aktualne) => ({
      ...aktualne,
      dodatki: [
        ...aktualne.dodatki,
        {
          id: utworzId('dodatek'),
          typ: 'tekst',
          nazwa,
          tekst,
        },
      ],
    }))
    ustawNazweNowegoDodatku('')
    ustawTekstNowegoDodatku('')
    ustawKomunikat(`Dodano dodatek tekstowy: ${nazwa}.`)
  }

  function usunDodatek(idDodatku: string) {
    ustawDane((aktualne) => ({
      ...aktualne,
      dodatki: aktualne.dodatki.filter((dodatek) => dodatek.id !== idDodatku),
      uczestnicy: aktualne.uczestnicy.map((uczestnik) => ({
        ...uczestnik,
        idDodatkuGornego: uczestnik.idDodatkuGornego === idDodatku ? '' : uczestnik.idDodatkuGornego,
        idDodatkuDolnego: uczestnik.idDodatkuDolnego === idDodatku ? '' : uczestnik.idDodatkuDolnego,
      })),
    }))
  }

  function przypiszDodatekWszystkim(polozenie: PolozenieDodatku, idDodatku: string) {
    ustawDane((aktualne) => ({
      ...aktualne,
      uczestnicy: aktualne.uczestnicy.map((uczestnik) => ({
        ...uczestnik,
        [polozenie === 'gora' ? 'idDodatkuGornego' : 'idDodatkuDolnego']: idDodatku,
      })),
    }))
  }

  function dodajWybranyDodatekWszystkim(polozenie: PolozenieDodatku) {
    const idDodatku = polozenie === 'gora' ? idWybranegoDodatkuGornego : idWybranegoDodatkuDolnego

    if (!idDodatku) {
      ustawKomunikat(polozenie === 'gora' ? 'Wybierz górny logotyp.' : 'Wybierz dolny logotyp.')
      return
    }

    przypiszDodatekWszystkim(polozenie, idDodatku)
    ustawKomunikat(polozenie === 'gora' ? 'Dodano górny logotyp wszystkim uczestnikom.' : 'Dodano dolny logotyp wszystkim uczestnikom.')
  }

  function zapiszRoboczo() {
    localStorage.setItem(kluczZapisuDyplomow, JSON.stringify(dane))
    ustawKomunikat('Szkic generatora dyplomów zapisany lokalnie.')
  }

  function wyczyscGenerator() {
    const pustyZapis = utworzDomyslnyZapis()
    ustawDane({
      ...pustyZapis,
      tytulSzkolenia: '',
      miejsceSzkolenia: '',
      trener: '',
      liczbaGodzin: '',
      wybraneDaty: [],
      uczestnicyTekst: '',
      uczestnicy: [],
      dodatki: [],
      tloSzablonu: '',
      drugaStronaAktywna: false,
      trescDrugiejStrony: '',
    })
    localStorage.removeItem(kluczZapisuDyplomow)
    ustawTrybPodgladuStron('pierwsza')
    ustawUkladPodgladuStron('pod_soba')
    ustawKomunikat('Wyczyszczono generator dyplomów.')
  }

  function resetujFormatowaniePodgladu() {
    const domyslnyZapis = utworzDomyslnyZapis()

    ustawDane((aktualne) => ({
      ...aktualne,
      rozmiarTytulu: domyslnyZapis.rozmiarTytulu,
      szerokoscDodatkuGornego: domyslnyZapis.szerokoscDodatkuGornego,
      szerokoscDodatkuDolnego: domyslnyZapis.szerokoscDodatkuDolnego,
      marginesDodatkuGornego: domyslnyZapis.marginesDodatkuGornego,
      marginesDodatkuDolnego: domyslnyZapis.marginesDodatkuDolnego,
      czyPokazacDodatekGorny: false,
      czyPokazacDodatekDolny: false,
      czyPokazacDrugaStrone: false,
    }))
    ustawTrybPodgladuStron('pierwsza')
    ustawKomunikat('Zresetowano formatowanie podglądu.')
  }

  function pokazPoprzedniegoUczestnikaPierwszejStrony() {
    ustawIndeksUczestnikaPierwszejStrony(Math.max(indeksPierwszejStrony - 1, 0))
  }

  function pokazKolejnegoUczestnikaPierwszejStrony() {
    ustawIndeksUczestnikaPierwszejStrony(
      Math.min(indeksPierwszejStrony + 1, Math.max(uczestnicyDoDruku.length - 1, 0)),
    )
  }

  function drukujDyplomy() {
    if (problemy.length) {
      ustawKomunikat(`Przed drukiem popraw: ${problemy.join(', ')}.`)
      return
    }

    ustawKomunikat('Otwieram drukowanie. W oknie systemowym możesz wybrać zapis jako PDF.')
    window.print()
  }

  return (
    <section className="widok dyplomy">
      <header className="dyplomy__naglowek">
        <div>
          <h1>Generator Dyplomów</h1>
          <p>Generator certyfikatów, zaświadczeń i dyplomów z podglądem A4.</p>
        </div>

        <div className="dyplomy__akcje">
          <button className="dyplomy__przycisk dyplomy__przycisk--glowny" onClick={drukujDyplomy} type="button">
            Drukuj / PDF
          </button>
          <button className="dyplomy__przycisk" onClick={zapiszRoboczo} type="button">
            Zapisz roboczo
          </button>
          <button className="dyplomy__przycisk" onClick={wyczyscGenerator} type="button">
            Wyczyść
          </button>
        </div>
      </header>

      <div className="dyplomy__komunikat" aria-live="polite">
        {komunikat}
      </div>

      <div className="dyplomy__uklad">
        <div className="dyplomy__panel-pracy">
          <section className="dyplomy__sekcja">
            <h2>Dokument</h2>
            <div className="dyplomy__siatka dyplomy__siatka--trzy">
              <div className="dyplomy__pole dyplomy__pole--pelne">
                <span>Typ widocznego tytułu</span>
                <div className="dyplomy__wybor">
                  {trybyTytulu.map((trybTytulu) => (
                    <button
                      className={`dyplomy__przycisk-wyboru${
                        dane.trybTytulu === trybTytulu ? ' dyplomy__przycisk-wyboru--aktywny' : ''
                      }`}
                      key={trybTytulu}
                      onClick={() => zmienPole('trybTytulu', trybTytulu)}
                      type="button"
                    >
                      {pobierzEtykieteTrybu(trybTytulu)}
                    </button>
                  ))}
                </div>
              </div>

              <label className="dyplomy__pole">
                <span>Motyw dyplomu</span>
                <select
                  onChange={(zdarzenie) => zmienMotywKoloru(zdarzenie.target.value as MotywKoloruDyplomu)}
                  value={dane.motywKoloru}
                >
                  <option value="semper">SEMPER czerwony</option>
                  <option value="iist">IIST niebieski</option>
                  <option value="dowolny">Dowolny</option>
                </select>
              </label>

              {dane.motywKoloru === 'dowolny' && (
                <>
                  <label className="dyplomy__pole">
                    <span>Kolor z palety</span>
                    <input
                      onChange={(zdarzenie) => zmienKolorMotywu(zdarzenie.target.value)}
                      type="color"
                      value={czyKolorHex(dane.kolorMotywu) ? dane.kolorMotywu : koloryFirmoweDyplomu.semper}
                    />
                  </label>

                  <label className="dyplomy__pole">
                    <span>Kolor HEX</span>
                    <input
                      onChange={(zdarzenie) => zmienKolorMotywu(zdarzenie.target.value)}
                      placeholder="#c5000b"
                      type="text"
                      value={dane.kolorMotywu}
                    />
                  </label>
                </>
              )}

              <label className="dyplomy__pole dyplomy__pole--pelne">
                <span>Tytuł szkolenia</span>
                <textarea
                  onChange={(zdarzenie) => zmienPole('tytulSzkolenia', zdarzenie.target.value)}
                  rows={3}
                  value={dane.tytulSzkolenia}
                />
              </label>

              <label className="dyplomy__pole">
                <span>Rozmiar tytułu: {dane.rozmiarTytulu}px</span>
                <input
                  max={34}
                  min={18}
                  onChange={(zdarzenie) => zmienPole('rozmiarTytulu', Number(zdarzenie.target.value))}
                  type="range"
                  value={dane.rozmiarTytulu}
                />
              </label>

              <label className="dyplomy__pole">
                <span>Tryb szkolenia</span>
                <select
                  onChange={(zdarzenie) => zmienTrybSzkolenia(zdarzenie.target.value as TrybSzkolenia)}
                  value={dane.trybSzkolenia}
                >
                  <option value="stacjonarne">Stacjonarne</option>
                  <option value="online">Online</option>
                </select>
              </label>

              <label className="dyplomy__pole">
                <span>Miejsce szkolenia</span>
                <input
                  disabled={dane.trybSzkolenia === 'online'}
                  list="dyplomy-miejscowosci-szkolenia"
                  onChange={(zdarzenie) => zmienPole('miejsceSzkolenia', zdarzenie.target.value)}
                  type="text"
                  value={pobierzMiejsceSzkolenia(dane)}
                />
                <datalist id="dyplomy-miejscowosci-szkolenia">
                  {podpowiedziMiejscaSzkolenia.map((miejscowosc) => (
                    <option key={miejscowosc} value={miejscowosc} />
                  ))}
                </datalist>
              </label>

              <label className="dyplomy__pole">
                <span>Ekspert / trener</span>
                <input
                  list="dyplomy-trenerzy-kartoteki"
                  onBlur={zatwierdzTreneraZKartoteki}
                  onChange={(zdarzenie) => zmienPole('trener', zdarzenie.target.value)}
                  type="text"
                  value={dane.trener}
                />
                <datalist id="dyplomy-trenerzy-kartoteki">
                  {podpowiedziTrenerow.map((trener) => (
                    <option key={trener.id} value={trener.imieNazwisko} />
                  ))}
                </datalist>
              </label>

              <label className="dyplomy__pole">
                <span>Liczba godzin</span>
                <input
                  min={0}
                  onChange={(zdarzenie) => zmienPole('liczbaGodzin', zdarzenie.target.value)}
                  type="number"
                  value={dane.liczbaGodzin}
                />
              </label>

              <label className="dyplomy__pole">
                <span>Rodzaj godzin</span>
                <select
                  aria-invalid={false}
                  onChange={(zdarzenie) => zmienPole('rodzajGodzin', zdarzenie.target.value as RodzajGodzin)}
                  value={dane.rodzajGodzin}
                >
                  {rodzajeGodzin.map((rodzaj) => (
                    <option key={rodzaj} value={rodzaj}>
                      {rodzaj}
                    </option>
                  ))}
                </select>
              </label>

              {dane.rodzajGodzin === 'niestandardowych' && (
                <label className="dyplomy__pole">
                  <span>Niestandardowy zapis godzin</span>
                  <input
                    onChange={(zdarzenie) => zmienPole('niestandardowyRodzajGodzin', zdarzenie.target.value)}
                    placeholder="np. praktycznych"
                    type="text"
                    value={dane.niestandardowyRodzajGodzin}
                  />
                </label>
              )}
            </div>
          </section>

          <section className="dyplomy__sekcja">
            <h2>Termin</h2>
            <div className="dyplomy__kalendarz-naglowek">
              <input
                onChange={(zdarzenie) =>
                  zmienPole('miesiacKalendarza', zdarzenie.target.value || pobierzDzisiejszaDateIso().slice(0, 7))
                }
                type="month"
                value={dane.miesiacKalendarza || pobierzDzisiejszaDateIso().slice(0, 7)}
              />
              <button className="dyplomy__przycisk" onClick={() => zmienPole('wybraneDaty', [])} type="button">
                Wyczyść daty
              </button>
            </div>
            <div className="dyplomy__kalendarz">
              {dniTygodnia.map((dzien) => (
                <div className="dyplomy__dzien-tygodnia" key={dzien}>
                  {dzien}
                </div>
              ))}
              {dniKalendarza.map((dzien) => (
                <button
                  className={`dyplomy__dzien${
                    dzien.wMiesiacu ? '' : ' dyplomy__dzien--spoza'
                  }${dane.wybraneDaty.includes(dzien.iso) ? ' dyplomy__dzien--aktywny' : ''}`}
                  key={dzien.iso}
                  onClick={() => przelaczDate(dzien.iso)}
                  type="button"
                >
                  {dzien.dzien}
                </button>
              ))}
            </div>
            <label className="dyplomy__pole dyplomy__format-dat">
              <span>Format dat na podglądzie</span>
              <select
                onChange={(zdarzenie) => zmienPole('trybZapisuDat', zdarzenie.target.value as TrybZapisuDat)}
                value={skutecznyTrybZapisuDat}
              >
                {opcjeZapisuDat.map((opcja) => (
                  <option key={opcja.wartosc} value={opcja.wartosc}>
                    {opcja.etykieta}
                  </option>
                ))}
              </select>
            </label>
            <div className="dyplomy__daty">{zbudujZdanieDat(dane.wybraneDaty, skutecznyTrybZapisuDat)}</div>
          </section>

          <section className="dyplomy__sekcja">
            <h2>Numer rejestru</h2>
            <div className="dyplomy__siatka dyplomy__siatka--dwie">
              <label className="dyplomy__pole">
                <span>Początkowy numer rejestru</span>
                <input
                  onChange={(zdarzenie) => zmienPole('poczatkowyNumerRejestru', zdarzenie.target.value)}
                  type="text"
                  value={dane.poczatkowyNumerRejestru}
                />
              </label>

              <label className="dyplomy__pole">
                <span>Zmienny blok numeru</span>
                <select
                  disabled={!blokiNumeru.length}
                  onChange={(zdarzenie) => zmienPole('indeksZmiennegoBloku', Number(zdarzenie.target.value))}
                  value={indeksZmiennegoBloku >= 0 ? indeksZmiennegoBloku : ''}
                >
                  {!blokiNumeru.length && <option value="">Brak bloków liczbowych</option>}
                  {blokiNumeru.map((blok, indeks) => (
                    <option key={`${blok.indeks}-${blok.wartosc}`} value={indeks}>
                      blok {indeks + 1}: {blok.wartosc}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="dyplomy__numer-podglad">
              {fragmentyNumeru.map((fragment, indeks) => (
                <span
                  className={fragment.zmienny ? 'dyplomy__numer-fragment dyplomy__numer-fragment--zmienny' : ''}
                  key={`${fragment.tekst}-${indeks}`}
                >
                  {fragment.tekst}
                </span>
              ))}
            </div>
            <button className="dyplomy__przycisk" onClick={zastosujNumeracje} type="button">
              Zastosuj numerację
            </button>
          </section>

          <section className="dyplomy__sekcja">
            <h2>Uczestnicy</h2>
            <div className="dyplomy__siatka dyplomy__siatka--dwie">
              <label className="dyplomy__pole dyplomy__pole--pelne">
                <span>Lista uczestników</span>
                <textarea
                  onChange={(zdarzenie) => zmienTekstUczestnikow(zdarzenie.target.value)}
                  rows={6}
                  value={dane.uczestnicyTekst}
                />
              </label>

              <label className="dyplomy__pole">
                <span>Import TXT / CSV</span>
                <input accept=".txt,.csv,text/plain,text/csv" onChange={importujUczestnikowZPliku} type="file" />
              </label>
            </div>

            <div className="dyplomy__tabela-ramka">
              <table className="dyplomy__tabela">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Imię i nazwisko</th>
                    <th>Nr rejestru</th>
                    <th>Górny Logotyp</th>
                    <th>Dolny logotyp</th>
                    <th>2 strona</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {dane.uczestnicy.length ? (
                    dane.uczestnicy.map((uczestnik, indeks) => (
                      <tr key={uczestnik.id}>
                        <td>{indeks + 1}</td>
                        <td>
                          <input
                            onChange={(zdarzenie) =>
                              zmienUczestnika(uczestnik.id, { imieNazwisko: zdarzenie.target.value }, true)
                            }
                            type="text"
                            value={uczestnik.imieNazwisko}
                          />
                        </td>
                        <td>
                          <input
                            onChange={(zdarzenie) =>
                              zmienUczestnika(uczestnik.id, { numerRejestru: zdarzenie.target.value })
                            }
                            type="text"
                            value={uczestnik.numerRejestru}
                          />
                        </td>
                        <td>
                          <select
                            onChange={(zdarzenie) =>
                              zmienUczestnika(uczestnik.id, { idDodatkuGornego: zdarzenie.target.value })
                            }
                            value={uczestnik.idDodatkuGornego}
                          >
                            <option value="">Brak</option>
                            {dane.dodatki.map((dodatek) => (
                              <option key={dodatek.id} value={dodatek.id}>
                                {dodatek.nazwa}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            onChange={(zdarzenie) =>
                              zmienUczestnika(uczestnik.id, { idDodatkuDolnego: zdarzenie.target.value })
                            }
                            value={uczestnik.idDodatkuDolnego}
                          >
                            <option value="">Brak</option>
                            {dane.dodatki.map((dodatek) => (
                              <option key={dodatek.id} value={dodatek.id}>
                                {dodatek.nazwa}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            checked={dane.drugaStronaAktywna && uczestnik.drugaStrona}
                            disabled={!dane.drugaStronaAktywna}
                            onChange={(zdarzenie) =>
                              zmienUczestnika(uczestnik.id, { drugaStrona: zdarzenie.target.checked })
                            }
                            type="checkbox"
                          />
                        </td>
                        <td>
                          <button className="dyplomy__przycisk dyplomy__przycisk--maly" onClick={() => usunUczestnika(uczestnik.id)} type="button">
                            Usuń
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>Dodaj uczestników do wygenerowania dokumentów.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="dyplomy__sekcje-dwie-kolumny">
            <section className="dyplomy__sekcja">
              <h2>Dodatki i szablon</h2>
              <div className="dyplomy__siatka dyplomy__siatka--dwie">
                <label className="dyplomy__pole">
                  <span>Grafika tła</span>
                  <input accept="image/*" onChange={importujTloSzablonu} type="file" />
                </label>

                <div className="dyplomy__pole dyplomy__pole--przycisk">
                  <button className="dyplomy__przycisk" onClick={() => zmienPole('tloSzablonu', '')} type="button">
                    Usuń tło
                  </button>
                </div>
              </div>

              <div className="dyplomy__dodaj-tekst">
                <div className="dyplomy__dodaj-tekst-pola">
                  <label className="dyplomy__pole">
                    <span>Tekst dodatku</span>
                    <textarea
                      onChange={(zdarzenie) => ustawTekstNowegoDodatku(zdarzenie.target.value)}
                      rows={3}
                      value={tekstNowegoDodatku}
                    />
                  </label>

                  <label className="dyplomy__pole">
                    <span>Nazwa tekstu</span>
                    <input
                      onChange={(zdarzenie) => ustawNazweNowegoDodatku(zdarzenie.target.value)}
                      type="text"
                      value={nazwaNowegoDodatku}
                    />
                  </label>
                </div>

                <button className="dyplomy__przycisk" onClick={dodajTekstDodatku} type="button">
                  Zapisz tekst
                </button>
              </div>

              <div className="dyplomy__biblioteka">
                {dane.dodatki.map((dodatek) => (
                  <article className="dyplomy__dodatek" key={dodatek.id}>
                    {dodatek.typ === 'grafika' && dodatek.daneUrl ? (
                      <img alt={dodatek.nazwa} src={dodatek.daneUrl} />
                    ) : (
                      <div>{dodatek.tekst}</div>
                    )}
                    <strong>{dodatek.nazwa}</strong>
                    <button className="dyplomy__przycisk dyplomy__przycisk--maly" onClick={() => usunDodatek(dodatek.id)} type="button">
                      Usuń
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="dyplomy__sekcja">
              <h2>Druga strona</h2>
              <div className="dyplomy__przelacznik-wiersz">
                <span>Druga strona tekstowa</span>
                <div className="dyplomy__wybor" role="group" aria-label="Druga strona tekstowa">
                  <button
                    className={`dyplomy__przycisk-wyboru${dane.drugaStronaAktywna ? ' dyplomy__przycisk-wyboru--aktywny' : ''}`}
                    onClick={() => przelaczDrugaStrone(true)}
                    type="button"
                  >
                    TAK
                  </button>
                  <button
                    className={`dyplomy__przycisk-wyboru${!dane.drugaStronaAktywna ? ' dyplomy__przycisk-wyboru--aktywny' : ''}`}
                    onClick={() => przelaczDrugaStrone(false)}
                    type="button"
                  >
                    NIE
                  </button>
                </div>
              </div>
              <div className={`dyplomy__pola-drugiej-strony${dane.drugaStronaAktywna ? '' : ' dyplomy__pola-drugiej-strony--nieaktywne'}`}>
                <label className="dyplomy__pole">
                  <span>Import treści TXT / MD</span>
                  <input
                    accept=".txt,.md,text/plain,text/markdown"
                    disabled={!dane.drugaStronaAktywna}
                    onChange={importujTrescDrugiejStrony}
                    type="file"
                  />
                </label>
                <label className="dyplomy__pole">
                  <span>Treść wspólna</span>
                  <textarea
                    disabled={!dane.drugaStronaAktywna}
                    onChange={(zdarzenie) => zmienTrescDrugiejStrony(zdarzenie.target.value)}
                    rows={5}
                    value={dane.trescDrugiejStrony}
                  />
                </label>
              </div>
            </section>
          </div>
        </div>

        <aside className="dyplomy__podglad">
          <section className="dyplomy__status">
            <div className="dyplomy__status-naglowek">
              <h2>Status</h2>
              <button className="dyplomy__przycisk dyplomy__przycisk--maly" onClick={resetujFormatowaniePodgladu} type="button">
                Resetuj formatowanie
              </button>
            </div>
            {problemy.length ? (
              <ul>
                {problemy.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            ) : (
              <p>Gotowe do druku lub zapisu jako PDF.</p>
            )}
          </section>

          <section className="dyplomy__narzedzia-podgladu" aria-label="Dodatki i widoczność podglądu">
            <div className="dyplomy__widocznosc-podgladu">
              <label className="dyplomy__pole dyplomy__pole--checkbox">
                <input
                  checked={dane.czyPokazacDodatekGorny}
                  onChange={(zdarzenie) => zmienPole('czyPokazacDodatekGorny', zdarzenie.target.checked)}
                  type="checkbox"
                />
                <span>Pokaż górne dodatki</span>
              </label>
              <label className="dyplomy__pole dyplomy__pole--checkbox">
                <input
                  checked={dane.czyPokazacDodatekDolny}
                  onChange={(zdarzenie) => zmienPole('czyPokazacDodatekDolny', zdarzenie.target.checked)}
                  type="checkbox"
                />
                <span>Pokaż dolne dodatki</span>
              </label>
              <label className="dyplomy__pole dyplomy__pole--checkbox">
                <input
                  checked={dane.czyPokazacDrugaStrone}
                  onChange={(zdarzenie) => zmienPole('czyPokazacDrugaStrone', zdarzenie.target.checked)}
                  type="checkbox"
                />
                <span>Pokaż drugą stronę</span>
              </label>
            </div>

            <label className="dyplomy__pole">
              <span>Dodaj grafiki</span>
              <input accept="image/*" multiple onChange={importujDodatkiGraficzne} type="file" />
            </label>

            <div className="dyplomy__logotypy">
              <div className="dyplomy__logotyp-panel">
                <strong className="dyplomy__logotyp-naglowek">↑ Górny Logotyp ↑</strong>
                <label className="dyplomy__pole">
                  <span>Wybierz górny logotyp</span>
                  <select onChange={(zdarzenie) => ustawIdWybranegoDodatkuGornego(zdarzenie.target.value)} value={idWybranegoDodatkuGornego}>
                    <option value="">Wybierz dodatek dla góry</option>
                    {dane.dodatki.map((dodatek) => (
                      <option key={dodatek.id} value={dodatek.id}>
                        {dodatek.nazwa}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="dyplomy__pole">
                  <span>Szerokość: {dane.szerokoscDodatkuGornego}%</span>
                  <input
                    max={100}
                    min={10}
                    onChange={(zdarzenie) => zmienPole('szerokoscDodatkuGornego', Number(zdarzenie.target.value))}
                    type="range"
                    value={dane.szerokoscDodatkuGornego}
                  />
                </label>
                <label className="dyplomy__pole">
                  <span>Margines górny: {dane.marginesDodatkuGornego}%</span>
                  <input
                    max={24}
                    min={0}
                    onChange={(zdarzenie) => zmienPole('marginesDodatkuGornego', Number(zdarzenie.target.value))}
                    step={0.1}
                    type="range"
                    value={dane.marginesDodatkuGornego}
                  />
                </label>
                <button className="dyplomy__przycisk" onClick={() => dodajWybranyDodatekWszystkim('gora')} type="button">
                  + Dodaj wszystkim
                </button>
              </div>

              <div className="dyplomy__logotyp-panel">
                <strong className="dyplomy__logotyp-naglowek">↓ Dolny Logotyp ↓</strong>
                <label className="dyplomy__pole">
                  <span>Wybierz dolny logotyp</span>
                  <select onChange={(zdarzenie) => ustawIdWybranegoDodatkuDolnego(zdarzenie.target.value)} value={idWybranegoDodatkuDolnego}>
                    <option value="">Wybierz dodatek dla dołu</option>
                    {dane.dodatki.map((dodatek) => (
                      <option key={dodatek.id} value={dodatek.id}>
                        {dodatek.nazwa}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="dyplomy__pole">
                  <span>Szerokość: {dane.szerokoscDodatkuDolnego}%</span>
                  <input
                    max={100}
                    min={10}
                    onChange={(zdarzenie) => zmienPole('szerokoscDodatkuDolnego', Number(zdarzenie.target.value))}
                    type="range"
                    value={dane.szerokoscDodatkuDolnego}
                  />
                </label>
                <label className="dyplomy__pole">
                  <span>Margines dolny: {dane.marginesDodatkuDolnego}%</span>
                  <input
                    max={24}
                    min={0}
                    onChange={(zdarzenie) => zmienPole('marginesDodatkuDolnego', Number(zdarzenie.target.value))}
                    step={0.1}
                    type="range"
                    value={dane.marginesDodatkuDolnego}
                  />
                </label>
                <button className="dyplomy__przycisk" onClick={() => dodajWybranyDodatekWszystkim('dol')} type="button">
                  + Dodaj wszystkim
                </button>
              </div>
            </div>
          </section>

          {czyKontrolaPodgladuDostepna && (
            <section className="dyplomy__kontrola-podgladu">
              {uczestnicyDoDruku.length > 1 && (
                <div className="dyplomy__nawigacja-uczestnika">
                  <button
                    aria-label="Poprzedni uczestnik na pierwszej stronie"
                    className="dyplomy__przycisk-wyboru dyplomy__przycisk-strzalka"
                    disabled={indeksPierwszejStrony === 0}
                    onClick={pokazPoprzedniegoUczestnikaPierwszejStrony}
                    title="Poprzedni uczestnik na pierwszej stronie"
                    type="button"
                  >
                    ←
                  </button>
                  <span className="dyplomy__licznik-uczestnika">
                    1 strona: {indeksPierwszejStrony + 1}/{uczestnicyDoDruku.length}
                  </span>
                  <button
                    aria-label="Kolejny uczestnik na pierwszej stronie"
                    className="dyplomy__przycisk-wyboru dyplomy__przycisk-strzalka"
                    disabled={indeksPierwszejStrony >= uczestnicyDoDruku.length - 1}
                    onClick={pokazKolejnegoUczestnikaPierwszejStrony}
                    title="Kolejny uczestnik na pierwszej stronie"
                    type="button"
                  >
                    →
                  </button>
                </div>
              )}
              {czyDrugaStronaDostepna && (
                <div className="dyplomy__wybor">
                  <button
                    className={`dyplomy__przycisk-wyboru${trybPodgladuStron === 'pierwsza' ? ' dyplomy__przycisk-wyboru--aktywny' : ''}`}
                    onClick={() => ustawTrybPodgladuStron('pierwsza')}
                    type="button"
                  >
                    1 strona
                  </button>
                  <button
                    className={`dyplomy__przycisk-wyboru${trybPodgladuStron === 'druga' ? ' dyplomy__przycisk-wyboru--aktywny' : ''}`}
                    onClick={() => ustawTrybPodgladuStron('druga')}
                    type="button"
                  >
                    2 strona
                  </button>
                  <button
                    className={`dyplomy__przycisk-wyboru${trybPodgladuStron === 'obie' ? ' dyplomy__przycisk-wyboru--aktywny' : ''}`}
                    onClick={() => ustawTrybPodgladuStron('obie')}
                    type="button"
                  >
                    Obie
                  </button>
                </div>
              )}
              {czyDrugaStronaDostepna && trybPodgladuStron === 'obie' && (
                <div className="dyplomy__wybor">
                  <button
                    className={`dyplomy__przycisk-wyboru${ukladPodgladuStron === 'pod_soba' ? ' dyplomy__przycisk-wyboru--aktywny' : ''}`}
                    onClick={() => ustawUkladPodgladuStron('pod_soba')}
                    type="button"
                  >
                    Pod sobą
                  </button>
                  <button
                    className={`dyplomy__przycisk-wyboru${ukladPodgladuStron === 'obok' ? ' dyplomy__przycisk-wyboru--aktywny' : ''}`}
                    onClick={() => ustawUkladPodgladuStron('obok')}
                    type="button"
                  >
                    Obok siebie
                  </button>
                </div>
              )}
            </section>
          )}

          <section
            className={`dyplomy__podglad-kartki${
              trybPodgladuStron === 'obie' && ukladPodgladuStron === 'obok'
                ? ' dyplomy__podglad-kartki--obok'
                : ' dyplomy__podglad-kartki--pod-soba'
            }`}
          >
            {czyPokazacPierwszaStrone && <StronaDyplomu dane={dane} uczestnik={uczestnikPierwszejStrony} />}
            {czyPokazacDrugaStrone && <StronaDrugaDyplomu dane={dane} uczestnik={uczestnikDrugiejStrony} />}
          </section>
        </aside>
      </div>

      <div className="dyplomy__druk" aria-hidden="true">
        {uczestnicyDoDruku.map((uczestnik) => (
          <div key={uczestnik.id}>
            <StronaDyplomu dane={dane} uczestnik={uczestnik} />
            {dane.drugaStronaAktywna && dane.czyPokazacDrugaStrone && uczestnik.drugaStrona && (
              <StronaDrugaDyplomu dane={dane} uczestnik={uczestnik} />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
