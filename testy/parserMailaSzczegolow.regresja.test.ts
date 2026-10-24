import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { parsujMailaSzczegolow } from '../src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/parserMailaSzczegolow.ts'
import { przygotujMapowanieImportuMaila } from '../src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/mapowanieImportuMaila.ts'
import { poczatkowaGrupa, poczatkoweDaneFormularza } from '../src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts'
import { daneStartoweUzytkownikow } from '../src/kartoteki/uzytkownicy/daneUzytkownikow.ts'

const tytul = 'Wartościowanie stanowisk pracy'
const tematZMetadanymi = `08.10.2026 szczegóły organizacyjne Urząd Miejski w Gdańsku, „${tytul}”, Kościerzyna, Potok`

test('temat z metadanymi daje tylko tytuł w cudzysłowie i niepewny termin, bez trenera', () => {
  const wynik = parsujMailaSzczegolow(`Temat: ${tematZMetadanymi}`)
  assert.equal(wynik.daneFormularza.tytulSzkolenia, tytul)
  assert.equal(wynik.pierwszaGrupa.dataOd, '2026-10-08')
  assert.equal(wynik.pierwszaGrupa.dataDo, '2026-10-08')
  assert.equal(wynik.pierwszaGrupa.trenerzy, undefined)
  assert.equal(wynik.pierwszaGrupa.miejsce, undefined)
  assert.deepEqual(wynik.polaNiepewne, ['tytulSzkolenia', 'grupy.0.dataOd', 'grupy.0.dataDo'])
  assert.ok(wynik.rozpoznanePola.includes('tytulSzkolenia'))
})

for (const etykieta of ['Tytuł szkolenia', 'Temat szkolenia', 'Nazwa szkolenia', 'Nazwa kursu', 'Szkolenie']) {
  for (const wartosc of [` ${tytul}`, `\n\n${tytul}`]) {
    test(`jawna etykieta ${etykieta} ma pierwszeństwo także z wartością pod etykietą: ${JSON.stringify(wartosc)}`, () => {
      for (const tresc of [
        `Temat: Szczegóły organizacyjne szkolenia\n\n${etykieta}:${wartosc}`,
        `Temat: Szczegóły organizacyjne\n${etykieta}:${wartosc}`,
        `Temat: ${tematZMetadanymi}\n${etykieta}:${wartosc}`,
        `${etykieta}:${wartosc}\nTemat: ${tematZMetadanymi}`,
        `${etykieta}:${wartosc}`,
      ]) {
        const wynik = parsujMailaSzczegolow(tresc)
        assert.equal(wynik.daneFormularza.tytulSzkolenia, tytul)
        assert.ok(!wynik.polaNiepewne.includes('tytulSzkolenia'))
      }
    })
  }
}

test('prosty temat jest niepewnym źródłem tytułu', () => {
  const wynik = parsujMailaSzczegolow(`Temat: ${tytul}`)
  assert.equal(wynik.daneFormularza.tytulSzkolenia, tytul)
  assert.deepEqual(wynik.polaNiepewne, ['tytulSzkolenia'])
})

for (const temat of [
  'RE: szczegóły organizacyjne – Urząd Miejski w Gdańsku',
  'szczegoly organizacyjne Urząd Miejski',
  'Potwierdzenie szkolenia', 'Zamówienie szkolenia', 'Zamowienie szkolenia', 'Oferta szkolenia',
  'FW: Wartościowanie stanowisk pracy', 'FWD: Wartościowanie stanowisk pracy',
  'Odp: Wartościowanie stanowisk pracy',
  '08.10.2026 Urząd Miejski, Kościerzyna, Potok',
  'Potok', 'Umowa „AB/2026/123”', 'Kontakt „biuro@urzad.pl”',
  'Adres „ul. Długa 12”', 'Kod „AB CD 123/2026”',
  'Szkolenie „Pierwszy tytuł” i „Drugi tytuł”',
]) {
  test(`odrzuca korespondencję lub niejednoznaczny tytuł: ${temat}`, () => {
    const wynik = parsujMailaSzczegolow(`Temat: ${temat}`)
    assert.equal(wynik.daneFormularza.tytulSzkolenia, undefined)
    assert.ok(!wynik.rozpoznanePola.includes('tytulSzkolenia'))
  })
}

for (const [otwarcie, zamkniecie] of [['„', '”'], ['"', '"'], ["'", "'"]]) {
  test(`rozpoznaje cudzysłów ${otwarcie}${zamkniecie} w temacie`, () => {
    const wynik = parsujMailaSzczegolow(`Temat: 08.10.2026 szczegóły organizacyjne, ${otwarcie}${tytul}${zamkniecie}, Potok`)
    assert.equal(wynik.daneFormularza.tytulSzkolenia, tytul)
    assert.ok(wynik.polaNiepewne.includes('tytulSzkolenia'))
  })
}

test('wzorzec szkolenie pt. w treści wygrywa z tematem, dowolny cytat w treści jest pomijany', () => {
  const wynik = parsujMailaSzczegolow(`Temat: „Inny tytuł szkolenia”\nZapraszamy na szkolenie pt. „${tytul}”.`)
  assert.equal(wynik.daneFormularza.tytulSzkolenia, tytul)
  assert.ok(wynik.polaNiepewne.includes('tytulSzkolenia'))
  assert.match(wynik.ostrzezenia?.join(' ') ?? '', /Inny tytuł szkolenia/)
  assert.equal(parsujMailaSzczegolow(`Proszę odpisać „Wszystko w porządku”`).daneFormularza.tytulSzkolenia, undefined)
  assert.equal(parsujMailaSzczegolow(`Tytuł szkolenia: Jawny tytuł\nSzkolenie pt. „${tytul}”`).daneFormularza.tytulSzkolenia, 'Jawny tytuł')
})

