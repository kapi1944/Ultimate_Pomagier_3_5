import assert from 'node:assert/strict'
import test from 'node:test'
import { poczatkoweDaneFormularza } from '../src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts'
import { zbudujBledyDanychKlienta, pobierzBrakujacePolaEfektywnegoOdbiorcy, pobierzEfektywneDaneOdbiorcy, pobierzEfektywneStatusyPolOdbiorcy } from '../src/moduly/zamkniete/szczegoly_organizacyjne/logikaDanychOdbiorcy.ts'
import { pobierzBladKontaktu } from '../src/moduly/zamkniete/szczegoly_organizacyjne/walidacjaKontaktowSzczegolow.ts'
import { utworzTekstSzczegolow } from '../src/moduly/zamkniete/szczegoly_organizacyjne/uslugi/eksportSzczegolow.ts'

function utworzDane() {
  const dane = structuredClone(poczatkoweDaneFormularza)
  dane.nabywca = { ...dane.nabywca, nazwa: 'Firma nabywcy', email: 'biuro@nabywca.pl', ulica: 'Kwiatowa 1', kodPocztowy: '00-001', miasto: 'Warszawa' }
  dane.odbiorca = { ...dane.odbiorca, nazwa: '', email: '' }
  return dane
}

test('nabywca jako odbiorca daje kompletne skuteczne dane, statusy i walidację odbiorcy', () => {
  const dane = utworzDane()
  dane.czyNabywcaJestOdbiorca = true
  const statusy = pobierzEfektywneStatusyPolOdbiorcy(dane, { 'odbiorca.nazwa': 'brak', 'odbiorca.email': 'brak' })
  const brakujacePola = pobierzBrakujacePolaEfektywnegoOdbiorcy(dane)

  assert.equal(pobierzEfektywneDaneOdbiorcy(dane).nazwa, 'Firma nabywcy')
  assert.equal(pobierzEfektywneDaneOdbiorcy(dane).email, 'biuro@nabywca.pl')
  assert.equal(statusy['odbiorca.nazwa'], undefined)
  assert.equal(statusy['odbiorca.email'], undefined)
  assert.deepEqual(brakujacePola, [])
})

test('brakująca wartość nabywcy pozostaje brakiem skutecznego odbiorcy i walidacji', () => {
  const dane = utworzDane()
  dane.czyNabywcaJestOdbiorca = true
  dane.nabywca.email = ''
  const statusy = pobierzEfektywneStatusyPolOdbiorcy(dane, { 'odbiorca.nazwa': 'brak', 'odbiorca.email': 'brak' })
  const brakujacePola = pobierzBrakujacePolaEfektywnegoOdbiorcy(dane)

  assert.equal(statusy['odbiorca.nazwa'], undefined)
  assert.equal(statusy['odbiorca.email'], 'brak')
  assert.deepEqual(brakujacePola, ['email'])
})

test('odznaczenie nabywcy jako odbiorcy przywraca własne dane i statusy odbiorcy', () => {
  const dane = utworzDane()
  dane.odbiorca = { ...dane.odbiorca, nazwa: 'Własny odbiorca', email: '' }
  const statusy = pobierzEfektywneStatusyPolOdbiorcy(dane, { 'odbiorca.email': 'brak' })

  assert.equal(pobierzEfektywneDaneOdbiorcy(dane).nazwa, 'Własny odbiorca')
  assert.equal(statusy['odbiorca.email'], 'brak')
})

