import assert from 'node:assert/strict'
import test from 'node:test'
import { poczatkoweDaneFormularza, poczatkowaGrupa } from '../src/moduly/zamkniete/szczegoly_organizacyjne/danePoczatkowe.ts'
import { utworzDomyslneDaneChecklisty, utworzNowaPaczkeChecklisty } from '../src/moduly/dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki.ts'
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
  assert.equal(wynik[1].statusPrzesylki, 'Brak checklisty')
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
  const wynik = zbudujWysylkiMonitora([szczegoly()], [dokument], {})[0]
  assert.equal(wynik.czyWyslana, false)
  assert.equal(wynik.statusPrzesylki, 'Częściowo wysłana (1/2)')
  assert.equal(wynik.planowanaDataWysylki, '2026-10-22')
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
  assert.ok(wynik.brakujaceElementy.includes('poprawne terminy wysyłki części paczek'))
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
