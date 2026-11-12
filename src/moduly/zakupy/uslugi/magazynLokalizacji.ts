import type { DaneMagazynowe, LokalizacjaMapy } from '../modele/zakupy'
import type { Uzytkownik } from '../../../kartoteki/uzytkownicy/typyUzytkownikow'
import { czyMozeEdytowacMapeMagazynu } from '../../../kartoteki/uzytkownicy/uprawnienia'
import { normalizujLokalizacjeMapy } from '../logika/mapaMagazynu'
import { normalizujDaneMagazynowe, pusteDaneMagazynowe } from '../logika/przypisaniaMagazynowe'

export const kluczLokalizacjiMagazynowych = 'ultimatePomagier.zakupy.lokalizacje.v1'
export type OdczytMapy = { lokalizacje: LokalizacjaMapy[]; daneMagazynowe: DaneMagazynowe; zapisBazowy: string | null; blad: string | null }

export function pobierzLokalizacjeMagazynowe(): OdczytMapy {
  try {
    const zapisBazowy = localStorage.getItem(kluczLokalizacjiMagazynowych)
    if (zapisBazowy === null) return { lokalizacje: [], daneMagazynowe: pusteDaneMagazynowe(), zapisBazowy, blad: null }
    const dane: unknown = JSON.parse(zapisBazowy)
    if (!dane || typeof dane !== 'object' || !('wersja' in dane) || (dane.wersja !== 1 && dane.wersja !== 2) || !('lokalizacje' in dane)) throw new Error('Nieobsługiwana wersja konfiguracji magazynu.')
    if (dane.wersja === 2 && !('daneMagazynowe' in dane)) throw new Error('Brak danych stanów magazynowych w zapisie v2. Nie nadpisuj konfiguracji.')
    const lokalizacje = normalizujLokalizacjeMapy(dane.lokalizacje, dane.wersja)
    const daneMagazynowe = normalizujDaneMagazynowe('daneMagazynowe' in dane ? dane.daneMagazynowe : undefined, lokalizacje)
    return { lokalizacje, daneMagazynowe, zapisBazowy, blad: null }
  } catch (blad) {
    return { lokalizacje: [], daneMagazynowe: pusteDaneMagazynowe(), zapisBazowy: null, blad: blad instanceof Error ? blad.message : 'Nie udało się odczytać konfiguracji magazynu.' }
  }
}

export function zapiszLokalizacjeMagazynowe(lokalizacje: LokalizacjaMapy[], zapisBazowy: string | null, uzytkownik: Uzytkownik | null, daneMagazynowe?: DaneMagazynowe): OdczytMapy {
  const niepowodzenie = (blad: string): OdczytMapy => ({ lokalizacje, daneMagazynowe: daneMagazynowe ?? pusteDaneMagazynowe(), zapisBazowy, blad })
  if (!czyMozeEdytowacMapeMagazynu(uzytkownik)) return niepowodzenie('Brak uprawnienia do edycji mapy magazynu.')
  try {
    const obecny = pobierzLokalizacjeMagazynowe()
    if (obecny.blad) return niepowodzenie(`Zapis zablokowany: ${obecny.blad}`)
    if (obecny.zapisBazowy !== zapisBazowy) return niepowodzenie('Konfiguracja zmieniła się w innym oknie. Zachowano Twoje zmiany; wczytaj aktualny plan przed ponowną edycją.')
    const poprawne = normalizujLokalizacjeMapy(lokalizacje, 2)
    const poprawneDane = normalizujDaneMagazynowe(daneMagazynowe ?? obecny.daneMagazynowe, poprawne)
    // Brak usuwania chroni stabilne referencje stanów i ruchów magazynowych.
    if (obecny.lokalizacje.some((lokalizacja) => !poprawne.some((nowa) => nowa.id === lokalizacja.id))) return niepowodzenie('Nie usuwaj istniejących lokalizacji. Możesz je dezaktywować.')
    for (const klucz of ['produkty', 'wariantyProduktow', 'egzemplarzeProduktow', 'stanyWLokalizacjach', 'inwentaryzacje', 'pozycjeInwentaryzacji'] as const) {
      if (obecny.daneMagazynowe[klucz].some((rekord) => !poprawneDane[klucz].some((nowy) => nowy.id === rekord.id))) return niepowodzenie('Nie usuwaj istniejących danych magazynowych.')
    }
    if (obecny.daneMagazynowe.ruchyMagazynowe.some((ruch, indeks) => JSON.stringify(ruch) !== JSON.stringify(poprawneDane.ruchyMagazynowe[indeks]))) return niepowodzenie('Nie zmieniaj ani nie usuwaj historycznych ruchów magazynowych.')
    for (const klucz of ['stanyWLokalizacjach', 'wariantyProduktow', 'egzemplarzeProduktow'] as const) {
      for (const rekord of obecny.daneMagazynowe[klucz]) {
        const nowy = poprawneDane[klucz].find((nowy) => nowy.id === rekord.id)!
        const powiazania = (wartosc: typeof rekord) => JSON.stringify(['produktId', 'wariantProduktuId', 'egzemplarzProduktuId', 'lokalizacjaId'].map((pole) => pole in wartosc ? wartosc[pole as keyof typeof wartosc] : undefined))
        if (powiazania(rekord) !== powiazania(nowy)) return niepowodzenie('Nie zmieniaj tożsamości ani powiązań zapisanej pozycji. Użyj przesunięcia zapasu.')
      }
    }
    const zrodlo = obecny.zapisBazowy ? JSON.parse(obecny.zapisBazowy) as Record<string, unknown> : {}
    const zapis = JSON.stringify({ ...zrodlo, wersja: 2, lokalizacje: poprawne, daneMagazynowe: poprawneDane, ...(zrodlo.wersja === 1 ? { zapisPrzedMigracja: obecny.zapisBazowy } : {}) })
    localStorage.setItem(kluczLokalizacjiMagazynowych, zapis)
    return { lokalizacje: poprawne, daneMagazynowe: poprawneDane, zapisBazowy: zapis, blad: null }
  } catch (blad) {
    return niepowodzenie(blad instanceof Error ? `Nie zapisano planu: ${blad.message}` : 'Nie zapisano planu. Sprawdź dostęp i wolne miejsce w pamięci przeglądarki.')
  }
}
