import assert from 'node:assert/strict'
import test, { beforeEach } from 'node:test'
import { poczatkoweDaneFormularza, poczatkowaGrupa } from '../src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts'
import { utworzDomyslneDaneChecklisty, utworzNowaPaczkeChecklisty } from '../src/moduly/dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki.ts'
import { pobierzSzczegolyDoChecklisty } from '../src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts'
import { zbudujWysylkiMonitora } from '../src/moduly/zamkniete/pulpit/logika/monitorWysylek.ts'
import { podsumujDokumentyWysylki } from '../src/moduly/zamkniete/pulpit/logika/dokumentyWysylki.ts'
import { pobierzDokumentyMonitora, skorygujWydrukMonitora, zapiszWymaganieMonitora, zarejestrujWydrukMonitora } from '../src/moduly/zamkniete/pulpit/uslugi/dokumentyMonitora.ts'
import { utworzNowyDokument } from '../src/wspolne/dokumenty/modelDokumentu.ts'
import { kluczRejestruDokumentow, pobierzStanRejestruDokumentow, repozytoriumWspolnychDokumentow } from '../src/wspolne/dokumenty/rejestrDokumentow.ts'
import { odczytajOperacjeWydruku, pobierzIdWersjiWydruku } from '../src/wspolne/dokumenty/rejestrWydrukow.ts'
import { opublikujDokument, utworzAktualizacjeDokumentu, zarejestrujEksportDokumentu } from '../src/wspolne/dokumenty/wersjonowanieDokumentow.ts'
import { zbudujKontekstZeSzczegolow } from '../src/wspolne/integracje/szczegolyDoDokumentow/zbudujKontekstZeSzczegolow.ts'
import { ustawProjekcjeKont } from '../src/aplikacja/logowanie/projekcjaKont.ts'
import { daneStartoweUzytkownikow } from '../src/kartoteki/uzytkownicy/daneUzytkownikow.ts'

const magazyn = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (klucz: string) => magazyn.get(klucz) ?? null,
  setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
  removeItem: (klucz: string) => magazyn.delete(klucz),
} })
const uzytkownikId = daneStartoweUzytkownikow.find((osoba) => osoba.rola === 'ARCHITEKT')!.id

beforeEach(() => { magazyn.clear(); ustawProjekcjeKont(daneStartoweUzytkownikow, [], null) })

function przygotuj() {
  const dane = { ...structuredClone(poczatkoweDaneFormularza), tytulSzkolenia: 'Monitor dokumentów', wysylkaPaczkiDotyczy: true }
  const grupy = ['a', 'b'].map((litera) => ({ ...structuredClone(poczatkowaGrupa), id: `grupa-${litera}`, nazwa: `Grupa ${litera}`, liczbaUczestnikow: 10, dataOd: '2026-11-10', dataDo: '2026-11-10' }))
  const wersja = { id: 'szczegoly', dokumentId: 'szczegoly', dataZapisu: '2026-11-05T10:00:00Z', dane, grupy }
  repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({ id: 'szczegoly', typ: 'SZCZEGOLY_ORGANIZACYJNE', generatorId: 'szczegoly_organizacyjne', tytul: dane.tytulSzkolenia, daneDokumentu: wersja, ustawieniaDokumentu: {} }))
  const daneChecklisty = utworzDomyslneDaneChecklisty({ identyfikator: 'checklista', numerDzienny: 1 })
  Object.assign(daneChecklisty, { szczegolyOrganizacyjneId: 'szczegoly', grupaId: grupy[0].id })
  const checklista = repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({ id: 'checklista', typ: 'CHECKLISTA_PACZKI', generatorId: 'checklisty_paczek', tytul: 'Checklista', daneDokumentu: daneChecklisty, ustawieniaDokumentu: {} }))
  const szczegoly = pobierzSzczegolyDoChecklisty()
  const kontekst = zbudujKontekstZeSzczegolow(szczegoly[0].zrodloKontekstu)
  const program = utworzNowyDokument({ id: 'program', typ: 'PROGRAM_SZKOLENIA', generatorId: 'programy_szkolen', tytul: 'Program', daneDokumentu: { tekst: 'Program A' }, ustawieniaDokumentu: {}, powiazania: { szczegolyOrganizacyjneId: 'szczegoly' }, integralnosc: { idZrodlowychSzczegolow: 'szczegoly', znacznikDanychZrodlowych: kontekst.zrodlo.odciskDanych } })
  const wysylka = zbudujWysylkiMonitora(szczegoly, [checklista], {})[0]
  const odczytaj = () => pobierzDokumentyMonitora([wysylka]).get(wysylka.id)!
  const stanProgramu = () => odczytaj().find((dokument) => dokument.rodzaj === 'program')!
  return { wysylka, checklista, program, odczytaj, stanProgramu, wersja }
}