test('normalizuje nagłówki Outlooka/Gmaila, puste linie, CRLF i twarde spacje', () => {
  for (const naglowki of [
    `Od: Trener: Jan Kowalski\nDo: szkolenia@firma.pl\nDW: biuro@firma.pl\nData: 01.10.2026\nTemat:\n\n${tematZMetadanymi}\nZałączniki: szkolenie.pdf`,
    `From: Jan Kowalski\nTo: szkolenia@firma.pl\nCc: biuro@firma.pl\nSent: 01.10.2026\nSubject: ${tematZMetadanymi}\nAttachments: szkolenie.pdf`,
  ]) {
    const wynik = parsujMailaSzczegolow(`${naglowki}\n\nTytuł szkolenia:\n${tytul}`.replace(/\n/g, '\r\n').replace(/: /g, ':\u00a0'))
    assert.equal(wynik.daneFormularza.tytulSzkolenia, tytul)
    assert.equal(wynik.pierwszaGrupa.dataOd, '2026-10-08')
    assert.equal(wynik.pierwszaGrupa.trenerzy, undefined)
  }
})

test('pusta etykieta nie połyka następnej etykiety lub nagłówka', () => {
  for (const separator of [': ', ' – ', ' - ']) {
    const wynik = parsujMailaSzczegolow(`Tytuł szkolenia:\n\nForma${separator}Stacjonarne\nTrener:\nMiejsce${separator}Gdańsk`)
    assert.equal(wynik.daneFormularza.tytulSzkolenia, undefined)
    assert.equal(wynik.pierwszaGrupa.trenerzy, undefined)
    assert.equal(wynik.pierwszaGrupa.formaSzkolenia, 'Stacjonarne')
    assert.equal(wynik.pierwszaGrupa.miejsce, 'Gdańsk')
  }
  assert.equal(parsujMailaSzczegolow('Tytuł szkolenia:\nTemat: Szczegóły organizacyjne').daneFormularza.tytulSzkolenia, undefined)
  assert.equal(parsujMailaSzczegolow('Temat:\nTytuł szkolenia: Właściwy tytuł').daneFormularza.tytulSzkolenia, 'Właściwy tytuł')
  assert.deepEqual(parsujMailaSzczegolow(''), { daneFormularza: {}, pierwszaGrupa: {}, rozpoznaneObszary: [], rozpoznanePola: [], polaNiepewne: [] })
})

const polaStandardowe = [
  ['Tytuł szkolenia', tytul], ['Klient', 'Urząd Miejski'],
  ['Data od', '09.10.2026'], ['Data do', '10.10.2026'], ['Forma szkolenia', 'Stacjonarne'],
  ['Miejsce', 'Kościerzyna'], ['Trener', 'Jan Kowalski jan@firma.pl'],
  ['Liczba godzin', '8'], ['Liczba uczestników', '20'], ['Cena netto', '1 500,50 PLN'],
  ['VAT', '23%'], ['Termin płatności', '14 dni'], ['Numer umowy', 'UM/2026/10'], ['Data umowy', '01.10.2026'],
  ['Nabywca', 'Urząd Miejski'], ['NIP nabywcy', '1234567890'], ['Ulica nabywcy', 'Długa'],
  ['Nr budynku nabywcy', '1'], ['Nr lokalu nabywcy', '2'], ['Kod pocztowy nabywcy', '80-001'],
  ['Miasto nabywcy', 'Gdańsk'], ['Kraj nabywcy', 'Polska'], ['Osoba kontaktowa nabywcy', 'Anna Nowak'],
  ['Telefon nabywcy', '+48 123 456 789'], ['Email nabywcy', 'biuro@urzad.pl'],
  ['Odbiorca', 'Jednostka odbiorcy'], ['Ulica odbiorcy', 'Krótka'], ['Nr budynku odbiorcy', '3'],
  ['Nr lokalu odbiorcy', '4'], ['Kod pocztowy odbiorcy', '83-400'], ['Miasto odbiorcy', 'Kościerzyna'],
  ['Kraj odbiorcy', 'Polska'], ['Imię i nazwisko odbiorcy', 'Piotr Nowak'],
  ['Telefon odbiorcy', '+48 987 654 321'], ['Email odbiorcy', 'odbiorca@firma.pl'],
]

for (const separator of [' ', '\n\n']) {
  test(`zachowuje import standardowych pól, separator wartości ${JSON.stringify(separator)}`, () => {
    const wynik = parsujMailaSzczegolow(`Temat: ${tematZMetadanymi}\n${polaStandardowe.map(([etykieta, wartosc]) => `${etykieta}:${separator}${wartosc}`).join('\n')}`)
    assert.equal(wynik.daneFormularza.tytulSzkolenia, tytul)
    assert.equal(wynik.daneFormularza.nazwaKlienta, 'Urząd Miejski')
    assert.deepEqual(wynik.pierwszaGrupa, {
      trenerzy: [{ id: wynik.pierwszaGrupa.trenerzy?.[0].id, imieNazwisko: 'Jan Kowalski', email: 'jan@firma.pl', telefon: '' }],
      dataOd: '2026-10-09', dataDo: '2026-10-10', formaSzkolenia: 'Stacjonarne', miejsce: 'Kościerzyna',
      liczbaGodzin: 8, liczbaUczestnikow: 20, cenaNetto: 1500.5, vat: 'Nie – 23%',
      terminPlatnosci: 14, numerUmowy: 'UM/2026/10', dataUmowy: '2026-10-01',
    })
    assert.deepEqual(wynik.daneFormularza.nabywca, {
      nazwa: 'Urząd Miejski', nip: '1234567890', ulica: 'Długa', nrBudynku: '1', nrLokalu: '2',
      kodPocztowy: '80-001', miasto: 'Gdańsk', kraj: 'Polska', osobaKontaktowa: 'Anna Nowak',
      telefon: '+48 123 456 789', email: 'biuro@urzad.pl',
    })
    assert.deepEqual(wynik.daneFormularza.odbiorca, {
      nazwa: 'Jednostka odbiorcy', ulica: 'Krótka', nrBudynku: '3', nrLokalu: '4', kodPocztowy: '83-400',
      miasto: 'Kościerzyna', kraj: 'Polska', imieNazwiskoOdbiorcy: 'Piotr Nowak', telefon: '+48 987 654 321', email: 'odbiorca@firma.pl',
    })
    assert.equal(wynik.daneFormularza.czyNabywcaJestOdbiorca, false)
    assert.deepEqual(wynik.polaNiepewne, ['grupy.0.dataOd', 'grupy.0.dataDo'])
  })
}

