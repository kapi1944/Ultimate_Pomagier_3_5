import { utworzKopieLokalnaPrzedOperacja } from '../dane/backupDanych'
import { utworzNowyDokument, type Dokument, type StatusDokumentu, type TypDokumentu } from './modelDokumentu'
import { kluczRepozytoriumDokumentow } from './repozytoriumDokumentow'
import { pobierzStanRejestruDokumentow, zapiszStanRejestruDokumentow, type StanRejestruDokumentow } from './rejestrDokumentow'

const kluczeProstychSzkicow: Array<{ klucz: string; typ: TypDokumentu; generatorId: string; tytul: string }> = [
  { klucz: 'ultimate-pomagier.listy-obecnosci.szkic', typ: 'LISTA_OBECNOSCI', generatorId: 'listy_obecnosci', tytul: 'Lista obecności' },
  { klucz: 'ultimate-pomagier.ankiety.szkic', typ: 'ANKIETA', generatorId: 'ankiety', tytul: 'Ankieta' },
  { klucz: 'ultimate-pomagier.karta-na-drzwi.szkic', typ: 'KARTA_NA_DRZWI', generatorId: 'karta_na_drzwi', tytul: 'Karta na drzwi' },
]
const kluczHistoriiSzczegolow = 'ultimatePomagier.szczegolyOrganizacyjne.historia'
const kluczeAutosave: Array<{ klucz: string; generatorId: string }> = [
  { klucz: 'ultimatePomagier.programySzkolen.autosave.v1', generatorId: 'programy_szkolen' },
  { klucz: 'ultimate-pomagier-program-szkolenia-roboczy', generatorId: 'programy_szkolen' },
  { klucz: 'ultimatePomagier.szczegolyOrganizacyjne.autosave', generatorId: 'szczegoly_organizacyjne' },
  { klucz: 'ultimate-pomagier.dyplomy.generator-pawla', generatorId: 'dyplomy' },
]

export type RaportMigracjiStarszychDokumentow = { znalezione: number; przeniesione: number; pominiete: number; bledne: number; dokumenty: number; historia: number; autosave: number; konflikty: number; ostrzezenia: string[]; mapowanieId: Record<string, string>; wykonano: boolean }
type RekordLegacy = { id: string; typGeneratora: 'programy_szkolen' | 'szczegoly_organizacyjne' | 'listy_obecnosci'; tytul: string; stanCyklu: string; statusBiznesowy?: string | null; utworzono?: string; zaktualizowano?: string; opublikowano?: string; usunieto?: string; autorId?: string; opiekunId?: string; widocznosc?: string; zrodlo?: string; rekordZrodlowyId?: string; wersjaFormatu?: string; daneDokumentu: unknown; metadaneGeneratora?: Record<string, unknown> }
type WpisLegacy = { id: string; typGeneratora: RekordLegacy['typGeneratora']; dokumentId?: string; data?: string; dane: unknown }

function czyObiekt(wartosc: unknown): wartosc is Record<string, unknown> { return Boolean(wartosc && typeof wartosc === 'object' && !Array.isArray(wartosc)) }
function odczytajJson(klucz: string): unknown | null { const zapis = localStorage.getItem(klucz); if (zapis === null) return null; try { return JSON.parse(zapis) as unknown } catch { throw new Error(`Uszkodzony JSON źródła: ${klucz}.`) } }
function data(wartosc: unknown, fallback: string) { return typeof wartosc === 'string' && !Number.isNaN(Date.parse(wartosc)) ? wartosc : fallback }
function skrot(wartosc: unknown) { const tekst = JSON.stringify(wartosc); let suma = 2166136261; for (const znak of tekst) { suma ^= znak.charCodeAt(0); suma = Math.imul(suma, 16777619) } return (suma >>> 0).toString(16).padStart(8, '0') }
function kluczZrodla(typ: string, id: string) { return `legacy:${typ}:${id}` }
function stabilneId(typ: string, id: string, odcisk: string) { return `legacy-${typ}-${id}-${odcisk}`.replace(/[^a-zA-Z0-9_-]/g, '-') }
function status(stanCyklu: string): StatusDokumentu { return stanCyklu === 'opublikowany' ? 'OPUBLIKOWANY' : stanCyklu === 'archiwalny' ? 'ZARCHIWIZOWANY' : 'ROBOCZY' }
function typDokumentu(typ: RekordLegacy['typGeneratora']): TypDokumentu { return typ === 'programy_szkolen' ? 'PROGRAM_SZKOLENIA' : typ === 'szczegoly_organizacyjne' ? 'SZCZEGOLY_ORGANIZACYJNE' : 'LISTA_OBECNOSCI' }
function raportPoczatkowy(): RaportMigracjiStarszychDokumentow { return { znalezione: 0, przeniesione: 0, pominiete: 0, bledne: 0, dokumenty: 0, historia: 0, autosave: 0, konflikty: 0, ostrzezenia: [], mapowanieId: {}, wykonano: false } }

