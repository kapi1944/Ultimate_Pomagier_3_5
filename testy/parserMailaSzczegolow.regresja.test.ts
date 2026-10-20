import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { parsujMailaSzczegolow } from '../src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/parserMailaSzczegolow.ts'

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
  assert.ok(!wynik.polaNiepewne.includes('tytulSzkolenia'))
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
    assert.deepEqual(wynik.polaNiepewne, [])
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
