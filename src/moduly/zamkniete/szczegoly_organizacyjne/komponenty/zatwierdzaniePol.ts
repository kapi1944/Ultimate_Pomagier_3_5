import { createContext } from 'react'
import type { GrupaSzkoleniowa, StatusyPolImportu } from '../typy'

export const KontekstZatwierdzania = createContext<{ grupy: GrupaSzkoleniowa[]; zmien: (pole: string, idGrupy?: string) => void } | null>(null)

export function kluczZatwierdzenia(pole: string, grupy: GrupaSzkoleniowa[], idGrupy?: string) {
  const dopasowanie = pole.match(/^grupy\.(\d+)\.(.+)$/)
  return dopasowanie ? `zatwierdzenia.${encodeURIComponent(idGrupy ?? grupy[Number(dopasowanie[1])]?.id ?? '')}.${dopasowanie[2]}` : pole
}

export function odtworzStatusyZatwierdzen(zapisane: StatusyPolImportu, grupy: GrupaSzkoleniowa[]): StatusyPolImportu {
  const wynik = { ...zapisane }
  for (const pole of Object.keys(wynik)) {
    if (pole.startsWith('grupy.') && wynik[pole] === 'zatwierdzone') delete wynik[pole]
  }
  grupy.forEach((grupa, indeks) => {
    const prefiks = `zatwierdzenia.${encodeURIComponent(grupa.id)}.`
    for (const [pole, status] of Object.entries(zapisane)) if (pole.startsWith(prefiks)) wynik[`grupy.${indeks}.${pole.slice(prefiks.length)}`] = status
  })
  return wynik
}

export function przelaczZatwierdzenie(zapisane: StatusyPolImportu, grupy: GrupaSzkoleniowa[], pole: string, idGrupy?: string): StatusyPolImportu {
  if (idGrupy) {
    const indeks = grupy.findIndex((grupa) => grupa.id === idGrupy)
    if (indeks < 0) return zapisane
    pole = pole.replace(/^grupy\.\d+\./, `grupy.${indeks}.`)
  }
  const klucz = kluczZatwierdzenia(pole, grupy, idGrupy)
  const status = odtworzStatusyZatwierdzen(zapisane, grupy)[pole]
  if (status !== 'niepewne' && status !== 'zatwierdzone') return zapisane
  const wynik = { ...zapisane, [klucz]: status === 'niepewne' ? 'zatwierdzone' as const : 'niepewne' as const }
  if (klucz !== pole) delete wynik[pole]
  return wynik
}
