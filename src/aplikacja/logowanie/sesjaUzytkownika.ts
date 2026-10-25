import { pobierzUzytkownika, zarejestrujLogowanieDemonstracyjne } from '../../kartoteki/uzytkownicy/magazynUzytkownikow'
import { czyKontoJestAktywne, type Uzytkownik } from '../../kartoteki/uzytkownicy/typyUzytkownikow'
import { czyTrybDemonstracyjny } from './uwierzytelnianie'
import { pobierzProjekcjeKont } from './projekcjaKont'

export const kluczSesjiUzytkownika = 'ultimatePomagier.sesjaUzytkownika.v1'
export type SesjaUzytkownika = { uzytkownikId: string; wersjaUprawnien: number; dataUtworzenia: string; tryb: 'DEMONSTRACYJNY' }

function usunSesje() { try { localStorage.removeItem(kluczSesjiUzytkownika) } catch { return } }
function odczytajSesje(): SesjaUzytkownika | null {
  try {
    const zapis = localStorage.getItem(kluczSesjiUzytkownika)
    if (!zapis) return null
    const sesja: unknown = JSON.parse(zapis)
    if (!sesja || typeof sesja !== 'object') return null
    const kandydat = sesja as Partial<SesjaUzytkownika>
    return kandydat.tryb === 'DEMONSTRACYJNY' && typeof kandydat.uzytkownikId === 'string' && typeof kandydat.wersjaUprawnien === 'number' && typeof kandydat.dataUtworzenia === 'string' ? kandydat as SesjaUzytkownika : null
  } catch { return null }
}

// Wyłącznie jawna demonstracja. Ta funkcja nie jest uwierzytelnieniem produkcyjnym.
export function rozpocznijSesje(uzytkownikId: string) {
  if (!czyTrybDemonstracyjny) return false
  try {
    const uzytkownik = pobierzUzytkownika(uzytkownikId)
    if (!uzytkownik || !czyKontoJestAktywne(uzytkownik)) return false
    const teraz = new Date().toISOString()
    const sesja: SesjaUzytkownika = { uzytkownikId: uzytkownik.id, wersjaUprawnien: uzytkownik.wersjaUprawnien, dataUtworzenia: teraz, tryb: 'DEMONSTRACYJNY' }
    localStorage.setItem(kluczSesjiUzytkownika, JSON.stringify(sesja))
    if (!zarejestrujLogowanieDemonstracyjne(uzytkownik.id)) { usunSesje(); return false }
    return true
  } catch { return false }
}
export function pobierzSesje() {
  if (!czyTrybDemonstracyjny) return null
  const sesja = odczytajSesje()
  if (!sesja || !sprawdzWaznoscSesji(sesja)) { usunSesje(); return null }
  return { ...sesja }
}
export function pobierzZalogowanegoUzytkownika(): Uzytkownik | null {
  if (!czyTrybDemonstracyjny) return pobierzProjekcjeKont().tozsamosc
  const sesja = pobierzSesje()
  return sesja ? pobierzUzytkownika(sesja.uzytkownikId) ?? null : null
}
export function zakonczSesje() { usunSesje() }
export function sprawdzWaznoscSesji(sesja: SesjaUzytkownika | null | undefined) {
  if (!czyTrybDemonstracyjny || !sesja || sesja.tryb !== 'DEMONSTRACYJNY') return false
  const uzytkownik = pobierzUzytkownika(sesja.uzytkownikId)
  return Boolean(czyKontoJestAktywne(uzytkownik) && uzytkownik?.wersjaUprawnien === sesja.wersjaUprawnien)
}
