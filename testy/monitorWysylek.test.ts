import assert from 'node:assert/strict'
import test from 'node:test'
import { poczatkoweDaneFormularza, poczatkowaGrupa } from '../src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts'
import { czyMoznaFinalizowacCheckliste, utworzDomyslneDaneChecklisty, utworzNowaPaczkeChecklisty } from '../src/moduly/dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki.ts'
import type { DokumentChecklistyPaczki, SzczegolyDoChecklisty } from '../src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts'
import { utworzNowyDokument } from '../src/wspolne/dokumenty/modelDokumentu.ts'
import { czyPoprawnaDataWysylki, filtrujWysylki, pobierzPilnoscWysylki, sortujWysylki, zbudujWysylkiMonitora } from '../src/moduly/zamkniete/pulpit/logika/monitorWysylek.ts'

function szczegoly(): SzczegolyDoChecklisty {
  const dane = { ...structuredClone(poczatkoweDaneFormularza), tytulSzkolenia: 'Aktualny tytuł', nazwaKlienta: 'Aktualny klient', wysylkaPaczkiDotyczy: true }
  const grupy = [{ ...structuredClone(poczatkowaGrupa), id: 'grupa-a', nazwa: 'Grupa A', dataOd: '2026-10-29', dataDo: '2026-10-30', miejsce: 'Poznań' }]
  return { id: 'szczegoly-a', nazwa: 'Stara nazwa', dane, grupy, opiekunId: 'opiekun-a', czyKopiaRobocza: false, zrodloKontekstu: { szczegolyOrganizacyjneId: 'szczegoly-a', wersjaSzczegolowId: null, zmodyfikowano: '', dane, grupy } }
}

function checklista(): DokumentChecklistyPaczki {
  const dane = utworzDomyslneDaneChecklisty({ identyfikator: 'testowa', numerDzienny: 1 })
  dane.szczegolyOrganizacyjneId = 'szczegoly-a'
  dane.grupaId = 'grupa-a'
  dane.dataWyslania = '2026-10-20'
  return utworzNowyDokument({ id: 'checklista-a', typ: 'CHECKLISTA_PACZKI', generatorId: 'checklisty_paczek', tytul: 'Checklista', daneDokumentu: dane, ustawieniaDokumentu: {} })
}

const dzisiaj = new Date('2026-10-20T12:00:00')
const rekord = () => zbudujWysylkiMonitora([szczegoly()], [checklista()], {})[0]

test('monitor czyta aktualne szczegóły i zachowuje stabilne powiązania grup', () => {
  const dane = szczegoly()
  dane.grupy.push({ ...dane.grupy[0], id: 'grupa-b', nazwa: 'Grupa B', miejsce: 'Kraków' })
  const wynik = zbudujWysylkiMonitora([dane], [checklista()], {})
  assert.equal(wynik.length, 2)
  assert.equal(wynik[0].nazwaSzkolenia, 'Aktualny tytuł')
  assert.equal(wynik[0].klient, 'Aktualny klient')
  assert.equal(wynik[0].miasto, 'Poznań')
  assert.deepEqual(wynik[0].terminySzkolenia, ['2026-10-29', '2026-10-30'])
  assert.equal(wynik[0].checklistaId, 'checklista-a')
  assert.equal(wynik[1].checklistaId, undefined)
  assert.equal(wynik[1].statusPrzesylki, 'Wymaga przygotowania')
  assert.equal(wynik[1].miasto, 'Kraków')
  assert.equal(wynik[1].id, zbudujWysylkiMonitora([{ ...dane, grupy: [...dane.grupy].reverse() }], [], {})[0].id)
})

test('online nie alarmuje bez zaznaczonej wysyłki nawet z istniejącą checklistą', () => {
  const dane = szczegoly()
  dane.grupy[0].formaSzkolenia = 'Online'
  dane.dane.wysylkaPaczkiDotyczy = false
  assert.deepEqual(zbudujWysylkiMonitora([dane], [checklista()], {}), [])
  dane.dane.wysylkaPaczkiDotyczy = true
  assert.equal(zbudujWysylkiMonitora([dane], [checklista()], {}).length, 1)
})

