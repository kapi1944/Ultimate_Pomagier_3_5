import { czyPaczkaNaSiedzibe } from '../logikaWysylkiPaczki'
import { parsujNumeryTelefonu } from '../../../../wspolne/parsery/parserNumerowTelefonu'
import { normalizujTekst, normalizujTrescMaila, czyWierszJestEtykieta, znajdzSekcjeMaila, etykietyPolMaila, parsujLiczbeUczestnikow, parsujGodzinySzkolenia, parsujKwoteMaila } from './analizaTresciMaila'
import type {
  DaneFirmy,
  DaneFormularza,
  DyspozycjaMaterialowa,
  DyspozycjeMaterialowe,
  FormaSzkolenia,
  GrupaSzkoleniowa,
  OswiadczenieVat,
  RodzajDyspozycjiMaterialowej,
  TrenerKartoteki,
  WynikParseraMailaSzczegolow,
} from '../typy'
import { poczatkoweDaneFormularza } from '../danePoczatkowe'
import type { KlientKartoteki } from '../../../../kartoteki/klienciKartoteki'
import type { Uzytkownik } from '../../../../kartoteki/uzytkownicy/typyUzytkownikow'

type KartotekiImportu = {
  trenerzy?: readonly TrenerKartoteki[]
  opiekunowie?: readonly Uzytkownik[]
  klienci?: readonly KlientKartoteki[]
  czyLokalizacjaPotwierdzona?: (miejsce: string) => boolean
}

const etykietyMiejsca = ['Miejsce', 'Lokalizacja', 'Adres szkolenia', 'Miejsce szkolenia', 'Miejsce szkolenia zapewnione przez Zamawiającego', 'Sala szkoleniowa zapewniona przez Zamawiającego']
const etykietyKlienta = etykietyPolMaila.klient

