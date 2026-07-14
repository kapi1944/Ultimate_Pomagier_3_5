import type { TypIkonyMenu } from './IkonaMenu'

export function pobierzTypIkonyMenu(id: string): TypIkonyMenu {
  if (id.includes('kopie_robocze') || id.includes('kopie-robocze')) return 'kopie'
  if (id === 'dokumenty_wszystkie' || id.endsWith('_lista')) return 'wszystkie'
  if (
    id === 'programy_szkolen' ||
    id === 'zamkniete_szczegoly_organizacyjne_nowe' ||
    id === 'listy-obecnosci' ||
    id === 'ankiety' ||
    id === 'dyplomy' ||
    id === 'karta-na-drzwi'
  ) return 'nowy'
  if (id === 'programy-szkolen') return 'programy'
  if (id === 'generator-list-obecnosci') return 'obecnosc'
  if (id === 'generator-ankiet') return 'ankiety'
  if (id === 'generator-dyplomow') return 'dyplomy'
  if (id === 'generator-kart-na-drzwi') return 'drzwi'
  if (id === 'szczegoly-organizacyjne') return 'szczegoly'
  if (id === 'dokumenty') return 'dokumenty'
  if (id === 'replikator_dokumentow') return 'replikator'
  if (id.startsWith('kartoteki')) return 'kartoteki'
  if (id === 'ustawienia') return 'ustawienia'
  if (id.startsWith('szkolenia')) return 'szkolenia'
  return 'pulpit'
}
