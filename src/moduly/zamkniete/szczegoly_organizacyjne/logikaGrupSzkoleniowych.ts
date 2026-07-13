import { utworzPoczatkowaGrupe } from './danePoczatkowe'
import type { FormaSzkolenia, GrupaSzkoleniowa, RodzajGodzin } from './typy'

export function dodajGrupeDoListy(grupy: GrupaSzkoleniowa[]) {
  return [...grupy, utworzPoczatkowaGrupe(grupy.length + 1)]
}

export function usunGrupeZListy(grupy: GrupaSzkoleniowa[], idGrupy: string) {
  return grupy.length > 1 ? grupy.filter((grupa) => grupa.id !== idGrupy) : grupy
}

export function przetworzUsuniecieGrupy(grupy: GrupaSzkoleniowa[], idGrupy: string, czyPotwierdzone: boolean) {
  return czyPotwierdzone ? usunGrupeZListy(grupy, idGrupy) : grupy
}

export function pobierzEtykieteGrupy(indeks: number) {
  return `Grupa ${indeks + 1}`
}

export function ustawFormeGrupy(grupa: GrupaSzkoleniowa, formaSzkolenia: FormaSzkolenia): GrupaSzkoleniowa {
  return { ...grupa, formaSzkolenia }
}

export function ustawRodzajGodzinGrupy(grupa: GrupaSzkoleniowa, rodzajGodzin: RodzajGodzin): GrupaSzkoleniowa {
  return { ...grupa, rodzajGodzin }
}