import { poczatkowaGrupa, poczatkoweDaneFormularza } from '../danePoczatkowe'
import { polaWymaganePoImporcie } from '../stale'
import type { DaneFormularza, GrupaSzkoleniowa, StatusyPolImportu, WynikParseraMailaSzczegolow } from '../typy'

function czyObiekt(wartosc: unknown): wartosc is Record<string, unknown> {
  return Boolean(wartosc && typeof wartosc === 'object' && !Array.isArray(wartosc))
}

function odczytajPole(obiekt: unknown, pole: string): unknown {
  return pole.split('.').reduce<unknown>((wartosc, klucz) => czyObiekt(wartosc) ? wartosc[klucz] : Array.isArray(wartosc) ? wartosc[Number(klucz)] : undefined, obiekt)
}

export function przygotujMapowanieImportuMaila(wynik: WynikParseraMailaSzczegolow, dane: DaneFormularza, grupy: GrupaSzkoleniowa[], obecneStatusy: StatusyPolImportu) {
  const zachowanePola: string[] = []
  const zastosowanePola = new Set<string>()
  const statusyPol = { ...obecneStatusy }

  function filtruj<Typ extends object>(propozycja: Partial<Typ>, obecne: Typ, domyslne: Typ, prefiks = ''): Partial<Typ> {
    return Object.fromEntries(Object.entries(propozycja).flatMap(([klucz, wartosc]) => {
      const pole = `${prefiks}${klucz}`
      const aktualna = odczytajPole(obecne, klucz)
      const domyslna = odczytajPole(domyslne, klucz)
      const czyChronione = Object.entries(obecneStatusy).some(([sciezka, status]) => status === 'reczne' && (pole === sciezka || pole.startsWith(`${sciezka}.`) || sciezka.startsWith(`${pole}.`)))
      if (czyChronione && !czyObiekt(wartosc)) { zachowanePola.push(pole); return [] }
      if (czyObiekt(wartosc)) {
        const czesciowe = filtruj(wartosc, czyObiekt(aktualna) ? aktualna : {}, czyObiekt(domyslna) ? domyslna : {}, `${pole}.`)
        return Object.keys(czesciowe).length ? [[klucz, czesciowe]] : []
      }
      const czyWczesniejImportowane = Object.entries(obecneStatusy).some(([sciezka, status]) => (status === 'zaimportowane' || status === 'niepewne') && (pole === sciezka || pole.startsWith(`${sciezka}.`)))
      if (klucz !== 'zrodloImportuMaila' && !czyWczesniejImportowane && aktualna !== undefined && aktualna !== '' && JSON.stringify(aktualna) !== JSON.stringify(domyslna)) {
        zachowanePola.push(pole)
        return []
      }
      zastosowanePola.add(pole)
      return [[klucz, wartosc]]
    })) as Partial<Typ>
  }

  const daneFormularza = filtruj(wynik.daneFormularza, dane, poczatkoweDaneFormularza)
  const pierwszaGrupa = filtruj(wynik.pierwszaGrupa, grupy[0] ?? poczatkowaGrupa, poczatkowaGrupa, 'grupy.0.')
  const pozostaleGrupy = (wynik.pozostaleGrupy ?? []).map((grupa, indeks) => filtruj(grupa, grupy[indeks + 1] ?? { ...poczatkowaGrupa, nazwa: `Grupa ${indeks + 2}` }, { ...poczatkowaGrupa, nazwa: `Grupa ${indeks + 2}` }, `grupy.${indeks + 1}.`))
  const czyZachowane = (pole: string) => zachowanePola.some((sciezka) => pole === sciezka || pole.startsWith(`${sciezka}.`) || sciezka.startsWith(`${pole}.`))
  for (const pole of polaWymaganePoImporcie) {
    const wartosc = odczytajPole({ ...dane, grupy }, pole)
    if (!statusyPol[pole]) statusyPol[pole] = wartosc && (!Array.isArray(wartosc) || wartosc.length) ? 'reczne' : 'brak'
  }
  for (const pole of wynik.rozpoznanePola) {
    if (!czyZachowane(pole) && (zastosowanePola.has(pole) || [...zastosowanePola].some((sciezka) => sciezka.startsWith(`${pole}.`)))) statusyPol[pole] = 'zaimportowane'
  }
  for (const pole of wynik.polaNiepewne) if (!czyZachowane(pole) && statusyPol[pole] !== 'reczne') statusyPol[pole] = 'niepewne'
  for (const pole of zachowanePola) if (!obecneStatusy[pole]) statusyPol[pole] = 'reczne'
  return { daneFormularza, pierwszaGrupa, pozostaleGrupy, statusyPol, zachowanePola }
}
