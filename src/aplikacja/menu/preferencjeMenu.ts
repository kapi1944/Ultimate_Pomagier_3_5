import type { WidokNawigacji } from '../nawigacja/typyNawigacji'
import { pobierzKontekstNawigacji, pozycjeMenu, type PozycjaMenu } from './pozycjeMenu'

export type TrybWidokuMenu = 'zwijane' | 'pelne'

export type PreferencjePowloki = {
  przypiete: boolean
  wysuwanie: boolean
  widocznyDock: boolean | null
  skroty: WidokNawigacji[]
}

export const domyslneSkroty: WidokNawigacji[] = ['pulpit', 'zamkniete_szczegoly_organizacyjne_lista', 'dokumenty_wszystkie', 'programy_szkolen']

export function pozycjeSkrotow(pozycje: PozycjaMenu[] = pozycjeMenu): { widok: WidokNawigacji; etykieta: string }[] {
  return pozycje.flatMap((pozycja) => [...(pozycja.widok ? [{ widok: pozycja.widok, etykieta: pozycja.etykieta }] : []), ...pozycjeSkrotow(pozycja.dzieci ?? [])])
}

export function pobierzDostepneSkroty() {
  return [...pozycjeSkrotow(), { widok: 'profil_uzytkownika' as const, etykieta: 'Profil użytkownika' }, { widok: 'generator-szczegolow' as const, etykieta: 'Generator szczegółów' }].map((pozycja) => ({ ...pozycja, opis: pobierzKontekstNawigacji(pozycja.widok).join(' / ') }))
}

export type PreferencjeDrzewaMenu = {
  tryb: TrybWidokuMenu
  rozwiniete: Record<string, boolean>
}

export const kluczPrzypieciaMenu = 'ultimatePomagier.menuPrzypiete'
export const kluczWysuwaniaZKrawedzi = 'ultimatePomagier.menuWysuwanieZKrawedzi'
export const zdarzenieZmianyPreferencjiMenu = 'ultimate-pomagier:preferencje-menu'

const prefiksKluczaDrzewaMenu = 'ultimatePomagier.menuDrzewo.v1'

export function pobierzKluczDrzewaMenu(uzytkownikId: string) {
  return `${prefiksKluczaDrzewaMenu}.${uzytkownikId || 'anonim'}`
}

function odczytajRekordMenu(uzytkownikId: string): Record<string, unknown> {
  const zapis = localStorage.getItem(pobierzKluczDrzewaMenu(uzytkownikId))
  const dane: unknown = zapis ? JSON.parse(zapis) : {}
  return dane && typeof dane === 'object' && !Array.isArray(dane) ? dane as Record<string, unknown> : {}
}

export function pobierzPreferencjePowloki(uzytkownikId: string): PreferencjePowloki {
  const domyslne: PreferencjePowloki = { przypiete: false, wysuwanie: true, widocznyDock: null, skroty: [...domyslneSkroty] }
  try {
    const rekord = odczytajRekordMenu(uzytkownikId)
    const dane = rekord.powloka && typeof rekord.powloka === 'object' ? rekord.powloka as Record<string, unknown> : {}
    const dozwolone = pobierzDostepneSkroty().map((pozycja) => pozycja.widok)
    return {
      przypiete: typeof dane.przypiete === 'boolean' ? dane.przypiete : localStorage.getItem(kluczPrzypieciaMenu) === 'true',
      wysuwanie: typeof dane.wysuwanie === 'boolean' ? dane.wysuwanie : localStorage.getItem(kluczWysuwaniaZKrawedzi) !== 'false',
      widocznyDock: typeof dane.widocznyDock === 'boolean' ? dane.widocznyDock : null,
      skroty: Array.isArray(dane.skroty) ? [...new Set(dane.skroty.filter((widok): widok is WidokNawigacji => typeof widok === 'string' && dozwolone.includes(widok as WidokNawigacji)))] : domyslne.skroty,
    }
  } catch { return domyslne }
}

export function zapiszPreferencjePowloki(uzytkownikId: string, zmiany: Partial<PreferencjePowloki>) {
  try {
    const rekord = odczytajRekordMenu(uzytkownikId)
    localStorage.setItem(pobierzKluczDrzewaMenu(uzytkownikId), JSON.stringify({ ...rekord, powloka: { ...pobierzPreferencjePowloki(uzytkownikId), ...zmiany } }))
    zglosZmianePreferencjiMenu(uzytkownikId)
    return true
  } catch { return false }
}

export function pobierzPreferencjeDrzewaMenu(uzytkownikId: string): PreferencjeDrzewaMenu {
  try {
    const zapis = localStorage.getItem(pobierzKluczDrzewaMenu(uzytkownikId))
    if (!zapis) return { tryb: 'zwijane', rozwiniete: {} }

    const dane = JSON.parse(zapis) as Partial<PreferencjeDrzewaMenu>
    const tryb = dane.tryb === 'pelne' ? 'pelne' : 'zwijane'
    const rozwiniete = dane.rozwiniete && typeof dane.rozwiniete === 'object'
      ? Object.fromEntries(Object.entries(dane.rozwiniete).filter(([, wartosc]) => typeof wartosc === 'boolean'))
      : {}

    return { tryb, rozwiniete }
  } catch {
    return { tryb: 'zwijane', rozwiniete: {} }
  }
}

export function zapiszPreferencjeDrzewaMenu(uzytkownikId: string, preferencje: PreferencjeDrzewaMenu) {
  try {
    localStorage.setItem(pobierzKluczDrzewaMenu(uzytkownikId), JSON.stringify({ ...odczytajRekordMenu(uzytkownikId), ...preferencje }))
    return true
  } catch {
    return false
  }
}

export function zglosZmianePreferencjiMenu(uzytkownikId: string) {
  window.dispatchEvent(new CustomEvent(zdarzenieZmianyPreferencjiMenu, { detail: { uzytkownikId } }))
}
