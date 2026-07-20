import { daneStartoweUzytkownikow, utworzIdUzytkownika } from './daneUzytkownikow'
import { walidujEmail, walidujTelefonMiedzynarodowy } from '../../wspolne/walidacja/walidatoryDanych'
import { normalizujTelefon } from '../../wspolne/telefon/telefon'
import { czyJestArchitektem } from './typyUzytkownikow'
import type { FormularzUzytkownika, RolaUzytkownika, Uzytkownik } from './typyUzytkownikow'

export const kluczMagazynuUzytkownikow = 'ultimatePomagier.uzytkownicy.v1'

function skopiujUzytkownika(uzytkownik: Uzytkownik): Uzytkownik {
  const emaile = uzytkownik.emaile.map((email) => email.trim()).filter(Boolean)
  return { ...uzytkownik, email: uzytkownik.email?.trim() || emaile[0] || '', emaile, telefony: uzytkownik.telefony.map(normalizujTelefon), odznaki: [...uzytkownik.odznaki], aliasyHistoryczne: [...uzytkownik.aliasyHistoryczne] }
}

function czyPoprawnyUzytkownik(wartosc: unknown): wartosc is Uzytkownik {
  if (!wartosc || typeof wartosc !== 'object') return false
  const uzytkownik = wartosc as Partial<Uzytkownik>
  return typeof uzytkownik.id === 'string' && typeof uzytkownik.login === 'string' && typeof uzytkownik.rola === 'string' && typeof uzytkownik.status === 'string' && Array.isArray(uzytkownik.emaile) && Array.isArray(uzytkownik.telefony) && Array.isArray(uzytkownik.odznaki) && Array.isArray(uzytkownik.aliasyHistoryczne)
}

function odczytajMagazyn(): Uzytkownik[] | null {
  try {
    const zapis = localStorage.getItem(kluczMagazynuUzytkownikow)
    if (zapis === null) return null
    const dane: unknown = JSON.parse(zapis)
    return Array.isArray(dane) ? dane.filter(czyPoprawnyUzytkownik) : []
  } catch {
    return []
  }
}

export function wykonajMigracjeRoliArchitekta(uzytkownicy: Uzytkownik[]) {
  let czyZmieniono = false
  const wynik = uzytkownicy.map((uzytkownik) => {
    const docelowaRola: RolaUzytkownika = uzytkownik.id === 'administrator-kacper-madej'
      ? 'ARCHITEKT'
      : uzytkownik.rola === 'ARCHITEKT' ? 'ADMINISTRATOR' : uzytkownik.rola
    if (docelowaRola === uzytkownik.rola) return skopiujUzytkownika(uzytkownik)
    czyZmieniono = true
    return { ...skopiujUzytkownika(uzytkownik), rola: docelowaRola, wersjaUprawnien: uzytkownik.wersjaUprawnien + 1, zaktualizowano: new Date().toISOString() }
  })
  return { uzytkownicy: wynik, czyZmieniono }
}

export function zainicjalizujMagazynUzytkownikow() {
  const istniejacyMagazyn = odczytajMagazyn()
  if (istniejacyMagazyn !== null) {
    const migracja = wykonajMigracjeRoliArchitekta(istniejacyMagazyn)
    if (migracja.czyZmieniono) zapiszUzytkownikow(migracja.uzytkownicy)
    return migracja.uzytkownicy.map(skopiujUzytkownika)
  }

  const daneStartowe = wykonajMigracjeRoliArchitekta(daneStartoweUzytkownikow).uzytkownicy
  try { localStorage.setItem(kluczMagazynuUzytkownikow, JSON.stringify(daneStartowe)) } catch { return [] }
  return daneStartowe.map(skopiujUzytkownika)
}

export function pobierzUzytkownikow() { return zainicjalizujMagazynUzytkownikow().map(skopiujUzytkownika) }

function normalizuj(wartosc: unknown) { return String(wartosc ?? '').trim().toLocaleLowerCase('pl') }

export function pobierzUzytkownika(wartosc: string | null | undefined) {
  const szukanaWartosc = normalizuj(wartosc)
  if (!szukanaWartosc) return undefined
  return pobierzUzytkownikow().find((uzytkownik) => [uzytkownik.id, uzytkownik.login, uzytkownik.pseudonim, ...uzytkownik.emaile, ...uzytkownik.aliasyHistoryczne].some((pole) => normalizuj(pole) === szukanaWartosc))
}

export function pobierzAktywnychUzytkownikowWedlugRoli(rola?: RolaUzytkownika) {
  return pobierzUzytkownikow().filter((uzytkownik) => uzytkownik.status === 'AKTYWNY' && (!rola || uzytkownik.rola === rola))
}