test('brak dokumentu, przygotowanie, częściowy i pełny potwierdzony wydruk', async () => {
  const { wysylka, program, stanProgramu } = przygotuj()
  assert.equal(stanProgramu().status, 'brak')
  repozytoriumWspolnychDokumentow.utworz(program)
  assert.equal(stanProgramu().status, 'przygotowany')
  await zarejestrujWydrukMonitora(wysylka, stanProgramu(), { operacjaId: 'czesc', status: 'POTWIERDZONY', liczbaEgzemplarzy: 4 }, uzytkownikId)
  assert.equal(stanProgramu().status, 'przygotowany')
  assert.equal(stanProgramu().brakujace, 6)
  await zarejestrujWydrukMonitora(wysylka, stanProgramu(), { operacjaId: 'reszta', status: 'POTWIERDZONY', liczbaEgzemplarzy: 6 }, uzytkownikId)
  assert.equal(stanProgramu().status, 'wydrukowany')
  assert.equal(stanProgramu().wydrukowane, 10)
})

test('większa wymagana ilość zmienia zielony status; zapis nie nadpisuje dyspozycji checklisty', async () => {
  const { wysylka, program, stanProgramu, checklista } = przygotuj()
  repozytoriumWspolnychDokumentow.utworz(program)
  await zarejestrujWydrukMonitora(wysylka, stanProgramu(), { operacjaId: 'pelny', status: 'POTWIERDZONY', liczbaEgzemplarzy: 10 }, uzytkownikId)
  await zapiszWymaganieMonitora(wysylka, stanProgramu(), { liczbaEgzemplarzy: 12, nieDotyczy: false }, 'wymaganie', uzytkownikId)
  assert.equal(stanProgramu().status, 'przygotowany')
  assert.equal(stanProgramu().brakujace, 2)
  assert.deepEqual(repozytoriumWspolnychDokumentow.pobierzPoId(checklista.id)?.daneDokumentu, checklista.daneDokumentu)
})

test('edycja w miejscu i nowa wersja nie przejmują poprzednich wydruków', async () => {
  const { wysylka, program, stanProgramu } = przygotuj()
  repozytoriumWspolnychDokumentow.utworz(program)
  const przed = stanProgramu()
  await zarejestrujWydrukMonitora(wysylka, przed, { operacjaId: 'stara', status: 'POTWIERDZONY', liczbaEgzemplarzy: 10 }, uzytkownikId)
  repozytoriumWspolnychDokumentow.aktualizuj(program.id, { daneDokumentu: { tekst: 'Nowa treść' } })
  assert.notEqual(stanProgramu().wersjaDokumentuId, przed.wersjaDokumentuId)
  assert.equal(stanProgramu().wydrukowane, 0)
  await assert.rejects(zarejestrujWydrukMonitora(wysylka, przed, { operacjaId: 'nieaktualny-panel', status: 'POTWIERDZONY', liczbaEgzemplarzy: 10 }, uzytkownikId), /zmieni/)
  opublikujDokument(program.id)
  const nowa = utworzAktualizacjeDokumentu(program.id)!
  assert.equal(nowa.powiazania.szczegolyOrganizacyjneId, 'szczegoly')
  assert.equal(nowa.dokumentLogicznyId, program.dokumentLogicznyId)
  assert.equal(stanProgramu().dokument?.id, nowa.id)
  assert.equal(stanProgramu().wydrukowane, 0)
})