test('osoba kontaktowa i status są odwzorowane na bieżąco bez utraty własnych danych odbiorcy i paczki', () => {
  const dane = utworzDane()
  dane.odbiorca.imieNazwiskoOdbiorcy = 'Własna osoba'
  dane.odbiorcaPaczki.imieNazwisko = 'Osoba paczki'
  dane.nabywca.osobaKontaktowa = 'Anna Nowak'
  const statusy = { 'nabywca.osobaKontaktowa': 'niepewne', 'odbiorca.imieNazwiskoOdbiorcy': 'reczne' } as const
  dane.czyNabywcaJestOdbiorca = true
  assert.equal(pobierzEfektywneDaneOdbiorcy(dane).imieNazwiskoOdbiorcy, 'Anna Nowak')
  assert.equal(pobierzEfektywneStatusyPolOdbiorcy(dane, statusy)['odbiorca.imieNazwiskoOdbiorcy'], 'niepewne')
  dane.nabywca.osobaKontaktowa = 'Piotr Kowalski'
  assert.equal(pobierzEfektywneDaneOdbiorcy(dane).imieNazwiskoOdbiorcy, 'Piotr Kowalski')
  assert.match(utworzTekstSzczegolow(dane, []), /Osoba odbiorcy: Piotr Kowalski/)
  dane.czyNabywcaJestOdbiorca = false
  assert.match(utworzTekstSzczegolow(dane, []), /Osoba odbiorcy: Własna osoba/)
  const odczyt = JSON.parse(JSON.stringify(dane))
  assert.equal(pobierzEfektywneDaneOdbiorcy(odczyt).imieNazwiskoOdbiorcy, 'Własna osoba')
  assert.equal(pobierzEfektywneStatusyPolOdbiorcy(dane, statusy)['odbiorca.imieNazwiskoOdbiorcy'], 'reczne')
  assert.equal(dane.odbiorcaPaczki.imieNazwisko, 'Osoba paczki')
})

for (const email of ['kontakt@firma.pl', 'anna.nowak@firma.com', 'kontakt+szkolenia@firma.pl', "o'connor@firma.pl"]) {
  test(`poprawny email: ${email}`, () => assert.equal(pobierzBladKontaktu('email', email), ''))
}
for (const email of ['kontakt@', 'kontakt@firma', 'kontakt@@firma.pl', 'kontakt@firma.pl12345', 'E-mail:kontakt@firma.pl', 'kontakt..anna@firma.pl']) {
  test(`błędny email: ${email}`, () => {
    assert.match(pobierzBladKontaktu('email', email), /Nieprawidłowy adres e-mail/)
    const dane = utworzDane()
    dane.czyNabywcaJestOdbiorca = true
    dane.nabywca.email = email
    const problemy = zbudujBledyDanychKlienta(dane)
    assert.ok(problemy.some((problem) => problem.pole === 'nabywca.email' && problem.sekcja === 'Dane klienta' && problem.czyBlokuje))
    assert.ok(!problemy.some((problem) => problem.pole === 'odbiorca.email'))
    assert.equal(dane.nabywca.email, email)
  })
}
for (const telefon of ['785 660 226', '785660226', '+48 785 660 226', '+49 151 23456789', '+44 7700 900123', '+45 12 34 56 78', '+1 202 555 0123', '+999 1234567']) {
  test(`poprawny telefon: ${telefon}`, () => assert.equal(pobierzBladKontaktu('telefon', telefon), ''))
}
for (const telefon of ['785 660 226dsf', '123', '785ABC226', '+48', '+44 123', '++48 785660226']) {
  test(`błędny telefon: ${telefon}`, () => {
    assert.match(pobierzBladKontaktu('telefon', telefon), /Nieprawidłowy numer telefonu/)
    const dane = utworzDane()
    dane.nabywca.telefon = telefon
    assert.ok(zbudujBledyDanychKlienta(dane).some((problem) => problem.pole === 'nabywca.telefon' && problem.czyBlokuje))
    assert.equal(dane.nabywca.telefon, telefon)
  })
}
test('puste kontakty opcjonalne nie mają błędów formatu; braki wymagane mają odrębny komunikat', () => {
  assert.equal(pobierzBladKontaktu('email', ''), '')
  assert.equal(pobierzBladKontaktu('telefon', ''), '')
  const dane = utworzDane()
  dane.czyNabywcaJestOdbiorca = true
  dane.nabywca.email = ''
  const problemy = zbudujBledyDanychKlienta(dane)
  assert.equal(problemy.filter((problem) => problem.pole === 'nabywca.email').length, 1)
  assert.match(problemy.find((problem) => problem.pole === 'nabywca.email')?.komunikat ?? '', /wpisz adres/)
  assert.ok(!problemy.some((problem) => problem.pole.endsWith('.telefon')))
})
