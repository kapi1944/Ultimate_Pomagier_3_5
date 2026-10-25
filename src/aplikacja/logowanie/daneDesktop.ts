import { invoke, isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { czyTrybDemonstracyjny } from './uwierzytelnianie'
import { rozpoznajPlatforme } from '../desktop/rejestrWydan'

export function czyLogowanieNatywne() { return typeof window !== 'undefined' && isTauri() }
export function czyLogowanieDesktopowe() {
  return czyLogowanieNatywne() && !['android', 'ios'].includes(rozpoznajPlatforme(navigator.userAgent))
}
export function pobierzDaneDoPrzeniesienia() {
  const dane: Record<string, string> = {}
  for (let indeks = 0; indeks < localStorage.length; indeks++) {
    const klucz = localStorage.key(indeks)
    if (!klucz || !/^(ultimatePomagier\.|ultimate-pomagier\.|szczegolyOrganizacyjne\.)/.test(klucz) || /sesj|hasl|token|uzytkownicy/i.test(klucz)) continue
    const wartosc = localStorage.getItem(klucz)
    if (wartosc !== null) dane[klucz] = wartosc
  }
  return dane
}
export async function przeniesDaneDoKonta(dane: Record<string, string>) {
  if (!czyLogowanieDesktopowe() || czyTrybDemonstracyjny) throw new Error('Przeniesienie danych wymaga lokalnego konta Windows.')
  await invoke('przygotuj_migracje_danych', { dane })
}
export async function otworzObszarKonta() {
  if (czyLogowanieDesktopowe() && !czyTrybDemonstracyjny && getCurrentWindow().label === 'main') {
    await invoke('otworz_obszar_konta')
    return true
  }
  return false
}
export async function wrocDoLogowaniaDesktopowego(sesjaWygasla = false) {
  if (czyLogowanieDesktopowe() && !czyTrybDemonstracyjny && getCurrentWindow().label === 'obszar') await invoke('otworz_logowanie', { sesjaWygasla })
}
export async function przygotujDaneDesktop() {
  if (!czyLogowanieDesktopowe() || czyTrybDemonstracyjny || getCurrentWindow().label !== 'obszar') return
  const dane: unknown = await invoke('migracja_danych_konta', { potwierdz: false })
  if (dane === null) return
  if (!dane || typeof dane !== 'object' || !Object.values(dane).every((wartosc) => typeof wartosc === 'string')) throw new Error('Nieprawidłowa kopia migracyjna. Oryginał pozostaje zachowany.')
  const poprzednie = new Map<string, string | null>()
  try {
    for (const [klucz, wartosc] of Object.entries(dane)) {
      const poprzedni = localStorage.getItem(klucz)
      if (poprzedni !== null && poprzedni !== wartosc) throw new Error('Profil zawiera już inne dane. Zatrzymano migrację bez ich nadpisywania.')
      poprzednie.set(klucz, poprzedni)
    }
    for (const [klucz, wartosc] of Object.entries(dane)) localStorage.setItem(klucz, String(wartosc))
    for (const [klucz, wartosc] of Object.entries(dane)) if (localStorage.getItem(klucz) !== wartosc) throw new Error('Nie udało się potwierdzić zapisu przeniesionych danych.')
    await invoke('migracja_danych_konta', { potwierdz: true })
  } catch (blad) {
    for (const [klucz, wartosc] of poprzednie) { if (wartosc === null) localStorage.removeItem(klucz); else localStorage.setItem(klucz, wartosc) }
    throw blad
  }
}
