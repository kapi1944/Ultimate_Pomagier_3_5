import { useEffect, useMemo, useState } from 'react'

const kluczWidocznosci = 'pomagier.prawyPanelGeneratora.widoczny'
const kluczPrzypiecia = 'pomagier.prawyPanelGeneratora.przypiety'
const kluczBlokadyWysuwania = 'pomagier.prawyPanelGeneratora.blokadaWysuwania'
const kluczZwiniecia = 'pomagier.prawyPanelGeneratora.zwiniety'
const kluczSzerokosci = 'pomagier.prawyPanelGeneratora.szerokosc'

function wczytajBoolean(klucz: string, wartoscDomyslna: boolean) {
  try {
    const wartosc = localStorage.getItem(klucz)

    if (wartosc === null) {
      return wartoscDomyslna
    }

    return wartosc === 'true'
  } catch {
    return wartoscDomyslna
  }
}

function wczytajSzerokosc() {
  try {
    const wartosc = Number(localStorage.getItem(kluczSzerokosci))

    return Number.isFinite(wartosc) ? Math.min(460, Math.max(320, wartosc)) : 380
  } catch {
    return 380
  }
}

function zapiszLocalStorage(klucz: string, wartosc: string) {
  try {
    localStorage.setItem(klucz, wartosc)
  } catch {
    return
  }
}

export function usePrawyPanelGeneratora() {
  const [czyWidoczny, ustawCzyWidoczny] = useState(() => wczytajBoolean(kluczWidocznosci, true))
  const [czyPrzypiety, ustawCzyPrzypiety] = useState(() => wczytajBoolean(kluczPrzypiecia, true))
  const [czyBlokadaWysuwania, ustawCzyBlokadaWysuwania] = useState(() => wczytajBoolean(kluczBlokadyWysuwania, false))
  const [czyZwiniety, ustawCzyZwiniety] = useState(() => wczytajBoolean(kluczZwiniecia, false))
  const [szerokoscPanelu, ustawSzerokoscPanelu] = useState(wczytajSzerokosc)
  const [czyNajechanyUchwyt, ustawCzyNajechanyUchwyt] = useState(false)

  const czyPanelOtwarty = czyWidoczny && !czyZwiniety
  const czyPanelZajmujeMiejsce = czyPanelOtwarty && czyPrzypiety

  useEffect(() => {
    zapiszLocalStorage(kluczWidocznosci, String(czyWidoczny))
  }, [czyWidoczny])

  useEffect(() => {
    zapiszLocalStorage(kluczPrzypiecia, String(czyPrzypiety))
  }, [czyPrzypiety])

  useEffect(() => {
    zapiszLocalStorage(kluczBlokadyWysuwania, String(czyBlokadaWysuwania))
  }, [czyBlokadaWysuwania])

  useEffect(() => {
    zapiszLocalStorage(kluczZwiniecia, String(czyZwiniety))
  }, [czyZwiniety])

  useEffect(() => {
    zapiszLocalStorage(kluczSzerokosci, String(szerokoscPanelu))
  }, [szerokoscPanelu])

  return useMemo(
    () => ({
      czyWidoczny,
      czyPrzypiety,
      czyBlokadaWysuwania,
      czyZwiniety,
      czyNajechanyUchwyt,
      czyPanelOtwarty,
      czyPanelZajmujeMiejsce,
      szerokoscPanelu,
      ustawCzyNajechanyUchwyt,
      ustawSzerokoscPanelu: (szerokosc: number) => ustawSzerokoscPanelu(Math.min(460, Math.max(320, szerokosc))),
      pokazPanel: () => {
        ustawCzyWidoczny(true)
        ustawCzyZwiniety(false)
      },
      schowajPanel: () => {
        ustawCzyWidoczny(false)
        ustawCzyZwiniety(true)
      },
      przelaczPrzypiecie: () => ustawCzyPrzypiety((obecne) => !obecne),
      przelaczBlokadeWysuwania: () => ustawCzyBlokadaWysuwania((obecna) => !obecna),
      przelaczZwiniecie: () => {
        ustawCzyWidoczny(true)
        ustawCzyZwiniety((obecne) => !obecne)
      },
    }),
    [
      czyBlokadaWysuwania,
      czyNajechanyUchwyt,
      czyPanelOtwarty,
      czyPanelZajmujeMiejsce,
      czyPrzypiety,
      czyWidoczny,
      czyZwiniety,
      szerokoscPanelu,
    ],
  )
}

export type StanPrawegoPaneluGeneratora = ReturnType<typeof usePrawyPanelGeneratora>