function pobierzLegacy(): { dokumenty: RekordLegacy[]; historia: WpisLegacy[] } {
  const odczyt = odczytajJson(kluczRepozytoriumDokumentow)
  if (odczyt === null) return { dokumenty: [], historia: [] }
  if (!czyObiekt(odczyt) || !Array.isArray(odczyt.dokumenty) || !Array.isArray(odczyt.historia)) throw new Error('Legacy repozytorium ma nieobsługiwany schemat.')
  const dokumenty = odczyt.dokumenty.filter((wartosc): wartosc is RekordLegacy => czyObiekt(wartosc) && typeof wartosc.id === 'string' && (wartosc.typGeneratora === 'programy_szkolen' || wartosc.typGeneratora === 'szczegoly_organizacyjne' || wartosc.typGeneratora === 'listy_obecnosci') && typeof wartosc.tytul === 'string' && 'daneDokumentu' in wartosc)
  if (dokumenty.length !== odczyt.dokumenty.length) throw new Error('Legacy repozytorium zawiera uszkodzony dokument.')
  const historia = odczyt.historia.filter((wartosc): wartosc is WpisLegacy => czyObiekt(wartosc) && typeof wartosc.id === 'string' && (wartosc.typGeneratora === 'programy_szkolen' || wartosc.typGeneratora === 'szczegoly_organizacyjne' || wartosc.typGeneratora === 'listy_obecnosci') && 'dane' in wartosc)
  if (historia.length !== odczyt.historia.length) throw new Error('Legacy repozytorium zawiera uszkodzoną historię.')
  return { dokumenty, historia }
}

function pobierzPowiazania(rekord: RekordLegacy) {
  const metadane = rekord.metadaneGeneratora ?? {}
  const dane = czyObiekt(rekord.daneDokumentu) ? rekord.daneDokumentu : {}
  const powiazanie = czyObiekt(dane.powiazanieZeZrodlem) ? dane.powiazanieZeZrodlem : {}
  const szczegolyId = typeof metadane.szczegolyOrganizacyjneId === 'string' ? metadane.szczegolyOrganizacyjneId : typeof powiazanie.szczegolyOrganizacyjneId === 'string' ? powiazanie.szczegolyOrganizacyjneId : null
  const odcisk = typeof metadane.odciskDanych === 'string' ? metadane.odciskDanych : typeof powiazanie.odciskDanych === 'string' ? powiazanie.odciskDanych : null
  return { szkolenieId: typeof dane.szkolenieId === 'string' ? dane.szkolenieId : null, grupaId: typeof metadane.grupaId === 'string' ? metadane.grupaId : typeof powiazanie.grupaId === 'string' ? powiazanie.grupaId : null, klientId: null, organizatorId: null, szczegolyOrganizacyjneId: szczegolyId, wersjaSzczegolowId: typeof metadane.wersjaSzczegolowId === 'string' ? metadane.wersjaSzczegolowId : null, odciskDanychZrodlowych: odcisk }
}