export function zapiszUzytkownikow(uzytkownicy: Uzytkownik[]) {
  try { localStorage.setItem(kluczMagazynuUzytkownikow, JSON.stringify(uzytkownicy.map(skopiujUzytkownika))) } catch { return false }
  return true
}

export function czyLoginJestDostepny(login: string, pomijanyUzytkownikId?: string) {
  const znormalizowanyLogin = normalizuj(login)
  return Boolean(znormalizowanyLogin) && !pobierzUzytkownikow().some((uzytkownik) => uzytkownik.id !== pomijanyUzytkownikId && normalizuj(uzytkownik.login) === znormalizowanyLogin)
}

export function czyEmailJestDostepny(email: string, pomijanyUzytkownikId?: string) {
  const znormalizowanyEmail = normalizuj(email)
  return Boolean(znormalizowanyEmail) && !pobierzUzytkownikow().some((uzytkownik) => uzytkownik.id !== pomijanyUzytkownikId && uzytkownik.emaile.some((istniejacyEmail) => normalizuj(istniejacyEmail) === znormalizowanyEmail))
}

type DaneWlasnegoProfilu = Pick<FormularzUzytkownika, 'zwrot' | 'tytulNaukowy' | 'imie' | 'nazwisko' | 'pseudonim' | 'emaile' | 'telefony'>
type DaneProfiluAdministracyjnego = Omit<FormularzUzytkownika, 'id'>
type WynikAktualizacji = { uzytkownik?: Uzytkownik; blad?: string }

