import type {
  DaneFirmy,
  DaneFormularza,
  DyspozycjaMaterialowa,
  DyspozycjeMaterialowe,
  FormaSzkolenia,
  GrupaSzkoleniowa,
  OswiadczenieVat,
  RodzajDyspozycjiMaterialowej,
  WynikParseraMailaSzczegolow,
} from '../typy'
import { poczatkoweDaneFormularza } from '../danePoczatkowe'

function normalizujTekst(tekst: string) {
  return tekst
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
}

function zabezpieczWyrazenie(tekst: string) {
  return tekst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizujTrescMaila(tresc: string) {
  const encje: Record<string, string> = {
    nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
    ensp: ' ', emsp: ' ', thinsp: ' ', ndash: '–', mdash: '—',
    colon: ':', tab: ' ', newline: '\n', laquo: '„', raquo: '”',
    ldquo: '„', rdquo: '”', shy: '', zwj: '', zwnj: '',
  }
  return tresc
    .replace(/\r\n?/g, '\n')
    .replace(/<!--[\s\S]*?-->|<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(?:br|hr)\b[^>]*>|<\/?(?:p|div|tr|td|th|table|li|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<\/?[a-z][a-z\d:-]*(?:\s[^<>]*)?\s*\/?>/gi, '')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (calosc, encja: string) => {
      if (!encja.startsWith('#')) return encje[encja.toLowerCase()] ?? calosc
      const kod = encja[1].toLowerCase() === 'x' ? parseInt(encja.slice(2), 16) : Number(encja.slice(1))
      return kod > 0 && kod <= 0x10ffff ? String.fromCodePoint(kod) : calosc
    })
    .replace(/[\u200b\uFEFF\u00ad]|\u200c|\u200d/g, '')
    .replace(/\*\*|__/g, '')
    .split('\n')
    .map((wiersz) => wiersz.replace(/[^\S\n]+/g, ' ').trim().replace(/^(?:>\s*|#{1,6}\s+|[-*•–]\s*(?=\p{L}))/gu, ''))
    .join('\n')
}

function czyWierszJestEtykieta(wiersz: string) {
  return /^[\p{L}][\p{L}\d .()/-]*\s*(?::|\s[-–]\s)/u.test(wiersz.trim())
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
    if (!naglowek || (normalizujTekst(naglowek[1]) === 'data' && !czyWBlokuNaglowkow)) {
      trescWlasciwa.push(wiersze[indeks])
      if (wiersze[indeks].trim()) czyWBlokuNaglowkow = false
      continue
    }
    czyWBlokuNaglowkow = true
    const nazwa = normalizujTekst(naglowek[1])
    const wartosc = naglowek[2].trim() || znajdzWartoscWNastepnejLinii(wiersze, indeks)
    naglowki[nazwa] ??= wartosc
    if (!naglowek[2].trim() && wartosc) {
      while (!wiersze[indeks + 1].trim()) indeks += 1
      indeks += 1
    }
  }

  return { naglowki, tresc: trescWlasciwa.join('\n') }
}

function znajdzPoEtykiecie(tresc: string, etykiety: string[]) {
  return znajdzWartosciPoEtykiecie(tresc, etykiety)[0] ?? ''
}

function znajdzWartosciPoEtykiecie(tresc: string, etykiety: string[]) {
  const wzorEtykiet = etykiety.map((etykieta) => zabezpieczWyrazenie(normalizujTekst(etykieta))).join('|')
  const wzor = new RegExp(`^[ \\t]*(?:${wzorEtykiet})[ \\t]*[:\\-–][ \\t]*(.*)$`, 'i')
  const wiersze = tresc.split('\n')
  const wartosci: string[] = []
  for (let indeks = 0; indeks < wiersze.length; indeks += 1) {
    let wiersz = wiersze[indeks]
    for (let koniec = indeks; koniec < Math.min(indeks + 5, wiersze.length); koniec += 1) {
      if (koniec > indeks && wiersze[koniec].trim()) wiersz += ` ${wiersze[koniec]}`
      const dopasowanie = normalizujTekst(wiersz).match(wzor)
      if (dopasowanie) {
        const wartosc = wiersz.slice(dopasowanie[0].length - dopasowanie[1].length).trim()
          || znajdzWartoscWNastepnejLinii(wiersze, koniec)
        if (wartosc) wartosci.push(wartosc)
        break
      }
      if (!wiersz.trim() || !etykiety.some((etykieta) => normalizujTekst(etykieta).startsWith(normalizujTekst(wiersz).trim()))) break
    }
  }
  return wartosci
}

function podzielKonteksty(tresc: string) {
  const dane: string[] = []
  const materialy: string[] = []
  const wysylki: string[][] = []
  let sekcja: 'dane' | 'wysylka' | 'pomijana' = 'dane'
  let pierwszaGrupa = ''
  let czyPierwszaGrupa = true

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
    const grupa = tekst.match(/^(?:grupa(?: szkoleniowa)?|nazwa grupy)\s*(?::|[-–])?\s*([^:]+?)\s*:?$/)
    if (grupa) {
      pierwszaGrupa ||= grupa[1]
      czyPierwszaGrupa = grupa[1] === pierwszaGrupa
      sekcja = 'dane'
      if (czyPierwszaGrupa) dane.push(`Grupa: ${wiersz.replace(/^(?:grupa(?: szkoleniowa)?|nazwa grupy)\s*[:–-]?\s*/i, '').replace(/:$/, '')}`)
      continue
    }
    if (/^(?:dla [\p{L} ]+:\s*)?(?:materialy (?:na adres|do wysylki)|adres (?:do )?(?:wysylki|dostawy)|dane (?:do wysylki|odbiorcy paczki)|wysylka (?:materialow|paczki)|odbiorca (?:materialow|paczki))\b/u.test(tekst)) {
      sekcja = 'wysylka'
      if (czyPierwszaGrupa) wysylki.push([wiersz.includes(':') ? wiersz.slice(wiersz.lastIndexOf(':') + 1).trim() : ''])
      continue
    }
    if (/^(?:(?:wazna )?informacja dla trenera|dla trenera|instrukcje dla trenera|uwagi dla trenera|hotel\b|nocleg\b|zakwaterowanie\b|adres hotelu\b|harmonogram szkolenia|program szkolenia)/.test(tekst)) {
      sekcja = 'pomijana'
      continue
    }
    if (/^(?:dane szkolenia|szczegoly szkolenia|podstawowe informacje|dokumentacja|dyspozycje materialowe|dane nabywcy|dane do faktury)\s*:?$/.test(tekst)) sekcja = 'dane'
    if (/^(?:(?:adres|miejsce|forma|tryb|data) szkolenia\s*:|sala szkoleniowa\b)/.test(tekst)) sekcja = 'dane'
    if (!czyPierwszaGrupa || /^dla [\p{L} ]+:\s*$/u.test(tekst)) continue
    if (sekcja === 'wysylka') wysylki.at(-1)?.push(wiersz)
    if (sekcja === 'dane') {
      dane.push(wiersz)
      materialy.push(wiersz)
    }
  }
  return { dane: dane.join('\n'), materialy: materialy.join('\n'), wysylki: wysylki.map((wiersze) => wiersze.join('\n')) }
}

const etykietyDyspozycji: Record<RodzajDyspozycjiMaterialowej, string[]> = {
  materialySzkoleniowe: ['Materiały szkoleniowe', 'Materiały szkol.', 'Mat. szkoleniowe', 'Mat. szkol.', 'Materiały', 'Skrypty', 'Podręczniki'],
  certyfikaty: ['Certyfikaty', 'Certyfikat', 'Cert.', 'Dyplomy', 'Zaświadczenia'],
  listaObecnosci: ['Lista obecności', 'Listy obecności', 'Lista obecn.', 'L. obecności', 'L.O.'],
  materialyDodatkowe: ['Materiały dodatkowe', 'Mat. dodatkowe', 'Mat. dod.', 'Materiały dod.'],
  ankiety: ['Ankiety', 'Ankieta', 'Ankiety ewaluacyjne', 'Ank.'],
}

function parsujDyspozycje(wartosc: string): DyspozycjaMaterialowa {
  const tekst = normalizujTekst(wartosc)
  const dyspozycja: DyspozycjaMaterialowa = { tekstZrodlowy: wartosc, status: 'zaimportowane' }
  const czyOnline = /\bon[ -]?line\b|elektroniczn|cyfrow|\bpdf\b|e-?mail/.test(tekst)
  const papier = /druk|papier/.test(tekst)
  const klient = /\bklient(?:a|owi|em)?\b|zamawiajac/.test(tekst)
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

function rozpoznajDyspozycje(tresc: string) {
  const dyspozycje: DyspozycjeMaterialowe = {}
  for (const rodzaj of Object.keys(etykietyDyspozycji) as RodzajDyspozycjiMaterialowej[]) {
    const wartosci = znajdzWartosciPoEtykiecie(tresc, etykietyDyspozycji[rodzaj])
    if (!wartosci.length) continue
    const dyspozycja = parsujDyspozycje(wartosci[0])
    if (new Set(wartosci.map(normalizujTekst)).size > 1) {
      dyspozycje[rodzaj] = { tekstZrodlowy: wartosci.join('\n'), status: 'niepewne' }
    } else dyspozycje[rodzaj] = dyspozycja
  }
  return dyspozycje
}

function rozpoznajOdbiorcePaczki(tresc: string) {
  const wiersze = tresc.split('\n').map((wiersz) => wiersz.trim()).filter(Boolean)
  const dane: Partial<DaneFormularza['odbiorcaPaczki']> = {}
  const nazwa = znajdzPoEtykiecie(tresc, ['Nazwa firmy', 'Nazwa odbiorcy', 'Odbiorca', 'Firma'])
    || wiersze.find((wiersz) => !czyWierszJestEtykieta(wiersz) && !/^(?:ul\.|\d|tel\.|kontakt)/i.test(wiersz) && !znajdzEmail(wiersz))
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
  const telefon = znajdzPoEtykiecie(tresc, ['Telefon', 'Tel.', 'Tel', 'Telefon kontaktowy'])
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
  const kandydaci = [...tekst.matchAll(/„([^”\n]+)”|"([^"\n]+)"|'([^'\n]+)'/g)]
    .map((dopasowanie) => (dopasowanie[1] ?? dopasowanie[2] ?? dopasowanie[3]).trim())
    .filter(czySensownyTytul)
  const unikalne = [...new Set(kandydaci)]
  return unikalne.length === 1 ? unikalne[0] : ''
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
  return Number(liczba.includes(',') ? liczba.replace(/\./g, '').replace(',', '.') : liczba)
}

function normalizujDate(wartosc: string) {
  const dopasowanie = wartosc.match(/(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/)

  if (!dopasowanie) {
    return ''
  }

  if (dopasowanie[1]) {
    return `${dopasowanie[1]}-${dopasowanie[2].padStart(2, '0')}-${dopasowanie[3].padStart(2, '0')}`
  }

  const rok = dopasowanie[6].length === 2 ? `20${dopasowanie[6]}` : dopasowanie[6]
  return `${rok}-${dopasowanie[5].padStart(2, '0')}-${dopasowanie[4].padStart(2, '0')}`
}

function znajdzDaty(wartosc: string) {
  const dopasowania = [...wartosc.matchAll(/(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/g)]
    .map((dopasowanie) => normalizujDate(dopasowanie[1]))
    .filter(Boolean)

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

  if (wartoscNormalna.includes('zw') || wartoscNormalna.includes('100')) {
    return 'ZW – 100%'
  }

  if (wartoscNormalna.includes('70')) {
    return 'Min. 70%'
  }

  if (wartoscNormalna.includes('23') || wartoscNormalna.includes('nie')) {
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

export function parsujMailaSzczegolow(tresc: string): WynikParseraMailaSzczegolow {
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

  const jawnyTytul = znajdzPoEtykiecie(tresc, ['Tytuł szkolenia', 'Temat szkolenia', 'Nazwa szkolenia', 'Nazwa kursu', 'Szkolenie'])
  const wzorzecWTresci = tresc.match(/\b(?:szkolenie|kurs)\s+(?:pt\.?|pod tytułem)\s+([^\n]+)/i)
  const tytulWTresci = wzorzecWTresci ? znajdzTytulWCudzyslowie(wzorzecWTresci[1]) : ''
  const tytul = wybierzNajlepszegoKandydata([
    jawnyTytul && !czyTematKorespondencji(jawnyTytul) ? { wartosc: jawnyTytul, priorytet: 4, niepewny: false } : undefined,
    tytulWTresci ? { wartosc: tytulWTresci, priorytet: 3, niepewny: false } : undefined,
    temat.kandydat,
  ])
  if (tytul) {
    daneFormularza.tytulSzkolenia = tytul.wartosc
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'podstawowe informacje', 'tytulSzkolenia')
    if (tytul.niepewny) dodajNiepewne(polaNiepewne, 'tytulSzkolenia')
  }

  const nazwaKlienta = znajdzPoEtykiecie(tresc, ['Nazwa klienta', 'Klient', 'Nazwa firmy'])
  if (nazwaKlienta) {
    daneFormularza.nazwaKlienta = nazwaKlienta
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'podstawowe informacje', 'nazwaKlienta')
  }

  const nazwaGrupy = znajdzPoEtykiecie(tresc, ['Grupa', 'Nazwa grupy'])
  if (nazwaGrupy) {
    pierwszaGrupa.nazwa = /^\d+$/.test(nazwaGrupy) ? `Grupa ${nazwaGrupy}` : nazwaGrupy
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'grupa szkoleniowa', 'grupy.0.nazwa')
  }

  const trener = znajdzPoEtykiecie(tresc, ['Trener', 'Prowadzący', 'Prowadząca', 'Trener Prowadzący'])
  if (trener) {
    pierwszaGrupa.trenerzy = [
      {
        id: `trener-import-${Date.now()}`,
        imieNazwisko: trener.replace(znajdzEmail(trener), '').trim(),
        telefon: znajdzTelefon(trener),
        email: znajdzEmail(trener),
      },
    ]
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'grupa szkoleniowa', 'grupy.0.trenerzy')
  }

  const dataOd = normalizujDate(znajdzPoEtykiecie(tresc, ['Data od']))
  const dataDo = normalizujDate(znajdzPoEtykiecie(tresc, ['Data do']))
  const termin = znajdzPoEtykiecie(tresc, ['Termin', 'Data szkolenia', 'Data'])
  const datyTerminu = termin ? znajdzDaty(termin) : { dataOd: '', dataDo: '' }
  const dataOdZTresci = dataOd || datyTerminu.dataOd
  const dataDoZTresci = dataDo || datyTerminu.dataDo

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

  if (termin && datyTerminu.dataOd && !dataDo && datyTerminu.dataOd === datyTerminu.dataDo) {
    dodajNiepewne(polaNiepewne, 'grupy.0.dataDo')
  }

  const forma = parsujForme(znajdzPoEtykiecie(tresc, ['Forma', 'Forma szkolenia', 'Tryb szkolenia']))
  if (forma) {
    pierwszaGrupa.formaSzkolenia = forma
    if (forma === 'Online') {
      pierwszaGrupa.miejsce = 'Online'
    }
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'forma szkolenia', 'grupy.0.formaSzkolenia')
  }

  const miejsce = znajdzPoEtykiecie(tresc, ['Miejsce', 'Lokalizacja', 'Adres szkolenia'])
  if (miejsce) {
    pierwszaGrupa.miejsce = miejsce
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'miejsce', 'grupy.0.miejsce')
  }

  const liczbaUczestnikow = znajdzPoEtykiecie(tresc, ['Liczba uczestników', 'Liczba osób', 'Uczestników'])
  if (liczbaUczestnikow) {
    pierwszaGrupa.liczbaUczestnikow = znajdzNumer(liczbaUczestnikow)
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'grupa szkoleniowa', 'grupy.0.liczbaUczestnikow')
  }

  const liczbaGodzin = znajdzPoEtykiecie(tresc, ['Liczba godzin', 'Godziny szkolenia'])
  if (liczbaGodzin) {
    pierwszaGrupa.liczbaGodzin = znajdzNumer(liczbaGodzin)
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'grupa szkoleniowa', 'grupy.0.liczbaGodzin')
  }

  const cenaNetto = znajdzPoEtykiecie(tresc, ['Cena netto', 'Wartość netto', 'Cena'])
  if (cenaNetto) {
    pierwszaGrupa.cenaNetto = znajdzNumer(cenaNetto)
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'cena', 'grupy.0.cenaNetto')
  }

  const vat = parsujVat(znajdzPoEtykiecie(tresc, ['VAT', 'Oświadczenie VAT']))
  if (vat) {
    pierwszaGrupa.vat = vat
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'cena', 'grupy.0.vat')
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

  const nabywca = uzupelnijDaneFirmy({}, {
    nazwa: znajdzPoEtykiecie(tresc, ['Nabywca', 'Nazwa nabywcy']),
    nip: znajdzPoEtykiecie(tresc, ['NIP nabywcy', 'NIP']),
    ulica: znajdzPoEtykiecie(tresc, ['Ulica nabywcy']),
    nrBudynku: znajdzPoEtykiecie(tresc, ['Nr budynku nabywcy', 'Numer budynku nabywcy']),
    nrLokalu: znajdzPoEtykiecie(tresc, ['Nr lokalu nabywcy', 'Numer lokalu nabywcy']),
    kodPocztowy: znajdzPoEtykiecie(tresc, ['Kod pocztowy nabywcy']),
    miasto: znajdzPoEtykiecie(tresc, ['Miasto nabywcy']),
    kraj: znajdzPoEtykiecie(tresc, ['Kraj nabywcy']),
    osobaKontaktowa: znajdzPoEtykiecie(tresc, ['Osoba kontaktowa nabywcy', 'Kontakt nabywcy']),
    telefon: znajdzPoEtykiecie(tresc, ['Telefon nabywcy']),
    email: znajdzPoEtykiecie(tresc, ['Email nabywcy', 'E-mail nabywcy']),
  })

  if (Object.keys(nabywca).length) {
    daneFormularza.nabywca = nabywca as DaneFirmy
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'dane nabywcy', 'nabywca.nazwa')
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
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'dane odbiorcy', 'odbiorca.nazwa')
  }

  const dyspozycje = rozpoznajDyspozycje(konteksty.materialy)
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
    if (!odbiorcaPaczki.nrBudynku || !odbiorcaPaczki.kodPocztowy || !odbiorcaPaczki.miasto) {
      dodajNiepewne(polaNiepewne, 'odbiorcaPaczki.ulica')
    }
  }

  if (rozpoznanePola.length) daneFormularza.zrodloImportuMaila = tekstZrodlowy

  return {
    daneFormularza,
    pierwszaGrupa,
    rozpoznaneObszary,
    rozpoznanePola,
    polaNiepewne,
  }
}
