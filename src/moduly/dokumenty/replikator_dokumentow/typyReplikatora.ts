import type { DokumentBlokowy, ProblemDokumentu, TypBlokuDokumentu } from '../../../wspolne/dokumenty/modelBlokowy'
import type { DokumentPomagiera } from '../../../wspolne/dokumenty/typyDokumentu'

export type ZrodloImportuReplikatora = 'DOCX' | 'PDF' | 'TEKST'

export type TypDokumentuReplikatora =
  | 'Program szkolenia'
  | 'Dyplom'
  | 'Certyfikat'
  | 'Zaświadczenie'
  | 'Lista obecności'
  | 'Ankieta'
  | 'Protokół'
  | 'Materiał dodatkowy'
  | 'Inny'

export type PoziomZgodnosciReplikatora =
  | 'bardzo_dobra_zgodnosc'
  | 'dobra_zgodnosc'
  | 'wymaga_sprawdzenia'
  | 'tylko_wersja_robocza'

export type RodzajPlaceholderaReplikatora =
  | 'tekst'
  | 'data'
  | 'liczba'
  | 'osoba'
  | 'firma'
  | 'lokalizacja'
  | 'cena'
  | 'trener'
  | 'klient'
  | 'organizator'

export type StatusPlaceholderaReplikatora = 'propozycja' | 'zatwierdzony' | 'odrzucony'

export type PlaceholderReplikatora = {
  id: string
  nazwa: string
  etykieta: string
  rodzaj: RodzajPlaceholderaReplikatora
  status: StatusPlaceholderaReplikatora
  powiazanie: 'generator_szczegolow' | 'niezalezne'
  blokId?: string
  wartoscZrodlowa?: string
}

export type RaportReplikacji = {
  id: string
  zrodloImportu: ZrodloImportuReplikatora
  dataImportu: string
  odtworzono: string[]
  nieOdtworzono: string[]
  wymagaPoprawy: string[]
  ograniczenia: string[]
  procentZgodnosci: number
  poziomZgodnosci: PoziomZgodnosciReplikatora
  opisHeurystyki: string
  problemyJakosci: ProblemDokumentu[]
}

export type DecyzjaUzytkownikaReplikatora = {
  id: string
  typ: 'import' | 'zapis' | 'niska_zgodnosc' | 'nadpisanie' | 'znak_wodny'
  komentarz: string
  uzytkownik: string
  data: string
  poprzedniWynikZgodnosci?: number
}

export type StatusSzablonuReplikatora = 'Roboczy' | 'Aktywny' | 'Archiwalny'

export type SzablonRoboczyReplikatora = {
  id: string
  nazwa: string
  typDokumentu: TypDokumentuReplikatora
  pewnoscTypuDokumentu: number
  organizator: 'SEMPER' | 'IIST' | 'klient'
  status: StatusSzablonuReplikatora
  zrodloImportu: ZrodloImportuReplikatora
  dataImportu: string
  uzytkownik: string
  wersja: number
  procentZgodnosci: number
  poziomZgodnosci: PoziomZgodnosciReplikatora
  raportImportu: RaportReplikacji
  dokumentBlokowy: DokumentBlokowy
  dokumentPodgladu: DokumentPomagiera
  placeholdery: PlaceholderReplikatora[]
  elementyNiepewne: string[]
  elementyNieobslugiwane: string[]
  historiaDecyzji: DecyzjaUzytkownikaReplikatora[]
  czyPokazacZnakWodnyWersjiTestowej: boolean
}

export type WynikImportuReplikatora = {
  szablonRoboczy: SzablonRoboczyReplikatora
  dokumentPodgladu: DokumentPomagiera
  tekstZrodlowy: string
  komunikat: string
}

export type StatystykiBlokowReplikatora = Partial<Record<TypBlokuDokumentu, number>>
