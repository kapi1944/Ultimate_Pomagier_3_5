import type {
  DaneFormularza,
  GrupaSzkoleniowa,
  OswiadczenieVat,
  UczestnikGrupy,
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

function znajdzNumer(tekst: string) {
  const liczba = tekst.match(/(\d[\d\s.,]*)/)?.[1]?.replace(/\s/g, '').replace(',', '.')
  return liczba ? Number(liczba) : 0
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

function normalizujGodzine(wartosc: string) {
  const dopasowanie = wartosc.match(/(\d{1,2})[:.](\d{2})/)
  return dopasowanie ? `${dopasowanie[1].padStart(2, '0')}:${dopasowanie[2]}` : ''
}

function pobierzSekcje(tresc: string, naglowki: string[]) {
  const linie = tresc.split(/\r?\n/)
  const indeksStartowy = linie.findIndex((linia) => {
    const liniaNormalna = normalizujTekst(linia)
    return naglowki.some((naglowek) => liniaNormalna.includes(normalizujTekst(naglowek)))
  })

  if (indeksStartowy === -1) {
    return ''
  }

  const zebrane: string[] = []

  for (const linia of linie.slice(indeksStartowy + 1)) {
    const bezSpacji = linia.trim()
    const czyNowyNaglowek =
      bezSpacji.length > 3 &&
      bezSpacji.length < 80 &&
      bezSpacji === bezSpacji.toUpperCase() &&
      !bezSpacji.includes('@')

    if (czyNowyNaglowek) {
      break
    }

    zebrane.push(linia)
  }

  return zebrane.join('\n').trim()
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

function parsujVat(wartosc: string): OswiadczenieVat {
  const wartoscNormalna = normalizujTekst(wartosc)

  if (wartoscNormalna.includes('zw')) {
    return 'zwolnione'
  }

  if (wartoscNormalna.includes('8')) {
    return '8%'
  }

  if (wartoscNormalna.includes('0')) {
    return '0%'
  }

  return '23%'
}

function parsujUczestnikow(tekst: string): UczestnikGrupy[] {
  return tekst
    .split(/\r?\n|;/)
    .map((wiersz) => wiersz.trim())
    .filter(Boolean)
    .filter((wiersz) => !wiersz.includes(':'))
    .map((wiersz, indeks) => {
      const email = znajdzEmail(wiersz)
      const bezEmaila = wiersz.replace(email, '').replace(/[;,]+/g, ' ').trim()
      const czesci = bezEmaila.split(/\s+/).filter(Boolean)

      return {
        id: `uczestnik-import-${Date.now()}-${indeks}`,
        imie: czesci[0] ?? '',
        nazwisko: czesci.slice(1).join(' '),
        email,
      }
    })
}

export function parsujMailaSzczegolow(tresc: string): WynikParseraMailaSzczegolow {
  const daneFormularza: Partial<DaneFormularza> = {}
  const pierwszaGrupa: Partial<GrupaSzkoleniowa> = {}
  const rozpoznaneObszary: string[] = []
  const rozpoznanePola: string[] = []
  const polaNiepewne: string[] = []
  const trescNormalna = normalizujTekst(tresc)

  const tytul = znajdzPoEtykiecie(tresc, ['Tytuł szkolenia', 'Szkolenie', 'Temat'])
  if (tytul) {
    daneFormularza.tytulSzkolenia = tytul
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'tytuł szkolenia', 'tytulSzkolenia')
  }

  const termin = znajdzPoEtykiecie(tresc, ['Termin', 'Data szkolenia', 'Data'])
  const dataOd = normalizujDate(termin || tresc)
  if (dataOd) {
    pierwszaGrupa.dataOd = dataOd
    pierwszaGrupa.dataDo = dataOd
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'termin', 'grupy.0.dataOd')
  }

  const godziny = tresc.match(/(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2})/)
  if (godziny) {
    pierwszaGrupa.godzinaRozpoczecia = normalizujGodzine(godziny[1])
    pierwszaGrupa.godzinaZakonczenia = normalizujGodzine(godziny[2])
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'godziny', 'grupy.0.godzinaRozpoczecia')
    rozpoznanePola.push('grupy.0.godzinaZakonczenia')
  }

  const liczbaGodzin = znajdzPoEtykiecie(tresc, ['Liczba godzin', 'Godziny szkolenia'])
  if (liczbaGodzin) {
    pierwszaGrupa.liczbaGodzin = znajdzNumer(liczbaGodzin)
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'liczba godzin', 'grupy.0.liczbaGodzin')
  }

  const cena = znajdzPoEtykiecie(tresc, ['Cena netto', 'Cena', 'Wartość netto'])
  if (cena) {
    pierwszaGrupa.cenaNetto = znajdzNumer(cena)
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'cena', 'grupy.0.cenaNetto')
  }

  const vat = znajdzPoEtykiecie(tresc, ['VAT', 'Stawka VAT'])
  if (vat || trescNormalna.includes('vat')) {
    pierwszaGrupa.vat = parsujVat(vat || tresc)
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'VAT', 'grupy.0.vat')
  }

  const protokol = znajdzPoEtykiecie(tresc, ['Protokół', 'Protokol'])
  if (protokol) {
    daneFormularza.protokol = protokol
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'protokół', 'protokol')
  }

  const raport = znajdzPoEtykiecie(tresc, ['Raport'])
  if (raport) {
    daneFormularza.raport = raport
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'raport', 'raport')
  }

  const sposobFaktury = znajdzPoEtykiecie(tresc, ['Sposób faktury', 'Faktura'])
  const emailFaktury = znajdzPoEtykiecie(tresc, ['E-mail do faktury', 'Email do faktury', 'Mail do faktury'])
  if (sposobFaktury || emailFaktury) {
    daneFormularza.faktura = {
      sposob: sposobFaktury,
      email: emailFaktury || znajdzEmail(sposobFaktury),
      uwagi: '',
    }
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'faktura', 'faktura.email')
  }

  const nabywca = znajdzPoEtykiecie(tresc, ['Nabywca'])
  const nip = znajdzPoEtykiecie(tresc, ['NIP'])
  const adresNabywcy = znajdzPoEtykiecie(tresc, ['Adres nabywcy'])
  if (nabywca || nip || adresNabywcy) {
    daneFormularza.nabywca = {
      nazwa: nabywca,
      nip,
      adres: adresNabywcy,
    }
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'dane nabywcy', 'nabywca.nazwa')
    if (nip) {
      rozpoznanePola.push('nabywca.nip')
    }
  }

  const odbiorca = znajdzPoEtykiecie(tresc, ['Odbiorca'])
  const adresOdbiorcy = znajdzPoEtykiecie(tresc, ['Adres odbiorcy'])
  if (odbiorca || adresOdbiorcy) {
    daneFormularza.odbiorca = {
      nazwa: odbiorca,
      nip,
      adres: adresOdbiorcy,
    }
    daneFormularza.czyNabywcaJestOdbiorca = !odbiorca || odbiorca === nabywca
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'dane odbiorcy', 'odbiorca.nazwa')
  }

  const liczbaUczestnikow = znajdzPoEtykiecie(tresc, ['Liczba uczestników', 'Uczestników', 'Liczba osób'])
  if (liczbaUczestnikow) {
    pierwszaGrupa.liczbaUczestnikow = znajdzNumer(liczbaUczestnikow)
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'liczba uczestników', 'grupy.0.liczbaUczestnikow')
  }

  const trener = znajdzPoEtykiecie(tresc, ['Trener', 'Prowadzący'])
  if (trener) {
    pierwszaGrupa.trenerzy = [
      {
        id: `trener-import-${Date.now()}`,
        imieNazwisko: trener,
        telefon: '',
        email: znajdzEmail(trener),
      },
    ]
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'trener', 'grupy.0.trenerzy')
  }

  const koordynator = znajdzPoEtykiecie(tresc, ['Koordynator klienta', 'Koordynator', 'Kontakt klienta'])
  if (koordynator) {
    daneFormularza.koordynatorKlienta = {
      imieNazwisko: koordynator.replace(znajdzEmail(koordynator), '').trim(),
      email: znajdzEmail(koordynator),
      telefon: koordynator.match(/\+?\d[\d\s-]{6,}/)?.[0]?.trim() ?? '',
    }
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'koordynator klienta', 'koordynatorKlienta.imieNazwisko')
  }

  const lokalizacja = znajdzPoEtykiecie(tresc, ['Lokalizacja', 'Miejsce', 'Adres szkolenia'])
  if (lokalizacja) {
    pierwszaGrupa.nazwaLokalizacji = lokalizacja
    pierwszaGrupa.adresLokalizacji = lokalizacja
    pierwszaGrupa.formaSzkolenia = trescNormalna.includes('online') ? 'Online' : 'Stacjonarne'
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'lokalizacja', 'grupy.0.nazwaLokalizacji')
  }

  const sekcjaDlaKasi = pobierzSekcje(tresc, ['DLA KASI', 'Dla Kasi'])
  if (sekcjaDlaKasi) {
    daneFormularza.materialy = sekcjaDlaKasi
    daneFormularza.dokumentacja = {
      listaObecnosci: true,
      ankiety: /ankiet/i.test(sekcjaDlaKasi),
      certyfikaty: /certyfikat/i.test(sekcjaDlaKasi),
      program: /program/i.test(sekcjaDlaKasi),
      kartaInformacyjna: /karta/i.test(sekcjaDlaKasi),
      materialyInspekcyjne: /inspek/i.test(sekcjaDlaKasi),
      podreczniki: /podr[eę]cz/i.test(sekcjaDlaKasi),
      materialyDodatkowe: /materia/i.test(sekcjaDlaKasi),
      testPrzedPo: /test/i.test(sekcjaDlaKasi),
      dostepnoscCyfrowa: /dost[eę]pno/i.test(sekcjaDlaKasi),
      kompletDlaZamawiajacego: /\+1|komplet/i.test(sekcjaDlaKasi),
      wzorKlienta: /wz[oó]r klienta/i.test(sekcjaDlaKasi),
      sposobDokumentu: /online/i.test(sekcjaDlaKasi) ? 'online' : 'druk',
      uwagi: sekcjaDlaKasi,
    }
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'dokumentacja i materiały', 'materialy')
  }

  const sekcjaDlaKacpra = pobierzSekcje(tresc, ['DLA KACPRA', 'Dla Kacpra'])
  if (sekcjaDlaKacpra) {
    daneFormularza.adresPaczkiWspolny = sekcjaDlaKacpra
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'adres paczki', 'adresPaczkiWspolny')
  }

  const uwagiDlaTrenera = pobierzSekcje(tresc, ['UWAGI DLA TRENERA', 'Dla trenera'])
  if (uwagiDlaTrenera) {
    daneFormularza.uwagi = {
      wewnetrzne: '',
      informacjeNiepewne: '',
      opiekuna: '',
      dlaKlienta: '',
      dlaTrenera: uwagiDlaTrenera,
      dlaWysylaczy: '',
    }
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'uwagi dla trenera', 'uwagi.dlaTrenera')
  }

  const czyWczesniejszyPrzyjazd = /wcze[sś]niejsz(y|ego) przyjazd|przyjazd.*wcze[sś]niej/i.test(tresc)
  const czyKary = /kar(a|y).*nietermin|nieterminowo/i.test(tresc)
  if (czyWczesniejszyPrzyjazd || czyKary) {
    daneFormularza.dodatkoweWymogi = {
      wczesniejszyPrzyjazdTrenera: czyWczesniejszyPrzyjazd,
      minutyWczesniej: czyWczesniejszyPrzyjazd ? znajdzNumer(tresc.match(/(\d+)\s*min/i)?.[0] ?? '30') : 0,
      dokumentacjaZdjęciowa: /zdj[eę]ci/i.test(tresc),
      karyZaNieterminowosc: czyKary,
      noweSzkolenieZaOcene: /nowe szkolenie.*ocen/i.test(tresc),
      kfs: /\bKFS\b/i.test(tresc),
      uwagi: '',
    }
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'dodatkowe wymogi', 'dodatkoweWymogi.uwagi')
  }

  const harmonogram = pobierzSekcje(tresc, ['HARMONOGRAM', 'Harmonogram'])
  if (harmonogram) {
    pierwszaGrupa.niestandardowaFormulaGodzin = harmonogram
    pierwszaGrupa.rodzajGodzin = 'niestandardowe'
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'harmonogram', 'grupy.0.niestandardowaFormulaGodzin')
  }

  const program = pobierzSekcje(tresc, ['PROGRAM SZKOLENIA', 'Program'])
  if (program) {
    daneFormularza.programSzkolenia = program
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'program szkolenia', 'programSzkolenia')
  }

  const sekcjaUczestnikow = pobierzSekcje(tresc, ['UCZESTNICY', 'Lista uczestników'])
  if (sekcjaUczestnikow) {
    const uczestnicy = parsujUczestnikow(sekcjaUczestnikow)
    pierwszaGrupa.uczestnicy = uczestnicy
    pierwszaGrupa.liczbaUczestnikow = uczestnicy.length
    dodajRozpoznanie(rozpoznaneObszary, rozpoznanePola, 'uczestnicy', 'grupy.0.uczestnicy')
  }

  if (!tytul && tresc.trim()) {
    polaNiepewne.push('tytulSzkolenia')
  }

  return {
    daneFormularza,
    pierwszaGrupa,
    rozpoznaneObszary,
    rozpoznanePola,
    polaNiepewne,
  }
}