test('zachowuje formę online, VAT zwolniony i niepewną datę końcową przy pojedynczym terminie', () => {
  const wynik = parsujMailaSzczegolow('Termin: 08.10.2026\nForma: Online\nVAT: ZW 100%')
  assert.equal(wynik.pierwszaGrupa.formaSzkolenia, 'Online')
  assert.equal(wynik.pierwszaGrupa.miejsce, 'Online')
  assert.equal(wynik.pierwszaGrupa.vat, 'ZW – 100%')
  assert.deepEqual(wynik.polaNiepewne, ['grupy.0.dataDo'])
})

test('nie uzupełnia końca terminu sprzeczną datą z tematu, jeśli treść podaje początek', () => {
  const wynik = parsujMailaSzczegolow(`Temat: ${tematZMetadanymi}\nData od: 09.10.2026`)
  assert.equal(wynik.pierwszaGrupa.dataOd, '2026-10-09')
  assert.equal(wynik.pierwszaGrupa.dataDo, undefined)
})

const mailDyspozycji = readFileSync(new URL('./fixtures/mailDyspozycjeMaterialowe.txt', import.meta.url), 'utf8')

test('mail o strukturze wiadomości Dawida Chyły: pięć dyspozycji i odbiorca, bez danych hotelu i instrukcji zwrotu', () => {
  const wynik = parsujMailaSzczegolow(mailDyspozycji)
  assert.deepEqual(wynik.daneFormularza.dyspozycjeMaterialowe, {
    materialySzkoleniowe: { formaPrzekazania: 'online', tekstZrodlowy: 'online', status: 'zaimportowane' },
    certyfikaty: { terminPrzekazania: 'po_szkoleniu', tekstZrodlowy: 'po szkoleniu', status: 'zaimportowane' },
    listaObecnosci: { formaPrzekazania: 'papierowa', sposobPrzygotowania: 'drukuje_klient', tekstZrodlowy: 'drukuje Klient', status: 'zaimportowane' },
    materialyDodatkowe: { formaPrzekazania: 'papierowa', tekstZrodlowy: 'druk', status: 'zaimportowane' },
    ankiety: { formaPrzekazania: 'papierowa', sposobPrzygotowania: 'drukuje_klient', tekstZrodlowy: 'drukuje Klient', status: 'zaimportowane' },
  })
  assert.deepEqual(wynik.daneFormularza.odbiorcaPaczki, {
    nazwaFirmy: 'Przykładowy Urząd', ulica: 'Przykładowa', nrBudynku: '8', nrLokalu: '',
    kodPocztowy: '00-001', miasto: 'Miasto Testowe', kraj: 'Polska', imieNazwisko: 'Anna Testowa',
    telefon: '+48 000000001', email: 'kontakt@example.org',
  })
  assert.equal(wynik.daneFormularza.wysylkaPaczkiDotyczy, true)
  assert.equal(wynik.daneFormularza.zrodloImportuMaila, mailDyspozycji)
  assert.equal(wynik.daneFormularza.nazwaKlienta, 'Przykładowy Urząd')
  assert.equal(wynik.pierwszaGrupa.nazwa, 'Grupa 1')
  assert.equal(wynik.pierwszaGrupa.dataOd, '2026-10-26')
  assert.equal(wynik.pierwszaGrupa.trenerzy?.[0].imieNazwisko, 'Jan Testowy')
  assert.equal(wynik.pierwszaGrupa.liczbaGodzin, 8)
  assert.equal(wynik.pierwszaGrupa.liczbaUczestnikow, 30)
  assert.equal(wynik.pierwszaGrupa.cenaNetto, 6500)
  assert.equal(wynik.pierwszaGrupa.formaSzkolenia, undefined)
  assert.equal(wynik.daneFormularza.uwagi, undefined)
  assert.ok(!wynik.polaNiepewne.some((pole) => /dyspozycje|odbiorcaPaczki/.test(pole)))
})

for (const [etykieta, wartosc, rodzaj, oczekiwane] of [
  ['MAT. SZKOL.', 'ON-LINE', 'materialySzkoleniowe', { formaPrzekazania: 'online' }],
  ['materialy szkoleniowe', 'w wersji elektronicznej PDF', 'materialySzkoleniowe', { formaPrzekazania: 'online' }],
  ['Cert.', 'po zakonczeniu szkolenia', 'certyfikaty', { terminPrzekazania: 'po_szkoleniu' }],
  ['Zaświadczenia', 'przed szkoleniem', 'certyfikaty', { terminPrzekazania: 'przed_szkoleniem' }],
  ['Lista obecnosci', 'wydruk po stronie Klienta', 'listaObecnosci', { formaPrzekazania: 'papierowa', sposobPrzygotowania: 'drukuje_klient' }],
  ['L.O.', 'Zamawiający drukuje', 'listaObecnosci', { formaPrzekazania: 'papierowa', sposobPrzygotowania: 'drukuje_klient' }],
  ['Mat. dod.', 'papierowe', 'materialyDodatkowe', { formaPrzekazania: 'papierowa' }],
  ['Ankiety ewaluacyjne', 'drukuje organizator', 'ankiety', { formaPrzekazania: 'papierowa', sposobPrzygotowania: 'drukuje_organizator' }],
] as const) {
  test(`wariant dyspozycji ${etykieta}: ${wartosc}`, () => {
    const wynik = parsujMailaSzczegolow(`${etykieta}: ${wartosc}`)
    assert.deepEqual(wynik.daneFormularza.dyspozycjeMaterialowe?.[rodzaj], { ...oczekiwane, tekstZrodlowy: wartosc, status: 'zaimportowane' })
    assert.deepEqual(wynik.pierwszaGrupa, {})
  })
}

