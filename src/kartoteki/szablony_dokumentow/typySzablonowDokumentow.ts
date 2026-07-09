import type { DokumentBlokowy, ProblemDokumentu } from '../../wspolne/dokumenty/modelBlokowy'
import type { DokumentPomagiera } from '../../wspolne/dokumenty/typyDokumentu'
import type {
  DecyzjaUzytkownikaReplikatora,
  PlaceholderReplikatora,
  PoziomZgodnosciReplikatora,
  RaportReplikacji,
  ZrodloImportuReplikatora,
} from '../../moduly/dokumenty/replikator_dokumentow/typyReplikatora'

export type { PoziomZgodnosciReplikatora }

export type StatusSzablonuDokumentu = 'Roboczy' | 'Aktywny' | 'Archiwalny'

export type TypSzablonuDokumentu =
  | 'Program szkolenia'
  | 'Dyplom'
  | 'Certyfikat'
  | 'Zaświadczenie'
  | 'Lista obecności'
  | 'Ankieta'
  | 'Protokół'
  | 'Materiał dodatkowy'
  | 'Inny'

export type OrganizatorSzablonuDokumentu = 'SEMPER' | 'IIST' | 'Inny'

export type ZrodloSzablonuDokumentu = ZrodloImportuReplikatora | 'RECZNY'

export type DecyzjaKartotekiSzablonu = {
  id: string
  typ: 'zapis' | 'aktywacja' | 'archiwizacja' | 'wersja' | 'wersja_testowa' | 'metadane'
  komentarz: string
  uzytkownik: string
  data: string
}

export type DecyzjaSzablonuDokumentu = DecyzjaUzytkownikaReplikatora | DecyzjaKartotekiSzablonu

export type WersjaSzablonuDokumentu = {
  numerWersji: number
  data: string
  autor: string
  komentarz: string
  dokumentBlokowy: DokumentBlokowy
  raportJakosci: ProblemDokumentu[]
  raportReplikacji?: RaportReplikacji
  zrodloZmiany: string
  procentZgodnosci: number
  poziomZgodnosci: PoziomZgodnosciReplikatora
}

export type SzablonDokumentuKartoteki = {
  id: string
  nazwa: string
  typDokumentu: TypSzablonuDokumentu
  organizator: OrganizatorSzablonuDokumentu
  status: StatusSzablonuDokumentu
  wersja: number
  dataUtworzenia: string
  dataModyfikacji: string
  autor: string
  zrodlo: ZrodloSzablonuDokumentu
  dokumentBlokowy: DokumentBlokowy
  dokumentPodgladu?: DokumentPomagiera
  raportReplikacji?: RaportReplikacji
  procentZgodnosci: number
  poziomZgodnosci: PoziomZgodnosciReplikatora
  placeholdery: PlaceholderReplikatora[]
  elementyNiepewne: string[]
  elementyNieobslugiwane: string[]
  historiaDecyzji: DecyzjaSzablonuDokumentu[]
  historiaWersji: WersjaSzablonuDokumentu[]
  czyWersjaTestowa: boolean
  czyAktywny: boolean
}

export type FiltrySzablonowDokumentow = {
  typDokumentu: TypSzablonuDokumentu | 'Wszystkie'
  organizator: OrganizatorSzablonuDokumentu | 'Wszystkie'
  status: StatusSzablonuDokumentu | 'Wszystkie'
  poziomZgodnosci: PoziomZgodnosciReplikatora | 'Wszystkie'
  zrodlo: ZrodloSzablonuDokumentu | 'Wszystkie'
  szukanaFraza: string
}

export type PorownanieWersjiSzablonu = {
  pole: string
  wartoscPierwsza: string
  wartoscDruga: string
  czyRozne: boolean
}
