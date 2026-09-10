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
    const powiazania = dane.powiazania ? { ...poprzedni.powiazania, ...dane.powiazania } : poprzedni.powiazania
    return repozytoriumWspolnychDokumentow.aktualizuj(poprzedni.id, {
      tytul: dane.tytul,
      daneDokumentu: dane.daneDokumentu,
      ustawieniaDokumentu: dane.ustawieniaDokumentu,
      szkolenieId: dane.szkolenieId ?? powiazania.szkolenieId ?? poprzedni.szkolenieId,
      klientId: dane.klientId ?? powiazania.klientId ?? poprzedni.klientId,
      organizatorId: dane.organizatorId ?? powiazania.organizatorId ?? poprzedni.organizatorId,
      autorId: dane.autorId ?? poprzedni.autorId,
      wlascicielId: dane.wlascicielId ?? poprzedni.wlascicielId,
      powiazania,
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
    szkolenieId: dane.szkolenieId ?? dane.powiazania?.szkolenieId,
    klientId: dane.klientId ?? dane.powiazania?.klientId,
    organizatorId: dane.organizatorId ?? dane.powiazania?.organizatorId,
    autorId: dane.autorId,
    wlascicielId: dane.wlascicielId,
    powiazania: dane.powiazania,
    integralnosc: dane.integralnosc,
  }))
}
