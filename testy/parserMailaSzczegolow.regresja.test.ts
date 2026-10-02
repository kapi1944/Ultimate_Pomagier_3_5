import assert from 'node:assert/strict'
import test from 'node:test'
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
