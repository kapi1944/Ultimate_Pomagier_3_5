import type { DaneFirmy, DaneFormularza, ProblemWalidacji, StatusPolaImportu, StatusyPolImportu } from './typy'

const polaOdbiorcyZNabywcy: Partial<Record<keyof DaneFirmy, keyof DaneFirmy>> = {
  imieNazwiskoOdbiorcy: 'osobaKontaktowa',
}

export function pobierzEfektywneDaneOdbiorcy(dane: Pick<DaneFormularza, 'nabywca' | 'odbiorca' | 'czyNabywcaJestOdbiorca'>): DaneFirmy {
  return dane.czyNabywcaJestOdbiorca ? dane.nabywca : dane.odbiorca
}

function pobierzKluczNabywcy(kluczOdbiorcy: keyof DaneFirmy) {
  return polaOdbiorcyZNabywcy[kluczOdbiorcy] ?? kluczOdbiorcy
}

export function pobierzBrakujacePolaEfektywnegoOdbiorcy(dane: Pick<DaneFormularza, 'nabywca' | 'odbiorca' | 'czyNabywcaJestOdbiorca'>) {
  const odbiorca = pobierzEfektywneDaneOdbiorcy(dane)
  return (['nazwa', 'email'] as const).filter((klucz) => !odbiorca[klucz].trim())
}

export function zbudujBledyDanychKlienta(dane: Pick<DaneFormularza, 'nabywca' | 'odbiorca' | 'czyNabywcaJestOdbiorca'>): ProblemWalidacji[] {
  const prefix = dane.czyNabywcaJestOdbiorca ? 'nabywca' : 'odbiorca'
  const etykieta = dane.czyNabywcaJestOdbiorca ? 'Nabywca' : 'Odbiorca'

  const braki = pobierzBrakujacePolaEfektywnegoOdbiorcy(dane).map((pole) => ({
    sekcja: 'Dane klienta',
    pole: `${prefix}.${pole}`,
    komunikat: pole === 'nazwa'
      ? `${etykieta}: wpisz nazwę ${dane.czyNabywcaJestOdbiorca ? 'nabywcy' : 'firmy odbiorcy'}`
      : `${etykieta}: wpisz adres email`,
    poziom: 'blad' as const,
    czyBlokuje: true,
  }))
  const bledyEmail: ProblemWalidacji[] = (['nabywca', 'odbiorca'] as const).flatMap((obiekt) => {
    if (obiekt === 'odbiorca' && dane.czyNabywcaJestOdbiorca) return []
    const email = dane[obiekt].email.trim()
    return email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? [{ sekcja: 'Dane klienta', pole: `${obiekt}.email`, komunikat: `${obiekt === 'nabywca' ? 'Nabywca' : 'Odbiorca'}: popraw adres email`, poziom: 'blad', czyBlokuje: true }] : []
  })
  return [...braki, ...bledyEmail]
}

export function pobierzEfektywneStatusyPolOdbiorcy(
  dane: Pick<DaneFormularza, 'nabywca' | 'odbiorca' | 'czyNabywcaJestOdbiorca'>,
  statusyPol: StatusyPolImportu,
): StatusyPolImportu {
  if (!dane.czyNabywcaJestOdbiorca) return statusyPol

  const statusyEfektywne = { ...statusyPol }
  ;(Object.keys(dane.odbiorca) as Array<keyof DaneFirmy>).forEach((kluczOdbiorcy) => {
    const kluczNabywcy = pobierzKluczNabywcy(kluczOdbiorcy)
    const wartosc = dane.nabywca[kluczNabywcy]
    const status = statusyPol[`nabywca.${kluczNabywcy}`] as StatusPolaImportu | undefined

    if (status === 'brak' && wartosc.trim()) {
      delete statusyEfektywne[`odbiorca.${kluczOdbiorcy}`]
    } else if (status) {
      statusyEfektywne[`odbiorca.${kluczOdbiorcy}`] = status
    } else if (!wartosc.trim()) {
      statusyEfektywne[`odbiorca.${kluczOdbiorcy}`] = statusyPol[`odbiorca.${kluczOdbiorcy}`] ?? 'brak'
    } else {
      delete statusyEfektywne[`odbiorca.${kluczOdbiorcy}`]
    }
  })

  return statusyEfektywne
}