test('brak wymogu, anulowane szkolenia i usunięte lub archiwalne checklisty nie tworzą alarmów', () => {
  const dane = szczegoly()
  dane.dane.wysylkaPaczkiDotyczy = false
  assert.deepEqual(zbudujWysylkiMonitora([dane], [], {}), [])
  const dokument = checklista()
  dokument.czyUsunietyMiekko = true
  assert.deepEqual(zbudujWysylkiMonitora([dane], [dokument], {}), [])
  dokument.czyUsunietyMiekko = false
  dokument.daneDokumentu.statusChecklisty = 'ZARCHIWIZOWANA'
  assert.deepEqual(zbudujWysylkiMonitora([dane], [dokument], {}), [])
  dane.dane.wysylkaPaczkiDotyczy = true
  dane.dane.statusSzkolenia = 'NIEZREALIZOWANE'
  assert.deepEqual(zbudujWysylkiMonitora([dane], [checklista()], {}), [])
})

test('nadanie wynika ze statusów operacyjnych albo istniejącego potwierdzenia Pulpitu, nigdy z samej daty', () => {
  const dokument = checklista()
  assert.equal(zbudujWysylkiMonitora([szczegoly()], [dokument], {})[0].czyWyslana, false)
  dokument.daneDokumentu.paczki[0].statusOperacyjny = 'WYSŁANA'
  assert.equal(zbudujWysylkiMonitora([szczegoly()], [dokument], {})[0].czyWyslana, true)
  dokument.daneDokumentu.paczki[0].statusOperacyjny = 'ROBOCZA'
  assert.equal(zbudujWysylkiMonitora([szczegoly()], [dokument], { 'checklista-a': '2026-10-20T10:00:00Z' })[0].czyWyslana, true)
})

test('częściowa wysyłka zachowuje alarm dla pozostałych paczek i bierze termin niewysłanej', () => {
  const dokument = checklista()
  const dane = dokument.daneDokumentu
  dane.paczki[0].statusOperacyjny = 'WYSŁANA'
  dane.paczki[0].parametryLogistyczne.dataWyslania = '2026-10-10'
  const kolejna = utworzNowaPaczkeChecklisty(dane.paczki)
  kolejna.parametryLogistyczne.dataWyslania = '2026-10-22'
  dane.paczki.push(kolejna)
  const wynik = zbudujWysylkiMonitora([szczegoly()], [dokument], {})
  assert.equal(wynik.length, 2)
  assert.equal(wynik[0].czyWyslana, true)
  assert.equal(wynik[1].czyWyslana, false)
  assert.equal(wynik[1].paczkaId, kolejna.id)
  assert.equal(wynik[1].planowanaDataWysylki, '2026-10-22')
})

test('status całego szkolenia jest jawnym fallbackiem bez checklisty, bez nadpisywania statusów grup', () => {
  const dane = szczegoly()
  dane.dane.statusSzkolenia = 'WYSŁANA PACZKA'
  assert.equal(zbudujWysylkiMonitora([dane], [], {})[0].statusPrzesylki, 'Wysłana — status szkolenia')
  assert.equal(zbudujWysylkiMonitora([dane], [checklista()], {})[0].czyWyslana, false)
})

test('niepełne daty paczek nie ukrywają znanego terminu, a błędne nie są zastępowane datą legacy', () => {
  const dokument = checklista()
  const dane = dokument.daneDokumentu
  dane.paczki[0].parametryLogistyczne.dataWyslania = '2026-10-19'
  dane.paczki.push(utworzNowaPaczkeChecklisty(dane.paczki))
  const wynik = zbudujWysylkiMonitora([szczegoly()], [dokument], {})[0]
  assert.equal(wynik.planowanaDataWysylki, '2026-10-19')
  assert.equal(zbudujWysylkiMonitora([szczegoly()], [dokument], {})[1].planowanaDataWysylki, '')
  dane.paczki[0].parametryLogistyczne.dataWyslania = '2026-02-30'
  const bledny = zbudujWysylkiMonitora([szczegoly()], [dokument], {})[0]
  assert.equal(bledny.planowanaDataWysylki, '2026-02-30')
  assert.equal(pobierzPilnoscWysylki(bledny, dzisiaj), 'POZOSTALE')
})

