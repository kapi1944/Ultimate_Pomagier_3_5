import { pobierzUzytkownika } from '../../kartoteki/uzytkownicy/magazynUzytkownikow'
import { czyKontoJestAktywne, type Uzytkownik } from '../../kartoteki/uzytkownicy/typyUzytkownikow'

export const kluczSesjiUzytkownika = 'ultimatePomagier.sesjaUzytkownika.v1'
const kluczStarejSesji = 'ultimate-pomagier.zalogowany-uzytkownik'
const kluczStarejRoli = 'ultimate-pomagier.aktywna-rola'

export type SesjaUzytkownika = { uzytkownikId: string; wersjaUprawnien: number; dataUtworzenia: string }

function usunSesje() { try { localStorage.removeItem(kluczSesjiUzytkownika) } catch { return } }

function odczytajSesje(): SesjaUzytkownika | null {
  try {
    const zapis = localStorage.getItem(kluczSesjiUzytkownika)
    if (!zapis) return null
    const sesja: unknown = JSON.parse(zapis)
    if (!sesja || typeof sesja !== 'object') return null
    const kandydat = sesja as Partial<SesjaUzytkownika>
    return typeof kandydat.uzytkownikId === 'string' && typeof kandydat.wersjaUprawnien === 'number' && typeof kandydat.dataUtworzenia === 'string' ? kandydat as SesjaUzytkownika : null
  } catch { return null }
}

function migrujStaraSesje() {
  try {
    if (localStorage.getItem(kluczSesjiUzytkownika)) return
    const zapis = localStorage.getItem(kluczStarejSesji)
    const dane: unknown = zapis ? JSON.parse(zapis) : null
    const kandydat = dane && typeof dane === 'object' ? dane as Record<string, unknown> : {}
    const uzytkownik = pobierzUzytkownika(typeof kandydat.id === 'string' ? kandydat.id : typeof kandydat.login === 'string' ? kandydat.login : typeof kandydat.pseudonim === 'string' ? kandydat.pseudonim : undefined)
    if (uzytkownik && czyKontoJestAktywne(uzytkownik)) rozpocznijSesje(uzytkownik.id)
  } catch {
    // Stary, uszkodzony zapis nie może nadać dostępu.
  } finally {
    try { localStorage.removeItem(kluczStarejSesji); localStorage.removeItem(kluczStarejRoli) } catch { /* Brak dostępu do magazynu nie wpływa na bezpieczeństwo sesji. */ }
  }
}

export function rozpocznijSesje(uzytkownikId: string) {
  const uzytkownik = pobierzUzytkownika(uzytkownikId)
  if (!uzytkownik || !czyKontoJestAktywne(uzytkownik)) return false
  const sesja: SesjaUzytkownika = { uzytkownikId: uzytkownik.id, wersjaUprawnien: uzytkownik.wersjaUprawnien, dataUtworzenia: new Date().toISOString() }
  try { localStorage.setItem(kluczSesjiUzytkownika, JSON.stringify(sesja)) } catch { return false }
  return true
}

export function pobierzSesje() {
  migrujStaraSesje()
  const sesja = odczytajSesje()
  if (!sesja || !sprawdzWaznoscSesji(sesja)) { usunSesje(); return null }
  return { ...sesja }
}

export function pobierzZalogowanegoUzytkownika(): Uzytkownik | null {
  const sesja = pobierzSesje()
  return sesja ? pobierzUzytkownika(sesja.uzytkownikId) ?? null : null
}

export function zakonczSesje() { usunSesje() }

export function sprawdzWaznoscSesji(sesja: SesjaUzytkownika | null | undefined) {
  if (!sesja) return false
  const uzytkownik = pobierzUzytkownika(sesja.uzytkownikId)
  return Boolean(czyKontoJestAktywne(uzytkownik) && uzytkownik?.wersjaUprawnien === sesja.wersjaUprawnien)
}