function czyPoprawnyKolor(kolor: string) { return /^#[0-9a-f]{6}$/i.test(kolor) }
function czyZmianaWplywaNaUprawnienia(przed: Uzytkownik, po: Uzytkownik) {
  return przed.rola !== po.rola || przed.organizacja !== po.organizacja || przed.status !== po.status || przed.przypisanyKlientId !== po.przypisanyKlientId || przed.przypisanyTrenerId !== po.przypisanyTrenerId || przed.odznaki.join('|') !== po.odznaki.join('|')
}

function walidujDaneProfilu(dane: DaneProfiluAdministracyjnego, uzytkownikId: string) {
  if (!dane.imie.trim() || !dane.nazwisko.trim()) return 'Imię i nazwisko są wymagane.'
  if (!dane.emaile.length || dane.emaile.some((email) => !walidujEmail(email.trim()))) return 'Podaj prawidłowy adres e-mail.'
  if (dane.telefony.some((telefon) => !walidujTelefonMiedzynarodowy(telefon))) return 'Podaj prawidłowy numer telefonu dla wybranego kraju.'
  if (!dane.login.trim() || !czyLoginJestDostepny(dane.login, uzytkownikId)) return 'Login jest zajęty lub nieprawidłowy.'
  if (dane.emaile.some((email) => !czyEmailJestDostepny(email, uzytkownikId))) return 'Adres e-mail jest już przypisany do innego użytkownika.'
  if (!czyPoprawnyKolor(dane.kolorProfilu)) return 'Kolor profilu musi mieć postać #RRGGBB.'
  return undefined
}

function zapiszAktualizacje(wykonujacy: Uzytkownik, uzytkownikId: string, dane: Partial<DaneProfiluAdministracyjnego>, tryb: 'wlasny' | 'administrator' | 'architekt'): WynikAktualizacji {
  const magazyn = pobierzUzytkownikow()
  const indeks = magazyn.findIndex((uzytkownik) => uzytkownik.id === uzytkownikId)
  if (indeks < 0) return { blad: 'Nie znaleziono użytkownika.' }
  const poprzedni = magazyn[indeks]
  if (tryb === 'administrator' && (wykonujacy.rola !== 'ADMINISTRATOR' || czyJestArchitektem(poprzedni))) return { blad: 'Administrator nie może edytować tego profilu.' }
  if (tryb === 'architekt' && !czyJestArchitektem(wykonujacy)) return { blad: 'Brak uprawnień Architekta.' }
  if (tryb === 'wlasny' && wykonujacy.id !== poprzedni.id) return { blad: 'Możesz edytować wyłącznie własny profil.' }

  const dozwolonePola = tryb === 'wlasny'
    ? ['zwrot', 'tytulNaukowy', 'imie', 'nazwisko', 'pseudonim', 'emaile', 'telefony'] as const
    : ['zwrot', 'tytulNaukowy', 'imie', 'nazwisko', 'pseudonim', 'emaile', 'telefony', 'login', 'rola', 'organizacja', 'odznaki', 'status', 'kolorProfilu', 'aliasyHistoryczne', 'przypisanyKlientId', 'przypisanyTrenerId', 'wymagaZmianyHasla'] as const
  const ograniczoneDane = Object.fromEntries(dozwolonePola.filter((pole) => pole in dane).map((pole) => [pole, dane[pole]])) as Partial<DaneProfiluAdministracyjnego>
  const kandydat = { ...poprzedni, ...ograniczoneDane, email: ograniczoneDane.emaile?.[0]?.trim() || poprzedni.email, id: poprzedni.id, utworzono: poprzedni.utworzono, ostatnieLogowanie: poprzedni.ostatnieLogowanie, wersjaUprawnien: poprzedni.wersjaUprawnien }

  if (kandydat.rola === 'ARCHITEKT' && kandydat.id !== 'administrator-kacper-madej') return { blad: 'Rolę Architekt może mieć wyłącznie Kacper Madej.' }
  if (poprzedni.id === 'administrator-kacper-madej' && (kandydat.rola !== 'ARCHITEKT' || kandydat.status !== 'AKTYWNY' || kandydat.organizacja === 'KLIENT' || kandydat.organizacja === 'ZEWNETRZNY')) return { blad: 'Chronione konto Architekta musi pozostać aktywne, wewnętrzne i z rolą Architekt.' }
  if (wykonujacy.id === poprzedni.id && wykonujacy.rola === 'ADMINISTRATOR' && (kandydat.rola !== 'ADMINISTRATOR' || kandydat.status !== 'AKTYWNY' || kandydat.organizacja === 'KLIENT' || kandydat.organizacja === 'ZEWNETRZNY')) return { blad: 'Administrator nie może osłabić własnego konta.' }
  const bladWalidacji = walidujDaneProfilu(kandydat, poprzedni.id)
  if (bladWalidacji) return { blad: bladWalidacji }

  const zaktualizowany = { ...kandydat, wersjaUprawnien: poprzedni.wersjaUprawnien + (czyZmianaWplywaNaUprawnienia(poprzedni, kandydat) ? 1 : 0), zaktualizowano: new Date().toISOString() }
  const nowyMagazyn = [...magazyn]
  nowyMagazyn[indeks] = zaktualizowany
  if (!zapiszUzytkownikow(nowyMagazyn)) return { blad: 'Nie udało się zapisać profilu.' }
  return { uzytkownik: skopiujUzytkownika(zaktualizowany) }
}

export function zaktualizujWlasnyProfil(wykonujacy: Uzytkownik, uzytkownikId: string, dane: DaneWlasnegoProfilu) { return zapiszAktualizacje(wykonujacy, uzytkownikId, dane, 'wlasny') }
export function zaktualizujUzytkownikaPrzezAdministratora(wykonujacy: Uzytkownik, uzytkownikId: string, dane: Partial<DaneProfiluAdministracyjnego>) { return zapiszAktualizacje(wykonujacy, uzytkownikId, dane, 'administrator') }
export function zaktualizujUzytkownikaPrzezArchitekta(wykonujacy: Uzytkownik, uzytkownikId: string, dane: Partial<DaneProfiluAdministracyjnego>) { return zapiszAktualizacje(wykonujacy, uzytkownikId, dane, 'architekt') }

export function utworzUzytkownikaPrzezAdministratora(wykonujacy: Uzytkownik, dane: FormularzUzytkownika): WynikAktualizacji {
  if (wykonujacy.rola !== 'ADMINISTRATOR' && !czyJestArchitektem(wykonujacy)) return { blad: 'Brak uprawnień do utworzenia konta.' }
  if (dane.rola === 'ARCHITEKT') return { blad: 'Rola Architekt jest chroniona i nie może zostać nadana podczas tworzenia konta.' }
  const bladWalidacji = walidujDaneProfilu(dane, '')
  if (bladWalidacji) return { blad: bladWalidacji }
  const teraz = new Date().toISOString()
  const uzytkownik: Uzytkownik = { ...dane, id: utworzIdUzytkownika(dane), email: dane.emaile[0].trim(), emaile: dane.emaile.map((email) => email.trim()), telefony: dane.telefony.map(normalizujTelefon), odznaki: [...dane.odznaki], aliasyHistoryczne: dane.aliasyHistoryczne.map((alias) => alias.trim()).filter(Boolean), wymagaZmianyHasla: false, wersjaUprawnien: 1, ostatnieLogowanie: null, utworzono: teraz, zaktualizowano: teraz }
  if (!zapiszUzytkownikow([...pobierzUzytkownikow(), uzytkownik])) return { blad: 'Nie udało się zapisać nowego użytkownika.' }
  return { uzytkownik: skopiujUzytkownika(uzytkownik) }
}
