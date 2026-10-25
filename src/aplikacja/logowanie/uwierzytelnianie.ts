import { wykonajOperacjeTozsamosci } from './klientTozsamosci'
import { sprawdzStruktureUzytkownika } from '../../kartoteki/uzytkownicy/walidacjaUzytkownikow'
export const czyTrybDemonstracyjny = import.meta.env?.DEV === true && import.meta.env?.MODE === 'demonstracyjny' && import.meta.env?.VITE_TRYB_DEMONSTRACYJNY === 'true'
export type PotwierdzonaTozsamosc = { uzytkownikId: string; wersjaUprawnien: number; wygasa: string }
export type WynikUwierzytelnienia = { status: 'POTWIERDZONO'; tozsamosc: PotwierdzonaTozsamosc } | { status: 'ODRZUCONO' | 'NIEDOSTEPNE'; komunikat: string }

// Token pozostaje w natywnej warstwie lub w ciasteczku HttpOnly, poza kartoteką.
export type UslugaTozsamosci = {
  uwierzytelnij: (loginLubEmail: string, haslo: string) => Promise<WynikUwierzytelnienia>
  zweryfikujSesje: () => Promise<PotwierdzonaTozsamosc | null>
  zakonczSesje: () => Promise<void>
}
export async function uwierzytelnijPrzezUsluge(login = '', haslo = '', zapamietajSesje = false): Promise<WynikUwierzytelnienia> {
  try {
    const konto = await wykonajOperacjeTozsamosci('logowanie', { login, haslo, zapamietajSesje })
    if (!sprawdzStruktureUzytkownika(konto)) throw new Error('Nieprawidłowa odpowiedź usługi tożsamości.')
    return { status: 'POTWIERDZONO', tozsamosc: { uzytkownikId: konto.id, wersjaUprawnien: konto.wersjaUprawnien, wygasa: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() } }
  } catch (blad) { return { status: 'NIEDOSTEPNE', komunikat: blad instanceof Error ? blad.message : 'Usługa tożsamości jest niedostępna.' } }
}
const kluczZapamietanegoLoginu = 'ultimatePomagier.zapamietanyLogin.v1'
export function pobierzZapamietanyLogin() { try { return localStorage.getItem(kluczZapamietanegoLoginu) ?? '' } catch { return '' } }
export function zapamietajLogin(login: string, zapamietaj: boolean) {
  try { if (zapamietaj) localStorage.setItem(kluczZapamietanegoLoginu, login.trim()); else localStorage.removeItem(kluczZapamietanegoLoginu); return true } catch { return false }
}
