import type { WidokNawigacji } from './typyNawigacji'

export const podsekcjeMagazynu = [
  { widok: 'zakupy_magazyn', sciezka: '/zakupy/magazyn/stan-magazynowy', etykieta: 'Stan magazynowy', opis: 'Lokalizacje, stany, ruchy i inwentaryzacje produktów ze wspólnego katalogu.' },
  { widok: 'zakupy_mapa_magazynu', sciezka: '/zakupy/magazyn/mapa', etykieta: 'Mapa magazynu', opis: 'Plan 2D lokalizacji i wyszukiwanie miejsc przechowywania produktów.' },
] as const

export const podsekcjeZakupow = [
  { widok: 'zakupy_pulpit', sciezka: '/zakupy', etykieta: 'Pulpit zakupów', opis: 'Przegląd potrzeb zakupowych i dostęp do obszarów modułu.' },
  { widok: 'zakupy_zapotrzebowania', sciezka: '/zakupy/zapotrzebowania', etykieta: 'Zapotrzebowania', opis: 'Potrzeby zakupowe zgłoszone przez zespół.' },
  { widok: 'zakupy_katalog', sciezka: '/zakupy/katalog-produktow', etykieta: 'Katalog produktów', opis: 'Wspólny katalog materiałów zużywalnych i sprzętu dla zakupów oraz magazynu.' },
  { widok: 'zakupy_listy', sciezka: '/zakupy/listy-zakupowe', etykieta: 'Listy zakupowe', opis: 'Grupowanie potrzeb i przygotowanie zakupów.' },
  { widok: 'zakupy_zamowienia', sciezka: '/zakupy/zamowienia-i-dostawy', etykieta: 'Zamówienia i dostawy', opis: 'Zamówienia, przesyłki i realizacja dostaw.' },
  { ...podsekcjeMagazynu[0], etykieta: 'Magazyn' },
  { widok: 'zakupy_historia', sciezka: '/zakupy/historia', etykieta: 'Historia zakupów', opis: 'Zakończone zakupy oraz historyczne ceny.' },
] as const

export const trasyZakupow = [...podsekcjeZakupow, podsekcjeMagazynu[1]] as const
export type WidokZakupow = typeof trasyZakupow[number]['widok']

export function pobierzSciezkeZakupow(widok: WidokNawigacji) {
  return trasyZakupow.find((podsekcja) => podsekcja.widok === widok)?.sciezka
}

export function pobierzWidokZakupowZeSciezki(sciezka: string) {
  if (sciezka === '/zakupy/magazyn') return 'zakupy_magazyn'
  return trasyZakupow.find((podsekcja) => podsekcja.sciezka === sciezka)?.widok
}

export function czyWidokZakupow(widok: WidokNawigacji): widok is WidokZakupow {
  return trasyZakupow.some((podsekcja) => podsekcja.widok === widok)
}