test('brakujące i niepoprawne daty pozostają widoczne bez automatycznych alarmów', () => {
  for (const data of ['', '2026-02-30', 'nieznana']) {
    const wysylka = { ...rekord(), planowanaDataWysylki: data }
    assert.equal(czyPoprawnaDataWysylki(data), false)
    assert.equal(pobierzPilnoscWysylki(wysylka, dzisiaj), 'POZOSTALE')
    assert.equal(filtrujWysylki([wysylka], 'ZALEGLE', dzisiaj).length, 0)
    assert.equal(filtrujWysylki([wysylka], 'WSZYSTKIE', dzisiaj).length, 1)
  }
})

test('filtry liczników rozróżniają zaległe, dzisiaj, kolejne trzy dni i wysłane', () => {
  const daty = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '']
  const wysylki = daty.map((data, indeks) => ({ ...rekord(), id: String(indeks), planowanaDataWysylki: data }))
  wysylki.push({ ...rekord(), id: 'wyslana', czyWyslana: true, planowanaDataWysylki: '2026-10-10' })
  assert.equal(filtrujWysylki(wysylki, 'ZALEGLE', dzisiaj).length, 1)
  assert.equal(filtrujWysylki(wysylki, 'DZISIAJ', dzisiaj).length, 1)
  assert.equal(filtrujWysylki(wysylki, 'NAJBLIZSZE_3_DNI', dzisiaj).length, 3)
  assert.equal(filtrujWysylki(wysylki, 'WYSŁANE', dzisiaj).length, 1)
  assert.deepEqual(sortujWysylki([...wysylki].reverse(), dzisiaj).map((wysylka) => wysylka.id), ['0', '1', '2', '3', '4', '5', '6', 'wyslana'])
})

test('pilność liczy dni kalendarzowe przez zmianę czasu i roku', () => {
  assert.equal(pobierzPilnoscWysylki({ ...rekord(), planowanaDataWysylki: '2026-10-26' }, new Date('2026-10-24T23:30:00')), 'ZA_2_3_DNI')
  assert.equal(pobierzPilnoscWysylki({ ...rekord(), planowanaDataWysylki: '2027-01-01' }, new Date('2026-12-31T23:30:00')), 'JUTRO')
})

test('budowa monitora nie zmienia dokumentów ani danych szkolenia', () => {
  const dane = szczegoly()
  const dokument = checklista()
  const przed = structuredClone({ dane, dokument })
  zbudujWysylkiMonitora([dane], [dokument], {})
  assert.deepEqual({ dane, dokument }, przed)
})


