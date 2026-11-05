import type { Dokument } from './modelDokumentu'
import { repozytoriumWspolnychDokumentow, type WpisHistoriiWspolnegoDokumentu } from './rejestrDokumentow'
import { pobierzUzytkownika } from '../../kartoteki/uzytkownicy/magazynUzytkownikow'
import { czyMozeEksportowac, czyMozeWysylac } from '../../kartoteki/uzytkownicy/uprawnienia'
import { czyTrwaPodgladUzytkownika } from '../../kartoteki/uzytkownicy/stanPodgladuUzytkownika'

export type KontekstWydruku = {
  szkolenieId: string
  szczegolyId: string
  grupaId: string
  paczkaId: string | null
  checklistaId: string | null
}

export type OperacjaWydruku = KontekstWydruku & {
  operacjaId: string
  dokumentId: string
  wersjaDokumentuId: string
  liczbaEgzemplarzy: number
  data: string
  uzytkownikId: string
  status: 'ZLECONY' | 'POTWIERDZONY' | 'KOREKTA'
  korygowanaOperacjaId: string | null
  powod: string
}

export const typHistoriiWydruku = 'operacja_wydruku'

export function czyTenSamKontekstWydruku(pierwszy: KontekstWydruku, drugi: KontekstWydruku) {
  return pierwszy.szkolenieId === drugi.szkolenieId && pierwszy.szczegolyId === drugi.szczegolyId
    && pierwszy.grupaId === drugi.grupaId && pierwszy.paczkaId === drugi.paczkaId && pierwszy.checklistaId === drugi.checklistaId
}

export function czyPoprawnaIloscWydruku(ilosc: number) { return Number.isSafeInteger(ilosc) && ilosc >= 0 }

export function odczytajOperacjeWydruku(wpis: WpisHistoriiWspolnegoDokumentu): OperacjaWydruku | null {
  const dane = wpis.dane
  if (wpis.typ !== typHistoriiWydruku || !dane || typeof dane !== 'object') return null
  const operacja = dane as Partial<OperacjaWydruku>
  if (![operacja.operacjaId, operacja.dokumentId, operacja.wersjaDokumentuId, operacja.szkolenieId, operacja.szczegolyId, operacja.grupaId, operacja.uzytkownikId].every((wartosc) => typeof wartosc === 'string' && wartosc.length > 0)
    || typeof operacja.liczbaEgzemplarzy !== 'number' || !czyPoprawnaIloscWydruku(operacja.liczbaEgzemplarzy)
    || typeof operacja.data !== 'string' || Number.isNaN(Date.parse(operacja.data)) || operacja.data !== wpis.data
    || operacja.dokumentId !== wpis.dokumentId || wpis.id !== `wydruk:${operacja.operacjaId}`
    || ![operacja.paczkaId, operacja.checklistaId, operacja.korygowanaOperacjaId].every((wartosc) => wartosc === null || typeof wartosc === 'string')
    || !['ZLECONY', 'POTWIERDZONY', 'KOREKTA'].includes(operacja.status ?? '') || typeof operacja.powod !== 'string'
    || (operacja.status === 'KOREKTA' ? !operacja.korygowanaOperacjaId || !operacja.powod.trim() : operacja.korygowanaOperacjaId !== null)) return null
  return operacja as OperacjaWydruku
}

// Numer wersji nie rośnie przy każdej edycji w miejscu. Odcisk obejmuje również jej treść i powiązania.
export function pobierzIdWersjiWydruku(dokument: Dokument<unknown, unknown>) {
  const dane = dokument.typ === 'CHECKLISTA_PACZKI' && dokument.daneDokumentu && typeof dokument.daneDokumentu === 'object'
    ? { ...dokument.daneDokumentu, historia: undefined, wersjeWydruku: undefined, prosbyOWeryfikacje: undefined, zalaczniki: undefined, statusChecklisty: undefined }
    : dokument.daneDokumentu
  const tekst = JSON.stringify({ dane, ustawienia: dokument.ustawieniaDokumentu, powiazania: dokument.powiazania, tytul: dokument.tytul })
  let odcisk = 2166136261
  let drugiOdcisk = 5381
  for (let indeks = 0; indeks < tekst.length; indeks++) {
    odcisk = Math.imul(odcisk ^ tekst.charCodeAt(indeks), 16777619)
    drugiOdcisk = Math.imul(drugiOdcisk, 33) ^ tekst.charCodeAt(indeks)
  }
  return `${dokument.id}:v${dokument.wersja}:${(odcisk >>> 0).toString(16)}-${(drugiOdcisk >>> 0).toString(16)}`
}

export function obliczPotwierdzoneWydruki(operacje: OperacjaWydruku[]) {
  const zastapione = new Set(operacje.map((operacja) => operacja.korygowanaOperacjaId).filter(Boolean))
  return operacje.filter((operacja) => operacja.status !== 'ZLECONY' && !zastapione.has(operacja.operacjaId))
    .reduce((suma, operacja) => suma + operacja.liczbaEgzemplarzy, 0)
}