function dodajDokumentLegacy(stan: StanRejestruDokumentow, rekord: RekordLegacy, raport: RaportMigracjiStarszychDokumentow, idMigracji: string) {
  raport.znalezione += 1
  const odcisk = skrot(rekord)
  const klucz = kluczZrodla(rekord.typGeneratora, rekord.id)
  const juzZmigrowany = stan.dokumenty.find((dokument) => dokument.pochodzenieMigracji?.magazyn === 'repozytoriumDokumentow' && dokument.pochodzenieMigracji.idLegacy === rekord.id && dokument.pochodzenieMigracji.typLegacy === rekord.typGeneratora && dokument.pochodzenieMigracji.odciskZrodla === odcisk)
  if (juzZmigrowany) { raport.pominiete += 1; raport.mapowanieId[klucz] = juzZmigrowany.id; return }
  const kolizja = stan.dokumenty.find((dokument) => dokument.id === rekord.id)
  const id = kolizja ? stabilneId(rekord.typGeneratora, rekord.id, odcisk) : rekord.id
  if (kolizja) { raport.konflikty += 1; raport.ostrzezenia.push(`Konflikt ID legacy ${rekord.id}; zachowano dokument nowego rejestru.`) }
  const teraz = new Date().toISOString()
  const powiazania = pobierzPowiazania(rekord)
  const dokument = utworzNowyDokument({ id, dokumentLogicznyId: id, typ: typDokumentu(rekord.typGeneratora), tytul: rekord.tytul, generatorId: rekord.typGeneratora, daneDokumentu: rekord.daneDokumentu, ustawieniaDokumentu: rekord.metadaneGeneratora ?? {}, statusBiznesowy: rekord.statusBiznesowy ?? null, widocznosc: rekord.widocznosc ?? null, zrodloUtworzenia: rekord.zrodlo ?? 'migracja', rekordZrodlowyId: rekord.rekordZrodlowyId ?? null, wersjaFormatu: rekord.wersjaFormatu ?? null, powiazania, szkolenieId: powiazania.szkolenieId, integralnosc: { powiazanieZeSzczegolami: powiazania.szczegolyOrganizacyjneId ? 'POWIAZANY_ZE_SZCZEGOLAMI' : 'SAMODZIELNY', idZrodlowychSzczegolow: powiazania.szczegolyOrganizacyjneId, znacznikDanychZrodlowych: powiazania.odciskDanychZrodlowych, reczneNadpisania: czyObiekt((rekord.daneDokumentu as Record<string, unknown>).korektyReczne) ? (rekord.daneDokumentu as Record<string, unknown>).korektyReczne as Record<string, unknown> : {} }, pochodzenieMigracji: { magazyn: 'repozytoriumDokumentow', klucz: kluczRepozytoriumDokumentow, typLegacy: rekord.typGeneratora, idLegacy: rekord.id, odciskZrodla: odcisk, idMigracji, zmigrowano: teraz } })
  const utworzono = data(rekord.utworzono, teraz); const zmodyfikowano = data(rekord.zaktualizowano, utworzono); const stanCyklu = status(rekord.stanCyklu)
  const docelowy: Dokument<unknown, unknown> = { ...dokument, utworzono, zmodyfikowano, zaktualizowano: zmodyfikowano, status: stanCyklu, opublikowano: stanCyklu === 'OPUBLIKOWANY' ? data(rekord.opublikowano, zmodyfikowano) : null, czyZarchiwizowany: stanCyklu === 'ZARCHIWIZOWANY', zarchiwizowano: stanCyklu === 'ZARCHIWIZOWANY' ? zmodyfikowano : null, czyUsunietyMiekko: rekord.stanCyklu === 'kosz', usunieto: rekord.stanCyklu === 'kosz' ? data(rekord.usunieto, zmodyfikowano) : null }
  stan.dokumenty.unshift(docelowy); stan.historia.unshift({ id: `migracja-dokumentu-${odcisk}`, dokumentId: id, dokumentLogicznyId: id, typ: 'migracja', data: teraz, dane: { rekord }, automatyczne: true, daneLegacy: rekord, pochodzenie: { magazyn: 'repozytoriumDokumentow', klucz: kluczRepozytoriumDokumentow, idLegacy: rekord.id } })
  raport.przeniesione += 1; raport.dokumenty += 1; raport.mapowanieId[klucz] = id
}

function dodajHistorieLegacy(stan: StanRejestruDokumentow, wpis: WpisLegacy, raport: RaportMigracjiStarszychDokumentow) {
  raport.znalezione += 1
  const id = `legacy-historia-${wpis.typGeneratora}-${wpis.id}`
  if (stan.historia.some((pozycja) => pozycja.id === id)) { raport.pominiete += 1; return }
  const dokumentId = wpis.dokumentId ? raport.mapowanieId[kluczZrodla(wpis.typGeneratora, wpis.dokumentId)] ?? null : null
  if (wpis.dokumentId && !dokumentId) raport.ostrzezenia.push(`Historia ${wpis.id} zachowana bez przypisania dokumentu.`)
  stan.historia.unshift({ id, dokumentId, dokumentLogicznyId: dokumentId, typ: 'migracja_historii', data: data(wpis.data, new Date().toISOString()), dane: wpis.dane, automatyczne: true, daneLegacy: wpis, pochodzenie: { magazyn: 'repozytoriumDokumentow', klucz: kluczRepozytoriumDokumentow, idLegacy: wpis.id } })
  raport.przeniesione += 1; raport.historia += 1
}