test('wspólny program nie nalicza ponownie tych samych egzemplarzy w innych grupach ani paczkach', async () => {
  const { wysylka, program, stanProgramu, checklista } = przygotuj()
  repozytoriumWspolnychDokumentow.utworz(program)
  await zarejestrujWydrukMonitora(wysylka, stanProgramu(), { operacjaId: 'grupa-a', status: 'POTWIERDZONY', liczbaEgzemplarzy: 10 }, uzytkownikId)
  const drugaPaczka = utworzNowaPaczkeChecklisty(checklista.daneDokumentu.paczki)
  const dane = { ...checklista.daneDokumentu, paczki: [...checklista.daneDokumentu.paczki, drugaPaczka] }
  repozytoriumWspolnychDokumentow.aktualizuj(checklista.id, { daneDokumentu: dane })
  const wysylki = zbudujWysylkiMonitora(pobierzSzczegolyDoChecklisty(), [{ ...checklista, daneDokumentu: dane }], {})
  const stany = wysylki.map((rekord) => pobierzDokumentyMonitora([rekord]).get(rekord.id)!.find((dokument) => dokument.rodzaj === 'program')!)
  assert.deepEqual(stany.map((stan) => stan.wydrukowane), [10, 0, 0])
  assert.deepEqual(stany.map((stan) => stan.dokument?.id), ['program', 'program', 'program'])
})

test('lista grupowa i zmiana powiązania nie przejmują danych sąsiedniej grupy', () => {
  const { wysylka, odczytaj } = przygotuj()
  const lista = repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({ typ: 'LISTA_OBECNOSCI', generatorId: 'listy_obecnosci', tytul: 'Lista', daneDokumentu: {}, ustawieniaDokumentu: {}, powiazania: { szczegolyOrganizacyjneId: 'szczegoly', grupaId: 'grupa-b' } }))
  assert.equal(odczytaj().find((dokument) => dokument.rodzaj === 'lista')!.status, 'brak')
  repozytoriumWspolnychDokumentow.aktualizuj(lista.id, { powiazania: { ...lista.powiazania, grupaId: wysylka.grupaId } })
  assert.equal(odczytaj().find((dokument) => dokument.rodzaj === 'lista')!.status, 'przygotowany')
})

test('odświeżenia i ponowienia operacji nie powielają historii, kolizje są odrzucane', async () => {
  const { wysylka, program, stanProgramu } = przygotuj()
  repozytoriumWspolnychDokumentow.utworz(program)
  const dane = { operacjaId: 'stabilna-operacja', status: 'POTWIERDZONY' as const, liczbaEgzemplarzy: 10 }
  await zarejestrujWydrukMonitora(wysylka, stanProgramu(), dane, uzytkownikId)
  const zapis = magazyn.get(kluczRejestruDokumentow)
  for (let indeks = 0; indeks < 3; indeks++) { stanProgramu(); await zarejestrujWydrukMonitora(wysylka, stanProgramu(), dane, uzytkownikId) }
  assert.equal(magazyn.get(kluczRejestruDokumentow), zapis)
  assert.equal(stanProgramu().wydrukowane, 10)
  assert.equal(stanProgramu().operacje.length, 1)
  await assert.rejects(zarejestrujWydrukMonitora(wysylka, stanProgramu(), { ...dane, liczbaEgzemplarzy: 11 }, uzytkownikId), /już użyty/)
})

