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
  const konflikty: string[] = []
  const zachowanePola: string[] = []
  const zastosowanePola = new Set<string>()
  const statusyPol = { ...obecneStatusy }

  function filtruj<Typ extends object>(propozycja: Partial<Typ>, obecne: Typ, domyslne: Typ, prefiks = ''): Partial<Typ> {
    return Object.fromEntries(Object.entries(propozycja).flatMap(([klucz, wartosc]) => {
      const pole = `${prefiks}${klucz}`
      const aktualna = odczytajPole(obecne, klucz)
      const domyslna = odczytajPole(domyslne, klucz)
      const czyChronione = Object.entries(obecneStatusy).some(([sciezka, status]) => (status === 'reczne' || status === 'zatwierdzone') && (pole === sciezka || pole.startsWith(`${sciezka}.`) || sciezka.startsWith(`${pole}.`)))
      if (czyChronione && !czyObiekt(wartosc)) { if (obecneStatusy[pole] === 'zatwierdzone' && JSON.stringify(aktualna) !== JSON.stringify(wartosc)) konflikty.push('Zmienione źródło dla ' + pole + ': zachowano zatwierdzoną wartość.'); zachowanePola.push(pole); return [] }
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
  const propozycjeGrup: Partial<GrupaSzkoleniowa>[] = []
  const ostrzezenia = konflikty
  const zajeteIndeksy = new Set<number>()
  const indeksyDocelowe = [wynik.pierwszaGrupa, ...(wynik.pozostaleGrupy ?? [])].map((grupa, indeks) => {
    const nazwa = grupa.nazwa?.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl')
    const dopasowania = nazwa ? grupy.flatMap((obecna, numer) => obecna.nazwa.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl') === nazwa ? [numer] : []) : []
    if (dopasowania.length > 1) {
      ostrzezenia.push(`Kilka grup formularza ma nazwę „${grupa.nazwa}”. Zachowano ich dane; rozstrzygnij przypisanie importu.`)
      return -1
    }
    const czyPustaPierwsza = grupy.length === 1 && Object.entries(poczatkowaGrupa).every(([klucz, wartosc]) => klucz === 'id' || klucz === 'nazwa' || JSON.stringify(odczytajPole(grupy[0], klucz)) === JSON.stringify(wartosc))
    let docelowy = dopasowania.length === 1 ? dopasowania[0] : indeks
    if (nazwa && !dopasowania.length && grupy[docelowy] && !czyPustaPierwsza || zajeteIndeksy.has(docelowy)) docelowy = Math.max(grupy.length, propozycjeGrup.length)
    zajeteIndeksy.add(docelowy)
    const domyslna = { ...poczatkowaGrupa, nazwa: `Grupa ${docelowy + 1}` }
    propozycjeGrup[docelowy] = filtruj(grupa, grupy[docelowy] ?? domyslna, domyslna, `grupy.${docelowy}.`)
    return docelowy
  })
  const pierwszaGrupa = propozycjeGrup[0] ?? {}
  const pozostaleGrupy = Array.from({ length: Math.max(0, propozycjeGrup.length - 1) }, (_, indeks) => propozycjeGrup[indeks + 1] ?? {})
  const mapujPoleGrupy = (pole: string) => {
    const indeks = pole.match(/^grupy\.(\d+)\./)?.[1]
    if (indeks !== undefined && indeksyDocelowe[Number(indeks)] === -1) return []
    return [pole.replace(/^grupy\.(\d+)\./, (prefiks, numer: string) => indeksyDocelowe[Number(numer)] === undefined ? prefiks : `grupy.${indeksyDocelowe[Number(numer)]}.`)]
  }
  const czyZachowane = (pole: string) => zachowanePola.some((sciezka) => pole === sciezka || pole.startsWith(`${sciezka}.`) || sciezka.startsWith(`${pole}.`))
  for (const pole of polaWymaganePoImporcie) {
    const wartosc = odczytajPole({ ...dane, grupy }, pole)
    const domyslna = odczytajPole({ ...poczatkoweDaneFormularza, grupy: [poczatkowaGrupa] }, pole)
    if (!statusyPol[pole]) statusyPol[pole] = wartosc && (!Array.isArray(wartosc) || wartosc.length) && JSON.stringify(wartosc) !== JSON.stringify(domyslna) ? 'reczne' : 'brak'
  }
  for (const pole of wynik.rozpoznanePola.flatMap(mapujPoleGrupy)) {
    if (!czyZachowane(pole) && (zastosowanePola.has(pole) || [...zastosowanePola].some((sciezka) => sciezka.startsWith(`${pole}.`)))) statusyPol[pole] = 'zaimportowane'
  }
  for (const pole of wynik.polaNiepewne.flatMap(mapujPoleGrupy)) if (!czyZachowane(pole) && statusyPol[pole] !== 'reczne' && statusyPol[pole] !== 'zatwierdzone') statusyPol[pole] = 'niepewne'
  for (const pole of zachowanePola) if (!obecneStatusy[pole]) statusyPol[pole] = 'reczne'
  return { daneFormularza, pierwszaGrupa, pozostaleGrupy, statusyPol, zachowanePola, indeksPierwszejGrupy: indeksyDocelowe[0], ostrzezenia }
}