function dodajAutosave(stan: StanRejestruDokumentow, klucz: string, generatorId: string, raport: RaportMigracjiStarszychDokumentow) {
  const dane = odczytajJson(klucz); if (dane === null) return
  raport.znalezione += 1
  const id = `legacy-autosave-${generatorId}-${skrot(dane)}`
  if (stan.autosave.some((pozycja) => pozycja.id === id)) { raport.pominiete += 1; return }
  const rekord = czyObiekt(dane) ? dane : { dane }
  stan.autosave.unshift({ id, generatorId, dokumentId: typeof rekord.aktywnaKopiaId === 'string' ? rekord.aktywnaKopiaId : null, dane, zapisano: data(rekord.zapisano, new Date().toISOString()) })
  raport.przeniesione += 1; raport.autosave += 1
}

function dodajProsteSzkice(stan: StanRejestruDokumentow, raport: RaportMigracjiStarszychDokumentow, idMigracji: string) {
  kluczeProstychSzkicow.forEach(({ klucz, typ, generatorId, tytul }) => {
    const tekst = localStorage.getItem(klucz); if (tekst === null) return
    raport.znalezione += 1
    if (!tekst.trim()) { raport.pominiete += 1; return }
    const odcisk = skrot(tekst); const id = `${generatorId}-stary-szkic-${odcisk}`
    if (stan.dokumenty.some((dokument) => dokument.pochodzenieMigracji?.klucz === klucz && dokument.pochodzenieMigracji.odciskZrodla === odcisk)) { raport.pominiete += 1; return }
    const dokument = utworzNowyDokument({ id, dokumentLogicznyId: id, typ, tytul, generatorId, daneDokumentu: { tekst }, ustawieniaDokumentu: {}, zrodloUtworzenia: 'migracja', pochodzenieMigracji: { magazyn: 'localStorage', klucz, typLegacy: 'szkic', idLegacy: klucz, odciskZrodla: odcisk, idMigracji, zmigrowano: new Date().toISOString() } })
    stan.dokumenty.unshift(dokument); raport.przeniesione += 1; raport.dokumenty += 1
  })
}

function dodajStarszeKopieSzczegolow(stan: StanRejestruDokumentow, raport: RaportMigracjiStarszychDokumentow, idMigracji: string) {
  ;[
    { klucz: 'ultimatePomagier.kopieRobocze', czyOpublikowane: false },
    { klucz: 'ultimatePomagier.szczegolyOrganizacyjne.kopieRobocze', czyOpublikowane: false },
    { klucz: 'ultimatePomagier.szczegolyOrganizacyjne.aktualnaWersja', czyOpublikowane: false },
    { klucz: 'ultimatePomagier.szczegolyOrganizacyjne.opublikowane', czyOpublikowane: true },
  ].forEach(({ klucz, czyOpublikowane }) => {
    const odczyt = odczytajJson(klucz); if (odczyt === null) return
    const wersje = Array.isArray(odczyt) ? odczyt : [odczyt]
    wersje.forEach((wersja) => {
      if (!czyObiekt(wersja) || typeof wersja.id !== 'string') return
      const dane = czyObiekt(wersja.dane) ? wersja.dane : czyObiekt(wersja.daneFormularza) ? wersja.daneFormularza : null
      if (!dane || !['tytulSzkolenia', 'statusSzczegolow', 'programSzkolenia', 'uwagi'].some((pole) => pole in dane)) return
      raport.znalezione += 1
      const odcisk = skrot(wersja)
      if (stan.dokumenty.some((dokument) => dokument.pochodzenieMigracji?.klucz === klucz && dokument.pochodzenieMigracji.odciskZrodla === odcisk)) { raport.pominiete += 1; return }
      const id = stan.dokumenty.some((dokument) => dokument.id === wersja.id) ? stabilneId('szczegoly_organizacyjne', wersja.id, odcisk) : wersja.id
      const dataZapisu = data(wersja.dataZapisu, new Date().toISOString())
      const daneDokumentu = { ...wersja, dane, grupy: Array.isArray(wersja.grupy) ? wersja.grupy : [], adresaci: wersja.adresaci ?? {}, statusyPol: wersja.statusyPol ?? {} }
      const dokument = utworzNowyDokument({ id, dokumentLogicznyId: id, typ: 'SZCZEGOLY_ORGANIZACYJNE', tytul: typeof dane.tytulSzkolenia === 'string' ? dane.tytulSzkolenia : 'Szczegóły organizacyjne', generatorId: 'szczegoly_organizacyjne', daneDokumentu, ustawieniaDokumentu: {}, zrodloUtworzenia: 'migracja', pochodzenieMigracji: { magazyn: 'localStorage', klucz, typLegacy: 'kopia_szczegolow', idLegacy: wersja.id, odciskZrodla: odcisk, idMigracji, zmigrowano: new Date().toISOString() } })
      stan.dokumenty.unshift({ ...dokument, utworzono: dataZapisu, zmodyfikowano: dataZapisu, zaktualizowano: dataZapisu, status: czyOpublikowane ? 'OPUBLIKOWANY' : 'ROBOCZY', opublikowano: czyOpublikowane ? data(wersja.dataPublikacji, dataZapisu) : null })
      raport.przeniesione += 1; raport.dokumenty += 1
    })
  })
}

