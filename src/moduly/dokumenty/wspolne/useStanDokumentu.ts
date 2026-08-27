import { useCallback, useEffect, useRef, useState } from 'react'
import { ustawObslugeNiezapisanegoDokumentu } from './strzeznikNiezapisanegoDokumentu'

export type StanZapisuDokumentu = 'zapisano' | 'zapisywanie' | 'niezapisane' | 'blad'

type KonfiguracjaStanuDokumentu<Dane> = {
  dane: Dane
  czyAutosaveAktywny?: boolean
  opoznienieAutosave?: number
  serializuj?: (dane: Dane) => string
  zapiszAutomatycznie?: (dane: Dane) => void | Promise<void>
}

export function utworzOdciskStanuDokumentu(dane: unknown) {
  return JSON.stringify(dane)
}

export function czyStanDokumentuZmieniony(aktualnyOdcisk: string, zapisanyOdcisk: string) {
  return aktualnyOdcisk !== zapisanyOdcisk
}

export function useStanDokumentu<Dane>({
  dane,
  czyAutosaveAktywny = true,
  opoznienieAutosave = 650,
  serializuj = utworzOdciskStanuDokumentu,
  zapiszAutomatycznie,
}: KonfiguracjaStanuDokumentu<Dane>) {
  const odciskAktualny = serializuj(dane)
  const odciskAktualnyRef = useRef(odciskAktualny)
  const daneRef = useRef(dane)
  const zapiszAutomatycznieRef = useRef(zapiszAutomatycznie)
  const [odciskZapisany, ustawOdciskZapisany] = useState(odciskAktualny)
  const [stanZapisu, ustawStanZapisu] = useState<StanZapisuDokumentu>('zapisano')
  const czyNiezapisaneZmiany = czyStanDokumentuZmieniony(odciskAktualny, odciskZapisany)
  const skutecznyStanZapisu: StanZapisuDokumentu = czyNiezapisaneZmiany && stanZapisu === 'zapisano'
    ? 'niezapisane'
    : !czyNiezapisaneZmiany && stanZapisu === 'niezapisane' ? 'zapisano' : stanZapisu

  useEffect(() => {
    odciskAktualnyRef.current = odciskAktualny
    daneRef.current = dane
    zapiszAutomatycznieRef.current = zapiszAutomatycznie
  }, [dane, odciskAktualny, zapiszAutomatycznie])

  const oznaczJakoZapisany = useCallback((zapisaneDane?: Dane) => {
    const odcisk = serializuj(zapisaneDane ?? daneRef.current)
    ustawOdciskZapisany(odcisk)
    ustawStanZapisu(odciskAktualnyRef.current === odcisk ? 'zapisano' : 'niezapisane')
  }, [serializuj])

  const oznaczBladZapisu = useCallback(() => ustawStanZapisu('blad'), [])
  const rozpocznijZapis = useCallback(() => ustawStanZapisu('zapisywanie'), [])

  const zapiszTeraz = useCallback(async () => {
    const adapterZapisu = zapiszAutomatycznieRef.current

    if (!adapterZapisu) {
      return false
    }

    const zapisywaneDane = daneRef.current
    const odciskZapisywanychDanych = serializuj(zapisywaneDane)
    rozpocznijZapis()

    try {
      await adapterZapisu(zapisywaneDane)
      ustawOdciskZapisany(odciskZapisywanychDanych)
      ustawStanZapisu(odciskAktualnyRef.current === odciskZapisywanychDanych ? 'zapisano' : 'niezapisane')
      return true
    } catch {
      oznaczBladZapisu()
      return false
    }
  }, [oznaczBladZapisu, rozpocznijZapis, serializuj])

  useEffect(() => {
    if (!czyNiezapisaneZmiany) {
      return
    }

    if (!czyAutosaveAktywny || !zapiszAutomatycznieRef.current) {
      return
    }

    const identyfikator = window.setTimeout(() => {
      void zapiszTeraz()
    }, opoznienieAutosave)

    return () => window.clearTimeout(identyfikator)
  }, [czyAutosaveAktywny, czyNiezapisaneZmiany, odciskAktualny, opoznienieAutosave, zapiszTeraz])

  return {
    czyNiezapisaneZmiany,
    oznaczBladZapisu,
    oznaczJakoZapisany,
    rozpocznijZapis,
    stanZapisu: skutecznyStanZapisu,
    zapiszTeraz,
  }
}

export function useOchronaNiezapisanegoDokumentu(czyNiezapisaneZmiany: boolean, zapiszPrzedWyjsciem: () => void) {
  const czyNiezapisaneZmianyRef = useRef(czyNiezapisaneZmiany)
  const zapiszPrzedWyjsciemRef = useRef(zapiszPrzedWyjsciem)

  useEffect(() => {
    czyNiezapisaneZmianyRef.current = czyNiezapisaneZmiany
    zapiszPrzedWyjsciemRef.current = zapiszPrzedWyjsciem
  }, [czyNiezapisaneZmiany, zapiszPrzedWyjsciem])

  useEffect(() => ustawObslugeNiezapisanegoDokumentu({
    czySaNiezapisaneZmiany: () => czyNiezapisaneZmianyRef.current,
    zapiszPrzedWyjsciem: () => zapiszPrzedWyjsciemRef.current(),
  }), [])

  useEffect(() => {
    function ostrzezPrzedOdswiezeniem(zdarzenie: BeforeUnloadEvent) {
      if (!czyNiezapisaneZmiany) {
        return
      }

      zdarzenie.preventDefault()
      zdarzenie.returnValue = ''
    }

    window.addEventListener('beforeunload', ostrzezPrzedOdswiezeniem)
    return () => window.removeEventListener('beforeunload', ostrzezPrzedOdswiezeniem)
  }, [czyNiezapisaneZmiany])
}