test('1.2.2: status, postęp i ostrzeżenia wynikają z pozycji konkretnej paczki', () => {
  const dokument = checklista()
  const dane = dokument.daneDokumentu
  dane.daneOdbiorcy = { ...dane.daneOdbiorcy, nazwaFirmy: 'Klient', ulica: 'Polna', nrBudynku: '1', kodPocztowy: '00-001', miasto: 'Warszawa', kraj: 'Polska' }
  dane.pozycje = [dane.pozycje[0]]
  const pozycja = dane.pozycje[0]
  assert.equal(zbudujWysylkiMonitora([szczegoly()], [dokument], {})[0].statusPrzesylki, 'Wymaga przygotowania')
  pozycja.statusGotowosci = 'CZESCIOWO_GOTOWE'
  assert.equal(zbudujWysylkiMonitora([szczegoly()], [dokument], {})[0].statusPrzesylki, 'W trakcie kompletowania')
  pozycja.statusGotowosci = 'GOTOWE'
  assert.equal(zbudujWysylkiMonitora([szczegoly()], [dokument], {})[0].statusPrzesylki, 'Gotowa do wysyłki')
  pozycja.importDyspozycji = { rodzaj: 'materialySzkoleniowe', dyspozycja: { tekstZrodlowy: 'wydrukuj', status: 'zaimportowane', formaPrzekazania: 'papierowa', sposobPrzygotowania: 'drukuje_organizator', terminPrzekazania: 'przed_szkoleniem' }, grupaId: 'grupa-a', szczegolyOrganizacyjneId: 'szczegoly-a', ostatnieWartosciAutomatyczne: { czyWymagana: true, czyOpcjonalna: false, czyNieDotyczy: false, czyOnline: false, regulaIlosci: { typ: 'UCZESTNICY' }, uwagiDrukowane: '' }, propozycjaIlosci: 30, czyIloscWymagaPotwierdzenia: true, czyKonfliktReczny: true }
  const druga = utworzNowaPaczkeChecklisty(dane.paczki)
  druga.statusOperacyjny = 'WYSŁANA'
  dane.paczki.push(druga)
  const przed = structuredClone(dokument)
  const wynik = zbudujWysylkiMonitora([szczegoly()], [dokument], {})
  assert.equal(wynik[0].liczbaGotowych, 0)
  assert.equal(wynik[0].liczbaWymaganych, 1)
  assert.equal(wynik[0].liczbaNiepotwierdzonych, 1)
  assert.equal(wynik[0].statusPrzesylki, 'Wymaga potwierdzenia')
  assert.match(wynik[0].brakujaceElementy.join(' '), /konflikt z ręcznymi/)
  assert.equal(wynik[1].liczbaWymaganych, 0)
  assert.equal(wynik[1].liczbaNiepotwierdzonych, 0)
  assert.equal(wynik[1].statusPrzesylki, 'Wysłana')
  assert.deepEqual(dokument, przed)
})

test('1.2.2: postęp paczki respektuje wymaganą ilość i ręczne ustawienia zapisanej checklisty', () => {
  const dokument = checklista()
  const dane = dokument.daneDokumentu
  dane.daneOdbiorcy = { ...dane.daneOdbiorcy, nazwaFirmy: 'Klient', ulica: 'Polna', nrBudynku: '1', kodPocztowy: '00-001', miasto: 'Warszawa', kraj: 'Polska' }
  dane.daneSzkolenia = { tytulSzkolenia: 'Zapisany tytuł', nazwaGrupy: 'Grupa A', miejsce: '', terminy: ['2026-10-29', '2026-10-30'], organizator: '', trenerzy: [], liczbaUczestnikow: 12 }
  dane.pozycje = [dane.pozycje[0]]
  const pozycja = dane.pozycje[0]
  pozycja.statusGotowosci = 'GOTOWE'
  pozycja.iloscPrzygotowana = 11
  const druga = utworzNowaPaczkeChecklisty(dane.paczki)
  druga.statusOperacyjny = 'GOTOWA'
  dane.paczki.push(druga)
  const szkolenie = szczegoly()
  szkolenie.grupy[0].liczbaUczestnikow = 30
  const przed = structuredClone({ dokument, szkolenie })
  const wynik = zbudujWysylkiMonitora([szkolenie], [dokument], {})
  assert.equal(czyMoznaFinalizowacCheckliste(dane).czyMozna, false)
  assert.equal(wynik[0].liczbaGotowych, 0)
  assert.equal(wynik[0].liczbaWymaganych, 1)
  assert.equal(wynik[0].statusPrzesylki, 'W trakcie kompletowania')
  assert.ok(wynik[0].brakujaceElementy.includes(pozycja.nazwa))
  assert.equal(wynik[1].statusPrzesylki, 'Gotowa do wysyłki')
  assert.deepEqual({ dokument, szkolenie }, przed)

  for (const iloscPrzygotowana of [12, null]) {
    pozycja.iloscPrzygotowana = iloscPrzygotowana
    assert.equal(czyMoznaFinalizowacCheckliste(dane).czyMozna, true)
    assert.equal(zbudujWysylkiMonitora([szkolenie], [dokument], {})[0].statusPrzesylki, 'Gotowa do wysyłki')
  }
  pozycja.iloscPrzygotowana = 12
  pozycja.nadpisanieReczne = 15
  assert.equal(zbudujWysylkiMonitora([szkolenie], [dokument], {})[0].liczbaGotowych, 0)
  pozycja.iloscPrzygotowana = 15
  assert.equal(zbudujWysylkiMonitora([szkolenie], [dokument], {})[0].liczbaGotowych, 1)
})

