import type { DaneFormularza, DaneOdbiorcyPaczki, ProblemWalidacji } from './typy'
import { pobierzEfektywneDaneOdbiorcy } from './logikaDanychOdbiorcy'

const polaAdresu = ['nazwaFirmy', 'ulica', 'nrBudynku', 'nrLokalu', 'kodPocztowy', 'miasto', 'kraj'] as const
function porownaj(tekst: string) { return tekst.toLocaleLowerCase('pl').replace(/^ul\.?\s*/i, '').replace(/\s+/g, ' ').trim() }

export function adresSiedzibyOdbiorcy(dane: DaneFormularza) {
  let firma = pobierzEfektywneDaneOdbiorcy(dane)
  if (!firma.nazwa && dane.odbiorcaPaczki.nazwaFirmy && porownaj(dane.odbiorcaPaczki.nazwaFirmy) === porownaj(dane.nabywca.nazwa)) firma = dane.nabywca
  return { nazwaFirmy: firma.nazwa, ulica: firma.ulica, nrBudynku: firma.nrBudynku, nrLokalu: firma.nrLokalu, kodPocztowy: firma.kodPocztowy, miasto: firma.miasto, kraj: firma.kraj }
}

export function czyKompletnyAdresPaczki(adres: Partial<DaneOdbiorcyPaczki>) {
  return Boolean(adres.nazwaFirmy?.trim() && adres.ulica?.trim() && adres.nrBudynku?.trim() && /^\d{2}-\d{3}$/.test(adres.kodPocztowy ?? '') && adres.miasto?.trim())
}

export function czyPaczkaNaSiedzibe(dane: DaneFormularza) {
  const siedziba = adresSiedzibyOdbiorcy(dane)
  return czyKompletnyAdresPaczki(siedziba) && czyKompletnyAdresPaczki(dane.odbiorcaPaczki) && polaAdresu.every((pole) => porownaj(siedziba[pole]) === porownaj(dane.odbiorcaPaczki[pole]))
}

export function synchronizujAdresPaczki(obecne: DaneFormularza, nastepne: DaneFormularza): DaneFormularza {
  if (!nastepne.wysylkaNaSiedzibeOdbiorcy) return nastepne
  const adresZmieniony = polaAdresu.some((pole) => obecne.odbiorcaPaczki[pole] !== nastepne.odbiorcaPaczki[pole])
  if (obecne.wysylkaNaSiedzibeOdbiorcy && adresZmieniony) return { ...nastepne, wysylkaNaSiedzibeOdbiorcy: false }
  if (!czyKompletnyAdresPaczki(adresSiedzibyOdbiorcy(nastepne))) return nastepne
  return { ...nastepne, odbiorcaPaczki: { ...nastepne.odbiorcaPaczki, ...adresSiedzibyOdbiorcy(nastepne) } }
}

export function walidujWysylkePaczki(dane: DaneFormularza): ProblemWalidacji[] {
  if (!dane.wysylkaPaczkiDotyczy) return []
  const braki: ProblemWalidacji[] = (['nazwaFirmy', 'ulica', 'nrBudynku', 'kodPocztowy', 'miasto'] as const).filter((pole) => !dane.odbiorcaPaczki[pole]?.trim() || pole === 'kodPocztowy' && !/^\d{2}-\d{3}$/.test(dane.odbiorcaPaczki[pole])).map((pole) => ({ sekcja: 'Wysyłka paczki', pole: `odbiorcaPaczki.${pole}`, komunikat: `Wysyłka paczki: uzupełnij ${pole}`, poziom: 'blad', czyBlokuje: true }))
  if (dane.wysylkaNaSiedzibeOdbiorcy && !czyKompletnyAdresPaczki(adresSiedzibyOdbiorcy(dane))) braki.push({ sekcja: 'Wysyłka paczki', pole: 'wysylkaNaSiedzibeOdbiorcy', komunikat: 'Uzupełnij adres siedziby odbiorcy albo wyłącz powiązanie adresu.', poziom: 'blad', czyBlokuje: true })
  return braki
}