export function czyHistoriaWydrukowPoprawna(operacje: OperacjaWydruku[]) {
  const wedlugId = new Map(operacje.map((operacja) => [operacja.operacjaId, operacja]))
  const zastapione = new Set<string>()
  if (wedlugId.size !== operacje.length) return false
  for (const operacja of operacje) {
    if (operacja.status !== 'KOREKTA') continue
    const poprzednia = wedlugId.get(operacja.korygowanaOperacjaId ?? '')
    if (!poprzednia || poprzednia.status === 'ZLECONY' || poprzednia.dokumentId !== operacja.dokumentId || poprzednia.wersjaDokumentuId !== operacja.wersjaDokumentuId
      || !czyTenSamKontekstWydruku(poprzednia, operacja) || zastapione.has(poprzednia.operacjaId)) return false
    zastapione.add(poprzednia.operacjaId)
    const odwiedzone = new Set([operacja.operacjaId])
    let biezaca: OperacjaWydruku | undefined = poprzednia
    while (biezaca) {
      if (odwiedzone.has(biezaca.operacjaId)) return false
      odwiedzone.add(biezaca.operacjaId)
      biezaca = wedlugId.get(biezaca.korygowanaOperacjaId ?? '')
    }
  }
  return true
}

export async function zBlokadaWydrukow<T>(wykonaj: () => T): Promise<T> {
  if (typeof window !== 'undefined' && navigator.locks) return navigator.locks.request('pomagier-operacje-wydrukow', wykonaj)
  return wykonaj()
}

export function sprawdzUprawnienieWydrukow(uzytkownikId: string | null, rodzaj: 'druk' | 'potwierdzenie') {
  const uzytkownik = uzytkownikId ? pobierzUzytkownika(uzytkownikId) : null
  if (czyTrwaPodgladUzytkownika() || !(rodzaj === 'druk' ? czyMozeEksportowac(uzytkownik) : czyMozeWysylac(uzytkownik))) throw new Error('Brak uprawnienia do tej operacji.')
}

export function zapiszOperacjeWydruku(operacja: OperacjaWydruku) {
  sprawdzUprawnienieWydrukow(operacja.uzytkownikId, operacja.status === 'ZLECONY' ? 'druk' : 'potwierdzenie')
  const wpis: WpisHistoriiWspolnegoDokumentu = { id: `wydruk:${operacja.operacjaId}`, dokumentId: operacja.dokumentId, dokumentLogicznyId: null, typ: typHistoriiWydruku, data: operacja.data, dane: operacja, automatyczne: false }
  if (!odczytajOperacjeWydruku(wpis)) throw new Error('Nieprawidłowe dane operacji wydruku.')
  const historia = repozytoriumWspolnychDokumentow.pobierzHistorie()
  const istniejacy = historia.find((obecny) => obecny.id === wpis.id)
  if (istniejacy) {
    // Ponowienie tej samej operacji jest bezpieczne; kolizja z innym zapisem jest błędem.
    const poprzednia = odczytajOperacjeWydruku(istniejacy)
    if (!poprzednia || JSON.stringify({ ...poprzednia, data: '' }) !== JSON.stringify({ ...operacja, data: '' })) throw new Error('Identyfikator operacji został już użyty.')
    return poprzednia
  }
  const dokument = repozytoriumWspolnychDokumentow.pobierzPoId(operacja.dokumentId)
  if (!dokument || dokument.czyUsunietyMiekko || dokument.czyZarchiwizowany) throw new Error('Dokument jest niedostępny.')
  if (operacja.status !== 'KOREKTA' && pobierzIdWersjiWydruku(dokument) !== operacja.wersjaDokumentuId) throw new Error('Dokument zmienił się. Odśwież panel i sprawdź wersję wydruku.')
  if (operacja.status === 'KOREKTA') {
    const operacje = historia.map(odczytajOperacjeWydruku).filter((obecna): obecna is OperacjaWydruku => obecna !== null)
    const poprzednia = operacje.find((obecna) => obecna.operacjaId === operacja.korygowanaOperacjaId)
    if (!poprzednia || poprzednia.status === 'ZLECONY' || poprzednia.dokumentId !== operacja.dokumentId
      || poprzednia.wersjaDokumentuId !== operacja.wersjaDokumentuId || !czyTenSamKontekstWydruku(poprzednia, operacja)
      || operacje.some((obecna) => obecna.korygowanaOperacjaId === poprzednia.operacjaId)) throw new Error('Wpis został już skorygowany albo nie pasuje do dokumentu. Odśwież historię.')
  }
  repozytoriumWspolnychDokumentow.dodajWpisHistorii({ ...wpis, dokumentLogicznyId: dokument.dokumentLogicznyId })
  return operacja
}