test('Nie dotyczy nie obniża kompletności, a przywrócenie dyspozycji wycofuje ręczne ustawienie', async () => {
  const { wysylka, stanProgramu, odczytaj } = przygotuj()
  await zapiszWymaganieMonitora(wysylka, stanProgramu(), { liczbaEgzemplarzy: 0, nieDotyczy: true }, 'nie-dotyczy', uzytkownikId)
  assert.equal(stanProgramu().status, 'nie_dotyczy')
  assert.equal(podsumujDokumentyWysylki(odczytaj()).wymagane, 5)
  await zapiszWymaganieMonitora(wysylka, stanProgramu(), { liczbaEgzemplarzy: null, nieDotyczy: null }, 'przywroc', uzytkownikId)
  assert.equal(stanProgramu().status, 'brak')
  assert.equal(stanProgramu().wymagane, 10)
})

test('zlecenie i eksport PDF nie są potwierdzeniem wydruków', async () => {
  const { wysylka, program, stanProgramu } = przygotuj()
  repozytoriumWspolnychDokumentow.utworz(program)
  await zarejestrujWydrukMonitora(wysylka, stanProgramu(), { operacjaId: 'zlecenie', status: 'ZLECONY', liczbaEgzemplarzy: 10 }, uzytkownikId)
  zarejestrujEksportDokumentu(program.id, 'PDF', 'program.pdf', uzytkownikId)
  assert.equal(stanProgramu().wydrukowane, 0)
  assert.equal(stanProgramu().status, 'przygotowany')
})

test('korekta zachowuje historię, zastępuje ilość i nie może podwójnie skorygować wpisu', async () => {
  const { wysylka, program, stanProgramu } = przygotuj()
  repozytoriumWspolnychDokumentow.utworz(program)
  const poprzednia = await zarejestrujWydrukMonitora(wysylka, stanProgramu(), { operacjaId: 'potwierdzony', status: 'POTWIERDZONY', liczbaEgzemplarzy: 10 }, uzytkownikId)
  await skorygujWydrukMonitora(wysylka, stanProgramu(), poprzednia, 4, 'Zacięcie papieru', 'korekta', uzytkownikId)
  assert.equal(stanProgramu().operacje.length, 2)
  assert.equal(stanProgramu().wydrukowane, 4)
  assert.equal(stanProgramu().status, 'przygotowany')
  await assert.rejects(skorygujWydrukMonitora(wysylka, stanProgramu(), poprzednia, 2, 'Ponowna korekta', 'kolizja', uzytkownikId), /już skorygowany/)
  const aktualna = stanProgramu().operacje.find((operacja) => operacja.status === 'KOREKTA')!
  await skorygujWydrukMonitora(wysylka, stanProgramu(), aktualna, 0, 'Anulowanie błędnego potwierdzenia', 'korekta-2', uzytkownikId)
  assert.equal(stanProgramu().wydrukowane, 0)
})

test('uprawnienia są egzekwowane w operacjach zapisu, także po zmianie konta', async () => {
  const { wysylka, program, stanProgramu } = przygotuj()
  repozytoriumWspolnychDokumentow.utworz(program)
  await assert.rejects(zarejestrujWydrukMonitora(wysylka, stanProgramu(), { operacjaId: 'bez-uprawnien', status: 'POTWIERDZONY', liczbaEgzemplarzy: 10 }, null), /Brak uprawnienia/)
  await assert.rejects(zapiszWymaganieMonitora(wysylka, stanProgramu(), { liczbaEgzemplarzy: 20, nieDotyczy: false }, 'bez-uprawnien', null), /Brak uprawnienia/)
  ustawProjekcjeKont(daneStartoweUzytkownikow.map((osoba) => osoba.id === uzytkownikId ? { ...osoba, status: 'NIEAKTYWNY' } : osoba), [], null)
  await assert.rejects(zarejestrujWydrukMonitora(wysylka, stanProgramu(), { operacjaId: 'nieaktywne-konto', status: 'ZLECONY', liczbaEgzemplarzy: 10 }, uzytkownikId), /Brak uprawnienia/)
  assert.equal(stanProgramu().operacje.length, 0)
})