for (const formatuj of [
  (tekst: string) => tekst.replace(/: /g, ':\u00a0\u00a0').replace(/\n/g, '\r\n'),
  (tekst: string) => tekst.replace(/^(.+?):/gm, '**$1:**').replace(/: /g, ':\n\n'),
  (tekst: string) => `<html><head><style>.MsoNormal { color: red; }</style></head><body>${tekst.split('\n').map((wiersz) => `<p class="MsoNormal"><b>${wiersz.replace(/ /g, '&nbsp;')}</b><o:p>&#160;</o:p></p>`).join('')}</body></html>`,
  (tekst: string) => `<div class="gmail_default">${tekst.replace(/\n/g, '<br>').replace(/ł/g, '&#322;').replace(/ /g, '&#x20;')}</div>`,
]) {
  test('normalizacja Outlooka, Gmaila i Markdown zachowuje dyspozycje oraz źródło', () => {
    const tresc = formatuj(mailDyspozycji)
    const wynik = parsujMailaSzczegolow(tresc)
    const wzorzec = parsujMailaSzczegolow(mailDyspozycji)
    assert.deepEqual(wynik.daneFormularza.dyspozycjeMaterialowe, wzorzec.daneFormularza.dyspozycjeMaterialowe)
    assert.deepEqual(wynik.daneFormularza.odbiorcaPaczki, wzorzec.daneFormularza.odbiorcaPaczki)
    assert.equal(wynik.daneFormularza.zrodloImportuMaila, tresc)
    assert.equal(wynik.pierwszaGrupa.dataOd, '2026-10-26')
  })
}

test('etykiety podzielone na wiersze, tabele HTML i puste wartości nie połykają kolejnych etykiet', () => {
  const wynik = parsujMailaSzczegolow(`<table><tr><td>Materiały<br>szkoleniowe:</td><td>ONLINE</td></tr>
    <tr><td>Lista<br>obecności:</td><td>drukuje Klient</td></tr></table>
    Certyfikaty:
    Materiały
    dodatkowe:
    druk
    Trener
    Prowadzacy:
    Jan Testowy
    Liczba
    uczestnikow:
    20`)
  assert.equal(wynik.daneFormularza.dyspozycjeMaterialowe?.materialySzkoleniowe?.formaPrzekazania, 'online')
  assert.equal(wynik.daneFormularza.dyspozycjeMaterialowe?.listaObecnosci?.sposobPrzygotowania, 'drukuje_klient')
  assert.equal(wynik.daneFormularza.dyspozycjeMaterialowe?.materialyDodatkowe?.formaPrzekazania, 'papierowa')
  assert.equal(wynik.daneFormularza.dyspozycjeMaterialowe?.certyfikaty, undefined)
  assert.equal(wynik.pierwszaGrupa.trenerzy?.[0].imieNazwisko, 'Jan Testowy')
  assert.equal(wynik.pierwszaGrupa.liczbaUczestnikow, 20)
})

test('forma szkolenia jest niezależna od dyspozycji materiałów i listy uczestników', () => {
  const wynik = parsujMailaSzczegolow('Forma szkolenia: Stacjonarne\nMateriały szkoleniowe: online\nLista uczestników: po szkoleniu')
  assert.equal(wynik.pierwszaGrupa.formaSzkolenia, 'Stacjonarne')
  assert.equal(wynik.daneFormularza.dyspozycjeMaterialowe?.materialySzkoleniowe?.formaPrzekazania, 'online')
  assert.equal(wynik.daneFormularza.dyspozycjeMaterialowe?.listaObecnosci, undefined)
})

test('nie uzupełnia braków pierwszej grupy wartościami drugiej grupy', () => {
  const wynik = parsujMailaSzczegolow(`Grupa 1
    Data: 26.10.2026
    Trener Prowadzący: Jan Testowy
    Materiały: online
    Grupa 2
    Data: 27.10.2026
    Nazwa firmy: Drugi klient
    Cena: 9000
    Liczba uczestników: 100
    Liczba godzin: 16
    Materiały: druk
    Adres wysyłki:
    Drugi odbiorca
    ul. Inna 1
    00-009 Inne Miasto`)
  assert.equal(wynik.pierwszaGrupa.dataOd, '2026-10-26')
  assert.equal(wynik.pierwszaGrupa.cenaNetto, undefined)
  assert.equal(wynik.pierwszaGrupa.liczbaUczestnikow, undefined)
  assert.equal(wynik.pierwszaGrupa.liczbaGodzin, undefined)
  assert.equal(wynik.daneFormularza.nazwaKlienta, undefined)
  assert.equal(wynik.daneFormularza.odbiorcaPaczki, undefined)
  assert.equal(wynik.daneFormularza.dyspozycjeMaterialowe?.materialySzkoleniowe?.formaPrzekazania, 'online')
})

for (const naglowek of ['DLA KACPRA: Materiały na adres:', 'Adres wysyłki:', 'Adres do dostawy:', 'Dane odbiorcy paczki:', 'Wysyłka materiałów:']) {
  test(`sekcja wysyłkowa ${naglowek} odseparowana od szkolenia i hotelu`, () => {
    const wynik = parsujMailaSzczegolow(`Adres szkolenia: ul. Szkolenia 1\n${naglowek}
      Nazwa firmy: Odbiorca Testowy
      Adres: ul. Paczkowa 7/2, 00-004 Miasto Paczki
      Osoba kontaktowa: Anna Testowa
      Telefon: +48 000 000 003
      E-mail: paczka@example.org
      Hotel:
      Nazwa firmy: Hotel Testowy
      Adres: ul. Hotelowa 99
      00-005 Miasto Hotelu
      Email: hotel@example.org`)
    assert.equal(wynik.daneFormularza.odbiorcaPaczki?.nazwaFirmy, 'Odbiorca Testowy')
    assert.equal(wynik.daneFormularza.odbiorcaPaczki?.ulica, 'Paczkowa')
    assert.equal(wynik.daneFormularza.odbiorcaPaczki?.nrLokalu, '2')
    assert.equal(wynik.daneFormularza.odbiorcaPaczki?.miasto, 'Miasto Paczki')
    assert.equal(wynik.daneFormularza.odbiorcaPaczki?.email, 'paczka@example.org')
    assert.equal(wynik.pierwszaGrupa.miejsce, 'ul. Szkolenia 1')
    assert.equal(wynik.daneFormularza.nazwaKlienta, undefined)
  })
}

