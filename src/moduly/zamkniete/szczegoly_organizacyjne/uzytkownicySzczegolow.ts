import { pobierzUzytkownika, pobierzUzytkownikow } from '../../../kartoteki/uzytkownicy/magazynUzytkownikow'
import { czyJestAdministratorem, czyMozeAkceptowac } from '../../../kartoteki/uzytkownicy/uprawnienia'
import type { Uzytkownik } from '../../../kartoteki/uzytkownicy/typyUzytkownikow'
import { etykietyOrganizacji, pobierzNazweWyswietlanaUzytkownika, pobierzNazweUzytkownika } from '../../../kartoteki/uzytkownicy/typyUzytkownikow'
import { pobierzZalogowanegoUzytkownika } from '../../../aplikacja/logowanie/sesjaUzytkownika'
import type { OpublikowaneSzczegolyOrganizacyjne, WersjaRoboczaGeneratora } from './typy'

export type KontoSzczegolow = Pick<Uzytkownik, 'id' | 'rola' | 'kolorProfilu' | 'status' | 'odznaki'> & { nazwa: string; imieNazwisko: string; pseudonim: string; organizacja: string; kolorOpiekuna?: string }

const nieznaneKonto: KontoSzczegolow = { id: '', nazwa: 'Nieznany użytkownik', imieNazwisko: '', pseudonim: '', organizacja: '', rola: 'GOSC', kolorProfilu: '#94a3b8', status: 'NIEAKTYWNY', odznaki: [] }

function mapujKonto(uzytkownik: Uzytkownik): KontoSzczegolow {
  return { id: uzytkownik.id, nazwa: pobierzNazweWyswietlanaUzytkownika(uzytkownik), imieNazwisko: pobierzNazweUzytkownika(uzytkownik), pseudonim: uzytkownik.pseudonim, organizacja: etykietyOrganizacji[uzytkownik.organizacja], rola: uzytkownik.rola, kolorProfilu: uzytkownik.kolorProfilu, kolorOpiekuna: uzytkownik.rola === 'OPIEKUN' ? uzytkownik.kolorProfilu : undefined, status: uzytkownik.status, odznaki: [...uzytkownik.odznaki] }
}

export function pobierzOpiekunowSzczegolow() {
  return pobierzUzytkownikow().filter((uzytkownik) => uzytkownik.rola === 'OPIEKUN' && uzytkownik.status === 'AKTYWNY').map(mapujKonto)
}

export function pobierzKontoSzczegolow(id: string) { const uzytkownik = pobierzUzytkownika(id); return uzytkownik ? mapujKonto(uzytkownik) : undefined }
export function pobierzNazweOpiekuna(id: string) { return pobierzKontoSzczegolow(id)?.nazwa || (id ? 'Nieznany użytkownik' : 'Bez opiekuna') }
export function pobierzKolorTlaOpiekuna(id: string) { return `${pobierzKontoSzczegolow(id)?.kolorOpiekuna || '#d9ead3'}cc` }
export function pobierzAktywneKontoSzczegolow() { const uzytkownik = pobierzZalogowanegoUzytkownika(); return uzytkownik ? mapujKonto(uzytkownik) : nieznaneKonto }
export function czyKontoArchitekta(konto: KontoSzczegolow) { return czyJestAdministratorem(pobierzUzytkownika(konto.id)) }
export function czyKontoMozeWidziecKopie(konto: KontoSzczegolow, kopia: WersjaRoboczaGeneratora) { return czyKontoArchitekta(konto) || kopia.autorId === konto.id || kopia.dane.opiekunId === konto.id }
export function czyKontoMozeEdytowacKopie(konto: KontoSzczegolow, kopia: WersjaRoboczaGeneratora) { return czyKontoArchitekta(konto) || kopia.dane.opiekunId === konto.id }
export function czyKontoMozeZaakceptowacSzczegoly(konto: KontoSzczegolow, rekord: OpublikowaneSzczegolyOrganizacyjne) { return czyKontoArchitekta(konto) || (rekord.opiekunId === konto.id && czyMozeAkceptowac(pobierzUzytkownika(konto.id))) }
export function czyKontoMozeCofnacStatus(konto: KontoSzczegolow, rekord: OpublikowaneSzczegolyOrganizacyjne) { return czyKontoMozeZaakceptowacSzczegoly(konto, rekord) }
export function czyKontoMozeEdytowacSzczegoly(konto: KontoSzczegolow, opiekunId: string, czyNowy = false) { return czyKontoArchitekta(konto) || (konto.status === 'AKTYWNY' && konto.rola === 'OPIEKUN' && (czyNowy || !opiekunId || opiekunId === konto.id)) }
