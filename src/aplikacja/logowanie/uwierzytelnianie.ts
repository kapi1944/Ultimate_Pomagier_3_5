export const czyTrybDemonstracyjny = import.meta.env?.VITE_TRYB_DEMONSTRACYJNY === 'true'
export type PotwierdzonaTozsamosc = { uzytkownikId: string; wersjaUprawnien: number; wygasa: string }
export type WynikUwierzytelnienia = { status: 'POTWIERDZONO'; tozsamosc: PotwierdzonaTozsamosc } | { status: 'ODRZUCONO' | 'NIEDOSTEPNE'; komunikat: string }

// Kontrakt dla przyszłej centralnej usługi. Token pozostaje poza kartoteką użytkowników.
export type UslugaTozsamosci = {
  uwierzytelnij: (loginLubEmail: string, haslo: string) => Promise<WynikUwierzytelnienia>
  zweryfikujSesje: () => Promise<PotwierdzonaTozsamosc | null>
  zakonczSesje: () => Promise<void>
}
export async function uwierzytelnijPrzezUsluge(): Promise<WynikUwierzytelnienia> {
  return { status: 'NIEDOSTEPNE', komunikat: 'Logowanie hasłem jest niedostępne: nie podłączono bezpiecznej usługi tożsamości. Hasło nie zostało zapisane ani wysłane.' }
}
const kluczZapamietanegoLoginu = 'ultimatePomagier.zapamietanyLogin.v1'
export function pobierzZapamietanyLogin() { try { return localStorage.getItem(kluczZapamietanegoLoginu) ?? '' } catch { return '' } }
export function zapamietajLogin(login: string, zapamietaj: boolean) {
  try { if (zapamietaj) localStorage.setItem(kluczZapamietanegoLoginu, login.trim()); else localStorage.removeItem(kluczZapamietanegoLoginu); return true } catch { return false }
}