for (const wartosc of ['online lub druk', 'do ustalenia', 'drukuje Klient?', 'nie drukuje Klient']) {
  test(`niejednoznaczna dyspozycja wymaga potwierdzenia: ${wartosc}`, () => {
    const wynik = parsujMailaSzczegolow(`Ankiety: ${wartosc}`)
    assert.equal(wynik.daneFormularza.dyspozycjeMaterialowe?.ankiety?.status, 'niepewne')
    assert.equal(wynik.daneFormularza.dyspozycjeMaterialowe?.ankiety?.tekstZrodlowy, wartosc)
    assert.ok(wynik.polaNiepewne.includes('dyspozycjeMaterialowe.ankiety'))
  })
}

test('sprzeczne dyspozycje i odbiorcy wymagają potwierdzenia, bez arbitralnego wyboru formy', () => {
  const wynik = parsujMailaSzczegolow(`Ankiety: online\nAnkiety: druk
    Adres wysyłki:
    Firma Pierwsza
    ul. Pierwsza 1
    00-001 Miasto Pierwsze
    Adres wysyłki:
    Firma Druga
    ul. Druga 2
    00-002 Miasto Drugie`)
  assert.equal(wynik.daneFormularza.dyspozycjeMaterialowe?.ankiety?.formaPrzekazania, undefined)
  assert.equal(wynik.daneFormularza.dyspozycjeMaterialowe?.ankiety?.status, 'niepewne')
  assert.ok(wynik.polaNiepewne.includes('odbiorcaPaczki.nazwaFirmy'))
  assert.ok(wynik.polaNiepewne.includes('odbiorcaPaczki.ulica'))
})

test('grupy z nazwą pod etykietą zachowują granice także bez numeracji', () => {
  const wynik = parsujMailaSzczegolow('Grupa:\nPoranna\nData: 26.10.2026\nNazwa grupy:\nPopołudniowa\nCena: 2000\nLiczba godzin: 4')
  assert.equal(wynik.pierwszaGrupa.nazwa, 'Poranna')
  assert.equal(wynik.pierwszaGrupa.cenaNetto, undefined)
  assert.equal(wynik.pierwszaGrupa.liczbaGodzin, undefined)
})

test('adres szkolenia po sekcji wysyłki nie staje się częścią adresu odbiorcy', () => {
  const wynik = parsujMailaSzczegolow(`Adres wysyłki:
    Firma Paczki
    Paczkowa 8
    00-001 Miasto Paczki
    Kontakt: Anna Testowa
    Adres szkolenia: ul. Szkolenia 2
    Forma szkolenia: Stacjonarne
    Hotel:
    ul. Hotelowa 3`)
  assert.equal(wynik.daneFormularza.odbiorcaPaczki?.ulica, 'Paczkowa')
  assert.equal(wynik.daneFormularza.odbiorcaPaczki?.nrBudynku, '8')
  assert.equal(wynik.pierwszaGrupa.miejsce, 'ul. Szkolenia 2')
  assert.equal(wynik.pierwszaGrupa.formaSzkolenia, 'Stacjonarne')
})

test('nierozstrzygnięta liczba nie zapisuje NaN ani nie połyka następnej etykiety', () => {
  const wynik = parsujMailaSzczegolow('Cena: do ustalenia\nLiczba uczestników:\nLiczba\ngodzin:\n8')
  assert.equal(wynik.pierwszaGrupa.cenaNetto, undefined)
  assert.ok(wynik.polaNiepewne.includes('grupy.0.cenaNetto'))
  assert.equal(wynik.pierwszaGrupa.liczbaUczestnikow, undefined)
  assert.equal(wynik.pierwszaGrupa.liczbaGodzin, 8)
})

const mailReferencyjny = readFileSync(new URL('./fixtures/mailOrganizacyjnyV4.txt', import.meta.url), 'utf8')
const trenerReferencyjny = { id: 'trener-kartoteka-17', imieNazwisko: 'Renata Stefaniuk', email: 'trener@example.org', telefon: '123456789' }
const kartotekiReferencyjne = {
  trenerzy: [trenerReferencyjny],
  opiekunowie: daneStartoweUzytkownikow,
  czyLokalizacjaPotwierdzona: (miejsce: string) => miejsce.endsWith('39-300 Mielec'),
}

test('referencyjna wiadomość V4 mapuje 11 oczekiwanych danych i rozdziela role adresów', () => {
  const wynik = parsujMailaSzczegolow(mailReferencyjny, kartotekiReferencyjne)
  assert.equal(wynik.daneFormularza.nazwaKlienta, 'Polskie Zakłady Lotnicze Sp. z o.o.')
  assert.equal(wynik.daneFormularza.opiekunId, 'Dawid')
  assert.equal(wynik.daneFormularza.tytulSzkolenia, 'Lean management i kaizen - system ciągłego doskonalenia w organizacji')
  assert.deepEqual(wynik.pierwszaGrupa.trenerzy, [trenerReferencyjny])
  assert.equal(wynik.pierwszaGrupa.miejsce, 'Hotel Bulwary, ul. Rzeczna 8, 39-300 Mielec')
  assert.equal(wynik.pierwszaGrupa.cenaNetto, 8700)
  assert.equal(wynik.pierwszaGrupa.vat, 'Nie – 23%')
  assert.equal(wynik.pierwszaGrupa.dataOd, '2026-10-28')
  assert.equal(wynik.pierwszaGrupa.dataDo, '2026-10-29')
  assert.equal(wynik.pierwszaGrupa.liczbaUczestnikow, 19)
  assert.equal(wynik.pierwszaGrupa.terminPlatnosci, 60)
  assert.equal(wynik.daneFormularza.nabywca?.ulica, 'Wojska Polskiego')
  assert.equal(wynik.daneFormularza.nabywca?.nrBudynku, '3')
  assert.equal(wynik.daneFormularza.nabywca?.nip, '0000000000')
  assert.equal(wynik.daneFormularza.odbiorcaPaczki?.ulica, 'Dostawcza')
  assert.equal(wynik.daneFormularza.odbiorcaPaczki?.miasto, 'Kraków')
  assert.equal(wynik.daneFormularza.dyspozycjeMaterialowe?.listaObecnosci?.sposobPrzygotowania, 'drukuje_klient')
  assert.deepEqual(wynik.polaNiepewne, [])
})

