import type { TypDokumentu } from './modelDokumentu'

export type KonfiguracjaTypuDokumentu = {
  typ: TypDokumentu
  etykieta: string
  generatorId: string | null
  sciezkaGeneratora: string | null
  czyGeneratorDziala: boolean
}

export const konfiguracjeTypowDokumentow: KonfiguracjaTypuDokumentu[] = [
  { typ: 'PROGRAM_SZKOLENIA', etykieta: 'Program szkolenia', generatorId: 'programy_szkolen', sciezkaGeneratora: '/dokumenty/programy-szkolen', czyGeneratorDziala: true },
  { typ: 'SZCZEGOLY_ORGANIZACYJNE', etykieta: 'Szczegóły organizacyjne', generatorId: 'szczegoly_organizacyjne', sciezkaGeneratora: '/szkolenia-zamkniete/szczegoly-organizacyjne/nowe', czyGeneratorDziala: true },
  { typ: 'LISTA_OBECNOSCI', etykieta: 'Lista obecności', generatorId: 'listy_obecnosci', sciezkaGeneratora: '/dokumenty/listy-obecnosci', czyGeneratorDziala: true },
  { typ: 'ANKIETA', etykieta: 'Ankieta', generatorId: 'ankiety', sciezkaGeneratora: '/dokumenty/ankiety', czyGeneratorDziala: true },
  { typ: 'CERTYFIKAT', etykieta: 'Certyfikat', generatorId: 'dyplomy', sciezkaGeneratora: '/dokumenty/dyplomy', czyGeneratorDziala: true },
  { typ: 'ZASWIADCZENIE', etykieta: 'Zaświadczenie', generatorId: 'dyplomy', sciezkaGeneratora: '/dokumenty/dyplomy', czyGeneratorDziala: true },
  { typ: 'DYPLOM', etykieta: 'Dyplom', generatorId: 'dyplomy', sciezkaGeneratora: '/dokumenty/dyplomy', czyGeneratorDziala: true },
  { typ: 'PROTOKOL', etykieta: 'Protokół', generatorId: null, sciezkaGeneratora: null, czyGeneratorDziala: false },
  { typ: 'MATERIAL_DODATKOWY', etykieta: 'Materiał dodatkowy', generatorId: 'replikator_dokumentow', sciezkaGeneratora: null, czyGeneratorDziala: true },
  { typ: 'KARTA_NA_DRZWI', etykieta: 'Karta na drzwi', generatorId: 'karta_na_drzwi', sciezkaGeneratora: '/dokumenty/karta-na-drzwi', czyGeneratorDziala: true },
  { typ: 'CHECKLISTA_PACZKI', etykieta: 'Checklista paczki', generatorId: 'checklisty_paczek', sciezkaGeneratora: '/dokumenty/checklisty-paczek', czyGeneratorDziala: true },
  { typ: 'INNY', etykieta: 'Inny dokument', generatorId: 'replikator_dokumentow', sciezkaGeneratora: null, czyGeneratorDziala: true },
]

export function pobierzKonfiguracjeTypuDokumentu(typ: TypDokumentu) {
  return konfiguracjeTypowDokumentow.find((konfiguracja) => konfiguracja.typ === typ) ?? null
}

export function pobierzSciezkeGeneratoraDokumentu(typ: TypDokumentu) {
  return pobierzKonfiguracjeTypuDokumentu(typ)?.sciezkaGeneratora ?? null
}
