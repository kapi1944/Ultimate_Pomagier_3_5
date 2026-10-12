import { trenerzyKartotekiStartowi } from '../moduly/zamkniete/szczegoly_organizacyjne/stale'
import type { TrenerKartoteki } from '../moduly/zamkniete/szczegoly_organizacyjne/typy'

const kluczTrenerowKartoteki = 'ultimate-pomagier.kartoteki.trenerzy'

export function pobierzTrenerowZKartoteki(): TrenerKartoteki[] {
  try {
    const zapis = localStorage.getItem(kluczTrenerowKartoteki)
    const dane = zapis ? JSON.parse(zapis) : null

    if (!Array.isArray(dane)) {
      return trenerzyKartotekiStartowi
    }

    return dane
      .filter((trener) => trener?.status !== 'Nieaktywny')
      .map((trener) => ({
        id: String(trener.id),
        imieNazwisko: `${trener.imie ?? ''} ${trener.nazwisko ?? ''}`.trim() || String(trener.imieNazwisko ?? ''),
        telefon: String(trener.telefon ?? ''),
        email: String(trener.email ?? ''),
      }))
      .filter((trener) => trener.imieNazwisko)
  } catch {
    return trenerzyKartotekiStartowi
  }
}
