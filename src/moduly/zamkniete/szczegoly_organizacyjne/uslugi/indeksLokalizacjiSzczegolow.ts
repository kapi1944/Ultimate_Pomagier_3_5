import type { Lokalizacja } from '../../../../kartoteki/lokalizacje/typyLokalizacji'

export function zbudujIndeksLokalizacjiSzczegolow(lokalizacje: Lokalizacja[]) {
  const migawka = lokalizacje.map((lokalizacja) => ({ ...lokalizacja }))
  const wedlugNazwy = new Map<string, Lokalizacja | null>()
  const wpisy = migawka.map((lokalizacja) => {
    const nazwa = lokalizacja.nazwa.toLocaleLowerCase('pl')
    wedlugNazwy.set(nazwa, wedlugNazwy.has(nazwa) ? null : lokalizacja)
    return { nazwa, lokalizacja }
  })

  return {
    czyAktualny(nastepne: Lokalizacja[]) {
      return nastepne.length === migawka.length && nastepne.every((lokalizacja, indeks) => {
        const poprzednia = migawka[indeks]
        return (Object.keys(poprzednia) as Array<keyof Lokalizacja>).every((pole) => lokalizacja[pole] === poprzednia[pole])
      })
    },
    znajdz(miejsce: string) {
      const miastoZAdresu = miejsce.match(/\b\d{2}-\d{3}\s+([^,\n]+)\s*$/)?.[1]
      const nazwa = (miastoZAdresu ?? miejsce).trim().toLocaleLowerCase('pl')
      return nazwa ? wedlugNazwy.get(nazwa) ?? null : null
    },
    podpowiedz(miejsce: string) {
      const fraza = miejsce.trim().toLocaleLowerCase('pl')
      const wynik: Lokalizacja[] = []
      for (const wpis of wpisy) {
        if (!fraza || wpis.nazwa.includes(fraza)) wynik.push(wpis.lokalizacja)
        if (wynik.length === 50) break
      }
      return wynik
    },
  }
}

export type IndeksLokalizacjiSzczegolow = ReturnType<typeof zbudujIndeksLokalizacjiSzczegolow>