test('1.2.2: tworzenie z Pulpitu jest idempotentne, wysyłka dotyczy jednej paczki i chroni historię', async () => {
  const magazyn = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (klucz: string) => magazyn.get(klucz) ?? null,
    setItem: (klucz: string, wartosc: string) => magazyn.set(klucz, wartosc),
    removeItem: (klucz: string) => magazyn.delete(klucz),
  } })
  const { repozytoriumWspolnychDokumentow } = await import('../src/wspolne/dokumenty/rejestrDokumentow.ts')
  const { pobierzUzytkownikow } = await import('../src/kartoteki/uzytkownicy/magazynUzytkownikow.ts')
  const { otworzLubUtworzChecklistePulpitu, oznaczWysylkeChecklisty } = await import('../src/moduly/zamkniete/pulpit/uslugi/checklistyPulpitu.ts')
  const { pobierzSzczegolyDoChecklisty, pobierzChecklistyPaczek, zapiszChecklistePaczki, pobierzChecklistePaczki } = await import('../src/moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek.ts')
  const dane = szczegoly()
  repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({ id: dane.id, typ: 'SZCZEGOLY_ORGANIZACYJNE', generatorId: 'szczegoly_organizacyjne', tytul: dane.nazwa, daneDokumentu: { dokumentId: dane.id, id: 'wersja-a', dane: dane.dane, grupy: dane.grupy }, ustawieniaDokumentu: {} }))
  const uzytkownikId = pobierzUzytkownikow().find((osoba) => osoba.rola === 'ARCHITEKT')!.id
  const wysylka = zbudujWysylkiMonitora(pobierzSzczegolyDoChecklisty(), [], {})[0]
  const dokument = otworzLubUtworzChecklistePulpitu(wysylka, uzytkownikId)!
  assert.ok(dokument)
  assert.equal(otworzLubUtworzChecklistePulpitu(wysylka, uzytkownikId)!.id, dokument.id)
  assert.equal(pobierzChecklistyPaczek().length, 1)
  assert.equal(dokument.daneDokumentu.grupaId, 'grupa-a')
  assert.equal(dokument.powiazania.grupaId, 'grupa-a')
  const druga = utworzNowaPaczkeChecklisty(dokument.daneDokumentu.paczki)
  zapiszChecklistePaczki(dokument.id, { ...dokument.daneDokumentu, paczki: [...dokument.daneDokumentu.paczki, druga] }, uzytkownikId)
  const rekord = zbudujWysylkiMonitora(pobierzSzczegolyDoChecklisty(), pobierzChecklistyPaczek(), {})[0]
  const przed = pobierzChecklistePaczki(dokument.id)!
  assert.equal(oznaczWysylkeChecklisty(rekord, null), null)
  const wynik = oznaczWysylkeChecklisty(rekord, uzytkownikId)!
  assert.equal(wynik.daneDokumentu.paczki[0].statusOperacyjny, 'WYSŁANA')
  assert.equal(wynik.daneDokumentu.paczki[1].statusOperacyjny, 'ROBOCZA')
  assert.deepEqual(wynik.daneDokumentu.pozycje, przed.daneDokumentu.pozycje)
  assert.equal(magazyn.has('ultimatePomagier.pulpit.v1'), false)
  for (const statusChecklisty of ['WYDRUKOWANA', 'KOMPLETNA', 'ZARCHIWIZOWANA'] as const) {
    repozytoriumWspolnychDokumentow.aktualizuj(dokument.id, { daneDokumentu: { ...wynik.daneDokumentu, statusChecklisty } })
    const historyczna = pobierzChecklistePaczki(dokument.id)
    assert.equal(oznaczWysylkeChecklisty(rekord, uzytkownikId), null)
    assert.deepEqual(pobierzChecklistePaczki(dokument.id), historyczna)
  }
})