for (const prefiks of ['dr', 'mgr', 'prof.', 'dr hab.', 'inż.', 'prof. dr hab. inż.']) {
  test(`dopasowuje trenera niezależnie od prefiksu ${prefiks}`, () => {
    const wynik = parsujMailaSzczegolow(`Prowadzący szkolenie: ${prefiks} Renata Stefaniuk`, kartotekiReferencyjne)
    assert.deepEqual(wynik.pierwszaGrupa.trenerzy, [trenerReferencyjny])
    assert.ok(!wynik.polaNiepewne.includes('grupy.0.trenerzy'))
  })
}

test('dwóch trenerów o tej samej nazwie i brak rekordu wymagają jednego wyboru, email rozstrzyga', () => {
  const drugi = { ...trenerReferencyjny, id: 'inny-trener', email: 'inny@example.org' }
  for (const trenerzy of [[], [trenerReferencyjny, drugi]]) {
    const wynik = parsujMailaSzczegolow('Trener: dr Renata Stefaniuk', { trenerzy })
    assert.equal(wynik.pierwszaGrupa.trenerzy?.[0].imieNazwisko, 'Renata Stefaniuk')
    assert.notEqual(wynik.pierwszaGrupa.trenerzy?.[0].id, trenerReferencyjny.id)
    assert.deepEqual(wynik.polaNiepewne, ['grupy.0.trenerzy'])
    assert.match(wynik.ostrzezenia?.join(' ') ?? '', /wybierz właściwą osobę/)
  }
  const wynik = parsujMailaSzczegolow('Trener: dr Renata Stefaniuk <inny@example.org>', { trenerzy: [trenerReferencyjny, drugi] })
  assert.deepEqual(wynik.pierwszaGrupa.trenerzy, [drugi])
})

test('jawny opiekun wygrywa z nadawcą, stopka jest źródłem zapasowym, a obcy nadawca nie wystarcza', () => {
  assert.equal(parsujMailaSzczegolow(`${mailReferencyjny}\n`, kartotekiReferencyjne).daneFormularza.opiekunId, 'Dawid')
  const jawny = parsujMailaSzczegolow(`Nadawca: Dawid Chyła <d.chyla@szkolenia-semper.pl>\nOpiekun szkolenia: k.zaremba@szkolenia-semper.pl`, kartotekiReferencyjne)
  assert.equal(jawny.daneFormularza.opiekunId, 'Kamila')
  const stopka = parsujMailaSzczegolow('Nadawca: Klient <klient@example.org>\nProgram szkolenia:\nModuł 1\n--\nDawid Chyła\nSpecjalista ds. projektów dedykowanych\nDział Szkoleń\nTrener: Fałszywy Trener', kartotekiReferencyjne)
  assert.equal(stopka.daneFormularza.opiekunId, 'Dawid')
  assert.equal(stopka.pierwszaGrupa.trenerzy, undefined)
  assert.equal(parsujMailaSzczegolow('Nadawca: Dawid Chyła <obcy@example.org>', kartotekiReferencyjne).daneFormularza.opiekunId, undefined)
  const nieznany = parsujMailaSzczegolow('Nadawca: Dawid Chyła <d.chyla@szkolenia-semper.pl>\nOpiekun: Inna Osoba', kartotekiReferencyjne)
  assert.equal(nieznany.daneFormularza.opiekunId, undefined)
  assert.deepEqual(nieznany.polaNiepewne, ['opiekunId'])
})

for (const termin of ['28-29.10.2026 r.', '28.10.2026 - 29.10.2026', '28–29 października 2026', '28-29.10.2026', '2026-10-28 – 2026-10-29']) {
  test(`poprawny zakres dat ${termin} potwierdzony przez temat`, () => {
    const wynik = parsujMailaSzczegolow(`Temat: 28-29.10.2026\nData: ${termin}`)
    assert.equal(wynik.pierwszaGrupa.dataOd, '2026-10-28')
    assert.equal(wynik.pierwszaGrupa.dataDo, '2026-10-29')
    assert.deepEqual(wynik.polaNiepewne, [])
  })
}

test('jednodniowy termin potwierdzony tematem nie wymaga akceptacji', () => {
  const wynik = parsujMailaSzczegolow('Temat: 28.10.2026\nData: 28.10.2026')
  assert.equal(wynik.pierwszaGrupa.dataDo, '2026-10-28')
  assert.deepEqual(wynik.polaNiepewne, [])
})

for (const termin of ['31.02.2026', '29.02.2026', '32-33.10.2026', '29-28.10.2026', '31.02.2026 - 01.03.2026']) {
  test(`odrzuca nieprawidłowy termin ${termin}`, () => {
    const wynik = parsujMailaSzczegolow(`Data szkolenia: ${termin}`)
    assert.equal(wynik.pierwszaGrupa.dataOd, undefined)
    assert.equal(wynik.pierwszaGrupa.dataDo, undefined)
    assert.ok(wynik.polaNiepewne.includes('grupy.0.dataOd'))
  })
}

test('konflikt dat pokazuje oba źródła, a daty hotelu, nagłówka i programu nie zmieniają terminu', () => {
  const wynik = parsujMailaSzczegolow(mailReferencyjny.replace('Data: 28-29.10.2026 r.', 'Data: 29-30.10.2026 r.'), kartotekiReferencyjne)
  assert.equal(wynik.pierwszaGrupa.dataOd, '2026-10-29')
  assert.equal(wynik.pierwszaGrupa.dataDo, '2026-10-30')
  assert.deepEqual(wynik.polaNiepewne, ['grupy.0.dataOd', 'grupy.0.dataDo'])
  assert.match(wynik.ostrzezenia?.join(' ') ?? '', /temat 2026-10-28 – 2026-10-29; treść 2026-10-29 – 2026-10-30/)
})

