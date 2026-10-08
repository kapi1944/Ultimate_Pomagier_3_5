import type { LokalizacjaMapy } from '../modele/zakupy'
import type { Uzytkownik } from '../../../kartoteki/uzytkownicy/typyUzytkownikow'
import { czyMozeEdytowacMapeMagazynu } from '../../../kartoteki/uzytkownicy/uprawnienia'
import { normalizujLokalizacjeMapy } from '../logika/mapaMagazynu'

export const kluczLokalizacjiMagazynowych = 'ultimatePomagier.zakupy.lokalizacje.v1'
export type OdczytMapy = { lokalizacje: LokalizacjaMapy[]; zapisBazowy: string | null; blad: string | null }

export function pobierzLokalizacjeMagazynowe(): OdczytMapy {
  try {
    const zapisBazowy = localStorage.getItem(kluczLokalizacjiMagazynowych)
    if (zapisBazowy === null) return { lokalizacje: [], zapisBazowy, blad: null }
    const dane: unknown = JSON.parse(zapisBazowy)
    if (!dane || typeof dane !== 'object' || !('wersja' in dane) || dane.wersja !== 1 || !('lokalizacje' in dane)) throw new Error('Nieobsługiwana wersja konfiguracji magazynu.')
    return { lokalizacje: normalizujLokalizacjeMapy(dane.lokalizacje), zapisBazowy, blad: null }
  } catch (blad) {
    return { lokalizacje: [], zapisBazowy: null, blad: blad instanceof Error ? blad.message : 'Nie udało się odczytać konfiguracji magazynu.' }
  }
}

export function zapiszLokalizacjeMagazynowe(lokalizacje: LokalizacjaMapy[], zapisBazowy: string | null, uzytkownik: Uzytkownik | null): OdczytMapy {
  const niepowodzenie = (blad: string): OdczytMapy => ({ lokalizacje, zapisBazowy, blad })
  if (!czyMozeEdytowacMapeMagazynu(uzytkownik)) return niepowodzenie('Brak uprawnienia do edycji mapy magazynu.')
  try {
    const obecny = pobierzLokalizacjeMagazynowe()
    if (obecny.blad) return niepowodzenie(`Zapis zablokowany: ${obecny.blad}`)
    if (obecny.zapisBazowy !== zapisBazowy) return niepowodzenie('Konfiguracja zmieniła się w innym oknie. Zachowano Twoje zmiany; wczytaj aktualny plan przed ponowną edycją.')
    const poprawne = normalizujLokalizacjeMapy(lokalizacje)
    // Brak usuwania chroni stabilne referencje stanów i ruchów magazynowych.
    if (obecny.lokalizacje.some((lokalizacja) => !poprawne.some((nowa) => nowa.id === lokalizacja.id))) return niepowodzenie('Nie usuwaj istniejących lokalizacji. Możesz je dezaktywować.')
    const zapis = JSON.stringify({ wersja: 1, lokalizacje: poprawne })
    localStorage.setItem(kluczLokalizacjiMagazynowych, zapis)
    return { lokalizacje: poprawne, zapisBazowy: zapis, blad: null }
  } catch (blad) {
    return niepowodzenie(blad instanceof Error ? `Nie zapisano planu: ${blad.message}` : 'Nie zapisano planu. Sprawdź dostęp i wolne miejsce w pamięci przeglądarki.')
  }
}