export function analizujMigracjeStarszychDokumentow(): RaportMigracjiStarszychDokumentow {
  const raport = raportPoczatkowy(); const stan = pobierzStanRejestruDokumentow(); const legacy = pobierzLegacy(); const kandydat = structuredClone(stan)
  legacy.dokumenty.forEach((rekord) => dodajDokumentLegacy(kandydat, rekord, raport, 'migracja-reczna-v1'))
  legacy.historia.forEach((wpis) => dodajHistorieLegacy(kandydat, wpis, raport))
  const historiaSzczegolow = odczytajJson(kluczHistoriiSzczegolow)
  if (historiaSzczegolow !== null) { if (!Array.isArray(historiaSzczegolow)) throw new Error('Historia Szczegółów ma nieobsługiwany schemat.'); historiaSzczegolow.forEach((wpis, indeks) => dodajHistorieLegacy(kandydat, { id: czyObiekt(wpis) && typeof wpis.id === 'string' ? wpis.id : `szczegoly-${indeks}`, typGeneratora: 'szczegoly_organizacyjne', dokumentId: czyObiekt(wpis) && typeof wpis.dokumentId === 'string' ? wpis.dokumentId : undefined, data: czyObiekt(wpis) && typeof wpis.data === 'string' ? wpis.data : undefined, dane: wpis }, raport)) }
  kluczeAutosave.forEach(({ klucz, generatorId }) => dodajAutosave(kandydat, klucz, generatorId, raport))
  dodajProsteSzkice(kandydat, raport, 'migracja-reczna-v1')
  dodajStarszeKopieSzczegolow(kandydat, raport, 'migracja-reczna-v1')
  return raport
}

export function wykonajMigracjeStarszychDokumentow(): RaportMigracjiStarszychDokumentow {
  const raport = raportPoczatkowy(); const stan = pobierzStanRejestruDokumentow(); const kandydat = structuredClone(stan); const idMigracji = `migracja-reczna-${Date.now()}`; const legacy = pobierzLegacy()
  legacy.dokumenty.forEach((rekord) => dodajDokumentLegacy(kandydat, rekord, raport, idMigracji)); legacy.historia.forEach((wpis) => dodajHistorieLegacy(kandydat, wpis, raport))
  const historiaSzczegolow = odczytajJson(kluczHistoriiSzczegolow)
  if (historiaSzczegolow !== null) { if (!Array.isArray(historiaSzczegolow)) throw new Error('Historia Szczegółów ma nieobsługiwany schemat.'); historiaSzczegolow.forEach((wpis, indeks) => dodajHistorieLegacy(kandydat, { id: czyObiekt(wpis) && typeof wpis.id === 'string' ? wpis.id : `szczegoly-${indeks}`, typGeneratora: 'szczegoly_organizacyjne', dokumentId: czyObiekt(wpis) && typeof wpis.dokumentId === 'string' ? wpis.dokumentId : undefined, data: czyObiekt(wpis) && typeof wpis.data === 'string' ? wpis.data : undefined, dane: wpis }, raport)) }
  kluczeAutosave.forEach(({ klucz, generatorId }) => dodajAutosave(kandydat, klucz, generatorId, raport)); dodajProsteSzkice(kandydat, raport, idMigracji); dodajStarszeKopieSzczegolow(kandydat, raport, idMigracji)
  utworzKopieLokalnaPrzedOperacja('PRZED_OPERACJA')
  kandydat.migracje.unshift({ id: idMigracji, stan: 'OCZEKUJE_WERYFIKACJI', data: new Date().toISOString(), mapowanieId: raport.mapowanieId, raport: { ...raport } })
  zapiszStanRejestruDokumentow(kandydat)
  const odczyt = pobierzStanRejestruDokumentow(); if (odczyt.dokumenty.length !== kandydat.dokumenty.length || odczyt.historia.length !== kandydat.historia.length) throw new Error('Walidacja zapisu migracji nie powiodła się.')
  odczyt.migracje[0].stan = 'POTWIERDZONA'
  zapiszStanRejestruDokumentow(odczyt)
  raport.wykonano = true
  return raport
}

export function migrujStarszeDokumenty(): RaportMigracjiStarszychDokumentow { return wykonajMigracjeStarszychDokumentow() }
