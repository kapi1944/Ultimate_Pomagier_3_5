import type { WidokNawigacji } from './typyNawigacji'

const trasyNarzedzi = [
  { widok: 'narzedzia', sciezka: '/narzedzia' },
  { widok: 'poprawiacz_prezentacji', sciezka: '/narzedzia/poprawiacz-prezentacji' },
] as const

export function pobierzSciezkeNarzedzia(widok: WidokNawigacji) {
  return trasyNarzedzi.find((trasa) => trasa.widok === widok)?.sciezka
}

export function pobierzWidokNarzedziaZeSciezki(sciezka: string) {
  return trasyNarzedzi.find((trasa) => trasa.sciezka === sciezka)?.widok
}