for (const kwota of ['8.700,00 zł', '8700,00 zł', '8 700,00 PLN', '8700 zł', '8.700 zł', '8.700,00 zł 23%', '8.700,00 zł VAT 23%']) {
  test(`rozpoznaje kwotę ${kwota} i oddziela VAT`, () => {
    const wynik = parsujMailaSzczegolow(`Cena netto: ${kwota}`)
    assert.equal(wynik.pierwszaGrupa.cenaNetto, 8700)
    assert.equal(wynik.pierwszaGrupa.vat, kwota.includes('23%') ? 'Nie – 23%' : undefined)
    assert.deepEqual(wynik.polaNiepewne, [])
  })
}

test('ogólna cena bez rodzaju wymaga potwierdzenia, brutto nie staje się netto, VAT ma własne źródło', () => {
  assert.deepEqual(parsujMailaSzczegolow('Cena: 8700 zł').polaNiepewne, ['grupy.0.cenaNetto'])
  assert.equal(parsujMailaSzczegolow('Cena: 8700 zł brutto 23%').pierwszaGrupa.cenaNetto, undefined)
  assert.equal(parsujMailaSzczegolow('Cena brutto: 8700 zł').pierwszaGrupa.cenaNetto, undefined)
  assert.equal(parsujMailaSzczegolow('Cena: VAT 23%').pierwszaGrupa.cenaNetto, undefined)
  const wynik = parsujMailaSzczegolow('Cena: 8700 zł 23%\nVAT: ZW 100%')
  assert.equal(wynik.pierwszaGrupa.vat, 'ZW – 100%')
  assert.ok(wynik.polaNiepewne.includes('grupy.0.vat'))
})

test('nazwy i adresy nie przechodzą między klientem, miejscem i wysyłką także przy powtórzeniu adresu', () => {
  const bezKlienta = parsujMailaSzczegolow('Materiały na adres:\nNazwa firmy: Firma dostawy\nul. Dostawcza 1\n00-001 Warszawa\nMiejsce szkolenia:\nHotel Bulwary\nul. Rzeczna 8\n39-300 Mielec', kartotekiReferencyjne)
  assert.equal(bezKlienta.daneFormularza.nazwaKlienta, undefined)
  assert.equal(bezKlienta.pierwszaGrupa.miejsce, 'Hotel Bulwary, ul. Rzeczna 8, 39-300 Mielec')
  assert.equal(bezKlienta.daneFormularza.odbiorcaPaczki?.nazwaFirmy, 'Firma dostawy')
  const powtorzony = parsujMailaSzczegolow('Nazwa firmy:\nFirma klienta\nul. Rzeczna 8\n39-300 Mielec\nMiejsce szkolenia:\nHotel Bulwary\nul. Rzeczna 8\n39-300 Mielec\nMateriały na adres:\nFirma wysyłki\nul. Rzeczna 8\n39-300 Mielec', kartotekiReferencyjne)
  assert.equal(powtorzony.daneFormularza.nazwaKlienta, 'Firma klienta')
  assert.equal(powtorzony.pierwszaGrupa.miejsce, 'Hotel Bulwary, ul. Rzeczna 8, 39-300 Mielec')
  assert.equal(powtorzony.daneFormularza.odbiorcaPaczki?.nazwaFirmy, 'Firma wysyłki')
  const niepewne = parsujMailaSzczegolow('Miejsce szkolenia: Nieznana miejscowość', { czyLokalizacjaPotwierdzona: () => false })
  assert.deepEqual(niepewne.polaNiepewne, ['grupy.0.miejsce'])
})

for (const prefiks of ['-', '–', '—']) {
  test(`normalizuje prefiks ${prefiks}, niewidoczne separatory i wielkość liter`, () => {
    const wynik = parsujMailaSzczegolow(`${prefiks}NAZWA\u00a0 FIRMY :\n\nFirma Testowa\n${prefiks}TRENER\u200b PROWADZĄCY : dr Renata Stefaniuk\n${prefiks}CENA : 8\u202f700,00 PLN 23%`, kartotekiReferencyjne)
    assert.equal(wynik.daneFormularza.nazwaKlienta, 'Firma Testowa')
    assert.equal(wynik.pierwszaGrupa.trenerzy?.[0].id, trenerReferencyjny.id)
    assert.equal(wynik.pierwszaGrupa.cenaNetto, 8700)
  })
}

test('ponowny import chroni ręczne poprawki i wyczyszczenia, nie zmienia dalszych grup ani statusów', () => {
  const wynik = parsujMailaSzczegolow(mailReferencyjny, kartotekiReferencyjne)
  const pierwszy = przygotujMapowanieImportuMaila(wynik, structuredClone(poczatkoweDaneFormularza), [structuredClone(poczatkowaGrupa)], {})
  const dane = { ...structuredClone(poczatkoweDaneFormularza), ...pierwszy.daneFormularza, nazwaKlienta: 'Ręczny klient', tytulSzkolenia: '', nabywca: { ...poczatkoweDaneFormularza.nabywca, ...pierwszy.daneFormularza.nabywca, ulica: 'Ręczna' } }
  const grupy = [{ ...structuredClone(poczatkowaGrupa), ...pierwszy.pierwszaGrupa, cenaNetto: 9999, trenerzy: [{ ...trenerReferencyjny, id: 'reczny-trener' }] }, { ...structuredClone(poczatkowaGrupa), id: 'grupa-2', cenaNetto: 777 }]
  const przed = structuredClone({ dane, grupy })
  const statusy = { ...pierwszy.statusyPol, nazwaKlienta: 'reczne' as const, tytulSzkolenia: 'reczne' as const, 'nabywca.ulica': 'reczne' as const, 'grupy.0.cenaNetto': 'reczne' as const, 'grupy.0.trenerzy': 'reczne' as const, 'grupy.1.cenaNetto': 'reczne' as const }
  const ponowny = przygotujMapowanieImportuMaila(wynik, dane, grupy, statusy)
  assert.equal(ponowny.daneFormularza.nazwaKlienta, undefined)
  assert.equal(ponowny.daneFormularza.tytulSzkolenia, undefined)
  assert.equal(ponowny.daneFormularza.nabywca?.ulica, undefined)
  assert.equal(ponowny.pierwszaGrupa.cenaNetto, undefined)
  assert.equal(ponowny.pierwszaGrupa.trenerzy, undefined)
  assert.equal(ponowny.pierwszaGrupa.dataOd, '2026-10-28')
  assert.equal(ponowny.statusyPol['grupy.1.cenaNetto'], 'reczne')
  assert.equal(ponowny.statusyPol.nazwaKlienta, 'reczne')
  assert.equal(ponowny.statusyPol['grupy.0.dataOd'], 'zaimportowane')
  assert.deepEqual({ dane, grupy }, przed)
  const bezStatusu = przygotujMapowanieImportuMaila(wynik, dane, grupy, {})
  assert.equal(bezStatusu.pierwszaGrupa.cenaNetto, undefined)
  assert.equal(bezStatusu.daneFormularza.nazwaKlienta, undefined)
})

