import type { OpublikowaneSzczegolyOrganizacyjne } from '../../../zamkniete/szczegoly_organizacyjne/typy'

export type DaneZrodloweProgramu = {
  tytulSzkolenia: string
  organizator: 'SEMPER' | 'IIST'
  termin: string
  lokalizacja: string
  trener: string
  grupy: string
}

export type MetadaneZrodlaProgramu = {
  idZrodlowychSzczegolow: string
  znacznikDanychZrodlowych: string
  ostatnioPobrane: DaneZrodloweProgramu
  recznieNadpisanePola: string[]
  odlozonoDecyzje?: boolean
}

export type ZmianaZrodlaProgramu = { pole: keyof DaneZrodloweProgramu; poprzednia: string; nowa: string; czyNadpisaneRecznie: boolean }

export function mapujSzczegolyNaDaneProgramu(szczegoly: OpublikowaneSzczegolyOrganizacyjne): DaneZrodloweProgramu {
  const grupy = szczegoly.grupy.map((grupa) => grupa.nazwa).filter(Boolean).join(', ')
  const termin = szczegoly.grupy.map((grupa) => `${grupa.dataOd || ''}${grupa.dataDo ? ` - ${grupa.dataDo}` : ''}`.trim()).filter(Boolean).join(', ')
  return {
    tytulSzkolenia: szczegoly.dane.tytulSzkolenia,
    organizator: szczegoly.dane.organizator === 'IIST' ? 'IIST' : 'SEMPER',
    termin,
    lokalizacja: szczegoly.grupy.map((grupa) => grupa.miejsce).filter(Boolean).join(', '),
    trener: szczegoly.grupy.flatMap((grupa) => grupa.trenerzy.map((trener) => trener.imieNazwisko)).filter(Boolean).join(', '),
    grupy,
  }
}

export function porownajDaneZrodloweProgramu(poprzednie: DaneZrodloweProgramu, aktualne: DaneZrodloweProgramu, recznieNadpisanePola: string[] = []): ZmianaZrodlaProgramu[] {
  return (Object.keys(aktualne) as Array<keyof DaneZrodloweProgramu>).flatMap((pole) => poprzednie[pole] === aktualne[pole] ? [] : [{ pole, poprzednia: poprzednie[pole], nowa: aktualne[pole], czyNadpisaneRecznie: recznieNadpisanePola.includes(pole) }])
}

export function zastosujZmianyZrodlaProgramu(dane: DaneZrodloweProgramu, zmiany: ZmianaZrodlaProgramu[], polaDoZastosowania: string[]) {
  return zmiany.reduce((wynik, zmiana) => polaDoZastosowania.includes(zmiana.pole) ? { ...wynik, [zmiana.pole]: zmiana.nowa } : wynik, dane)
}
