export type TrybWidokuMenu = 'zwijane' | 'pelne'

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
    localStorage.setItem(pobierzKluczDrzewaMenu(uzytkownikId), JSON.stringify(preferencje))
    return true
  } catch {
    return false
  }
}

export function zglosZmianePreferencjiMenu(uzytkownikId: string) {
  window.dispatchEvent(new CustomEvent(zdarzenieZmianyPreferencjiMenu, { detail: { uzytkownikId } }))
}
