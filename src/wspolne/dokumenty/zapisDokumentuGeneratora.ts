import { utworzNowyDokument, type IntegralnoscDokumentu, type PowiazaniaDokumentu, type TypDokumentu } from './modelDokumentu'
import { repozytoriumWspolnychDokumentow } from './rejestrDokumentow'

type DaneZapisuDokumentuGeneratora = {
  id?: string | null
  typ: TypDokumentu
  generatorId: string
  tytul: string
  daneDokumentu: unknown
  ustawieniaDokumentu: unknown
  szkolenieId?: string | null
  klientId?: string | null
  organizatorId?: string | null
  autorId?: string | null
  wlascicielId?: string | null
  powiazania?: Partial<PowiazaniaDokumentu>
  integralnosc?: Partial<IntegralnoscDokumentu>
}

export function zapiszDokumentRoboczyGeneratora(dane: DaneZapisuDokumentuGeneratora) {
  const poprzedni = dane.id ? repozytoriumWspolnychDokumentow.pobierzPoId(dane.id) : null

  if (poprzedni) {
    return repozytoriumWspolnychDokumentow.aktualizuj(poprzedni.id, {
      tytul: dane.tytul,
      daneDokumentu: dane.daneDokumentu,
      ustawieniaDokumentu: dane.ustawieniaDokumentu,
      szkolenieId: dane.szkolenieId ?? poprzedni.szkolenieId,
      klientId: dane.klientId ?? poprzedni.klientId,
      organizatorId: dane.organizatorId ?? poprzedni.organizatorId,
      autorId: dane.autorId ?? poprzedni.autorId,
      wlascicielId: dane.wlascicielId ?? poprzedni.wlascicielId,
      powiazania: dane.powiazania ? { ...poprzedni.powiazania, ...dane.powiazania } : poprzedni.powiazania,
      integralnosc: dane.integralnosc ? { ...poprzedni.integralnosc, ...dane.integralnosc } : poprzedni.integralnosc,
    })
  }

  return repozytoriumWspolnychDokumentow.utworz(utworzNowyDokument({
    id: dane.id ?? undefined,
    typ: dane.typ,
    generatorId: dane.generatorId,
    tytul: dane.tytul,
    daneDokumentu: dane.daneDokumentu,
    ustawieniaDokumentu: dane.ustawieniaDokumentu,
    szkolenieId: dane.szkolenieId,
    klientId: dane.klientId,
    organizatorId: dane.organizatorId,
    autorId: dane.autorId,
    wlascicielId: dane.wlascicielId,
    powiazania: dane.powiazania,
    integralnosc: dane.integralnosc,
  }))
}