test('zmiana uczestników i źródła odświeża ilości; ręcznie zatwierdzone ustawienia mają priorytet', async () => {
  const { wysylka, program, stanProgramu, wersja } = przygotuj()
  repozytoriumWspolnychDokumentow.utworz(program)
  const nowaWersja = { ...wersja, grupy: wersja.grupy.map((grupa) => ({ ...grupa, liczbaUczestnikow: 15 })) }
  repozytoriumWspolnychDokumentow.aktualizuj('szczegoly', { daneDokumentu: nowaWersja })
  assert.equal(stanProgramu().wymagane, 15)
  assert.equal(stanProgramu().wymagaAktualizacji, true)
  await assert.rejects(zarejestrujWydrukMonitora(wysylka, stanProgramu(), { operacjaId: 'stare-zrodlo', status: 'ZLECONY', liczbaEgzemplarzy: 15 }, uzytkownikId), /zaktualizuj/)
  await zapiszWymaganieMonitora(wysylka, stanProgramu(), { liczbaEgzemplarzy: 12, nieDotyczy: false }, 'reczne', uzytkownikId)
  assert.equal(stanProgramu().wymagane, 12)
})

test('ilości pochodzą z właściwej pozycji, dodatkowe materiały nie są mylone z programem', () => {
  const { checklista, odczytaj } = przygotuj()
  const pozycje = checklista.daneDokumentu.pozycje.map((pozycja) => ({ ...pozycja, nadpisanieReczne: pozycja.nazwa === 'Lista obecności' ? 3 : pozycja.nazwa === 'Podręczniki / materiały szkoleniowe' ? 40 : pozycja.nadpisanieReczne }))
  repozytoriumWspolnychDokumentow.aktualizuj(checklista.id, { daneDokumentu: { ...checklista.daneDokumentu, pozycje } })
  assert.equal(odczytaj().find((dokument) => dokument.rodzaj === 'lista')!.wymagane, 3)
  assert.equal(odczytaj().find((dokument) => dokument.rodzaj === 'program')!.wymagane, 10)
  assert.equal(odczytaj().find((dokument) => dokument.rodzaj === 'karty')!.wymagane, 2)
  assert.equal(odczytaj().find((dokument) => dokument.rodzaj === 'checklista')!.wymagane, 1)
})

test('wadliwy wpis historii nie może zazielenić statusu; brak zapisu zachowuje poprzedni rejestr', async () => {
  const { wysylka, program, stanProgramu } = przygotuj()
  repozytoriumWspolnychDokumentow.utworz(program)
  const przed = magazyn.get(kluczRejestruDokumentow)
  const zapis = localStorage.setItem
  localStorage.setItem = () => { throw new DOMException('Brak miejsca', 'QuotaExceededError') }
  try {
    await assert.rejects(zarejestrujWydrukMonitora(wysylka, stanProgramu(), { operacjaId: 'quota', status: 'POTWIERDZONY', liczbaEgzemplarzy: 10 }, uzytkownikId))
    assert.equal(magazyn.get(kluczRejestruDokumentow), przed)
  } finally { localStorage.setItem = zapis }
  repozytoriumWspolnychDokumentow.dodajWpisHistorii({ dokumentId: program.id, dokumentLogicznyId: program.id, typ: 'operacja_wydruku', dane: { liczbaEgzemplarzy: 100 }, automatyczne: false })
  assert.equal(stanProgramu().status, 'niepewny')
  assert.equal(stanProgramu().wydrukowane, 0)
  assert.equal(pobierzStanRejestruDokumentow().historia.filter(odczytajOperacjeWydruku).length, 0)
})

test('stara wersja schematu zachowuje dokumenty i nie wymyśla potwierdzeń po migracji', () => {
  const { program, stanProgramu } = przygotuj()
  repozytoriumWspolnychDokumentow.utworz(program)
  const stan = pobierzStanRejestruDokumentow()
  magazyn.set(kluczRejestruDokumentow, JSON.stringify({ ...stan, wersja: 2 }))
  assert.equal(stanProgramu().status, 'przygotowany')
  assert.equal(stanProgramu().wydrukowane, 0)
  assert.equal(pobierzIdWersjiWydruku(repozytoriumWspolnychDokumentow.pobierzPoId(program.id)!), pobierzIdWersjiWydruku(program))
})