test('odrębne grupy mają własnych trenerów, terminy i ceny, a brak pola nie dziedziczy go z sąsiedniej grupy', () => {
  const wynik = parsujMailaSzczegolow(`Tytuł szkolenia: Szkolenie wielu grup
Grupa 1
Data: 28-29.10.2026
Trener: Renata Stefaniuk
Cena netto: 8700
Grupa 2
Data: 30-31.10.2026
Cena netto: 2000
Grupa 3
Prowadzący szkolenie: Renata Stefaniuk
Liczba uczestników: 10`, kartotekiReferencyjne)
  assert.equal(wynik.pierwszaGrupa.cenaNetto, 8700)
  assert.equal(wynik.pozostaleGrupy?.[0].cenaNetto, 2000)
  assert.equal(wynik.pozostaleGrupy?.[0].dataOd, '2026-10-30')
  assert.equal(wynik.pozostaleGrupy?.[0].trenerzy, undefined)
  assert.equal(wynik.pozostaleGrupy?.[1].cenaNetto, undefined)
  assert.equal(wynik.pozostaleGrupy?.[1].dataOd, undefined)
  assert.equal(wynik.pozostaleGrupy?.[1].trenerzy?.[0].id, trenerReferencyjny.id)
  assert.ok(wynik.rozpoznanePola.includes('grupy.1.cenaNetto'))
  assert.ok(wynik.rozpoznanePola.includes('grupy.2.trenerzy'))
  const mapowanie = przygotujMapowanieImportuMaila(wynik, structuredClone(poczatkoweDaneFormularza), [structuredClone(poczatkowaGrupa)], {})
  assert.equal(mapowanie.pozostaleGrupy[0].cenaNetto, 2000)
  assert.equal(mapowanie.statusyPol['grupy.2.trenerzy'], 'zaimportowane')
})

test('niezerowy ręczny opiekun nie uzyskuje niepewności po nieudanym dopasowaniu ponownego importu', () => {
  const wynik = parsujMailaSzczegolow('Opiekun: Nieznana Osoba', kartotekiReferencyjne)
  const mapowanie = przygotujMapowanieImportuMaila(wynik, { ...structuredClone(poczatkoweDaneFormularza), opiekunId: 'Kamila' }, [structuredClone(poczatkowaGrupa)], { opiekunId: 'reczne' })
  assert.equal(mapowanie.statusyPol.opiekunId, 'reczne')
  assert.equal(mapowanie.daneFormularza.opiekunId, undefined)
})

test('niejednoznaczny opiekun nie zostaje przypisany, a nierozpoznanego nadawcę może zastąpić podpis', () => {
  const opiekun = daneStartoweUzytkownikow.find((osoba) => osoba.id === 'Dawid')!
  const dwaRekordy = parsujMailaSzczegolow('Opiekun: Dawid Chyła', { opiekunowie: [opiekun, { ...opiekun, id: 'drugi-opiekun', email: 'inny@szkolenia-semper.pl', emaile: ['inny@szkolenia-semper.pl'] }] })
  assert.equal(dwaRekordy.daneFormularza.opiekunId, undefined)
  assert.deepEqual(dwaRekordy.polaNiepewne, ['opiekunId'])
  const zPodpisu = parsujMailaSzczegolow('Nadawca: Inna Osoba <nieznany@szkolenia-semper.pl>\n\nTreść wiadomości\n--\nDawid Chyła\nDział Szkoleń', kartotekiReferencyjne)
  assert.equal(zPodpisu.daneFormularza.opiekunId, 'Dawid')
})

test('wykrywa sprzeczne terminy wewnątrz treści i nie zgaduje stawki VAT nieobsługiwanej przez model', () => {
  const wynik = parsujMailaSzczegolow('Data od: 28.10.2026\nData do: 29.10.2026\nTermin: 30-31.10.2026\nCena netto: 8700 zł VAT 8%')
  assert.equal(wynik.pierwszaGrupa.dataOd, '2026-10-28')
  assert.ok(wynik.polaNiepewne.includes('grupy.0.dataOd'))
  assert.ok(wynik.polaNiepewne.includes('grupy.0.vat'))
  assert.equal(wynik.pierwszaGrupa.vat, undefined)
  for (const wartosc of ['123%', '170%', 'nie wiadomo']) {
    const nieznanaStawka = parsujMailaSzczegolow(`VAT: ${wartosc}`)
    assert.equal(nieznanaStawka.pierwszaGrupa.vat, undefined)
    assert.deepEqual(nieznanaStawka.polaNiepewne, ['grupy.0.vat'])
  }
})

for (const [otwarcie, zamkniecie] of [['„', '”'], ['“', '”'], ['"', '"'], ['«', '»'], ['‘', '’']]) {
  test(`usuwa wyłącznie zewnętrzne cudzysłowy ${otwarcie}${zamkniecie} i potwierdza tytuł w temacie`, () => {
    const nazwa = 'Lean management i kaizen - system ciągłego doskonalenia w organizacji'
    const wynik = parsujMailaSzczegolow(`Temat: 28-29.10.2026, ${otwarcie}${nazwa}${zamkniecie}, Klient, Mielec\nTytuł szkolenia: ${otwarcie}${nazwa}${zamkniecie}\nData: 28-29.10.2026`)
    assert.equal(wynik.daneFormularza.tytulSzkolenia, nazwa)
    assert.deepEqual(wynik.polaNiepewne, [])
  })
}
