import type {
  DaneFirmy,
  DaneFormularza,
  FormaSzkolenia,
  GrupaSzkoleniowa,
  OswiadczenieVat,
  WynikParseraMailaSzczegolow,
} from '../typy'

function normalizujTekst(tekst: string) {
  return tekst
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function zabezpieczWyrazenie(tekst: string) {
  return tekst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function znajdzPoEtykiecie(tresc: string, etykiety: string[]) {
  const wzorEtykiet = etykiety.map(zabezpieczWyrazenie).join('|')
  const wzor = new RegExp(`(?:^|\\n)\\s*(?:${wzorEtykiet})\\s*[:\\-–]\\s*(.+)`, 'i')
  return tresc.match(wzor)?.[1]?.trim() ?? ''
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

  return Number(dopasowanie[1].replace(/\s/g, '').replace(',', '.'))
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
  const daneFormularza: Partial<DaneFormularza> = {}
  const pierwszaGrupa: Partial<GrupaSzkoleniowa> = {}
  const rozpoznaneObszary: string[] = []
  const rozpoznanePola: string[] = []
  const polaNiepewne: string[] = []

  const tytul = znajdzPoEtykiecie(tresc, ['Tytuł szkolenia', 'Temat szkolenia', 'Temat'])
  if (tytul) {
    daneFormularza.tytulSzkolenia = tytul
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'podstawowe informacje', 'tytulSzkolenia')
  }

  const nazwaKlienta = znajdzPoEtykiecie(tresc, ['Nazwa klienta', 'Klient'])
  if (nazwaKlienta) {
    daneFormularza.nazwaKlienta = nazwaKlienta
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'podstawowe informacje', 'nazwaKlienta')
  }

  const trener = znajdzPoEtykiecie(tresc, ['Trener', 'Prowadzący', 'Prowadząca'])
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
  const termin = znajdzPoEtykiecie(tresc, ['Termin', 'Data szkolenia'])
  const datyTerminu = termin ? znajdzDaty(termin) : { dataOd: '', dataDo: '' }

  if (dataOd || datyTerminu.dataOd) {
    pierwszaGrupa.dataOd = dataOd || datyTerminu.dataOd
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'termin', 'grupy.0.dataOd')
  }

  if (dataDo || datyTerminu.dataDo) {
    pierwszaGrupa.dataDo = dataDo || datyTerminu.dataDo
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'termin', 'grupy.0.dataDo')
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

  const cenaNetto = znajdzPoEtykiecie(tresc, ['Cena netto', 'Wartość netto'])
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

  return {
    daneFormularza,
    pierwszaGrupa,
    rozpoznaneObszary,
    rozpoznanePola,
    polaNiepewne,
  }
}