function zabezpieczWyrazenie(tekst: string) {
  return tekst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function znajdzWartoscWNastepnejLinii(wiersze: string[], indeks: number) {
  for (let nastepny = indeks + 1; nastepny < wiersze.length; nastepny += 1) {
    const wartosc = wiersze[nastepny].trim()
    if (!wartosc) continue
    const etykiety = [...Object.values(etykietyDyspozycji).flat(), 'Trener Prowadzący', 'Liczba godzin', 'Liczba uczestników', 'Nazwa firmy']
    const dalszyTekst = wiersze.slice(nastepny, nastepny + 5).filter((wiersz) => wiersz.trim()).join(' ')
    const czyFragmentEtykiety = etykiety.some((etykieta) => normalizujTekst(dalszyTekst).startsWith(`${normalizujTekst(etykieta)}:`))
    return czyWierszJestEtykieta(wartosc) || czyFragmentEtykiety ? '' : wartosc
  }
  return ''
}

function rozdzielNaglowkiWiadomosci(tresc: string) {
  const wiersze = normalizujTrescMaila(tresc).split('\n')
  const naglowki: Record<string, string> = {}
  const trescWlasciwa: string[] = []
  let czyWBlokuNaglowkow = false

  for (let indeks = 0; indeks < wiersze.length; indeks += 1) {
    const naglowek = wiersze[indeks].match(/^\s*(Od|Do|DW|Data|Temat|Nadawca|Adresat|Załączniki|Zalaczniki|From|To|Cc|Date|Sent|Subject|Attachments)\s*:\s*(.*)$/i)
    const wartoscNaglowka = naglowek ? naglowek[2].trim() || znajdzWartoscWNastepnejLinii(wiersze, indeks) : ''
    const czyNaglowekAdresowy = ['od', 'from', 'nadawca', 'do', 'to', 'adresat'].some((nazwa) => Boolean(naglowki[nazwa]))
    const zakresDat = znajdzDaty(wartoscNaglowka)
    const nastepnyWiersz = wiersze.slice(indeks + 1).find((wiersz) => wiersz.trim()) ?? ''
    const czyNastepnyNaglowek = /^(?:Temat|Subject|Do|To|DW|Cc|Adresat|Załączniki|Attachments)\s*:/i.test(nastepnyWiersz)
    const czyDataSzkolenia = naglowek && normalizujTekst(naglowek[1]) === 'data' && (!czyWBlokuNaglowkow || zakresDat.dataOd !== zakresDat.dataDo || !/\d{1,2}:\d{2}/.test(wartoscNaglowka) && (!czyNaglowekAdresowy || !czyNastepnyNaglowek))
    if (!naglowek || czyDataSzkolenia) {
      trescWlasciwa.push(wiersze[indeks])
      if (wiersze[indeks].trim()) czyWBlokuNaglowkow = false
      continue
    }
    czyWBlokuNaglowkow = true
    const nazwa = normalizujTekst(naglowek[1])
    const wartosc = wartoscNaglowka
    naglowki[nazwa] ??= wartosc
    if (!naglowek[2].trim() && wartosc) {
      while (!wiersze[indeks + 1].trim()) indeks += 1
      indeks += 1
    }
  }

  const indeksStopki = trescWlasciwa.findIndex((wiersz, indeks) => /^--$|^(?:z pozdrowieniami|pozdrawiam|pozdrawiam serdecznie)[,.! ]*$/i.test(wiersz)
    || indeks > trescWlasciwa.length - 25 && /^(?:specjalista ds\.|dzial szkolen)/.test(normalizujTekst(wiersz)))
  const poczatekStopki = indeksStopki < 0 ? trescWlasciwa.length : Math.max(0, indeksStopki - (/^(?:specjalista|dzial)/.test(normalizujTekst(trescWlasciwa[indeksStopki])) ? 2 : 0))
  return { naglowki, tresc: trescWlasciwa.slice(0, poczatekStopki).join('\n'), stopka: trescWlasciwa.slice(poczatekStopki).join('\n') }
}

function znajdzPoEtykiecie(tresc: string, etykiety: string[]) {
  return znajdzWartosciPoEtykiecie(tresc, etykiety)[0] ?? ''
}

function znajdzWartosciPoEtykiecie(tresc: string, etykiety: string[]) {
  return znajdzSekcjeMaila(tresc, etykiety).map((sekcja) => sekcja.wartosc.split('\n')[0]).filter(Boolean)
}

function znajdzBlokPoEtykiecie(tresc: string, etykiety: string[]) {
  return znajdzSekcjeMaila(tresc, etykiety)[0]?.wartosc ?? ''
}

function podzielKonteksty(tresc: string) {
  const dane: string[] = []
  const materialy: string[] = []
  const wysylki: string[][] = []
  const priorytetyWysylek: number[] = []
  let czyKontaktPaczki = false
  let sekcja: 'dane' | 'wysylka' | 'pomijana' = 'dane'
  let pierwszaGrupa = ''
  let czyPierwszaGrupa = true
  let czyWAdresieSzkolenia = false
  const blokiGrup = new Map<string, string[]>()
  let aktywnaGrupa = ''

  const wiersze = tresc.split('\n')
  for (let indeks = 0; indeks < wiersze.length; indeks += 1) {
    let wiersz = wiersze[indeks]
    if (/^(?:grupa(?: szkoleniowa)?|nazwa grupy)\s*:?$/i.test(normalizujTekst(wiersz))) {
      const wartosc = znajdzWartoscWNastepnejLinii(wiersze, indeks)
      if (wartosc) {
        wiersz = `Grupa: ${wartosc}`
        while (!wiersze[indeks + 1].trim()) indeks += 1
        indeks += 1
      }
    }
    const tekst = normalizujTekst(wiersz).replace(/^[^a-z\d]+/, '').trim()
    if (/^program szkolenia\b/.test(tekst)) break
    const czyEtykietaMiejsca = etykietyMiejsca.some((etykieta) => new RegExp(`^${zabezpieczWyrazenie(normalizujTekst(etykieta))}\\s*[:–—-]`).test(tekst))
    if (czyEtykietaMiejsca) { sekcja = 'dane'; czyWAdresieSzkolenia = true }
    else if (czyWierszJestEtykieta(wiersz) || /^(?:zakwaterowanie|nocleg|adres hotelu)\b/.test(tekst)) czyWAdresieSzkolenia = false
    const grupa = tekst.match(/^(?:grupa(?: szkoleniowa)?|nazwa grupy)\s*(?::|[-–])?\s*([^:]+?)\s*:?$/)
    if (grupa) {
      pierwszaGrupa ||= grupa[1]
      czyPierwszaGrupa = grupa[1] === pierwszaGrupa
      sekcja = 'dane'
      aktywnaGrupa = grupa[1]
      if (!blokiGrup.has(aktywnaGrupa)) blokiGrup.set(aktywnaGrupa, [wiersz])
      if (czyPierwszaGrupa) dane.push(`Grupa: ${wiersz.replace(/^(?:grupa(?: szkoleniowa)?|nazwa grupy)\s*[:–-]?\s*/i, '').replace(/:$/, '')}`)
      continue
    }
    if (aktywnaGrupa) blokiGrup.get(aktywnaGrupa)?.push(wiersz)
    if (/^(?:dla [\p{L} ]+:\s*)?(?:materialy (?:na adres|do wysylki|wyslac na adres)|materialy szkoleniowe wyslac do|przesylka na adres|paczka na adres|adres odbiorcy|adres (?:do )?(?:wysylki|dostawy)|dane (?:do wysylki|odbiorcy paczki)|wysylka (?:materialow|paczki)|odbiorca (?:materialow|paczki))\b/u.test(tekst)) {
      czyKontaktPaczki = false
      if (czyPierwszaGrupa) priorytetyWysylek.push(/^adres odbiorcy/.test(tekst) ? 2 : 1)
      sekcja = 'wysylka'
      if (czyPierwszaGrupa) wysylki.push([wiersz.includes(':') ? wiersz.slice(wiersz.lastIndexOf(':') + 1).trim() : ''])
      continue
    }
    if (!czyWAdresieSzkolenia && /^(?:(?:wazna )?informacja dla trenera|dla trenera|instrukcje dla trenera|uwagi dla trenera|hotel\b|nocleg\b|zakwaterowanie\b|adres hotelu\b|harmonogram szkolenia|program szkolenia)/.test(tekst)) {
      sekcja = 'pomijana'
      continue
    }
    if (sekcja === 'wysylka' && /kontakt do odbioru paczki|informacj[ae] na etykiet/.test(tekst)) czyKontaktPaczki = true
    if (sekcja === 'wysylka' && czyKontaktPaczki && /^materialy szkoleniowe\s*:?$/.test(tekst)) { wysylki.at(-1)?.push(wiersz); continue }
    if (/^(?:trener(?: prowadzacy)?|prowadzac[ya](?: szkolenie)?|liczba (?:uczestnikow|osob|godzin)|ilosc uczestnikow|uczestnicy|cena(?: netto| brutto)?|termin platnosci|lista uczestnikow|materialy szkoleniowe|certyfikaty|lista obecnosci|materialy dodatkowe|ankiety)\s*:/.test(tekst)) sekcja = 'dane'
    if (/^(?:dane osoby kontaktowej|kontakt po stronie klienta)\s*:/.test(tekst)) sekcja = 'dane'
    if (/^(?:dane szkolenia|szczegoly szkolenia|podstawowe informacje|dokumentacja|dyspozycje materialowe|dane nabywcy|dane do faktury)\s*:?$/.test(tekst)) sekcja = 'dane'
    if (/^(?:(?:adres|miejsce|forma|tryb|data) szkolenia\s*:|sala szkoleniowa\b)/.test(tekst)) sekcja = 'dane'
    if (!czyPierwszaGrupa || /^dla [\p{L} ]+:\s*$/u.test(tekst)) continue
    if (sekcja === 'wysylka') wysylki.at(-1)?.push(wiersz)
    if (sekcja === 'dane') {
      dane.push(wiersz)
      materialy.push(wiersz)
    }
  }
  return { dane: dane.join('\n'), materialy: materialy.join('\n'), wysylki: wysylki.filter((_, indeks) => priorytetyWysylek[indeks] === Math.min(...priorytetyWysylek)).map((wiersze) => wiersze.join('\n')), blokiGrup: [...blokiGrup.values()].map((blok) => blok.join('\n')) }
}

const etykietyDyspozycji: Record<RodzajDyspozycjiMaterialowej, string[]> = {
  materialySzkoleniowe: ['Materiały szkoleniowe', 'Materiały szkol.', 'Mat. szkoleniowe', 'Mat. szkol.', 'Materiały', 'Skrypty', 'Podręczniki'],
  certyfikaty: ['Certyfikaty', 'Certyfikat', 'Cert.', 'Dyplomy', 'Zaświadczenia'],
  listaObecnosci: ['Lista obecności', 'Listy obecności', 'Lista obecn.', 'L. obecności', 'L.O.'],
  materialyDodatkowe: ['Materiały dodatkowe', 'Mat. dodatkowe', 'Mat. dod.', 'Materiały dod.'],
  ankiety: ['Ankiety', 'Ankieta', 'Ankiety ewaluacyjne', 'Ank.'],
}

function parsujDyspozycje(wartosc: string, nazwaKlienta = ''): DyspozycjaMaterialowa {
  const tekst = normalizujTekst(wartosc)
  const dyspozycja: DyspozycjaMaterialowa = { tekstZrodlowy: wartosc, status: 'zaimportowane' }
  const czyOnline = /\bon[ -]?line\b|elektroniczn|cyfrow|\bpdf\b|e-?mail/.test(tekst)
  const papier = /druk|papier/.test(tekst)
  const skrotKlienta = normalizujTekst((nazwaKlienta.match(/\p{Lu}/gu) ?? []).join('')).replace(/i/g, '')
  const drukujacy = tekst.match(/drukuje\s+(\p{L}+)/u)?.[1]?.replace(/i/g, '') ?? ''
  const klientZKontekstu = drukujacy.length >= 4 && skrotKlienta.startsWith(drukujacy)
  const klient = klientZKontekstu || /\bklient(?:a|owi|em)?\b|zamawiajac/.test(tekst)
  const organizator = /organizator|semper|iist|\bmy\b/.test(tekst)
  const poSzkoleniu = /po (?:szkoleniu|zakonczeniu(?: szkolenia)?|kursie)/.test(tekst)
  const przedSzkoleniem = /przed (?:szkoleniem|rozpoczeciem(?: szkolenia)?|kursem)/.test(tekst)
  if (czyOnline !== papier) dyspozycja.formaPrzekazania = czyOnline ? 'online' : 'papierowa'
  if (papier && klient !== organizator) dyspozycja.sposobPrzygotowania = klient ? 'drukuje_klient' : 'drukuje_organizator'
  if (poSzkoleniu !== przedSzkoleniem) dyspozycja.terminPrzekazania = poSzkoleniu ? 'po_szkoleniu' : 'przed_szkoleniem'
  if (czyOnline && papier || klient && organizator || poSzkoleniu && przedSzkoleniem
    || /\?|\blub\b|\balbo\b|\bmoze\b|do (?:ustalenia|potwierdzenia)|\bnie\b|\bbez\b/.test(tekst)
    || !dyspozycja.formaPrzekazania && !dyspozycja.terminPrzekazania) dyspozycja.status = 'niepewne'
  return dyspozycja
}

function rozpoznajDyspozycje(tresc: string, nazwaKlienta = '') {
  const dyspozycje: DyspozycjeMaterialowe = {}
  for (const rodzaj of Object.keys(etykietyDyspozycji) as RodzajDyspozycjiMaterialowej[]) {
    const wartosci = znajdzWartosciPoEtykiecie(tresc, etykietyDyspozycji[rodzaj])
    if (!wartosci.length) continue
    const dyspozycja = parsujDyspozycje(wartosci[0], nazwaKlienta)
    if (new Set(wartosci.map(normalizujTekst)).size > 1) {
      dyspozycje[rodzaj] = { tekstZrodlowy: wartosci.join('\n'), status: 'niepewne' }
    } else dyspozycje[rodzaj] = dyspozycja
  }
  return dyspozycje
}

function rozpoznajOdbiorcePaczki(tresc: string) {
  tresc = tresc.replace(/\b(\d{2})(?:\s*[-–—]\s*|\s+)(\d{3})(?=\s+\p{L}|$)/gu, '$1-$2')
  const wiersze = tresc.split('\n').map((wiersz) => wiersz.trim()).filter(Boolean)
  const dane: Partial<DaneFormularza['odbiorcaPaczki']> = {}
  const fragmentyNazwy: string[] = []
  for (const [indeks, wiersz] of wiersze.entries()) {
    if (/^(?:ul\.|ulica\b|al\.|aleja\b|pl\.|\d|tel\.|kontakt|informacja|\+)/i.test(wiersz) || indeks > 0 && czyWierszJestEtykieta(wiersz) || /\s\d+[a-z]?(?:\/\d+[a-z]?)?$/i.test(wiersz)) break
    fragmentyNazwy.push(wiersz.replace(/^(?:Nazwa firmy|Nazwa odbiorcy|Odbiorca|Firma)\s*:\s*/i, ''))
  }
  const nazwa = fragmentyNazwy.filter(Boolean).join(' ') || znajdzPoEtykiecie(tresc, ['Nazwa firmy', 'Nazwa odbiorcy', 'Odbiorca', 'Firma'])
  if (nazwa) dane.nazwaFirmy = nazwa
  const adres = znajdzPoEtykiecie(tresc, ['Adres', 'Adres odbiorcy'])
  const indeksKodu = wiersze.findIndex((wiersz) => /^\d{2}-\d{3}\s/.test(wiersz))
  const wierszPrzedKodem = indeksKodu > 0 && /\s\d+[a-z]?(?:\/\d+[a-z]?)?$/i.test(wiersze[indeksKodu - 1]) ? wiersze[indeksKodu - 1] : ''
  const ulica = znajdzPoEtykiecie(tresc, ['Ulica']) || adres || wiersze.find((wiersz) => /^(?:ul\.|ulica\b|al\.|aleja\b|pl\.)/i.test(wiersz)) || wierszPrzedKodem
  const dopasowanieUlicy = ulica.match(/^(?:ul\.?\s*|ulica\s+)?(.+?)\s+(\d+[a-z]?)\s*(?:\/\s*(\d+[a-z]?))?(?:,|$)/i)
  if (dopasowanieUlicy) {
    dane.ulica = dopasowanieUlicy[1]
    dane.nrBudynku = dopasowanieUlicy[2]
    if (dopasowanieUlicy[3]) dane.nrLokalu = dopasowanieUlicy[3]
  } else if (ulica) dane.ulica = ulica
  const nrBudynku = znajdzPoEtykiecie(tresc, ['Nr budynku', 'Numer budynku'])
  const nrLokalu = znajdzPoEtykiecie(tresc, ['Nr lokalu', 'Numer lokalu'])
  if (nrBudynku) dane.nrBudynku = nrBudynku
  if (nrLokalu) dane.nrLokalu = nrLokalu
  const kodIMiasto = `${adres}\n${tresc}`.match(/\b(\d{2}-\d{3})\s+([^\n]+)/)
  const kod = znajdzPoEtykiecie(tresc, ['Kod pocztowy', 'Kod']) || kodIMiasto?.[1]
  const miasto = znajdzPoEtykiecie(tresc, ['Miasto', 'Miejscowość']) || kodIMiasto?.[2]
  if (kod) dane.kodPocztowy = kod
  if (miasto) dane.miasto = miasto
  const kontakt = znajdzPoEtykiecie(tresc, ['Kontakt', 'Osoba kontaktowa', 'Osoba do kontaktu', 'Imię i nazwisko', 'Imię i nazwisko odbiorcy'])
  if (kontakt) dane.imieNazwisko = kontakt
  const indeksEtykiety = wiersze.findIndex((wiersz) => /informacj[ae] na etykiet|dopisek na etykiet/i.test(wiersz))
  if (indeksEtykiety >= 0) {
    const poDwukropku = wiersze[indeksEtykiety].split(':').slice(1).join(':').trim()
    dane.informacjaNaEtykiecie = (poDwukropku || wiersze[indeksEtykiety + 1] || '').replace(/:$/, '')
  }
  const indeksKontaktu = wiersze.findIndex((wiersz) => /^kontakt do odbioru paczki/i.test(wiersz))
  if (!kontakt && indeksKontaktu >= 0) dane.imieNazwisko = wiersze.slice(indeksKontaktu + 1).find((wiersz) => !/informacj[ae] na etykiet|^\+|^(?:tel\.?|telefon|nr telefonu|kom\.?)\b/i.test(wiersz) && !czyWierszJestEtykieta(wiersz) && !znajdzEmail(wiersz) && wiersz !== dane.informacjaNaEtykiecie)
  const telefon = znajdzPoEtykiecie(tresc, ['Telefon', 'Tel.', 'Tel', 'Telefon kontaktowy', 'Nr telefonu', 'Kom.'])
    || tresc.match(/\btel\.?\s*(\+?\d[\d ()-]{6,})/i)?.[1] || ''
  if (telefon) dane.telefon = znajdzTelefon(telefon)
  const email = znajdzEmail(tresc)
  if (email) dane.email = email
  return dane
}

type KandydatTytulu = {
  wartosc: string
  priorytet: number
  niepewny: boolean
}

function czyTematKorespondencji(wartosc: string) {
  const tekst = normalizujTekst(wartosc).replace(/ł/g, 'l')
  return /szczegoly organizacyjne|\b(potwierdzenie|zamowienie|oferta)\b|\b(re|fw|fwd|odp)\s*:/i.test(tekst)
    || /^\d{1,4}[./-]\d{1,2}[./-]\d{1,4}/.test(tekst)
}

function czySensownyTytul(wartosc: string) {
  return wartosc.length <= 300
    && (wartosc.match(/\p{L}{2,}/gu)?.length ?? 0) >= 2
    && !czyTematKorespondencji(wartosc)
    && !/@|https?:|www\.|\d+[./-]\d+|\b(?:NIP|nr|numer|umowa|kod|ulica|adres)\b|\bul\./i.test(wartosc)
}

function znajdzTytulWCudzyslowie(tekst: string) {
  const kandydaci = [...tekst.matchAll(/[„“]([^”\n]+)”|"([^"\n]+)"|'([^'\n]+)'|«([^»\n]+)»|‘([^’\n]+)’/g)]
    .map((dopasowanie) => (dopasowanie.slice(1).find(Boolean) ?? '').trim())
    .filter(czySensownyTytul)
  const unikalne = [...new Set(kandydaci)]
  return unikalne.length === 1 ? unikalne[0] : ''
}

function usunZewnetrzneCudzyslowy(tekst: string) {
  return tekst.trim().replace(/^(?:„(.*)”|“(.*)”|"(.*)"|'(.*)'|«(.*)»|‘(.*)’)$/, (...czesci: string[]) => czesci.slice(1, 7).find((czesc) => czesc !== undefined) ?? '')
}

function oczyscNazweOsoby(wartosc: string) {
  return wartosc.replace(znajdzEmail(wartosc), '').replace(/[<>(),;]/g, ' ')
    .replace(/\+?\d[\d ()-]{6,}/g, '').replace(/^(?:(?:prof|dr|hab|mgr|inż)\.?\s+)+/i, '').replace(/\s+/g, ' ').trim()
}

function dopasujOsobe<Typ extends { email: string }>(wartosc: string, osoby: readonly Typ[], nazwa: (osoba: Typ) => string, emaile: (osoba: Typ) => string[] = (osoba) => [osoba.email]) {
  const email = znajdzEmail(wartosc).toLowerCase()
  const poEmailu = email ? osoby.filter((osoba) => emaile(osoba).some((adres) => adres.toLowerCase() === email)) : []
  if (poEmailu.length) return poEmailu
  const imieNazwisko = normalizujTekst(oczyscNazweOsoby(wartosc))
  return imieNazwisko ? osoby.filter((osoba) => normalizujTekst(oczyscNazweOsoby(nazwa(osoba))) === imieNazwisko) : []
}

function parsujTematWiadomosci(temat: string) {
  const tytulWCudzyslowie = znajdzTytulWCudzyslowie(temat)
  const tytul = tytulWCudzyslowie || (czySensownyTytul(temat) && !/[,;„”"']/.test(temat) ? temat.trim() : '')
  return {
    kandydat: tytul ? { wartosc: tytul, priorytet: tytulWCudzyslowie ? 2 : 1, niepewny: true } : undefined,
    daty: znajdzDaty(temat),
  }
}

function wybierzNajlepszegoKandydata(kandydaci: (KandydatTytulu | undefined)[]) {
  return kandydaci.filter((kandydat): kandydat is KandydatTytulu => Boolean(kandydat))
    .sort((pierwszy, drugi) => drugi.priorytet - pierwszy.priorytet)[0]
}

function znajdzEmail(tekst: string) {
  return tekst.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] ?? ''
}

function znajdzTelefon(tekst: string) {
  return tekst.match(/\+?\d[\d\s-]{6,}/)?.[0]?.trim() ?? ''
}

function znajdzNumer(tekst: string) {
  const dopasowanie = tekst.match(/(\d[\d\s.,]*)/)

  if (!dopasowanie) {
    return Number.NaN
  }

  const liczba = dopasowanie[1].trim().replace(/\s/g, '')
  return Number(liczba.includes(',') ? liczba.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(?:\.\d{3})+$/.test(liczba) ? liczba.replace(/\./g, '') : liczba)
}

function zbudujDate(rok: string, miesiac: string, dzien: string) {
  const pelnyRok = rok.length === 2 ? `20${rok}` : rok
  const data = new Date(Date.UTC(Number(pelnyRok), Number(miesiac) - 1, Number(dzien)))
  return data.getUTCFullYear() === Number(pelnyRok) && data.getUTCMonth() + 1 === Number(miesiac) && data.getUTCDate() === Number(dzien)
    ? `${pelnyRok}-${miesiac.padStart(2, '0')}-${dzien.padStart(2, '0')}` : ''
}

function normalizujDate(wartosc: string) {
  const dopasowanie = wartosc.match(/(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/)

  if (!dopasowanie) {
    return ''
  }

  if (dopasowanie[1]) {
    return zbudujDate(dopasowanie[1], dopasowanie[2], dopasowanie[3])
  }

  return zbudujDate(dopasowanie[6], dopasowanie[5], dopasowanie[4])
}

function znajdzDaty(wartosc: string) {
  const skrocony = wartosc.match(/\b(\d{1,2})\s*[-–—]\s*(\d{1,2})[./](\d{1,2})[./](\d{4})\b/)
  const slowny = normalizujTekst(wartosc).match(/\b(\d{1,2})(?:\s*[-–—]\s*(\d{1,2}))?\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|wrzesnia|pazdziernika|listopada|grudnia)\s+(\d{4})\b/)
  const miesiace = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'wrzesnia', 'pazdziernika', 'listopada', 'grudnia']
  if (skrocony || slowny) {
    const miesiac = skrocony?.[3] ?? String(miesiace.indexOf(slowny![3]) + 1)
    const rok = skrocony?.[4] ?? slowny![4]
    const dataOd = zbudujDate(rok, miesiac, skrocony?.[1] ?? slowny![1])
    const dataDo = zbudujDate(rok, miesiac, skrocony?.[2] ?? slowny![2] ?? slowny![1])
    return dataOd && dataDo && dataOd <= dataDo ? { dataOd, dataDo } : { dataOd: '', dataDo: '' }
  }
  const dopasowania = [...wartosc.matchAll(/(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/g)]
    .map((dopasowanie) => normalizujDate(dopasowanie[1]))

  if (dopasowania.some((data) => !data) || dopasowania.length > 1 && dopasowania[0] > dopasowania[1]) return { dataOd: '', dataDo: '' }

  return {
    dataOd: dopasowania[0] ?? '',
    dataDo: dopasowania[1] ?? dopasowania[0] ?? '',
  }
}

function parsujForme(wartosc: string): FormaSzkolenia | '' {
  const wartoscNormalna = normalizujTekst(wartosc)

  if (wartoscNormalna.includes('online') || wartoscNormalna.includes('zdal')) {
    return 'Online'
  }

  if (wartoscNormalna.includes('stacjon')) {
    return 'Stacjonarne'
  }

  return ''
}

function parsujVat(wartosc: string): OswiadczenieVat | '' {
  const wartoscNormalna = normalizujTekst(wartosc)

  if (/\bzw\b|zwolnion|\b100\s*%/.test(wartoscNormalna)) {
    return 'ZW – 100%'
  }

  if (/\b70(?:\s*%|$)/.test(wartoscNormalna)) {
    return 'Min. 70%'
  }

  if (/\b23(?:\s*%|$)/.test(wartoscNormalna) || wartoscNormalna.trim() === 'nie') {
    return 'Nie – 23%'
  }

  return ''
}

function dodajRozpoznanie(
  rozpoznaneObszary: string[],
  rozpoznanePola: string[],
  obszar: string,
  pole: string,
) {
  if (!rozpoznaneObszary.includes(obszar)) {
    rozpoznaneObszary.push(obszar)
  }

  if (!rozpoznanePola.includes(pole)) {
    rozpoznanePola.push(pole)
  }
}

function dodajNiepewne(polaNiepewne: string[], pole: string) {
  if (!polaNiepewne.includes(pole)) {
    polaNiepewne.push(pole)
  }
}

function uzupelnijDaneFirmy(czesciowe: Partial<DaneFirmy>, wartosci: Partial<DaneFirmy>) {
  return {
    ...czesciowe,
    ...Object.fromEntries(Object.entries(wartosci).filter(([, wartosc]) => Boolean(wartosc))),
  }
}

export function parsujMailaSzczegolow(tresc: string, kartoteki: KartotekiImportu = {}): WynikParseraMailaSzczegolow {
  const tekstZrodlowy = tresc
  const wiadomosc = rozdzielNaglowkiWiadomosci(tresc)
  const konteksty = podzielKonteksty(wiadomosc.tresc)
  tresc = konteksty.dane
  const temat = parsujTematWiadomosci(wiadomosc.naglowki.temat ?? wiadomosc.naglowki.subject ?? '')
  const daneFormularza: Partial<DaneFormularza> = {}
  const pierwszaGrupa: Partial<GrupaSzkoleniowa> = {}
  const rozpoznaneObszary: string[] = []
  const rozpoznanePola: string[] = []
  const polaNiepewne: string[] = []
  const ostrzezenia: string[] = []

  const jawnyTytul = usunZewnetrzneCudzyslowy(znajdzPoEtykiecie(tresc, ['Tytuł szkolenia', 'Temat szkolenia', 'Nazwa szkolenia', 'Nazwa kursu', 'Szkolenie']))
  const wzorzecWTresci = tresc.match(/\b(?:szkolenie|kurs)\s+(?:pt\.?|pod tytułem)\s+([^\n]+)/i)
  const samodzielneTytuly = [...new Set(tresc.split('\n').map((wiersz) => /^[„“"'«‘]/.test(wiersz) ? znajdzTytulWCudzyslowie(wiersz) : '').filter(Boolean))]
  const tytulPotwierdzonyTematem = samodzielneTytuly.find((wartosc) => normalizujTekst(wartosc) === normalizujTekst(temat.kandydat?.wartosc ?? ''))
  const tytulWTresci = wzorzecWTresci ? znajdzTytulWCudzyslowie(wzorzecWTresci[1]) : tytulPotwierdzonyTematem || (samodzielneTytuly.length === 1 ? samodzielneTytuly[0] : '')
  const tytul = wybierzNajlepszegoKandydata([
    jawnyTytul && !czyTematKorespondencji(jawnyTytul) ? { wartosc: jawnyTytul, priorytet: 4, niepewny: false } : undefined,
    tytulWTresci ? { wartosc: tytulWTresci, priorytet: 3, niepewny: !wzorzecWTresci && !tytulPotwierdzonyTematem } : undefined,
    temat.kandydat,
  ])
  if (tytul) {
    daneFormularza.tytulSzkolenia = tytul.wartosc
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'podstawowe informacje', 'tytulSzkolenia')
    if (tytul.niepewny) dodajNiepewne(polaNiepewne, 'tytulSzkolenia')
    if (temat.kandydat && normalizujTekst(temat.kandydat.wartosc) !== normalizujTekst(tytul.wartosc)) {
      dodajNiepewne(polaNiepewne, 'tytulSzkolenia')
      ostrzezenia.push(`Różne tytuły: temat „${temat.kandydat.wartosc}”; treść „${tytul.wartosc}”.`)
    }
  }

  const blokKlienta = znajdzBlokPoEtykiecie(tresc, etykietyKlienta)
  const wierszeNazwy: string[] = []
  for (const wiersz of blokKlienta.split('\n')) {
    if (/^(?:ul\.?\s|ulica\s|al\.?\s|aleja\s|pl\.?\s|\d{2}-\d{3}\b)/i.test(wiersz) || wierszeNazwy.length > 0 && /\s\d+[a-z]?(?:\/\d+[a-z]?)?[, ]*$/i.test(wiersz)) break
    if (wiersz.trim()) wierszeNazwy.push(wiersz.trim())
  }
  const nazwaKlienta = wierszeNazwy.join(' ')
  if (nazwaKlienta) {
    daneFormularza.nazwaKlienta = nazwaKlienta
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'podstawowe informacje', 'nazwaKlienta')
  }

  const jawnyOpiekun = znajdzPoEtykiecie(tresc, ['Opiekun szkolenia', 'Opiekun', 'Osoba odpowiedzialna za szkolenie', 'Osoba odpowiedzialna', 'Opiekun projektu'])
  const opiekunowie = (kartoteki.opiekunowie ?? []).filter((osoba) => osoba.rola === 'OPIEKUN' && osoba.status === 'AKTYWNY')
  const dopasowania = jawnyOpiekun ? opiekunowie.filter((osoba) => [osoba.id, osoba.pseudonim, osoba.imie, osoba.imie + ' ' + osoba.nazwisko, ...osoba.aliasyHistoryczne, ...osoba.emaile].some((nazwa) => normalizujTekst(nazwa).trim() === normalizujTekst(jawnyOpiekun).trim())) : []
  if (dopasowania.length === 1) {
    daneFormularza.opiekunId = dopasowania[0].id
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'opiekun', 'opiekunId')
  } else if (jawnyOpiekun) {
    dodajNiepewne(polaNiepewne, 'opiekunId')
    ostrzezenia.push('Opiekun: wybierz rekord kartoteki dla „' + jawnyOpiekun + '”.')
  }

  const nazwaGrupy = znajdzPoEtykiecie(tresc, ['Grupa', 'Nazwa grupy'])
  if (nazwaGrupy) {
    pierwszaGrupa.nazwa = /^\d+$/.test(nazwaGrupy) ? `Grupa ${nazwaGrupy}` : nazwaGrupy
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'grupa szkoleniowa', 'grupy.0.nazwa')
  }

  const trenerzyZMaila = znajdzWartosciPoEtykiecie(tresc, etykietyPolMaila.trener)
  const trener = trenerzyZMaila[0]
  const czyKonfliktTrenerow = new Set(trenerzyZMaila.map((osoba) => normalizujTekst(oczyscNazweOsoby(osoba)))).size > 1
  if (czyKonfliktTrenerow) {
    dodajNiepewne(polaNiepewne, 'grupy.0.trenerzy')
    ostrzezenia.push(`Różni trenerzy w tej samej grupie: ${trenerzyZMaila.join('; ')}. Wybierz właściwą osobę.`)
  } else if (trener) {
    pierwszaGrupa.trenerzy = [
      {
        id: `trener-import-${encodeURIComponent(normalizujTekst(oczyscNazweOsoby(trener)))}`,
        imieNazwisko: oczyscNazweOsoby(trener),
        telefon: znajdzTelefon(trener),
        email: znajdzEmail(trener),
      },
    ]
    const dopasowania = dopasujOsobe(trener, kartoteki.trenerzy ?? [], (osoba) => osoba.imieNazwisko)
    if (dopasowania.length === 1) pierwszaGrupa.trenerzy = [{ ...dopasowania[0] }]
    else if (kartoteki.trenerzy) {
      dodajNiepewne(polaNiepewne, 'grupy.0.trenerzy')
      ostrzezenia.push(`Trener „${trener}”: ${dopasowania.length ? 'kilka pasujących rekordów' : 'brak rekordu'}; wybierz właściwą osobę w grupie.`)
    }
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'grupa szkoleniowa', 'grupy.0.trenerzy')
  }

  const dataOd = normalizujDate(znajdzPoEtykiecie(tresc, ['Data od']))
  const dataDo = normalizujDate(znajdzPoEtykiecie(tresc, ['Data do']))
  const terminy = znajdzWartosciPoEtykiecie(tresc, ['Termin', 'Data szkolenia', 'Termin szkolenia', 'Data'])
  const termin = terminy[0] ?? ''
  const datyTerminu = termin ? znajdzDaty(termin) : { dataOd: '', dataDo: '' }
  const dataOdZTresci = dataOd || datyTerminu.dataOd
  const dataDoZTresci = dataDo || datyTerminu.dataDo
  const czyDatyZgodne = Boolean(dataOdZTresci && dataDoZTresci && dataOdZTresci === temat.daty.dataOd && dataDoZTresci === temat.daty.dataDo)
  const czyKonfliktDat = Boolean(dataOdZTresci && temat.daty.dataOd && dataOdZTresci !== temat.daty.dataOd
    || dataDoZTresci && temat.daty.dataDo && dataDoZTresci !== temat.daty.dataDo)
  const czyKonfliktWTresci = terminy.some((wartosc) => {
    const daty = znajdzDaty(wartosc)
    return daty.dataOd && (daty.dataOd !== dataOdZTresci || daty.dataDo !== dataDoZTresci)
  })

  if (dataOdZTresci || temat.daty.dataOd) {
    pierwszaGrupa.dataOd = dataOdZTresci || temat.daty.dataOd
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'termin', 'grupy.0.dataOd')
    if (!dataOdZTresci) dodajNiepewne(polaNiepewne, 'grupy.0.dataOd')
  }

  if (dataDoZTresci || (!dataOdZTresci && temat.daty.dataDo)) {
    pierwszaGrupa.dataDo = dataDoZTresci || temat.daty.dataDo
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'termin', 'grupy.0.dataDo')
    if (!dataDoZTresci) dodajNiepewne(polaNiepewne, 'grupy.0.dataDo')
  }

  if (termin && datyTerminu.dataOd && !dataDo && datyTerminu.dataOd === datyTerminu.dataDo && !czyDatyZgodne && !/^Data\s*:/im.test(tresc)) {
    dodajNiepewne(polaNiepewne, 'grupy.0.dataDo')
  }
  if (czyKonfliktDat) {
    for (const pole of ['dataOd', 'dataDo'] as const) if (pierwszaGrupa[pole]) dodajNiepewne(polaNiepewne, `grupy.0.${pole}`)
    ostrzezenia.push(`Różne terminy: temat ${temat.daty.dataOd} – ${temat.daty.dataDo}; treść ${dataOdZTresci || 'brak początku'} – ${dataDoZTresci || 'brak końca'}.`)
  }
  if (czyKonfliktWTresci) {
    for (const pole of ['dataOd', 'dataDo'] as const) if (pierwszaGrupa[pole]) dodajNiepewne(polaNiepewne, `grupy.0.${pole}`)
    ostrzezenia.push(`Różne terminy w treści: ${terminy.join('; ')}; data od ${dataOd || 'brak'}, data do ${dataDo || 'brak'}.`)
  }
  if (termin && !datyTerminu.dataOd || znajdzPoEtykiecie(tresc, ['Data od']) && !dataOd || znajdzPoEtykiecie(tresc, ['Data do']) && !dataDo) {
    dodajNiepewne(polaNiepewne, 'grupy.0.dataOd')
    dodajNiepewne(polaNiepewne, 'grupy.0.dataDo')
    ostrzezenia.push('Termin szkolenia: nieprawidłowa data kalendarzowa lub nierozpoznany format; sprawdź treść wiadomości.')
  }

  const forma = parsujForme(znajdzPoEtykiecie(tresc, ['Forma', 'Forma szkolenia', 'Tryb szkolenia']))
  if (forma) {
    pierwszaGrupa.formaSzkolenia = forma
    if (forma === 'Online') {
      pierwszaGrupa.miejsce = 'Online'
    }
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'forma szkolenia', 'grupy.0.formaSzkolenia')
  }

  const miejsce = znajdzBlokPoEtykiecie(tresc, etykietyMiejsca)
  if (miejsce) {
    pierwszaGrupa.miejsce = miejsce.split('\n').join(', ')
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'miejsce', 'grupy.0.miejsce')
    if (!forma && /^(?:Miejsce szkolenia|Sala szkoleniowa) zapewnion[ae] przez Zamawiającego\s*:/im.test(tresc)) {
      pierwszaGrupa.formaSzkolenia = 'Stacjonarne'
      dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'forma szkolenia', 'grupy.0.formaSzkolenia')
    }
    if (kartoteki.czyLokalizacjaPotwierdzona && !kartoteki.czyLokalizacjaPotwierdzona(pierwszaGrupa.miejsce)) {
      dodajNiepewne(polaNiepewne, 'grupy.0.miejsce')
      ostrzezenia.push(`Lokalizacja „${pierwszaGrupa.miejsce}”: sprawdź dopasowanie miejscowości i potwierdzenie odmiany.`)
    }
  }

  const liczbyUczestnikow = znajdzWartosciPoEtykiecie(tresc, etykietyPolMaila.uczestnicy)
  // Samodzielne zdanie o liczbie osób, poza polami kontaktowymi i adresami.
  const samodzielneLiczby: string[] = []
  let czyKontekstUczestnikow = true
  for (const wiersz of tresc.split('\n')) {
    if (czyWierszJestEtykieta(wiersz)) czyKontekstUczestnikow = /^(?:liczba (?:uczestnikow|osob)|ilosc uczestnikow|uczestnicy|grupa|data|termin|dane szkolenia)\b/i.test(normalizujTekst(wiersz))
    if (czyKontekstUczestnikow && /^\d+\s+(?:osob|uczestnikow)[. ]*$/i.test(normalizujTekst(wiersz))) samodzielneLiczby.push(wiersz)
  }
  const kandydaciUczestnikow = [...liczbyUczestnikow, ...samodzielneLiczby]
  const liczby = kandydaciUczestnikow.map(parsujLiczbeUczestnikow)
  if (kandydaciUczestnikow.length) {
    if (liczby.every((liczba) => liczba !== undefined) && new Set(liczby).size === 1) {
      pierwszaGrupa.liczbaUczestnikow = liczby[0]
      dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'grupa szkoleniowa', 'grupy.0.liczbaUczestnikow')
    } else {
      dodajNiepewne(polaNiepewne, 'grupy.0.liczbaUczestnikow')
      ostrzezenia.push(`Liczba uczestników wymaga weryfikacji: ${kandydaciUczestnikow.join('; ')}.`)
    }
  }

  const deklaracjeGodzin = znajdzWartosciPoEtykiecie(tresc, etykietyPolMaila.godziny)
  const godziny = deklaracjeGodzin.map(parsujGodzinySzkolenia)
  if (godziny.length) {
    if (godziny.every((godzina) => godzina.liczbaGodzin !== undefined) && new Set(godziny.map((godzina) => godzina.liczbaGodzin)).size === 1) {
      pierwszaGrupa.liczbaGodzin = godziny[0].liczbaGodzin
      dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'grupa szkoleniowa', 'grupy.0.liczbaGodzin')
    } else dodajNiepewne(polaNiepewne, 'grupy.0.liczbaGodzin')
    const rodzaje = [...godziny, ...znajdzWartosciPoEtykiecie(tresc, etykietyPolMaila.rodzajGodzin).map(parsujGodzinySzkolenia)].flatMap((godzina) => godzina.rodzajGodzin ? [godzina.rodzajGodzin] : [])
    if (new Set(rodzaje).size === 1) {
      pierwszaGrupa.rodzajGodzin = rodzaje[0]
      dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'grupa szkoleniowa', 'grupy.0.rodzajGodzin')
    } else {
      dodajNiepewne(polaNiepewne, 'grupy.0.rodzajGodzin')
      ostrzezenia.push(`Rodzaj godzin: ${deklaracjeGodzin.join('; ')}. Potwierdź jednostkę w formularzu.`)
    }
  }

  const harmonogram = znajdzPoEtykiecie(tresc, etykietyPolMaila.harmonogram) || tresc.match(/^godz\.?\s+([^\n]+)/im)?.[1] || ''
  const zakresGodzin = harmonogram.match(/\b([01]?\d|2[0-3]):([0-5]\d)\s*[-–—]\s*([01]?\d|2[0-3]):([0-5]\d)\b/)
  if (zakresGodzin) {
    pierwszaGrupa.nazwaNiestandardowychGodzin = zakresGodzin[0]
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'harmonogram', 'grupy.0.nazwaNiestandardowychGodzin')
    const minuty = (Number(zakresGodzin[3]) - Number(zakresGodzin[1])) * 60 + Number(zakresGodzin[4]) - Number(zakresGodzin[2])
    if (pierwszaGrupa.rodzajGodzin === 'Zegarowe (60 min)' && pierwszaGrupa.liczbaGodzin && minuty !== pierwszaGrupa.liczbaGodzin * 60) ostrzezenia.push(`Harmonogram ${zakresGodzin[0]} różni się od deklaracji ${pierwszaGrupa.liczbaGodzin} godzin zegarowych. Zachowano deklarowaną liczbę godzin.`)
  }

  const jawnaCenaNetto = znajdzPoEtykiecie(tresc, ['Cena netto', 'Wartość netto'])
  const cenaNetto = jawnaCenaNetto || znajdzPoEtykiecie(tresc, ['Cena', 'Cena brutto', 'Wartość brutto'])
  const vatZCeny = cenaNetto.match(/(?:VAT\s*)?(\d{1,3}\s*%)|\bZW\.?/i)?.[0] ?? ''
  if (cenaNetto) {
    const czyBrutto = /brutto/i.test(cenaNetto) || Boolean(znajdzPoEtykiecie(tresc, ['Cena brutto', 'Wartość brutto'])) && !jawnaCenaNetto
    if (!czyBrutto) pierwszaGrupa.cenaNetto = parsujKwoteMaila(cenaNetto.replace(/(?:VAT\s*)?\d{1,3}\s*%/i, ''))
    if (pierwszaGrupa.cenaNetto !== undefined) dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'cena', 'grupy.0.cenaNetto')
    else dodajNiepewne(polaNiepewne, 'grupy.0.cenaNetto')
    if (czyBrutto || !jawnaCenaNetto && !/\bnetto\b/i.test(cenaNetto) && !parsujVat(vatZCeny)) {
      dodajNiepewne(polaNiepewne, 'grupy.0.cenaNetto')
      ostrzezenia.push(`Cena „${cenaNetto}”: ${czyBrutto ? 'podano brutto; wpisz cenę netto' : 'potwierdź, czy kwota jest netto'}.`)
    }
  }

  const jawnyVat = znajdzPoEtykiecie(tresc, ['VAT', 'Oświadczenie VAT'])
  const vat = parsujVat(jawnyVat || vatZCeny)
  if (vat) {
    pierwszaGrupa.vat = vat
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'cena', 'grupy.0.vat')
    if (jawnyVat && vatZCeny && parsujVat(jawnyVat) !== parsujVat(vatZCeny)) {
      dodajNiepewne(polaNiepewne, 'grupy.0.vat')
      ostrzezenia.push(`Różne stawki VAT: pole VAT „${jawnyVat}”; cena „${cenaNetto}”.`)
    }
  } else if (jawnyVat || vatZCeny) {
    dodajNiepewne(polaNiepewne, 'grupy.0.vat')
    ostrzezenia.push(`VAT „${jawnyVat || vatZCeny}”: wybierz stawkę obsługiwaną przez formularz.`)
  }

  const terminPlatnosci = znajdzPoEtykiecie(tresc, ['Termin płatności', 'Termin platnosci'])
  if (terminPlatnosci) {
    pierwszaGrupa.terminPlatnosci = znajdzNumer(terminPlatnosci)
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'umowa', 'grupy.0.terminPlatnosci')
  }

  const numerUmowy = znajdzPoEtykiecie(tresc, ['Numer umowy', 'Nr umowy'])
  if (numerUmowy) {
    pierwszaGrupa.numerUmowy = numerUmowy
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'umowa', 'grupy.0.numerUmowy')
  }

  const dataUmowy = normalizujDate(znajdzPoEtykiecie(tresc, ['Data umowy']))
  if (dataUmowy) {
    pierwszaGrupa.dataUmowy = dataUmowy
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'umowa', 'grupy.0.dataUmowy')
  }

  for (const pole of ['liczbaUczestnikow', 'liczbaGodzin', 'cenaNetto', 'terminPlatnosci'] as const) {
    if (pierwszaGrupa[pole] !== undefined && !Number.isFinite(pierwszaGrupa[pole])) {
      delete pierwszaGrupa[pole]
      dodajNiepewne(polaNiepewne, `grupy.0.${pole}`)
    }
  }

  const adresKlienta = rozpoznajOdbiorcePaczki(znajdzBlokPoEtykiecie(tresc, etykietyKlienta))
  let nabywca = uzupelnijDaneFirmy(uzupelnijDaneFirmy({}, {
    nazwa: nazwaKlienta,
    ulica: adresKlienta.ulica,
    nrBudynku: adresKlienta.nrBudynku,
    nrLokalu: adresKlienta.nrLokalu,
    kodPocztowy: adresKlienta.kodPocztowy,
    miasto: adresKlienta.miasto,
  }), {
    nazwa: znajdzPoEtykiecie(tresc, ['Nabywca', 'Nazwa nabywcy']),
    nip: znajdzPoEtykiecie(tresc, ['NIP nabywcy', 'NIP']),
    ulica: znajdzPoEtykiecie(tresc, ['Ulica nabywcy']),
    nrBudynku: znajdzPoEtykiecie(tresc, ['Nr budynku nabywcy', 'Numer budynku nabywcy']),
    nrLokalu: znajdzPoEtykiecie(tresc, ['Nr lokalu nabywcy', 'Numer lokalu nabywcy']),
    kodPocztowy: znajdzPoEtykiecie(tresc, ['Kod pocztowy nabywcy']),
    miasto: znajdzPoEtykiecie(tresc, ['Miasto nabywcy']),
    kraj: znajdzPoEtykiecie(tresc, ['Kraj nabywcy']),
    osobaKontaktowa: znajdzPoEtykiecie(tresc, ['Osoba kontaktowa nabywcy', 'Kontakt nabywcy', 'Osoba kontaktowa', 'Osoba do kontaktu']),
    telefon: znajdzPoEtykiecie(tresc, ['Telefon nabywcy']),
    email: znajdzPoEtykiecie(tresc, ['Email nabywcy', 'E-mail nabywcy']),
  })

  const etykietyKontaktu = ['Dane osoby kontaktowej', 'Kontakt po stronie klienta', 'Osoba kontaktowa', 'Osoba do kontaktu', 'Kontakt']
  const wierszeKontaktu = tresc.split('\n')
  const poczatekKontaktu = etykietyKontaktu.map((etykieta) => wierszeKontaktu.findIndex((wiersz) => normalizujTekst(wiersz).startsWith(normalizujTekst(etykieta) + ':'))).find((indeks) => indeks >= 0)
  if (poczatekKontaktu !== undefined) {
    const blok: string[] = [wierszeKontaktu[poczatekKontaktu].replace(/^[^:]*:\s*/, '')]
    for (const wiersz of wierszeKontaktu.slice(poczatekKontaktu + 1)) {
      if (czyWierszJestEtykieta(wiersz) && !/^(?:tel(?:efon)?\.?|nr telefonu|kom\.?|adres e-mail|e-?mail|mail)\s*:/i.test(wiersz)) break
      blok.push(wiersz)
    }
    const tekst = blok.join(' ')
    const email = znajdzEmail(tekst)
    const telefon = tekst.match(/(?:tel(?:efon)?\.?|nr telefonu|kom\.?)\s*:?\s*(\+?\d[\d ()-]{6,})/i)?.[1]?.trim()
    const osoba = blok.filter(Boolean)[0]?.split(/\b(?:tel(?:efon)?|nr telefonu|kom|adres e-mail|e-mail|email|mail)\b/i)[0].trim().replace(/[,;]+$/, '')
    nabywca = uzupelnijDaneFirmy(nabywca, { osobaKontaktowa: osoba, telefon: telefon && parsujNumeryTelefonu(telefon).length === 1 ? telefon : undefined, email })
  }
  const raport = znajdzPoEtykiecie(tresc, ['Raport na adres'])
  if (znajdzEmail(raport)) nabywca.sposobWysylkiRaportu = 'E-mail: ' + znajdzEmail(raport)

  if (kartoteki.klienci && (nazwaKlienta || nabywca.nip)) {
    const nip = (nabywca.nip ?? '').replace(/\D/g, '')
    const dopasowania = kartoteki.klienci.filter((klient) => nip ? klient.nip.replace(/\D/g, '') === nip : normalizujTekst(klient.nazwa).replace(/\s+/g, ' ').trim() === normalizujTekst(nazwaKlienta))
    if (dopasowania.length === 1) {
      const klient = dopasowania[0]
      nabywca = uzupelnijDaneFirmy({ nazwa: klient.nazwa, nip: klient.nip, ulica: klient.ulica, nrBudynku: klient.nrBudynku, nrLokalu: klient.nrLokalu, kodPocztowy: klient.kodPocztowy, miasto: klient.miasto, kraj: klient.kraj }, nabywca)
      daneFormularza.nazwaKlienta = nazwaKlienta || klient.nazwa
      dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'dane klienta', 'nazwaKlienta')
    } else if (dopasowania.length > 1) {
      dodajNiepewne(polaNiepewne, 'nazwaKlienta')
      ostrzezenia.push(`Niejednoznaczny klient w kartotece. Propozycje: ${dopasowania.map((klient) => `${klient.nazwa} (${klient.miasto})`).join('; ')}. Potwierdź dane klienta.`)
    }
  }

  if (Object.keys(nabywca).length) {
    daneFormularza.nabywca = nabywca as DaneFirmy
    for (const pole of Object.keys(nabywca)) dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'dane nabywcy', `nabywca.${pole}`)
  }

  const odbiorca = uzupelnijDaneFirmy({}, {
    nazwa: znajdzPoEtykiecie(tresc, ['Odbiorca', 'Nazwa odbiorcy', 'Nazwa firmy odbiorcy']),
    ulica: znajdzPoEtykiecie(tresc, ['Ulica odbiorcy']),
    nrBudynku: znajdzPoEtykiecie(tresc, ['Nr budynku odbiorcy', 'Numer budynku odbiorcy']),
    nrLokalu: znajdzPoEtykiecie(tresc, ['Nr lokalu odbiorcy', 'Numer lokalu odbiorcy']),
    kodPocztowy: znajdzPoEtykiecie(tresc, ['Kod pocztowy odbiorcy']),
    miasto: znajdzPoEtykiecie(tresc, ['Miasto odbiorcy']),
    kraj: znajdzPoEtykiecie(tresc, ['Kraj odbiorcy']),
    imieNazwiskoOdbiorcy: znajdzPoEtykiecie(tresc, ['Imię i nazwisko odbiorcy', 'Imie i nazwisko odbiorcy']),
    telefon: znajdzPoEtykiecie(tresc, ['Telefon odbiorcy']),
    email: znajdzPoEtykiecie(tresc, ['Email odbiorcy', 'E-mail odbiorcy']),
  })

  if (Object.keys(odbiorca).length) {
    daneFormularza.odbiorca = odbiorca as DaneFirmy
    daneFormularza.czyNabywcaJestOdbiorca = Boolean(nabywca.nazwa && odbiorca.nazwa && nabywca.nazwa === odbiorca.nazwa)
    for (const pole of Object.keys(odbiorca)) dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'dane odbiorcy', `odbiorca.${pole}`)
  }

  const dyspozycje = rozpoznajDyspozycje(konteksty.materialy, nazwaKlienta)
  if (Object.keys(dyspozycje).length) {
    daneFormularza.dyspozycjeMaterialowe = dyspozycje
    for (const [rodzaj, dyspozycja] of Object.entries(dyspozycje)) {
      const pole = `dyspozycjeMaterialowe.${rodzaj}`
      dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'dyspozycje materiałowe', pole)
      if (dyspozycja.status === 'niepewne') dodajNiepewne(polaNiepewne, pole)
    }
  }

  const odbiorcyPaczek = konteksty.wysylki.map(rozpoznajOdbiorcePaczki).filter((dane) => Object.keys(dane).length)
  if (odbiorcyPaczek.length) {
    const odbiorcaPaczki = odbiorcyPaczek[0]
    daneFormularza.odbiorcaPaczki = { ...poczatkoweDaneFormularza.odbiorcaPaczki, ...odbiorcaPaczki }
    daneFormularza.wysylkaPaczkiDotyczy = true
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'wysyłka materiałów', 'wysylkaPaczkiDotyczy')
    for (const pole of Object.keys(odbiorcaPaczki)) {
      dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'wysyłka materiałów', `odbiorcaPaczki.${pole}`)
      if (odbiorcyPaczek.some((dane) => dane[pole as keyof typeof dane] !== odbiorcaPaczki[pole as keyof typeof odbiorcaPaczki])) {
        dodajNiepewne(polaNiepewne, `odbiorcaPaczki.${pole}`)
      }
    }
    const pelneDane = { ...poczatkoweDaneFormularza, ...daneFormularza, nabywca: { ...poczatkoweDaneFormularza.nabywca, ...nabywca }, odbiorca: { ...poczatkoweDaneFormularza.odbiorca, ...odbiorca } }
    daneFormularza.wysylkaNaSiedzibeOdbiorcy = czyPaczkaNaSiedzibe(pelneDane) && !polaNiepewne.some((pole) => pole.startsWith('odbiorcaPaczki.'))
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'wysyłka materiałów', 'wysylkaNaSiedzibeOdbiorcy')
    for (const pole of ['nazwaFirmy', 'ulica', 'nrBudynku', 'kodPocztowy', 'miasto'] as const) if (!odbiorcaPaczki[pole]) dodajNiepewne(polaNiepewne, 'odbiorcaPaczki.' + pole)
    if (!odbiorcaPaczki.nrBudynku || !odbiorcaPaczki.kodPocztowy || !odbiorcaPaczki.miasto) {
      dodajNiepewne(polaNiepewne, 'odbiorcaPaczki.ulica')
    }
  }

  const wierszeOryginalne = normalizujTrescMaila(tekstZrodlowy, true).split('\n')
  const indeksProgramu = wierszeOryginalne.findIndex((wiersz) => /^\s*(?:[-*•–—]\s*)?program szkolenia\s*:/i.test(wiersz.replace(/\*\*|__/g, '')))
  if (indeksProgramu >= 0) {
    const program = [wierszeOryginalne[indeksProgramu].replace(/\*\*|__/g, '').replace(/^[^:]*:\s*/, ''), ...wierszeOryginalne.slice(indeksProgramu + 1)]
    const koniecProgramu = program.findIndex((wiersz) => /^\s*(?:--|Z pozdrowieniami|Pozdrawiam)\s*$/i.test(wiersz))
    const trescProgramu = (koniecProgramu < 0 ? program : program.slice(0, koniecProgramu)).join('\n').trim()
    if (trescProgramu) {
      daneFormularza.programSzkolenia = trescProgramu
      dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'program szkolenia', 'programSzkolenia')
    }
  }
  if (rozpoznanePola.length || polaNiepewne.length) daneFormularza.zrodloImportuMaila = tekstZrodlowy

  const pozostaleGrupy = konteksty.blokiGrup.slice(1).map((blok, indeks) => {
    const wynikGrupy = parsujMailaSzczegolow(blok, kartoteki)
    for (const pole of wynikGrupy.rozpoznanePola.filter((pole) => pole.startsWith('grupy.0.'))) {
      dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'grupy szkoleniowe', pole.replace('grupy.0.', `grupy.${indeks + 1}.`))
    }
    for (const pole of wynikGrupy.polaNiepewne.filter((pole) => pole.startsWith('grupy.0.'))) dodajNiepewne(polaNiepewne, pole.replace('grupy.0.', `grupy.${indeks + 1}.`))
    ostrzezenia.push(...(wynikGrupy.ostrzezenia ?? []).map((komunikat) => `Grupa ${indeks + 2}: ${komunikat}`))
    return {
      ...wynikGrupy.pierwszaGrupa,
      ...(wynikGrupy.daneFormularza.dyspozycjeMaterialowe ? { dyspozycjeMaterialowe: wynikGrupy.daneFormularza.dyspozycjeMaterialowe, zrodloImportuMaila: tekstZrodlowy } : {}),
    }
  })

  return {
    daneFormularza,
    pierwszaGrupa,
    ...(pozostaleGrupy.length ? { pozostaleGrupy } : {}),
    rozpoznaneObszary,
    rozpoznanePola,
    polaNiepewne,
    ...(ostrzezenia.length ? { ostrzezenia } : {}),
  }
}
