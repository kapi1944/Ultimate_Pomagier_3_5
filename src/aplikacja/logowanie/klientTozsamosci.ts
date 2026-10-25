import { czyTrybDemonstracyjny } from './uwierzytelnianie'
import { ustawProjekcjeKont } from './projekcjaKont'
import { sprawdzStruktureUzytkownika } from '../../kartoteki/uzytkownicy/walidacjaUzytkownikow'
import type { WpisHistoriiKonta } from '../../kartoteki/uzytkownicy/magazynUzytkownikow'
import { otworzObszarKonta, wrocDoLogowaniaDesktopowego } from './daneDesktop'

export async function wykonajOperacjeTozsamosci(operacja: string, dane: Record<string, unknown> = {}): Promise<unknown> {
  if (czyTrybDemonstracyjny) throw new Error('Tryb DEMO nie ma dostępu do rzeczywistych haseł, kodów ani sesji.')
  if (typeof window === 'undefined') throw new Error('Usługa tożsamości jest niedostępna.')
  if ('__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core')
    try { return await invoke<unknown>('operacja_konta', { operacja, dane }) } catch (blad) { throw new Error(typeof blad === 'string' ? blad : 'Nie udało się wykonać operacji konta.', { cause: blad }) }
  }
  if (window.location.origin !== 'http://127.0.0.1:47831') throw new Error('Uruchom lokalną usługę kont i otwórz http://127.0.0.1:47831. Na tym adresie logowanie produkcyjne jest niedostępne.')
  const odpowiedz = await fetch('/api/konta', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Pomagier-Konta': '1' }, body: JSON.stringify({ operacja, dane }) })
  if (!odpowiedz.ok) throw new Error('Usługa kont odrzuciła żądanie.')
  const wynik: unknown = await odpowiedz.json()
  if (!wynik || typeof wynik !== 'object') throw new Error('Nieprawidłowa odpowiedź usługi kont.')
  if ('blad' in wynik && typeof wynik.blad === 'string') throw new Error(wynik.blad)
  if (!('dane' in wynik)) throw new Error('Niepełna odpowiedź usługi kont.')
  return wynik.dane
}
function czyWpisHistorii(wpis: unknown): wpis is WpisHistoriiKonta {
  if (!wpis || typeof wpis !== 'object') return false
  return ['czas', 'wykonujacyId', 'uzytkownikId', 'operacja'].every((pole) => pole in wpis && typeof Reflect.get(wpis, pole) === 'string') && 'pola' in wpis && Array.isArray(wpis.pola) && wpis.pola.every((pole: unknown) => typeof pole === 'string') && 'wynik' in wpis && ['SUKCES', 'ODRZUCONO'].includes(String(wpis.wynik))
}
export async function odswiezPotwierdzonaSesje() {
  const tozsamosc = await wykonajOperacjeTozsamosci('sesja')
  if (!sprawdzStruktureUzytkownika(tozsamosc)) throw new Error('Nieprawidłowa tożsamość z usługi kont.')
  if (await otworzObszarKonta()) throw new Error('Otwieranie prywatnego obszaru konta.')
  const konta = await wykonajOperacjeTozsamosci('katalog')
  if (!Array.isArray(konta) || !konta.every(sprawdzStruktureUzytkownika)) throw new Error('Nieprawidłowa kartoteka z usługi kont.')
  const daneHistorii = ['ARCHITEKT', 'ADMINISTRATOR'].includes(tozsamosc.rola) ? await wykonajOperacjeTozsamosci('historia') : []
  if (!Array.isArray(daneHistorii) || !daneHistorii.every(czyWpisHistorii)) throw new Error('Nieprawidłowy audyt z usługi kont.')
  ustawProjekcjeKont(konta, daneHistorii, tozsamosc)
  return tozsamosc
}
export function wyczyscPotwierdzonaSesje() { ustawProjekcjeKont([], [], null) }
export async function zakonczPotwierdzonaSesje() {
  await wykonajOperacjeTozsamosci('wyloguj')
  wyczyscPotwierdzonaSesje()
  await wrocDoLogowaniaDesktopowego()
}
