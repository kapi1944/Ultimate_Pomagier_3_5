import type { Uzytkownik } from '../../kartoteki/uzytkownicy/typyUzytkownikow'
import type { WpisHistoriiKonta } from '../../kartoteki/uzytkownicy/magazynUzytkownikow'

// Wyłącznie nietrwała projekcja odpowiedzi zaufanej warstwy. Nie autoryzuje operacji.
let konta: Uzytkownik[] = []
let historia: WpisHistoriiKonta[] = []
let tozsamosc: Uzytkownik | null = null
export function pobierzProjekcjeKont() { return { konta, historia, tozsamosc } }
export function ustawProjekcjeKont(noweKonta: Uzytkownik[], nowaHistoria: WpisHistoriiKonta[], nowaTozsamosc: Uzytkownik | null) {
  konta = noweKonta; historia = nowaHistoria; tozsamosc = nowaTozsamosc
}
